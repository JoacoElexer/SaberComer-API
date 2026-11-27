import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import router from './router/router.js';
import { errorHandler, notFoundHandler } from './utils/errorHandler.js';
import { requestLogger } from './utils/requestLogger.js';
import { apiLimiter } from './utils/rateLimit.js';

const isProduction = process.env.NODE_ENV === 'production';

// Orígenes permitidos: WEBAPP_URL (se admiten varios separados por comas) y,
// fuera de producción, el servidor de desarrollo de Vite.
const whiteList = [
    ...(process.env.WEBAPP_URL ?? '').split(',').map(url => url.trim()).filter(Boolean),
    ...(isProduction ? [] : ['http://localhost:5173'])
];

const app = express();

// Render (y la mayoría de servicios) ponen un proxy delante de la app. Sin esto,
// todas las peticiones parecerían venir de la misma IP y el límite de
// peticiones bloquearía a todos a la vez.
const trustProxy = process.env.TRUST_PROXY ?? (isProduction ? '1' : '0');
app.set('trust proxy', /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy);

app.use(helmet());
app.use(cors({
    origin(origin, callback) {
        if (!origin || whiteList.includes(origin)) {
            callback(null, true);
        } else {
            callback(Object.assign(new Error('No permitido por CORS'), { status: 403 }));
        }
    }
}));

if (process.env.NODE_ENV !== 'test') app.use(requestLogger);

app.use(apiLimiter);
app.use(express.json({ limit: '100kb' }));

router(app);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
