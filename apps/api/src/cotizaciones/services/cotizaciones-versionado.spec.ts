import { CommandBus } from '@nestjs/cqrs';
import { PdfAssemblerService } from '../../pdf/pdf-assembler.service';
import { PdfService } from '../../pdf/pdf.service';
import { CreateVersionCommand } from '../commands/versiones/create-version.command';
import { CotizacionesCpqService } from './cotizaciones-cpq.service';

describe('Versionado v2+, Reapertura a BORRADOR, Marca de Agua y PDF Histórico', () => {
  it('reabrirBorrador archiva snapshot v1, promueve versión activa inmediatamente a v2 y limpia aprobación', async () => {
    const prismaMock: any = {
      cotizaciones: {
        findUnique: jest.fn().mockResolvedValue({
          id_cotizacion: 6,
          id_estado: 3, // APROBADA_INTERNA
          id_orden_servicio_generada: null,
          version: 1,
        }),
        update: jest.fn().mockResolvedValue({
          id_cotizacion: 6,
          id_estado: 1,
          version: 2,
        }),
      },
      aprobaciones_cotizacion: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };

    const commandBusMock: Partial<CommandBus> = {
      execute: jest.fn().mockResolvedValue({
        version: {
          id_version: 11,
          numero_version: 1,
          total: 1892100,
        },
      }),
    };

    const repoMock: any = {
      findById: jest.fn().mockResolvedValue({
        id_cotizacion: 6,
        numero_cotizacion: 'COT-2026-0006',
        id_estado: 1,
        version: 2,
        estado: { id_estado: 1, codigo_estado: 'BORRADOR', nombre_estado: 'Borrador' },
        versiones: [{ id_version: 11, numero_version: 1, total_version: 1892100 }],
      }),
    };

    const service = new CotizacionesCpqService(
      prismaMock,
      {} as any,
      commandBusMock as CommandBus,
      repoMock,
    );

    const result = await service.reabrirBorrador(6, 'Cliente solicitó ajuste de precio', 99);

    expect(commandBusMock.execute).toHaveBeenCalledWith(expect.any(CreateVersionCommand));
    expect(prismaMock.cotizaciones.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id_cotizacion: 6 },
        data: expect.objectContaining({
          id_estado: 1,
          version: 2,
          aprobada_internamente_por: null,
          fecha_aprobacion_interna: null,
          modificado_por: 99,
        }),
      }),
    );
    expect(result.nueva_version).toBe(2);
    expect(result.cotizacion?.version).toBe(2);
    expect(result.cotizacion?.id_estado).toBe(1);
    expect(result.message).toContain('v2');
    expect(result.message).toContain('snapshot v1 archivado');
  });

  it('PDF muestra marca de agua BORRADOR incluso en Modo Ágil y la retira al aprobar internamente', async () => {
    const baseCot = {
      id_cotizacion: 6,
      numero_cotizacion: 'COT-2026-0006',
      version: 2,
      asunto: 'Overhaul Turbo v2',
      fecha_cotizacion: new Date('2026-11-26T00:00:00Z'),
      fecha_vencimiento: new Date('2026-12-26T00:00:00Z'),
      dias_validez: 30,
      subtotal_servicios: 1000000,
      subtotal_componentes: 0,
      subtotal_otros: 0,
      subtotal_general: 1000000,
      descuento_porcentaje: 0,
      descuento_valor: 0,
      subtotal_con_descuento: 1000000,
      iva_porcentaje: 19,
      iva_valor: 190000,
      total_cotizacion: 1190000,
      clientes: { persona: { razon_social: 'CEDESARROLLO' } },
      items_cotizacion_servicios: [],
      items_cotizacion_componentes: [],
      items_cotizacion_otros: [],
      cotizaciones_equipos: [],
    };

    const prismaMock: any = {
      configuracion_organizacion: {
        findUnique: jest.fn().mockResolvedValue({
          id_configuracion: 1,
          nombre_comercial: 'Ingeniería & Potencia Global',
          enable_cpq_governance: false, // Modo ágil
        }),
      },
      tipos_oferta_cotizacion: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      cotizaciones: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce({
            ...baseCot,
            id_estado: 1,
            estados_cotizacion: { codigo_estado: 'BORRADOR', nombre_estado: 'Borrador' },
          })
          .mockResolvedValueOnce({
            ...baseCot,
            id_estado: 3,
            estados_cotizacion: {
              codigo_estado: 'APROBADA_INTERNA',
              nombre_estado: 'Aprobada Interna',
            },
          }),
      },
    };

    const assembler = new PdfAssemblerService(prismaMock);
    const pdfService = new PdfService();

    // 1. Reabierta v2 en BORRADOR (aun en Modo Ágil) => DEBE mostrar marca de agua BORRADOR
    const borradorRes = await assembler.assembleCotizacionPdf(6);
    expect(borradorRes.datosCotizacion.version).toBe(2);
    expect(borradorRes.datosCotizacion.mostrarMarcaAguaBorrador).toBe(true);
    const htmlBorrador = pdfService.obtenerHTML(
      'COTIZACION',
      borradorRes.datosCotizacion,
      borradorRes.branding,
    );
    expect(htmlBorrador).toContain('<div class="gov-watermark-layer"');
    expect(htmlBorrador).toContain('BORRADOR — PENDIENTE DE APROBACIÓN');
    expect(htmlBorrador).toContain('Versión 2');

    // 2. Aprobada internamente => NO muestra marca de agua
    const aprobadaRes = await assembler.assembleCotizacionPdf(6);
    expect(aprobadaRes.datosCotizacion.mostrarMarcaAguaBorrador).toBe(false);
    const htmlAprobada = pdfService.obtenerHTML(
      'COTIZACION',
      aprobadaRes.datosCotizacion,
      aprobadaRes.branding,
    );
    expect(htmlAprobada).not.toContain('<div class="gov-watermark-layer"');
  });

  it('assembleCotizacionVersionPdf reconstruye fielmente snapshot histórico v1 con override de presentación sin alterar la v2 activa', async () => {
    const prismaMock: any = {
      configuracion_organizacion: {
        findUnique: jest.fn().mockResolvedValue({
          id_configuracion: 1,
          nombre_comercial: 'Ingeniería & Potencia Global',
          codigo_moneda: 'COP',
          simbolo_moneda: '$',
          locale_formato: 'es-CO',
        }),
      },
      tipos_oferta_cotizacion: {
        findUnique: jest.fn().mockResolvedValue({ nombre: 'Overhaul Turbo Especiales' }),
      },
      versiones_cotizacion: {
        findUnique: jest.fn().mockResolvedValue({
          id_version: 11,
          id_cotizacion: 6,
          numero_version: 1,
          fecha_version: new Date('2026-11-25T15:00:00Z'),
          motivo_cambio: 'Muy costosa con 50% de descuento',
          subtotal_version: 3180000,
          total_version: 1892100,
          datos_cotizacion: {
            numero_cotizacion: 'COT-2026-0006',
            tipo_cotizacion: 'OVERHAUL_TURBO_ESPECIALES',
            asunto: 'Oferta v1 Original',
            estado: 'APROBADA_INTERNA',
            subtotal_servicios: 1000000,
            subtotal_componentes: 1680000,
            subtotal_otros: 500000,
            subtotal_general: 3180000,
            descuento_porcentaje: 50,
            descuento_valor: 1590000,
            subtotal_con_descuento: 1590000,
            iva_porcentaje: 19,
            iva_valor: 302100,
            total_cotizacion: 1892100,
            forma_pago: 'Contado',
            meses_garantia: 3,
            equipos_vinculados: [
              {
                id_equipo: 10,
                codigo_equipo: 'GEN-CEDE-EUW5T3',
                nombre_equipo: '#1 PLANTA PERKINS',
                tipo_equipo: 'GENERADOR ELÉCTRICO',
              },
            ],
            items_otros: [
              {
                categoria_rubro: 'OTRO',
                descripcion: 'PRUEBA_BANCO_CARGA',
                cantidad: 1,
                unidad: 'global',
                precio_unitario: 500000,
                subtotal: 500000,
                visible_cliente: true,
                es_opcional: false,
                iva_aplicable: true,
              },
              {
                categoria_rubro: 'VIATICOS',
                descripcion: 'Viáticos absorbidos ocultos',
                cantidad: 1,
                unidad: 'global',
                costo_unitario: 200000,
                precio_unitario: 0,
                subtotal: 0,
                visible_cliente: false,
                es_opcional: false,
              },
            ],
          },
          items_servicios: [
            {
              descripcion: 'REVISIÓN DE SISTEMA DE COMBUSTIBLE',
              cantidad: 2,
              unidad: 'servicio',
              precio_unitario: 500000,
              subtotal: 1000000,
              es_opcional: false,
              iva_aplicable: true,
            },
          ],
          items_componentes: [
            {
              descripcion: 'BATERÍA AGM 12V 200AH',
              cantidad: 2,
              unidad: 'und',
              precio_unitario: 840000,
              subtotal: 1680000,
              es_opcional: false,
              iva_aplicable: true,
            },
          ],
          cotizaciones: {
            id_cotizacion: 6,
            numero_cotizacion: 'COT-2026-0006',
            version: 2, // Cotización activa ya es v2
            asunto: 'Oferta v2 Modificada',
            atencion_a_nombre: 'TATIANA BOLAÑOS',
            clientes: {
              persona: { razon_social: 'CEDESARROLLO', numero_identificacion: '900123' },
            },
            cotizaciones_equipos: [],
            empleados: { persona: { nombre_completo: 'JAVIER HOYOS' } },
          },
        }),
      },
    };

    const assembler = new PdfAssemblerService(prismaMock);
    const pdfService = new PdfService();

    const res = await assembler.assembleCotizacionVersionPdf(11, true);
    expect(res.datosCotizacion.version).toBe(1);
    expect(res.datosCotizacion.esCopiaHistorica).toBe(true);
    expect(res.datosCotizacion.asunto).toBe('Oferta v1 Original');
    expect(res.datosCotizacion.totales.totalCotizacion).toBe(1892100);
    expect(res.datosCotizacion.totales.descuentoPorcentaje).toBe(50);
    expect(res.datosCotizacion.mostrarDesglosePrecios).toBe(true);
    expect(res.datosCotizacion.mostrarMarcaAguaBorrador).toBe(false); // v1 fue archivada en APROBADA_INTERNA
    expect(res.datosCotizacion.itemsOtros).toHaveLength(1); // Oculta el rubro visible_cliente=false

    const html = pdfService.obtenerHTML('COTIZACION', res.datosCotizacion, res.branding);
    expect(html).toContain('Versión 1');
    expect(html).toContain('SNAPSHOT ARCHIVADO');
    expect(html).toContain('Oferta v1 Original');
    expect(html).not.toContain('Viáticos absorbidos ocultos');
  });

  it('assembleCotizacionVersionPdf preserva inmutabilidad del cliente histórico cuando la cotización activa cambia a otro cliente', async () => {
    const prismaMock: any = {
      configuracion_organizacion: {
        findUnique: jest.fn().mockResolvedValue({
          id_configuracion: 1,
          nombre_comercial: 'Ingeniería & Potencia Global',
          codigo_moneda: 'COP',
          simbolo_moneda: '$',
          locale_formato: 'es-CO',
          ciudad_defecto: 'Cartagena de Indias',
        }),
      },
      tipos_oferta_cotizacion: {
        findUnique: jest.fn().mockResolvedValue({ nombre: 'Overhaul Turbo Especiales' }),
      },
      clientes: {
        findFirst: jest.fn().mockResolvedValue({
          id_cliente: 44,
          persona: {
            razon_social: 'COMFENALCO',
            numero_identificacion: '890480023-7',
            direccion_principal: 'Av. Pedro de Heredia #30-10',
            telefono_principal: '6056600000',
            email_principal: 'compras@comfenalco.com',
          },
        }),
      },
      versiones_cotizacion: {
        findUnique: jest.fn().mockResolvedValue({
          id_version: 21,
          id_cotizacion: 12,
          numero_version: 1,
          fecha_version: new Date('2026-11-26T04:55:10.045Z'),
          motivo_cambio: 'Renegociación inicial',
          subtotal_version: 1000000,
          total_version: 1190000,
          datos_cotizacion: {
            numero_cotizacion: 'COT-2026-0006',
            estado: 'APROBADA_INTERNA',
            asunto: 'Snapshot v1 COMFENALCO',
            cliente: { razon_social: 'COMFENALCO' },
            subtotal_general: 1000000,
            iva_porcentaje: 19,
            iva_valor: 190000,
            total_cotizacion: 1190000,
          },
          items_servicios: [],
          items_componentes: [],
          cotizaciones: {
            id_cotizacion: 12,
            id_cliente: 99,
            numero_cotizacion: 'COT-2026-0006',
            version: 5,
            clientes: {
              persona: {
                razon_social: 'Test Refac',
                numero_identificacion: '900999888-1',
                direccion_principal: 'Calle 100 #45-67',
                telefono_principal: '6011234567',
                email_principal: 'test@refac.com',
              },
            },
            sedes_cliente: {
              nombre_sede: 'Sede Test Refac',
              direccion_sede: 'Calle 100 #45-67',
              email_sede: 'sede@refac.com',
            },
            cotizaciones_equipos: [],
            empleados: { persona: { nombre_completo: 'JAVIER HOYOS' } },
          },
        }),
      },
    };

    const assembler = new PdfAssemblerService(prismaMock);
    const res = await assembler.assembleCotizacionVersionPdf(21, true);

    expect(res.datosCotizacion.cliente.nombre).toBe('COMFENALCO');
    expect(res.datosCotizacion.cliente.nit).toBe('890480023-7');
    expect(res.datosCotizacion.cliente.direccion).toBe('Av. Pedro de Heredia #30-10');
    expect(res.datosCotizacion.cliente.email).toBe('compras@comfenalco.com');
    // Jamás debe contaminar con datos del cliente activo Test Refac
    expect(res.datosCotizacion.cliente.nit).not.toBe('900999888-1');
    expect(res.datosCotizacion.cliente.email).not.toBe('test@refac.com');
    expect(res.datosCotizacion.cliente.direccion).not.toContain('Calle 100');
  });
});
