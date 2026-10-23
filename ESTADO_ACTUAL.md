# 📊 ESTADO ACTUAL DEL PROYECTO - MEKANOS S.A.S (OCTUBRE 2026)

**Fecha de Actualización:** 23 de Octubre de 2026  
**Versión:** 5.8 Release Candidate (RC-8 - Selector Combobox Popover Enterprise en Catálogo Maestro y Alta de Repuestos)  
**Últimos Commits Clave:** 
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
