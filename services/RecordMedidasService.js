import prisma from '../DB/prismaClient.js';
import { dayRange } from '../utils/dateRange.js';

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
            where: { fecha: dayRange(fecha) }
        });
    }

    async create(data, pacienteId) {
        return await prisma.recordMedidas.create({
            data: {
                ...data,
                pacienteId
            }
        });
    }

    async update(id, data) {
        return await prisma.recordMedidas.update({
            where: { id },
            data
        });
    }

    async delete(id) {
        return await prisma.recordMedidas.delete({
            where: { id }
        });
    }
}

export default RecordMedidasService;
