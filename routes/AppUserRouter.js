import express from 'express';
import AppUserService from '../services/AppUserService.js';
import {
    requireAuth, optionalAuth, requireRole, canManage, signToken, publicKey, ROLES_ADMIN
} from '../utils/auth.js';
import { httpError, validateUuidParam } from '../utils/validation.js';

const AppUserRouter = express.Router();
const service = new AppUserService();
const ROLES = ["dev", "admin", "user"];

AppUserRouter.param('id', validateUuidParam);

AppUserRouter.get('/teapot', async (req, res, next) => {
    try {
        res.status(418).send(await service.tetera());
    } catch (error) {
        return next(error);
    }
});

// Clave pública para que el front-end verifique los tokens sin conexión.
AppUserRouter.get('/public-key', (req, res) => {
    res.type('text/plain').send(publicKey);
});

AppUserRouter.get('/me', requireAuth, (req, res) => {
    res.status(200).json(publicUser(req.user));
});

AppUserRouter.get('/email/:email', requireAuth, requireRole(...ROLES_ADMIN), async (req, res, next) => {
    try {
        const { email } = req.params;
        if (!email || email.trim() === '') {
            return next(httpError(400, 'El correo proporcionado no es válido.'));
        }
        const user = await service.getUserByEmail(email);
        if (!user) {
            return next(httpError(404, 'Usuario no encontrado.'));
        }
        res.status(200).json(publicUser(user));
    } catch (error) {
        return next(error);
    }
});

AppUserRouter.get('/role/:role', requireAuth, requireRole(...ROLES_ADMIN), async (req, res, next) => {
    try {
        const { role } = req.params;
        if (!ROLES.includes(role)) {
            return next(httpError(400, 'Rol no válido.'));
        }
        const users = await service.getUsersByRole(role);
        if (!users || users.length === 0) {
            return next(httpError(404, 'No se encontraron usuarios con el rol proporcionado.'));
        }
        res.status(200).json(users.map(publicUser));
    } catch (error) {
        return next(error);
    }
});

AppUserRouter.get('/estado/:estado', requireAuth, requireRole(...ROLES_ADMIN), async (req, res, next) => {
    try {
        const { estado } = req.params;
        const validos = ["pendiente", "activo", "rechazado"];
        if (!validos.includes(estado)) {
            return next(httpError(400, 'Estado no válido.'));
        }
        const usuarios = await service.getUsersByEstado(estado);
        if (!usuarios || usuarios.length === 0) {
            return next(httpError(404, 'No se encontraron usuarios con ese estado.'));
        }
        res.status(200).json(usuarios.map(publicUser));
    } catch (error) {
        return next(error);
    }
});

// Registro. Sin sesión: la cuenta se crea como "user", no protegida y pendiente
// de aprobación. Un admin/dev con sesión puede elegir rol; solo un dev puede
// crear otros dev o cuentas protegidas.
AppUserRouter.post('/', optionalAuth, async (req, res, next) => {
    try {
        const data = req.body;
        if (!data || Object.keys(data).length === 0) {
            return next(httpError(400, 'Los datos proporcionados no son válidos.'));
        }
        if (typeof data.usuario !== 'string' || !data.usuario.trim() ||
            typeof data.correo !== 'string' || !data.correo.trim() ||
            typeof data.pin !== 'string' || !data.pin.trim()) {
            return next(httpError(400, 'Usuario, correo y PIN son obligatorios.'));
        }
        const rol = data.rol ?? data.role ?? 'user';
        if (!ROLES.includes(rol)) {
            return next(httpError(400, 'Rol no válido.'));
        }
        if (data.protegido !== undefined && typeof data.protegido !== 'boolean') {
            return next(httpError(400, 'protegido debe ser true o false.'));
        }
        const actor = req.user;
        const isAdmin = actor && ROLES_ADMIN.includes(actor.rol);
        if (rol !== 'user' && !isAdmin) {
            return next(httpError(403, 'No tienes permisos para asignar ese rol.'));
        }
        if ((rol === 'dev' || data.protegido) && actor?.rol !== 'dev') {
            return next(httpError(403, 'Solo un dev puede crear cuentas dev o protegidas.'));
        }
        const newUser = await service.createUser({
            usuario: data.usuario,
            correo: data.correo,
            pin: data.pin,
            rol,
            protegido: data.protegido ?? false
        });
        res.status(201).json(publicUser(newUser));
    } catch (error) {
        return next(error);
    }
});

AppUserRouter.post("/login", async (req, res, next) => {
    try {
        const { correo, pin } = req.body ?? {};
        if (!correo || !pin) {
            return next(httpError(400, 'Correo y PIN son obligatorios.'));
        }
        const user = await service.getUserByEmail(correo);
        // Mismo mensaje si el correo no existe o el PIN es incorrecto,
        // y el estado solo se revela tras validar el PIN.
        if (!user || !(await service.comparePin(pin, user.pin))) {
            return next(httpError(401, 'Correo o contraseña incorrectos.'));
        }
        if (user.estado !== "activo") {
            const mensaje = user.estado === "pendiente"
                ? 'Tu cuenta está pendiente de aprobación.'
                : 'Tu cuenta ha sido rechazada. Contacta al administrador.';
            return next(httpError(403, mensaje));
        }
        const { token, expiresAt } = signToken(user);
        res.status(200).json({
            message: "Login exitoso",
            token,
            expiresAt,
            user: publicUser(user)
        });
    } catch (error) {
        return next(error);
    }
});

// Cada usuario puede editar su usuario, correo y PIN. Un admin/dev puede editar
// a quien pueda gestionar y además cambiar el rol. El estado y protegido tienen
// sus propias rutas.
AppUserRouter.patch('/:id', requireAuth, async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = req.body;
        if (!data || Object.keys(data).length === 0) {
            return next(httpError(400, 'Los datos proporcionados no son válidos.'));
        }
        const actor = req.user;
        const target = actor.id === id ? actor : await service.getUserById(id);
        if (!target) {
            return next(httpError(404, 'Usuario no encontrado.'));
        }
        if (actor.id !== id && !canManage(actor, target)) {
            return next(httpError(403, 'No tienes permisos para modificar este usuario.'));
        }

        const permitidos = ['usuario', 'correo', 'pin'];
        if (ROLES_ADMIN.includes(actor.rol) && actor.id !== id) permitidos.push('rol');
        const invalidos = Object.keys(data).filter(campo => !permitidos.includes(campo));
        if (invalidos.length > 0) {
            return next(httpError(403, `No puedes modificar: ${invalidos.join(', ')}.`));
        }
        for (const campo of ['usuario', 'correo', 'pin']) {
            if (data[campo] !== undefined && (typeof data[campo] !== 'string' || !data[campo].trim())) {
                return next(httpError(400, `${campo} no es válido.`));
            }
        }
        if (data.rol !== undefined) {
            if (!ROLES.includes(data.rol)) {
                return next(httpError(400, 'Rol no válido.'));
            }
            if (data.rol === 'dev' && actor.rol !== 'dev') {
                return next(httpError(403, 'Solo un dev puede asignar el rol dev.'));
            }
        }

        const updateData = { ...data };
        if (updateData.correo) updateData.correo = updateData.correo.trim().toLowerCase();
        const updatedUser = await service.updateUser(id, updateData);
        res.status(200).json(publicUser(updatedUser));
    } catch (error) {
        return next(error);
    }
});

AppUserRouter.patch('/estado/:id', requireAuth, requireRole(...ROLES_ADMIN), async (req, res, next) => {
    try {
        const { id } = req.params;
        const { estado } = req.body ?? {};
        const validos = ["activo", "rechazado"];
        if (!validos.includes(estado)) {
            return next(httpError(400, 'Estado no válido. Use "activo" o "rechazado".'));
        }
        const target = await service.getUserById(id);
        if (!target) {
            return next(httpError(404, 'Usuario no encontrado.'));
        }
        if (!canManage(req.user, target) || target.id === req.user.id) {
            return next(httpError(403, 'No tienes permisos para modificar este usuario.'));
        }
        const updated = await service.updateEstado(id, estado);
        res.status(200).json(publicUser(updated));
    } catch (error) {
        return next(error);
    }
});

AppUserRouter.patch('/protegido/:id', requireAuth, requireRole('dev'), async (req, res, next) => {
    try {
        const { id } = req.params;
        const { protegido } = req.body ?? {};
        if (protegido !== true && protegido !== false) {
            return next(httpError(400, 'El valor de protegido debe ser válido.'));
        }
        const target = await service.getUserById(id);
        if (!target) {
            return next(httpError(404, 'Usuario no encontrado.'));
        }
        const updated = await service.updateProtegido(id, protegido);
        res.status(200).json(publicUser(updated));
    } catch (error) {
        return next(error);
    }
});

AppUserRouter.delete('/:id', requireAuth, requireRole(...ROLES_ADMIN), async (req, res, next) => {
    try {
        const { id } = req.params;
        const user = await service.getUserById(id);
        if (!user) {
            return next(httpError(404, 'Usuario no encontrado.'));
        }
        if (!canManage(req.user, user)) {
            return next(httpError(403, 'No tienes permisos para eliminar este usuario.'));
        }
        if (user.protegido) {
            return next(httpError(403, 'Esta cuenta no puede ser eliminada.'));
        }
        const deletedUser = await service.deleteUser(id);
        res.status(200).json(publicUser(deletedUser));
    } catch (error) {
        return next(error);
    }
});

function publicUser({ pin, ...user }) {
    return user;
}

export default AppUserRouter;
