import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '@mekanos/database';
import { CreateCotizacionesDto } from './dto/create-cotizaciones.dto';
import { UpdateCotizacionesDto } from './dto/update-cotizaciones.dto';

@Injectable()
export class CotizacionesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateCotizacionesDto) {
    try {
      return await this.prisma.cotizaciones.create({
        data: createDto as any,
      });
    } catch (error: unknown) {
      throw new InternalServerErrorException(
        `Error al crear cotizaciones: ${(error as Error).message}`,
      );
    }
  }

  async findAll(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;
      
      const [data, total] = await Promise.all([
        this.prisma.cotizaciones.findMany({
          skip,
          take: limit,
          orderBy: { id_cotizacion: 'desc' },
        }),
        this.prisma.cotizaciones.count(),
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
        `Error al obtener cotizaciones: ${(error as Error).message}`,
      );
    }
  }

  async findOne(id: number) {
    try {
      const record = await this.prisma.cotizaciones.findUnique({
        where: { id_cotizacion: id },
      });

      if (!record) {
        throw new NotFoundException(`Cotizaciones con ID ${id} no encontrado`);
      }

      return record;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al obtener cotizaciones: ${(error as Error).message}`,
      );
    }
  }

  async update(id: number, updateDto: UpdateCotizacionesDto) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.cotizaciones.update({
        where: { id_cotizacion: id },
        data: updateDto as any,
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al actualizar cotizaciones: ${(error as Error).message}`,
      );
    }
  }

  async remove(id: number) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.cotizaciones.delete({
        where: { id_cotizacion: id },
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al eliminar cotizaciones: ${(error as Error).message}`,
      );
    }
  }
}
