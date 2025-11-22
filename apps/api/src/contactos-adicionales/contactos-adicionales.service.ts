import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateContactosAdicionalesDto } from './dto/create-contactos-adicionales.dto';
import { UpdateContactosAdicionalesDto } from './dto/update-contactos-adicionales.dto';

@Injectable()
export class ContactosAdicionalesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    createDto: CreateContactosAdicionalesDto,
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

    return this.prisma.contactos_adicionales.create({
      data: {
        ...createDto,
        registrado_por: userId,
        fecha_registro: new Date(),
      },
      include: {
        personas: true,
      },
    });
  }

  async findAll(params?: {
    id_persona?: number;
    activo?: boolean;
    skip?: number;
    take?: number;
  }) {
    const { id_persona, activo, skip = 0, take = 50 } = params || {};

    return this.prisma.contactos_adicionales.findMany({
      where: {
        ...(id_persona && { id_persona }),
        ...(activo !== undefined && { activo }),
      },
      include: {
        personas: true,
      },
      skip,
      take,
      orderBy: { fecha_registro: 'desc' },
    });
  }

  async findOne(id: number) {
    const contacto = await this.prisma.contactos_adicionales.findUnique({
      where: { id_contacto: id },
      include: {
        personas: true,
      },
    });

    if (!contacto) {
      throw new Error(`Contacto con ID ${id} no encontrado`);
    }

    return contacto;
  }

  async update(
    id: number,
    updateDto: UpdateContactosAdicionalesDto,
    userId: number,
  ) {
    await this.findOne(id);

    return this.prisma.contactos_adicionales.update({
      where: { id_contacto: id },
      data: {
        ...updateDto,
        modificado_por: userId,
        fecha_modificacion: new Date(),
      },
      include: {
        personas: true,
      },
    });
  }

  async remove(id: number) {
    // Soft delete
    return this.prisma.contactos_adicionales.update({
      where: { id_contacto: id },
      data: {
        activo: false,
      },
    });
  }
}
