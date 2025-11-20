import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '../database/prisma.module';
import { PrismaTiposComponenteRepository } from './infrastructure/prisma-tipos-componente.repository';
import { TIPOS_COMPONENTE_REPOSITORY } from './tipos-componente.constants';
import { TiposComponenteController } from './tipos-componente.controller';

// Command Handlers
import { ActualizarTipoComponenteHandler } from './application/commands/actualizar-tipo-componente.handler';
import { CrearTipoComponenteHandler } from './application/commands/crear-tipo-componente.handler';
import { DesactivarTipoComponenteHandler } from './application/commands/desactivar-tipo-componente.handler';

// Query Handlers
import { GetTipoComponenteByIdHandler } from './application/queries/get-tipo-componente-by-id.handler';
import { GetTiposComponenteHandler } from './application/queries/get-tipos-componente.handler';

const commandHandlers = [
  CrearTipoComponenteHandler,
  ActualizarTipoComponenteHandler,
  DesactivarTipoComponenteHandler,
];

const queryHandlers = [
  GetTiposComponenteHandler,
  GetTipoComponenteByIdHandler,
];

@Module({
  imports: [CqrsModule, PrismaModule],
  controllers: [TiposComponenteController],
  providers: [
    {
      provide: TIPOS_COMPONENTE_REPOSITORY,
      useClass: PrismaTiposComponenteRepository,
    },
    ...commandHandlers,
    ...queryHandlers,
  ],
  exports: [TIPOS_COMPONENTE_REPOSITORY],
})
export class TiposComponenteModule {}
