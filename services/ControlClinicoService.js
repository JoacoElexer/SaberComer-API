import prisma from '../DB/prismaClient.js'; // PostgreSQL
//import CcModel from '../models/ControlClinicoModel.js';

class ControlClinicoService {

    async tetera() {
        return 'soy una tetera!';
    }

    async getAll() {
        return await prisma.controlClinico.findMany();
    }

    async getById(id) {
        return await prisma.controlClinico.findUnique({
            where: { id }
        });
    }

    async getByDate(fecha) {
        return await prisma.controlClinico.findMany({
            where: { fecha }
        });
    }

    async getByRating(rating) {
        return await prisma.controlClinico.findMany({
            where: { rating }
        });
    }

    async create(data, id) {
        return await prisma.controlClinico.create({
            data: {
                ...data,
                usuarioId: id
            }
        });
    }

    async update(id, data) {
        return await prisma.controlClinico.update({
            where: { id },
            data: data
        });
    }

    async delete(id) {
        return await prisma.controlClinico.delete({
            where: { id }
        });
    }
}

export default ControlClinicoService;