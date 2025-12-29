import { PrismaService } from '@mekanos/database';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateLecturasHorometroDto } from './dto/create-lecturas-horometro.dto';
import { UpdateLecturasHorometroDto } from './dto/update-lecturas-horometro.dto';

@Injectable()
export class LecturasHorometroService {
  constructor(private readonly prisma: PrismaService) { }

  async create(createDto: CreateLecturasHorometroDto) {
    try {
      const { id_equipo, horas_lectura, id_orden_servicio } = createDto as any;

      // 1. Validar que las horas no sean negativas
      if (horas_lectura < 0) {
        throw new BadRequestException('Las horas de lectura no pueden ser negativas');
      }

      // 2. Evitar duplicidad para la misma orden (si aplica)
      if (id_orden_servicio) {
        const existente = await this.prisma.lecturas_horometro.findFirst({
          where: {
            id_equipo,
            id_orden_servicio,
          },
        });
        if (existente) {
          return existente; // Retornar el existente para evitar duplicados (idempotencia)
        }
      }

      // 3. Validación Zero Trust: Evitar horómetro en reversa
      const ultimaLectura = await this.prisma.lecturas_horometro.findFirst({
        where: { id_equipo },
        orderBy: { fecha_lectura: 'desc' },
      });

      if (ultimaLectura && Number(ultimaLectura.horas_lectura) > horas_lectura) {
        throw new BadRequestException(
          `Lectura inválida: ${horas_lectura}h es menor a la última lectura registrada (${ultimaLectura.horas_lectura}h)`,
        );
      }

      // 4. Crear registro
      return await this.prisma.lecturas_horometro.create({
        data: createDto as any,
      });
    } catch (error: unknown) {
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException(
        `Error al crear lecturas_horometro: ${(error as Error).message}`,
      );
    }
  }

  async findAll(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;

      const [data, total] = await Promise.all([
        this.prisma.lecturas_horometro.findMany({
          skip,
          take: limit,
          orderBy: { id_lectura: 'desc' },
        }),
        this.prisma.lecturas_horometro.count(),
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
        `Error al obtener lecturas_horometro: ${(error as Error).message}`,
      );
    }
  }

  async findOne(id: number) {
    try {
      const record = await this.prisma.lecturas_horometro.findUnique({
        where: { id_lectura: id },
      });

      if (!record) {
        throw new NotFoundException(`LecturasHorometro con ID ${id} no encontrado`);
      }

      return record;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al obtener lecturas_horometro: ${(error as Error).message}`,
      );
    }
  }

  async update(id: number, updateDto: UpdateLecturasHorometroDto) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.lecturas_horometro.update({
        where: { id_lectura: id },
        data: updateDto as any,
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al actualizar lecturas_horometro: ${(error as Error).message}`,
      );
    }
  }

  async remove(id: number) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.lecturas_horometro.delete({
        where: { id_lectura: id },
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al eliminar lecturas_horometro: ${(error as Error).message}`,
      );
    }
  }
}
