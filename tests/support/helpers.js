import { jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcrypt';
import { createFakePrisma } from './fakePrisma.js';

const prismaModulePath = fileURLToPath(new URL('../../DB/prismaClient.js', import.meta.url));

// Carga la app con la base de datos sustituida por el cliente falso en memoria.
export async function loadApp() {
    const prisma = createFakePrisma();
    jest.unstable_mockModule(prismaModulePath, () => ({ default: prisma }));
    const { default: app } = await import('../../app.js');
    const auth = await import('../../utils/auth.js');
    return { app, prisma, auth };
}

export const PASSWORD = 'Secreta123';
const PASSWORD_HASH = bcrypt.hashSync(PASSWORD, 4);

// Crea un usuario de cada tipo y devuelve los usuarios y sus tokens.
export function seedUsers(prisma, auth) {
    const crear = (usuario, rol, estado = 'activo', extra = {}) =>
        prisma.$insert('usuario', { usuario, correo: `${usuario}@ejemplo.test`, password: PASSWORD_HASH, rol, estado, ...extra });

    const users = {
        dev: crear('dev', 'dev', 'activo', { protegido: true }),
        admin: crear('admin', 'admin'),
        user: crear('user', 'user'),
        otro: crear('otro', 'user'),
        pendiente: crear('pendiente', 'user', 'pendiente'),
        rechazado: crear('rechazado', 'user', 'rechazado')
    };
    const tokens = Object.fromEntries(
        Object.entries(users).map(([key, u]) => [key, auth.signToken(u).token])
    );
    return { users, tokens };
}

export const bearer = (token) => ({ Authorization: `Bearer ${token}` });

export const UUID_INEXISTENTE = '00000000-0000-4000-8000-000000000000';
