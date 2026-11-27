import 'dotenv/config';
import { rateLimit } from 'express-rate-limit';

const MINUTO = 60 * 1000;
const intEnv = (name, fallback) => {
    const n = Number(process.env[name]);
    return Number.isInteger(n) && n > 0 ? n : fallback;
};

const limiter = (windowMs, limit, message, extra = {}) => rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { message },
    ...extra
});

// Límite general por IP para toda la API.
export const apiLimiter = limiter(
    15 * MINUTO,
    intEnv('RATE_LIMIT_API_MAX', 300),
    'Demasiadas peticiones. Intenta de nuevo en unos minutos.'
);

// Intentos fallidos de login por IP (los exitosos no cuentan).
export const loginLimiter = limiter(
    15 * MINUTO,
    intEnv('RATE_LIMIT_LOGIN_MAX', 10),
    'Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos.',
    { skipSuccessfulRequests: true }
);

// Registros de cuentas nuevas por IP. No aplica a admin/dev con sesión
// (debe ir después de optionalAuth).
export const registerLimiter = limiter(
    60 * MINUTO,
    intEnv('RATE_LIMIT_REGISTER_MAX', 5),
    'Demasiados registros desde esta conexión. Intenta de nuevo más tarde.',
    { skip: (req) => ['admin', 'dev'].includes(req.user?.rol) }
);
