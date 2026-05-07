/**
 * MEKANOS S.A.S - Controlador específico para descarga y mantenimiento de PDFs de informes
 *
 * Responsabilidades:
 *  - GET  /api/informes/documento/:id/descargar
 *      Proxy de descarga: streamea el PDF desde R2 con Content-Disposition
 *      forzado al nombre canónico (`INFORME - DDMM-YY - SERVICIO EQUIPO - CLIENTE - YYYY.pdf`).
 *      Soluciona el problema de que el atributo `<a download>` es ignorado
 *      al ser cross-origin contra el bucket R2.
 *
 *  - POST /api/informes/admin/renombrar-pdfs
 *      Migración masiva: actualiza in-place el header Content-Disposition
 *      de los 620+ PDFs históricos en R2 para que al descargarlos el navegador
 *      sugiera el nombre legible. Soporta `?dryRun=true` para preview.
 *
 * ✅ FIX 29-ABR-2026 — Tarea Legacy de informes
 */

import { PrismaService } from '@mekanos/database';
import {
    BadRequestException,
    Controller,
    Get,
    HttpStatus,
    Logger,
    NotFoundException,
    Param,
    ParseIntPipe,
    Post,
    Query,
    Res,
    UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { buildContentDisposition, buildInformeFilename, extractR2KeyFromUrl } from '../pdf/pdf-naming.helper';
import { R2StorageService } from '../storage/r2-storage.service';

@ApiTags('Informes - PDF')
@Controller('informes')
export class InformesPdfController {
    private readonly logger = new Logger(InformesPdfController.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly r2Service: R2StorageService,
    ) { }

    // ════════════════════════════════════════════════════════════════════════
    // ENDPOINT: Descarga proxy con Content-Disposition forzado
    // ════════════════════════════════════════════════════════════════════════

    /**
     * GET /api/informes/documento/:id/descargar
     *
     * Sirve el PDF al cliente con el nombre canónico de descarga.
     * Lectura: descarga completa desde R2; respuesta: misma origen → respeta `download`.
     */
    @Get('documento/:id/descargar')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({
        summary: 'Descargar PDF de informe con nombre canónico',
        description: 'Proxy que sirve el PDF desde R2 con Content-Disposition forzado al formato INFORME - DDMM-YY - SERVICIO EQUIPO - CLIENTE - YYYY.pdf',
    })
    async descargarInforme(
        @Param('id', ParseIntPipe) idDocumento: number,
        @Res() res: Response,
    ): Promise<void> {
        const ctx = await this.cargarContextoDescarga(idDocumento);
        if (!ctx) {
            throw new NotFoundException(`Documento ${idDocumento} no encontrado`);
        }

        const filename = buildInformeFilename(ctx.input);
        const key = extractR2KeyFromUrl(ctx.rutaArchivo);
        if (!key) {
            throw new BadRequestException(`No se pudo extraer la R2 key desde la URL: ${ctx.rutaArchivo}`);
        }

        try {
            const { buffer, contentType } = await this.r2Service.downloadPDF(key);

            res.setHeader('Content-Type', contentType || 'application/pdf');
            res.setHeader('Content-Disposition', buildContentDisposition(filename));
            res.setHeader('Content-Length', buffer.length.toString());
            res.setHeader('Cache-Control', 'private, max-age=300');
            res.status(HttpStatus.OK).send(buffer);

            this.logger.log(`📥 Descarga servida: ${filename} (${buffer.length} bytes)`);
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`❌ Error sirviendo PDF: ${msg}`);
            throw new NotFoundException(`No se pudo descargar el PDF: ${msg}`);
        }
    }

    /**
     * GET /api/informes/documento/:id/preview
     *
     * Previsualiza el PDF en el navegador vía streaming directo desde R2.
     * Usa Content-Disposition: inline para que el navegador lo muestre
     * inmediatamente sin forzar descarga.
     * ✅ FIX 06-MAY-2026: Streaming en lugar de buffer completo para respuesta instantánea.
     */
    @Get('documento/:id/preview')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({
        summary: 'Previsualizar PDF de informe (streaming inline)',
        description: 'Proxy que streammea el PDF desde R2 con Content-Disposition inline. El navegador muestra el PDF inmediatamente sin descargarlo.',
    })
    async previsualizarInforme(
        @Param('id', ParseIntPipe) idDocumento: number,
        @Res() res: Response,
    ): Promise<void> {
        const ctx = await this.cargarContextoDescarga(idDocumento);
        if (!ctx) {
            throw new NotFoundException(`Documento ${idDocumento} no encontrado`);
        }

        const key = extractR2KeyFromUrl(ctx.rutaArchivo);
        if (!key) {
            throw new BadRequestException(`No se pudo extraer la R2 key desde la URL: ${ctx.rutaArchivo}`);
        }

        try {
            const { stream, contentType, contentLength } = await this.r2Service.streamPDF(key);

            res.setHeader('Content-Type', contentType || 'application/pdf');
            res.setHeader('Content-Disposition', 'inline');
            if (contentLength) {
                res.setHeader('Content-Length', contentLength.toString());
            }
            res.setHeader('Cache-Control', 'private, max-age=300');
            res.status(HttpStatus.OK);

            stream.pipe(res);
            this.logger.log(`👁️ Previsualización streaming: documento ${idDocumento} (${contentLength ?? 'unknown'} bytes)`);
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`❌ Error en previsualización PDF: ${msg}`);
            throw new NotFoundException(`No se pudo previsualizar el PDF: ${msg}`);
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // ENDPOINT: Migración masiva de Content-Disposition (620+ PDFs históricos)
    // ════════════════════════════════════════════════════════════════════════

    /**
     * POST /api/informes/admin/renombrar-pdfs?dryRun=true|false&limit=N
     *
     * Recorre todos los `documentos_generados` de tipo INFORME_SERVICIO,
     * calcula el filename canónico y actualiza in-place el Content-Disposition
     * del objeto en R2 (vía CopyObject con MetadataDirective=REPLACE).
     *
     * Idempotente: detecta y permite sobrescribir; nunca modifica el binario.
     */
    @Post('admin/renombrar-pdfs')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({
        summary: '[ADMIN] Migrar Content-Disposition de PDFs históricos al formato canónico',
        description: 'Actualiza el Content-Disposition de todos los PDFs INFORME_SERVICIO en R2. Soporta dryRun. NO modifica el binario.',
    })
    async renombrarPdfs(
        @Query('dryRun') dryRunStr: string = 'true',
        @Query('limit') limitStr?: string,
    ): Promise<{
        dryRun: boolean;
        total: number;
        procesados: number;
        actualizados: number;
        omitidos: number;
        errores: number;
        detalles: Array<{
            id: number;
            numeroOrden?: string | null;
            filenameNuevo: string;
            estado: 'OK' | 'DRY_RUN' | 'ERROR' | 'SIN_KEY';
            error?: string;
        }>;
    }> {
        const dryRun = dryRunStr !== 'false';
        const limit = limitStr ? Math.max(1, Math.min(parseInt(limitStr, 10) || 0, 1000)) : undefined;

        this.logger.log(`🔧 [MIGRACIÓN] Iniciando renombrado de informes PDF (dryRun=${dryRun}, limit=${limit ?? 'sin límite'})`);

        // Query enriquecido con todas las relaciones que necesita buildInformeFilename
        const documentos = await this.fetchDocumentosInforme(limit);

        const detalles: Array<{
            id: number;
            numeroOrden?: string | null;
            filenameNuevo: string;
            estado: 'OK' | 'DRY_RUN' | 'ERROR' | 'SIN_KEY';
            error?: string;
        }> = [];

        let actualizados = 0;
        let omitidos = 0;
        let errores = 0;

        for (const doc of documentos) {
            const filenameNuevo = buildInformeFilename({
                fechaServicio: doc.fecha_servicio,
                codigoTipoServicio: doc.codigo_tipo_servicio,
                nombreTipoServicio: doc.nombre_tipo_servicio,
                codigoTipoEquipo: doc.codigo_tipo_equipo,
                nombreTipoEquipo: doc.nombre_tipo_equipo,
                nombreCliente: doc.nombre_cliente,
                numeroOrden: doc.numero_orden,
            });

            const key = extractR2KeyFromUrl(doc.ruta_archivo);
            if (!key) {
                detalles.push({
                    id: doc.id_documento,
                    numeroOrden: doc.numero_orden,
                    filenameNuevo,
                    estado: 'SIN_KEY',
                    error: 'No se pudo extraer la R2 key de ruta_archivo',
                });
                omitidos++;
                continue;
            }

            if (dryRun) {
                detalles.push({
                    id: doc.id_documento,
                    numeroOrden: doc.numero_orden,
                    filenameNuevo,
                    estado: 'DRY_RUN',
                });
                continue;
            }

            try {
                await this.r2Service.updateDownloadFilename(key, filenameNuevo);
                actualizados++;
                detalles.push({
                    id: doc.id_documento,
                    numeroOrden: doc.numero_orden,
                    filenameNuevo,
                    estado: 'OK',
                });
                if (actualizados % 25 === 0) {
                    this.logger.log(`   …progreso: ${actualizados}/${documentos.length}`);
                }
            } catch (error: unknown) {
                errores++;
                const msg = error instanceof Error ? error.message : String(error);
                this.logger.error(`❌ Error actualizando ${key}: ${msg}`);
                detalles.push({
                    id: doc.id_documento,
                    numeroOrden: doc.numero_orden,
                    filenameNuevo,
                    estado: 'ERROR',
                    error: msg,
                });
            }
        }

        this.logger.log(
            `✅ [MIGRACIÓN] Finalizada — total=${documentos.length}, actualizados=${actualizados}, omitidos=${omitidos}, errores=${errores}, dryRun=${dryRun}`,
        );

        return {
            dryRun,
            total: documentos.length,
            procesados: documentos.length,
            actualizados,
            omitidos,
            errores,
            detalles,
        };
    }

    // ════════════════════════════════════════════════════════════════════════
    // Helpers privados
    // ════════════════════════════════════════════════════════════════════════

    /**
     * Carga los datos necesarios para construir el nombre canónico al descargar
     * un único documento (endpoint proxy de descarga).
     */
    private async cargarContextoDescarga(idDocumento: number): Promise<{
        rutaArchivo: string;
        input: Parameters<typeof buildInformeFilename>[0];
    } | null> {
        const filas: any[] = await this.prisma.$queryRawUnsafe(`
            SELECT
                dg.id_documento,
                dg.ruta_archivo,
                os.numero_orden,
                COALESCE(os.fecha_fin_real, os.fecha_inicio_real, os.fecha_programada, dg.fecha_generacion) AS fecha_servicio,
                ts.codigo_tipo AS codigo_tipo_servicio,
                ts.nombre_tipo AS nombre_tipo_servicio,
                te.codigo_tipo AS codigo_tipo_equipo,
                te.nombre_tipo AS nombre_tipo_equipo,
                COALESCE(p.nombre_comercial, p.razon_social, p.nombre_completo,
                         CONCAT_WS(' ', p.primer_nombre, p.primer_apellido), 'CLIENTE') AS nombre_cliente
            FROM documentos_generados dg
            LEFT JOIN ordenes_servicio os ON os.id_orden_servicio = dg.id_referencia
            LEFT JOIN tipos_servicio ts ON ts.id_tipo_servicio = os.id_tipo_servicio
            LEFT JOIN equipos e ON e.id_equipo = os.id_equipo
            LEFT JOIN tipos_equipo te ON te.id_tipo_equipo = e.id_tipo_equipo
            LEFT JOIN clientes c ON c.id_cliente = os.id_cliente
            LEFT JOIN personas p ON p.id_persona = c.id_persona
            WHERE dg.id_documento = $1
              AND dg.tipo_documento = 'INFORME_SERVICIO'
            LIMIT 1
        `, idDocumento);

        if (!filas || filas.length === 0) return null;
        const row = filas[0];
        if (!row.ruta_archivo) return null;

        return {
            rutaArchivo: row.ruta_archivo,
            input: {
                fechaServicio: row.fecha_servicio,
                codigoTipoServicio: row.codigo_tipo_servicio,
                nombreTipoServicio: row.nombre_tipo_servicio,
                codigoTipoEquipo: row.codigo_tipo_equipo,
                nombreTipoEquipo: row.nombre_tipo_equipo,
                nombreCliente: row.nombre_cliente,
                numeroOrden: row.numero_orden,
            },
        };
    }

    /**
     * Trae todos los documentos INFORME_SERVICIO con relaciones aplanadas
     * para la migración masiva.
     */
    private async fetchDocumentosInforme(limit?: number): Promise<Array<{
        id_documento: number;
        ruta_archivo: string;
        numero_orden: string | null;
        fecha_servicio: Date | null;
        codigo_tipo_servicio: string | null;
        nombre_tipo_servicio: string | null;
        codigo_tipo_equipo: string | null;
        nombre_tipo_equipo: string | null;
        nombre_cliente: string;
    }>> {
        const limitClause = limit ? `LIMIT ${limit}` : '';
        const filas: any[] = await this.prisma.$queryRawUnsafe(`
            SELECT
                dg.id_documento,
                dg.ruta_archivo,
                os.numero_orden,
                COALESCE(os.fecha_fin_real, os.fecha_inicio_real, os.fecha_programada, dg.fecha_generacion) AS fecha_servicio,
                ts.codigo_tipo AS codigo_tipo_servicio,
                ts.nombre_tipo AS nombre_tipo_servicio,
                te.codigo_tipo AS codigo_tipo_equipo,
                te.nombre_tipo AS nombre_tipo_equipo,
                COALESCE(p.nombre_comercial, p.razon_social, p.nombre_completo,
                         CONCAT_WS(' ', p.primer_nombre, p.primer_apellido), 'CLIENTE') AS nombre_cliente
            FROM documentos_generados dg
            LEFT JOIN ordenes_servicio os ON os.id_orden_servicio = dg.id_referencia
            LEFT JOIN tipos_servicio ts ON ts.id_tipo_servicio = os.id_tipo_servicio
            LEFT JOIN equipos e ON e.id_equipo = os.id_equipo
            LEFT JOIN tipos_equipo te ON te.id_tipo_equipo = e.id_tipo_equipo
            LEFT JOIN clientes c ON c.id_cliente = os.id_cliente
            LEFT JOIN personas p ON p.id_persona = c.id_persona
            WHERE dg.tipo_documento = 'INFORME_SERVICIO'
              AND dg.ruta_archivo IS NOT NULL
            ORDER BY dg.fecha_generacion DESC
            ${limitClause}
        `);

        return filas as any;
    }
}

