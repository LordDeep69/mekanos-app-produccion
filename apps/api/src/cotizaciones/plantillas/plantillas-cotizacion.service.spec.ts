import { BadRequestException, ConflictException, ValidationPipe } from '@nestjs/common';
import {
  CreatePlantillaCotizacionDto,
  UpdatePlantillaCotizacionDto,
} from './plantillas-cotizacion.dto';
import { PlantillasCotizacionService } from './plantillas-cotizacion.service';

describe('PlantillasCotizacionService (Nivel 3 · Hub de Plantillas & Dinamismo EAM-CPQ)', () => {
  const createMockDeps = () => {
    const createdServicios: any[] = [];
    const createdComponentes: any[] = [];
    const createdOtros: any[] = [];
    const updatedCotizaciones: any[] = [];
    const updatedPlantillas: any[] = [];

    const prisma: any = {
      plantillas_cotizacion: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn().mockImplementation(async (args: any) => {
          updatedPlantillas.push(args);
          return args.data;
        }),
      },
      plantillas_cotizacion_items: {
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      cotizaciones: {
        findUnique: jest.fn(),
        update: jest.fn().mockImplementation(async (args: any) => {
          updatedCotizaciones.push(args);
          return args.data;
        }),
      },
      items_cotizacion_servicios: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockImplementation(async (args: any) => {
          createdServicios.push(args.data);
          return args.data;
        }),
      },
      items_cotizacion_componentes: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockImplementation(async (args: any) => {
          createdComponentes.push(args.data);
          return args.data;
        }),
      },
      items_cotizacion_otros: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockImplementation(async (args: any) => {
          createdOtros.push(args.data);
          return args.data;
        }),
      },
      $transaction: jest.fn(async (cb: (tx: any) => Promise<any>) => cb(prisma)),
    };

    const calculoService: any = {
      recalcularTotales: jest.fn().mockResolvedValue({}),
    };

    const cotizacionesRepository: any = {
      findById: jest.fn().mockResolvedValue({ id_cotizacion: 99, numero_cotizacion: 'COT-TEST' }),
    };

    const service = new PlantillasCotizacionService(prisma, calculoService, cotizacionesRepository);

    return {
      service,
      prisma,
      calculoService,
      cotizacionesRepository,
      createdServicios,
      createdComponentes,
      createdOtros,
      updatedCotizaciones,
      updatedPlantillas,
    };
  };

  it('crea plantilla con tipo abierto OVERHAUL_TURBO_ESPECIAL, subsistema EAM y rubro libre PRUEBA_BANCO_CARGA', async () => {
    const { service, prisma } = createMockDeps();

    prisma.plantillas_cotizacion.findUnique
      .mockResolvedValueOnce(null) // codigo_plantilla no existe
      .mockResolvedValueOnce({
        id_plantilla: 42,
        codigo_plantilla: 'TPL-OVERHAUL-TURBO-CAT',
        nombre: 'Overhaul Turbo CAT',
        tipo_cotizacion: 'OVERHAUL_TURBO_ESPECIAL',
        id_tipo_equipo: 1,
        id_modulo: 7,
        usa_aiu: true,
        aiu_admin_porcentaje: 10,
        aiu_imprevistos_porcentaje: 5,
        aiu_utilidad_porcentaje: 5,
        iva_sobre_utilidad_aiu: true,
        items: [
          {
            id_plantilla_item: 1,
            tipo_linea: 'OTRO',
            categoria_rubro: 'PRUEBA_BANCO_CARGA',
            descripcion: 'Prueba en banco de carga resistivo 4 horas',
            cantidad_base: 1,
            es_por_equipo: false,
            usar_precio_catalogo: false,
            precio_unitario_fijo: 450000,
            costo_unitario_fijo: 210000,
          },
        ],
      });

    prisma.plantillas_cotizacion.create.mockResolvedValue({ id_plantilla: 42 });

    const res = await service.crear(
      {
        nombre: 'Overhaul Turbo CAT',
        tipo_cotizacion: 'OVERHAUL_TURBO_ESPECIAL',
        id_tipo_equipo: 1,
        id_modulo: 7,
        usa_aiu: true,
        aiu_admin_porcentaje: 10,
        aiu_imprevistos_porcentaje: 5,
        aiu_utilidad_porcentaje: 5,
        iva_sobre_utilidad_aiu: true,
        items: [
          {
            tipo_linea: 'SERVICIO',
            id_servicio: 10,
            descripcion: 'Desmontaje y calibración de turboalimentador',
            cantidad_base: 1,
            es_por_equipo: true,
            usar_precio_catalogo: true,
            precio_unitario_fijo: 600000,
          },
          {
            tipo_linea: 'OTRO',
            categoria_rubro: 'prueba_banco_carga',
            descripcion: 'Prueba en banco de carga resistivo 4 horas',
            cantidad_base: 1,
            es_por_equipo: false,
            usar_precio_catalogo: false,
            precio_unitario_fijo: 450000,
            costo_unitario_fijo: 210000,
          },
        ],
      },
      5,
    );

    expect(res.tipo_cotizacion).toBe('OVERHAUL_TURBO_ESPECIAL');
    expect(res.id_modulo).toBe(7);
    const itemsInsert = prisma.plantillas_cotizacion_items.createMany.mock.calls[0][0].data;
    expect(itemsInsert[1].categoria_rubro).toBe('PRUEBA_BANCO_CARGA');
    expect(itemsInsert[1].es_por_equipo).toBe(false);
  });

  it('rechaza con 409 ConflictException si al actualizar se colisiona codigo_plantilla existente', async () => {
    const { service, prisma } = createMockDeps();

    prisma.plantillas_cotizacion.findUnique
      .mockResolvedValueOnce({
        id_plantilla: 42,
        codigo_plantilla: 'TPL-PROPIA',
        items: [],
      })
      .mockResolvedValueOnce({
        id_plantilla: 1, // otra plantilla distinta ya tiene TPL-SUMINISTRO-BATERIAS
      });

    await expect(
      service.actualizar(42, {
        nombre: 'Editada',
        codigo_plantilla: 'TPL-SUMINISTRO-BATERIAS',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('aplica plantilla sobre 3 equipos escalando solo es_por_equipo y tomando precios vivos de catálogo', async () => {
    const {
      service,
      prisma,
      calculoService,
      createdServicios,
      createdComponentes,
      createdOtros,
      updatedCotizaciones,
      updatedPlantillas,
    } = createMockDeps();

    prisma.cotizaciones.findUnique.mockResolvedValue({
      id_cotizacion: 99,
      id_estado: 1, // BORRADOR
      asunto: '',
      descripcion_general: null,
      alcance_trabajo: null,
      exclusiones: null,
      terminos_condiciones: null,
      cotizaciones_equipos: [{ id_equipo: 101 }, { id_equipo: 102 }, { id_equipo: 103 }],
    });

    prisma.plantillas_cotizacion.findUnique.mockResolvedValue({
      id_plantilla: 42,
      nombre: 'Overhaul Turbo Especial',
      tipo_cotizacion: 'OVERHAUL_TURBO_ESPECIAL',
      asunto_sugerido: 'Overhaul Mayor de Turboalimentador',
      alcance_trabajo: '- Desmontaje\n- Calibración',
      exclusiones: '- Obra civil',
      forma_pago: '50% ANTICIPO',
      meses_garantia: 6,
      tiempo_estimado_dias: 4,
      usa_aiu: true,
      aiu_admin_porcentaje: 10,
      aiu_imprevistos_porcentaje: 5,
      aiu_utilidad_porcentaje: 5,
      iva_sobre_utilidad_aiu: true,
      mostrar_desglose_precios: true,
      items: [
        {
          tipo_linea: 'SERVICIO',
          id_servicio: 10,
          descripcion: 'Mano de obra overhaul turbo',
          unidad: 'servicio',
          cantidad_base: 1.5,
          es_por_equipo: true,
          usar_precio_catalogo: true,
          precio_unitario_fijo: 500000, // snapshot viejo
          costo_unitario_fijo: 220000,
          es_opcional: false,
          iva_aplicable: true,
          catalogo_servicios: { id_servicio: 10, precio_base: 650000 }, // precio VIVO!
        },
        {
          tipo_linea: 'COMPONENTE',
          id_componente: 35,
          descripcion: 'BATERÍA AGM 12V 200AH TEST CPQ',
          unidad: 'und',
          cantidad_base: 2,
          es_por_equipo: true,
          usar_precio_catalogo: true,
          precio_unitario_fijo: 840000, // snapshot viejo
          costo_unitario_fijo: 600000, // snapshot viejo
          es_opcional: false,
          iva_aplicable: true,
          catalogo_componentes: {
            id_componente: 35,
            id_tipo_componente: 4,
            referencia_fabricante: 'AGM-200',
            marca: 'KAESER',
            unidad_medida: 'und',
            precio_venta: 890000, // precio VIVO mutado!
            precio_compra: 630000, // costo VIVO mutado!
          },
        },
        {
          tipo_linea: 'OTRO',
          categoria_rubro: 'PRUEBA_BANCO_CARGA',
          descripcion: 'Prueba de banco de carga 4h',
          unidad: 'global',
          cantidad_base: 1,
          es_por_equipo: false, // NO escala ×3!
          usar_precio_catalogo: false,
          precio_unitario_fijo: 450000,
          costo_unitario_fijo: 200000,
          visible_cliente: true,
          es_opcional: false,
          iva_aplicable: true,
        },
        {
          tipo_linea: 'OTRO',
          categoria_rubro: 'TRANSPORTE',
          descripcion: 'Movilización absorbida',
          unidad: 'global',
          cantidad_base: 1,
          es_por_equipo: false,
          usar_precio_catalogo: false,
          precio_unitario_fijo: 0,
          costo_unitario_fijo: 180000,
          visible_cliente: false,
          es_opcional: false,
          iva_aplicable: false,
        },
      ],
    });

    const result = await service.aplicarPlantilla(99, 42, { reemplazar_items: true }, 7);

    expect(result.resumen.multiplicador_equipos).toBe(3);
    // Servicio: 1.5 × 3 = 4.5 con precio VIVO 650.000
    expect(createdServicios[0].cantidad).toBe(4.5);
    expect(createdServicios[0].precio_unitario).toBe(650000);
    expect(createdServicios[0].subtotal).toBe(2925000);

    // Repuesto WMS: 2 × 3 = 6 con precio VIVO 890.000 y costo VIVO 630.000
    expect(createdComponentes[0].cantidad).toBe(6);
    expect(createdComponentes[0].precio_unitario).toBe(890000);
    expect(createdComponentes[0].costo_unitario).toBe(630000);
    expect(createdComponentes[0].subtotal).toBe(5340000);

    // Rubro OTRO personalizado: es_por_equipo=false => cantidad=1 (NO 3!)
    expect(createdOtros[0].categoria_rubro).toBe('PRUEBA_BANCO_CARGA');
    expect(createdOtros[0].cantidad).toBe(1);
    expect(createdOtros[0].subtotal).toBe(450000);

    // Rubro absorbido: visible_cliente=false, cantidad=1
    expect(createdOtros[1].visible_cliente).toBe(false);
    expect(createdOtros[1].cantidad).toBe(1);

    // Cabecera hereda tipo abierto + AIU + presentación PDF + textos y suma veces_usada
    expect(updatedCotizaciones[0].data.tipo_cotizacion).toBe('OVERHAUL_TURBO_ESPECIAL');
    expect(updatedCotizaciones[0].data.usa_aiu).toBe(true);
    expect(updatedCotizaciones[0].data.iva_sobre_utilidad_aiu).toBe(true);
    expect(updatedCotizaciones[0].data.mostrar_desglose_precios).toBe(true);
    expect(updatedPlantillas[0].data.veces_usada).toEqual({ increment: 1 });
    expect(calculoService.recalcularTotales).toHaveBeenCalledWith(99);
  });

  it('bloquea aplicarPlantilla si la cotización NO está en estado BORRADOR', async () => {
    const { service, prisma } = createMockDeps();
    prisma.cotizaciones.findUnique.mockResolvedValue({
      id_cotizacion: 99,
      id_estado: 4, // ENVIADA
      cotizaciones_equipos: [],
    });

    await expect(service.aplicarPlantilla(99, 1, {}, 7)).rejects.toThrow(BadRequestException);
  });

  it('normaliza cantidades ÷3 al guardar cotización multi-equipo como plantilla y deja OTROS fijos', async () => {
    const { service, prisma } = createMockDeps();

    prisma.cotizaciones.findUnique.mockResolvedValue({
      id_cotizacion: 99,
      numero_cotizacion: 'COT-2026-0099',
      tipo_cotizacion: 'OVERHAUL_TURBO_ESPECIAL',
      asunto: 'Overhaul 3 Plantas',
      descripcion_general: 'Propuesta integral',
      alcance_trabajo: '- Desmontaje',
      exclusiones: '- Grúa',
      terminos_condiciones: 'Validez 30 días',
      forma_pago: 'CONTADO',
      meses_garantia: 6,
      tiempo_estimado_dias: 3,
      usa_aiu: true,
      aiu_admin_porcentaje: 10,
      aiu_imprevistos_porcentaje: 5,
      aiu_utilidad_porcentaje: 5,
      iva_sobre_utilidad_aiu: false,
      mostrar_desglose_precios: false,
      cotizaciones_equipos: [
        { equipos: { id_tipo_equipo: 3, id_modelo_equipo: 12 } },
        { equipos: { id_tipo_equipo: 3, id_modelo_equipo: 12 } },
        { equipos: { id_tipo_equipo: 3, id_modelo_equipo: 12 } },
      ],
      items_cotizacion_servicios: [
        {
          id_servicio: 10,
          descripcion_personalizada: 'Servicio Overhaul',
          unidad: 'servicio',
          cantidad: 4.5,
          precio_unitario: 650000,
          costo_unitario: 220000,
          es_opcional: false,
          iva_aplicable: true,
          catalogo_servicios: { precio_base: 650000 },
        },
        {
          id_servicio: 11,
          descripcion_personalizada: 'Diagnóstico cortesía paquete',
          unidad: 'servicio',
          cantidad: 3,
          precio_unitario: 0,
          costo_unitario: 50000,
          es_opcional: false,
          iva_aplicable: true,
          catalogo_servicios: { precio_base: 180000 }, // precio modificado a 0 => NO usar precio vivo
        },
      ],
      items_cotizacion_componentes: [
        {
          id_componente: 35,
          descripcion: 'Batería AGM',
          unidad: 'und',
          cantidad: 6,
          precio_unitario: 890000,
          costo_unitario: 630000,
          es_opcional: false,
          iva_aplicable: true,
          catalogo_componentes: { precio_venta: 890000 },
        },
      ],
      items_cotizacion_otros: [
        {
          categoria_rubro: 'PRUEBA_BANCO_CARGA',
          descripcion: 'Prueba banco de carga',
          unidad: 'global',
          cantidad: 1,
          precio_unitario: 450000,
          costo_unitario: 200000,
          visible_cliente: true,
          es_opcional: false,
          iva_aplicable: true,
        },
      ],
    });

    const crearSpy = jest.spyOn(service, 'crear').mockResolvedValue({ id_plantilla: 77 } as any);

    await service.guardarCotizacionComoPlantilla(
      99,
      { nombre: 'Receta Overhaul Normalizada', normalizar_por_equipo: true },
      5,
    );

    expect(crearSpy).toHaveBeenCalledTimes(1);
    const dtoEnviado = crearSpy.mock.calls[0][0];
    expect(dtoEnviado.id_tipo_equipo).toBe(3);
    expect(dtoEnviado.id_modelo_equipo).toBe(12);
    expect(dtoEnviado.mostrar_desglose_precios).toBe(false);
    expect(dtoEnviado.items).toHaveLength(4);
    expect(dtoEnviado.items![0]).toMatchObject({
      tipo_linea: 'SERVICIO',
      cantidad_base: 1.5,
      es_por_equipo: true,
      usar_precio_catalogo: true,
    });
    expect(dtoEnviado.items![1]).toMatchObject({
      tipo_linea: 'SERVICIO',
      cantidad_base: 1,
      precio_unitario_fijo: 0,
      usar_precio_catalogo: false, // precio personalizado ($0) preservado como tarifa fija!
    });
    expect(dtoEnviado.items![2]).toMatchObject({
      tipo_linea: 'COMPONENTE',
      cantidad_base: 2,
      es_por_equipo: true,
      usar_precio_catalogo: true,
    });
    expect(dtoEnviado.items![3]).toMatchObject({
      tipo_linea: 'OTRO',
      categoria_rubro: 'PRUEBA_BANCO_CARGA',
      cantidad_base: 1,
      es_por_equipo: false,
    });
  });

  it('valida estrictamente UpdatePlantillaCotizacionDto bajo forbidNonWhitelisted (regresión Bug #1)', async () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    });

    // 1. Payload limpio (como el que ahora construye plantillas-cotizacion-manager.tsx) => DEBE PASAR
    const cleanPayload = {
      nombre: 'Plantilla Limpia E2E',
      tipo_cotizacion: 'OVERHAUL_TURBO_ESPECIAL',
      id_tipo_equipo: 1,
      id_modulo: 2,
      items: [
        {
          tipo_linea: 'OTRO',
          categoria_rubro: 'PRUEBA_BANCO_CARGA',
          descripcion: 'Prueba de banco de carga',
          cantidad_base: 1,
          es_por_equipo: false,
          usar_precio_catalogo: false,
          precio_unitario_fijo: 450000,
          costo_unitario_fijo: 200000,
          visible_cliente: true,
          es_opcional: false,
          iva_aplicable: true,
          orden_item: 1,
        },
      ],
    };

    await expect(
      pipe.transform(cleanPayload, { type: 'body', metatype: UpdatePlantillaCotizacionDto }),
    ).resolves.toBeInstanceOf(UpdatePlantillaCotizacionDto);

    // 2. Payload sucio con propiedades Prisma anidadas (el bug que corregimos) => DEBE SER RECHAZADO
    const dirtyPayload = {
      ...cleanPayload,
      items: [
        {
          ...cleanPayload.items[0],
          id_plantilla_item: 99,
          catalogo_componentes: { id_componente: 35 },
        },
      ],
    };

    await expect(
      pipe.transform(dirtyPayload, { type: 'body', metatype: CreatePlantillaCotizacionDto }),
    ).rejects.toThrow(BadRequestException);
  });

  it('autogenera códigos TPL breves sin stopwords ni cortes de sílabas (<= 28 chars)', async () => {
    const { service, prisma } = createMockDeps();

    prisma.plantillas_cotizacion.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id_plantilla: 88,
        codigo_plantilla: 'TPL-OVERHAUL-MAYOR-TURBO',
        nombre: 'Overhaul Mayor Turbo y Sistema de Inyección',
        tipo_cotizacion: 'OVERHAUL_TURBO_ESPECIAL',
        items: [],
      })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id_plantilla: 89,
        codigo_plantilla: 'TPL-SUMINISTRO-INSTALACION',
        nombre: 'Suministro e Instalación de Banco de Baterías',
        tipo_cotizacion: 'SUMINISTRO_INSTALACION',
        items: [],
      });

    prisma.plantillas_cotizacion.create
      .mockResolvedValueOnce({ id_plantilla: 88 })
      .mockResolvedValueOnce({ id_plantilla: 89 });

    await service.crear(
      {
        nombre: 'Overhaul Mayor Turbo y Sistema de Inyección',
        tipo_cotizacion: 'OVERHAUL_TURBO_ESPECIAL',
        items: [{ tipo_linea: 'SERVICIO', descripcion: 'Mano de obra', cantidad_base: 1 }],
      },
      1,
    );

    const firstCreateData = prisma.plantillas_cotizacion.create.mock.calls[0][0].data;
    expect(firstCreateData.codigo_plantilla).toBe('TPL-OVERHAUL-MAYOR-TURBO');
    expect(firstCreateData.codigo_plantilla.length).toBeLessThanOrEqual(28);

    await service.crear(
      {
        nombre: 'Suministro e Instalación de Banco de Baterías',
        tipo_cotizacion: 'SUMINISTRO_INSTALACION',
        items: [{ tipo_linea: 'SERVICIO', descripcion: 'Instalación', cantidad_base: 1 }],
      },
      1,
    );

    const secondCreateData = prisma.plantillas_cotizacion.create.mock.calls[1][0].data;
    expect(secondCreateData.codigo_plantilla).toBe('TPL-SUMINISTRO-INSTALACION');
    expect(secondCreateData.codigo_plantilla.length).toBeLessThanOrEqual(28);
  });
});
