export async function createId(nombre, apellido) {
    const id = nombre.charAt(0).toUpperCase() + apellido.charAt(0).toUpperCase() + "-" + Math.floor(Math.random() * 10000);
    return id;
}