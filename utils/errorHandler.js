import { routeOf } from './requestLogger.js';

// Traduce errores conocidos de Prisma a respuestas HTTP. Se identifican por
// nombre y código para no acoplar este módulo al cliente generado.
const PRISMA_ERRORS = {
    P2002: [409, 'Ya existe un registro con esos datos.'],
    P2003: [404, 'El registro relacionado no existe.'],
    P2025: [404, 'Registro no encontrado.']
};

export const notFoundHandler = (req, res) => {
    res.status(404).json({ message: 'Ruta no encontrada.' });
};

export const errorHandler = (err, req, res, next) => {
    let status = err.status || err.statusCode || 500;
    let message = err.message;

    if (err.name === 'PrismaClientKnownRequestError' && PRISMA_ERRORS[err.code]) {
        [status, message] = PRISMA_ERRORS[err.code];
    } else if (err.name === 'PrismaClientValidationError') {
        status = 400;
        message = 'Los datos enviados no tienen el formato esperado.';
    } else if (err.type === 'entity.too.large') {
        message = 'El cuerpo de la petición es demasiado grande.';
    } else if (err.type === 'entity.parse.failed') {
        message = 'El cuerpo de la petición no es JSON válido.';
    }

    if (status >= 500) {
        // Se registra el tipo de error y la ruta (sin parámetros ni body, que
        // pueden contener datos de pacientes). Nunca se envía el detalle al cliente.
        if (process.env.NODE_ENV !== 'test') {
            const codigo = err.code ? ` [${err.code}]` : '';
            console.error(`Error ${req.method} ${routeOf(req)}: ${err.name}${codigo}`);
            if (!err.name?.startsWith('Prisma')) console.error(err.stack);
        }
        message = 'Error interno del servidor.';
    }

    res.status(status).json({ message });
};
