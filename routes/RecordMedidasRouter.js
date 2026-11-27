import express from 'express';
import RecordMedidasService from '../services/RecordMedidasService.js';
import FichaPacienteService from '../services/FichaPacienteService.js';
import { httpError, validateUuidParam, isEmptyBody, normalizeDates, sanitizeBody } from '../utils/validation.js';
import { parseDay } from '../utils/dates.js';
import { parsePagination, pageResponse } from '../utils/pagination.js';

const RmRouter = express.Router();
const service = new RecordMedidasService();
const fichaService = new FichaPacienteService();

RmRouter.param('id', validateUuidParam);

async function requireFicha(id) {
    const ficha = await fichaService.getById(id);
    if (!ficha) throw httpError(404, 'Ficha de paciente no encontrada.');
    return ficha;
}

RmRouter.get('/teapot', async (req, res) => {
    res.status(418).send(await service.tetera());
});

RmRouter.get('/', async (req, res) => {
    const page = parsePagination(req.query);
    res.status(200).json(pageResponse(await service.getAll(page), page));
});

// Registros de un paciente, del más reciente al más antiguo.
RmRouter.get('/paciente/:id', async (req, res) => {
    await requireFicha(req.params.id);
    const page = parsePagination(req.query);
    res.status(200).json(pageResponse(await service.getByPaciente(req.params.id, page), page));
});

RmRouter.get('/date/:fecha', async (req, res) => {
    const dia = parseDay(req.params.fecha);
    if (!dia) throw httpError(400, 'La fecha proporcionada no es válida.');
    const page = parsePagination(req.query);
    res.status(200).json(pageResponse(await service.getByDate(dia, page), page));
});

RmRouter.get('/:id', async (req, res) => {
    const registro = await service.getById(req.params.id);
    if (!registro) throw httpError(404, 'Registro de medidas no encontrado.');
    res.status(200).json(registro);
});

// El :id es el de la ficha del paciente al que pertenece el registro.
RmRouter.post('/:id', async (req, res) => {
    const data = prepararDatos(req.body);
    await requireFicha(req.params.id);
    const nuevoRegistro = await service.create(data, req.params.id);
    res.status(201).json(nuevoRegistro);
});

RmRouter.patch('/:id', async (req, res) => {
    const data = prepararDatos(req.body);
    const updatedRegistro = await service.update(req.params.id, data);
    res.status(200).json(updatedRegistro);
});

RmRouter.delete('/:id', async (req, res) => {
    const deletedRegistro = await service.delete(req.params.id);
    res.status(200).json(deletedRegistro);
});

function prepararDatos(body) {
    if (isEmptyBody(body)) throw httpError(400, 'Los datos proporcionados no son válidos.');
    const data = sanitizeBody(body, ['pacienteId', 'paciente']);
    if (normalizeDates(data, ['fecha'])) throw httpError(400, 'La fecha proporcionada no es válida.');
    return data;
}

export default RmRouter;
