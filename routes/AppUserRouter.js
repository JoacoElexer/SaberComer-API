import express from 'express';
import AppUserService from '../services/AppUserService.js';

const AppUserRouter = express.Router();
const service = new AppUserService();

AppUserRouter.get('/teapot', async (req, res, next) => {
    try {
        res.status(418).send(await service.tetera());
    } catch (error) {
        return next(error);
    }
});

AppUserRouter.get('/email/:email', async (req, res, next) => {
    console.log("GET /users/email/:email called");
    try {
        const { email } = req.params;
        if (!email || email.trim() === '') {
            const error = new Error('El correo proporcionado no es válido.');
            error.status = 400;
            return next(error);
        }
        const user = await service.getUserByEmail(email);
        if (!user) {
            const error = new Error('Usuario no encontrado.');
            error.status = 404;
            return next(error);
        }
        res.status(200).json(publicUser(user));
    } catch (error) {
        return next(error);
    }
});

AppUserRouter.get('/role/:role', async (req, res, next) => {
    console.log("GET /users/role/:role called");
    try {
        const { role } = req.params;
        if (!role || role.trim() === '') {
            const error = new Error('El rol proporcionado no es válido.');
            error.status = 400;
            return next(error);
        }
        if (!["dev", "admin", "user"].includes(role)) {
            const error = new Error('Rol no válido.');
            error.status = 400;
            return next(error);
        }
        const users = await service.getUsersByRole(role);
        if (!users || users.length === 0) {
            const error = new Error('No se encontraron usuarios con el rol proporcionado.');
            error.status = 404;
            return next(error);
        }
        res.status(200).json(users.map(publicUser));
    } catch (error) {
        return next(error);
    }
});

AppUserRouter.get('/estado/:estado', async (req, res, next) => {
    try {
        const { estado } = req.params;
        const validos = ["pendiente", "activo", "rechazado"];
        if (!validos.includes(estado)) {
            const error = new Error('Estado no válido.');
            error.status = 400;
            return next(error);
        }
        const usuarios = await service.getUsersByEstado(estado);
        if (!usuarios || usuarios.length === 0) {
            const error = new Error('No se encontraron usuarios con ese estado.');
            error.status = 404;
            return next(error);
        }
        res.status(200).json(usuarios.map(publicUser));
    } catch (error) {
        return next(error);
    }
});

AppUserRouter.post('/', async (req, res, next) => {
    console.log("POST /users called");
    try {
        const data = req.body;
        if (!data || Object.keys(data).length === 0) {
            const error = new Error('Los datos proporcionados no son válidos.');
            error.status = 400;
            return next(error);
        }
        if (typeof data.usuario !== 'string' || !data.usuario.trim() ||
            typeof data.correo !== 'string' || !data.correo.trim() ||
            typeof data.pin !== 'string' || !data.pin.trim()) {
            const error = new Error('Usuario, correo y PIN son obligatorios.');
            error.status = 400;
            return next(error);
        }
        const rol = data.rol ?? data.role ?? 'user';
        if (!["dev", "admin", "user"].includes(rol)) {
            const error = new Error('Rol no válido.');
            error.status = 400;
            return next(error);
        }
        if (data.protegido !== undefined && typeof data.protegido !== 'boolean') {
            const error = new Error('protegido debe ser true o false.');
            error.status = 400;
            return next(error);
        }
        const newUser = await service.createUser(data);
        res.status(201).json(publicUser(newUser));
    } catch (error) {
        return next(error);
    }
});

AppUserRouter.post("/login", async (req, res, next) => {
    try {
        const { correo, pin } = req.body;
        if (!correo || !pin) {
            const error = new Error('Correo y PIN son obligatorios.');
            error.status = 400;
            return next(error);
        }
        const user = await service.getUserByEmail(correo);
        if (!user) {
            const error = new Error('Correo o contraseña incorrectos.');
            error.status = 404;
            return next(error);
        }
        if (user.estado !== "activo") {
            const mensaje = user.estado === "pendiente"
                ? 'Tu cuenta está pendiente de aprobación.'
                : 'Tu cuenta ha sido rechazada. Contacta al administrador.';
            const error = new Error(mensaje);
            error.status = 403;
            return next(error);
        }
        const isValid = await service.comparePin(pin, user.pin);
        if (!isValid) {
            const error = new Error('Correo o contraseña incorrectos.');
            error.status = 401;
            return next(error);
        }
        res.status(200).json({
            message: "Login exitoso",
            id: user.id,
            usuario: user.usuario,
            correo: user.correo,
            rol: user.rol
        });
    } catch (error) {
        return next(error);
    }
});

// !! Modificar para evitar la actualización de usuarios sin autorización y hacer segura la ruta
AppUserRouter.patch('/:id', async (req, res, next) => {
    console.log("PATCH /users/:id called");
    try {
        const { id } = req.params;
        if (!id || id.trim() === '') {
            const error = new Error('El ID proporcionado no es válido.');
            error.status = 400;
            return next(error);
        }
        const data = req.body;
        if (!data || Object.keys(data).length === 0) {
            const error = new Error('Los datos proporcionados no son válidos.');
            error.status = 400;
            return next(error);
        }
        const updatedUser = await service.updateUser(id, data);
        res.status(200).json(publicUser(updatedUser));
    } catch (error) {
        return next(error);
    }
});

AppUserRouter.patch('/estado/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;
        const validos = ["activo", "rechazado"];
        if (!validos.includes(estado)) {
            const error = new Error('Estado no válido. Use "activo" o "rechazado".');
            error.status = 400;
            return next(error);
        }
        const updated = await service.updateEstado(id, estado);
        if (!updated) {
            const error = new Error('Usuario no encontrado.');
            error.status = 404;
            return next(error);
        }
        res.status(200).json(publicUser(updated));
    } catch (error) {
        return next(error);
    }
});

AppUserRouter.patch('/protegido/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { protegido } = req.body;
        if (protegido !== true && protegido !== false) {
            const error = new Error('El valor de protegido debe ser válido.');
            error.status = 400;
            return next(error);
        }
        const updated = await service.updateProtegido(id, protegido);
        if (!updated) {
            const error = new Error('Usuario no encontrado.');
            error.status = 404;
            return next(error);
        }
        res.status(200).json(publicUser(updated));
    } catch (error) {
        return next(error);
    }
});

AppUserRouter.delete('/:id', async (req, res, next) => {
    console.log("DELETE /users/:id called");
    try {
        const { id } = req.params;
        if (!id || id.trim() === '') {
            const error = new Error('El ID proporcionado no es válido.');
            error.status = 400;
            return next(error);
        }
        const user = await service.getUserById(id);
        if (!user) {
            const error = new Error('Usuario no encontrado.');
            error.status = 404;
            return next(error);
        }
        if (user.protegido) {
            const error = new Error('Esta cuenta no puede ser eliminada.');
            error.status = 403;
            return next(error);
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
