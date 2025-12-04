import CcModel from '../models/ControlClinicoModel.js';

class ControlClinicoService {

    async getAll() {
        const registros = await CcModel.find();
        return registros;
    }

    async getById(id) {
        const registro = await CcModel.find({ id: id }); // Usar find para devolver todas las coincidencias
        return registro;
    }

    async getByDate(fecha) {
        const registros = await CcModel.find({ fecha: fecha }); // Usar find para devolver todas las coincidencias
        return registros;
    }

    async getByRating(rating) {
        const registros = await CcModel.find({ calificacion: rating }); // Usar find para devolver todas las coincidencias
        return registros;
    }

    async create(data) {
        const newData = new CcModel(data);
        return await newData.save();
    }

    async update(id, data) {
        const updatedData = await CcModel.findOneAndUpdate(
            { id: id },
            { $set: data },
            { new: true }
        );
        if (!updatedData) {
            throw new Error('El registro clínico no existe');
        }
        return updatedData;
    }

    async delete(id) {
        const deletedData = await CcModel.findOneAndDelete({ id: id });
        if (!deletedData) {
            throw new Error('El registro clínico no existe');
        }
        return deletedData;
    }
}

export default ControlClinicoService;