# MEKANOS ERP / EAM - METAMODELO UNIVERSAL DE ACTIVOS
## Documento Maestro 02: Plan de Rutas de Desarrollo Atómico Nuclear

> **Estado:** Fase 0 Completada y Certificada / Fases 1 a 5 Planificadas  
> **Estrategia:** Zero-Trust, First-Principles, Adición sin Regresiones  
> **Fecha de Actualización:** Octubre 2026  

---

## 1. Mapa Global de Rutas y Responsabilidad en el Monorepo

| Capa del Monorepo | Ruta Física en el Proyecto | Responsabilidad Nuclear | Estado |
| :--- | :--- | :--- | :--- |
| **Documentación** | `docs/eam-universal/*.md` | Especificación de arquitectura y hoja de ruta viva | ✅ Activo |
| **Lector Unificado** | `apps/api/src/equipos/services/equipo-specs.reader.ts` | Aduana polimórfica JSONB y satélites legados | ✅ Certificado |
| **Re-export Dominio** | `apps/api/src/equipos/domain/equipo-specs-reader.ts` | Interfaz limpia para módulos y librerías | ✅ Activo |
| **Golden Master Fixture** | `apps/api/test/fixtures/golden-master-pdf.json` | Snapshot inmutable de 35 órdenes de producción | ✅ Certificado |
| **Golden Master Test** | `apps/api/test/golden-master-pdf.spec.ts` | Verificación automatizada de no-regresión | ✅ 100% Green |
| **Esquema BD** | `packages/database/prisma/schema.prisma` | Modelos de UoM, catálogo de atributos y JSONB | ⏳ Fase 1 |
| **Migración SQL** | `packages/database/prisma/migrations/*` | DDL incremental con índices GIN en PostgreSQL | ⏳ Fase 1 |
| **Catálogos API** | `apps/api/src/catalogos/` | Endpoints CRUD de atributos, arquetipos y UoM | ⏳ Fase 2 |
| **Gestión Equipos** | `apps/api/src/equipos/equipos-gestion.service.ts` | Ingesta polimórfica y validación de esquemas | ⏳ Fase 2 |
| **Sidebar Admin** | `apps/admin/src/components/layout/sidebar.tsx` | Reestructuración ejecutiva de menú lateral | ⏳ Fase 3 |
| **Vistas Catálogos** | `apps/admin/src/app/(dashboard)/configuracion/` | Vistas de administración de atributos y UoM | ⏳ Fase 3 |
| **Directorio Equipos** | `apps/admin/src/app/(dashboard)/equipos/` | Directorio universal con tarjetas y KPIs dinámicos | ⏳ Fase 4 |
| **Formulario Activos** | `apps/admin/src/features/equipos/components/` | Form Engine adaptativo basado en arquetipos | ⏳ Fase 4 |
| **PDF Universal** | `apps/api/src/pdf/templates/tipo-universal-eam.template.ts` | Renderizado adaptativo HTML/Puppeteer | ⏳ Fase 5 |
| **Sincronización Móvil** | `apps/api/src/sync/sync.service.ts` | Snapshots inmutables de parámetros y unidades | ⏳ Fase 5 |

---

## 2. Fase 0: Cimientos, Red de Seguridad y Golden Master

**Objetivo:** Establecer la red de seguridad de no-regresión, sanear inconsistencias heredadas de la base de datos y unificar la lectura técnica antes de introducir cambios de esquema.

### Checklist de Ejecución y Certificación:
- [x] **0.1 Fijación de Resolución de Equipos en UI `/ordenes` (`apps/admin`)**
  - Archivo: `apps/admin/src/app/(dashboard)/ordenes/page.tsx`
  - Eliminación de falsos `'Sin equipo'` resolviendo `orden.equipos || orden.ordenes_equipos?.[0]?.equipo || orden.ordenes_equipos?.[0]?.equipos`.
  - Archivo: `apps/admin/src/app/(dashboard)/ordenes/[id]/page.tsx` corregido en transferencias.
- [x] **0.2 Normalización de `aplica_a` en Catálogo de Sistemas (`apps/admin`)**
  - Archivo: `apps/admin/src/app/(dashboard)/configuracion/catalogos/sistemas/page.tsx`
  - Renderizado individual de chips tipo badge con estilos visuales por código de equipo.
  - Saneamiento en base de datos de arrays duplicados (`['COMP', 'COMPRESOR']` ➔ `['COMPRESOR']`).
- [x] **0.3 Saneamiento de Unidades Corruptas en `parametros_medicion` (Supabase PostgreSQL)**
  - Corrección de byte sequence corrupta `0xefbfbd43` a `°C` (`0xc2b043`) en ID 6 (`TEST_BATERIA_FINAL`).
  - Corrección de `C` a `°C` en IDs 4 (`TEST_FIX`) y 5 (`TEST_S31_FINAL`).
  - Verificación de 0 parámetros con codificación inválida en base de datos.
- [x] **0.4 Implementación del Lector Unificado `EquipoSpecsReader` y Suite Jest**
  - Archivo central: `apps/api/src/equipos/services/equipo-specs.reader.ts`
  - Re-exportación canónica: `apps/api/src/equipos/domain/equipo-specs-reader.ts`
  - Métodos certificados: `getCategoriaCanonica`, `getMarca`, `getModelo`, `getSerie`, `getCapacidadPrincipal`, `getFluidos`, `getKpisHeader`, `getPlacaUniversal`, `leer`.
  - Suite de pruebas unitarias: `apps/api/src/equipos/services/equipo-specs.reader.spec.ts` y `apps/api/src/equipos/domain/equipo-specs-reader.spec.ts` (100% PASS, 24/24 pruebas).
- [x] **0.5 Certificación de Invarianza Golden Master (35 Órdenes de Producción)**
  - Fixture inmutable: `apps/api/test/fixtures/golden-master-pdf.json`
  - Prueba automatizada: `apps/api/test/golden-master-pdf.spec.ts`
  - Resultado: 0 discrepancias sobre el universo de 35 órdenes de producción reales.

---

## 3. Fase 1: Metamodelo Relacional y Catálogo de Atributos EAM

**Objetivo:** Introducir los modelos de datos canónicos para unidades de medida y atributos dinámicos en Prisma sin alterar el funcionamiento de las tablas existentes.

### Tareas Nucleares:
1. **Modelado en `packages/database/prisma/schema.prisma`:**
   - Tabla `magnitudes_fisicas`: `id_magnitud`, `codigo`, `nombre`, `unidad_base`, `descripcion`.
   - Tabla `unidades_medida`: `id_unidad`, `id_magnitud`, `codigo`, `simbolo`, `factor_a` ($a$), `constante_b` ($b$).
   - Tabla `catalogo_atributos`: `id_atributo`, `codigo_atributo`, `nombre_atributo`, `id_magnitud`, `tipo_dato`, `rol_semantico`, `visible_en_pdf`, `modulo_defecto`.
   - Tabla de unión `tipos_equipo_atributos`: Asociación de atributos requeridos u opcionales por arquetipo.
   - Columna `especificaciones` (JSONB) en modelo `equipos` con índice PostgreSQL GIN.
2. **Generación y Aplicación de Migración:**
   - `pnpm --filter @mekanos/database prisma migrate dev --name init_eam_metamodel`
   - Migración estrictamente aditiva (sin DROP TABLE ni DROP COLUMN).
3. **Carga de Semillas Base (Seeders):**
   - Inserción de magnitudes fundamentales (Temperatura, Presión, Caudal, Potencia, Frecuencia, Voltaje).
   - Inserción de unidades comerciales ($y = ax + b$).
   - Registro de atributos estándar para `GENERADOR`, `BOMBA`, `COMPRESOR`, `HVAC`.

---

## 4. Fase 2: Backend Core — Ingesta Polimórfica y Servicios EAM

**Objetivo:** Adaptar los servicios y controladores de `apps/api` para soportar la creación y actualización de equipos con esquemas dinámicos JSONB mientras se preservan los endpoints legados.

### Tareas Nucleares:
1. **Módulo de Catálogo de Atributos (`apps/api/src/catalogos/`):**
   - Endpoints para listar magnitudes, unidades y atributos disponibles.
   - Endpoint `GET /catalogos/tipos-equipo/:id/atributos` para alimentar el Form Engine de frontend.
2. **Evolución de `EquiposGestionService`:**
   - Adaptar `createEquipoCompleto` y `updateEquipo` para aceptar `especificaciones?: Record<string, any>`.
   - Pipeline de validación de esquemas dinámicos contra los atributos del tipo de equipo.
3. **Persistencia Dual Segura:**
   - Para arquetipos tradicionales (`GENERADOR`, `BOMBA`), sincronizar automáticamente tanto la tabla satélite como el bloque JSONB unificado, garantizando paridad total.

---

## 5. Fase 3: Ergonomía UI/UX y Navegación Administrativa

**Objetivo:** Mejorar la experiencia de usuario en `apps/admin` facilitando el acceso a los nuevos catálogos sin saturar el menú.

### Tareas Nucleares:
1. **Reestructuración de Sidebar (`apps/admin/src/components/layout/sidebar.tsx`):**
   - Agrupación ejecutiva: *Operación*, *Gestión de Activos*, *Compras/WMS*, *Configuración EAM*.
2. **Consola de Configuración EAM:**
   - Página `/configuracion/eam/atributos`: Maestro de atributos con roles semánticos y banderas de visibilidad en PDF.
   - Página `/configuracion/eam/unidades`: Gestión de unidades de conversión y magnitudes físicas.
3. **Optimización de Filtros en Listados:**
   - Integración de selectores multi-badge para tipos de equipo en sistemas y servicios.

---

## 6. Fase 4: Directorio Universal y Form Engine Adaptativo

**Objetivo:** Proveer a los coordinadores de mantenimiento de una interfaz visual fluida para dar de alta y editar cualquier tipo de maquinaria.

### Tareas Nucleares:
1. **Directorio de Equipos (`apps/admin/src/app/(dashboard)/equipos/`):**
   - Tarjetas de activos con insignias de arquetipo canónico (`GENERADOR`, `BOMBA`, `COMPRESOR`, `HVAC`, `ELEVADOR`).
   - KPIs de cabecera dinámicos renderizados mediante `EquipoSpecsReader.getKpisHeader()`.
2. **Form Engine Dinámico (`apps/admin/src/features/equipos/components/form-equipo-dinamico.tsx`):**
   - Al seleccionar el Tipo de Equipo, el formulario consulta dinámicamente los módulos y atributos requeridos.
   - Inputs tipados según la magnitud (números con selectores de unidad, strings, booleanos, selectores de opción).
   - Pre-visualización en tiempo real de la Placa Técnica Universal.

---

## 7. Fase 5: PDF Universal y Sincronización Móvil Offline

**Objetivo:** Cerrar el ciclo operativo asegurando que las órdenes ejecutadas sobre cualquier maquinaria generen reportes técnicos de alta gama y que los técnicos móviles puedan diagnosticar cualquier activo sin conexión.

### Tareas Nucleares:
1. **Plantilla PDF Universal EAM (`apps/api/src/pdf/templates/tipo-universal-eam.template.ts`):**
   - Despacho condicional seguro en `PdfController`.
   - Renderizado dinámico de la Placa Técnica mediante `EquipoSpecsReader.getPlacaUniversal()`.
   - Checklist dinámico agrupado por subsistemas (`catalogo_sistemas`).
   - Matriz adaptativa de mediciones con semáforos de tolerancia.
2. **Sincronización PUSH/PULL Móvil:**
   - Validación del generador de snapshots en `SyncService` para arquetipos extendidos.
   - Verificación de persistencia offline en SQLite Drift (`apps/mobile`).
3. **Certificación End-to-End en Entorno Staging:**
   - Flujo completo: Crear arquetipo nuevo (ej. `CHILLER`) ➔ Crear equipo ➔ Crear orden ➔ Ejecutar en móvil offline ➔ Sincronizar ➔ Descargar PDF Universal con 100% de coherencia visual.
