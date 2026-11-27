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
    }

    if (status >= 500) {
        // El detalle interno se registra en el servidor, nunca se envía al cliente.
        if (process.env.NODE_ENV !== 'test') console.error(err);
        message = 'Error interno del servidor.';
    }

    res.status(status).json({ message });
};
