import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { componentes_equipo } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

export interface CrearComponenteEquipoData {
  id_equipo: number;
  id_tipo_componente: number;
  id_componente?: number;
  posicion_descripcion: string;
  referencia_manual?: string;
  marca_manual?: string;
  unidades_por_cambio?: number;
  especificaciones_adicionales?: any;
  fecha_instalacion_inicial?: Date;
  notas?: string;
  creado_por: number;
}

export interface ActualizarComponenteEquipoData {
  id_componente?: number;
  posicion_descripcion?: string;
  referencia_manual?: string;
  marca_manual?: string;
  unidades_por_cambio?: number;
  especificaciones_adicionales?: any;
  fecha_ultimo_cambio?: Date;
  notas?: string;
  activo?: boolean;
  modificado_por?: number;
}

export interface FiltrosComponenteEquipo {
  id_equipo?: number;
  id_tipo_componente?: number;
  activo?: boolean;
  skip?: number;
  limit?: number;
}

@Injectable()
export class PrismaComponentesEquipoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async crear(data: CrearComponenteEquipoData): Promise<componentes_equipo> {
    // Validar que el equipo existe
    const equipo = await this.prisma.equipos.findUnique({
      where: { id_equipo: data.id_equipo },
    });
    if (!equipo) {
      throw new NotFoundException(`Equipo ${data.id_equipo} no encontrado`);
    }

    // Validar que el tipo de componente existe
    const tipoComponente = await this.prisma.tipos_componente.findUnique({
      where: { id_tipo_componente: data.id_tipo_componente },
    });
    if (!tipoComponente) {
      throw new NotFoundException(`Tipo de componente ${data.id_tipo_componente} no encontrado`);
    }

    // Validar constraint: Si tiene id_componente, NO puede tener referencia_manual/marca_manual
    if (data.id_componente && (data.referencia_manual || data.marca_manual)) {
      throw new BadRequestException(
        'No se pueden especificar datos manuales cuando se asocia un componente del catálogo'
      );
    }

    // Si tiene id_componente, validar que existe en catálogo
    if (data.id_componente) {
      const componente = await this.prisma.catalogo_componentes.findUnique({
        where: { id_componente: data.id_componente },
      });
      if (!componente) {
        throw new NotFoundException(`Componente catálogo ${data.id_componente} no encontrado`);
      }
    }

    // Crear el registro
    const createData: any = {
      equipos: { connect: { id_equipo: data.id_equipo } },
      tipos_componente: { connect: { id_tipo_componente: data.id_tipo_componente } },
      posicion_descripcion: data.posicion_descripcion,
      unidades_por_cambio: data.unidades_por_cambio || 1,
      activo: true,
      usuarios_componentes_equipo_creado_porTousuarios: {
        connect: { id_usuario: data.creado_por },
      },
    };

    if (data.id_componente) {
      createData.catalogo_componentes = {
        connect: { id_componente: data.id_componente },
      };
    }
    if (data.referencia_manual) createData.referencia_manual = data.referencia_manual;
    if (data.marca_manual) createData.marca_manual = data.marca_manual;
    if (data.especificaciones_adicionales) {
      createData.especificaciones_adicionales = data.especificaciones_adicionales;
    }
    if (data.fecha_instalacion_inicial) {
      createData.fecha_instalacion_inicial = data.fecha_instalacion_inicial;
    }
    if (data.notas) createData.notas = data.notas;

    return this.prisma.componentes_equipo.create({
      data: createData,
      include: {
        equipos: true,
        tipos_componente: true,
        catalogo_componentes: true,
      },
    });
  }

  async obtenerTodos(filtros: FiltrosComponenteEquipo = {}): Promise<{
    componentes: componentes_equipo[];
    total: number;
  }> {
    const where: any = {};

    if (filtros.id_equipo) {
      where.id_equipo = filtros.id_equipo;
    }
    if (filtros.id_tipo_componente) {
      where.id_tipo_componente = filtros.id_tipo_componente;
    }
    if (filtros.activo !== undefined) {
      where.activo = filtros.activo;
    }

    const [componentes, total] = await Promise.all([
      this.prisma.componentes_equipo.findMany({
        where,
        include: {
          equipos: true,
          tipos_componente: true,
          catalogo_componentes: true,
        },
        skip: filtros.skip || 0,
        take: filtros.limit || 50,
        orderBy: { fecha_creacion: 'desc' },
      }),
      this.prisma.componentes_equipo.count({ where }),
    ]);

    return { componentes, total };
  }

  async obtenerPorId(id: number): Promise<componentes_equipo | null> {
    return this.prisma.componentes_equipo.findUnique({
      where: { id_componente_equipo: id },
      include: {
        equipos: {
          include: {
            cliente: true,
            sede: true,
          },
        },
        tipos_componente: true,
        catalogo_componentes: {
          include: {
            tipos_componente: true,
            proveedores: true,
          },
        },
      },
    });
  }

  async obtenerPorEquipo(idEquipo: number): Promise<componentes_equipo[]> {
    return this.prisma.componentes_equipo.findMany({
      where: {
        id_equipo: idEquipo,
        activo: true,
      },
      include: {
        tipos_componente: true,
        catalogo_componentes: true,
      },
      orderBy: { posicion_descripcion: 'asc' },
    });
  }

  async actualizar(
    id: number,
    data: ActualizarComponenteEquipoData
  ): Promise<componentes_equipo> {
    const componenteEquipo = await this.obtenerPorId(id);
    if (!componenteEquipo) {
      throw new NotFoundException(`Componente-Equipo ${id} no encontrado`);
    }

    // Validar constraint si se actualiza id_componente
    if (data.id_componente && (data.referencia_manual || data.marca_manual)) {
      throw new BadRequestException(
        'No se pueden especificar datos manuales cuando se asocia un componente del catálogo'
      );
    }

    const updateData: any = {
      fecha_modificacion: new Date(),
      usuarios_componentes_equipo_modificado_porTousuarios: {
        connect: { id_usuario: data.modificado_por || 1 },
      },
    };

    if (data.id_componente !== undefined) {
      if (data.id_componente === null) {
        updateData.catalogo_componentes = { disconnect: true };
      } else {
        updateData.catalogo_componentes = {
          connect: { id_componente: data.id_componente },
        };
        // Si se asigna catálogo, limpiar manuales
        updateData.referencia_manual = null;
        updateData.marca_manual = null;
      }
    }
    if (data.posicion_descripcion !== undefined) {
      updateData.posicion_descripcion = data.posicion_descripcion;
    }
    if (data.referencia_manual !== undefined) {
      updateData.referencia_manual = data.referencia_manual;
    }
    if (data.marca_manual !== undefined) updateData.marca_manual = data.marca_manual;
    if (data.unidades_por_cambio !== undefined) {
      updateData.unidades_por_cambio = data.unidades_por_cambio;
    }
    if (data.especificaciones_adicionales !== undefined) {
      updateData.especificaciones_adicionales = data.especificaciones_adicionales;
    }
    if (data.fecha_ultimo_cambio !== undefined) {
      updateData.fecha_ultimo_cambio = data.fecha_ultimo_cambio;
    }
    if (data.notas !== undefined) updateData.notas = data.notas;
    if (data.activo !== undefined) updateData.activo = data.activo;

    return this.prisma.componentes_equipo.update({
      where: { id_componente_equipo: id },
      data: updateData,
      include: {
        equipos: true,
        tipos_componente: true,
        catalogo_componentes: true,
      },
    });
  }

  async desactivar(id: number, usuario: number): Promise<componentes_equipo> {
    const componenteEquipo = await this.obtenerPorId(id);
    if (!componenteEquipo) {
      throw new NotFoundException(`Componente-Equipo ${id} no encontrado`);
    }

    return this.prisma.componentes_equipo.update({
      where: { id_componente_equipo: id },
      data: {
        activo: false,
        fecha_desactivacion: new Date(),
        fecha_modificacion: new Date(),
        usuarios_componentes_equipo_modificado_porTousuarios: {
          connect: { id_usuario: usuario },
        },
      },
    });
  }
}
