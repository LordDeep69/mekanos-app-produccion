import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateClientesDto } from './dto/create-clientes.dto';
import { UpdateClientesDto } from './dto/update-clientes.dto';

@Injectable()
export class ClientesService {
  constructor(private readonly prisma: PrismaService) { }

  async create(createDto: CreateClientesDto, userId: number) {
    // CASO 1: Viene persona anidada -> crear persona + cliente en transacción
    if (createDto.persona) {
      return this.createConPersonaNueva(createDto, userId);
    }

    // CASO 2: Viene id_persona -> flujo original (vincular persona existente)
    if (!createDto.id_persona) {
      throw new BadRequestException(
        'Debe proporcionar id_persona o los datos de persona para crear el cliente',
      );
    }

    // Validar que id_persona existe
    const persona = await this.prisma.personas.findUnique({
      where: { id_persona: createDto.id_persona },
    });

    if (!persona) {
      throw new NotFoundException(`Persona con ID ${createDto.id_persona} no existe`);
    }

    // Validar que persona no esté ya asociada a otro cliente
    const clienteExistente = await this.prisma.clientes.findUnique({
      where: { id_persona: createDto.id_persona },
    });

    if (clienteExistente) {
      throw new BadRequestException(
        `Persona con ID ${createDto.id_persona} ya está asociada a un cliente`,
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { persona: _, ...clienteData } = createDto;

    return this.prisma.clientes.create({
      data: {
        ...clienteData,
        id_persona: createDto.id_persona,
        creado_por: userId,
        fecha_creacion: new Date(),
      },
      include: {
        persona: true,
      },
    });
  }

  /**
   * Crear cliente con persona nueva en una transacción atómica
   */
  private async createConPersonaNueva(createDto: CreateClientesDto, userId: number) {
    const personaData = createDto.persona!;

    // Validar documento único antes de la transacción
    const personaExistente = await this.prisma.personas.findFirst({
      where: { numero_identificacion: personaData.numero_identificacion },
    });

    if (personaExistente) {
      // Si ya existe, verificar si ya tiene cliente
      const clienteExistente = await this.prisma.clientes.findUnique({
        where: { id_persona: personaExistente.id_persona },
      });

      if (clienteExistente) {
        throw new BadRequestException(
          `Ya existe un cliente con el documento ${personaData.numero_identificacion}`,
        );
      }

      // Persona existe pero no tiene cliente -> vincular
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { persona: _, id_persona: __, ...clienteFields } = createDto;

      return this.prisma.clientes.create({
        data: {
          ...clienteFields,
          id_persona: personaExistente.id_persona,
          creado_por: userId,
          fecha_creacion: new Date(),
        },
        include: {
          persona: true,
        },
      });
    }

    // Transacción: crear persona + cliente
    return this.prisma.$transaction(async (tx) => {
      // 1. Crear persona
      const nuevaPersona = await tx.personas.create({
        data: {
          tipo_identificacion: personaData.tipo_identificacion as any,
          numero_identificacion: personaData.numero_identificacion,
          tipo_persona: (personaData.tipo_persona || 'JURIDICA') as any,
          primer_nombre: personaData.primer_nombre,
          segundo_nombre: personaData.segundo_nombre,
          primer_apellido: personaData.primer_apellido,
          segundo_apellido: personaData.segundo_apellido,
          razon_social: personaData.razon_social,
          nombre_comercial: personaData.nombre_comercial,
          representante_legal: personaData.representante_legal,
          cedula_representante: personaData.cedula_representante,
          email_principal: personaData.email_principal,
          telefono_principal: personaData.telefono_principal,
          celular: personaData.celular,
          direccion_principal: personaData.direccion_principal,
          ciudad: personaData.ciudad || 'Bogotá',
          departamento: personaData.departamento,
          activo: true,
        },
      });

      // 2. Crear cliente vinculado a la nueva persona
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { persona: _, id_persona: __, ...clienteFields } = createDto;

      const nuevoCliente = await tx.clientes.create({
        data: {
          ...clienteFields,
          id_persona: nuevaPersona.id_persona,
          creado_por: userId,
          fecha_creacion: new Date(),
        },
        include: {
          persona: true,
        },
      });

      return nuevoCliente;
    });
  }

  /**
   * ✅ OPTIMIZACIÓN 05-ENE-2026: Query ULTRA-LIGERA para selectores
   * Solo retorna: id, nombre (con prioridad), NIT
   * Impacto: De ~2s a ~100ms en selectores de cliente
   */
  async findForSelector(search?: string, limit: number = 20) {
    const where: any = {
      cliente_activo: true,
      ...(search && {
        OR: [
          { persona: { nombre_comercial: { contains: search, mode: 'insensitive' } } },
          { persona: { razon_social: { contains: search, mode: 'insensitive' } } },
          { persona: { nombre_completo: { contains: search, mode: 'insensitive' } } },
          { persona: { numero_identificacion: { contains: search, mode: 'insensitive' } } },
        ],
      }),
    };

    const clientes = await this.prisma.clientes.findMany({
      where,
      select: {
        id_cliente: true,
        codigo_cliente: true,
        persona: {
          select: {
            nombre_comercial: true,
            nombre_completo: true,
            razon_social: true,
            numero_identificacion: true,
          },
        },
      },
      take: limit,
      orderBy: { fecha_creacion: 'desc' },
    });

    // Transformar a formato ligero para selector
    return clientes.map(c => ({
      id_cliente: c.id_cliente,
      codigo_cliente: c.codigo_cliente,
      // ✅ Prioridad: nombre_comercial > nombre_completo > razon_social
      nombre: c.persona?.nombre_comercial || c.persona?.nombre_completo || c.persona?.razon_social || 'Sin nombre',
      nit: c.persona?.numero_identificacion,
    }));
  }

  async findAll(params?: {
    tipo_cliente?: string;
    cliente_activo?: boolean;
    search?: string;
    skip?: number;
    take?: number;
  }) {
    const { tipo_cliente, cliente_activo, search, skip = 0, take = 50 } = params || {};

    const where: any = {
      ...(tipo_cliente && { tipo_cliente: tipo_cliente as any }),
      ...(cliente_activo !== undefined && { cliente_activo }),
      ...(search && {
        OR: [
          { persona: { nombre_comercial: { contains: search, mode: 'insensitive' } } },
          { persona: { razon_social: { contains: search, mode: 'insensitive' } } },
          { persona: { numero_identificacion: { contains: search, mode: 'insensitive' } } },
          { codigo_cliente: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.clientes.findMany({
        where,
        include: {
          persona: true,
          sedes_cliente: {
            where: { activo: true },
            take: 5,
          },
        },
        skip,
        take,
        orderBy: { fecha_creacion: 'desc' },
      }),
      this.prisma.clientes.count({ where }),
    ]);

    return { items, total };
  }

  async findOne(id: number) {
    const cliente = await this.prisma.clientes.findUnique({
      where: { id_cliente: id },
      include: {
        persona: true,
        sedes_cliente: {
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

    // Separar persona para evitar error de Prisma en update plano
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { persona, id_persona, ...clienteData } = updateDto;

    return this.prisma.clientes.update({
      where: { id_cliente: id },
      data: {
        ...clienteData,
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
