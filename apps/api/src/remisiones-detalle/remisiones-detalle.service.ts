import { PrismaService } from '@mekanos/database';
import {
    BadRequestException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { CreateRemisionesDetalleDto } from './dto/create-remisiones-detalle.dto';
import { UpdateRemisionesDetalleDto } from './dto/update-remisiones-detalle.dto';

@Injectable()
export class RemisionesDetalleService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateRemisionesDetalleDto) {
    try {
      // Validar que la remisión existe
      const remision = await this.prisma.remisiones.findUnique({
        where: { id_remision: createDto.id_remision },
      });
      if (!remision) {
        throw new BadRequestException(
          `Remisión ${createDto.id_remision} no encontrada`,
        );
      }

      // Si es tipo COMPONENTE, validar que el componente existe
      if (createDto.tipo_item === 'COMPONENTE' && createDto.id_componente) {
        const componente = await this.prisma.catalogo_componentes.findUnique({
          where: { id_componente: createDto.id_componente },
        });
        if (!componente) {
          throw new BadRequestException(
            `Componente ${createDto.id_componente} no encontrado`,
          );
        }
      }

      return await this.prisma.remisiones_detalle.create({
        data: {
          id_remision: createDto.id_remision,
          tipo_item: createDto.tipo_item,
          id_componente: createDto.id_componente,
          descripcion_item: createDto.descripcion_item,
          cantidad_entregada: new Decimal(createDto.cantidad_entregada),
          cantidad_devuelta: createDto.cantidad_devuelta
            ? new Decimal(createDto.cantidad_devuelta)
            : new Decimal(0),
          estado_item: createDto.estado_item || 'ENTREGADO',
          observaciones: createDto.observaciones,
        },
      });
    } catch (error: unknown) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al crear remisiones_detalle: ${(error as Error).message}`,
      );
    }
  }

  async findAll(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;
      
      const [data, total] = await Promise.all([
        this.prisma.remisiones_detalle.findMany({
          skip,
          take: limit,
          orderBy: { id_detalle_remision: 'desc' },
          include: {
            catalogo_componentes: {
              select: { descripcion_corta: true, codigo_interno: true },
            },
          },
        }),
        this.prisma.remisiones_detalle.count(),
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
        `Error al obtener remisiones_detalle: ${(error as Error).message}`,
      );
    }
  }

  async findOne(id: number) {
    try {
      const record = await this.prisma.remisiones_detalle.findUnique({
        where: { id_detalle_remision: id },
      });

      if (!record) {
        throw new NotFoundException(`RemisionesDetalle con ID ${id} no encontrado`);
      }

      return record;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al obtener remisiones_detalle: ${(error as Error).message}`,
      );
    }
  }

  async update(id: number, updateDto: UpdateRemisionesDetalleDto) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.remisiones_detalle.update({
        where: { id_detalle_remision: id },
        data: updateDto as any,
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al actualizar remisiones_detalle: ${(error as Error).message}`,
      );
    }
  }

  async remove(id: number) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.remisiones_detalle.delete({
        where: { id_detalle_remision: id },
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al eliminar remisiones_detalle: ${(error as Error).message}`,
      );
    }
  }
}
