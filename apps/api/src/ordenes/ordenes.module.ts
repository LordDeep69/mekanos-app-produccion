import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { DatabaseModule } from '@mekanos/database';

// Controller
import { OrdenesController } from './ordenes.controller';

// Command Handlers
import { CreateOrdenHandler } from './commands/create-orden.handler';
import { UpdateOrdenHandler } from './commands/update-orden.handler';
import { CancelarOrdenHandler } from './commands/cancelar-orden.handler';
import { ProgramarOrdenHandler } from './commands/programar-orden.handler';
import { AsignarTecnicoHandler } from './commands/asignar-tecnico.handler';
import { IniciarOrdenHandler } from './commands/iniciar-orden.handler';
import { AprobarOrdenHandler } from './commands/aprobar-orden.handler';

// Query Handlers
import { GetOrdenByIdHandler } from './queries/get-orden-by-id.handler';
import { GetOrdenesHandler } from './queries/get-ordenes.handler';

// Infrastructure
import { PrismaOrdenServicioRepository } from './infrastructure/prisma-orden-servicio.repository';

/**
 * OrdenesModule - FASE 3
 * Módulo completo de Órdenes de Servicio con CQRS
 * 
 * FEATURES:
 * - CRUD completo con Prisma
 * - Workflow de 7 estados (PROGRAMADA → APROBADA)
 * - Validaciones de transición de estados
 * - Filtros avanzados con paginación
 */
@Module({
  imports: [
    CqrsModule,
    DatabaseModule, // Prisma
  ],
  controllers: [OrdenesController],
  providers: [
    // Repository: Doble registro (token + clase) para compatibilidad
    {
      provide: 'IOrdenServicioRepository',
      useClass: PrismaOrdenServicioRepository,
    },
    PrismaOrdenServicioRepository, // ✅ También como clase para handlers que lo usan directamente

    // Command Handlers (8 comandos activos - FinalizarOrden requiere FASE 5)
    CreateOrdenHandler,
    UpdateOrdenHandler,
    CancelarOrdenHandler,
    ProgramarOrdenHandler,
    AsignarTecnicoHandler,
    IniciarOrdenHandler,
    // FinalizarOrdenHandler, // ⏸️ DESACTIVADO: Requiere PdfService, R2StorageService, EmailService (FASE 5)
    AprobarOrdenHandler,

    // Query Handlers (2 queries)
    GetOrdenByIdHandler,
    GetOrdenesHandler,
  ],
  exports: ['IOrdenServicioRepository'], // Export usando el token
})
export class OrdenesModule {}
