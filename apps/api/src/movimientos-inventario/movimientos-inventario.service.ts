import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '@mekanos/database';
import { CreateMovimientosInventarioDto } from './dto/create-movimientos-inventario.dto';
import { UpdateMovimientosInventarioDto } from './dto/update-movimientos-inventario.dto';

@Injectable()
export class MovimientosInventarioService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateMovimientosInventarioDto) {
    try {
      return await this.prisma.movimientos_inventario.create({
        data: createDto as any,
      });
    } catch (error: unknown) {
      throw new InternalServerErrorException(
        `Error al crear movimientos_inventario: ${(error as Error).message}`,
      );
    }
  }

  async findAll(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;
      
      const [data, total] = await Promise.all([
        this.prisma.movimientos_inventario.findMany({
          skip,
          take: limit,
          orderBy: { id_movimiento: 'desc' },
        }),
        this.prisma.movimientos_inventario.count(),
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
        `Error al obtener movimientos_inventario: ${(error as Error).message}`,
      );
    }
  }

  async findOne(id: number) {
    try {
      const record = await this.prisma.movimientos_inventario.findUnique({
        where: { id_movimiento: id },
      });

      if (!record) {
        throw new NotFoundException(`MovimientosInventario con ID ${id} no encontrado`);
      }

      return record;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al obtener movimientos_inventario: ${(error as Error).message}`,
      );
    }
  }

  async update(id: number, updateDto: UpdateMovimientosInventarioDto) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.movimientos_inventario.update({
        where: { id_movimiento: id },
        data: updateDto as any,
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al actualizar movimientos_inventario: ${(error as Error).message}`,
      );
    }
  }

  async remove(id: number) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.movimientos_inventario.delete({
        where: { id_movimiento: id },
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al eliminar movimientos_inventario: ${(error as Error).message}`,
      );
    }
  }
}
