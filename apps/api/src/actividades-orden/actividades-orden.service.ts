import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '@mekanos/database';
import { CreateActividadesOrdenDto } from './dto/create-actividades-orden.dto';
import { UpdateActividadesOrdenDto } from './dto/update-actividades-orden.dto';

@Injectable()
export class ActividadesOrdenService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateActividadesOrdenDto) {
    try {
      return await this.prisma.actividades_orden.create({
        data: createDto as any,
      });
    } catch (error: unknown) {
      throw new InternalServerErrorException(
        `Error al crear actividades_orden: ${(error as Error).message}`,
      );
    }
  }

  async findAll(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;
      
      const [data, total] = await Promise.all([
        this.prisma.actividades_orden.findMany({
          skip,
          take: limit,
          orderBy: { id_actividad_orden: 'desc' },
        }),
        this.prisma.actividades_orden.count(),
      ]);

      return {
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
        `Error al obtener actividades_orden: ${(error as Error).message}`,
      );
    }
  }

  async findOne(id: number) {
    try {
      const record = await this.prisma.actividades_orden.findUnique({
        where: { id_actividad_orden: id },
      });

      if (!record) {
        throw new NotFoundException(`ActividadesOrden con ID ${id} no encontrado`);
      }

      return record;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al obtener actividades_orden: ${(error as Error).message}`,
      );
    }
  }

  async update(id: number, updateDto: UpdateActividadesOrdenDto) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.actividades_orden.update({
        where: { id_actividad_orden: id },
        data: updateDto as any,
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al actualizar actividades_orden: ${(error as Error).message}`,
      );
    }
  }

  async remove(id: number) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.actividades_orden.delete({
        where: { id_actividad_orden: id },
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al eliminar actividades_orden: ${(error as Error).message}`,
      );
    }
  }
}
