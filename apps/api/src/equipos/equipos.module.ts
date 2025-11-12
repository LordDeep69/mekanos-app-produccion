import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { EquiposController } from './equipos.controller';
import { MockEquipoRepository } from './infrastructure/mock-equipo.repository';
import { CreateEquipoHandler } from './commands/create-equipo.handler';
import { UpdateEquipoHandler } from './commands/update-equipo.handler';
import { DeleteEquipoHandler } from './commands/delete-equipo.handler';
import { GetEquipoHandler } from './queries/get-equipo.handler';
import { GetEquiposHandler } from './queries/get-equipos.handler';

const CommandHandlers = [
  CreateEquipoHandler,
  UpdateEquipoHandler,
  DeleteEquipoHandler
];

const QueryHandlers = [
  GetEquipoHandler,
  GetEquiposHandler
];

/**
 * Módulo de Equipos
 * Gestión de equipos (CRUD + lógica de negocio)
 */
@Module({
  imports: [CqrsModule],
  controllers: [EquiposController],
  providers: [
    {
      provide: 'IEquipoRepository',
      useClass: MockEquipoRepository
    },
    ...CommandHandlers,
    ...QueryHandlers
  ],
  exports: [...CommandHandlers, ...QueryHandlers]
})
export class EquiposModule {}
