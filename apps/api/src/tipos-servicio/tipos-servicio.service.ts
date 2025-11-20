import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '@mekanos/database';
import { CreateTiposServicioDto } from './dto/create-tipos-servicio.dto';
import { UpdateTiposServicioDto } from './dto/update-tipos-servicio.dto';

@Injectable()
export class TiposServicioService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateTiposServicioDto) {
    try {
      return await this.prisma.tipos_servicio.create({
        data: createDto as any,
      });
    } catch (error: unknown) {
      throw new InternalServerErrorException(
        `Error al crear tipos_servicio: ${(error as Error).message}`,
      );
    }
  }

  async findAll(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;
      
      const [data, total] = await Promise.all([
        this.prisma.tipos_servicio.findMany({
          skip,
          take: limit,
          orderBy: { id_tipo_servicio: 'desc' },
        }),
        this.prisma.tipos_servicio.count(),
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
        `Error al obtener tipos_servicio: ${(error as Error).message}`,
      );
    }
  }

  async findOne(id: number) {
    try {
      const record = await this.prisma.tipos_servicio.findUnique({
        where: { id_tipo_servicio: id },
      });

      if (!record) {
        throw new NotFoundException(`TiposServicio con ID ${id} no encontrado`);
      }

      return record;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al obtener tipos_servicio: ${(error as Error).message}`,
      );
    }
  }

  async update(id: number, updateDto: UpdateTiposServicioDto) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.tipos_servicio.update({
        where: { id_tipo_servicio: id },
        data: updateDto as any,
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al actualizar tipos_servicio: ${(error as Error).message}`,
      );
    }
  }

  async remove(id: number) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.tipos_servicio.delete({
        where: { id_tipo_servicio: id },
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al eliminar tipos_servicio: ${(error as Error).message}`,
      );
    }
  }
}
