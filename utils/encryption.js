import bcrypt from 'bcrypt';
const SALT_ROUNDS = 10;

async function hashValue(input) {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    return await bcrypt.hash(input, salt);
}

async function compareValue(input, hashed) {
    return await bcrypt.compare(input, hashed);
}

export default { hashValue, compareValue };