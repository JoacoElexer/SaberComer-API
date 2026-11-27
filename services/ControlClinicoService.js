import prisma from '../DB/prismaClient.js'; // PostgreSQL
import { dayRange } from '../utils/dateRange.js';
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
            where: { fecha: dayRange(fecha) }
        });
    }

    async getByRating(calificacion) {
        return await prisma.controlClinico.findMany({
            where: { calificacion: Number(calificacion) }
        });
    }

    async create(data, pacienteId) {
        return await prisma.controlClinico.create({
            data: {
                ...data,
                pacienteId
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