import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '../database/prisma.module';
import { PrismaTiposEquipoRepository } from './infrastructure/prisma-tipos-equipo.repository';
import { TIPOS_EQUIPO_REPOSITORY } from './tipos-equipo.constants';
import { TiposEquipoController } from './tipos-equipo.controller';

// Command Handlers
import { ActualizarTipoEquipoHandler } from './application/commands/actualizar-tipo-equipo.handler';
import { CrearTipoEquipoHandler } from './application/commands/crear-tipo-equipo.handler';
import { DesactivarTipoEquipoHandler } from './application/commands/desactivar-tipo-equipo.handler';

// Query Handlers
import { GetTipoEquipoByIdHandler } from './application/queries/get-tipo-equipo-by-id.handler';
import { GetTiposEquipoHandler } from './application/queries/get-tipos-equipo.handler';

const commandHandlers = [
  CrearTipoEquipoHandler,
  ActualizarTipoEquipoHandler,
  DesactivarTipoEquipoHandler,
];

const queryHandlers = [GetTiposEquipoHandler, GetTipoEquipoByIdHandler];

@Module({
  imports: [CqrsModule, PrismaModule],
  controllers: [TiposEquipoController],
  providers: [
    {
      provide: TIPOS_EQUIPO_REPOSITORY,
      useClass: PrismaTiposEquipoRepository,
    },
    ...commandHandlers,
    ...queryHandlers,
  ],
  exports: [TIPOS_EQUIPO_REPOSITORY],
})
export class TiposEquipoModule {}

