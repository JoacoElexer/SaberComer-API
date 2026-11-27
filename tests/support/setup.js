// Se ejecuta antes de cada archivo de pruebas: entorno de test y claves JWT
// temporales, para no depender de certs/ ni del .env.
import { generateKeyPairSync } from 'node:crypto';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'sabercomer-test-'));
const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});
writeFileSync(join(dir, 'private.pem'), privateKey);
writeFileSync(join(dir, 'public.pem'), publicKey);

process.env.NODE_ENV = 'test';
process.env.JWT_PRIVATE_KEY_PATH = join(dir, 'private.pem');
process.env.JWT_PUBLIC_KEY_PATH = join(dir, 'public.pem');
process.env.JWT_EXPIRES_IN = '1h';
process.env.WEBAPP_URL = 'http://front.test';
