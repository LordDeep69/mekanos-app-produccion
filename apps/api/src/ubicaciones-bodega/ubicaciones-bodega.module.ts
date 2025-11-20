import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaUbicacionesBodegaRepository } from './infrastructure/prisma-ubicaciones-bodega.repository';
import { UbicacionesBodegaController } from './ubicaciones-bodega.controller';

// Command Handlers
import { ActualizarUbicacionHandler } from './commands/actualizar-ubicacion.handler';
import { CrearUbicacionHandler } from './commands/crear-ubicacion.handler';
import { DesactivarUbicacionHandler } from './commands/desactivar-ubicacion.handler';

// Query Handlers
import { GetUbicacionByIdHandler } from './queries/get-ubicacion-by-id.handler';
import { GetUbicacionesHandler } from './queries/get-ubicaciones.handler';

const CommandHandlers = [
  CrearUbicacionHandler,
  ActualizarUbicacionHandler,
  DesactivarUbicacionHandler,
];
const QueryHandlers = [GetUbicacionesHandler, GetUbicacionByIdHandler];

@Module({
  imports: [CqrsModule],
  controllers: [UbicacionesBodegaController],
  providers: [
    PrismaUbicacionesBodegaRepository,
    ...CommandHandlers,
    ...QueryHandlers,
  ],
  exports: [PrismaUbicacionesBodegaRepository],
})
export class UbicacionesBodegaModule {}
