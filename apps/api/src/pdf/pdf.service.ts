/**
 * PDF Service - MEKANOS S.A.S
 * 
 * Generación de PDFs profesionales con Puppeteer + Templates HTML
 * 
 * Templates disponibles:
 * - GENERADOR_A: Preventivo Tipo A para Generadores
 * - GENERADOR_B: Preventivo Tipo B (Cambio de filtros)
 * - BOMBA_A: Preventivo para Bombas
 * 
 * Colores MEKANOS:
 * #244673 - Azul Oscuro (principal)
 * #3290A6 - Azul Claro (secundario)
 * #56A672 - Verde (OK)
 * #9EC23D - Verde Claro (destacados)
 */

import { Injectable, InternalServerErrorException, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as puppeteer from 'puppeteer';
import {
  DatosCorrectivoOrdenPDF,
  DatosCotizacionPDF,
  DatosOrdenPDF,
  generarCorrectivoOrdenHTML,
  generarCotizacionHTML,
  generarTipoABombaHTML,
  generarTipoAGeneradorHTML,
  generarTipoBGeneradorHTML,
} from './templates';

export type TipoInforme = 'GENERADOR_A' | 'GENERADOR_B' | 'BOMBA_A' | 'CORRECTIVO' | 'COTIZACION' | 'PROPUESTA_CORRECTIVO' | 'REMISION' | 'ORDEN_COMPRA';

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
  private browser: puppeteer.Browser | null = null;
  private browserInitPromise: Promise<void> | null = null;

  /**
   * ✅ FIX 23-ENE-2026: NO pre-inicializar browser para ahorrar memoria
   * En Render Free Tier (512MB), mantener Chrome idle consume demasiada RAM
   * Ahora creamos/destruimos browser por cada generación de PDF
   */
  async onModuleInit(): Promise<void> {
    this.logger.log('📋 PdfService listo (browser se creará bajo demanda para ahorrar memoria)');
    // NO pre-inicializar - Chrome consume ~300MB idle
  }

  /**
   * Genera un PDF profesional MEKANOS
   */
  async generarPDF(options: GenerarPDFOptions): Promise<PDFResult> {
    const startTime = Date.now();
    this.logger.log(`🖨️ Generando PDF tipo ${options.tipoInforme} para orden ${options.datos.numeroOrden}`);

    try {
      // Obtener el HTML según el tipo de informe
      const html = this.obtenerHTML(options.tipoInforme, options.datos);

      // ✅ FIX 23-ENE-2026: Crear browser fresco para cada PDF (libera memoria después)
      this.logger.log('🚀 Iniciando Chrome para generación de PDF...');
      await this.initBrowser();

      // Crear nueva página
      const page = await this.browser!.newPage();

      try {
        // ✅ FIX MEJORADO: Configurar encoding UTF-8 explícitamente
        await page.setExtraHTTPHeaders({
          'Content-Type': 'text/html; charset=utf-8',
          'Accept-Charset': 'utf-8',
        });

        // Inyectar meta http-equiv para reforzar encoding UTF-8
        const htmlConEncoding = html.replace(
          '<meta charset="UTF-8">',
          '<meta charset="UTF-8"><meta http-equiv="Content-Type" content="text/html; charset=utf-8">'
        );

        // 🔧 FIX 02-ENE-2026: Revertir a 'networkidle0' - Las imágenes son URLs de Cloudinary
        // que necesitan cargarse via HTTP. 'domcontentloaded' NO espera las imágenes,
        // causando que aparezcan en blanco en el PDF generado.
        await page.setContent(htmlConEncoding, {
          waitUntil: 'networkidle0',
          timeout: 90000, // ✅ FIX 23-ENE-2026: 90s para Render free tier
        });

        // Generar PDF
        const pdfBuffer = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: {
            top: '0',
            right: '0',
            bottom: '0',
            left: '0',
          },
          preferCSSPageSize: true,
          timeout: 90000, // ✅ FIX 23-ENE-2026: 90s para Render free tier
        });

        let buffer: Buffer = Buffer.from(pdfBuffer);
        const filename = this.generarFilename(options.tipoInforme, options.datos.numeroOrden);

        const originalSizeKB = (buffer.length / 1024).toFixed(2);
        this.logger.log(`📄 PDF generado - Tamaño original: ${originalSizeKB} KB`);

        // ✅ FIX 30-ENE-2026: Comprimir PDF con Ghostscript si está disponible
        // Esto reduce PDFs de 48MB a ~300KB (similar a SmallPDF)
        if (buffer.length > 1024 * 1024) { // Solo comprimir si > 1MB
          buffer = Buffer.from(await this.comprimirPDFConGhostscript(buffer));
        }

        const elapsed = Date.now() - startTime;
        const finalSizeKB = (buffer.length / 1024).toFixed(2);
        const compression = ((1 - buffer.length / pdfBuffer.length) * 100).toFixed(1);
        this.logger.log(`✅ PDF listo en ${elapsed}ms - Tamaño final: ${finalSizeKB} KB (${compression}% compresión)`);

        return {
          buffer,
          filename,
          size: buffer.length,
          tipoInforme: options.tipoInforme,
        };
      } finally {
        await page.close();
        // ✅ FIX 23-ENE-2026: Cerrar browser inmediatamente para liberar ~300MB RAM
        if (this.browser) {
          this.logger.log('🔒 Cerrando Chrome para liberar memoria...');
          await this.browser.close();
          this.browser = null;
        }
      }
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`❌ Error generando PDF: ${err.message}`, err.stack);
      throw new InternalServerErrorException(`Error generando PDF: ${err.message}`);
    }
  }

  /**
   * Genera HTML según el tipo de informe
   */
  private obtenerHTML(tipo: TipoInforme, datos: DatosOrdenPDF): string {
    switch (tipo) {
      case 'GENERADOR_A':
        return generarTipoAGeneradorHTML(datos);
      case 'GENERADOR_B':
        return generarTipoBGeneradorHTML(datos);
      case 'BOMBA_A':
        return generarTipoABombaHTML(datos);
      case 'CORRECTIVO':
        return generarCorrectivoOrdenHTML(this.adaptarDatosParaCorrectivo(datos));
      case 'COTIZACION':
        return generarCotizacionHTML(datos as unknown as DatosCotizacionPDF);
      default:
        return generarTipoAGeneradorHTML(datos);
    }
  }

  /**
   * Adapta los datos genéricos de orden al formato específico de correctivo
   * ✅ REDISEÑO 06-FEB-2026: Cada campo estructurado va directo al template como campo dedicado
   * Ya no se usa tabla checklist B/M/C/NA ni blob HTML de observaciones
   */
  private adaptarDatosParaCorrectivo(datos: DatosOrdenPDF): DatosCorrectivoOrdenPDF {
    // ═══════════════════════════════════════════════════════════════════════════
    // PASO 1: Extraer datos estructurados de observaciones de actividades
    // Los widgets móviles guardan datos con prefijos: ESTADO_INICIAL:, PROBLEMA:, etc.
    // ═══════════════════════════════════════════════════════════════════════════
    const ext = this.extraerDatosEstructuradosCorrectivo(datos.actividades || []);

    // ═══════════════════════════════════════════════════════════════════════════
    // PASO 2: Filtrar mediciones con valor para renderizado condicional
    // ═══════════════════════════════════════════════════════════════════════════
    const medicionesConValor = (datos.mediciones || []).filter(m =>
      m.valor !== null && m.valor !== undefined && m.valor !== 0
    ).map(m => ({
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
    const sinInfo = (v: string) => !v || v === '(Sin información)' || v === '(Ninguno)';

    return {
      // --- Datos generales ---
      numeroOrden: datos.numeroOrden,
      fecha: datos.fecha,
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
      estadoInicial: ext.estadoInicial || undefined,
      estadoFinal: ext.estadoFinal || undefined,
      problemaReportado: sinInfo(ext.problema) ? undefined : ext.problema,
      fallasObservadas: sinInfo(ext.sintomas) ? undefined : ext.sintomas,
      diagnosticoTecnico: sinInfo(ext.diagnostico) ? undefined : ext.diagnostico,
      trabajosRealizados: sinInfo(ext.trabajos) ? undefined : ext.trabajos,
      trabajosPendientes: sinInfo(ext.pendientes) ? undefined : ext.pendientes,
      recomendaciones: sinInfo(ext.recomendaciones) ? undefined : ext.recomendaciones,
      sistemasAfectados: ext.sistemasAfectados.length > 0 ? ext.sistemasAfectados : undefined,
      repuestosUtilizados: ext.repuestos.length > 0 ? ext.repuestos : undefined,
      materialesUtilizados: ext.materiales.length > 0 ? ext.materiales : undefined,

      // ✅ FIX 06-FEB-2026: Observaciones auxiliares del técnico por actividad
      obsEstadoInicial: ext.obsEstadoInicial || undefined,
      obsEstadoFinal: ext.obsEstadoFinal || undefined,
      obsProblema: ext.obsProblema || undefined,
      obsFallas: ext.obsFallas || undefined,
      obsDiagnostico: ext.obsDiagnostico || undefined,
      obsTrabajos: ext.obsTrabajos || undefined,
      obsPendientes: ext.obsPendientes || undefined,
      obsRecomendaciones: ext.obsRecomendaciones || undefined,
      obsRepuestos: ext.obsRepuestos || undefined,
      obsMateriales: ext.obsMateriales || undefined,
      obsSistemas: ext.obsSistemas || undefined,

      // --- Mediciones y módulo ---
      mediciones: medicionesConValor.length > 0 ? medicionesConValor : undefined,
      datosModulo,

      // --- Observaciones generales (solo textarea del técnico, sin duplicar campos) ---
      observacionesGenerales: datos.observaciones || undefined,

      // --- Multi-equipos ---
      esMultiEquipo: datos.esMultiEquipo,
      actividadesPorEquipo: datos.actividadesPorEquipo,
      medicionesPorEquipo: datos.medicionesPorEquipo,
      evidenciasPorEquipo: datos.evidenciasPorEquipo,

      // --- Evidencias con tipo para agrupación ---
      // ✅ FIX 06-FEB-2026: Reconocer GENERAL y MEDICION además de ANTES/DURANTE/DESPUES
      evidencias: (datos.evidencias || []).map(e => {
        const caption = typeof e === 'string' ? undefined : e.caption;
        const tipoMatch = caption?.match(/^(ANTES|DURANTE|DESPUES|DESPUÉS|MEDICION|MEDICIÓN|GENERAL):/i);
        type TipoEvidencia = 'ANTES' | 'DURANTE' | 'DESPUES' | 'GENERAL' | 'MEDICION';
        let tipo: TipoEvidencia = 'DURANTE';
        if (tipoMatch) {
          const raw = tipoMatch[1].toUpperCase();
          if (raw === 'DESPUÉS') tipo = 'DESPUES';
          else if (raw === 'MEDICIÓN') tipo = 'MEDICION';
          else tipo = raw as TipoEvidencia;
        }
        return { tipo, url: typeof e === 'string' ? e : e.url, descripcion: caption };
      }),

      // --- Firmas ---
      firmaTecnico: datos.firmaTecnico,
      firmaCliente: datos.firmaCliente,
      nombreTecnico: datos.nombreTecnico,
      cargoTecnico: datos.cargoTecnico,
      nombreCliente: datos.nombreCliente,
      cargoCliente: datos.cargoCliente,
    };
  }

  /**
   * ✅ FIX 02-FEB-2026: Extrae datos estructurados de las observaciones de actividades correctivas
   * Los widgets móviles guardan datos con prefijos como ESTADO_INICIAL:, PROBLEMA:, etc.
   */
  private extraerDatosEstructuradosCorrectivo(actividades: Array<{ observaciones?: string }>): {
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
    // ✅ FIX 06-FEB-2026: Observaciones del técnico por actividad (parte después de |||)
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
      // Observaciones auxiliares por actividad
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

    for (const actividad of actividades) {
      // ✅ FIX 03-FEB-2026: Extraer valor especial (antes de |||) y observación (después de |||)
      // Formato: "VALOR_ESPECIAL|||Observación del técnico"
      const obsRaw = actividad.observaciones || '';
      const partes = obsRaw.split('|||');
      const obs = partes[0].trim();
      const obsAux = partes.length > 1 ? partes.slice(1).join(' ').trim() : '';

      if (obs.startsWith('ESTADO_INICIAL: ')) {
        resultado.estadoInicial = this.mapearEstadoInicial(obs.substring(16).trim());
        if (obsAux) resultado.obsEstadoInicial = obsAux;
      } else if (obs.startsWith('ESTADO_FINAL: ')) {
        resultado.estadoFinal = this.mapearEstadoFinal(obs.substring(14).trim());
        if (obsAux) resultado.obsEstadoFinal = obsAux;
      } else if (obs.startsWith('SISTEMAS: ')) {
        const sistemas = obs.substring(10).split(',').map(s => s.trim()).filter(s => s);
        resultado.sistemasAfectados = sistemas.map(s => this.mapearSistema(s));
        if (obsAux) resultado.obsSistemas = obsAux;
      } else if (obs.startsWith('PROBLEMA: ')) {
        resultado.problema = obs.substring(10).trim();
        if (obsAux) resultado.obsProblema = obsAux;
      } else if (obs.startsWith('SINTOMAS: ') || obs.startsWith('FALLAS: ')) {
        // ✅ FIX 03-FEB-2026: Soportar ambos prefijos (SINTOMAS y FALLAS)
        const prefijo = obs.startsWith('FALLAS: ') ? 'FALLAS: ' : 'SINTOMAS: ';
        resultado.sintomas = obs.substring(prefijo.length).trim();
        if (obsAux) resultado.obsFallas = obsAux;
      } else if (obs.startsWith('DIAGNOSTICO: ')) {
        resultado.diagnostico = obs.substring(13).trim();
        if (obsAux) resultado.obsDiagnostico = obsAux;
      } else if (obs.startsWith('TRABAJOS: ')) {
        resultado.trabajos = obs.substring(10).trim();
        if (obsAux) resultado.obsTrabajos = obsAux;
      } else if (obs.startsWith('PENDIENTES: ')) {
        resultado.pendientes = obs.substring(12).trim();
        if (obsAux) resultado.obsPendientes = obsAux;
      } else if (obs.startsWith('RECOMENDACIONES: ')) {
        resultado.recomendaciones = obs.substring(17).trim();
        if (obsAux) resultado.obsRecomendaciones = obsAux;
      } else if (obs.startsWith('REPUESTOS: ')) {
        const items = obs.substring(11).split('; ').map(s => s.trim()).filter(s => s && s !== '(Ninguno)');
        resultado.repuestos = items;
        if (obsAux) resultado.obsRepuestos = obsAux;
      } else if (obs.startsWith('MATERIALES: ')) {
        const items = obs.substring(12).split('; ').map(s => s.trim()).filter(s => s && s !== '(Ninguno)');
        resultado.materiales = items;
        if (obsAux) resultado.obsMateriales = obsAux;
      }
    }

    return resultado;
  }

  /** Mapea códigos de estado inicial a texto legible */
  private mapearEstadoInicial(codigo: string): string {
    const mapa: Record<string, string> = {
      'OPERATIVO': '✅ Equipo Operativo',
      'PARADO': '🛑 Equipo Parado',
      'FALLA_INTERMITENTE': '⚠️ Falla Intermitente',
      'INACCESIBLE': '🚫 Inaccesible para Inspección',
    };
    return mapa[codigo] || codigo;
  }

  /** Mapea códigos de estado final a texto legible */
  private mapearEstadoFinal(codigo: string): string {
    const mapa: Record<string, string> = {
      'OPERATIVO': '✅ Equipo Operativo',
      'REPARACION_PARCIAL': '⚠️ Reparación Parcial',
      'REQUIERE_REPUESTOS': '🔧 Requiere Repuestos',
      'FUERA_SERVICIO': '🛑 Fuera de Servicio',
    };
    return mapa[codigo] || codigo;
  }

  /** Mapea códigos de sistema a texto legible */
  private mapearSistema(codigo: string): string {
    const mapa: Record<string, string> = {
      // Sistemas de Generador
      'MOTOR': 'Motor Diesel/Gas',
      'GENERADOR': 'Generador Eléctrico',
      'ELECTRONICO': 'Sistema Electrónico',
      'ELECTRICO': 'Sistema Eléctrico',
      'CONTROL': 'Módulo de Control',
      'ENFRIAMIENTO': 'Sistema de Enfriamiento',
      'REFRIGERACION': 'Sistema de Refrigeración',
      'COMBUSTIBLE': 'Sistema de Combustible',
      'LUBRICACION': 'Sistema de Lubricación',
      'ESCAPE': 'Sistema de Escape',
      'ASPIRACION': 'Sistema de Aspiración',
      'ARRANQUE': 'Sistema de Arranque',
      'ALTERNADOR': 'Alternador/Generador',
      'TRANSFERENCIA': 'Transferencia Automática',
      // ✅ 09-FEB-2026: Sistemas de Bomba (BOM_CORR)
      'HIDRAULICO': 'Sistema Hidráulico',
      'MECANICO': 'Sistema Mecánico',
      'PRESOSTATO': 'Presostato / Control de Presión',
      'SELLO': 'Sellos Mecánicos / Empaquetadura',
      'TANQUE': 'Tanques Hidroneumáticos',
      'TABLERO': 'Tablero de Control',
      'VALVULAS': 'Válvulas de Operación',
      'TUBERIA': 'Tubería y Accesorios',
      'OTRO': 'Otro',
    };
    return mapa[codigo] || codigo;
  }

  /**
   * ✅ FIX 02-FEB-2026: Extrae datos del módulo de control desde las mediciones
   * Mapea nombres de parámetros a campos del módulo
   */
  private extraerDatosModuloDesdelMediciones(mediciones: Array<{ parametro: string; valor?: number | null }>): {
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

      // Mapeo flexible de nombres de parámetros
      if (param.includes('velocidad') || param.includes('rpm')) {
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
   * Genera nombre de archivo para el PDF
   */
  private generarFilename(tipo: TipoInforme, numeroOrden: string): string {
    const fecha = new Date().toISOString().split('T')[0];
    const tipoNombreMap: Record<TipoInforme, string> = {
      'GENERADOR_A': 'Preventivo_A_Generador',
      'GENERADOR_B': 'Preventivo_B_Generador',
      'BOMBA_A': 'Preventivo_A_Bomba',
      'CORRECTIVO': 'Correctivo',
      'COTIZACION': 'Cotizacion',
      'PROPUESTA_CORRECTIVO': 'Propuesta_Correctivo',
      'REMISION': 'Remision',
      'ORDEN_COMPRA': 'Orden_Compra',
    };
    const tipoNombre = tipoNombreMap[tipo] || 'Informe';

    return `MEKANOS_${tipoNombre}_${numeroOrden}_${fecha}.pdf`;
  }

  /**
   * ✅ FIX 30-ENE-2026: Comprimir PDF con Ghostscript para reducir tamaño drásticamente
   * Similar a SmallPDF - reduce PDFs de 48MB a ~300KB
   * 
   * Usa nivel de compresión 'screen' (72 dpi) optimizado para pantalla/email
   * Alternativas: 'ebook' (150 dpi), 'printer' (300 dpi), 'prepress' (300 dpi alta calidad)
   */
  private async comprimirPDFConGhostscript(inputBuffer: Buffer): Promise<Buffer> {
    const startTime = Date.now();
    const inputSizeMB = (inputBuffer.length / (1024 * 1024)).toFixed(2);

    try {
      // Verificar si Ghostscript está disponible
      try {
        execSync('gs --version', { stdio: 'pipe' });
      } catch {
        this.logger.warn('⚠️ Ghostscript no disponible - retornando PDF sin comprimir');
        return inputBuffer;
      }

      // Crear archivos temporales
      const tempDir = '/tmp';
      const inputPath = `${tempDir}/input_${Date.now()}.pdf`;
      const outputPath = `${tempDir}/output_${Date.now()}.pdf`;

      // Escribir PDF de entrada
      fs.writeFileSync(inputPath, inputBuffer);

      // Comando Ghostscript para compresión agresiva
      // -dPDFSETTINGS=/screen = 72 dpi, máxima compresión
      // -dCompatibilityLevel=1.4 = Compatibilidad amplia
      // -dNOPAUSE -dBATCH = Modo no interactivo
      const gsCommand = `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/screen -dNOPAUSE -dQUIET -dBATCH -sOutputFile=${outputPath} ${inputPath}`;

      this.logger.log(`🗜️ Comprimiendo PDF (${inputSizeMB} MB) con Ghostscript...`);
      execSync(gsCommand, { stdio: 'pipe', timeout: 120000 }); // 2 min timeout

      // Leer PDF comprimido
      const compressedBuffer = fs.readFileSync(outputPath);

      // Limpiar archivos temporales
      try {
        fs.unlinkSync(inputPath);
        fs.unlinkSync(outputPath);
      } catch {
        // Ignorar errores de limpieza
      }

      const outputSizeKB = (compressedBuffer.length / 1024).toFixed(2);
      const compressionRatio = ((1 - compressedBuffer.length / inputBuffer.length) * 100).toFixed(1);
      const elapsed = Date.now() - startTime;

      this.logger.log(`✅ Ghostscript: ${inputSizeMB} MB → ${outputSizeKB} KB (${compressionRatio}% reducción) en ${elapsed}ms`);

      return compressedBuffer;
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.warn(`⚠️ Error en compresión Ghostscript: ${err.message} - retornando PDF sin comprimir`);
      return inputBuffer;
    }
  }

  /**
   * ✅ OPTIMIZACIÓN 07-ENE-2026: Asegura browser conectado con soporte para pre-init
   */
  // @ts-ignore TS6133 - Reserved for future use
  private async _ensureBrowserConnected(): Promise<void> {
    try {
      // Esperar pre-inicialización si está en curso
      if (this.browserInitPromise) {
        await this.browserInitPromise;
        this.browserInitPromise = null;
      }

      // Verificar si browser existe y está conectado
      if (this.browser && this.browser.connected) {
        return; // Browser activo y listo ✅
      }

      // Si existe pero no está conectado, cerrarlo
      if (this.browser) {
        this.logger.warn('⚠️ Browser desconectado, reiniciando...');
        try {
          await this.browser.close();
        } catch (e) {
          // Ignorar errores al cerrar browser muerto
        }
        this.browser = null;
      }

      // Inicializar nuevo browser
      await this.initBrowser();
    } catch (error) {
      this.logger.error('❌ Error verificando conexión de browser', error);
      // Forzar reinicio
      this.browser = null;
      await this.initBrowser();
    }
  }

  /**
   * Inicializa el browser de Puppeteer
   */
  private async initBrowser(): Promise<void> {
    const cacheDir = process.env.PUPPETEER_CACHE_DIR || '/tmp/.cache/puppeteer';
    this.logger.log('🚀 Inicializando Puppeteer browser...');
    this.logger.log(`📍 PUPPETEER_CACHE_DIR: ${cacheDir}`);

    try {
      // ✅ FIX 24-ENE-2026: Railway - Instalar Chrome dinámicamente en runtime si no existe
      let executablePath = puppeteer.executablePath();
      this.logger.log(`📍 Chrome executable path esperado: ${executablePath}`);

      // Verificar si Chrome existe, si no, instalarlo
      if (!fs.existsSync(executablePath)) {
        this.logger.warn('⚠️ Chrome no encontrado, instalando en runtime...');
        try {
          // Instalar Chrome con la variable de entorno correcta
          const installCmd = `PUPPETEER_CACHE_DIR=${cacheDir} npx puppeteer browsers install chrome`;
          this.logger.log(`📦 Ejecutando: ${installCmd}`);
          execSync(installCmd, {
            stdio: 'inherit',
            timeout: 120000,
            env: { ...process.env, PUPPETEER_CACHE_DIR: cacheDir }
          });
          this.logger.log('✅ Chrome instalado correctamente');

          // Actualizar el path después de la instalación
          executablePath = puppeteer.executablePath();
          this.logger.log(`📍 Nuevo Chrome executable path: ${executablePath}`);
        } catch (installError: any) {
          this.logger.error(`❌ Error instalando Chrome: ${installError.message}`);
          throw new Error(`No se pudo instalar Chrome: ${installError.message}`);
        }
      } else {
        this.logger.log('✅ Chrome encontrado en el path esperado');
      }

      // ✅ FIX 03-FEB-2026: Detectar Windows vs Linux para configuración apropiada
      const isWindows = process.platform === 'win32';
      // const _isProduction = process.env.NODE_ENV === 'production';

      // Args base que funcionan en ambas plataformas
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

      // Args adicionales solo para Linux/producción (causan ECONNRESET en Windows)
      const linuxOnlyArgs = isWindows ? [] : [
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

      this.logger.log(`📍 Plataforma: ${process.platform}, Entorno: ${process.env.NODE_ENV}`);

      this.browser = await puppeteer.launch({
        headless: true,
        executablePath,
        protocolTimeout: 120000,
        args: [...baseArgs, ...linuxOnlyArgs],
      });

      this.logger.log('✅ Browser inicializado correctamente');
    } catch (error: any) {
      this.logger.error(`❌ Error inicializando Puppeteer: ${error.message}`);
      this.logger.error(`📍 Cache path configurado: ${cacheDir}`);
      this.logger.error(`📍 CWD: ${process.cwd()}`);
      throw new InternalServerErrorException(
        `Error inicializando generador de PDF: ${error.message}. ` +
        `Asegúrese de que Chrome está instalado (npx puppeteer browsers install chrome)`
      );
    }
  }

  /**
   * Cierra el browser al destruir el servicio
   */
  async onModuleDestroy(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.logger.log('🔒 Browser cerrado');
    }
  }

  /**
   * Determina el tipo de informe basado en el equipo y servicio
   */
  determinarTipoInforme(
    tipoEquipo: 'GENERADOR' | 'BOMBA' | 'MOTOR',
    tipoServicio: 'PREVENTIVO_A' | 'PREVENTIVO_B' | 'CORRECTIVO'
  ): TipoInforme {
    // ✅ FIX 06-FEB-2026: CORRECTIVO tiene su propio template independiente del equipo
    if (tipoServicio === 'CORRECTIVO') {
      return 'CORRECTIVO';
    }

    if (tipoEquipo === 'BOMBA') {
      return 'BOMBA_A';
    }

    if (tipoEquipo === 'GENERADOR' || tipoEquipo === 'MOTOR') {
      return tipoServicio === 'PREVENTIVO_B' ? 'GENERADOR_B' : 'GENERADOR_A';
    }

    return 'GENERADOR_A';
  }

  /**
   * Genera un PDF de prueba con datos de ejemplo
   */
  async generarPDFPrueba(): Promise<PDFResult> {
    const datosPrueba: DatosOrdenPDF = {
      cliente: 'HOTEL CARIBE S.A.S',
      direccion: 'Cra 1 #23-45, Cartagena de Indias',
      marcaEquipo: 'CATERPILLAR',
      serieEquipo: 'CAT-2024-001',
      tipoEquipo: 'GENERADOR',
      fecha: new Date().toLocaleDateString('es-CO'),
      tecnico: 'Carlos Martínez',
      horaEntrada: '08:00',
      horaSalida: '12:30',
      tipoServicio: 'PREVENTIVO_A',
      numeroOrden: 'ORD-2025-00001',
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
        { sistema: 'ENFRIAMIENTO', descripcion: 'Revisar tapa de radiador', resultado: 'B', observaciones: '' },
        { sistema: 'ENFRIAMIENTO', descripcion: 'Revisar nivel de refrigerante', resultado: 'B', observaciones: '' },
        { sistema: 'ENFRIAMIENTO', descripcion: 'Revisar estado de mangueras', resultado: 'B', observaciones: '' },
        { sistema: 'ENFRIAMIENTO', descripcion: 'Revisar ventilador y correas', resultado: 'R', observaciones: 'Tensionar' },
        { sistema: 'COMBUSTIBLE', descripcion: 'Revisar nivel de combustible', resultado: 'B', observaciones: '' },
        { sistema: 'COMBUSTIBLE', descripcion: 'Revisar filtro de combustible', resultado: 'C', observaciones: 'Cambiar próximo servicio' },
        { sistema: 'COMBUSTIBLE', descripcion: 'Purgar sistema de combustible', resultado: 'B', observaciones: '' },
        { sistema: 'LUBRICACION', descripcion: 'Revisar nivel de aceite', resultado: 'B', observaciones: '' },
        { sistema: 'LUBRICACION', descripcion: 'Revisar estado del aceite', resultado: 'B', observaciones: 'Color normal' },
        { sistema: 'ELECTRICO', descripcion: 'Revisar bornes de batería', resultado: 'B', observaciones: '' },
        { sistema: 'ELECTRICO', descripcion: 'Revisar cableado general', resultado: 'B', observaciones: '' },
        { sistema: 'GENERAL', descripcion: '¿El equipo arranca sin dificultad?', resultado: 'B', observaciones: '' },
        { sistema: 'GENERAL', descripcion: '¿Existe vibración excesiva?', resultado: 'M', observaciones: '' },
      ],
      mediciones: [
        { parametro: 'Temperatura Refrigerante', valor: 82, unidad: '°C', nivelAlerta: 'OK' },
        { parametro: 'Presión Aceite', valor: 65, unidad: 'PSI', nivelAlerta: 'OK' },
        { parametro: 'Voltaje Generador', valor: 220, unidad: 'V', nivelAlerta: 'OK' },
        { parametro: 'Frecuencia', valor: 60, unidad: 'Hz', nivelAlerta: 'OK' },
      ],
      // EVIDENCIAS FOTOGRÁFICAS DE PRUEBA - Imágenes de equipos industriales
      evidencias: [
        // Vista general del generador
        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=600&auto=format&fit=crop',
        // Panel de control / sistemas
        'https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=400&auto=format&fit=crop',
        // Detalle de maquinaria
        'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?q=80&w=400&auto=format&fit=crop',
        // Sistema eléctrico
        'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?q=80&w=400&auto=format&fit=crop',
      ],
      observaciones: 'Equipo en buen estado general. Se recomienda programar cambio de filtros de combustible en el próximo servicio Tipo B. Se detectó leve vibración que debe monitorearse. Batería con carga óptima.',
    };

    return this.generarPDF({
      tipoInforme: 'GENERADOR_A',
      datos: datosPrueba,
    });
  }

  // ==================== MÉTODO LEGACY (compatibilidad) ====================

  /**
   * @deprecated Use generarPDF() en su lugar
   * Método legacy para compatibilidad con código existente
   */
  async generateOrdenServicioPdf(data: OrdenPdfData): Promise<Buffer> {
    // Convertir datos legacy a nuevo formato
    const datosNuevo: DatosOrdenPDF = {
      cliente: data.clienteNombre || 'N/A',
      direccion: 'N/A',
      marcaEquipo: data.equipoNombre || 'N/A',
      serieEquipo: 'N/A',
      tipoEquipo: 'GENERADOR',
      fecha: this.formatDate(data.fechaCreacion),
      tecnico: data.tecnicoAsignado || 'N/A',
      horaEntrada: 'N/A',
      horaSalida: 'N/A',
      tipoServicio: 'PREVENTIVO_A',
      numeroOrden: data.numeroOrden,
      actividades: [],
      mediciones: [],
      evidencias: [],
      observaciones: data.observaciones || data.descripcion || '',
    };

    const result = await this.generarPDF({
      tipoInforme: 'GENERADOR_A',
      datos: datosNuevo,
    });

    return result.buffer;
  }

  private formatDate(date: Date | null | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('es-CO');
  }

  // ==================== MÉTODOS PARA COTIZACIONES ====================

  /**
   * Genera un PDF para una cotización comercial
   */
  async generarPDFCotizacion(datosCotizacion: DatosCotizacionPDF): Promise<PDFResult> {
    try {
      this.logger.log(`📄 Generando PDF de Cotización: ${datosCotizacion.numeroCotizacion}`);

      if (!this.browser) {
        await this.initBrowser();
      }

      const html = generarCotizacionHTML(datosCotizacion);
      const filename = this.generarFilenameCotizacion(datosCotizacion.numeroCotizacion);

      const page = await this.browser!.newPage();

      try {
        await page.setContent(html, {
          waitUntil: 'networkidle0',
          timeout: 60000
        });

        const pdfBuffer = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: {
            top: '15mm',
            bottom: '15mm',
            left: '10mm',
            right: '10mm',
          },
          displayHeaderFooter: true,
          headerTemplate: '<div></div>',
          footerTemplate: `
            <div style="font-size: 8px; width: 100%; text-align: center; color: #666;">
              <span>Cotización ${datosCotizacion.numeroCotizacion} - Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
            </div>
          `,
        });

        this.logger.log(`✅ PDF de cotización generado: ${filename} (${pdfBuffer.length} bytes)`);

        return {
          buffer: Buffer.from(pdfBuffer),
          filename,
          size: pdfBuffer.length,
          tipoInforme: 'COTIZACION' as TipoInforme,
        };
      } finally {
        await page.close();
      }
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`❌ Error generando PDF de cotización: ${err.message}`, err.stack);
      throw new InternalServerErrorException('Error al generar el PDF de cotización');
    }
  }

  /**
   * Genera nombre de archivo para cotización
   */
  private generarFilenameCotizacion(numeroCotizacion: string): string {
    const fecha = new Date().toISOString().split('T')[0];
    return `MEKANOS_Cotizacion_${numeroCotizacion.replace(/[^a-zA-Z0-9-]/g, '_')}_${fecha}.pdf`;
  }

  /**
   * Genera un PDF de cotización de prueba con datos de ejemplo
   */
  async generarPDFCotizacionPrueba(): Promise<PDFResult> {
    const datosPrueba: DatosCotizacionPDF = {
      numeroCotizacion: 'COT-2025-00001',
      fechaCotizacion: new Date().toLocaleDateString('es-CO'),
      fechaVencimiento: new Date(Date.now() + 30 * 86400000).toLocaleDateString('es-CO'),
      diasValidez: 30,
      version: 1,

      cliente: {
        nombre: 'HOTEL CARIBE S.A.S',
        nit: '900.123.456-7',
        direccion: 'Cra 1 #23-45, Cartagena de Indias',
        telefono: '(605) 642-1234',
        email: 'compras@hotelcaribe.com',
        contacto: 'María García - Gerente de Compras',
      },

      asunto: 'Mantenimiento Preventivo Generador 250 KVA',
      descripcionGeneral: 'Servicio de mantenimiento preventivo completo',

      itemsServicios: [
        { orden: 1, descripcion: 'Mantenimiento Preventivo Tipo A - Generador 250 KVA', cantidad: 1, unidad: 'UND', precioUnitario: 1500000, descuentoPorcentaje: 0, subtotal: 1500000 },
        { orden: 2, descripcion: 'Mantenimiento Preventivo Tipo B - Generador 250 KVA', cantidad: 1, unidad: 'UND', precioUnitario: 2800000, descuentoPorcentaje: 10, subtotal: 2520000 },
        { orden: 3, descripcion: 'Servicio de Diagnóstico y Pruebas de Carga', cantidad: 2, unidad: 'UND', precioUnitario: 450000, descuentoPorcentaje: 0, subtotal: 900000 },
      ],

      itemsComponentes: [
        { orden: 1, descripcion: 'Filtro de Aceite CATERPILLAR Original', referencia: 'FLT-001', cantidad: 3, unidad: 'UND', precioUnitario: 185000, descuentoPorcentaje: 0, subtotal: 555000 },
        { orden: 2, descripcion: 'Filtro de Combustible Primario', referencia: 'FLT-002', cantidad: 3, unidad: 'UND', precioUnitario: 145000, descuentoPorcentaje: 10, subtotal: 420500 },
        { orden: 3, descripcion: 'Filtro de Aire Principal', referencia: 'FLT-003', cantidad: 2, unidad: 'UND', precioUnitario: 350000, descuentoPorcentaje: 0, subtotal: 700000 },
        { orden: 4, descripcion: 'Aceite Lubricante 15W40 (Galón)', referencia: 'ACE-001', cantidad: 8, unidad: 'GAL', precioUnitario: 125000, descuentoPorcentaje: 5, subtotal: 950000 },
      ],

      totales: {
        subtotalServicios: 4920000,
        subtotalComponentes: 2625500,
        subtotalGeneral: 7545500,
        descuentoPorcentaje: 5,
        descuentoValor: 377275,
        subtotalConDescuento: 7168225,
        ivaPorcentaje: 19,
        ivaValor: 1361962,
        totalCotizacion: 8530187,
      },

      formaPago: 'Crédito 30 días',
      tiempoEstimadoDias: 7,
      mesesGarantia: 6,
      observacionesGarantia: '6 meses sobre repuestos instalados y mano de obra',
      terminosCondiciones: 'Esta cotización incluye transporte e instalación. Los precios pueden variar según condiciones de mercado.',

      elaboradoPor: 'Carlos Martínez',
      cargoElaborador: 'Asesor Comercial',
    };

    return this.generarPDFCotizacion(datosPrueba);
  }
}

