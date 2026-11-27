import request from 'supertest';
import jwt from 'jsonwebtoken';
import { loadApp, seedUsers, bearer, PIN, UUID_INEXISTENTE } from './support/helpers.js';

const { app, prisma, auth } = await loadApp();
let users, tokens;

beforeEach(() => {
    prisma.$reset();
    ({ users, tokens } = seedUsers(prisma, auth));
});

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
        const { readFileSync } = await import('node:fs');
        const key = readFileSync(process.env.JWT_PRIVATE_KEY_PATH, 'utf8');
        const token = jwt.sign({ rol: 'user' }, key, {
            algorithm: 'RS256', subject: users.user.id, issuer: 'sabercomer-api', expiresIn: -10
        });
        const res = await request(app).get('/users/me').set(bearer(token));
        expect(res.status).toBe(401);
        expect(res.body.message).toMatch(/expiró/);
    });

    test('token firmado con otra clave responde 401', async () => {
        const token = jwt.sign({ rol: 'dev' }, 'secreto', { algorithm: 'HS256', subject: users.dev.id, issuer: 'sabercomer-api' });
        const res = await request(app).get('/users/me').set(bearer(token));
        expect(res.status).toBe(401);
    });

    test('token de una cuenta que dejó de estar activa responde 401', async () => {
        prisma.$tables.usuario.find(u => u.id === users.user.id).estado = 'rechazado';
        const res = await request(app).get('/users/me').set(bearer(tokens.user));
        expect(res.status).toBe(401);
        expect(res.body.message).toBe('La cuenta no está activa.');
    });

    test('token de un usuario eliminado responde 401', async () => {
        prisma.$tables.usuario.splice(prisma.$tables.usuario.findIndex(u => u.id === users.user.id), 1);
        const res = await request(app).get('/users/me').set(bearer(tokens.user));
        expect(res.status).toBe(401);
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
    test('login correcto devuelve token verificable con la clave pública', async () => {
        const res = await request(app).post('/users/login').send({ correo: 'USER@ejemplo.test', pin: PIN });
        expect(res.status).toBe(200);
        expect(res.body.user).toMatchObject({ id: users.user.id, rol: 'user' });
        expect(res.body.user.pin).toBeUndefined();
        expect(new Date(res.body.expiresAt).getTime()).toBeGreaterThan(Date.now());

        // Lo que hará el front-end sin conexión: verificar con la clave pública.
        const pem = (await request(app).get('/users/public-key')).text;
        const payload = jwt.verify(res.body.token, pem, { algorithms: ['RS256'], issuer: 'sabercomer-api' });
        expect(payload).toMatchObject({ sub: users.user.id, rol: 'user', iss: 'sabercomer-api' });

        const me = await request(app).get('/users/me').set(bearer(res.body.token));
        expect(me.status).toBe(200);
    });

    test('faltan datos responde 400', async () => {
        const res = await request(app).post('/users/login').send({ correo: 'user@ejemplo.test' });
        expect(res.status).toBe(400);
    });

    test('correo inexistente y PIN incorrecto dan el mismo 401', async () => {
        const a = await request(app).post('/users/login').send({ correo: 'nadie@ejemplo.test', pin: PIN });
        const b = await request(app).post('/users/login').send({ correo: 'user@ejemplo.test', pin: '9999' });
        expect(a.status).toBe(401);
        expect(b.status).toBe(401);
        expect(a.body.message).toBe(b.body.message);
    });

    test('cuenta pendiente o rechazada responde 403 solo con PIN correcto', async () => {
        const pendiente = await request(app).post('/users/login').send({ correo: 'pendiente@ejemplo.test', pin: PIN });
        expect(pendiente.status).toBe(403);
        expect(pendiente.body.message).toMatch(/pendiente/);

        const rechazado = await request(app).post('/users/login').send({ correo: 'rechazado@ejemplo.test', pin: PIN });
        expect(rechazado.status).toBe(403);
        expect(rechazado.body.message).toMatch(/rechazada/);

        const pinMalo = await request(app).post('/users/login').send({ correo: 'pendiente@ejemplo.test', pin: '9999' });
        expect(pinMalo.status).toBe(401);
    });
});

describe('GET /users/me', () => {
    test('devuelve el usuario de la sesión sin el PIN', async () => {
        const res = await request(app).get('/users/me').set(bearer(tokens.admin));
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ id: users.admin.id, rol: 'admin' });
        expect(res.body.pin).toBeUndefined();
    });
});

describe('GET /users/email, /role y /estado (solo admin y dev)', () => {
    test.each([
        ['/users/email/user@ejemplo.test'],
        ['/users/role/user'],
        ['/users/estado/activo']
    ])('%s: un user responde 403', async (ruta) => {
        const res = await request(app).get(ruta).set(bearer(tokens.user));
        expect(res.status).toBe(403);
    });

    test('email: admin encuentra al usuario', async () => {
        const res = await request(app).get('/users/email/user@ejemplo.test').set(bearer(tokens.admin));
        expect(res.status).toBe(200);
        expect(res.body.id).toBe(users.user.id);
        expect(res.body.pin).toBeUndefined();
    });

    test('email: inexistente responde 404', async () => {
        const res = await request(app).get('/users/email/nadie@ejemplo.test').set(bearer(tokens.admin));
        expect(res.status).toBe(404);
    });

    test('role: lista por rol', async () => {
        const res = await request(app).get('/users/role/user').set(bearer(tokens.dev));
        expect(res.status).toBe(200);
        expect(res.body.map(u => u.usuario).sort()).toEqual(['otro', 'pendiente', 'rechazado', 'user']);
        expect(res.body.every(u => u.pin === undefined)).toBe(true);
    });

    test('role: rol inválido responde 400', async () => {
        const res = await request(app).get('/users/role/superadmin').set(bearer(tokens.dev));
        expect(res.status).toBe(400);
    });

    test('estado: lista por estado', async () => {
        const res = await request(app).get('/users/estado/pendiente').set(bearer(tokens.admin));
        expect(res.status).toBe(200);
        expect(res.body.map(u => u.usuario)).toEqual(['pendiente']);
    });

    test('estado: inválido responde 400 y sin resultados 404', async () => {
        expect((await request(app).get('/users/estado/borrado').set(bearer(tokens.admin))).status).toBe(400);
        prisma.$tables.usuario.splice(prisma.$tables.usuario.findIndex(u => u.estado === 'rechazado'), 1);
        expect((await request(app).get('/users/estado/rechazado').set(bearer(tokens.admin))).status).toBe(404);
    });
});

describe('POST /users (registro)', () => {
    const nuevo = { usuario: 'nuevo', correo: 'Nuevo@Ejemplo.test', pin: '5678' };

    test('sin sesión crea una cuenta user pendiente con el PIN cifrado', async () => {
        const res = await request(app).post('/users').send(nuevo);
        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({ usuario: 'nuevo', correo: 'nuevo@ejemplo.test', rol: 'user', estado: 'pendiente', protegido: false });
        expect(res.body.pin).toBeUndefined();
        const guardado = prisma.$tables.usuario.find(u => u.usuario === 'nuevo');
        expect(guardado.pin).not.toBe('5678');
    });

    test('datos incompletos responde 400', async () => {
        expect((await request(app).post('/users').send({})).status).toBe(400);
        expect((await request(app).post('/users').send({ usuario: 'x', correo: 'x@x.test' })).status).toBe(400);
    });

    test('rol inválido responde 400 y protegido no booleano 400', async () => {
        expect((await request(app).post('/users').send({ ...nuevo, rol: 'root' })).status).toBe(400);
        expect((await request(app).post('/users').send({ ...nuevo, protegido: 'si' })).status).toBe(400);
    });

    test('sin sesión no se puede pedir rol admin ni cuenta protegida', async () => {
        expect((await request(app).post('/users').send({ ...nuevo, rol: 'admin' })).status).toBe(403);
        expect((await request(app).post('/users').send({ ...nuevo, protegido: true })).status).toBe(403);
    });

    test('un admin puede crear admins pero no dev ni protegidas', async () => {
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
        const res = await request(app).post('/users').send({ ...nuevo, correo: 'user@ejemplo.test' });
        expect(res.status).toBe(409);
    });

    test('un token inválido en el registro responde 401', async () => {
        const res = await request(app).post('/users').set(bearer('basura')).send(nuevo);
        expect(res.status).toBe(401);
    });
});

describe('PATCH /users/:id', () => {
    test('un usuario edita sus propios datos', async () => {
        const res = await request(app).patch(`/users/${users.user.id}`).set(bearer(tokens.user))
            .send({ usuario: 'renombrado', correo: 'NUEVO@ejemplo.test', pin: '0000' });
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ usuario: 'renombrado', correo: 'nuevo@ejemplo.test' });
        const login = await request(app).post('/users/login').send({ correo: 'nuevo@ejemplo.test', pin: '0000' });
        expect(login.status).toBe(200);
    });

    test('un usuario no puede cambiarse rol, estado ni protegido', async () => {
        for (const body of [{ rol: 'dev' }, { estado: 'activo' }, { protegido: true }]) {
            const res = await request(app).patch(`/users/${users.user.id}`).set(bearer(tokens.user)).send(body);
            expect(res.status).toBe(403);
        }
    });

    test('un usuario no puede editar a otro', async () => {
        const res = await request(app).patch(`/users/${users.otro.id}`).set(bearer(tokens.user)).send({ usuario: 'x' });
        expect(res.status).toBe(403);
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

    test('validaciones: body vacío, campo vacío, id mal formado e inexistente', async () => {
        expect((await request(app).patch(`/users/${users.user.id}`).set(bearer(tokens.user)).send({})).status).toBe(400);
        expect((await request(app).patch(`/users/${users.user.id}`).set(bearer(tokens.user)).send({ usuario: '  ' })).status).toBe(400);
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

    test('un admin responde 403, valor inválido 400, inexistente 404', async () => {
        expect((await request(app).patch(`/users/protegido/${users.user.id}`).set(bearer(tokens.admin)).send({ protegido: true })).status).toBe(403);
        expect((await request(app).patch(`/users/protegido/${users.user.id}`).set(bearer(tokens.dev)).send({ protegido: 'si' })).status).toBe(400);
        expect((await request(app).patch(`/users/protegido/${UUID_INEXISTENTE}`).set(bearer(tokens.dev)).send({ protegido: true })).status).toBe(404);
    });
});

describe('DELETE /users/:id', () => {
    test('un admin elimina a un user', async () => {
        const res = await request(app).delete(`/users/${users.otro.id}`).set(bearer(tokens.admin));
        expect(res.status).toBe(200);
        expect(res.body.pin).toBeUndefined();
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
