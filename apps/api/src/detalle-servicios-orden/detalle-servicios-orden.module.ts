import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '../database/prisma.module';
import { PrismaDetalleServiciosOrdenRepository } from './infrastructure/prisma-detalle-servicios-orden.repository';
import { DetalleServiciosOrdenController } from './presentation/detalle-servicios-orden.controller';

// Commands
import { ActualizarDetalleServiciosOrdenHandler } from './application/handlers/actualizar-detalle-servicios-orden.handler';
import { CrearDetalleServiciosOrdenHandler } from './application/handlers/crear-detalle-servicios-orden.handler';
import { EliminarDetalleServiciosOrdenHandler } from './application/handlers/eliminar-detalle-servicios-orden.handler';

// Queries
import { ListarDetallePorOrdenHandler } from './application/handlers/listar-detalle-por-orden.handler';
import { ListarDetalleServiciosOrdenHandler } from './application/handlers/listar-detalle-servicios-orden.handler';
import { ObtenerDetalleServiciosOrdenPorIdHandler } from './application/handlers/obtener-detalle-servicios-orden-por-id.handler';
import { VerificarDetalleServiciosOrdenHandler } from './application/handlers/verificar-detalle-servicios-orden.handler';

const CommandHandlers = [
  CrearDetalleServiciosOrdenHandler,
  ActualizarDetalleServiciosOrdenHandler,
  EliminarDetalleServiciosOrdenHandler,
];

const QueryHandlers = [
  ListarDetalleServiciosOrdenHandler,
  ListarDetallePorOrdenHandler,
  ObtenerDetalleServiciosOrdenPorIdHandler,
  VerificarDetalleServiciosOrdenHandler,
];

@Module({
  imports: [CqrsModule, PrismaModule],
  controllers: [DetalleServiciosOrdenController],
  providers: [
    {
      provide: 'IDetalleServiciosOrdenRepository',
      useClass: PrismaDetalleServiciosOrdenRepository,
    },
    ...CommandHandlers,
    ...QueryHandlers,
  ],
  exports: ['IDetalleServiciosOrdenRepository'],
})
export class DetalleServiciosOrdenModule {}
