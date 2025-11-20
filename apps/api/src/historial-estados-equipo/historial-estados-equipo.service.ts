import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '@mekanos/database';
import { CreateHistorialEstadosEquipoDto } from './dto/create-historial-estados-equipo.dto';
import { UpdateHistorialEstadosEquipoDto } from './dto/update-historial-estados-equipo.dto';

@Injectable()
export class HistorialEstadosEquipoService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateHistorialEstadosEquipoDto) {
    try {
      return await this.prisma.historial_estados_equipo.create({
        data: createDto as any,
      });
    } catch (error: unknown) {
      throw new InternalServerErrorException(
        `Error al crear historial_estados_equipo: ${(error as Error).message}`,
      );
    }
  }

  async findAll(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;
      
      const [data, total] = await Promise.all([
        this.prisma.historial_estados_equipo.findMany({
          skip,
          take: limit,
          orderBy: { id_historial: 'desc' },
        }),
        this.prisma.historial_estados_equipo.count(),
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
        `Error al obtener historial_estados_equipo: ${(error as Error).message}`,
      );
    }
  }

  async findOne(id: number) {
    try {
      const record = await this.prisma.historial_estados_equipo.findUnique({
        where: { id_historial: id },
      });

      if (!record) {
        throw new NotFoundException(`HistorialEstadosEquipo con ID ${id} no encontrado`);
      }

      return record;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al obtener historial_estados_equipo: ${(error as Error).message}`,
      );
    }
  }

  async update(id: number, updateDto: UpdateHistorialEstadosEquipoDto) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.historial_estados_equipo.update({
        where: { id_historial: id },
        data: updateDto as any,
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al actualizar historial_estados_equipo: ${(error as Error).message}`,
      );
    }
  }

  async remove(id: number) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.historial_estados_equipo.delete({
        where: { id_historial: id },
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al eliminar historial_estados_equipo: ${(error as Error).message}`,
      );
    }
  }
}
