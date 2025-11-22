import { DatabaseModule } from '@mekanos/database';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaTiposServicioRepository } from './infrastructure/prisma-tipos-servicio.repository';
import { TiposServicioController } from './tipos-servicio.controller';

// Commands
import { CreateTiposServicioHandler } from './commands/create-tipos-servicio.handler';
import { DeleteTiposServicioHandler } from './commands/delete-tipos-servicio.handler';
import { UpdateTiposServicioHandler } from './commands/update-tipos-servicio.handler';

// Queries
import { GetTiposServicioByCategoriaHandler } from './queries/get-tipos-servicio-by-categoria.handler';
import { GetTiposServicioByIdHandler } from './queries/get-tipos-servicio-by-id.handler';
import { GetTiposServicioHandler } from './queries/get-tipos-servicio.handler';

/**
 * Módulo: Tipos de Servicio
 * 
 * Arquitectura CQRS completa:
 * - Repository para acceso a datos (requiere DatabaseModule para PrismaService)
 * - Commands para operaciones de escritura (CREATE, UPDATE, DELETE)
 * - Queries para operaciones de lectura (GET)
 * - Controller como capa de presentación REST
 * 
 * Exporta Repository para uso en otros módulos
 */
@Module({
  imports: [CqrsModule, DatabaseModule],
  controllers: [TiposServicioController],
  providers: [
    // Repository
    PrismaTiposServicioRepository,

    // Command Handlers
    CreateTiposServicioHandler,
    UpdateTiposServicioHandler,
    DeleteTiposServicioHandler,

    // Query Handlers
    GetTiposServicioHandler,
    GetTiposServicioByIdHandler,
    GetTiposServicioByCategoriaHandler,
  ],
  exports: [PrismaTiposServicioRepository],
})
export class TiposServicioModule {}
