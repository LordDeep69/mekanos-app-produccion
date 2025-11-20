import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '@mekanos/database';
import { CreateCatalogoActividadesDto } from './dto/create-catalogo-actividades.dto';
import { UpdateCatalogoActividadesDto } from './dto/update-catalogo-actividades.dto';

@Injectable()
export class CatalogoActividadesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateCatalogoActividadesDto) {
    try {
      return await this.prisma.catalogo_actividades.create({
        data: createDto as any,
      });
    } catch (error: unknown) {
      throw new InternalServerErrorException(
        `Error al crear catalogo_actividades: ${(error as Error).message}`,
      );
    }
  }

  async findAll(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;
      
      const [data, total] = await Promise.all([
        this.prisma.catalogo_actividades.findMany({
          skip,
          take: limit,
          orderBy: { id_actividad: 'desc' },
        }),
        this.prisma.catalogo_actividades.count(),
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
        `Error al obtener catalogo_actividades: ${(error as Error).message}`,
      );
    }
  }

  async findOne(id: number) {
    try {
      const record = await this.prisma.catalogo_actividades.findUnique({
        where: { id_actividad: id },
      });

      if (!record) {
        throw new NotFoundException(`CatalogoActividades con ID ${id} no encontrado`);
      }

      return record;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al obtener catalogo_actividades: ${(error as Error).message}`,
      );
    }
  }

  async update(id: number, updateDto: UpdateCatalogoActividadesDto) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.catalogo_actividades.update({
        where: { id_actividad: id },
        data: updateDto as any,
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al actualizar catalogo_actividades: ${(error as Error).message}`,
      );
    }
  }

  async remove(id: number) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.catalogo_actividades.delete({
        where: { id_actividad: id },
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al eliminar catalogo_actividades: ${(error as Error).message}`,
      );
    }
  }
}
