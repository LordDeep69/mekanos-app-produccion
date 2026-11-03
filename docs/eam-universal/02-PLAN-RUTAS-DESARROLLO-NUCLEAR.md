# MEKANOS ERP / EAM - METAMODELO UNIVERSAL DE ACTIVOS
## Documento Maestro 02: Plan de Rutas de Desarrollo Atómico Nuclear

> **Estado:** Fases 0, 1, 2 y 3 Completadas y Certificadas al 100% / Fases 4 y 5 Planificadas  
> **Estrategia:** Zero-Trust, First-Principles, Adición sin Regresiones, Paridad 1:1 de Ingeniería  
> **Fecha de Actualización:** Noviembre 2026  

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
| **Sembrado Canónico** | `packages/database/prisma/seeds/seed-eam-universal.ts` | 11 magnitudes, 39 UoM, 145 atributos, 5 módulos, 4 OEM + simetría de planes | ✅ Certificado F2/F3 |
| **Motor UoM Dimensional** | `apps/api/src/equipos/services/uom-conversion.service.ts` | Motor afín de conversión ($y = ax + b$) | ✅ 32/32 Tests Green |
| **Backfill & Saneamiento** | `packages/database/prisma/seeds/backfill-equipos-eam.ts` | Migración de 467 equipos a JSONB + 15 corregidos + B-Tree | ✅ Certificado (467/467) |
| **Proyección B-Tree** | `apps/api/src/equipos/services/equipo-filter-projection.service.ts` | Proyección de filtros en `equipos_atributos_filtro` | ✅ Certificado (2,276 filas) |
| **Catálogos API REST** | `apps/api/src/catalogos-eam/` | CRUD completo de magnitudes, UoM, atributos, módulos, arquetipos canónicos y OEM | ✅ Certificado (9/9 Tests) |
| **Gestión Equipos** | `apps/api/src/equipos/equipos-gestion.service.ts` | Clasificación canónica por `tipos_equipo`, doble escritura y filtros B-Tree | ✅ Certificado |
| **Sidebar Admin** | `apps/admin/src/components/layout/sidebar.tsx` | Acceso ejecutivo a `Ingeniería EAM (Activos)` | ✅ Completado F3 |
| **Hub Maestros EAM** | `apps/admin/src/app/(dashboard)/configuracion/catalogos-eam/` | Hub Ejecutivo de 5 Pestañas con KPIs interactivos, In-Place & Elevate y Vista Previa | ✅ Completado F3 |
| **Compatibilidad Ruta** | `apps/admin/src/app/(dashboard)/configuracion/equipos-maestros/` | Redirección canónica hacia `/configuracion/catalogos-eam` | ✅ Completado F3 |
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

## 4. Fase 2: Backend Core EAM, Paridad 1:1, Backfill de 467 Equipos y Doble Escritura B-Tree [ ✅ COMPLETADA ]

**Objetivo:** Alcanzar paridad 1:1 absoluta con todas las columnas de las tablas satélite (`equipos_generador`, `equipos_bomba`, `equipos_motor`), ejecutar el backfill idempotente de los 467 equipos hacia JSONB y la tabla de filtros B-Tree `equipos_atributos_filtro`, reclasificar los 15 equipos incoherentes, implementar la doble escritura transaccional en `EquiposGestionService` y publicar la API REST completa del metamodelo.

### Checklist de Ejecución y Certificación:
- [x] **2.1 Ampliación Exhaustiva del Seed (`seed-eam-universal.ts`):**
  - Sembrados 139 atributos técnicos canónicos (145 totales en diccionario) cubriendo el 100% de columnas satélite (`motor_combustion`, `alternador_generador`, `bomba_hidraulica`, `motor_electrico`, `compresor_industrial`).
  - Asignadas 136 relaciones en `modulo_atributos` con `grupo_visual`, `es_kpi`, `es_filtrable`, `visible_en_pdf`.
  - Sembrados 4 Modelos OEM Maestros (`modelos_equipo`) con kits BOM (`modelos_equipo_bom`).
- [x] **2.2 Saneamiento de Incoherencias y Backfill Idempotente (`backfill-equipos-eam.ts`):**
  - Reclasificadas las 14 bombas Goulds/Pentair (IDs 32, 35, 38, 41, 44, 48, 51, 56, 59, 62, 65, 99, 102, 104) de `id_tipo_equipo = 1 (GENERADOR)` a `id_tipo_equipo = 2 (BOMBA)`.
  - Migrado el compresor Siemens ID 214 a su estructura JSONB de compresor (`modulos.motor_electrico` + `modulos.compresor_industrial`).
  - Traducidos los 467 equipos a `equipos.especificaciones_json` JSONB y proyectadas 2,276 filas en `equipos_atributos_filtro`.
- [x] **2.3 Doble Escritura Transaccional y Proyección B-Tree en Backend Core:**
  - Creado servicio `EquipoFilterProjectionService` y conectado a `EquiposGestionService`.
- [x] **2.4 Endpoints REST del Hub de Configuración EAM (`apps/api/src/catalogos-eam`):**
  - Controladores REST implementados y certificados con pruebas unitarias.

---

## 5. Fase 3: Saneamiento Canónico (Paso 3.0), Completitud CRUD API EAM y Hub Ejecutivo de 5 Pestañas (`apps/admin`) [ ✅ COMPLETADA ]

**Objetivo:** Proveer la interfaz centralizada de administración del metamodelo de 5 capas en una experiencia de usuario fluida, con ergonomía "Cero Apretado / Cero Truncamiento", KPIs interactivos, alta rápida *In-Place & Elevate* y vista previa en vivo del arquetipo.

### Checklist de Ejecución y Certificación:
- [x] **3.0 Saneamiento Profundo en Supabase y Paridad en `EquiposGestionService`:**
  - Desactivación y limpieza determinista de registros residuales de pruebas E2E (`ENERGIA-TEST-4733`, `ENERGIA-TEST-4499`, `TEST-FULL-1551` en `tipos_equipo` y `TEST_AUTO_7864` en `tipos_servicio`).
  - Depuración semántica de `tipo_equipo_planes`: erradicación de planes contradictorios vinculados a servicios correctivos/emergencia y sembrado simétrico de planes preventivos e inspección reales en pares canónicos (`1↔3` Generadores, `2↔5` Bombas, `4↔6` Motores, `20` Compresores).
  - Corrección en `EquiposGestionService.listarEquiposCompletos()` para clasificar tarjetas y calcular KPIs de parque (`259 Generadores activos`, `203 Bombas activas`) priorizando `tipos_equipo.codigo_tipo` sobre filas satélite heredadas.
- [x] **3.1 Completitud CRUD y Deduplicación Canónica en `CatalogosEamModule` (`apps/api`):**
  - Deduplicación canónica transparente en `getArquetipos()` sumando conteos activos y totales de pares gemelos (`1+3`, `2+5`, `6+4`) y sincronización espejo al vincular módulos o gestionar planes preventivos.
  - Endpoints CRUD completos para Magnitudes, Unidades UoM, Atributos Técnicos, Módulos Técnicos (incluyendo `PATCH /catalogos/modulos-tecnicos/:codigo/atributos/:idAtributo` para switches en caliente), Arquetipos, Planes Preventivos y Modelos OEM + buscador de componentes WMS (`GET /catalogos/modelos-equipo/componentes-wms`).
  - Suite `catalogos-eam.service.spec.ts` ampliada a 9/9 pruebas unitarias en verde.
- [x] **3.2 Hub Ejecutivo UI/UX de 5 Pestañas en `apps/admin` (`/configuracion/catalogos-eam` y `/configuracion/equipos-maestros`):**
  - **5 Tarjetas KPI Superiores Interactivas:** Mapa mental clicable que conmuta directamente entre las 5 capas del metamodelo resaltando la capa activa.
  - **Pestaña 1 (Magnitudes y Unidades UoM):** Maestro-Detalle de las 11 magnitudes y 39 unidades SI + **Calculadora Metrológica UoM en Vivo** ($y = ax + b$).
  - **Pestaña 2 (Diccionario de Atributos Técnicos):** 145 atributos con buscador instantáneo, filtros por magnitud y tipo de control, jerarquía de 2 líneas sin truncamiento y chips de opciones ENUM.
  - **Pestaña 3 (Módulos Técnicos Componibles):** Visor por `grupo_visual`, switches interactivos en caliente (`Obligatorio`, `Filtrable B-Tree`, `KPI Ficha`, `Visible PDF`) y creación rápida **`+ Crear y Asignar Atributo Rápido (In-Place)`**.
  - **Pestaña 4 (Arquetipos Canónicos de Equipo):** Gestión de módulos heredados, CRUD de Planes Preventivos Base, creación rápida *In-Place* y panel interactivo **`👁️ Vista Previa en Vivo: Renderizador Dinámico de Placa Técnica y Formulario`** (`GET /catalogos/arquetipos/:id/esquema`).
  - **Pestaña 5 (Modelos Maestros OEM y Kits BOM WMS):** Catálogo de modelos OEM, editor de especificaciones base JSONB y gestor de Lista de Materiales (BOM Default) conectado al catálogo WMS.

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
