import {
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { CreateFirmasDigitalesDto } from './dto/create-firmas-digitales.dto';
import { UpdateFirmasDigitalesDto } from './dto/update-firmas-digitales.dto';

@Injectable()
export class FirmasDigitalesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateFirmasDigitalesDto, userId: number) {
    try {
      // Validar persona
      const persona = await this.prisma.personas.findUnique({
        where: { id_persona: createDto.id_persona },
      });

      if (!persona) {
        throw new NotFoundException(
          `Persona con ID ${createDto.id_persona} no existe`,
        );
      }

      const hash_firma = createDto.hash_firma || createHash('sha256').update(createDto.firma_base64).digest('hex').substring(0, 64);

      return await this.prisma.firmas_digitales.create({
        data: {
          ...(createDto as any),
          hash_firma,
          registrada_por: userId,
          fecha_registro: new Date(),
        },
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al crear firmas_digitales: ${(error as Error).message}`,
      );
    }
  }

  async findAll(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;
      
      const [data, total] = await Promise.all([
        this.prisma.firmas_digitales.findMany({
          skip,
          take: limit,
          orderBy: { id_firma_digital: 'desc' },
        }),
        this.prisma.firmas_digitales.count(),
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
        `Error al obtener firmas_digitales: ${(error as Error).message}`,
      );
    }
  }

  async findOne(id: number) {
    try {
      const record = await this.prisma.firmas_digitales.findUnique({
        where: { id_firma_digital: id },
      });

      if (!record) {
        throw new NotFoundException(`FirmasDigitales con ID ${id} no encontrado`);
      }

      return record;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al obtener firmas_digitales: ${(error as Error).message}`,
      );
    }
  }

  async update(id: number, updateDto: UpdateFirmasDigitalesDto) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.firmas_digitales.update({
        where: { id_firma_digital: id },
        data: updateDto as any,
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al actualizar firmas_digitales: ${(error as Error).message}`,
      );
    }
  }

  async remove(id: number) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.firmas_digitales.delete({
        where: { id_firma_digital: id },
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al eliminar firmas_digitales: ${(error as Error).message}`,
      );
    }
  }
}
