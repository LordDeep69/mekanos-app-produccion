import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '@mekanos/database';
import { CreateEvidenciasOrdenDto } from './dto/create-evidencias-orden.dto';
import { UpdateEvidenciasOrdenDto } from './dto/update-evidencias-orden.dto';

@Injectable()
export class EvidenciasOrdenService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateEvidenciasOrdenDto) {
    try {
      return await this.prisma.evidencias_orden.create({
        data: createDto as any,
      });
    } catch (error: unknown) {
      throw new InternalServerErrorException(
        `Error al crear evidencias_orden: ${(error as Error).message}`,
      );
    }
  }

  async findAll(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;
      
      const [data, total] = await Promise.all([
        this.prisma.evidencias_orden.findMany({
          skip,
          take: limit,
          orderBy: { id_evidencia: 'desc' },
        }),
        this.prisma.evidencias_orden.count(),
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
        `Error al obtener evidencias_orden: ${(error as Error).message}`,
      );
    }
  }

  async findOne(id: number) {
    try {
      const record = await this.prisma.evidencias_orden.findUnique({
        where: { id_evidencia: id },
      });

      if (!record) {
        throw new NotFoundException(`EvidenciasOrden con ID ${id} no encontrado`);
      }

      return record;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al obtener evidencias_orden: ${(error as Error).message}`,
      );
    }
  }

  async update(id: number, updateDto: UpdateEvidenciasOrdenDto) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.evidencias_orden.update({
        where: { id_evidencia: id },
        data: updateDto as any,
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al actualizar evidencias_orden: ${(error as Error).message}`,
      );
    }
  }

  async remove(id: number) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.evidencias_orden.delete({
        where: { id_evidencia: id },
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al eliminar evidencias_orden: ${(error as Error).message}`,
      );
    }
  }
}
