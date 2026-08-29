import AppUserModel from "../models/AppUserModel.js";
import encryption from "../utils/encryption.js";

class AppUserService {

    async getUserByEmail(email) {
        const user = await AppUserModel.findOne({ correo: email });
        return user;
    }

    async getByRole(role) {
        const users = await AppUserModel.find({ "role.rol": role });
        return users;
    }

    async comparePin(inputPin, storedPin) {
        const isMatch = await encryption.compareValue(inputPin, storedPin);
        return isMatch;
    }

    async createUser(data) {
        const { usuario, correo, pin, role, protegido } = data;
        const hashedPin = await encryption.hashValue(pin);
        if (role && (!role.rol || typeof role.rol !== "string")) {
            throw new Error("El role debe ser un objeto con la propiedad rol: { rol: 'dev' }");
        }
        const newUser = new AppUserModel({
            usuario,
            correo,
            pin: hashedPin,
            role,
            estado: protegido ? "activo" : "pendiente",
            protegido: protegido ?? false
        });
        return await newUser.save();
    }

    async getUserById(id) {
        return await AppUserModel.findById(id);
    }

    async getUsersByEstado(estado) {
        return await AppUserModel.find({ "estado": estado });
    }

    async updateUser(id, data) {
        const updateData = { ...data };
        if (data.pin) {
            updateData.pin = await encryption.hashValue(data.pin);
        }
        return await AppUserModel.findByIdAndUpdate(id, updateData, { new: true });
    }

    async updateEstado(id, estado) {
        return await AppUserModel.findByIdAndUpdate(
            id,
            { $set: { estado } },
            { new: true }
        );
    }

    async deleteUser(id) {
        return await AppUserModel.findByIdAndDelete(id);
    }
}

export default AppUserService;