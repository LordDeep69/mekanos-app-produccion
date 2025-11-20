import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '@mekanos/database';
import { CreateEstadosOrdenDto } from './dto/create-estados-orden.dto';
import { UpdateEstadosOrdenDto } from './dto/update-estados-orden.dto';

@Injectable()
export class EstadosOrdenService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateEstadosOrdenDto) {
    try {
      return await this.prisma.estados_orden.create({
        data: createDto as any,
      });
    } catch (error: unknown) {
      throw new InternalServerErrorException(
        `Error al crear estados_orden: ${(error as Error).message}`,
      );
    }
  }

  async findAll(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;
      
      const [data, total] = await Promise.all([
        this.prisma.estados_orden.findMany({
          skip,
          take: limit,
          orderBy: { id_estado: 'desc' },
        }),
        this.prisma.estados_orden.count(),
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
        `Error al obtener estados_orden: ${(error as Error).message}`,
      );
    }
  }

  async findOne(id: number) {
    try {
      const record = await this.prisma.estados_orden.findUnique({
        where: { id_estado: id },
      });

      if (!record) {
        throw new NotFoundException(`EstadosOrden con ID ${id} no encontrado`);
      }

      return record;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al obtener estados_orden: ${(error as Error).message}`,
      );
    }
  }

  async update(id: number, updateDto: UpdateEstadosOrdenDto) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.estados_orden.update({
        where: { id_estado: id },
        data: updateDto as any,
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al actualizar estados_orden: ${(error as Error).message}`,
      );
    }
  }

  async remove(id: number) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.estados_orden.delete({
        where: { id_estado: id },
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al eliminar estados_orden: ${(error as Error).message}`,
      );
    }
  }
}
