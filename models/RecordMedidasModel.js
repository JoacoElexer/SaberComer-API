import mongoose from 'mongoose';

const medidaSchema = new mongoose.Schema({
    busto: { type: Number, min: 0, max: 300, default: null },
    abdomenAlto: { type: Number, min: 0, max: 300, default: null },
    ombligo: { type: Number, min: 0, max: 300, default: null },
    cadera: { type: Number, min: 0, max: 300, default: null }
}, { _id: false });

const recordMedidasSchema = new mongoose.Schema({
    id: { type: String, required: true },
    fecha: { type: Date, required: true, default: Date.now },
    medidas: { type: medidaSchema, default: () => ({}) },
    observaciones: { type: String, trim: true, default: "" }
},{
    timestamps: true
});

const RmModel = mongoose.model('RecordMedidas', recordMedidasSchema);
export default RmModel;