import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateEmpleadosDto } from './dto/create-empleados.dto';
import { UpdateEmpleadosDto } from './dto/update-empleados.dto';

@Injectable()
export class EmpleadosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateEmpleadosDto, userId: number) {
    // Validar que id_persona existe
    const persona = await this.prisma.personas.findUnique({
      where: { id_persona: createDto.id_persona },
    });

    if (!persona) {
      throw new Error(`Persona con ID ${createDto.id_persona} no existe`);
    }

    // Validar que persona no esté ya asociada a otro empleado
    const empleadoExistente = await this.prisma.empleados.findUnique({
      where: { id_persona: createDto.id_persona },
    });

    if (empleadoExistente) {
      throw new Error(
        `Persona con ID ${createDto.id_persona} ya está asociada a un empleado`,
      );
    }

    // Validar jefe_inmediato si existe
    if (createDto.jefe_inmediato) {
      const jefe = await this.prisma.empleados.findUnique({
        where: { id_empleado: createDto.jefe_inmediato },
      });

      if (!jefe) {
        throw new Error(
          `Jefe inmediato con ID ${createDto.jefe_inmediato} no existe`,
        );
      }
    }

    return this.prisma.empleados.create({
      data: {
        ...createDto,
        fecha_ingreso: new Date(createDto.fecha_ingreso),
        fecha_retiro: createDto.fecha_retiro
          ? new Date(createDto.fecha_retiro)
          : undefined,
        fecha_vencimiento_licencia: createDto.fecha_vencimiento_licencia
          ? new Date(createDto.fecha_vencimiento_licencia)
          : undefined,
        creado_por: userId,
        fecha_creacion: new Date(),
      },
      include: {
        persona: true,
      },
    });
  }

  async findAll(params?: {
    es_tecnico?: boolean;
    es_asesor?: boolean;
    empleado_activo?: boolean;
    skip?: number;
    take?: number;
  }) {
    const { es_tecnico, es_asesor, empleado_activo, skip = 0, take = 50 } =
      params || {};

    return this.prisma.empleados.findMany({
      where: {
        ...(es_tecnico !== undefined && { es_tecnico }),
        ...(es_asesor !== undefined && { es_asesor }),
        ...(empleado_activo !== undefined && { empleado_activo }),
      },
      include: {
        persona: true,
      },
      skip,
      take,
      orderBy: { fecha_creacion: 'desc' },
    });
  }

  async findOne(id: number) {
    const empleado = await this.prisma.empleados.findUnique({
      where: { id_empleado: id },
      include: {
        persona: true,
        empleados: {
          // Jefe inmediato
          include: {
            persona: true,
          },
        },
        certificaciones_tecnicas: true,
      },
    });

    if (!empleado) {
      throw new Error(`Empleado con ID ${id} no encontrado`);
    }

    return empleado;
  }

  async update(id: number, updateDto: UpdateEmpleadosDto, userId: number) {
    // Validar que empleado existe
    await this.findOne(id);

    // Validar jefe_inmediato si se está actualizando
    if (updateDto.jefe_inmediato) {
      const jefe = await this.prisma.empleados.findUnique({
        where: { id_empleado: updateDto.jefe_inmediato },
      });

      if (!jefe) {
        throw new Error(
          `Jefe inmediato con ID ${updateDto.jefe_inmediato} no existe`,
        );
      }
    }

    return this.prisma.empleados.update({
      where: { id_empleado: id },
      data: {
        ...updateDto,
        modificado_por: userId,
        fecha_modificacion: new Date(),
      },
      include: {
        persona: true,
      },
    });
  }

  async remove(id: number) {
    // Soft delete
    return this.prisma.empleados.update({
      where: { id_empleado: id },
      data: {
        empleado_activo: false,
        fecha_retiro: new Date(),
      },
    });
  }
}
