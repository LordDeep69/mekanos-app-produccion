import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '@mekanos/database';
import { CreateHistorialContratoDto } from './dto/create-historial-contrato.dto';
import { UpdateHistorialContratoDto } from './dto/update-historial-contrato.dto';

@Injectable()
export class HistorialContratoService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateHistorialContratoDto) {
    try {
      return await this.prisma.historial_contrato.create({
        data: createDto as any,
      });
    } catch (error: unknown) {
      throw new InternalServerErrorException(
        `Error al crear historial_contrato: ${(error as Error).message}`,
      );
    }
  }

  async findAll(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;
      
      const [data, total] = await Promise.all([
        this.prisma.historial_contrato.findMany({
          skip,
          take: limit,
          orderBy: { id_historial: 'desc' },
        }),
        this.prisma.historial_contrato.count(),
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
        `Error al obtener historial_contrato: ${(error as Error).message}`,
      );
    }
  }

  async findOne(id: number) {
    try {
      const record = await this.prisma.historial_contrato.findUnique({
        where: { id_historial: id },
      });

      if (!record) {
        throw new NotFoundException(`HistorialContrato con ID ${id} no encontrado`);
      }

      return record;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al obtener historial_contrato: ${(error as Error).message}`,
      );
    }
  }

  async update(id: number, updateDto: UpdateHistorialContratoDto) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.historial_contrato.update({
        where: { id_historial: id },
        data: updateDto as any,
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al actualizar historial_contrato: ${(error as Error).message}`,
      );
    }
  }

  async remove(id: number) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.historial_contrato.delete({
        where: { id_historial: id },
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al eliminar historial_contrato: ${(error as Error).message}`,
      );
    }
  }
}
