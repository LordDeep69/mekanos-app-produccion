import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '@mekanos/database';
import { CreatePropuestasCorrectivoDto } from './dto/create-propuestas-correctivo.dto';
import { UpdatePropuestasCorrectivoDto } from './dto/update-propuestas-correctivo.dto';

@Injectable()
export class PropuestasCorrectivoService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreatePropuestasCorrectivoDto) {
    try {
      return await this.prisma.propuestas_correctivo.create({
        data: createDto as any,
      });
    } catch (error: unknown) {
      throw new InternalServerErrorException(
        `Error al crear propuestas_correctivo: ${(error as Error).message}`,
      );
    }
  }

  async findAll(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;
      
      const [data, total] = await Promise.all([
        this.prisma.propuestas_correctivo.findMany({
          skip,
          take: limit,
          orderBy: { id_propuesta: 'desc' },
        }),
        this.prisma.propuestas_correctivo.count(),
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
        `Error al obtener propuestas_correctivo: ${(error as Error).message}`,
      );
    }
  }

  async findOne(id: number) {
    try {
      const record = await this.prisma.propuestas_correctivo.findUnique({
        where: { id_propuesta: id },
      });

      if (!record) {
        throw new NotFoundException(`PropuestasCorrectivo con ID ${id} no encontrado`);
      }

      return record;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al obtener propuestas_correctivo: ${(error as Error).message}`,
      );
    }
  }

  async update(id: number, updateDto: UpdatePropuestasCorrectivoDto) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.propuestas_correctivo.update({
        where: { id_propuesta: id },
        data: updateDto as any,
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al actualizar propuestas_correctivo: ${(error as Error).message}`,
      );
    }
  }

  async remove(id: number) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.propuestas_correctivo.delete({
        where: { id_propuesta: id },
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al eliminar propuestas_correctivo: ${(error as Error).message}`,
      );
    }
  }
}
