import { DatabaseModule } from '@mekanos/database';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

// Controller
import { OrdenesController } from './ordenes.controller';

// Command Handlers
import { AprobarOrdenHandler } from './commands/aprobar-orden.handler';
import { AsignarTecnicoHandler } from './commands/asignar-tecnico.handler';
import { CambiarEstadoOrdenHandler } from './commands/cambiar-estado-orden.handler';
import { CancelarOrdenHandler } from './commands/cancelar-orden.handler';
import { CreateOrdenHandler } from './commands/create-orden.handler';
import { FinalizarOrdenHandler } from './commands/finalizar-orden.handler';
import { IniciarOrdenHandler } from './commands/iniciar-orden.handler';
import { ProgramarOrdenHandler } from './commands/programar-orden.handler';
import { UpdateOrdenHandler } from './commands/update-orden.handler';

// Query Handlers
import { GetOrdenByIdHandler } from './queries/get-orden-by-id.handler';
import { GetOrdenesHandler } from './queries/get-ordenes.handler';

// Infrastructure
import { PrismaOrdenServicioRepository } from './infrastructure/prisma-orden-servicio.repository';

// Services
import { FinalizacionOrdenService } from './services/finalizacion-orden.service';

// Módulos externos (para FinalizarOrden)
import { EmailModule } from '../email/email.module';
import { PdfModule } from '../pdf/pdf.module';
import { StorageModule } from '../storage/storage.module';

/**
 * OrdenesModule - FASE 3 COMPLETA
 * Módulo completo de Órdenes de Servicio con CQRS
 * 
 * FEATURES:
 * - CRUD completo con Prisma
 * - Workflow de 7 estados (PROGRAMADA → APROBADA)
 * - Validaciones de transición de estados (FSM)
 * - Historial automático de cambios de estado
 * - Filtros avanzados con paginación
 * - Generación automática de PDF al finalizar
 * - Almacenamiento en Cloudflare R2
 * - Envío de email al cliente
 */
@Module({
  imports: [
    CqrsModule,
    DatabaseModule, // Prisma
    PdfModule,      // Generación de PDFs
    EmailModule,    // Envío de emails
    StorageModule,  // R2 + Cloudinary
    ConfigParametrosModule, // ✅ FLEXIBILIZACIÓN PARÁMETROS: Unidades dinámicas
  ],
  controllers: [OrdenesController],
  providers: [
    // Repository: Doble registro (token + clase) para compatibilidad
    {
      provide: 'IOrdenServicioRepository',
      useClass: PrismaOrdenServicioRepository,
    },
    PrismaOrdenServicioRepository, // ✅ También como clase para handlers que lo usan directamente

    // Command Handlers (10 comandos activos)
    CreateOrdenHandler,
    UpdateOrdenHandler,
    CancelarOrdenHandler,
    ProgramarOrdenHandler,
    AsignarTecnicoHandler,
    IniciarOrdenHandler,
    CambiarEstadoOrdenHandler, // ✅ FSM unificado + historial automático
    FinalizarOrdenHandler,     // ✅ HABILITADO: PDF + R2 + Email integrados
    AprobarOrdenHandler,

    // Query Handlers (2 queries)
    GetOrdenByIdHandler,
    GetOrdenesHandler,

    // Services (Finalizacion Completa)
    FinalizacionOrdenService,
  ],
  exports: ['IOrdenServicioRepository'], // Export usando el token
})
export class OrdenesModule { }
