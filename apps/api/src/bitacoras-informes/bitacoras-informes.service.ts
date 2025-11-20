import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '@mekanos/database';
import { CreateBitacorasInformesDto } from './dto/create-bitacoras-informes.dto';
import { UpdateBitacorasInformesDto } from './dto/update-bitacoras-informes.dto';

@Injectable()
export class BitacorasInformesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateBitacorasInformesDto) {
    try {
      return await this.prisma.bitacoras_informes.create({
        data: createDto as any,
      });
    } catch (error: unknown) {
      throw new InternalServerErrorException(
        `Error al crear bitacoras_informes: ${(error as Error).message}`,
      );
    }
  }

  async findAll(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;
      
      const [data, total] = await Promise.all([
        this.prisma.bitacoras_informes.findMany({
          skip,
          take: limit,
          orderBy: { id_bitacora_informe: 'desc' },
        }),
        this.prisma.bitacoras_informes.count(),
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
        `Error al obtener bitacoras_informes: ${(error as Error).message}`,
      );
    }
  }

  async findOne(id: number) {
    try {
      const record = await this.prisma.bitacoras_informes.findUnique({
        where: { id_bitacora_informe: id },
      });

      if (!record) {
        throw new NotFoundException(`BitacorasInformes con ID ${id} no encontrado`);
      }

      return record;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al obtener bitacoras_informes: ${(error as Error).message}`,
      );
    }
  }

  async update(id: number, updateDto: UpdateBitacorasInformesDto) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.bitacoras_informes.update({
        where: { id_bitacora_informe: id },
        data: updateDto as any,
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al actualizar bitacoras_informes: ${(error as Error).message}`,
      );
    }
  }

  async remove(id: number) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.bitacoras_informes.delete({
        where: { id_bitacora_informe: id },
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al eliminar bitacoras_informes: ${(error as Error).message}`,
      );
    }
  }
}
