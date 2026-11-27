import { readFileSync, existsSync } from 'node:fs';

// Lee un secreto en formato PEM (clave o certificado) de una de estas fuentes:
//   1. una variable con el contenido del PEM (útil en Render y otros servicios);
//      se aceptan saltos de línea reales o escritos como \n,
//   2. una variable con la ruta del archivo (por ejemplo un Secret File de Render
//      en /etc/secrets/...),
//   3. una ruta por defecto (desarrollo local).
// Devuelve null si no se encuentra en ninguna.
export function readPem({ contentVar, pathVar, defaultPath }) {
    const content = contentVar && process.env[contentVar];
    if (content && content.trim()) {
        return content.includes('\\n') ? content.replace(/\\n/g, '\n') : content;
    }
    const path = (pathVar && process.env[pathVar]) || defaultPath;
    if (path && existsSync(path)) return readFileSync(path, 'utf8');
    return null;
}

export function requirePem(options, descripcion) {
    const pem = readPem(options);
    if (!pem) {
        const fuentes = [options.contentVar, options.pathVar].filter(Boolean).join(' o ');
        throw new Error(`Falta ${descripcion}: define ${fuentes}.`);
    }
    return pem;
}
