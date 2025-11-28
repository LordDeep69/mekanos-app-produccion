import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '../database/prisma.module';

// Infrastructure
import { CatalogoSistemasMapper } from './infrastructure/catalogo-sistemas.mapper';
import { PrismaCatalogoSistemasRepository } from './infrastructure/prisma-catalogo-sistemas.repository';

// Application - Handlers
import { ActualizarCatalogoSistemasHandler } from './application/handlers/actualizar-catalogo-sistemas.handler';
import { CrearCatalogoSistemasHandler } from './application/handlers/crear-catalogo-sistemas.handler';
import { EliminarCatalogoSistemasHandler } from './application/handlers/eliminar-catalogo-sistemas.handler';
import { ListarCatalogoSistemasHandler } from './application/handlers/listar-catalogo-sistemas.handler';
import { ListarSistemasActivosHandler } from './application/handlers/listar-sistemas-activos.handler';
import { ObtenerCatalogoSistemasPorCodigoHandler } from './application/handlers/obtener-catalogo-sistemas-por-codigo.handler';
import { ObtenerCatalogoSistemasPorIdHandler } from './application/handlers/obtener-catalogo-sistemas-por-id.handler';

// Presentation
import { CatalogoSistemasController } from './presentation/catalogo-sistemas.controller';

const CommandHandlers = [
  CrearCatalogoSistemasHandler,
  ActualizarCatalogoSistemasHandler,
  EliminarCatalogoSistemasHandler,
];

const QueryHandlers = [
  ListarCatalogoSistemasHandler,
  ListarSistemasActivosHandler,
  ObtenerCatalogoSistemasPorIdHandler,
  ObtenerCatalogoSistemasPorCodigoHandler,
];

@Module({
  imports: [CqrsModule, PrismaModule],
  controllers: [CatalogoSistemasController],
  providers: [
    // Repository
    {
      provide: 'ICatalogoSistemasRepository',
      useClass: PrismaCatalogoSistemasRepository,
    },
    // Mapper
    CatalogoSistemasMapper,
    // Handlers
    ...CommandHandlers,
    ...QueryHandlers,
  ],
  exports: ['ICatalogoSistemasRepository', CatalogoSistemasMapper],
})
export class CatalogoSistemasModule {}
