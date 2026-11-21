import { FinalizacionOrdenService } from './finalizacion-orden.service';

describe('FinalizacionOrdenService - Trazabilidad Multi-Equipo Universal', () => {
  const crearServicioConMocks = () => {
    const createManyActividades = jest.fn().mockImplementation(({ data }) => Promise.resolve({ count: data.length }));
    const createManyMediciones = jest.fn().mockImplementation(({ data }) => Promise.resolve({ count: data.length }));

    const prismaMock: any = {
      actividades_ejecutadas: {
        count: jest.fn().mockResolvedValue(0),
        createMany: createManyActividades,
      },
      catalogo_actividades: {
        findMany: jest.fn().mockResolvedValue([
          { id_actividad_catalogo: 10, descripcion_actividad: 'Inspeccionar correas', id_tipo_servicio: 1 },
          { id_actividad_catalogo: 11, descripcion_actividad: 'Verificar sello mecánico', id_tipo_servicio: 1 },
        ]),
      },
      mediciones_servicio: {
        count: jest.fn().mockResolvedValue(0),
        createMany: createManyMediciones,
      },
      parametros_medicion: {
        findMany: jest.fn().mockResolvedValue([
          { id_parametro_medicion: 201, nombre_parametro: 'Presión de descarga', unidad_medida: 'PSI' },
          { id_parametro_medicion: 202, nombre_parametro: 'Temperatura devanado', unidad_medida: '°C' },
          { id_parametro_medicion: 203, nombre_parametro: 'Ciclos de operación', unidad_medida: 'ciclos' },
        ]),
      },
    };

    const service = new FinalizacionOrdenService(
      prismaMock,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

    return { service, createManyActividades, createManyMediciones };
  };

  it('preserva id_orden_equipo y orden_secuencia independiente por equipo aunque el técnico ejecute EQ2 antes que EQ1', async () => {
    const { service, createManyActividades, createManyMediciones } = crearServicioConMocks();

    const orden = {
      id_orden_servicio: 500,
      id_tipo_servicio: 1,
      ordenes_equipos: [
        { id_orden_equipo: 1001, orden_secuencia: 1, id_equipo: 10 },
        { id_orden_equipo: 1002, orden_secuencia: 2, id_equipo: 20 },
      ],
    };

    // Simula que el técnico ejecutó primero EQ2 (1002) y luego EQ1 (1001) en mobile
    const dto: any = {
      esMultiEquipo: true,
      actividades: [
        { sistema: 'MOTOR', descripcion: 'Inspeccionar correas', resultado: 'M', observaciones: 'Correa floja en EQ2', idOrdenEquipo: 1002 },
        { sistema: 'MOTOR', descripcion: 'Inspeccionar correas', resultado: 'B', observaciones: 'Correa OK en EQ1', idOrdenEquipo: 1001 },
      ],
      actividadesPorEquipo: [
        {
          idOrdenEquipo: 1002,
          nombreEquipo: 'Compresor Tornillo B',
          actividades: [
            { sistema: 'MOTOR', descripcion: 'Inspeccionar correas', resultado: 'M', observaciones: 'Correa floja en EQ2' },
            { sistema: 'SELLO', descripcion: 'Verificar sello mecánico', resultado: 'B', observaciones: 'Sin fugas EQ2' },
          ],
        },
        {
          idOrdenEquipo: 1001,
          nombreEquipo: 'Chiller Industrial A',
          actividades: [
            { sistema: 'MOTOR', descripcion: 'Inspeccionar correas', resultado: 'B', observaciones: 'Correa OK en EQ1' },
          ],
        },
      ],
      mediciones: [],
      medicionesPorEquipo: [
        {
          idOrdenEquipo: 1002,
          nombreEquipo: 'Compresor Tornillo B',
          mediciones: [
            { parametro: 'Presión de descarga', valor: 115, unidad: 'bar', nivelAlerta: 'WARNING', observaciones: 'Ligeramente alta' },
            { parametro: 'Ciclos de operación', valor: 45200, unidad: 'ciclos', nivelAlerta: 'OK' },
          ],
        },
        {
          idOrdenEquipo: 1001,
          nombreEquipo: 'Chiller Industrial A',
          mediciones: [
            { parametro: 'Temperatura devanado', valor: 89.5, unidad: '°C', nivelAlerta: 'CRITICAL' },
          ],
        },
      ],
    };

    const actsNorm = (service as any).resolverActividadesParaPersistir(orden, dto);
    await (service as any).persistirActividades(500, actsNorm, 7, 1);

    const medsNorm = (service as any).resolverMedicionesParaPersistir(orden, dto);
    await (service as any).persistirMediciones(500, medsNorm, 7);

    const insertedActs = createManyActividades.mock.calls[0][0].data;
    expect(insertedActs).toHaveLength(3);
    // Ordenados canónicamente: primero EQ1 (1001), luego EQ2 (1002)
    expect(insertedActs[0]).toMatchObject({
      id_orden_equipo: 1001,
      orden_secuencia: 1,
      observaciones: 'Correa OK en EQ1',
    });
    expect(insertedActs[1]).toMatchObject({
      id_orden_equipo: 1002,
      orden_secuencia: 1,
      observaciones: 'Correa floja en EQ2',
    });
    expect(insertedActs[2]).toMatchObject({
      id_orden_equipo: 1002,
      orden_secuencia: 2,
      observaciones: 'Sin fugas EQ2',
    });

    const insertedMeds = createManyMediciones.mock.calls[0][0].data;
    expect(insertedMeds).toHaveLength(3);
    // EQ1 primero con alerta CRITICO y unidad °C
    expect(insertedMeds[0]).toMatchObject({
      id_orden_equipo: 1001,
      id_parametro_medicion: 202,
      valor_numerico: 89.5,
      unidad_medida: '°C',
      nivel_alerta: 'CRITICO',
      fuera_de_rango: true,
    });
    // EQ2 preserva unidad personalizada 'bar', alerta ADVERTENCIA, observaciones y ciclos de uso
    expect(insertedMeds[1]).toMatchObject({
      id_orden_equipo: 1002,
      id_parametro_medicion: 201,
      valor_numerico: 115,
      unidad_medida: 'bar',
      nivel_alerta: 'ADVERTENCIA',
      fuera_de_rango: true,
      observaciones: 'Ligeramente alta',
    });
    expect(insertedMeds[2]).toMatchObject({
      id_orden_equipo: 1002,
      id_parametro_medicion: 203,
      valor_numerico: 45200,
      unidad_medida: 'ciclos',
      nivel_alerta: 'OK',
      fuera_de_rango: false,
    });
  });

  it('funciona con payload plano que solo trae idOrdenEquipo y rechaza IDs ajenos a la orden', () => {
    const { service } = crearServicioConMocks();
    const orden = {
      id_orden_servicio: 501,
      ordenes_equipos: [
        { id_orden_equipo: 2001, orden_secuencia: 1 },
        { id_orden_equipo: 2002, orden_secuencia: 2 },
      ],
    };

    const dto: any = {
      actividades: [
        { sistema: 'S1', descripcion: 'Act 1', resultado: 'B', idOrdenEquipo: 2002 },
        { sistema: 'S1', descripcion: 'Act 2', resultado: 'B', idOrdenEquipo: 999999 }, // ajeno
      ],
      mediciones: [
        { parametro: 'Presión de descarga', valor: 60, unidad: 'PSI', idOrdenEquipo: 2001 },
      ],
    };

    const acts = (service as any).resolverActividadesParaPersistir(orden, dto);
    const meds = (service as any).resolverMedicionesParaPersistir(orden, dto);

    expect(acts[0].idOrdenEquipo).toBe(2002);
    expect(acts[1].idOrdenEquipo).toBeUndefined();
    expect(meds[0].idOrdenEquipo).toBe(2001);
  });

  it('asigna automáticamente idOrdenEquipo en órdenes mono-equipo que tengan 1 registro en ordenes_equipos', () => {
    const { service } = crearServicioConMocks();
    const orden = {
      id_orden_servicio: 502,
      ordenes_equipos: [{ id_orden_equipo: 3001, orden_secuencia: 1 }],
    };

    const dto: any = {
      actividades: [{ sistema: 'GENERAL', descripcion: 'Act única', resultado: 'B' }],
      mediciones: [{ parametro: 'Ciclos de operación', valor: 100, unidad: 'ciclos' }],
    };

    const acts = (service as any).resolverActividadesParaPersistir(orden, dto);
    const meds = (service as any).resolverMedicionesParaPersistir(orden, dto);

    expect(acts[0].idOrdenEquipo).toBe(3001);
    expect(meds[0].idOrdenEquipo).toBe(3001);
  });
});
