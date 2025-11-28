import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '../database/prisma.module';
import { ActualizarCatalogoActividadesHandler } from './application/handlers/actualizar-catalogo-actividades.handler';
import { CrearCatalogoActividadesHandler } from './application/handlers/crear-catalogo-actividades.handler';
import { EliminarCatalogoActividadesHandler } from './application/handlers/eliminar-catalogo-actividades.handler';
import { ListarActividadesActivasHandler } from './application/handlers/listar-actividades-activas.handler';
import { ListarCatalogoActividadesHandler } from './application/handlers/listar-catalogo-actividades.handler';
import { ObtenerCatalogoActividadesPorCodigoHandler } from './application/handlers/obtener-catalogo-actividades-por-codigo.handler';
import { ObtenerCatalogoActividadesPorIdHandler } from './application/handlers/obtener-catalogo-actividades-por-id.handler';
import { PrismaCatalogoActividadesRepository } from './infrastructure/prisma-catalogo-actividades.repository';
import { CatalogoActividadesController } from './presentation/catalogo-actividades.controller';

const CommandHandlers = [
  CrearCatalogoActividadesHandler,
  ActualizarCatalogoActividadesHandler,
  EliminarCatalogoActividadesHandler,
];

const QueryHandlers = [
  ListarCatalogoActividadesHandler,
  ListarActividadesActivasHandler,
  ObtenerCatalogoActividadesPorIdHandler,
  ObtenerCatalogoActividadesPorCodigoHandler,
];

@Module({
  imports: [CqrsModule, PrismaModule],
  controllers: [CatalogoActividadesController],
  providers: [
    ...CommandHandlers,
    ...QueryHandlers,
    {
      provide: 'CatalogoActividadesRepository',
      useClass: PrismaCatalogoActividadesRepository,
    },
  ],
  exports: ['CatalogoActividadesRepository'],
})
export class CatalogoActividadesModule {}
