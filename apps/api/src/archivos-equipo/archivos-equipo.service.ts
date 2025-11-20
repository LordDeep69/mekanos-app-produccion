import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '@mekanos/database';
import { CreateArchivosEquipoDto } from './dto/create-archivos-equipo.dto';
import { UpdateArchivosEquipoDto } from './dto/update-archivos-equipo.dto';

@Injectable()
export class ArchivosEquipoService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateArchivosEquipoDto) {
    try {
      return await this.prisma.archivos_equipo.create({
        data: createDto as any,
      });
    } catch (error: unknown) {
      throw new InternalServerErrorException(
        `Error al crear archivos_equipo: ${(error as Error).message}`,
      );
    }
  }

  async findAll(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;
      
      const [data, total] = await Promise.all([
        this.prisma.archivos_equipo.findMany({
          skip,
          take: limit,
          orderBy: { id_archivo: 'desc' },
        }),
        this.prisma.archivos_equipo.count(),
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
        `Error al obtener archivos_equipo: ${(error as Error).message}`,
      );
    }
  }

  async findOne(id: number) {
    try {
      const record = await this.prisma.archivos_equipo.findUnique({
        where: { id_archivo: id },
      });

      if (!record) {
        throw new NotFoundException(`ArchivosEquipo con ID ${id} no encontrado`);
      }

      return record;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al obtener archivos_equipo: ${(error as Error).message}`,
      );
    }
  }

  async update(id: number, updateDto: UpdateArchivosEquipoDto) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.archivos_equipo.update({
        where: { id_archivo: id },
        data: updateDto as any,
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al actualizar archivos_equipo: ${(error as Error).message}`,
      );
    }
  }

  async remove(id: number) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.archivos_equipo.delete({
        where: { id_archivo: id },
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al eliminar archivos_equipo: ${(error as Error).message}`,
      );
    }
  }
}
