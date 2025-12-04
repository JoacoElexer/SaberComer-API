import express from 'express';
import AppUserService from '../services/AppUserService.js';
import encryption from "../utils/encryption.js";
const AppUserRouter = express.Router();
const service = new AppUserService();

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
        res.status(200).json(user);
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
        const users = await service.getUsersByRole(role);
        if (!users || users.length === 0) {
            const error = new Error('No se encontraron usuarios con el rol proporcionado.');
            error.status = 404;
            return next(error);
        }
        res.status(200).json(users);
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
        const newUser = await service.createUser(data);
        res.status(201).json(newUser);
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
            const error = new Error('Usuario no encontrado.');
            error.status = 404;
            return next(error);
        }
        const isValid = await service.comparePin(pin, user.pin);
        if (!isValid) {
            const error = new Error('PIN incorrecto.');
            error.status = 401;
            return next(error);
        }
        res.json({
            message: "Login exitoso",
            usuario: user.usuario,
            correo: user.correo,
            role: user.role
        });
    } catch (error) {
        return next(error);
    }
});

// !! Modificar para evitar la actualización de usuarios sin autorización y hacer segura la ruta
AppUserRouter.patch('/:id', async(req, res, next) => {
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
        res.status(200).json(updatedUser);
    } catch (error) {
        return next(error);
    }
})

AppUserRouter.delete('/:id', async (req, res, next) => {
    console.log("DELETE /users/:id called");
    try {
        const id = req.params.id;
        if (!id || id.trim() === '') {
            const error = new Error('El ID proporcionado no es válido.');
            error.status = 400;
            return next(error);
        }
        const deletedUser = await service.deleteUser(id);
        res.status(200).json(deletedUser);
    } catch (error) {
        return next(error);
    }
});

export default AppUserRouter;