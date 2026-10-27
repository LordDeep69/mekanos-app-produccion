import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { HistorialEstadosOrdenRepositoryInterface } from '../domain/historial-estados-orden.repository.interface';
import { HistorialEstadosOrdenMapper } from './historial-estados-orden.mapper';

@Injectable()
export class PrismaHistorialEstadosOrdenRepository
  implements HistorialEstadosOrdenRepositoryInterface
{
  constructor(private readonly prisma: PrismaService) {}

  // INCLUDE para lista (orden + estado_anterior + estado_nuevo)
  private readonly INCLUDE_RELATIONS_LIST = {
    ordenes_servicio: {
      select: {
        id_orden_servicio: true,
        numero_orden: true,
      },
    },
    estados_orden_historial_estados_orden_id_estado_anteriorToestados_orden: {
      select: {
        id_estado: true,
        codigo_estado: true,
        nombre_estado: true,
        color_hex: true,
      },
    },
    estados_orden_historial_estados_orden_id_estado_nuevoToestados_orden: {
      select: {
        id_estado: true,
        codigo_estado: true,
        nombre_estado: true,
        color_hex: true,
      },
    },
  };

  // INCLUDE para detalle (lista + estado_anterior)
  private readonly INCLUDE_RELATIONS_DETAIL = {
    ordenes_servicio: {
      select: {
        id_orden_servicio: true,
        numero_orden: true,
        id_cliente: true,
        id_equipo: true,
      },
    },
    estados_orden_historial_estados_orden_id_estado_anteriorToestados_orden: {
      select: {
        id_estado: true,
        codigo_estado: true,
        nombre_estado: true,
        color_hex: true,
      },
    },
    estados_orden_historial_estados_orden_id_estado_nuevoToestados_orden: {
      select: {
        id_estado: true,
        codigo_estado: true,
        nombre_estado: true,
        color_hex: true,
      },
    },
  };

  /**
   * Vincula datos de usuario y nombre de persona sin depender de relaciones rotas en Prisma
   */
  private async adjuntarUsuarios(historiales: any[]): Promise<any[]> {
    if (!historiales || historiales.length === 0) return historiales;

    const userIds = [
      ...new Set(
        historiales
          .map((h: any) => h.realizado_por)
          .filter((id: any) => id != null && !isNaN(Number(id))),
      ),
    ];

    const usuariosList =
      userIds.length > 0
        ? await this.prisma.usuarios.findMany({
            where: { id_usuario: { in: userIds } },
            select: {
              id_usuario: true,
              email: true,
              username: true,
              persona: {
                select: {
                  primer_nombre: true,
                  segundo_nombre: true,
                  primer_apellido: true,
                  segundo_apellido: true,
                  razon_social: true,
                },
              },
            },
          })
        : [];

    const userMap = new Map(
      usuariosList.map((u: any) => {
        const nombreParts = u.persona
          ? [u.persona.primer_nombre, u.persona.primer_apellido].filter(Boolean)
          : [];
        const nombreCompleto =
          nombreParts.length > 0
            ? nombreParts.join(' ')
            : u.username || u.email;
        return [
          u.id_usuario,
          {
            id_usuario: u.id_usuario,
            email: u.email,
            nombre: nombreCompleto,
          },
        ];
      }),
    );

    for (const h of historiales) {
      if (h.realizado_por && userMap.has(h.realizado_por)) {
        h.usuarios = userMap.get(h.realizado_por);
      } else if (h.realizado_por) {
        h.usuarios = {
          id_usuario: h.realizado_por,
          email: `Usuario #${h.realizado_por}`,
          nombre: `Usuario #${h.realizado_por}`,
        };
      }
    }

    return historiales;
  }

  async crear(
    idOrdenServicio: number,
    idEstadoAnterior: number | undefined,
    idEstadoNuevo: number,
    motivoCambio: string | undefined,
    observaciones: string | undefined,
    accion: string | undefined,
    realizadoPor: number,
    ipOrigen: string | undefined,
    userAgent: string | undefined,
    duracionEstadoAnteriorMinutos: number | undefined,
    metadata: any | undefined,
  ): Promise<any> {
    const historial = await this.prisma.historial_estados_orden.create({
      data: {
        id_orden_servicio: idOrdenServicio,
        id_estado_anterior: idEstadoAnterior,
        id_estado_nuevo: idEstadoNuevo,
        motivo_cambio: motivoCambio,
        observaciones: observaciones,
        accion: accion,
        realizado_por: realizadoPor,
        ip_origen: ipOrigen,
        user_agent: userAgent,
        duracion_estado_anterior_minutos: duracionEstadoAnteriorMinutos,
        metadata: metadata,
      },
      include: this.INCLUDE_RELATIONS_DETAIL,
    });

    await this.adjuntarUsuarios([historial]);
    return HistorialEstadosOrdenMapper.toResponse(historial);
  }

  async listar(
    page: number,
    limit: number,
  ): Promise<{
    data: any[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const skip = (page - 1) * limit;

    const [historiales, total] = await Promise.all([
      this.prisma.historial_estados_orden.findMany({
        skip,
        take: limit,
        include: this.INCLUDE_RELATIONS_LIST,
        orderBy: {
          fecha_cambio: 'desc',
        },
      }),
      this.prisma.historial_estados_orden.count(),
    ]);

    await this.adjuntarUsuarios(historiales);

    return {
      data: historiales.map((h: any) => HistorialEstadosOrdenMapper.toResponse(h)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async listarPorOrden(
    idOrden: number,
    page: number,
    limit: number,
  ): Promise<{
    data: any[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const skip = (page - 1) * limit;

    const [historiales, total] = await Promise.all([
      this.prisma.historial_estados_orden.findMany({
        where: {
          id_orden_servicio: idOrden,
        },
        skip,
        take: limit,
        include: this.INCLUDE_RELATIONS_LIST,
        orderBy: {
          fecha_cambio: 'desc',
        },
      }),
      this.prisma.historial_estados_orden.count({
        where: {
          id_orden_servicio: idOrden,
        },
      }),
    ]);

    await this.adjuntarUsuarios(historiales);

    return {
      data: historiales.map((h: any) => HistorialEstadosOrdenMapper.toResponse(h)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async obtenerPorId(id: number): Promise<any | null> {
    const historial = await this.prisma.historial_estados_orden.findUnique({
      where: { id_historial: id },
      include: this.INCLUDE_RELATIONS_DETAIL,
    });

    if (!historial) {
      return null;
    }

    await this.adjuntarUsuarios([historial]);
    return HistorialEstadosOrdenMapper.toResponse(historial);
  }
}
