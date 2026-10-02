import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { PdfService } from '../pdf/pdf.service';
import { DatosTrazabilidadClientePDF } from '../pdf/templates';
import { CreateClientesDto } from './dto/create-clientes.dto';
import { UpdateClientesDto } from './dto/update-clientes.dto';

@Injectable()
export class ClientesService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfService: PdfService,
  ) { }

  /**
   * Pre-calienta el índice en memoria al iniciar el módulo para que la primera búsqueda sea inmediata
   */
  async onModuleInit() {
    this.getSearchIndex().catch((err) => {
      console.warn('⚠️ No se pudo pre-calentar el índice de clientes:', err);
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 🔤 NORMALIZACIÓN Y BÚSQUEDA INTELIGENTE DE CLIENTES (28-SEP-2026)
  // ═══════════════════════════════════════════════════════════════════════════
  // Soporta: multi-tokens en cualquier orden (ej: 'lazaro comercial'),
  // tolerancia a tildes/acentos vía PostgreSQL unaccent(),
  // normalización NFD, homóglifos y NIT con/sin formateo.
  // ═══════════════════════════════════════════════════════════════════════════

  private static readonly HOMOGLYPH_MAP: Record<string, string> = {
    // Mayúsculas griegas → Latinas
    '\u0391': 'A', '\u0392': 'B', '\u0395': 'E', '\u0396': 'Z',
    '\u0397': 'H', '\u0399': 'I', '\u039A': 'K', '\u039C': 'M',
    '\u039D': 'N', '\u039F': 'O', '\u03A1': 'P', '\u03A4': 'T',
    '\u03A5': 'Y', '\u03A7': 'X',
    // Minúsculas griegas → Latinas
    '\u03BF': 'o', '\u03B1': 'a', '\u03B5': 'e', '\u03B9': 'i',
    '\u03BA': 'k', '\u03BD': 'n', '\u03C1': 'p', '\u03C4': 't',
    '\u03C5': 'u', '\u03C7': 'x',
    // Cirílicos → Latinas
    '\u0410': 'A', '\u0412': 'B', '\u0415': 'E', '\u041A': 'K',
    '\u041C': 'M', '\u041D': 'H', '\u041E': 'O', '\u0420': 'P',
    '\u0421': 'C', '\u0422': 'T', '\u0425': 'X', '\u0430': 'a',
    '\u0435': 'e', '\u043E': 'o', '\u0440': 'p', '\u0441': 'c',
    '\u0445': 'x',
  };

  /**
   * Normaliza una cadena de texto para búsquedas:
   * 1. Reemplaza homóglifos griegos/cirílicos por sus equivalentes latinos
   * 2. Elimina diacríticos (tildes, acentos) usando NFD + regex
   */
  private normalizeSearchText(text: string): string {
    if (!text) return text;
    let normalized = text;
    for (const [homoglyph, latin] of Object.entries(ClientesService.HOMOGLYPH_MAP)) {
      normalized = normalized.replaceAll(homoglyph, latin);
    }
    return normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  // ⚡ ÍNDICE DE BÚSQUEDA INTELIGENTE EN MEMORIA (Ultra-rápido: < 1ms por consulta)
  private searchIndexCache: Array<{
    id_cliente: number;
    tipo_cliente: string | null;
    cliente_activo: boolean | null;
    id_asesor_asignado: number | null;
    es_cliente_principal: boolean | null;
    id_cliente_principal: number | null;
    tiene_plantas: boolean;
    tiene_bombas: boolean;
    total_equipos_plantas: number;
    total_equipos_bombas: number;
    searchString: string;
    cleanNit: string;
    selectorData: {
      id_cliente: number;
      codigo_cliente: string | null;
      nombre_sede: string | null;
      nombre_comercial: string | null;
      razon_social: string | null;
      nombre: string;
      nit: string | null;
      tiene_plantas?: boolean;
      tiene_bombas?: boolean;
    };
    fullCliente: any;
  }> | null = null;
  private cacheExpiresAt: number = 0;
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos de validez

  /**
   * Determina si un equipo corresponde a una Planta Eléctrica / Generador
   */
  private esEquipoPlanta(e: any): boolean {
    const t = e?.tipos_equipo;
    if (!t) return false;
    if (t.tiene_generador === true) return true;
    const codigo = (t.codigo_tipo || '').toUpperCase();
    if (['GENERADOR', 'PLANTA', 'GEN'].includes(codigo)) return true;
    const nombre = (t.nombre_tipo || '').toUpperCase();
    return nombre.includes('GENERADOR') || nombre.includes('PLANTA');
  }

  /**
   * Determina si un equipo corresponde a un Sistema de Bombeo / Bomba
   */
  private esEquipoBomba(e: any): boolean {
    const t = e?.tipos_equipo;
    if (!t) return false;
    if (t.tiene_bomba === true) return true;
    const codigo = (t.codigo_tipo || '').toUpperCase();
    if (['BOMBA', 'BOMBA_AGUA', 'BOM'].includes(codigo)) return true;
    const nombre = (t.nombre_tipo || '').toUpperCase();
    return nombre.includes('BOMBA');
  }

  /**
   * Invalida el caché de búsqueda en memoria cuando se crea, edita o elimina un cliente
   */
  public invalidateClientesCache() {
    this.searchIndexCache = null;
    this.cacheExpiresAt = 0;
  }

  /**
   * Construye o recupera el índice consolidado de búsqueda en memoria
   */
  private async getSearchIndex() {
    const now = Date.now();
    if (this.searchIndexCache && this.cacheExpiresAt > now) {
      return this.searchIndexCache;
    }

    try {
      const [allClients, asesores] = await Promise.all([
        this.prisma.clientes.findMany({
          include: {
            persona: true,
            sedes_cliente: { where: { activo: true }, take: 5 },
            cliente_principal: {
              select: {
                id_cliente: true,
                nombre_sede: true,
                persona: { select: { razon_social: true, nombre_comercial: true } },
              },
            },
            equipos: {
              where: { activo: true },
              select: {
                id_equipo: true,
                tipos_equipo: {
                  select: {
                    id_tipo_equipo: true,
                    codigo_tipo: true,
                    nombre_tipo: true,
                    tiene_generador: true,
                    tiene_bomba: true,
                  },
                },
              },
            },
            sedes: {
              where: { cliente_activo: true },
              select: {
                id_cliente: true,
                equipos: {
                  where: { activo: true },
                  select: {
                    id_equipo: true,
                    tipos_equipo: {
                      select: {
                        id_tipo_equipo: true,
                        codigo_tipo: true,
                        nombre_tipo: true,
                        tiene_generador: true,
                        tiene_bomba: true,
                      },
                    },
                  },
                },
              },
            },
            _count: { select: { sedes: true } },
          },
          orderBy: { fecha_creacion: 'desc' },
        }),
        this.prisma.empleados.findMany({
          select: {
            id_empleado: true,
            cargo: true,
            persona: { select: { nombre_completo: true } },
          },
        }),
      ]);

      const asesoresMap = new Map(asesores.map((a) => [a.id_empleado, a]));

      this.searchIndexCache = allClients.map((c) => {
        const p = c.persona;
        const cp = c.cliente_principal;
        const cpp = cp?.persona;
        const sedes = c.sedes_cliente?.map((s) => s.nombre_sede).join(' ') || '';

        // Detección de equipos (propios + de sedes para clientes principales)
        const equiposPropios = (c as any).equipos || [];
        const equiposSedes = ((c as any).sedes || []).flatMap((s: any) => s.equipos || []);
        const todosEquipos = [...equiposPropios, ...equiposSedes];

        const equiposPlantas = todosEquipos.filter((e) => this.esEquipoPlanta(e));
        const equiposBombas = todosEquipos.filter((e) => this.esEquipoBomba(e));

        const tiene_plantas = equiposPlantas.length > 0;
        const tiene_bombas = equiposBombas.length > 0;
        const total_equipos_plantas = equiposPlantas.length;
        const total_equipos_bombas = equiposBombas.length;

        const searchString = this.normalizeSearchText(
          [
            p?.razon_social,
            p?.nombre_comercial,
            p?.nombre_completo,
            p?.primer_nombre,
            p?.primer_apellido,
            p?.segundo_nombre,
            p?.segundo_apellido,
            p?.numero_identificacion,
            c.nombre_sede,
            c.codigo_cliente,
            p?.ciudad,
            p?.direccion_principal,
            sedes,
            cp?.nombre_sede,
            cpp?.razon_social,
            cpp?.nombre_comercial,
          ]
            .filter(Boolean)
            .join(' ')
        ).toLowerCase();

        const cleanNit = (p?.numero_identificacion || '').replace(/[^0-9]/g, '');
        const nombre =
          (c as any).nombre_sede ||
          p?.nombre_comercial ||
          p?.nombre_completo ||
          p?.razon_social ||
          'Sin nombre';

        const fullCliente = {
          ...c,
          tiene_plantas,
          tiene_bombas,
          total_equipos_plantas,
          total_equipos_bombas,
          asesor_asignado: c.id_asesor_asignado
            ? asesoresMap.get(c.id_asesor_asignado) || null
            : null,
        };

        return {
          id_cliente: c.id_cliente,
          tipo_cliente: c.tipo_cliente,
          cliente_activo: c.cliente_activo,
          id_asesor_asignado: c.id_asesor_asignado,
          es_cliente_principal: c.es_cliente_principal,
          id_cliente_principal: c.id_cliente_principal,
          tiene_plantas,
          tiene_bombas,
          total_equipos_plantas,
          total_equipos_bombas,
          searchString,
          cleanNit,
          selectorData: {
            id_cliente: c.id_cliente,
            codigo_cliente: c.codigo_cliente,
            nombre_sede: c.nombre_sede,
            nombre_comercial: p?.nombre_comercial || null,
            razon_social: p?.razon_social || null,
            nombre,
            nit: p?.numero_identificacion || null,
            tiene_plantas,
            tiene_bombas,
          },
          fullCliente,
        };
      });

      this.cacheExpiresAt = now + this.CACHE_TTL_MS;
      return this.searchIndexCache;
    } catch (error) {
      console.warn('⚠️ Error al construir índice de búsqueda de clientes en memoria:', error);
      return this.searchIndexCache || [];
    }
  }

  /**
   * Búsqueda multi-token en memoria independiente de orden, homóglifos y tildes.
   * Ejecuta en < 1ms sin generar subqueries recurrentes a la base de datos.
   */
  private async searchCachedClients(
    query: string,
    filters?: {
      tipo_cliente?: string;
      cliente_activo?: boolean;
      idAsesorAsignado?: number;
      es_cliente_principal?: boolean;
      tipo_equipo?: string;
    }
  ) {
    const index = await this.getSearchIndex();
    if (!index || index.length === 0) return [];

    const norm = this.normalizeSearchText(query).toLowerCase().trim();
    const tokens = norm.split(/\s+/).filter(Boolean);
    const cleanDigits = query.replace(/[^0-9]/g, '');

    return index.filter((item) => {
      // 1. Filtros exactos de estado y tipo
      if (filters?.tipo_cliente && item.tipo_cliente !== filters.tipo_cliente) {
        return false;
      }
      if (filters?.cliente_activo !== undefined && item.cliente_activo !== filters.cliente_activo) {
        return false;
      }
      if (filters?.idAsesorAsignado !== undefined && item.id_asesor_asignado !== filters.idAsesorAsignado) {
        return false;
      }
      if (filters?.es_cliente_principal !== undefined && item.es_cliente_principal !== filters.es_cliente_principal) {
        return false;
      }

      // 2. Filtro por tipo de equipo (Plantas / Bombas)
      if (filters?.tipo_equipo && filters.tipo_equipo !== 'TODOS') {
        const te = filters.tipo_equipo.toUpperCase().trim();
        if (te === 'PLANTAS' || te === 'GENERADOR' || te === 'PLANTA' || te === 'GENERADORES') {
          if (!item.tiene_plantas) return false;
        } else if (te === 'BOMBAS' || te === 'BOMBA') {
          if (!item.tiene_bombas) return false;
        } else if (te === 'AMBOS') {
          if (!item.tiene_plantas || !item.tiene_bombas) return false;
        } else if (te === 'SIN_EQUIPOS') {
          if (item.tiene_plantas || item.tiene_bombas) return false;
        }
      }

      // Si no hay texto de búsqueda, pasa todos los que cumplieron filtros
      if (tokens.length === 0) return true;

      // 3. Coincidencia por NIT limpio si tiene 4 o más dígitos
      if (cleanDigits.length >= 4 && item.cleanNit.includes(cleanDigits)) {
        return true;
      }

      // 4. Multi-token inteligente: CADA token debe estar presente en alguna parte del texto del cliente
      return tokens.every((token) => item.searchString.includes(token));
    });
  }

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

    this.invalidateClientesCache();
    return nuevoCliente;
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

      this.invalidateClientesCache();
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
        // ✅ FIX 03-MAR-2026: Heredar emails_notificacion del principal (|| para que '' también herede)
        emails_notificacion: clienteFields.emails_notificacion || principal.emails_notificacion,
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

    this.invalidateClientesCache();
    return nuevaSede;
  }

  /**
   * ✅ MULTI-SEDE: Listar clientes principales para selector de sedes
   */
  async findPrincipales(search?: string, limit: number = 20) {
    const safeLimit = Math.min(Math.max(limit || 20, 1), 500);

    let idFilter: number[] | undefined;
    if (search && search.trim()) {
      const matches = await this.searchCachedClients(search, {
        cliente_activo: true,
        es_cliente_principal: true,
      });
      idFilter = matches.map((m) => m.id_cliente);
      if (idFilter.length === 0) return [];
    }

    const where: any = {
      es_cliente_principal: true,
      cliente_activo: true,
      ...(idFilter ? { id_cliente: { in: idFilter } } : {}),
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
        emails_notificacion: true,
        observaciones_servicio: true,
        requisitos_especiales: true,
        _count: { select: { sedes: true } },
      },
      take: safeLimit,
      orderBy: { fecha_creacion: 'desc' },
    });

    return clientes.map((c) => ({
      id_cliente: c.id_cliente,
      codigo_cliente: c.codigo_cliente,
      nombre:
        c.persona?.nombre_comercial ||
        c.persona?.razon_social ||
        c.persona?.nombre_completo ||
        'Sin nombre',
      nit: c.persona?.numero_identificacion,
      total_sedes: c._count.sedes,
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
      emails_notificacion: c.emails_notificacion,
      observaciones_servicio: c.observaciones_servicio,
      requisitos_especiales: c.requisitos_especiales,
    }));
  }

  /**
   * ✅ OPTIMIZACIÓN 05-ENE-2026 / 28-MAR-2026: Selector ULTRA-LIGERO 100% en memoria
   * Retorna instantáneamente (< 1ms) id, nombre (con prioridad sede) y NIT
   */
  async findForSelector(
    search?: string,
    limit: number = 100,
    idAsesorAsignado?: number,
    tipo_equipo?: string,
  ) {
    const safeLimit = Math.min(Math.max(limit || 100, 1), 500);

    const matches = await this.searchCachedClients(search || '', {
      cliente_activo: true,
      idAsesorAsignado,
      tipo_equipo,
    });

    return matches.slice(0, safeLimit).map((m) => m.selectorData);
  }

  /**
   * ✅ MULTI-ASESOR & BUSCADOR INTELIGENTE ULTRA-RÁPIDO
   * Búsqueda insensible a tildes, homóglifos, y orden de palabras ('uno centro' = 'centro uno')
   * Soporta filtro por tipo de equipos: PLANTAS (generadores) y BOMBAS (sistemas de bombeo)
   */
  async findAll(params?: {
    tipo_cliente?: string;
    cliente_activo?: boolean;
    search?: string;
    tipo_equipo?: string;
    skip?: number;
    take?: number;
    idAsesorAsignado?: number;
  }) {
    const {
      tipo_cliente,
      cliente_activo,
      search,
      tipo_equipo,
      skip = 0,
      take = 50,
      idAsesorAsignado,
    } = params || {};

    const index = await this.getSearchIndex();
    const scopedIndex = idAsesorAsignado
      ? index.filter((i) => i.id_asesor_asignado === idAsesorAsignado)
      : index;

    const summary = {
      total: scopedIndex.length,
      con_plantas: scopedIndex.filter((i) => i.tiene_plantas).length,
      con_bombas: scopedIndex.filter((i) => i.tiene_bombas).length,
      con_ambos: scopedIndex.filter((i) => i.tiene_plantas && i.tiene_bombas).length,
      sin_equipos: scopedIndex.filter((i) => !i.tiene_plantas && !i.tiene_bombas).length,
      corporativos: scopedIndex.filter((i) => i.es_cliente_principal).length,
      sedes: scopedIndex.filter((i) => !i.es_cliente_principal && i.id_cliente_principal).length,
      activos: scopedIndex.filter((i) => i.cliente_activo).length,
    };

    const matches = await this.searchCachedClients(search || '', {
      tipo_cliente,
      cliente_activo,
      idAsesorAsignado,
      tipo_equipo,
    });

    const total = matches.length;
    const pagedItems = matches.slice(skip, skip + take).map((m) => m.fullCliente);

    return { items: pagedItems, total, summary };
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
          include: {
            tipos_equipo: true,
          },
          take: 50,
        },
        // ✅ MULTI-SEDE
        cliente_principal: {
          select: { id_cliente: true, nombre_sede: true, persona: { select: { razon_social: true, nombre_comercial: true } } },
        },
        sedes: {
          where: { cliente_activo: true },
          select: {
            id_cliente: true,
            nombre_sede: true,
            codigo_cliente: true,
            equipos: {
              where: { activo: true },
              include: { tipos_equipo: true },
            },
          },
        },
      },
    });

    if (!cliente) {
      throw new Error(`Cliente con ID ${id} no encontrado`);
    }

    const propios = cliente.equipos || [];
    const deSedes = (cliente.sedes || []).flatMap((s: any) => s.equipos || []);
    const todos = [...propios, ...deSedes];

    const tiene_plantas = todos.some((e) => this.esEquipoPlanta(e));
    const tiene_bombas = todos.some((e) => this.esEquipoBomba(e));

    return {
      ...cliente,
      tiene_plantas,
      tiene_bombas,
    };
  }

  async update(id: number, updateDto: UpdateClientesDto, userId: number) {
    // Validar que cliente existe
    const clienteExistente = await this.findOne(id);

    // ✅ MULTI-SEDE: Validación al convertir a sede o cambiar principal
    if (updateDto.id_cliente_principal !== undefined) {
      const nuevoIdPrincipal = updateDto.id_cliente_principal;

      if (nuevoIdPrincipal !== null) {
        // Caso: Asignar/cambiar cliente principal (convertir en sede)

        // No puede asignarse a sí mismo como principal
        if (nuevoIdPrincipal === id) {
          throw new BadRequestException('Un cliente no puede ser sede de sí mismo');
        }

        // Validar que el principal existe y es efectivamente principal
        const principal = await this.prisma.clientes.findUnique({
          where: { id_cliente: nuevoIdPrincipal },
          select: { id_cliente: true, es_cliente_principal: true, cliente_activo: true },
        });

        if (!principal) {
          throw new BadRequestException(`Cliente principal con ID ${nuevoIdPrincipal} no encontrado`);
        }
        if (!principal.es_cliente_principal) {
          throw new BadRequestException(`El cliente ${nuevoIdPrincipal} no está marcado como cliente principal`);
        }
        if (!principal.cliente_activo) {
          throw new BadRequestException(`El cliente principal ${nuevoIdPrincipal} está inactivo`);
        }

        // Si este cliente es principal con sedes, no puede convertirse en sede
        if (clienteExistente.es_cliente_principal) {
          const totalSedes = await this.prisma.clientes.count({
            where: { id_cliente_principal: id, cliente_activo: true },
          });
          if (totalSedes > 0) {
            throw new BadRequestException(
              `Este cliente es principal y tiene ${totalSedes} sede(s) activa(s). Primero reasigne o elimine las sedes antes de convertirlo en sede.`
            );
          }
        }

        // Validar que se proporcione nombre_sede
        const nombreSede = updateDto.nombre_sede ?? clienteExistente.nombre_sede;
        if (!nombreSede || nombreSede.trim().length < 2) {
          throw new BadRequestException('Debe proporcionar un nombre de sede (mínimo 2 caracteres)');
        }

        // Forzar es_cliente_principal = false al convertir en sede
        (updateDto as any).es_cliente_principal = false;
      }
      // Caso null: Desvinculando como sede → limpiar nombre_sede
      // (permitir, solo se quitan los campos de sede)
    }

    // Separar persona para evitar error de Prisma en update plano
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { persona, ...clienteData } = updateDto as any;

    const personaPayload = persona as Record<string, any> | undefined;
    const hayCambiosPersona = !!personaPayload && Object.values(personaPayload).some((v) => v !== undefined);

    const resultado = await this.prisma.$transaction(async (tx) => {
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
            ...(personaPayload!.tipo_identificacion !== undefined && { tipo_identificacion: personaPayload!.tipo_identificacion }),
            ...(personaPayload!.numero_identificacion !== undefined && { numero_identificacion: personaPayload!.numero_identificacion }),
            ...(personaPayload!.tipo_persona !== undefined && { tipo_persona: personaPayload!.tipo_persona }),
            ...(personaPayload!.primer_nombre !== undefined && { primer_nombre: personaPayload!.primer_nombre }),
            ...(personaPayload!.segundo_nombre !== undefined && { segundo_nombre: personaPayload!.segundo_nombre }),
            ...(personaPayload!.primer_apellido !== undefined && { primer_apellido: personaPayload!.primer_apellido }),
            ...(personaPayload!.segundo_apellido !== undefined && { segundo_apellido: personaPayload!.segundo_apellido }),
            ...(personaPayload!.razon_social !== undefined && { razon_social: personaPayload!.razon_social }),
            ...(personaPayload!.nombre_comercial !== undefined && { nombre_comercial: personaPayload!.nombre_comercial }),
            ...(personaPayload!.representante_legal !== undefined && { representante_legal: personaPayload!.representante_legal }),
            ...(personaPayload!.cedula_representante !== undefined && { cedula_representante: personaPayload!.cedula_representante }),
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

    this.invalidateClientesCache();
    return resultado;
  }

  async remove(id: number) {
    this.invalidateClientesCache();
    // Soft delete
    return this.prisma.clientes.update({
      where: { id_cliente: id },
      data: {
        cliente_activo: false,
      },
    });
  }

  /**
   * ✅ TRAZABILIDAD 360°: Obtener historial cronológico de servicios del cliente
   * Retorna todas las órdenes con sus servicios específicos, equipos, técnicos e informes.
   */
  async getTrazabilidadServicios(
    clienteId: number,
    filtros?: {
      idEquipo?: number;
      categoria?: string;
      idSede?: number;
      fechaDesde?: string;
      fechaHasta?: string;
      search?: string;
    }
  ) {
    // 1. Verificar cliente
    const cliente = await this.prisma.clientes.findUnique({
      where: { id_cliente: clienteId },
      include: {
        persona: true,
        sedes: { select: { id_cliente: true, nombre_sede: true } },
      },
    });

    if (!cliente) {
      throw new NotFoundException(`Cliente con ID ${clienteId} no encontrado`);
    }

    // Si es cliente principal y no se especifica sede, incluir IDs de sedes
    const clienteIds = [clienteId];
    if (cliente.es_cliente_principal && cliente.sedes?.length > 0) {
      cliente.sedes.forEach((s) => clienteIds.push(s.id_cliente));
    }

    const where: any = {
      id_cliente: filtros?.idSede ? filtros.idSede : { in: clienteIds },
    };

    if (filtros?.idEquipo) {
      where.OR = [
        { id_equipo: filtros.idEquipo },
        { ordenes_equipos: { some: { id_equipo: filtros.idEquipo } } },
      ];
    }

    if (filtros?.categoria) {
      where.tipos_servicio = {
        categoria: filtros.categoria as any,
      };
    }

    if (filtros?.fechaDesde || filtros?.fechaHasta) {
      where.fecha_programada = {};
      if (filtros.fechaDesde) {
        where.fecha_programada.gte = new Date(`${filtros.fechaDesde}T00:00:00`);
      }
      if (filtros.fechaHasta) {
        where.fecha_programada.lte = new Date(`${filtros.fechaHasta}T23:59:59`);
      }
    }

    if (filtros?.search) {
      const s = filtros.search.trim();
      where.OR = [
        ...(where.OR || []),
        { numero_orden: { contains: s, mode: 'insensitive' } },
        { descripcion_inicial: { contains: s, mode: 'insensitive' } },
        { trabajo_realizado: { contains: s, mode: 'insensitive' } },
      ];
    }

    const ordenes = await this.prisma.ordenes_servicio.findMany({
      where,
      orderBy: [
        { fecha_programada: 'desc' },
        { id_orden_servicio: 'desc' },
      ],
      select: {
        id_orden_servicio: true,
        numero_orden: true,
        fecha_programada: true,
        fecha_inicio_real: true,
        fecha_fin_real: true,
        fecha_creacion: true,
        prioridad: true,
        descripcion_inicial: true,
        observaciones_tecnico: true,
        observaciones_cierre: true,
        trabajo_realizado: true,
        clientes: {
          select: {
            id_cliente: true,
            nombre_sede: true,
            persona: {
              select: {
                nombre_comercial: true,
                razon_social: true,
                nombre_completo: true,
              },
            },
          },
        },
        estados_orden: {
          select: {
            id_estado: true,
            codigo_estado: true,
            nombre_estado: true,
            color_hex: true,
          },
        },
        tipos_servicio: {
          select: {
            id_tipo_servicio: true,
            codigo_tipo: true,
            nombre_tipo: true,
            categoria: true,
            icono: true,
          },
        },
        empleados_ordenes_servicio_id_tecnico_asignadoToempleados: {
          select: {
            id_empleado: true,
            persona: {
              select: {
                nombre_completo: true,
                primer_nombre: true,
                segundo_nombre: true,
                primer_apellido: true,
                segundo_apellido: true,
                razon_social: true,
              },
            },
          },
        },
        equipos: {
          select: {
            id_equipo: true,
            codigo_equipo: true,
            nombre_equipo: true,
            tipos_equipo: {
              select: {
                id_tipo_equipo: true,
                codigo_tipo: true,
                nombre_tipo: true,
              },
            },
            horas_actuales: true,
            ubicacion_texto: true,
          },
        },
        ordenes_equipos: {
          select: {
            id_equipo: true,
            orden_secuencia: true,
            equipos: {
              select: {
                id_equipo: true,
                codigo_equipo: true,
                nombre_equipo: true,
                tipos_equipo: {
                  select: {
                    id_tipo_equipo: true,
                    codigo_tipo: true,
                    nombre_tipo: true,
                  },
                },
                horas_actuales: true,
                ubicacion_texto: true,
              },
            },
          },
        },
        detalle_servicios_orden: {
          select: {
            id_detalle_servicio: true,
            cantidad: true,
            estado_servicio: true,
            precio_unitario: true,
            catalogo_servicios: {
              select: {
                id_servicio: true,
                codigo_servicio: true,
                nombre_servicio: true,
                categoria: true,
                duracion_estimada_horas: true,
              },
            },
          },
        },
        informes: {
          orderBy: { fecha_generacion: 'desc' },
          take: 1,
          select: {
            id_informe: true,
            numero_informe: true,
            fecha_generacion: true,
            documentos_generados: {
              select: {
                id_documento: true,
                ruta_archivo: true,
                tipo_documento: true,
              },
            },
          },
        },
      },
    });

    return {
      cliente: {
        id_cliente: cliente.id_cliente,
        nombre: cliente.persona?.nombre_comercial || cliente.persona?.razon_social || cliente.persona?.nombre_completo,
        es_principal: cliente.es_cliente_principal,
      },
      total_ordenes: ordenes.length,
      ordenes,
    };
  }

  /**
   * ✅ Genera el buffer del PDF Ejecutivo de Trazabilidad aplicando filtros de la tabla
   */
  async generarPdfTrazabilidad(
    clienteId: number,
    filtros?: {
      idEquipo?: number;
      categoria?: string;
      idSede?: number;
      fechaDesde?: string;
      fechaHasta?: string;
      search?: string;
    },
  ) {
    // 1. Obtener la trazabilidad estructurada
    const { cliente, ordenes } = await this.getTrazabilidadServicios(clienteId, filtros);

    const clienteDb = await this.prisma.clientes.findUnique({
      where: { id_cliente: clienteId },
      include: { persona: true },
    });

    // 2. Extraer equipos auditados únicos
    const equiposMap = new Map<number, string>();
    ordenes.forEach((o: any) => {
      if (o.equipos) {
        equiposMap.set(o.equipos.id_equipo, o.equipos.nombre_equipo);
      }
      if (o.ordenes_equipos) {
        o.ordenes_equipos.forEach((oe: any) => {
          if (oe.equipos) {
            equiposMap.set(oe.equipos.id_equipo, oe.equipos.nombre_equipo);
          }
        });
      }
    });

    // 3. Obtener nombres de filtros
    let equipoFiltroNombre: string | undefined;
    if (filtros?.idEquipo && equiposMap.has(filtros.idEquipo)) {
      equipoFiltroNombre = equiposMap.get(filtros.idEquipo);
    } else if (filtros?.idEquipo) {
      const eq = await this.prisma.equipos.findUnique({
        where: { id_equipo: filtros.idEquipo },
        select: { nombre_equipo: true },
      });
      equipoFiltroNombre = eq?.nombre_equipo;
    }

    let sedeFiltroNombre: string | undefined;
    if (filtros?.idSede) {
      const s = await this.prisma.clientes.findUnique({
        where: { id_cliente: filtros.idSede },
        select: { nombre_sede: true },
      });
      sedeFiltroNombre = s?.nombre_sede || undefined;
    }

    // 4. Formatear KPIs
    const totalPreventivos = ordenes.filter((o: any) => o.tipos_servicio?.categoria === 'PREVENTIVO').length;
    const totalCorrectivos = ordenes.filter((o: any) => o.tipos_servicio?.categoria === 'CORRECTIVO').length;
    const totalEmergencias = ordenes.filter((o: any) => o.tipos_servicio?.categoria === 'EMERGENCIA').length;

    const fechaGen = new Intl.DateTimeFormat('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date());

    // Helper para limpiar HTML a texto plano
    const cleanHtml = (html?: string | null): string => {
      if (!html) return '';
      return html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<\/li>/gi, '\n')
        .replace(/<li>/gi, ' • ')
        .replace(/<\/?(h[1-6]|div|blockquote)[^>]*>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/\n\s*\n/g, '\n')
        .trim();
    };

    // Helper para formatear técnico
    const formatTecnico = (tecnicoEmp?: any): string => {
      if (!tecnicoEmp?.persona) return 'Sin asignar';
      const p = tecnicoEmp.persona;
      if (p.nombre_completo && p.nombre_completo.trim()) {
        return p.nombre_completo.trim();
      }
      const parts = [p.primer_nombre, p.segundo_nombre, p.primer_apellido, p.segundo_apellido].filter(Boolean);
      if (parts.length > 0) {
        return parts.join(' ').replace(/\s+/g, ' ').trim();
      }
      return p.razon_social || 'Especialista Mekanos';
    };

    // 5. Mapear órdenes
    const ordenesMapeadas = ordenes.map((o: any) => {
      const fechaOrd = o.fecha_programada || o.fecha_creacion;
      const fechaFormateada = fechaOrd
        ? new Intl.DateTimeFormat('es-CO', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(fechaOrd))
        : 'N/A';

      // Lista de equipos de la orden
      const eqList: any[] = [];
      if (o.equipos) {
        eqList.push({
          nombre: o.equipos.nombre_equipo,
          codigo: o.equipos.codigo_equipo,
          tipo: o.equipos.tipos_equipo?.nombre_tipo,
          horas: o.equipos.horas_actuales,
        });
      }
      if (o.ordenes_equipos && o.ordenes_equipos.length > 0) {
        o.ordenes_equipos.forEach((oe: any) => {
          if (oe.equipos && !eqList.some((e) => e.nombre === oe.equipos.nombre_equipo)) {
            eqList.push({
              nombre: oe.equipos.nombre_equipo,
              codigo: oe.equipos.codigo_equipo,
              tipo: oe.equipos.tipos_equipo?.nombre_tipo,
              horas: oe.equipos.horas_actuales,
            });
          }
        });
      }

      // Servicios específicos
      const serviciosEsp = (o.detalle_servicios_orden || []).map((det: any) => ({
        nombre: det.catalogo_servicios?.nombre_servicio || 'Servicio Específico',
        cantidad: Number(det.cantidad) || 1,
      }));

      return {
        id_orden_servicio: o.id_orden_servicio,
        numero_orden: o.numero_orden,
        fecha: fechaFormateada,
        estado: o.estados_orden?.nombre_estado || 'REGISTRADA',
        color_estado: o.estados_orden?.color_hex,
        tipoServicio: o.tipos_servicio?.nombre_tipo || 'Mantenimiento',
        categoria: o.tipos_servicio?.categoria || 'SERVICIO',
        equipos: eqList,
        serviciosEspecificos: serviciosEsp,
        diagnosticoTrabajo: {
          trabajo: cleanHtml(o.trabajo_realizado),
          falla: cleanHtml(o.descripcion_inicial),
          cierre: cleanHtml(o.observaciones_cierre || o.observaciones_tecnico),
        },
        tecnico: formatTecnico(o.empleados_ordenes_servicio_id_tecnico_asignadoToempleados),
      };
    });

    const payload: DatosTrazabilidadClientePDF = {
      cliente: {
        nombre: clienteDb?.persona?.razon_social || clienteDb?.persona?.nombre_comercial || clienteDb?.persona?.nombre_completo || 'Cliente',
        nit: clienteDb?.persona?.numero_identificacion || undefined,
        direccion: clienteDb?.persona?.direccion_principal || undefined,
        telefono: clienteDb?.persona?.telefono_principal || clienteDb?.persona?.celular || undefined,
        email: clienteDb?.persona?.email_principal || undefined,
        ciudad: clienteDb?.persona?.ciudad || undefined,
      },
      periodo: {
        desde: filtros?.fechaDesde,
        hasta: filtros?.fechaHasta,
        fechaGeneracion: fechaGen,
      },
      filtrosAplicados: {
        equipo: equipoFiltroNombre,
        categoria: filtros?.categoria,
        sede: sedeFiltroNombre,
        search: filtros?.search,
      },
      resumenKpis: {
        totalOrdenes: ordenes.length,
        totalPreventivos,
        totalCorrectivos,
        totalEmergencias,
        totalEquiposAuditados: equiposMap.size,
      },
      ordenes: ordenesMapeadas,
    };

    return this.pdfService.generarPDFTrazabilidadCliente(payload);
  }
}
