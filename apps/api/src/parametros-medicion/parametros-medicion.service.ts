import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '@mekanos/database';
import { CreateParametrosMedicionDto } from './dto/create-parametros-medicion.dto';
import { UpdateParametrosMedicionDto } from './dto/update-parametros-medicion.dto';

@Injectable()
export class ParametrosMedicionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateParametrosMedicionDto) {
    try {
      return await this.prisma.parametros_medicion.create({
        data: createDto as any,
      });
    } catch (error: unknown) {
      throw new InternalServerErrorException(
        `Error al crear parametros_medicion: ${(error as Error).message}`,
      );
    }
  }

  async findAll(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;
      
      const [data, total] = await Promise.all([
        this.prisma.parametros_medicion.findMany({
          skip,
          take: limit,
          orderBy: { id_parametro: 'desc' },
        }),
        this.prisma.parametros_medicion.count(),
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
        `Error al obtener parametros_medicion: ${(error as Error).message}`,
      );
    }
  }

  async findOne(id: number) {
    try {
      const record = await this.prisma.parametros_medicion.findUnique({
        where: { id_parametro: id },
      });

      if (!record) {
        throw new NotFoundException(`ParametrosMedicion con ID ${id} no encontrado`);
      }

      return record;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al obtener parametros_medicion: ${(error as Error).message}`,
      );
    }
  }

  async update(id: number, updateDto: UpdateParametrosMedicionDto) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.parametros_medicion.update({
        where: { id_parametro: id },
        data: updateDto as any,
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al actualizar parametros_medicion: ${(error as Error).message}`,
      );
    }
  }

  async remove(id: number) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.parametros_medicion.delete({
        where: { id_parametro: id },
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al eliminar parametros_medicion: ${(error as Error).message}`,
      );
    }
  }
}
