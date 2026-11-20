import { DatabaseModule } from '@mekanos/database';
import { Module, forwardRef } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

// Controller
import { PropuestasCorrectivoController } from './propuestas-correctivo.controller';

// Command Handlers
import { ConvertirPropuestaOrdenHandler } from '../commands/propuestas/convertir-propuesta-orden.handler';
import { CreatePropuestaHandler } from '../commands/propuestas/create-propuesta.handler';

// Query Handlers
import { GetPropuestasPendientesHandler } from '../queries/propuestas/get-propuestas-pendientes.handler';

// Cotizaciones CPQ
import { CotizacionesModule } from '../cotizaciones.module';

const CommandHandlers = [
  CreatePropuestaHandler,
  ConvertirPropuestaOrdenHandler,
];

const QueryHandlers = [
  GetPropuestasPendientesHandler,
];

@Module({
  imports: [CqrsModule, DatabaseModule, forwardRef(() => CotizacionesModule)],
  controllers: [PropuestasCorrectivoController],
  providers: [
    ...CommandHandlers,
    ...QueryHandlers,
  ],
  exports: [],
})
export class PropuestasCorrectivoModule {}
