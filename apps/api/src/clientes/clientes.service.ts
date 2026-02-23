import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateClientesDto } from './dto/create-clientes.dto';
import { UpdateClientesDto } from './dto/update-clientes.dto';

@Injectable()
export class ClientesService {
  constructor(private readonly prisma: PrismaService) { }

  async create(createDto: CreateClientesDto, userId: number) {
    // ✅ MULTI-SEDE: toda sede debe pasar por flujo especializado
    // para garantizar persona/dirección independiente.
    if (createDto.id_cliente_principal) {
      return this.createClienteSede(createDto, userId);
    }

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
   * ✅ MULTI-SEDE: Si viene id_cliente_principal, usa flujo de sede con persona independiente
   */
  private async createConPersonaNueva(createDto: CreateClientesDto, userId: number) {
    // ✅ MULTI-SEDE: Si es sede, delegar flujo especializado
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
   * ✅ MULTI-SEDE: Crear cliente-sede heredando datos del principal,
   * pero con persona propia para permitir dirección/contacto independientes.
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

    // Crear persona propia para la sede (base heredada + overrides opcionales)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { persona: _, id_persona: __, ...clienteFields } = createDto;

    const principalPersona = principal.persona;
    const personaOverride = createDto.persona || {};

    const personaSede = await this.prisma.personas.create({
      data: {
        tipo_identificacion: (personaOverride.tipo_identificacion as any) || principalPersona.tipo_identificacion,
        numero_identificacion: personaOverride.numero_identificacion || principalPersona.numero_identificacion,
        tipo_persona: (personaOverride.tipo_persona as any) || principalPersona.tipo_persona,
        primer_nombre: personaOverride.primer_nombre ?? principalPersona.primer_nombre,
        segundo_nombre: personaOverride.segundo_nombre ?? principalPersona.segundo_nombre,
        primer_apellido: personaOverride.primer_apellido ?? principalPersona.primer_apellido,
        segundo_apellido: personaOverride.segundo_apellido ?? principalPersona.segundo_apellido,
        razon_social: personaOverride.razon_social ?? principalPersona.razon_social,
        nombre_comercial: personaOverride.nombre_comercial ?? principalPersona.nombre_comercial,
        representante_legal: personaOverride.representante_legal ?? principalPersona.representante_legal,
        cedula_representante: personaOverride.cedula_representante ?? principalPersona.cedula_representante,
        email_principal: personaOverride.email_principal ?? principalPersona.email_principal,
        telefono_principal: personaOverride.telefono_principal ?? principalPersona.telefono_principal,
        celular: personaOverride.celular ?? principalPersona.celular,
        direccion_principal: personaOverride.direccion_principal ?? principalPersona.direccion_principal,
        ciudad: personaOverride.ciudad || principalPersona.ciudad || 'CARTAGENA',
        departamento: personaOverride.departamento ?? principalPersona.departamento,
        pais: principalPersona.pais,
        activo: principalPersona.activo ?? true,
      },
    });

    const nuevaSede = await this.prisma.clientes.create({
      data: {
        // Heredar datos del principal
        id_persona: personaSede.id_persona,
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
    const safeLimit = Math.min(Math.max(limit || 20, 1), 500);

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
      take: safeLimit,
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
  async findForSelector(search?: string, limit: number = 100, idAsesorAsignado?: number) {
    const safeLimit = Math.min(Math.max(limit || 100, 1), 500);

    const where: any = {
      cliente_activo: true,
      // ✅ MULTI-ASESOR: Filtrar por asesor si se especifica
      ...(idAsesorAsignado && { id_asesor_asignado: idAsesorAsignado }),
      ...(search && {
        OR: [
          { nombre_sede: { contains: search, mode: 'insensitive' } },
          { codigo_cliente: { contains: search, mode: 'insensitive' } },
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
      take: safeLimit,
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
          { nombre_sede: { contains: search, mode: 'insensitive' } },
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

    const personaPayload = persona as Record<string, any> | undefined;
    const hayCambiosPersona = !!personaPayload && Object.values(personaPayload).some((v) => v !== undefined);

    return this.prisma.$transaction(async (tx) => {
      let idPersonaDestino = clienteExistente.id_persona;

      // ✅ FIX DIRECCIONES: si el cliente comparte persona con otros clientes (legacy),
      // se desacopla en el primer update de contacto para evitar efectos colaterales.
      if (hayCambiosPersona && clienteExistente.id_persona) {
        const totalClientesConMismaPersona = await tx.clientes.count({
          where: { id_persona: clienteExistente.id_persona },
        });

        if (totalClientesConMismaPersona > 1) {
          const personaActual = await tx.personas.findUnique({
            where: { id_persona: clienteExistente.id_persona },
          });

          if (!personaActual) {
            throw new NotFoundException(`Persona con ID ${clienteExistente.id_persona} no existe`);
          }

          const personaClonada = await tx.personas.create({
            data: {
              tipo_identificacion: personaActual.tipo_identificacion,
              numero_identificacion: personaActual.numero_identificacion,
              tipo_persona: personaActual.tipo_persona,
              primer_nombre: personaActual.primer_nombre,
              segundo_nombre: personaActual.segundo_nombre,
              primer_apellido: personaActual.primer_apellido,
              segundo_apellido: personaActual.segundo_apellido,
              nombre_completo: personaActual.nombre_completo,
              razon_social: personaActual.razon_social,
              nombre_comercial: personaActual.nombre_comercial,
              representante_legal: personaActual.representante_legal,
              cedula_representante: personaActual.cedula_representante,
              email_principal: personaActual.email_principal,
              telefono_principal: personaActual.telefono_principal,
              telefono_secundario: personaActual.telefono_secundario,
              celular: personaActual.celular,
              direccion_principal: personaActual.direccion_principal,
              barrio_zona: personaActual.barrio_zona,
              ciudad: personaActual.ciudad,
              departamento: personaActual.departamento,
              pais: personaActual.pais,
              fecha_nacimiento: personaActual.fecha_nacimiento,
              es_cliente: personaActual.es_cliente,
              es_proveedor: personaActual.es_proveedor,
              es_empleado: personaActual.es_empleado,
              es_contratista: personaActual.es_contratista,
              ruta_foto: personaActual.ruta_foto,
              observaciones: personaActual.observaciones,
              activo: personaActual.activo ?? true,
            },
          });

          idPersonaDestino = personaClonada.id_persona;
        }
      }

      if (hayCambiosPersona && idPersonaDestino) {
        await tx.personas.update({
          where: { id_persona: idPersonaDestino },
          data: {
            ...(personaPayload!.email_principal !== undefined && { email_principal: personaPayload!.email_principal }),
            ...(personaPayload!.telefono_principal !== undefined && { telefono_principal: personaPayload!.telefono_principal }),
            ...(personaPayload!.celular !== undefined && { celular: personaPayload!.celular }),
            ...(personaPayload!.direccion_principal !== undefined && { direccion_principal: personaPayload!.direccion_principal }),
            ...(personaPayload!.ciudad !== undefined && { ciudad: personaPayload!.ciudad }),
            ...(personaPayload!.departamento !== undefined && { departamento: personaPayload!.departamento }),
          },
        });
      }

      return tx.clientes.update({
        where: { id_cliente: id },
        data: {
          ...clienteData,
          ...(idPersonaDestino && idPersonaDestino !== clienteExistente.id_persona && { id_persona: idPersonaDestino }),
          modificado_por: userId,
          fecha_modificacion: new Date(),
        },
        include: {
          persona: true,
        },
      });
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
