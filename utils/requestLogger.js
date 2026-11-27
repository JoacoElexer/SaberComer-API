// Ruta en forma de patrón ("/fichaPacientes/name/:nombre") en lugar de la URL
// real, para no escribir en los logs nombres, teléfonos, correos ni ids.
export function routeOf(req) {
    if (req.route?.path) return `${req._logBaseUrl ?? req.baseUrl}${req.route.path}`;
    // Rechazada antes de llegar a una ruta concreta (por ejemplo, sin token).
    if (req._logBaseUrl) return `${req._logBaseUrl}/*`;
    return '(ruta no encontrada)';
}

// Registra método, ruta, estado y duración de cada petición. Nunca registra la
// query, el body ni las cabeceras.
export function requestLogger(req, res, next) {
    const inicio = process.hrtime.bigint();
    res.on('finish', () => {
        const ms = Number(process.hrtime.bigint() - inicio) / 1e6;
        console.log(`${req.method} ${routeOf(req)} ${res.statusCode} ${ms.toFixed(0)}ms`);
    });
    next();
}

// Guarda el prefijo del router montado, porque Express lo restablece al salir.
export function rememberBaseUrl(req, res, next) {
    req._logBaseUrl = req.baseUrl;
    next();
}
