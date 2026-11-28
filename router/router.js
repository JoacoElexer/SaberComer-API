import FpRouter from '../routes/FichaPacienteRouter.js';
import RmRouter from '../routes/RecordMedidasRouter.js';
import CcRouter from '../routes/ControlClinicoRouter.js';
import AppUserRouter from '../routes/AppUserRouter.js';
import { requireAuth } from '../utils/auth.js';
import { rememberBaseUrl } from '../utils/requestLogger.js';
import prisma from '../DB/prismaClient.js';
import { createHealthCheck } from '../utils/health.js';

const ttl = Number(process.env.HEALTH_CACHE_MS);
const isHealthy = createHealthCheck(
    () => prisma.$queryRaw`SELECT 1`,
    { ttlMs: Number.isFinite(ttl) && ttl >= 0 ? ttl : 30_000 }
);

function router(app) {
    // Comprobación de salud para Render: responde 200 si la base de datos contesta.
    app.get('/health', async (req, res) => {
        if (await isHealthy()) {
            res.status(200).json({ status: 'ok' });
        } else {
            res.status(503).json({ status: 'error', message: 'Base de datos no disponible.' });
        }
    });

    // Datos clínicos: cualquier usuario con sesión activa.
    app.use('/fichaPacientes', rememberBaseUrl, requireAuth, FpRouter);
    app.use('/recordMedidas', rememberBaseUrl, requireAuth, RmRouter);
    app.use('/controlClinico', rememberBaseUrl, requireAuth, CcRouter);
    // Usuarios: los permisos se definen ruta por ruta.
    app.use('/users', rememberBaseUrl, AppUserRouter);
}

export default router;
