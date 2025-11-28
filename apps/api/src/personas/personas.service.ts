import { PrismaService } from '@mekanos/database';
import {
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { CreatePersonasDto } from './dto/create-personas.dto';
import { UpdatePersonasDto } from './dto/update-personas.dto';

@Injectable()
export class PersonasService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreatePersonasDto, userId: number) {
    try {
      const data = { ...createDto };
      if (data.fecha_nacimiento) {
        data.fecha_nacimiento = new Date(data.fecha_nacimiento) as any;
      }

      return await this.prisma.personas.create({
        data: {
          ...data,
          creado_por: userId,
        } as any,
      });
    } catch (error: unknown) {
      throw new InternalServerErrorException(
        `Error al crear personas: ${(error as Error).message}`,
      );
    }
  }

  async findAll(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;
      
      const [data, total] = await Promise.all([
        this.prisma.personas.findMany({
          skip,
          take: limit,
          orderBy: { id_persona: 'desc' },
        }),
        this.prisma.personas.count(),
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
        `Error al obtener personas: ${(error as Error).message}`,
      );
    }
  }

  async findOne(id: number) {
    try {
      const record = await this.prisma.personas.findUnique({
        where: { id_persona: id },
      });

      if (!record) {
        throw new NotFoundException(`Personas con ID ${id} no encontrado`);
      }

      return record;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al obtener personas: ${(error as Error).message}`,
      );
    }
  }

  async update(id: number, updateDto: UpdatePersonasDto, userId: number) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.personas.update({
        where: { id_persona: id },
        data: {
          ...updateDto,
          modificado_por: userId,
          fecha_modificacion: new Date(),
        } as any,
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al actualizar personas: ${(error as Error).message}`,
      );
    }
  }

  async remove(id: number) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.personas.delete({
        where: { id_persona: id },
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al eliminar personas: ${(error as Error).message}`,
      );
    }
  }
}
