import FpRouter from '../routes/FichaPacienteRouter.js';
import RmRouter from '../routes/RecordMedidasRouter.js';
import CcRouter from '../routes/ControlClinicoRouter.js';
import AppUserRouter from '../routes/AppUserRouter.js';
import { requireAuth } from '../utils/auth.js';

function router(app) {
    // Datos clínicos: cualquier usuario con sesión activa.
    app.use('/fichaPacientes', requireAuth, FpRouter);
    app.use('/recordMedidas', requireAuth, RmRouter);
    app.use('/controlClinico', requireAuth, CcRouter);
    // Usuarios: los permisos se definen ruta por ruta.
    app.use('/users', AppUserRouter);
}

export default router;
