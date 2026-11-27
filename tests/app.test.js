import request from 'supertest';
import express from 'express';
import { loadApp } from './support/helpers.js';
import { errorHandler } from '../utils/errorHandler.js';

const { app } = await loadApp();

describe('Comportamiento general', () => {
    test('una ruta inexistente responde 404 en JSON', async () => {
        const res = await request(app).get('/no-existe');
        expect(res.status).toBe(404);
        expect(res.body.message).toBe('Ruta no encontrada.');
    });

    test('JSON mal formado responde 400', async () => {
        const res = await request(app).post('/users/login')
            .set('Content-Type', 'application/json').send('{"correo": ');
        expect(res.status).toBe(400);
    });

    test('CORS permite el front configurado y bloquea otros orígenes', async () => {
        const ok = await request(app).get('/users/teapot').set('Origin', 'http://front.test');
        expect(ok.headers['access-control-allow-origin']).toBe('http://front.test');
        const bloqueado = await request(app).get('/users/teapot').set('Origin', 'http://malicioso.test');
        expect(bloqueado.status).toBe(403);
    });

    test('Swagger ya no está disponible', async () => {
        expect((await request(app).get('/api-docs')).status).toBe(404);
    });
});

describe('errorHandler', () => {
    const appCon = (error) => {
        const a = express();
        a.get('/', () => { throw error; });
        a.use(errorHandler);
        return a;
    };

    test('un error inesperado responde 500 sin filtrar detalles internos', async () => {
        const res = await request(appCon(new Error("Can't reach database server at db.interno:5432"))).get('/');
        expect(res.status).toBe(500);
        expect(res.body.message).toBe('Error interno del servidor.');
    });

    test.each([
        ['P2002', 409],
        ['P2003', 404],
        ['P2025', 404]
    ])('el error de Prisma %s responde %i', async (code, status) => {
        const error = Object.assign(new Error('detalle'), { name: 'PrismaClientKnownRequestError', code });
        expect((await request(appCon(error)).get('/')).status).toBe(status);
    });

    test('un error de validación de Prisma responde 400', async () => {
        const error = Object.assign(new Error('detalle'), { name: 'PrismaClientValidationError' });
        expect((await request(appCon(error)).get('/')).status).toBe(400);
    });
});
