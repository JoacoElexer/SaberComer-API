import express from 'express';
import RecordMedidasService from '../services/RecordMedidasService.js';
import FichaPacienteService from '../services/FichaPacienteService.js';
const RmRouter = express.Router();
const service = new RecordMedidasService();
const fichaService = new FichaPacienteService();

RmRouter.get('/', async (req, res, next) => {
    console.log("GET /recordMedidas called");
    try {
        const data = await service.getAll();
        if (data.length === 0) {
            const error = new Error('No se encontraron registros de medidas.');
            error.status = 404;
            return next(error);
        }
        res.status(200).json(data);
    } catch (error) {
        return next(error);
    }
})

RmRouter.get('/:id', async (req, res, next) => {
    console.log("GET /recordMedidas/:id called");
    try {
        // ! Asegurarse de que el ID es válido antes de buscar}
        const id = req.params.id;
        if (!id || id.trim() === '') {
            const error = new Error('El ID proporcionado no es válido.');
            error.status = 400;
            return next(error);
        }
        const registro = await service.getById(id);
        if (!registro) {
            const error = new Error('Registro de medidas no encontrado.');
            error.status = 404;
            return next(error);
        }
        res.status(200).json(registro);
    } catch (error) {
        return next(error);
    }
})

RmRouter.get('/date/:fechaParam', async (req, res, next) => {
    console.log(`GET /recordMedidas/date/:fecha called ${req.params.fechaParam}`);
    try {
        const { fechaParam } = req.params;
        if (!fechaParam) {
            return next(Object.assign(new Error('La fecha proporcionada no es válida.'), { status: 400 }));
        }
        const fecha = new Date(fechaParam);
        if (isNaN(fecha.getTime())) {
            return next(Object.assign(new Error('El tipo de dato de la fecha no es válido.'), { status: 400 }));
        }
        // Llamada al service CON LA FECHA ya validada
        const registros = await service.getByDate(fecha);
        if (!registros || registros.length === 0) {
            return next(Object.assign(new Error('No se encontraron registros de medidas con esa fecha.'), { status: 404 }));
        }
        res.status(200).json(registros);
    } catch (error) {
        return next(error);
    }
})

RmRouter.post('/:id', async (req, res, next) => {
    console.log("POST /recordMedidas called");
    const data = req.body;
    const { id } = req.params;
    try {
        if (!data || Object.keys(data).length === 0) {
            const error = new Error('Los datos proporcionados no son válidos.');
            error.status = 400;
            return next(error);
        }
        // !! Verificacion para comprobar que el id de ficha de paciente es valido
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

RmRouter.patch('/:id', async (req, res, next) => {
    console.log("PATCH /recordMedidas/:id called");
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
        const updatedRegistro = await service.update(id, data);
        res.status(200).json(updatedRegistro);
    } catch (error) {
        return next(error);
    }
})

RmRouter.delete('/:id', async (req, res, next) => {
    console.log("DELETE /recordMedidas/:id called");
    try {
        const id = req.params.id;
        if (!id || id.trim() === '') {
            const error = new Error('El ID proporcionado no es válido.');
            error.status = 400;
            return next(error);
        }
        const deletedRegistro = await service.delete(id);
        res.status(200).json(deletedRegistro);
    } catch (error) {
        return next(error);
    }
})

export default RmRouter;