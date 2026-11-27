import express from 'express';
import ControlClinicoService from '../services/ControlClinicoService.js';
import FichaPacienteService from '../services/FichaPacienteService.js';
import {
    httpError, validateUuidParam, isEmptyBody, parseDate, normalizeDates, stripProtectedFields
} from '../utils/validation.js';

const CcRouter = express.Router();
const service = new ControlClinicoService();
const fichaService = new FichaPacienteService();

CcRouter.param('id', validateUuidParam);

CcRouter.get('/teapot', async (req, res) => {
    res.status(418).send(await service.tetera());
});

CcRouter.get('/', async (req, res) => {
    const data = await service.getAll();
    if (data.length === 0) throw httpError(404, 'No se encontraron registros clínicos.');
    res.status(200).json(data);
});

CcRouter.get('/date/:fecha', async (req, res) => {
    const fecha = parseDate(req.params.fecha);
    if (!fecha) throw httpError(400, 'La fecha proporcionada no es válida.');
    const registros = await service.getByDate(fecha);
    if (registros.length === 0) throw httpError(404, 'No se encontraron registros clínicos en esa fecha.');
    res.status(200).json(registros);
});

CcRouter.get('/rating/:calificacion', async (req, res) => {
    const { calificacion } = req.params;
    const valor = Number(calificacion);
    if (calificacion.trim() === '' || !Number.isInteger(valor)) {
        throw httpError(400, 'La calificación proporcionada no es válida.');
    }
    if (valor < 0 || valor > 10) throw httpError(400, 'La calificación debe estar entre 0 y 10.');
    const registros = await service.getByRating(valor);
    if (registros.length === 0) throw httpError(404, 'No se encontraron registros clínicos con esa calificación.');
    res.status(200).json(registros);
});

CcRouter.get('/:id', async (req, res) => {
    const registro = await service.getById(req.params.id);
    if (!registro) throw httpError(404, 'Registro clínico no encontrado.');
    res.status(200).json(registro);
});

// El :id es el de la ficha del paciente al que pertenece el control.
CcRouter.post('/:id', async (req, res) => {
    const data = prepararDatos(req.body);
    const ficha = await fichaService.getById(req.params.id);
    if (!ficha) throw httpError(404, 'Ficha de paciente no encontrada.');
    const nuevoRegistro = await service.create(data, req.params.id);
    res.status(201).json(nuevoRegistro);
});

CcRouter.patch('/:id', async (req, res) => {
    const data = prepararDatos(req.body);
    const registroActualizado = await service.update(req.params.id, data);
    res.status(200).json(registroActualizado);
});

CcRouter.delete('/:id', async (req, res) => {
    const registroEliminado = await service.delete(req.params.id);
    res.status(200).json(registroEliminado);
});

function prepararDatos(body) {
    if (isEmptyBody(body)) throw httpError(400, 'Los datos proporcionados no son válidos.');
    const data = stripProtectedFields(body, ['pacienteId', 'paciente']);
    if (data.calificacion !== undefined && data.calificacion !== null) {
        const valor = Number(data.calificacion);
        if (!Number.isInteger(valor) || valor < 0 || valor > 10) {
            throw httpError(400, 'La calificación debe ser un entero entre 0 y 10.');
        }
        data.calificacion = valor;
    }
    if (normalizeDates(data, ['fecha'])) throw httpError(400, 'La fecha proporcionada no es válida.');
    return data;
}

export default CcRouter;
