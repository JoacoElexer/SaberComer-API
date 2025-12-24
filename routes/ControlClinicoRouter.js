import express from 'express';
import ControlClinicoService from '../services/ControlClinicoService.js';
import FichaPacienteService from '../services/FichaPacienteService.js';
const CcRouter = express.Router();
const service = new ControlClinicoService();
const fichaService = new FichaPacienteService();

CcRouter.get('/', async (req, res, next) => {
    console.log("GET /controlClinico called");
    try {
        const data = await service.getAll();
        if (!Array.isArray(data) || data.length === 0) {
            const error = new Error('No se encontraron fichas de pacientes.');
            error.status = 404;
            return next(error);
        }
        res.status(200).json(data);
    } catch (error) {
        return next(error);
    }
})

CcRouter.get('/:id', async (req, res, next) => {
    console.log("GET /controlClinico/:id called");
    try {
        const id = req.params.id;
        if (!id || id.trim() === '') {
            const error = new Error('El ID proporcionado no es válido.');
            error.status = 400;
            return next(error);
        }
        const registro = await service.getById(id);
        if (!registro) {
            const error = new Error('Registro clínico no encontrado.');
            error.status = 404;
            return next(error);
        }
        res.status(200).json(registro);
    } catch (error) {
        return next(error);
    }
})

CcRouter.get('/date/:fechaParam', async (req, res, next) => {
    console.log("GET /controlClinico/date/:fecha called");
    try {
        const { fechaParam } = req.params;        
        if (!fechaParam) {
            return next(Object.assign(new Error('La fecha proporcionada no es válida.'), { status: 400 }));
        }
        const fecha = new Date(fechaParam);
        if (isNaN(fecha.getTime())) {
            return next(Object.assign(new Error('El tipo de dato de la fecha de inicio no es válido.'), { status: 400 }));
        }
        const fichas = await service.getByDate(fechaParam);
        if (fichas.length === 0) {
            const error = new Error('No se encontraron registros clínicos en esa fecha.');
            error.status = 404;
            return next(error);
        }
        res.status(200).json(fichas);
    } catch (error) {
        return next(error);
    }
})

CcRouter.get('/rating/:calificacion', async (req, res, next) => {
    console.log("GET /controlClinico/rating/:calificacion called");
    try {
        const { calificacion } = req.params;
        if (!calificacion || calificacion.trim() === '' || isNaN(calificacion)) {
            const error = new Error('La calificación proporcionada no es válida.');
            error.status = 400;
            return next(error);
        }
        if (calificacion < 0 || calificacion > 10) {
            const error = new Error('La calificación debe estar entre 0 y 10.');
            error.status = 400;
            return next(error);
        }
        const fichas = await service.getByRating(calificacion);
        if (fichas.length === 0) {
            const error = new Error('No se encontraron registros clínicos con esa calificación.');
            error.status = 404;
            return next(error);
        }
        res.status(200).json(fichas);
    } catch (error) {
        return next(error);
    }
})

// * Necesita el id de ficha de paciente para crear el registro clínico
CcRouter.post('/:id', async (req, res, next) => {
    console.log("POST /controlClinico called");
    try {
        const data = req.body;
        const { id } = req.params;
        if (!data || Object.keys(data).length === 0) {
            const error = new Error('Los datos proporcionados no son válidos.');
            error.status = 400;
            return next(error);
        }
        if (!id || id.trim() === '') {
            const error = new Error('El ID proporcionado no es válido.');
            error.status = 400;
            return next(error);
        }
        const nuevoRegistro = await service.create(data, id);
        res.status(201).json(nuevoRegistro);
    } catch (error) {
        return next(error);
    }
})

CcRouter.patch('/:id', async (req, res, next) => {
    console.log("PATCH /controlClinico/:id called");
    try {
        const id = req.params.id;
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
        const registroActualizado = await service.update(id, data);
        res.status(200).json(registroActualizado);
    } catch (error) {
        return next(error);
    }
})

CcRouter.delete('/:id', async (req, res, next) => {
    console.log("DELETE /controlClinico/:id called");
    try {
        const id = req.params.id;
        if (!id || id.trim() === '') {
            const error = new Error('El ID proporcionado no es válido.');
            error.status = 400;
            return next(error);
        }
        const registroEliminado = await service.delete(id);
        res.status(200).json(registroEliminado);
    } catch (error) {
        return next(error);
    }
})

export default CcRouter;