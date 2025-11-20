import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '@mekanos/database';
import { CreateItemsCotizacionComponentesDto } from './dto/create-items-cotizacion-componentes.dto';
import { UpdateItemsCotizacionComponentesDto } from './dto/update-items-cotizacion-componentes.dto';

@Injectable()
export class ItemsCotizacionComponentesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateItemsCotizacionComponentesDto) {
    try {
      return await this.prisma.items_cotizacion_componentes.create({
        data: createDto as any,
      });
    } catch (error: unknown) {
      throw new InternalServerErrorException(
        `Error al crear items_cotizacion_componentes: ${(error as Error).message}`,
      );
    }
  }

  async findAll(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;
      
      const [data, total] = await Promise.all([
        this.prisma.items_cotizacion_componentes.findMany({
          skip,
          take: limit,
          orderBy: { id_item_componente: 'desc' },
        }),
        this.prisma.items_cotizacion_componentes.count(),
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
        `Error al obtener items_cotizacion_componentes: ${(error as Error).message}`,
      );
    }
  }

  async findOne(id: number) {
    try {
      const record = await this.prisma.items_cotizacion_componentes.findUnique({
        where: { id_item_componente: id },
      });

      if (!record) {
        throw new NotFoundException(`ItemsCotizacionComponentes con ID ${id} no encontrado`);
      }

      return record;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al obtener items_cotizacion_componentes: ${(error as Error).message}`,
      );
    }
  }

  async update(id: number, updateDto: UpdateItemsCotizacionComponentesDto) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.items_cotizacion_componentes.update({
        where: { id_item_componente: id },
        data: updateDto as any,
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al actualizar items_cotizacion_componentes: ${(error as Error).message}`,
      );
    }
  }

  async remove(id: number) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.items_cotizacion_componentes.delete({
        where: { id_item_componente: id },
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al eliminar items_cotizacion_componentes: ${(error as Error).message}`,
      );
    }
  }
}
