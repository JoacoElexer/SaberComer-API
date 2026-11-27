// Ejecuta una consulta paginada y devuelve [elementos, total].
export async function findPage(model, { where, orderBy, skip, take }) {
    return await Promise.all([
        model.findMany({ where, orderBy, skip, take }),
        model.count({ where })
    ]);
}
