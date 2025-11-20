import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '@mekanos/database';
import { CreateDevolucionesProveedorDto } from './dto/create-devoluciones-proveedor.dto';
import { UpdateDevolucionesProveedorDto } from './dto/update-devoluciones-proveedor.dto';

@Injectable()
export class DevolucionesProveedorService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateDevolucionesProveedorDto) {
    try {
      return await this.prisma.devoluciones_proveedor.create({
        data: createDto as any,
      });
    } catch (error: unknown) {
      throw new InternalServerErrorException(
        `Error al crear devoluciones_proveedor: ${(error as Error).message}`,
      );
    }
  }

  async findAll(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;
      
      const [data, total] = await Promise.all([
        this.prisma.devoluciones_proveedor.findMany({
          skip,
          take: limit,
          orderBy: { id_devolucion: 'desc' },
        }),
        this.prisma.devoluciones_proveedor.count(),
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
        `Error al obtener devoluciones_proveedor: ${(error as Error).message}`,
      );
    }
  }

  async findOne(id: number) {
    try {
      const record = await this.prisma.devoluciones_proveedor.findUnique({
        where: { id_devolucion: id },
      });

      if (!record) {
        throw new NotFoundException(`DevolucionesProveedor con ID ${id} no encontrado`);
      }

      return record;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al obtener devoluciones_proveedor: ${(error as Error).message}`,
      );
    }
  }

  async update(id: number, updateDto: UpdateDevolucionesProveedorDto) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.devoluciones_proveedor.update({
        where: { id_devolucion: id },
        data: updateDto as any,
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al actualizar devoluciones_proveedor: ${(error as Error).message}`,
      );
    }
  }

  async remove(id: number) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.devoluciones_proveedor.delete({
        where: { id_devolucion: id },
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al eliminar devoluciones_proveedor: ${(error as Error).message}`,
      );
    }
  }
}
