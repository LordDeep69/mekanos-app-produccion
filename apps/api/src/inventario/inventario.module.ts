// ═══════════════════════════════════════════════════════════════════════════════
// INVENTARIO MODULE - MÓDULO ENTERPRISE DE GESTIÓN LOGÍSTICA
// ═══════════════════════════════════════════════════════════════════════════════

import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { InventarioController } from './inventario.controller';
import { InventarioService } from './inventario.service';

@Module({
    imports: [PrismaModule],
    controllers: [InventarioController],
    providers: [InventarioService],
    exports: [InventarioService],
})
export class InventarioModule { }
