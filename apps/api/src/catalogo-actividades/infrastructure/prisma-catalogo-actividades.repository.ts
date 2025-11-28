import { Injectable } from '@nestjs/common';
import { catalogo_actividades } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CatalogoActividadesRepository } from '../domain/catalogo-actividades.repository.interface';

@Injectable()
export class PrismaCatalogoActividadesRepository implements CatalogoActividadesRepository {
  constructor(private readonly prisma: PrismaService) { }

  private readonly INCLUDE_RELATIONS_LIST = {
    tipos_servicio: {
      select: {
        id_tipo_servicio: true,
        codigo_tipo: true,
        nombre_tipo: true,
      },
    },
    catalogo_sistemas: {
      select: {
        id_sistema: true,
        codigo_sistema: true,
        nombre_sistema: true,
      },
    },
  };

  private readonly INCLUDE_RELATIONS_DETAIL = {
    tipos_servicio: {
      select: {
        id_tipo_servicio: true,
        codigo_tipo: true,
        nombre_tipo: true,
      },
    },
    catalogo_sistemas: {
      select: {
        id_sistema: true,
        codigo_sistema: true,
        nombre_sistema: true,
      },
    },
    parametros_medicion: {
      select: {
        id_parametro_medicion: true,
        codigo_parametro: true,
        nombre_parametro: true,
      },
    },
    tipos_componente: {
      select: {
        id_tipo_componente: true,
        codigo_tipo: true,
        nombre_componente: true,
      },
    },
    usuarios_catalogo_actividades_creado_porTousuarios: {
      select: {
        id_usuario: true,
        email: true,
      },
    },
    usuarios_catalogo_actividades_modificado_porTousuarios: {
      select: {
        id_usuario: true,
        email: true,
      },
    },
  };

  async create(data: any): Promise<catalogo_actividades> {
    return this.prisma.catalogo_actividades.create({
      data,
      include: this.INCLUDE_RELATIONS_DETAIL,
    });
  }

  async update(id: number, data: any): Promise<catalogo_actividades> {
    return this.prisma.catalogo_actividades.update({
      where: { id_actividad_catalogo: id },
      data: {
        ...data,
        fecha_modificacion: new Date(),
      },
      include: this.INCLUDE_RELATIONS_DETAIL,
    });
  }

  async softDelete(id: number, modificadoPor: number): Promise<catalogo_actividades> {
    return this.prisma.catalogo_actividades.update({
      where: { id_actividad_catalogo: id },
      data: {
        activo: false,
        modificado_por: modificadoPor,
        fecha_modificacion: new Date(),
      },
      include: this.INCLUDE_RELATIONS_DETAIL,
    });
  }

  async findAll(skip = 0, take = 10): Promise<{ data: catalogo_actividades[]; total: number }> {
    const [data, total] = await Promise.all([
      this.prisma.catalogo_actividades.findMany({
        skip,
        take,
        include: this.INCLUDE_RELATIONS_LIST,
        orderBy: { id_actividad_catalogo: 'desc' },
      }),
      this.prisma.catalogo_actividades.count(),
    ]);

    return { data, total };
  }

  async findActive(skip = 0, take = 10): Promise<{ data: catalogo_actividades[]; total: number }> {
    const [data, total] = await Promise.all([
      this.prisma.catalogo_actividades.findMany({
        where: { activo: true },
        skip,
        take,
        include: this.INCLUDE_RELATIONS_LIST,
        orderBy: { id_actividad_catalogo: 'desc' },
      }),
      this.prisma.catalogo_actividades.count({ where: { activo: true } }),
    ]);

    return { data, total };
  }

  async findById(id: number): Promise<catalogo_actividades | null> {
    return this.prisma.catalogo_actividades.findUnique({
      where: { id_actividad_catalogo: id },
      include: this.INCLUDE_RELATIONS_DETAIL,
    });
  }

  async findByCodigo(codigo: string): Promise<catalogo_actividades | null> {
    return this.prisma.catalogo_actividades.findUnique({
      where: { codigo_actividad: codigo },
      include: this.INCLUDE_RELATIONS_DETAIL,
    });
  }

  async existsTipoServicio(id: number): Promise<boolean> {
    const count = await this.prisma.tipos_servicio.count({
      where: { id_tipo_servicio: id },
    });
    return count > 0;
  }

  async existsSistema(id: number): Promise<boolean> {
    const count = await this.prisma.catalogo_sistemas.count({
      where: { id_sistema: id },
    });
    return count > 0;
  }

  async existsParametroMedicion(id: number): Promise<boolean> {
    const count = await this.prisma.parametros_medicion.count({
      where: { id_parametro_medicion: id },
    });
    return count > 0;
  }

  async existsTipoComponente(id: number): Promise<boolean> {
    const count = await this.prisma.tipos_componente.count({
      where: { id_tipo_componente: id },
    });
    return count > 0;
  }
}
