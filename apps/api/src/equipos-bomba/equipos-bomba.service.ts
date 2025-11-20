import { PrismaService } from '@mekanos/database';
import {
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { CreateEquiposBombaDto } from './dto/create-equipos-bomba.dto';
import { UpdateEquiposBombaDto } from './dto/update-equipos-bomba.dto';

@Injectable()
export class EquiposBombaService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateEquiposBombaDto) {
    try {
      return await this.prisma.equipos_bomba.create({
        data: createDto as any,
      });
    } catch (error: unknown) {
      throw new InternalServerErrorException(
        `Error al crear equipos_bomba: ${(error as Error).message}`,
      );
    }
  }

  async findAll(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;
      
      const [data, total] = await Promise.all([
        this.prisma.equipos_bomba.findMany({
          skip,
          take: limit,
          orderBy: { id_equipo: 'desc' },
        }),
        this.prisma.equipos_bomba.count(),
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
        `Error al obtener equipos_bomba: ${(error as Error).message}`,
      );
    }
  }

  async findOne(id: number) {
    try {
      const record = await this.prisma.equipos_bomba.findUnique({
        where: { id_equipo: id },
      });

      if (!record) {
        throw new NotFoundException(`EquiposBomba con ID ${id} no encontrado`);
      }

      return record;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al obtener equipos_bomba: ${(error as Error).message}`,
      );
    }
  }

  async update(id: number, updateDto: UpdateEquiposBombaDto) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.equipos_bomba.update({
        where: { id_equipo: id },
        data: updateDto as any,
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al actualizar equipos_bomba: ${(error as Error).message}`,
      );
    }
  }

  async remove(id: number) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.equipos_bomba.delete({
        where: { id_equipo: id },
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al eliminar equipos_bomba: ${(error as Error).message}`,
      );
    }
  }
}
