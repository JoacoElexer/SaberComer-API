import request from 'supertest';
import { loadApp } from './support/helpers.js';
import { seed } from '../prisma/seedData.js';

const { app, prisma } = await loadApp();
const dev = { usuario: 'dev-seed', correo: 'Dev-Seed@ejemplo.test', pin: '4321' };

beforeEach(() => prisma.$reset());

describe('Seed', () => {
    test('crea una cuenta dev, 3 pacientes y 3 controles y 3 medidas por paciente', async () => {
        const total = await seed(prisma, { dev });
        expect(total).toEqual({ usuarios: 1, pacientes: 3, controles: 9, medidas: 9 });

        const { usuario, fichaPaciente, controlClinico, recordMedidas } = prisma.$tables;
        expect(usuario).toHaveLength(1);
        expect(usuario[0]).toMatchObject({ rol: 'dev', estado: 'activo', protegido: true, correo: 'dev-seed@ejemplo.test' });
        expect(usuario[0].pin).not.toBe(dev.pin);
        expect(fichaPaciente).toHaveLength(3);
        for (const ficha of fichaPaciente) {
            expect(controlClinico.filter(c => c.pacienteId === ficha.id)).toHaveLength(3);
            expect(recordMedidas.filter(r => r.pacienteId === ficha.id)).toHaveLength(3);
        }
    });

    test('se puede ejecutar varias veces sin duplicar datos ni cambiar el PIN', async () => {
        await seed(prisma, { dev });
        const pinOriginal = prisma.$tables.usuario[0].pin;
        await seed(prisma, { dev: { ...dev, pin: '9999' } });
        expect(prisma.$tables.usuario).toHaveLength(1);
        expect(prisma.$tables.usuario[0].pin).toBe(pinOriginal);
        expect(prisma.$tables.fichaPaciente).toHaveLength(3);
        expect(prisma.$tables.controlClinico).toHaveLength(9);
        expect(prisma.$tables.recordMedidas).toHaveLength(9);
    });

    test('la cuenta dev puede iniciar sesión y consultar los datos sembrados', async () => {
        await seed(prisma, { dev });
        const login = await request(app).post('/users/login').send({ correo: dev.correo, pin: dev.pin });
        expect(login.status).toBe(200);
        const auth = { Authorization: `Bearer ${login.body.token}` };
        expect((await request(app).get('/fichaPacientes').set(auth)).body).toHaveLength(3);
        expect((await request(app).get('/fichaPacientes/startdate/2026-09-01').set(auth)).body).toHaveLength(1);
        expect((await request(app).get('/controlClinico/date/2026-09-08').set(auth)).body).toHaveLength(1);
    });

    test('sin credenciales del dev falla con un mensaje claro', async () => {
        await expect(seed(prisma, { dev: { usuario: 'x' } })).rejects.toThrow(/SEED_DEV_PIN/);
        expect(prisma.$tables.usuario).toHaveLength(0);
    });
});
