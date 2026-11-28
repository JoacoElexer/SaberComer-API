# SaberComer-API

API REST de Saber Comer para gestionar fichas de pacientes, controles clínicos y registros de medidas. Usa Express 5, Prisma 7 y PostgreSQL (alojado en Aiven), y se despliega en Render. La autenticación usa contraseñas cifradas con bcrypt y tokens JWT firmados con RS256.

## Requisitos

- Node.js 22.18 o superior (desarrollado con Node 24). El cliente de Prisma se genera en TypeScript y Node lo ejecuta directamente, sin compilar.
- Una base de datos PostgreSQL. Si es la de Aiven, también hace falta su certificado CA.

## Puesta en marcha (local)

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

## Despliegue en Render

El archivo [`render.yaml`](render.yaml) describe el servicio. Puedes crearlo desde el panel de Render con **New → Blueprint**, o a mano con estos valores:

| Ajuste | Valor |
|---|---|
| Build command | `npm ci` (también genera el cliente de Prisma) |
| Start command | `npm run start:render` (aplica las migraciones y arranca) |
| Health check path | `/health` |

Variables que hay que configurar en Render, además de las fijas del `render.yaml`:

- `DATABASE_URL`: la cadena de conexión de Aiven.
- `DATABASE_CA_CERT`: el contenido completo de `ca.pem`.
- `JWT_PRIVATE_KEY` y `JWT_PUBLIC_KEY`: el contenido completo de cada PEM.
- `WEBAPP_URL`: la URL del front-end desplegado.

Render permite pegar valores de varias líneas; también se aceptan con los saltos de línea escritos como `\n`. Otra opción es subirlos como *Secret Files* (quedan en `/etc/secrets/<nombre>`) e indicar esa ruta en `DATABASE_CA_CERT`, `JWT_PRIVATE_KEY_PATH` y `JWT_PUBLIC_KEY_PATH`.

Más detalles del despliegue:

- **Proxy y límites por IP:** Render pone un proxy delante de la app. Por eso en producción `TRUST_PROXY` vale `1` por defecto; sin eso, el límite de peticiones contaría a todos los usuarios como una sola IP.
- **Apagado:** al recibir `SIGTERM` (cada despliegue), el servidor termina las peticiones en curso y cierra la conexión con la base antes de salir.
- **Certificado obligatorio:** en producción la API no arranca sin el certificado CA de la base de datos.
- **Acceso a Aiven:** si en Aiven restringiste las IPs permitidas, añade las IPs de salida de Render (en la pestaña *Connect* del servicio).

## Variables de entorno

| Variable | Descripción |
|---|---|
| `PORT` | Puerto del servidor (por defecto `3010`; Render lo fija solo). |
| `NODE_ENV` | `production` en el servidor. |
| `APP_TIMEZONE` | Zona horaria de la clínica (por defecto `America/Mexico_City`). Ver [Fechas y zona horaria](#fechas-y-zona-horaria). |
| `WEBAPP_URL` | Origen(es) del front-end permitidos por CORS, separados por comas. Fuera de producción también se permite `http://localhost:5173`. |
| `TRUST_PROXY` | Saltos de proxy de confianza. Por defecto `1` en producción y `0` en desarrollo. |
| `DATABASE_URL` | Cadena de conexión de PostgreSQL. |
| `DATABASE_CA_CERT` | Certificado CA de la base de datos: ruta del archivo o contenido del PEM. Obligatorio en producción. |
| `DATABASE_POOL_MAX` | Conexiones simultáneas a la base (por defecto `5`). |
| `PRISMA_LOG_QUERIES` | `true` muestra las consultas de Prisma en desarrollo. En producción nunca se muestran. |
| `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY` | Contenido de las claves PEM. Tienen prioridad sobre las rutas. |
| `JWT_PRIVATE_KEY_PATH` / `JWT_PUBLIC_KEY_PATH` | Rutas de las claves (por defecto `./certs/jwt-private.pem` y `./certs/jwt-public.pem`). |
| `JWT_EXPIRES_IN` | Duración del token, por ejemplo `7d` o `12h` (por defecto `7d`). |
| `HEALTH_CACHE_MS` | Milisegundos que `/health` reutiliza un resultado correcto antes de volver a consultar la base (por defecto `30000`). |
| `RATE_LIMIT_API_MAX` | Peticiones por IP cada 15 minutos (por defecto `300`; `/health` no cuenta). |
| `RATE_LIMIT_LOGIN_MAX` | Intentos de login fallidos por IP cada 15 minutos (por defecto `10`). |
| `RATE_LIMIT_REGISTER_MAX` | Registros públicos por IP cada hora (por defecto `5`). |
| `SEED_DEV_USUARIO`, `SEED_DEV_CORREO`, `SEED_DEV_PASSWORD` | Datos de la cuenta dev que crea el seed. Solo los usa `npm run db:seed`. |

## Datos iniciales

`npm run db:seed` ejecuta [`prisma/seed.js`](prisma/seed.js) y carga:

- **Una cuenta dev**, activa y protegida, con los datos de `SEED_DEV_*`. La contraseña debe cumplir la [política de contraseñas](#contraseñas). Si ya existe una cuenta con ese correo, no se modifica (su contraseña no cambia).
- **3 pacientes ficticios**, cada uno con **3 controles clínicos y 3 registros de medidas**, uno por semana desde su fecha de inicio.

Los registros tienen ids fijos, así que el seed se puede ejecutar varias veces sin duplicar nada. Si vuelves a ejecutarlo, los datos de ejemplo recuperan sus valores originales. Los datos están en [`prisma/seedData.js`](prisma/seedData.js).

## Estructura

```
app.js              Configuración de Express (seguridad, CORS, límites, rutas, errores).
server.js           Conecta con la base de datos, levanta el servidor y lo cierra ordenadamente.
router/router.js    Monta los grupos de rutas, la autenticación y /health.
routes/             Endpoints y validación de cada recurso.
services/           Acceso a datos con Prisma.
utils/              Autenticación, contraseñas, fechas, paginación, validación, límites, logs y errores.
DB/prismaClient.js  Cliente de Prisma con el adaptador de PostgreSQL y SSL.
prisma/             Esquema, migraciones y seed.
prisma7.config.ts   Configuración de Prisma (esquema, migraciones, seed y conexión).
generated/prisma/   Cliente de Prisma generado (no se sube al repositorio).
render.yaml         Configuración del servicio en Render.
tests/              Pruebas automatizadas.
```

## Autenticación

1. `POST /users/login` con `{ "correo", "password" }` devuelve `{ token, expiresAt, user }`.
2. Las demás peticiones envían el token en la cabecera `Authorization: Bearer <token>`.
3. En cada petición se comprueba la firma del token y que la cuenta siga activa en la base de datos. Así, una cuenta rechazada deja de tener acceso al momento.

Las cuentas nuevas quedan en estado `pendiente` hasta que un admin o dev las aprueba.

### Contraseñas

- Entre 8 caracteres y 72 bytes, con al menos una letra y un número. 72 bytes es el máximo que procesa bcrypt.
- Se guardan cifradas con bcrypt (coste 12) y nunca se devuelven en las respuestas.
- Para cambiar la propia contraseña, `PATCH /users/:id` necesita `{ "password": "<nueva>", "passwordActual": "<actual>" }`. Un admin o dev puede restablecer la de otro usuario sin conocer la actual.
- Al cambiar una contraseña, todos los tokens emitidos antes dejan de valer. Si el usuario cambió la suya, la respuesta incluye `session: { token, expiresAt }` con un token nuevo.

### Inicio de sesión sin conexión en el front-end

Los tokens se firman con una clave privada que solo tiene el servidor. El front-end puede verificarlos sin conexión con la clave pública, que se obtiene en `GET /users/public-key` o se incluye en el build. Por ejemplo, con la librería [`jose`](https://github.com/panva/jose):

```js
import { importSPKI, jwtVerify } from 'jose';

const key = await importSPKI(PUBLIC_KEY_PEM, 'RS256');
const { payload } = await jwtVerify(tokenGuardado, key, { issuer: 'sabercomer-api' });
// payload.sub (id), payload.usuario, payload.correo, payload.rol, payload.exp
```

Sin conexión, el token guardado vale hasta que caduca, aunque la cuenta se haya desactivado o su contraseña haya cambiado entretanto. Al recuperar la conexión, el servidor lo vuelve a validar.

### Roles y permisos

| Acción | user | admin | dev |
|---|:-:|:-:|:-:|
| Fichas, controles clínicos y medidas | ✔ | ✔ | ✔ |
| Ver y editar su propio usuario, correo y contraseña | ✔ | ✔ | ✔ |
| Buscar usuarios, aprobar o rechazar cuentas, eliminar usuarios, restablecer contraseñas | | ✔ (excepto cuentas dev) | ✔ |
| Cambiar el rol de otros usuarios | | ✔ (sin asignar dev) | ✔ |
| Crear cuentas dev o protegidas, marcar cuentas como protegidas | | | ✔ |

Una cuenta protegida no se puede eliminar.

## Endpoints

Todas las respuestas son JSON. Los errores tienen la forma `{ "message": "..." }`. Los `:id` deben ser UUID; un id mal formado responde `400`.

### Listas y paginación

Todas las rutas que devuelven varios elementos aceptan `?page=` (por defecto `1`) y `?limit=` (por defecto `20`, máximo `100`), y responden:

```json
{ "data": [ ... ], "page": 1, "limit": 20, "total": 57, "totalPages": 3 }
```

Una lista sin resultados responde `200` con `"data": []` y `"total": 0`. Orden de cada lista:

- Fichas: por nombre.
- Controles y medidas: del más reciente al más antiguo.
- Usuarios: por nombre de usuario.

### General

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/health` | Estado del servicio y de la base de datos (200 o 503). Render lo consulta cada pocos segundos. Un resultado correcto se reutiliza 30 segundos; un fallo se vuelve a comprobar en la siguiente llamada. No cuenta para el límite de peticiones y solo aparece en los logs cuando falla. |

### Usuarios (`/users`)

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/users/teapot` | Público | Prueba de vida (418). |
| GET | `/users/public-key` | Público | Clave pública para verificar tokens. |
| POST | `/users/login` | Público | `{ correo, password }`. Inicia sesión y devuelve el token. |
| POST | `/users` | Público o admin/dev | `{ usuario, correo, password, rol?, protegido? }`. Sin sesión siempre crea un `user` pendiente. |
| GET | `/users/me` | Con sesión | Usuario de la sesión. |
| GET | `/users/email/:email` | admin/dev | Busca por correo. |
| GET | `/users/role/:role` | admin/dev | Lista por rol (`dev`, `admin`, `user`). |
| GET | `/users/estado/:estado` | admin/dev | Lista por estado (`pendiente`, `activo`, `rechazado`). |
| PATCH | `/users/:id` | Él mismo o admin/dev | Edita `usuario`, `correo` y `password`; admin/dev también `rol`. |
| PATCH | `/users/estado/:id` | admin/dev | `{ "estado": "activo" \| "rechazado" }`. |
| PATCH | `/users/protegido/:id` | dev | `{ "protegido": true \| false }`. |
| DELETE | `/users/:id` | admin/dev | Elimina un usuario no protegido. |

### Fichas de pacientes (`/fichaPacientes`, requiere sesión)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/fichaPacientes` | Lista de fichas. |
| GET | `/fichaPacientes/id/:id` | Una ficha. |
| GET | `/fichaPacientes/name/:nombre` | Busca por nombre (sin distinguir mayúsculas). |
| GET | `/fichaPacientes/tel/:telefono` | Busca por teléfono (coincidencia parcial, solo dígitos). |
| GET | `/fichaPacientes/startdate/:fecha` | Fichas iniciadas ese día. `/day/:fecha` es equivalente. |
| POST | `/fichaPacientes` | Crea una ficha. Son obligatorios `nombre`, `telefono` y `fechaNacimiento`. |
| PATCH | `/fichaPacientes/:id` | Actualiza solo los campos enviados. |
| DELETE | `/fichaPacientes/:id` | Elimina la ficha junto con sus controles y medidas. |

### Controles clínicos (`/controlClinico`, requiere sesión)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/controlClinico` | Lista de controles. |
| GET | `/controlClinico/paciente/:id` | Controles de un paciente (`:id` de la ficha). |
| GET | `/controlClinico/:id` | Un control. |
| GET | `/controlClinico/date/:fecha` | Controles de ese día. |
| GET | `/controlClinico/rating/:calificacion` | Controles con esa calificación (entero de 0 a 10). |
| POST | `/controlClinico/:idFicha` | Crea un control para la ficha indicada. |
| PATCH | `/controlClinico/:id` | Actualiza un control. |
| DELETE | `/controlClinico/:id` | Elimina un control. |

### Registros de medidas (`/recordMedidas`, requiere sesión)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/recordMedidas` | Lista de registros. |
| GET | `/recordMedidas/paciente/:id` | Registros de un paciente (`:id` de la ficha). |
| GET | `/recordMedidas/:id` | Un registro. |
| GET | `/recordMedidas/date/:fecha` | Registros de ese día. |
| POST | `/recordMedidas/:idFicha` | Crea un registro para la ficha indicada. |
| PATCH | `/recordMedidas/:id` | Actualiza un registro. |
| DELETE | `/recordMedidas/:id` | Elimina un registro. |

Los campos de cada recurso son los definidos en [`prisma/schema.prisma`](prisma/schema.prisma). En el body solo se aceptan valores simples (texto, número, booleano o `null`). Los campos `id`, `pacienteId`, `createdAt`, `updatedAt` y las relaciones se ignoran.

### Fechas y zona horaria

La base de datos guarda instantes en UTC, pero los días se calculan en la zona horaria de la clínica (`APP_TIMEZONE`, por defecto `America/Mexico_City`):

- **En las búsquedas por día** (`/date/:fecha`, `/startdate/:fecha`), `2026-11-20` abarca de las 00:00 a las 24:00 hora local. Un control registrado a las 21:00 de ese día aparece aunque en UTC ya sea el 21. También se acepta una fecha ISO completa; se usa el día local en que cae.
- **En el body**, una fecha `AAAA-MM-DD` se guarda como la medianoche local de ese día. Una fecha ISO completa (`2026-11-20T15:30:00Z` o con desfase) se guarda tal cual.

### Códigos de respuesta

| Código | Significado |
|---|---|
| 400 | Datos o parámetros inválidos. |
| 401 | Sin token, token inválido o caducado, cuenta no activa, contraseña incorrecta o cambiada. |
| 403 | Sin permisos para la acción, o cuenta pendiente o rechazada al iniciar sesión. |
| 404 | Recurso o ruta no encontrados. |
| 409 | Ya existe un usuario con ese nombre de usuario o correo. |
| 413 | El body supera los 100 kb. |
| 429 | Demasiadas peticiones o intentos de login; hay que esperar. |
| 500 | Error interno. El detalle solo se registra en el servidor. |
| 503 | `/health`: la base de datos no responde. |

## Seguridad

- **Inyección SQL:** todas las consultas pasan por Prisma, que envía los valores como parámetros separados del SQL (consultas preparadas). Un texto como `' OR 1=1 --` se busca como texto literal. No se usan `$queryRawUnsafe`, `$executeRawUnsafe` ni `Prisma.raw`, y [`tests/security.test.js`](tests/security.test.js) falla si alguien los introduce. Si alguna vez hace falta SQL a mano, hay que usar `` prisma.$queryRaw`... ${valor}` `` (plantilla etiquetada), nunca concatenar texto.
- **Inyección de operadores:** el body solo admite valores simples, así que no se pueden colar operadores de Prisma como `{ "set": ... }` o `{ "connect": ... }`. Login y búsquedas exigen texto, y los ids deben ser UUID.
- **Cabeceras:** `helmet` añade cabeceras de seguridad (HSTS, `nosniff`, etc.) y oculta `X-Powered-By`.
- **Límites:** máximo de peticiones por IP, de intentos de login fallidos y de registros públicos. El body tiene un límite de 100 kb.
- **Login:** el mensaje y el tiempo de respuesta son iguales si el correo no existe o la contraseña es incorrecta.
- **Logs:**
  - Cada petición se registra como método, patrón de ruta, estado y duración (por ejemplo `GET /fichaPacientes/name/:nombre 200 12ms`). Nunca se registran parámetros, body ni cabeceras.
  - Los errores 500 solo registran el tipo de error, y el cliente recibe un mensaje genérico.
  - Prisma no registra consultas salvo con `PRISMA_LOG_QUERIES=true` en desarrollo.

## Pruebas

```bash
npm test             # ejecuta todas las pruebas
npm run test:watch   # modo observador
```

Las pruebas usan Jest y supertest. Cubren todos los endpoints, la paginación, la zona horaria (incluido el horario de verano), los límites de peticiones, la protección contra inyecciones y el seed.

No necesitan base de datos ni `.env`: sustituyen Prisma por una base de datos falsa en memoria ([`tests/support/fakePrisma.js`](tests/support/fakePrisma.js)) y generan claves JWT temporales. Por eso no cubren la conexión real con PostgreSQL ni la migración.
