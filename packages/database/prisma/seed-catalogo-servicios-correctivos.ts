import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
dotenv.config({ path: path.resolve(__dirname, '../../../apps/api/.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { PrismaClient, categoria_servicio_enum } from '@prisma/client';

const prisma = new PrismaClient();

interface ServicioSeed {
  id_servicio: number;
  codigo_servicio: string;
  nombre_servicio: string;
  descripcion: string;
  categoria: categoria_servicio_enum;
  id_tipo_equipo?: number;
  id_tipo_servicio?: number;
  duracion_estimada_horas: number;
  precio_base: number;
  incluye_repuestos: boolean;
  activo: boolean;
}

async function seedCatalogoServicios() {
  console.log('🌱 Poblando catalogo_servicios con catálogo de correctivos y especializados...\n');

  // Buscar tipos de equipo
  const tipoGen = await prisma.tipos_equipo.findFirst({ where: { codigo_tipo: 'GEN' } });
  const tipoBom = await prisma.tipos_equipo.findFirst({ where: { codigo_tipo: 'BOM' } });
  const tipoMot = await prisma.tipos_equipo.findFirst({ where: { codigo_tipo: 'MOT' } });

  const idGen = tipoGen?.id_tipo_equipo || 1;
  const idBom = tipoBom?.id_tipo_equipo || 3;
  const idMot = tipoMot?.id_tipo_equipo || 2;

  // Buscar tipos de servicio correctivos
  const tipoServGenCorr = await prisma.tipos_servicio.findFirst({ where: { codigo_tipo: 'GEN_CORR' } });
  const tipoServBomCorr = await prisma.tipos_servicio.findFirst({ where: { codigo_tipo: 'BOM_CORR' } });
  const tipoServGeneralCorr = await prisma.tipos_servicio.findFirst({ where: { codigo_tipo: 'CORRECTIVO' } });

  const idServGenCorr = tipoServGenCorr?.id_tipo_servicio || tipoServGeneralCorr?.id_tipo_servicio || 6;
  const idServBomCorr = tipoServBomCorr?.id_tipo_servicio || tipoServGeneralCorr?.id_tipo_servicio || 6;
  const idServGeneralCorr = tipoServGeneralCorr?.id_tipo_servicio || 6;

  const servicios: ServicioSeed[] = [
    // ═══════════════════════════════════════════════════════════════════════════
    // A. GENERADORES ELÉCTRICOS
    // ═══════════════════════════════════════════════════════════════════════════
    {
      id_servicio: 101,
      codigo_servicio: 'GEN-CORR-BAT',
      nombre_servicio: 'Cambio y Configuración de Batería de Arranque',
      descripcion: 'Desconexión segura, limpieza de bornes, montaje de batería nueva, aplicación de protector dieléctrico y prueba de arranque bajo carga.',
      categoria: 'CORRECTIVO',
      id_tipo_equipo: idGen,
      id_tipo_servicio: idServGenCorr,
      duracion_estimada_horas: 1.5,
      precio_base: 180000,
      incluye_repuestos: false,
      activo: true,
    },
    {
      id_servicio: 102,
      codigo_servicio: 'GEN-CORR-FUG-RAD',
      nombre_servicio: 'Corrección de Fuga en Radiador / Mangueras',
      descripcion: 'Drenaje de refrigerante, desmontaje de manguera/abrazadera o baqueteo/soldadura de radiador, presurización y purga del sistema de enfriamiento.',
      categoria: 'CORRECTIVO',
      id_tipo_equipo: idGen,
      id_tipo_servicio: idServGenCorr,
      duracion_estimada_horas: 3.0,
      precio_base: 350000,
      incluye_repuestos: false,
      activo: true,
    },
    {
      id_servicio: 103,
      codigo_servicio: 'GEN-CORR-AVR',
      nombre_servicio: 'Diagnóstico, Reemplazo y Calibración de AVR',
      descripcion: 'Verificación de bobinados de excitatriz, sustitución de regulador automático de voltaje (AVR), ajuste fino de Hz y Vac en vacío y con carga.',
      categoria: 'CORRECTIVO',
      id_tipo_equipo: idGen,
      id_tipo_servicio: idServGenCorr,
      duracion_estimada_horas: 2.5,
      precio_base: 420000,
      incluye_repuestos: false,
      activo: true,
    },
    {
      id_servicio: 104,
      codigo_servicio: 'GEN-CORR-SOL-COMB',
      nombre_servicio: 'Cambio de Solenoide / Válvula de Corte de Combustible',
      descripcion: 'Reemplazo de actuador solenoide de paso de diesel/gas, ajuste de varillaje mecánico de aceleración y pruebas de parada de emergencia.',
      categoria: 'CORRECTIVO',
      id_tipo_equipo: idGen,
      id_tipo_servicio: idServGenCorr,
      duracion_estimada_horas: 2.0,
      precio_base: 260000,
      incluye_repuestos: false,
      activo: true,
    },
    {
      id_servicio: 105,
      codigo_servicio: 'GEN-CORR-MOD-CTRL',
      nombre_servicio: 'Reemplazo y Reprogramación de Módulo de Control',
      descripcion: 'Parametrización de panel de control (DeepSea, ComAp, SmartGen), cableado de entradas/salidas analógicas/digitales y pruebas de transferencia automática.',
      categoria: 'ESPECIALIZADO',
      id_tipo_equipo: idGen,
      id_tipo_servicio: idServGenCorr,
      duracion_estimada_horas: 4.0,
      precio_base: 650000,
      incluye_repuestos: false,
      activo: true,
    },
    {
      id_servicio: 106,
      codigo_servicio: 'GEN-CORR-SEN-PRES',
      nombre_servicio: 'Cambio de Sensor / Switch de Presión de Aceite',
      descripcion: 'Desmontaje de sensor averiado, verificación de rosca y sellado, conexión eléctrica al módulo y comprobación de alarma por baja presión.',
      categoria: 'CORRECTIVO',
      id_tipo_equipo: idGen,
      id_tipo_servicio: idServGenCorr,
      duracion_estimada_horas: 1.5,
      precio_base: 190000,
      incluye_repuestos: false,
      activo: true,
    },
    {
      id_servicio: 107,
      codigo_servicio: 'GEN-CORR-SEN-TEMP',
      nombre_servicio: 'Cambio de Sensor / Termostato de Temperatura',
      descripcion: 'Reemplazo de bulbo/termocupla de temperatura de motor, verificación de apertura de termostato y monitoreo de temperatura en régimen.',
      categoria: 'CORRECTIVO',
      id_tipo_equipo: idGen,
      id_tipo_servicio: idServGenCorr,
      duracion_estimada_horas: 2.0,
      precio_base: 240000,
      incluye_repuestos: false,
      activo: true,
    },
    {
      id_servicio: 108,
      codigo_servicio: 'GEN-CORR-CARG-BAT',
      nombre_servicio: 'Reemplazo de Cargador de Batería Estático',
      descripcion: 'Sustitución de cargador de flotación (12V/24V), verificación de alimentación AC, ajuste de voltaje de flotación e intensidad máxima.',
      categoria: 'CORRECTIVO',
      id_tipo_equipo: idGen,
      id_tipo_servicio: idServGenCorr,
      duracion_estimada_horas: 2.0,
      precio_base: 280000,
      incluye_repuestos: false,
      activo: true,
    },
    {
      id_servicio: 109,
      codigo_servicio: 'GEN-CORR-CORR-ALT',
      nombre_servicio: 'Cambio y Tensión de Correas de Alternador / Ventilador',
      descripcion: 'Desmonte de correas desgastadas/agrietadas, verificación de poleas y rodamientos, montaje de juego nuevo y ajuste de tensión nominal.',
      categoria: 'CORRECTIVO',
      id_tipo_equipo: idGen,
      id_tipo_servicio: idServGenCorr,
      duracion_estimada_horas: 1.5,
      precio_base: 180000,
      incluye_repuestos: false,
      activo: true,
    },
    {
      id_servicio: 110,
      codigo_servicio: 'GEN-CORR-LIMP-COMB',
      nombre_servicio: 'Drenaje, Limpieza y Purga de Tanque de Combustible',
      descripcion: 'Extracción de sedimentos y agua en fondo de tanque de diesel, sustitución de filtros separadores de agua racor y purga de bomba de inyección.',
      categoria: 'CORRECTIVO',
      id_tipo_equipo: idGen,
      id_tipo_servicio: idServGenCorr,
      duracion_estimada_horas: 4.0,
      precio_base: 480000,
      incluye_repuestos: false,
      activo: true,
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // B. BOMBAS HIDRÁULICAS
    // ═══════════════════════════════════════════════════════════════════════════
    {
      id_servicio: 201,
      codigo_servicio: 'BOM-CORR-SELL-MEC',
      nombre_servicio: 'Reemplazo de Sello Mecánico de Bomba',
      descripcion: 'Desacople de voluta, extracción de impulsor, limpieza de eje, instalación de sello mecánico nuevo de carburo de silicio/cerámica y prueba hidrostática.',
      categoria: 'CORRECTIVO',
      id_tipo_equipo: idBom,
      id_tipo_servicio: idServBomCorr,
      duracion_estimada_horas: 3.5,
      precio_base: 380000,
      incluye_repuestos: false,
      activo: true,
    },
    {
      id_servicio: 202,
      codigo_servicio: 'BOM-CORR-PRES',
      nombre_servicio: 'Reemplazo y Calibración de Presostato',
      descripcion: 'Desconexión eléctrica e hidráulica, instalación de presostato nuevo (Square D / Danfoss), ajuste de diferencial de presión de arranque (Cut-in) y parada (Cut-out).',
      categoria: 'CORRECTIVO',
      id_tipo_equipo: idBom,
      id_tipo_servicio: idServBomCorr,
      duracion_estimada_horas: 2.0,
      precio_base: 220000,
      incluye_repuestos: false,
      activo: true,
    },
    {
      id_servicio: 203,
      codigo_servicio: 'BOM-CORR-VFD',
      nombre_servicio: 'Diagnóstico y Parametrización de Variador de Frecuencia (VFD)',
      descripcion: 'Revisión de parámetros PID de presión constante, curva V/F, diagnóstico de fallas térmicas o sobrecorriente y calibración de transductor 4-20mA.',
      categoria: 'ESPECIALIZADO',
      id_tipo_equipo: idBom,
      id_tipo_servicio: idServBomCorr,
      duracion_estimada_horas: 3.0,
      precio_base: 450000,
      incluye_repuestos: false,
      activo: true,
    },
    {
      id_servicio: 204,
      codigo_servicio: 'BOM-CORR-TANQ-MEM',
      nombre_servicio: 'Revisión, Presurización o Cambio de Tanque Hidroneumático',
      descripcion: 'Verificación de membrana interna de tanque, carga de nitrógeno/aire comprimido a presión de precarga adecuada o sustitución completa de tanque.',
      categoria: 'CORRECTIVO',
      id_tipo_equipo: idBom,
      id_tipo_servicio: idServBomCorr,
      duracion_estimada_horas: 2.5,
      precio_base: 280000,
      incluye_repuestos: false,
      activo: true,
    },
    {
      id_servicio: 205,
      codigo_servicio: 'BOM-CORR-VALV-CHEQ',
      nombre_servicio: 'Cambio / Mantenimiento de Válvula Cheque / Retención',
      descripcion: 'Desmontaje de válvula de retención con fugas o atascamiento en succión/descarga, cambio de clapeta/resorte o instalación de válvula nueva.',
      categoria: 'CORRECTIVO',
      id_tipo_equipo: idBom,
      id_tipo_servicio: idServBomCorr,
      duracion_estimada_horas: 2.0,
      precio_base: 230000,
      incluye_repuestos: false,
      activo: true,
    },
    {
      id_servicio: 206,
      codigo_servicio: 'BOM-CORR-MANOM',
      nombre_servicio: 'Reemplazo de Manómetro de Presión en Glicerina',
      descripcion: 'Desmonte de manómetro descalibrado, montaje de manómetro en baño de glicerina (0-100 / 0-200 PSI) con sello de teflón.',
      categoria: 'CORRECTIVO',
      id_tipo_equipo: idBom,
      id_tipo_servicio: idServBomCorr,
      duracion_estimada_horas: 1.0,
      precio_base: 120000,
      incluye_repuestos: false,
      activo: true,
    },
    {
      id_servicio: 207,
      codigo_servicio: 'BOM-CORR-IMPULSOR',
      nombre_servicio: 'Inspección, Balanceo o Cambio de Impulsor',
      descripcion: 'Desarme de cuerpo de bomba, revisión de cavitación o desgaste en alabes, maquinado/sustitución de impulsor y balanceo dinámico.',
      categoria: 'CORRECTIVO',
      id_tipo_equipo: idBom,
      id_tipo_servicio: idServBomCorr,
      duracion_estimada_horas: 4.0,
      precio_base: 460000,
      incluye_repuestos: false,
      activo: true,
    },
    {
      id_servicio: 208,
      codigo_servicio: 'BOM-CORR-CEB-PURG',
      nombre_servicio: 'Cebado, Desaireación y Corrección de Pérdida de Succión',
      descripcion: 'Detección de entradas de aire en tubería de succión, purga de cámara de bombeo y verificación de válvula de pie.',
      categoria: 'CORRECTIVO',
      id_tipo_equipo: idBom,
      id_tipo_servicio: idServBomCorr,
      duracion_estimada_horas: 1.5,
      precio_base: 160000,
      incluye_repuestos: false,
      activo: true,
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // C. MOTORES ASOCIADOS & GENERALES
    // ═══════════════════════════════════════════════════════════════════════════
    {
      id_servicio: 301,
      codigo_servicio: 'MOT-CORR-RODAM',
      nombre_servicio: 'Cambio de Rodamientos / Balineras de Motor',
      descripcion: 'Desarme de tapas de motor, extracción con extractor hidráulico de rodamientos desgastados, montaje térmico de rodamientos sellados SKF/NSK y engrase.',
      categoria: 'CORRECTIVO',
      id_tipo_equipo: idMot,
      id_tipo_servicio: idServGeneralCorr,
      duracion_estimada_horas: 4.0,
      precio_base: 450000,
      incluye_repuestos: false,
      activo: true,
    },
    {
      id_servicio: 302,
      codigo_servicio: 'MOT-CORR-ARRANC',
      nombre_servicio: 'Reparación / Mantenimiento de Motor de Arranque',
      descripcion: 'Desmontaje de motor de arranque 12V/24V, cambio de bendix, escobillas/carbones, prueba en banco y reinstalación.',
      categoria: 'CORRECTIVO',
      id_tipo_equipo: idMot,
      id_tipo_servicio: idServGeneralCorr,
      duracion_estimada_horas: 3.0,
      precio_base: 320000,
      incluye_repuestos: false,
      activo: true,
    },
    {
      id_servicio: 303,
      codigo_servicio: 'MOT-CORR-CONTACTOR',
      nombre_servicio: 'Reemplazo de Contactor / Relé Térmico de Potencia',
      descripcion: 'Sustitución de contactor de fuerza quemado/picado, regulación de corriente en relé bimetálico y reapriete de bornes de potencia.',
      categoria: 'CORRECTIVO',
      id_tipo_equipo: idMot,
      id_tipo_servicio: idServGeneralCorr,
      duracion_estimada_horas: 2.0,
      precio_base: 240000,
      incluye_repuestos: false,
      activo: true,
    },
    {
      id_servicio: 304,
      codigo_servicio: 'MOT-CORR-ALIN-LASER',
      nombre_servicio: 'Alineación Láser Eje Motor - Bomba / Generador',
      descripcion: 'Medición de desalineación angular y paralela mediante equipo óptico láser, colocación de calzas calibradas de acero inox y torqueo.',
      categoria: 'ESPECIALIZADO',
      id_tipo_equipo: idMot,
      id_tipo_servicio: idServGeneralCorr,
      duracion_estimada_horas: 3.5,
      precio_base: 520000,
      incluye_repuestos: false,
      activo: true,
    },
    {
      id_servicio: 305,
      codigo_servicio: 'MOT-CORR-REBOB',
      nombre_servicio: 'Desmonte, Rebobinado y Barnizado de Estator',
      descripcion: 'Extracción de motor quemado, remoción de devanado averiado, rebobinado con alambre esmaltado clase H, impregnación al vacío y horneado.',
      categoria: 'ESPECIALIZADO',
      id_tipo_equipo: idMot,
      id_tipo_servicio: idServGeneralCorr,
      duracion_estimada_horas: 8.0,
      precio_base: 1200000,
      incluye_repuestos: false,
      activo: true,
    },
  ];

  let insertados = 0;
  let actualizados = 0;

  for (const s of servicios) {
    const res = await prisma.catalogo_servicios.upsert({
      where: { id_servicio: s.id_servicio },
      update: {
        codigo_servicio: s.codigo_servicio,
        nombre_servicio: s.nombre_servicio,
        descripcion: s.descripcion,
        categoria: s.categoria,
        id_tipo_equipo: s.id_tipo_equipo,
        id_tipo_servicio: s.id_tipo_servicio,
        duracion_estimada_horas: s.duracion_estimada_horas,
        precio_base: s.precio_base,
        incluye_repuestos: s.incluye_repuestos,
        activo: s.activo,
        fecha_modificacion: new Date(),
      },
      create: {
        id_servicio: s.id_servicio,
        codigo_servicio: s.codigo_servicio,
        nombre_servicio: s.nombre_servicio,
        descripcion: s.descripcion,
        categoria: s.categoria,
        id_tipo_equipo: s.id_tipo_equipo,
        id_tipo_servicio: s.id_tipo_servicio,
        duracion_estimada_horas: s.duracion_estimada_horas,
        precio_base: s.precio_base,
        incluye_repuestos: s.incluye_repuestos,
        activo: s.activo,
      },
    });

    console.log(`✅ [${res.codigo_servicio}] ${res.nombre_servicio} (Cat: ${res.categoria})`);
    insertados++;
  }

  console.log(`\n🎉 Seed completado exitosamente: ${insertados} servicios correctivos/especializados listos en catalogo_servicios.`);
}

seedCatalogoServicios()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
