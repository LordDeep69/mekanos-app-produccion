import { DatabaseModule } from '@mekanos/database';
import { Module, forwardRef } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

// Controller
import { CotizacionesController } from './cotizaciones.controller';

// Repository
import { PrismaCotizacionesRepository } from './infrastructure/prisma-cotizaciones.repository';

// Services
import { CotizacionCalculoService } from './services/cotizacion-calculo.service';

// Módulos externos necesarios para envío de cotización
import { EmailModule } from '../email/email.module';
import { PdfModule } from '../pdf/pdf.module';

// Command Handlers
import { AprobarCotizacionHandler } from './application/commands/aprobar-cotizacion.handler';
import { CreateCotizacionHandler } from './application/commands/create-cotizacion.handler';
import { EnviarCotizacionHandler } from './application/commands/enviar-cotizacion.handler';
import { ProcesarAprobacionHandler } from './application/commands/procesar-aprobacion.handler';
import { RechazarCotizacionHandler } from './application/commands/rechazar-cotizacion.handler';
import { SolicitarAprobacionHandler } from './application/commands/solicitar-aprobacion.handler';
import { UpdateCotizacionHandler } from './application/commands/update-cotizacion.handler';

// Query Handlers
import { GetAprobacionesPendientesHandler } from './application/queries/get-aprobaciones-pendientes.handler';
import { GetCotizacionByIdHandler } from './application/queries/get-cotizacion-by-id.handler';
import { GetCotizacionesHandler } from './application/queries/get-cotizaciones.handler';

// FASE 4.8: Versiones Cotización
import { CreateVersionHandler } from './commands/versiones/create-version.handler';
import { GetVersionDetalleHandler } from './queries/versiones/get-version-detalle.handler';
import { GetVersionesHandler } from './queries/versiones/get-versiones.handler';

const CommandHandlers = [
  CreateCotizacionHandler,
  UpdateCotizacionHandler,
  EnviarCotizacionHandler,
  AprobarCotizacionHandler,
  RechazarCotizacionHandler,
  SolicitarAprobacionHandler,
  ProcesarAprobacionHandler,
  CreateVersionHandler, // FASE 4.8
];

const QueryHandlers = [
  GetCotizacionByIdHandler,
  GetCotizacionesHandler,
  GetAprobacionesPendientesHandler,
  GetVersionesHandler, // FASE 4.8
  GetVersionDetalleHandler, // FASE 4.8
];

@Module({
  imports: [
    CqrsModule, 
    DatabaseModule,
    forwardRef(() => PdfModule),    // Para generar PDF de cotización
    forwardRef(() => EmailModule),  // Para enviar email con cotización
  ],
  controllers: [CotizacionesController],
  providers: [
    CotizacionCalculoService, // FASE 4 - Cálculo automático totales
    {
      provide: 'CotizacionesRepository',
      useClass: PrismaCotizacionesRepository,
    },
    ...CommandHandlers,
    ...QueryHandlers,
  ],
  exports: ['CotizacionesRepository', CotizacionCalculoService],
})
export class CotizacionesModule {}
