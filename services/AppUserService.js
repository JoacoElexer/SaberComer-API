import prisma from '../DB/prismaClient.js'; // PostgreSQL
//import AppUserModel from "../models/AppUserModel.js"; // MongoDB
import encryption from "../utils/encryption.js";

class AppUserService {

    async tetera() {
        return 'soy una tetera!';
    }

    async getUserByEmail(email) {
        return await prisma.usuario.findUnique({
            where: { correo: email.trim().toLowerCase() }
        })
    }

    async getUsersByRole(role) {
        return await prisma.usuario.findMany({
            where: { rol: role }
        })
    }

    async comparePin(inputPin, storedPin) {
        return await encryption.compareValue(inputPin, storedPin);
    }

    async createUser(data) {
        const { usuario, correo, pin, protegido = false } = data;
        const rol = data.rol ?? data.role ?? 'user';
        const hashedPin = await encryption.hashValue(pin);
        return await prisma.usuario.create({
            data: {
                usuario,
                correo: correo.trim().toLowerCase(),
                pin: hashedPin,
                rol: rol ?? 'user',
                estado: protegido ? 'activo' : 'pendiente',
                protegido: protegido ?? false
            }
        });
    }

    async getUserById(id) {
        return await prisma.usuario.findUnique({
            where: { id }
        });
    }

    async getUsersByEstado(estado) {
        return await prisma.usuario.findMany({
            where: { estado }
        });
    }

    async updateUser(id, data) {
        const updateData = { ...data };
        if (data.pin) {
            updateData.pin = await encryption.hashValue(data.pin);
        }
        return await prisma.usuario.update({
            where: { id },
            data: updateData
        });
    }

    async updateEstado(id, estado) {
        return await prisma.usuario.update({
            where: { id },
            data: { estado }
        });
    }

    async updateProtegido(id, protegido) {
        return await prisma.usuario.update({
            where: { id },
            data: { protegido }
        });
    }

    async deleteUser(id) {
        return await prisma.usuario.delete({
            where: { id }
        });
    }
}

export default AppUserService;
