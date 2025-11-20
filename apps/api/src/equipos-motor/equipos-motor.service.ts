import { PrismaService } from '@mekanos/database';
import {
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { CreateEquiposMotorDto } from './dto/create-equipos-motor.dto';
import { UpdateEquiposMotorDto } from './dto/update-equipos-motor.dto';

@Injectable()
export class EquiposMotorService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateEquiposMotorDto) {
    try {
      return await this.prisma.equipos_motor.create({
        data: createDto as any,
      });
    } catch (error: unknown) {
      throw new InternalServerErrorException(
        `Error al crear equipos_motor: ${(error as Error).message}`,
      );
    }
  }

  async findAll(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;
      
      const [data, total] = await Promise.all([
        this.prisma.equipos_motor.findMany({
          skip,
          take: limit,
          orderBy: { id_equipo: 'desc' },
        }),
        this.prisma.equipos_motor.count(),
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
        `Error al obtener equipos_motor: ${(error as Error).message}`,
      );
    }
  }

  async findOne(id: number) {
    try {
      const record = await this.prisma.equipos_motor.findUnique({
        where: { id_equipo: id },
      });

      if (!record) {
        throw new NotFoundException(`EquiposMotor con ID ${id} no encontrado`);
      }

      return record;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al obtener equipos_motor: ${(error as Error).message}`,
      );
    }
  }

  async update(id: number, updateDto: UpdateEquiposMotorDto) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.equipos_motor.update({
        where: { id_equipo: id },
        data: updateDto as any,
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al actualizar equipos_motor: ${(error as Error).message}`,
      );
    }
  }

  async remove(id: number) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.equipos_motor.delete({
        where: { id_equipo: id },
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al eliminar equipos_motor: ${(error as Error).message}`,
      );
    }
  }
}
