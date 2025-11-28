import { PrismaService } from '@mekanos/database';
import {
    BadRequestException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { CreateOrdenesCompraDetalleDto } from './dto/create-ordenes-compra-detalle.dto';
import { UpdateOrdenesCompraDetalleDto } from './dto/update-ordenes-compra-detalle.dto';

@Injectable()
export class OrdenesCompraDetalleService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateOrdenesCompraDetalleDto) {
    try {
      // Validar que la orden de compra existe
      const ordenCompra = await this.prisma.ordenes_compra.findUnique({
        where: { id_orden_compra: createDto.id_orden_compra },
      });
      if (!ordenCompra) {
        throw new BadRequestException(
          `Orden de compra ${createDto.id_orden_compra} no encontrada`,
        );
      }

      // Validar que el componente existe
      const componente = await this.prisma.catalogo_componentes.findUnique({
        where: { id_componente: createDto.id_componente },
      });
      if (!componente) {
        throw new BadRequestException(
          `Componente ${createDto.id_componente} no encontrado`,
        );
      }

      return await this.prisma.ordenes_compra_detalle.create({
        data: {
          id_orden_compra: createDto.id_orden_compra,
          id_componente: createDto.id_componente,
          cantidad: new Decimal(createDto.cantidad),
          precio_unitario: new Decimal(createDto.precio_unitario),
          observaciones: createDto.observaciones,
        },
        include: {
          catalogo_componentes: {
            select: { descripcion_corta: true, codigo_interno: true },
          },
        },
      });
    } catch (error: unknown) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al crear ordenes_compra_detalle: ${(error as Error).message}`,
      );
    }
  }

  async findAll(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;
      
      const [data, total] = await Promise.all([
        this.prisma.ordenes_compra_detalle.findMany({
          skip,
          take: limit,
          orderBy: { id_detalle: 'desc' },
          include: {
            catalogo_componentes: {
              select: { descripcion_corta: true, codigo_interno: true },
            },
          },
        }),
        this.prisma.ordenes_compra_detalle.count(),
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
        `Error al obtener ordenes_compra_detalle: ${(error as Error).message}`,
      );
    }
  }

  async findOne(id: number) {
    try {
      const record = await this.prisma.ordenes_compra_detalle.findUnique({
        where: { id_detalle: id },
      });

      if (!record) {
        throw new NotFoundException(`OrdenesCompraDetalle con ID ${id} no encontrado`);
      }

      return record;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al obtener ordenes_compra_detalle: ${(error as Error).message}`,
      );
    }
  }

  async update(id: number, updateDto: UpdateOrdenesCompraDetalleDto) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.ordenes_compra_detalle.update({
        where: { id_detalle: id },
        data: updateDto as any,
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al actualizar ordenes_compra_detalle: ${(error as Error).message}`,
      );
    }
  }

  async remove(id: number) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.ordenes_compra_detalle.delete({
        where: { id_detalle: id },
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al eliminar ordenes_compra_detalle: ${(error as Error).message}`,
      );
    }
  }
}
