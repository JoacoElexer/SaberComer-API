import express from 'express';
import dotenv from 'dotenv';
import { errorHandler } from './utils/errorHandler.js';
import { connectDB } from './DB/MongoDbConfig.js';
import FpRouter from './routes/FichaPacienteRouter.js';

dotenv.config();
const app = express();

// !! Coneccion a la base de datos

// Middleware global
app.use(express.json()); // Middleware para parsear JSON

// Rutas
app.use('/fichaPacientes', FpRouter);

// Manejo de errores
app.use(errorHandler);

const PORT = process.env.PORT || 3010;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
    console.log(`Documentacion Swagger: http://localhost:${PORT}/api-docs`);
});