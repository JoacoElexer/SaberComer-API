import { parseDay, dayRange, parseDateInput } from '../utils/dates.js';

// setup.js fija APP_TIMEZONE=America/Mexico_City (UTC-6, sin horario de verano).
describe('Fechas en la zona horaria de la app', () => {
    test('un día AAAA-MM-DD va de medianoche a medianoche local', () => {
        expect(dayRange(parseDay('2026-11-20'))).toEqual({
            gte: new Date('2026-11-20T06:00:00.000Z'),
            lt: new Date('2026-11-21T06:00:00.000Z')
        });
    });

    test('una fecha ISO completa se asigna al día local en que cae', () => {
        expect(parseDay('2026-11-21T03:00:00Z')).toEqual({ year: 2026, month: 11, day: 20 });
        expect(parseDay('2026-11-21T07:00:00Z')).toEqual({ year: 2026, month: 11, day: 21 });
    });

    test('cambio de mes y de año', () => {
        expect(dayRange(parseDay('2026-12-31')).lt).toEqual(new Date('2027-01-01T06:00:00.000Z'));
    });

    test.each(['2026-02-30', '2026-13-01', 'hoy', '', '20-11-2026'])('%j no es un día válido', (valor) => {
        expect(parseDay(valor)).toBeNull();
    });

    test('parseDateInput: AAAA-MM-DD es medianoche local; ISO completa se respeta; otros tipos no', () => {
        expect(parseDateInput('1990-05-10')).toEqual(new Date('1990-05-10T06:00:00.000Z'));
        expect(parseDateInput('2026-11-25T10:00:00Z')).toEqual(new Date('2026-11-25T10:00:00.000Z'));
        expect(parseDateInput(12345)).toBeNull();
        expect(parseDateInput('2026-02-30')).toBeNull();
    });
});

describe('Zonas con horario de verano', () => {
    test('los días de cambio de hora tienen 23 y 25 horas', async () => {
        // Se carga una copia del módulo con otra zona horaria.
        const { jest } = await import('@jest/globals');
        process.env.APP_TIMEZONE = 'America/New_York';
        let mod;
        await jest.isolateModulesAsync(async () => { mod = await import('../utils/dates.js?ny'); });
        process.env.APP_TIMEZONE = 'America/Mexico_City';
        const horas = (r) => (r.lt - r.gte) / 3600000;
        expect(horas(mod.dayRange(mod.parseDay('2026-03-08')))).toBe(23);
        expect(horas(mod.dayRange(mod.parseDay('2026-11-01')))).toBe(25);
        expect(mod.dayRange(mod.parseDay('2026-07-01')).gte).toEqual(new Date('2026-07-01T04:00:00.000Z'));
    });
});
