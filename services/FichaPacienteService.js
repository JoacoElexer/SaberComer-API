import FpModel from '../models/FichaPacienteModel.js';
// !! Implementar middleware
class FichaPacienteService {

    async getAll() {
        const fichas = await FpModel.find();
        return fichas;
    }

    async getById(id) {
        const ficha = await FpModel.find({ id: id }); // Usar find para devolver todas las coincidencias
        return ficha;
    }

    async getByName(nombre) { // !! Hacer busqueda insensible a caracteres especiales como acentos
        const fichas = await FpModel.find({ nombre: { $regex: nombre, $options: 'i' } }); // Búsqueda regular insensible a mayúsculas/minúsculas
        return fichas;
    }

    async getByTel(telefono) {
        // ! Buscar por referencia y no por objeto completo
        const fichas = await FpModel.find({ telefono: { $regex: telefono } }); // Búsqueda regular insensible a mayúsculas/minúsculas
        return fichas;
    }

    async getByStartDate(fechaInicio) {
        const fichas = await FpModel.find({ fechaInicio: fechaInicio });
        return fichas;
    }

    async create(data) {
        const newData = new FpModel(data);
        return await newData.save();
    }

    async update(id, data) {
        const updatedData = await FpModel.findOneAndUpdate(
            { id: id },
            { $set: data },
            { new: true }
        );
        if (!updatedData) {
            throw new Error('La ficha de paciente no existe');
        }
        return updatedData;
    }

    async delete(id) {
        const deletedData = await FpModel.findOneAndDelete({ id: id });
        if (!deletedData) {
            throw new Error('La ficha de paciente no existe');
        }
        return deletedData;
    }
}

export default FichaPacienteService;