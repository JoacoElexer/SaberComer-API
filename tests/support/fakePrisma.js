// Cliente de Prisma falso en memoria. Implementa solo lo que usan los servicios
// (findMany, findUnique, create, update, delete) con el mismo comportamiento de
// errores que Prisma, para probar los endpoints sin base de datos.
import { randomUUID } from 'node:crypto';

const now = () => new Date();

const MODELS = {
    usuario: {
        fields: ['id', 'usuario', 'correo', 'pin', 'rol', 'estado', 'protegido', 'createdAt', 'updatedAt'],
        unique: ['usuario', 'correo'],
        defaults: () => ({ rol: 'user', estado: 'pendiente', protegido: false })
    },
    fichaPaciente: {
        fields: ['id', 'nombre', 'direccion', 'ciudad', 'telefono', 'fechaNacimiento', 'fechaInicio', 'ocupacion',
            'notasAdicionales', 'ahfHta', 'ahfDm', 'ahfCa', 'ahfTiroides', 'ahfCardiopatias', 'ahfOtros',
            'apnpTabaquismo', 'apnpDrogas', 'apnpOh', 'appEnfermedades', 'appTraumaticos', 'appQuirurgicos',
            'appAlergiaMeds', 'appAlergiaAlim', 'agoG', 'agoP', 'agoC', 'agoA', 'agoFur', 'agoOtros',
            'cdpAntecedentes', 'cdpPesoInicio', 'cdpPesoIdeal', 'cdpEstatura', 'cdpSuIdeal', 'createdAt', 'updatedAt'],
        required: ['nombre', 'fechaNacimiento'],
        defaults: () => ({ fechaInicio: now() })
    },
    controlClinico: {
        fields: ['id', 'fecha', 'peso', 'tx', 'guia', 'observaciones', 'calificacion', 'mesoterapia', 'acupuntura',
            'ejercicios', 'agua', 'pacienteId', 'createdAt', 'updatedAt'],
        required: ['pacienteId'],
        foreignKey: 'pacienteId',
        defaults: () => ({ fecha: now(), mesoterapia: false, acupuntura: false, ejercicios: false, agua: false })
    },
    recordMedidas: {
        fields: ['id', 'fecha', 'busto', 'abdomenAlto', 'ombligo', 'cadera', 'observaciones', 'pacienteId',
            'createdAt', 'updatedAt'],
        required: ['pacienteId'],
        foreignKey: 'pacienteId',
        defaults: () => ({ fecha: now() })
    }
};

function knownError(code, message) {
    return Object.assign(new Error(message), { name: 'PrismaClientKnownRequestError', code });
}

function validationError(message) {
    return Object.assign(new Error(message), { name: 'PrismaClientValidationError' });
}

const value = (v) => (v instanceof Date ? v.getTime() : v);

function matches(row, where = {}) {
    return Object.entries(where).every(([field, cond]) => {
        const actual = row[field];
        if (cond !== null && typeof cond === 'object' && !(cond instanceof Date)) {
            if ('contains' in cond) {
                if (typeof actual !== 'string') return false;
                return cond.mode === 'insensitive'
                    ? actual.toLowerCase().includes(cond.contains.toLowerCase())
                    : actual.includes(cond.contains);
            }
            if ('gte' in cond && !(value(actual) >= value(cond.gte))) return false;
            if ('gt' in cond && !(value(actual) > value(cond.gt))) return false;
            if ('lte' in cond && !(value(actual) <= value(cond.lte))) return false;
            if ('lt' in cond && !(value(actual) < value(cond.lt))) return false;
            return true;
        }
        return value(actual) === value(cond);
    });
}

export function createFakePrisma() {
    const tables = Object.fromEntries(Object.keys(MODELS).map(name => [name, []]));
    const client = { $connect: async () => {}, $disconnect: async () => {} };

    const checkFields = (name, data) => {
        const unknown = Object.keys(data).filter(f => !MODELS[name].fields.includes(f));
        if (unknown.length) throw validationError(`Unknown argument \`${unknown[0]}\``);
    };

    const checkUnique = (name, row) => {
        for (const field of MODELS[name].unique ?? []) {
            if (tables[name].some(other => other.id !== row.id && other[field] === row[field])) {
                throw knownError('P2002', `Unique constraint failed on ${field}`);
            }
        }
    };

    const checkForeignKey = (name, row) => {
        const fk = MODELS[name].foreignKey;
        if (fk && !tables.fichaPaciente.some(f => f.id === row[fk])) {
            throw knownError('P2003', 'Foreign key constraint violated');
        }
    };

    for (const name of Object.keys(MODELS)) {
        client[name] = {
            async findMany({ where } = {}) {
                return tables[name].filter(row => matches(row, where)).map(row => ({ ...row }));
            },
            async findUnique({ where }) {
                const row = tables[name].find(r => matches(r, where));
                return row ? { ...row } : null;
            },
            async create({ data }) {
                checkFields(name, data);
                const missing = (MODELS[name].required ?? []).find(f => data[f] === undefined);
                if (missing) throw validationError(`Argument \`${missing}\` is missing.`);
                const row = { id: randomUUID(), ...MODELS[name].defaults(), ...data, createdAt: now(), updatedAt: now() };
                checkUnique(name, row);
                checkForeignKey(name, row);
                tables[name].push(row);
                return { ...row };
            },
            async update({ where, data }) {
                checkFields(name, data);
                const index = tables[name].findIndex(r => matches(r, where));
                if (index === -1) throw knownError('P2025', 'Record to update not found.');
                const row = { ...tables[name][index], ...data, updatedAt: now() };
                checkUnique(name, row);
                tables[name][index] = row;
                return { ...row };
            },
            async upsert({ where, update, create }) {
                const exists = tables[name].some(r => matches(r, where));
                return exists ? this.update({ where, data: update }) : this.create({ data: create });
            },
            async delete({ where }) {
                const index = tables[name].findIndex(r => matches(r, where));
                if (index === -1) throw knownError('P2025', 'Record to delete not found.');
                const [row] = tables[name].splice(index, 1);
                if (name === 'fichaPaciente') { // onDelete: Cascade
                    tables.controlClinico = tables.controlClinico.filter(r => r.pacienteId !== row.id);
                    tables.recordMedidas = tables.recordMedidas.filter(r => r.pacienteId !== row.id);
                }
                return row;
            }
        };
    }

    // Utilidades para las pruebas
    client.$tables = tables;
    client.$reset = () => { for (const name of Object.keys(tables)) tables[name].length = 0; };
    client.$insert = (name, data) => {
        const row = { id: randomUUID(), ...MODELS[name].defaults(), ...data, createdAt: now(), updatedAt: now() };
        tables[name].push(row);
        return { ...row };
    };
    return client;
}
