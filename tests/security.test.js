// Protección contra inyección SQL y otras comprobaciones de seguridad.
//
// Prisma envía todos los valores como parámetros separados de la consulta
// (consultas preparadas), así que un texto como "' OR 1=1 --" nunca se
// interpreta como SQL. El riesgo aparece solo si se usan $queryRawUnsafe /
// $executeRawUnsafe o $queryRaw con texto concatenado. Estas pruebas fallan si
// alguien introduce eso en el código.
import request from 'supertest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadApp, seedUsers, bearer } from './support/helpers.js';

const { app, prisma, auth } = await loadApp();

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const CARPETAS = ['app.js', 'server.js', 'DB', 'router', 'routes', 'services', 'utils', 'prisma'];

function archivosJs(ruta) {
    const completa = join(ROOT, ruta);
    if (statSync(completa).isFile()) return completa.endsWith('.js') ? [completa] : [];
    return readdirSync(completa).flatMap(nombre => archivosJs(join(ruta, nombre)));
}

const fuentes = CARPETAS.flatMap(archivosJs).map(archivo => ({
    archivo: relative(ROOT, archivo),
    codigo: readFileSync(archivo, 'utf8')
}));

describe('Inyección SQL: análisis del código', () => {
    test('hay código que analizar', () => {
        expect(fuentes.length).toBeGreaterThan(10);
    });

    test('no se usan $queryRawUnsafe ni $executeRawUnsafe', () => {
        const usos = fuentes.filter(f => /\$(queryRaw|executeRaw)Unsafe/.test(f.codigo)).map(f => f.archivo);
        expect(usos).toEqual([]);
    });

    test('$queryRaw / $executeRaw solo se usan como plantilla etiquetada (parametrizada)', () => {
        // prisma.$queryRaw`SELECT ...` es seguro; prisma.$queryRaw(texto) no lo es.
        const usos = fuentes.filter(f => /\$(queryRaw|executeRaw)\s*\(/.test(f.codigo)).map(f => f.archivo);
        expect(usos).toEqual([]);
    });

    test('Prisma.raw (texto SQL sin escapar) no se usa', () => {
        const usos = fuentes.filter(f => /Prisma\.raw\s*\(/.test(f.codigo)).map(f => f.archivo);
        expect(usos).toEqual([]);
    });
});

describe('Inyección SQL y de operadores: peticiones', () => {
    let tokens;

    beforeEach(() => {
        prisma.$reset();
        ({ tokens } = seedUsers(prisma, auth));
        prisma.$insert('fichaPaciente', { nombre: 'Ana', telefono: '55', fechaNacimiento: new Date('1990-01-01') });
    });

    test.each([
        "' OR '1'='1",
        "'; DROP TABLE usuarios; --",
        'Ana%',
        "\\' UNION SELECT password FROM usuarios --"
    ])('el texto %j se trata como un valor literal', async (payload) => {
        const res = await request(app).get(`/fichaPacientes/name/${encodeURIComponent(payload)}`).set(bearer(tokens.user));
        expect(res.status).toBe(200);
        expect(res.body.total).toBe(0);
    });

    test('un login con SQL en el correo no entra', async () => {
        const res = await request(app).post('/users/login').send({ correo: "admin@ejemplo.test' --", password: 'x' });
        expect(res.status).toBe(401);
    });

    test('operadores en lugar de valores se rechazan (login y body)', async () => {
        expect((await request(app).post('/users/login').send({ correo: { contains: '@' }, password: { not: '' } })).status).toBe(400);
        expect((await request(app).post('/fichaPacientes').set(bearer(tokens.user))
            .send({ nombre: 'X', telefono: '1', fechaNacimiento: '2000-01-01', notasAdicionales: { set: 'x' } })).status).toBe(400);
    });

    test('ids que no son UUID se rechazan antes de llegar a la base de datos', async () => {
        const res = await request(app).get(`/fichaPacientes/id/${encodeURIComponent("1' OR '1'='1")}`).set(bearer(tokens.user));
        expect(res.status).toBe(400);
    });
});
