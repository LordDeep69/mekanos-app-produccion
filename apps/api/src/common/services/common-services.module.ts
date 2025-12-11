/**
 * ============================================================================
 * COMMON SERVICES MODULE - MEKANOS S.A.S
 * ============================================================================
 * 
 * Módulo GLOBAL que exporta servicios reutilizables desde cualquier parte:
 * 
 * - NumeracionService: Genera códigos automáticos (ORD-2025-00001)
 * - MekanosFacadeService: Fachada unificada de servicios core (PDF, Email, Storage)
 * - CotizacionesFacadeService: Fachada para todo el flujo comercial (FASE 4)
 * 
 * USO:
 * Simplemente inyectar el servicio facade y usar sus métodos simples:
 * 
 * @example
 * constructor(
 *   private readonly mekanos: MekanosFacadeService,
 *   private readonly cotizaciones: CotizacionesFacadeService,
 * ) {}
 * 
 * async crearOrden() {
 *   const numero = await this.mekanos.generarNumero('ORDEN_SERVICIO');
 *   const pdf = await this.mekanos.generarPdfOrden({ idOrden: 123 });
 * }
 * 
 * async crearCotizacion() {
 *   const result = await this.cotizaciones.crearCotizacion({
 *     idCliente: 1,
 *     asunto: 'Mantenimiento preventivo',
 *     elaboradaPor: 5,
 *   });
 * }
 */

import { DatabaseModule } from '@mekanos/database';
import { forwardRef, Global, Module } from '@nestjs/common';
import { CotizacionesModule } from '../../cotizaciones/cotizaciones.module';
import { EmailModule } from '../../email/email.module';
import { PdfModule } from '../../pdf/pdf.module';
import { CotizacionesFacadeService } from './cotizaciones-facade.service';
import { GeneradorDocumentosFacadeService } from './generador-documentos-facade.service';
import { MekanosFacadeService } from './mekanos-facade.service';
import { NumeracionService } from './numeracion.service';
import { ProgramacionFacadeService } from './programacion-facade.service';

@Global()
@Module({
  imports: [
    DatabaseModule,
    forwardRef(() => PdfModule),
    forwardRef(() => EmailModule),
    forwardRef(() => CotizacionesModule),
  ],
  providers: [
    NumeracionService,
    MekanosFacadeService,
    CotizacionesFacadeService,
    ProgramacionFacadeService,
    GeneradorDocumentosFacadeService,
  ],
  exports: [
    NumeracionService,
    MekanosFacadeService,
    CotizacionesFacadeService,
    ProgramacionFacadeService,
    GeneradorDocumentosFacadeService,
  ],
})
export class CommonServicesModule { }
