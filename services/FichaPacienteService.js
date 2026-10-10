import prisma from '../DB/prismaClient.js'; // PostgreSQL
//import FpModel from '../models/FichaPacienteModel.js';
import idGenerator from '../utils/idGenerator.js';
// !! Implementar middleware
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

    async getByStartDate(fechaInicio) {
        return await prisma.fichaPaciente.findMany({
            where: { fechaInicio }
        });
    }

    async getByDayDate(inicio, fin) {
        return await prisma.fichaPaciente.findMany({
            where: { fechaInicio: { gte: inicio, lte: fin } }
        });
    }

    async create(data) {
        return await prisma.fichaPaciente.create({
            data: data
        });
    }

    async update(id, data) {
        return await prisma.fichaPaciente.update({
            where: { id },
            data: data
        });
    }

    async delete(id) {
        return await prisma.fichaPaciente.delete({
            where: { id }
        });
    }
}

export default FichaPacienteService;