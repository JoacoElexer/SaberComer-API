import express from 'express';
import AppUserService from '../services/AppUserService.js';
import {
    requireAuth, optionalAuth, requireRole, canManage, signToken, publicKey, ROLES_ADMIN
} from '../utils/auth.js';
import { httpError, validateUuidParam, isEmptyBody } from '../utils/validation.js';
import { passwordProblem } from '../utils/encryption.js';
import { parsePagination, pageResponse } from '../utils/pagination.js';
import { loginLimiter, registerLimiter } from '../utils/rateLimit.js';

const AppUserRouter = express.Router();
const service = new AppUserService();
const ROLES = ['dev', 'admin', 'user'];
const ESTADOS = ['pendiente', 'activo', 'rechazado'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

AppUserRouter.param('id', validateUuidParam);

AppUserRouter.get('/teapot', async (req, res) => {
    res.status(418).send(await service.tetera());
});

// Clave pública para que el front-end verifique los tokens sin conexión.
AppUserRouter.get('/public-key', (req, res) => {
    res.type('text/plain').send(publicKey);
});

AppUserRouter.get('/me', requireAuth, (req, res) => {
    res.status(200).json(publicUser(req.user));
});

AppUserRouter.get('/email/:email', requireAuth, requireRole(...ROLES_ADMIN), async (req, res) => {
    const user = await service.getUserByEmail(req.params.email);
    if (!user) throw httpError(404, 'Usuario no encontrado.');
    res.status(200).json(publicUser(user));
});

AppUserRouter.get('/role/:role', requireAuth, requireRole(...ROLES_ADMIN), async (req, res) => {
    const { role } = req.params;
    if (!ROLES.includes(role)) throw httpError(400, 'Rol no válido.');
    const page = parsePagination(req.query);
    const [users, total] = await service.getUsersByRole(role, page);
    res.status(200).json(pageResponse([users.map(publicUser), total], page));
});

AppUserRouter.get('/estado/:estado', requireAuth, requireRole(...ROLES_ADMIN), async (req, res) => {
    const { estado } = req.params;
    if (!ESTADOS.includes(estado)) throw httpError(400, 'Estado no válido.');
    const page = parsePagination(req.query);
    const [users, total] = await service.getUsersByEstado(estado, page);
    res.status(200).json(pageResponse([users.map(publicUser), total], page));
});

// Registro. Sin sesión: la cuenta se crea como "user", no protegida y pendiente
// de aprobación. Un admin/dev con sesión puede elegir rol; solo un dev puede
// crear otros dev o cuentas protegidas.
AppUserRouter.post('/', optionalAuth, registerLimiter, async (req, res) => {
    const data = req.body;
    if (isEmptyBody(data)) throw httpError(400, 'Los datos proporcionados no son válidos.');
    validarUsuario(data.usuario);
    validarCorreo(data.correo);
    const problema = passwordProblem(data.password);
    if (problema) throw httpError(400, problema);

    const rol = data.rol ?? 'user';
    if (!ROLES.includes(rol)) throw httpError(400, 'Rol no válido.');
    if (data.protegido !== undefined && typeof data.protegido !== 'boolean') {
        throw httpError(400, 'protegido debe ser true o false.');
    }
    const actor = req.user;
    const isAdmin = actor && ROLES_ADMIN.includes(actor.rol);
    if (rol !== 'user' && !isAdmin) throw httpError(403, 'No tienes permisos para asignar ese rol.');
    if ((rol === 'dev' || data.protegido) && actor?.rol !== 'dev') {
        throw httpError(403, 'Solo un dev puede crear cuentas dev o protegidas.');
    }

    const newUser = await service.createUser({
        usuario: data.usuario,
        correo: data.correo,
        password: data.password,
        rol,
        protegido: data.protegido ?? false
    });
    res.status(201).json(publicUser(newUser));
});

AppUserRouter.post('/login', loginLimiter, async (req, res) => {
    const { correo, password } = req.body ?? {};
    if (typeof correo !== 'string' || !correo.trim() || typeof password !== 'string' || !password) {
        throw httpError(400, 'Correo y contraseña son obligatorios.');
    }
    const user = await service.getUserByEmail(correo);
    // Se compara siempre (aunque el usuario no exista) para que el tiempo de
    // respuesta no revele qué correos están registrados. El mensaje es el mismo
    // en ambos casos y el estado solo se revela tras validar la contraseña.
    const valida = await service.comparePassword(password, user?.password ?? null);
    if (!user || !valida) throw httpError(401, 'Correo o contraseña incorrectos.');
    if (user.estado !== 'activo') {
        throw httpError(403, user.estado === 'pendiente'
            ? 'Tu cuenta está pendiente de aprobación.'
            : 'Tu cuenta ha sido rechazada. Contacta al administrador.');
    }
    const { token, expiresAt } = signToken(user);
    res.status(200).json({ message: 'Login exitoso', token, expiresAt, user: publicUser(user) });
});

// Cada usuario puede editar su usuario, correo y contraseña. Un admin/dev puede
// editar a quien pueda gestionar y además cambiar el rol. El estado y protegido
// tienen sus propias rutas.
AppUserRouter.patch('/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    const data = req.body;
    if (isEmptyBody(data)) throw httpError(400, 'Los datos proporcionados no son válidos.');
    const actor = req.user;
    const esPropio = actor.id === id;
    const target = esPropio ? actor : await service.getUserById(id);
    if (!target) throw httpError(404, 'Usuario no encontrado.');
    if (!esPropio && !canManage(actor, target)) {
        throw httpError(403, 'No tienes permisos para modificar este usuario.');
    }

    const permitidos = ['usuario', 'correo', 'password'];
    if (ROLES_ADMIN.includes(actor.rol) && !esPropio) permitidos.push('rol');
    if (esPropio) permitidos.push('passwordActual');
    const invalidos = Object.keys(data).filter(campo => !permitidos.includes(campo));
    if (invalidos.length > 0) throw httpError(403, `No puedes modificar: ${invalidos.join(', ')}.`);

    if (data.usuario !== undefined) validarUsuario(data.usuario);
    if (data.correo !== undefined) validarCorreo(data.correo);
    if (data.password !== undefined) {
        const problema = passwordProblem(data.password);
        if (problema) throw httpError(400, problema);
        // Quien cambia su propia contraseña debe confirmar la actual.
        if (esPropio) {
            const ok = typeof data.passwordActual === 'string'
                && await service.comparePassword(data.passwordActual, target.password);
            if (!ok) throw httpError(401, 'La contraseña actual no es correcta.');
        }
    }
    if (data.rol !== undefined) {
        if (!ROLES.includes(data.rol)) throw httpError(400, 'Rol no válido.');
        if (data.rol === 'dev' && actor.rol !== 'dev') throw httpError(403, 'Solo un dev puede asignar el rol dev.');
    }

    const { passwordActual, ...updateData } = data;
    if (updateData.usuario) updateData.usuario = updateData.usuario.trim();
    if (updateData.correo) updateData.correo = updateData.correo.trim().toLowerCase();
    const updatedUser = await service.updateUser(id, updateData);

    // Cambiar la contraseña invalida los tokens anteriores; si es la propia, se
    // devuelve una sesión nueva para no obligar a iniciar sesión otra vez.
    const respuesta = publicUser(updatedUser);
    if (esPropio && updateData.password) respuesta.session = signToken(updatedUser);
    res.status(200).json(respuesta);
});

AppUserRouter.patch('/estado/:id', requireAuth, requireRole(...ROLES_ADMIN), async (req, res) => {
    const { id } = req.params;
    const { estado } = req.body ?? {};
    if (!['activo', 'rechazado'].includes(estado)) {
        throw httpError(400, 'Estado no válido. Use "activo" o "rechazado".');
    }
    const target = await service.getUserById(id);
    if (!target) throw httpError(404, 'Usuario no encontrado.');
    if (!canManage(req.user, target) || target.id === req.user.id) {
        throw httpError(403, 'No tienes permisos para modificar este usuario.');
    }
    res.status(200).json(publicUser(await service.updateEstado(id, estado)));
});

AppUserRouter.patch('/protegido/:id', requireAuth, requireRole('dev'), async (req, res) => {
    const { id } = req.params;
    const { protegido } = req.body ?? {};
    if (typeof protegido !== 'boolean') throw httpError(400, 'El valor de protegido debe ser true o false.');
    const target = await service.getUserById(id);
    if (!target) throw httpError(404, 'Usuario no encontrado.');
    res.status(200).json(publicUser(await service.updateProtegido(id, protegido)));
});

AppUserRouter.delete('/:id', requireAuth, requireRole(...ROLES_ADMIN), async (req, res) => {
    const { id } = req.params;
    const user = await service.getUserById(id);
    if (!user) throw httpError(404, 'Usuario no encontrado.');
    if (!canManage(req.user, user)) throw httpError(403, 'No tienes permisos para eliminar este usuario.');
    if (user.protegido) throw httpError(403, 'Esta cuenta no puede ser eliminada.');
    res.status(200).json(publicUser(await service.deleteUser(id)));
});

function validarUsuario(usuario) {
    if (typeof usuario !== 'string' || !usuario.trim() || usuario.trim().length > 50) {
        throw httpError(400, 'El usuario debe tener entre 1 y 50 caracteres.');
    }
}

function validarCorreo(correo) {
    if (typeof correo !== 'string' || correo.length > 254 || !EMAIL_REGEX.test(correo.trim())) {
        throw httpError(400, 'El correo proporcionado no es válido.');
    }
}

// Nunca se devuelven el hash de la contraseña ni datos internos de seguridad.
function publicUser({ password, passwordChangedAt, ...user }) {
    return user;
}

export default AppUserRouter;
