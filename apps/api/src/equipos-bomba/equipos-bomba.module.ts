import { DatabaseModule } from '@mekanos/database';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ActualizarEquipoBombaHandler } from './application/commands/actualizar-equipo-bomba.command';
import { CrearEquipoBombaHandler } from './application/commands/crear-equipo-bomba.command';
import { EliminarEquipoBombaHandler } from './application/commands/eliminar-equipo-bomba.command';
import { GetAllEquiposBombaHandler } from './application/queries/get-all-equipos-bomba.query';
import { GetEquipoBombaByIdHandler } from './application/queries/get-equipo-bomba-by-id.query';
import { EQUIPOS_BOMBA_REPOSITORY_TOKEN } from './constants';
import { EquiposBombaController } from './equipos-bomba.controller';
import { PrismaEquiposBombaRepository } from './infrastructure/persistence/prisma-equipos-bomba.repository';

const commandHandlers = [
  CrearEquipoBombaHandler,
  ActualizarEquipoBombaHandler,
  EliminarEquipoBombaHandler,
];

const queryHandlers = [
  GetAllEquiposBombaHandler,
  GetEquipoBombaByIdHandler,
];

@Module({
  imports: [CqrsModule, DatabaseModule],
  controllers: [EquiposBombaController],
  providers: [
    {
      provide: EQUIPOS_BOMBA_REPOSITORY_TOKEN,
      useClass: PrismaEquiposBombaRepository,
    },
    ...commandHandlers,
    ...queryHandlers,
  ],
  exports: [EQUIPOS_BOMBA_REPOSITORY_TOKEN],
})
export class EquiposBombaModule {}

