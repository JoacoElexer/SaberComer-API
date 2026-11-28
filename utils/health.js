// Comprobación de salud con caché.
//
// Render llama a /health cada pocos segundos. Para no consultar la base de
// datos en cada llamada, un resultado correcto se reutiliza durante `ttlMs`.
// Un fallo no se guarda: la siguiente llamada vuelve a consultar, así que una
// caída se detecta en cuanto caduca la caché y la recuperación, al momento.
export function createHealthCheck(check, { ttlMs = 30_000, now = Date.now } = {}) {
    let okUntil = 0;
    let pending = null;

    return async function isHealthy() {
        if (now() < okUntil) return true;
        // Si llegan varias peticiones a la vez, comparten la misma consulta.
        pending ??= (async () => {
            try {
                await check();
                okUntil = now() + ttlMs;
                return true;
            } catch {
                okUntil = 0;
                return false;
            } finally {
                pending = null;
            }
        })();
        return pending;
    };
}
