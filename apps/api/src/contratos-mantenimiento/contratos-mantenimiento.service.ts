import { PrismaService } from '@mekanos/database';
import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DocumentType, NumeracionService } from '../common/services/numeracion.service';
import { CreateContratosMantenimientoDto } from './dto/create-contratos-mantenimiento.dto';
import { UpdateContratosMantenimientoDto } from './dto/update-contratos-mantenimiento.dto';

@Injectable()
export class ContratosMantenimientoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numeracionService: NumeracionService,
  ) {}

  async create(createDto: CreateContratosMantenimientoDto) {
    try {
      // Generar código de contrato automáticamente
      const resultado = await this.numeracionService.generateNextNumber(DocumentType.CONTRATO);
      const codigoContrato = resultado.code;
      
      return await this.prisma.contratos_mantenimiento.create({
        data: {
          ...createDto as any,
          codigo_contrato: codigoContrato,
        },
      });
    } catch (error: unknown) {
      throw new InternalServerErrorException(
        `Error al crear contratos_mantenimiento: ${(error as Error).message}`,
      );
    }
  }

  async findAll(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;
      
      const [data, total] = await Promise.all([
        this.prisma.contratos_mantenimiento.findMany({
          skip,
          take: limit,
          orderBy: { id_contrato: 'desc' },
        }),
        this.prisma.contratos_mantenimiento.count(),
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
        `Error al obtener contratos_mantenimiento: ${(error as Error).message}`,
      );
    }
  }

  async findOne(id: number) {
    try {
      const record = await this.prisma.contratos_mantenimiento.findUnique({
        where: { id_contrato: id },
      });

      if (!record) {
        throw new NotFoundException(`ContratosMantenimiento con ID ${id} no encontrado`);
      }

      return record;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al obtener contratos_mantenimiento: ${(error as Error).message}`,
      );
    }
  }

  async update(id: number, updateDto: UpdateContratosMantenimientoDto) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.contratos_mantenimiento.update({
        where: { id_contrato: id },
        data: updateDto as any,
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al actualizar contratos_mantenimiento: ${(error as Error).message}`,
      );
    }
  }

  async remove(id: number) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.contratos_mantenimiento.delete({
        where: { id_contrato: id },
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al eliminar contratos_mantenimiento: ${(error as Error).message}`,
      );
    }
  }
}
