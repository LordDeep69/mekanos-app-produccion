import {
    ConflictException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../database/prisma.service';
import { CreateUsuariosDto } from './dto/create-usuarios.dto';
import { UpdateUsuariosDto } from './dto/update-usuarios.dto';

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateUsuariosDto) {
    try {
      // Validar existencia de persona
      const persona = await this.prisma.personas.findUnique({
        where: { id_persona: createDto.id_persona },
      });

      if (!persona) {
        throw new NotFoundException(
          `Persona con ID ${createDto.id_persona} no existe`,
        );
      }

      // Validar unicidad de username y email
      const existingUser = await this.prisma.usuarios.findFirst({
        where: {
          OR: [{ username: createDto.username }, { email: createDto.email }],
        },
      });

      if (existingUser) {
        throw new ConflictException('Username o Email ya existen');
      }

      const salt = await bcrypt.genSalt();
      const password_hash = await bcrypt.hash(createDto.password, salt);

      // Remove password from dto
      const { password, ...rest } = createDto;

      return await this.prisma.usuarios.create({
        data: {
          ...rest,
          password_hash,
          fecha_creacion: new Date(),
        },
      });
    } catch (error: unknown) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al crear usuarios: ${(error as Error).message}`,
      );
    }
  }

  async findAll(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;
      
      const [data, total] = await Promise.all([
        this.prisma.usuarios.findMany({
          skip,
          take: limit,
          orderBy: { id_usuario: 'desc' },
        }),
        this.prisma.usuarios.count(),
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
        `Error al obtener usuarios: ${(error as Error).message}`,
      );
    }
  }

  async findOne(id: number) {
    try {
      const record = await this.prisma.usuarios.findUnique({
        where: { id_usuario: id },
      });

      if (!record) {
        throw new NotFoundException(`Usuarios con ID ${id} no encontrado`);
      }

      return record;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al obtener usuarios: ${(error as Error).message}`,
      );
    }
  }

  async update(id: number, updateDto: UpdateUsuariosDto) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.usuarios.update({
        where: { id_usuario: id },
        data: updateDto as any,
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al actualizar usuarios: ${(error as Error).message}`,
      );
    }
  }

  async remove(id: number) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.usuarios.delete({
        where: { id_usuario: id },
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al eliminar usuarios: ${(error as Error).message}`,
      );
    }
  }
}
