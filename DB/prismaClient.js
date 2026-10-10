import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = new URL(process.env.DATABASE_URL);
const adapterConfig = { connectionString: process.env.DATABASE_URL };

if (process.env.DATABASE_CA_CERT) {
    for (const parameter of ['sslmode', 'sslrootcert', 'sslcert', 'sslkey']) {
        connectionString.searchParams.delete(parameter);
    }
    adapterConfig.connectionString = connectionString.toString();
    adapterConfig.ssl = {
        ca: readFileSync(process.env.DATABASE_CA_CERT, 'utf8'),
        rejectUnauthorized: true
    };
}

const adapter = new PrismaPg(adapterConfig);

const prisma = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV !== 'production'
        ? ['query', 'warn', 'error']
        : ['error']
});

export default prisma;
