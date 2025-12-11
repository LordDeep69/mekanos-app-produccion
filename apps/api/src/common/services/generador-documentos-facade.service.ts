/**
 * GENERADOR DE DOCUMENTOS FACADE SERVICE
 * 
 * Servicio centralizado para generación de PDFs profesionales.
 * Soporta todos los tipos de documentos de MEKANOS.
 * 
 * USO DESDE FRONTEND:
 * - Llamar endpoint con tipo de documento y datos
 * - Recibe PDF generado o URL del archivo
 * 
 * MEKANOS S.A.S - Sistema de Mantenimiento Industrial
 */

import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import {
    DatosCorrectivoOrdenPDF,
    DatosCotizacionPDF,
    DatosOrdenCompraPDF,
    DatosOrdenPDF,
    DatosPropuestaCorrectivoPDF,
    DatosRemisionPDF,
    generarCorrectivoOrdenHTML,
    generarCotizacionHTML,
    generarOrdenCompraHTML,
    generarPropuestaCorrectivoHTML,
    generarRemisionHTML,
    generarTipoABombaHTML,
    generarTipoAGeneradorHTML,
    generarTipoBGeneradorHTML,
} from '../../pdf/templates';

// ============================================================
// TIPOS DE DOCUMENTOS SOPORTADOS
// ============================================================

export type TipoDocumento =
    | 'COTIZACION'
    | 'PROPUESTA_CORRECTIVO'
    | 'REMISION'
    | 'ORDEN_COMPRA'
    | 'INFORME_PREVENTIVO_A_GENERADOR'
    | 'INFORME_PREVENTIVO_B_GENERADOR'
    | 'INFORME_PREVENTIVO_A_BOMBA'
    | 'INFORME_CORRECTIVO';

export interface GenerarDocumentoInput<T = any> {
    tipo: TipoDocumento;
    datos: T;
    opciones?: {
        formato?: 'A4' | 'LETTER';
        orientacion?: 'portrait' | 'landscape';
        calidad?: 'alta' | 'media' | 'baja';
    };
}

export interface DocumentoGeneradoResult {
    success: boolean;
    buffer: Buffer;
    filename: string;
    contentType: string;
    size: number;
    tipoDocumento: TipoDocumento;
}

// ============================================================
// SERVICIO
// ============================================================

@Injectable()
export class GeneradorDocumentosFacadeService {
    private readonly logger = new Logger(GeneradorDocumentosFacadeService.name);
    private browser: puppeteer.Browser | null = null;

    /**
     * Genera un documento PDF según el tipo especificado
     */
    async generarDocumento<T>(input: GenerarDocumentoInput<T>): Promise<DocumentoGeneradoResult> {
        this.logger.log(`📄 Generando documento: ${input.tipo}`);

        try {
            // 1. Obtener HTML según tipo
            const html = this.obtenerHTML(input.tipo, input.datos);

            // 2. Generar PDF
            const buffer = await this.htmlToPDF(html, input.opciones);

            // 3. Generar nombre de archivo
            const filename = this.generarFilename(input.tipo, input.datos);

            this.logger.log(`✅ Documento generado: ${filename} (${(buffer.length / 1024).toFixed(2)} KB)`);

            return {
                success: true,
                buffer,
                filename,
                contentType: 'application/pdf',
                size: buffer.length,
                tipoDocumento: input.tipo,
            };
        } catch (error) {
            const err = error as Error;
            this.logger.error(`❌ Error generando documento: ${err.message}`);
            throw new BadRequestException(`Error generando documento: ${err.message}`);
        }
    }

    /**
     * Genera múltiples documentos en lote
     */
    async generarDocumentosLote(inputs: GenerarDocumentoInput[]): Promise<DocumentoGeneradoResult[]> {
        this.logger.log(`📦 Generando lote de ${inputs.length} documentos...`);

        const resultados: DocumentoGeneradoResult[] = [];

        for (const input of inputs) {
            try {
                const resultado = await this.generarDocumento(input);
                resultados.push(resultado);
            } catch (error) {
                this.logger.error(`Error en documento ${input.tipo}`);
            }
        }

        return resultados;
    }

    /**
     * Obtiene el HTML según el tipo de documento
     */
    private obtenerHTML(tipo: TipoDocumento, datos: any): string {
        switch (tipo) {
            case 'COTIZACION':
                return generarCotizacionHTML(datos as DatosCotizacionPDF);

            case 'PROPUESTA_CORRECTIVO':
                return generarPropuestaCorrectivoHTML(datos as DatosPropuestaCorrectivoPDF);

            case 'REMISION':
                return generarRemisionHTML(datos as DatosRemisionPDF);

            case 'ORDEN_COMPRA':
                return generarOrdenCompraHTML(datos as DatosOrdenCompraPDF);

            case 'INFORME_CORRECTIVO':
                return generarCorrectivoOrdenHTML(datos as DatosCorrectivoOrdenPDF);

            case 'INFORME_PREVENTIVO_A_GENERADOR':
                return generarTipoAGeneradorHTML(datos as DatosOrdenPDF);

            case 'INFORME_PREVENTIVO_B_GENERADOR':
                return generarTipoBGeneradorHTML(datos as DatosOrdenPDF);

            case 'INFORME_PREVENTIVO_A_BOMBA':
                return generarTipoABombaHTML(datos as DatosOrdenPDF);

            default:
                throw new BadRequestException(`Tipo de documento no soportado: ${tipo}`);
        }
    }

    /**
     * Convierte HTML a PDF usando Puppeteer
     */
    private async htmlToPDF(html: string, opciones?: GenerarDocumentoInput['opciones']): Promise<Buffer> {
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });

        try {
            const page = await browser.newPage();
            await page.setContent(html, { waitUntil: 'networkidle0' });

            const pdfBuffer = await page.pdf({
                format: opciones?.formato || 'A4',
                landscape: opciones?.orientacion === 'landscape',
                printBackground: true,
                margin: { top: '0', right: '0', bottom: '0', left: '0' },
            });

            return Buffer.from(pdfBuffer);
        } finally {
            await browser.close();
        }
    }

    /**
     * Genera nombre de archivo según tipo y datos
     */
    private generarFilename(tipo: TipoDocumento, datos: any): string {
        const fecha = new Date().toISOString().split('T')[0];

        const prefijos: Record<TipoDocumento, string> = {
            'COTIZACION': 'COT',
            'PROPUESTA_CORRECTIVO': 'PC',
            'REMISION': 'REM',
            'ORDEN_COMPRA': 'OC',
            'INFORME_CORRECTIVO': 'IC',
            'INFORME_PREVENTIVO_A_GENERADOR': 'PA-GEN',
            'INFORME_PREVENTIVO_B_GENERADOR': 'PB-GEN',
            'INFORME_PREVENTIVO_A_BOMBA': 'PA-BOM',
        };

        const prefijo = prefijos[tipo] || 'DOC';
        const numero = datos.numeroCotizacion || datos.numeroPropuesta ||
            datos.numeroRemision || datos.numeroOrdenCompra ||
            datos.numeroOrden || 'TEMP';

        return `MEKANOS_${prefijo}_${numero}_${fecha}.pdf`;
    }
}
