import { PrismaService } from '@mekanos/database';
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
  sedes: SedeGroup[];
  total_informes: number;
  total_con_pdf: number;
  total_sin_pdf: number;
  emails_destinatarios: string[];
  id_cuenta_email_remitente: number | null;
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

    // 3. Calcular rango de fechas del mes (DATE type en PostgreSQL)
    const fechaInicio = `${anio}-${String(mes).padStart(2, '0')}-01`;
    // Último día del mes
    const ultimoDia = new Date(anio, mes, 0).getDate();
    const fechaFin = `${anio}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;

    // 4. Query SQL directo: documentos_generados → ordenes_servicio → equipos → clientes
    const conditions: string[] = [
      `dg.tipo_documento = 'INFORME_SERVICIO'`,
      `os.fecha_programada >= '${fechaInicio}'::date`,
      `os.fecha_programada <= '${fechaFin}'::date`,
    ];

    // Filtro por cliente IDs (placeholders)
    const placeholders = clienteIds.map((_, i) => `$${i + 1}`).join(',');
    conditions.push(`os.id_cliente IN (${placeholders})`);

    // Filtro por categoría de equipo
    if (categoria) {
      conditions.push(`te.categoria = '${categoria}'::categoria_equipo_enum`);
    }

    const whereClause = conditions.join(' AND ');

    const sql = `
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
      WHERE ${whereClause}
      ORDER BY os.id_cliente ASC, os.fecha_programada ASC
    `;

    const rows: any[] = await this.prisma.$queryRawUnsafe(sql, ...clienteIds);

    this.logger.log(`[BITACORA PREVIEW] Encontrados ${rows.length} documentos/informes PDF`);

    // 5. Agrupar por sede (id_cliente)
    const sedesMap = new Map<number, SedeGroup>();
    const clienteCorto = nombrePrincipal.substring(0, 20).toUpperCase().replace(/\s+/g, '_');

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
      categoria_filtro: categoria || 'TODAS',
      sedes,
      total_informes: totalInformes,
      total_con_pdf: totalInformes, // All docs from documentos_generados have a PDF
      total_sin_pdf: 0,
      emails_destinatarios: Array.from(emailsSet),
      id_cuenta_email_remitente: principal.id_cuenta_email_remitente,
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

    // 2. Obtener documentos con sus datos (SQL directo por coherencia)
    const docPlaceholders = documentos_ids.map((_, i) => `$${i + 1}`).join(',');
    const docsSql = `
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
      WHERE dg.id_documento IN (${docPlaceholders})
        AND dg.tipo_documento = 'INFORME_SERVICIO'
    `;

    const docs: any[] = await this.prisma.$queryRawUnsafe(docsSql, ...documentos_ids);
    this.logger.log(`[BITACORA ENVIAR] ${docs.length} documentos encontrados de ${documentos_ids.length} solicitados`);

    // 3. Descargar PDFs
    const attachments: { filename: string; content: Buffer; contentType: string }[] = [];
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
    const MAX_SIZE_MB = 20; // 20MB límite seguro para Gmail (25MB máximo)
    const MAX_PDFS_PER_BATCH = 10; // Máximo 10 PDFs por email

    const totalSizeBytes = attachments.reduce((sum, att) => sum + att.content.length, 0);
    const totalSizeMB = totalSizeBytes / (1024 * 1024);

    this.logger.log(`[BITACORA] Total PDFs: ${attachments.length} | Tamaño total: ${totalSizeMB.toFixed(2)}MB`);

    let emailBatches: { attachments: typeof attachments; batchNumber: number; totalBatches: number }[] = [];

    if (totalSizeMB > MAX_SIZE_MB || attachments.length > MAX_PDFS_PER_BATCH) {
      // Dividir en batches
      const numBatches = Math.ceil(attachments.length / MAX_PDFS_PER_BATCH);
      this.logger.log(`[BITACORA] Dividiendo en ${numBatches} emails (tamaño/límite excedido)`);

      for (let i = 0; i < numBatches; i++) {
        const startIdx = i * MAX_PDFS_PER_BATCH;
        const endIdx = Math.min(startIdx + MAX_PDFS_PER_BATCH, attachments.length);
        const batchAttachments = attachments.slice(startIdx, endIdx);

        emailBatches.push({
          attachments: batchAttachments,
          batchNumber: i + 1,
          totalBatches: numBatches,
        });
      }
    } else {
      // Un solo email
      emailBatches = [{
        attachments,
        batchNumber: 1,
        totalBatches: 1,
      }];
    }

    // 4. Crear registro de bitácora
    const numeroBitacora = `BIT-${anio}${String(mes).padStart(2, '0')}-${id_cliente_principal}`;

    const bitacora = await this.prisma.bitacoras.create({
      data: {
        numero_bitacora: numeroBitacora,
        id_cliente: id_cliente_principal,
        mes,
        anio,
        generado_por: usuario_id,
        estado_bitacora: 'BORRADOR',
        cantidad_informes: attachments.length,
        observaciones: `Bitácora ${categoria} - ${attachments.length} informes${emailBatches.length > 1 ? ` (enviada en ${emailBatches.length} partes)` : ''}`,
      },
    });

    // 5. Construir email
    const nombreCliente = principal.persona?.nombre_comercial || principal.persona?.razon_social || 'Cliente';
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const mesNombre = meses[mes - 1] || `Mes ${mes}`;
    const categoriaLabel = categoria === 'ENERGIA' ? 'Plantas Eléctricas' : categoria === 'HIDRAULICA' ? 'Bombas' : categoria || 'Equipos';

    // Recopilar destinatarios
    const destinatarios: string[] = [];
    const emailPrincipal = dto.email_destino || principal.persona?.email_principal;
    if (emailPrincipal) destinatarios.push(emailPrincipal);

    if (principal.emails_notificacion) {
      const extras = principal.emails_notificacion.split(';;')
        .map(e => e.trim())
        .filter(e => e.length > 0 && e.includes('@'));
      for (const extra of extras) {
        if (!destinatarios.includes(extra)) destinatarios.push(extra);
      }
    }

    if (dto.emails_cc) {
      for (const cc of dto.emails_cc) {
        if (cc.includes('@') && !destinatarios.includes(cc)) {
          destinatarios.push(cc);
        }
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

    // 6. Enviar emails (uno o múltiples batches)
    let emailsEnviadosExitosamente = 0;
    let emailsFallidos = 0;
    const erroresEmails: string[] = [];

    for (const batch of emailBatches) {
      const { attachments: batchAttachments, batchNumber, totalBatches } = batch;

      // Construir asunto con número de parte si hay múltiples
      const batchSuffix = totalBatches > 1 ? ` (Parte ${batchNumber}/${totalBatches})` : '';
      const asuntoBatch = (dto.asunto_personalizado || `Informes de Mantenimiento ${categoriaLabel} - ${mesNombre} ${anio} | ${nombreCliente}`) + batchSuffix;

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
            correspondientes al mes de <strong>${mesNombre} ${anio}</strong>${totalBatches > 1 ? ` (parte ${batchNumber} de ${totalBatches})` : ''}.
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
          attachments: batchAttachments,
          ...(destinatarios.length > 1 ? { cc: destinatarios.slice(1) } : {}),
        }, principal.id_cuenta_email_remitente ?? undefined);

        if (emailResult.success) {
          emailsEnviadosExitosamente++;
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

    // 7. Actualizar bitácora
    const envioExitoso = emailsEnviadosExitosamente > 0;
    if (envioExitoso) {
      await this.prisma.bitacoras.update({
        where: { id_bitacora: bitacora.id_bitacora },
        data: {
          estado_bitacora: 'ENVIADA',
          enviada_cliente_fecha: new Date(),
          metodo_envio: 'EMAIL',
          observaciones: `Bitácora ${categoria} - ${attachments.length} informes enviados en ${emailBatches.length} email(s)`,
        },
      });

      this.logger.log(`[BITACORA] Enviada exitosamente: ${bitacora.numero_bitacora} (${emailsEnviadosExitosamente}/${emailBatches.length} emails)`);
    }

    return {
      success: envioExitoso,
      id_bitacora: bitacora.id_bitacora,
      informes_enviados: attachments.length,
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
  // HISTORIAL: Bitácoras anteriores de un cliente
  // ═══════════════════════════════════════════════════════════════

  async historialPorCliente(idCliente: number) {
    return this.prisma.bitacoras.findMany({
      where: { id_cliente: idCliente },
      include: {
        bitacoras_informes: {
          select: { id_informe: true },
        },
      },
      orderBy: [{ anio: 'desc' }, { mes: 'desc' }],
      take: 24,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // DIAGNÓSTICO: Meses con informes disponibles para un cliente
  // ═══════════════════════════════════════════════════════════════

  async mesesDisponibles(idClientePrincipal: number, categoria?: string) {
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

    this.logger.log(`[BITACORA MESES] Principal=${idClientePrincipal} | Sedes=${principal.sedes.length} | Cat: ${categoria || 'TODAS'}`);

    // 2. Query SQL directo: documentos_generados → ordenes_servicio, agrupado por mes/año
    const conditions: string[] = [
      `dg.tipo_documento = 'INFORME_SERVICIO'`,
      `os.fecha_programada IS NOT NULL`,
    ];

    const placeholders = clienteIds.map((_, i) => `$${i + 1}`).join(',');
    conditions.push(`os.id_cliente IN (${placeholders})`);

    if (categoria) {
      conditions.push(`te.categoria = '${categoria}'::categoria_equipo_enum`);
    }

    const whereClause = conditions.join(' AND ');

    const sql = `
      SELECT
        EXTRACT(MONTH FROM os.fecha_programada)::int AS mes,
        EXTRACT(YEAR FROM os.fecha_programada)::int AS anio,
        COUNT(*)::int AS count
      FROM documentos_generados dg
      JOIN ordenes_servicio os ON os.id_orden_servicio = dg.id_referencia
      LEFT JOIN equipos e ON e.id_equipo = os.id_equipo
      LEFT JOIN tipos_equipo te ON te.id_tipo_equipo = e.id_tipo_equipo
      WHERE ${whereClause}
      GROUP BY anio, mes
      ORDER BY anio DESC, mes DESC
    `;

    const meses: any[] = await this.prisma.$queryRawUnsafe(sql, ...clienteIds);

    const totalDocs = meses.reduce((sum, m) => sum + m.count, 0);
    this.logger.log(`[BITACORA MESES] Meses con datos=${meses.length} | Total docs=${totalDocs}`);

    return {
      id_cliente: idClientePrincipal,
      categoria: categoria || 'TODAS',
      total_ordenes_con_informes: totalDocs,
      meses,
    };
  }
}
