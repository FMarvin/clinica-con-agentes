# AGENTS.md

Guía de trabajo para agentes de IA. Lee este archivo antes de modificar el proyecto.

## Proyecto y estructura real

Sistema clínico y farmacéutico con backend NestJS, TypeORM y MySQL. La plantilla Next.js está actualmente en `Fron-end/` (con guion y esa capitalización); no asumir que la ruta se llama `frontend/`. El modelo relacional editable y fuente de verdad es [`schema.dbml`](./schema.dbml), compatible con dbdiagram.io.

```text
backend/src/
  auth/                 JWT, login y guard global
  users/                usuarios y roles
  audit/                escritura append-only y consulta administrativa de auditoría
  patients/             pacientes, prioridad y fallecimiento
  appointments/         agenda y orden prioritario
  medical-records/      historial clínico
  prescriptions/        recetas y renglones de receta
  alerts/               alertas automáticas
  products/             farmacia, muestras y movimientos de existencias
  database/             fuente de TypeORM, migraciones y seed
Fron-end/               plantilla Next.js
schema.dbml             diseño relacional modificable
```

Cada módulo backend mantiene su controller, service, repository, entity y DTOs propios. La lógica de negocio vive en servicios específicos; no crear repositorios CRUD genéricos.

## Funciones requeridas

- Historial médico vinculado a paciente, doctor y opcionalmente cita.
- Recetas emitidas solo por doctores, con productos y estado catalogado.
- Citas no disponibles para pacientes fallecidos; pacientes prioritarios se ordenan primero.
- Alertas automáticas para pacientes crónicos al crear o actualizar historial/recetas. No existe endpoint para crear alertas manualmente.
- Registro de pacientes fallecidos y protección de su historial contra escritura.
- Catálogo de medicamentos, muestras e insumos, con entradas/salidas de inventario.
- Login JWT con expiración invariable de 1800 segundos (30 minutos).

## Modelo y catálogos

Antes de cambiar datos o relaciones, lee `schema.dbml`. Los valores enumerados viven en tablas `enum_*`; guardar sus claves foráneas y comparar por `code`, nunca por ID fijo. No introducir strings libres, `VARCHAR + CHECK`, ni enums de TypeScript para estados de negocio.

Las migraciones son el único mecanismo de DDL y `synchronize` debe permanecer en `false`. Nunca conectarse a MySQL para aplicar cambios sin autorización explícita del usuario. Antes de ejecutar una migración:

1. Explicar tablas, columnas, enums, índices, claves y riesgos del cambio.
2. Actualizar `schema.dbml`.
3. Preguntar literalmente: **“¿Autorizas aplicar los cambios a MySQL?”**
4. Esperar una respuesta afirmativa explícita antes de generar/aplicar la migración o ejecutar el seed.

No ejecutar `migration:run`, `migration:revert` ni seeds que escriban en la base de datos sin esa autorización.

## Reglas de negocio

- El JWT expira en `1800s`; no cambiar su duración ni `JWT_EXPIRES_IN` sin autorización.
- `JwtAuthGuard` es global y `@Public()` se reserva para login y otras rutas que deban ser públicas.
- No agendar pacientes fallecidos. El historial médico de una persona fallecida es de solo lectura.
- Recetas: el usuario autenticado debe tener `role.code = 'doctor'`; no emitir a pacientes fallecidos.
- El despacho de una receta emitida lo realiza el farmacéutico o su doctor emisor. El cambio a `dispensed` descuenta existencias y registra movimientos ligados a la receta en una sola transacción; no repetir ni revertir un despacho.
- Un producto con `type.code = 'sample'` no se incluye en una receta.
- Inventario cambia mediante movimientos catalogados; no modificar `stock` desde el DTO de actualización del producto.
- Alertas crónicas se generan por los flujos clínicos, no mediante entrada manual.
- Prioridad se almacena en el paciente y se aplica al ordenar las citas.
- Cada tabla de dominio mantiene `created_by` y `updated_by` según el esquema.
- Toda acción relevante registra auditoría a través de `AuditService`; no escribir directamente a `audit_logs`. Nunca actualizar ni borrar auditoría.
- El historial de auditoría se consulta mediante `GET /api/v1/audit-logs?page=1&limit=25` (solo `role.code = 'admin'`); nunca habilitar escritura, edición o eliminación de logs.
- Las entidades TypeORM no se devuelven directamente desde los controladores; construir respuestas explícitas.
- Mensajes de error en español y validación de entrada con DTOs `class-validator`.

## Endpoints actuales

Todos usan prefijo `/api/v1`; requieren JWT salvo `POST /api/v1/auth/login`.

| Área | Endpoints |
| --- | --- |
| Sesión/usuarios | `POST /auth/login`, `POST /auth/change-password`, `GET /users`, `GET /users/roles`, `GET /users/me` |
| Pacientes | `GET/POST /patients`, `GET/PATCH/DELETE /patients/:id`, `PATCH /patients/:id/deceased`, `GET/POST /patients/:id/conditions` (diagnósticos crónicos; POST solo doctor) |
| Citas | `GET /appointments?patientId=:id`, `GET/POST /appointments`, `PATCH/DELETE /appointments/:id` |
| Historial | `GET /medical-records?patientId=:id`, `GET/POST /medical-records`, `PATCH /medical-records/:id` |
| Recetas | `GET /prescriptions?patientId=:id`, `GET/POST /prescriptions`, `PATCH /prescriptions/:id/status` (despacho transaccional de inventario; cancelación por doctor emisor) |
| Alertas | `GET /alerts?patientId=:id`, `GET /alerts?unread=true`, `PATCH /alerts/:id/read` |
| Productos | `GET/POST /products`, `PATCH/DELETE /products/:id`, `POST /products/:id/movements` |
| Auditoría | `GET /audit-logs?page=1&limit=25` (solo administración; lectura paginada) |

Los códigos de catálogos usados en payloads (por ejemplo, tipo documental, estado de cita/receta, tipo de producto y movimiento) deben existir en sus tablas `enum_*`.

La interfaz Next.js funciona únicamente en español (`/es`), autentica con Credentials contra Nest, conserva el access token en cookie `HttpOnly` de 30 minutos y usa `/api/clinic/*` como proxy server-side. La navegación expone el espacio clínico en `/es/dashboard/clinic`; las rutas restantes de la plantilla se redirigen a ese módulo. Administración dispone del registro de auditoría paginado desde el mismo panel.

## Desarrollo y validación

Desde `backend/`:

```powershell
npm install
Copy-Item .env.example .env
npm run typecheck
npm run build
npm run start:dev
```

Configura `.env` con acceso local autorizado. Para catálogos y cuentas iniciales, define variables `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` y opcionalmente `SEED_DOCTOR_EMAIL`/`SEED_DOCTOR_PASSWORD`; las contraseñas requieren al menos 12 caracteres. Ejecutar `npm run seed` escribe en MySQL y exige autorización previa.

Desde `Fron-end/`, copia `.env.example` a `.env`, define un `AUTH_SECRET` aleatorio, `AUTH_TRUST_HOST=true` cuando el host esté controlado (por ejemplo, localhost tras el proxy de Next.js), y `BACKEND_API_URL` (normalmente `http://localhost:3000`); luego ejecuta `npm run dev` o `npm run build`. En producción, confía únicamente en el host validado por el proxy de despliegue.

Para crear la base local con Docker Compose, copia `backend/.env.example` a `backend/.env`, cambia todos los valores `replace-with-*` por secretos locales y desde la raíz ejecuta `docker compose --env-file backend/.env up -d mysql`. Compose crea solo la base vacía `clinica`; las tablas las crean exclusivamente las migraciones autorizadas.

No crear ni ejecutar tests unitarios salvo que el usuario lo solicite. Para cambios de código, ejecutar el typecheck/build más acotado que valide la modificación y no ocultar errores de compilación o de base de datos.

## Documentación y respuesta

Antes de programar, revisa este archivo, `schema.dbml` y el módulo afectado. En respuestas de cambios de esquema indica si se requiere autorización MySQL, lista rutas/endpoints relevantes y cómo verificar el cambio. Mantén las instrucciones concisas y en español.
