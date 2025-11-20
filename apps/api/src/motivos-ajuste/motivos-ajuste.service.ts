import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '@mekanos/database';
import { CreateMotivosAjusteDto } from './dto/create-motivos-ajuste.dto';
import { UpdateMotivosAjusteDto } from './dto/update-motivos-ajuste.dto';

@Injectable()
export class MotivosAjusteService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateMotivosAjusteDto) {
    try {
      return await this.prisma.motivos_ajuste.create({
        data: createDto as any,
      });
    } catch (error: unknown) {
      throw new InternalServerErrorException(
        `Error al crear motivos_ajuste: ${(error as Error).message}`,
      );
    }
  }

  async findAll(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;
      
      const [data, total] = await Promise.all([
        this.prisma.motivos_ajuste.findMany({
          skip,
          take: limit,
          orderBy: { id_motivo_ajuste: 'desc' },
        }),
        this.prisma.motivos_ajuste.count(),
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
        `Error al obtener motivos_ajuste: ${(error as Error).message}`,
      );
    }
  }

  async findOne(id: number) {
    try {
      const record = await this.prisma.motivos_ajuste.findUnique({
        where: { id_motivo_ajuste: id },
      });

      if (!record) {
        throw new NotFoundException(`MotivosAjuste con ID ${id} no encontrado`);
      }

      return record;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al obtener motivos_ajuste: ${(error as Error).message}`,
      );
    }
  }

  async update(id: number, updateDto: UpdateMotivosAjusteDto) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.motivos_ajuste.update({
        where: { id_motivo_ajuste: id },
        data: updateDto as any,
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al actualizar motivos_ajuste: ${(error as Error).message}`,
      );
    }
  }

  async remove(id: number) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.motivos_ajuste.delete({
        where: { id_motivo_ajuste: id },
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al eliminar motivos_ajuste: ${(error as Error).message}`,
      );
    }
  }
}
