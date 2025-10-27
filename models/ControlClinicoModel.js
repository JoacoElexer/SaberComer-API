import mongoose from 'mongoose';

const controlClinicoSchema = new mongoose.Schema({
    id: { type: String, required: true },
    fecha: { type: Date, required: true },
    peso: { type: Number },
    tx: { type: String },
    guia: { type: String },
    observaciones: { type: String },
    mesoterapia: { type: Boolean },
    acupuntura: { type: Boolean },
    ejercicios: { type: Boolean },
    agua: { type: Boolean },
    calificacion: { type: Number }
});

const CcModel = mongoose.model('ControlClinico', controlClinicoSchema);
export default CcModel;