import mongoose from 'mongoose';

const fichaPacientesSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    nombre: { type: String, required: true },
    direccion: { type: String, default: "" },
    noCasa: { type: Number, default: null },
    colonia: { type: String, default: "" },
    ciudad: { type: String, default: "" },
    telefono: { type: String, match: /^[0-9]{10}$/, }, // ! Agregar validación de formato en routes y app
    fechaNacimiento: { type: Date, required: true },
    fechaInicio: { type: Date, required: true }, // ! Dato agregado automaticamente
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
    // * Antecedentes GinecoObstetricos
    G: { type: String, default: "" }, // ! Agregar en objeto
    P: { type: String, default: "" }, // ! Agregar en objeto
    C: { type: String, default: "" }, // ! Agregar en objeto
    A: { type: String, default: "" }, // ! Agregar en objeto
    FUR: { type: String, default: "" },
    AgoOtros: { type: String, default: "" },
    // ! mover opcionales a nuevo modelo
    antecedentesTratamientosCP: String, // * Opcional
    edad: Number, // * Opcional
    pesoActual: Number, // * Opcional
    pesoIdeal: Number, // * Opcional
    estatura: Number, // * Opcional
    estatura2: Number, // ! Eliminar y agregar cálculo automático en app
    IMC: Number, // * Opcional (formula: peso * estatura^2)
    suIdeal: Number, // * Opcional
    notasAdicionales: String
});

const FpModel = mongoose.model('FichaPaciente', fichaPacientesSchema);
export default FpModel;