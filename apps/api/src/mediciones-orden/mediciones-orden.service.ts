import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '@mekanos/database';
import { CreateMedicionesOrdenDto } from './dto/create-mediciones-orden.dto';
import { UpdateMedicionesOrdenDto } from './dto/update-mediciones-orden.dto';

@Injectable()
export class MedicionesOrdenService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateMedicionesOrdenDto) {
    try {
      return await this.prisma.mediciones_orden.create({
        data: createDto as any,
      });
    } catch (error: unknown) {
      throw new InternalServerErrorException(
        `Error al crear mediciones_orden: ${(error as Error).message}`,
      );
    }
  }

  async findAll(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;
      
      const [data, total] = await Promise.all([
        this.prisma.mediciones_orden.findMany({
          skip,
          take: limit,
          orderBy: { id_medicion: 'desc' },
        }),
        this.prisma.mediciones_orden.count(),
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
        `Error al obtener mediciones_orden: ${(error as Error).message}`,
      );
    }
  }

  async findOne(id: number) {
    try {
      const record = await this.prisma.mediciones_orden.findUnique({
        where: { id_medicion: id },
      });

      if (!record) {
        throw new NotFoundException(`MedicionesOrden con ID ${id} no encontrado`);
      }

      return record;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al obtener mediciones_orden: ${(error as Error).message}`,
      );
    }
  }

  async update(id: number, updateDto: UpdateMedicionesOrdenDto) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.mediciones_orden.update({
        where: { id_medicion: id },
        data: updateDto as any,
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al actualizar mediciones_orden: ${(error as Error).message}`,
      );
    }
  }

  async remove(id: number) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.mediciones_orden.delete({
        where: { id_medicion: id },
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al eliminar mediciones_orden: ${(error as Error).message}`,
      );
    }
  }
}
