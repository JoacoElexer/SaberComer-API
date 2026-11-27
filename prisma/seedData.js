// Datos iniciales: una cuenta dev y 3 pacientes ficticios, cada uno con 3
// controles clínicos y 3 registros de medidas. Los ids son fijos para que el
// seed se pueda ejecutar varias veces sin duplicar nada (upsert).
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

// UUID v4 válido y fijo: 5eed0000-0000-4000-8000-<tipo><número>
const seedId = (tipo, n) => `5eed0000-0000-4000-8000-${tipo}${String(n).padStart(11, '0')}`;

const PACIENTES = [
    {
        nombre: 'María Fernanda Gómez', telefono: '5512345678', ciudad: 'Ciudad de México',
        direccion: 'Av. Insurgentes Sur 1234', ocupacion: 'Contadora',
        fechaNacimiento: '1988-03-14', fechaInicio: '2026-09-01',
        ahfHta: true, ahfDm: true, appAlergiaMeds: 'Penicilina',
        cdpPesoInicio: 82.5, cdpPesoIdeal: 65, cdpEstatura: 1.62,
        controles: [
            { peso: 82.5, calificacion: 7, agua: true },
            { peso: 80.9, calificacion: 8, agua: true, ejercicios: true },
            { peso: 79.6, calificacion: 9, agua: true, ejercicios: true, mesoterapia: true }
        ],
        medidas: [
            { busto: 104, abdomenAlto: 96, ombligo: 101, cadera: 112 },
            { busto: 103, abdomenAlto: 94, ombligo: 99, cadera: 110.5 },
            { busto: 101.5, abdomenAlto: 92, ombligo: 97, cadera: 109 }
        ]
    },
    {
        nombre: 'José Luis Ramírez', telefono: '3398765432', ciudad: 'Guadalajara',
        direccion: 'Calle Morelos 56', ocupacion: 'Ingeniero',
        fechaNacimiento: '1979-11-02', fechaInicio: '2026-09-15',
        ahfCardiopatias: true, apnpTabaquismo: true,
        cdpPesoInicio: 98, cdpPesoIdeal: 80, cdpEstatura: 1.78,
        controles: [
            { peso: 98, calificacion: 6 },
            { peso: 96.4, calificacion: 7, ejercicios: true },
            { peso: 95.1, calificacion: 8, ejercicios: true, acupuntura: true }
        ],
        medidas: [
            { busto: 112, abdomenAlto: 108, ombligo: 110, cadera: 109 },
            { busto: 111, abdomenAlto: 106, ombligo: 108, cadera: 108 },
            { busto: 109.5, abdomenAlto: 104, ombligo: 106.5, cadera: 107 }
        ]
    },
    {
        nombre: 'Ana Sofía Torres', telefono: '8123456789', ciudad: 'Monterrey',
        direccion: 'Av. Constitución 890', ocupacion: 'Estudiante',
        fechaNacimiento: '2001-06-25', fechaInicio: '2026-10-01',
        ahfTiroides: true, agoG: '0', agoP: '0',
        cdpPesoInicio: 68, cdpPesoIdeal: 58, cdpEstatura: 1.60,
        controles: [
            { peso: 68, calificacion: 8, agua: true },
            { peso: 67.1, calificacion: 9, agua: true },
            { peso: 66, calificacion: 10, agua: true, ejercicios: true }
        ],
        medidas: [
            { busto: 92, abdomenAlto: 80, ombligo: 86, cadera: 100 },
            { busto: 91, abdomenAlto: 79, ombligo: 84.5, cadera: 99 },
            { busto: 90.5, abdomenAlto: 77.5, ombligo: 83, cadera: 98 }
        ]
    }
];

const SEMANA_MS = 7 * 24 * 60 * 60 * 1000;

export async function seed(prisma, { dev }) {
    if (!dev?.usuario || !dev?.correo || !dev?.pin) {
        throw new Error('Faltan SEED_DEV_USUARIO, SEED_DEV_CORREO o SEED_DEV_PIN en el .env.');
    }

    // Si la cuenta ya existe no se modifica (en particular, no se cambia su PIN).
    const correo = dev.correo.trim().toLowerCase();
    await prisma.usuario.upsert({
        where: { correo },
        update: {},
        create: {
            usuario: dev.usuario.trim(),
            correo,
            pin: await bcrypt.hash(dev.pin, SALT_ROUNDS),
            rol: 'dev',
            estado: 'activo',
            protegido: true
        }
    });

    for (const [i, { controles, medidas, ...paciente }] of PACIENTES.entries()) {
        const pacienteId = seedId('a', i + 1);
        const ficha = {
            ...paciente,
            fechaNacimiento: new Date(paciente.fechaNacimiento),
            fechaInicio: new Date(paciente.fechaInicio)
        };
        await prisma.fichaPaciente.upsert({ where: { id: pacienteId }, update: ficha, create: { id: pacienteId, ...ficha } });

        // Un control y una medición por semana a partir de la fecha de inicio.
        for (const [j, control] of controles.entries()) {
            const id = seedId('c', (i + 1) * 10 + j + 1);
            const data = {
                ...control,
                fecha: new Date(ficha.fechaInicio.getTime() + j * SEMANA_MS),
                observaciones: j === 0 ? 'Consulta inicial' : `Seguimiento semana ${j}`,
                pacienteId
            };
            await prisma.controlClinico.upsert({ where: { id }, update: data, create: { id, ...data } });
        }
        for (const [j, medida] of medidas.entries()) {
            const id = seedId('d', (i + 1) * 10 + j + 1);
            const data = { ...medida, fecha: new Date(ficha.fechaInicio.getTime() + j * SEMANA_MS), pacienteId };
            await prisma.recordMedidas.upsert({ where: { id }, update: data, create: { id, ...data } });
        }
    }

    return {
        usuarios: 1,
        pacientes: PACIENTES.length,
        controles: PACIENTES.reduce((n, p) => n + p.controles.length, 0),
        medidas: PACIENTES.reduce((n, p) => n + p.medidas.length, 0)
    };
}
