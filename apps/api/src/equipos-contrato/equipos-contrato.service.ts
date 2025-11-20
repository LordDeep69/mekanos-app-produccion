import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '@mekanos/database';
import { CreateEquiposContratoDto } from './dto/create-equipos-contrato.dto';
import { UpdateEquiposContratoDto } from './dto/update-equipos-contrato.dto';

@Injectable()
export class EquiposContratoService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateEquiposContratoDto) {
    try {
      return await this.prisma.equipos_contrato.create({
        data: createDto as any,
      });
    } catch (error: unknown) {
      throw new InternalServerErrorException(
        `Error al crear equipos_contrato: ${(error as Error).message}`,
      );
    }
  }

  async findAll(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;
      
      const [data, total] = await Promise.all([
        this.prisma.equipos_contrato.findMany({
          skip,
          take: limit,
          orderBy: { id_equipo_contrato: 'desc' },
        }),
        this.prisma.equipos_contrato.count(),
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
        `Error al obtener equipos_contrato: ${(error as Error).message}`,
      );
    }
  }

  async findOne(id: number) {
    try {
      const record = await this.prisma.equipos_contrato.findUnique({
        where: { id_equipo_contrato: id },
      });

      if (!record) {
        throw new NotFoundException(`EquiposContrato con ID ${id} no encontrado`);
      }

      return record;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al obtener equipos_contrato: ${(error as Error).message}`,
      );
    }
  }

  async update(id: number, updateDto: UpdateEquiposContratoDto) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.equipos_contrato.update({
        where: { id_equipo_contrato: id },
        data: updateDto as any,
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al actualizar equipos_contrato: ${(error as Error).message}`,
      );
    }
  }

  async remove(id: number) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.equipos_contrato.delete({
        where: { id_equipo_contrato: id },
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al eliminar equipos_contrato: ${(error as Error).message}`,
      );
    }
  }
}
