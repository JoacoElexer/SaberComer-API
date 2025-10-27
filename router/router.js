import FpRouter from '../routes/FichaPacienteRouter.js';
import RmRouter from '../routes/RecordMedidasRouter.js';
import CcRouter from '../routes/ControlClinicoRouter.js';

function router(app) {
    app.use('/fichaPacientes', FpRouter);
    app.use('/recordMedidas', RmRouter);
    app.use('/controlClinico', CcRouter);
}

export default router;