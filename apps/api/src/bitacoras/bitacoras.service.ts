import { PrismaService } from '@mekanos/database';
import { Prisma } from '@prisma/client';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EmailService } from '../email/email.service';
import { CreateBitacorasDto } from './dto/create-bitacoras.dto';
import { UpdateBitacorasDto } from './dto/update-bitacoras.dto';

// ═══════════════════════════════════════════════════════════════
// TIPOS para el módulo Bitácora
// ═══════════════════════════════════════════════════════════════

export interface BitacoraEnvioPrevio {
  id_bitacora: number;
  numero_bitacora: string;
  fecha_envio: string | null;
  mes: number;
  anio: number;
}

export interface InformePreview {
  id_documento: number;
  numero_documento: string;
  id_orden_servicio: number;
  numero_orden: string;
  fecha_programada: string | null;
  fecha_servicio: string | null;
  equipo_nombre: string;
  equipo_serie: string | null;
  tipo_equipo: string;
  categoria_equipo: string;
  tipo_servicio: string | null;
  codigo_tipo_servicio: string | null;
  pdf_url: string;
  nombre_sugerido: string;
  nombre_sede: string | null;
  ciudad_sede: string | null;
  // ✅ Trazabilidad proactiva de envíos previos (Bitácora y/u Orden)
  ya_enviado: boolean;
  ya_enviado_en_bitacora: boolean;
  ya_enviado_en_orden: boolean;
  total_emails_enviados: number;
  ultimo_envio_fecha: string | null;
  ultimo_origen_envio: string | null;
  bitacoras_previas: BitacoraEnvioPrevio[];
}

export interface SedeGroup {
  id_cliente: number;
  nombre_sede: string;
  nombre_cliente: string;
  informes: InformePreview[];
  // ✅ FIX 03-MAR-2026: Emails destinatarios de esta sede
  emails_destinatarios?: string[];
}

export interface BitacoraPreviewResult {
  id_cliente_principal: number;
  nombre_cliente_principal: string;
  mes: number;
  anio: number;
  categoria_filtro: string;
  categorias_filtro: string[];
  tipos_servicio_filtro: string[];
  sedes: SedeGroup[];
  total_informes: number;
  total_con_pdf: number;
  total_sin_pdf: number;
  total_ya_enviados: number;
  total_pendientes_envio: number;
  emails_destinatarios: string[];
  id_cuenta_email_remitente: number | null;
  // ✅ Rango de fechas (cuando se usa modo rango)
  fecha_inicio?: string;
  fecha_fin?: string;
}

export interface InformeHistorialBitacora {
  id_informe: number;
  id_documento: number | null;
  id_orden_servicio: number;
  numero_orden: string;
  equipo_nombre: string;
  equipo_codigo: string | null;
  tipo_servicio: string | null;
  nombre_sede: string | null;
  fecha_servicio: string | null;
  pdf_url: string | null;
  orden_bitacora: number;
}

const CATEGORIA_LABELS: Record<string, string> = {
  ENERGIA: 'Plantas Eléctricas',
  HIDRAULICA: 'Bombas',
  CLIMATIZACION: 'Climatización',
  COMPRESION: 'Compresión',
  ELECTRICO: 'Eléctrico',
  MECANICO: 'Mecánico',
  OTRO: 'Otros Equipos',
};

function parseCsvFilter(raw?: string): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const part of raw.split(',')) {
    const clean = part.trim();
    const upper = clean.toUpperCase();
    if (!clean || upper === 'TODAS' || upper === 'TODOS' || upper === '_ALL') {
      continue;
    }
    if (!seen.has(clean)) {
      seen.add(clean);
      result.push(clean);
    }
  }
  return result;
}

function formatCategoriasLabel(categorias: string[]): string {
  if (categorias.length === 0) return 'Todas las categorías';
  return categorias.map((c) => CATEGORIA_LABELS[c.toUpperCase()] || c).join(', ');
}

export interface EnviarBitacoraDto {
  id_cliente_principal: number;
  mes: number;
  anio: number;
  categoria: string;
  documentos_ids: number[];
  nombres_pdf?: Record<number, string>;
  email_destino?: string;
  emails_cc?: string[];
  asunto_personalizado?: string;
  mensaje_personalizado?: string;
  usuario_id: number;
  // ✅ Rango de fechas opcional (alternativa a mes/anio)
  fecha_inicio?: string;
  fecha_fin?: string;
}

@Injectable()
export class BitacorasService {
  private readonly logger = new Logger(BitacorasService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) { }

  // ═══════════════════════════════════════════════════════════════
  // CRUD BÁSICO (existente)
  // ═══════════════════════════════════════════════════════════════

  async create(createDto: CreateBitacorasDto) {
    try {
      return await this.prisma.bitacoras.create({
        data: createDto as any,
      });
    } catch (error: unknown) {
      throw new InternalServerErrorException(
        `Error al crear bitacoras: ${(error as Error).message}`,
      );
    }
  }

  async findAll(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;

      const [data, total] = await Promise.all([
        this.prisma.bitacoras.findMany({
          skip,
          take: limit,
          orderBy: { id_bitacora: 'desc' },
          include: {
            clientes: {
              include: { persona: true },
            },
          },
        }),
        this.prisma.bitacoras.count(),
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
        `Error al obtener bitacoras: ${(error as Error).message}`,
      );
    }
  }

  async findOne(id: number) {
    try {
      const record = await this.prisma.bitacoras.findUnique({
        where: { id_bitacora: id },
        include: {
          clientes: { include: { persona: true } },
          bitacoras_informes: {
            include: {
              informes: {
                include: {
                  documentos_generados: true,
                  ordenes_servicio: {
                    include: {
                      equipos: { include: { tipos_equipo: true } },
                      clientes: true,
                    },
                  },
                },
              },
            },
            orderBy: { orden_bitacora: 'asc' },
          },
        },
      });

      if (!record) {
        throw new NotFoundException(`Bitacoras con ID ${id} no encontrado`);
      }

      return record;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al obtener bitacoras: ${(error as Error).message}`,
      );
    }
  }

  async update(id: number, updateDto: UpdateBitacorasDto) {
    try {
      await this.findOne(id);

      return await this.prisma.bitacoras.update({
        where: { id_bitacora: id },
        data: updateDto as any,
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al actualizar bitacoras: ${(error as Error).message}`,
      );
    }
  }

  async remove(id: number) {
    try {
      await this.findOne(id);

      return await this.prisma.bitacoras.delete({
        where: { id_bitacora: id },
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al eliminar bitacoras: ${(error as Error).message}`,
      );
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PREVIEW: Informes agrupados por sede para un cliente principal
  // Fuente: documentos_generados (INFORME_SERVICIO) → ordenes_servicio
  // ═══════════════════════════════════════════════════════════════

  async previewInformesPorSede(
    idClientePrincipal: number,
    mes: number,
    anio: number,
    categoria?: string,
    fechaInicioStr?: string,
    fechaFinStr?: string,
    tipoServicio?: string,
  ): Promise<BitacoraPreviewResult> {
    // 1. Validar cliente principal
    const principal = await this.prisma.clientes.findUnique({
      where: { id_cliente: idClientePrincipal },
      include: {
        persona: true,
        sedes: {
          where: { cliente_activo: true },
          select: { id_cliente: true, nombre_sede: true },
        },
      },
    });

    if (!principal) {
      throw new NotFoundException(`Cliente ${idClientePrincipal} no encontrado`);
    }

    if (!principal.es_cliente_principal) {
      throw new BadRequestException(`Cliente ${idClientePrincipal} no es un cliente principal`);
    }

    // 2. Recopilar IDs: principal + todas sus sedes
    const clienteIds = [
      idClientePrincipal,
      ...principal.sedes.map(s => s.id_cliente),
    ];

    const nombrePrincipal = principal.persona?.nombre_comercial || principal.persona?.razon_social || 'Cliente';
    this.logger.log(`[BITACORA PREVIEW] Cliente: ${nombrePrincipal} | Sedes: ${clienteIds.length} | Mes: ${mes}/${anio} | Cat: ${categoria || 'TODAS'}`);

    // 3. Calcular rango de fechas: por rango explícito o por mes/año
    let fechaInicio: string;
    let fechaFin: string;
    const modoRango = !!(fechaInicioStr && fechaFinStr);

    if (modoRango) {
      fechaInicio = fechaInicioStr;
      fechaFin = fechaFinStr;
      this.logger.log(`[BITACORA PREVIEW] Modo RANGO: ${fechaInicio} → ${fechaFin}`);
    } else {
      fechaInicio = `${anio}-${String(mes).padStart(2, '0')}-01`;
      const ultimoDia = new Date(anio, mes, 0).getDate();
      fechaFin = `${anio}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;
    }

    const categoriasList = parseCsvFilter(categoria);
    const tiposServicioList = parseCsvFilter(tipoServicio);

    // 4. Query SQL parametrizado con soporte multi-selección de categorías y tipos de servicio
    const categoriaSql =
      categoriasList.length > 0
        ? Prisma.sql`AND te.categoria::text IN (${Prisma.join(categoriasList)})`
        : Prisma.empty;

    const tipoServicioSql =
      tiposServicioList.length > 0
        ? Prisma.sql`AND ts.codigo_tipo IN (${Prisma.join(tiposServicioList)})`
        : Prisma.empty;

    const rows: any[] =
      clienteIds.length === 0
        ? []
        : await this.prisma.$queryRaw`
      SELECT
        dg.id_documento,
        dg.numero_documento,
        dg.ruta_archivo,
        dg.fecha_generacion,
        os.id_orden_servicio,
        os.numero_orden,
        os.fecha_programada,
        os.fecha_inicio_real,
        os.id_cliente,
        c.nombre_sede AS cliente_nombre_sede,
        c.id_cliente_principal,
        COALESCE(p.nombre_comercial, p.razon_social, p.nombre_completo, 'Cliente') AS nombre_cliente,
        e.id_equipo,
        e.nombre_equipo,
        e.numero_serie_equipo,
        te.nombre_tipo AS tipo_equipo,
        te.categoria::text AS categoria_equipo,
        ts.nombre_tipo AS tipo_servicio,
        ts.codigo_tipo AS codigo_tipo_servicio,
        sc.nombre_sede AS sede_nombre,
        sc.ciudad_sede
      FROM documentos_generados dg
      JOIN ordenes_servicio os ON os.id_orden_servicio = dg.id_referencia
      LEFT JOIN clientes c ON c.id_cliente = os.id_cliente
      LEFT JOIN personas p ON p.id_persona = c.id_persona
      LEFT JOIN equipos e ON e.id_equipo = os.id_equipo
      LEFT JOIN tipos_equipo te ON te.id_tipo_equipo = e.id_tipo_equipo
      LEFT JOIN tipos_servicio ts ON ts.id_tipo_servicio = os.id_tipo_servicio
      LEFT JOIN sedes_cliente sc ON sc.id_sede = os.id_sede
      WHERE dg.tipo_documento = 'INFORME_SERVICIO'
        AND os.fecha_programada >= ${fechaInicio}::date
        AND os.fecha_programada <= ${fechaFin}::date
        AND os.id_cliente IN (${Prisma.join(clienteIds)})
        ${categoriaSql}
        ${tipoServicioSql}
      ORDER BY os.id_cliente ASC, os.fecha_programada ASC
    `;

    this.logger.log(`[BITACORA PREVIEW] Encontrados ${rows.length} documentos/informes PDF`);

    // 4b. Trazabilidad proactiva de envíos previos:
    //     (a) historial_emails_enviados por orden (badge ✉️ N en órdenes)
    //     (b) bitacoras_informes enviadas previamente
    const ordenIds = Array.from(new Set(rows.map((r) => Number(r.id_orden_servicio)).filter(Boolean)));
    const docIds = Array.from(new Set(rows.map((r) => Number(r.id_documento)).filter(Boolean)));

    const emailsPorOrden = new Map<
      number,
      { total: number; ultimoFecha: string | null; ultimoOrigen: string | null }
    >();
    const bitacorasPorOrden = new Map<number, BitacoraEnvioPrevio[]>();
    const bitacorasPorDoc = new Map<number, BitacoraEnvioPrevio[]>();

    if (ordenIds.length > 0) {
      const [historialEmails, bitacorasPreviasRows] = await Promise.all([
        this.prisma.historial_emails_enviados.findMany({
          where: {
            id_orden_servicio: { in: ordenIds },
            estado_envio: 'EXITOSO',
          },
          select: {
            id_orden_servicio: true,
            fecha_envio: true,
            origen_envio: true,
          },
          orderBy: { fecha_envio: 'desc' },
        }),
        this.prisma.bitacoras_informes.findMany({
          where: {
            bitacoras: {
              estado_bitacora: { in: ['ENVIADA', 'APROBADA'] },
            },
            informes: {
              OR: [
                { id_orden_servicio: { in: ordenIds } },
                ...(docIds.length > 0 ? [{ id_documento_pdf: { in: docIds } }] : []),
              ],
            },
          },
          include: {
            bitacoras: {
              select: {
                id_bitacora: true,
                numero_bitacora: true,
                enviada_cliente_fecha: true,
                fecha_generacion: true,
                mes: true,
                anio: true,
              },
            },
            informes: {
              select: {
                id_orden_servicio: true,
                id_documento_pdf: true,
              },
            },
          },
          orderBy: { id_bitacora_informe: 'desc' },
        }),
      ]);

      for (const em of historialEmails) {
        const prev = emailsPorOrden.get(em.id_orden_servicio);
        const fechaIso = em.fecha_envio ? new Date(em.fecha_envio).toISOString() : null;
        if (!prev) {
          emailsPorOrden.set(em.id_orden_servicio, {
            total: 1,
            ultimoFecha: fechaIso,
            ultimoOrigen: em.origen_envio || null,
          });
        } else {
          prev.total += 1;
        }
      }

      for (const bi of bitacorasPreviasRows) {
        if (!bi.bitacoras || !bi.informes) continue;
        const entry: BitacoraEnvioPrevio = {
          id_bitacora: bi.bitacoras.id_bitacora,
          numero_bitacora: bi.bitacoras.numero_bitacora,
          fecha_envio: bi.bitacoras.enviada_cliente_fecha
            ? new Date(bi.bitacoras.enviada_cliente_fecha).toISOString()
            : bi.bitacoras.fecha_generacion
              ? new Date(bi.bitacoras.fecha_generacion).toISOString()
              : null,
          mes: bi.bitacoras.mes,
          anio: bi.bitacoras.anio,
        };

        const idOs = bi.informes.id_orden_servicio;
        if (idOs) {
          const arr = bitacorasPorOrden.get(idOs) || [];
          if (!arr.some((x) => x.id_bitacora === entry.id_bitacora)) {
            arr.push(entry);
            bitacorasPorOrden.set(idOs, arr);
          }
        }
        const idDoc = bi.informes.id_documento_pdf;
        if (idDoc) {
          const arr = bitacorasPorDoc.get(idDoc) || [];
          if (!arr.some((x) => x.id_bitacora === entry.id_bitacora)) {
            arr.push(entry);
            bitacorasPorDoc.set(idDoc, arr);
          }
        }
      }
    }

    // 5. Agrupar por sede (id_cliente)
    const sedesMap = new Map<number, SedeGroup>();
    const clienteCorto = nombrePrincipal.substring(0, 20).toUpperCase().replace(/\s+/g, '_');
    let totalYaEnviados = 0;

    for (const row of rows) {
      const clienteId = row.id_cliente;

      // Nombre de la sede: priorizar nombre_sede del cliente-sede, luego sede_nombre de sedes_cliente
      const nombreSede = row.cliente_nombre_sede || row.sede_nombre || (clienteId === idClientePrincipal ? 'SEDE PRINCIPAL' : row.nombre_cliente);

      // Nombre sugerido para el PDF
      const sedeCorto = (nombreSede || 'SEDE').substring(0, 25).toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
      let tipoServicioCorto = 'MANT';
      if (row.codigo_tipo_servicio) {
        if (row.codigo_tipo_servicio.includes('PREVENTIVO_A')) tipoServicioCorto = 'PREV-A';
        else if (row.codigo_tipo_servicio.includes('PREVENTIVO_B')) tipoServicioCorto = 'PREV-B';
        else if (row.codigo_tipo_servicio.includes('CORRECTIVO')) tipoServicioCorto = 'CORRECTIVO';
        else tipoServicioCorto = row.codigo_tipo_servicio.substring(0, 10);
      }
      // Limpiar nombre del equipo para nombre de archivo válido
      const equipoNombreLimpio = (row.nombre_equipo || 'EQUIPO').substring(0, 20).toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
      const nombreSugerido = `${clienteCorto}_${sedeCorto}_${row.numero_orden}_${tipoServicioCorto}_(${equipoNombreLimpio}).pdf`;

      // Combinar bitácoras previas por documento y por orden sin duplicar
      const bitsMap = new Map<number, BitacoraEnvioPrevio>();
      for (const b of bitacorasPorDoc.get(Number(row.id_documento)) || []) {
        bitsMap.set(b.id_bitacora, b);
      }
      for (const b of bitacorasPorOrden.get(Number(row.id_orden_servicio)) || []) {
        bitsMap.set(b.id_bitacora, b);
      }
      const bitacorasPrevias = Array.from(bitsMap.values());
      const emailInfo = emailsPorOrden.get(Number(row.id_orden_servicio));
      const totalEmailsEnviados = emailInfo?.total || 0;
      const yaEnviadoEnBitacora = bitacorasPrevias.length > 0;
      const yaEnviadoEnOrden = totalEmailsEnviados > 0;
      const yaEnviado = yaEnviadoEnBitacora || yaEnviadoEnOrden;
      if (yaEnviado) totalYaEnviados++;

      const ultimoEnvioFecha =
        emailInfo?.ultimoFecha || bitacorasPrevias[0]?.fecha_envio || null;

      const informePreview: InformePreview = {
        id_documento: row.id_documento,
        numero_documento: row.numero_documento || row.numero_orden,
        id_orden_servicio: row.id_orden_servicio,
        numero_orden: row.numero_orden,
        fecha_programada: row.fecha_programada ? new Date(row.fecha_programada).toISOString() : null,
        fecha_servicio: row.fecha_inicio_real ? new Date(row.fecha_inicio_real).toISOString() : (row.fecha_programada ? new Date(row.fecha_programada).toISOString() : null),
        equipo_nombre: row.nombre_equipo || 'N/A',
        equipo_serie: row.numero_serie_equipo || null,
        tipo_equipo: row.tipo_equipo || 'N/A',
        categoria_equipo: row.categoria_equipo || 'OTRO',
        tipo_servicio: row.tipo_servicio || null,
        codigo_tipo_servicio: row.codigo_tipo_servicio || null,
        pdf_url: row.ruta_archivo,
        nombre_sugerido: nombreSugerido,
        nombre_sede: row.sede_nombre || null,
        ciudad_sede: row.ciudad_sede || null,
        ya_enviado: yaEnviado,
        ya_enviado_en_bitacora: yaEnviadoEnBitacora,
        ya_enviado_en_orden: yaEnviadoEnOrden,
        total_emails_enviados: totalEmailsEnviados,
        ultimo_envio_fecha: ultimoEnvioFecha,
        ultimo_origen_envio: emailInfo?.ultimoOrigen || (yaEnviadoEnBitacora ? 'BITACORA' : null),
        bitacoras_previas: bitacorasPrevias,
      };

      if (!sedesMap.has(clienteId)) {
        sedesMap.set(clienteId, {
          id_cliente: clienteId,
          nombre_sede: nombreSede,
          nombre_cliente: row.nombre_cliente || 'Cliente',
          informes: [],
        });
      }
      sedesMap.get(clienteId)!.informes.push(informePreview);
    }

    const sedes = Array.from(sedesMap.values());
    const totalInformes = sedes.reduce((sum, s) => sum + s.informes.length, 0);

    // 6. Recopilar emails destinatarios del principal
    const emailsSet = new Set<string>();
    if (principal.persona?.email_principal) {
      emailsSet.add(principal.persona.email_principal);
    }
    if (principal.emails_notificacion) {
      principal.emails_notificacion.split(';;')
        .map(e => e.trim())
        .filter(e => e.length > 0 && e.includes('@'))
        .forEach(e => emailsSet.add(e));
    }

    // ✅ FIX 03-MAR-2026: Recopilar emails de cada sede individualmente
    const sedeIds = sedes.map(s => s.id_cliente);
    const sedesConDatos = await this.prisma.clientes.findMany({
      where: { id_cliente: { in: sedeIds } },
      include: { persona: true },
    });

    const sedesMapDatos = new Map(sedesConDatos.map(s => [s.id_cliente, s]));

    for (const sede of sedes) {
      const sedeData = sedesMapDatos.get(sede.id_cliente);
      if (!sedeData) continue;

      const sedeEmailsSet = new Set<string>();

      // Email principal de la persona de la sede
      if (sedeData.persona?.email_principal) {
        sedeEmailsSet.add(sedeData.persona.email_principal);
      }

      // emails_notificacion de la sede (o heredados del principal si está vacío)
      const emailsNotificacion = sedeData.emails_notificacion || principal.emails_notificacion;
      if (emailsNotificacion) {
        emailsNotificacion.split(';;')
          .map(e => e.trim())
          .filter(e => e.length > 0 && e.includes('@'))
          .forEach(e => sedeEmailsSet.add(e));
      }

      // Si la sede es el principal, ya tenemos los emails; si es sede hija, agregar al set global
      if (sede.id_cliente !== idClientePrincipal) {
        // Agregar emails de la sede al set global para el envío
        sedeEmailsSet.forEach(e => emailsSet.add(e));
      }

      // Guardar emails de esta sede para el preview
      sede.emails_destinatarios = Array.from(sedeEmailsSet);
    }

    return {
      id_cliente_principal: idClientePrincipal,
      nombre_cliente_principal: nombrePrincipal,
      mes,
      anio,
      categoria_filtro: categoriasList.length > 0 ? categoriasList.join(',') : 'TODAS',
      categorias_filtro: categoriasList,
      tipos_servicio_filtro: tiposServicioList,
      sedes,
      total_informes: totalInformes,
      total_con_pdf: totalInformes, // All docs from documentos_generados have a PDF
      total_sin_pdf: 0,
      total_ya_enviados: totalYaEnviados,
      total_pendientes_envio: Math.max(0, totalInformes - totalYaEnviados),
      emails_destinatarios: Array.from(emailsSet),
      id_cuenta_email_remitente: principal.id_cuenta_email_remitente,
      ...(modoRango ? { fecha_inicio: fechaInicio, fecha_fin: fechaFin } : {}),
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // ENVIAR: Crear bitácora + descargar PDFs + enviar email
  // ═══════════════════════════════════════════════════════════════

  async crearYEnviarBitacora(dto: EnviarBitacoraDto): Promise<{
    success: boolean;
    id_bitacora: number | null;
    informes_enviados: number;
    informes_fallidos: number;
    emails_enviados: number;
    emails_fallidos: number;
    total_batches: number;
    email_enviado: boolean;
    destinatarios: string[];
    error?: string;
  }> {
    const { id_cliente_principal, mes, anio, categoria, documentos_ids, nombres_pdf, usuario_id } = dto;

    this.logger.log(`[BITACORA ENVIAR] Cliente: ${id_cliente_principal} | Mes: ${mes}/${anio} | Cat: ${categoria} | Docs: ${documentos_ids.length}`);

    if (documentos_ids.length === 0) {
      throw new BadRequestException('Debe seleccionar al menos un documento para enviar');
    }

    // 1. Validar cliente principal
    const principal = await this.prisma.clientes.findUnique({
      where: { id_cliente: id_cliente_principal },
      include: { persona: true },
    });

    if (!principal || !principal.es_cliente_principal) {
      throw new BadRequestException('Cliente principal inválido');
    }

    // 2. Obtener documentos con sus datos (SQL parametrizado, cero interpolación)
    const docs: any[] =
      !documentos_ids || documentos_ids.length === 0
        ? []
        : await this.prisma.$queryRaw`
      SELECT
        dg.id_documento,
        dg.numero_documento,
        dg.ruta_archivo,
        os.id_orden_servicio,
        os.numero_orden,
        os.id_cliente,
        c.nombre_sede AS cliente_nombre_sede,
        e.nombre_equipo,
        ts.nombre_tipo AS tipo_servicio,
        te.categoria AS categoria_equipo
      FROM documentos_generados dg
      JOIN ordenes_servicio os ON os.id_orden_servicio = dg.id_referencia
      LEFT JOIN clientes c ON c.id_cliente = os.id_cliente
      LEFT JOIN equipos e ON e.id_equipo = os.id_equipo
      LEFT JOIN tipos_servicio ts ON ts.id_tipo_servicio = os.id_tipo_servicio
      LEFT JOIN tipos_equipo te ON te.id_tipo_equipo = e.id_tipo_equipo
      WHERE dg.id_documento IN (${Prisma.join(documentos_ids)})
        AND dg.tipo_documento = 'INFORME_SERVICIO'
    `;
    this.logger.log(`[BITACORA ENVIAR] ${docs.length} documentos encontrados de ${documentos_ids.length} solicitados`);

    // 3. Descargar PDFs conservando vínculo exacto con su documento/orden
    interface BitacoraAttachmentItem {
      filename: string;
      content: Buffer;
      contentType: string;
      doc: any;
    }
    const attachments: BitacoraAttachmentItem[] = [];
    let informesFallidos = 0;

    for (const doc of docs) {
      const pdfUrl = doc.ruta_archivo;
      if (!pdfUrl) {
        informesFallidos++;
        continue;
      }

      try {
        const response = await fetch(pdfUrl);
        if (!response.ok) {
          informesFallidos++;
          this.logger.warn(`[BITACORA] Error descargando PDF: ${response.status} para ${pdfUrl}`);
          continue;
        }

        const buffer = Buffer.from(await response.arrayBuffer());

        // Nombre del PDF: personalizado o automático
        const nombreCustom = nombres_pdf?.[doc.id_documento];
        let filename: string;

        if (nombreCustom) {
          filename = nombreCustom.endsWith('.pdf') ? nombreCustom : `${nombreCustom}.pdf`;
        } else {
          // Usar la misma lógica que previewInformesPorSede
          const nombreCliente = principal.persona?.nombre_comercial || principal.persona?.razon_social || 'CLIENTE';
          const clienteCorto = nombreCliente.substring(0, 20).toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');

          const nombreSede = doc.cliente_nombre_sede || 'SEDE PRINCIPAL';
          const sedeCorto = (nombreSede || 'SEDE').substring(0, 25).toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');

          let tipoServicioCorto = 'MANT';
          if (doc.tipo_servicio) {
            const nombreTipo = doc.tipo_servicio.toUpperCase();
            if (nombreTipo.includes('PREVENTIVO') && nombreTipo.includes('A')) tipoServicioCorto = 'PREV-A';
            else if (nombreTipo.includes('PREVENTIVO') && nombreTipo.includes('B')) tipoServicioCorto = 'PREV-B';
            else if (nombreTipo.includes('CORRECTIVO')) tipoServicioCorto = 'CORRECTIVO';
            else tipoServicioCorto = nombreTipo.substring(0, 10);
          }

          // Limpiar nombre del equipo para nombre de archivo válido
          const equipoNombreLimpio = (doc.nombre_equipo || 'EQUIPO').substring(0, 20).toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
          filename = `${clienteCorto}_${sedeCorto}_${doc.numero_orden}_${tipoServicioCorto}_(${equipoNombreLimpio}).pdf`;
        }

        attachments.push({
          filename,
          content: buffer,
          contentType: 'application/pdf',
          doc,
        });
      } catch (error) {
        informesFallidos++;
        this.logger.error(`[BITACORA] Error fetch PDF ${pdfUrl}: ${error}`);
      }
    }

    if (attachments.length === 0) {
      throw new BadRequestException('No se pudo descargar ningún PDF. Verifique que los documentos tengan archivos válidos.');
    }

    // ✅ BATCH EMAILS: Dividir en batches si excede límite de tamaño
    const MAX_SIZE_MB = 23; // 23MB límite seguro para Gmail (25MB máximo)
    const MAX_PDFS_PER_BATCH = 20; // Máximo 20 PDFs por email

    const totalSizeBytes = attachments.reduce((sum, att) => sum + att.content.length, 0);
    const totalSizeMB = totalSizeBytes / (1024 * 1024);

    this.logger.log(`[BITACORA] Total PDFs: ${attachments.length} | Tamaño total: ${totalSizeMB.toFixed(2)}MB`);

    let emailBatches: { attachments: typeof attachments; batchNumber: number; totalBatches: number }[] = [];

    if (totalSizeMB > MAX_SIZE_MB || attachments.length > MAX_PDFS_PER_BATCH) {
      // Dividir en batches por tamaño acumulado (no solo por cantidad)
      this.logger.log(`[BITACORA] Dividiendo en múltiples emails (tamaño/límite excedido)`);

      let currentBatch: typeof attachments = [];
      let currentBatchSizeBytes = 0;
      let batchNumber = 0;

      for (const att of attachments) {
        const attSizeBytes = att.content.length;

        // Si agregar este PDF excede el límite Y ya hay PDFs en el batch actual, cerrar batch
        if (currentBatch.length > 0 &&
          (currentBatchSizeBytes + attSizeBytes) / (1024 * 1024) > MAX_SIZE_MB) {
          emailBatches.push({
            attachments: currentBatch,
            batchNumber: batchNumber + 1,
            totalBatches: 0, // Se actualizará al final
          });
          currentBatch = [];
          currentBatchSizeBytes = 0;
          batchNumber++;
        }

        // También respetar límite de cantidad de PDFs por batch
        if (currentBatch.length >= MAX_PDFS_PER_BATCH) {
          emailBatches.push({
            attachments: currentBatch,
            batchNumber: batchNumber + 1,
            totalBatches: 0,
          });
          currentBatch = [];
          currentBatchSizeBytes = 0;
          batchNumber++;
        }

        currentBatch.push(att);
        currentBatchSizeBytes += attSizeBytes;
      }

      // Agregar el último batch si tiene contenido
      if (currentBatch.length > 0) {
        emailBatches.push({
          attachments: currentBatch,
          batchNumber: batchNumber + 1,
          totalBatches: 0,
        });
      }

      // Actualizar totalBatches para todos
      const totalBatches = emailBatches.length;
      emailBatches = emailBatches.map(batch => ({
        ...batch,
        totalBatches,
      }));

      this.logger.log(`[BITACORA] Dividido en ${totalBatches} emails (tamaño/límite excedido)`);
    } else {
      // Un solo email
      emailBatches = [{
        attachments,
        batchNumber: 1,
        totalBatches: 1,
      }];
    }

    // 4. Crear registro de bitácora con número único si ya existen envíos previos en el periodo
    const esRangoFechas = !!(dto.fecha_inicio && dto.fecha_fin);
    const bitMes = esRangoFechas ? new Date(dto.fecha_inicio!).getMonth() + 1 : mes;
    const bitAnio = esRangoFechas ? new Date(dto.fecha_inicio!).getFullYear() : anio;
    const baseNumeroBitacora = `BIT-${bitAnio}${String(bitMes).padStart(2, '0')}-${id_cliente_principal}`;
    const existentesPeriodo = await this.prisma.bitacoras.count({
      where: {
        id_cliente: id_cliente_principal,
        numero_bitacora: { startsWith: baseNumeroBitacora },
      },
    });
    const numeroBitacora =
      existentesPeriodo > 0 ? `${baseNumeroBitacora}-${existentesPeriodo + 1}` : baseNumeroBitacora;

    const categoriasEnviar = parseCsvFilter(categoria);
    const categoriaLabel = formatCategoriasLabel(categoriasEnviar);

    const bitacora = await this.prisma.bitacoras.create({
      data: {
        numero_bitacora: numeroBitacora,
        id_cliente: id_cliente_principal,
        mes: bitMes,
        anio: bitAnio,
        generado_por: usuario_id,
        estado_bitacora: 'BORRADOR',
        cantidad_informes: attachments.length,
        observaciones: esRangoFechas
          ? `Bitácora ${categoriaLabel} - ${attachments.length} informes (Rango: ${dto.fecha_inicio} a ${dto.fecha_fin})${emailBatches.length > 1 ? ` (enviada en ${emailBatches.length} partes)` : ''}`
          : `Bitácora ${categoriaLabel} - ${attachments.length} informes${emailBatches.length > 1 ? ` (enviada en ${emailBatches.length} partes)` : ''}`,
      },
    });

    // 5. Construir email
    const nombreCliente = principal.persona?.nombre_comercial || principal.persona?.razon_social || 'Cliente';
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const mesNombre = meses[mes - 1] || `Mes ${mes}`;

    // ✅ Periodo label: rango de fechas o mes/año
    const periodoLabel = esRangoFechas
      ? `del ${dto.fecha_inicio} al ${dto.fecha_fin}`
      : `${mesNombre} ${anio}`;

    // Recopilar destinatarios (respetando la lista editada explícitamente cuando dto.email_destino viene informado)
    const destinatarios: string[] = [];
    const addDestinatario = (raw?: string | null) => {
      if (!raw) return;
      for (const part of raw.split(/[,;]+/)) {
        const clean = part.trim();
        if (clean.includes('@') && !destinatarios.includes(clean)) {
          destinatarios.push(clean);
        }
      }
    };

    if (dto.email_destino && dto.email_destino.trim()) {
      addDestinatario(dto.email_destino);
    } else {
      addDestinatario(principal.persona?.email_principal);
      if (principal.emails_notificacion) {
        principal.emails_notificacion
          .split(';;')
          .forEach((extra) => addDestinatario(extra));
      }
    }

    if (dto.emails_cc) {
      for (const cc of dto.emails_cc) {
        addDestinatario(cc);
      }
    }

    if (destinatarios.length === 0) {
      this.logger.warn('[BITACORA] Sin destinatarios configurados');
      return {
        success: false,
        id_bitacora: bitacora.id_bitacora,
        informes_enviados: attachments.length,
        informes_fallidos: informesFallidos,
        emails_enviados: 0,
        emails_fallidos: 0,
        total_batches: 0,
        email_enviado: false,
        destinatarios: [],
        error: 'No hay destinatarios de email configurados',
      };
    }

    // Construir resumen por sede para el cuerpo del email
    const sedesResumen: string[] = [];
    const informesPorSede = new Map<string, string[]>();
    for (const doc of docs) {
      if (!doc.ruta_archivo) continue;
      const sedeName = doc.cliente_nombre_sede || 'Sede Principal';
      if (!informesPorSede.has(sedeName)) informesPorSede.set(sedeName, []);
      informesPorSede.get(sedeName)!.push(
        `${doc.numero_orden || doc.numero_documento} - ${doc.nombre_equipo || 'Equipo'}`
      );
    }
    for (const [sede, items] of informesPorSede) {
      sedesResumen.push(`<tr><td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:600;background:#f9fafb;">${sede}</td><td style="padding:8px 12px;border:1px solid #e5e7eb;">${items.length} informe(s)</td></tr>`);
    }

    // 6. Enviar emails (uno o múltiples batches) rastreando qué informes salieron en cada batch exitoso
    let emailsEnviadosExitosamente = 0;
    let emailsFallidos = 0;
    const erroresEmails: string[] = [];
    const docsEnviadosExitosamente: Array<{
      doc: any;
      asuntoBatch: string;
      messageId: string | null;
    }> = [];

    for (const batch of emailBatches) {
      const { attachments: batchAttachments, batchNumber, totalBatches } = batch;

      // Construir asunto con número de parte si hay múltiples
      const batchSuffix = totalBatches > 1 ? ` (Parte ${batchNumber}/${totalBatches})` : '';
      const asuntoBatch = (dto.asunto_personalizado || `Informes de Mantenimiento ${categoriaLabel} - ${periodoLabel} | ${nombreCliente}`) + batchSuffix;

      // Construir HTML para este batch
      const htmlBatch = `
      <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;max-width:650px;margin:0 auto;background:#ffffff;">
        <div style="background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%);padding:32px 24px;text-align:center;">
          <h1 style="color:#ffffff;margin:0;font-size:22px;">MEKANOS S.A.S</h1>
          <p style="color:#93c5fd;margin:8px 0 0;font-size:14px;">Informes de Mantenimiento${totalBatches > 1 ? ` - Parte ${batchNumber}/${totalBatches}` : ''}</p>
        </div>
        <div style="padding:24px;">
          <p style="font-size:16px;color:#111827;margin:0 0 8px;">Estimado(a) <strong>${nombreCliente}</strong>,</p>
          <p style="color:#374151;margin:0 0 16px;">
            Adjunto encontrará los informes de mantenimiento de <strong>${categoriaLabel}</strong>
            correspondientes al periodo <strong>${periodoLabel}</strong>${totalBatches > 1 ? ` (parte ${batchNumber} de ${totalBatches})` : ''}.
          </p>
          ${dto.mensaje_personalizado ? `<p style="margin:16px 0;color:#374151;">${dto.mensaje_personalizado}</p>` : ''}
          <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:16px;margin:16px 0;">
            <h3 style="margin:0 0 12px;color:#0369a1;font-size:15px;">Resumen por Sede</h3>
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              <thead>
                <tr style="background:#e0f2fe;">
                  <th style="padding:8px 12px;border:1px solid #bae6fd;text-align:left;">Sede</th>
                  <th style="padding:8px 12px;border:1px solid #bae6fd;text-align:left;">Informes</th>
                </tr>
              </thead>
              <tbody>${sedesResumen.join('')}</tbody>
            </table>
            <p style="margin:12px 0 0;font-size:13px;color:#6b7280;">
              <strong>Parte ${batchNumber}/${totalBatches}:</strong> ${batchAttachments.length} informe(s) adjunto(s)
              ${totalBatches > 1 ? `<br><strong>Total completo:</strong> ${attachments.length} informes en ${totalBatches} email(s)` : ''}
            </p>
          </div>
          <p style="color:#6b7280;font-size:13px;margin:24px 0 0;">
            Este correo fue generado automáticamente. Para consultas, comuníquese con su asesor de servicio.
          </p>
        </div>
        <div style="background:#f9fafb;padding:16px 24px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="color:#9ca3af;font-size:12px;margin:0;">MEKANOS S.A.S - Soluciones en Energía e Hidroneumática</p>
        </div>
      </div>`;

      this.logger.log(`[BITACORA BATCH ${batchNumber}/${totalBatches}] Enviando a: ${destinatarios[0]} | Adjuntos: ${batchAttachments.length}`);

      try {
        const emailResult = await this.emailService.sendEmailFromAccount({
          to: destinatarios[0],
          subject: asuntoBatch,
          html: htmlBatch,
          attachments: batchAttachments.map(({ filename, content, contentType }) => ({
            filename,
            content,
            contentType,
          })),
          ...(destinatarios.length > 1 ? { cc: destinatarios.slice(1) } : {}),
        }, principal.id_cuenta_email_remitente ?? undefined);

        if (emailResult.success) {
          emailsEnviadosExitosamente++;
          for (const item of batchAttachments) {
            docsEnviadosExitosamente.push({
              doc: item.doc,
              asuntoBatch,
              messageId: emailResult.messageId || null,
            });
          }
          this.logger.log(`[BITACORA BATCH ${batchNumber}/${totalBatches}] ✅ Enviado exitosamente`);
        } else {
          emailsFallidos++;
          erroresEmails.push(`Parte ${batchNumber}: ${emailResult.error}`);
          this.logger.error(`[BITACORA BATCH ${batchNumber}/${totalBatches}] ❌ Error: ${emailResult.error}`);
        }
      } catch (error) {
        emailsFallidos++;
        const errorMsg = `Parte ${batchNumber}: ${error}`;
        erroresEmails.push(errorMsg);
        this.logger.error(`[BITACORA BATCH ${batchNumber}/${totalBatches}] ❌ Error: ${error}`);
      }
    }

    // 7. Actualizar bitácora, persistir bitacoras_informes y marcar órdenes como ENVIADAS en historial_emails_enviados
    const envioExitoso = emailsEnviadosExitosamente > 0;
    if (envioExitoso) {
      const fechaEnvioAhora = new Date();

      await this.prisma.bitacoras.update({
        where: { id_bitacora: bitacora.id_bitacora },
        data: {
          estado_bitacora: 'ENVIADA',
          cantidad_informes: docsEnviadosExitosamente.length,
          enviada_cliente_fecha: fechaEnvioAhora,
          metodo_envio: 'EMAIL',
          observaciones: esRangoFechas
            ? `Bitácora ${categoriaLabel} - ${docsEnviadosExitosamente.length} informes enviados (Rango: ${dto.fecha_inicio} a ${dto.fecha_fin}) en ${emailBatches.length} email(s)`
            : `Bitácora ${categoriaLabel} - ${docsEnviadosExitosamente.length} informes enviados en ${emailBatches.length} email(s)`,
        },
      });

      // 7a. Vincular cada informe enviado en bitacoras_informes (creando el registro en `informes` si aún no existía)
      try {
        const sentDocIds = Array.from(
          new Set(docsEnviadosExitosamente.map((x) => Number(x.doc.id_documento)).filter(Boolean)),
        );
        const sentOrdenIds = Array.from(
          new Set(docsEnviadosExitosamente.map((x) => Number(x.doc.id_orden_servicio)).filter(Boolean)),
        );

        const informesExistentes = await this.prisma.informes.findMany({
          where: {
            OR: [
              ...(sentDocIds.length > 0 ? [{ id_documento_pdf: { in: sentDocIds } }] : []),
              ...(sentOrdenIds.length > 0 ? [{ id_orden_servicio: { in: sentOrdenIds } }] : []),
            ],
          },
          orderBy: { id_informe: 'desc' },
        });

        const informePorDoc = new Map<number, any>();
        const informePorOrden = new Map<number, any>();
        for (const inf of informesExistentes) {
          if (inf.id_documento_pdf && !informePorDoc.has(inf.id_documento_pdf)) {
            informePorDoc.set(inf.id_documento_pdf, inf);
          }
          if (inf.id_orden_servicio && !informePorOrden.has(inf.id_orden_servicio)) {
            informePorOrden.set(inf.id_orden_servicio, inf);
          }
        }

        const informesVinculadosSet = new Set<number>();
        let ordenBitacora = 0;

        for (const item of docsEnviadosExitosamente) {
          const doc = item.doc;
          const idDoc = Number(doc.id_documento);
          const idOs = Number(doc.id_orden_servicio);

          let informe = informePorDoc.get(idDoc) || informePorOrden.get(idOs);
          if (!informe) {
            informe = await this.prisma.informes.create({
              data: {
                numero_informe: String(doc.numero_documento || `INF-${doc.numero_orden || idDoc}`).slice(0, 50),
                id_orden_servicio: idOs,
                id_documento_pdf: idDoc,
                generado_por: usuario_id,
                estado_informe: 'APROBADO',
                observaciones: `Registrado automáticamente desde bitácora ${bitacora.numero_bitacora}`,
              },
            });
            informePorDoc.set(idDoc, informe);
            informePorOrden.set(idOs, informe);
          } else if (!informe.id_documento_pdf) {
            await this.prisma.informes.update({
              where: { id_informe: informe.id_informe },
              data: { id_documento_pdf: idDoc },
            });
          }

          if (!informesVinculadosSet.has(informe.id_informe)) {
            informesVinculadosSet.add(informe.id_informe);
            ordenBitacora += 1;
            await this.prisma.bitacoras_informes.create({
              data: {
                id_bitacora: bitacora.id_bitacora,
                id_informe: informe.id_informe,
                orden_bitacora: ordenBitacora,
              },
            });
          }
        }
        this.logger.log(`[BITACORA] Vinculados ${ordenBitacora} informes en bitacoras_informes para ${bitacora.numero_bitacora}`);
      } catch (errLink) {
        this.logger.error(`[BITACORA] Error registrando bitacoras_informes: ${(errLink as Error).message}`);
      }

      // 7b. Registrar envío en historial_emails_enviados de CADA orden para activar el check/badge "ENVIADO" (✉️ N)
      try {
        const ordenesRegistradas = new Set<number>();
        const ccStr = destinatarios.length > 1 ? destinatarios.slice(1).join(', ').slice(0, 500) : null;
        const toStr = destinatarios[0].slice(0, 300);

        for (const item of docsEnviadosExitosamente) {
          const idOs = Number(item.doc.id_orden_servicio);
          if (!idOs || ordenesRegistradas.has(idOs)) continue;
          ordenesRegistradas.add(idOs);

          await this.prisma.historial_emails_enviados.create({
            data: {
              id_orden_servicio: idOs,
              destinatario_to: toStr,
              destinatarios_cc: ccStr,
              asunto: `[${bitacora.numero_bitacora}] ${item.asuntoBatch}`.slice(0, 500),
              estado_envio: 'EXITOSO',
              message_id: item.messageId ? String(item.messageId).slice(0, 300) : null,
              url_pdf_enviado: item.doc.ruta_archivo ? String(item.doc.ruta_archivo).slice(0, 500) : null,
              origen_envio: 'BITACORA',
              fecha_envio: fechaEnvioAhora,
              enviado_por: usuario_id,
            },
          });
        }
        this.logger.log(`[BITACORA] ${ordenesRegistradas.size} orden(es) marcadas como ENVIADAS en historial_emails_enviados`);
      } catch (errHist) {
        this.logger.error(`[BITACORA] Error registrando historial_emails_enviados: ${(errHist as Error).message}`);
      }

      this.logger.log(`[BITACORA] Enviada exitosamente: ${bitacora.numero_bitacora} (${emailsEnviadosExitosamente}/${emailBatches.length} emails)`);
    }

    return {
      success: envioExitoso,
      id_bitacora: bitacora.id_bitacora,
      informes_enviados: envioExitoso ? docsEnviadosExitosamente.length : 0,
      informes_fallidos: informesFallidos,
      emails_enviados: emailsEnviadosExitosamente,
      emails_fallidos: emailsFallidos,
      total_batches: emailBatches.length,
      email_enviado: envioExitoso,
      destinatarios,
      error: erroresEmails.length > 0 ? erroresEmails.join('; ') : undefined,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // HISTORIAL: Bitácoras anteriores de un cliente (con detalle de informes enviados)
  // ═══════════════════════════════════════════════════════════════

  async historialPorCliente(idCliente: number) {
    const bitacoras = await this.prisma.bitacoras.findMany({
      where: { id_cliente: idCliente },
      include: {
        bitacoras_informes: {
          orderBy: { orden_bitacora: 'asc' },
          include: {
            informes: {
              include: {
                documentos_generados: {
                  select: {
                    id_documento: true,
                    ruta_archivo: true,
                    numero_documento: true,
                  },
                },
                ordenes_servicio: {
                  select: {
                    id_orden_servicio: true,
                    numero_orden: true,
                    fecha_programada: true,
                    fecha_inicio_real: true,
                    equipos: {
                      select: {
                        nombre_equipo: true,
                        codigo_equipo: true,
                      },
                    },
                    tipos_servicio: {
                      select: {
                        nombre_tipo: true,
                      },
                    },
                    clientes: {
                      select: {
                        nombre_sede: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [{ fecha_generacion: 'desc' }, { id_bitacora: 'desc' }],
      take: 30,
    });

    return bitacoras.map((b) => {
      const informes_enviados: InformeHistorialBitacora[] = (b.bitacoras_informes || [])
        .filter((bi) => Boolean(bi.informes))
        .map((bi) => {
          const inf = bi.informes;
          const os = inf.ordenes_servicio;
          const dg = inf.documentos_generados;
          return {
            id_informe: inf.id_informe,
            id_documento: dg?.id_documento ?? inf.id_documento_pdf ?? null,
            id_orden_servicio: inf.id_orden_servicio ?? os?.id_orden_servicio,
            numero_orden: os?.numero_orden || inf.numero_informe,
            equipo_nombre: os?.equipos?.nombre_equipo || 'N/A',
            equipo_codigo: os?.equipos?.codigo_equipo || null,
            tipo_servicio: os?.tipos_servicio?.nombre_tipo || null,
            nombre_sede: os?.clientes?.nombre_sede || null,
            fecha_servicio: os?.fecha_inicio_real
              ? new Date(os.fecha_inicio_real).toISOString()
              : os?.fecha_programada
                ? new Date(os.fecha_programada).toISOString()
                : null,
            pdf_url: dg?.ruta_archivo || null,
            orden_bitacora: bi.orden_bitacora,
          };
        });

      return {
        id_bitacora: b.id_bitacora,
        numero_bitacora: b.numero_bitacora,
        mes: b.mes,
        anio: b.anio,
        estado_bitacora: b.estado_bitacora,
        cantidad_informes: b.cantidad_informes,
        fecha_generacion: b.fecha_generacion,
        enviada_cliente_fecha: b.enviada_cliente_fecha,
        metodo_envio: b.metodo_envio,
        observaciones: b.observaciones,
        bitacoras_informes: b.bitacoras_informes.map((bi) => ({ id_informe: bi.id_informe })),
        informes_enviados,
      };
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // DIAGNÓSTICO: Meses con informes disponibles para un cliente
  // ═══════════════════════════════════════════════════════════════

  async mesesDisponibles(idClientePrincipal: number, categoria?: string, tipoServicio?: string) {
    // 1. Obtener principal + sedes
    const principal = await this.prisma.clientes.findUnique({
      where: { id_cliente: idClientePrincipal },
      include: {
        sedes: {
          where: { cliente_activo: true },
          select: { id_cliente: true },
        },
      },
    });

    if (!principal) {
      throw new NotFoundException(`Cliente ${idClientePrincipal} no encontrado`);
    }

    const clienteIds = [
      idClientePrincipal,
      ...principal.sedes.map(s => s.id_cliente),
    ];

    const categoriasList = parseCsvFilter(categoria);
    const tiposServicioList = parseCsvFilter(tipoServicio);

    this.logger.log(`[BITACORA MESES] Principal=${idClientePrincipal} | Sedes=${principal.sedes.length} | Cat: ${categoriasList.join(',') || 'TODAS'}`);

    const categoriaSql =
      categoriasList.length > 0
        ? Prisma.sql`AND te.categoria::text IN (${Prisma.join(categoriasList)})`
        : Prisma.empty;

    const tipoServicioSql =
      tiposServicioList.length > 0
        ? Prisma.sql`AND ts.codigo_tipo IN (${Prisma.join(tiposServicioList)})`
        : Prisma.empty;

    const meses: any[] =
      clienteIds.length === 0
        ? []
        : await this.prisma.$queryRaw`
      SELECT
        EXTRACT(MONTH FROM os.fecha_programada)::int AS mes,
        EXTRACT(YEAR FROM os.fecha_programada)::int AS anio,
        COUNT(*)::int AS count
      FROM documentos_generados dg
      JOIN ordenes_servicio os ON os.id_orden_servicio = dg.id_referencia
      LEFT JOIN equipos e ON e.id_equipo = os.id_equipo
      LEFT JOIN tipos_equipo te ON te.id_tipo_equipo = e.id_tipo_equipo
      LEFT JOIN tipos_servicio ts ON ts.id_tipo_servicio = os.id_tipo_servicio
      WHERE dg.tipo_documento = 'INFORME_SERVICIO'
        AND os.fecha_programada IS NOT NULL
        AND os.id_cliente IN (${Prisma.join(clienteIds)})
        ${categoriaSql}
        ${tipoServicioSql}
      GROUP BY anio, mes
      ORDER BY anio DESC, mes DESC
    `;

    const totalDocs = meses.reduce((sum, m) => sum + m.count, 0);
    this.logger.log(`[BITACORA MESES] Meses con datos=${meses.length} | Total docs=${totalDocs}`);

    return {
      id_cliente: idClientePrincipal,
      categoria: categoriasList.length > 0 ? categoriasList.join(',') : 'TODAS',
      total_ordenes_con_informes: totalDocs,
      meses,
    };
  }
}
