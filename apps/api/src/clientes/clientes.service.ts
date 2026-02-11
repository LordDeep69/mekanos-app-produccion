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

    // Validar que persona no esté ya asociada a otro cliente (excepto si es sede)
    if (!createDto.id_cliente_principal) {
      const clienteExistente = await this.prisma.clientes.findFirst({
        where: { id_persona: createDto.id_persona },
      });

      if (clienteExistente) {
        throw new BadRequestException(
          `Persona con ID ${createDto.id_persona} ya está asociada a un cliente`,
        );
      }
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
   * ✅ MULTI-SEDE: Si viene id_cliente_principal, reutiliza la persona del principal
   */
  private async createConPersonaNueva(createDto: CreateClientesDto, userId: number) {
    // ✅ MULTI-SEDE: Si es sede, reutilizar persona del principal
    if (createDto.id_cliente_principal) {
      return this.createClienteSede(createDto, userId);
    }

    const personaData = createDto.persona!;

    // Validar documento único antes de la transacción
    const personaExistente = await this.prisma.personas.findFirst({
      where: { numero_identificacion: personaData.numero_identificacion },
    });

    if (personaExistente) {
      // Si ya existe, verificar si ya tiene cliente
      const clienteExistente = await this.prisma.clientes.findFirst({
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
   * ✅ MULTI-SEDE: Crear cliente-sede reutilizando la persona del principal
   */
  private async createClienteSede(createDto: CreateClientesDto, userId: number) {
    const { id_cliente_principal, nombre_sede } = createDto;

    if (!nombre_sede || nombre_sede.trim().length < 2) {
      throw new BadRequestException('El nombre de sede es obligatorio para clientes-sede');
    }

    // Validar que el principal existe y es principal
    const principal = await this.prisma.clientes.findUnique({
      where: { id_cliente: id_cliente_principal },
      include: { persona: true },
    });

    if (!principal) {
      throw new BadRequestException(`Cliente principal con ID ${id_cliente_principal} no encontrado`);
    }

    if (!principal.es_cliente_principal) {
      throw new BadRequestException(`El cliente ${id_cliente_principal} no está marcado como cliente principal`);
    }

    // Crear el cliente-sede reutilizando la misma persona del principal
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { persona: _, id_persona: __, ...clienteFields } = createDto;

    const nuevaSede = await this.prisma.clientes.create({
      data: {
        // Heredar datos del principal
        id_persona: principal.id_persona,
        tipo_cliente: clienteFields.tipo_cliente || principal.tipo_cliente,
        periodicidad_mantenimiento: clienteFields.periodicidad_mantenimiento || principal.periodicidad_mantenimiento,
        id_firma_administrativa: clienteFields.id_firma_administrativa ?? principal.id_firma_administrativa,
        id_asesor_asignado: clienteFields.id_asesor_asignado ?? principal.id_asesor_asignado,
        descuento_autorizado: clienteFields.descuento_autorizado ?? principal.descuento_autorizado,
        tiene_credito: clienteFields.tiene_credito ?? principal.tiene_credito,
        limite_credito: clienteFields.limite_credito ?? principal.limite_credito,
        dias_credito: clienteFields.dias_credito ?? principal.dias_credito,
        id_cuenta_email_remitente: clienteFields.id_cuenta_email_remitente ?? principal.id_cuenta_email_remitente,
        observaciones_servicio: clienteFields.observaciones_servicio,
        requisitos_especiales: clienteFields.requisitos_especiales,
        // Campos propios de la sede
        nombre_sede: nombre_sede.trim(),
        id_cliente_principal: id_cliente_principal,
        es_cliente_principal: false,
        cliente_activo: true,
        creado_por: userId,
        fecha_creacion: new Date(),
      },
      include: {
        persona: true,
        cliente_principal: {
          select: { id_cliente: true, nombre_sede: true, persona: { select: { razon_social: true, nombre_comercial: true } } },
        },
      },
    });

    return nuevaSede;
  }

  /**
   * ✅ MULTI-SEDE: Listar clientes principales para selector de sedes
   */
  async findPrincipales(search?: string, limit: number = 20) {
    const where: any = {
      es_cliente_principal: true,
      cliente_activo: true,
      ...(search && {
        OR: [
          { persona: { razon_social: { contains: search, mode: 'insensitive' } } },
          { persona: { nombre_comercial: { contains: search, mode: 'insensitive' } } },
          { persona: { numero_identificacion: { contains: search, mode: 'insensitive' } } },
        ],
      }),
    };

    const clientes = await this.prisma.clientes.findMany({
      where,
      select: {
        id_cliente: true,
        codigo_cliente: true,
        nombre_sede: true,
        persona: {
          select: {
            razon_social: true,
            nombre_comercial: true,
            nombre_completo: true,
            numero_identificacion: true,
            tipo_identificacion: true,
            tipo_persona: true,
            email_principal: true,
            telefono_principal: true,
            celular: true,
            direccion_principal: true,
            ciudad: true,
            departamento: true,
            representante_legal: true,
            cedula_representante: true,
          },
        },
        // Info extra para el selector
        tipo_cliente: true,
        periodicidad_mantenimiento: true,
        id_firma_administrativa: true,
        id_asesor_asignado: true,
        descuento_autorizado: true,
        tiene_credito: true,
        limite_credito: true,
        dias_credito: true,
        id_cuenta_email_remitente: true,
        observaciones_servicio: true,
        requisitos_especiales: true,
        _count: { select: { sedes: true } },
      },
      take: limit,
      orderBy: { fecha_creacion: 'desc' },
    });

    return clientes.map(c => ({
      id_cliente: c.id_cliente,
      codigo_cliente: c.codigo_cliente,
      nombre: c.persona?.nombre_comercial || c.persona?.razon_social || c.persona?.nombre_completo || 'Sin nombre',
      nit: c.persona?.numero_identificacion,
      total_sedes: c._count.sedes,
      // Datos completos para auto-fill en el formulario
      persona: c.persona,
      tipo_cliente: c.tipo_cliente,
      periodicidad_mantenimiento: c.periodicidad_mantenimiento,
      id_firma_administrativa: c.id_firma_administrativa,
      id_asesor_asignado: c.id_asesor_asignado,
      descuento_autorizado: c.descuento_autorizado,
      tiene_credito: c.tiene_credito,
      limite_credito: c.limite_credito,
      dias_credito: c.dias_credito,
      id_cuenta_email_remitente: c.id_cuenta_email_remitente,
      observaciones_servicio: c.observaciones_servicio,
      requisitos_especiales: c.requisitos_especiales,
    }));
  }

  /**
   * ✅ OPTIMIZACIÓN 05-ENE-2026: Query ULTRA-LIGERA para selectores
   * Solo retorna: id, nombre (con prioridad), NIT
   * Impacto: De ~2s a ~100ms en selectores de cliente
   * ✅ 31-ENE-2026: MULTI-ASESOR - Ahora soporta filtrado por asesor
   */
  async findForSelector(search?: string, limit: number = 20, idAsesorAsignado?: number) {
    const where: any = {
      cliente_activo: true,
      // ✅ MULTI-ASESOR: Filtrar por asesor si se especifica
      ...(idAsesorAsignado && { id_asesor_asignado: idAsesorAsignado }),
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
        nombre_sede: true,
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
      // ✅ MULTI-SEDE: nombre_sede tiene prioridad si existe
      nombre: (c as any).nombre_sede || c.persona?.nombre_comercial || c.persona?.nombre_completo || c.persona?.razon_social || 'Sin nombre',
      nit: c.persona?.numero_identificacion,
    }));
  }

  /**
   * ✅ MULTI-ASESOR: Ahora soporta filtrado por id_asesor_asignado
   * Si idAsesorAsignado es undefined, muestra todos (para admin)
   * Si tiene valor, filtra solo los clientes asignados a ese asesor
   */
  async findAll(params?: {
    tipo_cliente?: string;
    cliente_activo?: boolean;
    search?: string;
    skip?: number;
    take?: number;
    idAsesorAsignado?: number;
  }) {
    const { tipo_cliente, cliente_activo, search, skip = 0, take = 50, idAsesorAsignado } = params || {};

    const where: any = {
      ...(tipo_cliente && { tipo_cliente: tipo_cliente as any }),
      ...(cliente_activo !== undefined && { cliente_activo }),
      // ✅ MULTI-ASESOR: Filtrar por asesor asignado
      ...(idAsesorAsignado && { id_asesor_asignado: idAsesorAsignado }),
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
          // ✅ MULTI-SEDE: Incluir info de principal y conteo de sedes
          cliente_principal: {
            select: { id_cliente: true, nombre_sede: true, persona: { select: { razon_social: true } } },
          },
          _count: { select: { sedes: true } },
        },
        skip,
        take,
        orderBy: { fecha_creacion: 'desc' },
      }),
      this.prisma.clientes.count({ where }),
    ]);

    // ✅ MULTI-ASESOR: Enriquecer con datos del asesor asignado
    const asesoresIds = items
      .map(c => c.id_asesor_asignado)
      .filter((id): id is number => id !== null);

    let asesoresMap = new Map<number, { id_empleado: number; cargo: string | null; persona: { nombre_completo: string | null } | null }>();

    if (asesoresIds.length > 0) {
      const asesores = await this.prisma.empleados.findMany({
        where: { id_empleado: { in: asesoresIds } },
        select: {
          id_empleado: true,
          cargo: true,
          persona: {
            select: { nombre_completo: true },
          },
        },
      });
      asesoresMap = new Map(asesores.map(a => [a.id_empleado, a]));
    }

    const itemsConAsesor = items.map(cliente => ({
      ...cliente,
      asesor_asignado: cliente.id_asesor_asignado
        ? asesoresMap.get(cliente.id_asesor_asignado) || null
        : null,
    }));

    return { items: itemsConAsesor, total };
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
        // ✅ MULTI-SEDE
        cliente_principal: {
          select: { id_cliente: true, nombre_sede: true, persona: { select: { razon_social: true, nombre_comercial: true } } },
        },
        sedes: {
          where: { cliente_activo: true },
          select: { id_cliente: true, nombre_sede: true, codigo_cliente: true },
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
    const clienteExistente = await this.findOne(id);

    // Separar persona para evitar error de Prisma en update plano
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { persona, ...clienteData } = updateDto as any;

    // ✅ FIX 02-FEB-2026: Actualizar datos de persona si se proporcionan
    if (persona && clienteExistente.id_persona) {
      await this.prisma.personas.update({
        where: { id_persona: clienteExistente.id_persona },
        data: {
          ...(persona.email_principal !== undefined && { email_principal: persona.email_principal }),
          ...(persona.telefono_principal !== undefined && { telefono_principal: persona.telefono_principal }),
          ...(persona.celular !== undefined && { celular: persona.celular }),
          ...(persona.direccion_principal !== undefined && { direccion_principal: persona.direccion_principal }),
          ...(persona.ciudad !== undefined && { ciudad: persona.ciudad }),
          ...(persona.departamento !== undefined && { departamento: persona.departamento }),
        },
      });
    }

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
