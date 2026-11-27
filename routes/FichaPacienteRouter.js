import express from 'express';
import FichaPacienteService from '../services/FichaPacienteService.js';
import {
    httpError, validateUuidParam, isEmptyBody, parseDate, normalizeDates, stripProtectedFields
} from '../utils/validation.js';

const FpRouter = express.Router();
const service = new FichaPacienteService();

FpRouter.param('id', validateUuidParam);

FpRouter.get('/teapot', async (req, res) => {
    res.status(418).send(await service.tetera());
});

FpRouter.get('/', async (req, res) => {
    const data = await service.getAll();
    if (data.length === 0) throw httpError(404, 'No se encontraron fichas de pacientes.');
    res.status(200).json(data);
});

FpRouter.get('/id/:id', async (req, res) => {
    const ficha = await service.getById(req.params.id);
    if (!ficha) throw httpError(404, 'Ficha de paciente no encontrada.');
    res.status(200).json(ficha);
});

FpRouter.get('/name/:nombre', async (req, res) => {
    const nombre = req.params.nombre.trim();
    if (!nombre) throw httpError(400, 'El nombre proporcionado no es válido.');
    const fichas = await service.getByName(nombre);
    if (fichas.length === 0) throw httpError(404, 'No se encontraron fichas de pacientes con ese nombre.');
    res.status(200).json(fichas);
});

FpRouter.get('/tel/:telefono', async (req, res) => {
    const telefono = req.params.telefono.trim();
    if (!telefono || isNaN(telefono)) throw httpError(400, 'El teléfono proporcionado no es válido.');
    const fichas = await service.getByTel(telefono);
    if (fichas.length === 0) throw httpError(404, 'No se encontraron fichas de pacientes con ese teléfono.');
    res.status(200).json(fichas);
});

// /startdate/:fecha y /day/:fecha devuelven las fichas iniciadas ese día.
const getByStartDay = async (req, res) => {
    const fecha = parseDate(req.params.fecha);
    if (!fecha) throw httpError(400, 'La fecha proporcionada no es válida.');
    const fichas = await service.getByStartDay(fecha);
    if (fichas.length === 0) throw httpError(404, 'No se encontraron fichas de pacientes con esa fecha de inicio.');
    res.status(200).json(fichas);
};
FpRouter.get('/startdate/:fecha', getByStartDay);
FpRouter.get('/day/:fecha', getByStartDay);

FpRouter.post('/', async (req, res) => {
    const data = prepararDatos(req.body, { parcial: false });
    const nuevaFicha = await service.create(data);
    res.status(201).json(nuevaFicha);
});

FpRouter.patch('/:id', async (req, res) => {
    const data = prepararDatos(req.body, { parcial: true });
    const fichaActualizada = await service.update(req.params.id, data);
    res.status(200).json(fichaActualizada);
});

FpRouter.delete('/:id', async (req, res) => {
    const fichaEliminada = await service.delete(req.params.id);
    res.status(200).json(fichaEliminada);
});

// Valida el body y lo deja listo para Prisma. En una creación nombre, teléfono y
// fecha de nacimiento son obligatorios; en una actualización solo se validan los
// campos enviados.
function prepararDatos(body, { parcial }) {
    if (isEmptyBody(body)) throw httpError(400, 'Los datos proporcionados no son válidos.');
    const data = stripProtectedFields(body, ['controlesClinicos', 'recordMedidas']);

    if (!parcial || data.nombre !== undefined) {
        if (typeof data.nombre !== 'string' || data.nombre.trim() === '') {
            throw httpError(400, 'El nombre proporcionado no es válido.');
        }
        data.nombre = data.nombre.trim();
    }
    if (!parcial || data.telefono !== undefined) {
        if (data.telefono === null || data.telefono === undefined || String(data.telefono).trim() === '' || isNaN(data.telefono)) {
            throw httpError(400, 'El teléfono proporcionado no es válido.');
        }
        data.telefono = String(data.telefono).trim();
    }
    if (!parcial && data.fechaNacimiento === undefined) {
        throw httpError(400, 'La fecha de nacimiento proporcionada no es válida.');
    }
    const fechaInvalida = normalizeDates(data, ['fechaNacimiento', 'fechaInicio']);
    if (fechaInvalida) {
        throw httpError(400, fechaInvalida === 'fechaNacimiento'
            ? 'La fecha de nacimiento proporcionada no es válida.'
            : 'La fecha de inicio proporcionada no es válida.');
    }
    return data;
}

export default FpRouter;
