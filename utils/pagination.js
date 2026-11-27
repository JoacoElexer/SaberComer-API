import { httpError } from './validation.js';

export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

function positiveInt(value, nombre) {
    if (value === undefined) return undefined;
    const n = Number(value);
    if (typeof value !== 'string' || !Number.isInteger(n) || n < 1) {
        throw httpError(400, `El parámetro ${nombre} debe ser un entero mayor que 0.`);
    }
    return n;
}

// Lee ?page= y ?limit= de la query. Por defecto página 1 y 20 elementos;
// el límite máximo es 100.
export function parsePagination(query = {}) {
    const page = positiveInt(query.page, 'page') ?? 1;
    const limit = positiveInt(query.limit, 'limit') ?? DEFAULT_LIMIT;
    if (limit > MAX_LIMIT) throw httpError(400, `El parámetro limit no puede ser mayor que ${MAX_LIMIT}.`);
    return { page, limit, skip: (page - 1) * limit, take: limit };
}

// Formato común de las respuestas de listas. Una lista sin resultados es
// { data: [], total: 0, ... } con estado 200.
export function pageResponse([data, total], { page, limit }) {
    return { data, page, limit, total, totalPages: Math.ceil(total / limit) };
}
