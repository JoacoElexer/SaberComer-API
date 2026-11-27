// Devuelve el rango [inicio, fin) del día (UTC) al que pertenece la fecha dada.
// "2026-11-27" se interpreta como medianoche UTC, por eso se usa UTC.
export function dayRange(fecha) {
    const inicio = new Date(Date.UTC(
        fecha.getUTCFullYear(),
        fecha.getUTCMonth(),
        fecha.getUTCDate()
    ));
    const fin = new Date(inicio.getTime() + 24 * 60 * 60 * 1000);
    return { gte: inicio, lt: fin };
}
