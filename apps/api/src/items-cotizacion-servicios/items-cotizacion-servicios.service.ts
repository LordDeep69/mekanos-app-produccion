import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '@mekanos/database';
import { CreateItemsCotizacionServiciosDto } from './dto/create-items-cotizacion-servicios.dto';
import { UpdateItemsCotizacionServiciosDto } from './dto/update-items-cotizacion-servicios.dto';

@Injectable()
export class ItemsCotizacionServiciosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateItemsCotizacionServiciosDto) {
    try {
      return await this.prisma.items_cotizacion_servicios.create({
        data: createDto as any,
      });
    } catch (error: unknown) {
      throw new InternalServerErrorException(
        `Error al crear items_cotizacion_servicios: ${(error as Error).message}`,
      );
    }
  }

  async findAll(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;
      
      const [data, total] = await Promise.all([
        this.prisma.items_cotizacion_servicios.findMany({
          skip,
          take: limit,
          orderBy: { id_item_servicio: 'desc' },
        }),
        this.prisma.items_cotizacion_servicios.count(),
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
        `Error al obtener items_cotizacion_servicios: ${(error as Error).message}`,
      );
    }
  }

  async findOne(id: number) {
    try {
      const record = await this.prisma.items_cotizacion_servicios.findUnique({
        where: { id_item_servicio: id },
      });

      if (!record) {
        throw new NotFoundException(`ItemsCotizacionServicios con ID ${id} no encontrado`);
      }

      return record;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al obtener items_cotizacion_servicios: ${(error as Error).message}`,
      );
    }
  }

  async update(id: number, updateDto: UpdateItemsCotizacionServiciosDto) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.items_cotizacion_servicios.update({
        where: { id_item_servicio: id },
        data: updateDto as any,
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al actualizar items_cotizacion_servicios: ${(error as Error).message}`,
      );
    }
  }

  async remove(id: number) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.items_cotizacion_servicios.delete({
        where: { id_item_servicio: id },
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al eliminar items_cotizacion_servicios: ${(error as Error).message}`,
      );
    }
  }
}
