import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '@mekanos/database';
import { CreateRemisionesDto } from './dto/create-remisiones.dto';
import { UpdateRemisionesDto } from './dto/update-remisiones.dto';

@Injectable()
export class RemisionesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateRemisionesDto) {
    try {
      return await this.prisma.remisiones.create({
        data: createDto as any,
      });
    } catch (error: unknown) {
      throw new InternalServerErrorException(
        `Error al crear remisiones: ${(error as Error).message}`,
      );
    }
  }

  async findAll(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;
      
      const [data, total] = await Promise.all([
        this.prisma.remisiones.findMany({
          skip,
          take: limit,
          orderBy: { id_remision: 'desc' },
        }),
        this.prisma.remisiones.count(),
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
        `Error al obtener remisiones: ${(error as Error).message}`,
      );
    }
  }

  async findOne(id: number) {
    try {
      const record = await this.prisma.remisiones.findUnique({
        where: { id_remision: id },
      });

      if (!record) {
        throw new NotFoundException(`Remisiones con ID ${id} no encontrado`);
      }

      return record;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al obtener remisiones: ${(error as Error).message}`,
      );
    }
  }

  async update(id: number, updateDto: UpdateRemisionesDto) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.remisiones.update({
        where: { id_remision: id },
        data: updateDto as any,
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al actualizar remisiones: ${(error as Error).message}`,
      );
    }
  }

  async remove(id: number) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.remisiones.delete({
        where: { id_remision: id },
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al eliminar remisiones: ${(error as Error).message}`,
      );
    }
  }
}
