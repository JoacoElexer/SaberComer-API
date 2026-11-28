import { jest } from '@jest/globals';
import { EventEmitter } from 'node:events';
import { createHealthCheck } from '../utils/health.js';
import { requestLogger } from '../utils/requestLogger.js';

describe('createHealthCheck', () => {
    let tiempo, check, isHealthy;

    beforeEach(() => {
        tiempo = 0;
        check = jest.fn().mockResolvedValue(undefined);
        isHealthy = createHealthCheck(check, { ttlMs: 30_000, now: () => tiempo });
    });

    test('un resultado correcto se reutiliza hasta que caduca', async () => {
        expect(await isHealthy()).toBe(true);
        tiempo = 29_999;
        expect(await isHealthy()).toBe(true);
        expect(check).toHaveBeenCalledTimes(1);
        tiempo = 30_000;
        expect(await isHealthy()).toBe(true);
        expect(check).toHaveBeenCalledTimes(2);
    });

    test('un fallo no se guarda: se vuelve a consultar en la siguiente llamada', async () => {
        check.mockRejectedValueOnce(new Error('caída'));
        expect(await isHealthy()).toBe(false);
        expect(await isHealthy()).toBe(true);
        expect(check).toHaveBeenCalledTimes(2);
    });

    test('una caída se detecta en cuanto caduca la caché', async () => {
        expect(await isHealthy()).toBe(true);
        check.mockRejectedValue(new Error('caída'));
        tiempo = 10_000;
        expect(await isHealthy()).toBe(true);
        tiempo = 30_000;
        expect(await isHealthy()).toBe(false);
    });

    test('varias peticiones simultáneas comparten una sola consulta', async () => {
        let resolver;
        check.mockImplementation(() => new Promise(r => { resolver = r; }));
        const llamadas = [isHealthy(), isHealthy(), isHealthy()];
        resolver();
        expect(await Promise.all(llamadas)).toEqual([true, true, true]);
        expect(check).toHaveBeenCalledTimes(1);
    });
});

describe('requestLogger', () => {
    const peticion = (path, statusCode) => {
        const res = Object.assign(new EventEmitter(), { statusCode });
        const req = { method: 'GET', path, route: { path }, baseUrl: '' };
        requestLogger(req, res, () => {});
        res.emit('finish');
    };

    let log;
    beforeEach(() => { log = jest.spyOn(console, 'log').mockImplementation(() => {}); });
    afterEach(() => log.mockRestore());

    test('no registra las comprobaciones de salud correctas', () => {
        peticion('/health', 200);
        expect(log).not.toHaveBeenCalled();
    });

    test('sí registra /health cuando falla', () => {
        peticion('/health', 503);
        expect(log).toHaveBeenCalledWith(expect.stringMatching(/^GET \/health 503 \d+ms$/));
    });

    test('registra las demás rutas', () => {
        peticion('/users/teapot', 418);
        expect(log).toHaveBeenCalledWith(expect.stringMatching(/^GET \/users\/teapot 418/));
    });
});
