import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '@mekanos/database';
import { CreateSedesClienteDto } from './dto/create-sedes-cliente.dto';
import { UpdateSedesClienteDto } from './dto/update-sedes-cliente.dto';

@Injectable()
export class SedesClienteService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateSedesClienteDto) {
    try {
      return await this.prisma.sedes_cliente.create({
        data: createDto as any,
      });
    } catch (error: unknown) {
      throw new InternalServerErrorException(
        `Error al crear sedes_cliente: ${(error as Error).message}`,
      );
    }
  }

  async findAll(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;
      
      const [data, total] = await Promise.all([
        this.prisma.sedes_cliente.findMany({
          skip,
          take: limit,
          orderBy: { id_sede: 'desc' },
        }),
        this.prisma.sedes_cliente.count(),
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
        `Error al obtener sedes_cliente: ${(error as Error).message}`,
      );
    }
  }

  async findOne(id: number) {
    try {
      const record = await this.prisma.sedes_cliente.findUnique({
        where: { id_sede: id },
      });

      if (!record) {
        throw new NotFoundException(`SedesCliente con ID ${id} no encontrado`);
      }

      return record;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al obtener sedes_cliente: ${(error as Error).message}`,
      );
    }
  }

  async update(id: number, updateDto: UpdateSedesClienteDto) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.sedes_cliente.update({
        where: { id_sede: id },
        data: updateDto as any,
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al actualizar sedes_cliente: ${(error as Error).message}`,
      );
    }
  }

  async remove(id: number) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.sedes_cliente.delete({
        where: { id_sede: id },
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al eliminar sedes_cliente: ${(error as Error).message}`,
      );
    }
  }
}
