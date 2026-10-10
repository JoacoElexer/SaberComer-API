import prisma from '../DB/prismaClient.js'; // PostgreSQL
//import RmModel from '../models/RecordMedidasModel.js';
// !! Implementar middleware
class RecordMedidasService {

    async tetera() {
        return 'soy una tetera!';
    }

    async getAll() {
        return await prisma.recordMedidas.findMany();
    }

    async getById(id) {
        return await prisma.recordMedidas.findUnique({
            where: { id }
        });
    }

    async getByDate(fecha) {
        return await prisma.recordMedidas.findMany({
            where: { fecha }
        });
    }

    async getByDayDate(inicio, fin) {
        return await prisma.recordMedidas.findMany({
            where: { fecha: { gte: inicio, lte: fin } }
        });
    }

    async create(data, id) {
        return await prisma.recordMedidas.create({
            data: {
                ...data,
                id
            }
        });
    }

    async update(id, data) {
        return await prisma.recordMedidas.update({
            where: { id },
            data: data
        });
    }

    async delete(id) {
        return await prisma.recordMedidas.delete({
            where: { id }
        });
    }
}

export default RecordMedidasService;