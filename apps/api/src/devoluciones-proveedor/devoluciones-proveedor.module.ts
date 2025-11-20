import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CrearDevolucionHandler } from './application/commands/crear-devolucion.command';
import { ProcesarDevolucionHandler } from './application/commands/procesar-devolucion.command';
import { GetDevolucionByIdHandler } from './application/queries/get-devolucion-by-id.query';
import { GetDevolucionesHandler } from './application/queries/get-devoluciones.query';
import { DevolucionesProveedorController } from './devoluciones-proveedor.controller';
import { PrismaDevolucionesProveedorRepository } from './infrastructure/persistence/prisma-devoluciones-proveedor.repository';

/**
 * Módulo: Devoluciones a Proveedor
 * Arquitectura CQRS con Commands y Queries separados
 */
@Module({
  imports: [CqrsModule],
  controllers: [DevolucionesProveedorController],
  providers: [
    // Repository con DI por interface
    {
      provide: 'IDevolucionesProveedorRepository',
      useClass: PrismaDevolucionesProveedorRepository,
    },
    // Command Handlers
    CrearDevolucionHandler,
    ProcesarDevolucionHandler,
    // Query Handlers
    GetDevolucionesHandler,
    GetDevolucionByIdHandler,
  ],
  exports: ['IDevolucionesProveedorRepository'],
})
export class DevolucionesProveedorModule {}
