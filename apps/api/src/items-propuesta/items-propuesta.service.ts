import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '@mekanos/database';
import { CreateItemsPropuestaDto } from './dto/create-items-propuesta.dto';
import { UpdateItemsPropuestaDto } from './dto/update-items-propuesta.dto';

@Injectable()
export class ItemsPropuestaService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateItemsPropuestaDto) {
    try {
      return await this.prisma.items_propuesta.create({
        data: createDto as any,
      });
    } catch (error: unknown) {
      throw new InternalServerErrorException(
        `Error al crear items_propuesta: ${(error as Error).message}`,
      );
    }
  }

  async findAll(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;
      
      const [data, total] = await Promise.all([
        this.prisma.items_propuesta.findMany({
          skip,
          take: limit,
          orderBy: { id_item_propuesta: 'desc' },
        }),
        this.prisma.items_propuesta.count(),
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
        `Error al obtener items_propuesta: ${(error as Error).message}`,
      );
    }
  }

  async findOne(id: number) {
    try {
      const record = await this.prisma.items_propuesta.findUnique({
        where: { id_item_propuesta: id },
      });

      if (!record) {
        throw new NotFoundException(`ItemsPropuesta con ID ${id} no encontrado`);
      }

      return record;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al obtener items_propuesta: ${(error as Error).message}`,
      );
    }
  }

  async update(id: number, updateDto: UpdateItemsPropuestaDto) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.items_propuesta.update({
        where: { id_item_propuesta: id },
        data: updateDto as any,
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al actualizar items_propuesta: ${(error as Error).message}`,
      );
    }
  }

  async remove(id: number) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.items_propuesta.delete({
        where: { id_item_propuesta: id },
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al eliminar items_propuesta: ${(error as Error).message}`,
      );
    }
  }
}
