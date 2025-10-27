import express from 'express';
import RecordMedidasService from '../services/RecordMedidasService.js';
const RmRouter = express.Router();
const service = new RecordMedidasService();

RmRouter.get('/', async (req, res, next) => {
    try {
        const data = await service.getAll();
        if (data.length === 0) {
            const error = new Error('No se encontraron registros de medidas.');
            error.status = 404;
            throw error;
        }
        res.status(200).json(data);
    } catch (error) {
        next(error);
    }
})

RmRouter.get('/:id', async (req, res, next) => {
    try {
        const registro = await service.getById(req.params.id);
        if (!registro) {
            const error = new Error('Registro de medidas no encontrado.');
            error.status = 404;
            throw error;
        }
        res.status(200).json(registro);
    } catch (error) {
        next(error);
    }
})

RmRouter.get('date/:fecha', async (req, res, next) => {
    try {
        const registros = await service.getByDate(req.params.fecha);
        if (registros.length === 0) {
            const error = new Error('No se encontraron registros de medidas para esa fecha.');
            error.status = 404;
            throw error;
        }
        res.status(200).json(registros);
    } catch (error) {
        next(error);
    }
})

RmRouter.post('/', async (req, res, next) => {
    try {
        const nuevoRegistro = await service.create(req.body);
        res.status(201).json(nuevoRegistro);
    } catch (error) {
        next(error);
    }
})

RmRouter.patch('/:id', async (req, res, next) => {
    try {
        const updatedRegistro = await service.update(req.params.id, req.body);
        res.status(200).json(updatedRegistro);
    } catch (error) {
        next(error);
    }
})

RmRouter.delete('/:id', async (req, res, next) => {
    try {
        const deletedRegistro = await service.delete(req.params.id);
        res.status(200).json(deletedRegistro);
    } catch (error) {
        next(error);
    }
})

export default RmRouter;