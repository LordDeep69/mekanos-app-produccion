# MEKANOS ERP / EAM - METAMODELO UNIVERSAL DE ACTIVOS
## Documento Maestro 02: Plan de Rutas de Desarrollo Atómico Nuclear

> **Estado:** Fases 0, 1, 2, 3 y 3.5 Completadas y Certificadas al 100% / Fases 4 y 5 Planificadas  
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
| **Sidebar Admin** | `apps/admin/src/components/layout/sidebar.tsx` | Entrada única `Catálogo de Equipos Maestros` bajo Configuración | ✅ Certificado F3.5 |
| **Traductor Humano EAM** | `apps/admin/src/features/catalogos-eam/utils/eam-humanizer.ts` | Traducción 100% lenguaje humano y parser seguro de `opciones_json` | ✅ Certificado F3.5 |
| **Simulador Ficha/PDF** | `apps/admin/src/features/catalogos-eam/components/DynamicEquipmentFormPreview.tsx` | Formulario interactivo en vivo + Placa Técnica PDF corporativa | ✅ Certificado F3.5 |
| **Hub Maestros EAM** | `apps/admin/src/app/(dashboard)/configuracion/catalogos-eam/` | Barra única Top-Down (1→5), cero jerga de programador, BOM real WMS | ✅ Certificado F3.5 |
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
- [x] **0.2 Normalización de `aplica_a` en Catálogo de Sistemas (`apps/admin`)**
- [x] **0.3 Saneamiento de Unidades Corruptas en `parametros_medicion` (Supabase PostgreSQL)**
- [x] **0.4 Implementación del Lector Unificado `EquipoSpecsReader` y Suite Jest (24/24 PASS)**
- [x] **0.5 Certificación de Invarianza Golden Master (35 Órdenes de Producción, 0 discrepancias)**

---

## 3. Fase 1: Metamodelo Relacional, Semilla Canónica y Motor Dimensional UoM [ ✅ COMPLETADA ]

**Objetivo:** Introducir los modelos de datos canónicos para magnitudes físicas, unidades de medida ($y = ax + b$), módulos técnicos y atributos dinámicos en Prisma y PostgreSQL (Supabase) de forma estrictamente aditiva y construir el motor dimensional afín `UomConversionService`.

### Checklist de Ejecución y Certificación:
- [x] **1.1 Modelado en `packages/database/prisma/schema.prisma` (10 tablas + evoluciones JSONB/GIN)**
- [x] **1.2 Migración SQL Additive Ejecutada en Supabase (`20261031_eam_universal_fase1.sql`)**
- [x] **1.3 Motor Dimensional Afín `UomConversionService` y Suite Jest (32/32 PASS)**
- [x] **1.4 Certificación de No-Regresión Triple Suite (48/48 PASS)**

---

## 4. Fase 2: Backend Core EAM, Paridad 1:1, Backfill de 467 Equipos y Doble Escritura B-Tree [ ✅ COMPLETADA ]

**Objetivo:** Alcanzar paridad 1:1 absoluta con todas las columnas de las tablas satélite (`equipos_generador`, `equipos_bomba`, `equipos_motor`), ejecutar el backfill idempotente de los 467 equipos hacia JSONB y la tabla de filtros B-Tree `equipos_atributos_filtro`, reclasificar los 15 equipos incoherentes, implementar la doble escritura transaccional en `EquiposGestionService` y publicar la API REST completa del metamodelo.

### Checklist de Ejecución y Certificación:
- [x] **2.1 Ampliación Exhaustiva del Seed (`seed-eam-universal.ts`, 145 atributos canónicos)**
- [x] **2.2 Saneamiento de Incoherencias y Backfill Idempotente (`backfill-equipos-eam.ts`, 467/467 equipos)**
- [x] **2.3 Doble Escritura Transaccional y Proyección B-Tree en `EquipoFilterProjectionService` (2,276 filas)**
- [x] **2.4 Endpoints REST del Hub de Configuración EAM (`apps/api/src/catalogos-eam`)**

---

## 5. Fase 3: Saneamiento Canónico (Paso 3.0), Completitud CRUD API EAM y Hub Ejecutivo de 5 Pestañas (`apps/admin`) [ ✅ COMPLETADA ]

**Objetivo:** Proveer la interfaz centralizada de administración del metamodelo de 5 capas conectada a datos reales de producción.

### Checklist de Ejecución y Certificación:
- [x] **3.0 Saneamiento Profundo en Supabase y Paridad en `EquiposGestionService` (`259 Generadores`, `203 Bombas`)**
- [x] **3.1 Completitud CRUD y Deduplicación Canónica en `CatalogosEamModule` (`apps/api`, 9/9 tests)**
- [x] **3.2 Hub Ejecutivo UI/UX de 5 Pestañas en `apps/admin` (`/configuracion/catalogos-eam`)**

---

## 6. Fase 3.5: Saneamiento Ergonómico, Descontaminación Cognitiva y Pulido Prémium (`apps/admin` & `apps/api`) [ ✅ COMPLETADA ]

**Objetivo:** Erradicar el 100% de la jerga de programador (*Developer-Speak*), eliminar la doble barra superior que consumía el 55% de la pantalla, reordenar las 5 pestañas en orden mental humano Top-Down (de lo General a lo Específico), corregir bugs visuales (`[object Object]`, `CMP-TEST-001`) y transformar la vista previa en un simulador interactivo real de Formulario y Placa PDF.

### Checklist de Ejecución y Certificación:
- [x] **3.5.1 Unificación de Barra Superior y Reordenamiento Top-Down (1 → 5):**
  - En `sidebar.tsx`: Eliminado ítem duplicado dentro de `Catálogos` y corregido `useEffect` de auto-expansión; entrada única limpia **`Catálogo de Equipos Maestros`** bajo `Configuración`.
  - En `/configuracion/catalogos-eam/page.tsx`: Eliminada la doble botonera redundante y reemplazada por **1 Sola Barra de Navegación Compacta con KPIs Integrados** en orden Top-Down:
    1. **`1. Tipos de Equipo`** *(4 Clases • 464 Equipos)* (Activa por defecto)
    2. **`2. Modelos de Fábrica y Kits BOM`** *(4 Modelos Preconfigurados)*
    3. **`3. Partes y Subsistemas`** *(5 Módulos Reutilizables)*
    4. **`4. Catálogo de Campos Técnicos`** *(145 Campos de Ficha)*
    5. **`5. Unidades de Medida`** *(11 Magnitudes • Conversor)*
- [x] **3.5.2 Erradicación del 100% de Jerga de Programador (`eam-humanizer.ts`):**
  - Eliminados textos técnicos internos (`ZERO-TRUST`, `B-Tree`, `snake_case`, `NUMERICO_MAGNITUD`, `TEXTO_CORTO`, `BOOLEANO`, `SELECTOR`, `ESTANDAR`, `LO_QUE_OCURRA_PRIMERO`).
  - Traducidos controles a badges humanos (`# Número con Unidad`, `# Número Simple`, `☰ Lista de Opciones`, `Aa Texto`, `✓ Sí / No`), switches a `Obligatorio`, `Permitir Filtrar`, `Destacar en Tarjeta (KPI)`, `Imprimir en PDF`, y criterios preventivos a `Lo que ocurra primero (Días u Horas)`.
- [x] **3.5.3 Corrección de `[object Object]`, Contexto de Parte/Subsistema y 0 Issues en Next.js (`TabDiccionarioAtributos.tsx`):**
  - Parser seguro `parseOpcionesSeguras()` para `opciones_json` (`{ valor, etiqueta }`) con claves únicas y límite visual de 4 opciones + badge `+N más` con tooltip.
  - Nueva columna y filtro **`Parte / Subsistema donde se usa`** (`Motor Combustión`, `Alternador / Generador`, `Bomba Hidráulica`, `Motor Eléctrico`, `Compresor de Aire`).
- [x] **3.5.4 Orden por Relevancia Operativa y Simulador Interactivo `<DynamicEquipmentFormPreview />` (`TabArquetiposEquipo.tsx`):**
  - Tipos de Equipo ordenados por parque activo descendente: 1° **Generador Eléctrico (259)**, 2° **Bomba Hidráulica (203)**, 3° **Motor Industrial (2)**, 4° **Compresor de Aire Industrial (1)**.
  - Corregida obligatoriedad en `Motor Industrial` (`motor_electrico` principal, `motor_combustion` opcional).
  - Componente reutilizable `<DynamicEquipmentFormPreview />` con conmutador en vivo: **`[ 📝 Así se verá el Formulario de Registro ]`** (inputs reales, conversión automática de unidades UoM, listas desplegables, switches Sí/No y pre-llenado con Modelo de Fábrica) y **`[ 📄 Así se verá la Placa Técnica en el PDF ]`**.
- [x] **3.5.5 Saneamiento de Kits BOM Reales WMS y Visor Humano de Especificaciones (`TabModelosOemBom.tsx`):**
  - Erradicado el ítem de prueba `CMP-TEST-001` en `modelos_equipo_bom` y reemplazado por 12 artículos reales activos de `catalogo_componentes` (filtros Baldwin/Fleetguard, lubricantes Mobil/Shell, baterías Willard, correas Gates).
  - Visor de especificaciones por defecto traducido a **Nombre Humano del Campo + Valor con Unidad / Etiqueta**.
- [x] **3.5.6 Compactación del Conversor de Unidades en 1 Fila (`TabMagnitudesUom.tsx`):**
  - Barra horizontal compacta en 1 sola fila para dejar las 11 Magnitudes y sus Unidades visibles sin scroll vertical.

---

## 7. Fase 4: Directorio Universal y Form Engine Adaptativo

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

## 8. Fase 5: PDF Universal y Sincronización Móvil Offline

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
