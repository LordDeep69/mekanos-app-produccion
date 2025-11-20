import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '../database/prisma.module';
import { CATALOGO_SISTEMAS_REPOSITORY } from './catalogo-sistemas.constants';
import { CatalogoSistemasController } from './catalogo-sistemas.controller';
import { PrismaCatalogoSistemasRepository } from './infrastructure/prisma-catalogo-sistemas.repository';

// Command Handlers
import { ActualizarCatalogoSistemaHandler } from './application/commands/actualizar-catalogo-sistema.handler';
import { CrearCatalogoSistemaHandler } from './application/commands/crear-catalogo-sistema.handler';
import { DesactivarCatalogoSistemaHandler } from './application/commands/desactivar-catalogo-sistema.handler';

// Query Handlers
import { GetCatalogoSistemaByIdHandler } from './application/queries/get-catalogo-sistema-by-id.handler';
import { GetCatalogoSistemasHandler } from './application/queries/get-catalogo-sistemas.handler';

const commandHandlers = [
  CrearCatalogoSistemaHandler,
  ActualizarCatalogoSistemaHandler,
  DesactivarCatalogoSistemaHandler,
];

const queryHandlers = [
  GetCatalogoSistemasHandler,
  GetCatalogoSistemaByIdHandler,
];

@Module({
  imports: [CqrsModule, PrismaModule],
  controllers: [CatalogoSistemasController],
  providers: [
    {
      provide: CATALOGO_SISTEMAS_REPOSITORY,
      useClass: PrismaCatalogoSistemasRepository,
    },
    ...commandHandlers,
    ...queryHandlers,
  ],
  exports: [CATALOGO_SISTEMAS_REPOSITORY],
})
export class CatalogoSistemasModule {}
