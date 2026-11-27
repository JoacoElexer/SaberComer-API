import { parseDateInput } from './dates.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const httpError = (status, message) => Object.assign(new Error(message), { status });

export const isUuid = (value) => typeof value === 'string' && UUID_REGEX.test(value);

// Para usar con router.param('id', validateUuidParam): rechaza ids mal formados
// con 400 antes de llegar a la base de datos.
export function validateUuidParam(req, res, next, value) {
    if (!isUuid(value)) return next(httpError(400, 'El ID proporcionado no es válido.'));
    next();
}

export const isEmptyBody = (data) =>
    !data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).length === 0;

// Convierte a Date los campos de fecha presentes en el body. Devuelve el nombre
// del primer campo inválido, o null si todos son válidos.
export function normalizeDates(data, campos) {
    for (const campo of campos) {
        if (data[campo] === undefined || data[campo] === null) continue;
        const fecha = parseDateInput(data[campo]);
        if (!fecha) return campo;
        data[campo] = fecha;
    }
    return null;
}

// Prepara un body para escribirlo con Prisma:
// - quita los campos que el cliente no debe fijar (id, fechas de sistema, relaciones),
// - exige que cada valor sea un escalar (texto, número, booleano o null).
// Lo segundo impide que un objeto como { "nombre": { "set": ... } } o
// { "paciente": { "connect": ... } } llegue a Prisma como operador.
export function sanitizeBody(data, extra = []) {
    const copia = { ...data };
    for (const campo of ['id', 'createdAt', 'updatedAt', ...extra]) delete copia[campo];
    for (const [campo, valor] of Object.entries(copia)) {
        if (valor !== null && typeof valor === 'object') {
            throw httpError(400, `El campo ${campo} no tiene un formato válido.`);
        }
    }
    return copia;
}
