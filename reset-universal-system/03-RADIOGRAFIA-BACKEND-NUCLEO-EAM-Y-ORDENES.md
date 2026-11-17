# 03 · Radiografía de Backend Núcleo (API NestJS: EAM, Equipos, Órdenes y Sync)

> **Capa Auditada:** Módulos núcleo de `apps/api/src` — `catalogos-eam`, `equipos`, `clientes`, `tipos-servicio`, `catalogo-actividades`, `catalogo-sistemas`, `config-parametros`, `ordenes` y `sync`.  
> **Estado:** Diagnóstico Forense **AS-IS** — Evidencia verificada línea a línea.

---

## 1. Anatomía del Metamodelo EAM (`catalogos-eam` y `UomConversionService`)

### 1.1 Qué implementa como Zona 2 (Base Sana)

`CatalogosEamService` (`apps/api/src/catalogos-eam/catalogos-eam.service.ts`, 2.372 líneas) orquesta el CRUD de magnitudes físicas, unidades de medida afines (`y = a*x + b`), atributos técnicos, módulos funcionales, arquetipos (`tipos_equipo`), planes de servicio por arquetipo (`tipo_equipo_planes`), modelos OEM (`modelos_equipo`) y kits BOM (`modelos_equipo_bom`), incluyendo `getArquetipoEsquema()` (`:1814-1947`) que compila el esquema JSON unificado para renderers dinámicos.

### 1.2 Fallos Críticos de Acoplamiento y Sincronía en `catalogos-eam` (Zona 3)

| Defecto | Ubicación Exacta | Mecanismo del Fallo | Impacto Comercial / Multi-Activo |
| :--- | :--- | :--- | :--- |
| **Pares Canónicos e IDs Físicos Hardcodeados** | `catalogos-eam.service.ts:54-66` | `PARES_CANONICOS` mapea `{ 1<->3, 2<->5, 6<->4 }` y `ALIAS_SECUNDARIOS_OCULTOS = new Set([3, 5, 4])` para esconder duplicados históricos de la BD original. | En cualquier BD nueva donde los IDs `3`, `4` o `5` correspondan a arquetipos distintos (ej. `3 = Ascensor`, `4 = HVAC`), el servicio los oculta del listado o cruza sus módulos/planes con los IDs `1`, `2` o `6`. |
| **Exclusión de Arquetipos Legacy en Auto-Sync de Subsistemas** | `catalogos-eam.service.ts:172-194` y `get-tipos-servicio-detalle-completo.handler.ts:6-38,105` | `LEGACY_PROTECTED_CODES = {'GEN','GENERADOR','BOM','BOMBA','MOT','MOTOR','COMP','COMPRESOR'}` evita sincronizar sus `modulos_tecnicos` hacia `catalogo_sistemas`, además de usar `expandEquipCodes()` con alias rígidos. | Bifurca permanentemente el comportamiento entre activos "protegidos" (legacy) y activos nuevos (universales), perpetuando reglas especiales por código. |
| **Degradación de Macro-Categoría al Persistir** | `catalogos-eam.service.ts:92-135, 1687-1717` | `mapearCategoriaDbEnum()` reduce cualquier macro-categoría nueva a 5 valores SQL (`ENERGIA`, `HIDRAULICA`, `CLIMATIZACION`, `COMPRESION`, `OTRO`) y guarda el texto real dentro de `tipos_equipo.metadata.macro_categoria`. | Filtros o reportes SQL directos sobre `tipos_equipo.categoria` colapsan verticales heterogéneas (Ascensores, Escaleras, Puertas, Subestaciones) bajo `OTRO` o `ENERGIA`. |
| **Caché UoM Estático Desincronizado en Caliente** | `uom-conversion.service.ts:57, 515-528` vs `catalogos-eam.service.ts:773-840, 909-993` | `CatalogosEamService.convertirUom()` consulta PostgreSQL en vivo, pero `UomConversionService` mantiene el diccionario estático `UNIDADES_CANONICAS` cargado en arranque (`onModuleInit`). `createUnidad()` y `updateUnidad()` NO refrescan `UomConversionService`. | Al crear una unidad nueva desde Admin EAM Studio y proyectar atributos en `EquipoFilterProjectionService.proyectarFiltros()` (`:205`), `uomService.convertirABase()` lanza error silencioso en el `try/catch` (`:208`) y guarda el valor sin normalizar hasta reiniciar la API. |

---

## 2. Núcleo de Gestión de Activos (`equipos` y `clientes`)

### 2.1 Doble Ruta Incoherente de Creación y Mantenimiento

En `EquiposController` (`apps/api/src/equipos/equipos.controller.ts:55-155`) coexisten dos rutas paralelas sin consolidación:
1. **`POST /api/equipos` -> `CreateEquipoHandler` (`equipos/commands/create-equipo.handler.ts:17-39`):** Usa CQRS + `PrismaEquipoRepository` y persiste **únicamente columnas planas** de `equipos` (`codigo_equipo`, `id_cliente`, `id_tipo_equipo`, `ubicacion_texto`, `id_sede`, `nombre_equipo`, `numero_serie_equipo`, `estado_equipo`, `criticidad`), omitiendo `especificaciones` JSONB, `id_modelo_equipo`, proyección B-Tree, BOM OEM y satélites.
2. **`POST /api/equipos/gestion-completa` -> `EquiposGestionService.crearEquipoCompleto()` (`equipos-gestion.service.ts:649-1080`):** Archivo monolítico de **3.060 líneas** que sí ejecuta el flujo completo: Dual-Write hacia satélites + JSONB + B-Tree + herencia BOM.

### 2.2 Acoplamiento Tóxico dentro de `EquiposGestionService`, `EquipoSpecsReader` y `ClientesService`

1. **Dual-Write y Defaults Ficticios (`equipos-gestion.service.ts:831-1073`):**
   - Al guardar un equipo con `tipoNorm` igual a `GENERADOR`/`GEN` o `BOMBA`/`BOM`, o con `datosMotor`, el backend rellena columnas obligatorias faltantes con **datos técnicos inventados** (`velocidad_nominal_rpm: 1800`, `voltaje_arranque_vdc: 12`, `tipo_aceite: '15W40'`, `tipo_refrigerante: '50/50'`, `clase_aislamiento: 'H'`, `grado_proteccion_ip: 'IP23'`, `'220/127V'`).
   - Los parsers defensivos (`:55-125`) fuerzan valores por defecto (`parseNumeroFasesSeguro` devuelve `TRIFASICO` por omisión; `parseTipoCombustibleSeguro` devuelve `DIESEL`).
2. **Facetas de Búsqueda Congeladas en 3 Satélites Legacy (`equipment-facets.config.ts:9-150` y `equipos-gestion.service.ts:2985-3059`):**
   - Aunque la tabla B-Tree `equipos_atributos_filtro` existe y proyecta atributos dinámicos de `especificaciones.modulos` (`equipo-filter-projection.service.ts:150-250`), el endpoint de facetas **`obtenerFacetasDinamicas()` consulta exclusivamente `equipos_motor`, `equipos_generador` y `equipos_bomba`**.
   - Asimismo, `listarEquiposCompletos()` (`equipos-gestion.service.ts:1223-1242`) mantiene ramas explícitas por string (`GENERADOR`/`GEN`, `BOMBA`/`BOM`, `COMPRESOR`/`COMP`, `MOTOR`/`MOT`).
   - Resultado: Cualquier activo de Ascensores (V3), Puertas (V5), Subestaciones (V6), HVAC (V7) o Tuberías (V8) **no aparece en las facetas dinámicas de marca/capacidad**.
3. **Heurísticas por String y Parche de Datos Históricos en `EquipoSpecsReader` (`equipo-specs.reader.ts:11-150`):**
   - `CategoriaCanonicaEquipo` sigue cerrada a `'GENERADOR' | 'BOMBA' | 'MOTOR' | 'COMPRESOR' | 'HVAC' | 'ELEVADOR' | 'OTRO'`.
   - `getCategoriaCanonica()` adivina por `.includes('GENERADOR')`, `.includes('PLANTA')`, `.includes('BOMBA')`, etc., e incrusta una regla específica para sanear datos viejos de Mekanos (`:103-111`: 14 bombas registradas bajo tipo generador identificadas por `EQ-BOMBA-`/`BOMBA-`).
4. **Caché de `ClientesService` acoplado a "Plantas y Bombas" (`clientes.service.ts:65-118`):**
   - El índice en memoria `searchIndexCache` calcula exclusivamente `tiene_plantas`, `tiene_bombas`, `total_equipos_plantas`, `total_equipos_bombas` mediante `esEquipoPlanta()` / `esEquipoBomba()`. Ignora por completo el conteo o presencia de cualquier otra vertical de mantenimiento.

---

## 3. Protocolos y Catálogos Operativos (`tipos-servicio`, `catalogo-actividades`, `catalogo-sistemas`, `catalogo-servicios`)

1. **Duplicación Estructural de Controladores y Servicios Muertos:**
   - En `catalogo-actividades`, `catalogo-sistemas` y `catalogo-servicios` coexisten implementaciones paralelas: un par simple en raíz (`catalogo-actividades.controller.ts` + `.service.ts`) y la arquitectura activa CQRS en `presentation/` + `application/` (registrada en `*.module.ts`). El controlador raíz muerto declara `@UseGuards(JwtAuthGuard, RolesGuard)`, mientras los activos en `presentation/` varían: `CatalogoActividadesController` sí tiene `JwtAuthGuard`, pero **`CatalogoServiciosController` (`catalogo-servicios.module.ts:37` / `presentation/catalogo-servicios.controller.ts:23-24`) carece totalmente de `JwtAuthGuard`**.
2. **Propagación en Cascada con Fallback por Nombre (`prisma-catalogo-actividades.repository.ts:488-532`):**
   - Además de propagar por `id_plantilla_origen`, `propagarCambios()` incluye `propagarLegacyPorNombre` buscando actividades con `id_plantilla_origen: null` que coincidan en `tipo_actividad` y `descripcion_actividad` exacto (case-insensitive). Si dos verticales tienen una actividad homónima (ej. *"Verificar apriete de borneras"* en Subestación vs Tablero de Bomba), editar la plantilla del banco altera accidentalmente actividades legacy no vinculadas formalmente.

---

## 4. Máquina de Estados y Ciclo de Órdenes (`ordenes`)

### 4.1 Arquitectura y FSM (`workflow-estados.ts`)

- **Fortaleza (Zona 2):** `workflow-estados.ts:31-150` define una máquina de estados clara con 8 estados (`BORRADOR`, `APROBADA`, `PROGRAMADA`, `ASIGNADA`, `EN_PROCESO`, `EN_ESPERA_REPUESTO`, `COMPLETADA`, `CANCELADA`), guarda de idempotencia cuando `nuevoEstado === estadoActual` (`:109-111`) y validación de campos requeridos por transición (`VALIDACIONES_POR_ESTADO`).
- **Encadenamiento Fractal de Casos:** `PrismaOrdenServicioRepository.saveWithEquiposOptimizado()` (`:611-880`, en un archivo de 2.590 líneas) normaliza `id_orden_padre` al expediente raíz, numera `numero_visita_caso`, vincula `ordenes_equipos` en secuencia, hereda `ordenes_pendientes` abiertas al hilo y siembra automáticamente `ordenes_actividades_plan` desde `catalogo_actividades` según `id_tipo_servicio`.

### 4.2 Grietas Detectadas en el Módulo de Órdenes (Zona 3)

1. **Controlador Monolítico de 4.735 Líneas con Rutas Desprotegidas (`ordenes.controller.ts:98-188`):**
   - No posee `@UseGuards(JwtAuthGuard)` a nivel de clase; lo aplica método por método. Al menos tres endpoints iniciales (`GET :id/emails/historial`, `GET :id/progreso-registro`, `POST :id/heartbeat`) quedaron sin guard de autenticación JWT, y ninguna ruta aplica `@Roles(...)` activo.
2. **IDs Mágicos y Race Condition en Creación (`create-orden.handler.ts:47-98` y `prisma-orden-servicio.repository.ts:2506-2530`):**
   - `CreateOrdenHandler` usa fallbacks literales `idEstadoInicial = 3` (`PROGRAMADA`) y `1` (`ASIGNADA`) si `findEstadoByCodigo` retorna vacío, y fija `requiere_firma_cliente: true` sin consultar configuración del tipo de servicio ni de la empresa.
   - `getUltimoCorrelativoMes()` calcula el próximo `OS-YYYYMM-NNNN` consultando `findFirst` ordenado descendente sin bloqueo transaccional ni `sequence_counter` `FOR UPDATE`, exponiendo colisiones bajo creación concurrente.
   - `autoSembrarPlanActividades()` (`:850-879`) envuelve toda falla en `try/catch` silencioso; además, cuando `ordenes_equipos` tiene múltiples equipos **de tipos distintos** dentro de una misma orden, `ordenes_actividades_plan` siembra actividades únicamente usando el `id_tipo_servicio` de la cabecera (no discrimina plan por equipo individual cuando la orden mezcla verticales distintas).

---

## 5. Motor de Finalización de Órdenes (`FinalizacionOrdenService` — 3.503 líneas)

El flujo orquestado en `finalizarOrden()` (`apps/api/src/ordenes/services/finalizacion-orden.service.ts:351-1033`) concentra la mayor complejidad operativa del backend y exhibe **5 defectos críticos**:

1. **Destrucción Anticipada (Paso 1.5) + Rollback No-Transaccional (`:531-640, 1020-1022, 2734-2774`):**
   - Antes de subir fotos a Cloudinary, generar PDF con Puppeteer o subir a R2, el Paso 1.5 ejecuta `deleteMany()` definitivo en BD sobre `evidencias_fotograficas`, `firmas_digitales`, `actividades_ejecutadas`, `mediciones_servicio` y `ordenes_pendientes`.
   - Todo el flujo corre fuera de una `$transaction` unificada. Si falla Puppeteer o R2 en el Paso 4/5 (por ejemplo, durante una **re-subida autorizada** de orden ya `COMPLETADA`), `rollback()` **únicamente elimina los IDs recién insertados**, dejando permanentemente destruidos los datos históricos anteriores borrados en el Paso 1.5.
2. **Lectura de Campos Prisma Inexistentes en `generarPDFOrden()` (`:2176-2181`):**
   - Consulta `cliente?.persona?.numero_documento` y `cliente.persona.tipo_documento` — **inexistentes en `schema.prisma:1775-1822`**, donde los campos reales son `numero_identificacion` y `tipo_identificacion`. Resultado: `clienteNit` siempre queda `undefined`.
   - Consulta `orden.sedes_cliente?.ciudad` — **inexistente en `schema.prisma:2043`**, donde la columna real es `ciudad_sede`. Resultado: en PDFs con sede asignada, omite la ciudad de la sede y cae al fallback de persona.
3. **Selección Legacy de Plantilla PDF (`determinarTipoInforme()` `:1528-1591`):**
   - Pese a existir `UNIVERSAL_EAM`, el dispatcher mantiene bifurcaciones hardcodeadas por nombre/código: `'bomba' | 'BOM'` -> `'BOMBA_A'`, `'generador' | 'electrogeno' | 'planta' | 'GEN'` -> `'GENERADOR_A'` / `'GENERADOR_B'`, dejando el formato gobernado por código string en vez de propiedad declarativa en `tipos_equipo` o `tipos_servicio`.
4. **Heurísticas Frágiles en Sincronización de Contadores (`:2990-3012, 3157-3256`):**
   - Cuando el contador de desgaste no viene identificado explícitamente por `rol_semantico = 'LECTURA_CONTADOR_ACTIVO'` o `tipo_control_input = 'LECTURA_CONTADOR'`, el fallback sobre mediciones (`esParametroHorometro()`) busca palabras clave cerradas (`horometro`, `ciclo`, `odometr`, `kilometr`, `contador`, `hora + trabaj/...`). Una medición asociada a unidad personalizada (ej. `"Maniobras de Conmutación MT"` con unidad `MANIOBRAS`) falla la detección heurística y nunca actualiza `equipos.horas_actuales` ni `lecturas_horometro`.
5. **Reasignación Silenciosa de Técnico en Finalización (`:504-519`):**
   - Si un técnico no-admin finaliza una orden asignada a otro técnico, el servicio reasigna automáticamente `id_tecnico_asignado = user.idEmpleado` sin validar rol de supervisor ni política configurable.

---

## 6. Sincronización Offline-First (`sync`)

### 6.1 Vulnerabilidades IDOR Verificadas en `SyncController` (`sync.controller.ts:69-245`)

A diferencia de `GET /sync/permiso-edicion/:ordenId` (`:209-219`), que sí inyecta `@CurrentUser() user` y valida propiedad en `syncService.getPermisoEdicion()`, **los otros 4 endpoints principales no validan identidad del solicitante contra el recurso**:

| Endpoint | Archivo y Líneas | Fallo de Autorización |
| :--- | :--- | :--- |
| `POST /api/sync/ordenes` | `sync.controller.ts:69-72` | Confía ciegamente en `dto.tecnicoId` enviado en el body JSON; no verifica `user.idEmpleado`. |
| `GET /api/sync/download/:tecnicoId` | `sync.controller.ts:124-137` | Cualquier usuario autenticado puede descargar órdenes, clientes, sedes y PDFs de cualquier `tecnicoId` cambiando el parámetro de ruta. |
| `GET /api/sync/compare/:tecnicoId` | `sync.controller.ts:178-184` | Expone el resumen completo de hasta 500 órdenes de cualquier técnico sin verificar pertenencia ni rol supervisor/admin. |
| `GET /api/sync/orden/:ordenId` | `sync.controller.ts:241-245` | Descarga la orden completa por ID numérico sin comprobar que el usuario autenticado esté asignado a ella o sea supervisor/admin. |

### 6.2 Contratos de Sincronización y Sesgos Regionales (`sync.service.ts`)

1. **Conversión Horaria Hardcodeada a Colombia UTC-5 (`sync.service.ts:1089-1108, 1750-1767`):**
   `let horaCol = h - 5;` convierte las horas de entrada y salida restando 5 horas literales al UTC, haciendo incorrectas las horas mostradas en móvil para cualquier empresa compradora fuera de UTC-5.
2. **Asimetría de Catálogos entre Download Completo vs Delta (`sync.service.ts:609-613, 1206-1210` vs `1261-1265`):**
   - Cuando `includeCatalogs = true`, descarga `catalogo_actividades` filtrando `id_tipo_servicio: { not: null }`.
   - En la rama `else` (`includeCatalogs = false`, delta con órdenes modificadas), consulta `catalogo_actividades` **sin filtrar `id_tipo_servicio: { not: null }`**, introduciendo comportamiento distinto entre descarga inicial y descarga delta.
3. **Ausencia de Esquema EAM Completo en Payload Móvil (`buildConfigParametrosConMetrologia` `:1563-1588`):**
   - La descarga envía `config_parametros` + un bloque `_metrologia` (`unidadUso`, `etiquetaContador`, `requiereHorometro`, `lecturaActual`), pero **no descarga `especificaciones` JSONB ni el esquema de módulos/atributos (`atributos_tecnicos`, `modulos_tecnicos`, `modelos_equipo`)**. Esto impide que la app móvil consulte o actualice especificaciones técnicas modulares de la ficha del activo en campo offline.
4. **Control de Conflictos basado en Timestamp del Cliente (`sync.service.ts:142-154`):**
   Usa `fecha_modificacion` + comparación con `dto.lastModified` (timestamp generado por el reloj del dispositivo móvil, susceptible a desfase horario) y `dto.version`.

---

## 7. Veredicto de Evaluación del Backend Núcleo

- **Avance Real (Zona 2):** El núcleo EAM (`catalogos-eam`, `uom-conversion`, `equipo-filter-projection`, `workflow-estados`, `observaciones-cierre-audit`, `parametros-override.helper` y el encadenamiento de casos) demuestra ingeniería avanzada sobre los conceptos correctos.
- **Bloqueos Críticos (Zona 3):** La coexistencia sin retiro del legado (`PARES_CANONICOS` por ID, `LEGACY_PROTECTED_CODES`, `equipos_generador`/`bomba`/`motor`, `obtenerFacetasDinamicas` cerrado a satélites, `determinarTipoInforme` hardcodeado, caché `ClientesService` plantas/bombas), sumada a **IDOR en Sync**, **Paso 1.5 destructivo sin rollback real en Finalización**, **errores silenciosos de Prisma (`numero_documento`, `sedes_cliente.ciudad`)**, **hardcode UTC-5** y **desincronización UoM en memoria**, impide declarar el backend listo para comercialización multi-vertical sin saneamiento previo.

> **Fin del Gate 2.** Pendiente revisión y validación con el líder antes de avanzar al **Gate 3**:
> - `04-RADIOGRAFIA-MODULOS-PERIFERICOS-API.md` (Inventario/WMS, Compras, Remisiones, Cotizaciones, Propuestas, Contratos, Cronogramas, Agenda, Bitácoras, Notificaciones, Storage y Email).
> - `05-RADIOGRAFIA-PORTAL-ADMIN-STUDIO.md` (Next.js Admin Portal, EAM Studio, Formularios Equipos/Órdenes/Clientes, Heurísticas UI y UX Comercial).
