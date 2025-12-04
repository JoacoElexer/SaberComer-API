import express from 'express';
import FichaPacienteService from '../services/FichaPacienteService.js';
const FpRouter = express.Router();
const service = new FichaPacienteService();

FpRouter.get('/', async (req, res, next) => {
    console.log("GET /fichaPacientes called");
    try {
        const data = await service.getAll();
        if ( !Array.isArray(data) || data.length === 0) {
            const error = new Error('No se encontraron fichas de pacientes.');
            error.status = 404;
            return next(error);
        }
        res.status(200).json(data);
    } catch (error) {
        console.error("Error en GET /fichaPacientes:", error);
        return next(error);
    }
})

FpRouter.get('/id/:id', async (req, res, next) => {
    console.log("GET /fichaPacientes/:id called");
    try {
        const id = req.params.id;
        if (!id || id.trim() === '') {
            const error = new Error('El ID proporcionado no es válido.');
            error.status = 400;
            return next(error);
        }
        const ficha = await service.getById(id);
        if (!ficha) {
            const error = new Error('Ficha de paciente no encontrada.');
            error.status = 404;
            return next(error);
        }
        res.status(200).json(ficha);
    } catch (error) {
        return next(error);
    }
})

FpRouter.get('/name/:nombre', async (req, res, next) => {
    console.log("GET /fichaPacientes/name/:nombre called");
    try {
        const nombre = (req.params.nombre || '').trim();
        if (!nombre || nombre.trim() === '') {
            const error = new Error('El nombre proporcionado no es válido.');
            error.status = 400;
            return next(error);
        }
        const fichas = await service.getByName(nombre);
        if (fichas.length === 0) {
            const error = new Error('No se encontraron fichas de pacientes con ese nombre.');
            error.status = 404;
            return next(error);
        }
        res.status(200).json(fichas);
    } catch (error) {
        return next(error);
    }
})

FpRouter.get('/tel/:telefono', async (req, res, next) => {
    console.log(`GET /fichaPacientes/tel/:telefono called ${req.params.telefono}`);
    try {
        const telefono = req.params.telefono.trim();
        if (!telefono || telefono.trim() === '' || isNaN(telefono)) {
            const error = new Error('El teléfono proporcionado no es válido.');
            error.status = 400;
            return next(error);
        }
        const fichas = await service.getByTel(telefono);
        if (fichas.length === 0) {
            const error = new Error('No se encontraron fichas de pacientes con ese teléfono.');
            error.status = 404;
            return next(error);
        }
        res.status(200).json(fichas);
    } catch (error) {
        next(error);
    }
})

FpRouter.get('/startdate/:fechaInicio', async (req, res, next) => {
    console.log("GET /fichaPacientes/startdate/:fechaInicio called");
    try {
        let fecha = null;
        if (req.params.fechaInicio) {
            fecha = new Date(req.params.fechaInicio);
        } else {
            const error = new Error('La fecha de inicio proporcionada no es válida.');
            error.status = 400;
            return next(error);
        }
        if ( isNaN(fecha.getTime()) ) {
            const error = new Error('El tipo de dato de la fecha de inicio no es válido.');
            error.status = 400;
            return next(error);
        }
        const fichas = await service.getByStartDate(req.params.fechaInicio);
        if (fichas.length === 0) {
            const error = new Error('No se encontraron fichas de pacientes con esa fecha de inicio.');
            error.status = 404;
            return next(error);
        }
        res.status(200).json(fichas);
    } catch (error) {
        return next(error);
    }
})

FpRouter.post('/', async (req, res, next) => {
    console.log("POST /fichaPacientes called");
    try {
        const data = req.body;
        if (!data || Object.keys(data).length === 0) {
            const error = new Error('Los datos proporcionados no son válidos.');
            error.status = 400;
            return next(error);
        }
        const nuevaFicha = await service.create(data);
        res.status(201).json(nuevaFicha);
    } catch (error) {
        return next(error);
    }
})

FpRouter.patch('/:id', async (req, res, next) => {
    console.log("PATCH /fichaPacientes/:id called");
    try {
        // ! Asegurarse de que el ID y los datos a actualizar son válidos antes de actualizar
        const fichaActualizada = await service.update(req.params.id, req.body);
        res.status(200).json(fichaActualizada);
    } catch (error) {
        return next(error);
    }
})

FpRouter.delete('/:id', async (req, res, next) => {
    console.log("DELETE /fichaPacientes/:id called");
    try {
        // ! Asegurarse de que el ID es válido antes de eliminar
        const fichaEliminada = await service.delete(req.params.id);
        res.status(200).json(fichaEliminada);
    } catch (error) {
        return next(error);
    }
})

export default FpRouter;