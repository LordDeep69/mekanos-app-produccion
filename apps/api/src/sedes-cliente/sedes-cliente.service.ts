import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateSedesClienteDto } from './dto/create-sedes-cliente.dto';
import { UpdateSedesClienteDto } from './dto/update-sedes-cliente.dto';

@Injectable()
export class SedesClienteService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateSedesClienteDto, userId: number) {
    // Validar que cliente existe
    const cliente = await this.prisma.clientes.findUnique({
      where: { id_cliente: createDto.id_cliente },
    });

    if (!cliente) {
      throw new Error(`Cliente con ID ${createDto.id_cliente} no existe`);
    }

    return this.prisma.sedes_cliente.create({
      data: {
        ...createDto,
        creado_por: userId,
        fecha_creacion: new Date(),
      },
      include: {
        cliente: {
          include: {
            persona: true,
          },
        },
      },
    });
  }

  async findAll(params?: {
    id_cliente?: number;
    activo?: boolean;
    skip?: number;
    take?: number;
  }) {
    const { id_cliente, activo, skip = 0, take = 50 } = params || {};

    return this.prisma.sedes_cliente.findMany({
      where: {
        ...(id_cliente && { id_cliente }),
        ...(activo !== undefined && { activo }),
      },
      include: {
        cliente: {
          include: {
            persona: true,
          },
        },
      },
      skip,
      take,
      orderBy: { fecha_creacion: 'desc' },
    });
  }

  async findOne(id: number) {
    const sede = await this.prisma.sedes_cliente.findUnique({
      where: { id_sede: id },
      include: {
        cliente: {
          include: {
            persona: true,
          },
        },
        equipos: {
          where: { activo: true },
          take: 10,
        },
      },
    });

    if (!sede) {
      throw new Error(`Sede con ID ${id} no encontrada`);
    }

    return sede;
  }

  async update(id: number, updateDto: UpdateSedesClienteDto, userId: number) {
    // Validar que sede exists
    await this.findOne(id);

    return this.prisma.sedes_cliente.update({
      where: { id_sede: id },
      data: {
        ...updateDto,
        modificado_por: userId,
        fecha_modificacion: new Date(),
      },
      include: {
        cliente: {
          include: {
            persona: true,
          },
        },
      },
    });
  }

  async remove(id: number) {
    // Soft delete
    return this.prisma.sedes_cliente.update({
      where: { id_sede: id },
      data: {
        activo: false,
        fecha_cierre: new Date(),
      },
    });
  }
}
