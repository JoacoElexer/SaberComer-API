// Manejo de fechas en la zona horaria de la clínica (APP_TIMEZONE).
//
// La base de datos guarda instantes en UTC. Para que "el 20 de noviembre"
// signifique lo mismo que para quien usa la app, los días se calculan en la
// zona horaria configurada: un control registrado a las 21:00 en Ciudad de
// México sigue perteneciendo a ese día aunque en UTC ya sea el siguiente.
import 'dotenv/config';

export const TIMEZONE = process.env.APP_TIMEZONE || 'America/Mexico_City';

let formatter;
try {
    formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: TIMEZONE, hourCycle: 'h23',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
} catch {
    throw new Error(`APP_TIMEZONE no es una zona horaria válida: ${TIMEZONE}`);
}

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

function partsIn(instant) {
    const parts = Object.fromEntries(
        formatter.formatToParts(instant).map(({ type, value }) => [type, Number(value)])
    );
    return parts;
}

// Diferencia (ms) entre la hora local de la zona y UTC en un instante dado.
function offsetAt(instant) {
    const p = partsIn(instant);
    const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

// Medianoche local del día indicado, como instante UTC. Se recalcula el
// desfase una segunda vez por si el día tiene cambio de horario.
function startOfDay({ year, month, day }) {
    const guess = Date.UTC(year, month - 1, day);
    let time = guess - offsetAt(new Date(guess));
    time = guess - offsetAt(new Date(time));
    return new Date(time);
}

function validCalendarDay(year, month, day) {
    const d = new Date(Date.UTC(year, month - 1, day));
    return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

// Día del calendario local al que pertenece un instante.
export function calendarDayOf(instant) {
    const { year, month, day } = partsIn(instant);
    return { year, month, day };
}

// Interpreta una fecha de la URL: "AAAA-MM-DD" es ese día local; una fecha ISO
// completa se convierte al día local en que cae. Devuelve null si no es válida.
export function parseDay(value) {
    if (typeof value !== 'string' || value.trim() === '') return null;
    const match = DATE_ONLY.exec(value.trim());
    if (match) {
        const [year, month, day] = match.slice(1).map(Number);
        return validCalendarDay(year, month, day) ? { year, month, day } : null;
    }
    const instant = new Date(value);
    return isNaN(instant.getTime()) ? null : calendarDayOf(instant);
}

// Rango [inicio, fin) de un día local, listo para un filtro de Prisma.
export function dayRange({ year, month, day }) {
    const next = new Date(Date.UTC(year, month - 1, day + 1));
    return {
        gte: startOfDay({ year, month, day }),
        lt: startOfDay({ year: next.getUTCFullYear(), month: next.getUTCMonth() + 1, day: next.getUTCDate() })
    };
}

// Convierte una fecha recibida en el body en Date. "AAAA-MM-DD" se guarda como
// la medianoche local de ese día; una fecha ISO completa se respeta tal cual.
// Devuelve null si no es válida.
export function parseDateInput(value) {
    if (typeof value !== 'string' || value.trim() === '') return null;
    const match = DATE_ONLY.exec(value.trim());
    if (match) {
        const [year, month, day] = match.slice(1).map(Number);
        return validCalendarDay(year, month, day) ? startOfDay({ year, month, day }) : null;
    }
    const instant = new Date(value);
    return isNaN(instant.getTime()) ? null : instant;
}
