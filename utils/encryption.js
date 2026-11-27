import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;
export const PASSWORD_MIN_LENGTH = 8;
// bcrypt solo usa los primeros 72 bytes; más allá se ignorarían en silencio.
export const PASSWORD_MAX_BYTES = 72;

// Hash con el que se compara cuando el usuario no existe, para que el login
// tarde lo mismo exista o no la cuenta (evita adivinar correos por el tiempo).
const DUMMY_HASH = bcrypt.hashSync('contraseña-inexistente', SALT_ROUNDS);

async function hashValue(input) {
    return await bcrypt.hash(input, SALT_ROUNDS);
}

async function compareValue(input, hashed) {
    return await bcrypt.compare(input, hashed ?? DUMMY_HASH);
}

// Devuelve un mensaje de error si la contraseña no cumple la política, o null.
export function passwordProblem(password) {
    if (typeof password !== 'string' || password.length === 0) {
        return 'La contraseña es obligatoria.';
    }
    if (password.length < PASSWORD_MIN_LENGTH) {
        return `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`;
    }
    if (Buffer.byteLength(password, 'utf8') > PASSWORD_MAX_BYTES) {
        return 'La contraseña es demasiado larga (máximo 72 bytes).';
    }
    if (!/\p{L}/u.test(password) || !/\d/.test(password)) {
        return 'La contraseña debe incluir al menos una letra y un número.';
    }
    return null;
}

export default { hashValue, compareValue };
