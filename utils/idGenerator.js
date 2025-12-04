async function createId(nombre) {
    if (!nombre || nombre.trim() === '') {
        throw new Error('El nombre proporcionado no es válido para generar un ID.');
    }
    const id = nombre.charAt(0).toUpperCase() + "-" + Math.floor(Math.random() * 10000);
    return id;
}

export default { createId };