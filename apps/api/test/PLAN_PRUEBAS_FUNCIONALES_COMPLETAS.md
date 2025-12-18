# 🧪 PLAN DE PRUEBAS FUNCIONALES COMPLETAS - BACKEND MEKANOS

## OBJETIVO

Simular EXACTAMENTE lo que haría el Frontend, validando que TODOS los flujos de negocio funcionan de principio a fin.

---

## TEST 1: FLUJO COMPLETO - ORDEN DE SERVICIO TIPO A GENERADOR

### Escenario

Un técnico ejecuta un mantenimiento preventivo Tipo A a un generador eléctrico.

### Pasos a Validar

| # | Vista Frontend | Acción | Endpoint | Validación |
|---|----------------|--------|----------|------------|
| 1.1 | Login | Ingresar credenciales | POST /auth/login | JWT obtenido |
| 1.2 | Dashboard | Cargar métricas | GET /dashboard | Datos completos |
| 1.3 | Nueva Orden | Seleccionar cliente | GET /clientes | Lista clientes |
| 1.4 | Nueva Orden | Seleccionar equipo | GET /equipos?cliente=X | Lista equipos |
| 1.5 | Nueva Orden | Crear orden | POST /ordenes | Orden creada con ORD-YYYY-XXXXX |
| 1.6 | Admin Panel | Programar orden | PATCH /ordenes/:id/estado | BORRADOR → PROGRAMADA |
| 1.7 | Admin Panel | Asignar técnico | PATCH /ordenes/:id/estado | PROGRAMADA → ASIGNADA |
| 1.8 | App Móvil | Técnico inicia servicio | PATCH /ordenes/:id/estado | ASIGNADA → EN_PROCESO |
| 1.9 | App Móvil | Registrar mediciones | POST /mediciones-servicio | Con alertas automáticas |
| 1.10 | App Móvil | Registrar actividades | POST /actividades-ejecutadas | Checklist completado |
| 1.11 | App Móvil | Subir evidencias | POST /evidencias-fotograficas | URLs Cloudinary |
| 1.12 | App Móvil | Completar orden | PATCH /ordenes/:id/estado | EN_PROCESO → COMPLETADA |
| 1.13 | Backend Auto | Generar PDF | Interno | PDF ~1MB generado |
| 1.14 | Backend Auto | Subir PDF Cloudflare | Interno | URL R2 obtenida | REGISTRAR EN BD
| 1.15 | Backend Auto | Guardar en documentos | Interno | Registro en BD |
| 1.16 | Backend Auto | Enviar email | Interno | Email enviado con PDF |

### Criterio de Éxito

✅ Orden completada + PDF en Cloudflare + Email enviado a <lorddeep3@gmail.com>

---

## TEST 2: ORDEN + PROPUESTA CORRECTIVO + COTIZACIÓN

### Escenario

El técnico encuentra hallazgos que requieren cotización (batería, aceite, display).

### Pasos Adicionales

| # | Vista Frontend | Acción | Endpoint | Validación |
|---|----------------|--------|----------|------------|
| 2.1-2.12 | (Igual que TEST 1) | ... | ... | ... |
| 2.13 | App Móvil | Registrar hallazgos | POST /componentes-usados | Items requeridos |
| 2.14 | Admin Panel | Crear cotización desde orden | POST /cotizaciones | COT-YYYY-XXXXX |
| 2.15 | Admin Panel | Agregar items | POST /cotizaciones/:id/items-servicios | Items con precios |
| 2.16 | Admin Panel | Agregar componentes | POST /cotizaciones/:id/items-componentes | Con cantidades |
| 2.17 | Admin Panel | Enviar cotización | POST /cotizaciones/:id/enviar | PDF + Email enviado |

### Criterio de Éxito

✅ Cotización generada + PDF cotización en Cloudflare + Email enviado

---

## TEST 3: FLUJO DE COTIZACIONES COMERCIALES

### Escenario

El asesor comercial crea una cotización, la envía, y el cliente la aprueba.

---

## TEST 4: CONTRATOS Y CRONOGRAMAS

### Escenario

Se crea un contrato de mantenimiento preventivo con cronogramas automáticos.

---

## TEST 5: DASHBOARD Y NOTIFICACIONES

### Escenario

Verificar que el dashboard muestra datos correctos y las notificaciones funcionan.

---

## CREDENCIALES DE PRUEBA

**Autenticación:**

- Email: <admin@mekanos.com>
- Password: Admin123!

**Email destino pruebas:**

- <lorddeep3@gmail.com>

**SMTP:**

- Email: <mekanossas4@gmail.com>
- App Password: jvsd znpw hsfv jgmy

---

## EJECUCIÓN

Fecha: 28 de Noviembre de 2025
Estado: EN PROGRESO
