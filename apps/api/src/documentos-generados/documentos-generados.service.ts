import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '@mekanos/database';
import { CreateDocumentosGeneradosDto } from './dto/create-documentos-generados.dto';
import { UpdateDocumentosGeneradosDto } from './dto/update-documentos-generados.dto';

@Injectable()
export class DocumentosGeneradosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateDocumentosGeneradosDto) {
    try {
      return await this.prisma.documentos_generados.create({
        data: createDto as any,
      });
    } catch (error: unknown) {
      throw new InternalServerErrorException(
        `Error al crear documentos_generados: ${(error as Error).message}`,
      );
    }
  }

  async findAll(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;
      
      const [data, total] = await Promise.all([
        this.prisma.documentos_generados.findMany({
          skip,
          take: limit,
          orderBy: { id_documento: 'desc' },
        }),
        this.prisma.documentos_generados.count(),
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
        `Error al obtener documentos_generados: ${(error as Error).message}`,
      );
    }
  }

  async findOne(id: number) {
    try {
      const record = await this.prisma.documentos_generados.findUnique({
        where: { id_documento: id },
      });

      if (!record) {
        throw new NotFoundException(`DocumentosGenerados con ID ${id} no encontrado`);
      }

      return record;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al obtener documentos_generados: ${(error as Error).message}`,
      );
    }
  }

  async update(id: number, updateDto: UpdateDocumentosGeneradosDto) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.documentos_generados.update({
        where: { id_documento: id },
        data: updateDto as any,
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al actualizar documentos_generados: ${(error as Error).message}`,
      );
    }
  }

  async remove(id: number) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.documentos_generados.delete({
        where: { id_documento: id },
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al eliminar documentos_generados: ${(error as Error).message}`,
      );
    }
  }
}
