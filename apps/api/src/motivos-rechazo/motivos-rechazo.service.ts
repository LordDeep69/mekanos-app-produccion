import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '@mekanos/database';
import { CreateMotivosRechazoDto } from './dto/create-motivos-rechazo.dto';
import { UpdateMotivosRechazoDto } from './dto/update-motivos-rechazo.dto';

@Injectable()
export class MotivosRechazoService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateMotivosRechazoDto) {
    try {
      return await this.prisma.motivos_rechazo.create({
        data: createDto as any,
      });
    } catch (error: unknown) {
      throw new InternalServerErrorException(
        `Error al crear motivos_rechazo: ${(error as Error).message}`,
      );
    }
  }

  async findAll(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;
      
      const [data, total] = await Promise.all([
        this.prisma.motivos_rechazo.findMany({
          skip,
          take: limit,
          orderBy: { id_motivo_rechazo: 'desc' },
        }),
        this.prisma.motivos_rechazo.count(),
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
        `Error al obtener motivos_rechazo: ${(error as Error).message}`,
      );
    }
  }

  async findOne(id: number) {
    try {
      const record = await this.prisma.motivos_rechazo.findUnique({
        where: { id_motivo_rechazo: id },
      });

      if (!record) {
        throw new NotFoundException(`MotivosRechazo con ID ${id} no encontrado`);
      }

      return record;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al obtener motivos_rechazo: ${(error as Error).message}`,
      );
    }
  }

  async update(id: number, updateDto: UpdateMotivosRechazoDto) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.motivos_rechazo.update({
        where: { id_motivo_rechazo: id },
        data: updateDto as any,
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al actualizar motivos_rechazo: ${(error as Error).message}`,
      );
    }
  }

  async remove(id: number) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.motivos_rechazo.delete({
        where: { id_motivo_rechazo: id },
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al eliminar motivos_rechazo: ${(error as Error).message}`,
      );
    }
  }
}
