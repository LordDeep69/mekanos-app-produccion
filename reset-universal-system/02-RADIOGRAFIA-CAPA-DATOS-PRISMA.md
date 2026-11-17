# 02 · Radiografía de Capa de Datos (PostgreSQL / Prisma / Migraciones / Seeds)

> **Capa Auditada:** `packages/database/prisma/schema.prisma`, `packages/database/prisma/migrations/*`, `packages/database/prisma/seeds/*`, `packages/database/package.json` y utilidades de ID/secuencias.  
> **Estado:** Diagnóstico Forense **AS-IS** — Evidencia verificada línea a línea.

---

## 1. Inventario Cuantitativo del Esquema (`schema.prisma`)

El esquema central en `packages/database/prisma/schema.prisma` (3.387 líneas) define:
- **93 modelos (`model`)** sobre PostgreSQL (`url = env("DATABASE_URL")`, `directUrl = env("DIRECT_URL")`).
- **72 enumeraciones (`enum`)** (`schema.prisma:2350-3141`), varias de ellas cerrando catálogos técnicos/operativos a nivel DDL.
- Un **modelo evolutivo dual** donde conviven tres capas históricas superpuestas: esquema relacional inicial heredado (`equipos_generador`, `equipos_bomba`, `equipos_motor`), capa de parametrización intermedia (`plantillas_parametros`, `equipos.config_parametros`) y metamodelo universal EAM reciente (`catalogo_magnitudes`..`equipos_atributos_filtro`).

### 1.1 Mapa Funcional de los 93 Modelos

| Dominio | Modelos Exactos en `schema.prisma` | Cantidad | Observación Clave |
| :--- | :--- | :---: | :--- |
| **Identidad, Actores y Seguridad** | `personas`, `usuarios`, `roles`, `permisos`, `roles_permisos`, `usuarios_roles`, `empleados`, `clientes`, `sedes_cliente`, `contactos_adicionales`, `firmas_administrativas`, `certificaciones_tecnicas`, `proveedores` | **13** | Sin entidad `organizacion`/`tenant`; dualidad de sedes en `clientes` y `sedes_cliente`; columna `password_plain` en `usuarios:2235`. |
| **Activos Heredados (Tablas Satélite)** | `equipos`, `equipos_generador`, `equipos_bomba`, `equipos_motor`, `tipos_equipo`, `componentes_equipo`, `archivos_equipo`, `historial_estados_equipo`, `lecturas_horometro`, `plantillas_parametros` | **10** | Solo Generadores, Bombas y Motores tienen tabla 1:1 dedicada; `equipos` guarda campos de un solo rubro y cliente (`fecha_inicio_servicio_mekanos`, `estado_pintura`, `horas_actuales`). |
| **Metamodelo Universal EAM (Fase 1)** | `catalogo_magnitudes`, `atributos_tecnicos`, `modulos_tecnicos`, `modulo_atributos`, `tipo_equipo_modulos`, `tipo_equipo_planes`, `modelos_equipo`, `modelos_equipo_bom`, `equipos_atributos_filtro`, `marcas`, `unidades_medida`, `categorias_componente` | **12** | Núcleo sano (Zona 2) añadido aditivamente desde `line 3143` sin retirar ni migrar completamente el legado de 10 tablas arriba. |
| **Catálogos Operativos y Protocolos** | `tipos_servicio`, `catalogo_servicios`, `catalogo_sistemas`, `catalogo_actividades`, `parametros_medicion`, `catalogo_pendientes`, `estados_orden`, `estados_cotizacion`, `motivos_rechazo`, `motivos_ajuste` | **10** | Mezcla `estado_actividad_enum` (16 códigos legacy) con columnas nuevas (`tipo_control_input`, `config_input_json`, `rol_semantico`). |
| **Órdenes de Servicio y Ejecución Campo** | `ordenes_servicio`, `ordenes_equipos`, `ordenes_actividades_plan`, `actividades_ejecutadas`, `mediciones_servicio`, `detalle_servicios_orden`, `componentes_usados`, `evidencias_fotograficas`, `lotes_galeria`, `firmas_digitales`, `gastos_orden`, `historial_estados_orden`, `ordenes_pendientes` | **13** | Soporte sólido para multi-equipo (`ordenes_equipos`), encadenamiento (`id_orden_padre`) y respuesta declarativa (`respuesta_json`). |
| **Contratos y Programación Preventiva** | `contratos_mantenimiento`, `equipos_contrato`, `cronogramas_servicio`, `historial_contrato` | **4** | `equipos_contrato` atado a `criterio_intervalo_enum` (`DIAS \| HORAS \| LO_QUE_OCURRA_PRIMERO`). |
| **Comercial (Cotizaciones y Propuestas)** | `cotizaciones`, `versiones_cotizacion`, `items_cotizacion_servicios`, `items_cotizacion_componentes`, `aprobaciones_cotizacion`, `propuestas_correctivo`, `items_propuesta`, `historial_envios` | **8** | Varias tablas con `@id` manual sin `autoincrement()`. |
| **Inventario WMS, Compras y Remisiones** | `catalogo_componentes`, `tipos_componente`, `ubicaciones_bodega`, `lotes_componentes`, `movimientos_inventario`, `alertas_stock`, `articulos_proveedores`, `historial_costos_compra`, `ordenes_compra`, `ordenes_compra_detalle`, `recepciones_compra`, `devoluciones_proveedor`, `remisiones`, `remisiones_detalle` | **14** | `tipos_componente` usa `aplicabilidad_enum` (`GENERADOR \| BOMBA \| AMBOS`); monedas con `@default("COP")`. |
| **Documental, Notificaciones y Email** | `informes`, `bitacoras`, `bitacoras_informes`, `documentos_generados`, `plantillas_informe`, `cuentas_email`, `historial_emails_enviados`, `notificaciones`, `sequence_counter` | **9** | `cuentas_email` acoplada exclusivamente a Gmail OAuth2 (`gmail_client_id`, `gmail_client_secret`, `gmail_refresh_token`). |
| **TOTAL** | | **93** | |

---

## 2. Hallazgos Críticos de Diseño de Datos (Zona 3)

### 2.1 Triple Almacenamiento Técnico del Activo y Tablas Satélite Cerradas

Al analizar `equipos` (`schema.prisma:752-823`), `tipos_equipo` (`schema.prisma:2103-2151`) y sus tablas asociadas:

1. **Coexistencia de 3 paradigmas incompatibles para atributos técnicos del activo:**
   - **Paradigma 1 (Relacional rígido 1:1):** `equipos_generador` (`908-947`, 38+ columnas), `equipos_bomba` (`827-883`, 54+ columnas) y `equipos_motor` (`951-999`, 48+ columnas).
   - **Paradigma 2 (Intermedio legacy):** `equipos.config_parametros Json?`, `equipos.id_plantilla_parametros Int?` -> `plantillas_parametros` (`2308-2324`), más `equipos.metadata Json?` y `equipos.configuracion_especial String?`.
   - **Paradigma 3 (EAM Universal):** `equipos.id_modelo_equipo Int?`, `equipos.especificaciones Json?`, `equipos.esquema_version Int` y la proyección indexada B-Tree `equipos_atributos_filtro` (`3372-3387`).
2. **Columnas intrusivas de dominio/empresa en `equipos` (`schema.prisma:766-781`):**
   - `fecha_inicio_servicio_mekanos DateTime? @db.Date` (`766`): **Nombre de la empresa Mekanos incrustado directamente en el DDL SQL.**
   - `horas_actuales Decimal?` y `fecha_ultima_lectura_horas DateTime?` (`772-773`): Semántica física rígida de "horas" para todo activo del sistema (aunque mida `CICLOS`, `MANIOBRAS`, `KM` o `M3`).
   - `estado_pintura` / `requiere_pintura` (`774-775`): Atributo cosmético específico de cabinas metálicas promovido a columna de primera clase para todo equipo (carece de sentido para tuberías enterradas, tableros internos o sensores).
   - `intervalo_tipo_a_dias_override`, `intervalo_tipo_a_horas_override`, `intervalo_tipo_b_dias_override`, `intervalo_tipo_b_horas_override` (`777-780`): Modelan solo 2 planes rígidos ("Tipo A" y "Tipo B") heredados de generadores diesel, duplicando la tabla dinámica `tipo_equipo_planes` (`3311-3330`).
3. **`tipos_equipo` (`schema.prisma:2103-2151`) con doble personalidad:**
   - Conserva `categoria categoria_equipo_enum`, `tiene_motor`, `tiene_generador`, `tiene_bomba`, `requiere_horometro`, `permite_mantenimiento_tipo_a/b`, `intervalo_tipo_a/b_*`, `formato_ficha_tecnica` y `formato_mantenimiento_tipo_a/b` **junto a** las nuevas columnas EAM (`unidad_uso`, `etiqueta_contador`, `usa_plantilla_universal`, `bloques_opcionales`, `tipo_equipo_modulos`, `tipo_equipo_planes`).

### 2.2 Enums Rígidos de Vertical, Regionalización y Física

Múltiples `enum` de PostgreSQL impiden generalizar el software fuera de electromecánica clásica o de Colombia sin migraciones DDL:

| Enum / Campo en `schema.prisma` | Valores Cerrados Actuales | Fallo contra Matriz Multi-Activo / Comercial |
| :--- | :--- | :--- |
| `categoria_equipo_enum` (`:2406-2412`) | `ENERGIA, HIDRAULICA, CLIMATIZACION, COMPRESION, OTRO` | No cubre Transporte Vertical (Ascensores/Escaleras), Accesos Automáticos, Seguridad Electrónica ni Infraestructura Civil; obliga al backend a guardar la macro-categoría real en `metadata.macro_categoria`. |
| `aplicabilidad_enum` (`:2350-2354`) usado por `tipos_componente.aplica_a` (`:2085`) | `GENERADOR, BOMBA, AMBOS` | **Bloqueante total en repuestos:** Todo tipo de componente/repuesto solo puede declararse aplicable a `GENERADOR`, `BOMBA` o `AMBOS`. Imposible tipar repuestos nativos de `ASCENSOR`, `PUERTA_ELECTRICA` o `SUBESTACION` usando esta columna. |
| `criterio_intervalo_enum` (`:2468-2472`) | `DIAS, HORAS, LO_QUE_OCURRA_PRIMERO` | Usado por `tipos_equipo`, `equipos` y `equipos_contrato`, mientras `tipo_equipo_planes.criterio_intervalo` (`:3318`) usa `String` libre. Un contrato para ascensores (por `CICLOS`) o flotas (`KM`) no tiene valor de criterio apropiado en este enum. |
| `tipo_bomba_enum`, `aplicacion_bomba_enum`, `tipo_motor_enum`, `tipo_combustible_enum`, `tipo_arranque_enum`, `numero_fases_enum`, `clase_aislamiento_enum` | Enums rígidos de motores y bombas (`:2356, 2460, 2681, 2778, 2785, 2818, 2939`) | Acoplados a las 3 tablas satélite; duplican opciones configurables que ya existen como atributos `SELECTOR` en `atributos_tecnicos`. |
| `estado_actividad_enum` (`:2482-2499`) | `B, R, M, I, C, LI, A, L, NA, LA, S, NT, BA, F, RN, NF` | 16 códigos de abreviaturas crípticas para resultados de inspección clásica. Aunque `catalogo_actividades` añadió `tipo_control_input` y `actividades_ejecutadas` añadió `respuesta_json`, la columna `estado` sigue restringida a este enum. |
| `cargo_empleado_enum` (`:2374-2391`) & `tipo_identificacion_enum` (`:2916-2924`) | Cargos rígidos colombianos (`TECNICO_SENIOR`, `AUXILIAR_TECNICO`, etc.); docs `CC, NIT, CE, PA, TI, RC, DNI` | Dificulta parametrizar cargos por empresa compradora y restringe documentos fiscales internacionales (RUT, RFC, EIN, NIF, RUC, CNPJ). |
| Defaults Geo/Moneda (`:226, 1796-1798, 2043-2044, 3080, 3110`) | `CARTAGENA`, `BOLÍVAR`, `COLOMBIA` en `personas` y `sedes_cliente`; `COP` en `catalogo_componentes`, `articulos_proveedores`, `historial_costos_compra` | Inserta geografía de Cartagena y moneda peso colombiano por defecto en cada registro sin especificar. |

### 2.3 25 Tablas sin `SERIAL` / `autoincrement()` + Condición de Carrera en `getNextTableId()`

Una inspección directa de todas las claves primarias de `schema.prisma` (`@id` sin `@default(autoincrement())`) identifica **25 tablas** con asignación manual de PK:
- `certificaciones_tecnicas` (`:331`), `contactos_adicionales` (`:476`), `devoluciones_proveedor` (`:655`), `equipos_bomba` (`:828`), `equipos_contrato` (`:887`), `equipos_generador` (`:909`), `equipos_motor` (`:952`), `estados_cotizacion` (`:1004`), `gastos_orden` (`:1147`), `historial_contrato` (`:1181`), `historial_envios` (`:1197`), `items_cotizacion_componentes` (`:1305`), `items_cotizacion_servicios` (`:1334`), `items_propuesta` (`:1359`), `motivos_rechazo` (`:1474`), `notificaciones` (`:1524`), `permisos` (`:1759`), `plantillas_informe` (`:1824`), `propuestas_correctivo` (`:1840`), `remisiones` (`:1950`), `remisiones_detalle` (`:1979`), `roles` (`:1998`), `tipos_componente` (`:2078`), `versiones_cotizacion` (`:2260`), `plantillas_parametros` (`:2309`).

El helper `getNextTableId()` en `apps/api/src/common/utils/next-id.helper.ts:5-14` ejecuta:
```sql
SELECT COALESCE(MAX("${pkColumn}"), 0) + 1 AS next_id FROM "${tableName}"
```
- **Riesgo probado:** No usa secuencia PostgreSQL (`nextval`), ni `LOCK TABLE`, ni `sequence_counter` con `FOR UPDATE` (a diferencia de `ordenes-compra` o `inventario` que sí bloquean `sequence_counter`). Dos inserciones concurrentes en `notificaciones`, `gastos_orden`, `remisiones`, `propuestas_correctivo` o `items_cotizacion_*` calculan el mismo `MAX + 1` y colisionan con error `P2002` de clave única.

### 2.4 Contradicción Masiva `onDelete: SetNull` sobre FKs `NOT NULL`

El análisis de integridad referencial detectó **85 relaciones con `onDelete: SetNull`** en `schema.prisma`, gran parte de ellas declaradas sobre columnas **obligatorias (`Int` no nulables)** como:
- `actividades_ejecutadas.id_orden_servicio` (`:36`), `evidencias_fotograficas.id_orden_servicio` (`:1077`), `mediciones_servicio.id_orden_servicio` y `id_parametro_medicion` (`:1450-1451`), `ordenes_actividades_plan.id_actividad_catalogo` y `id_orden_servicio` (`:1555-1556`), `ordenes_equipos.id_equipo` y `id_orden_servicio` (`:2299-2300`), `ordenes_servicio.id_cliente` / `id_equipo` / `id_estado_actual` (`:1677-1679`), `equipos.id_cliente` y `id_tipo_equipo` (`:799, 801`), `clientes.id_persona` (`:387`), `empleados.id_persona` (`:737`), `roles_permisos` (`:2027-2028`), `usuarios_roles` (`:2249`), y las 3 tablas satélite (`equipos_bomba:879`, `equipos_generador:944`, `equipos_motor:996`).
- **Consecuencia:** Desajuste entre el modelado Prisma y la semántica real PostgreSQL (`ON DELETE SET NULL` sobre columna `NOT NULL` falla en runtime al intentar eliminar el padre en cascada).

### 2.5 Desajuste de Longitud `VarChar(10)` vs `VarChar(20)` en Unidades EAM

Comparación directa entre la migración `20261031_eam_universal_fase1.sql:16,50,202,212` y `schema.prisma`:
- `unidades_medida.codigo` (`:3163`), `tipos_equipo.unidad_uso` (`:2140`) y `atributos_tecnicos.unidad_defecto_codigo` (`:3232`) soportan **`VarChar(20)`**.
- Sin embargo, **`parametros_medicion.unidad_codigo` (`:1750`)** y **`equipos_atributos_filtro.unidad_base_codigo` (`:3378`)** permanecen en **`VarChar(10)`**.
- **Fallo latente:** Cualquier unidad de medida o código de magnitud de 11 a 20 caracteres (válida en `unidades_medida` y `tipos_equipo`, ej. `MANIOBRAS_MT`) provocará error de truncamiento/longitud (`value too long for type character varying(10)`) al asignarse a parámetros de medición o proyectarse en filtros B-Tree.

### 2.6 Gobierno de Migraciones, Seeds y Scripts Operativos

1. **Historial de Migraciones NO estandarizado para `prisma migrate deploy`:**
   En `packages/database/prisma/migrations/` coexisten carpetas estándar (`20250606_cuentas_email/migration.sql`, `20261110_eam_fase6_motor_declarativo_inputs/migration.sql`), archivos `.sql` sueltos en raíz (`20260131_*.sql`, `20260202_*.sql`, `20260923_*.sql`, `20260929_*.sql`, `20261019_*.sql`, `20261031_eam_universal_fase1.sql`, `20261110_eam_fase59_banco_universal_protocolos.sql`, `fix_correctivo_labels.sql`) y una carpeta `manual/` (`01_ordenes_equipos.sql`, `20260105_*`, `20260106_*`). No existe cadena única reproducible de migración desde cero para desplegar a un cliente nuevo.
2. **Seeds atados a datos demo de Mekanos e IDs físicos fijos:**
   - `packages/database/prisma/seed.ts:15-192` siembra `'Admin Mekanos'`, `'admin@mekanos.com'`, `'CARTAGENA / BOLÍVAR / COLOMBIA'`, `'GEN'`, `'MOT'`, `'BOM'` y `'EQ-TEST-001'`.
   - `packages/database/prisma/seeds/seed-eam-universal.ts:90,802,856-988` fija **`KVA` con `factor_a: 0.8` universal** (asumiendo factor de potencia fijo 0.8 de grupos electrógenos para conversión física global) y limpia/siembra `tipo_equipo_planes` y `modelos_equipo` apuntando a IDs literales `in: [1, 2, 3, 4, 5, 6, 20]`.
   - `packages/database/prisma/seeds/backfill-equipos-eam.ts:33-88` contiene remediación puntual para IDs específicos de la BD original de Mekanos (`[32, 35, ..., 104]`, `id_equipo: 214`).
3. **Hook destructivo en `pregenerate` y mezcla de scripts en paquete core:**
   - `packages/database/scripts/pregenerate.js:1-13` mata cualquier proceso escuchando en el puerto `3000` en Windows al ejecutar `db:generate`.
   - La raíz de `packages/database/` acumula **>85 scripts sueltos** de diagnóstico y pruebas mezclados con el paquete compartible `@mekanos/database`.

---

## 3. Veredicto de Evaluación contra Matriz Multi-Activo (Capa de Datos)

| Aspecto Evaluado en BD | Estado AS-IS | Veredicto Matriz V1–V8 |
| :--- | :--- | :--- |
| **Metamodelo de Atributos y Módulos** (`catalogo_magnitudes`..`modelos_equipo_bom`) | Diseño relacional + JSONB + EAV B-Tree sólido para cualquier vertical. | **APROBADO (Zona 2)** con salvedad `VarChar(10)` en `equipos_atributos_filtro` / `parametros_medicion`. |
| **Motor Declarativo de Actividades** (`catalogo_actividades.tipo_control_input`, `config_input_json`, `actividades_ejecutadas.respuesta_json`) | Permite checklists tipados multi-vertical más allá de `B/R/M`. | **PARCIAL:** `actividades_ejecutadas.estado` sigue tipado a `estado_actividad_enum`. |
| **Representación de Activos (`equipos` + `tipos_equipo` + satélites)** | Tablas satélite cerradas (`generador/bomba/motor`), columnas `horas_actuales`, `estado_pintura`, `fecha_inicio_servicio_mekanos`, `categoria_equipo_enum` y planes A/B heredados. | **REPRUEBA (Zona 3):** Carga peso semántico de Mekanos y de motores/generadores sobre todos los activos. |
| **Repuestos Aplicables (`tipos_componente`)** | `aplica_a aplicabilidad_enum` (`GENERADOR \| BOMBA \| AMBOS`). | **REPRUEBA (Zona 3):** Impide modelar repuestos nativos de Ascensores, HVAC, Puertas, Subestaciones o Tuberías. |
| **Despliegue Limpio a Compradores** | Migraciones fragmentadas, seeds con IDs fijos/Mekanos, defaults Cartagena/COP, 25 PKs sin autoincrement. | **REPRUEBA (Zona 3):** Imposible aprovisionar instancias limpias automáticas para empresas nuevas. |
