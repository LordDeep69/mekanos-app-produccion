import { Injectable } from '@nestjs/common';
import { componentes_usados, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { IComponentesUsadosRepository } from '../domain/componentes-usados.repository.interface';
import { CreateComponenteUsadoDto } from '../dto/create-componente-usado.dto';
import { UpdateComponenteUsadoDto } from '../dto/update-componente-usado.dto';

/**
 * Repositorio Prisma para componentes usados
 * Tabla 12/14 - FASE 3
 */
@Injectable()
export class PrismaComponentesUsadosRepository implements IComponentesUsadosRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Include para relaciones
  private readonly includeRelations = {
    ordenes_servicio: {
      select: {
        id_orden_servicio: true,
        numero_orden: true,
        fecha_programada: true,
      },
    },
    catalogo_componentes: {
      select: {
        id_componente: true,
        descripcion_corta: true,
        referencia_fabricante: true,
      },
    },
    tipos_componente: {
      select: {
        id_tipo_componente: true,
        nombre_componente: true,
      },
    },
    actividades_ejecutadas: {
      select: {
        id_actividad_ejecutada: true,
        descripcion_manual: true,
      },
    },
    empleados: {
      select: {
        id_empleado: true,
      },
    },
  };

  async create(data: CreateComponenteUsadoDto & { costoTotal?: number | null }): Promise<componentes_usados> {
    const createData: Prisma.componentes_usadosCreateInput = {
      ordenes_servicio: {
        connect: { id_orden_servicio: data.idOrdenServicio },
      },
      descripcion: data.descripcion,
      referencia_manual: data.referenciaManual,
      marca_manual: data.marcaManual,
      cantidad: data.cantidad ?? 1,
      unidad: data.unidad ?? 'unidad',
      costo_unitario: data.costoUnitario,
      costo_total: data.costoTotal,
      estado_componente_retirado: data.estadoComponenteRetirado as any,
      razon_uso: data.razonUso,
      componente_guardado: data.componenteGuardado ?? false,
      origen_componente: data.origenComponente as any ?? 'BODEGA',
      observaciones: data.observaciones,
      fecha_uso: data.fechaUso ? new Date(data.fechaUso) : new Date(),
    };

    // Conexiones opcionales de FKs
    if (data.idComponente) {
      createData.catalogo_componentes = {
        connect: { id_componente: data.idComponente },
      };
    }

    if (data.idTipoComponente) {
      createData.tipos_componente = {
        connect: { id_tipo_componente: data.idTipoComponente },
      };
    }

    if (data.idActividadEjecutada) {
      createData.actividades_ejecutadas = {
        connect: { id_actividad_ejecutada: data.idActividadEjecutada },
      };
    }

    if (data.usadoPor) {
      createData.empleados = {
        connect: { id_empleado: data.usadoPor },
      };
    }

    if (data.registradoPor) {
      createData.usuarios_componentes_usados_registrado_porTousuarios = {
        connect: { id_usuario: data.registradoPor },
      };
    }

    return this.prisma.componentes_usados.create({
      data: createData,
      include: this.includeRelations,
    });
  }

  async update(id: number, data: UpdateComponenteUsadoDto & { costoTotal?: number | null }): Promise<componentes_usados> {
    const updateData: Prisma.componentes_usadosUpdateInput = {};

    // Campos simples
    if (data.descripcion !== undefined) updateData.descripcion = data.descripcion;
    if (data.referenciaManual !== undefined) updateData.referencia_manual = data.referenciaManual;
    if (data.marcaManual !== undefined) updateData.marca_manual = data.marcaManual;
    if (data.cantidad !== undefined) updateData.cantidad = data.cantidad;
    if (data.unidad !== undefined) updateData.unidad = data.unidad;
    if (data.costoUnitario !== undefined) updateData.costo_unitario = data.costoUnitario;
    if (data.costoTotal !== undefined) updateData.costo_total = data.costoTotal;
    if (data.estadoComponenteRetirado !== undefined) updateData.estado_componente_retirado = data.estadoComponenteRetirado as any;
    if (data.razonUso !== undefined) updateData.razon_uso = data.razonUso;
    if (data.componenteGuardado !== undefined) updateData.componente_guardado = data.componenteGuardado;
    if (data.origenComponente !== undefined) updateData.origen_componente = data.origenComponente as any;
    if (data.observaciones !== undefined) updateData.observaciones = data.observaciones;
    if (data.fechaUso !== undefined) updateData.fecha_uso = new Date(data.fechaUso);

    // Relaciones (connect/disconnect)
    if (data.idOrdenServicio !== undefined) {
      updateData.ordenes_servicio = {
        connect: { id_orden_servicio: data.idOrdenServicio },
      };
    }

    if (data.idComponente !== undefined) {
      updateData.catalogo_componentes = data.idComponente 
        ? { connect: { id_componente: data.idComponente } }
        : { disconnect: true };
    }

    if (data.idTipoComponente !== undefined) {
      updateData.tipos_componente = data.idTipoComponente 
        ? { connect: { id_tipo_componente: data.idTipoComponente } }
        : { disconnect: true };
    }

    if (data.idActividadEjecutada !== undefined) {
      updateData.actividades_ejecutadas = data.idActividadEjecutada 
        ? { connect: { id_actividad_ejecutada: data.idActividadEjecutada } }
        : { disconnect: true };
    }

    if (data.usadoPor !== undefined) {
      updateData.empleados = data.usadoPor 
        ? { connect: { id_empleado: data.usadoPor } }
        : { disconnect: true };
    }

    return this.prisma.componentes_usados.update({
      where: { id_componente_usado: id },
      data: updateData,
      include: this.includeRelations,
    });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.componentes_usados.delete({
      where: { id_componente_usado: id },
    });
  }

  async findById(id: number): Promise<componentes_usados | null> {
    return this.prisma.componentes_usados.findUnique({
      where: { id_componente_usado: id },
      include: this.includeRelations,
    });
  }

  async findAll(): Promise<componentes_usados[]> {
    return this.prisma.componentes_usados.findMany({
      include: this.includeRelations,
      orderBy: { fecha_registro: 'desc' },
    });
  }

  async findByOrden(idOrden: number): Promise<componentes_usados[]> {
    return this.prisma.componentes_usados.findMany({
      where: { id_orden_servicio: idOrden },
      include: this.includeRelations,
      orderBy: { fecha_uso: 'desc' },
    });
  }
}
