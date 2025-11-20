import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '@mekanos/database';
import { CreateAlertasStockDto } from './dto/create-alertas-stock.dto';
import { UpdateAlertasStockDto } from './dto/update-alertas-stock.dto';

@Injectable()
export class AlertasStockService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateAlertasStockDto) {
    try {
      return await this.prisma.alertas_stock.create({
        data: createDto as any,
      });
    } catch (error: unknown) {
      throw new InternalServerErrorException(
        `Error al crear alertas_stock: ${(error as Error).message}`,
      );
    }
  }

  async findAll(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;
      
      const [data, total] = await Promise.all([
        this.prisma.alertas_stock.findMany({
          skip,
          take: limit,
          orderBy: { id_alerta: 'desc' },
        }),
        this.prisma.alertas_stock.count(),
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
        `Error al obtener alertas_stock: ${(error as Error).message}`,
      );
    }
  }

  async findOne(id: number) {
    try {
      const record = await this.prisma.alertas_stock.findUnique({
        where: { id_alerta: id },
      });

      if (!record) {
        throw new NotFoundException(`AlertasStock con ID ${id} no encontrado`);
      }

      return record;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al obtener alertas_stock: ${(error as Error).message}`,
      );
    }
  }

  async update(id: number, updateDto: UpdateAlertasStockDto) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.alertas_stock.update({
        where: { id_alerta: id },
        data: updateDto as any,
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al actualizar alertas_stock: ${(error as Error).message}`,
      );
    }
  }

  async remove(id: number) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.alertas_stock.delete({
        where: { id_alerta: id },
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al eliminar alertas_stock: ${(error as Error).message}`,
      );
    }
  }
}
