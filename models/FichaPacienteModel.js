import mongoose from 'mongoose';

// * Antecedentes Heredo Familiares
const antHeredoFamiliareSchema = new mongoose.Schema({
    HTA: { type: Boolean, default: false },
    DM: { type: Boolean, default: false },
    CA: { type: Boolean, default: false },
    tiroides: { type: Boolean, default: false },
    cardiopatias: { type: Boolean, default: false },
    ahfOtros: { type: String, default: "Ninguno" }
}, { _id: false });

// * Antecedentes personales no patologicos
const antPersonalesNoPatologicoSchema = new mongoose.Schema({
    tabaquismo: { type: Boolean, default: false },
    drogas: { type: Boolean, default: false },
    OH: { type: Boolean, default: false }
}, { _id: false });

// * Antecedentes personales patologicos
const antPersonalesPatologicoSchema = new mongoose.Schema({
    enfermedadesPadecidas: { type: String, default: "Ninguna" },
    antecedentesTraumaticos: { type: String, default: "Ninguno" },
    antecedentesQuirurgicos: { type: String, default: "Ninguno" },
    alergiasMedicamentos: { type: String, default: "Ninguna" },
    alergiasAlimentos: { type: String, default: "Ninguna" }
}, { _id: false });

// * Antecedentes GinecoObstetricos
const antGinecoObstetricosSchema = new mongoose.Schema({
    G: { type: String, default: "" },
    P: { type: String, default: "" },
    C: { type: String, default: "" },
    A: { type: String, default: "" },
    FUR: { type: String, default: "" },
    agoOtros: { type: String, default: "" }
}, { _id: false });

// * Control de Peso
const controlDePesoSchema = new mongoose.Schema({
    antecedentesTratamientosCP: { type: String, default: "" }, // * Opcional
    pesoInicio: { type: Number, min: 0, max: 300, default: null }, // * Opcional
    pesoIdeal: { type: Number, min: 0, max: 300, default: null }, // * Opcional
    estatura: { type: Number, min: 0, max: 300, default: null }, // * Opcional
    suIdeal: { type: Number, min: 0, max: 300, default: null }, // * Opcional
}, { _id: false });

const fichaPacientesSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    nombre: { type: String, required: true },
    direccion: { type: String, default: "" },
    ciudad: { type: String, default: "" },
    telefono: { type: String, match: /^[0-9]{10}$/, default: "" },
    fechaNacimiento: { type: Date, required: true },
    fechaInicio: { type: Date, required: true, default: Date.now }, // * Dato agregado automaticamente
    ocupacion: { type: String, default: "" },
    ahf: { type: antHeredoFamiliareSchema, default: () => ({}) }, // antecedentes heredo familiares
    apnp: { type: antPersonalesNoPatologicoSchema, default: () => ({}) }, // Antecedentes personales no patologicos
    app: { type: antPersonalesPatologicoSchema, default: () => ({}) }, // Antecedentes personales patologicos
    ago: { type: antGinecoObstetricosSchema, default: () => ({}) }, // Antecedentes gineco obstetricos
    cdp: { type: controlDePesoSchema, default: () => ({}) }, // Control de peso
    notasAdicionales: String
},{ timestamps: true });

const FpModel = mongoose.model('FichaPaciente', fichaPacientesSchema);
export default FpModel;