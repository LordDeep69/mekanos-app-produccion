import { Injectable } from '@nestjs/common';
import { PrismaService } from '@mekanos/database';

/**
 * Repository para ordenes_servicio
 * Implementa acceso a datos con Prisma ORM
 * 
 * CARACTERÍSTICAS:
 * - CRUD completo con includes extensos
 * - Workflow de estados (7 transiciones)
 * - Queries especializadas (por técnico, cliente, equipo)
 * - Filtrado avanzado con paginación
 */
@Injectable()
export class PrismaOrdenServicioRepository {
  constructor(private prisma: PrismaService) {}

  /**
   * Includes completos para respuestas con relaciones
   * Se usa en todas las consultas que devuelven órdenes
   */
  private readonly INCLUDE_RELATIONS = {
    cliente: {
      include: { 
        persona: true 
      }
    },
    sede: true, // sedes_cliente NO tiene relación 'persona'
    equipo: {
      include: {
        cliente: { include: { persona: true } },
        tipo_equipo: true,
        sede: true
      }
    },
    tipo_servicio: true,
    tecnico: {
      include: { 
        persona: true 
      }
    },
    supervisor: {
      include: { 
        persona: true 
      }
    },
    estado: true,
    usuario_creador: {
      include: { 
        persona: true 
      }
    },
    usuario_modificador: {
      include: { 
        persona: true 
      }
    },
    usuario_aprobador: {
      include: { 
        persona: true 
      }
    },
    firmas_digitales: true,
    // Relaciones one-to-many (opcional: incluir solo cuando se necesite)
    // actividades_ejecutadas: true,
    // mediciones_servicio: true,
    // evidencias_fotograficas: true,
    // detalles_servicios: true,
  };

  // ============================================================================
  // CRUD BÁSICO
  // ============================================================================

  /**
   * Crear o actualizar orden de servicio
   * @param data Datos de la orden (con/sin id_orden_servicio para update/create) o entity OrdenServicioEntity
   * @returns Orden creada/actualizada con relaciones completas
   */
  async save(data: any): Promise<any> {
    // Convertir entity a plain object si es necesario
    const plainData = data.toObject ? data.toObject() : data;

    // Mapear campos de entity a schema database (si viene de entity)
    const dbData = plainData.numeroOrden
      ? {
          numero_orden: plainData.numeroOrden?.value || plainData.numeroOrden,
          id_cliente: plainData.clienteId,
          id_equipo: plainData.equipoId,
          id_tipo_servicio: plainData.tipoServicioId,
          id_sede: plainData.sedeClienteId || null,
          descripcion_inicial: plainData.descripcion || null,
          fecha_programada: plainData.fechaProgramada || null,
          prioridad: plainData.prioridad?.value || plainData.prioridad || 'NORMAL',
          origen_solicitud: 'PROGRAMADO',
          id_estado_actual: 1,
          requiere_firma_cliente: true,
          creado_por: plainData.creado_por || data.creado_por,
        }
      : plainData;

    if (dbData.id_orden_servicio) {
      // UPDATE: Orden existente
      const { id_orden_servicio, ...updateData } = dbData;
      
      return this.prisma.ordenes_servicio.update({
        where: { id_orden_servicio },
        data: {
          ...updateData,
          fecha_modificacion: new Date(),
        },
        include: this.INCLUDE_RELATIONS,
      });
    } else {
      // CREATE: Nueva orden
      return this.prisma.ordenes_servicio.create({
        data: {
          numero_orden: dbData.numero_orden,
          id_cliente: dbData.id_cliente,
          id_sede: dbData.id_sede || null,
          id_equipo: dbData.id_equipo,
          id_tipo_servicio: dbData.id_tipo_servicio || null,
          id_cronograma: dbData.id_cronograma || null,
          fecha_programada: dbData.fecha_programada || null,
          hora_programada: dbData.hora_programada || null,
          prioridad: dbData.prioridad || 'NORMAL',
          origen_solicitud: dbData.origen_solicitud || 'PROGRAMADO',
          id_tecnico_asignado: dbData.id_tecnico_asignado || null,
          id_supervisor: dbData.id_supervisor || null,
          id_estado_actual: dbData.id_estado_actual,
          descripcion_inicial: dbData.descripcion_inicial || null,
          requiere_firma_cliente: dbData.requiere_firma_cliente !== undefined ? dbData.requiere_firma_cliente : true,
          creado_por: dbData.creado_por,
        },
        include: this.INCLUDE_RELATIONS,
      });
    }
  }

  /**
   * Buscar orden por ID
   * @param id_orden_servicio ID de la orden
   * @returns Orden con relaciones completas o null
   */
  async findById(id_orden_servicio: number): Promise<any | null> {
    return this.prisma.ordenes_servicio.findUnique({
      where: { id_orden_servicio },
      include: {
        ...this.INCLUDE_RELATIONS,
        // Para detalle: incluir relaciones one-to-many
        actividades_ejecutadas: {
          include: {
            catalogo_actividades: true, // ✅ Nombre correcto según schema
            empleados: { include: { persona: true } }, // ✅ Relación 'ejecutada_por'
          },
          orderBy: { fecha_ejecucion: 'desc' },
        },
        mediciones_servicio: {
          include: {
            parametros_medicion: true, // ✅ Nombre correcto según schema
          },
          orderBy: { fecha_medicion: 'desc' },
        },
        evidencias_fotograficas: {
          orderBy: { fecha_captura: 'desc' },
        },
        detalles_servicios: {
          include: {
            servicio: true, // catalogo_servicios
            tecnico: { include: { persona: true } }, // ✅ Relación 'id_tecnico_ejecutor' → 'tecnico'
          },
        },
      },
    });
  }

  /**
   * Listar órdenes con filtros y paginación
   * @param filters Filtros opcionales (cliente, sede, equipo, técnico, estado, fechas, prioridad, origen)
   * @returns { items: Orden[], total: number }
   */
  async findAll(filters?: {
    id_cliente?: number;
    id_sede?: number;
    id_equipo?: number;
    id_tecnico_asignado?: number;
    id_supervisor?: number;
    id_estado_actual?: number;
    fecha_desde?: Date;
    fecha_hasta?: Date;
    prioridad?: string;
    origen_solicitud?: string;
    skip?: number;
    take?: number;
  }): Promise<{ items: any[]; total: number }> {
    const where: any = {};

    // Filtros opcionales
    if (filters?.id_cliente) where.id_cliente = filters.id_cliente;
    if (filters?.id_sede) where.id_sede = filters.id_sede;
    if (filters?.id_equipo) where.id_equipo = filters.id_equipo;
    if (filters?.id_tecnico_asignado) where.id_tecnico_asignado = filters.id_tecnico_asignado;
    if (filters?.id_supervisor) where.id_supervisor = filters.id_supervisor;
    if (filters?.id_estado_actual) where.id_estado_actual = filters.id_estado_actual;
    if (filters?.prioridad) where.prioridad = filters.prioridad;
    if (filters?.origen_solicitud) where.origen_solicitud = filters.origen_solicitud;

    // Filtro por rango de fechas
    if (filters?.fecha_desde || filters?.fecha_hasta) {
      where.fecha_programada = {};
      if (filters.fecha_desde) where.fecha_programada.gte = filters.fecha_desde;
      if (filters.fecha_hasta) where.fecha_programada.lte = filters.fecha_hasta;
    }

    // Ejecutar consultas en paralelo
    const [items, total] = await Promise.all([
      this.prisma.ordenes_servicio.findMany({
        where,
        include: this.INCLUDE_RELATIONS,
        orderBy: { fecha_programada: 'desc' },
        skip: filters?.skip || 0,
        take: filters?.take || 10,
      }),
      this.prisma.ordenes_servicio.count({ where }),
    ]);

    return { items, total };
  }

  /**
   * Soft delete de orden (NO IMPLEMENTADO - pendiente diseño)
   * Las órdenes generalmente NO se eliminan (integridad auditoria)
   * Alternativa: Cancelar orden (cambiar estado a CANCELADA)
   */
  async delete(_id_orden_servicio: number, _modificado_por: number): Promise<void> {
    throw new Error('Las órdenes no se eliminan. Use cancelarOrden() en su lugar.');
  }

  // ============================================================================
  // WORKFLOW DE ESTADOS
  // ============================================================================

  /**
   * Cambiar estado de la orden (método genérico)
   * NOTA: Validaciones de transición deben hacerse en el Handler antes de llamar esto
   * @param id_orden_servicio ID de la orden
   * @param id_nuevo_estado ID del nuevo estado
   * @param modificado_por ID del usuario que realiza el cambio
   * @returns Orden actualizada
   */
  async cambiarEstado(
    id_orden_servicio: number,
    id_nuevo_estado: number,
    modificado_por: number,
  ): Promise<any> {
    return this.prisma.ordenes_servicio.update({
      where: { id_orden_servicio },
      data: {
        id_estado_actual: id_nuevo_estado,
        fecha_cambio_estado: new Date(),
        modificado_por,
        fecha_modificacion: new Date(),
      },
      include: this.INCLUDE_RELATIONS,
    });
  }

  /**
   * Programar orden: asignar fecha/hora programada
   * Transición: BORRADOR → PROGRAMADA
   */
  async programar(
    id_orden_servicio: number,
    fecha_programada: Date,
    hora_programada: Date | null,
    id_estado_programada: number,
    modificado_por: number,
  ): Promise<any> {
    return this.prisma.ordenes_servicio.update({
      where: { id_orden_servicio },
      data: {
        fecha_programada,
        hora_programada,
        id_estado_actual: id_estado_programada,
        fecha_cambio_estado: new Date(),
        modificado_por,
        fecha_modificacion: new Date(),
      },
      include: this.INCLUDE_RELATIONS,
    });
  }

  /**
   * Asignar técnico a la orden
   * Transición: PROGRAMADA → ASIGNADA
   */
  async asignarTecnico(
    id_orden_servicio: number,
    id_tecnico_asignado: number,
    id_estado_asignada: number,
    modificado_por: number,
  ): Promise<any> {
    return this.prisma.ordenes_servicio.update({
      where: { id_orden_servicio },
      data: {
        id_tecnico_asignado,
        fecha_asignacion: new Date(),
        id_estado_actual: id_estado_asignada,
        fecha_cambio_estado: new Date(),
        modificado_por,
        fecha_modificacion: new Date(),
      },
      include: this.INCLUDE_RELATIONS,
    });
  }

  /**
   * Iniciar ejecución de la orden (técnico en campo)
   * Transición: ASIGNADA → EN_PROCESO
   */
  async iniciar(
    id_orden_servicio: number,
    id_estado_en_proceso: number,
    modificado_por: number,
  ): Promise<any> {
    return this.prisma.ordenes_servicio.update({
      where: { id_orden_servicio },
      data: {
        fecha_inicio_real: new Date(),
        id_estado_actual: id_estado_en_proceso,
        fecha_cambio_estado: new Date(),
        modificado_por,
        fecha_modificacion: new Date(),
      },
      include: this.INCLUDE_RELATIONS,
    });
  }

  /**
   * Finalizar trabajo (técnico terminó)
   * Transición: EN_PROCESO → COMPLETADA
   */
  async finalizar(
    id_orden_servicio: number,
    observaciones_cierre: string,
    id_estado_completada: number,
    modificado_por: number,
  ): Promise<any> {
    const orden = await this.findById(id_orden_servicio);
    
    // Calcular duración en minutos si existe fecha_inicio_real
    let duracion_minutos = null;
    if (orden?.fecha_inicio_real) {
      const inicio = new Date(orden.fecha_inicio_real);
      const fin = new Date();
      duracion_minutos = Math.floor((fin.getTime() - inicio.getTime()) / 60000);
    }

    return this.prisma.ordenes_servicio.update({
      where: { id_orden_servicio },
      data: {
        fecha_fin_real: new Date(),
        duracion_minutos,
        observaciones_cierre,
        id_estado_actual: id_estado_completada,
        fecha_cambio_estado: new Date(),
        modificado_por,
        fecha_modificacion: new Date(),
      },
      include: this.INCLUDE_RELATIONS,
    });
  }

  /**
   * Aprobar orden (supervisor/admin)
   * Transición: COMPLETADA → APROBADA (estado final)
   */
  async aprobar(
    id_orden_servicio: number,
    aprobada_por: number,
    id_estado_aprobada: number,
  ): Promise<any> {
    return this.prisma.ordenes_servicio.update({
      where: { id_orden_servicio },
      data: {
        aprobada_por,
        fecha_aprobacion: new Date(),
        id_estado_actual: id_estado_aprobada,
        fecha_cambio_estado: new Date(),
        modificado_por: aprobada_por,
        fecha_modificacion: new Date(),
      },
      include: this.INCLUDE_RELATIONS,
    });
  }

  /**
   * Cancelar orden
   * Transición: CUALQUIER ESTADO → CANCELADA (estado final)
   */
  async cancelar(
    id_orden_servicio: number,
    motivo_cancelacion: string,
    id_estado_cancelada: number,
    modificado_por: number,
  ): Promise<any> {
    return this.prisma.ordenes_servicio.update({
      where: { id_orden_servicio },
      data: {
        observaciones_cierre: motivo_cancelacion,
        id_estado_actual: id_estado_cancelada,
        fecha_cambio_estado: new Date(),
        modificado_por,
        fecha_modificacion: new Date(),
      },
      include: this.INCLUDE_RELATIONS,
    });
  }

  // ============================================================================
  // QUERIES ESPECIALIZADAS
  // ============================================================================

  /**
   * Buscar órdenes por técnico asignado
   */
  async findByTecnico(
    id_tecnico: number,
    filters?: {
      id_estado_actual?: number;
      fecha_desde?: Date;
      fecha_hasta?: Date;
    },
  ): Promise<any[]> {
    const where: any = { id_tecnico_asignado: id_tecnico };

    if (filters?.id_estado_actual) where.id_estado_actual = filters.id_estado_actual;
    if (filters?.fecha_desde || filters?.fecha_hasta) {
      where.fecha_programada = {};
      if (filters.fecha_desde) where.fecha_programada.gte = filters.fecha_desde;
      if (filters.fecha_hasta) where.fecha_programada.lte = filters.fecha_hasta;
    }

    return this.prisma.ordenes_servicio.findMany({
      where,
      include: this.INCLUDE_RELATIONS,
      orderBy: { fecha_programada: 'desc' },
    });
  }

  /**
   * Buscar órdenes por cliente
   */
  async findByCliente(
    id_cliente: number,
    filters?: {
      id_estado_actual?: number;
      fecha_desde?: Date;
      fecha_hasta?: Date;
    },
  ): Promise<any[]> {
    const where: any = { id_cliente };

    if (filters?.id_estado_actual) where.id_estado_actual = filters.id_estado_actual;
    if (filters?.fecha_desde || filters?.fecha_hasta) {
      where.fecha_programada = {};
      if (filters.fecha_desde) where.fecha_programada.gte = filters.fecha_desde;
      if (filters.fecha_hasta) where.fecha_programada.lte = filters.fecha_hasta;
    }

    return this.prisma.ordenes_servicio.findMany({
      where,
      include: this.INCLUDE_RELATIONS,
      orderBy: { fecha_programada: 'desc' },
    });
  }

  /**
   * Buscar órdenes por equipo (historial de servicios)
   */
  async findByEquipo(
    id_equipo: number,
    filters?: {
      id_estado_actual?: number;
      fecha_desde?: Date;
      fecha_hasta?: Date;
    },
  ): Promise<any[]> {
    const where: any = { id_equipo };

    if (filters?.id_estado_actual) where.id_estado_actual = filters.id_estado_actual;
    if (filters?.fecha_desde || filters?.fecha_hasta) {
      where.fecha_programada = {};
      if (filters.fecha_desde) where.fecha_programada.gte = filters.fecha_desde;
      if (filters.fecha_hasta) where.fecha_programada.lte = filters.fecha_hasta;
    }

    return this.prisma.ordenes_servicio.findMany({
      where,
      include: this.INCLUDE_RELATIONS,
      orderBy: { fecha_programada: 'desc' },
    });
  }

  /**
   * Buscar órdenes pendientes de aprobación
   * (estado = COMPLETADA, pendiente que supervisor apruebe)
   */
  async findPendientesAprobacion(): Promise<any[]> {
    // Buscar código 'COMPLETADA' en estados_orden
    const estadoCompletada = await this.prisma.estados_orden.findFirst({
      where: { codigo_estado: 'COMPLETADA' },
    });

    if (!estadoCompletada) return [];

    return this.prisma.ordenes_servicio.findMany({
      where: {
        id_estado_actual: estadoCompletada.id_estado,
        aprobada_por: null, // No aprobadas aún
      },
      include: this.INCLUDE_RELATIONS,
      orderBy: { fecha_fin_real: 'asc' }, // Las más antiguas primero
    });
  }

  /**
   * Verificar si número de orden ya existe (para unicidad)
   */
  async existsByNumeroOrden(numero_orden: string): Promise<boolean> {
    const count = await this.prisma.ordenes_servicio.count({
      where: { numero_orden },
    });
    return count > 0;
  }

  /**
   * Obtener último correlativo del mes para generar numero_orden
   * Formato: OS-YYYYMM-NNNN (ej: OS-202511-0001)
   * @param anio Año (4 dígitos)
   * @param mes Mes (1-12)
   * @returns Correlativo actual (0 si no hay órdenes ese mes)
   */
  async getUltimoCorrelativoMes(anio: number, mes: number): Promise<number> {
    const prefix = `OS-${anio}${mes.toString().padStart(2, '0')}`;
    
    const ultimaOrden = await this.prisma.ordenes_servicio.findFirst({
      where: {
        numero_orden: {
          startsWith: prefix,
        },
      },
      orderBy: {
        numero_orden: 'desc',
      },
      select: {
        numero_orden: true,
      },
    });
    
    if (!ultimaOrden) {
      return 0;
    }
    
    // Extraer correlativo: OS-YYYYMM-NNNN → NNNN
    const parts = ultimaOrden.numero_orden.split('-');
    return parseInt(parts[2], 10);
  }

  /**
   * Buscar estado por código
   * Helper para obtener IDs de estados por su código
   */
  async findEstadoByCodigo(codigo_estado: string): Promise<any | null> {
    return this.prisma.estados_orden.findFirst({
      where: { codigo_estado, activo: true },
    });
  }
}
