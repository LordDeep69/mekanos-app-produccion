import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateFirmasAdministrativasDto } from './dto/create-firmas-administrativas.dto';
import { UpdateFirmasAdministrativasDto } from './dto/update-firmas-administrativas.dto';

@Injectable()
export class FirmasAdministrativasService {
  constructor(private readonly prisma: PrismaService) { }

  async create(
    createDto: CreateFirmasAdministrativasDto,
    userId: number,
  ) {
    // Validar que persona existe
    const persona = await this.prisma.personas.findUnique({
      where: { id_persona: createDto.id_persona },
    });

    if (!persona) {
      throw new Error(
        `Persona con ID ${createDto.id_persona} no existe`,
      );
    }

    // Validar unique constraint: id_persona
    const existing = await this.prisma.firmas_administrativas.findUnique({
      where: { id_persona: createDto.id_persona },
    });

    if (existing) {
      throw new Error(
        `Persona con ID ${createDto.id_persona} ya tiene firma administrativa`,
      );
    }

    return this.prisma.firmas_administrativas.create({
      data: {
        ...createDto,
        creado_por: userId,
        fecha_creacion: new Date(),
      },
      include: {
        persona: true,
      },
    });
  }

  async findAll(params?: {
    firma_activa?: boolean;
    skip?: number;
    take?: number;
    includeClientes?: boolean;
  }) {
    const { firma_activa, skip = 0, take = 50, includeClientes = false } = params || {};

    return this.prisma.firmas_administrativas.findMany({
      where: {
        ...(firma_activa !== undefined && { firma_activa }),
      },
      include: {
        persona: true,
        ...(includeClientes && {
          clientes: {
            include: {
              persona: true,
            },
          },
        }),
      },
      skip,
      take,
      orderBy: { fecha_creacion: 'desc' },
    });
  }

  async findOne(id: number) {
    const firma = await this.prisma.firmas_administrativas.findUnique({
      where: { id_firma_administrativa: id },
      include: {
        persona: true,
        clientes: {
          include: {
            persona: true,
          },
        },
      },
    });

    if (!firma) {
      throw new Error(`Firma administrativa con ID ${id} no encontrada`);
    }

    return firma;
  }

  async update(
    id: number,
    updateDto: UpdateFirmasAdministrativasDto,
    userId: number,
  ) {
    await this.findOne(id);

    return this.prisma.firmas_administrativas.update({
      where: { id_firma_administrativa: id },
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
    return this.prisma.firmas_administrativas.update({
      where: { id_firma_administrativa: id },
      data: {
        firma_activa: false,
      },
    });
  }
}
