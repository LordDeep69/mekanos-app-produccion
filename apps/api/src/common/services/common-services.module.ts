/**
 * ============================================================================
 * COMMON SERVICES MODULE - MEKANOS S.A.S
 * ============================================================================
 *
 * Módulo GLOBAL que exporta servicios reutilizables desde cualquier parte:
 *
 * - NumeracionService: Genera códigos automáticos (ORD-2025-00001)
 * - MekanosFacadeService: Fachada unificada de servicios core (PDF, Email, Storage)
 * - ProgramacionFacadeService: Fachada para generación de órdenes desde cronogramas
 */

import { DatabaseModule } from '@mekanos/database';
import { forwardRef, Global, Module } from '@nestjs/common';
import { EmailModule } from '../../email/email.module';
import { PdfModule } from '../../pdf/pdf.module';
import { MekanosFacadeService } from './mekanos-facade.service';
import { NumeracionService } from './numeracion.service';
import { OrdenPlanSeederService } from './orden-plan-seeder.service';
import { ProgramacionFacadeService } from './programacion-facade.service';

@Global()
@Module({
  imports: [DatabaseModule, forwardRef(() => PdfModule), forwardRef(() => EmailModule)],
  providers: [
    NumeracionService,
    MekanosFacadeService,
    OrdenPlanSeederService,
    ProgramacionFacadeService,
  ],
  exports: [
    NumeracionService,
    MekanosFacadeService,
    OrdenPlanSeederService,
    ProgramacionFacadeService,
  ],
})
export class CommonServicesModule {}
