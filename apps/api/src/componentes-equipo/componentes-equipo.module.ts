import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '../database/prisma.module';
import { COMPONENTES_EQUIPO_REPOSITORY } from './componentes-equipo.constants';
import { ComponentesEquipoController } from './componentes-equipo.controller';
import { PrismaComponentesEquipoRepository } from './infrastructure/persistence/prisma-componentes-equipo.repository';

// Command Handlers
import { ActualizarComponenteEquipoHandler } from './application/commands/actualizar-componente-equipo.handler';
import { CrearComponenteEquipoHandler } from './application/commands/crear-componente-equipo.handler';
import { DesactivarComponenteEquipoHandler } from './application/commands/desactivar-componente-equipo.handler';

// Query Handlers
import { GetComponenteEquipoByIdHandler } from './application/queries/get-componente-equipo-by-id.handler';
import { GetComponentesEquipoHandler } from './application/queries/get-componentes-equipo.handler';
import { GetComponentesPorEquipoHandler } from './application/queries/get-componentes-por-equipo.handler';

const commandHandlers = [
  CrearComponenteEquipoHandler,
  ActualizarComponenteEquipoHandler,
  DesactivarComponenteEquipoHandler,
];

const queryHandlers = [
  GetComponentesEquipoHandler,
  GetComponenteEquipoByIdHandler,
  GetComponentesPorEquipoHandler,
];

@Module({
  imports: [CqrsModule, PrismaModule],
  controllers: [ComponentesEquipoController],
  providers: [
    {
      provide: COMPONENTES_EQUIPO_REPOSITORY,
      useClass: PrismaComponentesEquipoRepository,
    },
    ...commandHandlers,
    ...queryHandlers,
  ],
  exports: [COMPONENTES_EQUIPO_REPOSITORY],
})
export class ComponentesEquipoModule {}
