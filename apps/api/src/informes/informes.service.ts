import { PrismaService } from '@mekanos/database';
import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateInformesDto } from './dto/create-informes.dto';
import { UpdateInformesDto } from './dto/update-informes.dto';

@Injectable()
export class InformesService {
  constructor(private readonly prisma: PrismaService) { }

  async create(createDto: CreateInformesDto) {
    try {
      return await this.prisma.informes.create({
        data: createDto as any,
      });
    } catch (error: unknown) {
      throw new InternalServerErrorException(
        `Error al crear informes: ${(error as Error).message}`,
      );
    }
  }

  async findAll(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;

      const [data, total] = await Promise.all([
        this.prisma.informes.findMany({
          skip,
          take: limit,
          orderBy: { id_informe: 'desc' },
        }),
        this.prisma.informes.count(),
      ]);

      return {
        data,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error: unknown) {
      throw new InternalServerErrorException(
        `Error al obtener informes: ${(error as Error).message}`,
      );
    }
  }

  /**
   * ✅ REPORTES MODULE 10-FEB-2026 (v2 - REWRITE)
   * Fuente primaria: documentos_generados (tipo INFORME_SERVICIO) con JOINs SQL directos.
   * Captura TODOS los PDFs generados (291+), no solo los 11 de la tabla informes.
   *
   * Cadena: documentos_generados → ordenes_servicio → clientes → persona + equipos + tipos_servicio + técnico
   * LEFT JOIN informes para metadata adicional si existe.
   *
   * Filtros soportados:
   * - clienteId: filtrar por cliente específico
   * - fechaDesde / fechaHasta: rango de fecha de generación
   * - tipoServicio: filtrar por tipo de servicio de la orden
   * - estadoInforme: filtrar por estado (GENERADO = sin registro en informes, o BORRADOR/REVISADO/APROBADO/ENVIADO)
   * - busqueda: texto libre (busca en numero_documento, numero_orden, nombre cliente, NIT)
   * - page / limit: paginación server-side (default 50)
   */
  async findAllReportes(filters: {
    page?: number;
    limit?: number;
    clienteId?: number;
    fechaDesde?: string;
    fechaHasta?: string;
    tipoServicio?: number;
    estadoInforme?: string;
    busqueda?: string;
  }) {
    try {
      const page = filters.page || 1;
      const limit = Math.min(filters.limit || 50, 200);
      const offset = (page - 1) * limit;

      // ── Build dynamic WHERE ──────────────────────────────────────────────
      const conditions: string[] = [`dg.tipo_documento = 'INFORME_SERVICIO'`];
      const params: any[] = [];
      let idx = 1;

      if (filters.clienteId) {
        conditions.push(`os.id_cliente = $${idx++}`);
        params.push(filters.clienteId);
      }

      if (filters.fechaDesde) {
        conditions.push(`dg.fecha_generacion >= $${idx++}`);
        params.push(new Date(filters.fechaDesde));
      }

      if (filters.fechaHasta) {
        const hasta = new Date(filters.fechaHasta);
        hasta.setHours(23, 59, 59, 999);
        conditions.push(`dg.fecha_generacion <= $${idx++}`);
        params.push(hasta);
      }

      if (filters.tipoServicio) {
        conditions.push(`os.id_tipo_servicio = $${idx++}`);
        params.push(filters.tipoServicio);
      }

      if (filters.estadoInforme) {
        if (filters.estadoInforme === 'GENERADO') {
          conditions.push(`i.id_informe IS NULL`);
        } else {
          conditions.push(`i.estado_informe::text = $${idx++}`);
          params.push(filters.estadoInforme);
        }
      }

      if (filters.busqueda) {
        const searchParam = `%${filters.busqueda.trim()}%`;
        conditions.push(`(
          dg.numero_documento ILIKE $${idx} OR
          os.numero_orden ILIKE $${idx} OR
          COALESCE(p.primer_nombre, '') ILIKE $${idx} OR
          COALESCE(p.primer_apellido, '') ILIKE $${idx} OR
          COALESCE(p.razon_social, '') ILIKE $${idx} OR
          COALESCE(p.numero_identificacion, '') ILIKE $${idx}
        )`);
        params.push(searchParam);
        idx++;
      }

      const whereClause = conditions.join(' AND ');

      // ── FROM + JOINs (shared by count & data) ───────────────────────────
      const fromJoins = `
        FROM documentos_generados dg
        JOIN ordenes_servicio os ON os.id_orden_servicio = dg.id_referencia
        LEFT JOIN clientes c ON c.id_cliente = os.id_cliente
        LEFT JOIN personas p ON p.id_persona = c.id_persona
        LEFT JOIN equipos e ON e.id_equipo = os.id_equipo
        LEFT JOIN tipos_equipo te ON te.id_tipo_equipo = e.id_tipo_equipo
        LEFT JOIN tipos_servicio ts ON ts.id_tipo_servicio = os.id_tipo_servicio
        LEFT JOIN empleados emp ON emp.id_empleado = os.id_tecnico_asignado
        LEFT JOIN personas pt ON pt.id_persona = emp.id_persona
        LEFT JOIN sedes_cliente sc ON sc.id_sede = os.id_sede
        LEFT JOIN informes i ON i.id_documento_pdf = dg.id_documento
      `;

      // ── Count query ──────────────────────────────────────────────────────
      const countSql = `SELECT COUNT(*)::int as total ${fromJoins} WHERE ${whereClause}`;

      // ── Data query with LIMIT/OFFSET ─────────────────────────────────────
      const limitIdx = idx++;
      const offsetIdx = idx++;
      const dataSql = `
        SELECT
          dg.id_documento,
          dg.numero_documento,
          dg.ruta_archivo,
          dg.hash_sha256,
          dg."tamaño_bytes"::float8 as tamano_bytes,
          dg.mime_type,
          dg.fecha_generacion,
          os.id_orden_servicio,
          os.numero_orden,
          os.fecha_programada,
          os.fecha_fin_real,
          os.prioridad::text as prioridad,
          c.id_cliente,
          p.primer_nombre,
          p.segundo_nombre,
          p.primer_apellido,
          p.segundo_apellido,
          p.razon_social,
          p.numero_identificacion,
          p.tipo_identificacion::text as tipo_identificacion,
          e.id_equipo,
          e.codigo_equipo,
          e.nombre_equipo,
          e.numero_serie_equipo,
          te.nombre_tipo as tipo_equipo,
          ts.id_tipo_servicio,
          ts.nombre_tipo as nombre_tipo_servicio,
          ts.codigo_tipo,
          pt.primer_nombre as tecnico_nombre,
          pt.primer_apellido as tecnico_apellido,
          sc.nombre_sede,
          sc.ciudad_sede,
          i.id_informe,
          i.numero_informe,
          i.estado_informe::text as estado_informe,
          i.observaciones as observaciones_informe
        ${fromJoins}
        WHERE ${whereClause}
        ORDER BY dg.fecha_generacion DESC
        LIMIT $${limitIdx} OFFSET $${offsetIdx}
      `;

      const dataParams = [...params, limit, offset];

      // ── Execute both queries in parallel ─────────────────────────────────
      const [countResult, data]: [any[], any[]] = await Promise.all([
        this.prisma.$queryRawUnsafe(countSql, ...params),
        this.prisma.$queryRawUnsafe(dataSql, ...dataParams),
      ]);

      const total = countResult[0]?.total || 0;

      // ── Transform rows to clean response ─────────────────────────────────
      const reportes = data.map((row: any) => {
        const nombreCliente = row.razon_social
          || [row.primer_nombre, row.primer_apellido].filter(Boolean).join(' ')
          || 'Sin cliente';

        const nombreTecnico = [row.tecnico_nombre, row.tecnico_apellido]
          .filter(Boolean).join(' ') || 'Sin técnico';

        return {
          id_documento: row.id_documento,
          id_informe: row.id_informe,
          numero_informe: row.numero_informe || row.numero_documento || `DOC-${row.id_documento}`,
          estado_informe: row.estado_informe || 'GENERADO',
          fecha_generacion: row.fecha_generacion,
          observaciones: row.observaciones_informe,
          documento: {
            id_documento: row.id_documento,
            ruta_archivo: row.ruta_archivo,
            tipo_documento: 'INFORME_SERVICIO',
            numero_documento: row.numero_documento,
            tama_o_bytes: Number(row.tamano_bytes || 0),
            mime_type: row.mime_type,
            fecha_generacion: row.fecha_generacion,
            hash_sha256: row.hash_sha256,
          },
          orden: row.id_orden_servicio ? {
            id_orden_servicio: row.id_orden_servicio,
            numero_orden: row.numero_orden,
            fecha_programada: row.fecha_programada,
            fecha_fin_real: row.fecha_fin_real,
            prioridad: row.prioridad,
          } : null,
          cliente: {
            id_cliente: row.id_cliente,
            nombre: nombreCliente,
            nit: row.numero_identificacion || '',
            tipo_documento: row.tipo_identificacion || '',
          },
          equipo: row.id_equipo ? {
            id_equipo: row.id_equipo,
            codigo: row.codigo_equipo,
            nombre: row.nombre_equipo,
            numero_serie: row.numero_serie_equipo,
            tipo: row.tipo_equipo || '',
          } : null,
          tipo_servicio: row.id_tipo_servicio ? {
            id: row.id_tipo_servicio,
            nombre: row.nombre_tipo_servicio,
            codigo: row.codigo_tipo,
          } : null,
          tecnico: {
            nombre: nombreTecnico,
          },
          sede: row.nombre_sede ? {
            nombre: row.nombre_sede,
            ciudad: row.ciudad_sede,
          } : null,
        };
      });

      return {
        data: reportes,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error: unknown) {
      console.error('[InformesService.findAllReportes] ERROR COMPLETO:', error);
      throw new InternalServerErrorException(
        `Error al obtener reportes: ${(error as Error).message}`,
      );
    }
  }

  /**
   * ✅ REPORTES MODULE 10-FEB-2026 (v2 - REWRITE)
   * Obtiene clientes únicos que tienen documentos PDF generados.
   * Fuente: documentos_generados (INFORME_SERVICIO) → ordenes_servicio → clientes → personas
   */
  async getClientesConInformes() {
    try {
      const clientes: any[] = await this.prisma.$queryRawUnsafe(`
        SELECT DISTINCT
          c.id_cliente,
          COALESCE(p.razon_social, CONCAT_WS(' ', p.primer_nombre, p.primer_apellido)) as nombre,
          COALESCE(p.numero_identificacion, '') as nit
        FROM documentos_generados dg
        JOIN ordenes_servicio os ON os.id_orden_servicio = dg.id_referencia
        JOIN clientes c ON c.id_cliente = os.id_cliente
        JOIN personas p ON p.id_persona = c.id_persona
        WHERE dg.tipo_documento = 'INFORME_SERVICIO'
        ORDER BY nombre ASC
      `);

      return clientes;
    } catch (error: unknown) {
      throw new InternalServerErrorException(
        `Error al obtener clientes con informes: ${(error as Error).message}`,
      );
    }
  }

  async findOne(id: number) {
    try {
      const record = await this.prisma.informes.findUnique({
        where: { id_informe: id },
      });

      if (!record) {
        throw new NotFoundException(`Informes con ID ${id} no encontrado`);
      }

      return record;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al obtener informes: ${(error as Error).message}`,
      );
    }
  }

  async update(id: number, updateDto: UpdateInformesDto) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.informes.update({
        where: { id_informe: id },
        data: updateDto as any,
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al actualizar informes: ${(error as Error).message}`,
      );
    }
  }

  async remove(id: number) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.informes.delete({
        where: { id_informe: id },
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al eliminar informes: ${(error as Error).message}`,
      );
    }
  }
}
