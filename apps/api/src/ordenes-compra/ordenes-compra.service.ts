import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '@mekanos/database';
import { CreateOrdenesCompraDto } from './dto/create-ordenes-compra.dto';
import { UpdateOrdenesCompraDto } from './dto/update-ordenes-compra.dto';

@Injectable()
export class OrdenesCompraService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateOrdenesCompraDto) {
    try {
      return await this.prisma.ordenes_compra.create({
        data: createDto as any,
      });
    } catch (error: unknown) {
      throw new InternalServerErrorException(
        `Error al crear ordenes_compra: ${(error as Error).message}`,
      );
    }
  }

  async findAll(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;
      
      const [data, total] = await Promise.all([
        this.prisma.ordenes_compra.findMany({
          skip,
          take: limit,
          orderBy: { id_orden_compra: 'desc' },
        }),
        this.prisma.ordenes_compra.count(),
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
        `Error al obtener ordenes_compra: ${(error as Error).message}`,
      );
    }
  }

  async findOne(id: number) {
    try {
      const record = await this.prisma.ordenes_compra.findUnique({
        where: { id_orden_compra: id },
      });

      if (!record) {
        throw new NotFoundException(`OrdenesCompra con ID ${id} no encontrado`);
      }

      return record;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al obtener ordenes_compra: ${(error as Error).message}`,
      );
    }
  }

  async update(id: number, updateDto: UpdateOrdenesCompraDto) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.ordenes_compra.update({
        where: { id_orden_compra: id },
        data: updateDto as any,
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al actualizar ordenes_compra: ${(error as Error).message}`,
      );
    }
  }

  async remove(id: number) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.ordenes_compra.delete({
        where: { id_orden_compra: id },
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al eliminar ordenes_compra: ${(error as Error).message}`,
      );
    }
  }
}
