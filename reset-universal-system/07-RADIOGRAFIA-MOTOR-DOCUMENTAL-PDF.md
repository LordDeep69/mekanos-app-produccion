# 07 — Radiografía del Motor Documental PDF y Email Transaccional

> **Alcance:** Diagnóstico forense **AS-IS** de `apps/api/src/pdf/` y `apps/api/src/email/`: controlador PDF (`pdf.controller.ts`), servicio de renderizado Puppeteer (`pdf.service.ts`), DTOs (`dto/pdf.dto.ts`), nombrado de archivos (`pdf-naming.helper.ts`), sistema de plantillas (`mekanos-base.template.ts`, `tipo-universal-eam.template.ts`, `tipo-correctivo.template.ts`, `cotizacion.template.ts`, legacy Generador/Bomba), almacenamiento/descarga y plantillas de email (`email-templates.service.ts`, `email.service.ts`).  
> **Regla de rigor:** Cada ruta, símbolo, número de línea y fragmento reportado proviene de lectura directa del código fuente. **Cero prescripciones de solución.**

---

## 1. Arquitectura General del Motor Documental (AS-IS)

El ecosistema documental se apoya en **generación HTML inline en TypeScript → Chromium Headless vía Puppeteer → PDF A4**, almacenamiento en Cloudflare R2 y envío adjunto vía `EmailService`.

Sin embargo, el módulo evidencia una **estructura hipertrofiada y parcialmente fracturada** entre sus 10 archivos de plantilla, su controlador de **3,221 líneas** y su acoplamiento total a la identidad corporativa de **Mekanos S.A.S (Cartagena de Indias)**:

| Capa / Componente | Estado Real AS-IS | Falla / Deuda Crítica Observada | Impacto en Producto Comercial EAM White-Label |
| :--- | :--- | :--- | :--- |
| **`PdfController`** (`3,221 líneas`) | Carga Prisma masiva, agrupa multi-equipo, auto-detecta template, sube a R2 y envía email | **Lógica duplicada** entre `generarPdfOrden` y `regenerarPdfOrden`; **parche hardcoded `if (orden.numero_orden === 'OS-202607-0134')`** (`línea 2138`) | Reglas no deterministas basadas en código de orden/marca; imposible escalar a configuraciones por tenant. |
| **`PdfService`** (`1,682 líneas`) | Lanza Puppeteer bajo demanda, espera imágenes (`networkidle0` + 2s), cierra browser por request | **`obtenerHTML()` no tiene `case`** para `'PROPUESTA_CORRECTIVO' | 'REMISION' | 'ORDEN_COMPRA'` (caen a `GENERADOR_A`); instala Chrome en runtime vía `execSync` si falta (`120s` dentro de HTTP) | Ruteo de tipos roto en el `switch`; latencia impredecible bajo carga y riesgo de fuga de instancia Chrome en `generarPDFCotizacion` (no cierra browser). |
| **DTO & Nomenclatura** (`pdf.dto.ts`, `pdf-naming.helper.ts`) | `buildInformeFilename` genera nombres canónicos descriptivos | `pdf.dto.ts:17-49` solo valida `GENERADOR_A, GENERADOR_B, BOMBA_A, COTIZACION`; `pdf-naming.helper` mapea solo 4 equipos (`GENERADOR/MOTOR -> PLANTA`, `BOMBA -> BOMBA`) y 5 servicios | DTO desactualizado frente a `UNIVERSAL_EAM` / `CORRECTIVO`; nombres de archivo forzados a terminología `"PLANTA"`. |
| **Ruteo de Plantillas** (`determinarTipoInforme`) | Enruta `CORRECTIVO/EMERGENCIA/DIAGNOSTICO -> CORRECTIVO`; `BOMBA -> BOMBA_A`; `GENERADOR -> GENERADOR_A/B`; resto `-> UNIVERSAL_EAM` | Bombas y Generadores siguen secuestrados en plantillas legacy estáticas; solo nuevos tipos usan `UNIVERSAL_EAM` | Fragmentación visual entre tipos de equipo; mantenimiento simultáneo de 5 templates operativos distintos. |
| **Template `UNIVERSAL_EAM`** (`1,138 líneas`) | Placa polimórfica vía `EquipoSpecsReader`, segregación checklist vs mediciones, lotes galería, repuestos B/C, pendientes y firmas | Reintroduce heurísticas `esActividadMedicion()` y `deducirUnidadParametro()` sobre texto; pie de página y firmas fijas a Mekanos Cartagena | Dependencia parcial de texto si falta metadata; branding imposible de personalizar sin editar código. |
| **Templates Base & Comerciales** | `mekanos-base.template.ts` (`2,481 líneas`) + `cotizacion.template.ts`, etc. | Paleta `MEKANOS_COLORS`, lectura síncrona de disco `logo-mekanos.png`, disclaimer legal con `"Mekanos S.A.S."`, SVG hardcoded `"MEKANOS S.A.S"` en cotizaciones | Cero parametrización por tenant (logo, NIT, dirección, teléfono, colores, texto legal). |
| **Email Transaccional** (`email-templates.service.ts`) | HTML responsivo con resumen tabular del servicio realizado | Header `<h1>MEKANOS S.A.S</h1>` y paleta fija (`#244673`, `#3290A6`, `#56A672`, `#9EC23D`) | Remitentes y correos de entrega llevan siempre la marca Mekanos. |

---

## 2. Incoherencias del Controlador y Enrutamiento (`pdf.controller.ts` & `pdf.service.ts`)

### 2.1 Lógica Duplicada, Heurísticas de Inferencia y Hardcode por Orden
- **Duplicación en `pdf.controller.ts`:** El endpoint de lectura `GET /ordenes/:id/pdf` (`líneas 930-1022`) y el flujo de regeneración/almacenamiento `regenerarPdfOrden` (`líneas 2098-2135`) reimplementan por separado la detección de `tipoInforme` y reglas de negocio.
- **Inferencia heurística de tipo de equipo (`líneas 934-978`):** Cuando falta metadata relacional directa, intenta adivinar el tipo de activo buscando `'BOM'`, `'GEN'` o `'MOT'` dentro de `numero_orden`, `codigo_tipo` del servicio e incluso `marcaEquipo` (`if (marcaUpper.includes('GENERADOR')) tipoEquipoNombre = 'GENERADOR'`).
- **Parche de excepción hardcoded en producción (`líneas 2133-2145`):**
  ```ts
  if (orden.numero_orden === 'OS-202607-0134') {
    this.logger.warn(
      '⚠️ [FIX ATÓMICO] OS-202607-0134: suprimiendo secciones de mediciones del PDF',
    );
    (datosOrden as any).datosModulo = undefined;
    (datosOrden as any).mediciones = [];
    (datosOrden as any).medicionesPorEquipo = undefined;
  }
  ```
  Una regla específica de negocio para una orden puntual quedó codificada directamente dentro del controlador REST.

### 2.2 Contrato Roto entre `TipoInforme`, `PdfDto` y `obtenerHTML()`
1. **`dto/pdf.dto.ts` (`líneas 17-49`):** `TipoInformePdf` solo define `GENERADOR_A`, `GENERADOR_B`, `BOMBA_A`, `COTIZACION` (con valor por defecto `GENERADOR_A`), desalineado con `PdfController` (`@ApiQuery` incluye `UNIVERSAL_EAM` y `CORRECTIVO`) y con `PdfService`.
2. **`pdf.service.ts` (`líneas 44-53` vs `212-229`):**
   - `export type TipoInforme` declara `'UNIVERSAL_EAM' | 'CORRECTIVO' | 'COTIZACION' | 'PROPUESTA_CORRECTIVO' | 'REMISION' | 'ORDEN_COMPRA'`.
   - Pero el `switch (tipo)` de `obtenerHTML()` **solo implementa**: `'GENERADOR_A'`, `'GENERADOR_B'`, `'BOMBA_A'`, `'UNIVERSAL_EAM'`, `'CORRECTIVO'` y `'COTIZACION'`. Las variantes `'PROPUESTA_CORRECTIVO'`, `'REMISION'` y `'ORDEN_COMPRA'` **caen al bloque `default: return generarTipoAGeneradorHTML(datos)`**, aunque en `templates/` sí existan archivos `propuesta-correctivo.template.ts`, `remision.template.ts` y `orden-compra.template.ts`.
3. **Auto-detección aún anclada a legado (`determinarTipoInforme`, `pdf.service.ts:1219-1242` y `pdf.controller.ts:2103-2129`):**
   - Servicios `CORRECTIVO`, `EMERGENCIA` o `DIAGNOSTICO` → template narrativo `'CORRECTIVO'`.
   - Equipos `BOMBA` / `BOM` → plantilla estática `'BOMBA_A'`.
   - Equipos `GENERADOR` / `GEN` → plantillas estáticas `'GENERADOR_A'` / `'GENERADOR_B'`.
   - Solo cualquier **otro** tipo de equipo entra en `'UNIVERSAL_EAM'`. Es decir, los dos tipos históricos más frecuentes siguen excluidos del renderizado polimórfico universal.

---

## 3. Análisis Técnico de `tipo-universal-eam.template.ts` y `tipo-correctivo.template.ts`

### 3.1 Qué logra bien el motor `UNIVERSAL_EAM` (`1,138 líneas`)
- Lee atributos de placa polimórficos dinámicos mediante `EquipoSpecsReader` + `DatosPlacaUniversal` (módulos y atributos de EAM Studio sin tablas fijas).
- Segrega correctamente actividades de checklist vs mediciones telemétricas, soporta órdenes multi-equipo (`actividadesPorEquipo`, `medicionesPorEquipo`, `evidenciasPorEquipo`), lotes de galería fotográfica y repuestos segregados en **3 bloques** (`Bodega`, `Suministro Cliente`, `Compra Directa en Campo`).
- Renderiza pendientes técnicos con badges de prioridad/estado y firmas digitales.

### 3.2 Acoplamientos y Deuda Residual en Templates Operativos
1. **Heurística de respaldo en `tipo-universal-eam.template.ts` (`líneas 57-150`):**
   - `esActividadMedicion()`: cuando falta `idParametroMedicion` / `tipoActividad` / `tipoControlInput`, escanea la descripción (`voltaje`, `delta t`, `megger`, `rpm`, etc.).
   - `deducirUnidadParametro()`: si falta unidad estructurada, la deduce por patrones en texto (`MΩ`, `PSI`, `bar`, `VAC`, `°C`).
2. **Protocolo de texto frágil para Correctivos (`pdf.service.ts:251-390`):**
   - `adaptarDatosParaCorrectivo()` y `esTextoVacioOSinContenido()` deben parsear y limpiar 14 prefijos de texto plano (`PENDIENTES:`, `RECOMENDACIONES:`, `TRABAJOS:`, `DIAGNOSTICO:`, `ESTADO_INICIAL:`, `ESTADO_FINAL:`, etc.) generados históricamente por Mobile en `observaciones`, además de filtrar 30+ placeholders (`'.'`, `'N/A'`, `'(NINGUNO)'`, etc.).
3. **Optimización acoplada a un proveedor CDN específico (`tipo-universal-eam.template.ts:36-42`, `tipo-correctivo.template.ts:41-47`):**
   - La función duplicada `optimizarUrlCloudinary()` reescribe URLs con parámetros `q_auto:low,w_600,f_jpg/` únicamente si la URL contiene `res.cloudinary.com`, sin equivalencia para activos alojados en Cloudflare R2 u otros providers S3.

---

## 4. Branding Hardcoded, Activos Locales y Renderizado Puppeteer

### 4.1 Bloqueo Total a Identidad MEKANOS en PDF y Email
El sistema no consulta ninguna entidad de configuración de empresa (`tenant` / `empresa_config`). Todo está grabado en código y disco:
- **Logo desde sistema de archivos local (`mekanos-base.template.ts:33-88`):** `getLogoBase64()` busca en 7 rutas locales relativas el archivo físico `apps/api/src/pdf/assets/logo-mekanos.png` (compilado en `dist/pdf/assets/logo-mekanos.png`) y lo incrusta en `<img alt="MEKANOS S.A.S" .../>`.
- **Paleta fija:** `MEKANOS_COLORS` (`#244673`, `#3290A6`, `#56A672`, `#9EC23D`, `#F2F2F2`) importada por todos los templates (`pdf.service.ts`, `mekanos-base.template.ts`, `cotizacion.template.ts`, `tipo-universal-eam.template.ts`, `tipo-correctivo.template.ts`).
- **Textos legales y pie de página corporativos:**
  - `tipo-universal-eam.template.ts:1057`: etiqueta bajo firma del técnico literal `'MEKANOS S.A.S · Departamento Técnico'`.
  - `tipo-universal-eam.template.ts:1129-1136` (`generarFooterCorporativo`): `'MEKANOS S.A.S · NIT: 900.542.123-1 · CRA 49C # 31-35 DIAG. AL SENA, CARTAGENA DE INDIAS · Línea PBX: (605) 635-9384 · WhatsApp Soporte 24/7: 315-708-3350 · info@mekanos.com.co'`.
  - `mekanos-base.template.ts:2424`: disclaimer de suministro de repuestos por cliente nombra explícitamente a `'Mekanos S.A.S.'`.
  - `cotizacion.template.ts:322-325`: dibuja un `<svg>` embebido literal con textos `'MEKANOS'` y `'S.A.S'`.
  - `email-templates.service.ts:67`: `<h1>MEKANOS S.A.S</h1>` y colores hexadecimales fijos.
  - `pdf.service.ts:1481`: nombre de archivo de cotización `MEKANOS_Cotizacion_${numeroCotizacion}_...pdf`.
  - `pdf-naming.helper.ts` (espejo de `apps/admin/src/lib/pdf-naming.ts`): restringe la traducción amigable del nombre de archivo a `'GENERADOR'/'MOTOR' -> 'PLANTA'` y `'BOMBA' -> 'BOMBA'`, con diccionarios fijos de 5 tipos de servicio.

### 4.2 Gestión Operativa de Chromium / Puppeteer (`pdf.service.ts:102-206, 985-1062, 1421-1468`)
- **Ciclo de proceso por PDF:** Para evitar que Chrome consuma ~300 MB en reposo (`líneas 90-96`), `generarPDF()` abre y cierra un proceso completo de Chromium por cada informe (`initBrowser()` + `browser.close()` en `finally`), añadiendo latencia y espera fija de `2000ms` (`línea 151`) tras `networkidle0 + load` para asegurar carga de fotos externas.
- **Asimetría de limpieza de memoria:** En `generarPDFCotizacion()` (`líneas 1425-1468`), inicializa `this.browser` si es null y cierra `page.close()`, **pero omite cerrar `this.browser` en el `finally`**, dejando el proceso Chromium abierto en RAM tras generar una cotización.
- **Instalación bloqueante en runtime (`líneas 1008-1022`):** Si el binario de Chrome no existe en `PUPPETEER_CACHE_DIR`, intenta ejecutar síncronamente `execSync('npx puppeteer browsers install chrome', { timeout: 120000 })` dentro del hilo de la petición HTTP, pudiendo agotar timeouts de gateway o fallar en contenedores sin permisos/red hacia CDN de Chromium.
