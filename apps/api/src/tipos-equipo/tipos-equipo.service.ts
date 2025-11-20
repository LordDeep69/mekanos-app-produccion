import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '@mekanos/database';
import { CreateTiposEquipoDto } from './dto/create-tipos-equipo.dto';
import { UpdateTiposEquipoDto } from './dto/update-tipos-equipo.dto';

@Injectable()
export class TiposEquipoService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateTiposEquipoDto) {
    try {
      return await this.prisma.tipos_equipo.create({
        data: createDto as any,
      });
    } catch (error: unknown) {
      throw new InternalServerErrorException(
        `Error al crear tipos_equipo: ${(error as Error).message}`,
      );
    }
  }

  async findAll(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;
      
      const [data, total] = await Promise.all([
        this.prisma.tipos_equipo.findMany({
          skip,
          take: limit,
          orderBy: { id_tipo_equipo: 'desc' },
        }),
        this.prisma.tipos_equipo.count(),
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
        `Error al obtener tipos_equipo: ${(error as Error).message}`,
      );
    }
  }

  async findOne(id: number) {
    try {
      const record = await this.prisma.tipos_equipo.findUnique({
        where: { id_tipo_equipo: id },
      });

      if (!record) {
        throw new NotFoundException(`TiposEquipo con ID ${id} no encontrado`);
      }

      return record;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al obtener tipos_equipo: ${(error as Error).message}`,
      );
    }
  }

  async update(id: number, updateDto: UpdateTiposEquipoDto) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.tipos_equipo.update({
        where: { id_tipo_equipo: id },
        data: updateDto as any,
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al actualizar tipos_equipo: ${(error as Error).message}`,
      );
    }
  }

  async remove(id: number) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.tipos_equipo.delete({
        where: { id_tipo_equipo: id },
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al eliminar tipos_equipo: ${(error as Error).message}`,
      );
    }
  }
}
