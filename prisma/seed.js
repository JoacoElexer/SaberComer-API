// Uso: npm run db:seed  (o npx prisma db seed)
import 'dotenv/config';
import prisma from '../DB/prismaClient.js';
import { seed } from './seedData.js';

try {
    const total = await seed(prisma, {
        dev: {
            usuario: process.env.SEED_DEV_USUARIO,
            correo: process.env.SEED_DEV_CORREO,
            pin: process.env.SEED_DEV_PIN
        }
    });
    console.log('Seed completado:', total);
} catch (error) {
    console.error('Error al ejecutar el seed:', error.message);
    process.exitCode = 1;
} finally {
    await prisma.$disconnect();
}
