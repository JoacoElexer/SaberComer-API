import request from 'supertest';
import { loadApp, seedUsers, bearer, UUID_INEXISTENTE } from './support/helpers.js';

const { app, prisma, auth } = await loadApp();
let tokens, ficha, registro;
const auth_ = () => bearer(tokens.user);

beforeEach(() => {
    prisma.$reset();
    ({ tokens } = seedUsers(prisma, auth));
    ficha = prisma.$insert('fichaPaciente', { nombre: 'Ana', telefono: '55', fechaNacimiento: new Date('1990-01-01') });
    registro = prisma.$insert('recordMedidas', {
        pacienteId: ficha.id, fecha: new Date('2026-11-20T23:10:00Z'), busto: 90, cadera: 100
    });
});

describe('Acceso', () => {
    test.each([
        ['get', '/recordMedidas'],
        ['post', `/recordMedidas/${UUID_INEXISTENTE}`],
        ['patch', `/recordMedidas/${UUID_INEXISTENTE}`],
        ['delete', `/recordMedidas/${UUID_INEXISTENTE}`]
    ])('%s %s sin token responde 401', async (method, ruta) => {
        expect((await request(app)[method](ruta)).status).toBe(401);
    });
});

describe('GET /recordMedidas', () => {
    test('teapot responde 418', async () => {
        expect((await request(app).get('/recordMedidas/teapot').set(auth_())).status).toBe(418);
    });

    test('lista todos los registros', async () => {
        const res = await request(app).get('/recordMedidas').set(auth_());
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
    });

    test('sin registros responde 404', async () => {
        prisma.$tables.recordMedidas.length = 0;
        expect((await request(app).get('/recordMedidas').set(auth_())).status).toBe(404);
    });
});

describe('GET /recordMedidas/:id', () => {
    test('devuelve el registro', async () => {
        const res = await request(app).get(`/recordMedidas/${registro.id}`).set(auth_());
        expect(res.status).toBe(200);
        expect(res.body.busto).toBe(90);
    });

    test('inexistente 404 y mal formado 400', async () => {
        expect((await request(app).get(`/recordMedidas/${UUID_INEXISTENTE}`).set(auth_())).status).toBe(404);
        expect((await request(app).get('/recordMedidas/1').set(auth_())).status).toBe(400);
    });
});

describe('GET /recordMedidas/date/:fecha', () => {
    test('devuelve los registros de ese día', async () => {
        const res = await request(app).get('/recordMedidas/date/2026-11-20').set(auth_());
        expect(res.status).toBe(200);
        expect(res.body.map(r => r.id)).toEqual([registro.id]);
    });

    test('fecha inválida 400 y sin resultados 404', async () => {
        expect((await request(app).get('/recordMedidas/date/2026-13-45').set(auth_())).status).toBe(400);
        expect((await request(app).get('/recordMedidas/date/2026-11-21').set(auth_())).status).toBe(404);
    });
});

describe('POST /recordMedidas/:idFicha', () => {
    test('crea el registro enlazado a la ficha (no reemplaza su id)', async () => {
        const res = await request(app).post(`/recordMedidas/${ficha.id}`).set(auth_())
            .send({ busto: 88, ombligo: 80, fecha: '2026-11-26' });
        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({ pacienteId: ficha.id, busto: 88, ombligo: 80 });
        expect(res.body.id).not.toBe(ficha.id);
    });

    test('ficha inexistente responde 404', async () => {
        expect((await request(app).post(`/recordMedidas/${UUID_INEXISTENTE}`).set(auth_()).send({ busto: 1 })).status).toBe(404);
    });

    test('validaciones: body vacío, fecha inválida, campo desconocido', async () => {
        const ruta = `/recordMedidas/${ficha.id}`;
        expect((await request(app).post(ruta).set(auth_()).send({})).status).toBe(400);
        expect((await request(app).post(ruta).set(auth_()).send({ fecha: 'x' })).status).toBe(400);
        expect((await request(app).post(ruta).set(auth_()).send({ cintura: 70 })).status).toBe(400);
    });
});

describe('PATCH /recordMedidas/:id', () => {
    test('actualiza el registro', async () => {
        const res = await request(app).patch(`/recordMedidas/${registro.id}`).set(auth_()).send({ cadera: 98 });
        expect(res.status).toBe(200);
        expect(res.body.cadera).toBe(98);
    });

    test('body vacío 400, inexistente 404', async () => {
        expect((await request(app).patch(`/recordMedidas/${registro.id}`).set(auth_()).send({})).status).toBe(400);
        expect((await request(app).patch(`/recordMedidas/${UUID_INEXISTENTE}`).set(auth_()).send({ busto: 1 })).status).toBe(404);
    });
});

describe('DELETE /recordMedidas/:id', () => {
    test('elimina el registro', async () => {
        const res = await request(app).delete(`/recordMedidas/${registro.id}`).set(auth_());
        expect(res.status).toBe(200);
        expect(prisma.$tables.recordMedidas).toHaveLength(0);
    });

    test('inexistente 404', async () => {
        expect((await request(app).delete(`/recordMedidas/${UUID_INEXISTENTE}`).set(auth_())).status).toBe(404);
    });
});
