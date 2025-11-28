/**
 * NOTIFICACIONES MODULE - MEKANOS S.A.S
 *
 * Módulo para gestión de notificaciones y tareas programadas.
 *
 * @author MEKANOS Development Team
 * @version 1.0.0
 * @since FASE 6 POST-CRUD
 */

import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from '@mekanos/database';
import { NotificacionesController } from './notificaciones.controller';
import { NotificacionesService } from './notificaciones.service';
import { TareasProgramadasService } from './tareas-programadas.service';

@Module({
  imports: [
    DatabaseModule,
    ScheduleModule.forRoot(), // Habilitar tareas programadas
  ],
  controllers: [NotificacionesController],
  providers: [NotificacionesService, TareasProgramadasService],
  exports: [NotificacionesService],
})
export class NotificacionesModule {}

