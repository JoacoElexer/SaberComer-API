import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client.ts';
import { PrismaPg } from '@prisma/adapter-pg';
import { readPem } from '../utils/secrets.js';

if (!process.env.DATABASE_URL) {
    throw new Error('Falta DATABASE_URL.');
}

const connectionString = new URL(process.env.DATABASE_URL);
const adapterConfig = {
    connectionString: process.env.DATABASE_URL,
    // Conexiones simultáneas. Aiven limita el total de conexiones según el plan.
    max: Number(process.env.DATABASE_POOL_MAX) || 5
};

// Certificado CA de la base de datos. DATABASE_CA_CERT puede ser el contenido
// del PEM (por ejemplo en Render) o la ruta del archivo (./certs/ca.pem).
const caCert = process.env.DATABASE_CA_CERT?.includes('-----BEGIN')
    ? readPem({ contentVar: 'DATABASE_CA_CERT' })
    : readPem({ pathVar: 'DATABASE_CA_CERT' });

if (caCert) {
    // Los parámetros SSL de la URL se quitan para que no reemplacen la configuración de abajo.
    for (const parameter of ['sslmode', 'sslrootcert', 'sslcert', 'sslkey']) {
        connectionString.searchParams.delete(parameter);
    }
    adapterConfig.connectionString = connectionString.toString();
    adapterConfig.ssl = { ca: caCert, rejectUnauthorized: true };
} else if (process.env.NODE_ENV === 'production') {
    throw new Error('En producción se requiere el certificado CA de la base de datos (DATABASE_CA_CERT o DATABASE_CA_CERT_PATH).');
}

const adapter = new PrismaPg(adapterConfig);

// Las consultas solo se registran si se pide con PRISMA_LOG_QUERIES=true,
// porque pueden revelar qué datos de pacientes se consultan.
const log = ['warn', 'error'];
if (process.env.PRISMA_LOG_QUERIES === 'true' && process.env.NODE_ENV !== 'production') log.unshift('query');

const prisma = new PrismaClient({ adapter, log });

export default prisma;
