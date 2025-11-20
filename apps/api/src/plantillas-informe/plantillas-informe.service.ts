import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '@mekanos/database';
import { CreatePlantillasInformeDto } from './dto/create-plantillas-informe.dto';
import { UpdatePlantillasInformeDto } from './dto/update-plantillas-informe.dto';

@Injectable()
export class PlantillasInformeService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreatePlantillasInformeDto) {
    try {
      return await this.prisma.plantillas_informe.create({
        data: createDto as any,
      });
    } catch (error: unknown) {
      throw new InternalServerErrorException(
        `Error al crear plantillas_informe: ${(error as Error).message}`,
      );
    }
  }

  async findAll(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;
      
      const [data, total] = await Promise.all([
        this.prisma.plantillas_informe.findMany({
          skip,
          take: limit,
          orderBy: { id_plantilla_informe: 'desc' },
        }),
        this.prisma.plantillas_informe.count(),
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
        `Error al obtener plantillas_informe: ${(error as Error).message}`,
      );
    }
  }

  async findOne(id: number) {
    try {
      const record = await this.prisma.plantillas_informe.findUnique({
        where: { id_plantilla_informe: id },
      });

      if (!record) {
        throw new NotFoundException(`PlantillasInforme con ID ${id} no encontrado`);
      }

      return record;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al obtener plantillas_informe: ${(error as Error).message}`,
      );
    }
  }

  async update(id: number, updateDto: UpdatePlantillasInformeDto) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.plantillas_informe.update({
        where: { id_plantilla_informe: id },
        data: updateDto as any,
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al actualizar plantillas_informe: ${(error as Error).message}`,
      );
    }
  }

  async remove(id: number) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.plantillas_informe.delete({
        where: { id_plantilla_informe: id },
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al eliminar plantillas_informe: ${(error as Error).message}`,
      );
    }
  }
}
