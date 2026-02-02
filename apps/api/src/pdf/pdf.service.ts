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

        let buffer = Buffer.from(pdfBuffer);
        const filename = this.generarFilename(options.tipoInforme, options.datos.numeroOrden);

        const originalSizeKB = (buffer.length / 1024).toFixed(2);
        this.logger.log(`📄 PDF generado - Tamaño original: ${originalSizeKB} KB`);

        // ✅ FIX 30-ENE-2026: Comprimir PDF con Ghostscript si está disponible
        // Esto reduce PDFs de 48MB a ~300KB (similar a SmallPDF)
        if (buffer.length > 1024 * 1024) { // Solo comprimir si > 1MB
          buffer = await this.comprimirPDFConGhostscript(buffer);
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
   * ✅ FIX 02-FEB-2026: Parsear campos estructurados desde observaciones de actividades
   */
  private adaptarDatosParaCorrectivo(datos: DatosOrdenPDF): DatosCorrectivoOrdenPDF {
    // ═══════════════════════════════════════════════════════════════════════════
    // ✅ FIX 02-FEB-2026: Extraer datos estructurados de las observaciones
    // Los widgets de correctivo guardan datos con prefijos como:
    // ESTADO_INICIAL: OPERATIVO, PROBLEMA: texto, SISTEMAS: MOTOR,ELECTRICO, etc.
    // ═══════════════════════════════════════════════════════════════════════════
    const datosEstructurados = this.extraerDatosEstructuradosCorrectivo(datos.actividades || []);

    // ✅ FIX: Convertir actividades a trabajos ejecutados preservando resultado real
    // Excluir actividades que son solo contenedores de datos estructurados
    const actividadesParaTabla = (datos.actividades || []).filter(a => {
      const obs = a.observaciones || '';
      // Excluir actividades con datos estructurados que se muestran en secciones especiales
      const prefijosEstructurados = [
        'ESTADO_INICIAL:', 'ESTADO_FINAL:', 'SISTEMAS:',
        'PROBLEMA:', 'SINTOMAS:', 'DIAGNOSTICO:',
        'TRABAJOS:', 'PENDIENTES:', 'RECOMENDACIONES:',
        'REPUESTOS:', 'MATERIALES:'
      ];
      return !prefijosEstructurados.some(p => obs.startsWith(p));
    });

    const trabajosEjecutados = actividadesParaTabla.map((a, index) => ({
      orden: index + 1,
      descripcion: a.descripcion,
      // ✅ FIX: Usar observaciones para la columna 'Obs.' (antes usaba sistema)
      sistema: a.observaciones || '',
      tiempoHoras: 1,
      // ✅ FIX: Pasar resultado directamente (B, R, M, C, NA, etc.)
      // El template mapResultado() ya maneja todos los códigos
      resultado: a.resultado || 'NA',
    }));

    // Filtrar mediciones que tengan valor (para renderizado condicional)
    const medicionesConValor = (datos.mediciones || []).filter(m =>
      m.valor !== null && m.valor !== undefined && m.valor !== 0
    ).map(m => ({
      parametro: m.parametro,
      valorDespues: String(m.valor),
      unidad: m.unidad,
      estado: (m.nivelAlerta === 'OK' ? 'OK' :
        m.nivelAlerta === 'WARNING' ? 'ADVERTENCIA' : 'OK') as 'OK' | 'ADVERTENCIA' | 'CRITICO',
    }));

    // ✅ FIX 02-FEB-2026: Construir observaciones estructuradas para el PDF
    const observacionesEstructuradas = this.construirObservacionesCorrectivo(datosEstructurados, datos.observaciones);

    return {
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
      // ✅ FIX 02-FEB-2026: Usar datos estructurados parseados
      problemaReportado: {
        descripcion: datosEstructurados.problema || datos.problemaReportado?.descripcion || '',
        fechaReporte: datos.problemaReportado?.fechaReporte || datos.fecha,
      },
      diagnostico: {
        descripcion: datosEstructurados.diagnostico || datosEstructurados.sintomas || datos.diagnostico?.descripcion || '',
        causaRaiz: datosEstructurados.diagnostico || datos.diagnostico?.causaRaiz || '',
        sistemasAfectados: datosEstructurados.sistemasAfectados.length > 0
          ? datosEstructurados.sistemasAfectados
          : (datos.diagnostico?.sistemasAfectados || [...new Set(trabajosEjecutados.map(t => t.sistema).filter(s => s))]),
      },
      trabajosEjecutados,
      repuestosUtilizados: datosEstructurados.repuestos.map((r, i) => ({
        codigo: `REP-${i + 1}`,
        descripcion: r,
        cantidad: 1,
        unidad: 'UND',
        estado: 'NUEVO' as const,
      })),
      mediciones: medicionesConValor.length > 0 ? medicionesConValor : undefined,
      recomendaciones: datosEstructurados.recomendaciones
        ? [datosEstructurados.recomendaciones]
        : ['Seguir plan de mantenimiento preventivo programado'],
      observaciones: observacionesEstructuradas,
      // ✅ FIX 17-DIC-2025: MULTI-EQUIPOS - Pasar datos agrupados por equipo
      esMultiEquipo: datos.esMultiEquipo,
      actividadesPorEquipo: datos.actividadesPorEquipo,
      medicionesPorEquipo: datos.medicionesPorEquipo,
      evidenciasPorEquipo: datos.evidenciasPorEquipo,
      // ✅ FIX: Preservar caption con formato ANTES:/DURANTE:/DESPUÉS: para que el template agrupe correctamente
      evidencias: (datos.evidencias || []).map(e => {
        const caption = typeof e === 'string' ? undefined : e.caption;
        // Extraer tipo del caption si existe (formato "ANTES: descripción" o "DURANTE: descripción")
        const tipoMatch = caption?.match(/^(ANTES|DURANTE|DESPUES|DESPUÉS):/i);
        const tipo = tipoMatch
          ? (tipoMatch[1].toUpperCase() === 'DESPUÉS' ? 'DESPUES' : tipoMatch[1].toUpperCase()) as 'ANTES' | 'DURANTE' | 'DESPUES'
          : 'DURANTE';
        return {
          tipo,
          url: typeof e === 'string' ? e : e.url,
          descripcion: caption,
        };
      }),
      firmaTecnico: datos.firmaTecnico,
      firmaCliente: datos.firmaCliente,
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
    };

    for (const actividad of actividades) {
      const obs = actividad.observaciones || '';

      if (obs.startsWith('ESTADO_INICIAL: ')) {
        resultado.estadoInicial = this.mapearEstadoInicial(obs.substring(16).trim());
      } else if (obs.startsWith('ESTADO_FINAL: ')) {
        resultado.estadoFinal = this.mapearEstadoFinal(obs.substring(14).trim());
      } else if (obs.startsWith('SISTEMAS: ')) {
        const sistemas = obs.substring(10).split(',').map(s => s.trim()).filter(s => s);
        resultado.sistemasAfectados = sistemas.map(s => this.mapearSistema(s));
      } else if (obs.startsWith('PROBLEMA: ')) {
        resultado.problema = obs.substring(10).trim();
      } else if (obs.startsWith('SINTOMAS: ')) {
        resultado.sintomas = obs.substring(10).trim();
      } else if (obs.startsWith('DIAGNOSTICO: ')) {
        resultado.diagnostico = obs.substring(13).trim();
      } else if (obs.startsWith('TRABAJOS: ')) {
        resultado.trabajos = obs.substring(10).trim();
      } else if (obs.startsWith('PENDIENTES: ')) {
        resultado.pendientes = obs.substring(12).trim();
      } else if (obs.startsWith('RECOMENDACIONES: ')) {
        resultado.recomendaciones = obs.substring(17).trim();
      } else if (obs.startsWith('REPUESTOS: ')) {
        const items = obs.substring(11).split('; ').map(s => s.trim()).filter(s => s && s !== '(Ninguno)');
        resultado.repuestos = items;
      } else if (obs.startsWith('MATERIALES: ')) {
        const items = obs.substring(12).split('; ').map(s => s.trim()).filter(s => s && s !== '(Ninguno)');
        resultado.materiales = items;
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
      'MOTOR': 'Motor Diesel/Gas',
      'ELECTRICO': 'Sistema Eléctrico',
      'CONTROL': 'Módulo de Control',
      'REFRIGERACION': 'Sistema de Refrigeración',
      'COMBUSTIBLE': 'Sistema de Combustible',
      'LUBRICACION': 'Sistema de Lubricación',
      'ESCAPE': 'Sistema de Escape',
      'ARRANQUE': 'Sistema de Arranque',
      'ALTERNADOR': 'Alternador/Generador',
      'TRANSFERENCIA': 'Transferencia Automática',
    };
    return mapa[codigo] || codigo;
  }

  /**
   * ✅ FIX 02-FEB-2026: Construye texto de observaciones estructurado para el PDF
   */
  private construirObservacionesCorrectivo(
    datos: ReturnType<typeof this.extraerDatosEstructuradosCorrectivo>,
    observacionesGenerales?: string,
  ): string {
    const secciones: string[] = [];

    // Estado inicial y final
    if (datos.estadoInicial || datos.estadoFinal) {
      const estados = [];
      if (datos.estadoInicial) estados.push(`<strong>Estado Inicial:</strong> ${datos.estadoInicial}`);
      if (datos.estadoFinal) estados.push(`<strong>Estado Final:</strong> ${datos.estadoFinal}`);
      secciones.push(estados.join(' → '));
    }

    // Sistemas afectados
    if (datos.sistemasAfectados.length > 0) {
      secciones.push(`<strong>Sistemas Afectados:</strong> ${datos.sistemasAfectados.join(', ')}`);
    }

    // Problema reportado
    if (datos.problema && datos.problema !== '(Sin información)') {
      secciones.push(`<strong>Problema Reportado:</strong> ${datos.problema}`);
    }

    // Síntomas observados
    if (datos.sintomas && datos.sintomas !== '(Sin información)') {
      secciones.push(`<strong>Síntomas Observados:</strong> ${datos.sintomas}`);
    }

    // Diagnóstico
    if (datos.diagnostico && datos.diagnostico !== '(Sin información)') {
      secciones.push(`<strong>Diagnóstico y Causa Raíz:</strong> ${datos.diagnostico}`);
    }

    // Trabajos realizados
    if (datos.trabajos && datos.trabajos !== '(Sin información)') {
      secciones.push(`<strong>Trabajos Realizados:</strong> ${datos.trabajos}`);
    }

    // Repuestos utilizados
    if (datos.repuestos.length > 0) {
      secciones.push(`<strong>Repuestos Utilizados:</strong><br/>• ${datos.repuestos.join('<br/>• ')}`);
    }

    // Materiales utilizados
    if (datos.materiales.length > 0) {
      secciones.push(`<strong>Materiales e Insumos:</strong><br/>• ${datos.materiales.join('<br/>• ')}`);
    }

    // Trabajos pendientes
    if (datos.pendientes && datos.pendientes !== '(Sin información)') {
      secciones.push(`<strong>⚠️ Trabajos Pendientes:</strong> ${datos.pendientes}`);
    }

    // Recomendaciones
    if (datos.recomendaciones && datos.recomendaciones !== '(Sin información)') {
      secciones.push(`<strong>📋 Recomendaciones:</strong> ${datos.recomendaciones}`);
    }

    // Observaciones generales adicionales
    if (observacionesGenerales) {
      secciones.push(`<strong>Observaciones Adicionales:</strong> ${observacionesGenerales}`);
    }

    return secciones.length > 0 ? secciones.join('<br/><br/>') : 'Sin observaciones adicionales.';
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
  private async ensureBrowserConnected(): Promise<void> {
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

      // ✅ FIX 23-ENE-2026: Configuración ultra-low-memory para Render Free Tier (512MB)
      this.browser = await puppeteer.launch({
        headless: true,
        executablePath,
        protocolTimeout: 120000,
        args: [
          // === CRÍTICOS PARA RENDER ===
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--single-process',
          '--no-zygote',

          // === REDUCCIÓN DE MEMORIA ===
          '--disable-gpu',
          '--disable-software-rasterizer',
          '--disable-accelerated-2d-canvas',
          '--disable-accelerated-jpeg-decoding',
          '--disable-accelerated-mjpeg-decode',
          '--disable-accelerated-video-decode',
          '--disable-background-networking',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-breakpad',
          '--disable-component-extensions-with-background-pages',
          '--disable-component-update',
          '--disable-default-apps',
          '--disable-extensions',
          '--disable-features=TranslateUI',
          '--disable-hang-monitor',
          '--disable-ipc-flooding-protection',
          '--disable-popup-blocking',
          '--disable-prompt-on-repost',
          '--disable-renderer-backgrounding',
          '--disable-sync',
          '--enable-features=NetworkService,NetworkServiceInProcess',
          '--force-color-profile=srgb',
          '--metrics-recording-only',
          '--no-first-run',
          '--safebrowsing-disable-auto-update',

          // === LÍMITES DE MEMORIA EXPLÍCITOS ===
          '--js-flags=--max-old-space-size=256',
          '--memory-pressure-off',
        ],
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
          contentType: 'application/pdf',
        };
      } finally {
        await page.close();
      }
    } catch (error) {
      this.logger.error(`❌ Error generando PDF de cotización: ${error.message}`, error.stack);
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
      // Datos básicos
      numeroCotizacion: 'COT-2025-00001',
      fecha: new Date().toLocaleDateString('es-CO'),
      validezDias: 30,

      // Cliente
      cliente: {
        nombre: 'HOTEL CARIBE S.A.S',
        nit: '900.123.456-7',
        direccion: 'Cra 1 #23-45, Cartagena de Indias',
        telefono: '(605) 642-1234',
        email: 'compras@hotelcaribe.com',
        contacto: 'María García - Gerente de Compras',
      },

      // Vendedor
      vendedor: {
        nombre: 'Carlos Martínez',
        cargo: 'Asesor Comercial',
        telefono: '+57 301 234 5678',
        email: 'carlos.martinez@mekanosrep.com',
      },

      // Items de servicio
      servicios: [
        {
          descripcion: 'Mantenimiento Preventivo Tipo A - Generador 250 KVA',
          cantidad: 1,
          precioUnitario: 1500000,
          descuento: 0,
          subtotal: 1500000,
        },
        {
          descripcion: 'Mantenimiento Preventivo Tipo B - Generador 250 KVA',
          cantidad: 1,
          precioUnitario: 2800000,
          descuento: 280000,
          subtotal: 2520000,
        },
        {
          descripcion: 'Servicio de Diagnóstico y Pruebas de Carga',
          cantidad: 2,
          precioUnitario: 450000,
          descuento: 0,
          subtotal: 900000,
        },
      ],

      // Items de componentes/repuestos
      componentes: [
        {
          codigo: 'FLT-001',
          descripcion: 'Filtro de Aceite CATERPILLAR Original',
          cantidad: 3,
          precioUnitario: 185000,
          descuento: 0,
          subtotal: 555000,
        },
        {
          codigo: 'FLT-002',
          descripcion: 'Filtro de Combustible Primario',
          cantidad: 3,
          precioUnitario: 145000,
          descuento: 14500,
          subtotal: 420500,
        },
        {
          codigo: 'FLT-003',
          descripcion: 'Filtro de Aire Principal',
          cantidad: 2,
          precioUnitario: 350000,
          descuento: 0,
          subtotal: 700000,
        },
        {
          codigo: 'ACE-001',
          descripcion: 'Aceite Lubricante 15W40 (Galón)',
          cantidad: 8,
          precioUnitario: 125000,
          descuento: 50000,
          subtotal: 950000,
        },
      ],

      // Totales
      subtotalServicios: 4920000,
      subtotalComponentes: 2625500,
      subtotalGeneral: 7545500,
      descuentoGlobal: {
        tipo: 'porcentaje',
        valor: 5,
        monto: 377275,
      },
      baseImponible: 7168225,
      iva: {
        porcentaje: 19,
        monto: 1361962,
      },
      total: 8530187,

      // Términos
      formaPago: 'Crédito 30 días',
      tiempoEntrega: '5-7 días hábiles después de aprobación',
      garantia: '6 meses sobre repuestos instalados y mano de obra',
      notas: 'Esta cotización incluye transporte e instalación. Los precios pueden variar según condiciones de mercado.',

      // Estado
      estado: 'BORRADOR',
    };

    return this.generarPDFCotizacion(datosPrueba);
  }
}

