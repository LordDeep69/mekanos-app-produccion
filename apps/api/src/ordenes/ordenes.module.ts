import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

// Controller
import { OrdenesController } from './ordenes.controller';

// Command Handlers
import { CreateOrdenHandler } from './commands/create-orden.handler';
import { ProgramarOrdenHandler } from './commands/programar-orden.handler';
import { AsignarTecnicoHandler } from './commands/asignar-tecnico.handler';
import { IniciarOrdenHandler } from './commands/iniciar-orden.handler';
import { FinalizarOrdenHandler } from './commands/finalizar-orden.handler';

// Query Handlers
import { GetOrdenHandler } from './queries/get-orden.handler';
import { GetOrdenesHandler } from './queries/get-ordenes.handler';
import { GetOrdenesTecnicoHandler } from './queries/get-ordenes-tecnico.handler';

// Infrastructure
import { MockOrdenServicioRepository } from './infrastructure/mock-orden-servicio.repository';

// External Modules
import { PdfModule } from '../pdf/pdf.module';
import { EmailModule } from '../email/email.module';
import { StorageModule } from '../storage/storage.module';

/**
 * OrdenesModule
 * Módulo completo de Órdenes de Servicio con CQRS + PDF + Email
 */
@Module({
  imports: [
    CqrsModule,
    PdfModule,
    EmailModule,
    StorageModule
  ],
  controllers: [OrdenesController],
  providers: [
    // Command Handlers
    CreateOrdenHandler,
    ProgramarOrdenHandler,
    AsignarTecnicoHandler,
    IniciarOrdenHandler,
    FinalizarOrdenHandler,

    // Query Handlers
    GetOrdenHandler,
    GetOrdenesHandler,
    GetOrdenesTecnicoHandler,

    // Repository Implementation
    {
      provide: 'IOrdenServicioRepository',
      useClass: MockOrdenServicioRepository
    }
  ],
  exports: []
})
export class OrdenesModule {}
