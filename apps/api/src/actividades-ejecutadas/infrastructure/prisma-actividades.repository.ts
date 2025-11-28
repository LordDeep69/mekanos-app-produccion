import { Injectable } from '@nestjs/common';
import { actividades_ejecutadas } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateActividadCommand } from '../application/commands/create-actividad.command';
import { UpdateActividadCommand } from '../application/commands/update-actividad.command';
import { ActividadesRepository } from '../domain/actividades.repository';

@Injectable()
export class PrismaActividadesRepository implements ActividadesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(command: CreateActividadCommand): Promise<actividades_ejecutadas> {
    return this.prisma.actividades_ejecutadas.create({
      data: {
        id_orden_servicio: command.idOrdenServicio,
        id_actividad_catalogo: command.idActividadCatalogo ?? null,
        descripcion_manual: command.descripcionManual ?? null,
        sistema: command.sistema ?? null,
        orden_secuencia: command.ordenSecuencia ?? null,
        estado: command.estado ?? null,
        observaciones: command.observaciones ?? null,
        ejecutada: command.ejecutada ?? true,
        ejecutada_por: command.ejecutadaPor ?? null,
        tiempo_ejecucion_minutos: command.tiempoEjecucionMinutos ?? null,
        requiere_evidencia: command.requiereEvidencia ?? false,
        evidencia_capturada: command.evidenciaCapturada ?? false,
      },
      include: {
        empleados: true,
        catalogo_actividades: true,
        ordenes_servicio: true,
      },
    });
  }

  async update(id: number, command: Partial<UpdateActividadCommand>): Promise<actividades_ejecutadas> {
    return this.prisma.actividades_ejecutadas.update({
      where: { id_actividad_ejecutada: id },
      data: {
        ...(command.idOrdenServicio !== undefined && { id_orden_servicio: command.idOrdenServicio }),
        ...(command.idActividadCatalogo !== undefined && { id_actividad_catalogo: command.idActividadCatalogo }),
        ...(command.descripcionManual !== undefined && { descripcion_manual: command.descripcionManual }),
        ...(command.sistema !== undefined && { sistema: command.sistema }),
        ...(command.ordenSecuencia !== undefined && { orden_secuencia: command.ordenSecuencia }),
        ...(command.estado !== undefined && { estado: command.estado }),
        ...(command.observaciones !== undefined && { observaciones: command.observaciones }),
        ...(command.ejecutada !== undefined && { ejecutada: command.ejecutada }),
        ...(command.ejecutadaPor !== undefined && { ejecutada_por: command.ejecutadaPor }),
        ...(command.tiempoEjecucionMinutos !== undefined && { tiempo_ejecucion_minutos: command.tiempoEjecucionMinutos }),
        ...(command.requiereEvidencia !== undefined && { requiere_evidencia: command.requiereEvidencia }),
        ...(command.evidenciaCapturada !== undefined && { evidencia_capturada: command.evidenciaCapturada }),
      },
      include: {
        empleados: true,
        catalogo_actividades: true,
        ordenes_servicio: true,
      },
    });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.actividades_ejecutadas.update({
      where: { id_actividad_ejecutada: id },
      data: { ejecutada: false },
    });
  }

  async findById(id: number): Promise<actividades_ejecutadas | null> {
    return this.prisma.actividades_ejecutadas.findUnique({
      where: { id_actividad_ejecutada: id },
      include: {
        empleados: true,
        catalogo_actividades: true,
        ordenes_servicio: true,
      },
    });
  }

  async findByOrden(ordenId: number): Promise<actividades_ejecutadas[]> {
    return this.prisma.actividades_ejecutadas.findMany({
      where: { id_orden_servicio: ordenId },
      include: {
        empleados: true,
        catalogo_actividades: true,
        ordenes_servicio: true,
      },
      orderBy: [
        { orden_secuencia: 'asc' },
        { fecha_ejecucion: 'asc' },
      ],
    });
  }

  async findAll(): Promise<actividades_ejecutadas[]> {
    return this.prisma.actividades_ejecutadas.findMany({
      include: {
        empleados: true,
        catalogo_actividades: true,
        ordenes_servicio: true,
      },
      orderBy: { fecha_registro: 'desc' },
    });
  }
}

