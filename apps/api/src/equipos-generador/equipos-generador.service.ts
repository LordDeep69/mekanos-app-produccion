import { PrismaService } from '@mekanos/database';
import {
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { CreateEquiposGeneradorDto } from './dto/create-equipos-generador.dto';
import { UpdateEquiposGeneradorDto } from './dto/update-equipos-generador.dto';

@Injectable()
export class EquiposGeneradorService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateEquiposGeneradorDto) {
    try {
      return await this.prisma.equipos_generador.create({
        data: createDto as any,
      });
    } catch (error: unknown) {
      throw new InternalServerErrorException(
        `Error al crear equipos_generador: ${(error as Error).message}`,
      );
    }
  }

  async findAll(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;
      
      const [data, total] = await Promise.all([
        this.prisma.equipos_generador.findMany({
          skip,
          take: limit,
          orderBy: { id_equipo: 'desc' },
        }),
        this.prisma.equipos_generador.count(),
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
        `Error al obtener equipos_generador: ${(error as Error).message}`,
      );
    }
  }

  async findOne(id: number) {
    try {
      const record = await this.prisma.equipos_generador.findUnique({
        where: { id_equipo: id },
      });

      if (!record) {
        throw new NotFoundException(`EquiposGenerador con ID ${id} no encontrado`);
      }

      return record;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al obtener equipos_generador: ${(error as Error).message}`,
      );
    }
  }

  async update(id: number, updateDto: UpdateEquiposGeneradorDto) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.equipos_generador.update({
        where: { id_equipo: id },
        data: updateDto as any,
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al actualizar equipos_generador: ${(error as Error).message}`,
      );
    }
  }

  async remove(id: number) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.equipos_generador.delete({
        where: { id_equipo: id },
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al eliminar equipos_generador: ${(error as Error).message}`,
      );
    }
  }
}
