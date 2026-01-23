import { PrismaService } from '@mekanos/database';
import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateCatalogoActividadesDto } from './dto/create-catalogo-actividades.dto';
import { UpdateCatalogoActividadesDto } from './dto/update-catalogo-actividades.dto';

export interface FindAllActividadesParams {
  page?: number;
  limit?: number;
  tipoServicioId?: number;
  sistemaId?: number;
  tipoActividad?: string;
  activo?: boolean;
}

@Injectable()
export class CatalogoActividadesService {
  constructor(private readonly prisma: PrismaService) { }

  async create(createDto: CreateCatalogoActividadesDto) {
    try {
      const actividad = await this.prisma.catalogo_actividades.create({
        data: createDto as any,
        include: {
          tipos_servicio: true,
          catalogo_sistemas: true,
          parametros_medicion: true,
        },
      });
      return {
        success: true,
        message: 'Actividad creada exitosamente',
        data: actividad,
      };
    } catch (error: unknown) {
      throw new InternalServerErrorException(
        `Error al crear actividad: ${(error as Error).message}`,
      );
    }
  }

  async findAll(params: FindAllActividadesParams = {}) {
    try {
      const { page = 1, limit = 100, tipoServicioId, sistemaId, tipoActividad, activo } = params;
      const skip = (page - 1) * limit;

      const where: any = {};
      if (tipoServicioId) where.id_tipo_servicio = tipoServicioId;
      if (sistemaId) where.id_sistema = sistemaId;
      if (tipoActividad) where.tipo_actividad = tipoActividad;
      if (activo !== undefined) where.activo = activo;

      const [data, total] = await Promise.all([
        this.prisma.catalogo_actividades.findMany({
          where,
          skip,
          take: limit,
          orderBy: [
            { id_tipo_servicio: 'asc' },
            { orden_ejecucion: 'asc' },
          ],
          include: {
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
                unidad_medida: true,
              },
            },
          },
        }),
        this.prisma.catalogo_actividades.count({ where }),
      ]);

      return {
        success: true,
        message: 'Actividades obtenidas exitosamente',
        data,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error: unknown) {
      throw new InternalServerErrorException(
        `Error al obtener actividades: ${(error as Error).message}`,
      );
    }
  }

  async findOne(id: number) {
    try {
      const record = await this.prisma.catalogo_actividades.findUnique({
        where: { id_actividad_catalogo: id },
        include: {
          tipos_servicio: true,
          catalogo_sistemas: true,
          parametros_medicion: true,
        },
      });

      if (!record) {
        throw new NotFoundException(`Actividad con ID ${id} no encontrada`);
      }

      return {
        success: true,
        data: record,
      };
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al obtener actividad: ${(error as Error).message}`,
      );
    }
  }

  async update(id: number, updateDto: UpdateCatalogoActividadesDto) {
    try {
      await this.findOne(id);

      const actividad = await this.prisma.catalogo_actividades.update({
        where: { id_actividad_catalogo: id },
        data: updateDto as any,
        include: {
          tipos_servicio: true,
          catalogo_sistemas: true,
          parametros_medicion: true,
        },
      });
      return {
        success: true,
        message: 'Actividad actualizada exitosamente',
        data: actividad,
      };
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al actualizar actividad: ${(error as Error).message}`,
      );
    }
  }

  async remove(id: number) {
    try {
      await this.findOne(id);

      await this.prisma.catalogo_actividades.update({
        where: { id_actividad_catalogo: id },
        data: { activo: false },
      });
      return {
        success: true,
        message: 'Actividad desactivada exitosamente',
      };
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al eliminar actividad: ${(error as Error).message}`,
      );
    }
  }
}
