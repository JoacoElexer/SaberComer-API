import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema({
    usuario: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    correo: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        match: /^[\w.-]+@[\w.-]+\.\w{2,}$/ // validación simple de correo
    },
    pin: {
        type: String,
        required: true
        // aquí va el hash, no el pin en texto
    },
    rol: {
        type: String,
        enum: ["admin", "nutriologo", "recepcion", "consulta"],
        required: true
    },
    fechaCreacion: {
        type: Date,
        default: Date.now
    }
});

// Antes de guardar → encriptar el PIN
userSchema.pre("save", async function (next) {
    if (!this.isModified("pin")) return next();

    const salt = await bcrypt.genSalt(10);
    this.pin = await bcrypt.hash(this.pin, salt);
    next();
});

// Método para validar el PIN
userSchema.methods.validarPIN = async function (pinPlano) {
    return await bcrypt.compare(pinPlano, this.pin);
};

export default mongoose.model("Usuario", userSchema);
