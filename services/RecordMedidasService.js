import RmModel from '../models/RecordMedidasModel.js';

class RecordMedidasService {

    async getAll() {
        const registros = await RmModel.find();
        return registros;
    }

    async getById(id) {
        const registro = await RmModel.find({ id: id }); // Usar find para devolver todas las coincidencias
        return registro;
    }

    async getByDate(fecha) {
        const registros = await RmModel.find({ fecha: fecha }); // Usar find para devolver todas las coincidencias
        return registros;
    }

    async create(data) {
        const newData = new RmModel(data);
        return await newData.save();
    }

    async update(id, data) {
        const updatedData = await RmModel.findOneAndUpdate(
            { id: id },
            { $set: data },
            { new: true }
        );
        if (!updatedData) {
            throw new Error('El registro de medidas no existe');
        }
        return updatedData;
    }

    async delete(id) {
        const deletedData = await RmModel.findOneAndDelete
            ({ id: id });
        if (!deletedData) {
            throw new Error('El registro de medidas no existe');
        }
        return deletedData;
    }
}

export default RecordMedidasService;