import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '@mekanos/database';
import { CreateCatalogoServiciosDto } from './dto/create-catalogo-servicios.dto';
import { UpdateCatalogoServiciosDto } from './dto/update-catalogo-servicios.dto';

@Injectable()
export class CatalogoServiciosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateCatalogoServiciosDto) {
    try {
      return await this.prisma.catalogo_servicios.create({
        data: createDto as any,
      });
    } catch (error: unknown) {
      throw new InternalServerErrorException(
        `Error al crear catalogo_servicios: ${(error as Error).message}`,
      );
    }
  }

  async findAll(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;
      
      const [data, total] = await Promise.all([
        this.prisma.catalogo_servicios.findMany({
          skip,
          take: limit,
          orderBy: { id_servicio: 'desc' },
        }),
        this.prisma.catalogo_servicios.count(),
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
        `Error al obtener catalogo_servicios: ${(error as Error).message}`,
      );
    }
  }

  async findOne(id: number) {
    try {
      const record = await this.prisma.catalogo_servicios.findUnique({
        where: { id_servicio: id },
      });

      if (!record) {
        throw new NotFoundException(`CatalogoServicios con ID ${id} no encontrado`);
      }

      return record;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al obtener catalogo_servicios: ${(error as Error).message}`,
      );
    }
  }

  async update(id: number, updateDto: UpdateCatalogoServiciosDto) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.catalogo_servicios.update({
        where: { id_servicio: id },
        data: updateDto as any,
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al actualizar catalogo_servicios: ${(error as Error).message}`,
      );
    }
  }

  async remove(id: number) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.catalogo_servicios.delete({
        where: { id_servicio: id },
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al eliminar catalogo_servicios: ${(error as Error).message}`,
      );
    }
  }
}
