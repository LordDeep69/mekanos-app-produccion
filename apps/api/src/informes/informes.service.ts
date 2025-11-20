import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '@mekanos/database';
import { CreateInformesDto } from './dto/create-informes.dto';
import { UpdateInformesDto } from './dto/update-informes.dto';

@Injectable()
export class InformesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateInformesDto) {
    try {
      return await this.prisma.informes.create({
        data: createDto as any,
      });
    } catch (error: unknown) {
      throw new InternalServerErrorException(
        `Error al crear informes: ${(error as Error).message}`,
      );
    }
  }

  async findAll(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;
      
      const [data, total] = await Promise.all([
        this.prisma.informes.findMany({
          skip,
          take: limit,
          orderBy: { id_informe: 'desc' },
        }),
        this.prisma.informes.count(),
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
        `Error al obtener informes: ${(error as Error).message}`,
      );
    }
  }

  async findOne(id: number) {
    try {
      const record = await this.prisma.informes.findUnique({
        where: { id_informe: id },
      });

      if (!record) {
        throw new NotFoundException(`Informes con ID ${id} no encontrado`);
      }

      return record;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al obtener informes: ${(error as Error).message}`,
      );
    }
  }

  async update(id: number, updateDto: UpdateInformesDto) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.informes.update({
        where: { id_informe: id },
        data: updateDto as any,
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al actualizar informes: ${(error as Error).message}`,
      );
    }
  }

  async remove(id: number) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.informes.delete({
        where: { id_informe: id },
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al eliminar informes: ${(error as Error).message}`,
      );
    }
  }
}
