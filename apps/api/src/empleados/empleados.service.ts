import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateEmpleadosDto } from './dto/create-empleados.dto';
import { UpdateEmpleadosDto } from './dto/update-empleados.dto';

@Injectable()
export class EmpleadosService {
  constructor(private readonly prisma: PrismaService) { }

  /**
   * ✅ MULTI-ASESOR: Query ligera para selector de asesores
   * Retorna solo id y nombre - ideal para dropdowns
   */
  async findAsesoresForSelector() {
    const asesores = await this.prisma.empleados.findMany({
      where: {
        es_asesor: true,
        empleado_activo: true,
      },
      select: {
        id_empleado: true,
        codigo_empleado: true,
        persona: {
          select: {
            primer_nombre: true,
            primer_apellido: true,
            nombre_completo: true,
          },
        },
      },
      orderBy: { persona: { primer_nombre: 'asc' } },
    });

    return asesores.map(a => ({
      id_empleado: a.id_empleado,
      codigo_empleado: a.codigo_empleado,
      nombre: a.persona?.nombre_completo ||
        `${a.persona?.primer_nombre || ''} ${a.persona?.primer_apellido || ''}`.trim() ||
        `Asesor #${a.id_empleado}`,
    }));
  }

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
    search?: string;
    skip?: number;
    take?: number;
  }) {
    const { es_tecnico, es_asesor, empleado_activo, search, skip = 0, take = 50 } =
      params || {};

    const where: any = {
      ...(es_tecnico !== undefined && { es_tecnico }),
      ...(es_asesor !== undefined && { es_asesor }),
      ...(empleado_activo !== undefined && { empleado_activo }),
      ...(search && {
        OR: [
          { persona: { primer_nombre: { contains: search, mode: 'insensitive' } } },
          { persona: { primer_apellido: { contains: search, mode: 'insensitive' } } },
          { persona: { numero_identificacion: { contains: search, mode: 'insensitive' } } },
          { codigo_empleado: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.empleados.findMany({
        where,
        include: {
          persona: true,
        },
        skip,
        take,
        orderBy: { fecha_creacion: 'desc' },
      }),
      this.prisma.empleados.count({ where }),
    ]);

    return { items, total };
  }

  async findOne(id: number) {
    const empleado = await this.prisma.empleados.findUnique({
      where: { id_empleado: id },
      include: {
        persona: {
          include: {
            usuarios: {
              include: {
                usuarios_roles_usuarios_roles_id_usuarioTousuarios: {
                  include: {
                    roles: true,
                  },
                },
              },
            },
          },
        },
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

    // Extraer usuario de persona para acceso más fácil en frontend
    const usuario = empleado.persona?.usuarios;
    const resultado = {
      ...empleado,
      usuario: usuario ? {
        ...usuario,
        usuarios_roles: usuario.usuarios_roles_usuarios_roles_id_usuarioTousuarios,
      } : null,
    };

    return resultado;
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
