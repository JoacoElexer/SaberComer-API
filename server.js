import app from './app.js';
import prisma from './DB/prismaClient.js';

const PORT = Number(process.env.PORT) || 3010;

try {
    await prisma.$connect();
    console.log('Conectado a la base de datos.');
} catch (error) {
    console.error(`Error al conectar a la base de datos: ${error.name}: ${error.message}`);
    process.exit(1);
}

const server = app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});

// Render envía SIGTERM al desplegar una versión nueva: se dejan de aceptar
// conexiones, se terminan las peticiones en curso y se cierra la base de datos.
let cerrando = false;
async function shutdown(signal) {
    if (cerrando) return;
    cerrando = true;
    console.log(`${signal} recibido, cerrando el servidor...`);
    const forzar = setTimeout(() => process.exit(1), 10_000).unref();
    server.close(async () => {
        await prisma.$disconnect();
        clearTimeout(forzar);
        process.exit(0);
    });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
