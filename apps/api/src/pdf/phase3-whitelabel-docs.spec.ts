import * as fs from 'fs';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { PERMISOS_KEY } from '../auth/decorators/permisos.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermisosGuard } from '../auth/guards/permisos.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { EnviarCotizacionHandler } from '../cotizaciones/application/commands/enviar-cotizacion.handler';
import { EmailTemplatesService } from '../email/email-templates.service';
import { EmailService } from '../email/email.service';
import { OrgBrandingContext, buildOrgBranding, formatCurrencyOrg } from './org-branding.types';
import { PdfAssemblerService } from './pdf-assembler.service';
import { PdfController } from './pdf.controller';
import { PdfService } from './pdf.service';
import {
  DatosCotizacionPDF,
  DatosOrdenCompraPDF,
  DatosOrdenPDF,
  DatosPropuestaCorrectivoPDF,
  DatosRemisionPDF,
  DatosTrazabilidadClientePDF,
} from './templates';

const FORBIDDEN_LEGACY_BRAND_REGEX =
  /mekanos|cartagena|900\.542|900\.123|315-7083350|mekanossas|lorddeep3|os-202607-0134/i;

function makeTenantAscensores(): OrgBrandingContext {
  return buildOrgBranding({
    id_configuracion: 1,
    nombre_comercial: 'Ascensores del Sur',
    razon_social: 'Ascensores del Sur S.A.S.',
    tipo_id_fiscal: 'RUT',
    numero_id_fiscal: '901.000.111-2',
    eslogan: 'Transporte Vertical de Alta Confiabilidad',
    sitio_web: 'https://ascensoresdelsur.test',
    email_contacto: 'servicio@ascensoresdelsur.test',
    telefono_principal: '+57 601 555-0100',
    telefono_soporte: '+57 601 555-0199',
    direccion_linea1: 'Av. El Dorado #68B-45',
    ciudad_defecto: 'Bogotá',
    departamento_defecto: 'Cundinamarca',
    pais_defecto: 'Colombia',
    codigo_pais_iso: 'CO',
    logo_principal_url: null,
    logo_claro_url: null,
    isotipo_url: null,
    favicon_url: null,
    color_primario: '#0B3D91',
    color_secundario: '#111827',
    color_acento: '#06B6D4',
    color_exito: '#16A34A',
    color_alerta: '#D97706',
    color_peligro: '#DC2626',
    zona_horaria: 'America/Bogota',
    locale: 'en-US',
    codigo_moneda: 'USD',
    simbolo_moneda: '$',
    decimales_moneda: 2,
    etiqueta_impuesto: 'Tax',
    tasa_impuesto_defecto: 8,
    prefijo_orden: 'OT',
    prefijo_cotizacion: 'QT',
    prefijo_informe: 'INF',
    prefijo_remision: 'REM',
    prefijo_oc: 'PO',
    prefijo_contrato: 'CTR',
    prefijo_propuesta: 'PROP',
    texto_pie_pdf: 'Documento oficial emitido por Ascensores del Sur',
    texto_disclaimer_repuestos_cliente:
      'Repuesto provisto por el propietario sujeto a garantía del fabricante.',
    garantia_meses_defecto: 6,
    validez_cotizacion_dias_defecto: 15,
    requiere_firma_cliente_defecto: true,
    storage_prefijo_raiz: 'ascensores-sur',
    politica_retencion_mobile_dias: 30,
    modulo_comercial_activo: true,
    modulo_inventario_activo: true,
    fecha_modificacion: new Date(),
  });
}

function makeTenantClimaTotal(): OrgBrandingContext {
  return buildOrgBranding({
    id_configuracion: 1,
    nombre_comercial: 'ClimaTotal',
    razon_social: 'ClimaTotal Ingeniería S.L.',
    tipo_id_fiscal: 'NIF',
    numero_id_fiscal: 'B-12345678',
    eslogan: 'Climatización Industrial y Frío Térmico',
    sitio_web: 'https://climatotal.test',
    email_contacto: 'soporte@climatotal.test',
    telefono_principal: '+34 910 555 200',
    telefono_soporte: '+34 910 555 201',
    direccion_linea1: 'Calle de Alcalá 214',
    ciudad_defecto: 'Madrid',
    departamento_defecto: 'Madrid',
    pais_defecto: 'España',
    codigo_pais_iso: 'ES',
    logo_principal_url: null,
    logo_claro_url: null,
    isotipo_url: null,
    favicon_url: null,
    color_primario: '#065F46',
    color_secundario: '#0F172A',
    color_acento: '#10B981',
    color_exito: '#059669',
    color_alerta: '#D97706',
    color_peligro: '#DC2626',
    zona_horaria: 'Europe/Madrid',
    locale: 'es-ES',
    codigo_moneda: 'EUR',
    simbolo_moneda: '€',
    decimales_moneda: 2,
    etiqueta_impuesto: 'IVA',
    tasa_impuesto_defecto: 21,
    prefijo_orden: 'OT',
    prefijo_cotizacion: 'PRES',
    prefijo_informe: 'INF',
    prefijo_remision: 'ALB',
    prefijo_oc: 'OC',
    prefijo_contrato: 'CTR',
    prefijo_propuesta: 'PROP',
    texto_pie_pdf: 'ClimaTotal Ingeniería S.L. · Inscrita en Registro Mercantil',
    texto_disclaimer_repuestos_cliente:
      'Componentes aportados por el cliente sin garantía directa de ClimaTotal.',
    garantia_meses_defecto: 12,
    validez_cotizacion_dias_defecto: 30,
    requiere_firma_cliente_defecto: true,
    storage_prefijo_raiz: 'climatotal-es',
    politica_retencion_mobile_dias: 45,
    modulo_comercial_activo: true,
    modulo_inventario_activo: true,
    fecha_modificacion: new Date(),
  });
}

function buildOrdenSample(brand: OrgBrandingContext, tipoEquipo: string): DatosOrdenPDF {
  return {
    branding: brand,
    cliente: 'Torre Empresarial Central',
    direccion: `${brand.direccionLinea1 || 'Parque Industrial'}, ${brand.ciudadDefecto}`,
    sede: 'Sede Norte',
    marcaEquipo: tipoEquipo === 'ASCENSOR' ? 'Otis' : 'Caterpillar',
    serieEquipo: 'SER-889900',
    tipoEquipo,
    fecha: '15/11/2026',
    tecnico: 'Laura Méndez',
    horaEntrada: '08:30',
    horaSalida: '10:45',
    tipoServicio: 'PREVENTIVO_A',
    numeroOrden: 'OT-202611-0042',
    equipoDetalle: {
      codigoEquipo: 'EQ-101',
      nombreEquipo: tipoEquipo === 'ASCENSOR' ? 'Ascensor Panorámico 1' : 'Grupo Electrógeno 1',
      tipoEquipo,
      tipoEquipoNombre: tipoEquipo,
      marca: tipoEquipo === 'ASCENSOR' ? 'Otis' : 'Caterpillar',
      modelo: 'X-200',
      serie: 'SER-889900',
      cliente: 'Torre Empresarial Central',
      clienteNit: `${brand.tipoIdFiscal}: 800.111.222-3`,
      direccion: brand.direccionLinea1 || 'Av. Principal',
      ciudad: brand.ciudadDefecto,
      horometroIntervencion: 12500,
      horometroAcumulado: 12500,
      unidadUso: tipoEquipo === 'ASCENSOR' ? 'CICLOS' : 'HORAS',
      etiquetaContador: tipoEquipo === 'ASCENSOR' ? 'Ciclos de viaje' : 'Horómetro',
    },
    actividades: [
      {
        sistema: 'TRACCIÓN',
        descripcion: 'Verificar nivel de tensión en cables de tracción',
        resultado: 'B',
        observaciones: 'Dentro de tolerancia nominal',
        tipoActividad: 'INSPECCION',
      },
      {
        sistema: 'CONTROL',
        descripcion: 'Medir amperaje nominal del motor principal',
        resultado: 'B',
        observaciones: '14.2 A',
        tipoActividad: 'MEDICION',
        idParametroMedicion: 91,
      },
    ],
    mediciones: [
      {
        parametro: 'Corriente Nominal',
        valor: 14.2,
        unidad: 'A',
        nivelAlerta: 'OK',
        estado: 'NORMAL',
      },
    ],
    evidencias: ['https://cdn.example.test/ev1.jpg'],
    observaciones: 'Operación normal sin novedades críticas.',
    repuestosDetallados: [
      {
        sku: 'REP-01',
        descripcion: 'Relé térmico industrial',
        cantidad: 1,
        unidad: 'UND',
        origen: 'CLIENTE',
      },
    ],
  };
}

function buildCotizacionSample(brand: OrgBrandingContext): DatosCotizacionPDF {
  const tasa = brand.tasaImpuestoDefecto;
  const subtotalServicios = 1200;
  const subtotalComponentes = 800;
  const subtotalGeneral = subtotalServicios + subtotalComponentes;
  const ivaValor = Number(((subtotalGeneral * tasa) / 100).toFixed(2));
  return {
    branding: brand,
    numeroCotizacion: 'COT-2026-0091',
    fechaCotizacion: '15/11/2026',
    fechaVencimiento: '15/12/2026',
    diasValidez: brand.validezCotizacionDiasDefecto,
    version: 1,
    cliente: {
      nombre: 'Operadora Logística Global S.A.',
      nit: '890.555.444-1',
      direccion: brand.ciudadDefecto,
      telefono: brand.telefonoPrincipal || '',
      email: 'compras@cliente.test',
    },
    asunto: 'Mantenimiento Integral Preventivo',
    itemsServicios: [
      {
        orden: 1,
        descripcion: 'Inspección y calibración especializada',
        cantidad: 1,
        unidad: 'SRV',
        precioUnitario: subtotalServicios,
        descuentoPorcentaje: 0,
        subtotal: subtotalServicios,
      },
    ],
    itemsComponentes: [
      {
        orden: 1,
        descripcion: 'Kit de sellos y sensores OEM',
        referencia: 'OEM-55',
        cantidad: 2,
        unidad: 'KIT',
        precioUnitario: 400,
        descuentoPorcentaje: 0,
        subtotal: subtotalComponentes,
      },
    ],
    totales: {
      subtotalServicios,
      subtotalComponentes,
      subtotalGeneral,
      descuentoPorcentaje: 0,
      descuentoValor: 0,
      subtotalConDescuento: subtotalGeneral,
      ivaPorcentaje: tasa,
      ivaValor,
      totalCotizacion: subtotalGeneral + ivaValor,
    },
    formaPago: 'Crédito 30 días',
    tiempoEstimadoDias: 7,
    mesesGarantia: brand.garantiaMesesDefecto,
    elaboradoPor: 'Carlos Ruiz',
  };
}

function buildPropuestaSample(brand: OrgBrandingContext): DatosPropuestaCorrectivoPDF {
  return {
    branding: brand,
    numeroPropuesta: 'PC-2026-014',
    fechaPropuesta: '15/11/2026',
    version: 1,
    prioridad: 'ALTA',
    cliente: {
      nombre: 'Hospital Metropolitano',
      nit: '800.333.222-9',
      direccion: brand.ciudadDefecto,
    },
    equipo: {
      tipoEquipo: 'CHILLER',
      marca: 'Trane',
      serie: 'TR-9988',
    },
    problemaDetectado: {
      descripcion: 'Fuga en válvula de expansión electrónica',
      sintomas: ['Sobrecalentamiento en circuito 1'],
      sistemasAfectados: ['Circuito frigorífico'],
      nivelCriticidad: 'CRITICO',
    },
    diagnostico: {
      causaProbable: 'Desgaste de actuador paso a paso',
      analisisTecnico: 'Variación fuera de rango en recalentamiento.',
      riesgosNoActuar: ['Paro no programado de climatización crítica'],
    },
    solucionPropuesta: {
      descripcion: 'Sustitución de válvula y calibración de controlador',
      alcanceTrabajo: ['Recuperación de refrigerante', 'Cambio de válvula', 'Pruebas de vacío'],
      tiempoEstimadoHoras: 8,
      requiereParadaEquipo: true,
    },
    itemsRepuestos: [
      {
        orden: 1,
        descripcion: 'Válvula expansión OEM',
        cantidad: 1,
        unidad: 'UND',
        precioUnitario: 950,
        subtotal: 950,
      },
    ],
    itemsManoObra: [
      {
        orden: 1,
        descripcion: 'Mano de obra técnica certificada',
        horas: 8,
        tarifaHora: 75,
        subtotal: 600,
      },
    ],
    costos: {
      subtotalRepuestos: 950,
      subtotalManoObra: 600,
      subtotalGeneral: 1550,
      descuentoPorcentaje: 0,
      descuentoValor: 0,
      ivaPorcentaje: brand.tasaImpuestoDefecto,
      ivaValor: Number(((1550 * brand.tasaImpuestoDefecto) / 100).toFixed(2)),
      totalPropuesta: 1550 + Number(((1550 * brand.tasaImpuestoDefecto) / 100).toFixed(2)),
    },
    formaPago: '50% anticipo, 50% entrega',
    diasValidez: brand.validezCotizacionDiasDefecto,
    mesesGarantia: brand.garantiaMesesDefecto,
    elaboradoPor: 'Ana Torres',
  };
}

function buildRemisionSample(brand: OrgBrandingContext): DatosRemisionPDF {
  return {
    branding: brand,
    numeroRemision: 'REM-2026-077',
    fechaEmision: '15/11/2026',
    horaEmision: '07:45',
    estado: 'ENTREGADA',
    ordenServicio: {
      numeroOrden: 'OT-202611-0042',
      cliente: 'Torre Empresarial Central',
      ubicacion: brand.ciudadDefecto,
      tipoServicio: 'PREVENTIVO',
    },
    tecnicoReceptor: {
      nombre: 'Laura Méndez',
      cargo: 'Técnico Especialista',
      identificacion: '10123456',
    },
    responsableBodega: {
      nombre: 'Diego Paredes',
      cargo: 'Coordinador Almacén',
    },
    items: [
      {
        orden: 1,
        codigoInterno: 'FIL-10',
        descripcion: 'Filtro hidráulico de alta presión',
        unidad: 'UND',
        cantidadSolicitada: 2,
        cantidadEntregada: 2,
      },
    ],
  };
}

function buildOrdenCompraSample(brand: OrgBrandingContext): DatosOrdenCompraPDF {
  return {
    branding: brand,
    numeroOrdenCompra: 'OC-2026-031',
    fechaEmision: '15/11/2026',
    fechaEntregaRequerida: '20/11/2026',
    estado: 'ENVIADA',
    proveedor: {
      nombre: 'Suministros OEM Internacionales',
      nit: '900.888.777-1',
      direccion: brand.ciudadDefecto,
    },
    items: [
      {
        orden: 1,
        descripcion: 'Variador de frecuencia 15kW',
        cantidad: 1,
        unidad: 'UND',
        precioUnitario: 2400,
        subtotal: 2400,
      },
    ],
    totales: {
      subtotal: 2400,
      descuentoPorcentaje: 0,
      descuentoValor: 0,
      ivaPorcentaje: brand.tasaImpuestoDefecto,
      ivaValor: Number(((2400 * brand.tasaImpuestoDefecto) / 100).toFixed(2)),
      total: 2400 + Number(((2400 * brand.tasaImpuestoDefecto) / 100).toFixed(2)),
    },
    condicionesPago: '30 días fecha factura',
    lugarEntrega: `${brand.direccionLinea1}, ${brand.ciudadDefecto}`,
    solicitadoPor: 'Diego Paredes',
  };
}

function buildTrazabilidadSample(brand: OrgBrandingContext): DatosTrazabilidadClientePDF {
  return {
    branding: brand,
    cliente: {
      nombre: 'Torre Empresarial Central',
      nit: '800.111.222-3',
      ciudad: brand.ciudadDefecto,
    },
    periodo: {
      fechaGeneracion: '15 de noviembre de 2026',
    },
    filtrosAplicados: {},
    resumenKpis: {
      totalOrdenes: 1,
      totalPreventivos: 1,
      totalCorrectivos: 0,
      totalEmergencias: 0,
      totalEquiposAuditados: 1,
    },
    ordenes: [
      {
        id_orden_servicio: 1,
        numero_orden: 'OT-202611-0042',
        fecha: '15 nov 2026',
        estado: 'COMPLETADA',
        tipoServicio: 'Preventivo',
        categoria: 'PREVENTIVO',
        equipos: [{ nombre: 'Ascensor 1', codigo: 'ASC-1', tipo: 'ASCENSOR', horas: 12500 }],
        serviciosEspecificos: [],
        diagnosticoTrabajo: { cierre: 'Sin novedades' },
        tecnico: 'Laura Méndez',
      },
    ],
  };
}

describe('Gate F3 — Motor Documental PDF & Emails 100% White-Label', () => {
  const tenants = [makeTenantAscensores(), makeTenantClimaTotal()];

  it('Todos los templates PDF (UNIVERSAL_EAM, CORRECTIVO, COTIZACION, PROPUESTA, REMISION, OC, TRAZABILIDAD) renderizan identidad dinámica sin rastros legacy para 2 organizaciones distintas', () => {
    const pdfService = new PdfService();

    for (const brand of tenants) {
      const ordenAscensor = buildOrdenSample(brand, 'ASCENSOR');
      const ordenGenerador = buildOrdenSample(brand, 'GENERADOR');
      const cotizacion = buildCotizacionSample(brand);
      const propuesta = buildPropuestaSample(brand);
      const remision = buildRemisionSample(brand);
      const ordenCompra = buildOrdenCompraSample(brand);
      const trazabilidad = buildTrazabilidadSample(brand);

      const renderedDocs = [
        pdfService.obtenerHTML('UNIVERSAL_EAM', ordenAscensor, brand),
        pdfService.obtenerHTML('UNIVERSAL_EAM', ordenGenerador, brand),
        pdfService.obtenerHTML('CORRECTIVO', ordenAscensor, brand),
        pdfService.obtenerHTML('COTIZACION', cotizacion, brand),
        pdfService.obtenerHTML('PROPUESTA_CORRECTIVO', propuesta, brand),
        pdfService.obtenerHTML('REMISION', remision, brand),
        pdfService.obtenerHTML('ORDEN_COMPRA', ordenCompra, brand),
        pdfService.obtenerHTML('TRAZABILIDAD', trazabilidad, brand),
      ];

      for (const html of renderedDocs) {
        expect(html).not.toMatch(FORBIDDEN_LEGACY_BRAND_REGEX);
        expect(html).toContain(brand.nombreComercial);
        expect(html).toContain(brand.colores.primary);
        expect(html).toContain(brand.numeroIdFiscal!);
      }

      // Verificar moneda e impuesto diferenciados entre ambos tenants
      const htmlCot = renderedDocs[3];
      expect(htmlCot).toContain(brand.etiquetaImpuesto);
      if (brand.codigoMoneda === 'USD') {
        expect(htmlCot).toContain('2,000.00');
        expect(htmlCot).not.toContain('€');
      } else {
        expect(htmlCot).toContain('€');
        expect(htmlCot).toContain('21%');
      }
    }
  });

  it('Templates de Email (EmailTemplatesService, EmailService, EnviarCotizacionHandler) renderizan branding dinámico y moneda real sin rastros legacy', async () => {
    const templatesSvc = new EmailTemplatesService();
    const cotHandler = new EnviarCotizacionHandler({} as any, {} as any, {} as any, {} as any);

    for (const brand of tenants) {
      const htmlInforme = templatesSvc.generateInformeMantenimientoTemplate({
        branding: brand,
        ordenNumero: 'OT-202611-0042',
        tipoServicio: 'PREVENTIVO',
        clienteNombre: 'Cliente Demo',
        clienteCiudad: brand.ciudadDefecto,
        fechaServicio: '15/11/2026',
        tecnicoNombre: 'Laura Méndez',
      });
      expect(htmlInforme).not.toMatch(FORBIDDEN_LEGACY_BRAND_REGEX);
      expect(htmlInforme).toContain(brand.nombreComercial);
      expect(htmlInforme).toContain(brand.colores.primary);
      expect(htmlInforme).toContain(brand.emailContacto!);
      expect(htmlInforme).toContain(brand.telefonoPrincipal!);

      const cot = buildCotizacionSample(brand);
      const htmlCotEmail = cotHandler.generarCuerpoEmail(
        cot,
        'Director Compras',
        {
          nombre: 'Carlos Ruiz',
          cargo: 'Asesor Comercial',
          telefono: brand.telefonoPrincipal!,
          email: brand.emailContacto!,
        },
        brand,
      );
      expect(htmlCotEmail).not.toMatch(FORBIDDEN_LEGACY_BRAND_REGEX);
      expect(htmlCotEmail).toContain(brand.nombreComercial);
      expect(htmlCotEmail).toContain(formatCurrencyOrg(cot.totales.totalCotizacion, brand));

      const mockConfigOrg = {
        getContext: jest.fn().mockResolvedValue({
          nombre_comercial: brand.nombreComercial,
          razon_social: brand.razonSocial,
          tipo_id_fiscal: brand.tipoIdFiscal,
          numero_id_fiscal: brand.numeroIdFiscal,
          eslogan: brand.eslogan,
          email_contacto: brand.emailContacto,
          telefono_principal: brand.telefonoPrincipal,
          ciudad_defecto: brand.ciudadDefecto,
          pais_defecto: brand.paisDefecto,
          color_primario: brand.colores.primary,
          color_secundario: brand.colores.secondary,
          color_acento: brand.colores.accent,
          color_exito: brand.colores.success,
          locale: brand.locale,
          zona_horaria: brand.zonaHoraria,
          codigo_moneda: brand.codigoMoneda,
          simbolo_moneda: brand.simboloMoneda,
          decimales_moneda: brand.decimalesMoneda,
          etiqueta_impuesto: brand.etiquetaImpuesto,
          tasa_impuesto_defecto: brand.tasaImpuestoDefecto,
        }),
      };
      const emailSvc = new EmailService({} as any, mockConfigOrg as any);
      const sendSpy = jest.spyOn(emailSvc, 'sendEmail');

      await emailSvc.sendInformeTecnicoEmail(
        {
          ordenNumero: 'OT-202611-0042',
          clienteNombre: 'Cliente Demo',
          equipoDescripcion: 'Equipo Industrial 1',
          tipoMantenimiento: 'Preventivo',
          fechaServicio: '15/11/2026',
          tecnicoNombre: 'Laura Méndez',
        },
        'cliente@demo.test',
        Buffer.from('%PDF-1.4'),
      );

      expect(sendSpy).toHaveBeenCalledTimes(1);
      const sentArg = sendSpy.mock.calls[0][0];
      expect(sentArg.subject).toContain(brand.nombreComercial);
      expect(sentArg.subject).not.toMatch(FORBIDDEN_LEGACY_BRAND_REGEX);
      expect(sentArg.html).toContain(brand.nombreComercial);
      expect(sentArg.html).toContain(brand.colores.primary);
      expect(sentArg.html).not.toMatch(FORBIDDEN_LEGACY_BRAND_REGEX);
    }
  });

  it('PdfService elimina instalación runtime vía child_process/execSync y falla con mensaje accionable si no hay Chromium', async () => {
    const pdfServiceSource = fs.readFileSync(require.resolve('./pdf.service'), 'utf8');
    expect(pdfServiceSource).not.toMatch(/execSync|child_process/);

    const prevExecPath = process.env.PUPPETEER_EXECUTABLE_PATH;
    delete process.env.PUPPETEER_EXECUTABLE_PATH;
    try {
      const pdfService = new PdfService();
      (pdfService as any).resolverChromePath = () => null;
      await expect(
        pdfService.generarPDF({
          tipoInforme: 'UNIVERSAL_EAM',
          datos: buildOrdenSample(tenants[0], 'ASCENSOR'),
        }),
      ).rejects.toThrow(/Chromium|PUPPETEER_EXECUTABLE_PATH/i);
    } finally {
      if (prevExecPath !== undefined) {
        process.env.PUPPETEER_EXECUTABLE_PATH = prevExecPath;
      }
    }
  });

  it('PdfAssemblerService ensambla Orden en Madrid/EUR sin hardcode OS-202607-0134 ni Cartagena y ensambla Cotización tipada', async () => {
    const clima = tenants[1];
    const mockConfigOrg = {
      getContext: jest.fn().mockResolvedValue({
        nombre_comercial: clima.nombreComercial,
        razon_social: clima.razonSocial,
        tipo_id_fiscal: clima.tipoIdFiscal,
        numero_id_fiscal: clima.numeroIdFiscal,
        ciudad_defecto: clima.ciudadDefecto,
        pais_defecto: clima.paisDefecto,
        color_primario: clima.colores.primary,
        color_secundario: clima.colores.secondary,
        color_acento: clima.colores.accent,
        locale: clima.locale,
        zona_horaria: clima.zonaHoraria,
        codigo_moneda: clima.codigoMoneda,
        simbolo_moneda: clima.simboloMoneda,
        decimales_moneda: clima.decimalesMoneda,
        etiqueta_impuesto: clima.etiquetaImpuesto,
        tasa_impuesto_defecto: clima.tasaImpuestoDefecto,
        validez_cotizacion_dias_defecto: 30,
        garantia_meses_defecto: 12,
      }),
      resolveLogoDataUri: jest.fn().mockResolvedValue(null),
    };

    const mockPrisma = {
      ordenes_servicio: {
        findUnique: jest.fn().mockResolvedValue({
          id_orden_servicio: 901,
          numero_orden: 'OS-202607-0134',
          fecha_inicio_real: new Date('2026-07-10T10:30:00.000Z'),
          fecha_fin_real: new Date('2026-07-10T12:15:00.000Z'),
          horometro_final: 540,
          tipos_servicio: {
            codigo_tipo: 'PREV_CHILLER',
            nombre_tipo: 'Preventivo Chiller',
            categoria: 'PREVENTIVO',
          },
          clientes: {
            persona: {
              razon_social: 'Hotel Retiro S.L.',
              tipo_identificacion: 'NIF',
              numero_identificacion: 'B-99887766',
              direccion_principal: 'Paseo del Prado 10',
              email_principal: 'mant@retiro.test',
              ciudad: 'Madrid',
            },
            emails_notificacion: 'dir@retiro.test',
          },
          sedes_cliente: {
            nombre_sede: 'Anexo Sur',
            direccion_sede: 'Calle Méndez Álvaro 5',
            ciudad_sede: 'Madrid',
          },
          equipos: {
            codigo_equipo: 'CH-09',
            nombre_equipo: 'Chiller Principal',
            numero_serie_equipo: 'SN-CH-99',
            lectura_uso_actual: 540,
            tipos_equipo: {
              codigo_tipo: 'CHILLER',
              nombre_tipo: 'CHILLER',
              usa_plantilla_universal: true,
              unidad_uso: 'HORAS',
              etiqueta_contador: 'Horas compresor',
            },
          },
          empleados_ordenes_servicio_id_tecnico_asignadoToempleados: {
            persona: { primer_nombre: 'Javier', primer_apellido: 'López' },
          },
          actividades_ejecutadas: [],
          mediciones_servicio: [
            {
              valor_numerico: 42.5,
              unidad_medida: '°C',
              nivel_alerta: 'OK',
              parametros_medicion: {
                nombre_parametro: 'Temperatura descarga',
                unidad_medida: '°C',
              },
            },
          ],
          evidencias_fotograficas: [],
          ordenes_equipos: [],
          ordenes_pendientes: [],
          componentes_usados: [],
        }),
      },
      lotes_galeria: { findMany: jest.fn().mockResolvedValue([]) },
      lecturas_horometro: { findFirst: jest.fn().mockResolvedValue(null) },
      cotizaciones: {
        findUnique: jest.fn().mockResolvedValue({
          id_cotizacion: 55,
          numero_cotizacion: 'PRES-2026-055',
          asunto: 'Cambio compresor tornillo',
          dias_validez: 20,
          version: 2,
          iva_porcentaje: 21,
          forma_pago: 'Transferencia 30 días',
          meses_garantia: 12,
          clientes: {
            persona: {
              razon_social: 'Hotel Retiro S.L.',
              numero_identificacion: 'B-99887766',
              direccion_principal: 'Paseo del Prado 10',
            },
          },
          empleados: { persona: { primer_nombre: 'Elena', primer_apellido: 'Gómez' } },
          items_cotizacion_servicios: [
            {
              orden_item: 1,
              cantidad: 1,
              unidad: 'SRV',
              precio_unitario: 1000,
              descuento_porcentaje: 0,
              subtotal: 1000,
              catalogo_servicios: { nombre_servicio: 'Instalación compresor' },
            },
          ],
          items_cotizacion_componentes: [
            {
              orden_item: 1,
              descripcion: 'Compresor Bitzer',
              cantidad: 1,
              unidad: 'UND',
              precio_unitario: 3000,
              descuento_porcentaje: 0,
              subtotal: 3000,
              catalogo_componentes: { codigo_interno: 'CMP-BZ-1' },
            },
          ],
        }),
      },
    };

    const pdfService = new PdfService(mockConfigOrg as any);
    const assembler = new PdfAssemblerService(mockPrisma as any, pdfService, mockConfigOrg as any);

    const assembledOrden = await assembler.assembleOrdenPdf(901);
    expect(assembledOrden.tipoInforme).toBe('UNIVERSAL_EAM');
    // Verifica desaparición del hardcode OS-202607-0134: las mediciones se conservan intactas
    expect(assembledOrden.datosOrden.mediciones).toHaveLength(1);
    // Verifica zona horaria Europe/Madrid (UTC 10:30 en julio = CEST 12:30)
    expect(assembledOrden.datosOrden.horaEntrada).toBe('12:30');
    expect(assembledOrden.emailContext.ciudad).toBe('Madrid');
    expect(assembledOrden.datosOrden.equipoDetalle?.clienteNit).toBe('NIF: B-99887766');

    const assembledCot = await assembler.assembleCotizacionPdf(55);
    expect(assembledCot.datosCotizacion.numeroCotizacion).toBe('PRES-2026-055');
    expect(assembledCot.datosCotizacion.totales.subtotalGeneral).toBe(4000);
    expect(assembledCot.datosCotizacion.totales.ivaPorcentaje).toBe(21);
    expect(assembledCot.datosCotizacion.totales.totalCotizacion).toBe(4840);
    const htmlCot = pdfService.obtenerHTML(
      'COTIZACION',
      assembledCot.datosCotizacion,
      assembledCot.branding,
    );
    expect(htmlCot).toContain('PRES-2026-055');
    expect(htmlCot).toContain('€');
    expect(htmlCot).not.toMatch(/mekanos|cartagena|900\.542|315-708/i);
  });

  it('PdfController exige JwtAuthGuard + RolesGuard + PermisosGuard y @Permisos granulares en todos los endpoints', () => {
    const classGuards = Reflect.getMetadata(GUARDS_METADATA, PdfController) || [];
    expect(classGuards).toEqual(expect.arrayContaining([JwtAuthGuard, RolesGuard, PermisosGuard]));

    const expectations: Record<keyof PdfController, string[]> = {
      generarPdfOrden: ['INFORMES_READ'],
      generarPdfCotizacion: ['COTIZACIONES_READ'],
      generarPdfVersionCotizacion: ['COTIZACIONES_READ'],
      generarPdfCotizacionPrueba: ['CONFIG_SYSTEM'],
      generarPdfPrueba: ['CONFIG_SYSTEM'],
      regenerarPdfOrden: ['INFORMES_CREATE'],
      enviarPdfExistente: ['INFORMES_CREATE'],
    };

    for (const [methodName, expectedPermisos] of Object.entries(expectations)) {
      const handler = PdfController.prototype[methodName as keyof PdfController];
      const permisos = Reflect.getMetadata(PERMISOS_KEY, handler);
      expect(permisos).toEqual(expectedPermisos);
    }
  });

  it('Cotización PDF renderiza listas estructuradas de Alcance/Exclusiones y firmas digitales opcionales en ambos layouts', () => {
    const pdfService = new PdfService();
    const fakePng =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const baseDatos: any = {
      numeroCotizacion: 'COT-2026-9999',
      fechaCotizacion: '23/11/2026',
      fechaVencimiento: '23/12/2026',
      diasValidez: 30,
      version: 1,
      asunto: 'Suministro de Banco de Baterías',
      alcanceTrabajo:
        '- Desmonte de baterías viejas\n• Suministro de nuevas baterías\n1. Pruebas de arranque',
      exclusiones: '✕ Pruebas con carga\n- Obra civil',
      cliente: { nombre: 'Cliente Prueba S.A.S.', direccion: 'Calle 10 # 20-30' },
      itemsServicios: [],
      itemsComponentes: [],
      itemsOtros: [],
      itemsOpcionales: [],
      totales: {
        subtotalServicios: 0,
        subtotalComponentes: 0,
        subtotalGeneral: 1000000,
        descuentoPorcentaje: 0,
        descuentoValor: 0,
        subtotalConDescuento: 1000000,
        ivaPorcentaje: 19,
        ivaValor: 190000,
        totalCotizacion: 1190000,
      },
      formaPago: 'CONTADO',
      mesesGarantia: 3,
      elaboradoPor: 'Asesor Comercial Prueba',
      mostrarDesglosePrecios: false,
      firmaAsesorDataUri: fakePng,
    };

    const htmlSumaAlzada = pdfService.obtenerHTML('COTIZACION', baseDatos);
    expect(htmlSumaAlzada).toContain('ed-alcance-list');
    expect(htmlSumaAlzada).toContain('closing-keep-together');
    expect(htmlSumaAlzada).toContain('ed-firma-space has-digital');
    expect(htmlSumaAlzada).toContain('Desmonte de baterías viejas');
    expect(htmlSumaAlzada).toContain('Pruebas con carga');
    expect(htmlSumaAlzada).not.toContain('- Desmonte');
    expect(htmlSumaAlzada).toContain('class="ed-firma-img"');
    expect(htmlSumaAlzada).toContain('Firma del Asesor Emisor');
    expect(htmlSumaAlzada).not.toContain('Firma de Aceptación del Cliente');

    const htmlDetalladoSinFirmas = pdfService.obtenerHTML('COTIZACION', {
      ...baseDatos,
      mostrarDesglosePrecios: true,
      firmaAsesorDataUri: undefined,
      firmaClienteDataUri: undefined,
    });
    expect(htmlDetalladoSinFirmas).toContain('ed-alcance-list');
    expect(htmlDetalladoSinFirmas).toContain('closing-keep-together');
    expect(htmlDetalladoSinFirmas).toContain('ed-firma-space is-physical');
    expect(htmlDetalladoSinFirmas).not.toContain('class="ed-firma-img"');
  });
});
