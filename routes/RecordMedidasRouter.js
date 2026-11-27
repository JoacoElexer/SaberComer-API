import express from 'express';
import RecordMedidasService from '../services/RecordMedidasService.js';
import FichaPacienteService from '../services/FichaPacienteService.js';
import {
    httpError, validateUuidParam, isEmptyBody, parseDate, normalizeDates, stripProtectedFields
} from '../utils/validation.js';

const RmRouter = express.Router();
const service = new RecordMedidasService();
const fichaService = new FichaPacienteService();

RmRouter.param('id', validateUuidParam);

RmRouter.get('/teapot', async (req, res) => {
    res.status(418).send(await service.tetera());
});

RmRouter.get('/', async (req, res) => {
    const data = await service.getAll();
    if (data.length === 0) throw httpError(404, 'No se encontraron registros de medidas.');
    res.status(200).json(data);
});

RmRouter.get('/date/:fecha', async (req, res) => {
    const fecha = parseDate(req.params.fecha);
    if (!fecha) throw httpError(400, 'La fecha proporcionada no es válida.');
    const registros = await service.getByDate(fecha);
    if (registros.length === 0) throw httpError(404, 'No se encontraron registros de medidas con esa fecha.');
    res.status(200).json(registros);
});

RmRouter.get('/:id', async (req, res) => {
    const registro = await service.getById(req.params.id);
    if (!registro) throw httpError(404, 'Registro de medidas no encontrado.');
    res.status(200).json(registro);
});

// El :id es el de la ficha del paciente al que pertenece el registro.
RmRouter.post('/:id', async (req, res) => {
    const data = prepararDatos(req.body);
    const ficha = await fichaService.getById(req.params.id);
    if (!ficha) throw httpError(404, 'Ficha de paciente no encontrada.');
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
    const data = stripProtectedFields(body, ['pacienteId', 'paciente']);
    if (normalizeDates(data, ['fecha'])) throw httpError(400, 'La fecha proporcionada no es válida.');
    return data;
}

export default RmRouter;
