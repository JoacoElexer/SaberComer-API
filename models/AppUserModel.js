import mongoose from "mongoose";

const userRoleSchema = new mongoose.Schema({ // Subdocumento creado para añadir permisos en el futuro
    rol: {
        type: String,
        enum: ["dev", "admin", "user"],
        default: "user",
        required: true
    }
}, { _id: false });

const userSchema = new mongoose.Schema({
    usuario: { type: String, required: true, unique: true, trim: true },
    correo: { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^[\w.-]+@[\w.-]+\.\w{2,}$/ }, // validación simple de correo
    pin: { type: String, required: true },
    role: { type: userRoleSchema }
}, {
    timestamps: true
});

export default mongoose.model("Usuario", userSchema);
