import FpModel from '../models/FichaPacienteModel.js';
import idGenerator from '../utils/idGenerator.js';
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

    async getByName(nombre) { // * Busqueda insensible a caracteres especiales no será implementada por complejidad
        const fichas = await FpModel.find(
            { nombre: { $regex: nombre, $options: 'i' } }
        ).collation({ locale: 'es', strength: 2 }); // Búsqueda regular insensible a mayúsculas/minúsculas
        return fichas;
    }

    async getByTel(telefono) {
        const fichas = await FpModel.find({ telefono: { $regex: telefono } }); // Búsqueda regular insensible a mayúsculas/minúsculas
        return fichas;
    }

    async getByStartDate(fechaInicio) {
        const fichas = await FpModel.find({ fechaInicio: fechaInicio });
        return fichas;
    }

    async getByDayDate(inicio, fin) {
        const fichas = await FpModel.find({ fechaInicio: { $gte: inicio, $lte: fin } });
        return fichas;
    }

    async create(data) {
        const newId = await idGenerator.createId(data.nombre)
        const newData = new FpModel({ ...data, id: newId });
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