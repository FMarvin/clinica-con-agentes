# CLAUDE.md

Lee [`AGENTS.md`](./AGENTS.md) antes de trabajar; sus reglas son obligatorias y prevalecen ante cualquier atajo.

## Contexto del repositorio

- API: NestJS + TypeORM + MySQL en `backend/`.
- Plantilla de interfaz: `Fron-end/` (nombre real de carpeta).
- Modelo editable para dbdiagram.io: `schema.dbml`.
- API versionada bajo `/api/v1`; autenticación JWT global; expiración fija en 1800 segundos.
- NextAuth Credentials delega el login a la API; la interfaz está en español y el espacio clínico es `/es/dashboard/clinic`.

## Flujo de trabajo

1. Inspecciona `AGENTS.md`, `schema.dbml` y los módulos concretos afectados.
2. Implementa capas específicas por dominio: entity, repository, service, controller, DTO y module.
3. Registra módulos y entidades en Nest/TypeORM y limita respuestas a DTOs/objetos públicos.
4. Conserva las reglas de negocio, catálogos FK por `code` y auditoría mediante `AuditService`; los logs son append-only y solo `admin` puede consultarlos.
5. Para cambios de esquema, propone el impacto, modifica el DBML y solicita autorización explícita antes de escribir en MySQL.
6. No ejecutes pruebas unitarias salvo petición; usa typecheck/build para verificar cambios.

## Reglas clínicas que no se deben romper

- No citar pacientes fallecidos; su historial no admite modificaciones.
- Recetas solo para rol `doctor`, asociadas a su paciente y consulta, y nunca para pacientes fallecidos.
- El despacho de recetas lo realiza el farmacéutico o el doctor emisor; descuenta stock y crea los movimientos de salida dentro de una transacción.
- Las muestras (`type.code = 'sample'`) se gestionan sin receta.
- Prioritarios aparecen antes en agenda.
- Alertas crónicas se generan al crear/actualizar historial o receta; no se crean manualmente.
- El inventario se ajusta mediante movimientos; el stock no puede ser negativo.

## Configuración operativa

Usa Node/npm desde `backend/`. No aplicar migraciones, revertirlas ni ejecutar `seed` sin autorización explícita. No crear secretos predeterminados ni persistir credenciales; las cuentas iniciales de seed se configuran por variables de entorno.
