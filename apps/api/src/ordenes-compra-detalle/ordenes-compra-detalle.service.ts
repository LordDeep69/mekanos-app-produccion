import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '@mekanos/database';
import { CreateOrdenesCompraDetalleDto } from './dto/create-ordenes-compra-detalle.dto';
import { UpdateOrdenesCompraDetalleDto } from './dto/update-ordenes-compra-detalle.dto';

@Injectable()
export class OrdenesCompraDetalleService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateOrdenesCompraDetalleDto) {
    try {
      return await this.prisma.ordenes_compra_detalle.create({
        data: createDto as any,
      });
    } catch (error: unknown) {
      throw new InternalServerErrorException(
        `Error al crear ordenes_compra_detalle: ${(error as Error).message}`,
      );
    }
  }

  async findAll(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;
      
      const [data, total] = await Promise.all([
        this.prisma.ordenes_compra_detalle.findMany({
          skip,
          take: limit,
          orderBy: { id_detalle: 'desc' },
        }),
        this.prisma.ordenes_compra_detalle.count(),
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
        `Error al obtener ordenes_compra_detalle: ${(error as Error).message}`,
      );
    }
  }

  async findOne(id: number) {
    try {
      const record = await this.prisma.ordenes_compra_detalle.findUnique({
        where: { id_detalle: id },
      });

      if (!record) {
        throw new NotFoundException(`OrdenesCompraDetalle con ID ${id} no encontrado`);
      }

      return record;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al obtener ordenes_compra_detalle: ${(error as Error).message}`,
      );
    }
  }

  async update(id: number, updateDto: UpdateOrdenesCompraDetalleDto) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.ordenes_compra_detalle.update({
        where: { id_detalle: id },
        data: updateDto as any,
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al actualizar ordenes_compra_detalle: ${(error as Error).message}`,
      );
    }
  }

  async remove(id: number) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.ordenes_compra_detalle.delete({
        where: { id_detalle: id },
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al eliminar ordenes_compra_detalle: ${(error as Error).message}`,
      );
    }
  }
}
