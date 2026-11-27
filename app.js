import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import router from './router/router.js';
import { errorHandler, notFoundHandler } from './utils/errorHandler.js';

const whiteList = [
    process.env.WEBAPP_URL,
    'http://localhost:5173'
].filter(Boolean);

const app = express();

app.use(cors({
    origin(origin, callback) {
        if (!origin || whiteList.includes(origin)) {
            callback(null, true);
        } else {
            callback(Object.assign(new Error('No permitido por CORS'), { status: 403 }));
        }
    }
}));

app.use(express.json());

if (process.env.NODE_ENV !== 'test') {
    app.use((req, res, next) => {
        console.log(`${req.method} ${req.originalUrl}`);
        next();
    });
}

router(app);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
