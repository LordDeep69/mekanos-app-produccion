import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

export type VerticalPresetCode =
  | 'V1'
  | 'V2'
  | 'V3'
  | 'V4'
  | 'V5'
  | 'V6'
  | 'V7'
  | 'V8'
  | 'V9'
  | 'V10';

export interface VerticalPresetDef {
  vertical: VerticalPresetCode;
  categoriaCodigo: string;
  codigoTipo: string;
  nombreTipo: string;
  descripcion: string;
  unidadUso: string;
  etiquetaContador: string;
  iconoUi: string;
  colorHex: string;
  prefijoCodigo: string;
  tieneMotor?: boolean;
  tieneGenerador?: boolean;
  tieneBomba?: boolean;
}

export const VERTICAL_PRESETS: VerticalPresetDef[] = [
  {
    vertical: 'V1',
    categoriaCodigo: 'ENERGIA',
    codigoTipo: 'GENERADOR',
    nombreTipo: 'Grupo Electrógeno / Planta Eléctrica',
    descripcion: 'Generador eléctrico estacionario o móvil de respaldo',
    unidadUso: 'HORAS',
    etiquetaContador: 'Horómetro',
    iconoUi: 'zap',
    colorHex: '#F59E0B',
    prefijoCodigo: 'GEN',
    tieneMotor: true,
    tieneGenerador: true,
  },
  {
    vertical: 'V2',
    categoriaCodigo: 'HIDRAULICA',
    codigoTipo: 'BOMBA',
    nombreTipo: 'Motobomba / Sistema Hidroneumático',
    descripcion: 'Sistema de bombeo de agua potable, residual o contra incendios',
    unidadUso: 'HORAS',
    etiquetaContador: 'Horómetro',
    iconoUi: 'droplets',
    colorHex: '#0EA5E9',
    prefijoCodigo: 'BOM',
    tieneBomba: true,
  },
  {
    vertical: 'V3',
    categoriaCodigo: 'TRANSPORTE_VERTICAL',
    codigoTipo: 'ASCENSOR',
    nombreTipo: 'Ascensor / Montacargas',
    descripcion: 'Transporte vertical de pasajeros o carga',
    unidadUso: 'CICLOS',
    etiquetaContador: 'Contador de Viajes',
    iconoUi: 'arrow-up-down',
    colorHex: '#10B981',
    prefijoCodigo: 'ASC',
  },
  {
    vertical: 'V4',
    categoriaCodigo: 'TRANSPORTE_VERTICAL',
    codigoTipo: 'ESCALERA_ELEC',
    nombreTipo: 'Escalera Eléctrica / Andén Móvil',
    descripcion: 'Transporte electromecánico continuo de pasajeros',
    unidadUso: 'HORAS',
    etiquetaContador: 'Horómetro Operación',
    iconoUi: 'arrow-up-right',
    colorHex: '#14B8A6',
    prefijoCodigo: 'ESC',
  },
  {
    vertical: 'V5',
    categoriaCodigo: 'ACCESOS_AUTOMATICOS',
    codigoTipo: 'PUERTA_AUTO',
    nombreTipo: 'Puerta Eléctrica / Portón / Talanquera',
    descripcion: 'Portón automático, cortina metálica o control de acceso vehicular',
    unidadUso: 'CICLOS',
    etiquetaContador: 'Contador de Maniobras',
    iconoUi: 'door-open',
    colorHex: '#8B5CF6',
    prefijoCodigo: 'ACC',
  },
  {
    vertical: 'V6',
    categoriaCodigo: 'SUBESTACIONES',
    codigoTipo: 'SUBESTACION',
    nombreTipo: 'Subestación / Transformador MT-BT',
    descripcion: 'Transformador de potencia y celda de media/baja tensión',
    unidadUso: 'MANIOBRAS',
    etiquetaContador: 'Contador de Maniobras',
    iconoUi: 'cpu',
    colorHex: '#EF4444',
    prefijoCodigo: 'SUB',
  },
  {
    vertical: 'V7',
    categoriaCodigo: 'CLIMATIZACION',
    codigoTipo: 'HVAC',
    nombreTipo: 'HVAC / Aire Acondicionado / Chiller',
    descripcion: 'Sistema de climatización y refrigeración industrial o comercial',
    unidadUso: 'HORAS',
    etiquetaContador: 'Horómetro Compresor',
    iconoUi: 'wind',
    colorHex: '#06B6D4',
    prefijoCodigo: 'HVAC',
  },
  {
    vertical: 'V8',
    categoriaCodigo: 'INFRAESTRUCTURA',
    codigoTipo: 'TUBERIA',
    nombreTipo: 'Tuberías / Redes Hidrosanitarias / Infraestructura',
    descripcion: 'Líneas de conducción, válvulas, uniones e infraestructura edilicia',
    unidadUso: 'CAL',
    etiquetaContador: 'Ciclo de Inspección',
    iconoUi: 'wrench',
    colorHex: '#64748B',
    prefijoCodigo: 'TUB',
  },
  {
    vertical: 'V9',
    categoriaCodigo: 'ENERGIA',
    codigoTipo: 'MOTOR',
    nombreTipo: 'Motor Industrial',
    descripcion: 'Motor diésel, gas o eléctrico estacionario',
    unidadUso: 'HORAS',
    etiquetaContador: 'Horómetro',
    iconoUi: 'cog',
    colorHex: '#D97706',
    prefijoCodigo: 'MOT',
    tieneMotor: true,
  },
  {
    vertical: 'V10',
    categoriaCodigo: 'COMPRESION',
    codigoTipo: 'COMPRESOR',
    nombreTipo: 'Compresor de Aire Industrial',
    descripcion: 'Compresor de tornillo o pistón para aire comprimido',
    unidadUso: 'HORAS',
    etiquetaContador: 'Horómetro Marcha',
    iconoUi: 'gauge',
    colorHex: '#6366F1',
    prefijoCodigo: 'CMP',
  },
];

export const SERVICIOS_UNIVERSALES = [
  { codigo_tipo: 'PREV_A', nombre_tipo: 'Mantenimiento Preventivo Básico', categoria: 'PREVENTIVO' as const, orden: 1 },
  { codigo_tipo: 'PREV_B', nombre_tipo: 'Mantenimiento Preventivo Mayor', categoria: 'PREVENTIVO' as const, orden: 2 },
  { codigo_tipo: 'CORRECTIVO', nombre_tipo: 'Mantenimiento Correctivo / Reparación', categoria: 'CORRECTIVO' as const, orden: 3 },
  { codigo_tipo: 'PREDICTIVO', nombre_tipo: 'Mantenimiento Predictivo / Telemetría', categoria: 'INSPECCION' as const, orden: 4 },
  { codigo_tipo: 'EMERGENCIA', nombre_tipo: 'Atención de Emergencia / Siniestro', categoria: 'EMERGENCIA' as const, orden: 5 },
  { codigo_tipo: 'DIAGNOSTICO', nombre_tipo: 'Inspección y Diagnóstico Técnico', categoria: 'DIAGNOSTICO' as const, orden: 6 },
];

export async function seedCatalogPresets(
  prisma: PrismaClient,
  requested: string[] = ['ALL'],
) {
  const normalized = requested.map((s) => s.trim().toUpperCase()).filter(Boolean);
  const useAll = normalized.includes('ALL') || normalized.length === 0;

  const categorias = await prisma.categorias_activo.findMany();
  const catByCodigo = new Map(categorias.map((c) => [c.codigo, c.id_categoria_activo]));

  const selectedPresets = useAll
    ? VERTICAL_PRESETS
    : VERTICAL_PRESETS.filter((p) => normalized.includes(p.vertical));

  for (const preset of selectedPresets) {
    const idCat = catByCodigo.get(preset.categoriaCodigo) ?? null;
    const existing = await prisma.tipos_equipo.findFirst({
      where: { codigo_tipo: preset.codigoTipo },
    });
    if (!existing) {
      await prisma.tipos_equipo.create({
        data: {
          codigo_tipo: preset.codigoTipo,
          nombre_tipo: preset.nombreTipo,
          descripcion: preset.descripcion,
          categoria: 'OTRO',
          id_categoria_activo: idCat,
          unidad_uso: preset.unidadUso,
          etiqueta_contador: preset.etiquetaContador,
          icono_ui: preset.iconoUi,
          color_hex: preset.colorHex,
          prefijo_codigo: preset.prefijoCodigo,
          tiene_motor: preset.tieneMotor ?? false,
          tiene_generador: preset.tieneGenerador ?? false,
          tiene_bomba: preset.tieneBomba ?? false,
          usa_plantilla_universal: true,
          formato_ficha_tecnica: 'UNIVERSAL_EAM',
          activo: true,
          disponible: true,
        },
      });
    }
  }

  for (const srv of SERVICIOS_UNIVERSALES) {
    const existing = await prisma.tipos_servicio.findFirst({
      where: { codigo_tipo: srv.codigo_tipo },
    });
    if (!existing) {
      await prisma.tipos_servicio.create({
        data: {
          codigo_tipo: srv.codigo_tipo,
          nombre_tipo: srv.nombre_tipo,
          categoria: srv.categoria,
          orden_visualizacion: srv.orden,
          activo: true,
        },
      });
    }
  }

  console.log(`✅ Presets verticales sembrados (${selectedPresets.map((p) => p.vertical).join(', ')})`);
}

if (require.main === module) {
  const prisma = new PrismaClient();
  const raw = process.env.SEED_PRESETS || 'ALL';
  seedCatalogPresets(prisma, raw.split(','))
    .then(() => prisma.$disconnect())
    .catch(async (err) => {
      console.error('❌ Error ejecutando seed-catalog-presets:', err);
      await prisma.$disconnect();
      process.exit(1);
    });
}
