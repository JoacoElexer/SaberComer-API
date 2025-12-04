import mongoose from 'mongoose';

const antGinecoObstetricosSchema = new mongoose.Schema({
    // * Antecedentes GinecoObstetricos
    G: { type: String, default: "" },
    P: { type: String, default: "" },
    C: { type: String, default: "" },
    A: { type: String, default: "" },
    FUR: { type: String, default: "" },
    AgoOtros: { type: String, default: "" }
}, { _id: false });

const fichaPacientesSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    nombre: { type: String, required: true },
    direccion: { type: String, default: "" },
    noCasa: { type: Number, default: null },
    colonia: { type: String, default: "" },
    ciudad: { type: String, default: "" },
    telefono: { type: String, match: /^[0-9]{10}$/, }, // ! Agregar validación de formato en routes y app
    fechaNacimiento: { type: Date, required: true },
    fechaInicio: { type: Date, required: true, default: Date.now }, // * Dato agregado automaticamente
    ocupacion: { type: String, default: "" },
    HTA: { type: Boolean, default: false },
    DM: { type: Boolean, default: false },
    CA: { type: Boolean, default: false },
    tiroides: { type: Boolean, default: false },
    cardiopatias: { type: Boolean, default: false },
    AHFOtros: { type: String, default: "Ninguno" },
    tabaquismo: { type: Boolean, default: false },
    drogas: { type: Boolean, default: false },
    OH: { type: Boolean, default: false },
    enfermedadesPadecidas: { type: String, default: "Ninguna" },
    antecedentesTraumaticos: { type: String, default: "Ninguno" },
    antecedentesQuirurgicos: { type: String, default: "Ninguno" },
    alergiasMedicamentos: { type: String, default: "Ninguna" },
    alergiasAlimentos: { type: String, default: "Ninguna" },
    antecedentesGinecoObstetricos: { type: antGinecoObstetricosSchema, default: () => ({}) },
    antecedentesTratamientosCP: String, // * Opcional
    pesoInicio: Number, // * Opcional
    pesoIdeal: Number, // * Opcional
    estatura: Number, // * Opcional
    suIdeal: Number, // * Opcional
    notasAdicionales: String
},{
    timestamps: true
}
);

const FpModel = mongoose.model('FichaPaciente', fichaPacientesSchema);
export default FpModel;