import { Injectable } from '@nestjs/common';
import { tipo_certificacion_enum } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateCertificacionesTecnicasDto } from './dto/create-certificaciones-tecnicas.dto';
import { UpdateCertificacionesTecnicasDto } from './dto/update-certificaciones-tecnicas.dto';

@Injectable()
export class CertificacionesTecnicasService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    createDto: CreateCertificacionesTecnicasDto,
    userId: number,
  ) {
    // Validar que empleado existe
    const empleado = await this.prisma.empleados.findUnique({
      where: { id_empleado: createDto.id_empleado },
    });

    if (!empleado) {
      throw new Error(
        `Empleado con ID ${createDto.id_empleado} no existe`,
      );
    }

    // Si es renovación, validar que existe certificación anterior
    if (createDto.es_renovacion && createDto.id_certificacion_anterior) {
      const anterior = await this.prisma.certificaciones_tecnicas.findUnique({
        where: { id_certificacion: createDto.id_certificacion_anterior },
      });

      if (!anterior) {
        throw new Error(
          `Certificación anterior con ID ${createDto.id_certificacion_anterior} no existe`,
        );
      }
    }

    return this.prisma.certificaciones_tecnicas.create({
      data: {
        ...createDto,
        tipo_certificacion: createDto.tipo_certificacion as unknown as tipo_certificacion_enum,
        registrado_por: userId,
        fecha_registro: new Date(),
      },
      include: {
        empleados: {
          include: {
            persona: true,
          },
        },
      },
    });
  }

  async findAll(params?: {
    id_empleado?: number;
    tipo_certificacion?: string;
    vigente?: boolean;
    skip?: number;
    take?: number;
  }) {
    const {
      id_empleado,
      tipo_certificacion,
      vigente,
      skip = 0,
      take = 50,
    } = params || {};

    return this.prisma.certificaciones_tecnicas.findMany({
      where: {
        ...(id_empleado && { id_empleado }),
        ...(tipo_certificacion && { tipo_certificacion: tipo_certificacion as unknown as tipo_certificacion_enum }),
        ...(vigente !== undefined && { vigente }),
      },
      include: {
        empleados: {
          include: {
            persona: true,
          },
        },
      },
      skip,
      take,
      orderBy: { fecha_expedicion: 'desc' },
    });
  }

  async findOne(id: number) {
    const certificacion =
      await this.prisma.certificaciones_tecnicas.findUnique({
        where: { id_certificacion: id },
        include: {
          empleados: {
            include: {
              persona: true,
            },
          },
          certificaciones_tecnicas: true, // Certificación anterior
        },
      });

    if (!certificacion) {
      throw new Error(`Certificación con ID ${id} no encontrada`);
    }

    return certificacion;
  }

  async update(
    id: number,
    updateDto: UpdateCertificacionesTecnicasDto,
    _userId: number,
  ) {
    await this.findOne(id);

    return this.prisma.certificaciones_tecnicas.update({
      where: { id_certificacion: id },
      data: {
        ...updateDto,
        tipo_certificacion: updateDto.tipo_certificacion ? (updateDto.tipo_certificacion as unknown as tipo_certificacion_enum) : undefined,
        // No hay campo modificado_por en certificaciones
      },
      include: {
        empleados: {
          include: {
            persona: true,
          },
        },
      },
    });
  }

  async remove(id: number) {
    // Soft delete (marcar como no vigente)
    return this.prisma.certificaciones_tecnicas.update({
      where: { id_certificacion: id },
      data: {
        vigente: false,
      },
    });
  }
}
