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

// Convierte una fecha de la URL ("2026-11-27" o ISO completa) en Date, o null si no es válida.
export function parseDate(value) {
    if (typeof value !== 'string' || value.trim() === '') return null;
    const fecha = new Date(value);
    return isNaN(fecha.getTime()) ? null : fecha;
}

// Convierte a Date los campos de fecha presentes en el body. Devuelve el nombre
// del primer campo inválido, o null si todos son válidos.
export function normalizeDates(data, campos) {
    for (const campo of campos) {
        if (data[campo] === undefined || data[campo] === null) continue;
        const fecha = new Date(data[campo]);
        if (isNaN(fecha.getTime())) return campo;
        data[campo] = fecha;
    }
    return null;
}

// Quita campos que el cliente no debe fijar directamente.
export function stripProtectedFields(data, extra = []) {
    const copia = { ...data };
    for (const campo of ['id', 'createdAt', 'updatedAt', ...extra]) delete copia[campo];
    return copia;
}
