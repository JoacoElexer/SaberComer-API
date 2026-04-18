import express from 'express';
import dotenv from 'dotenv';
import { errorHandler } from './utils/errorHandler.js';
import mongoConnection from './DB/MongoDbConfig.js';
import router from './router/router.js';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger.js';
import cors from 'cors';

dotenv.config();

const webAppUrl = process.env.WEBAPP_URL
const PORT = process.env.PORT || 3010;

const whiteList = [
    webAppUrl,
    'http://localhost:5173'
];

const app = express();

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || whiteList.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('No permitido por CORS'));
        }
    }
}));

// !! Conexión a la base de datos
try {
    await mongoConnection();
} catch (error) {
    console.error("Error al conectar a la base de datos", error);
}

// Middleware global
app.use(express.json()); // Middleware para parsear JSON
// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Rutas
router(app);

// Manejo de errores
app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
    console.log(`Endpoint general: http://localhost:${PORT}/fichaPacientes`);
    console.log(`Documentacion Swagger: http://localhost:${PORT}/api-docs`);
});