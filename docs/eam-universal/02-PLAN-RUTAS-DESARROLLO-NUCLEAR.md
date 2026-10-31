# MEKANOS ERP / EAM - METAMODELO UNIVERSAL DE ACTIVOS
## Documento Maestro 02: Plan de Rutas de Desarrollo Atómico Nuclear

> **Estado:** Fase 0 y Fase 1 Completadas y Certificadas / Fase 2 en Ejecución Activa / Fases 3 a 5 Planificadas  
> **Estrategia:** Zero-Trust, First-Principles, Adición sin Regresiones, Paridad 1:1 de Ingeniería  
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
| **Esquema BD** | `packages/database/prisma/schema.prisma` | Modelos de UoM, catálogo de atributos y JSONB | ✅ F1 Landed (Prisma 5.22.0) |
| **Migración SQL** | `packages/database/prisma/migrations/*` | DDL incremental con índices GIN en PostgreSQL | ✅ 20261031_eam_universal_fase1.sql |
| **Sembrado Canónico** | `packages/database/prisma/seeds/seed-eam-universal.ts` | 11 magnitudes, 38 UoM, ~65 atributos, 5 módulos, 4 OEM | 🔄 Fase 2 (Ampliación 1:1) |
| **Motor UoM Dimensional** | `apps/api/src/equipos/services/uom-conversion.service.ts` | Motor afín de conversión ($y = ax + b$) | ✅ 32/32 Tests Green |
| **Backfill & Saneamiento** | `packages/database/prisma/seeds/backfill-equipos-eam.ts` | Migración de 467 equipos a JSONB + 15 corregidos + B-Tree | 🔄 Fase 2 |
| **Proyección B-Tree** | `apps/api/src/equipos/services/equipo-filter-projection.service.ts` | Proyección de filtros en `equipos_atributos_filtro` | 🔄 Fase 2 |
| **Catálogos API REST** | `apps/api/src/catalogos/` | Endpoints CRUD de atributos, módulos, arquetipos, modelos y UoM | 🔄 Fase 2 |
| **Gestión Equipos** | `apps/api/src/equipos/equipos-gestion.service.ts` | Ingesta polimórfica, doble escritura y filtros B-Tree | 🔄 Fase 2 |
| **Sidebar Admin** | `apps/admin/src/components/layout/sidebar.tsx` | Reestructuración ejecutiva de menú lateral | ⏳ Fase 3 |
| **Hub Maestros EAM** | `apps/admin/src/app/(dashboard)/configuracion/equipos-maestros/` | Hub de 4 Pestañas (Arquetipos, OEM/BOM, Módulos, Atributos) | ⏳ Fase 3 |
| **Directorio Equipos** | `apps/admin/src/app/(dashboard)/equipos/` | Directorio universal con tarjetas y KPIs dinámicos | ⏳ Fase 4 |
| **Formulario Activos** | `apps/admin/src/features/equipos/components/form-equipo-dinamico.tsx` | Form Engine adaptativo basado en arquetipos | ⏳ Fase 4 |
| **PDF Universal** | `apps/api/src/pdf/templates/tipo-universal-eam.template.ts` | Renderizado adaptativo HTML/Puppeteer | ⏳ Fase 5 |
| **Sincronización Móvil** | `apps/api/src/sync/sync.service.ts` | Snapshots inmutables de parámetros y unidades | ⏳ Fase 5 |

---

## 2. Fase 0: Cimientos, Red de Seguridad y Golden Master [ ✅ COMPLETADA ]

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

## 3. Fase 1: Metamodelo Relacional, Semilla Canónica y Motor Dimensional UoM [ ✅ COMPLETADA ]

**Objetivo:** Introducir los modelos de datos canónicos para magnitudes físicas, unidades de medida ($y = ax + b$), módulos técnicos y atributos dinámicos en Prisma y PostgreSQL (Supabase) de forma estrictamente aditiva, asegurando cero pérdida de datos sobre los 467 equipos y 1,807 órdenes de servicio, y construyendo el motor dimensional afín `UomConversionService`.

### Checklist de Ejecución y Certificación:
- [x] **1.1 Modelado en `packages/database/prisma/schema.prisma`:**
  - `catalogo_magnitudes`: 11 magnitudes físicas (Potencia, Presión, Caudal, Temperatura, Volumen, etc.).
  - `unidades_medida`: Factor afín $y = ax + b$ (`factor_a`, `factor_b`), `es_unidad_base`, `permite_decimales`.
  - `atributos_tecnicos`: Catálogo canónico con rol semántico, tipo de dato y flag de visualización en PDF.
  - `modulos_tecnicos`: Módulos funcionales (`motor_combustion`, `alternador_generador`, `bomba_hidraulica`, etc.).
  - `modulo_atributos`: Asociaciones jerárquicas módulo-atributo con orden y obligatoriedad.
  - `tipo_equipo_modulos`: Vinculación de módulos técnicos a arquetipos en `tipos_equipo`.
  - `tipo_equipo_planes`: Planes de mantenimiento preconfigurados por arquetipo.
  - `modelos_equipo` y `modelos_equipo_bom`: Fichas técnicas estándar de fabricantes y listas de partes (BOM).
  - `equipos_atributos_filtro`: Índices desnormalizados para búsqueda rápida.
  - Columna `especificaciones` (JSONB) en `equipos` con índice PostgreSQL GIN (`jsonb_path_ops`).
  - Columna `unidad_codigo` en `parametros_medicion` vinculada a `unidades_medida(codigo)`.
- [x] **1.2 Migración SQL Additive Ejecutada en Supabase:**
  - Script: `packages/database/prisma/migrations/20261031_eam_universal_fase1.sql`.
  - Ejecución en transacción DDL PostgreSQL sin pérdidas ni bloqueos de producción.
  - Generación limpia de Prisma Client v5.22.0 (`pnpm --filter @mekanos/database run prisma:generate`).
- [x] **1.3 Motor Dimensional Afín `UomConversionService` y Suite Jest:**
  - Archivo central: `apps/api/src/equipos/services/uom-conversion.service.ts`.
  - Inyección NestJS `@Injectable()` registrada y exportada en `EquiposModule`.
  - Métodos nucleares: `convertir()`, `convertirABase()`, `sonCompatibles()`, `formatearEquivalencia()`, `formatearConSimbolo()`, `normalizarCodigo()`.
  - Suite de pruebas unitarias: `apps/api/src/equipos/services/uom-conversion.service.spec.ts` (32 pruebas pasando).
- [x] **1.4 Certificación de No-Regresión Triple Suite:**
  - `test/golden-master-pdf.spec.ts`: PASSED (35 órdenes de producción reales verificadas con 0 discrepancias).
  - `src/equipos/services/equipo-specs.reader.spec.ts`: PASSED (14 pruebas pasando).
  - `src/equipos/services/uom-conversion.service.spec.ts`: PASSED (32 pruebas pasando).
  - Total: 48 pruebas automatizadas 100% green.

---

## 4. Fase 2: Backend Core EAM, Paridad 1:1, Backfill de 467 Equipos y Doble Escritura B-Tree [ 🔄 EN EJECUCIÓN ]

**Objetivo:** Alcanzar paridad 1:1 absoluta con todas las columnas de las tablas satélite (`equipos_generador`, `equipos_bomba`, `equipos_motor`), ejecutar el backfill idempotente de los 467 equipos hacia JSONB y la tabla de filtros B-Tree `equipos_atributos_filtro`, reclasificar los 15 equipos incoherentes, implementar la doble escritura transaccional en `EquiposGestionService` y publicar la API REST completa del metamodelo.

### Checklist de Ejecución y Certificación:
- [ ] **2.1 Ampliación Exhaustiva del Seed (`seed-eam-universal.ts`):**
  - Sembrar los ~65 atributos reales cubriendo el 100% de columnas satélite:
    * *Motor Combustión:* Aspiración, refrigeración, turbo, arranque, CCA, batería (ref, Ah, cant), etc.
    * *Alternador / Generador:* AVR (marca, modelo, ref), módulo control, tanques (principal y auxiliar en L), transferencia (tipo, ubicación, amperaje), calibres y metros de cable, cabina insonorizada, aislamiento, IP.
    * *Bomba Hidráulica:* Aplicación, potencia hidráulica, eficiencia, presostato, contactor, arrancador suave, VFD, tanques hidroneumáticos, manómetro, protección de nivel, sellos mecánicos, etc.
    * *Compresor Industrial:* Tecnología (tornillo/pistón/scroll), presiones (máx, carga, descarga), caudal CFM, tanque receptor, acople, secador.
  - Asignar atributos a módulos con `grupo_visual`, `es_kpi`, `es_filtrable`, `visible_en_pdf`.
  - Sembrar al menos 4 Modelos OEM Maestros (`modelos_equipo`) con kits BOM (`modelos_equipo_bom`).
- [ ] **2.2 Saneamiento de Incoherencias y Backfill Idempotente (`backfill-equipos-eam.ts`):**
  - Reclasificar las 14 bombas Goulds/Pentair (IDs 32, 35, 38, 41, 44, 48, 51, 56, 59, 62, 65, 99, 102, 104) de `id_tipo_equipo = 1 (GENERADOR)` a `id_tipo_equipo = 2 (BOMBA)`.
  - Migrar el compresor Siemens ID 214 a su estructura JSONB de compresor (`modulos.motor_electrico` + `modulos.compresor_industrial`).
  - Traducir los 467 equipos a `equipos.especificaciones` JSONB bajo el contrato canónico `{ "_version": 1, "modulos": { ... }, "origen_atributos": { ... } }`.
  - Proyectar atributos numéricos en `equipos_atributos_filtro` con `valor_num_base` normalizado mediante `UomConversionService.convertirABase()`.
  - Certificar que `golden-master-pdf.spec.ts` se mantiene en 0 discrepancias con JSONB poblado.
- [ ] **2.3 Doble Escritura Transaccional y Proyección B-Tree en Backend Core:**
  - Crear servicio `EquipoFilterProjectionService` para sincronización automática de `equipos_atributos_filtro` en altas y modificaciones.
  - Extender `EquiposGestionService` con persistencia dual: persistir en `equipos.especificaciones` JSONB y en satélites legados para tipos tradicionales.
  - Extender `GET /equipos` con soporte de filtrado multidimensional sobre `equipos_atributos_filtro` (rango numérico convertido con UoM, texto ILIKE y booleano).
- [ ] **2.4 Endpoints REST del Hub de Configuración EAM (`apps/api`):**
  - `/api/catalogos/magnitudes` & `/api/catalogos/unidades`: Catálogo dimensional y endpoint de prueba de conversión.
  - `/api/catalogos/atributos-tecnicos`: CRUD completo con soporte de creación rápida *In-Place*.
  - `/api/catalogos/modulos-tecnicos`: CRUD de módulos y asignación de atributos con banderas visuales y operativas.
  - `/api/catalogos/arquetipos`: Esquema integral de tipos de equipo (módulos, atributos requeridos, planes por defecto).
  - `/api/catalogos/modelos-equipo`: CRUD de modelos OEM y sus listas de partes BOM sugeridas.

---

## 5. Fase 3: Hub Ejecutivo EAM (4 Pestañas) y Ergonomía UI/UX (`apps/admin`)

**Objetivo:** Proveer la interfaz centralizada de administración del metamodelo en una experiencia de usuario fluida, densa y moderna en Next.js.

### Tareas Nucleares:
1. **Reestructuración de Sidebar (`apps/admin/src/components/layout/sidebar.tsx`):**
   - Agrupación ejecutiva limpia: *Operación*, *Gestión de Activos*, *Compras/WMS*, *Configuración EAM*.
2. **Hub Central de Equipos Maestros (`/configuracion/equipos-maestros`):**
   - **Pestaña 1: Arquetipos (Lienzo en Blanco & Biblioteca):** Crear y editar tipos de maquinaria, ensamblar módulos funcionales (`tipo_equipo_modulos`) y asociar planes de mantenimiento (`tipo_equipo_planes`).
   - **Pestaña 2: Modelos OEM & Kits BOM:** Catálogo maestro de fabricantes (Cummins, Caterpillar, Goulds, Siemens, etc.), fichas técnicas base y kit de repuestos sugeridos (`modelos_equipo_bom`).
   - **Pestaña 3: Módulos Técnicos:** Gestor visual de módulos funcionales (`modulos_tecnicos`), ordenamiento drag-and-drop de atributos y configuración de grupos visuales.
   - **Pestaña 4: Diccionario de Atributos:** Catálogo universal de atributos (`atributos_tecnicos`) con creación rápida *In-Place & Elevate*, tipos de control UI y selección de magnitudes UoM.
3. **Consola de Unidades y Magnitudes (`/configuracion/equipos-maestros/unidades`):**
   - Visualización de factores de escala afines ($y = ax + b$) y calculadora de validación en tiempo real.

---

## 6. Fase 4: Directorio Universal y Form Engine Adaptativo

**Objetivo:** Proveer a los coordinadores de mantenimiento de una interfaz visual fluida para dar de alta y editar cualquier tipo de maquinaria sin formularios rígidos.

### Tareas Nucleares:
1. **Directorio Universal de Equipos (`apps/admin/src/app/(dashboard)/equipos/`):**
   - Tarjetas de activos enriquecidas con insignias de arquetipo canónico (`GENERADOR`, `BOMBA`, `COMPRESOR`, `HVAC`, `ELEVADOR`, `OTRO`).
   - KPIs de cabecera dinámicos renderizados mediante `EquipoSpecsReader.getKpisHeader()`.
   - Filtros avanzados B-Tree por atributos técnicos (potencia, presión, caudal, voltaje) utilizando `equipos_atributos_filtro`.
2. **Form Engine Dinámico (`apps/admin/src/features/equipos/components/form-equipo-dinamico.tsx`):**
   - Carga dinámica del esquema según el tipo de equipo seleccionado (`GET /catalogos/arquetipos/:id/esquema`).
   - Renderizado modular agrupado por `modulos_tecnicos` y sus `grupo_visual`.
   - Controles adaptativos tipados (selectores de unidad UoM vinculados al motor afín, campos numéricos con rangos de tolerancia, selectores de opciones).
   - Pre-visualización en tiempo real de la Placa Técnica Universal antes de guardar.

---

## 7. Fase 5: PDF Universal y Sincronización Móvil Offline

**Objetivo:** Cerrar el ciclo operativo asegurando que las órdenes ejecutadas sobre cualquier maquinaria generen reportes técnicos de alta gama y que los técnicos móviles puedan diagnosticar cualquier activo sin conexión.

### Tareas Nucleares:
1. **Plantilla PDF Universal EAM (`apps/api/src/pdf/templates/tipo-universal-eam.template.ts`):**
   - Despacho condicional seguro en `PdfController`.
   - Renderizado dinámico de la Placa Técnica mediante `EquipoSpecsReader.getPlacaUniversal()`.
   - Checklist dinámico agrupado por subsistemas (`catalogo_sistemas`).
   - Matriz adaptativa de mediciones con semáforos de tolerancia según arquetipo.
2. **Sincronización PUSH/PULL Móvil:**
   - Validación del generador de snapshots en `SyncService` para arquetipos extendidos.
   - Verificación de persistencia offline en SQLite Drift (`apps/mobile`).
3. **Certificación End-to-End en Entorno Staging:**
   - Flujo completo: Crear arquetipo nuevo (ej. `CHILLER`) ➔ Crear equipo ➔ Crear orden ➔ Ejecutar en móvil offline ➔ Sincronizar ➔ Descargar PDF Universal con 100% de coherencia visual.
