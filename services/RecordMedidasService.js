import prisma from '../DB/prismaClient.js';
import { dayRange } from '../utils/dates.js';
import { findPage } from './paginate.js';

const ORDER = [{ fecha: 'desc' }, { id: 'asc' }];

class RecordMedidasService {

    async tetera() {
        return 'soy una tetera!';
    }

    async getAll(page) {
        return await findPage(prisma.recordMedidas, { orderBy: ORDER, ...page });
    }

    async getById(id) {
        return await prisma.recordMedidas.findUnique({
            where: { id }
        });
    }

    async getByPaciente(pacienteId, page) {
        return await findPage(prisma.recordMedidas, { where: { pacienteId }, orderBy: ORDER, ...page });
    }

    async getByDate(dia, page) {
        return await findPage(prisma.recordMedidas, { where: { fecha: dayRange(dia) }, orderBy: ORDER, ...page });
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
