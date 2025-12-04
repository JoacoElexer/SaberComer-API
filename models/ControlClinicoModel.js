import mongoose from 'mongoose';

const controlOptionSchema = new mongoose.Schema({
    mesoterapia: { type: Boolean, default: false },
    acupuntura: { type: Boolean, default: false },
    ejercicios: { type: Boolean, default: false },
    agua: { type: Boolean, default: false },
}, { _id: false });

const controlClinicoSchema = new mongoose.Schema({
    id: { type: String, required: true },
    fecha: { type: Date, required: true, default: Date.now },
    peso: { type: Number, min: 0, max: 300, default: null },
    tx: { type: String, default: "" },
    guia: { type: String, default: "" },
    observaciones: { type: String, default: "" },
    opcionesControl: { type: controlOptionSchema, default: () => ({}) },
    calificacion: { type: Number, min: 1, max: 10, default: null }
},{
    timestamps: true
});

const CcModel = mongoose.model('ControlClinico', controlClinicoSchema);
export default CcModel;