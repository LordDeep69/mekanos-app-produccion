import { OrdenesController } from './ordenes.controller';

describe('OrdenesController — Integridad de Firmas Digitales (Root-Cause Zero-Trust)', () => {
  function buildController(prismaMock: any) {
    return new OrdenesController(
      {} as any, // commandBus
      {} as any, // queryBus
      prismaMock,
      {} as any, // finalizarOrdenService
      {} as any, // actividadesService
      {} as any, // medicionesService
      {} as any, // progresoService
      {} as any, // evidenciasService
      {} as any, // ordenesEquiposService
      {} as any, // transferenciaService
    );
  }

  it('GET :id/firmas devuelve [] (CERO firmas fantasma) cuando id_firma_tecnico e id_firma_cliente son NULL aunque el técnico tenga historial', async () => {
    const prismaMock = {
      $queryRaw: jest.fn(async () => [
        {
          id_firma_cliente: null,
          id_firma_tecnico: null,
          nombre_quien_recibe: null,
          cargo_quien_recibe: null,
        },
      ]),
      firmas_digitales: {
        findFirst: jest.fn(async () => ({
          id_firma_digital: 999,
          tipo_firma: 'TECNICO',
          firma_base64: 'GHOST_SIGNATURE_FROM_OTHER_ORDER',
        })),
        findMany: jest.fn(async () => []),
      },
      ordenes_servicio: {
        findUnique: jest.fn(),
      },
    };

    const controller = buildController(prismaMock);
    const res = await controller.getFirmas(119);

    expect(res.success).toBe(true);
    expect(res.data).toEqual([]);
    // Nunca debe consultar historial de otras órdenes en GET :id/firmas
    expect(prismaMock.firmas_digitales.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.firmas_digitales.findMany).not.toHaveBeenCalled();
  });

  it('GET :id/firmas devuelve estrictamente las firmas vinculadas y respeta slots TECNICO y CLIENTE', async () => {
    const prismaMock = {
      $queryRaw: jest.fn(async () => [
        {
          id_firma_cliente: 501,
          id_firma_tecnico: 502,
          nombre_quien_recibe: 'Carlos Pérez',
          cargo_quien_recibe: 'Jefe de Mantenimiento',
        },
      ]),
      firmas_digitales: {
        findMany: jest.fn(async () => [
          {
            id_firma_digital: 501,
            tipo_firma: 'CLIENTE',
            firma_base64: 'CLI_B64',
            persona: { primer_nombre: 'Comfenalco', primer_apellido: '' },
          },
          {
            id_firma_digital: 502,
            tipo_firma: 'TECNICO',
            firma_base64: 'TEC_B64',
            persona: { primer_nombre: 'Luis', primer_apellido: 'Torres' },
          },
        ]),
      },
    };

    const controller = buildController(prismaMock);
    const res = await controller.getFirmas(119);

    expect(res.data).toHaveLength(2);
    expect(res.data[0].tipo_firma).toBe('TECNICO');
    expect(res.data[0].nombre_firmante).toBe('Luis Torres');
    expect(res.data[1].tipo_firma).toBe('CLIENTE');
    expect(res.data[1].nombre_firmante).toBe('Carlos Pérez');
    expect(res.data[1].cargo_firmante).toBe('Jefe de Mantenimiento');
  });

  it('PUT :id/firmas/:tipo aplica Copy-on-Write si la firma previa estaba compartida con otra orden', async () => {
    const prismaMock = {
      $queryRaw: jest.fn(async () => [
        {
          id_orden_servicio: 119,
          id_firma_cliente: 88,
          id_firma_tecnico: 89,
          id_tecnico_asignado: 10,
          id_cliente: 50,
          nombre_quien_recibe: 'Ana',
          cargo_quien_recibe: 'Admin',
        },
      ]),
      $executeRaw: jest.fn(async () => 1),
      clientes: {
        findUnique: jest.fn(async () => ({ id_persona: 500 })),
      },
      firmas_digitales: {
        findUnique: jest.fn(async () => ({ id_firma_digital: 88 })),
        update: jest.fn(),
        create: jest.fn(async () => ({ id_firma_digital: 901 })),
      },
      ordenes_servicio: {
        // Otra orden (#78) todavía referencia la firma 88
        count: jest.fn(async () => 1),
        update: jest.fn(async () => ({})),
      },
      cotizaciones: {
        count: jest.fn(async () => 0),
      },
    };

    const controller = buildController(prismaMock);
    const res = await controller.updateFirmaOrden(119, 'CLIENTE', 1, {
      firma_base64: 'NUEVA_FIRMA_CLIENTE',
      nombre_firmante: 'Ana Editada',
      cargo_firmante: 'Supervisora',
    });

    expect(res.success).toBe(true);
    expect(res.data.id_firma).toBe(901);
    // NO debe mutar la firma compartida #88 in-place
    expect(prismaMock.firmas_digitales.update).not.toHaveBeenCalled();
    expect(prismaMock.firmas_digitales.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.$executeRaw).toHaveBeenCalledTimes(1);
  });
});
