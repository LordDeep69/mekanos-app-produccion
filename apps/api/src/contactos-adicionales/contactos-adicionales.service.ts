import { Injectable } from '@nestjs/common';
import { getNextTableId } from '../common/utils/next-id.helper';
import { PrismaService } from '../database/prisma.service';
import { CreateContactosAdicionalesDto } from './dto/create-contactos-adicionales.dto';
import { UpdateContactosAdicionalesDto } from './dto/update-contactos-adicionales.dto';

@Injectable()
export class ContactosAdicionalesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateContactosAdicionalesDto, userId: number) {
    // Validar que persona existe
    const persona = await this.prisma.personas.findUnique({
      where: { id_persona: createDto.id_persona },
    });

    if (!persona) {
      throw new Error(`Persona con ID ${createDto.id_persona} no existe`);
    }

    const nextId = await getNextTableId(this.prisma, 'contactos_adicionales', 'id_contacto');

    return this.prisma.contactos_adicionales.create({
      data: {
        ...createDto,
        id_contacto: nextId,
        registrado_por: userId,
        fecha_registro: new Date(),
      },
      include: {
        persona: true,
      },
    });
  }

  async findAll(params?: { id_persona?: number; activo?: boolean; skip?: number; take?: number }) {
    const { id_persona, activo, skip = 0, take = 50 } = params || {};

    return this.prisma.contactos_adicionales.findMany({
      where: {
        ...(id_persona && { id_persona }),
        ...(activo !== undefined && { activo }),
      },
      include: {
        persona: true,
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
        persona: true,
      },
    });

    if (!contacto) {
      throw new Error(`Contacto con ID ${id} no encontrado`);
    }

    return contacto;
  }

  async update(id: number, updateDto: UpdateContactosAdicionalesDto, userId: number) {
    await this.findOne(id);

    return this.prisma.contactos_adicionales.update({
      where: { id_contacto: id },
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
    return this.prisma.contactos_adicionales.update({
      where: { id_contacto: id },
      data: {
        activo: false,
      },
    });
  }
}
