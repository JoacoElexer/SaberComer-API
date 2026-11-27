import 'dotenv/config';
import jwt from 'jsonwebtoken';
import { readFileSync } from 'node:fs';
import prisma from '../DB/prismaClient.js';

// Se firma con RS256: el backend firma con la clave privada y el front-end
// puede verificar el token sin conexión usando solo la clave pública.
const ALGORITHM = 'RS256';
const ISSUER = 'sabercomer-api';
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const privateKey = readFileSync(process.env.JWT_PRIVATE_KEY_PATH || './certs/jwt-private.pem', 'utf8');
export const publicKey = readFileSync(process.env.JWT_PUBLIC_KEY_PATH || './certs/jwt-public.pem', 'utf8');

export const ROLES_ADMIN = ['admin', 'dev'];

function httpError(status, message) {
    return Object.assign(new Error(message), { status });
}

export function signToken(user) {
    const token = jwt.sign(
        { usuario: user.usuario, correo: user.correo, rol: user.rol },
        privateKey,
        { algorithm: ALGORITHM, expiresIn: EXPIRES_IN, subject: user.id, issuer: ISSUER }
    );
    const { exp } = jwt.decode(token);
    return { token, expiresAt: new Date(exp * 1000).toISOString() };
}

// Devuelve el usuario del token (consultando la BD para que una cuenta
// desactivada o con rol cambiado deje de valer al instante), o null si no hay token.
async function resolveUser(req) {
    const [scheme, token] = (req.headers.authorization || '').split(' ');
    if (scheme !== 'Bearer' || !token) return null;

    let payload;
    try {
        payload = jwt.verify(token, publicKey, { algorithms: [ALGORITHM], issuer: ISSUER });
    } catch (error) {
        throw httpError(401, error.name === 'TokenExpiredError'
            ? 'La sesión expiró. Inicia sesión de nuevo.'
            : 'Token inválido.');
    }

    const user = await prisma.usuario.findUnique({ where: { id: payload.sub } });
    if (!user || user.estado !== 'activo') {
        throw httpError(401, 'La cuenta no está activa.');
    }
    return user;
}

export async function requireAuth(req, res, next) {
    try {
        const user = await resolveUser(req);
        if (!user) return next(httpError(401, 'Se requiere iniciar sesión.'));
        req.user = user;
        next();
    } catch (error) {
        next(error);
    }
}

// Igual que requireAuth pero deja pasar peticiones sin token (req.user queda null).
export async function optionalAuth(req, res, next) {
    try {
        req.user = await resolveUser(req);
        next();
    } catch (error) {
        next(error);
    }
}

export function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.rol)) {
            return next(httpError(403, 'No tienes permisos para realizar esta acción.'));
        }
        next();
    };
}

// Un dev puede gestionar a cualquiera; un admin, a todos menos a los dev.
export function canManage(actor, target) {
    if (actor.rol === 'dev') return true;
    return actor.rol === 'admin' && target.rol !== 'dev';
}
