import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetOrdenesQuery } from './get-ordenes.query';

interface PaginatedResponse {
  ordenes: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@QueryHandler(GetOrdenesQuery)
export class GetOrdenesHandler implements IQueryHandler<GetOrdenesQuery> {
  constructor(
    @Inject('IOrdenServicioRepository')
    private readonly ordenRepository: any // Usa PrismaOrdenServicioRepository directamente (not interfaz)
  ) { }

  async execute(query: GetOrdenesQuery): Promise<PaginatedResponse> {
    const {
      page, limit, clienteId, equipoId, tecnicoId, estado, prioridad,
      sortBy, sortOrder, tipoServicioId, fechaDesde, fechaHasta, idAsesorAsignado, busqueda
    } = query;

    // Resolver estado string → id_estado_actual (ZERO TRUST: lookup en BD)
    let idEstadoActual: number | undefined;
    if (estado) {
      const estadoRecord = await this.ordenRepository.findEstadoByCodigo(estado);
      if (estadoRecord) {
        idEstadoActual = estadoRecord.id_estado;
      }
      // Si no encuentra el estado, idEstadoActual queda undefined (sin filtro)
    }

    const filters: any = {
      skip: (page - 1) * limit,
      take: limit,
      id_cliente: clienteId,
      id_equipo: equipoId,
      id_tecnico_asignado: tecnicoId,
      id_estado_actual: idEstadoActual,
      prioridad,
      // ENTERPRISE: Nuevos filtros y ordenamiento
      sortBy: sortBy || 'fecha_creacion',
      sortOrder: sortOrder || 'desc',
      id_tipo_servicio: tipoServicioId,
      fechaDesde,
      fechaHasta,
      idAsesorAsignado, // ✅ MULTI-ASESOR
      busqueda, // ✅ BÚSQUEDA
    };

    // findAll() devuelve { items, total } directamente
    const result = await this.ordenRepository.findAll(filters);

    // ✅ FIX: Transformar ordenes_equipos para que use 'equipo' (singular) en lugar de 'equipos' (plural)
    const ordenesTransformadas = result.items.map((orden: any) => {
      if (orden.ordenes_equipos && Array.isArray(orden.ordenes_equipos)) {
        orden.ordenes_equipos = orden.ordenes_equipos.map((oe: any) => ({
          ...oe,
          equipo: oe.equipos,
          equipos: undefined,
        }));
      }
      return orden;
    });

    return {
      ordenes: ordenesTransformadas,
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit)
    };
  }
}
