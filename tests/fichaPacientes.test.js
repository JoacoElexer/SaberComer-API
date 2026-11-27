import request from 'supertest';
import { loadApp, seedUsers, bearer, UUID_INEXISTENTE } from './support/helpers.js';

const { app, prisma, auth } = await loadApp();
let tokens, ana, beto;
const auth_ = () => bearer(tokens.user);

beforeEach(() => {
    prisma.$reset();
    ({ tokens } = seedUsers(prisma, auth));
    // Fechas en UTC; la app trabaja en America/Mexico_City (UTC-6).
    ana = prisma.$insert('fichaPaciente', {
        nombre: 'Ana López', telefono: '5512345678', fechaNacimiento: new Date('1990-05-10T06:00:00Z'),
        fechaInicio: new Date('2026-11-20T15:30:00Z') // 20 nov 09:30 local
    });
    beto = prisma.$insert('fichaPaciente', {
        nombre: 'Beto Ruiz', telefono: '3398765432', fechaNacimiento: new Date('1985-01-02T06:00:00Z'),
        fechaInicio: new Date('2026-11-21T03:00:00Z') // 20 nov 21:00 local (ya 21 en UTC)
    });
});

describe('Acceso', () => {
    test.each([
        ['get', '/fichaPacientes'],
        ['get', '/fichaPacientes/teapot'],
        ['post', '/fichaPacientes'],
        ['patch', `/fichaPacientes/${UUID_INEXISTENTE}`],
        ['delete', `/fichaPacientes/${UUID_INEXISTENTE}`]
    ])('%s %s sin token responde 401', async (method, ruta) => {
        expect((await request(app)[method](ruta)).status).toBe(401);
    });
});

describe('GET /fichaPacientes', () => {
    test('teapot responde 418', async () => {
        expect((await request(app).get('/fichaPacientes/teapot').set(auth_())).status).toBe(418);
    });

    test('lista paginada y ordenada por nombre', async () => {
        const res = await request(app).get('/fichaPacientes').set(auth_());
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ page: 1, limit: 20, total: 2, totalPages: 1 });
        expect(res.body.data.map(f => f.nombre)).toEqual(['Ana López', 'Beto Ruiz']);
    });

    test('page y limit', async () => {
        const res = await request(app).get('/fichaPacientes?page=2&limit=1').set(auth_());
        expect(res.body).toMatchObject({ page: 2, limit: 1, total: 2, totalPages: 2 });
        expect(res.body.data.map(f => f.id)).toEqual([beto.id]);
        const fuera = await request(app).get('/fichaPacientes?page=5').set(auth_());
        expect(fuera.status).toBe(200);
        expect(fuera.body.data).toEqual([]);
    });

    test.each(['page=0', 'page=-1', 'page=abc', 'limit=0', 'limit=101', 'limit=1.5', 'page=1&page=2'])(
        'paginación inválida (%s) responde 400', async (query) => {
            expect((await request(app).get(`/fichaPacientes?${query}`).set(auth_())).status).toBe(400);
        }
    );

    test('sin fichas responde 200 con lista vacía', async () => {
        prisma.$tables.fichaPaciente.length = 0;
        const res = await request(app).get('/fichaPacientes').set(auth_());
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ data: [], page: 1, limit: 20, total: 0, totalPages: 0 });
    });
});

describe('GET /fichaPacientes/id/:id', () => {
    test('devuelve la ficha', async () => {
        const res = await request(app).get(`/fichaPacientes/id/${ana.id}`).set(auth_());
        expect(res.status).toBe(200);
        expect(res.body.nombre).toBe('Ana López');
    });

    test('inexistente 404 y mal formado 400', async () => {
        expect((await request(app).get(`/fichaPacientes/id/${UUID_INEXISTENTE}`).set(auth_())).status).toBe(404);
        expect((await request(app).get('/fichaPacientes/id/123').set(auth_())).status).toBe(400);
    });
});

describe('GET /fichaPacientes/name/:nombre', () => {
    test('busca sin distinguir mayúsculas', async () => {
        const res = await request(app).get('/fichaPacientes/name/ana').set(auth_());
        expect(res.status).toBe(200);
        expect(res.body.data.map(f => f.id)).toEqual([ana.id]);
    });

    test('nombre vacío 400 y sin coincidencias 200 vacía', async () => {
        expect((await request(app).get('/fichaPacientes/name/%20').set(auth_())).status).toBe(400);
        const res = await request(app).get('/fichaPacientes/name/zoe').set(auth_());
        expect(res.status).toBe(200);
        expect(res.body.total).toBe(0);
    });

    test('caracteres de SQL se buscan como texto literal', async () => {
        const res = await request(app).get(`/fichaPacientes/name/${encodeURIComponent("' OR '1'='1")}`).set(auth_());
        expect(res.status).toBe(200);
        expect(res.body.data).toEqual([]);
    });
});

describe('GET /fichaPacientes/tel/:telefono', () => {
    test('busca por parte del teléfono', async () => {
        const res = await request(app).get('/fichaPacientes/tel/9876').set(auth_());
        expect(res.status).toBe(200);
        expect(res.body.data.map(f => f.id)).toEqual([beto.id]);
    });

    test('teléfono no numérico 400 y sin coincidencias 200 vacía', async () => {
        expect((await request(app).get('/fichaPacientes/tel/abc').set(auth_())).status).toBe(400);
        expect((await request(app).get('/fichaPacientes/tel/1e5').set(auth_())).status).toBe(400);
        expect((await request(app).get('/fichaPacientes/tel/0000').set(auth_())).body.total).toBe(0);
    });
});

describe.each(['startdate', 'day'])('GET /fichaPacientes/%s/:fecha', (ruta) => {
    test('usa el día de la zona horaria de la app', async () => {
        // Beto empezó a las 21:00 del 20 en México (en UTC ya era el 21).
        const res = await request(app).get(`/fichaPacientes/${ruta}/2026-11-20`).set(auth_());
        expect(res.status).toBe(200);
        expect(res.body.data.map(f => f.id).sort()).toEqual([ana.id, beto.id].sort());
        expect((await request(app).get(`/fichaPacientes/${ruta}/2026-11-21`).set(auth_())).body.total).toBe(0);
    });

    test('fecha inválida 400 y sin resultados 200 vacía', async () => {
        expect((await request(app).get(`/fichaPacientes/${ruta}/no-es-fecha`).set(auth_())).status).toBe(400);
        expect((await request(app).get(`/fichaPacientes/${ruta}/2026-02-30`).set(auth_())).status).toBe(400);
        expect((await request(app).get(`/fichaPacientes/${ruta}/2020-01-01`).set(auth_())).body.total).toBe(0);
    });
});

describe('POST /fichaPacientes', () => {
    const nueva = { nombre: '  Carla Díaz ', telefono: 5511112222, fechaNacimiento: '1999-12-31', ciudad: 'CDMX' };

    test('crea la ficha; una fecha AAAA-MM-DD se guarda como medianoche local', async () => {
        const res = await request(app).post('/fichaPacientes').set(auth_()).send(nueva);
        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({ nombre: 'Carla Díaz', telefono: '5511112222', ciudad: 'CDMX' });
        const guardada = prisma.$tables.fichaPaciente.find(f => f.id === res.body.id);
        expect(guardada.fechaNacimiento.toISOString()).toBe('1999-12-31T06:00:00.000Z');
    });

    test('ignora id y rechaza relaciones u objetos en el body', async () => {
        const conId = await request(app).post('/fichaPacientes').set(auth_()).send({ ...nueva, id: UUID_INEXISTENTE });
        expect(conId.status).toBe(201);
        expect(conId.body.id).not.toBe(UUID_INEXISTENTE);

        const conRelacion = await request(app).post('/fichaPacientes').set(auth_()).send({ ...nueva, controlesClinicos: { create: [{}] } });
        expect(conRelacion.status).toBe(201);
        expect(prisma.$tables.controlClinico).toHaveLength(0);

        const conObjeto = await request(app).post('/fichaPacientes').set(auth_()).send({ ...nueva, ciudad: { set: 'x' } });
        expect(conObjeto.status).toBe(400);
    });

    test.each([
        [{}, 'Los datos proporcionados no son válidos.'],
        [{ telefono: '55', fechaNacimiento: '2000-01-01' }, 'El nombre proporcionado no es válido.'],
        [{ nombre: 'X', fechaNacimiento: '2000-01-01' }, 'El teléfono proporcionado no es válido.'],
        [{ nombre: 'X', telefono: 'abc', fechaNacimiento: '2000-01-01' }, 'El teléfono proporcionado no es válido.'],
        [{ nombre: 'X', telefono: '55' }, 'La fecha de nacimiento proporcionada no es válida.'],
        [{ nombre: 'X', telefono: '55', fechaNacimiento: 'ayer' }, 'La fecha de nacimiento proporcionada no es válida.'],
        [{ nombre: 'X', telefono: '55', fechaNacimiento: 12345 }, 'La fecha de nacimiento proporcionada no es válida.']
    ])('datos inválidos %j responden 400', async (body, mensaje) => {
        const res = await request(app).post('/fichaPacientes').set(auth_()).send(body);
        expect(res.status).toBe(400);
        expect(res.body.message).toBe(mensaje);
    });

    test('un campo desconocido responde 400 sin detalles internos', async () => {
        const res = await request(app).post('/fichaPacientes').set(auth_()).send({ ...nueva, campoRaro: 1 });
        expect(res.status).toBe(400);
        expect(res.body.message).toBe('Los datos enviados no tienen el formato esperado.');
    });
});

describe('PATCH /fichaPacientes/:id', () => {
    test('permite actualizar un solo campo', async () => {
        const res = await request(app).patch(`/fichaPacientes/${ana.id}`).set(auth_()).send({ ciudad: 'Guadalajara' });
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ ciudad: 'Guadalajara', nombre: 'Ana López' });
    });

    test('valida los campos enviados', async () => {
        expect((await request(app).patch(`/fichaPacientes/${ana.id}`).set(auth_()).send({ nombre: '' })).status).toBe(400);
        expect((await request(app).patch(`/fichaPacientes/${ana.id}`).set(auth_()).send({ fechaInicio: 'x' })).status).toBe(400);
        expect((await request(app).patch(`/fichaPacientes/${ana.id}`).set(auth_()).send({})).status).toBe(400);
    });

    test('inexistente 404 y mal formado 400', async () => {
        expect((await request(app).patch(`/fichaPacientes/${UUID_INEXISTENTE}`).set(auth_()).send({ ciudad: 'X' })).status).toBe(404);
        expect((await request(app).patch('/fichaPacientes/abc').set(auth_()).send({ ciudad: 'X' })).status).toBe(400);
    });
});

describe('DELETE /fichaPacientes/:id', () => {
    test('elimina la ficha y sus controles y medidas', async () => {
        prisma.$insert('controlClinico', { pacienteId: ana.id });
        prisma.$insert('recordMedidas', { pacienteId: ana.id });
        const res = await request(app).delete(`/fichaPacientes/${ana.id}`).set(auth_());
        expect(res.status).toBe(200);
        expect(prisma.$tables.fichaPaciente.map(f => f.id)).toEqual([beto.id]);
        expect(prisma.$tables.controlClinico).toHaveLength(0);
        expect(prisma.$tables.recordMedidas).toHaveLength(0);
    });

    test('inexistente 404 y mal formado 400', async () => {
        expect((await request(app).delete(`/fichaPacientes/${UUID_INEXISTENTE}`).set(auth_())).status).toBe(404);
        expect((await request(app).delete('/fichaPacientes/abc').set(auth_())).status).toBe(400);
    });
});
