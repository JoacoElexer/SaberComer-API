import request from 'supertest';

// Límites bajos solo para este archivo (cada archivo de pruebas carga sus propios módulos).
process.env.RATE_LIMIT_LOGIN_MAX = '3';
process.env.RATE_LIMIT_REGISTER_MAX = '2';
process.env.RATE_LIMIT_API_MAX = '20';
const { loadApp, seedUsers, bearer, PASSWORD } = await import('./support/helpers.js');
const { app, prisma, auth } = await loadApp();
let tokens;

beforeAll(() => {
    ({ tokens } = seedUsers(prisma, auth));
});

describe('Límite de peticiones', () => {
    // Va primero: el límite general (20) cuenta todas las peticiones del archivo.
    test('/health no cuenta para el límite general', async () => {
        for (let i = 0; i < 25; i++) expect((await request(app).get('/health')).status).toBe(200);
        expect((await request(app).get('/users/teapot')).status).toBe(418);
    });

    test('tras 3 logins fallidos se bloquea con 429; los exitosos no cuentan', async () => {
        const intento = (password) => request(app).post('/users/login').send({ correo: 'user@ejemplo.test', password });
        expect((await intento(PASSWORD)).status).toBe(200);
        for (let i = 0; i < 3; i++) expect((await intento('Incorrecta999')).status).toBe(401);
        const bloqueado = await intento(PASSWORD);
        expect(bloqueado.status).toBe(429);
        expect(bloqueado.body.message).toMatch(/Demasiados intentos/);
        expect(bloqueado.headers['ratelimit-policy']).toBeDefined();
    });

    test('el registro público se limita, pero no para un admin con sesión', async () => {
        const registrar = (n, headers = {}) => request(app).post('/users').set(headers)
            .send({ usuario: `u${n}`, correo: `u${n}@ejemplo.test`, password: 'Registro2026' });
        expect((await registrar(1)).status).toBe(201);
        expect((await registrar(2)).status).toBe(201);
        expect((await registrar(3)).status).toBe(429);
        expect((await registrar(4, bearer(tokens.admin))).status).toBe(201);
    });
});
