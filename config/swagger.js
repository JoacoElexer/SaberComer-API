import swaggerJsdoc from 'swagger-jsdoc';
const PORT = process.env.PORT || 3010;
const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'SaberComer-API',
            version: '1.0.0',
            description: 'Documentación automática de la API de Saber Comer',
        },
        servers: [
            {
                url: `http://localhost:${PORT}`,
            }
        ],
    },

    // ESTA PARTE es clave:
    // Le dices dónde están tus rutas para generar la documentación automáticamente
    apis: ['./router/**/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
