/**
 * PDF Service White-Label
 * Generación de PDFs corporativos con Puppeteer + Templates HTML parametrizados.
 */

import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as puppeteer from 'puppeteer';
import { ConfiguracionOrganizacionService } from '../configuracion-organizacion/configuracion-organizacion.service';
import {
  OrgBrandingContext,
  buildOrgBranding,
  formatDateOrg,
  resolveOrgBranding,
} from './org-branding.types';
import {
  DatosCorrectivoOrdenPDF,
  DatosCotizacionPDF,
  DatosOrdenCompraPDF,
  DatosOrdenPDF,
  DatosPropuestaCorrectivoPDF,
  DatosRemisionPDF,
  DatosTrazabilidadClientePDF,
  generarCorrectivoOrdenHTML,
  generarCotizacionHTML,
  generarOrdenCompraHTML,
  generarPropuestaCorrectivoHTML,
  generarRemisionHTML,
  generarTipoABombaHTML,
  generarTipoAGeneradorHTML,
  generarTipoBGeneradorHTML,
  generarTipoUniversalEamHTML,
  generarTrazabilidadClienteHTML,
} from './templates';
import { DatosEstructuradosCorrectivoPorEquipo } from './templates/tipo-correctivo.template';

export type TipoInforme =
  | 'UNIVERSAL_EAM'
  | 'CORRECTIVO'
  | 'COTIZACION'
  | 'PROPUESTA_CORRECTIVO'
  | 'REMISION'
  | 'ORDEN_COMPRA'
  | 'TRAZABILIDAD'
  | 'GENERADOR_A'
  | 'GENERADOR_B'
  | 'BOMBA_A';

export interface GenerarPDFOptions {
  tipoInforme: TipoInforme;
  datos: DatosOrdenPDF;
}

export interface PDFResult {
  buffer: Buffer;
  filename: string;
  size: number;
  tipoInforme: TipoInforme;
}

// Mantener compatibilidad con interfaz anterior
export interface OrdenPdfData {
  numeroOrden: string;
  estado: string;
  prioridad: string;
  clienteNombre?: string | null;
  equipoNombre?: string | null;
  fechaCreacion?: Date | null;
  fechaProgramada?: Date | null;
  fechaInicio?: Date | null;
  fechaFinalizacion?: Date | null;
  tecnicoAsignado?: string | null;
  descripcion?: string | null;
  observaciones?: string | null;
  firmaDigital?: string | null;
}

@Injectable()
export class PdfService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PdfService.name);
  private sharedBrowser: puppeteer.Browser | null = null;
  private browserLaunchPromise: Promise<puppeteer.Browser> | null = null;
  private activePages = 0;
  private idleTimer: NodeJS.Timeout | null = null;
  private readonly BROWSER_IDLE_TTL_MS = 45_000;

  constructor(
    @Optional() private readonly configOrgService?: ConfiguracionOrganizacionService,
    @Optional() _compatArg1?: unknown,
    @Optional() _compatArg2?: unknown,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('📋 PdfService listo (browser cálido bajo demanda con auto-cierre por inactividad)');
  }

  private async acquireBrowser(): Promise<puppeteer.Browser> {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    if (this.sharedBrowser && this.sharedBrowser.connected) {
      return this.sharedBrowser;
    }
    if (!this.browserLaunchPromise) {
      this.browserLaunchPromise = this.launchBrowser()
        .then((b) => {
          this.sharedBrowser = b;
          b.on('disconnected', () => {
            if (this.sharedBrowser === b) this.sharedBrowser = null;
          });
          return b;
        })
        .finally(() => {
          this.browserLaunchPromise = null;
        });
    }
    return this.browserLaunchPromise;
  }

  private scheduleIdleBrowserClose(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    if (this.activePages > 0 || !this.sharedBrowser) return;
    this.idleTimer = setTimeout(async () => {
      if (this.activePages > 0 || !this.sharedBrowser) return;
      const b = this.sharedBrowser;
      this.sharedBrowser = null;
      this.idleTimer = null;
      await b.close().catch(() => {});
    }, this.BROWSER_IDLE_TTL_MS);
    this.idleTimer.unref?.();
  }

  /**
   * Resuelve el contexto visual/fiscal de la organización (con cache de logo en memoria).
   */
  async resolveBranding(override?: Partial<OrgBrandingContext> | null): Promise<OrgBrandingContext> {
    if (override && (override as OrgBrandingContext).nombreComercial && (override as OrgBrandingContext).colores) {
      return resolveOrgBranding(override);
    }
    if (!this.configOrgService) {
      return resolveOrgBranding(override);
    }
    const [ctx, logoUri] = await Promise.all([
      this.configOrgService.getContext().catch(() => null),
      typeof this.configOrgService.resolveLogoDataUri === 'function'
        ? this.configOrgService.resolveLogoDataUri().catch(() => null)
        : Promise.resolve(null),
    ]);
    const built = buildOrgBranding(ctx, logoUri);
    return override ? resolveOrgBranding({ ...built, ...override }) : built;
  }

  private slugEmpresa(brand: OrgBrandingContext): string {
    const slug = (brand.nombreComercial || 'DOC')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 24);
    return slug || 'EAM';
  }

  /**
   * Ejecuta la renderización HTML->PDF reutilizando el browser cálido (con página aislada
   * por petición y auto-cierre por inactividad para mantener la RAM en 0 en reposo).
   */
  private async renderHtmlToPdf(
    html: string,
    pdfOptions: puppeteer.PDFOptions = {
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      preferCSSPageSize: true,
      timeout: 90000,
    },
    waitMsPostLoad = 0,
    fastLoad = false,
  ): Promise<Buffer> {
    const browser = await this.acquireBrowser();
    this.activePages += 1;
    const page = await browser.newPage();

    try {
      await page.setExtraHTTPHeaders({
        'Content-Type': 'text/html; charset=utf-8',
        'Accept-Charset': 'utf-8',
      });

      page.on('console', (msg) => {
        if (msg.type() === 'error' || msg.text().includes('Error cargando imagen')) {
          this.logger.warn(`🌐 Browser console [${msg.type()}]: ${msg.text()}`);
        }
      });

      const htmlConEncoding = html.includes('<meta http-equiv="Content-Type"')
        ? html
        : html.replace(
            '<meta charset="UTF-8">',
            '<meta charset="UTF-8"><meta http-equiv="Content-Type" content="text/html; charset=utf-8">',
          );

      await page.setContent(htmlConEncoding, {
        waitUntil: fastLoad ? 'load' : ['networkidle0', 'load'],
        timeout: 90000,
      });

      if (waitMsPostLoad > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitMsPostLoad));
      }

      const pdfBuffer = await page.pdf(pdfOptions);
      return Buffer.from(pdfBuffer);
    } finally {
      await page.close().catch(() => {});
      this.activePages = Math.max(0, this.activePages - 1);
      this.scheduleIdleBrowserClose();
    }
  }

  /**
   * Genera un PDF corporativo para una orden de servicio.
   */
  async generarPDF(options: GenerarPDFOptions): Promise<PDFResult> {
    const startTime = Date.now();
    this.logger.log(
      `🖨️ Generando PDF tipo ${options.tipoInforme} para orden ${options.datos.numeroOrden}`,
    );

    try {
      const brand = await this.resolveBranding(options.datos?.branding);
      const datosConBranding: DatosOrdenPDF = {
        ...options.datos,
        branding: brand,
      };
      const html = this.obtenerHTML(options.tipoInforme, datosConBranding, brand);

      const buffer = await this.renderHtmlToPdf(
        html,
        {
          format: 'A4',
          printBackground: true,
          margin: { top: '0', right: '0', bottom: '0', left: '0' },
          preferCSSPageSize: true,
          timeout: 90000,
        },
        2000,
      );

      const filename = this.generarFilename(options.tipoInforme, options.datos.numeroOrden, brand);
      const elapsed = Date.now() - startTime;
      this.logger.log(`✅ PDF listo en ${elapsed}ms - Tamaño: ${(buffer.length / 1024).toFixed(2)} KB`);

      return {
        buffer,
        filename,
        size: buffer.length,
        tipoInforme: options.tipoInforme,
      };
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`❌ Error generando PDF: ${err.message}`, err.stack);
      throw new InternalServerErrorException(`Error generando PDF: ${err.message}`);
    }
  }

  /**
   * Renderiza cualquier tipo de documento soportado en HTML White-Label.
   */
  obtenerHTML(
    tipo: TipoInforme,
    datos: DatosOrdenPDF | Record<string, any>,
    branding?: OrgBrandingContext,
  ): string {
    const brand = resolveOrgBranding(branding || (datos as any)?.branding);
    switch (tipo) {
      case 'UNIVERSAL_EAM':
        return generarTipoUniversalEamHTML({ ...(datos as DatosOrdenPDF), branding: brand });
      case 'CORRECTIVO':
        return generarCorrectivoOrdenHTML(
          this.adaptarDatosParaCorrectivo(datos as DatosOrdenPDF, brand),
        );
      case 'COTIZACION':
        return generarCotizacionHTML({ ...(datos as DatosCotizacionPDF), branding: brand });
      case 'PROPUESTA_CORRECTIVO':
        return generarPropuestaCorrectivoHTML({
          ...(datos as DatosPropuestaCorrectivoPDF),
          branding: brand,
        });
      case 'REMISION':
        return generarRemisionHTML({ ...(datos as DatosRemisionPDF), branding: brand });
      case 'ORDEN_COMPRA':
        return generarOrdenCompraHTML({ ...(datos as DatosOrdenCompraPDF), branding: brand });
      case 'TRAZABILIDAD':
        return generarTrazabilidadClienteHTML({
          ...(datos as DatosTrazabilidadClientePDF),
          branding: brand,
        });
      case 'GENERADOR_A':
        return generarTipoAGeneradorHTML({ ...(datos as DatosOrdenPDF), branding: brand });
      case 'GENERADOR_B':
        return generarTipoBGeneradorHTML({ ...(datos as DatosOrdenPDF), branding: brand });
      case 'BOMBA_A':
        return generarTipoABombaHTML({ ...(datos as DatosOrdenPDF), branding: brand });
      default:
        return generarTipoUniversalEamHTML({ ...(datos as DatosOrdenPDF), branding: brand });
    }
  }

  /**
   * Método unificado para generar PDF de cualquier documento documental (Propuesta, Remisión, OC, etc.).
   */
  async generarPDFDocumento(
    tipoInforme: TipoInforme,
    datos: Record<string, any>,
    numeroReferencia = 'DOC',
  ): Promise<PDFResult> {
    try {
      const brand = await this.resolveBranding(datos?.branding);
      const html = this.obtenerHTML(tipoInforme, datos, brand);
      const buffer = await this.renderHtmlToPdf(html);
      const filename = this.generarFilename(tipoInforme, numeroReferencia, brand);
      return {
        buffer,
        filename,
        size: buffer.length,
        tipoInforme,
      };
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`❌ Error generando PDF documento ${tipoInforme}: ${err.message}`, err.stack);
      throw new InternalServerErrorException(`Error generando PDF (${tipoInforme}): ${err.message}`);
    }
  }

  /**
   * ✅ Determina si un valor de texto/HTML está vacío, es placeholder o solo contiene prefijo/puntuación
   * Evita renderizar secciones o campos vacíos en el PDF (p.ej. "PENDIENTES: ", ".", "N/A", "(Ninguno)")
   */
  public esTextoVacioOSinContenido(texto?: string | null): boolean {
    if (!texto) return true;

    // 1. Quitar tags HTML y decodificar entidades comunes
    let plano = String(texto).replace(/<[^>]*>/g, ' ');
    plano = plano
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'");

    let limpio = plano.trim();
    if (!limpio) return true;

    // 2. Quitar prefijos conocidos si los tiene al inicio
    const prefijos = [
      'PENDIENTES:',
      'RECOMENDACIONES:',
      'TRABAJOS:',
      'DIAGNOSTICO:',
      'DIAGNÓSTICO:',
      'PROBLEMA:',
      'SINTOMAS:',
      'SÍNTOMAS:',
      'FALLAS:',
      'SISTEMAS:',
      'ESTADO_INICIAL:',
      'ESTADO_FINAL:',
      'REPUESTOS:',
      'MATERIALES:',
    ];

    const limpioUpper = limpio.toUpperCase();
    for (const p of prefijos) {
      if (limpioUpper.startsWith(p)) {
        limpio = limpio.substring(p.length).trim();
        break;
      }
    }

    if (!limpio) return true;

    // 3. Placeholders o cadenas sin significado real
    const upperFinal = limpio.toUpperCase();
    const placeholders = [
      '.',
      '..',
      '...',
      '-',
      '--',
      '---',
      '/',
      'N/A',
      'NA',
      'NO APLICA',
      'S/N',
      'S.N.',
      '(SIN INFORMACIÓN)',
      '(SIN INFORMACION)',
      'SIN INFORMACION',
      'SIN INFORMACIÓN',
      '(NINGUNO)',
      '(NINGUNA)',
      'NINGUNO',
      'NINGUNA',
      'NINGUN',
      'SIN PENDIENTES',
      'NO PRESENTA PENDIENTES',
      'NO HAY PENDIENTES',
      'SIN TRABAJOS PENDIENTES',
      'SIN RECOMENDACIONES',
      'NO PRESENTA RECOMENDACIONES',
      'NO HAY RECOMENDACIONES',
      'SIN NOVEDAD',
      'SIN NOVEDADES',
      'NULL',
      'UNDEFINED',
    ];

    if (placeholders.includes(upperFinal)) return true;

    // Si solo contiene puntos, guiones, asteriscos, barras o espacios
    if (/^[._\s*/\\-]+$/.test(limpio)) return true;

    return false;
  }

  /**
   * Adapta los datos genéricos de orden al formato específico de correctivo
   * ✅ REDISEÑO 06-FEB-2026: Cada campo estructurado va directo al template como campo dedicado
   * Ya no se usa tabla checklist B/M/C/NA ni blob HTML de observaciones
   */
  private adaptarDatosParaCorrectivo(
    datos: DatosOrdenPDF,
    branding?: OrgBrandingContext,
  ): DatosCorrectivoOrdenPDF {
    // ═══════════════════════════════════════════════════════════════════════════
    // PASO 1: Extraer datos estructurados de observaciones de actividades
    // Los widgets móviles guardan datos con prefijos: ESTADO_INICIAL:, PROBLEMA:, etc.
    // ═══════════════════════════════════════════════════════════════════════════
    const obsParaParsear =
      [datos.observaciones, datos.observaciones_tecnico].filter(Boolean).join('\n') || undefined;
    const ext = this.extraerDatosEstructuradosCorrectivo(datos.actividades || [], obsParaParsear);

    // ✅ MULTI-EQUIPO: Extraer datos estructurados POR equipo
    // Cuando es multi-equipo, extraerDatosEstructuradosCorrectivo sobre el array plano
    // sobreescribe los valores de cada equipo (queda solo el último). Debemos procesar
    // cada grupo de actividadesPorEquipo por separado.
    let datosPorEquipo: DatosEstructuradosCorrectivoPorEquipo[] | undefined = undefined;
    const esMulti =
      datos.esMultiEquipo && datos.actividadesPorEquipo && datos.actividadesPorEquipo.length > 1;
    if (esMulti && datos.actividadesPorEquipo) {
      datosPorEquipo = datos.actividadesPorEquipo.map((grupo) => {
        const extEquipo = this.extraerDatosEstructuradosCorrectivo(
          grupo.actividades.map((a) => ({
            observaciones: a.observaciones,
            descripcion: a.descripcion,
            rolSemantico: a.rolSemantico,
            respuestaJson: a.respuestaJson,
          })),
        );
        return {
          equipo: grupo.equipo,
          estadoInicial: this.esTextoVacioOSinContenido(extEquipo.estadoInicial)
            ? undefined
            : extEquipo.estadoInicial,
          estadoFinal: this.esTextoVacioOSinContenido(extEquipo.estadoFinal)
            ? undefined
            : extEquipo.estadoFinal,
          problemaReportado: this.esTextoVacioOSinContenido(extEquipo.problema)
            ? undefined
            : extEquipo.problema,
          fallasObservadas: this.esTextoVacioOSinContenido(extEquipo.sintomas)
            ? undefined
            : extEquipo.sintomas,
          diagnosticoTecnico: this.esTextoVacioOSinContenido(extEquipo.diagnostico)
            ? undefined
            : extEquipo.diagnostico,
          trabajosRealizados: this.esTextoVacioOSinContenido(extEquipo.trabajos)
            ? undefined
            : extEquipo.trabajos,
          trabajosPendientes: this.esTextoVacioOSinContenido(extEquipo.pendientes)
            ? undefined
            : extEquipo.pendientes,
          recomendaciones: this.esTextoVacioOSinContenido(extEquipo.recomendaciones)
            ? undefined
            : extEquipo.recomendaciones,
          sistemasAfectados:
            extEquipo.sistemasAfectados.length > 0 ? extEquipo.sistemasAfectados : undefined,
          repuestosUtilizados: extEquipo.repuestos.length > 0 ? extEquipo.repuestos : undefined,
          materialesUtilizados: extEquipo.materiales.length > 0 ? extEquipo.materiales : undefined,
          obsEstadoInicial: this.esTextoVacioOSinContenido(extEquipo.obsEstadoInicial)
            ? undefined
            : extEquipo.obsEstadoInicial,
          obsEstadoFinal: this.esTextoVacioOSinContenido(extEquipo.obsEstadoFinal)
            ? undefined
            : extEquipo.obsEstadoFinal,
          obsProblema: this.esTextoVacioOSinContenido(extEquipo.obsProblema)
            ? undefined
            : extEquipo.obsProblema,
          obsFallas: this.esTextoVacioOSinContenido(extEquipo.obsFallas)
            ? undefined
            : extEquipo.obsFallas,
          obsDiagnostico: this.esTextoVacioOSinContenido(extEquipo.obsDiagnostico)
            ? undefined
            : extEquipo.obsDiagnostico,
          obsTrabajos: this.esTextoVacioOSinContenido(extEquipo.obsTrabajos)
            ? undefined
            : extEquipo.obsTrabajos,
          obsPendientes: this.esTextoVacioOSinContenido(extEquipo.obsPendientes)
            ? undefined
            : extEquipo.obsPendientes,
          obsRecomendaciones: this.esTextoVacioOSinContenido(extEquipo.obsRecomendaciones)
            ? undefined
            : extEquipo.obsRecomendaciones,
          obsRepuestos: this.esTextoVacioOSinContenido(extEquipo.obsRepuestos)
            ? undefined
            : extEquipo.obsRepuestos,
          obsMateriales: this.esTextoVacioOSinContenido(extEquipo.obsMateriales)
            ? undefined
            : extEquipo.obsMateriales,
          obsSistemas: this.esTextoVacioOSinContenido(extEquipo.obsSistemas)
            ? undefined
            : extEquipo.obsSistemas,
        };
      });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PASO 2: Filtrar mediciones con valor para renderizado condicional
    // ═══════════════════════════════════════════════════════════════════════════
    const medicionesConValor = (datos.mediciones || [])
      .filter((m) => m.valor !== null && m.valor !== undefined && m.valor !== 0)
      .map((m) => ({
        parametro: m.parametro,
        valorDespues: String(m.valor),
        unidad: m.unidad,
        estado: m.nivelAlerta || 'OK',
      }));

    // ═══════════════════════════════════════════════════════════════════════════
    // PASO 3: Extraer datos del módulo de control desde mediciones
    // ═══════════════════════════════════════════════════════════════════════════
    const datosModulo = this.extraerDatosModuloDesdelMediciones(datos.mediciones || []);

    // ═══════════════════════════════════════════════════════════════════════════
    // PASO 4: Construir objeto con campos dedicados (NO blob HTML)
    // Cada campo se renderiza en su sección propia del template
    // ═══════════════════════════════════════════════════════════════════════════

    return {
      // --- Datos generales ---
      numeroOrden: datos.numeroOrden,
      fecha: datos.fecha,
      // ✅ FIX 20-AGO-2026: Fecha de salida + flag de días distintos
      fechaSalida: datos.fechaSalida,
      diasDiferentes: datos.diasDiferentes,
      horaEntrada: datos.horaEntrada,
      horaSalida: datos.horaSalida,
      tipoServicio: 'CORRECTIVO',
      cliente: datos.cliente,
      direccion: datos.direccion,
      tipoEquipo: datos.tipoEquipo || 'EQUIPO',
      marcaEquipo: datos.marcaEquipo,
      modeloEquipo: '',
      serieEquipo: datos.serieEquipo,
      tecnico: datos.tecnico,

      // --- Campos dedicados por naturaleza de actividad ---
      estadoInicial: this.esTextoVacioOSinContenido(ext.estadoInicial)
        ? undefined
        : ext.estadoInicial,
      estadoFinal: this.esTextoVacioOSinContenido(ext.estadoFinal) ? undefined : ext.estadoFinal,
      problemaReportado: this.esTextoVacioOSinContenido(ext.problema) ? undefined : ext.problema,
      fallasObservadas: this.esTextoVacioOSinContenido(ext.sintomas) ? undefined : ext.sintomas,
      diagnosticoTecnico: this.esTextoVacioOSinContenido(ext.diagnostico)
        ? undefined
        : ext.diagnostico,
      trabajosRealizados: this.esTextoVacioOSinContenido(ext.trabajos) ? undefined : ext.trabajos,
      trabajosPendientes: this.esTextoVacioOSinContenido(ext.pendientes)
        ? undefined
        : ext.pendientes,
      recomendaciones: this.esTextoVacioOSinContenido(ext.recomendaciones)
        ? undefined
        : ext.recomendaciones,
      sistemasAfectados: ext.sistemasAfectados.length > 0 ? ext.sistemasAfectados : undefined,
      repuestosUtilizados: (() => {
        const combinados = [...ext.repuestos];
        for (const itemWms of datos.repuestosWms || []) {
          if (itemWms && !combinados.some((r) => r.toLowerCase() === itemWms.toLowerCase())) {
            combinados.push(itemWms);
          }
        }
        return combinados.length > 0 ? combinados : undefined;
      })(),
      materialesUtilizados: ext.materiales.length > 0 ? ext.materiales : undefined,

      // ✅ FIX 06-FEB-2026: Observaciones auxiliares del técnico por actividad
      obsEstadoInicial: this.esTextoVacioOSinContenido(ext.obsEstadoInicial)
        ? undefined
        : ext.obsEstadoInicial,
      obsEstadoFinal: this.esTextoVacioOSinContenido(ext.obsEstadoFinal)
        ? undefined
        : ext.obsEstadoFinal,
      obsProblema: this.esTextoVacioOSinContenido(ext.obsProblema) ? undefined : ext.obsProblema,
      obsFallas: this.esTextoVacioOSinContenido(ext.obsFallas) ? undefined : ext.obsFallas,
      obsDiagnostico: this.esTextoVacioOSinContenido(ext.obsDiagnostico)
        ? undefined
        : ext.obsDiagnostico,
      obsTrabajos: this.esTextoVacioOSinContenido(ext.obsTrabajos) ? undefined : ext.obsTrabajos,
      obsPendientes: this.esTextoVacioOSinContenido(ext.obsPendientes)
        ? undefined
        : ext.obsPendientes,
      obsRecomendaciones: this.esTextoVacioOSinContenido(ext.obsRecomendaciones)
        ? undefined
        : ext.obsRecomendaciones,
      obsRepuestos: this.esTextoVacioOSinContenido(ext.obsRepuestos) ? undefined : ext.obsRepuestos,
      obsMateriales: this.esTextoVacioOSinContenido(ext.obsMateriales)
        ? undefined
        : ext.obsMateriales,
      obsSistemas: this.esTextoVacioOSinContenido(ext.obsSistemas) ? undefined : ext.obsSistemas,

      // --- Mediciones y módulo ---
      mediciones: medicionesConValor.length > 0 ? medicionesConValor : undefined,
      datosModulo,

      // --- Observaciones generales (solo textarea del técnico, sin duplicar campos) ---
      observacionesGenerales: this.esTextoVacioOSinContenido(datos.observaciones)
        ? undefined
        : datos.observaciones,

      // --- Multi-equipos ---
      esMultiEquipo: datos.esMultiEquipo,
      actividadesPorEquipo: datos.actividadesPorEquipo,
      medicionesPorEquipo: datos.medicionesPorEquipo,
      evidenciasPorEquipo: datos.evidenciasPorEquipo,

      // ✅ MULTI-EQUIPO: Datos estructurados por equipo (para renderizar secciones separadas)
      datosPorEquipo,

      // --- Evidencias con tipo para agrupación ---
      // ✅ FIX 06-FEB-2026: Reconocer GENERAL y MEDICION además de ANTES/DURANTE/DESPUES
      evidencias: (datos.evidencias || []).map((e) => {
        const caption = typeof e === 'string' ? undefined : e.caption;
        const tipoMatch = caption?.match(
          /^(ANTES|DURANTE|DESPUES|DESPUÉS|MEDICION|MEDICIÓN|GENERAL):/i,
        );
        type TipoEvidencia = 'ANTES' | 'DURANTE' | 'DESPUES' | 'GENERAL' | 'MEDICION';
        let tipo: TipoEvidencia = 'DURANTE';
        if (tipoMatch) {
          const raw = tipoMatch[1].toUpperCase();
          if (raw === 'DESPUÉS') tipo = 'DESPUES';
          else if (raw === 'MEDICIÓN') tipo = 'MEDICION';
          else tipo = raw as TipoEvidencia;
        }
        // ✅ FIX 20-AGO-2026: Preservar idLote para agrupar fotos generales por lote
        return {
          tipo,
          url: typeof e === 'string' ? e : e.url,
          descripcion: caption,
          idLote: typeof e === 'string' ? undefined : (e as any).idLote,
        };
      }),

      // ✅ FIX 20-AGO-2026: Lotes de galería (contenedores independientes en el PDF)
      lotesGaleria: datos.lotesGaleria,

      // --- Firmas ---
      firmaTecnico: datos.firmaTecnico,
      firmaCliente: datos.firmaCliente,
      nombreTecnico: datos.nombreTecnico,
      cargoTecnico: datos.cargoTecnico,
      nombreCliente: datos.nombreCliente,
      cargoCliente: datos.cargoCliente,
      repuestosDetallados: datos.repuestosDetallados,
      equipoDetalle: datos.equipoDetalle,
      placaUniversal: datos.placaUniversal,
      branding: branding || datos.branding,
    };
  }

  /**
   * ✅ FIX 02-FEB-2026: Extrae datos estructurados de las observaciones de actividades correctivas
   * Los widgets móviles guardan datos con prefijos como ESTADO_INICIAL:, PROBLEMA:, etc.
   */
  private extraerDatosEstructuradosCorrectivo(
    actividades: Array<{
      observaciones?: string;
      descripcion?: string;
      rolSemantico?: string | null;
      respuestaJson?: any;
    }>,
    ordenObservaciones?: string,
  ): {
    estadoInicial: string;
    estadoFinal: string;
    sistemasAfectados: string[];
    problema: string;
    sintomas: string;
    diagnostico: string;
    trabajos: string;
    pendientes: string;
    recomendaciones: string;
    repuestos: string[];
    materiales: string[];
    obsEstadoInicial: string;
    obsEstadoFinal: string;
    obsSistemas: string;
    obsProblema: string;
    obsFallas: string;
    obsDiagnostico: string;
    obsTrabajos: string;
    obsPendientes: string;
    obsRecomendaciones: string;
    obsRepuestos: string;
    obsMateriales: string;
  } {
    const resultado = {
      estadoInicial: '',
      estadoFinal: '',
      sistemasAfectados: [] as string[],
      problema: '',
      sintomas: '',
      diagnostico: '',
      trabajos: '',
      pendientes: '',
      recomendaciones: '',
      repuestos: [] as string[],
      materiales: [] as string[],
      obsEstadoInicial: '',
      obsEstadoFinal: '',
      obsSistemas: '',
      obsProblema: '',
      obsFallas: '',
      obsDiagnostico: '',
      obsTrabajos: '',
      obsPendientes: '',
      obsRecomendaciones: '',
      obsRepuestos: '',
      obsMateriales: '',
    };

    const mapaDescripcionCampo: Record<string, keyof typeof resultado> = {
      'ESTADO INICIAL DEL EQUIPO': 'estadoInicial',
      'ESTADO FINAL DEL EQUIPO': 'estadoFinal',
      'SISTEMAS AFECTADOS': 'sistemasAfectados',
      'DESCRIPCIÓN DEL PROBLEMA REPORTADO': 'problema',
      'PROBLEMA REPORTADO': 'problema',
      'FALLAS OBSERVADAS': 'sintomas',
      DIAGNÓSTICO: 'diagnostico',
      DIAGNOSTICO: 'diagnostico',
      'TRABAJOS REALIZADOS': 'trabajos',
      'TRABAJOS PENDIENTES': 'pendientes',
      RECOMENDACIONES: 'recomendaciones',
      'REPUESTOS UTILIZADOS': 'repuestos',
      'MATERIALES E INSUMOS': 'materiales',
      MATERIALES: 'materiales',
    };

    const mapaRolSemanticoCampo: Record<string, keyof typeof resultado> = {
      CORR_ESTADO_INICIAL: 'estadoInicial',
      CORR_ESTADO_FINAL: 'estadoFinal',
      CORR_SISTEMAS_AFECTADOS: 'sistemasAfectados',
      CORR_PROBLEMA: 'problema',
      CORR_FALLAS: 'sintomas',
      CORR_DIAGNOSTICO: 'diagnostico',
      CORR_TRABAJOS: 'trabajos',
      CORR_PENDIENTES: 'pendientes',
      CORR_RECOMENDACIONES: 'recomendaciones',
      CORR_REPUESTOS: 'repuestos',
      CORR_MATERIALES: 'materiales',
    };

    for (const actividad of actividades) {
      const obsRaw = actividad.observaciones || '';
      const partes = obsRaw.split('|||');
      const obs = partes[0].trim();
      const obsAux = partes.length > 1 ? partes.slice(1).join(' ').trim() : '';

      let matched = false;

      // Fase 6: Priorizar rol_semantico + respuestaJson si existen
      const rol = actividad.rolSemantico?.toUpperCase().trim();
      const campoPorRol = rol ? mapaRolSemanticoCampo[rol] : undefined;
      if (campoPorRol) {
        const respObj =
          actividad.respuestaJson && typeof actividad.respuestaJson === 'object'
            ? actividad.respuestaJson
            : null;
        const valRaw =
          (Array.isArray(respObj?.seleccionados) ? respObj.seleccionados.join(', ') : null) ??
          (Array.isArray(respObj?.items) ? respObj.items.join('; ') : null) ??
          respObj?.texto ??
          respObj?.etiqueta ??
          respObj?.valor ??
          obs
            .replace(
              /^(?:ESTADO_INICIAL|ESTADO_FINAL|SISTEMAS|PROBLEMA|SINTOMAS|FALLAS|DIAGNOSTICO|TRABAJOS|PENDIENTES|RECOMENDACIONES|REPUESTOS|MATERIALES):\s*/i,
              '',
            )
            .trim();
        const val = String(valRaw || '').trim();
        if (val && !this.esTextoVacioOSinContenido(val)) {
          if (campoPorRol === 'sistemasAfectados') {
            resultado.sistemasAfectados = val
              .split(',')
              .map((s) => s.trim())
              .filter((s) => s && !this.esTextoVacioOSinContenido(s))
              .map((s) => this.mapearSistema(s));
          } else if (campoPorRol === 'repuestos') {
            resultado.repuestos = val
              .split('; ')
              .map((s) => s.trim())
              .filter((s) => s && s !== '(Ninguno)' && !this.esTextoVacioOSinContenido(s));
          } else if (campoPorRol === 'materiales') {
            resultado.materiales = val
              .split('; ')
              .map((s) => s.trim())
              .filter((s) => s && s !== '(Ninguno)' && !this.esTextoVacioOSinContenido(s));
          } else if (campoPorRol === 'estadoInicial') {
            resultado.estadoInicial = this.mapearEstadoInicial(val);
          } else if (campoPorRol === 'estadoFinal') {
            resultado.estadoFinal = this.mapearEstadoFinal(val);
          } else {
            (resultado as any)[campoPorRol] = val;
          }
          if (obsAux && !this.esTextoVacioOSinContenido(obsAux)) {
            const auxKey =
              `obs${campoPorRol.charAt(0).toUpperCase()}${campoPorRol.slice(1)}` as keyof typeof resultado;
            if (auxKey in resultado && typeof resultado[auxKey] === 'string') {
              (resultado as any)[auxKey] = obsAux;
            }
          }
          matched = true;
        }
      }

      if (matched) {
        // Ya resuelto deterministicamente por rol_semantico
      } else if (/^ESTADO_INICIAL:\s*/i.test(obs)) {
        const val = obs.replace(/^ESTADO_INICIAL:\s*/i, '').trim();
        if (!this.esTextoVacioOSinContenido(val))
          resultado.estadoInicial = this.mapearEstadoInicial(val);
        if (obsAux && !this.esTextoVacioOSinContenido(obsAux)) resultado.obsEstadoInicial = obsAux;
        matched = true;
      } else if (/^ESTADO_FINAL:\s*/i.test(obs)) {
        const val = obs.replace(/^ESTADO_FINAL:\s*/i, '').trim();
        if (!this.esTextoVacioOSinContenido(val))
          resultado.estadoFinal = this.mapearEstadoFinal(val);
        if (obsAux && !this.esTextoVacioOSinContenido(obsAux)) resultado.obsEstadoFinal = obsAux;
        matched = true;
      } else if (/^SISTEMAS:\s*/i.test(obs)) {
        const val = obs.replace(/^SISTEMAS:\s*/i, '').trim();
        const sistemas = val
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s && !this.esTextoVacioOSinContenido(s));
        resultado.sistemasAfectados = sistemas.map((s) => this.mapearSistema(s));
        if (obsAux && !this.esTextoVacioOSinContenido(obsAux)) resultado.obsSistemas = obsAux;
        matched = true;
      } else if (/^PROBLEMA:\s*/i.test(obs)) {
        const val = obs.replace(/^PROBLEMA:\s*/i, '').trim();
        if (!this.esTextoVacioOSinContenido(val)) resultado.problema = val;
        if (obsAux && !this.esTextoVacioOSinContenido(obsAux)) resultado.obsProblema = obsAux;
        matched = true;
      } else if (/^(SINTOMAS|FALLAS):\s*/i.test(obs)) {
        const val = obs.replace(/^(SINTOMAS|FALLAS):\s*/i, '').trim();
        if (!this.esTextoVacioOSinContenido(val)) resultado.sintomas = val;
        if (obsAux && !this.esTextoVacioOSinContenido(obsAux)) resultado.obsFallas = obsAux;
        matched = true;
      } else if (/^DIAGNOSTICO:\s*/i.test(obs)) {
        const val = obs.replace(/^DIAGNOSTICO:\s*/i, '').trim();
        if (!this.esTextoVacioOSinContenido(val)) resultado.diagnostico = val;
        if (obsAux && !this.esTextoVacioOSinContenido(obsAux)) resultado.obsDiagnostico = obsAux;
        matched = true;
      } else if (/^TRABAJOS:\s*/i.test(obs)) {
        const val = obs.replace(/^TRABAJOS:\s*/i, '').trim();
        if (!this.esTextoVacioOSinContenido(val)) resultado.trabajos = val;
        if (obsAux && !this.esTextoVacioOSinContenido(obsAux)) resultado.obsTrabajos = obsAux;
        matched = true;
      } else if (/^PENDIENTES:\s*/i.test(obs)) {
        const val = obs.replace(/^PENDIENTES:\s*/i, '').trim();
        if (!this.esTextoVacioOSinContenido(val)) resultado.pendientes = val;
        if (obsAux && !this.esTextoVacioOSinContenido(obsAux)) resultado.obsPendientes = obsAux;
        matched = true;
      } else if (/^RECOMENDACIONES:\s*/i.test(obs)) {
        const val = obs.replace(/^RECOMENDACIONES:\s*/i, '').trim();
        if (!this.esTextoVacioOSinContenido(val)) resultado.recomendaciones = val;
        if (obsAux && !this.esTextoVacioOSinContenido(obsAux))
          resultado.obsRecomendaciones = obsAux;
        matched = true;
      } else if (/^REPUESTOS:\s*/i.test(obs)) {
        const val = obs.replace(/^REPUESTOS:\s*/i, '').trim();
        const items = val
          .split('; ')
          .map((s) => s.trim())
          .filter((s) => s && s !== '(Ninguno)' && !this.esTextoVacioOSinContenido(s));
        resultado.repuestos = items;
        if (obsAux && !this.esTextoVacioOSinContenido(obsAux)) resultado.obsRepuestos = obsAux;
        matched = true;
      } else if (/^MATERIALES:\s*/i.test(obs)) {
        const val = obs.replace(/^MATERIALES:\s*/i, '').trim();
        const items = val
          .split('; ')
          .map((s) => s.trim())
          .filter((s) => s && s !== '(Ninguno)' && !this.esTextoVacioOSinContenido(s));
        resultado.materiales = items;
        if (obsAux && !this.esTextoVacioOSinContenido(obsAux)) resultado.obsMateriales = obsAux;
        matched = true;
      }

      if (!matched && obs && actividad.descripcion) {
        // ✅ Evitar asignar texto vacío o placeholder
        if (!this.esTextoVacioOSinContenido(obs)) {
          const descUpper = actividad.descripcion.toUpperCase().trim();
          const campo = mapaDescripcionCampo[descUpper];
          if (campo) {
            if (campo === 'sistemasAfectados') {
              const sistemas = obs
                .split(',')
                .map((s) => s.trim())
                .filter((s) => s && !this.esTextoVacioOSinContenido(s));
              resultado.sistemasAfectados = sistemas.map((s) => this.mapearSistema(s));
            } else if (campo === 'repuestos') {
              const items = obs
                .split('; ')
                .map((s) => s.trim())
                .filter((s) => s && s !== '(Ninguno)' && !this.esTextoVacioOSinContenido(s));
              resultado.repuestos = items;
            } else if (campo === 'materiales') {
              const items = obs
                .split('; ')
                .map((s) => s.trim())
                .filter((s) => s && s !== '(Ninguno)' && !this.esTextoVacioOSinContenido(s));
              resultado.materiales = items;
            } else if (campo === 'estadoInicial') {
              resultado.estadoInicial = this.mapearEstadoInicial(obs);
            } else if (campo === 'estadoFinal') {
              resultado.estadoFinal = this.mapearEstadoFinal(obs);
            } else {
              (resultado as any)[campo] = obs;
            }
          }
        }
      }
    }

    if (ordenObservaciones) {
      for (const linea of ordenObservaciones.split('\n')) {
        const trimLinea = linea.trim();
        if (/^DIAGNOSTICO:\s*/i.test(trimLinea) && !resultado.diagnostico) {
          const val = trimLinea.replace(/^DIAGNOSTICO:\s*/i, '').trim();
          if (!this.esTextoVacioOSinContenido(val)) resultado.diagnostico = val;
        } else if (/^(SINTOMAS|FALLAS):\s*/i.test(trimLinea) && !resultado.sintomas) {
          const val = trimLinea.replace(/^(SINTOMAS|FALLAS):\s*/i, '').trim();
          if (!this.esTextoVacioOSinContenido(val)) resultado.sintomas = val;
        } else if (/^TRABAJOS:\s*/i.test(trimLinea) && !resultado.trabajos) {
          const val = trimLinea.replace(/^TRABAJOS:\s*/i, '').trim();
          if (!this.esTextoVacioOSinContenido(val)) resultado.trabajos = val;
        }
      }
    }

    return resultado;
  }

  /** Mapea códigos de estado inicial a texto legible */
  private mapearEstadoInicial(codigo: string): string {
    const mapa: Record<string, string> = {
      OPERATIVO: '✅ Equipo Operativo',
      PARADO: '🛑 Equipo Parado',
      FALLA_INTERMITENTE: '⚠️ Falla Intermitente',
      INACCESIBLE: '🚫 Inaccesible para Inspección',
    };
    return mapa[codigo] || codigo;
  }

  /** Mapea códigos de estado final a texto legible */
  private mapearEstadoFinal(codigo: string): string {
    const mapa: Record<string, string> = {
      OPERATIVO: '✅ Equipo Operativo',
      REPARACION_PARCIAL: '⚠️ Reparación Parcial',
      REQUIERE_REPUESTOS: '🔧 Requiere Repuestos',
      FUERA_SERVICIO: '🛑 Fuera de Servicio',
    };
    return mapa[codigo] || codigo;
  }

  /** Mapea códigos de sistema a texto legible */
  private mapearSistema(codigo: string): string {
    const mapa: Record<string, string> = {
      // Sistemas de Generador
      MOTOR: 'Motor Diesel/Gas',
      GENERADOR: 'Generador Eléctrico',
      ELECTRONICO: 'Sistema Electrónico',
      ELECTRICO: 'Sistema Eléctrico',
      CONTROL: 'Módulo de Control',
      ENFRIAMIENTO: 'Sistema de Enfriamiento',
      REFRIGERACION: 'Sistema de Refrigeración',
      COMBUSTIBLE: 'Sistema de Combustible',
      LUBRICACION: 'Sistema de Lubricación',
      ESCAPE: 'Sistema de Escape',
      ASPIRACION: 'Sistema de Aspiración',
      ARRANQUE: 'Sistema de Arranque',
      ALTERNADOR: 'Alternador/Generador',
      TRANSFERENCIA: 'Transferencia Automática',
      // ✅ 09-FEB-2026: Sistemas de Bomba (BOM_CORR)
      HIDRAULICO: 'Sistema Hidráulico',
      MECANICO: 'Sistema Mecánico',
      PRESOSTATO: 'Presostato / Control de Presión',
      SELLO: 'Sellos Mecánicos / Empaquetadura',
      TANQUE: 'Tanques Hidroneumáticos',
      TABLERO: 'Tablero de Control',
      VALVULAS: 'Válvulas de Operación',
      TUBERIA: 'Tubería y Accesorios',
      OTRO: 'Otro',
    };
    return mapa[codigo] || codigo;
  }

  /**
   * ✅ FIX 02-FEB-2026: Extrae datos del módulo de control desde las mediciones
   * Mapea nombres de parámetros a campos del módulo
   */
  private extraerDatosModuloDesdelMediciones(
    mediciones: Array<{ parametro: string; valor?: number | null; unidad?: string | null }>,
  ): {
    rpm?: number;
    presionAceite?: number;
    temperaturaRefrigerante?: number;
    cargaBateria?: number;
    horasTrabajo?: number;
    voltaje?: number;
    frecuencia?: number;
    corriente?: number;
  } {
    const modulo: Record<string, number | undefined> = {};

    for (const m of mediciones) {
      if (m.valor == null) continue;
      const param = m.parametro.toLowerCase();
      const unidad = String(m.unidad || '').toLowerCase();

      // Mapeo flexible de nombres de parámetros (solo RPM reales, nunca m/s ni otras magnitudes)
      if (
        param.includes('rpm') ||
        (param.includes('velocidad') && (!unidad || unidad.includes('rpm')))
      ) {
        modulo.rpm = m.valor;
      } else if (param.includes('presion') && param.includes('aceite')) {
        modulo.presionAceite = m.valor;
      } else if (param.includes('temp') && (param.includes('refrig') || param.includes('agua'))) {
        modulo.temperaturaRefrigerante = m.valor;
      } else if (param.includes('bateria') || param.includes('carga')) {
        modulo.cargaBateria = m.valor;
      } else if (param.includes('hora') && param.includes('trabajo')) {
        modulo.horasTrabajo = m.valor;
      } else if (param.includes('voltaje') || param.includes('tension')) {
        modulo.voltaje = m.valor;
      } else if (param.includes('frecuencia') || param.includes('hz')) {
        modulo.frecuencia = m.valor;
      } else if (param.includes('corriente') || param.includes('amper')) {
        modulo.corriente = m.valor;
      }
    }

    return modulo;
  }

  /**
   * Genera nombre de archivo neutro parametrizado por la organización.
   */
  private generarFilename(
    tipo: TipoInforme,
    numeroOrden: string,
    brand: OrgBrandingContext = resolveOrgBranding(),
  ): string {
    const fecha = new Date().toISOString().split('T')[0];
    const tipoNombreMap: Record<TipoInforme, string> = {
      GENERADOR_A: 'Preventivo_A_Generador',
      GENERADOR_B: 'Preventivo_B_Generador',
      BOMBA_A: 'Preventivo_A_Bomba',
      UNIVERSAL_EAM: 'Informe_Servicio_EAM',
      CORRECTIVO: 'Correctivo',
      COTIZACION: 'Cotizacion',
      PROPUESTA_CORRECTIVO: 'Propuesta_Correctivo',
      REMISION: 'Remision',
      ORDEN_COMPRA: 'Orden_Compra',
      TRAZABILIDAD: 'Trazabilidad',
    };
    const tipoNombre = tipoNombreMap[tipo] || 'Informe';
    const refSanitizada = String(numeroOrden || 'DOC').replace(/[^a-zA-Z0-9-_]/g, '_');

    return `${this.slugEmpresa(brand)}_${tipoNombre}_${refSanitizada}_${fecha}.pdf`;
  }

  /**
   * Lanza una instancia aislada de Chromium/Chrome preinstalada en el host/contenedor.
   * Nunca ejecuta descargas/instalaciones en tiempo de petición HTTP.
   */
  private async launchBrowser(): Promise<puppeteer.Browser> {
    const isWindows = process.platform === 'win32';
    const defaultCacheDir = isWindows
      ? path.join(process.env.USERPROFILE || process.env.HOME || '.', '.cache', 'puppeteer')
      : '/tmp/.cache/puppeteer';
    const cacheDir = process.env.PUPPETEER_CACHE_DIR || defaultCacheDir;

    this.logger.log('🚀 Lanzando Puppeteer browser aislado...');

    try {
      const envExec = process.env.PUPPETEER_EXECUTABLE_PATH?.trim();
      const executablePath =
        envExec && fs.existsSync(envExec) ? envExec : this.resolverChromePath(cacheDir);

      if (!executablePath) {
        throw new Error(
          'Chromium/Chrome no está preinstalado. Defina PUPPETEER_EXECUTABLE_PATH o instale Chrome en el paso de build/Dockerfile.',
        );
      }

      const baseArgs = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-sync',
        '--no-first-run',
        '--disable-popup-blocking',
      ];

      const linuxOnlyArgs = isWindows
        ? []
        : [
            '--single-process',
            '--no-zygote',
            '--disable-accelerated-2d-canvas',
            '--disable-accelerated-jpeg-decoding',
            '--disable-accelerated-mjpeg-decode',
            '--disable-accelerated-video-decode',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-breakpad',
            '--disable-component-extensions-with-background-pages',
            '--disable-component-update',
            '--disable-features=TranslateUI',
            '--disable-hang-monitor',
            '--disable-ipc-flooding-protection',
            '--disable-prompt-on-repost',
            '--disable-renderer-backgrounding',
            '--enable-features=NetworkService,NetworkServiceInProcess',
            '--force-color-profile=srgb',
            '--metrics-recording-only',
            '--safebrowsing-disable-auto-update',
            '--js-flags=--max-old-space-size=256',
            '--memory-pressure-off',
          ];

      return await puppeteer.launch({
        headless: true,
        executablePath,
        protocolTimeout: 120000,
        args: [...baseArgs, ...linuxOnlyArgs],
      });
    } catch (error: any) {
      this.logger.error(`❌ Error inicializando Puppeteer: ${error.message}`);
      this.logger.error(`📍 Cache path configurado: ${cacheDir}`);
      throw new InternalServerErrorException(
        `Error inicializando generador de PDF: ${error.message}`,
      );
    }
  }

  /**
   * ✅ NEW 09-JUN-2026: Resuelve la ruta de Chrome de forma robusta y cross-platform
   * Busca en múltiples ubicaciones con orden de prioridad:
   * 1. puppeteer.executablePath() (respeta .puppeteerrc.cjs)
   * 2. PUPPETEER_CACHE_DIR (env var explícita)
   * 3. Rutas comunes del sistema según plataforma
   */
  private resolverChromePath(cacheDir: string): string | null {
    // 1. Intentar con puppeteer.executablePath() (usa .puppeteerrc.cjs)
    try {
      const defaultPath = puppeteer.executablePath();
      if (defaultPath && fs.existsSync(defaultPath)) {
        this.logger.log(`📍 Chrome vía puppeteer.executablePath(): ${defaultPath}`);
        return defaultPath;
      }
    } catch {
      // executablePath puede lanzar si no encuentra el binario
    }

    // 2. Buscar en PUPPETEER_CACHE_DIR (escaneo de directorios de versión)
    if (cacheDir && fs.existsSync(cacheDir)) {
      const chromeDirBase = path.join(cacheDir, 'chrome');
      if (fs.existsSync(chromeDirBase)) {
        try {
          const versions = fs
            .readdirSync(chromeDirBase)
            .filter((d: string) => fs.statSync(path.join(chromeDirBase, d)).isDirectory())
            .sort()
            .reverse(); // Más reciente primero

          for (const version of versions) {
            const isWindows = process.platform === 'win32';
            // En Windows: chrome/win64-XXX/chrome-win64/chrome.exe
            // En Linux:   chrome/linux-XXX/chrome-linux64/chrome
            const candidates = isWindows
              ? [path.join(chromeDirBase, version, 'chrome-win64', 'chrome.exe')]
              : [
                  path.join(chromeDirBase, version, 'chrome-linux64', 'chrome'),
                  path.join(chromeDirBase, version, 'chrome'),
                ];

            for (const candidate of candidates) {
              if (fs.existsSync(candidate)) {
                this.logger.log(`📍 Chrome vía PUPPETEER_CACHE_DIR scan: ${candidate}`);
                return candidate;
              }
            }
          }
        } catch (e) {
          this.logger.warn(
            `⚠️ Error escaneando cacheDir ${chromeDirBase}: ${(e as Error).message}`,
          );
        }
      }
    }

    // 3. Buscar en ubicaciones comunes del sistema
    const isWindows = process.platform === 'win32';
    const systemPaths = isWindows
      ? [
          path.join(
            process.env.PROGRAMFILES || 'C:\\Program Files',
            'Google',
            'Chrome',
            'Application',
            'chrome.exe',
          ),
          path.join(
            process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)',
            'Google',
            'Chrome',
            'Application',
            'chrome.exe',
          ),
          path.join(
            process.env.LOCALAPPDATA || '',
            'Google',
            'Chrome',
            'Application',
            'chrome.exe',
          ),
        ]
      : [
          '/usr/bin/google-chrome',
          '/usr/bin/google-chrome-stable',
          '/usr/bin/chromium-browser',
          '/usr/bin/chromium',
        ];

    for (const sysPath of systemPaths) {
      if (sysPath && fs.existsSync(sysPath)) {
        this.logger.log(`📍 Chrome vía ruta del sistema: ${sysPath}`);
        return sysPath;
      }
    }

    this.logger.warn('⚠️ No se encontró Chrome en ninguna ubicación conocida');
    return null;
  }

  /**
   * Hook del ciclo de vida Nest (cada generación usa su propia instancia aislada y la cierra en finally).
   */
  async onModuleDestroy(): Promise<void> {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    if (this.sharedBrowser) {
      const b = this.sharedBrowser;
      this.sharedBrowser = null;
      await b.close().catch(() => {});
    }
    this.logger.log('🔒 PdfService finalizado');
  }

  /**
   * Determina el tipo de informe de forma declarativa desde tipos_servicio / tipos_equipo.
   * Por defecto converge todos los equipos preventivos/inspección hacia UNIVERSAL_EAM
   * y los narrativos (CORRECTIVO / EMERGENCIA / DIAGNOSTICO) hacia CORRECTIVO.
   * Mantiene enrutamiento legacy únicamente si la organización/arquetipo opta explícitamente
   * por usaPlantillaUniversal = false.
   */
  determinarTipoInforme(
    tipoEquipo: 'GENERADOR' | 'BOMBA' | 'MOTOR' | 'COMPRESOR' | string,
    tipoServicio: 'PREVENTIVO_A' | 'PREVENTIVO_B' | 'CORRECTIVO' | string,
    options?: {
      usaPlantillaUniversal?: boolean | null;
      formatoDocumento?: 'CHECKLIST_EAM' | 'NARRATIVO_CORRECTIVO' | string | null;
      categoriaServicio?: string | null;
    },
  ): TipoInforme {
    const formatoDoc = (options?.formatoDocumento || '').toUpperCase().trim();
    const catUpper = (options?.categoriaServicio || '').toUpperCase().trim();
    const tsUpper = (tipoServicio || '').toUpperCase().trim();

    if (
      formatoDoc === 'NARRATIVO_CORRECTIVO' ||
      ['CORRECTIVO', 'EMERGENCIA', 'DIAGNOSTICO'].includes(catUpper) ||
      tsUpper === 'CORRECTIVO' ||
      tsUpper === 'EMERGENCIA' ||
      tsUpper === 'DIAGNOSTICO' ||
      tsUpper.includes('CORR')
    ) {
      return 'CORRECTIVO';
    }

    if (options?.usaPlantillaUniversal === false) {
      const tEq = (tipoEquipo || '').toUpperCase().trim();
      if (tEq === 'BOMBA' || tEq === 'BOM') {
        return 'BOMBA_A';
      }
      if (tEq === 'GENERADOR' || tEq === 'GEN') {
        return tsUpper.includes('B') && !tsUpper.includes('A') ? 'GENERADOR_B' : 'GENERADOR_A';
      }
    }

    return 'UNIVERSAL_EAM';
  }

  /**
   * Genera un PDF de prueba con branding dinámico de la organización
   */
  async generarPDFPrueba(): Promise<PDFResult> {
    const brand = await this.resolveBranding();
    const datosPrueba: DatosOrdenPDF = {
      cliente: 'Cliente Demostración S.A.',
      direccion: [brand.direccionLinea1, brand.ciudadDefecto].filter(Boolean).join(', ') || 'Dirección Principal',
      marcaEquipo: 'Demo OEM',
      serieEquipo: 'EAM-2026-001',
      tipoEquipo: 'GENERADOR',
      fecha: formatDateOrg(new Date(), brand),
      tecnico: 'Técnico Especialista',
      horaEntrada: '08:00',
      horaSalida: '12:30',
      tipoServicio: 'PREVENTIVO_A',
      numeroOrden: 'ORD-DEMO-0001',
      branding: brand,
      datosModulo: {
        rpm: 1800,
        presionAceite: 65,
        temperaturaRefrigerante: 82,
        cargaBateria: 24,
        horasTrabajo: 1250,
        voltaje: 220,
        frecuencia: 60,
        corriente: 45,
      },
      actividades: [
        {
          sistema: 'ENFRIAMIENTO',
          descripcion: 'Revisar tapa de radiador',
          resultado: 'B',
          observaciones: '',
        },
        {
          sistema: 'ENFRIAMIENTO',
          descripcion: 'Revisar nivel de refrigerante',
          resultado: 'B',
          observaciones: '',
        },
        {
          sistema: 'ENFRIAMIENTO',
          descripcion: 'Revisar estado de mangueras',
          resultado: 'B',
          observaciones: '',
        },
        {
          sistema: 'ENFRIAMIENTO',
          descripcion: 'Revisar ventilador y correas',
          resultado: 'R',
          observaciones: 'Tensionar',
        },
        {
          sistema: 'COMBUSTIBLE',
          descripcion: 'Revisar nivel de combustible',
          resultado: 'B',
          observaciones: '',
        },
        {
          sistema: 'COMBUSTIBLE',
          descripcion: 'Revisar filtro de combustible',
          resultado: 'C',
          observaciones: 'Cambiar próximo servicio',
        },
        {
          sistema: 'LUBRICACION',
          descripcion: 'Revisar nivel de aceite',
          resultado: 'B',
          observaciones: '',
        },
        {
          sistema: 'ELECTRICO',
          descripcion: 'Revisar bornes de batería',
          resultado: 'B',
          observaciones: '',
        },
      ],
      mediciones: [
        { parametro: 'Temperatura Refrigerante', valor: 82, unidad: '°C', nivelAlerta: 'OK' },
        { parametro: 'Presión Aceite', valor: 65, unidad: 'PSI', nivelAlerta: 'OK' },
        { parametro: 'Voltaje Generador', valor: 220, unidad: 'V', nivelAlerta: 'OK' },
        { parametro: 'Frecuencia', valor: 60, unidad: 'Hz', nivelAlerta: 'OK' },
      ],
      evidencias: [],
      observaciones:
        'Equipo operando bajo parámetros normales de servicio.',
    };

    return this.generarPDF({
      tipoInforme: 'UNIVERSAL_EAM',
      datos: datosPrueba,
    });
  }

  // ==================== MÉTODO LEGACY (compatibilidad) ====================

  /**
   * @deprecated Use generarPDF() en su lugar
   */
  async generateOrdenServicioPdf(data: OrdenPdfData): Promise<Buffer> {
    const brand = await this.resolveBranding();
    const datosNuevo: DatosOrdenPDF = {
      cliente: data.clienteNombre || 'N/A',
      direccion: 'N/A',
      marcaEquipo: data.equipoNombre || 'N/A',
      serieEquipo: 'N/A',
      tipoEquipo: 'GENERADOR',
      fecha: formatDateOrg(data.fechaCreacion, brand),
      tecnico: data.tecnicoAsignado || 'N/A',
      horaEntrada: 'N/A',
      horaSalida: 'N/A',
      tipoServicio: 'PREVENTIVO_A',
      numeroOrden: data.numeroOrden,
      actividades: [],
      mediciones: [],
      evidencias: [],
      observaciones: data.observaciones || data.descripcion || '',
      branding: brand,
    };

    const result = await this.generarPDF({
      tipoInforme: 'UNIVERSAL_EAM',
      datos: datosNuevo,
    });

    return result.buffer;
  }

  // ==================== MÉTODOS PARA COTIZACIONES ====================

  /**
   * Genera un PDF para una cotización comercial con cierre simétrico de browser.
   */
  async generarPDFCotizacion(datosCotizacion: DatosCotizacionPDF): Promise<PDFResult> {
    try {
      this.logger.log(`📄 Generando PDF de Cotización: ${datosCotizacion.numeroCotizacion}`);
      const brand = await this.resolveBranding(datosCotizacion.branding);
      const html = this.obtenerHTML('COTIZACION', { ...datosCotizacion, branding: brand }, brand);
      const filename = this.generarFilename('COTIZACION', datosCotizacion.numeroCotizacion, brand);

      const escFooter = (s: string) =>
        s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      const ciudadPais = [brand.ciudadDefecto, brand.paisDefecto].filter(Boolean).join(', ');
      const footerFiscal = escFooter(
        [
          brand.razonSocial || brand.nombreComercial,
          brand.numeroIdFiscal
            ? `${brand.tipoIdFiscal || 'NIT'}: ${brand.numeroIdFiscal}`
            : null,
          ciudadPais || null,
        ]
          .filter(Boolean)
          .join(' · '),
      );
      const footerNota = brand.textoPiePdf?.trim() ? escFooter(brand.textoPiePdf.trim()) : '';
      const footerRight = escFooter(datosCotizacion.numeroCotizacion);

      const buffer = await this.renderHtmlToPdf(
        html,
        {
          format: 'A4',
          printBackground: true,
          margin: { top: '14mm', bottom: '18mm', left: '14mm', right: '14mm' },
          displayHeaderFooter: true,
          headerTemplate: '<div></div>',
          footerTemplate: `
          <div style="width: 100%; padding: 0 14mm; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 7.2px; color: #64748B;">
            <div style="border-top: 1px solid #E2E8F0; padding-top: 5px; display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
              <div style="min-width: 0; max-width: 74%; line-height: 1.35;">
                <div style="color: #475569; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${footerFiscal}</div>
                ${footerNota ? `<div style="color: #64748B; font-style: italic; font-size: 6.8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 1px;">${footerNota}</div>` : ''}
              </div>
              <div style="white-space: nowrap; font-variant-numeric: tabular-nums; color: #475569; font-weight: 500; padding-top: 0.5px;">${footerRight} · Página <span class="pageNumber"></span> de <span class="totalPages"></span></div>
            </div>
          </div>
        `,
          timeout: 60000,
        },
        0,
        true,
      );

      this.logger.log(`✅ PDF de cotización generado: ${filename} (${buffer.length} bytes)`);

      return {
        buffer,
        filename,
        size: buffer.length,
        tipoInforme: 'COTIZACION',
      };
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`❌ Error generando PDF de cotización: ${err.message}`, err.stack);
      throw new InternalServerErrorException('Error al generar el PDF de cotización');
    }
  }

  /**
   * Genera un PDF de cotización de prueba con datos neutrales y branding dinámico
   */
  async generarPDFCotizacionPrueba(): Promise<PDFResult> {
    const brand = await this.resolveBranding();
    const ivaPct = brand.tasaImpuestoDefecto ?? 19;
    const subtotalSrv = 1200;
    const subtotalComp = 450;
    const subtotalGen = subtotalSrv + subtotalComp;
    const descuento = 0;
    const ivaVal = Math.round((subtotalGen * ivaPct) / 100);

    const datosPrueba: DatosCotizacionPDF = {
      branding: brand,
      numeroCotizacion: 'COT-DEMO-0001',
      fechaCotizacion: formatDateOrg(new Date(), brand),
      fechaVencimiento: formatDateOrg(
        new Date(Date.now() + brand.validezCotizacionDiasDefecto * 86400000),
        brand,
      ),
      diasValidez: brand.validezCotizacionDiasDefecto,
      version: 1,
      cliente: {
        nombre: 'Cliente Demostración S.A.',
        nit: '000.000.000-0',
        direccion: brand.ciudadDefecto || 'Sede Principal',
        telefono: brand.telefonoPrincipal || '-',
        email: brand.emailContacto || 'contacto@cliente.example',
        contacto: 'Contacto de Compras',
      },
      asunto: 'Servicio Técnico Preventivo Programado',
      descripcionGeneral: 'Propuesta comercial de demostración White-Label',
      itemsServicios: [
        {
          orden: 1,
          descripcion: 'Mantenimiento Preventivo Programado',
          cantidad: 1,
          unidad: 'UND',
          precioUnitario: subtotalSrv,
          descuentoPorcentaje: 0,
          subtotal: subtotalSrv,
        },
      ],
      itemsComponentes: [
        {
          orden: 1,
          descripcion: 'Kit de Consumibles OEM',
          referencia: 'KIT-001',
          cantidad: 1,
          unidad: 'KIT',
          precioUnitario: subtotalComp,
          descuentoPorcentaje: 0,
          subtotal: subtotalComp,
        },
      ],
      totales: {
        subtotalServicios: subtotalSrv,
        subtotalComponentes: subtotalComp,
        subtotalGeneral: subtotalGen,
        descuentoPorcentaje: 0,
        descuentoValor: descuento,
        subtotalConDescuento: subtotalGen,
        ivaPorcentaje: ivaPct,
        ivaValor: ivaVal,
        totalCotizacion: subtotalGen + ivaVal,
      },
      formaPago: 'Crédito 30 días',
      tiempoEstimadoDias: 5,
      mesesGarantia: brand.garantiaMesesDefecto,
      observacionesGarantia: `${brand.garantiaMesesDefecto} meses sobre repuestos instalados y mano de obra`,
      terminosCondiciones: 'Condiciones comerciales estándar vigentes.',
      elaboradoPor: 'Asesor Comercial',
      cargoElaborador: 'Departamento Comercial',
    };

    return this.generarPDFCotizacion(datosPrueba);
  }

  /**
   * Genera el PDF Ejecutivo de Trazabilidad de Servicios por Cliente
   */
  async generarPDFTrazabilidadCliente(datos: DatosTrazabilidadClientePDF): Promise<PDFResult> {
    const startTime = Date.now();
    try {
      this.logger.log(
        `📄 Generando Informe Ejecutivo de Trazabilidad para: ${datos.cliente.nombre}`,
      );

      const brand = await this.resolveBranding(datos.branding);
      const html = this.obtenerHTML('TRAZABILIDAD', { ...datos, branding: brand }, brand);
      const filename = this.generarFilename('TRAZABILIDAD', datos.cliente.nombre, brand);
      const buffer = await this.renderHtmlToPdf(html);

      const elapsed = Date.now() - startTime;
      this.logger.log(
        `✅ PDF Trazabilidad listo en ${elapsed}ms: ${filename} (${(buffer.length / 1024).toFixed(2)} KB)`,
      );

      return {
        buffer,
        filename,
        size: buffer.length,
        tipoInforme: 'TRAZABILIDAD',
      };
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`❌ Error generando PDF de trazabilidad: ${err.message}`, err.stack);
      throw new InternalServerErrorException(
        `Error al generar PDF de trazabilidad: ${err.message}`,
      );
    }
  }
}
