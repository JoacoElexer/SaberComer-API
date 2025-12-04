import express from 'express';
import dotenv from 'dotenv';
import { errorHandler } from './utils/errorHandler.js';
import mongoConnection from './DB/MongoDbConfig.js';
import FpRouter from './routes/FichaPacienteRouter.js';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger.js';

dotenv.config();
const app = express();

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
app.use('/fichaPacientes', FpRouter);

// Manejo de errores
app.use(errorHandler);

const PORT = process.env.PORT || 3010;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
    console.log(`Endpoint general: http://localhost:${PORT}/fichaPacientes`);

    console.log(`Documentacion Swagger: http://localhost:${PORT}/api-docs`);
});