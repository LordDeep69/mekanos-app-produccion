/**
 * NOTIFICACIONES CONTROLLER - MEKANOS S.A.S
 *
 * Endpoints para gestión de notificaciones del usuario actual.
 *
 * @author MEKANOS Development Team
 * @version 1.0.0
 * @since FASE 6 POST-CRUD
 */

import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificacionesService, TipoNotificacion, PrioridadNotificacion } from './notificaciones.service';

@ApiTags('Notificaciones')
@ApiBearerAuth()
@Controller('notificaciones')
@UseGuards(JwtAuthGuard)
export class NotificacionesController {
  constructor(private readonly notificacionesService: NotificacionesService) {}

  /**
   * Lista las notificaciones del usuario autenticado
   */
  @Get()
  @ApiOperation({ summary: 'Listar notificaciones del usuario actual' })
  @ApiQuery({ name: 'soloNoLeidas', required: false, type: Boolean })
  @ApiQuery({ name: 'tipo', required: false, enum: ['ORDEN_ASIGNADA', 'ORDEN_COMPLETADA', 'ORDEN_VENCIDA', 'COTIZACION_APROBADA', 'COTIZACION_RECHAZADA', 'CONTRATO_POR_VENCER', 'SERVICIO_PROGRAMADO', 'ALERTA_MEDICION', 'RECORDATORIO', 'SISTEMA'] })
  @ApiQuery({ name: 'prioridad', required: false, enum: ['BAJA', 'NORMAL', 'ALTA', 'URGENTE'] })
  @ApiQuery({ name: 'limite', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async listar(
    @Request() req: any,
    @Query('soloNoLeidas') soloNoLeidas?: string,
    @Query('tipo') tipo?: TipoNotificacion,
    @Query('prioridad') prioridad?: PrioridadNotificacion,
    @Query('limite') limite?: string,
    @Query('offset') offset?: string,
  ) {
    const idUsuario = req.user.id_usuario || req.user.sub;
    
    const notificaciones = await this.notificacionesService.listar({
      idUsuario,
      soloNoLeidas: soloNoLeidas === 'true',
      tipo,
      prioridad,
      limite: limite ? parseInt(limite) : 50,
      offset: offset ? parseInt(offset) : 0,
    });

    const noLeidas = await this.notificacionesService.contarNoLeidas(idUsuario);

    return {
      data: notificaciones,
      meta: {
        total: notificaciones.length,
        noLeidas,
      },
    };
  }

  /**
   * Obtiene el conteo de notificaciones no leídas
   */
  @Get('conteo')
  @ApiOperation({ summary: 'Obtener conteo de notificaciones no leídas' })
  async conteoNoLeidas(@Request() req: any) {
    const idUsuario = req.user.id_usuario || req.user.sub;
    const conteo = await this.notificacionesService.contarNoLeidas(idUsuario);
    
    return { noLeidas: conteo };
  }

  /**
   * Marca una notificación como leída
   */
  @Patch(':id/leer')
  @ApiOperation({ summary: 'Marcar notificación como leída' })
  async marcarLeida(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    const idUsuario = req.user.id_usuario || req.user.sub;
    return this.notificacionesService.marcarLeida(id, idUsuario);
  }

  /**
   * Marca todas las notificaciones como leídas
   */
  @Patch('leer-todas')
  @ApiOperation({ summary: 'Marcar todas las notificaciones como leídas' })
  async marcarTodasLeidas(@Request() req: any) {
    const idUsuario = req.user.id_usuario || req.user.sub;
    return this.notificacionesService.marcarTodasLeidas(idUsuario);
  }

  /**
   * Elimina una notificación
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar notificación' })
  async eliminar(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    const idUsuario = req.user.id_usuario || req.user.sub;
    return this.notificacionesService.eliminar(id, idUsuario);
  }
}

