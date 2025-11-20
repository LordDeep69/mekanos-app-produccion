import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '@mekanos/database';
import { CreateCronogramasServicioDto } from './dto/create-cronogramas-servicio.dto';
import { UpdateCronogramasServicioDto } from './dto/update-cronogramas-servicio.dto';

@Injectable()
export class CronogramasServicioService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateCronogramasServicioDto) {
    try {
      return await this.prisma.cronogramas_servicio.create({
        data: createDto as any,
      });
    } catch (error: unknown) {
      throw new InternalServerErrorException(
        `Error al crear cronogramas_servicio: ${(error as Error).message}`,
      );
    }
  }

  async findAll(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;
      
      const [data, total] = await Promise.all([
        this.prisma.cronogramas_servicio.findMany({
          skip,
          take: limit,
          orderBy: { id_cronograma: 'desc' },
        }),
        this.prisma.cronogramas_servicio.count(),
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
        `Error al obtener cronogramas_servicio: ${(error as Error).message}`,
      );
    }
  }

  async findOne(id: number) {
    try {
      const record = await this.prisma.cronogramas_servicio.findUnique({
        where: { id_cronograma: id },
      });

      if (!record) {
        throw new NotFoundException(`CronogramasServicio con ID ${id} no encontrado`);
      }

      return record;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al obtener cronogramas_servicio: ${(error as Error).message}`,
      );
    }
  }

  async update(id: number, updateDto: UpdateCronogramasServicioDto) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.cronogramas_servicio.update({
        where: { id_cronograma: id },
        data: updateDto as any,
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al actualizar cronogramas_servicio: ${(error as Error).message}`,
      );
    }
  }

  async remove(id: number) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.cronogramas_servicio.delete({
        where: { id_cronograma: id },
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al eliminar cronogramas_servicio: ${(error as Error).message}`,
      );
    }
  }
}
