import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '@mekanos/database';
import { CreateRemisionesDetalleDto } from './dto/create-remisiones-detalle.dto';
import { UpdateRemisionesDetalleDto } from './dto/update-remisiones-detalle.dto';

@Injectable()
export class RemisionesDetalleService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateRemisionesDetalleDto) {
    try {
      return await this.prisma.remisiones_detalle.create({
        data: createDto as any,
      });
    } catch (error: unknown) {
      throw new InternalServerErrorException(
        `Error al crear remisiones_detalle: ${(error as Error).message}`,
      );
    }
  }

  async findAll(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;
      
      const [data, total] = await Promise.all([
        this.prisma.remisiones_detalle.findMany({
          skip,
          take: limit,
          orderBy: { id_detalle_remision: 'desc' },
        }),
        this.prisma.remisiones_detalle.count(),
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
        `Error al obtener remisiones_detalle: ${(error as Error).message}`,
      );
    }
  }

  async findOne(id: number) {
    try {
      const record = await this.prisma.remisiones_detalle.findUnique({
        where: { id_detalle_remision: id },
      });

      if (!record) {
        throw new NotFoundException(`RemisionesDetalle con ID ${id} no encontrado`);
      }

      return record;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al obtener remisiones_detalle: ${(error as Error).message}`,
      );
    }
  }

  async update(id: number, updateDto: UpdateRemisionesDetalleDto) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.remisiones_detalle.update({
        where: { id_detalle_remision: id },
        data: updateDto as any,
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al actualizar remisiones_detalle: ${(error as Error).message}`,
      );
    }
  }

  async remove(id: number) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.remisiones_detalle.delete({
        where: { id_detalle_remision: id },
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al eliminar remisiones_detalle: ${(error as Error).message}`,
      );
    }
  }
}
