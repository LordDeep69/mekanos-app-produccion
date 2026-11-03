# MEKANOS ERP / EAM - METAMODELO UNIVERSAL DE ACTIVOS
## Documento Maestro 02: Plan de Rutas de Desarrollo Atómico Nuclear

> **Estado:** Fases 0, 1, 2, 3, 3.5, 4, 4.5 y 5 Completadas y Certificadas al 100% (Metamodelo EAM Universal Culminado)  
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
| **Gestión Equipos** | `apps/api/src/equipos/equipos-gestion.service.ts` | Clasificación canónica, doble escritura, herencia Kit BOM OEM y filtros B-Tree con conversión SI | ✅ Certificado F4 |
| **Sidebar Admin** | `apps/admin/src/components/layout/sidebar.tsx` | Entrada única `Catálogo de Equipos Maestros` bajo Configuración | ✅ Certificado F3.5 |
| **Traductor Humano EAM** | `apps/admin/src/features/catalogos-eam/utils/eam-humanizer.ts` | Traducción 100% lenguaje humano y parser seguro de `opciones_json` | ✅ Certificado F3.5 |
| **Simulador Ficha/PDF** | `apps/admin/src/features/catalogos-eam/components/DynamicEquipmentFormPreview.tsx` | Formulario interactivo en vivo + Placa Técnica PDF corporativa | ✅ Certificado F3.5 |
| **Hub Maestros EAM** | `apps/admin/src/app/(dashboard)/configuracion/catalogos-eam/` | Barra única Top-Down (1→5), Partes/Planes prioritarios sobre simulador, cero truncado | ✅ Certificado F3.5 + F4.0 |
| **Compatibilidad Ruta** | `apps/admin/src/app/(dashboard)/configuracion/equipos-maestros/` | Redirección canónica hacia `/configuracion/catalogos-eam` | ✅ Completado F3 |
| **Directorio Equipos** | `apps/admin/src/app/(dashboard)/equipos/page.tsx` | Directorio universal con selector dinámico del Hub, KPIs JSONB y panel `🎛️ Filtros Técnicos` B-Tree | ✅ Certificado F4 |
| **Editor Modular EAM** | `apps/admin/src/features/equipos/components/DynamicModularSpecsEditor.tsx` | Motor de campos dinámicos por Parte/Subsistema con conversión UoM en vivo ($y = ax + b$) | ✅ Certificado F4 |
| **Wizard & Edición** | `apps/admin/src/features/equipos/components/EquipoForm.tsx` & `/equipos/[id]/editar/` | Wizard polimórfico de 3 pasos con pre-llenado Modelo de Fábrica, herencia Kit BOM WMS y planes heredados | ✅ Certificado F4 |
| **Ficha Técnica 360°** | `apps/admin/src/features/equipos/components/FichaTecnicaPolimorficaEam.tsx` | Expediente 360° polimórfico en `/equipos/[id]` con KPIs de placa, equivalencias SI y edición rápida | ✅ Certificado F4 |
| **PDF Universal** | `apps/api/src/pdf/templates/tipo-universal-eam.template.ts` | Renderizado adaptativo HTML/Puppeteer, despacho Zero-Trust y placa modular | ✅ Certificado F5 |
| **Sincronización Móvil** | `apps/api/src/sync/sync.service.ts` | Cascada 3 niveles (Equipo >> Modelo >> Catálogo) y resolución EquipoSpecsReader | ✅ Certificado F5 |

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
- [x] **3.5.1 Unificación de Barra Superior y Reordenamiento Top-Down (1 → 5)**
- [x] **3.5.2 Erradicación del 100% de Jerga de Programador (`eam-humanizer.ts`)**
- [x] **3.5.3 Corrección de `[object Object]`, Contexto de Parte/Subsistema y 0 Issues en Next.js (`TabDiccionarioAtributos.tsx`)**
- [x] **3.5.4 Orden por Relevancia Operativa y Simulador Interactivo `<DynamicEquipmentFormPreview />` (`TabArquetiposEquipo.tsx`)**
- [x] **3.5.5 Saneamiento de Kits BOM Reales WMS y Visor Humano de Especificaciones (`TabModelosOemBom.tsx`)**
- [x] **3.5.6 Compactación del Conversor de Unidades en 1 Fila (`TabMagnitudesUom.tsx`)**

---

## 7. Fase 4: Directorio Universal `/equipos` con Filtros B-Tree, Wizard Polimórfico con Herencia OEM/BOM y Expediente 360° Dinámico [ ✅ COMPLETADA ]

**Objetivo:** Conectar el Motor EAM Universal a la operación diaria en `/equipos` y `/equipos/[id]` para que el usuario opere cualquier clase de equipo (Generadores, Bombas, Motores, Compresores y cualquier nuevo tipo) con filtros B-Tree dimensionales, herencia de Modelos de Fábrica + Kits BOM reales del WMS y Ficha Técnica Polimórfica 360°.

### Checklist de Ejecución y Certificación:
- [x] **4.0 Ajuste Rápido en Pestaña 1 y Pestañas Superiores del Hub (`/configuracion/catalogos-eam`):**
  - En `TabArquetiposEquipo.tsx`: Invertido el orden vertical debajo de las 4 tarjetas de Tipos de Equipo para mostrar **primero** la fila de 2 columnas (`Partes y Subsistemas del Equipo` + `Planes de Mantenimiento Preventivo`) y **justo debajo** el `Simulador Interactivo` (`<DynamicEquipmentFormPreview />`).
  - En `/configuracion/catalogos-eam/page.tsx`: Eliminado el truncado `...` en los botones de las 5 pestañas superiores (`2. Modelos de Fábrica y Kits BOM`, `4. Catálogo de Campos Técnicos`).
- [x] **4.1 Directorio Universal `/equipos` con Filtros Técnicos B-Tree y KPIs Dinámicos (`apps/admin/src/app/(dashboard)/equipos/page.tsx` & `EquiposGestionService`):**
  - Selector superior de Tipos de Equipo dinámico alimentado por `useArquetiposEam()` + sincronización con los 4 filtros rápidos superiores.
  - Resolución polimórfica de KPIs inferiores en `EquipoCard` desde `especificaciones JSONB` + `datos_especificos` + `motor` (certificando que el Compresor `ID 214` `BOM-TAKU-HL3IAD` muestre su Presión, Caudal y Potencia reales en la tarjeta).
  - Panel desplegable **`🎛️ Filtros Técnicos`** conectado al índice B-Tree (`equipos_atributos_filtro`) con:
    - Selector de Campo Filtrable (`es_filtrable = true` del Hub + catálogo canónico).
    - Rango numérico (`Valor Mínimo`, `Valor Máximo`) con **Selector de Unidad de Medida** (`filtroAtributoUnidad`) y conversión automática en el backend hacia la unidad base SI mediante `UomConversionService` ($y = ax + b$).
    - Filtro de texto/selector con chips de sugerencia rápida y filtro booleano (`✓ Sí` / `✕ No`).
- [x] **4.2 Nuevo Wizard Dinámico de Registro y Edición (`EquipoForm.tsx`, `DynamicModularSpecsEditor.tsx`, `/equipos/[id]/editar/page.tsx`):**
  - **Paso 1:** Tarjetas dinámicas de Tipo de Equipo desde el Hub + selector **`⚡ Pre-llenar con Modelo de Fábrica (Opcional)`** + casilla marcada por defecto para vincular automáticamente el Kit de Repuestos sugerido del modelo a `componentes_equipo` (matriz BOM del activo).
  - **Paso 2:** Eliminada la redundancia `Categoría Técnica *`, conectado el botón **`✨ Generar`** al `codigo_corto` del tipo seleccionado (`GEN-`, `BOM-`, `MOT-`, `COMP-`), adaptado el nombre del contador y reemplazadas las 4 cajas fijas por **`📅 Planes de Mantenimiento Preventivo Heredados`**.
  - **Paso 3:** Renderizado modular con `<DynamicModularSpecsEditor />` agrupado por **Parte / Subsistema** y **Sección (`grupo_visual`)**, conversión matemática en vivo al cambiar la unidad de medida, badges `De fábrica` / `Personalizado` y persistencia Dual-Write (`especificaciones JSONB` + tablas satélite + proyección B-Tree + herencia BOM).
- [x] **4.3 Ficha Técnica Polimórfica en el Expediente 360° (`/equipos/[id]/page.tsx` & `FichaTecnicaPolimorficaEam.tsx`):**
  - Cabecera de **Indicadores Principales de Placa (KPIs)** con equivalencias automáticas (`Litros ≈ Galones`, `PSI ≈ bar`, `m³/h ≈ GPM`, `CFM ≈ m³/h`, `HP ≈ kW`).
  - Bloques modulares limpios por cada **Parte / Subsistema** y **Sección** (visibilizando la ficha completa de Generadores, Bombas, Motores y el Compresor `ID 214`).
  - Modal de edición rápida in-place **"Editar Especificaciones Técnicas"** impulsado por `<DynamicModularSpecsEditor />` y conectado a `PATCH /api/equipos/:id/datos-especificos`.

---

## 8. Paso 4.5: Corrección de 5 Bugs en Pantalla de la Fase 4 [ ✅ COMPLETADO ]

**Auditoría Visual Zero-Trust y Correcciones:**
1. **Bug #1 (Kit BOM OEM 0 repuestos):** Resuelto en backend `CatalogosEamService.getModelos()` incluyendo `modelos_equipo_bom` con su `catalogo_componentes`, y en frontend `EquipoForm.tsx` con chips de repuestos WMS y fallback seguro `repuestosKitCount`.
2. **Bug #2 (Auto-update nombre comercial en Wizard):** Resuelto en `EquipoForm.tsx` actualizando automáticamente `datosEquipo.nombre_equipo` al seleccionar o cambiar el Modelo OEM cuando está vacío o correspondía al modelo anterior.
3. **Bug #3 (Limpieza de 26 asignaciones redundantes sin grupo visual):** Eliminadas de la base de datos y agregado cleanup defensivo `prisma.modulo_atributos.deleteMany({ where: { grupo_visual: null } })` en `seed-eam-universal.ts`.
4. **Bug #4 (Aislamiento de magnitud Ah):** Creada magnitud canónica `CAPACIDAD_BATERIA` con unidades `AH` y `MAH`. `ELECTRICA_CORRIENTE` (id: 7) quedó limpia exclusivamente con `CCA`, `A` y `MA`. Atributo `capacidad_bateria_ah` migrado a `NUMERICO_MAGNITUD`.
5. **Bug #5 (Ergonomía visual y erradicación de "B-Tree"):** Reducido padding y altura de tarjetas KPI (`min-h-[58px]`, `px-3 py-2 rounded-xl`, compacto y elegante) en `FichaTecnicaPolimorficaEam.tsx`. Erradicados todos los textos técnicos internos "B-Tree" de cara al usuario en `/equipos` y `/equipos/[id]`.

---

## 9. Fase 5: PDF Universal EAM, Despacho Zero-Trust y Cascada Sync Móvil [ ✅ COMPLETADA Y CERTIFICADA AL 100% ]

**Objetivo:** Cerrar el ciclo operativo asegurando que las órdenes ejecutadas sobre cualquier maquinaria generen reportes técnicos de alta gama y que los técnicos móviles puedan diagnosticar cualquier activo con sincronización adaptativa en 3 niveles.

### Entregables Nucleares Certificados:
1. **Plantilla PDF Universal EAM (`apps/api/src/pdf/templates/tipo-universal-eam.template.ts`):**
   - Header corporativo oficial Mekanos S.A.S con logo PNG embebido en base64.
   - Trazabilidad fractal de caso (Visita #N, servicio vinculado, orden padre).
   - Placa Técnica Modular Universal adaptativa con KPIs destacados y bloques por subsistema funcional (`visible_en_pdf !== false`).
   - Matriz de telemetría y mediciones con semáforos de evaluación (`NORMAL`, `ALERTA`, `CRÍTICO`) y rangos tolerables.
   - Checklist dinámico de inspección agrupado por subsistemas con insignias cromáticas de estado (`B`, `R`, `M`, `C`, `A`, `NA`).
   - Repuestos, insumos y fluidos WMS segregados según origen (Bodega Mekanos / Suministrado por Cliente / Compra Directa).
   - Galería fotográfica cronológica (Antes / Durante / Después / Lotes de galería).
   - Firmas digitales con prefijo data URL y pie de página corporativo legal y tributario.
2. **Despacho Seguro Zero-Trust (`pdf.service.ts`, `pdf.controller.ts`, `finalizacion-orden.service.ts`):**
   - Se añadió `'UNIVERSAL_EAM'` al tipo unión `TipoInforme`.
   - **Regla Zero-Trust:** Las órdenes de `GENERADOR` y `BOMBA` preservan sus plantillas tradicionales intactas (garantizando 0 regresiones en el Golden Master de 35 órdenes de producción).
   - Todo activo polimórfico (`COMPRESOR`, `MOTOR`, o nuevos tipos creados en el Hub) despacha automáticamente `UNIVERSAL_EAM` sin degradar a `GENERADOR_A`.
3. **Cascada de Parámetros en 3 Niveles y Sync Móvil (`sync.service.ts`):**
   - Resolución de metadatos de activo (`marca`, `modelo`, `serie`, `tipoEquipo`) mediante `EquipoSpecsReader`.
   - Cascada de umbrales y tolerancias:
     - **Nivel 1:** `equipos.config_parametros` (override específico por activo en sitio).
     - **Nivel 2:** `modelos_equipo.plantilla_parametros_config` (especificaciones base del fabricante OEM).
     - **Nivel 3:** `parametros_medicion` (catálogo global del sistema).
4. **Certificación Automatizada Nuclear:**
   - Suite `fase5-pdf-sync-universal.spec.ts`: 6/6 tests pasando al 100%.
   - Suite `golden-master-pdf.spec.ts`: 35 órdenes reales de producción evaluadas con 0 discrepancias / 0 regresiones.
   - Compilación exitosa en `apps/api` (`nest build`) y `apps/admin` (40/40 rutas en `next build --webpack`).
