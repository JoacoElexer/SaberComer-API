import app from './app.js';
import prisma from './DB/prismaClient.js';

const PORT = process.env.PORT || 3010;

try {
    await prisma.$connect();
    console.log('Conectado a Aiven!');
} catch (error) {
    console.error('Error al conectar a Aiven', error);
    process.exit(1);
}

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
