import prisma from '../DB/prismaClient.js';
import { dayRange } from '../utils/dateRange.js';

class FichaPacienteService {

    async tetera() {
        return 'soy una tetera!';
    }

    async getAll() {
        return await prisma.fichaPaciente.findMany();
    }

    async getById(id) {
        return await prisma.fichaPaciente.findUnique({
            where: { id }
        });
    }

    async getByName(nombre) { // * Busqueda insensible a caracteres especiales no será implementada por complejidad
        return await prisma.fichaPaciente.findMany({
            where: { nombre: { contains: nombre, mode: 'insensitive' } }
        });
    }

    async getByTel(telefono) {
        return await prisma.fichaPaciente.findMany({
            where: { telefono: { contains: telefono } }
        });
    }

    // Fichas cuya fecha de inicio cae en el mismo día que `fecha`.
    async getByStartDay(fecha) {
        return await prisma.fichaPaciente.findMany({
            where: { fechaInicio: dayRange(fecha) }
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
