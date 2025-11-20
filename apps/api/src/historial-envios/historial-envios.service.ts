import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '@mekanos/database';
import { CreateHistorialEnviosDto } from './dto/create-historial-envios.dto';
import { UpdateHistorialEnviosDto } from './dto/update-historial-envios.dto';

@Injectable()
export class HistorialEnviosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateHistorialEnviosDto) {
    try {
      return await this.prisma.historial_envios.create({
        data: createDto as any,
      });
    } catch (error: unknown) {
      throw new InternalServerErrorException(
        `Error al crear historial_envios: ${(error as Error).message}`,
      );
    }
  }

  async findAll(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;
      
      const [data, total] = await Promise.all([
        this.prisma.historial_envios.findMany({
          skip,
          take: limit,
          orderBy: { id_envio: 'desc' },
        }),
        this.prisma.historial_envios.count(),
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
        `Error al obtener historial_envios: ${(error as Error).message}`,
      );
    }
  }

  async findOne(id: number) {
    try {
      const record = await this.prisma.historial_envios.findUnique({
        where: { id_envio: id },
      });

      if (!record) {
        throw new NotFoundException(`HistorialEnvios con ID ${id} no encontrado`);
      }

      return record;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al obtener historial_envios: ${(error as Error).message}`,
      );
    }
  }

  async update(id: number, updateDto: UpdateHistorialEnviosDto) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.historial_envios.update({
        where: { id_envio: id },
        data: updateDto as any,
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al actualizar historial_envios: ${(error as Error).message}`,
      );
    }
  }

  async remove(id: number) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.historial_envios.delete({
        where: { id_envio: id },
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al eliminar historial_envios: ${(error as Error).message}`,
      );
    }
  }
}
