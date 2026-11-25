import { DatabaseModule } from '@mekanos/database';
import { Module, forwardRef } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

// Controllers (sub-rutas estáticas ANTES de CotizacionesController para prioridad de ruta)
import { CotizacionesController } from './cotizaciones.controller';
import { PlantillasCotizacionController } from './plantillas/plantillas-cotizacion.controller';
import { TiposOfertaCotizacionController } from './tipos-oferta/tipos-oferta-cotizacion.controller';

// Repository
import { PrismaCotizacionesRepository } from './infrastructure/prisma-cotizaciones.repository';

// Services
import { PlantillasCotizacionService } from './plantillas/plantillas-cotizacion.service';
import { CotizacionCalculoService } from './services/cotizacion-calculo.service';
import { CotizacionesCpqService } from './services/cotizaciones-cpq.service';
import { TiposOfertaCotizacionService } from './tipos-oferta/tipos-oferta-cotizacion.service';

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

// Versiones Cotización
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
  CreateVersionHandler,
];

const QueryHandlers = [
  GetCotizacionByIdHandler,
  GetCotizacionesHandler,
  GetAprobacionesPendientesHandler,
  GetVersionesHandler,
  GetVersionDetalleHandler,
];

@Module({
  imports: [CqrsModule, DatabaseModule, forwardRef(() => PdfModule), forwardRef(() => EmailModule)],
  controllers: [
    TiposOfertaCotizacionController,
    PlantillasCotizacionController,
    CotizacionesController,
  ],
  providers: [
    CotizacionCalculoService,
    CotizacionesCpqService,
    PlantillasCotizacionService,
    TiposOfertaCotizacionService,
    {
      provide: 'CotizacionesRepository',
      useClass: PrismaCotizacionesRepository,
    },
    ...CommandHandlers,
    ...QueryHandlers,
  ],
  exports: [
    'CotizacionesRepository',
    CotizacionCalculoService,
    CotizacionesCpqService,
    PlantillasCotizacionService,
    TiposOfertaCotizacionService,
  ],
})
export class CotizacionesModule {}
