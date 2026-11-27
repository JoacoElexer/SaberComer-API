import prisma from '../DB/prismaClient.js';
import { dayRange } from '../utils/dates.js';
import { findPage } from './paginate.js';

const ORDER = [{ fecha: 'desc' }, { id: 'asc' }];

class ControlClinicoService {

    async tetera() {
        return 'soy una tetera!';
    }

    async getAll(page) {
        return await findPage(prisma.controlClinico, { orderBy: ORDER, ...page });
    }

    async getById(id) {
        return await prisma.controlClinico.findUnique({
            where: { id }
        });
    }

    async getByPaciente(pacienteId, page) {
        return await findPage(prisma.controlClinico, { where: { pacienteId }, orderBy: ORDER, ...page });
    }

    async getByDate(dia, page) {
        return await findPage(prisma.controlClinico, { where: { fecha: dayRange(dia) }, orderBy: ORDER, ...page });
    }

    async getByRating(calificacion, page) {
        return await findPage(prisma.controlClinico, { where: { calificacion }, orderBy: ORDER, ...page });
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
            data
        });
    }

    async delete(id) {
        return await prisma.controlClinico.delete({
            where: { id }
        });
    }
}

export default ControlClinicoService;
