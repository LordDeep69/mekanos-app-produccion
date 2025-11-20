import { DatabaseModule } from '@mekanos/database';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

// Controller
import { PropuestasCorrectivoController } from './propuestas-correctivo.controller';

// Command Handlers
import { ConvertirPropuestaOrdenHandler } from '../commands/propuestas/convertir-propuesta-orden.handler';
import { CreatePropuestaHandler } from '../commands/propuestas/create-propuesta.handler';

// Query Handlers
import { GetPropuestasPendientesHandler } from '../queries/propuestas/get-propuestas-pendientes.handler';

const CommandHandlers = [
  CreatePropuestaHandler,
  ConvertirPropuestaOrdenHandler,
];

const QueryHandlers = [
  GetPropuestasPendientesHandler,
];

/**
 * PropuestasCorrectivoModule
 * FASE 4.9: Módulo propuestas correctivo desde mantenimiento
 */
@Module({
  imports: [CqrsModule, DatabaseModule],
  controllers: [PropuestasCorrectivoController],
  providers: [
    ...CommandHandlers,
    ...QueryHandlers,
  ],
  exports: [],
})
export class PropuestasCorrectivoModule {}
