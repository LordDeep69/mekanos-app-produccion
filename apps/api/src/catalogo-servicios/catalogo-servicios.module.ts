import { DatabaseModule } from '@mekanos/database';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

// Infrastructure
import { PrismaCatalogoServiciosRepository } from './infrastructure/prisma-catalogo-servicios.repository';

// Application - Commands
import { ActualizarCatalogoServicioHandler } from './application/commands/actualizar-catalogo-servicio.handler';
import { CrearCatalogoServicioHandler } from './application/commands/crear-catalogo-servicio.handler';
import { EliminarCatalogoServicioHandler } from './application/commands/eliminar-catalogo-servicio.handler';

// Application - Queries
import { BuscarPorCodigoHandler } from './application/queries/buscar-por-codigo.handler';
import { ListarCatalogosServicioHandler } from './application/queries/listar-catalogos-servicio.handler';
import { ObtenerCatalogoServicioPorIdHandler } from './application/queries/obtener-catalogo-servicio-por-id.handler';
import { ObtenerPorTipoServicioHandler } from './application/queries/obtener-por-tipo-servicio.handler';

// Presentation
import { CatalogoServiciosController } from './presentation/catalogo-servicios.controller';

const CommandHandlers = [
  CrearCatalogoServicioHandler,
  ActualizarCatalogoServicioHandler,
  EliminarCatalogoServicioHandler,
];

const QueryHandlers = [
  ObtenerCatalogoServicioPorIdHandler,
  ListarCatalogosServicioHandler,
  ObtenerPorTipoServicioHandler,
  BuscarPorCodigoHandler,
];

@Module({
  imports: [CqrsModule, DatabaseModule],
  controllers: [CatalogoServiciosController],
  providers: [
    PrismaCatalogoServiciosRepository,
    ...CommandHandlers,
    ...QueryHandlers,
  ],
  exports: [PrismaCatalogoServiciosRepository],
})
export class CatalogoServiciosModule {}

