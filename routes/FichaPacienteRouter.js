import express from 'express';
import FichaPacienteService from '../services/FichaPacienteService.js';
const FpRouter = express.Router();
const service = new FichaPacienteService();

FpRouter.get('/', async (req, res, next) => {
    try {
        const data = await service.getAll();
        if (data.length === 0) {
            const error = new Error('No se encontraron fichas de pacientes.');
            error.status = 404;
            throw error;
        }
        res.status(200).json(data);
    } catch (error) {
        next(error);
    }
})

FpRouter.get('/:id', async (req, res, next) => {
    try {
        const ficha = await service.getById(req.params.id);
        if (!ficha) {
            const error = new Error('Ficha de paciente no encontrada.');
            error.status = 404;
            throw error;
        }
        res.status(200).json(ficha);
    } catch (error) {
        next(error);
    }
})

FpRouter.get('/name/:nombre', async (req, res, next) => {
    try {
        const fichas = await service.getByName(req.params.nombre);
        if (fichas.length === 0) {
            const error = new Error('No se encontraron fichas de pacientes con ese nombre.');
            error.status = 404;
            throw error;
        }
        res.status(200).json(fichas);
    } catch (error) {
        next(error);
    }
})

FpRouter.get('/telephone/:telefono', async (req, res, next) => {
    try {
        const fichas = await service.getByTel(req.params.telefono);
        if (fichas.length === 0) {
            const error = new Error('No se encontraron fichas de pacientes con ese teléfono.');
            error.status = 404;
            throw error;
        }
        res.status(200).json(fichas);
    } catch (error) {
        next(error);
    }
})

FpRouter.get('/startdate/:fechaInicio', async (req, res, next) => {
    try {
        const fichas = await service.getByStartDate(req.params.fechaInicio);
        if (fichas.length === 0) {
            const error = new Error('No se encontraron fichas de pacientes con esa fecha de inicio.');
            error.status = 404;
            throw error;
        }
        res.status(200).json(fichas);
    } catch (error) {
        next(error);
    }
})

FpRouter.post('/', async (req, res, next) => {
    try {
        const nuevaFicha = await service.create(req.body);
        res.status(201).json(nuevaFicha);
    } catch (error) {
        next(error);
    }
})

FpRouter.patch('/:id', async (req, res, next) => {
    try {
        const fichaActualizada = await service.update(req.params.id, req.body);
        res.status(200).json(fichaActualizada);
    } catch (error) {
        next(error);
    }
})

FpRouter.delete('/:id', async (req, res, next) => {
    try {
        const fichaEliminada = await service.delete(req.params.id);
        res.status(200).json(fichaEliminada);
    } catch (error) {
        next(error);
    }
})

export default FpRouter;