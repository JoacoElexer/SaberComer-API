import request from 'supertest';
import jwt from 'jsonwebtoken';
import { readFileSync } from 'node:fs';
import { loadApp, seedUsers, bearer, PASSWORD, UUID_INEXISTENTE } from './support/helpers.js';

const { app, prisma, auth } = await loadApp();
let users, tokens;

beforeEach(() => {
    prisma.$reset();
    ({ users, tokens } = seedUsers(prisma, auth));
});

const login = (correo, password = PASSWORD) => request(app).post('/users/login').send({ correo, password });

describe('Autenticación', () => {
    test('sin token responde 401', async () => {
        const res = await request(app).get('/users/me');
        expect(res.status).toBe(401);
        expect(res.body.message).toBe('Se requiere iniciar sesión.');
    });

    test('token mal formado responde 401', async () => {
        const res = await request(app).get('/users/me').set(bearer('abc.def.ghi'));
        expect(res.status).toBe(401);
        expect(res.body.message).toBe('Token inválido.');
    });

    test('token expirado responde 401 con mensaje de sesión expirada', async () => {
        const key = readFileSync(process.env.JWT_PRIVATE_KEY_PATH, 'utf8');
        const token = jwt.sign({ rol: 'user' }, key, {
            algorithm: 'RS256', subject: users.user.id, issuer: 'sabercomer-api', expiresIn: -10
        });
        const res = await request(app).get('/users/me').set(bearer(token));
        expect(res.status).toBe(401);
        expect(res.body.message).toMatch(/expiró/);
    });

    test('token firmado con otra clave o algoritmo responde 401', async () => {
        const token = jwt.sign({ rol: 'dev' }, 'secreto', { algorithm: 'HS256', subject: users.dev.id, issuer: 'sabercomer-api' });
        expect((await request(app).get('/users/me').set(bearer(token))).status).toBe(401);
    });

    test('token de una cuenta que dejó de estar activa responde 401', async () => {
        prisma.$tables.usuario.find(u => u.id === users.user.id).estado = 'rechazado';
        const res = await request(app).get('/users/me').set(bearer(tokens.user));
        expect(res.status).toBe(401);
        expect(res.body.message).toBe('La cuenta no está activa.');
    });

    test('token de un usuario eliminado responde 401', async () => {
        prisma.$tables.usuario.splice(prisma.$tables.usuario.findIndex(u => u.id === users.user.id), 1);
        expect((await request(app).get('/users/me').set(bearer(tokens.user))).status).toBe(401);
    });

    test('token emitido antes de un cambio de contraseña responde 401', async () => {
        prisma.$tables.usuario.find(u => u.id === users.user.id).passwordChangedAt = new Date(Date.now() + 5000);
        const res = await request(app).get('/users/me').set(bearer(tokens.user));
        expect(res.status).toBe(401);
        expect(res.body.message).toMatch(/contraseña cambió/);
    });
});

describe('GET /users/teapot y /users/public-key', () => {
    test('teapot responde 418', async () => {
        const res = await request(app).get('/users/teapot');
        expect(res.status).toBe(418);
        expect(res.text).toBe('soy una tetera!');
    });

    test('public-key devuelve la clave pública en PEM', async () => {
        const res = await request(app).get('/users/public-key');
        expect(res.status).toBe(200);
        expect(res.text).toContain('BEGIN PUBLIC KEY');
    });
});

describe('POST /users/login', () => {
    test('login correcto devuelve un token verificable con la clave pública', async () => {
        const res = await login('USER@ejemplo.test');
        expect(res.status).toBe(200);
        expect(res.body.user).toMatchObject({ id: users.user.id, rol: 'user' });
        expect(res.body.user.password).toBeUndefined();
        expect(res.body.user.passwordChangedAt).toBeUndefined();
        expect(new Date(res.body.expiresAt).getTime()).toBeGreaterThan(Date.now());

        // Lo que hará el front-end sin conexión: verificar con la clave pública.
        const pem = (await request(app).get('/users/public-key')).text;
        const payload = jwt.verify(res.body.token, pem, { algorithms: ['RS256'], issuer: 'sabercomer-api' });
        expect(payload).toMatchObject({ sub: users.user.id, rol: 'user' });

        expect((await request(app).get('/users/me').set(bearer(res.body.token))).status).toBe(200);
    });

    test('faltan datos o no son texto responde 400', async () => {
        expect((await request(app).post('/users/login').send({ correo: 'user@ejemplo.test' })).status).toBe(400);
        expect((await request(app).post('/users/login').send({ correo: { $ne: '' }, password: PASSWORD })).status).toBe(400);
        expect((await request(app).post('/users/login').send({ correo: 'user@ejemplo.test', password: ['x'] })).status).toBe(400);
    });

    test('correo inexistente y contraseña incorrecta dan el mismo 401', async () => {
        const a = await login('nadie@ejemplo.test');
        const b = await login('user@ejemplo.test', 'Incorrecta999');
        expect(a.status).toBe(401);
        expect(b.status).toBe(401);
        expect(a.body.message).toBe(b.body.message);
    });

    test('cuenta pendiente o rechazada responde 403 solo con la contraseña correcta', async () => {
        const pendiente = await login('pendiente@ejemplo.test');
        expect(pendiente.status).toBe(403);
        expect(pendiente.body.message).toMatch(/pendiente/);
        const rechazado = await login('rechazado@ejemplo.test');
        expect(rechazado.status).toBe(403);
        expect(rechazado.body.message).toMatch(/rechazada/);
        expect((await login('pendiente@ejemplo.test', 'Incorrecta999')).status).toBe(401);
    });
});

describe('GET /users/me', () => {
    test('devuelve el usuario de la sesión sin datos de la contraseña', async () => {
        const res = await request(app).get('/users/me').set(bearer(tokens.admin));
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ id: users.admin.id, rol: 'admin' });
        expect(res.body.password).toBeUndefined();
    });
});

describe('GET /users/email, /role y /estado (solo admin y dev)', () => {
    test.each([
        ['/users/email/user@ejemplo.test'],
        ['/users/role/user'],
        ['/users/estado/activo']
    ])('%s: un user responde 403', async (ruta) => {
        expect((await request(app).get(ruta).set(bearer(tokens.user))).status).toBe(403);
    });

    test('email: admin encuentra al usuario; inexistente 404', async () => {
        const res = await request(app).get('/users/email/user@ejemplo.test').set(bearer(tokens.admin));
        expect(res.status).toBe(200);
        expect(res.body.id).toBe(users.user.id);
        expect(res.body.password).toBeUndefined();
        expect((await request(app).get('/users/email/nadie@ejemplo.test').set(bearer(tokens.admin))).status).toBe(404);
    });

    test('role: lista paginada y ordenada por usuario', async () => {
        const res = await request(app).get('/users/role/user').set(bearer(tokens.dev));
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ page: 1, limit: 20, total: 4, totalPages: 1 });
        expect(res.body.data.map(u => u.usuario)).toEqual(['otro', 'pendiente', 'rechazado', 'user']);
        expect(res.body.data.every(u => u.password === undefined)).toBe(true);

        const pagina2 = await request(app).get('/users/role/user?page=2&limit=3').set(bearer(tokens.dev));
        expect(pagina2.body).toMatchObject({ page: 2, limit: 3, total: 4, totalPages: 2 });
        expect(pagina2.body.data.map(u => u.usuario)).toEqual(['user']);
    });

    test('role: rol inválido responde 400', async () => {
        expect((await request(app).get('/users/role/superadmin').set(bearer(tokens.dev))).status).toBe(400);
    });

    test('estado: lista por estado; sin resultados 200 con lista vacía', async () => {
        const res = await request(app).get('/users/estado/pendiente').set(bearer(tokens.admin));
        expect(res.status).toBe(200);
        expect(res.body.data.map(u => u.usuario)).toEqual(['pendiente']);

        prisma.$tables.usuario.splice(prisma.$tables.usuario.findIndex(u => u.estado === 'rechazado'), 1);
        const vacia = await request(app).get('/users/estado/rechazado').set(bearer(tokens.admin));
        expect(vacia.status).toBe(200);
        expect(vacia.body).toMatchObject({ data: [], total: 0, totalPages: 0 });
        expect((await request(app).get('/users/estado/borrado').set(bearer(tokens.admin))).status).toBe(400);
    });
});

describe('POST /users (registro)', () => {
    const nuevo = { usuario: 'nuevo', correo: 'Nuevo@Ejemplo.test', password: 'MiClave2026' };

    test('sin sesión crea una cuenta user pendiente con la contraseña cifrada', async () => {
        const res = await request(app).post('/users').send(nuevo);
        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({ usuario: 'nuevo', correo: 'nuevo@ejemplo.test', rol: 'user', estado: 'pendiente', protegido: false });
        expect(res.body.password).toBeUndefined();
        const guardado = prisma.$tables.usuario.find(u => u.usuario === 'nuevo');
        expect(guardado.password).toMatch(/^\$2[aby]\$12\$/);
    });

    test.each([
        [{}, /no son válidos/],
        [{ correo: 'x@x.test', password: 'MiClave2026' }, /usuario/],
        [{ usuario: 'x', correo: 'no-es-correo', password: 'MiClave2026' }, /correo/],
        [{ usuario: 'x', correo: 'x@x.test' }, /obligatoria/],
        [{ usuario: 'x', correo: 'x@x.test', password: 'Ab1' }, /al menos 8/],
        [{ usuario: 'x', correo: 'x@x.test', password: 'solamenteletras' }, /letra y un número/],
        [{ usuario: 'x', correo: 'x@x.test', password: '1234567890' }, /letra y un número/],
        [{ usuario: 'x', correo: 'x@x.test', password: 'a1' + 'ñ'.repeat(40) }, /demasiado larga/]
    ])('datos inválidos %j responden 400', async (body, mensaje) => {
        const res = await request(app).post('/users').send(body);
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(mensaje);
    });

    test('rol inválido 400 y protegido no booleano 400', async () => {
        expect((await request(app).post('/users').send({ ...nuevo, rol: 'root' })).status).toBe(400);
        expect((await request(app).post('/users').send({ ...nuevo, protegido: 'si' })).status).toBe(400);
    });

    test('sin sesión no se puede pedir rol admin ni cuenta protegida', async () => {
        expect((await request(app).post('/users').send({ ...nuevo, rol: 'admin' })).status).toBe(403);
        expect((await request(app).post('/users').send({ ...nuevo, protegido: true })).status).toBe(403);
    });

    test('un admin puede crear admins pero no dev', async () => {
        const ok = await request(app).post('/users').set(bearer(tokens.admin)).send({ ...nuevo, rol: 'admin' });
        expect(ok.status).toBe(201);
        expect(ok.body.rol).toBe('admin');
        const dev = await request(app).post('/users').set(bearer(tokens.admin)).send({ ...nuevo, usuario: 'n2', correo: 'n2@x.test', rol: 'dev' });
        expect(dev.status).toBe(403);
    });

    test('un dev puede crear cuentas dev protegidas, que nacen activas', async () => {
        const res = await request(app).post('/users').set(bearer(tokens.dev)).send({ ...nuevo, rol: 'dev', protegido: true });
        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({ rol: 'dev', protegido: true, estado: 'activo' });
    });

    test('correo repetido responde 409', async () => {
        expect((await request(app).post('/users').send({ ...nuevo, correo: 'user@ejemplo.test' })).status).toBe(409);
    });

    test('un token inválido en el registro responde 401', async () => {
        expect((await request(app).post('/users').set(bearer('basura')).send(nuevo)).status).toBe(401);
    });
});

describe('PATCH /users/:id', () => {
    test('un usuario edita su usuario y correo', async () => {
        const res = await request(app).patch(`/users/${users.user.id}`).set(bearer(tokens.user))
            .send({ usuario: ' renombrado ', correo: 'NUEVO@ejemplo.test' });
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ usuario: 'renombrado', correo: 'nuevo@ejemplo.test' });
        expect(res.body.session).toBeUndefined();
    });

    test('cambiar la propia contraseña exige la actual, invalida el token anterior y devuelve uno nuevo', async () => {
        const sinActual = await request(app).patch(`/users/${users.user.id}`).set(bearer(tokens.user)).send({ password: 'NuevaClave77' });
        expect(sinActual.status).toBe(401);
        const malActual = await request(app).patch(`/users/${users.user.id}`).set(bearer(tokens.user))
            .send({ password: 'NuevaClave77', passwordActual: 'Incorrecta999' });
        expect(malActual.status).toBe(401);

        // El token anterior se emitió en un segundo anterior al cambio.
        await new Promise(r => setTimeout(r, 1100));
        const ok = await request(app).patch(`/users/${users.user.id}`).set(bearer(tokens.user))
            .send({ password: 'NuevaClave77', passwordActual: PASSWORD });
        expect(ok.status).toBe(200);
        expect(ok.body.session.token).toBeDefined();
        expect(ok.body.password).toBeUndefined();

        expect((await request(app).get('/users/me').set(bearer(tokens.user))).status).toBe(401);
        expect((await request(app).get('/users/me').set(bearer(ok.body.session.token))).status).toBe(200);
        expect((await login('user@ejemplo.test', 'NuevaClave77')).status).toBe(200);
        expect((await login('user@ejemplo.test', PASSWORD)).status).toBe(401);
    });

    test('la nueva contraseña debe cumplir la política', async () => {
        const res = await request(app).patch(`/users/${users.user.id}`).set(bearer(tokens.user))
            .send({ password: 'corta1', passwordActual: PASSWORD });
        expect(res.status).toBe(400);
    });

    test('un admin restablece la contraseña de un user sin conocer la actual', async () => {
        const res = await request(app).patch(`/users/${users.otro.id}`).set(bearer(tokens.admin)).send({ password: 'Restablecida1' });
        expect(res.status).toBe(200);
        expect(res.body.session).toBeUndefined();
        expect((await login('otro@ejemplo.test', 'Restablecida1')).status).toBe(200);
    });

    test('un usuario no puede cambiarse rol, estado ni protegido', async () => {
        for (const body of [{ rol: 'dev' }, { estado: 'activo' }, { protegido: true }, { password: 'x', pin: '1' }]) {
            expect((await request(app).patch(`/users/${users.user.id}`).set(bearer(tokens.user)).send(body)).status).toBe(403);
        }
    });

    test('un usuario no puede editar a otro', async () => {
        expect((await request(app).patch(`/users/${users.otro.id}`).set(bearer(tokens.user)).send({ usuario: 'x' })).status).toBe(403);
    });

    test('un admin cambia el rol de un user, pero no puede asignar dev ni editar a un dev', async () => {
        const ok = await request(app).patch(`/users/${users.user.id}`).set(bearer(tokens.admin)).send({ rol: 'admin' });
        expect(ok.status).toBe(200);
        expect(ok.body.rol).toBe('admin');
        expect((await request(app).patch(`/users/${users.otro.id}`).set(bearer(tokens.admin)).send({ rol: 'dev' })).status).toBe(403);
        expect((await request(app).patch(`/users/${users.dev.id}`).set(bearer(tokens.admin)).send({ usuario: 'x' })).status).toBe(403);
    });

    test('un dev puede asignar el rol dev', async () => {
        const res = await request(app).patch(`/users/${users.otro.id}`).set(bearer(tokens.dev)).send({ rol: 'dev' });
        expect(res.status).toBe(200);
        expect(res.body.rol).toBe('dev');
    });

    test('validaciones: body vacío, campo vacío, correo inválido, id mal formado e inexistente', async () => {
        expect((await request(app).patch(`/users/${users.user.id}`).set(bearer(tokens.user)).send({})).status).toBe(400);
        expect((await request(app).patch(`/users/${users.user.id}`).set(bearer(tokens.user)).send({ usuario: '  ' })).status).toBe(400);
        expect((await request(app).patch(`/users/${users.user.id}`).set(bearer(tokens.user)).send({ correo: 'x' })).status).toBe(400);
        expect((await request(app).patch('/users/123').set(bearer(tokens.admin)).send({ usuario: 'x' })).status).toBe(400);
        expect((await request(app).patch(`/users/${UUID_INEXISTENTE}`).set(bearer(tokens.admin)).send({ usuario: 'x' })).status).toBe(404);
    });
});

describe('PATCH /users/estado/:id', () => {
    test('un admin aprueba una cuenta pendiente', async () => {
        const res = await request(app).patch(`/users/estado/${users.pendiente.id}`).set(bearer(tokens.admin)).send({ estado: 'activo' });
        expect(res.status).toBe(200);
        expect(res.body.estado).toBe('activo');
    });

    test('estado inválido 400, user 403, dev ajeno 403, a sí mismo 403, inexistente 404', async () => {
        const ruta = `/users/estado/${users.pendiente.id}`;
        expect((await request(app).patch(ruta).set(bearer(tokens.admin)).send({ estado: 'pendiente' })).status).toBe(400);
        expect((await request(app).patch(ruta).set(bearer(tokens.user)).send({ estado: 'activo' })).status).toBe(403);
        expect((await request(app).patch(`/users/estado/${users.dev.id}`).set(bearer(tokens.admin)).send({ estado: 'rechazado' })).status).toBe(403);
        expect((await request(app).patch(`/users/estado/${users.admin.id}`).set(bearer(tokens.admin)).send({ estado: 'rechazado' })).status).toBe(403);
        expect((await request(app).patch(`/users/estado/${UUID_INEXISTENTE}`).set(bearer(tokens.admin)).send({ estado: 'activo' })).status).toBe(404);
    });
});

describe('PATCH /users/protegido/:id (solo dev)', () => {
    test('un dev marca una cuenta como protegida', async () => {
        const res = await request(app).patch(`/users/protegido/${users.admin.id}`).set(bearer(tokens.dev)).send({ protegido: true });
        expect(res.status).toBe(200);
        expect(res.body.protegido).toBe(true);
    });

    test('un admin 403, valor inválido 400, inexistente 404', async () => {
        expect((await request(app).patch(`/users/protegido/${users.user.id}`).set(bearer(tokens.admin)).send({ protegido: true })).status).toBe(403);
        expect((await request(app).patch(`/users/protegido/${users.user.id}`).set(bearer(tokens.dev)).send({ protegido: 'si' })).status).toBe(400);
        expect((await request(app).patch(`/users/protegido/${UUID_INEXISTENTE}`).set(bearer(tokens.dev)).send({ protegido: true })).status).toBe(404);
    });
});

describe('DELETE /users/:id', () => {
    test('un admin elimina a un user', async () => {
        const res = await request(app).delete(`/users/${users.otro.id}`).set(bearer(tokens.admin));
        expect(res.status).toBe(200);
        expect(res.body.password).toBeUndefined();
        expect(prisma.$tables.usuario.some(u => u.id === users.otro.id)).toBe(false);
    });

    test('una cuenta protegida no se puede eliminar', async () => {
        const res = await request(app).delete(`/users/${users.dev.id}`).set(bearer(tokens.dev));
        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Esta cuenta no puede ser eliminada.');
    });

    test('user 403, admin sobre dev 403, inexistente 404, id mal formado 400', async () => {
        expect((await request(app).delete(`/users/${users.otro.id}`).set(bearer(tokens.user))).status).toBe(403);
        prisma.$tables.usuario.find(u => u.id === users.dev.id).protegido = false;
        expect((await request(app).delete(`/users/${users.dev.id}`).set(bearer(tokens.admin))).status).toBe(403);
        expect((await request(app).delete(`/users/${UUID_INEXISTENTE}`).set(bearer(tokens.admin))).status).toBe(404);
        expect((await request(app).delete('/users/no-es-uuid').set(bearer(tokens.admin))).status).toBe(400);
    });
});
