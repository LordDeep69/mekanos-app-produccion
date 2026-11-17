# 00 · Propósito, Criterio Comercial EAM y Protocolo de Radiografía

> **Estado del Documento:** Diagnóstico Forense **AS-IS** (Solo Lectura / Congelamiento de Código activo).  
> **Naturaleza:** Marco rector de auditoría arquitectónica — **NO contiene parches ni diseño prescriptivo de solución**.  
> **Alcance del Ecosistema Auditado:** `c:\Users\Usuario\Documents\proyectos\mekanosApp\mekanos-app-produccion` (`apps/api`, `apps/admin`, `apps/mobile`, `packages/database`, `packages/core`, `packages/shared`, `packages/config`).

---

## 1. Definición Comercial y de Dominio del Producto

### 1.1 Identidad Real del Producto

Este ecosistema **no** es un software interno hecho a la medida únicamente para una empresa llamada *Mekanos S.A.S.*, ni tampoco es un motor abstracto genérico sin dominio (como formularios universales para veterinarias, pacientes o bienes raíces sin estructura operativa).

El objetivo comercial validado es posicionarlo como un **producto SaaS / Licenciable B2B de nivel Enterprise (EAM / CMMS — Enterprise Asset Management / Computerized Maintenance Management System)** diseñado específicamente para **empresas prestadoras de servicios de mantenimiento industrial, electromecánico, edilicio e infraestructura** que deseen **comprar o alquilar** el sistema para gestionar sus operaciones de principio a fin.

### 1.2 Qué debe soportar de forma nativa sin tocar código fuente

Para que una empresa compradora adopte el producto desde el Día 1 sin contratar desarrollo a la medida:

1. **Identidad Corporativa (White-Label / Tenant Configurable):** La empresa compradora debe poder configurar su nombre legal/comercial, NIT/RUC/ID fiscal, logotipos, paleta cromática, datos de contacto, cuentas remitentes de correo, prefijos documentales, firma/representación legal y parámetros regionales (país, ciudad, moneda, zona horaria).
2. **Universalidad Real dentro del Rubro de Mantenimiento Físico:** Cualquier empresa de mantenimiento —sin importar su vertical— debe poder definir desde el Portal Admin sus **tipos de activos/equipos**, su **ficha técnica modular**, sus **métricas de desgaste/uso**, sus **planes y protocolos de inspección**, sus **parámetros/unidades de medición** y su **lista de repuestos (BOM)** sin que existan reglas ocultas o bifurcaciones para "generadores" o "bombas".
3. **Todos los Tipos de Servicio de Mantenimiento:** Preventivo cíclico (por calendario o por contador de uso), Correctivo / Reparación de fallas, Predictivo / Termografía / Análisis de condiciones, Emergencia / Atención 24-7, Diagnóstico / Levantamiento técnico, Instalación / Comisionamiento, Bitácoras y Trazabilidad histórica por cliente/sede/activo.
4. **Cobertura Operativa Integral End-to-End:** CRM de clientes y sedes -> Inventario físico de activos -> Contratos y cronogramas -> Órdenes de servicio -> Planeación y ejecución en campo **100% Offline-First (Mobile)** -> Sincronización -> Inventario/Almacén/Compras/Remisiones -> Cotizaciones y Propuestas Correctivas -> Generación de PDFs corporativos controlables -> Envío automático por email y portal/reportes.

---

## 2. Taxonomía de Evaluación: Las 3 Zonas Arquitectónicas

Todo hallazgo registrado en los Capítulos `01` a `07` será clasificado bajo tres zonas estrictas para distinguir lo que **aporta valor comercial**, lo que **es arquitectura sana** y lo que **sabotea la venta o escalabilidad del producto**:

| Zona | Definición | Criterio de Auditoría |
| :--- | :--- | :--- |
| **Zona 1 · Superficie Ergonómica de Producto (UX)** | Vocabulario operativo natural del sector mantenimiento en pantallas, ayudas y reportes (`Activo / Equipo`, `Sede`, `Orden de Servicio`, `Horómetro / Contador`, `Plan Preventivo`, `Repuestos / BOM`). | **Deseable siempre que no imponga semántica fija de un sub-rubro.** Usar el lenguaje de las empresas de mantenimiento acelera la venta y reduce la curva de adopción frente a una pantalla abstracta en blanco. |
| **Zona 2 · Núcleo EAM Paramétrico y Agnóstico de Vertical** | Esquemas relacionales, máquinas de estado, motores de formularios/telemetría, resolución de PDFs y contratos API gobernados 100% por metadatos declarativos en base de datos. | **Estándar objetivo.** Si se crea una nueva categoría de activo o un nuevo tipo de servicio desde el Admin, API, Mobile y PDF deben renderizarlo y validarlo sin editar código ni desplegar nuevas versiones. |
| **Zona 3 · Acoplamiento Tóxico / Deuda de Producto** | Branding quemado en código (`MEKANOS`), enumeraciones/tablas heredadas cerradas (`GENERADOR`, `BOMBA`), heurísticas por palabras clave que secuestran configuraciones explícitas, brechas de seguridad/RBAC, y lógica duplicada o contradictoria entre capas. | **Bloqueante comercial.** Cada instancia encontrada se documenta con ruta exacta, línea exacta, evidencia verificada e impacto funcional/comercial. |

---

## 3. Matriz de Falsificación Multi-Activo × Multi-Servicio

Ninguna afirmación de "el sistema es universal" se da por cierta sin someter cada módulo a falsificación contra **8 verticales físicas representativas** y **5 modalidades de servicio**:

### 3.1 Verticales de Activo Físico de Prueba Teórica

| # | Vertical / Tipo de Activo | Naturaleza Física | Métrica de Desgaste Real | Particularidades que rompen diseños rígidos |
| :--- | :--- | :--- | :--- | :--- |
| **V1** | **Plantas Eléctricas / Grupos Electrógenos** | Generación híbrida (Motor + Alternador + Tablero) | Horómetro (`HORAS`) | Acumula doble conjunto de especificaciones (motor y generador), voltajes trifásicos, presiones de aceite y niveles de combustible. |
| **V2** | **Motobombas / Sistemas Hidroneumáticos** | Bombeo / Fluidos | Horómetro (`HORAS`) o Arranques (`CICLOS`) | Presiones de succión/descarga, caudal, sello mecánico, alternancia de bombas (Bomba 1 / Bomba 2). |
| **V3** | **Ascensores y Montacargas** | Transporte vertical | Viajes / Maniobras (`CICLOS`) | Paradas/pisos, capacidad en kg, velocidad m/s, cables de tracción, fosos, puertas de cabina y seguridades mecánicas. |
| **V4** | **Escaleras Eléctricas / Andenes Móviles** | Transporte continuo | Horas / Ciclos | Peldaños, pasamanos, peines, frenos auxiliares, interruptores de seguridad en zócalos. |
| **V5** | **Puertas Eléctricas / Portones / Talanqueras** | Automatización de accesos | Ciclos de apertura (`CICLOS`) | Fotoceldas, finales de carrera, fuerza de empuje, baterías de respaldo, controles RF. |
| **V6** | **Subestaciones / Transformadores / Tableros MT-BT** | Distribución eléctrica | Maniobras / Calendario (`MANIOBRAS` / `CAL`) | Sin horómetro rotativo continuo; pruebas dieléctricas, termografía de fases R-S-T, nivel de aceite, tap changer, relés de protección. |
| **V7** | **HVAC / Aires Acondicionados / Chillers** | Climatización | Horas o Calendario | Temperaturas inyección/retorno, subenfriamiento/sobrecalentamiento, presiones de refrigerante (alta/baja), filtros, amperajes compresor. |
| **V8** | **Tuberías / Redes Hidrosanitarias / Infraestructura Edilicia** | Activo lineal o estático sin motor | Inspección por Calendario (`CAL`) o Caudal (`M3`) | Sin fabricante tradicional de placa o serial único; tramos, válvulas, uniones, pruebas hidrostáticas, espesores o detección de fugas. |

### 3.2 Modalidades de Servicio de Prueba Teórica

1. **Preventivo Cíclico (`S1`):** Actividades estructuradas por sistemas/subsistemas, checklist tipado + mediciones con rangos de alerta y actualización de lectura de desgaste.
2. **Correctivo / Reparación (`S2`):** Levantamiento de falla raíz, actividades libres o semiestructuradas, consumo real de repuestos con origen de suministro (bodega propia vs cliente), evidencia Antes/Durante/Después.
3. **Predictivo (`S3`):** Énfasis en telemetría comparativa (vibraciones, termografía, análisis de aceite, ultrasonido) sin reemplazo obligatorio de piezas.
4. **Emergencia / Siniestro (`S4`):** Prioridad crítica, creación ágil en campo o despacho inmediato, registro de tiempos reales de respuesta y resolución.
5. **Diagnóstico / Inspección / Auditoría (`S5`):** Evaluaciones de estado por activo o multi-equipo en una misma sede (generación de hallazgos/pendientes y puente directo hacia cotización o propuesta correctiva).

> **Criterio de Falla:** Si un flujo del código obliga a que un activo tenga voltaje/RPM, sea "GENERADOR" o "BOMBA", o asuma que una actividad que contiene la palabra `"TEMPERATURA"` o `"HOROMETRO"` cambia su tipo de widget ignorando la metadata declarada en base de datos, **el módulo REPRUEBA la matriz**.

---

## 4. Criterio de Evaluación Comercial: White-Label vs Multi-Tenancy

Para vender o alquilar el software a múltiples empresas compradoras existen dos modelos arquitectónicos posibles. Esta radiografía evalúa la **brecha estructural AS-IS** frente a ambos modelos, sin asumir aún cuál implementará el proyecto:

| Dimensión | Modelo A · Single-Tenant White-Label (1 Instancia / BD por Cliente Comprador) | Modelo B · Multi-Tenant SaaS (1 Infraestructura compartida para N Empresas Compradoras) |
| :--- | :--- | :--- |
| **Requisito Mínimo de Marca** | Tabla/módulo único de `configuracion_organizacion` (logos, colores, razón social, NIT, footer PDF, emails, locales) sin referencias a `MEKANOS` en UI/PDF/Email/Mobile. | Todo lo del Modelo A **por `tenant_id`**, más resolución dinámica de dominio/branding en login Web y selector/código de organización en Mobile. |
| **Requisito de Aislamiento de Datos** | Cada despliegue tiene su propia BD PostgreSQL, su propio bucket/prefijo R2/Cloudinary y su propio JWT secret. | `id_organizacion / tenant_id` obligatorio en ~93 tablas (o RLS en PostgreSQL), en cada query Prisma/SQL, en JWT claims, en caché en memoria, en carpetas de Storage y en BD local **Drift** de Mobile. |
| **Requisito de Gobernanza SaaS** | Provisioning scripts + parametrización inicial limpia (seeds universales sin datos demo de Cartagena/Mekanos). | Módulo SuperAdmin de Plataforma (planes, suscripciones, límites, suspensión de tenants, soporte cross-tenant auditado). |

---

## 5. Las 5 Reglas Inquebrantables de Esta Auditoría

1. **Veracidad Cero Confianza (Zero Trust Fact-Checking):** Toda ruta de archivo, línea, símbolo, modelo Prisma, conteo o comportamiento citado en estos reportes ha sido **directamente leído o consultado mediante herramientas en el repositorio actual**. Si algo no se inspecciona directamente, no se afirma.
2. **Separación Total Diagnóstico vs Solución:** Los Capítulos `00` a `07` diagnostican **qué existe hoy, cómo está cableado, dónde choca entre capas y qué vulnerabilidades/acoplamientos tiene**. El documento futuro de arquitectura/remediación nacerá solo después de completar y aprobar los 8 capítulos de diagnóstico.
3. **Trazabilidad Vertical Completa (DB -> API -> Admin -> Mobile -> PDF):** Ningún defecto se analiza aislado en una sola pantalla; se persigue su contrato completo de extremo a extremo.
4. **Foco en Evidencia Estructural sobre Síntomas Superficiales:** No se busca "hacer pasar una prueba E2E"; se busca exponer cada hueco lógico, cada bypass de seguridad, cada modelo duplicado y cada heurística implícita.
5. **Avance por Gates Auditables:** El trabajo se entrega por capítulos agrupados en Gates, deteniéndose al final de cada Gate para validación conjunta con el líder técnico/propietario del producto.

---

## 6. Mapa Completo de Capítulos y Gates

| Gate | Archivo | Alcance Principal | Estado |
| :--- | :--- | :--- | :--- |
| **Gate 1** | `00-PROPOSITO-Y-CRITERIO-EAM-COMERCIAL.md` | Marco rector comercial, Matriz de Falsificación, Criterio White-Label/Tenancy, Reglas. | **Entregado** |
| **Gate 1** | `01-RADIOGRAFIA-TOPOLOGIA-MARCA-Y-ACTORES.md` | Topología Monorepo, Inventario exacto de marca `"mekanos"`, Readiness Tenancy, Auth/JWT/RBAC y Grafo de Actores. | **Entregado** |
| **Gate 2** | `02-RADIOGRAFIA-CAPA-DATOS-PRISMA.md` | Auditoría integral de los **93 modelos** de `schema.prisma`, enums rígidos, tablas satélite `equipos_*`, secuencias manuales, seeds y migraciones. | Pendiente |
| **Gate 2** | `03-RADIOGRAFIA-BACKEND-NUCLEO-EAM-Y-ORDENES.md` | Núcleo API NestJS: EAM polimórfico, `catalogos-eam`, CRUD Equipos/Clientes, FSM Órdenes, finalización, sync offline y dualidad CQRS vs Services. | Pendiente |
| **Gate 3** | `04-RADIOGRAFIA-MODULOS-PERIFERICOS-API.md` | Inventario/WMS, Compras, Remisiones, Cotizaciones, Propuestas Correctivo, Contratos, Cronogramas, Agenda, Bitácoras, Notificaciones, Storage y Email. | Pendiente |
| **Gate 3** | `05-RADIOGRAFIA-PORTAL-ADMIN-STUDIO.md` | Radiografía Next.js 16 Admin: EAM Studio, Formularios dinámicos/hardcodeados, heurísticas de UI, gestión de órdenes, caché, estado y UX comercial. | Pendiente |
| **Gate 4** | `06-RADIOGRAFIA-MOTOR-MOBILE-OFFLINE.md` | Radiografía Flutter/Riverpod/Drift: Esquema local vs API, cola de sincronización, motor declarativo vs heurísticas que lo secuestran, evidencias, firmas y descubrimiento local. | Pendiente |
| **Gate 4** | `07-RADIOGRAFIA-MOTOR-DOCUMENTAL-PDF.md` | Radiografía Puppeteer/HTML PDF: Motor universal vs plantillas legacy por tipo, `pdf.controller.ts`, branding embebido, overrides de parámetros y despacho automático. | Pendiente |
