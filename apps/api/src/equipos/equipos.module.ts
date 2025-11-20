import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '../database/prisma.module';
import { EquiposController } from './equipos.controller';
import { PrismaEquipoRepository } from './infrastructure/prisma-equipo.repository';
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
 * ✅ FASE 2: Usa PrismaEquipoRepository real (no mock)
 */
@Module({
  imports: [
    CqrsModule,
    PrismaModule // ← AGREGADO: Acceso a PrismaService
  ],
  controllers: [EquiposController],
  providers: [
    {
      provide: 'IEquipoRepository',
      useClass: PrismaEquipoRepository // ← CAMBIADO de MockEquipoRepository
    },
    ...CommandHandlers,
    ...QueryHandlers
  ],
  exports: [...CommandHandlers, ...QueryHandlers]
})
export class EquiposModule {}
