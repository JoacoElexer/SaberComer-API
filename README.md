# SaberComer-API

API REST de Saber Comer para gestionar fichas de pacientes, controles clínicos y registros de medidas. Usa Express 5, Prisma 7 y PostgreSQL (alojado en Aiven). La autenticación usa tokens JWT firmados con RS256.

## Requisitos

- Node.js 22.18 o superior (desarrollado con Node 24). El cliente de Prisma se genera en TypeScript y Node lo ejecuta directamente, sin compilar.
- Una base de datos PostgreSQL. Si es la de Aiven, también hace falta su certificado CA.

## Puesta en marcha

1. Instala las dependencias. Esto también genera el cliente de Prisma en `generated/prisma` (script `postinstall`):

   ```bash
   npm install
   ```

2. Copia `.env.example` a `.env` y completa los valores (ver [Variables de entorno](#variables-de-entorno)).

3. Coloca en `certs/` el certificado CA de Aiven (`ca.pem`) y el par de claves para firmar los tokens. La carpeta `certs/` está en `.gitignore` y nunca debe subirse al repositorio. Para generar las claves:

   ```bash
   node -e "const {generateKeyPairSync}=require('crypto');const fs=require('fs');const k=generateKeyPairSync('rsa',{modulusLength:2048,publicKeyEncoding:{type:'spki',format:'pem'},privateKeyEncoding:{type:'pkcs8',format:'pem'}});fs.writeFileSync('certs/jwt-private.pem',k.privateKey);fs.writeFileSync('certs/jwt-public.pem',k.publicKey)"
   ```

4. Aplica las migraciones:

   ```bash
   npm run db:migrate
   ```

   Si cambias `prisma/schema.prisma`, crea una migración nueva con `npx prisma migrate dev --name <nombre>`. El cliente se regenera con `npx prisma generate`.

5. Carga los datos iniciales (opcional, ver [Datos iniciales](#datos-iniciales)):

   ```bash
   npm run db:seed
   ```

6. Arranca el servidor:

   ```bash
   npm run api     # desarrollo, se reinicia con cada cambio (nodemon)
   npm start       # producción
   ```

   Por defecto escucha en `http://localhost:3010`.

## Variables de entorno

| Variable | Descripción |
|---|---|
| `PORT` | Puerto del servidor (por defecto `3010`). |
| `NODE_ENV` | `production` reduce los logs de Prisma a solo errores. |
| `WEBAPP_URL` | Origen del front-end permitido por CORS. `http://localhost:5173` siempre está permitido. |
| `DATABASE_URL` | Cadena de conexión de PostgreSQL. |
| `DATABASE_CA_CERT` | Ruta al certificado CA de la base de datos (por ejemplo `./certs/ca.pem`). |
| `JWT_PRIVATE_KEY_PATH` | Clave privada para firmar tokens (por defecto `./certs/jwt-private.pem`). |
| `JWT_PUBLIC_KEY_PATH` | Clave pública para verificarlos (por defecto `./certs/jwt-public.pem`). |
| `JWT_EXPIRES_IN` | Duración del token, por ejemplo `7d` o `12h` (por defecto `7d`). |
| `SEED_DEV_USUARIO`, `SEED_DEV_CORREO`, `SEED_DEV_PIN` | Datos de la cuenta dev que crea el seed. Solo los usa `npm run db:seed`. |

## Datos iniciales

`npm run db:seed` ejecuta [`prisma/seed.js`](prisma/seed.js) y carga:

- **Una cuenta dev**, activa y protegida, con los datos de `SEED_DEV_*`. Si ya existe una cuenta con ese correo, no se modifica (su PIN no cambia).
- **3 pacientes ficticios**, cada uno con **3 controles clínicos y 3 registros de medidas**, uno por semana desde su fecha de inicio.

Los registros tienen ids fijos, así que el seed se puede ejecutar varias veces sin duplicar nada. Si vuelves a ejecutarlo, los datos de ejemplo recuperan sus valores originales. Los datos están en [`prisma/seedData.js`](prisma/seedData.js).

## Estructura

```
app.js              Configuración de Express (CORS, JSON, rutas, errores). Lo usan el servidor y las pruebas.
server.js           Conecta con la base de datos y levanta el servidor.
router/router.js    Monta los grupos de rutas y la autenticación.
routes/             Endpoints y validación de cada recurso.
services/           Acceso a datos con Prisma.
utils/              Autenticación, validación, fechas, cifrado y manejo de errores.
DB/prismaClient.js  Cliente de Prisma con el adaptador de PostgreSQL y SSL.
prisma/             Esquema, migraciones y seed.
prisma7.config.ts   Configuración de Prisma (esquema, migraciones, seed y conexión).
generated/prisma/   Cliente de Prisma generado (no se sube al repositorio).
tests/              Pruebas automatizadas.
```

## Autenticación

1. `POST /users/login` con `{ "correo", "pin" }` devuelve `{ token, expiresAt, user }`.
2. Las demás peticiones envían el token en la cabecera `Authorization: Bearer <token>`.
3. En cada petición se comprueba la firma del token y que la cuenta siga activa en la base de datos. Así, una cuenta rechazada deja de tener acceso al momento.

Las cuentas nuevas quedan en estado `pendiente` hasta que un admin o dev las aprueba.

### Inicio de sesión sin conexión en el front-end

Los tokens se firman con una clave privada que solo tiene el servidor. El front-end puede verificarlos sin conexión con la clave pública, que se obtiene en `GET /users/public-key` o se incluye en el build. Por ejemplo, con la librería [`jose`](https://github.com/panva/jose):

```js
import { importSPKI, jwtVerify } from 'jose';

const key = await importSPKI(PUBLIC_KEY_PEM, 'RS256');
const { payload } = await jwtVerify(tokenGuardado, key, { issuer: 'sabercomer-api' });
// payload.sub (id), payload.usuario, payload.correo, payload.rol, payload.exp
```

Sin conexión, el token guardado vale hasta que caduca, aunque la cuenta se haya desactivado entretanto. Al recuperar la conexión, el servidor lo vuelve a validar.

### Roles y permisos

| Acción | user | admin | dev |
|---|:-:|:-:|:-:|
| Fichas, controles clínicos y medidas | ✔ | ✔ | ✔ |
| Ver y editar su propio usuario, correo y PIN | ✔ | ✔ | ✔ |
| Buscar usuarios, aprobar o rechazar cuentas, eliminar usuarios | | ✔ (excepto cuentas dev) | ✔ |
| Cambiar el rol de otros usuarios | | ✔ (sin asignar dev) | ✔ |
| Crear cuentas dev o protegidas, marcar cuentas como protegidas | | | ✔ |

Una cuenta protegida no se puede eliminar.

## Endpoints

Todas las respuestas son JSON. Los errores tienen la forma `{ "message": "..." }`. Los `:id` deben ser UUID; un id mal formado responde `400`. Las búsquedas sin resultados responden `404`.

### Usuarios (`/users`)

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/users/teapot` | Público | Prueba de vida (418). |
| GET | `/users/public-key` | Público | Clave pública para verificar tokens. |
| POST | `/users/login` | Público | Inicia sesión y devuelve el token. |
| POST | `/users` | Público o admin/dev | Registra un usuario. Sin sesión siempre crea un `user` pendiente. |
| GET | `/users/me` | Con sesión | Usuario de la sesión. |
| GET | `/users/email/:email` | admin/dev | Busca por correo. |
| GET | `/users/role/:role` | admin/dev | Lista por rol (`dev`, `admin`, `user`). |
| GET | `/users/estado/:estado` | admin/dev | Lista por estado (`pendiente`, `activo`, `rechazado`). |
| PATCH | `/users/:id` | Él mismo o admin/dev | Edita `usuario`, `correo` y `pin`; admin/dev también `rol`. |
| PATCH | `/users/estado/:id` | admin/dev | `{ "estado": "activo" \| "rechazado" }`. |
| PATCH | `/users/protegido/:id` | dev | `{ "protegido": true \| false }`. |
| DELETE | `/users/:id` | admin/dev | Elimina un usuario no protegido. |

### Fichas de pacientes (`/fichaPacientes`, requiere sesión)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/fichaPacientes` | Todas las fichas. |
| GET | `/fichaPacientes/id/:id` | Una ficha. |
| GET | `/fichaPacientes/name/:nombre` | Busca por nombre (sin distinguir mayúsculas). |
| GET | `/fichaPacientes/tel/:telefono` | Busca por teléfono (coincidencia parcial). |
| GET | `/fichaPacientes/startdate/:fecha` | Fichas iniciadas ese día (`AAAA-MM-DD`). `/day/:fecha` es equivalente. |
| POST | `/fichaPacientes` | Crea una ficha. Son obligatorios `nombre`, `telefono` y `fechaNacimiento`. |
| PATCH | `/fichaPacientes/:id` | Actualiza solo los campos enviados. |
| DELETE | `/fichaPacientes/:id` | Elimina la ficha junto con sus controles y medidas. |

### Controles clínicos (`/controlClinico`, requiere sesión)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/controlClinico` | Todos los controles. |
| GET | `/controlClinico/:id` | Un control. |
| GET | `/controlClinico/date/:fecha` | Controles de ese día. |
| GET | `/controlClinico/rating/:calificacion` | Controles con esa calificación (entero de 0 a 10). |
| POST | `/controlClinico/:idFicha` | Crea un control para la ficha indicada. |
| PATCH | `/controlClinico/:id` | Actualiza un control. |
| DELETE | `/controlClinico/:id` | Elimina un control. |

### Registros de medidas (`/recordMedidas`, requiere sesión)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/recordMedidas` | Todos los registros. |
| GET | `/recordMedidas/:id` | Un registro. |
| GET | `/recordMedidas/date/:fecha` | Registros de ese día. |
| POST | `/recordMedidas/:idFicha` | Crea un registro para la ficha indicada. |
| PATCH | `/recordMedidas/:id` | Actualiza un registro. |
| DELETE | `/recordMedidas/:id` | Elimina un registro. |

Los campos de cada recurso son los definidos en [`prisma/schema.prisma`](prisma/schema.prisma). Las fechas se aceptan como `AAAA-MM-DD` o en formato ISO completo. Las búsquedas por día usan el día en UTC.

### Códigos de respuesta

| Código | Significado |
|---|---|
| 400 | Datos o parámetros inválidos. |
| 401 | Sin token, token inválido o caducado, o cuenta no activa. |
| 403 | Sin permisos para la acción, o cuenta pendiente o rechazada al iniciar sesión. |
| 404 | Recurso o ruta no encontrados. |
| 409 | Ya existe un usuario con ese nombre de usuario o correo. |
| 500 | Error interno. El detalle solo se registra en el servidor. |

## Pruebas

```bash
npm test             # ejecuta todas las pruebas
npm run test:watch   # modo observador
```

Las pruebas usan Jest y supertest, y cubren todos los endpoints: casos correctos, validaciones, permisos por rol y autenticación. No necesitan base de datos ni `.env`: sustituyen Prisma por una base de datos falsa en memoria ([`tests/support/fakePrisma.js`](tests/support/fakePrisma.js)) y generan claves JWT temporales. Por eso no cubren la conexión real con PostgreSQL.
