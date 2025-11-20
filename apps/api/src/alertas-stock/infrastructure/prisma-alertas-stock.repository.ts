import { PrismaService } from '@mekanos/database';
import { Injectable, NotFoundException } from '@nestjs/common';
import {
    AlertaGeneracionResult,
    AlertaResult,
    AlertasDashboardResult,
    AlertasStockFilters,
    AlertasStockPaginatedResult,
    IAlertasStockRepository,
} from '../interfaces/alertas-stock.repository.interface';

@Injectable()
export class PrismaAlertasStockRepository implements IAlertasStockRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Genera alertas automáticas verificando:
   * 1. Stock mínimo (< stock_minimo)
   * 2. Stock crítico (< 2 unidades)
   * 3. Vencimiento próximo (< 30 días)
   * 4. Vencimiento crítico (< 7 días)
   */
  async generarAlertasAutomaticas(): Promise<AlertaGeneracionResult> {
    const result: AlertaGeneracionResult = {
      alertas_generadas: 0,
      tipos: {
        stock_minimo: 0,
        stock_critico: 0,
        vencimiento_proximo: 0,
        vencimiento_critico: 0,
      },
    };

    // 1. Obtener todos componentes con stock actual
    const componentes = await this.prisma.catalogo_componentes.findMany({
      select: {
        id_componente: true,
        descripcion_corta: true, // FIX: nombre doesn't exist, use descripcion_corta
        stock_minimo: true,
        stock_actual: true, // Available in model
        alertas_stock: { // FIX: relation name is alertas_stock not alertas
          where: {
            estado: 'PENDIENTE',
          },
          select: {
            tipo_alerta: true,
          },
        },
      },
    });

    for (const componente of componentes) {
      // Verificar si ya existe alerta PENDIENTE del mismo tipo
      const alertasPendientes = componente.alertas_stock.map((a) => a.tipo_alerta);

      // Use stock_actual from DB instead of recalculating
      const stockActual = componente.stock_actual || 0;

      // Alerta: Stock crítico (< 2 unidades)
      if (stockActual < 2 && !alertasPendientes.includes('STOCK_MINIMO')) {
        await this.prisma.alertas_stock.create({
          data: {
            tipo_alerta: 'STOCK_MINIMO',
            nivel: 'CRITICO',
            id_componente: componente.id_componente,
            mensaje: `CRÍTICO: Stock actual (${stockActual}) del componente "${componente.descripcion_corta || 'Sin descripción'}" es menor a 2 unidades`,
            estado: 'PENDIENTE',
          },
        });
        result.tipos.stock_critico++;
        result.alertas_generadas++;
        continue; // No generar alerta stock_minimo si ya es crítico
      }

      // Alerta: Stock mínimo
      if (componente.stock_minimo && stockActual < componente.stock_minimo && !alertasPendientes.includes('STOCK_MINIMO')) {
        await this.prisma.alertas_stock.create({
          data: {
            tipo_alerta: 'STOCK_MINIMO',
            nivel: 'ADVERTENCIA',
            id_componente: componente.id_componente,
            mensaje: `Stock actual (${stockActual}) del componente "${componente.descripcion_corta || 'Sin descripción'}" es menor al mínimo definido (${componente.stock_minimo})`,
            estado: 'PENDIENTE',
          },
        });
        result.tipos.stock_minimo++;
        result.alertas_generadas++;
      }
    }

    // 2. Verificar lotes próximos a vencer
    const fechaHoy = new Date();
    const fecha30Dias = new Date();
    fecha30Dias.setDate(fechaHoy.getDate() + 30);

    const fecha7Dias = new Date();
    fecha7Dias.setDate(fechaHoy.getDate() + 7);

    const lotesProximosVencer = await this.prisma.lotes_componentes.findMany({
      where: {
        fecha_vencimiento: {
          lte: fecha30Dias,
          not: null, // Only lotes with vencimiento date
        },
        cantidad_actual: { // FIX: correct field name
          gt: 0,
        },
      },
      include: {
        catalogo_componentes: { // FIX: correct relation name
          select: {
            descripcion_corta: true, // FIX: nombre doesn't exist
          },
        },
        alertas: { // Correct relation name (verified in schema)
          where: {
            estado: 'PENDIENTE',
          },
          select: {
            tipo_alerta: true,
          },
        },
      },
    });

    for (const lote of lotesProximosVencer) {
      const alertasPendientesLote = lote.alertas.map((a) => a.tipo_alerta);
      const diasRestantes = Math.ceil((lote.fecha_vencimiento!.getTime() - fechaHoy.getTime()) / (1000 * 60 * 60 * 24)); // Non-null assertion safe due to where filter

      // Alerta: Vencimiento crítico (< 7 días)
      if (diasRestantes < 7 && !alertasPendientesLote.includes('VENCIMIENTO_CRITICO')) {
        await this.prisma.alertas_stock.create({
          data: {
            tipo_alerta: 'VENCIMIENTO_CRITICO',
            nivel: 'CRITICO',
            id_lote: lote.id_lote,
            mensaje: `CRÍTICO: Lote ${lote.codigo_lote} de "${lote.catalogo_componentes.descripcion_corta || 'Sin descripción'}" vence en ${diasRestantes} días`, // FIX: correct field names
            estado: 'PENDIENTE',
          },
        });
        result.tipos.vencimiento_critico++;
        result.alertas_generadas++;
        continue;
      }

      // Alerta: Vencimiento próximo (< 30 días)
      if (diasRestantes < 30 && !alertasPendientesLote.includes('VENCIMIENTO_PROXIMO')) {
        await this.prisma.alertas_stock.create({
          data: {
            tipo_alerta: 'VENCIMIENTO_PROXIMO',
            nivel: 'ADVERTENCIA',
            id_lote: lote.id_lote,
            mensaje: `Lote ${lote.codigo_lote} de "${lote.catalogo_componentes.descripcion_corta || 'Sin descripción'}" vence en ${diasRestantes} días`, // FIX: correct field names
            estado: 'PENDIENTE',
          },
        });
        result.tipos.vencimiento_proximo++;
        result.alertas_generadas++;
      }
    }

    return result;
  }

  /**
   * Resuelve una alerta cambiando estado a RESUELTA
   */
  async resolverAlerta(idAlerta: number, userId: number, observaciones?: string): Promise<AlertaResult> {
    const alerta = await this.prisma.alertas_stock.findUnique({
      where: { id_alerta: idAlerta },
    });

    if (!alerta) {
      throw new NotFoundException(`Alerta ID ${idAlerta} no encontrada`);
    }

    const alertaResuelta = await this.prisma.alertas_stock.update({
      where: { id_alerta: idAlerta },
      data: {
        estado: 'RESUELTA',
        resuelto_por: userId,
        fecha_resolucion: new Date(),
        observaciones: observaciones || null,
      },
      include: {
        catalogo_componentes: {
          select: {
            id_componente: true,
            descripcion_corta: true,
            codigo_interno: true,
          },
        },
        usuarios: {
          include: {
            persona: {
              select: {
                nombre_completo: true,
              },
            },
          },
        },
      },
    });

    return this.mapAlertaToResult(alertaResuelta);
  }

  /**
   * Lista alertas con filtros y paginación
   */
  async findAll(filters: AlertasStockFilters): Promise<AlertasStockPaginatedResult> {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.tipo_alerta) {
      where.tipo_alerta = filters.tipo_alerta;
    }

    if (filters.nivel) {
      where.nivel = filters.nivel;
    }

    if (filters.estado) {
      where.estado = filters.estado;
    }

    if (filters.id_componente) {
      where.id_componente = filters.id_componente;
    }

    if (filters.fecha_desde || filters.fecha_hasta) {
      where.fecha_generacion = {};
      if (filters.fecha_desde) {
        where.fecha_generacion.gte = filters.fecha_desde;
      }
      if (filters.fecha_hasta) {
        where.fecha_generacion.lte = filters.fecha_hasta;
      }
    }

    const [alertas, total] = await Promise.all([
      this.prisma.alertas_stock.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ nivel: 'desc' }, { fecha_generacion: 'desc' }],
        include: {
          catalogo_componentes: {
            select: {
              id_componente: true,
              descripcion_corta: true, // FIX: nombre doesn't exist
              codigo_interno: true,
            },
          },
          usuarios: {
            include: {
              persona: {
                select: {
                  nombre_completo: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.alertas_stock.count({ where }),
    ]);

    return {
      data: alertas.map((a) => this.mapAlertaToResult(a)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Obtiene alerta por ID
   */
  async findById(idAlerta: number): Promise<AlertaResult> {
    const alerta = await this.prisma.alertas_stock.findUnique({
      where: { id_alerta: idAlerta },
      include: {
        catalogo_componentes: {
          select: {
            id_componente: true,
            descripcion_corta: true,
            codigo_interno: true,
          },
        },
        usuarios: {
          include: {
            persona: {
              select: {
                nombre_completo: true,
              },
            },
          },
        },
      },
    });

    if (!alerta) {
      throw new NotFoundException(`Alerta ID ${idAlerta} no encontrada`);
    }

    return this.mapAlertaToResult(alerta);
  }

  /**
   * Dashboard: Métricas y alertas recientes
   */
  async getDashboard(): Promise<AlertasDashboardResult> {
    // Total pendientes
    const totalPendientes = await this.prisma.alertas_stock.count({
      where: { estado: 'PENDIENTE' },
    });

    // Total críticas pendientes
    const totalCriticas = await this.prisma.alertas_stock.count({
      where: {
        estado: 'PENDIENTE',
        nivel: 'CRITICO',
      },
    });

    // Alertas por tipo
    const alertasPorTipo = await this.prisma.alertas_stock.groupBy({
      by: ['tipo_alerta'],
      where: { estado: 'PENDIENTE' },
      _count: {
        id_alerta: true,
      },
    });

    // Alertas recientes (últimas 10)
    const alertasRecientes = await this.prisma.alertas_stock.findMany({
      where: { estado: 'PENDIENTE' },
      orderBy: [{ nivel: 'desc' }, { fecha_generacion: 'desc' }],
      take: 10,
      include: {
        catalogo_componentes: {
          select: {
            id_componente: true,
            descripcion_corta: true,
            codigo_interno: true,
          },
        },
      },
    });

    return {
      total_pendientes: totalPendientes,
      total_criticas: totalCriticas,
      alertas_por_tipo: alertasPorTipo.map((item) => ({
        tipo: item.tipo_alerta,
        count: item._count.id_alerta,
      })),
      alertas_recientes: alertasRecientes.map((a) => this.mapAlertaToResult(a)),
    };
  }

  /**
   * Mapper: Prisma entity → Result DTO
   */
  private mapAlertaToResult(alerta: any): AlertaResult {
    return {
      id_alerta: alerta.id_alerta,
      tipo_alerta: alerta.tipo_alerta,
      nivel: alerta.nivel,
      id_componente: alerta.id_componente,
      id_lote: alerta.id_lote,
      mensaje: alerta.mensaje,
      estado: alerta.estado,
      fecha_generacion: alerta.fecha_generacion,
      fecha_resolucion: alerta.fecha_resolucion,
      resuelto_por: alerta.resuelto_por,
      observaciones: alerta.observaciones,
      componente: alerta.catalogo_componentes
        ? {
            id_componente: alerta.catalogo_componentes.id_componente,
            nombre: alerta.catalogo_componentes.nombre,
            codigo_referencia: alerta.catalogo_componentes.codigo_referencia,
          }
        : null,
      resolvedor: alerta.usuarios
        ? {
            id_usuario: alerta.usuarios.id_usuario,
            nombre_completo: alerta.usuarios.persona?.nombre_completo || 'N/A',
          }
        : null,
    };
  }
}
