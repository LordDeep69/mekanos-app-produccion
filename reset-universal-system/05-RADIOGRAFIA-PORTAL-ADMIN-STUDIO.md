# 05 — Radiografía del Portal Admin (Next.js 16 + EAM Studio + Módulos Operativos)

> **Alcance:** Diagnóstico forense **AS-IS** de `apps/admin/src/`: arquitectura de rutas, cliente API y caché, EAM Studio (`/configuracion/catalogos-eam`), gestión de activos (`/equipos`), clientes (`/clientes`), órdenes de servicio (`/ordenes`), abastecimiento (`/compras/ordenes`), inventario (`/inventario`), reportes (`/reportes`), dashboard (`/dashboard`), configuración del sistema (`/configuracion`) y layout corporativo.  
> **Regla de rigor:** Cada ruta, componente, línea y hallazgo citado aquí proviene de lectura directa en el código fuente. **Cero prescripciones de solución.**

---

## 1. Diagnóstico Arquitectónico General del Portal Admin

El Portal Admin presenta una **fuerte asimetría evolutiva** entre su capa de **ingeniería paramétrica (EAM Studio)** y sus **módulos operativos diarios**:

1. **Lo sobresaliente (Zona 2 — Paramétrica):** El corazón del EAM Studio (`/configuracion/catalogos-eam`) y sus subcomponentes (`TabArquetiposEquipo`, `DynamicModularSpecsEditor`, `FichaTecnicaPolimorficaEam`, `FastProtocolBuilder`, `eam-code-generator`, `eam-humanizer`) logran una arquitectura dinámica real basada en metadatos (módulos de ficha técnica, unidades con conversión dimensional, constructores de protocolos y prevención de colisión de códigos).
2. **La fractura operativa (Zona 3 + Zona 1 — Marca / Verticales):** Las pantallas del día a día (`/equipos`, `EquipoForm`, `/clientes`, `/ordenes/nueva`, `actividad-card-advanced`, `/dashboard`, `/compras/ordenes/nueva`, Sidebar y Config Hub) **ignoran o cortocircuitan** el modelo dinámico mediante:
   - Mapas hardcodeados de **IDs numéricos de base de datos** (`FAMILIA_POR_ID_TIPO_EQUIPO`).
   - Tabs, KPIs y filtros binarios **"Plantas Eléctricas vs Bombas"**.
   - Heurísticas de texto heredadas que secuestran la definición del catálogo en campo.
   - Identidad visual/textual **"MEKANOS"**, moneda **`COP`** y locale **`es-CO`** grabados en componentes JSX y DTOs.
3. **Brecha de cobertura API vs UI:** Existen únicamente **10 carpetas de rutas** bajo `apps/admin/src/app/(dashboard)/`:
   `agenda`, `clientes`, `compras`, `configuracion`, `dashboard`, `empleados`, `equipos`, `inventario`, `ordenes`, `reportes`.  
   Por ende, módulos completos existentes en Prisma y NestJS (**Cotizaciones**, **Propuestas Correctivo**, **Contratos de Mantenimiento**, **Cronogramas Automáticos**, **Remisiones**, y **Configuración de Empresa / White-Label**) **carecen de pantalla en Portal Admin**.

---

## 2. Layout, Marca y Centro de Configuración (`/configuracion`)

### 2.1 Sidebar y Branding (`apps/admin/src/components/layout/sidebar.tsx`)
- **Identidad hardcoded (`líneas 189-224`):**
  - Logotipo geométrico fijo con el ícono `<Zap />` (simbolizando energía/plantas eléctricas), título literal `MEKANOS`, subtítulo `Portal Admin`, y `title="Mekanos - Portal Admin"` en estado colapsado.
  - No consume ningún objeto de configuración de tenant/empresa (logo URL, colores corporativos, nombre comercial).

### 2.2 Centro de Configuración (`apps/admin/src/app/(dashboard)/configuracion/`)
- **Ausencia de módulo de Identidad Corporativa / White-Label:** Las rutas reales registradas son únicamente `catalogos/*`, `catalogos-eam`, `cuentas-email`, `equipos-maestros` (que hace `redirect('/configuracion/catalogos-eam')`), `firmas-administrativas`, `usuarios` y `page.tsx`. No existe vista ni servicio para configurar logo, razón social, NIT, colores, moneda, impuestos por defecto, prefijos de numeración ni zona horaria de la empresa cliente.
- **Métricas de marketing hardcoded en texto (`configuracion/page.tsx:108-111` y `catalogos-eam/page.tsx`):**
  - El hub muestra literalmente: `"Configura los Tipos de Equipo (464 activos operativos)... Catálogo de 145 Campos Técnicos"`.
  - En `catalogos-eam/page.tsx`, los contadores de tarjetas muestran fallbacks estáticos (`?? 4 Clases • 464 Equipos`, `?? 4 Modelos Preconfigurados`, `?? 5 Módulos Reutilizables`, `?? 145 Campos de Ficha`, `?? 11 Magnitudes`) y copy hardcoded `"Define qué tipos de equipos atiende Mekanos..."` (`línea 136`).

---

## 3. EAM Studio y Catálogos Paramétricos (Logros vs Fugas)

| Componente | Fortalezas Observadas (Zona 2) | Acoplamientos / Fugas Detectadas (AS-IS) |
| :--- | :--- | :--- |
| **`TabArquetiposEquipo.tsx`** | Gestiona arquetipos, macrocategorías y módulos asignables por clase de activo sin depender de tablas fijas por rubro | `MACRO_CATEGORIAS_INDUSTRIALES` excluye explícitamente ciertos rubros (ej. tuberías/puertas en presets) y `getCategoryBadgeInfo()` usa búsqueda de subcadenas (`transfor`/`energ` → `Zap`, `vertical` → `ArrowUpDown`) en lugar de leer icono/color desde BD. |
| **`FastProtocolBuilder.tsx`** | Permite ensamblar checklists y mediciones rápido en un tipo de servicio, conectado a unidades y magnitudes EAM | Mantiene una lista local auxiliar `UNIDADES_FRECUENTES` junto a las magnitudes dinámicas. |
| **`ModoRespuestaSelector.tsx`** | Selector de modo de calificación para ítems de inspección | Línea `38` muestra texto literal: `'Escala estándar MEKANOS con Bueno, Regular, Malo, Corregido y No Aplica'`. |
| **`eam-code-generator.ts` / `eam-humanizer.ts`** | Resuelve colisiones de códigos de forma determinista y humaniza enums técnicos en español | Código reutilizable sano y sin marca; modelo a seguir para otros componentes. |

---

## 4. Parque de Equipos y Ficha Técnica Polimórfica (`/equipos` y `EquipoForm`)

Aquí se evidencia el choque frontal entre el nuevo diseño polimórfico (`FichaTecnicaPolimorficaEam`) y el molde legacy de Mekanos:

1. **KPIs superiores reducidos a 2 rubros (`apps/admin/src/app/(dashboard)/equipos/page.tsx:1600-1710`):**
   - La barra de resumen superior solo muestra 4 tarjetas: `Total Parque`, **`Plantas Eléctricas`**, **`Sistemas de Bombeo`** y `Disponibilidad Operativa`. Si una empresa opera ascensores, aires acondicionados, subestaciones o puertas eléctricas, esos activos desaparecen de la lectura ejecutiva.
2. **Filtros y badges rígidos en `/equipos` (`equipos/page.tsx:75-170, 380-450`):**
   - `CAMPOS_BTREE_CANONICOS` restringe campos mediante `aplica_tipos: ['GENERADOR']` y `['GENERADOR', 'MOTOR']`.
   - `TipoBadge` solo mapea explícitamente 8 códigos heredados (`GEN`, `BOM`, `MOT`, `COMP`, etc.).
3. **Valores iniciales hardcoded en `EquipoForm.tsx` (`líneas 212, 362-370`):**
   - `tipoSeleccionado` arranca en `'GENERADOR'`.
   - `defaultValues` fuerza `tipo: 'GENERADOR'`, `id_tipo_equipo: 1`, `ubicacion_texto: 'CUARTO DE PLANTAS ELÉCTRICAS / SUBESTACIÓN'` y mantiene una lista fallback con **IDs numéricos quemados** (`1, 2, 3, 11`).
   - `getTipoVisualConfig` resuelve íconos por coincidencia de string (`GEN`, `BOM`, `COMP`, `MOT`).
4. **Fuerte contraste con Zona 2 (`FichaTecnicaPolimorficaEam.tsx` & `DynamicModularSpecsEditor.tsx`):**
   - `FichaTecnicaPolimorficaEam` carga el esquema real desde `useArquetipoEsquemaEam` y renderiza pestañas/secciones y campos dinámicos JSONB de forma limpia.
   - Sin embargo, `DynamicModularSpecsEditor` aún conserva mapas auxiliares `FACTORES_AFINES_FALLBACK` y placeholders numéricos por palabras clave (`getDynamicNumericPlaceholder`).

---

## 5. Clientes y Órdenes de Servicio (`/clientes` y `/ordenes`)

### 5.1 Directorio de Clientes (`apps/admin/src/features/clientes/`)
- En `clientes-table.tsx:97-99` y `clientes.service.ts:1-90`, el filtro por tipo de flota instalada en el cliente está bloqueado al tipo de Unión literal:
  `'TODOS' | 'PLANTAS' | 'BOMBAS' | 'AMBOS' | 'SIN_EQUIPOS'`.
  Es imposible filtrar clientes que posean ascensores, climatización, tuberías o subestaciones.

### 5.2 Creación y Detalle de Órdenes (`/ordenes/nueva`, `familia-equipo.ts`, `actividad-card-advanced.tsx`)
1. **Pestañas binarias en Selector de Equipos (`apps/admin/src/app/(dashboard)/ordenes/nueva/page.tsx:1595-1600`):**
   - Al asignar activos a una nueva orden, los tabs del selector filtran literalmente:
     `if (filtroTab === 'GEN') return cat === 'GENERADOR'; if (filtroTab === 'BOM') return cat === 'BOMBA';`.
   - Además utiliza `toLocaleDateString('es-CO')` de forma directa.
2. **Acoplamiento frágil a Primary Keys físicas de Postgres (`apps/admin/src/features/ordenes/lib/familia-equipo.ts:70-80`):**
   - Define `FAMILIA_POR_ID_TIPO_EQUIPO` asignando nombres de familia a enteros específicos de tabla:
     `[1, 'GENERADOR'], [3, 'GENERADOR'], [2, 'BOMBA'], [5, 'BOMBA'], [4, 'MOTOR'], [6, 'MOTOR'], [20, 'COMPRESOR'], [21, 'HVAC'], [22, 'ELEV']`, con fallback regex `REGLAS_NOMBRE`.
   - En un esquema multi-tenant o recién sembrado donde `tipos_equipo` tenga otros IDs autoincrementales, **toda la inferencia visual y de catálogo de órdenes en Admin se desconfigura**.
3. **Secuestro heurístico en ejecución de actividades (`actividad-card-advanced.tsx:180-280`):**
   - La función `descripcionEsInputEstructurado()` (`líneas 201-249`) replica el mismo anti-patrón que existe en Mobile: escanea palabras clave en el texto de la actividad (`TEMPERATURA`, `HOROMETRO`, `CONTADOR`, `NIVEL DE COMBUSTIBLE`, `CARGA DE BATERIA`) para decidir qué control UI mostrar, ignorando el campo estructural `catalogo_actividades.tipo_control_input`.
   - Por el contrario, `medicion-card-advanced.tsx` (`líneas 1-110`) ya consume limpiamente rangos y unidades heredados o personalizados a nivel de equipo (`rango_catalogo`, `es_personalizado_equipo`).
4. **Higiene y archivos residuales en `apps/admin/src/features/ordenes/api/`:**
   - Existen **5 archivos de respaldo abandonados dentro de `src/`**:
     `catalogos.service.ts.FINAL`, `catalogos.service.ts.RECOVERY`, `catalogos.service.ts.RESTORED`, `catalogos.service.ts.tmp`, `catalogos.service.ts.tmp2`.

---

## 6. Compras, Inventario, Reportes y Dashboard

1. **Compras (`/compras/ordenes/nueva/page.tsx`):**
   - Usa un formateador local `formatCOP` (`es-CO`, `'COP'`) y muestra encabezados literales `'Precio Unitario (COP)'` (`líneas 1143, 1281`). No admite selector ni configuración de divisa.
2. **Dashboard (`/dashboard` y `features/dashboard/components/`):**
   - `commercial-panel.tsx:18-23, 106`: formatea con `Intl.NumberFormat('es-CO', { currency: 'COP' })` y consume directamente la propiedad `data.valorPendienteCOP` del contrato API.
   - `kpi-card.tsx:46-75, 128`: aplica tokens de color Tailwind acoplados a la marca (`text-mekanos-success`, `text-mekanos-primary`) y formatea enteros con `toLocaleString('es-CO')`.
3. **Reportes (`/reportes/page.tsx` y `apps/admin/src/lib/pdf-naming.ts`):**
   - Aunque la tabla `/reportes` es agnóstica en su renderizado y paginación server-side, la nomenclatura del archivo descargable (`buildInformeFilename` en `pdf-naming.ts:18-31`, espejo de `apps/api/src/pdf/pdf-naming.helper.ts`) **traduce obligatoriamente `GENERADOR` y `MOTOR` a `'PLANTA'`** y solo reconoce 4 códigos de equipo (`GENERADOR`, `PLANTA`, `MOTOR`, `BOMBA`) y 5 códigos de servicio (`PREVENTIVO_A`, `PREVENTIVO_B`, `PREVENTIVO_TIPO_A`, `PREVENTIVO_TIPO_B`, `CORRECTIVO`).
4. **Caché y Cliente HTTP (`lib/api/client.ts`, `lib/cache/data-cache.config.ts`, `components/cache-warmup.tsx`):**
   - `client.ts` fija fallback `http://localhost:3000/api` y caché en memoria del JWT de 5 minutos sin contexto multi-tenant.
   - `data-cache.config.ts` define TTLs estáticos y `CacheWarmup` precarga catálogos en segundo plano, útil en mono-tenant pero sin clave de partición por empresa/tenant en React Query si un usuario cambia de empresa o rol.
