/**
 * PdfAssemblerService - Servicio Canónico de Ensamblaje Documental White-Label EAM
 *
 * Consolida en un único punto la carga de relaciones, transformación multi-equipo,
 * resolución metrológica, formateo regional/zona horaria, determinación declarativa
 * de plantilla y contexto de branding corporativo para:
 * - Órdenes de Servicio (GET /ordenes/:id/pdf, POST /ordenes/:id/pdf/regenerar, FinalizacionOrdenService)
 * - Cotizaciones Comerciales (GET /cotizaciones/:id/pdf, EnviarCotizacionHandler)
 */

import { PrismaService } from '@mekanos/database';
import { Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import {
  evaluarValorContraRangos,
  extraerConfigEquipoDeOrden,
  resolverParametroConConfig,
} from '../config-parametros/parametros-override.helper';
import { ConfiguracionOrganizacionService } from '../configuracion-organizacion/configuracion-organizacion.service';
import { EquipoSpecsReader } from '../equipos/services/equipo-specs.reader';
import {
  OrgBrandingContext,
  buildOrgBranding,
  formatCalendarDateOrg,
} from './org-branding.types';
import { InformeFilenameInput, buildInformeFilename } from './pdf-naming.helper';
import { PdfService, TipoInforme } from './pdf.service';
import {
  ActividadPDF,
  DatosCotizacionPDF,
  DatosEquipoDetalladoPDF,
  DatosOrdenPDF,
  MedicionPDF,
  RepuestoUtilizadoPDF,
} from './templates';

export interface OrdenEmailContext {
  clienteNombre: string;
  clienteEmails: string[];
  clienteDireccion?: string;
  ciudad: string;
  marcaEquipo?: string;
  serieEquipo?: string;
  fechaServicio: string;
  tipoServicioNombre: string;
  tipoServicioDetallado: string;
}

export interface AssembledOrdenPdf {
  orden: any;
  datosOrden: DatosOrdenPDF;
  tipoInforme: TipoInforme;
  branding: OrgBrandingContext;
  emailContext: OrdenEmailContext;
  downloadFilename: string;
}

export interface AssembledCotizacionPdf {
  cotizacion: any;
  datosCotizacion: DatosCotizacionPDF;
  branding: OrgBrandingContext;
}

@Injectable()
export class PdfAssemblerService {
  private readonly logger = new Logger(PdfAssemblerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfService: PdfService,
    @Optional() private readonly configOrgService?: ConfiguracionOrganizacionService,
  ) {}

  /**
   * Resuelve el contexto White-Label de la organización.
   */
  async resolveBranding(override?: Partial<OrgBrandingContext>): Promise<OrgBrandingContext> {
    if (typeof this.pdfService?.resolveBranding === 'function') {
      return this.pdfService.resolveBranding(override);
    }
    const cfg = await this.configOrgService?.getContext().catch(() => null);
    return {
      ...buildOrgBranding(cfg),
      ...(override || {}),
    } as OrgBrandingContext;
  }

  /**
   * Include canónico para órdenes de servicio usadas en informes PDF.
   */
  buildOrdenInclude() {
    return {
      equipos: {
        include: {
          tipos_equipo: {
            include: {
              tipo_equipo_modulos: {
                include: {
                  modulo: {
                    include: {
                      modulo_atributos: {
                        include: {
                          atributo: {
                            include: { unidad_defecto: true },
                          },
                        },
                        orderBy: [{ grupo_visual: 'asc' as const }, { orden_visual: 'asc' as const }],
                      },
                    },
                  },
                },
                orderBy: { orden_visual: 'asc' as const },
              },
            },
          },
          equipos_atributos_filtro: true,
          equipos_generador: true,
          equipos_motor: true,
          equipos_bomba: true,
        },
      },
      clientes: {
        include: {
          persona: true,
          cliente_principal: {
            select: {
              emails_notificacion: true,
              id_cuenta_email_remitente: true,
            },
          },
        },
      },
      estados_orden: true,
      empleados_ordenes_servicio_id_tecnico_asignadoToempleados: {
        include: {
          persona: true,
        },
      },
      tipos_servicio: true,
      orden_padre: { select: { numero_orden: true } },
      ordenes_pendientes: {
        orderBy: { id_orden_pendiente: 'asc' as const },
      },
      actividades_ejecutadas: {
        include: {
          catalogo_actividades: {
            include: {
              catalogo_sistemas: true,
            },
          },
          ordenes_equipos: {
            include: {
              equipos: true,
            },
          },
        },
      },
      mediciones_servicio: {
        include: {
          parametros_medicion: true,
          ordenes_equipos: {
            include: {
              equipos: true,
            },
          },
        },
      },
      evidencias_fotograficas: {
        include: {
          ordenes_equipos: {
            include: {
              equipos: true,
            },
          },
        },
      },
      ordenes_equipos: {
        include: {
          equipos: {
            include: {
              tipos_equipo: true,
            },
          },
        },
        orderBy: {
          orden_secuencia: 'asc' as const,
        },
      },
      firmas_digitales_ordenes_servicio_id_firma_tecnicoTofirmas_digitales: {
        include: {
          persona: true,
        },
      },
      firmas_digitales: {
        include: {
          persona: true,
        },
      },
      sedes_cliente: true,
      componentes_usados: {
        include: {
          catalogo_componentes: true,
          ubicaciones_bodega: true,
          lotes_componentes: true,
        },
        orderBy: { id_componente_usado: 'asc' as const },
      },
    };
  }

  /**
   * Ensambla por completo el payload PDF + metadatos White-Label de una orden de servicio.
   */
  async assembleOrdenPdf(
    idOrOrden: number | any,
    tipoSolicitado?: TipoInforme,
  ): Promise<AssembledOrdenPdf> {
    const brand = await this.resolveBranding();
    const orden =
      typeof idOrOrden === 'number'
        ? ((await this.prisma.ordenes_servicio.findUnique({
            where: { id_orden_servicio: idOrOrden },
            include: this.buildOrdenInclude(),
          })) as any)
        : idOrOrden;

    const idRef = typeof idOrOrden === 'number' ? idOrOrden : orden?.id_orden_servicio;
    if (!orden) {
      throw new NotFoundException(`Orden con ID ${idRef ?? ''} no encontrada`);
    }

    if (Array.isArray(orden.actividades_ejecutadas)) {
      orden.actividades_ejecutadas.sort((a: any, b: any) => {
        const seqA = a.orden_secuencia ?? Infinity;
        const seqB = b.orden_secuencia ?? Infinity;
        if (seqA !== seqB) return seqA - seqB;
        return (a.id_actividad_ejecutada ?? 0) - (b.id_actividad_ejecutada ?? 0);
      });
    }

    const esMultiEquipo = (orden.ordenes_equipos?.length || 0) > 1;
    if (esMultiEquipo && Array.isArray(orden.ordenes_equipos)) {
      const secuencias = orden.ordenes_equipos.map((oe: any) => oe.orden_secuencia);
      if (secuencias.every((s: number) => s === secuencias[0])) {
        orden.ordenes_equipos.forEach((oe: any, idx: number) => {
          oe.orden_secuencia = idx + 1;
        });
      }
    }

    const clientePersona = orden.clientes?.persona;
    const clienteNombreBase =
      clientePersona?.razon_social ||
      clientePersona?.nombre_comercial ||
      clientePersona?.nombre_completo ||
      'N/A';
    const clienteNombre = orden.clientes?.nombre_sede
      ? `${clienteNombreBase} - ${orden.clientes.nombre_sede}`
      : clienteNombreBase;
    const clienteDireccion =
      orden.sedes_cliente?.direccion_sede || clientePersona?.direccion_principal || 'N/A';
    const ciudad =
      orden.sedes_cliente?.ciudad_sede || clientePersona?.ciudad || brand.ciudadDefecto || '';

    const clienteEmails = this.collectClienteEmails(orden);

    const marcaEquipo = orden.equipos ? EquipoSpecsReader.getMarca(orden.equipos) : 'N/A';
    const serieEquipo = orden.equipos ? EquipoSpecsReader.getSerie(orden.equipos) : 'N/A';

    const equiposOrden = esMultiEquipo
      ? orden.ordenes_equipos.map((oe: any) => ({
          idOrdenEquipo: oe.id_orden_equipo,
          ordenSecuencia: oe.orden_secuencia || 1,
          nombreSistema: oe.nombre_sistema || undefined,
          codigoEquipo: oe.equipos?.codigo_equipo || undefined,
          nombreEquipo: oe.equipos?.nombre_equipo || undefined,
          estado: oe.estado_equipo || 'PENDIENTE',
        }))
      : undefined;

    const lotesGaleria =
      orden.id_orden_servicio && typeof this.prisma.lotes_galeria?.findMany === 'function'
        ? await this.prisma.lotes_galeria.findMany({
            where: { id_orden_servicio: orden.id_orden_servicio },
            orderBy: [{ orden_lote: 'asc' }, { id_lote_galeria: 'asc' }],
            select: {
              id_lote_galeria: true,
              nombre_lote: true,
              orden_lote: true,
            },
          })
        : [];

    const actividadesPorEquipo = this.agruparActividadesPorEquipo(orden, esMultiEquipo);
    const medicionesPorEquipo = this.agruparMedicionesPorEquipo(orden, esMultiEquipo);
    const evidenciasPorEquipo = this.agruparEvidenciasPorEquipo(orden, esMultiEquipo);

    const firmaTecnico = orden.firmas_digitales_ordenes_servicio_id_firma_tecnicoTofirmas_digitales;
    const firmaCliente = orden.firmas_digitales;
    const datosModulo = this.extraerDatosModuloReal(orden.mediciones_servicio || []);
    const contadorPrevio = await this.obtenerContadorAnteriorEquipo(orden);

    const fechaBase = orden.fecha_inicio_real || orden.fecha_programada || new Date();
    const fechaFormateada = this.formatearFechaConBrand(fechaBase, brand);

    const datosOrden: DatosOrdenPDF = {
      branding: brand,
      cliente: clienteNombre,
      direccion: clienteDireccion,
      sede: orden.sedes_cliente?.nombre_sede || orden.clientes?.nombre_sede || undefined,
      marcaEquipo,
      serieEquipo,
      tipoEquipo: this.mapTipoEquipo(orden.equipos?.tipos_equipo?.nombre_tipo || ''),
      fecha: fechaFormateada,
      fechaSalida: orden.fecha_fin_real
        ? this.formatearFechaConBrand(orden.fecha_fin_real, brand)
        : undefined,
      diasDiferentes: this.sonDiasDiferentesConBrand(
        orden.fecha_inicio_real,
        orden.fecha_fin_real,
        brand,
      ),
      tecnico: this.resolverNombrePersona(
        orden.empleados_ordenes_servicio_id_tecnico_asignadoToempleados?.persona,
        'N/A',
      ),
      horaEntrada: this.formatearHoraConBrand(orden.fecha_inicio_real, brand),
      horaSalida: this.formatearHoraConBrand(orden.fecha_fin_real, brand),
      tipoServicio: (orden.tipos_servicio?.nombre_tipo || 'PREVENTIVO_A') as any,
      numeroOrden: orden.numero_orden || `ORD-${String(idRef ?? '').slice(0, 8)}`,
      numeroVisitaCaso: orden.numero_visita_caso || 1,
      tipoVisita: orden.tipo_visita || 'INICIAL',
      numeroOrdenPadre: orden.orden_padre?.numero_orden || undefined,
      datosModulo,
      actividades:
        orden.actividades_ejecutadas
          ?.filter((act: any) => !act.excluido_pdf)
          .map((act: any) => this.mapActividadEjecutada(act)) || [],
      mediciones:
        orden.mediciones_servicio
          ?.filter((med: any) => !med.excluido_pdf)
          .map((med: any) => this.mapMedicionConOverride(med, orden, med.id_orden_equipo)) || [],
      evidencias:
        orden.evidencias_fotograficas?.map((ev: any) => ({
          url: ev.ruta_archivo,
          caption: `${ev.tipo_evidencia || 'EVIDENCIA'}: ${ev.descripcion || ''}`.trim(),
          idLote: ev.id_lote_galeria || undefined,
        })) || [],
      lotesGaleria:
        lotesGaleria.length > 0
          ? lotesGaleria.map((l) => ({
              idLoteGaleria: l.id_lote_galeria,
              nombreLote: l.nombre_lote,
              ordenLote: l.orden_lote || 0,
            }))
          : undefined,
      observaciones: orden.observaciones_cierre || orden.observaciones || '',
      observaciones_tecnico: orden.observaciones_tecnico || undefined,
      repuestosWms: this.buildRepuestosWmsResumen(orden),
      repuestosDetallados: this.extraerRepuestosDetallados(orden),
      equipoDetalle: this.extraerEquipoDetallado(
        orden,
        datosModulo,
        contadorPrevio,
        brand,
      ),
      placaUniversal: orden.equipos
        ? EquipoSpecsReader.getPlacaUniversal(orden.equipos)
        : undefined,
      pendientes: (orden.ordenes_pendientes || []).map((p: any) => ({
        descripcion: p.descripcion,
        prioridad: p.prioridad,
        estado: p.estado,
        observaciones: p.observaciones || p.notas_resolucion || undefined,
      })),
      esMultiEquipo,
      equiposOrden,
      actividadesPorEquipo,
      medicionesPorEquipo,
      evidenciasPorEquipo,
      firmaTecnico: this.normalizeFirmaDataUrl(firmaTecnico?.firma_base64),
      firmaCliente: this.normalizeFirmaDataUrl(firmaCliente?.firma_base64),
      nombreTecnico: this.resolverNombrePersona(
        orden.empleados_ordenes_servicio_id_tecnico_asignadoToempleados?.persona,
      ),
      cargoTecnico: 'Técnico de Servicio',
      nombreCliente: this.resolverNombreFirmanteCliente(orden, firmaCliente, clientePersona),
      cargoCliente: orden.cargo_quien_recibe || 'Cliente / Autorizador',
    };

    const { tipoInforme, tipoEquipoNormalizado } = this.determinarTipoInformeDesdeOrden(
      orden,
      tipoSolicitado,
      datosOrden.marcaEquipo,
    );
    if (tipoEquipoNormalizado) {
      datosOrden.tipoEquipo = tipoEquipoNormalizado;
    }

    const tipoServicioNombre = orden.tipos_servicio?.nombre_tipo || 'Mantenimiento';
    const tipoServicioDetallado = this.resolverTipoServicioDetallado(orden);

    const downloadFilename = this.buildInformeFilenameFromOrden(orden, clienteNombre);

    return {
      orden,
      datosOrden,
      tipoInforme,
      branding: brand,
      emailContext: {
        clienteNombre,
        clienteEmails,
        clienteDireccion: clienteDireccion !== 'N/A' ? clienteDireccion : undefined,
        ciudad,
        marcaEquipo: marcaEquipo !== 'N/A' ? marcaEquipo : undefined,
        serieEquipo: serieEquipo !== 'N/A' ? serieEquipo : undefined,
        fechaServicio: fechaFormateada,
        tipoServicioNombre,
        tipoServicioDetallado,
      },
      downloadFilename,
    };
  }

  /**
   * Ensambla por completo el payload tipado DatosCotizacionPDF para una cotización comercial
   * (soporte Multi-Equipo N:M, Logística/Viáticos/Pólizas visibles, Ítems Opcionales y AIU).
   */
  async assembleCotizacionPdf(idOrCotizacion: number | any): Promise<AssembledCotizacionPdf> {
    const [brand, orgGov, cot] = await Promise.all([
      this.resolveBranding(),
      this.prisma.configuracion_organizacion
        .findUnique({
          where: { id_configuracion: 1 },
          select: { enable_cpq_governance: true },
        })
        .catch(() => null),
      typeof idOrCotizacion === 'number'
        ? (this.prisma.cotizaciones.findUnique({
            where: { id_cotizacion: idOrCotizacion },
            include: {
              clientes: { include: { persona: true } },
              sedes_cliente: true,
              equipos: { include: { tipos_equipo: true, modelos_equipo: true } },
              cotizaciones_equipos: {
                orderBy: { orden_secuencia: 'asc' },
                include: {
                  equipos: {
                    include: {
                      tipos_equipo: true,
                      modelos_equipo: true,
                      equipos_generador: true,
                      equipos_motor: true,
                      equipos_bomba: true,
                    },
                  },
                },
              },
              empleados: { include: { persona: true } },
              estados_cotizacion: true,
              items_cotizacion_servicios: {
                include: {
                  catalogo_servicios: true,
                  equipos: { select: { codigo_equipo: true, nombre_equipo: true } },
                },
                orderBy: [{ orden_item: 'asc' }, { id_item_servicio: 'asc' }],
              },
              items_cotizacion_componentes: {
                include: {
                  catalogo_componentes: true,
                  equipos: { select: { codigo_equipo: true, nombre_equipo: true } },
                },
                orderBy: [{ orden_item: 'asc' }, { id_item_componente: 'asc' }],
              },
              items_cotizacion_otros: {
                include: {
                  equipos: { select: { codigo_equipo: true, nombre_equipo: true } },
                },
                orderBy: [{ orden_item: 'asc' }, { id_item_otro: 'asc' }],
              },
            },
          }) as Promise<any>)
        : Promise.resolve(idOrCotizacion),
    ]);

    const idRef = typeof idOrCotizacion === 'number' ? idOrCotizacion : cot?.id_cotizacion;
    if (!cot) {
      throw new NotFoundException(`Cotización con ID ${idRef ?? ''} no encontrada`);
    }

    const serviciosActivos = (cot.items_cotizacion_servicios || []).filter((i: any) => !i.es_opcional);
    const componentesActivos = (cot.items_cotizacion_componentes || []).filter((i: any) => !i.es_opcional);
    const otrosVisiblesActivos = (cot.items_cotizacion_otros || []).filter(
      (i: any) => !i.es_opcional && i.visible_cliente !== false,
    );

    const itemsOpcionales = [
      ...(cot.items_cotizacion_servicios || [])
        .filter((i: any) => i.es_opcional)
        .map((i: any) => ({
          tipo: 'SERVICIO' as const,
          descripcion:
            i.descripcion_personalizada || i.catalogo_servicios?.nombre_servicio || 'Servicio',
          cantidad: Number(i.cantidad) || 1,
          unidad: i.unidad || 'servicio',
          precioUnitario: Number(i.precio_unitario) || 0,
          subtotal: Number(i.subtotal) || 0,
        })),
      ...(cot.items_cotizacion_componentes || [])
        .filter((i: any) => i.es_opcional)
        .map((i: any) => ({
          tipo: 'REPUESTO' as const,
          descripcion:
            i.descripcion || i.catalogo_componentes?.descripcion_corta || 'Componente',
          referencia:
            i.catalogo_componentes?.codigo_interno || i.referencia_manual || undefined,
          cantidad: Number(i.cantidad) || 1,
          unidad: i.unidad || 'unidad',
          precioUnitario: Number(i.precio_unitario) || 0,
          subtotal: Number(i.subtotal) || 0,
        })),
      ...(cot.items_cotizacion_otros || [])
        .filter((i: any) => i.es_opcional && i.visible_cliente !== false)
        .map((i: any) => ({
          tipo: 'OTRO' as const,
          descripcion: i.descripcion,
          cantidad: Number(i.cantidad) || 1,
          unidad: i.unidad || 'global',
          precioUnitario: Number(i.precio_unitario) || 0,
          subtotal: Number(i.subtotal) || 0,
        })),
    ];

    const subtotalServicios =
      cot.subtotal_servicios != null
        ? Number(cot.subtotal_servicios)
        : serviciosActivos.reduce((acc: number, item: any) => acc + (Number(item.subtotal) || 0), 0);
    const subtotalComponentes =
      cot.subtotal_componentes != null
        ? Number(cot.subtotal_componentes)
        : componentesActivos.reduce((acc: number, item: any) => acc + (Number(item.subtotal) || 0), 0);
    const subtotalOtros =
      cot.subtotal_otros != null
        ? Number(cot.subtotal_otros)
        : otrosVisiblesActivos.reduce((acc: number, item: any) => acc + (Number(item.subtotal) || 0), 0);
    const subtotalGeneral =
      cot.subtotal_general != null
        ? Number(cot.subtotal_general)
        : subtotalServicios + subtotalComponentes + subtotalOtros;
    const subtotalOpcionales =
      cot.subtotal_opcionales != null
        ? Number(cot.subtotal_opcionales)
        : itemsOpcionales.reduce((acc, item) => acc + item.subtotal, 0);
    const descuentoPorcentaje = Number(cot.descuento_porcentaje) || 0;
    const descuentoValor = Number(cot.descuento_valor) || 0;
    const subtotalConDescuento =
      cot.subtotal_con_descuento != null
        ? Number(cot.subtotal_con_descuento)
        : subtotalGeneral - descuentoValor;

    const usaAiu = Boolean(cot.usa_aiu);
    const aiuAdminPorcentaje = Number(cot.aiu_admin_porcentaje || 0);
    const aiuAdminValor = Number(cot.aiu_admin_valor || 0);
    const aiuImprevistosPorcentaje = Number(cot.aiu_imprevistos_porcentaje || 0);
    const aiuImprevistosValor = Number(cot.aiu_imprevistos_valor || 0);
    const aiuUtilidadPorcentaje = Number(cot.aiu_utilidad_porcentaje || 0);
    const aiuUtilidadValor = Number(cot.aiu_utilidad_valor || 0);
    const aiuValorTotal = Number(cot.aiu_valor_total || 0);
    const ivaSobreUtilidadAiu = Boolean(cot.iva_sobre_utilidad_aiu);

    const ivaPorcentaje =
      cot.iva_porcentaje != null ? Number(cot.iva_porcentaje) : brand.tasaImpuestoDefecto;
    const ivaValor =
      cot.iva_valor != null
        ? Number(cot.iva_valor)
        : (subtotalConDescuento * ivaPorcentaje) / 100;
    const totalCotizacion =
      cot.total_cotizacion != null
        ? Number(cot.total_cotizacion)
        : subtotalConDescuento + aiuValorTotal + ivaValor;

    const diasValidez = cot.dias_validez ?? brand.validezCotizacionDiasDefecto;
    const fechaBase = cot.fecha_cotizacion ? new Date(cot.fecha_cotizacion) : new Date();
    const fechaVencBase = cot.fecha_vencimiento
      ? new Date(cot.fecha_vencimiento)
      : new Date(fechaBase.getTime() + diasValidez * 86400000);

    const clientePersona = cot.clientes?.persona;
    const clienteNombreBase =
      clientePersona?.razon_social ||
      clientePersona?.nombre_comercial ||
      clientePersona?.nombre_completo ||
      'N/A';
    const nombreSede = cot.sedes_cliente?.nombre_sede || cot.clientes?.nombre_sede;
    const clienteNombre = nombreSede ? `${clienteNombreBase} - ${nombreSede}` : clienteNombreBase;

    const empleadoPersona = cot.empleados?.persona;
    const elaboradoPor =
      this.resolverNombrePersona(empleadoPersona) || `Equipo ${brand.nombreComercial}`;

    const mapEquipoPdf = (eq: any, notasAlcance?: string) => ({
      codigoEquipo: eq.codigo_equipo || undefined,
      nombreEquipo: eq.nombre_equipo || undefined,
      tipoEquipo: eq.tipos_equipo?.nombre_tipo || 'EQUIPO',
      marca: eq.modelos_equipo?.marca || EquipoSpecsReader.getMarca(eq),
      modelo: eq.modelos_equipo?.modelo || EquipoSpecsReader.getModelo(eq),
      serie: EquipoSpecsReader.getSerie(eq),
      ubicacion: eq.ubicacion_texto || undefined,
      notasAlcance: notasAlcance || undefined,
    });

    const equiposMulti = (cot.cotizaciones_equipos || [])
      .filter((ce: any) => ce.equipos)
      .map((ce: any) => mapEquipoPdf(ce.equipos, ce.notas_alcance));
    const equipoUnico =
      equiposMulti.length > 0
        ? equiposMulti[0]
        : cot.equipos
          ? mapEquipoPdf(cot.equipos)
          : undefined;

    const ESTADO_MAP: Record<number, string> = {
      1: 'BORRADOR',
      2: 'EN_REVISION',
      3: 'APROBADA_INTERNA',
      4: 'ENVIADA',
      5: 'APROBADA_CLIENTE',
      6: 'RECHAZADA',
      7: 'VENCIDA',
    };
    const estadoCodigo = String(
      cot.estados_cotizacion?.codigo_estado || ESTADO_MAP[Number(cot.id_estado)] || 'BORRADOR',
    )
      .trim()
      .toUpperCase();
    const estadosNoAutorizados = new Set(['BORRADOR', 'EN_REVISION', 'RECHAZADA']);
    const mostrarMarcaAguaBorrador =
      Boolean(orgGov?.enable_cpq_governance) && estadosNoAutorizados.has(estadoCodigo);

    const datosCotizacion: DatosCotizacionPDF = {
      branding: brand,
      numeroCotizacion: cot.numero_cotizacion || `COT-${idRef ?? ''}`,
      tipoCotizacion: cot.tipo_cotizacion || undefined,
      moneda: cot.moneda || brand.codigoMoneda,
      fechaCotizacion: formatCalendarDateOrg(cot.fecha_cotizacion ?? fechaBase, brand),
      fechaVencimiento: formatCalendarDateOrg(cot.fecha_vencimiento ?? fechaVencBase, brand),
      diasValidez,
      version: cot.version || 1,
      ordenCompraCliente: cot.orden_compra_cliente || undefined,
      estadoCodigo,
      mostrarMarcaAguaBorrador,
      textoMarcaAgua: 'BORRADOR — PENDIENTE DE APROBACIÓN',
      mostrarDesglosePrecios: Boolean(cot.mostrar_desglose_precios ?? false),
      atencionANombre: cot.atencion_a_nombre?.trim() || undefined,
      atencionACargo: cot.atencion_a_cargo?.trim() || undefined,
      cliente: {
        nombre: clienteNombre,
        nit: clientePersona?.numero_identificacion || undefined,
        direccion:
          cot.sedes_cliente?.direccion_sede ||
          clientePersona?.direccion_principal ||
          brand.ciudadDefecto ||
          'N/A',
        telefono:
          cot.sedes_cliente?.telefono_sede ||
          clientePersona?.telefono_principal ||
          clientePersona?.celular ||
          undefined,
        email: cot.sedes_cliente?.email_sede || clientePersona?.email_principal || undefined,
        contacto: cot.atencion_a_nombre?.trim() || undefined,
      },
      equipo: equipoUnico,
      equipos: equiposMulti.length > 0 ? equiposMulti : equipoUnico ? [equipoUnico] : [],
      asunto: cot.asunto || `Cotización ${cot.numero_cotizacion || ''}`.trim(),
      descripcionGeneral: cot.descripcion_general || undefined,
      alcanceTrabajo: cot.alcance_trabajo || undefined,
      exclusiones: cot.exclusiones || undefined,
      itemsServicios: serviciosActivos.map((item: any, idx: number) => ({
        orden: item.orden_item ?? idx + 1,
        descripcion:
          item.descripcion_personalizada ||
          item.catalogo_servicios?.nombre_servicio ||
          'Servicio',
        equipoEtiqueta: item.equipos?.codigo_equipo || undefined,
        cantidad: Number(item.cantidad) || 1,
        unidad: item.unidad || 'UND',
        precioUnitario: Number(item.precio_unitario) || 0,
        descuentoPorcentaje: Number(item.descuento_porcentaje) || 0,
        subtotal: Number(item.subtotal) || 0,
        ivaAplicable: item.iva_aplicable !== false,
        observaciones: item.observaciones || undefined,
      })),
      itemsComponentes: componentesActivos.map((item: any, idx: number) => ({
        orden: item.orden_item ?? idx + 1,
        descripcion:
          item.descripcion || item.catalogo_componentes?.descripcion_corta || 'Componente',
        referencia:
          item.catalogo_componentes?.codigo_interno || item.referencia_manual || undefined,
        marca: item.marca_manual || item.catalogo_componentes?.marca || undefined,
        equipoEtiqueta: item.equipos?.codigo_equipo || undefined,
        garantiaMeses: item.garantia_meses ?? undefined,
        cantidad: Number(item.cantidad) || 1,
        unidad: item.unidad || 'UND',
        precioUnitario: Number(item.precio_unitario) || 0,
        descuentoPorcentaje: Number(item.descuento_porcentaje) || 0,
        subtotal: Number(item.subtotal) || 0,
        ivaAplicable: item.iva_aplicable !== false,
      })),
      itemsOtros: otrosVisiblesActivos.map((item: any, idx: number) => ({
        orden: item.orden_item ?? idx + 1,
        categoriaRubro: item.categoria_rubro || 'OTRO',
        descripcion: item.descripcion,
        detalleCalculo: item.detalle_calculo || undefined,
        equipoEtiqueta: item.equipos?.codigo_equipo || undefined,
        cantidad: Number(item.cantidad) || 1,
        unidad: item.unidad || 'global',
        precioUnitario: Number(item.precio_unitario) || 0,
        descuentoPorcentaje: Number(item.descuento_porcentaje) || 0,
        subtotal: Number(item.subtotal) || 0,
        ivaAplicable: item.iva_aplicable !== false,
      })),
      itemsOpcionales,
      totales: {
        subtotalServicios,
        subtotalComponentes,
        subtotalOtros,
        subtotalGeneral,
        subtotalOpcionales,
        descuentoPorcentaje,
        descuentoValor,
        subtotalConDescuento,
        usaAiu,
        aiuAdminPorcentaje,
        aiuAdminValor,
        aiuImprevistosPorcentaje,
        aiuImprevistosValor,
        aiuUtilidadPorcentaje,
        aiuUtilidadValor,
        aiuValorTotal,
        ivaSobreUtilidadAiu,
        ivaPorcentaje,
        ivaValor,
        totalCotizacion,
      },
      formaPago: cot.forma_pago || 'CONTADO',
      tiempoEstimadoDias: cot.tiempo_estimado_dias ?? undefined,
      mesesGarantia: cot.meses_garantia ?? brand.garantiaMesesDefecto,
      observacionesGarantia: cot.observaciones_garantia || undefined,
      terminosCondiciones: cot.terminos_condiciones || undefined,
      elaboradoPor,
      cargoElaborador: 'Asesor Comercial',
    };

    return {
      cotizacion: cot,
      datosCotizacion,
      branding: brand,
    };
  }

  /**
   * Determina el tipo de informe de forma declarativa desde las tablas maestras de la orden.
   * Reutilizable tanto desde el Controller como desde FinalizacionOrdenService.
   */
  determinarTipoInformeDesdeOrden(
    orden: any,
    tipoSolicitado?: TipoInforme,
    marcaFallback?: string,
  ): { tipoInforme: TipoInforme; tipoEquipoNormalizado?: string } {
    const tipoEquipoObj =
      orden?.ordenes_equipos?.[0]?.equipos?.tipos_equipo || orden?.equipos?.tipos_equipo;

    let tipoEquipoNombre: string | undefined =
      tipoEquipoObj?.nombre_tipo || tipoEquipoObj?.nombre || undefined;

    if (!tipoEquipoNombre && orden?.numero_orden) {
      const numOrden = String(orden.numero_orden).toUpperCase();
      if (numOrden.includes('BOM')) tipoEquipoNombre = 'BOMBA';
      else if (numOrden.includes('GEN')) tipoEquipoNombre = 'GENERADOR';
      else if (numOrden.includes('MOT')) tipoEquipoNombre = 'MOTOR';
    }

    if (!tipoEquipoNombre) {
      const codTipo = (orden?.tipos_servicio?.codigo_tipo || '').toUpperCase();
      const nomTipo = (orden?.tipos_servicio?.nombre_tipo || '').toUpperCase();
      if (codTipo.includes('BOM') || nomTipo.includes('BOMBA')) tipoEquipoNombre = 'BOMBA';
      else if (codTipo.includes('MOT') || nomTipo.includes('MOTOR')) tipoEquipoNombre = 'MOTOR';
      else if (codTipo.includes('GEN') || nomTipo.includes('GENERADOR'))
        tipoEquipoNombre = 'GENERADOR';
    }

    if (!tipoEquipoNombre && marcaFallback) {
      const marcaUpper = marcaFallback.toUpperCase();
      if (marcaUpper.includes('BOMBA')) tipoEquipoNombre = 'BOMBA';
      else if (marcaUpper.includes('MOTOR')) tipoEquipoNombre = 'MOTOR';
      else if (marcaUpper.includes('GENERADOR')) tipoEquipoNombre = 'GENERADOR';
    }

    const tipoEquipoNormalizado = tipoEquipoNombre
      ? this.mapTipoEquipo(tipoEquipoNombre)
      : undefined;

    if (tipoSolicitado) {
      return { tipoInforme: tipoSolicitado, tipoEquipoNormalizado };
    }

    const codigoServicio = (
      orden?.tipos_servicio?.codigo_tipo ||
      orden?.tipos_servicio?.codigo ||
      ''
    ).toUpperCase();
    const categoriaServicio = (orden?.tipos_servicio?.categoria || '').toUpperCase();
    const esNarrativo =
      ['CORRECTIVO', 'EMERGENCIA', 'DIAGNOSTICO'].includes(categoriaServicio) ||
      codigoServicio.includes('CORR');

    const tipoServicioReal = esNarrativo
      ? 'CORRECTIVO'
      : codigoServicio.includes('PREV_B') || codigoServicio.includes('_B')
        ? 'PREVENTIVO_B'
        : 'PREVENTIVO_A';

    const tipoInforme = this.pdfService.determinarTipoInforme(
      tipoEquipoNormalizado || 'EQUIPO',
      tipoServicioReal,
      {
        usaPlantillaUniversal: tipoEquipoObj?.usa_plantilla_universal ?? true,
        formatoDocumento: orden?.tipos_servicio?.formato_documento ?? null,
        categoriaServicio: orden?.tipos_servicio?.categoria ?? null,
      },
    );

    return { tipoInforme, tipoEquipoNormalizado };
  }

  /**
   * Carga el contexto mínimo necesario para construir el nombre de descarga canónico.
   */
  async buildInformeFilenameContext(idOrden: number): Promise<InformeFilenameInput | null> {
    const orden = await this.prisma.ordenes_servicio.findUnique({
      where: { id_orden_servicio: idOrden },
      select: {
        numero_orden: true,
        fecha_fin_real: true,
        fecha_inicio_real: true,
        fecha_programada: true,
        tipos_servicio: { select: { codigo_tipo: true, nombre_tipo: true } },
        equipos: {
          select: {
            nombre_equipo: true,
            tipos_equipo: { select: { codigo_tipo: true, nombre_tipo: true } },
          },
        },
        clientes: {
          select: {
            nombre_sede: true,
            persona: {
              select: {
                nombre_comercial: true,
                razon_social: true,
                nombre_completo: true,
                primer_nombre: true,
                primer_apellido: true,
              },
            },
          },
        },
      },
    });
    if (!orden) return null;

    const persona = orden.clientes?.persona;
    const nombreBase =
      persona?.nombre_comercial ||
      persona?.razon_social ||
      persona?.nombre_completo ||
      [persona?.primer_nombre, persona?.primer_apellido].filter(Boolean).join(' ') ||
      'CLIENTE';
    const nombreCliente = orden.clientes?.nombre_sede
      ? `${nombreBase} - ${orden.clientes.nombre_sede}`
      : nombreBase;

    return {
      fechaServicio: orden.fecha_fin_real || orden.fecha_inicio_real || orden.fecha_programada,
      codigoTipoServicio: orden.tipos_servicio?.codigo_tipo,
      nombreTipoServicio: orden.tipos_servicio?.nombre_tipo,
      codigoTipoEquipo: orden.equipos?.tipos_equipo?.codigo_tipo,
      nombreTipoEquipo: orden.equipos?.tipos_equipo?.nombre_tipo,
      nombreCliente,
      nombreEquipo: orden.equipos?.nombre_equipo,
      numeroOrden: orden.numero_orden,
    };
  }

  mapTipoEquipo(nombre: string | undefined): 'GENERADOR' | 'BOMBA' | 'MOTOR' | 'COMPRESOR' | string {
    if (!nombre) return 'EQUIPO';
    const nombreUpper = nombre.toUpperCase();
    if (nombreUpper.includes('BOMBA')) return 'BOMBA';
    if (nombreUpper.includes('COMPRESOR')) return 'COMPRESOR';
    if (nombreUpper.includes('MOTOR')) return 'MOTOR';
    if (nombreUpper.includes('GENERADOR') || nombreUpper.includes('PLANTA')) return 'GENERADOR';
    return nombreUpper;
  }

  mapMedicionConOverride(
    med: any,
    orden: any,
    idOrdenEquipo?: number | null,
    parametroNombreFallback?: string,
  ): MedicionPDF {
    const param = med.parametros_medicion;
    const { configEquipo, configPlantilla } = extraerConfigEquipoDeOrden(orden, idOrdenEquipo);
    const resolved = resolverParametroConConfig(param, configEquipo, configPlantilla);
    const valorNum = Number(med.valor_numerico ?? med.valor) || 0;
    const unidad = resolved.esPersonalizado
      ? resolved.unidadMedida
      : (med.unidad_medida && String(med.unidad_medida).trim()) ||
        (med.unidad && String(med.unidad).trim()) ||
        resolved.unidadMedida ||
        med.unidad_medida_snapshot ||
        '';
    const ev = evaluarValorContraRangos(valorNum, resolved, unidad, 'OK');
    const alertaRaw = (med.nivel_alerta || med.nivelAlerta || ev.nivelAlerta || 'OK') as string;
    const alertaFinal =
      resolved.esPersonalizado || ev.nivelAlerta === 'CRITICO' || ev.nivelAlerta === 'ADVERTENCIA'
        ? ev.nivelAlerta
        : (alertaRaw as any);
    const estado: MedicionPDF['estado'] =
      alertaFinal === 'CRITICO' || alertaFinal === 'CRITICAL'
        ? 'CRITICO'
        : alertaFinal === 'ADVERTENCIA' || alertaFinal === 'WARNING'
          ? 'ALERTA'
          : 'NORMAL';

    return {
      parametro:
        parametroNombreFallback ||
        param?.nombre_parametro ||
        med.nombre_parametro_snapshot ||
        med.parametro ||
        'N/A',
      valor: valorNum,
      unidad,
      nivelAlerta: alertaFinal,
      rangoMin: resolved.minNormal,
      rangoMax: resolved.maxNormal,
      estado,
    };
  }

  extraerRepuestosDetallados(orden: any): RepuestoUtilizadoPDF[] {
    if (!orden?.componentes_usados || orden.componentes_usados.length === 0) {
      return [];
    }
    return orden.componentes_usados.map((cu: any) => {
      const cat = cu.catalogo_componentes;
      return {
        sku: cat?.codigo_interno || cu.referencia_manual || '',
        descripcion: cu.descripcion || cat?.descripcion_corta || cat?.nombre || 'Repuesto',
        marca: cat?.marca || cu.marca_manual || '',
        modelo: cat?.modelo || '',
        cantidad: Number(cu.cantidad ?? 1),
        unidad: cu.unidad || cat?.unidad_medida || 'UND',
        origen: (cu.origen_componente as 'BODEGA' | 'CLIENTE' | 'COMPRA_DIRECTA') || 'BODEGA',
        lote: cu.lotes_componentes?.codigo_lote || undefined,
        ubicacionBodega: cu.ubicaciones_bodega?.codigo_ubicacion || undefined,
        estadoRetirado: cu.estado_componente_retirado || undefined,
        observaciones: cu.observaciones || undefined,
      };
    });
  }

  extraerEquipoDetallado(
    orden: any,
    datosModulo?: any,
    contadorPrevio?: {
      horometroActualLectura?: number;
      horometroAnterior?: number;
      horometroTranscurrido?: number;
    },
    brand?: OrgBrandingContext,
    contadorIntervencionOverride?: number,
  ): DatosEquipoDetalladoPDF | undefined {
    const eq = orden?.equipos;
    if (!eq) return undefined;

    const gen = eq.equipos_generador;
    const mot = eq.equipos_motor;
    const bom = eq.equipos_bomba;
    const tipoEq = eq.tipos_equipo?.nombre_tipo || 'EQUIPO';

    const clientePersona = orden.clientes?.persona;
    const clienteNombreBase =
      clientePersona?.razon_social ||
      clientePersona?.nombre_comercial ||
      clientePersona?.nombre_completo ||
      'N/A';
    const clienteNombre = orden.clientes?.nombre_sede
      ? `${clienteNombreBase} - ${orden.clientes.nombre_sede}`
      : clienteNombreBase;
    const clienteNit = clientePersona?.numero_identificacion
      ? `${clientePersona.tipo_identificacion || brand?.tipoIdFiscal || 'NIT'}: ${clientePersona.numero_identificacion}`
      : undefined;
    const clienteDireccion =
      orden.sedes_cliente?.direccion_sede || clientePersona?.direccion_principal || 'N/A';
    const ciudad =
      orden.sedes_cliente?.ciudad_sede ||
      clientePersona?.ciudad ||
      brand?.ciudadDefecto ||
      undefined;
    const sede = orden.sedes_cliente?.nombre_sede || orden.clientes?.nombre_sede || undefined;

    const contadorDesdeActividad = this.extraerContadorDesdeActividades(orden.actividades_ejecutadas);
    const horometroInterv =
      contadorIntervencionOverride ??
      datosModulo?.horasTrabajo ??
      orden.horometro_final ??
      contadorDesdeActividad ??
      contadorPrevio?.horometroActualLectura ??
      orden.horometro_inicial ??
      undefined;
    const baseLecturaUso =
      eq.lectura_uso_actual != null
        ? Number(eq.lectura_uso_actual)
        : eq.horas_actuales != null
          ? Number(eq.horas_actuales)
          : 0;
    const horometroAcum =
      Math.max(baseLecturaUso, horometroInterv != null ? Number(horometroInterv) : 0) || undefined;

    return {
      codigoEquipo: eq.codigo_equipo || 'S/C',
      nombreEquipo: eq.nombre_equipo || undefined,
      tipoEquipo: tipoEq,
      tipoEquipoNombre: eq.tipos_equipo?.nombre_tipo || tipoEq,
      marca: EquipoSpecsReader.getMarca(eq),
      modelo: EquipoSpecsReader.getModelo(eq),
      serie: EquipoSpecsReader.getSerie(eq),
      ubicacion: eq.ubicacion_texto || undefined,
      sede,
      cliente: clienteNombre,
      clienteNit,
      direccion: clienteDireccion,
      ciudad,
      potenciaKva: gen?.potencia_kva ? Number(gen.potencia_kva) : undefined,
      potenciaKw: gen?.potencia_kw
        ? Number(gen.potencia_kw)
        : mot?.potencia_kw
          ? Number(mot.potencia_kw)
          : undefined,
      potenciaHp: mot?.potencia_hp
        ? Number(mot.potencia_hp)
        : bom?.potencia_hidraulica_kw
          ? Number(bom.potencia_hidraulica_kw)
          : undefined,
      voltaje:
        gen?.voltaje_salida || (datosModulo?.voltaje ? `${datosModulo.voltaje} V` : undefined),
      frecuencia: gen?.frecuencia_hz
        ? `${gen.frecuencia_hz} Hz`
        : datosModulo?.frecuencia
          ? `${datosModulo.frecuencia} Hz`
          : undefined,
      fases: gen?.numero_fases ? `${gen.numero_fases}F` : undefined,
      rpm: mot?.velocidad_nominal_rpm
        ? `${mot.velocidad_nominal_rpm} RPM`
        : datosModulo?.rpm
          ? `${datosModulo.rpm} RPM`
          : undefined,
      tipoBomba: bom?.tipo_bomba || undefined,
      caudalGpm: bom?.caudal_maximo_m3h ? `${bom.caudal_maximo_m3h} m³/h` : undefined,
      presionPsi: bom?.altura_presion_trabajo_m ? `${bom.altura_presion_trabajo_m} m` : undefined,
      horometroIntervencion: horometroInterv != null ? Number(horometroInterv) : undefined,
      horometroAcumulado: horometroAcum != null ? Number(horometroAcum) : undefined,
      horometroAnterior: contadorPrevio?.horometroAnterior,
      horometroTranscurrido:
        contadorPrevio?.horometroTranscurrido ??
        (horometroInterv != null &&
        contadorPrevio?.horometroAnterior != null &&
        Number(horometroInterv) >= contadorPrevio.horometroAnterior
          ? Number(horometroInterv) - contadorPrevio.horometroAnterior
          : undefined),
      unidadUso: eq.tipos_equipo?.unidad_uso || undefined,
      etiquetaContador: eq.tipos_equipo?.etiqueta_contador || undefined,
      requiereHorometro: eq.tipos_equipo?.requiere_horometro ?? undefined,
    };
  }

  extraerDatosModuloReal(mediciones: any[]): DatosOrdenPDF['datosModulo'] {
    if (!mediciones || mediciones.length === 0) return undefined;
    const datosModulo: NonNullable<DatosOrdenPDF['datosModulo']> = {};

    for (const med of mediciones) {
      const nombreParametro = (
        med.parametros_medicion?.nombre_parametro ||
        med.nombre_parametro_snapshot ||
        med.parametro ||
        ''
      ).toLowerCase();
      const unidadParametro = String(
        med.unidad_medida || med.unidad || med.parametros_medicion?.unidad_medida || '',
      ).toLowerCase();
      const valor = Number(med.valor_numerico ?? med.valor) || 0;

      if (
        nombreParametro.includes('rpm') ||
        (nombreParametro.includes('velocidad') &&
          (!unidadParametro || unidadParametro.includes('rpm')))
      ) {
        datosModulo.rpm = valor;
      } else if (
        nombreParametro.includes('presión') ||
        nombreParametro.includes('presion') ||
        nombreParametro.includes('aceite')
      ) {
        datosModulo.presionAceite = valor;
      } else if (
        nombreParametro.includes('temperatura') ||
        nombreParametro.includes('refrigerante')
      ) {
        datosModulo.temperaturaRefrigerante = valor;
      } else if (
        nombreParametro.includes('carga') ||
        nombreParametro.includes('batería') ||
        nombreParametro.includes('bateria')
      ) {
        datosModulo.cargaBateria = valor;
      } else if (
        nombreParametro.includes('horas') ||
        nombreParametro.includes('horómetro') ||
        nombreParametro.includes('horometro') ||
        nombreParametro.includes('ciclo') ||
        nombreParametro.includes('odómetro') ||
        nombreParametro.includes('odometro') ||
        nombreParametro.includes('kilometr') ||
        nombreParametro.includes('contador')
      ) {
        datosModulo.horasTrabajo = valor;
      } else if (nombreParametro.includes('voltaje')) {
        datosModulo.voltaje = valor;
      } else if (nombreParametro.includes('frecuencia')) {
        datosModulo.frecuencia = valor;
      } else if (nombreParametro.includes('corriente') || nombreParametro.includes('amperaje')) {
        datosModulo.corriente = valor;
      }
    }

    return Object.values(datosModulo).some((v) => v !== undefined) ? datosModulo : undefined;
  }

  formatearFechaConBrand(
    fecha: Date | string | null | undefined,
    brand?: Partial<OrgBrandingContext>,
  ): string {
    if (!fecha) return 'N/A';
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return 'N/A';
    try {
      return new Intl.DateTimeFormat(brand?.locale || 'es-CO', {
        timeZone: brand?.zonaHoraria || 'America/Bogota',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(d);
    } catch {
      const dia = d.getDate().toString().padStart(2, '0');
      const mes = (d.getMonth() + 1).toString().padStart(2, '0');
      return `${dia}/${mes}/${d.getFullYear()}`;
    }
  }

  formatearHoraConBrand(
    fecha: Date | string | null | undefined,
    brand?: Partial<OrgBrandingContext>,
  ): string {
    if (!fecha) return 'N/A';
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return 'N/A';
    try {
      return new Intl.DateTimeFormat(brand?.locale || 'es-CO', {
        timeZone: brand?.zonaHoraria || 'America/Bogota',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }).format(d);
    } catch {
      return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    }
  }

  sonDiasDiferentesConBrand(
    inicio: Date | string | null | undefined,
    fin: Date | string | null | undefined,
    brand?: Partial<OrgBrandingContext>,
  ): boolean {
    if (!inicio || !fin) return false;
    const dIni = new Date(inicio);
    const dFin = new Date(fin);
    if (isNaN(dIni.getTime()) || isNaN(dFin.getTime())) return false;
    try {
      const fmt = new Intl.DateTimeFormat('en-CA', {
        timeZone: brand?.zonaHoraria || 'America/Bogota',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      return fmt.format(dIni) !== fmt.format(dFin);
    } catch {
      return (
        dIni.getFullYear() !== dFin.getFullYear() ||
        dIni.getMonth() !== dFin.getMonth() ||
        dIni.getDate() !== dFin.getDate()
      );
    }
  }

  private mapActividadEjecutada(act: any, descripcionOverride?: string): ActividadPDF {
    return {
      sistema: act.catalogo_actividades?.catalogo_sistemas?.nombre_sistema || 'GENERAL',
      descripcion:
        descripcionOverride ||
        act.catalogo_actividades?.descripcion_actividad ||
        act.descripcion ||
        'N/A',
      resultado: (act.estado as any) || 'NA',
      observaciones: act.observaciones || '',
      tipoActividad: act.catalogo_actividades?.tipo_actividad || undefined,
      idParametroMedicion: act.catalogo_actividades?.id_parametro_medicion ?? undefined,
      tipoControlInput: act.catalogo_actividades?.tipo_control_input || undefined,
      configInputJson: act.catalogo_actividades?.config_input_json || undefined,
      rolSemantico: act.catalogo_actividades?.rol_semantico || undefined,
      naturalezaPersonalizada: act.catalogo_actividades?.naturaleza_personalizada || undefined,
      respuestaJson: act.respuesta_json ?? undefined,
    };
  }

  private agruparActividadesPorEquipo(orden: any, esMultiEquipo: boolean) {
    if (!esMultiEquipo || !orden.ordenes_equipos) return undefined;

    const conEquipo =
      orden.actividades_ejecutadas?.filter(
        (act: any) => act.id_orden_equipo != null && !act.excluido_pdf,
      ) || [];
    const sinEquipo =
      orden.actividades_ejecutadas?.filter(
        (act: any) => act.id_orden_equipo == null && !act.excluido_pdf,
      ) || [];

    if (conEquipo.length > 0) {
      return orden.ordenes_equipos.map((oe: any) => ({
        equipo: this.buildEquipoOrdenDescriptor(oe),
        actividades: conEquipo
          .filter((act: any) => act.id_orden_equipo === oe.id_orden_equipo)
          .map((act: any) => this.mapActividadEjecutada(act)),
      }));
    }

    if (sinEquipo.length > 0) {
      const unicas = new Map<string, any[]>();
      for (const act of sinEquipo) {
        const key = act.catalogo_actividades?.descripcion_actividad || act.descripcion || 'N/A';
        if (!unicas.has(key)) unicas.set(key, []);
        unicas.get(key)!.push(act);
      }

      return orden.ordenes_equipos.map((oe: any, idx: number) => ({
        equipo: this.buildEquipoOrdenDescriptor(oe),
        actividades: Array.from(unicas.entries()).map(([desc, acts]) => {
          const sorted = [...acts].sort(
            (a: any, b: any) => (a.id_actividad_ejecutada || 0) - (b.id_actividad_ejecutada || 0),
          );
          return this.mapActividadEjecutada(sorted[idx] || sorted[0], desc);
        }),
      }));
    }

    return undefined;
  }

  private agruparMedicionesPorEquipo(orden: any, esMultiEquipo: boolean) {
    if (!esMultiEquipo || !orden.ordenes_equipos) return undefined;

    const conEquipo =
      orden.mediciones_servicio?.filter(
        (med: any) => med.id_orden_equipo != null && !med.excluido_pdf,
      ) || [];
    const sinEquipo =
      orden.mediciones_servicio?.filter(
        (med: any) => med.id_orden_equipo == null && !med.excluido_pdf,
      ) || [];

    if (conEquipo.length > 0) {
      return orden.ordenes_equipos.map((oe: any) => ({
        equipo: this.buildEquipoOrdenDescriptor(oe),
        mediciones: conEquipo
          .filter((med: any) => med.id_orden_equipo === oe.id_orden_equipo)
          .map((med: any) => this.mapMedicionConOverride(med, orden, oe.id_orden_equipo)),
      }));
    }

    if (sinEquipo.length > 0) {
      const unicas = new Map<string, any[]>();
      for (const med of sinEquipo) {
        const key = med.parametros_medicion?.nombre_parametro || 'N/A';
        if (!unicas.has(key)) unicas.set(key, []);
        unicas.get(key)!.push(med);
      }

      return orden.ordenes_equipos.map((oe: any, idx: number) => ({
        equipo: this.buildEquipoOrdenDescriptor(oe),
        mediciones: Array.from(unicas.entries()).map(([param, meds]) => {
          const sorted = [...meds].sort((a: any, b: any) => (a.id_medicion || 0) - (b.id_medicion || 0));
          return this.mapMedicionConOverride(sorted[idx] || sorted[0], orden, oe.id_orden_equipo, param);
        }),
      }));
    }

    return undefined;
  }

  private agruparEvidenciasPorEquipo(orden: any, esMultiEquipo: boolean) {
    if (!esMultiEquipo || !orden.ordenes_equipos) return undefined;

    const actToEqMap = new Map<number, number>();
    for (const act of orden.actividades_ejecutadas || []) {
      if (act.id_actividad_ejecutada && act.id_orden_equipo) {
        actToEqMap.set(act.id_actividad_ejecutada, act.id_orden_equipo);
      }
    }

    const evConEquipo: any[] = [];
    const evHuerfanasNoGeneral: any[] = [];
    const evGenerales: any[] = [];

    for (const ev of orden.evidencias_fotograficas || []) {
      if (ev.id_orden_equipo) {
        evConEquipo.push(ev);
      } else if (ev.id_actividad_ejecutada && actToEqMap.has(ev.id_actividad_ejecutada)) {
        evConEquipo.push({ ...ev, id_orden_equipo: actToEqMap.get(ev.id_actividad_ejecutada)! });
      } else if (ev.tipo_evidencia === 'GENERAL' || !ev.tipo_evidencia) {
        evGenerales.push(ev);
      } else {
        evHuerfanasNoGeneral.push(ev);
      }
    }

    const grupos = orden.ordenes_equipos.map((oe: any) => ({
      equipo: this.buildEquipoOrdenDescriptor(oe),
      evidencias: evConEquipo
        .filter((ev: any) => ev.id_orden_equipo === oe.id_orden_equipo)
        .map((ev: any) => ({
          url: ev.ruta_archivo,
          caption: `${ev.tipo_evidencia || 'EVIDENCIA'}: ${ev.descripcion || ''}`.trim(),
          momento: ev.tipo_evidencia || ev.momento_captura || 'DURANTE',
          idOrdenEquipo: ev.id_orden_equipo || undefined,
        })),
    }));

    const fotosGenAll = [...evGenerales, ...evHuerfanasNoGeneral].map((ev: any) => ({
      url: ev.ruta_archivo,
      caption: `${ev.tipo_evidencia || 'GENERAL'}: ${ev.descripcion || ''}`.trim(),
      momento: ev.tipo_evidencia || 'GENERAL',
      idLote: ev.id_lote_galeria || undefined,
    }));

    if (fotosGenAll.length > 0) {
      grupos.push({
        equipo: {
          idOrdenEquipo: 0,
          ordenSecuencia: 999,
          nombreSistema: 'FOTOGRAFÍAS GENERALES',
          codigoEquipo: undefined,
          nombreEquipo: 'FOTOGRAFÍAS GENERALES',
          estado: undefined,
        },
        evidencias: fotosGenAll,
      });
    }

    return grupos;
  }

  private buildEquipoOrdenDescriptor(oe: any) {
    return {
      idOrdenEquipo: oe.id_orden_equipo,
      ordenSecuencia: oe.orden_secuencia || 1,
      nombreSistema: oe.nombre_sistema || oe.equipos?.nombre_equipo || undefined,
      codigoEquipo: oe.equipos?.codigo_equipo || undefined,
      nombreEquipo: oe.equipos?.nombre_equipo || undefined,
      estado: oe.estado_equipo || 'PENDIENTE',
    };
  }

  private buildRepuestosWmsResumen(orden: any): string[] {
    return (orden.componentes_usados || []).map((cu: any) => {
      const sku = cu.catalogo_componentes?.codigo_interno || cu.referencia_manual || '';
      const desc = cu.descripcion || cu.catalogo_componentes?.descripcion_corta || 'Repuesto';
      const cant = Number(cu.cantidad ?? 1);
      const und = cu.unidad || cu.catalogo_componentes?.unidad_medida || 'UND';
      const lote = cu.lotes_componentes?.codigo_lote
        ? ` • Lote ${cu.lotes_componentes.codigo_lote}`
        : '';
      const origenTag =
        cu.origen_componente === 'CLIENTE'
          ? ' • Suministrado por Cliente'
          : cu.origen_componente === 'COMPRA_DIRECTA'
            ? ' • Compra Directa'
            : '';
      return `${sku ? `[${sku}] ` : ''}${desc} (Cant: ${cant} ${und}${lote}${origenTag})`;
    });
  }

  private async obtenerContadorAnteriorEquipo(orden: any): Promise<{
    horometroActualLectura?: number;
    horometroAnterior?: number;
    horometroTranscurrido?: number;
  }> {
    const idEquipo = orden?.equipos?.id_equipo;
    const idOrden = orden?.id_orden_servicio;
    if (!idEquipo || !idOrden || typeof this.prisma.lecturas_horometro?.findFirst !== 'function') {
      return {};
    }

    try {
      const lecturaActualRow = await this.prisma.lecturas_horometro.findFirst({
        where: { id_equipo: idEquipo, id_orden_servicio: idOrden },
        orderBy: [{ fecha_lectura: 'desc' }, { id_lectura: 'desc' }],
      });
      const fechaCorte =
        lecturaActualRow?.fecha_lectura ?? orden.fecha_fin_real ?? orden.fecha_creacion ?? new Date();
      const lecturaPreviaRow = await this.prisma.lecturas_horometro.findFirst({
        where: {
          id_equipo: idEquipo,
          OR: [{ id_orden_servicio: null }, { id_orden_servicio: { not: idOrden } }],
          fecha_lectura: { lte: fechaCorte },
          ...(lecturaActualRow ? { id_lectura: { lt: lecturaActualRow.id_lectura } } : {}),
        },
        orderBy: [{ fecha_lectura: 'desc' }, { id_lectura: 'desc' }],
      });

      if (lecturaActualRow) {
        const lecturaActual = Number(lecturaActualRow.horas_lectura);
        const transcurrido =
          lecturaActualRow.horas_transcurridas != null
            ? Number(lecturaActualRow.horas_transcurridas)
            : lecturaPreviaRow
              ? lecturaActual - Number(lecturaPreviaRow.horas_lectura)
              : undefined;
        const anterior =
          lecturaPreviaRow != null
            ? Number(lecturaPreviaRow.horas_lectura)
            : transcurrido != null && Number.isFinite(lecturaActual - transcurrido)
              ? lecturaActual - transcurrido
              : undefined;

        return {
          horometroActualLectura: Number.isFinite(lecturaActual) ? lecturaActual : undefined,
          ...(anterior != null && Number.isFinite(anterior) && anterior >= 0
            ? {
                horometroAnterior: anterior,
                horometroTranscurrido:
                  transcurrido != null && Number.isFinite(transcurrido) && transcurrido >= 0
                    ? transcurrido
                    : undefined,
              }
            : {}),
        };
      }
      if (lecturaPreviaRow) {
        const anterior = Number(lecturaPreviaRow.horas_lectura);
        if (Number.isFinite(anterior) && anterior >= 0) {
          return { horometroAnterior: anterior };
        }
      }
    } catch {
      this.logger.warn('No se pudo consultar lectura previa de contador para PDF');
    }
    return {};
  }

  private extraerContadorDesdeActividades(actividades: any[]): number | undefined {
    if (!Array.isArray(actividades)) return undefined;
    for (const act of actividades) {
      const esContador =
        act.catalogo_actividades?.rol_semantico === 'LECTURA_CONTADOR_ACTIVO' ||
        act.catalogo_actividades?.tipo_control_input === 'LECTURA_CONTADOR';
      if (esContador && act.respuesta_json && typeof act.respuesta_json === 'object') {
        const raw = (act.respuesta_json as Record<string, unknown>).valor;
        if (raw != null) {
          let rawStr = String(raw).trim();
          rawStr = /^\d{1,3}(\.\d{3})+$/.test(rawStr)
            ? rawStr.replace(/\./g, '')
            : rawStr.replace(',', '.');
          const n = parseFloat(rawStr);
          if (!isNaN(n) && n > 0) return n;
        }
      }
      const obs = typeof act.observaciones === 'string' ? act.observaciones : '';
      const regexObs = esContador
        ? /^(?:[A-ZÁÉÍÓÚÑ0-9_]{2,25}|Lectura registrada)\s*:\s*([\d.,]+)/i
        : /(?:HORAS|HOROMETRO|HORÓMETRO|CICLOS|KM|UPM|CONTADOR)\s*:\s*([\d.,]+)/i;
      const match = obs.match(regexObs);
      if (match?.[1]) {
        let raw = match[1].trim();
        raw = /^\d{1,3}(\.\d{3})+$/.test(raw) ? raw.replace(/\./g, '') : raw.replace(',', '.');
        const n = parseFloat(raw);
        if (!isNaN(n) && n > 0) return n;
      }
    }
    return undefined;
  }

  private collectClienteEmails(orden: any): string[] {
    const emails: string[] = [];
    const add = (candidate?: string | null) => {
      if (!candidate) return;
      for (const part of String(candidate).split(';;')) {
        const clean = part.trim();
        if (clean && clean.includes('@') && !emails.includes(clean)) {
          emails.push(clean);
        }
      }
    };
    add(orden.clientes?.persona?.email_principal);
    add(orden.clientes?.emails_notificacion);
    add(orden.clientes?.cliente_principal?.emails_notificacion);
    return emails;
  }

  private resolverNombrePersona(persona: any, fallback = ''): string {
    if (!persona) return fallback;
    const completo = `${persona.primer_nombre || ''} ${persona.primer_apellido || ''}`.trim();
    return completo || persona.nombre_completo || fallback;
  }

  private resolverNombreFirmanteCliente(orden: any, firmaCliente: any, clientePersona: any): string | undefined {
    if (orden.nombre_quien_recibe && orden.nombre_quien_recibe !== 'Cliente') {
      return orden.nombre_quien_recibe;
    }
    const nombreFirma = this.resolverNombrePersona(firmaCliente?.persona);
    if (nombreFirma) return nombreFirma;
    if (clientePersona) {
      return (
        clientePersona.nombre_comercial ||
        this.resolverNombrePersona(clientePersona) ||
        clientePersona.razon_social ||
        undefined
      );
    }
    return orden.nombre_quien_recibe || undefined;
  }

  private normalizeFirmaDataUrl(raw?: string | null): string | undefined {
    if (!raw) return undefined;
    return raw.startsWith('data:') ? raw : `data:image/png;base64,${raw}`;
  }

  private resolverTipoServicioDetallado(orden: any): string {
    const nombre = orden.tipos_servicio?.nombre_tipo || 'Mantenimiento';
    const codigo = (orden.tipos_servicio?.codigo_tipo || '').toUpperCase();
    if (codigo.includes('PREVENTIVO_A') || codigo.includes('PREV_A')) {
      return 'Mantenimiento Preventivo Tipo A';
    }
    if (codigo.includes('PREVENTIVO_B') || codigo.includes('PREV_B')) {
      return 'Mantenimiento Preventivo Tipo B';
    }
    if (codigo.includes('CORRECTIVO') || codigo.includes('CORR')) {
      return 'Mantenimiento Correctivo';
    }
    return nombre;
  }

  private buildInformeFilenameFromOrden(orden: any, clienteNombre: string): string {
    return buildInformeFilename({
      fechaServicio: orden.fecha_fin_real || orden.fecha_inicio_real || orden.fecha_programada,
      codigoTipoServicio: orden.tipos_servicio?.codigo_tipo,
      nombreTipoServicio: orden.tipos_servicio?.nombre_tipo,
      codigoTipoEquipo: orden.equipos?.tipos_equipo?.codigo_tipo,
      nombreTipoEquipo: orden.equipos?.tipos_equipo?.nombre_tipo,
      nombreCliente: clienteNombre,
      nombreEquipo: orden.equipos?.nombre_equipo,
      numeroOrden: orden.numero_orden,
    });
  }
}
