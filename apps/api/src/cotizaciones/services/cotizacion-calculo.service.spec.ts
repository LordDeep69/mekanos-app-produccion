import { Decimal } from '@prisma/client/runtime/library';
import { CotizacionCalculoService } from './cotizacion-calculo.service';

describe('CotizacionCalculoService (Motor Financiero & Rentabilidad EAM-CPQ)', () => {
  const createMockPrisma = (scenario: {
    cotizacion: any;
    orgConfig?: any;
    servicios?: any[];
    componentes?: any[];
    otros?: any[];
  }) => {
    const updateCalls: any[] = [];
    const prisma: any = {
      cotizaciones: {
        findUnique: jest.fn().mockResolvedValue(scenario.cotizacion),
        update: jest.fn().mockImplementation(async (args: any) => {
          updateCalls.push(args);
          return args.data;
        }),
      },
      configuracion_organizacion: {
        findUnique: jest
          .fn()
          .mockResolvedValue(scenario.orgConfig ?? { tasa_impuesto_defecto: new Decimal(19) }),
      },
      items_cotizacion_servicios: {
        findMany: jest.fn().mockResolvedValue(scenario.servicios ?? []),
        update: jest.fn().mockResolvedValue({}),
      },
      items_cotizacion_componentes: {
        findMany: jest.fn().mockResolvedValue(scenario.componentes ?? []),
        update: jest.fn().mockResolvedValue({}),
      },
      items_cotizacion_otros: {
        findMany: jest.fn().mockResolvedValue(scenario.otros ?? []),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    return { prisma, updateCalls };
  };

  it('calcula servicios + repuestos + otros visibles, separa opcionales y absorbe costos ocultos en rentabilidad', async () => {
    const { prisma } = createMockPrisma({
      cotizacion: {
        id_cotizacion: 1,
        descuento_porcentaje: new Decimal(10),
        iva_porcentaje: new Decimal(19),
        usa_aiu: false,
        aiu_admin_porcentaje: new Decimal(0),
        aiu_imprevistos_porcentaje: new Decimal(0),
        aiu_utilidad_porcentaje: new Decimal(0),
        iva_sobre_utilidad_aiu: false,
      },
      servicios: [
        {
          id_item_servicio: 1,
          cantidad: new Decimal(2),
          precio_unitario: new Decimal(500000),
          costo_unitario: new Decimal(200000),
          descuento_porcentaje: new Decimal(0),
          subtotal: new Decimal(1000000),
          es_opcional: false,
          iva_aplicable: true,
        },
        {
          id_item_servicio: 2,
          cantidad: new Decimal(1),
          precio_unitario: new Decimal(300000),
          costo_unitario: new Decimal(100000),
          descuento_porcentaje: new Decimal(0),
          subtotal: new Decimal(300000),
          es_opcional: true, // Opcional: NO debe sumar al total ni al costo base
          iva_aplicable: true,
        },
      ],
      componentes: [
        {
          id_item_componente: 1,
          cantidad: new Decimal(2),
          precio_unitario: new Decimal(400000),
          costo_unitario: new Decimal(250000),
          descuento_porcentaje: new Decimal(0),
          subtotal: new Decimal(800000),
          es_opcional: false,
          iva_aplicable: true,
        },
      ],
      otros: [
        {
          id_item_otro: 1,
          cantidad: new Decimal(1),
          precio_unitario: new Decimal(200000),
          costo_unitario: new Decimal(120000),
          descuento_porcentaje: new Decimal(0),
          subtotal: new Decimal(200000),
          visible_cliente: true,
          es_opcional: false,
          iva_aplicable: false, // Ej. póliza / reembolsable exento de IVA
        },
        {
          id_item_otro: 2,
          cantidad: new Decimal(1),
          precio_unitario: new Decimal(0),
          costo_unitario: new Decimal(180000), // Viático absorbido (oculto al cliente)
          descuento_porcentaje: new Decimal(0),
          subtotal: new Decimal(0),
          visible_cliente: false,
          es_opcional: false,
          iva_aplicable: false,
        },
      ],
    });

    const service = new CotizacionCalculoService(prisma);
    const res = await service.recalcularTotales(1);

    // Servicios: 1,000,000 | Componentes: 800,000 | Otros visibles: 200,000 => Subtotal General: 2,000,000
    expect(Number(res.subtotal_servicios)).toBe(1000000);
    expect(Number(res.subtotal_componentes)).toBe(800000);
    expect(Number(res.subtotal_otros)).toBe(200000);
    expect(Number(res.subtotal_general)).toBe(2000000);
    expect(Number(res.subtotal_opcionales)).toBe(300000);

    // Descuento 10%: 200,000 => Subtotal con descuento: 1,800,000
    expect(Number(res.descuento_valor)).toBe(200000);
    expect(Number(res.subtotal_con_descuento)).toBe(1800000);

    // Base gravable: (1,000,000 + 800,000) * 0.90 = 1,620,000 (otros exento NO grava IVA)
    // IVA 19% = 307,800
    expect(Number(res.iva_valor)).toBe(307800);
    expect(Number(res.total_cotizacion)).toBe(2107800);

    // Costo interno: 400,000 (serv) + 500,000 (comp) + 120,000 (otro visible) + 180,000 (absorbido) = 1,200,000
    // Ingreso neto sin IVA: 1,800,000 => Utilidad Bruta: 600,000 => Margen: 33.33%
    expect(Number(res.costo_total_estimado)).toBe(1200000);
    expect(Number(res.utilidad_bruta_estimada)).toBe(600000);
    expect(Number(res.margen_bruto_porcentaje)).toBe(33.33);
  });

  it('soporta estructura opcional AIU con régimen IVA únicamente sobre Utilidad AIU (Colombia)', async () => {
    const { prisma } = createMockPrisma({
      cotizacion: {
        id_cotizacion: 2,
        descuento_porcentaje: new Decimal(0),
        iva_porcentaje: new Decimal(19),
        usa_aiu: true,
        aiu_admin_porcentaje: new Decimal(10),
        aiu_imprevistos_porcentaje: new Decimal(5),
        aiu_utilidad_porcentaje: new Decimal(5),
        iva_sobre_utilidad_aiu: true,
      },
      servicios: [
        {
          id_item_servicio: 1,
          cantidad: new Decimal(1),
          precio_unitario: new Decimal(10000000),
          costo_unitario: new Decimal(7000000),
          descuento_porcentaje: new Decimal(0),
          subtotal: new Decimal(10000000),
          es_opcional: false,
          iva_aplicable: true,
        },
      ],
    });

    const service = new CotizacionCalculoService(prisma);
    const res = await service.recalcularTotales(2);

    // Directos: 10,000,000 | A=1,000,000 | I=500,000 | U=500,000 => AIU Total = 2,000,000
    expect(Number(res.aiu_admin_valor)).toBe(1000000);
    expect(Number(res.aiu_imprevistos_valor)).toBe(500000);
    expect(Number(res.aiu_utilidad_valor)).toBe(500000);
    expect(Number(res.aiu_valor_total)).toBe(2000000);

    // IVA 19% ÚNICAMENTE sobre Utilidad (500,000) = 95,000
    expect(Number(res.iva_valor)).toBe(95000);
    // Total cliente = 10,000,000 + 2,000,000 + 95,000 = 12,095,000
    expect(Number(res.total_cotizacion)).toBe(12095000);

    // Ingreso neto sin IVA = 12,000,000 | Costo = 7,000,000 | Utilidad = 5,000,000 | Margen = 41.67%
    expect(Number(res.utilidad_bruta_estimada)).toBe(5000000);
    expect(Number(res.margen_bruto_porcentaje)).toBe(41.67);
  });

  it('respeta IVA explícito en 0% sin sobreescribir con tasa por defecto de la organización', async () => {
    const { prisma } = createMockPrisma({
      cotizacion: {
        id_cotizacion: 3,
        descuento_porcentaje: new Decimal(0),
        iva_porcentaje: new Decimal(0), // Explícitamente 0% (Zona Franca / Exportación)
        usa_aiu: false,
        aiu_admin_porcentaje: new Decimal(0),
        aiu_imprevistos_porcentaje: new Decimal(0),
        aiu_utilidad_porcentaje: new Decimal(0),
        iva_sobre_utilidad_aiu: false,
      },
      orgConfig: { tasa_impuesto_defecto: new Decimal(19) },
      servicios: [
        {
          id_item_servicio: 1,
          cantidad: new Decimal(1),
          precio_unitario: new Decimal(1000000),
          costo_unitario: new Decimal(500000),
          descuento_porcentaje: new Decimal(0),
          subtotal: new Decimal(1000000),
          es_opcional: false,
          iva_aplicable: true,
        },
      ],
    });

    const service = new CotizacionCalculoService(prisma);
    const res = await service.recalcularTotales(3);

    expect(Number(res.iva_porcentaje)).toBe(0);
    expect(Number(res.iva_valor)).toBe(0);
    expect(Number(res.total_cotizacion)).toBe(1000000);
  });
});
