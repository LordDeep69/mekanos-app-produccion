import { DatabaseModule } from '@mekanos/database';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ActualizarEquipoGeneradorHandler } from './application/commands/actualizar-equipo-generador.command';
import { CrearEquipoGeneradorHandler } from './application/commands/crear-equipo-generador.command';
import { EliminarEquipoGeneradorHandler } from './application/commands/eliminar-equipo-generador.command';
import { GetAllEquiposGeneradorHandler } from './application/queries/get-all-equipos-generador.query';
import { GetEquipoGeneradorByIdHandler } from './application/queries/get-equipo-generador-by-id.query';
import { EQUIPOS_GENERADOR_REPOSITORY_TOKEN } from './constants';
import { EquiposGeneradorController } from './equipos-generador.controller';
import { PrismaEquiposGeneradorRepository } from './infrastructure/persistence/prisma-equipos-generador.repository';

const commandHandlers = [
  CrearEquipoGeneradorHandler,
  ActualizarEquipoGeneradorHandler,
  EliminarEquipoGeneradorHandler,
];

const queryHandlers = [
  GetAllEquiposGeneradorHandler,
  GetEquipoGeneradorByIdHandler,
];

@Module({
  imports: [CqrsModule, DatabaseModule],
  controllers: [EquiposGeneradorController],
  providers: [
    {
      provide: EQUIPOS_GENERADOR_REPOSITORY_TOKEN,
      useClass: PrismaEquiposGeneradorRepository,
    },
    ...commandHandlers,
    ...queryHandlers,
  ],
  exports: [EQUIPOS_GENERADOR_REPOSITORY_TOKEN],
})
export class EquiposGeneradorModule {}

