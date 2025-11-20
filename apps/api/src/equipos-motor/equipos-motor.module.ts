import { DatabaseModule } from '@mekanos/database';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ActualizarEquipoMotorHandler } from './application/commands/actualizar-equipo-motor.command';
import { CrearEquipoMotorHandler } from './application/commands/crear-equipo-motor.command';
import { EliminarEquipoMotorHandler } from './application/commands/eliminar-equipo-motor.command';
import { GetAllEquiposMotorHandler } from './application/queries/get-all-equipos-motor.query';
import { GetEquipoMotorByIdHandler } from './application/queries/get-equipo-motor-by-id.query';
import { EQUIPOS_MOTOR_REPOSITORY_TOKEN } from './constants';
import { EquiposMotorController } from './equipos-motor.controller';
import { PrismaEquiposMotorRepository } from './infrastructure/persistence/prisma-equipos-motor.repository';

const commandHandlers = [
  CrearEquipoMotorHandler,
  ActualizarEquipoMotorHandler,
  EliminarEquipoMotorHandler,
];

const queryHandlers = [
  GetAllEquiposMotorHandler,
  GetEquipoMotorByIdHandler,
];

@Module({
  imports: [CqrsModule, DatabaseModule],
  controllers: [EquiposMotorController],
  providers: [
    {
      provide: EQUIPOS_MOTOR_REPOSITORY_TOKEN,
      useClass: PrismaEquiposMotorRepository,
    },
    ...commandHandlers,
    ...queryHandlers,
  ],
  exports: [EQUIPOS_MOTOR_REPOSITORY_TOKEN],
})
export class EquiposMotorModule {}
