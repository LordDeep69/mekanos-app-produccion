import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DetalleServiciosOrdenResponseDto } from '../application/dto/detalle-servicios-orden-response.dto';
import { IDetalleServiciosOrdenRepository } from '../domain/detalle-servicios-orden.repository.interface';
import { DetalleServiciosOrdenMapper } from './detalle-servicios-orden.mapper';

@Injectable()
export class PrismaDetalleServiciosOrdenRepository implements IDetalleServiciosOrdenRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ✅ INCLUDE_RELATIONS_LIST (lista paginada - mínimo)
  private readonly INCLUDE_RELATIONS_LIST = {
    orden: {
      select: {
        id_orden_servicio: true,
        numero_orden: true,
      },
    },
    servicio: {
      select: {
        id_servicio: true,
        codigo_servicio: true,
        nombre_servicio: true,
      },
    },
  };

  // ✅ INCLUDE_RELATIONS_DETAIL (detalle completo - máximo con nombres EXACTOS 60 chars)
  private readonly INCLUDE_RELATIONS_DETAIL = {
    orden: {
      select: {
        id_orden_servicio: true,
        numero_orden: true,
        id_cliente: true,
        id_equipo: true,
      },
    },
    servicio: {
      select: {
        id_servicio: true,
        codigo_servicio: true,
        nombre_servicio: true,
        descripcion: true,
      },
    },
    tecnico: {
      include: {
        persona: {
          select: {
            nombre_completo: true,
          },
        },
      },
    },
    usuarios_detalle_servicios_orden_registrado_porTousuarios: {
      select: {
        id_usuario: true,
        email: true,
      },
    },
    usuarios_detalle_servicios_orden_modificado_porTousuarios: {
      select: {
        id_usuario: true,
        email: true,
      },
    },
  };

  async crear(data: any): Promise<DetalleServiciosOrdenResponseDto> {
    const detalle = await this.prisma.detalle_servicios_orden.create({
      data,
      include: this.INCLUDE_RELATIONS_DETAIL,
    });

    return DetalleServiciosOrdenMapper.toCamelCase(detalle);
  }

  async actualizar(id: number, data: any): Promise<DetalleServiciosOrdenResponseDto> {
    const detalle = await this.prisma.detalle_servicios_orden.update({
      where: { id_detalle_servicio: id },
      data,
      include: this.INCLUDE_RELATIONS_DETAIL,
    });

    return DetalleServiciosOrdenMapper.toCamelCase(detalle);
  }

  async encontrarPorId(id: number): Promise<DetalleServiciosOrdenResponseDto | null> {
    const detalle = await this.prisma.detalle_servicios_orden.findUnique({
      where: { id_detalle_servicio: id },
    });

    return detalle ? DetalleServiciosOrdenMapper.toCamelCase(detalle) : null;
  }

  async encontrarPorIdDetallado(id: number): Promise<DetalleServiciosOrdenResponseDto | null> {
    const detalle = await this.prisma.detalle_servicios_orden.findUnique({
      where: { id_detalle_servicio: id },
      include: this.INCLUDE_RELATIONS_DETAIL,
    });

    return detalle ? DetalleServiciosOrdenMapper.toCamelCase(detalle) : null;
  }

  async verificarPorId(id: number): Promise<DetalleServiciosOrdenResponseDto | null> {
    // ✅ NO filtrar por estado (incluye CANCELADO)
    const detalle = await this.prisma.detalle_servicios_orden.findUnique({
      where: { id_detalle_servicio: id },
      include: this.INCLUDE_RELATIONS_DETAIL,
    });

    return detalle ? DetalleServiciosOrdenMapper.toCamelCase(detalle) : null;
  }

  async listar(skip: number, take: number): Promise<DetalleServiciosOrdenResponseDto[]> {
    const detalles = await this.prisma.detalle_servicios_orden.findMany({
      skip,
      take,
      include: this.INCLUDE_RELATIONS_LIST,
      orderBy: { id_detalle_servicio: 'desc' },
    });

    return detalles.map((detalle) => DetalleServiciosOrdenMapper.toCamelCase(detalle));
  }

  async listarPorOrden(idOrdenServicio: number, skip: number, take: number): Promise<DetalleServiciosOrdenResponseDto[]> {
    const detalles = await this.prisma.detalle_servicios_orden.findMany({
      where: { id_orden_servicio: idOrdenServicio },
      skip,
      take,
      include: this.INCLUDE_RELATIONS_LIST,
      orderBy: { id_detalle_servicio: 'asc' },
    });

    return detalles.map((detalle) => DetalleServiciosOrdenMapper.toCamelCase(detalle));
  }

  async contar(): Promise<number> {
    return this.prisma.detalle_servicios_orden.count();
  }

  async contarPorOrden(idOrdenServicio: number): Promise<number> {
    return this.prisma.detalle_servicios_orden.count({
      where: { id_orden_servicio: idOrdenServicio },
    });
  }
}
