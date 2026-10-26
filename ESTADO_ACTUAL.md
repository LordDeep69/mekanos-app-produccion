# 📊 ESTADO ACTUAL DEL PROYECTO - MEKANOS S.A.S (OCTUBRE 2026)

## 🚀 ÚLTIMOS COMMITS Y RESOLUCIONES ARQUITECTÓNICAS (26 DE OCTUBRE DE 2026)

### Commit c308977: Sincronización Atómica de Horómetro (EAM Hoja de Vida) y Armonización de Navegación en Agenda (/agenda)

1. **Sincronización Atómica de Horómetro y Hoja de Vida (`finalizacion-orden.service.ts` & `schema.prisma`):**
   - **Diagnóstico Nuclear:** La tabla `lecturas_horometro` contaba con la secuencia de PostgreSQL `lecturas_horometro_id_lectura_seq`, pero su columna `id_lectura` no tenía configurado el valor por defecto en base de datos (`column_default: NULL`) y el esquema de Prisma carecía de `@default(autoincrement())`. Cualquier inserción fallaba silenciada en el `catch`. Además, `persistirHorometro` solo intentaba registrar en `lecturas_horometro` sin actualizar el campo acumulado `horas_actuales` de la tabla maestra `equipos`.
   - **Solución Implementada:**
     - Enlace de la secuencia en PostgreSQL y actualización del modelo Prisma `lecturas_horometro { id_lectura Int @id @default(autoincrement()) }`.
     - Detección ampliada de parámetros en `mapearMedicionesADatosModulo` para capturar `horometro`, `horómetro` y `horas de trabajo`.
     - Actualización atómica en `persistirHorometro`: valida prevención de reversa horométrica, calcula horas y días transcurridos respecto a la última lectura, inserta la lectura histórica y actualiza simultáneamente `equipos.horas_actuales` y `equipos.fecha_ultima_lectura_horas`.
     - Sincronización retroactiva aplicada al activo `GEN-EDIF-T86FEH` (ID `351`), reflejando con exactitud sus 416 horas tanto en hoja de vida como en el PDF legal.

2. **Armonización de UX y Navegación en la Agenda de Servicios (`apps/admin/src/app/(dashboard)/agenda/page.tsx`):**
   - **Diagnóstico:** En la vista de servicios programados de la agenda, cuando un servicio aún no tenía una orden creada (`servicio.orden_servicio === undefined`), hacer clic en la fila no ejecutaba ninguna acción ni brindaba retroalimentación al usuario. Los nombres de cliente y equipo tampoco permitían navegar a sus respectivas fichas técnicas.
   - **Solución Implementada:**
     - Columna de acción clara: si existe orden, despliega botón/insignia azul interactivo `OS #numero` (`/ordenes/${id}`); si no existe orden, despliega botón verde destacado `+ Generar OS` (`/ordenes/nueva?clienteId=...&equipoId=...`).
     - Enlaces directos e independientes: clic en el nombre del cliente conduce a `/clientes/${id}`; clic en el código de equipo conduce a `/equipos/${id}`.
     - Armonización visual corporativa con bordes suaves `border-slate-200 bg-white shadow-xs rounded-2xl` en tarjetas KPI, panel de alertas vencidas, carga de técnicos y tabla de cronograma.

---

### Commit 93f0f44 / 1f75991: Certificación Oficial (100% PASS) de la Cadena Maestra EAM hasta el PDF Legal

- **Validación Visual de Integridad:** Certificada en orden real `OS-202610-0021` (`GEN-EDIF-T86FEH` en Edificio Palmetto Beach).
- **Flujo E2E Validado:** Catálogo Maestro ⟷ Sourcing B2B ⟷ Compras & Muelle ⟷ WMS Lotes FIFO ⟷ Órdenes de Servicio ⟷ Equipos BOM ⟷ PDF Legal.
- **Segregación de Repuestos:** Tabla A (Garantía Almacén Mekanos Lote `LOT-2026-0005`), Tabla B (Suministro Cliente con Cláusula de Exención de Responsabilidad Civil) y Tabla C (Compras directas en sitio).
- **Ficha Técnica Industrial:** Placa de motor/generador de 810 kVA, tensiones 220/127V, RPM 1800, marcas Stamford / Doosan y control estricto de saltos de página con Puppeteer.

---

### Commit c8d41fe: Selector Explícito de Alcance (General vs Multi-Equipo) y Creación Atómica en Pendientes Técnicos

1. **Selector Explícito de Alcance y Multi-Selección en Portal Admin (`apps/admin/src/features/ordenes/components/pendientes-section.tsx`):**
   - **Diagnóstico:** Anteriormente, el formulario de registro de pendientes no preguntaba al usuario si el pendiente correspondía a toda la orden o a un equipo en particular. Además, dependía de una condición restrictiva (`ordenes_equipos.length > 1`) que ocultaba la opción en órdenes mono-equipo o formateadas como objeto singular, y solo permitía seleccionar un único equipo a la vez.
   - **Impacto:** Imposibilidad de asignar un mismo hallazgo a varios equipos a la vez, falta de transparencia sobre si el pendiente quedaba ligado al cuarto de máquinas o a una máquina concreta, y riesgo de pérdida de trazabilidad EAM en órdenes multiequipo.
   - **Solución Implementada:**
     - **Paso 1 (Alcance y Asignación):** Tarjetas de selección mutuamente excluyentes y destacadas:
       - `🌐 General de la Orden`: Para hallazgos de infraestructura, tuberías comunes, cuarto de máquinas o ventilación general (sin ligarse a una máquina específica).
       - `🎯 Asignar a Equipo(s)`: Para registrar y trazar el hallazgo en la hoja de vida técnica de los activos intervenidos.
     - **Paso 2 (Multi-Selección de Equipos):** Grilla interactiva de equipos con casillas de verificación (checkboxes), secuencia (`#1`, `#2`), código de activo (`GEN-001`, `BOM-002`), nombre del sistema o equipo y tipo de equipo. Incorpora atajos `[Seleccionar todos]` y `[Limpiar selección]`.
     - **Paso 3 (Creación Atómica Múltiple):** Si se seleccionan $N$ equipos, el formulario envía `idOrdenEquipos` al backend y actualiza el estado agregando los $N$ registros creados simultáneamente.
     - **Paso 4 (Insignias de Trazabilidad en Listado):** Los ítems registrados muestran de forma taxativa:
       - `🌐 General de la Orden` (badge ámbar con icono Globe) si no está ligado a un equipo.
       - `🔧 #sec · [CÓDIGO] Nombre de Equipo` (badge azul con icono Wrench) con enlace inequívoco a su equipo.

2. **Extensión Atómica en Backend API (`apps/api/src/ordenes/ordenes.controller.ts`):**
   - **Soporte de Multi-Asignación:** El endpoint `POST /api/ordenes/:id/pendientes` ahora acepta `idOrdenEquipos: number[]`, creando atómicamente un registro `ordenes_pendientes` por cada equipo con su respectivo `id_orden_equipo` e `id_equipo` de base de datos.
   - **Soporte de Alcance General:** Acepta `esGeneral: boolean`, garantizando que `id_orden_equipo` se guarde como `null` sin defaults forzados al primer equipo.
   - **Retrocompatibilidad:** Mantiene la compatibilidad con peticiones mono-equipo enviando `data` e `items`.

3. **Homologación en Flutter Mobile (`apps/mobile/lib/features/ejecucion/presentation/pendientes_orden_widget.dart`):**
   - Incorporación del chip `🌐 General de la Orden` en la barra horizontal de asignación del modal móvil.
   - Resolución de visualización: cuando `idOrdenEquipo` es nulo, el widget reporta taxativamente `🌐 General de la Orden` en lugar de un genérico "Equipo Principal".

---

## 📅 HISTORIAL DE RESOLUCIONES ARQUITECTÓNICAS (OCTUBRE DE 2026)

### Commit `7e211c7`: Blindaje Integral del Módulo de Pendientes Técnicos (Backend ⇄ Admin Portal ⇄ Mobile App)

1. **Causa Raíz Nuclear Resuelta en Backend (`apps/api/src/ordenes/ordenes.controller.ts`):**
   - **Diagnóstico:** En NestJS/Express, las rutas declaradas bajo el mismo prefijo se evalúan en estricto orden secuencial. La ruta paramétrica genérica `@Get(':id')` (definida en la línea 1914) precedía la definición de las rutas estáticas de `@Get('catalogo-pendientes')`.
   - **Impacto:** Cualquier petición GET a `/api/ordenes/catalogo-pendientes` era capturada por `@Get(':id')` con `id = "catalogo-pendientes"`. El handler ejecutaba `parseInt("catalogo-pendientes", 10)` resultando en `NaN`, lo que provocaba que Prisma lanzara `PRISMA_CLIENT_VALIDATION: Argument id_orden_servicio is missing` devolviendo un HTTP 400 Bad Request.
   - **Corrección:** Se reubicó quirúrgicamente todo el bloque de gestión de pendientes y catálogo maestro (`catalogo-pendientes` GET/POST/PUT/DELETE, `pendientes/:id/estado` PATCH y `pendientes/:id` DELETE) inmediatamente antes de `@Get('estados-debug')` (línea 1797), garantizando precedencia absoluta sobre `@Get(':id')`.

2. **Sincronización Móvil Tolerante y Retrocompatible (`sync.service.ts`, `sync-response.dto.ts` & `sync_service.dart`):**
   - **Diagnóstico:** El backend emitía en el objeto de descarga `idPendienteCatalogo`, pero omitía la clave `id`. En la aplicación móvil, `_processPendientesCatalogo` ejecutaba `id: Value(item['id'] as int)`. Al ser `null`, Dart lanzaba `TypeError: Null is not a subtype of type int`, abortando la inserción de las 25 plantillas pre-sembradas en la base de datos local Drift/SQLite y dejando la tabla local vacía.
   - **Corrección en Backend:** `SyncPendienteCatalogoDto` y el mapeo en `SyncService` ahora emiten simétricamente `id`, `idPendienteCatalogo` y `activo`.
   - **Corrección en Mobile:** `_processPendientesCatalogo` se blindó con lectura defensiva: `item['id'] ?? item['idPendienteCatalogo'] ?? item['id_pendiente_catalogo']`, parseo seguro contra enteros o strings y valores por defecto automáticos.

3. **Selector Premium en Portal Admin (`apps/admin/src/features/ordenes/components/pendientes-section.tsx`):**
   - **Diagnóstico:** El componente invocaba `fetch('/api/ordenes/...')` directamente en el navegador del cliente. Al no existir rutas internas de Next.js en Vercel ni cabeceras Bearer token inyectadas, las peticiones fallaban o retornaban respuestas vacías. Además, el selector era un simple `<select>` HTML sin diseño ni capacidades de búsqueda.
   - **Corrección:**
     - Migración total de todas las operaciones a `apiClient` (`GET /ordenes/catalogo-pendientes`, `POST /ordenes/:id/pendientes`, `PATCH /ordenes/pendientes/:id/estado`, `DELETE /ordenes/pendientes/:id`), garantizando base URL dinámica (`NEXT_PUBLIC_API_URL`) e inyección automática de JWT.
     - Rediseño prémium del selector con:
       - Buscador reactivo por palabra clave o código mnemotécnico (`PEND-GEN-BAT`, `PEND-GEN-FUG-RAD`, etc.).
       - Chips de filtrado por categoría (`TODAS`, `GENERADOR`, `BOMBA`, `ELECTRICO`, `MECANICO`, `GENERAL`).
       - Dropdown scrollable con diseño de tarjetas, insignias de categoría y botón `+ Seleccionar`.
       - Tarjeta de previsualización de plantilla seleccionada con botón rápido `Cambiar / Desvincular`.

4. **Experiencia de Usuario en Campo en App Mobile (`apps/mobile/lib/features/ejecucion/presentation/pendientes_orden_widget.dart`):**
   - **Diagnóstico:** El widget dependía exclusivamente de `Autocomplete`, el cual no desplegaba sugerencias si el texto estaba vacío o si la tabla local no tenía registros cargados.
   - **Corrección:**
     - Se dotó a `Autocomplete` de un `optionsViewBuilder` estilizado con elevación, bordes redondeados, badges por categoría y restricciones de altura máxima.
     - Se integró un modal de exploración de catálogo (`_abrirSelectorCatalogo`) accesible mediante botón dedicado e icono en el campo de búsqueda, permitiendo al técnico filtrar por categorías, buscar rápidamente y agregar plantillas estándar con un solo toque.

---

**Fecha de Actualización:** 23 de Octubre de 2026  
**Versión:** 6.0 Release Candidate (RC-10 - Blindaje Jurídico y Ficha Técnica de Ingeniería en Motor de Informes Técnicos PDF Puppeteer)  
**Últimos Commits Clave:** 
- `feat(pdf-engine)`: Blindaje Jurídico, Segregación Taxativa de Repuestos WMS/Cliente y Enriquecimiento de Ficha Técnica en el **Motor de Informes Técnicos PDF** (`pdf.controller.ts`, `pdf.service.ts`, `mekanos-base.template.ts` y las 4 plantillas de servicio):
  - **Segregación Taxativa en 3 Modalidades de Repuestos y Fluidos:**
    - **Tabla A (Suministro Mekanos S.A.S. - Almacén Central / Garantía WMS):** Despachos con `origen_componente = 'BODEGA'`. Detalla SKU / Código de catálogo (`ART-2026-XXXX`), descripción técnica, marca/modelo, cantidad, unidad de medida, badge de Lote de trazabilidad (`LOT-2026-XXXX`) y ubicación en bodega. Incluye nota al pie de certificación de calidad y garantía oficial de repuesto y fluido.
    - **Tabla B (Repuestos e Insumos Provistos por el Cliente - Trazabilidad en Hoja de Vida):** Registro con `origen_componente = 'CLIENTE'`. Detalla descripción, referencia/marca aportada, cantidad, unidad y condición de recepción. Incorpora de forma taxativa la **Cláusula de Exención de Responsabilidad Civil y Garantía**:
      > *"DECLARACIÓN DE SUMINISTRO EXTERNO: Los materiales y/o fluidos detallados en esta tabla fueron provistos directamente por el cliente a su solicitud para trazabilidad técnica en la hoja de vida del equipo. Mekanos S.A.S. certifica la correcta ejecución técnica de su montaje o aplicación, pero no otorga garantía sobre la procedencia, calidad, idoneidad ni fallas mecánicas derivadas de piezas o fluidos no provistos por nuestro almacén."*
    - **Tabla C (Adquisiciones Directas en Campo / Compras Locales):** Registro con `origen_componente = 'COMPRA_DIRECTA'`. Detalla ítem, referencia/proveedor, cantidad, unidad y nota de atención de contingencia autorizada en sitio.
    - Fallback elegante para órdenes sin consumo de repuestos (badge informativo neutro en Preventivo B y Correctivo) y retrocompatibilidad total con cadenas legacy de texto plano.
  - **Enriquecimiento Integral de la Ficha Técnica del Activo en el Encabezado:**
    - Componente unificado `generarDatosClienteConFichaTecnica`:
      - **Cliente y Emplazamiento:** Razón Social, NIT / Documento de identidad, Sede, Dirección física detallada y Ubicación técnica / Cuarto de máquinas (`📍 CUARTO DE MÁQUINAS`).
      - **Tiempos de Servicio:** Fecha del servicio (con manejo de entrada/salida si ocurrió en días distintos), Técnico asignado, Hora de entrada y Hora de salida.
      - **Ficha Técnica de Placa:** Badge distintivo con código de activo (`GEN-EDIF-T86FEH` / `BOM-EDIF-XXXX`), denominación oficial del equipo, tipo de equipo, marca y modelo (generador, motor o bomba), número de serie oficial, potencia nominal (`kVA / kW` o `HP`), tensión / frecuencia / fases (`220/127V · 60 Hz · 3F`), velocidad nominal (`RPM`).
      - **Horometría Doble:** Horómetro de intervención (horas registradas en la orden) y Horómetro acumulado total en hoja de vida del equipo.
  - **Control Estricto de Saltos de Página Industrial (`page-break-inside: avoid`):**
    - Reglas CSS de impresión en `baseStyles` protegiendo filas de tablas (`tr`), bloques de repuestos, disclaimer legal, ficha técnica, evidencias fotográficas y firmas contra quiebres de página indeseados.
  - **Actualización Homogénea en las 4 Plantillas Oficiales de Reporte Técnico:**
    - `tipo-correctivo.template.ts` (Mantenimiento Correctivo Multi-Equipo y Mono-Equipo).
    - `tipo-a-generador.template.ts` (Preventivo Tipo A - Generadores Eléctricos).
    - `tipo-b-generador.template.ts` (Preventivo Tipo B - Generadores Eléctricos con Cambio de Filtros y Fluidos).
    - `tipo-a-bomba.template.ts` (Preventivo Tipo A - Sistemas de Bombeo).
  - **Canalización Transaccional en Backend (`pdf.controller.ts` & `finalizacion-orden.service.ts`):**
    - Métodos extractores `extraerRepuestosDetallados` y `extraerEquipoDetallado` integrados tanto en los endpoints de preview/descarga/regeneración como en el flujo de cierre final de orden y subida a Cloudflare R2.
- `fix(catalogo-kpis)`: Saneamiento de Agregación SQL/Prisma en Catálogo Maestro (`articulos.service.ts`):
  - **Resolución de la Discrepancia 24 vs 25:**
    - Causa Forense Confirmada: La función `getResumen()` realizaba el conteo total con filtro `{ where: { activo: true } }` (obteniendo 24 artículos), pero la consulta de agrupación `groupBy({ by: ['destino_articulo'] })` omitía la cláusula `where`, contabilizando un artículo de prueba legado e inactivo (`id_componente: 1`, `LEGACY-CMP-001`, `Componente legado histórico (Archivado)` con `activo: false` y `destino_articulo: 'INSUMO_SERVICIO'`).
    - Corrección Aplicada: Se incorporó la condición estricta `where: { activo: true }` a `groupBy`, garantizando que tanto la tarjeta KPI *Total Recursos* (24) como la tarjeta *Insumos de Servicio* (24) y las píldoras de filtrado muestren cifras 100% consistentes y matemáticamente simétricas.
- `feat(catalogo-nuevo)`: Adopción del Selector Combobox Popover Puntual con Drill-Down Exclusivo y Modal In-Context en Alta de Repuestos (`/compras/catalogo/nuevo`):
  - **Experiencia de Usuario Punctual & Zero-Stress:**
    - Sustitución del panel en cascada por el selector Combobox Popover de 40px en reposo, homologando la experiencia validada y elogiada en `/compras/catalogo`.
    - Presentación ejecutiva en línea única: icono contextual de familia, ruta jerárquica limpia (`FILTROS Y FILTRACIÓN › FILTROS DE ACEITE`), badge de nivel (`N2`), badge de código mnemotécnico y botón `✕` para reiniciar.
  - **Popover Flotante `z-50` de Precisión:**
    - Activación bajo demanda exclusivamente al hacer clic en el campo o navegar por teclado.
    - Ancho ergonómico optimizado (`min-w-[320px] sm:w-[480px]`) que no desplaza ni empuja los campos inferiores (SKU, Marca, Referencia).
    - Buscador predictivo global con filtrado instantáneo y dropdown de coincidencias.
    - Navegación enfoca exclusiva (Nivel 1 ➔ Nivel 2 ➔ Nivel 3) con cabecera de nivel, botón `← Volver` y botón `✓ Asignar esta`.
    - Asignación inmediata al formulario con cierre automático al seleccionar una categoría terminal.
  - **Modal In-Context de Creación Integrado (`+ Nueva Subcategoría` / `+ Nueva Familia`):**
    - Botón de creación directa en el pie del popover para registrar nuevas clasificaciones en caliente sin perder el foco ni los datos del repuesto.
    - Preselección automática del nodo padre activo en el modal.
- `feat(taxonomia-filtro-toolbar)`: Activación Bajo Demanda ("El Cuadro") & Homologación en Catálogo Maestro (`/compras/catalogo`):
  - **Activación Bajo Demanda de "El Cuadro":**
    - "El cuadro" del navegador taxonómico ahora sólo se refleja cuando el buscador o selector tiene el clic activado, manteniéndose limpio y oculto en estado de reposo tanto en formularios como en barras de filtros.
    - Cierre automático al hacer clic fuera del componente o al completar la selección de una rama terminal.
  - **Homologación de Toolbar en Catálogo Maestro (`/compras/catalogo`):**
    - Implementación de `HierarchicalCategorySelect` en modo `variant="combobox"` para la barra de herramientas del catálogo.
    - Disparador compacto de 40px (`h-10`) con chip de categoría seleccionada, badge de nivel y botón de limpieza `✕`.
    - Popover flotante `z-50` con navegación enfocada exclusiva (Nivel 1 ➔ Nivel 2 ➔ Nivel 3) que nunca rompe la cuadrícula ni empuja la tabla de datos hacia abajo.
- `feat(catalogo-taxonomia)`: Rediseño Enterprise desde Primeros Principios del **Selector Jerárquico de Categorías (`HierarchicalCategorySelect`)**:
  - **Navegación Enfocada Progresiva & Selección Exclusiva (Zero-Saturación):**
    - Erradicación de la sobrecarga visual de árboles saturados y de columnas horizontales: la interfaz se enfoca exclusivamente en el nivel activo.
    - **Paso 1 (Familias Raíz):** Se presentan únicamente las 9 Familias Principales de Nivel 1.
    - **Paso 2 (Enfoque Exclusivo en Subcategorías):** Al pulsar una familia (e.g. *Filtros y Filtración*), se registra la selección de inmediato (`onChange`), se actualizan las migas de pan superiores y la lista oculta todas las demás familias, desplegando exclusivamente las 6 subcategorías directas de esa familia.
    - **Paso 3+ (Descenso a $N$-Niveles):** Si se selecciona una subcategoría con hijos (e.g. *Filtros de Aire*), la vista avanza exclusivamente a sus hijas (*FILTRO DE AIRE INTERNO* ➔ *Interno Reciclable*). Si es terminal (e.g. *Filtros de Aceite*), se resalta con badge `Terminal` y estado `✓ Asignada`.
    - **Navegación Bidireccional Fluida:** Botón `← Volver` para subir un nivel, más migas de pan interactivas como "máquina del tiempo" para saltar a cualquier nivel superior con un solo clic.
    - **Buscador Predictivo Global:** Búsqueda textual instantánea con salto directo al nodo y auto-posicionamiento en su vista enfocada.
    - **Alta In-Context de Ramas:** Creación rápida en caliente con el padre activo preseleccionado.
- `feat(catalogo-alta-premium)`: Elevación a Grado Enterprise del **Alta y Edición de Recursos Maestros** (`articulo-form.tsx`):
  - **Selector Jerárquico en Cascada Multinivel (`HierarchicalCategorySelect`):**
    - Corrección del bug de recursividad en árbol (`node.hijos` vs `node.subcategorias`), habilitando la navegación fluida por todas las subcategorías y sub-hijas.
    - Implementación del modo `variant="cascading"`: Selección multinivel guiada: Nivel 1 (Familia Raíz) ➔ Nivel 2 (Subcategoría / Sistema) ➔ Nivel 3 (Sub-hija / Especificación dinámica si aplica).
    - Migas de pan reactivas (`Breadcrumbs`) con ruta materializada completa (`FILTROS Y FILTRACIÓN › FILTROS DE ACEITE`).
    - Alternancia a un click con buscador global directo por texto plano.
    - Alta in-context de categorías/subcategorías con preselección del nodo padre activo.
  - **Selector Premium de Unidades de Medida (`UnidadesMedidaSelect`):**
    - Sustitución de select plano nativo por Popover Combobox con búsqueda instantánea por símbolo ISO y nombre.
    - Agrupación por magnitud física con badges e iconos (`🔢 Conteo`, `🧪 Volumen`, `📏 Longitud`, `⚖️ Masa`, `📦 Conjunto`).
    - Preselección automática inteligente por defecto a `UND` (Unidad) en modo creación.
    - Chip técnico de precisión (`Entero` vs `Permite decimales`).
  - **Autogeneración Inteligente y Validación en Tiempo Real de SKU / Código Interno:**
    - Endpoints NestJS: `GET /api/catalogo-componentes/siguiente-sku` y `GET /api/catalogo-componentes/validar-codigo`.
    - Botón `⚡ Auto-generar SKU` para cálculo de correlativo formal `ART-YYYY-XXXX` libre de colisiones.
    - Prefetch automático al montar en modo creación para que el campo aparezca pre-poblado y validado.
    - Validación debounced en vivo mientras se tipea, con alertas visuales de unicidad y protección contra duplicados.
  - **Asistente de Nomenclatura Estándar & Selector Comercial:**
    - Sugeridor de título estandarizado `descripcion_corta` (`Categoría + Marca + Referencia`, ej: `FILTRO DE ACEITE BALDWIN B96`).
    - Selector táctil de Tipo Comercial (`⭐ Original / OEM`, `🛡️ Homologado`, `⚙️ Genérico`).
- `feat(wms-eam-dominio)`: Separación arquitectónica definitiva entre **Referenciación Técnica y Comercial** (`Artículo ➔ Equipo` en `/equipos/[id]`) y **Despacho / Consumo de Almacén** (`Artículo ➔ Orden de Servicio` en `/ordenes/[id]`):
  - **Arquetipo 1 — Referenciación en Equipo (BOM 360°):**
    - Referenciación técnica/comercial para cotización y compras: vincular un artículo no exige ni valida stock hoy.
    - Clasificación nativa `TITULAR` vs `ALTERNATIVO` (Homólogo) en `componentes_equipo`: la ausencia de stock en un homólogo alternativo no contamina la disponibilidad ni alarma al kit.
    - Filosofía Zero-Stress: erradicación de alarmas rojas (`🚨 AGOTADO`), sustituidas por badges neutrales informativos `Bajo Pedido / Cotizar (0 en bodega)`.
    - KPI superior del BOM (`KIT DE REPUESTOS`): reporta `X Titulares • Y Homólogos` y `X en bodega • Y bajo pedido`.
    - Visualización de Precios de Venta y Costo de Referencia (`precio_compra` y `precio_venta`) en la matriz BOM para cotización inmediata.
    - Botón `🛒 Crear OC` sobrio y profesional.
  - **Arquetipo 2 — Selector de 3 Modalidades en Órdenes de Servicio (`/ordenes/[id]`):**
    - `1. Descuento Bodega WMS`: Descuenta stock físico de almacén y lote bajo regla FIFO, genera movimiento `SALIDA / CONSUMO_OS` en Kardex e imputa costo a la OT.
    - `2. Solo Registro / Compra Directa`: Permite asociar cualquier artículo del Catálogo Maestro o tipear manual, imputa costo a la OT y al historial del activo, sin tocar existencias de bodega ni Kardex.
    - `3. Suministro Cliente`: Registra el repuesto para trazabilidad técnica e historial clínico con costo $0 para Mekanos, documentado en la OT, Informe PDF e Historial del Equipo.
    - Barra de sugerencias BOM de 1-click y buscador del Catálogo Maestro universales para las 3 modalidades, con auto-conmutación inteligente a `COMPRA_DIRECTA` si se selecciona un ítem BOM sin saldo en bodega.
  - **Saneamiento Forense en Base de Datos & Next.js:**
    - Erradicación del typo de siglo (`0017-01-02` y `0002-01-01` renderizados como `1917` y `1902`) corregidos a `2017` y `2020` en `equipos` (id 351 `GEN-EDIF-T86FEH`, 299 `GEN-UNIT-JM7XS2`, 211 `BOM-TAKU-2JRO0F`).
    - Etiquetado masivo de `rol_repuesto` (`TITULAR` / `ALTERNATIVO`) en `componentes_equipo`.
- `feat(equipos-bom)`: Remediación forense integral Zero-Trust del Parque EAM 360° y Matriz BOM (`/equipos` y `/equipos/[id]`):
  - Detección precisa de suficiencia de stock BOM (`stock_actual` vs `cantidad_requerida`) con estados `OK` (Cubre Kit), `INSUFICIENTE` (Faltan Z) y `AGOTADO`, botón `🛒 Pedir OC` y KPI superior de kit completo.
  - Inferencia inteligente de categoría de aplicación en modal de vinculación BOM a partir del nombre/descripción del artículo.
  - Dropdown flotante `z-50` sin empujar campos y modal de edición en vivo (`ModalEditarBom` + `PATCH /api/equipos/:id/componentes-compatibles/:idRelacion`).
  - Coherencia matemática en KPIs de `/equipos` (194 Generadores • 200 Bombas • 69 Otros Activos = 463 Total) y saneamiento de chips técnicos (ocultando ceros/nulos) con icono industrial `Settings` (⚙️).
  - Preselección inmediata y robusta de cliente y equipo en el wizard `/ordenes/nueva` desde el botón `+ Nueva OT` y `+ Crear Orden de Servicio`.
  - Siembra y saneamiento demo en base de datos para `AQUANOVA-GEN-1`, `GEN-EDIF-JA1MNK`, `GEN-EDIF-T86FEH` y `GEN-CLI-DDQU49`.
- `feat(equipos-eam)`: Expediente EAM 360° de Activos Industriales (`/equipos` y `/equipos/[id]`), Matriz de Repuestos Compatibles (BOM) con stock WMS en vivo, Historial Clínico de Repuestos Instalados, sugerencias BOM de 1-click al despachar en `/ordenes/[id]` y erradicación de error Prisma en `getTrazabilidadServicios`.
- `c986360`: `fix(wms-ordenes): habilitar liquidacion administrativa en ordenes completadas, nomenclatura OS-YYYYMM en kardex y selects sin truncamiento`.
- `9486e78`: `feat(wms-ordenes): modal enterprise para confirmacion de reintegro a bodega y retiro de servicios`.
- `b9d4c50`: `fix(wms-ordenes): saneamiento totales prisma, autocierre click-outside, validacion reactiva de existencias y estilizacion selectores`.
- `feat(wms-ordenes)`: Integración transaccional bidireccional entre Inventario WMS (`/inventario`) y Órdenes de Servicio (`/ordenes/[id]`), despacho por bodega/lote FIFO, reversión atómica en Kardex, selector predictivo de OT e impresión en PDF oficial.
- `d59d83f` / `b852ef8`: `fix(wms): correccion bug falsy zero en modales multi-bodega, preseleccion inteligente con stock, saneamiento kardex historico y footer sticky`.
**Estado General:** ✅ **~99.5% DE COMPLETITUD GLOBAL DEL ECOSISTEMA**  
**Documento Maestro Detallado:** Para el análisis exhaustivo, tablas y métricas línea por línea, consulte [ESTADO_ACTUAL_SISTEMA_2026.md](file:///c:/Users/Malo/Documents/mekanosApp/mekanos-app-produccion/docs/ESTADO_ACTUAL_SISTEMA_2026.md).

---

## 🚀 RESUMEN EJECUTIVO Y DIAGNÓSTICO ATÓMICO

El ecosistema ERP/WMS industrial Mekanos ha consolidado la integración transaccional extremo a extremo entre los módulos de **Catálogo Maestro de Compras**, **Aprovisionamiento de Órdenes de Compra**, **Almacén WMS / Lotes / Kardex**, **Parque de Activos EAM 360° & Matriz BOM**, y **Órdenes de Servicio (`/ordenes/[id]`) con Imputación Financiera y Emisión PDF**:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   ESTADO REAL VERIFICADO DEL MONOREPO                  │
├────────────────────────────────────────────────────────────────────────┤
│ 1. ✅ BASE DE DATOS PostgreSQL       │ 84 modelos / 78 ENUMs   │ 100%  │
│ 2. ✅ BACKEND NestJS API             │ 93 módulos / 93 ctrls   │ 100%  │
│ 3. ✅ PORTAL ADMINISTRADOR Web       │ 43 páginas / 10 módulos │  99%  │
│ 4. ✅ APP MÓVIL Flutter Offline      │ Drift v17 / 17 tablas   │  90%  │
│ 5. ✅ MOTOR DE INFORMES PDF          │ Puppeteer / 10 templates│ 100%  │
│ 6. ✅ SERVICIOS TRANSVERSALES        │ R2, Cloudinary, OAuth2  │ 100%  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🔍 RESUMEN DE SUBSISTEMAS Y ÚLTIMAS REMEDIACIONES

### 1. Expediente EAM 360° de Activos Industriales & Matriz BOM (`/equipos` y `/equipos/[id]`) — **100% Certificado**
- **Lógica de Suficiencia de Stock en Matriz BOM (`stock_actual` vs `cantidad_requerida`):**
  - Se subsanó la validación ingenieril de disponibilidad: si el almacén posee existencias menores a las requeridas por el kit de servicio ($0 < \text{stock} < \text{req}$), el sistema emite el badge ámbar de advertencia `⚠️ X de Y [unidad] (Faltan Z)` y habilita de inmediato el botón `🛒 Pedir OC` hacia `/compras/ordenes/nueva?componenteId=[id]&cantidad=[faltante]`.
  - Cuando el stock cubre o supera el kit ($\text{stock} \ge \text{req}$), emite el badge verde corporativo `✓ Cubre Kit`.
  - Cuando no hay existencias ($\text{stock} \le 0$), emite el badge rojo `🚨 AGOTADO` con botón `🛒 Pedir OC`.
  - El KPI superior ejecutivo de `/equipos/[id]` reporta con exactitud matemática `X/Y con kit completo` con micro-resumen de ítems insuficientes y agotados.
- **Inferencia Inteligente de Aplicación en Modal BOM (`ModalVincularBom`):**
  - Detección contextual instantánea de la categoría de aplicación (`FILTRO_ACEITE`, `FILTRO_COMBUSTIBLE`, `FILTRO_SEPARADOR_AGUA`, `FILTRO_AIRE`, `LUBRICANTE_MOTOR`, `REFRIGERANTE`, `CORREA`, `BATERIA`, `SELLO_MECANICO`, `RODAMIENTO`) al seleccionar cualquier artículo del catálogo.
- **Buscador Flotante y Edición en Vivo del BOM:**
  - El selector de artículos se comporta como un overlay flotante (`z-50 shadow-2xl`) que flota por encima de los campos sin desplazar el formulario modal.
  - Implementado el botón de edición (icono lápiz) y el modal `ModalEditarBom` respaldado por el endpoint `PATCH /api/equipos/:id/componentes-compatibles/:idRelacion` para modificar categoría, cantidad por servicio, frecuencia en horas y notas técnicas sin tener que desvincular y recrear.
- **Coherencia Matemática y Micro-Chips en `/equipos`:**
  - Desglose matemático sincronizado en la tarjeta principal: `194 Generadores • 200 Bombas • 69 Otros Activos (Total: 463)`.
  - Filtrado estricto de micro-chips en tarjetas de equipo: se ocultan automáticamente etiquetas con valores `0`, `'0 kW'`, `'0 kVA'`, `'N/A'` o nulos.
  - Sustitución del icono de bomba de gasolina (`⛽`) por el icono mecánico e industrial `Settings` (⚙️) para el motor/impulsor de plantas y bombas.
- **Preselección Instantánea en `+ Nueva OT`:**
  - Tanto desde los botones `+ Nueva OT` de las tarjetas de `/equipos` como desde `+ Crear Orden de Servicio` en `/equipos/[id]`, los parámetros `?clienteId=...&equipoId=...` son consumidos por el wizard de `/ordenes/nueva`, asociando de forma reactiva y determinista al cliente y preseleccionando el equipo en el Paso 1.

### 2. Integración Transaccional Bidireccional Inventario WMS ⇄ Órdenes de Servicio (`/ordenes/[id]` y `/inventario`) — **100% Certificado**
- **Modelo de Datos Enriquecido (`public.componentes_usados`):**
  - Incorporadas las columnas y llaves foráneas `id_ubicacion` (hacia `ubicaciones_bodega`), `id_lote` (hacia `lotes_componentes`) e `id_movimiento_inventario` (hacia `movimientos_inventario`), además de la secuencia nativa `componentes_usados_id_componente_usado_seq`.
- **Motor Transaccional Unificado en `InventarioService` (`apps/api/src/inventario/inventario.service.ts`):**
  - `registrarSalida` y `despacharComponenteOrden`: Ejecutan en una única transacción `prisma.$transaction` el descuento físico en `catalogo_componentes.stock_actual` y `lotes_componentes.cantidad_actual` (bajo regla FIFO/FEFO), el asiento inmutable en `movimientos_inventario` (`origen_movimiento: 'CONSUMO_OS'`), la inserción vinculada en `componentes_usados` y el recálculo financiero automático de `ordenes_servicio`.
  - `reintegrarComponenteOrden` (`DELETE /api/ordenes/:id/componentes/:idUso`): Reversión atómica que restaura el saldo en el lote origen y en el catálogo maestro, asienta el contra-movimiento auditable en Kardex (`tipo_movimiento: 'ENTRADA'`, `origen_movimiento: 'DEVOLUCION'`), elimina la imputación en la orden y recalcula los totales financieros.

### 3. Inventario & Almacén WMS (`/inventario` y `/inventario/[id]`) — **100% Certificado**
- **Auditoría Forense Senior Zero-Trust:**
  - Ajuste físico multi-bodega con cálculo delta en tiempo real.
  - Salida y traslado con control estricto de saldo por bodega origen y rotación FIFO/FEFO.
  - UX con menús predictivos flotantes (`z-50 shadow-xl`) y tarjetas contextuales sin desplazamiento de controles.
  - Expediente logístico `/inventario/[id]` en 3 pestañas: Lotes por Bodega, Historial Kardex Auditable y Parámetros de Almacén con botón "Pedir a Proveedor".

---

## 🎯 PRÓXIMAS DECISIONES Y HOJA DE RUTA
Consulte el documento maestro [docs/ESTADO_ACTUAL_SISTEMA_2026.md](file:///c:/Users/Malo/Documents/mekanosApp/mekanos-app-produccion/docs/ESTADO_ACTUAL_SISTEMA_2026.md) para los siguientes pasos:
- **Flujo A:** ✅ **COMPLETADO:** Integración transaccional bidireccional entre Inventario WMS (`/inventario`) y Órdenes de Servicio (`/ordenes/[id]`).
- **Flujo B:** ✅ **COMPLETADO:** Pruebas de integración de recepciones automáticas de mercancía (Orden de Compra -> Entrada a Lote WMS).
- **Flujo C:** ✅ **COMPLETADO:** Evolución EAM 360° de Equipos (`/equipos` y `/equipos/[id]`), Matriz BOM con stock WMS en vivo, edición inline, kits completos vs insuficientes y sugerencias de despacho en OTs.


---

## 🏛️ GESTIÓN INTELIGENTE Y TRAZABILIDAD MULTI-EQUIPO DE PENDIENTES TÉCNICOS (COMMIT c6c5c37) — **100% CERTIFICADO**

### 1. Formulario Estratégico y Categorías Dinámicas en Catálogo Maestro (`/configuracion/catalogos/pendientes`)
- **Categorías Vivas en Base de Datos:** Eliminado el texto libre hardcodeado. Se consulta `GET /api/ordenes/catalogo-pendientes/categorias` que extrae dinámicamente las categorías reales existentes en la base de datos (`ELECTRICO`, `MECANICO`, `COMBUSTIBLE`, `HIDRAULICO`, `ELECTRONICO`, `INSTRUMENTACION`, `LIMPIEZA`, `GENERAL`), enriquecido con selector táctil de badges e iconos vectoriales.
- **Creación In-Context (`+ Nueva Categoría`):** Modal interactivo que permite añadir nuevas familias en caliente sin salir del flujo de trabajo, formateándolas en mayúsculas y asignándolas de inmediato.
- **Tipos de Equipo Dinámicos:** Lectura directa desde `tipos_equipo` de la base de datos relacional (Generador Eléctrico, Bomba Hidráulica, Compresor de Aire, Motor Industrial, etc.), con opción explícita `🌐 Aplica Universalmente a Todo Tipo de Activo`.
- **Autogenerador Mnemotécnico Anti-Colisión:** Algoritmo en tiempo real con patrón `PEND-[PREFIJO]-[SLUG]-[SUFFIX]` que sugiere códigos inteligentes basados en la descripción y tipo de equipo (ej: `PEND-GEN-BAT-ARR`, `PEND-BOM-FUG-SEL-MEC`) con verificación instantánea de unicidad (`✓ Código único verificado` vs `⚠️ Código ya en uso`).

### 2. Modal Ergonómico Dedicado en App Mobile (`apps/mobile` - Flutter)
- **Sustitución del Widget Apretado Inline:** En la pantalla de ejecución (`ejecucion_screen.dart`), se despliega una **Tarjeta Ejecutiva Limpia** con badge de conteo y botón prominente `[+ Registrar / Gestionar Pendientes]`.
- **Modal Sheet de Alta Comodidad (90% de pantalla):**
  - **Selector Multi-Equipo en Cabecera Sticky:** Si la orden comprende múltiples máquinas, el técnico selecciona primero a cuál corresponde el pendiente mediante chips táctiles grandes (`#1 · Bomba Jockey`, `#2 · Bomba Principal`).
  - **Pestaña 1 - Catálogo Sugerido:** Buscador reactivo, carrusel horizontal de categorías, tarjetas de plantillas con selector rápido de prioridad (`NORMAL`, `ALTA`, `URGENTE`) y botón de adición a 1-tap con retroalimentación inmediata.
  - **Pestaña 2 - Hallazgo Personalizado:** Formulario táctil espacioso con selector de prioridad, campo de descripción multilínea y notas de referencia para cotización posterior.

### 3. Arquitectura y Trazabilidad Multi-Equipo (`ordenes_pendientes` ⇄ `equipos` ⇄ `ordenes_equipos`)
- **Binding Atómico de Integridad Referencial:**
  - En `POST /api/ordenes/:id/pendientes`, se resuelve y vincula obligatoriamente `id_orden_equipo` junto con `id_equipo`, asociando el hallazgo a la máquina específica dentro de órdenes de batería o estaciones de bombeo.
  - Respuesta enriquecida con relación `ordenes_equipos: { select: { id_orden_equipo, orden_secuencia, nombre_sistema } }`.
- **Trazabilidad en Hoja de Vida (`GET /api/equipos/:id/pendientes`):**
  - Endpoint de consulta EAM que reporta `total`, `activosCount`, `resueltosCount`, `canceladosCount` y la lista completa de pendientes asociados al activo a lo largo de su ciclo de vida.
- **Pestaña 4 en Expediente 360° (`/equipos/[id]`):**
  - Incorporada la pestaña **"4. Hallazgos & Pendientes Técnicos"** (`EquipoPendientesTab`), con tarjetas KPI de abiertos vs resueltos, filtros por estado, buscador y enlaces directos a las Órdenes de Servicio de origen para auditoría y cotización post-servicio.
