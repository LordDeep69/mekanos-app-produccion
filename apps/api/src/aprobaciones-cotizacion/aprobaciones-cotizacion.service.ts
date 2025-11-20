import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '@mekanos/database';
import { CreateAprobacionesCotizacionDto } from './dto/create-aprobaciones-cotizacion.dto';
import { UpdateAprobacionesCotizacionDto } from './dto/update-aprobaciones-cotizacion.dto';

@Injectable()
export class AprobacionesCotizacionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateAprobacionesCotizacionDto) {
    try {
      return await this.prisma.aprobaciones_cotizacion.create({
        data: createDto as any,
      });
    } catch (error: unknown) {
      throw new InternalServerErrorException(
        `Error al crear aprobaciones_cotizacion: ${(error as Error).message}`,
      );
    }
  }

  async findAll(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;
      
      const [data, total] = await Promise.all([
        this.prisma.aprobaciones_cotizacion.findMany({
          skip,
          take: limit,
          orderBy: { id_aprobacion: 'desc' },
        }),
        this.prisma.aprobaciones_cotizacion.count(),
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
        `Error al obtener aprobaciones_cotizacion: ${(error as Error).message}`,
      );
    }
  }

  async findOne(id: number) {
    try {
      const record = await this.prisma.aprobaciones_cotizacion.findUnique({
        where: { id_aprobacion: id },
      });

      if (!record) {
        throw new NotFoundException(`AprobacionesCotizacion con ID ${id} no encontrado`);
      }

      return record;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al obtener aprobaciones_cotizacion: ${(error as Error).message}`,
      );
    }
  }

  async update(id: number, updateDto: UpdateAprobacionesCotizacionDto) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.aprobaciones_cotizacion.update({
        where: { id_aprobacion: id },
        data: updateDto as any,
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al actualizar aprobaciones_cotizacion: ${(error as Error).message}`,
      );
    }
  }

  async remove(id: number) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.aprobaciones_cotizacion.delete({
        where: { id_aprobacion: id },
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al eliminar aprobaciones_cotizacion: ${(error as Error).message}`,
      );
    }
  }
}
