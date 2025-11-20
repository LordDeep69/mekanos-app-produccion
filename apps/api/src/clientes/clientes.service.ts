import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateClientesDto } from './dto/create-clientes.dto';
import { UpdateClientesDto } from './dto/update-clientes.dto';

@Injectable()
export class ClientesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateClientesDto, userId: number) {
    // Validar que id_persona existe
    const persona = await this.prisma.personas.findUnique({
      where: { id_persona: createDto.id_persona },
    });

    if (!persona) {
      throw new Error(`Persona con ID ${createDto.id_persona} no existe`);
    }

    // Validar que persona no esté ya asociada a otro cliente
    const clienteExistente = await this.prisma.clientes.findUnique({
      where: { id_persona: createDto.id_persona },
    });

    if (clienteExistente) {
      throw new Error(
        `Persona con ID ${createDto.id_persona} ya está asociada a un cliente`,
      );
    }

    return this.prisma.clientes.create({
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
    tipo_cliente?: string;
    cliente_activo?: boolean;
    skip?: number;
    take?: number;
  }) {
    const { tipo_cliente, cliente_activo, skip = 0, take = 50 } = params || {};

    return this.prisma.clientes.findMany({
      where: {
        ...(tipo_cliente && { tipo_cliente: tipo_cliente as any }),
        ...(cliente_activo !== undefined && { cliente_activo }),
      },
      include: {
        persona: true,
        sedes: {
          where: { activo: true },
          take: 5,
        },
      },
      skip,
      take,
      orderBy: { fecha_creacion: 'desc' },
    });
  }

  async findOne(id: number) {
    const cliente = await this.prisma.clientes.findUnique({
      where: { id_cliente: id },
      include: {
        persona: true,
        sedes: {
          where: { activo: true },
        },
        equipos: {
          where: { activo: true },
          take: 10,
        },
      },
    });

    if (!cliente) {
      throw new Error(`Cliente con ID ${id} no encontrado`);
    }

    return cliente;
  }

  async update(id: number, updateDto: UpdateClientesDto, userId: number) {
    // Validar que cliente existe
    await this.findOne(id);

    return this.prisma.clientes.update({
      where: { id_cliente: id },
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
    return this.prisma.clientes.update({
      where: { id_cliente: id },
      data: {
        cliente_activo: false,
      },
    });
  }
}
