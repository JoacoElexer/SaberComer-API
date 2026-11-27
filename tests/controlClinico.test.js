import request from 'supertest';
import { loadApp, seedUsers, bearer, UUID_INEXISTENTE } from './support/helpers.js';

const { app, prisma, auth } = await loadApp();
let tokens, ficha, control;
const auth_ = () => bearer(tokens.user);

beforeEach(() => {
    prisma.$reset();
    ({ tokens } = seedUsers(prisma, auth));
    ficha = prisma.$insert('fichaPaciente', { nombre: 'Ana', telefono: '55', fechaNacimiento: new Date('1990-01-01') });
    control = prisma.$insert('controlClinico', {
        pacienteId: ficha.id, fecha: new Date('2026-11-20T18:45:00Z'), peso: 70.5, calificacion: 8
    });
    prisma.$insert('controlClinico', { pacienteId: ficha.id, fecha: new Date('2026-11-22T09:00:00Z'), calificacion: 5 });
});

describe('Acceso', () => {
    test.each([
        ['get', '/controlClinico'],
        ['post', `/controlClinico/${UUID_INEXISTENTE}`],
        ['patch', `/controlClinico/${UUID_INEXISTENTE}`],
        ['delete', `/controlClinico/${UUID_INEXISTENTE}`]
    ])('%s %s sin token responde 401', async (method, ruta) => {
        expect((await request(app)[method](ruta)).status).toBe(401);
    });
});

describe('GET /controlClinico', () => {
    test('teapot responde 418', async () => {
        expect((await request(app).get('/controlClinico/teapot').set(auth_())).status).toBe(418);
    });

    test('lista todos los controles', async () => {
        const res = await request(app).get('/controlClinico').set(auth_());
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(2);
    });

    test('sin controles responde 404', async () => {
        prisma.$tables.controlClinico.length = 0;
        expect((await request(app).get('/controlClinico').set(auth_())).status).toBe(404);
    });
});

describe('GET /controlClinico/:id', () => {
    test('devuelve el control', async () => {
        const res = await request(app).get(`/controlClinico/${control.id}`).set(auth_());
        expect(res.status).toBe(200);
        expect(res.body.peso).toBe(70.5);
    });

    test('inexistente 404 y mal formado 400', async () => {
        expect((await request(app).get(`/controlClinico/${UUID_INEXISTENTE}`).set(auth_())).status).toBe(404);
        expect((await request(app).get('/controlClinico/xyz').set(auth_())).status).toBe(400);
    });
});

describe('GET /controlClinico/date/:fecha', () => {
    test('devuelve los controles de ese día', async () => {
        const res = await request(app).get('/controlClinico/date/2026-11-20').set(auth_());
        expect(res.status).toBe(200);
        expect(res.body.map(c => c.id)).toEqual([control.id]);
    });

    test('fecha inválida 400 y sin resultados 404', async () => {
        expect((await request(app).get('/controlClinico/date/hoy').set(auth_())).status).toBe(400);
        expect((await request(app).get('/controlClinico/date/2026-01-01').set(auth_())).status).toBe(404);
    });
});

describe('GET /controlClinico/rating/:calificacion', () => {
    test('filtra por calificación', async () => {
        const res = await request(app).get('/controlClinico/rating/8').set(auth_());
        expect(res.status).toBe(200);
        expect(res.body.map(c => c.id)).toEqual([control.id]);
    });

    test.each(['abc', '7.5', '11', '-1'])('calificación %s responde 400', async (valor) => {
        expect((await request(app).get(`/controlClinico/rating/${valor}`).set(auth_())).status).toBe(400);
    });

    test('sin resultados 404', async () => {
        expect((await request(app).get('/controlClinico/rating/10').set(auth_())).status).toBe(404);
    });
});

describe('POST /controlClinico/:idFicha', () => {
    test('crea el control enlazado a la ficha', async () => {
        const res = await request(app).post(`/controlClinico/${ficha.id}`).set(auth_())
            .send({ peso: 68, calificacion: '9', fecha: '2026-11-25', agua: true });
        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({ pacienteId: ficha.id, peso: 68, calificacion: 9, agua: true });
    });

    test('no permite fijar otro pacienteId desde el body', async () => {
        const res = await request(app).post(`/controlClinico/${ficha.id}`).set(auth_())
            .send({ peso: 68, pacienteId: UUID_INEXISTENTE });
        expect(res.status).toBe(201);
        expect(res.body.pacienteId).toBe(ficha.id);
    });

    test('ficha inexistente responde 404', async () => {
        const res = await request(app).post(`/controlClinico/${UUID_INEXISTENTE}`).set(auth_()).send({ peso: 60 });
        expect(res.status).toBe(404);
        expect(res.body.message).toBe('Ficha de paciente no encontrada.');
    });

    test('validaciones: body vacío, calificación fuera de rango, fecha inválida, id mal formado', async () => {
        const ruta = `/controlClinico/${ficha.id}`;
        expect((await request(app).post(ruta).set(auth_()).send({})).status).toBe(400);
        expect((await request(app).post(ruta).set(auth_()).send({ calificacion: 15 })).status).toBe(400);
        expect((await request(app).post(ruta).set(auth_()).send({ fecha: 'mañana' })).status).toBe(400);
        expect((await request(app).post('/controlClinico/123').set(auth_()).send({ peso: 1 })).status).toBe(400);
    });
});

describe('PATCH /controlClinico/:id', () => {
    test('actualiza el control', async () => {
        const res = await request(app).patch(`/controlClinico/${control.id}`).set(auth_()).send({ observaciones: 'Bien' });
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ observaciones: 'Bien', pacienteId: ficha.id });
    });

    test('body vacío 400, inexistente 404', async () => {
        expect((await request(app).patch(`/controlClinico/${control.id}`).set(auth_()).send({})).status).toBe(400);
        expect((await request(app).patch(`/controlClinico/${UUID_INEXISTENTE}`).set(auth_()).send({ peso: 1 })).status).toBe(404);
    });
});

describe('DELETE /controlClinico/:id', () => {
    test('elimina el control', async () => {
        const res = await request(app).delete(`/controlClinico/${control.id}`).set(auth_());
        expect(res.status).toBe(200);
        expect(prisma.$tables.controlClinico.some(c => c.id === control.id)).toBe(false);
    });

    test('inexistente 404', async () => {
        expect((await request(app).delete(`/controlClinico/${UUID_INEXISTENTE}`).set(auth_())).status).toBe(404);
    });
});
