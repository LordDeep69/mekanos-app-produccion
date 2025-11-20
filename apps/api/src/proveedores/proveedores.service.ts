import { PrismaService } from '@mekanos/database';
import {
    ConflictException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { CrearProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedoresDto } from './dto/update-proveedores.dto';

@Injectable()
export class ProveedoresService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CrearProveedorDto, userId: number) {
    try {
      // Verificar que la persona existe y no está asignada a otro proveedor
      const persona = await this.prisma.personas.findUnique({
        where: { id_persona: createDto.id_persona },
        include: { proveedores: true },
      });

      if (!persona) {
        throw new NotFoundException(`Persona con ID ${createDto.id_persona} no encontrada`);
      }

      if (persona.proveedores) {
        throw new ConflictException(`La persona ID ${createDto.id_persona} ya está asignada como proveedor`);
      }

      // Crear el proveedor
      return await this.prisma.proveedores.create({
        data: {
          id_persona: createDto.id_persona,
          categoria_proveedor: createDto.categoria_proveedor,
          tipo_proveedor: createDto.tipo_proveedor || 'NACIONAL',
          responsable_iva: createDto.responsable_iva ?? true,
          tiempo_entrega_dias: createDto.tiempo_entrega_dias,
          servicios_ofrecidos: createDto.servicios_ofrecidos,
          realiza_entregas: createDto.realiza_entregas ?? true,
          zona_cobertura: createDto.zona_cobertura,
          proveedor_activo: createDto.proveedor_activo ?? true,
          observaciones: createDto.observaciones,
          creado_por: userId,
        },
        include: {
          persona: true,
        },
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al crear proveedor: ${(error as Error).message}`,
      );
    }
  }

  async findAll(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;
      
      const [data, total] = await Promise.all([
        this.prisma.proveedores.findMany({
          skip,
          take: limit,
          orderBy: { id_proveedor: 'desc' },
        }),
        this.prisma.proveedores.count(),
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
        `Error al obtener proveedores: ${(error as Error).message}`,
      );
    }
  }

  async findOne(id: number) {
    try {
      const record = await this.prisma.proveedores.findUnique({
        where: { id_proveedor: id },
      });

      if (!record) {
        throw new NotFoundException(`Proveedores con ID ${id} no encontrado`);
      }

      return record;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al obtener proveedores: ${(error as Error).message}`,
      );
    }
  }

  async update(id: number, updateDto: UpdateProveedoresDto) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.proveedores.update({
        where: { id_proveedor: id },
        data: updateDto as any,
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al actualizar proveedores: ${(error as Error).message}`,
      );
    }
  }

  async remove(id: number) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.proveedores.delete({
        where: { id_proveedor: id },
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al eliminar proveedores: ${(error as Error).message}`,
      );
    }
  }
}
