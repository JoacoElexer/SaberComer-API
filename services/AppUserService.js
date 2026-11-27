import prisma from '../DB/prismaClient.js';
import encryption from '../utils/encryption.js';
import { findPage } from './paginate.js';

const ORDER = [{ usuario: 'asc' }];

class AppUserService {

    async tetera() {
        return 'soy una tetera!';
    }

    async getUserByEmail(email) {
        return await prisma.usuario.findUnique({
            where: { correo: email.trim().toLowerCase() }
        });
    }

    async getUsersByRole(rol, page) {
        return await findPage(prisma.usuario, { where: { rol }, orderBy: ORDER, ...page });
    }

    async getUsersByEstado(estado, page) {
        return await findPage(prisma.usuario, { where: { estado }, orderBy: ORDER, ...page });
    }

    // Compara en tiempo constante aunque el usuario no exista (storedHash null).
    async comparePassword(input, storedHash) {
        return await encryption.compareValue(input, storedHash);
    }

    async createUser({ usuario, correo, password, rol = 'user', protegido = false }) {
        return await prisma.usuario.create({
            data: {
                usuario: usuario.trim(),
                correo: correo.trim().toLowerCase(),
                password: await encryption.hashValue(password),
                rol,
                estado: protegido ? 'activo' : 'pendiente',
                protegido
            }
        });
    }

    async getUserById(id) {
        return await prisma.usuario.findUnique({
            where: { id }
        });
    }

    async updateUser(id, data) {
        const updateData = { ...data };
        if (data.password) {
            updateData.password = await encryption.hashValue(data.password);
            // Invalida los tokens emitidos antes del cambio.
            updateData.passwordChangedAt = new Date();
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
