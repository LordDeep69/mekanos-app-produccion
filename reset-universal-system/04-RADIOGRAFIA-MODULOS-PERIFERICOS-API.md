# 04 — Radiografía de Módulos Periféricos API (NestJS: Logística, Comercial, Programación, Crons, Storage y Telemetría)

> **Alcance:** Diagnóstico forense **AS-IS** de los módulos periféricos de `apps/api/src/` que rodean al núcleo EAM y Órdenes de Servicio: Inventario/WMS, Compras/Sourcing, Remisiones, Cotizaciones y Propuestas Correctivo, Contratos y Cronogramas, Agenda, Bitácoras, Notificaciones y Crons, Dashboard, Storage (R2 / Cloudinary), Email y Facades transversales.  
> **Regla de rigor:** Cada ruta, clase, método, línea y hallazgo citado aquí ha sido observado directamente sobre el código fuente o salida de herramienta. **Cero suposiciones y cero prescripciones de solución.**

---

## 1. Mapa de Salud Periférica (Síntesis Ejecutiva)

Mientras el núcleo operativo (`ordenes`, `equipos`, `informes`) evolucionó hacia `UNIVERSAL_EAM`, los módulos periféricos del backend quedaron en **capas heterogéneas**: algunos con ingeniería transaccional avanzada (Inventario/WMS, Compras), otros **duplicados entre arquitectura CQRS, Facades y CRUDs planos**, varios con **bugs de ejecución confirmados en jobs automáticos**, y una fuerte incrustación de supuestos locales (**Colombia IVA 19%, COP, `America/Bogota`, marca Mekanos y división binaria `PLANTAS | BOMBAS`**).

| Dominio / Módulo | Arquitectura AS-IS | Riesgo / Falla Crítica Observada | Bloqueo para EAM Comercial White-Label |
| :--- | :--- | :--- | :--- |
| **Inventario / WMS** (`inventario/`) | Transaccional (`$transaction`, `Decimal`, lotes + Kardex + CPP) | `sanitizarNombreResponsable` usa regex `/admin(\s+mekanos)?/i`; SQL raw `sequence_counter` sin parametrización en `LOT` | Hardcodes menores de fallback (`idUbicacion || 1`, `realizado_por || 1`); formato lote fijo `LOT-YYYY-XXXX`. |
| **Compras / OC** (`ordenes-compra/`) | DDD/Prisma Repository (`getSourcingProveedor`, `getResumenKpis`) | `getResumenKpis()` multiplica **hardcoded `* 1.19; // IVA 19%`** (`prisma-ordenes-compra.repository.ts:677`) | Tasa impositiva fija de Colombia en analítica financiera. |
| **Remisiones** (`remisiones/`) | Repositorio Prisma + `getNextTableId` + descuento WMS | `numero_remision` usa `REM-${Date.now()}` (no usa `NumeracionService`); fuerza `tipo_destino: 'TECNICO'` y `'VALE_SALIDA_TECNICO'` | Incapacidad de remitir a cliente/obra/bodega externa sin romper contrato; riesgo de colisión en alta concurrencia por timestamp. |
| **Cotizaciones** (`cotizaciones/` vs `cotizaciones-facade`) | **Doble motor** (CQRS en `cotizaciones/` + `CotizacionesFacadeService` muerto/huérfano) | En `CotizacionesFacadeService` hay defaults incompatibles vs CQRS (`garantía 6 vs 3 meses`, `IVA 19% vs 0%`, HTML de Cartagena/Mekanos); `save()` y `CreateCotizacionHandler` hardcodean `id_estado: 1 // BORRADOR` | Sin configuración multi-tenant de impuestos/garantías/términos ni trazabilidad de moneda configurable. |
| **Propuestas Correctivo** (`cotizaciones/propuestas-correctivo` vs `propuestas-correctivo/`) | **Doble módulo en disco** (solo el de `cotizaciones/` está montado en `app.module.ts`) | El módulo huérfano `apps/api/src/propuestas-correctivo/` hace `create({ data: createDto as any })` **sin `getNextTableId`** sobre PK sin autoincrement | Código muerto engañoso y vector potencial de fallo PK si se re-exporta. |
| **Contratos y Cronogramas** (`contratos-mantenimiento/`, `cronogramas-servicio/` vs `programacion-facade`) | **Doble motor** (2 CRUDs planos con `dto as any` + `ProgramacionFacadeService` sin registrar en módulos) | `ContratosMantenimientoService` y `CronogramasServicioService` pasan `createDto as any` directo a Prisma (mass-assignment bajo `whitelist: false`) | Sin interfaz Admin conectada y sin aislamiento tenant. |
| **Crónjobs** (`notificaciones/tareas-programadas.service.ts`) | `@Cron` de NestJS (`ScheduleModule`) con **6 trabajos programados** | **2 bugs confirmados:** Job 4 instancia `new ProgramacionFacadeService(this.prisma, null as any)` (crash seguro en línea 594); Job 3 usa `id_asesor_responsable` (`id_empleado`) como `id_usuario` | Todos los 6 crons fijan `timeZone: 'America/Bogota'`; alertas contractuales rotas y auto-generación de órdenes rota. |
| **Agenda** (`agenda/`) | Servicio directo sobre Prisma | `getServiciosHoy()` usa `Date.setHours(0,0,0,0)` según hora local del servidor | Sin soporte de zona horaria por empresa/sede. |
| **Bitácoras** (`bitacoras/`) | Servicio directo con SQL raw (`$queryRawUnsafe`) | `previewInformesPorSede()` interpola `categoria`, `tipoServicio`, `fechaInicio` y `fechaFin` en SQL string (`'${categoria}'::categoria_equipo_enum`) | Acoplamiento rígido al enum `categoria_equipo_enum`, modelo dual `es_cliente_principal` y superficie de riesgo en SQL raw. |
| **Dashboard** (`dashboard/`) | Servicio directo con caché en memoria | Singletons globales de módulo (`let dashboardCache`, `let estadosCache`) sin clave por usuario/tenant; query `notificaciones` (`leida: false`) sin filtrar por usuario | Fuga potencial de métricas y notificaciones entre usuarios/empresas al activar multi-tenancy. |
| **Storage** (`storage/`) | `R2StorageService` + `CloudinaryService` | Ambos dividen infraestructura física en **2 cuentas binarias `'PLANTAS' | 'BOMBAS'`** (`mekanos-plantas-produccion` / `mekanos-bombas-produccion`; folder `'mekanos/evidencias'`) | Incompatible con N verticales de mantenimiento (Ascensores, HVAC, Subestaciones, Puertas) y tenants SaaS aislados. |
| **Email y Facades** (`email/`, `common/services/`) | `EmailService`, `NumeracionService`, `GeneradorDocumentosFacadeService` | `EmailService` fija `MEKANOS_COLORS` y `mekanossas4@gmail.com`; `GeneradorDocumentosFacadeService` está bloqueado a 4 templates legacy y es código muerto; `CotizacionesFacadeService` tampoco tiene consumidores | Fuerte deuda de código muerto y marca incrustada en comunicaciones. |

---

## 2. Inventario / WMS (`apps/api/src/inventario/inventario.service.ts`)

Es uno de los módulos más completos del backend a nivel de dominio logístico, pero presenta acoplamientos internos de concurrencia y fallback:

1. **Capacidades reales operativas (2,410 líneas):**
   - Kardex inmutable (`movimientos_inventario`) con `ENTRADA | SALIDA | AJUSTE | TRANSFERENCIA` y `OrigenMovimiento` incluyendo `TRASLADO_INTERNO`.
   - Despacho a órdenes (`DespacharComponenteOrdenDto` con orígenes `BODEGA | COMPRA_DIRECTA | CLIENTE | GARANTIA`) y recálculo de costos de componentes en orden dentro de transacción.
   - Control de lotes (`lotes_componentes`) y Costo Promedio Ponderado (`CPP`) en `catalogo_componentes.precio_compra` (`inventario.service.ts:282-300`).
2. **Hallazgos críticos:**
   - **Generación de lote con SQL raw interpolado (`inventario.service.ts:161-191`):** `generarSiguienteNumeroLote()` bloquea fila en `sequence_counter` mediante `$queryRawUnsafe` con `${year}` y `${nextVal}` interpolados (prefijo fijo `LOT-${year}-XXXX` y fallback `MAX(id) + 1`).
   - **Defaults silenciosos de identidad y bodega (`inventario.service.ts:236, 258, 277, 298`):** `idUbicacion = dto.id_ubicacion || 1` y `realizado_por: dto.realizado_por || 1` (en ausencia de bodega o usuario explícito, asume ID `1`).
   - **Parche white-label parcial (`inventario.service.ts:197-214`):** Existe `sanitizarNombreResponsable()` con regex `/admin(\s+mekanos)?/i` que oculta `"Admin Mekanos"` devolviendo `"Administrador del Sistema"` — evidencia directa de cómo se parcheó la marca en capa de datos en vez de usar identidad configurable.

---

## 3. Abastecimiento y Remisiones (`ordenes-compra/` y `remisiones/`)

### 3.1 Órdenes de Compra (`apps/api/src/ordenes-compra/`)
- **`prisma-ordenes-compra.repository.ts:635-715`:**
  - `getSourcingProveedor()` consulta precios pactados en `articulos_proveedores` y componentes de catálogo.
  - **Hardcode fiscal en KPIs (`línea 677`):** En `getResumenKpis()`, el monto agregado de OC aprobadas calcula literalmente: `montoTotal += sub * 1.19; // IVA 19%`. Cualquier cliente comercial fuera de Colombia o con otro régimen tributario (0%, 16%, 21%, etc.) recibiría métricas financieras falsas.

### 3.2 Remisiones (`apps/api/src/remisiones/infrastructure/prisma-remisiones.repository.ts`)
- **Observado en `crearRemision()` (líneas 1–115):**
  - Valida disponibilidad en `catalogo_componentes.stock_actual` y descuenta inventario creando movimientos `SALIDA` (`REMISION`).
  - Usa `getNextTableId(tx, 'remisiones', 'id_remision')` y `remisiones_detalle`.
  - **Tres restricciones rígidas:**
    1. No usa `NumeracionService`; genera el consecutivo como `` `REM-${Date.now()}` `` (riesgo de colisión en ráfaga y sin formato configurable).
    2. Fuerza `tipo_destino: 'TECNICO'` y `tipo_remision: 'VALE_SALIDA_TECNICO'` (`líneas 74-75`), impidiendo remisiones hacia sedes de cliente o transferencias externas.
    3. Carece de módulo/pantalla consumidora en Portal Admin (ver doc `05`).

---

## 4. Comercial: Cotizaciones y Propuestas Correctivo (Dualidad y Código Huérfano)

En este dominio conviven implementaciones paralelas que divergen en reglas de negocio:

| Aspecto | `cotizaciones/` (CQRS activo en `app.module.ts`) | `common/services/cotizaciones-facade.service.ts` | `propuestas-correctivo/` (huérfano) vs `cotizaciones/propuestas-correctivo/` (activo) |
| :--- | :--- | :--- | :--- |
| **Estado de cableado** | Activo en `app.module.ts:155` | **0 referencias en todo `apps/api/src/**/*.ts`** (código muerto compilando) | Solo `cotizaciones/propuestas-correctivo` está en `app.module.ts:159`; `src/propuestas-correctivo/` es código muerto en disco |
| **Impuesto (IVA)** | `CreateCotizacionHandler` usa `dto.iva_porcentaje \|\| 0` (`create-cotizacion.handler.ts:48`); `CotizacionCalculoService` calcula con `Decimal` | Línea 209 fuerza `new Decimal(input.ivaPorcentaje \|\| 19) // IVA Colombia default` | — |
| **Garantía por defecto** | `meses_garantia \|\| 3` (`create-cotizacion.handler.ts:50`) | `meses_garantia \|\| 6` | — |
| **Estado inicial** | Hardcoded `id_estado: 1, // BORRADOR` en `CreateCotizacionHandler:41` y `PrismaCotizacionesRepository.save:74` | — | — |
| **Marca / Geo** | Sin HTML de correo directo | Líneas 1098–1119 hardcodean `"Especialistas en Equipos Electrógenos"`, `toLocaleString('es-CO')`, `"MEKANOS S.A.S \| Cartagena de Indias, Colombia"`, `"Tel: (605) 642-1234 \| www.mekanosrep.com"` | `apps/api/src/propuestas-correctivo/propuestas-correctivo.service.ts` ejecuta `create({ data: createDto as any })` **sin `getNextTableId`** aunque `id_propuesta` en Prisma no es `autoincrement()` |

> **Impacto comercial:** Todo el módulo de Cotizaciones y Propuestas existe como API REST, pero **no existe ninguna ruta en Portal Admin para crear, aprobar o convertir cotizaciones** (ver doc `05`).

---

## 5. Contratos, Cronogramas y Agenda (`contratos-mantenimiento/`, `cronogramas-servicio/`, `agenda/`, `programacion-facade`)

1. **Dualidad Contratos / Cronogramas vs `ProgramacionFacadeService`:**
   - `ContratosMantenimientoModule` (`app.module.ts:184`) y `CronogramasServicioModule` (`app.module.ts:186`) exponen CRUDs planos cuyos servicios pasan `createDto as any` y `updateDto as any` directo a Prisma (`contratos-mantenimiento.service.ts`, `cronogramas-servicio.service.ts`). Recordando el hallazgo de Gate 2 (`main.ts` con `ValidationPipe({ whitelist: false })`), cualquier propiedad extra en el body es vector de *mass assignment*.
   - Paralelamente existe `apps/api/src/common/services/programacion-facade.service.ts` (795 líneas) con lógica rica de estados (`ACTIVO | SUSPENDIDO | FINALIZADO | RENOVACION_PENDIENTE`) y generación automática de órdenes (`generarOrdenesDesdeCronogramas()`), pero **no está registrado como provider en ningún `*.module.ts`**.
2. **Agenda (`apps/api/src/agenda/agenda.service.ts`):**
   - En `getServiciosHoy()` utiliza `Date.setHours(0, 0, 0, 0)` y `23, 59, 59, 999` directamente en la zona horaria del servidor host. Si el servidor corre en UTC (Railway/Docker) y la empresa opera en GMT-5 o GMT+1, el corte del día operativo queda desfasado.

---

## 6. Crónjobs y Notificaciones (`notificaciones/tareas-programadas.service.ts` & `notificaciones.service.ts`)

`TareasProgramadasService` registra 6 tareas `@Cron` mediante `@nestjs/schedule`. La inspección línea a línea expone **dos fallas críticas de runtime confirmadas** y acoplamiento rígido de huso horario:

1. **Bug Crítico #1 — Crash garantizado en Auto-Generación Mensual (`tareas-programadas.service.ts:244-261` + `programacion-facade.service.ts:135, 594`):**
   - Job 4 (`generarOrdenesDesdeCronogramas`, día 25 de cada mes a las 02:00 AM) importa dinámicamente `ProgramacionFacadeService` y lo instancia manualmente:
     ```ts
     const programacionService = new ProgramacionFacadeService(
       this.prisma,
       null as any, // NumeracionService opcional
     );
     ```
   - Sin embargo, dentro de `ProgramacionFacadeService.generarOrdenesDesdeCronogramas()`, la **línea 594** ejecuta sin guarda nula:
     ```ts
     const numeracion = await this.numeracionService.generateNextNumber(
     ```
   - **Resultado comprobado:** En cuanto exista un cronograma activo elegible para generar orden, el job lanza `TypeError: Cannot read properties of null (reading 'generateNextNumber')` y falla.
2. **Bug Crítico #2 — Confusión de FK `id_empleado` vs `id_usuario` en Alertas de Contratos (`tareas-programadas.service.ts:209-227` + `notificaciones.service.ts:89-95`):**
   - Mientras Job 1 (`marcarOrdenesVencidas`, líneas 82–85) resuelve correctamente `tecnico.persona -> usuario.id_usuario`, Job 3 (`alertarContratosPorVencer`, líneas 209–227) toma `contrato.id_asesor_responsable` (que apunta a `empleados.id_empleado`) y lo pasa **directamente como `id_usuario`** tanto al deduplicador `notificaciones.findFirst` como a `this.notificacionesService.crear({ idUsuarioDestino: contrato.id_asesor_responsable })`.
   - Dado que `NotificacionesService.crear()` verifica `usuarios.findUnique({ where: { id_usuario } })` y lanza `NotFoundException` si no existe, Job 3 **notifica a la persona equivocada** (si por azar coinciden los enteros `id_empleado === id_usuario`) o **aborta con `NotFoundException`**.
3. **Zona horaria fija en los 6 `@Cron`:** Todos los decoradores del archivo fijan `timeZone: 'America/Bogota'`. En una plataforma comercial multi-país o multi-empresa con sedes en distintos husos horarios, los cortes diarios de alertas y resúmenes ejecutan a destiempo.

---

## 7. Bitácoras y Dashboard (`bitacoras/` y `dashboard/`)

### 7.1 Bitácoras (`apps/api/src/bitacoras/bitacoras.service.ts`)
- En `previewInformesPorSede()` (`líneas 245-355`):
  - Exige y parte del modelo relacional `es_cliente_principal` + `id_cliente` hijos (sedes como sub-clientes).
  - Construye un query SQL dinámico concatenando strings de filtro directamente en la plantilla enviada a `this.prisma.$queryRawUnsafe(sql, ...clienteIds)`:
    - `'${fechaInicio}'::date`, `'${fechaFin}'::date`
    - `'${categoria}'::categoria_equipo_enum` (`línea 284`)
    - `'${tipoServicio}'` (`línea 289`)
  - **Doble defecto:** (a) Superficie de inyección SQL si los parámetros query no están estrictamente validados por whitelist; (b) lock-in al enum legacy de Postgres `categoria_equipo_enum` (`GENERADOR | BOMBA | MOTOR | ...`), ignorando arquetipos creados dinámicamente en `tipos_equipo`.

### 7.2 Dashboard (`apps/api/src/dashboard/dashboard.service.ts`)
- **Caché global no aislado por usuario/empresa (`líneas 16-24`):**
  - Usa variables globales de módulo: `let dashboardCache` (TTL 60s) y `let estadosCache` (TTL 30m). No hay clave de tenant ni invalidación por mutación de órdenes/cotizaciones.
- **Notificaciones no filtradas por usuario (`línea 208`):**
  - El conteo y listado de alertas consulta `prisma.notificaciones.findMany({ where: { leida: false } })` **sin `id_usuario`** en la cláusula `where`, exponiendo alertas destinadas a técnicos/asesores específicos a cualquiera que abra `/dashboard`.

---

## 8. Infraestructura Cloud (Storage R2/Cloudinary), Email y Numeración

### 8.1 Almacenamiento dividido por vertical (`storage/`)
Tanto `R2StorageService` como `CloudinaryService` materializan en infraestructura física la vieja dicotomía de Mekanos (**Generadores vs Bombas**):

- **`apps/api/src/storage/r2-storage.service.ts` (`líneas 6, 26, 30, 115`):**
  - `export type R2Account = 'PLANTAS' | 'BOMBAS';`
  - Buckets por defecto: `'mekanos-plantas-produccion'` y `'mekanos-bombas-produccion'`.
  - El enrutador determina la cuenta buscando la subcadena `'bomba'`/`'BOMBAS'` en la clave S3; **cualquier otro tipo de activo** (ascensor, aire acondicionado, subestación, puerta eléctrica) cae automáticamente en la cuenta `'PLANTAS'`.
- **`apps/api/src/storage/cloudinary.service.ts` (`líneas 22, 88-93, 147`):**
  - `export type CloudinaryAccount = 'PLANTAS' | 'BOMBAS';`
  - `determineAccount()` revisa `tipoEquipo?.toUpperCase().includes('BOMBA')`; todo lo demás cae en `'PLANTAS'`.
  - Folder por defecto: `'mekanos/evidencias'`.

### 8.2 Email, Numeración y Facade Documental Obsoleta
- **`apps/api/src/email/email.service.ts` (`líneas 1-120`):** Fija paleta `MEKANOS_COLORS` en plantillas HTML de correo y usa `process.env.EMAIL_FROM || 'mekanossas4@gmail.com'` (`línea 84`).
- **`apps/api/src/common/services/numeracion.service.ts`:** Prefijos fijos (`ORD, COT, INF, CONT, REM, OC, FAC, REC`) con caché en memoria. Funcional en mono-tenant, pero sin partición por `id_empresa` / `tenant_id`.
- **`apps/api/src/common/services/generador-documentos-facade.service.ts` (`líneas 1-120`):** Define `TipoDocumento` bloqueado a 4 variantes (`INFORME_PREVENTIVO_A_GENERADOR`, `INFORME_PREVENTIVO_B_GENERADOR`, `INFORME_PREVENTIVO_A_BOMBA`, `INFORME_CORRECTIVO`) sin mención a `UNIVERSAL_EAM` ni a plantillas dinámicas. **Confirmado sin referencias en `apps/api/src/**/*.ts`** (código muerto coexistiendo con `PdfService`).
