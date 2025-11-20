import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '../database/prisma.module';
import { CATALOGO_COMPONENTES_REPOSITORY } from './catalogo-componentes.constants';
import { CatalogoComponentesController } from './catalogo-componentes.controller';
import { PrismaCatalogoComponentesRepository } from './infrastructure/persistence/prisma-catalogo-componentes.repository';

// Command Handlers
import { ActualizarCatalogoComponenteHandler } from './application/commands/actualizar-catalogo-componente.handler';
import { CrearCatalogoComponenteHandler } from './application/commands/crear-catalogo-componente.handler';
import { DesactivarCatalogoComponenteHandler } from './application/commands/desactivar-catalogo-componente.handler';

// Query Handlers
import { GetCatalogoComponenteByIdHandler } from './application/queries/get-catalogo-componente-by-id.handler';
import { GetCatalogoComponentesHandler } from './application/queries/get-catalogo-componentes.handler';

const commandHandlers = [
  CrearCatalogoComponenteHandler,
  ActualizarCatalogoComponenteHandler,
  DesactivarCatalogoComponenteHandler,
];

const queryHandlers = [
  GetCatalogoComponentesHandler,
  GetCatalogoComponenteByIdHandler,
];

@Module({
  imports: [CqrsModule, PrismaModule],
  controllers: [CatalogoComponentesController],
  providers: [
    {
      provide: CATALOGO_COMPONENTES_REPOSITORY,
      useClass: PrismaCatalogoComponentesRepository,
    },
    ...commandHandlers,
    ...queryHandlers,
  ],
  exports: [CATALOGO_COMPONENTES_REPOSITORY],
})
export class CatalogoComponentesModule {}
