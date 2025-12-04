import express from 'express';
import ControlClinicoService from '../services/ControlClinicoService.js';
const CcRouter = express.Router();
const service = new ControlClinicoService();

CcRouter.get('/', async (req, res, next) => {
    console.log("GET /controlClinico called");
    try {
        const data = await service.getAll();
        if (data.length === 0) {
            const error = new Error('No se encontraron registros clínicos.');
            error.status = 404;
            throw error;
        }
        res.status(200).json(data);
    } catch (error) {
        next(error);
    }
})

CcRouter.get('/:id', async (req, res, next) => {
    console.log("GET /controlClinico/:id called");
    try {
        // ! Asegurarse de que el ID es válido antes de buscar
        const registro = await service.getById(req.params.id);
        if (!registro) {
            const error = new Error('Registro clínico no encontrado.');
            error.status = 404;
            throw error;
        }
        res.status(200).json(registro);
    } catch (error) {
        next(error);
    }
})

CcRouter.get('date/:fecha', async (req, res, next) => {
    console.log("GET /controlClinico/date/:fecha called");
    try {
        // ! Asegurarse de que la fecha es válida antes de buscar
        const fichas = await service.getByDate(req.params.fecha);
        if (fichas.length === 0) {
            const error = new Error('No se encontraron registros clínicos en esa fecha.');
            error.status = 404;
            throw error;
        }
        res.status(200).json(fichas);
    } catch (error) {
        next(error);
    }
})

CcRouter.get('rating/:calificacion', async (req, res, next) => {
    console.log("GET /controlClinico/rating/:calificacion called");
    try {
        // ! Asegurarse de que la calificación es válida antes de buscar
        const fichas = await service.getByRating(req.params.calificacion);
        if (fichas.length === 0) {
            const error = new Error('No se encontraron registros clínicos con esa calificación.');
            error.status = 404;
            throw error;
        }
        res.status(200).json(fichas);
    } catch (error) {
        next(error);
    }
})

CcRouter.post('/', async (req, res, next) => {
    console.log("POST /controlClinico called");
    try {
        // ! Asegurarse de que los datos del nuevo registro son válidos antes de crear
        const nuevoRegistro = await service.create(req.body);
        res.status(201).json(nuevoRegistro);
    } catch (error) {
        next(error);
    }
})

CcRouter.patch('/:id', async (req, res, next) => {
    console.log("PATCH /controlClinico/:id called");
    try {
        // ! Asegurarse de que el ID y los datos a actualizar son válidos antes de actualizar
        const registroActualizado = await service.update(req.params.id, req.body);
        res.status(200).json(registroActualizado);
    } catch (error) {
        next(error);
    }
})

CcRouter.delete('/:id', async (req, res, next) => {
    console.log("DELETE /controlClinico/:id called");
    try {
        // ! Asegurarse de que el ID es válido antes de eliminar
        const registroEliminado = await service.delete(req.params.id);
        res.status(200).json(registroEliminado);
    } catch (error) {
        next(error);
    }
})

export default CcRouter;