import mongoose from 'mongoose';

const recordMedidasSchema = new mongoose.Schema({
    id: { type: String, required: true },
    fecha: { type: Date, required: true },
    busto: { type: Number },
    abdomenAlto: { type: Number },
    ombligo: { type: Number },
    cadera: { type: Number },
    observaciones: { type: String }
});

const RmModel = mongoose.model('RecordMedidas', recordMedidasSchema);
module.exports = RmModel