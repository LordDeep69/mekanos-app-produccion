import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '@mekanos/database';
import { CreateRecepcionesCompraDto } from './dto/create-recepciones-compra.dto';
import { UpdateRecepcionesCompraDto } from './dto/update-recepciones-compra.dto';

@Injectable()
export class RecepcionesCompraService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateRecepcionesCompraDto) {
    try {
      return await this.prisma.recepciones_compra.create({
        data: createDto as any,
      });
    } catch (error: unknown) {
      throw new InternalServerErrorException(
        `Error al crear recepciones_compra: ${(error as Error).message}`,
      );
    }
  }

  async findAll(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;
      
      const [data, total] = await Promise.all([
        this.prisma.recepciones_compra.findMany({
          skip,
          take: limit,
          orderBy: { id_recepcion: 'desc' },
        }),
        this.prisma.recepciones_compra.count(),
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
        `Error al obtener recepciones_compra: ${(error as Error).message}`,
      );
    }
  }

  async findOne(id: number) {
    try {
      const record = await this.prisma.recepciones_compra.findUnique({
        where: { id_recepcion: id },
      });

      if (!record) {
        throw new NotFoundException(`RecepcionesCompra con ID ${id} no encontrado`);
      }

      return record;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al obtener recepciones_compra: ${(error as Error).message}`,
      );
    }
  }

  async update(id: number, updateDto: UpdateRecepcionesCompraDto) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.recepciones_compra.update({
        where: { id_recepcion: id },
        data: updateDto as any,
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al actualizar recepciones_compra: ${(error as Error).message}`,
      );
    }
  }

  async remove(id: number) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.recepciones_compra.delete({
        where: { id_recepcion: id },
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al eliminar recepciones_compra: ${(error as Error).message}`,
      );
    }
  }
}
