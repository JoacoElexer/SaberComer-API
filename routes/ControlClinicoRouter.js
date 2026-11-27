import express from 'express';
import ControlClinicoService from '../services/ControlClinicoService.js';
import FichaPacienteService from '../services/FichaPacienteService.js';
import { httpError, validateUuidParam, isEmptyBody, normalizeDates, sanitizeBody } from '../utils/validation.js';
import { parseDay } from '../utils/dates.js';
import { parsePagination, pageResponse } from '../utils/pagination.js';

const CcRouter = express.Router();
const service = new ControlClinicoService();
const fichaService = new FichaPacienteService();

CcRouter.param('id', validateUuidParam);

async function requireFicha(id) {
    const ficha = await fichaService.getById(id);
    if (!ficha) throw httpError(404, 'Ficha de paciente no encontrada.');
    return ficha;
}

CcRouter.get('/teapot', async (req, res) => {
    res.status(418).send(await service.tetera());
});

CcRouter.get('/', async (req, res) => {
    const page = parsePagination(req.query);
    res.status(200).json(pageResponse(await service.getAll(page), page));
});

// Controles de un paciente, del más reciente al más antiguo.
CcRouter.get('/paciente/:id', async (req, res) => {
    await requireFicha(req.params.id);
    const page = parsePagination(req.query);
    res.status(200).json(pageResponse(await service.getByPaciente(req.params.id, page), page));
});

CcRouter.get('/date/:fecha', async (req, res) => {
    const dia = parseDay(req.params.fecha);
    if (!dia) throw httpError(400, 'La fecha proporcionada no es válida.');
    const page = parsePagination(req.query);
    res.status(200).json(pageResponse(await service.getByDate(dia, page), page));
});

CcRouter.get('/rating/:calificacion', async (req, res) => {
    const { calificacion } = req.params;
    const valor = Number(calificacion);
    if (!/^-?\d+$/.test(calificacion)) throw httpError(400, 'La calificación proporcionada no es válida.');
    if (valor < 0 || valor > 10) throw httpError(400, 'La calificación debe estar entre 0 y 10.');
    const page = parsePagination(req.query);
    res.status(200).json(pageResponse(await service.getByRating(valor, page), page));
});

CcRouter.get('/:id', async (req, res) => {
    const registro = await service.getById(req.params.id);
    if (!registro) throw httpError(404, 'Registro clínico no encontrado.');
    res.status(200).json(registro);
});

// El :id es el de la ficha del paciente al que pertenece el control.
CcRouter.post('/:id', async (req, res) => {
    const data = prepararDatos(req.body);
    await requireFicha(req.params.id);
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
    const data = sanitizeBody(body, ['pacienteId', 'paciente']);
    if (data.calificacion !== undefined && data.calificacion !== null) {
        const valor = Number(data.calificacion);
        if (typeof data.calificacion === 'boolean' || !Number.isInteger(valor) || valor < 0 || valor > 10) {
            throw httpError(400, 'La calificación debe ser un entero entre 0 y 10.');
        }
        data.calificacion = valor;
    }
    if (normalizeDates(data, ['fecha'])) throw httpError(400, 'La fecha proporcionada no es válida.');
    return data;
}

export default CcRouter;
