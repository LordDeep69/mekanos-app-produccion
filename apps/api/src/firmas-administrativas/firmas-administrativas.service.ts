import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateFirmasAdministrativasDto } from './dto/create-firmas-administrativas.dto';
import { UpdateFirmasAdministrativasDto } from './dto/update-firmas-administrativas.dto';

@Injectable()
export class FirmasAdministrativasService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateFirmasAdministrativasDto, userId: number) {
    return this.prisma.firmas_administrativas.create({
      data: {
        nombre_de_firma: createDto.nombre_de_firma,
        representante_legal: createDto.representante_legal,
        contacto_de_representante_legal: createDto.contacto_de_representante_legal,
        email_representante_legal: createDto.email_representante_legal,
        firma_activa: createDto.firma_activa ?? true,
        observaciones: createDto.observaciones,
        requisitos_operativos: createDto.requisitos_operativos,
        creado_por: userId,
        fecha_creacion: new Date(),
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

    const firmas = await this.prisma.firmas_administrativas.findMany({
      where: {
        ...(firma_activa !== undefined && { firma_activa }),
      },
      skip,
      take,
      orderBy: { fecha_creacion: 'desc' },
    });

    if (!includeClientes || firmas.length === 0) {
      return firmas;
    }

    const firmaIds = firmas.map((f) => f.id_firma_administrativa);
    const clientesAsociados = await this.prisma.clientes.findMany({
      where: { id_firma_administrativa: { in: firmaIds } },
      include: { persona: true },
    });

    return firmas.map((f) => ({
      ...f,
      clientes: clientesAsociados.filter(
        (c) => c.id_firma_administrativa === f.id_firma_administrativa,
      ),
    }));
  }

  async findOne(id: number) {
    const firma = await this.prisma.firmas_administrativas.findUnique({
      where: { id_firma_administrativa: id },
    });

    if (!firma) {
      throw new Error(`Firma administrativa con ID ${id} no encontrada`);
    }

    const clientes = await this.prisma.clientes.findMany({
      where: { id_firma_administrativa: id },
      include: { persona: true },
    });

    return {
      ...firma,
      clientes,
    };
  }

  async update(id: number, updateDto: UpdateFirmasAdministrativasDto, userId: number) {
    await this.findOne(id);

    return this.prisma.firmas_administrativas.update({
      where: { id_firma_administrativa: id },
      data: {
        ...updateDto,
        modificado_por: userId,
        fecha_modificacion: new Date(),
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
