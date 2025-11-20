import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '@mekanos/database';
import { CreateUbicacionesBodegaDto } from './dto/create-ubicaciones-bodega.dto';
import { UpdateUbicacionesBodegaDto } from './dto/update-ubicaciones-bodega.dto';

@Injectable()
export class UbicacionesBodegaService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateUbicacionesBodegaDto) {
    try {
      return await this.prisma.ubicaciones_bodega.create({
        data: createDto as any,
      });
    } catch (error: unknown) {
      throw new InternalServerErrorException(
        `Error al crear ubicaciones_bodega: ${(error as Error).message}`,
      );
    }
  }

  async findAll(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;
      
      const [data, total] = await Promise.all([
        this.prisma.ubicaciones_bodega.findMany({
          skip,
          take: limit,
          orderBy: { id_ubicacion: 'desc' },
        }),
        this.prisma.ubicaciones_bodega.count(),
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
        `Error al obtener ubicaciones_bodega: ${(error as Error).message}`,
      );
    }
  }

  async findOne(id: number) {
    try {
      const record = await this.prisma.ubicaciones_bodega.findUnique({
        where: { id_ubicacion: id },
      });

      if (!record) {
        throw new NotFoundException(`UbicacionesBodega con ID ${id} no encontrado`);
      }

      return record;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al obtener ubicaciones_bodega: ${(error as Error).message}`,
      );
    }
  }

  async update(id: number, updateDto: UpdateUbicacionesBodegaDto) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.ubicaciones_bodega.update({
        where: { id_ubicacion: id },
        data: updateDto as any,
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al actualizar ubicaciones_bodega: ${(error as Error).message}`,
      );
    }
  }

  async remove(id: number) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.ubicaciones_bodega.delete({
        where: { id_ubicacion: id },
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al eliminar ubicaciones_bodega: ${(error as Error).message}`,
      );
    }
  }
}
