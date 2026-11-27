import prisma from '../DB/prismaClient.js';
import { dayRange } from '../utils/dates.js';
import { findPage } from './paginate.js';

const ORDER = [{ nombre: 'asc' }, { id: 'asc' }];

class FichaPacienteService {

    async tetera() {
        return 'soy una tetera!';
    }

    async getAll(page) {
        return await findPage(prisma.fichaPaciente, { orderBy: ORDER, ...page });
    }

    async getById(id) {
        return await prisma.fichaPaciente.findUnique({
            where: { id }
        });
    }

    async getByName(nombre, page) { // * Busqueda insensible a caracteres especiales no será implementada por complejidad
        return await findPage(prisma.fichaPaciente, {
            where: { nombre: { contains: nombre, mode: 'insensitive' } }, orderBy: ORDER, ...page
        });
    }

    async getByTel(telefono, page) {
        return await findPage(prisma.fichaPaciente, {
            where: { telefono: { contains: telefono } }, orderBy: ORDER, ...page
        });
    }

    // Fichas cuya fecha de inicio cae en ese día (en la zona horaria de la app).
    async getByStartDay(dia, page) {
        return await findPage(prisma.fichaPaciente, {
            where: { fechaInicio: dayRange(dia) }, orderBy: ORDER, ...page
        });
    }

    async create(data) {
        return await prisma.fichaPaciente.create({
            data
        });
    }

    async update(id, data) {
        return await prisma.fichaPaciente.update({
            where: { id },
            data
        });
    }

    // Los controles clínicos y registros de medidas se eliminan en cascada (onDelete: Cascade).
    async delete(id) {
        return await prisma.fichaPaciente.delete({
            where: { id }
        });
    }
}

export default FichaPacienteService;
