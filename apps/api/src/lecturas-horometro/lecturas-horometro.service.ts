import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '@mekanos/database';
import { CreateLecturasHorometroDto } from './dto/create-lecturas-horometro.dto';
import { UpdateLecturasHorometroDto } from './dto/update-lecturas-horometro.dto';

@Injectable()
export class LecturasHorometroService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateLecturasHorometroDto) {
    try {
      return await this.prisma.lecturas_horometro.create({
        data: createDto as any,
      });
    } catch (error: unknown) {
      throw new InternalServerErrorException(
        `Error al crear lecturas_horometro: ${(error as Error).message}`,
      );
    }
  }

  async findAll(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;
      
      const [data, total] = await Promise.all([
        this.prisma.lecturas_horometro.findMany({
          skip,
          take: limit,
          orderBy: { id_lectura: 'desc' },
        }),
        this.prisma.lecturas_horometro.count(),
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
        `Error al obtener lecturas_horometro: ${(error as Error).message}`,
      );
    }
  }

  async findOne(id: number) {
    try {
      const record = await this.prisma.lecturas_horometro.findUnique({
        where: { id_lectura: id },
      });

      if (!record) {
        throw new NotFoundException(`LecturasHorometro con ID ${id} no encontrado`);
      }

      return record;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al obtener lecturas_horometro: ${(error as Error).message}`,
      );
    }
  }

  async update(id: number, updateDto: UpdateLecturasHorometroDto) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.lecturas_horometro.update({
        where: { id_lectura: id },
        data: updateDto as any,
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al actualizar lecturas_horometro: ${(error as Error).message}`,
      );
    }
  }

  async remove(id: number) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.lecturas_horometro.delete({
        where: { id_lectura: id },
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al eliminar lecturas_horometro: ${(error as Error).message}`,
      );
    }
  }
}
