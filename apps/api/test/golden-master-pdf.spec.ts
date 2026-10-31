import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { EquipoSpecsReader } from '../src/equipos/services/equipo-specs.reader';

interface GoldenMasterItem {
  id_orden: number;
  numero_orden: string;
  id_equipo: number;
  codigo_equipo: string;
  tipo_equipo_codigo: string;
  marca: string;
  modelo?: string;
  serie: string;
  potenciaKva?: number;
  potenciaKw?: number;
  potenciaHp?: number;
}

describe('Golden Master PDF Certification (35 Órdenes de Producción)', () => {
  let prisma: PrismaClient;
  let goldenMaster: GoldenMasterItem[];

  beforeAll(async () => {
    prisma = new PrismaClient();
    const fixturePath = path.resolve(__dirname, 'fixtures/golden-master-pdf.json');
    const raw = fs.readFileSync(fixturePath, 'utf8');
    goldenMaster = JSON.parse(raw);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('debe cargar exactamente 35 órdenes en el snapshot Golden Master', () => {
    expect(goldenMaster).toBeDefined();
    expect(goldenMaster.length).toBe(35);
  });

  it('debe certificar cero discrepancias entre EquipoSpecsReader y las 35 órdenes de producción', async () => {
    const ordenesIds = goldenMaster.map((g) => g.id_orden);

    const ordenesDb = await prisma.ordenes_servicio.findMany({
      where: { id_orden_servicio: { in: ordenesIds } },
      include: {
        equipos: {
          include: {
            tipos_equipo: true,
            equipos_generador: true,
            equipos_bomba: true,
            equipos_motor: true,
          },
        },
      },
    });

    expect(ordenesDb.length).toBe(goldenMaster.length);

    const dbMap = new Map(ordenesDb.map((o) => [o.id_orden_servicio, o]));

    const discrepancias: string[] = [];

    for (const item of goldenMaster) {
      const orden = dbMap.get(item.id_orden);
      expect(orden).toBeDefined();

      const eq = orden!.equipos;
      const marcaReader = EquipoSpecsReader.getMarca(eq);
      const modeloReader = EquipoSpecsReader.getModelo(eq);
      const serieReader = EquipoSpecsReader.getSerie(eq);

      if (marcaReader !== item.marca) {
        discrepancias.push(
          `[MARCA] Orden ${item.numero_orden} (${item.codigo_equipo}): esperado '${item.marca}' vs reader '${marcaReader}'`
        );
      }
      if (modeloReader !== item.modelo) {
        discrepancias.push(
          `[MODELO] Orden ${item.numero_orden} (${item.codigo_equipo}): esperado '${item.modelo}' vs reader '${modeloReader}'`
        );
      }
      if (serieReader !== item.serie) {
        discrepancias.push(
          `[SERIE] Orden ${item.numero_orden} (${item.codigo_equipo}): esperado '${item.serie}' vs reader '${serieReader}'`
        );
      }
    }

    if (discrepancias.length > 0) {
      console.error('Discrepancias detectadas:', discrepancias);
    }

    expect(discrepancias).toEqual([]);
  }, 60000);
});
