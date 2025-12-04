import express from 'express';
import FichaPacienteService from '../services/FichaPacienteService.js';
const FpRouter = express.Router();
const service = new FichaPacienteService();

FpRouter.get('/', async (req, res, next) => {
    console.log("GET /fichaPacientes called");
    try {
        const data = await service.getAll();
        if (!Array.isArray(data) || data.length === 0) {
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
        const { fechaInicio } = req.params;
        if (!fechaInicio) {
            return next(Object.assign(new Error('La fecha de inicio proporcionada no es válida.'), { status: 400 }));
        }
        const fecha = new Date(fechaInicio);
        if (isNaN(fecha.getTime())) {
            return next(Object.assign(new Error('El tipo de dato de la fecha de inicio no es válido.'), { status: 400 }));
        }
        // Llamada al service CON LA FECHA ya validada
        const fichas = await service.getByStartDate(fecha);
        if (!fichas || fichas.length === 0) {
            return next(Object.assign(new Error('No se encontraron fichas de pacientes con esa fecha de inicio.'), { status: 404 }));
        }
        res.status(200).json(fichas);
    } catch (error) {
        next(error);
    }
});

// !! No funciona, revisar variable fecha (No necesario para proyecto final)
FpRouter.get('/day/:fechaInicio', async (req, res, next) => {
    console.log("GET /fichaPacientes/startdate/day/:fechaInicio called");
    try {
        const { fecha } = req.params;
        if (!fecha) {
            const error = new Error(`No se proporcionó una fecha: ${fecha}`);
            error.status = 400;
            return next(error);
        }
        const parsed = new Date(fecha);
        if (isNaN(parsed.getTime())) {
            const error = new Error('La fecha proporcionada no es válida.');
            error.status = 400;
            return next(error);
        }
        const start = new Date(parsed.setHours(0, 0, 0, 0));
        const end = new Date(parsed.setHours(23, 59, 59, 999));
        const fichas = await service.getByDayDate(start, end);
        if (!fichas || fichas.length === 0) {
            const error = new Error('No se encontraron fichas con esa fecha.');
            error.status = 404;
            return next(error);
        }
        return res.status(200).json(fichas);
    } catch (error) {
        return next(error);
    }
});

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
        const fichaActualizada = await service.update(id, data);
        res.status(200).json(fichaActualizada);
    } catch (error) {
        return next(error);
    }
})

FpRouter.delete('/:id', async (req, res, next) => {
    console.log("DELETE /fichaPacientes/:id called");
    try {
        const id = req.params.id;
        if (!id || id.trim() === '') {
            const error = new Error('El ID proporcionado no es válido.');
            error.status = 400;
            return next(error);
        }
        const fichaEliminada = await service.delete(id);
        res.status(200).json(fichaEliminada);
    } catch (error) {
        return next(error);
    }
})

export default FpRouter;