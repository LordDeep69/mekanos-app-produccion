import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
dotenv.config({ path: path.resolve(__dirname, '../../../apps/api/.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PENDIENTES_SEMILLA = [
  // ── GENERADORES / PLANTAS ELÉCTRICAS ──
  {
    codigo: 'PEND-GEN-BAT',
    descripcion: 'Cotizar e instalar nuevo juego de baterías de arranque',
    categoria: 'ELECTRICO',
    orden_visual: 1,
  },
  {
    codigo: 'PEND-GEN-FUG-RAD',
    descripcion: 'Corrección de fuga de refrigerante en radiador o mangueras',
    categoria: 'MECANICO',
    orden_visual: 2,
  },
  {
    codigo: 'PEND-GEN-AVR',
    descripcion: 'Diagnóstico, reemplazo o calibración de tarjeta reguladora de voltaje (AVR)',
    categoria: 'ELECTRICO',
    orden_visual: 3,
  },
  {
    codigo: 'PEND-GEN-SOL-COMB',
    descripcion: 'Reemplazo de solenoide de corte de combustible',
    categoria: 'COMBUSTIBLE',
    orden_visual: 4,
  },
  {
    codigo: 'PEND-GEN-MOD-CTRL',
    descripcion: 'Reemplazo o reprogramación de módulo de control digital (DeepSea / ComAp / SmartGen)',
    categoria: 'ELECTRONICO',
    orden_visual: 5,
  },
  {
    codigo: 'PEND-GEN-LIMP-COMB',
    descripcion: 'Drenaje, lavado y purga de tanque de combustible (ACPM contaminado)',
    categoria: 'COMBUSTIBLE',
    orden_visual: 6,
  },
  {
    codigo: 'PEND-GEN-CORR-ALT',
    descripcion: 'Revisión y ajuste de tensión en correas de alternador / ventilador',
    categoria: 'MECANICO',
    orden_visual: 7,
  },
  {
    codigo: 'PEND-GEN-CARG-BAT',
    descripcion: 'Suministro e instalación de cargador de batería estático 12V/24V',
    categoria: 'ELECTRICO',
    orden_visual: 8,
  },
  {
    codigo: 'PEND-GEN-SEN-PRES',
    descripcion: 'Cambio de sensor o switch de presión de aceite',
    categoria: 'INSTRUMENTACION',
    orden_visual: 9,
  },
  {
    codigo: 'PEND-GEN-SEN-TEMP',
    descripcion: 'Cambio de termostato o sensor de temperatura de motor',
    categoria: 'INSTRUMENTACION',
    orden_visual: 10,
  },
  {
    codigo: 'PEND-GEN-EXOSTO',
    descripcion: 'Suministro e instalación de tubería / silenciador de exosto',
    categoria: 'MECANICO',
    orden_visual: 11,
  },

  // ── SISTEMAS DE BOMBEO / BOMBAS HIDRÁULICAS ──
  {
    codigo: 'PEND-BOM-SELL-MEC',
    descripcion: 'Reemplazo de sello mecánico por fuga de agua en voluta',
    categoria: 'MECANICO',
    orden_visual: 12,
  },
  {
    codigo: 'PEND-BOM-PRES',
    descripcion: 'Reemplazo y calibración de presostato de control de presión',
    categoria: 'ELECTRICO',
    orden_visual: 13,
  },
  {
    codigo: 'PEND-BOM-TANQ-MEM',
    descripcion: 'Inspección, presurización o cambio de membrana en tanque hidroneumático',
    categoria: 'MECANICO',
    orden_visual: 14,
  },
  {
    codigo: 'PEND-BOM-VALV-CHEQ',
    descripcion: 'Mantenimiento o reemplazo de válvula cheque / retención de succión',
    categoria: 'MECANICO',
    orden_visual: 15,
  },
  {
    codigo: 'PEND-BOM-MANOM',
    descripcion: 'Reemplazo de manómetro de presión en glicerina defectuoso',
    categoria: 'INSTRUMENTACION',
    orden_visual: 16,
  },
  {
    codigo: 'PEND-BOM-IMPULSOR',
    descripcion: 'Inspección, balanceo o reemplazo de impulsor desgastado',
    categoria: 'MECANICO',
    orden_visual: 17,
  },
  {
    codigo: 'PEND-BOM-CEB-PURG',
    descripcion: 'Cebado y corrección de toma de aire en línea de succión',
    categoria: 'HIDRAULICO',
    orden_visual: 18,
  },
  {
    codigo: 'PEND-BOM-VFD',
    descripcion: 'Diagnóstico y parametrización de variador de frecuencia (VFD)',
    categoria: 'ELECTRONICO',
    orden_visual: 19,
  },

  // ── MOTORES / GENERALES ──
  {
    codigo: 'PEND-MOT-RODAM',
    descripcion: 'Cambio de rodamientos / balineras en motor eléctrico o bomba',
    categoria: 'MECANICO',
    orden_visual: 20,
  },
  {
    codigo: 'PEND-MOT-ARRANC',
    descripcion: 'Reparación o mantenimiento general de motor de arranque',
    categoria: 'ELECTRICO',
    orden_visual: 21,
  },
  {
    codigo: 'PEND-GEN-CABLEADO',
    descripcion: 'Requiere cambio de cableado de potencia sulfatado o deteriorado',
    categoria: 'ELECTRICO',
    orden_visual: 22,
  },
  {
    codigo: 'PEND-GEN-LAVADO',
    descripcion: 'Equipo requiere lavado desengrasante químico y desincrustación general',
    categoria: 'LIMPIEZA',
    orden_visual: 23,
  },
  {
    codigo: 'PEND-GEN-ALIN-LASER',
    descripcion: 'Alineación láser de ejes motor - acople',
    categoria: 'MECANICO',
    orden_visual: 24,
  },
  {
    codigo: 'PEND-GEN-REPUESTOS',
    descripcion: 'Cotizar kit de repuestos preventivos para próxima visita programada',
    categoria: 'GENERAL',
    orden_visual: 25,
  },
];

async function main() {
  console.log('🌱 [SEED] Sembrando catálogo inicial de pendientes frecuentes...');

  let creados = 0;
  let existentes = 0;

  for (const item of PENDIENTES_SEMILLA) {
    const existe = await prisma.catalogo_pendientes.findFirst({
      where: {
        OR: [
          { codigo: item.codigo },
          { descripcion: item.descripcion },
        ],
      },
    });

    if (!existe) {
      await prisma.catalogo_pendientes.create({
        data: {
          codigo: item.codigo,
          descripcion: item.descripcion,
          categoria: item.categoria,
          orden_visual: item.orden_visual,
          activo: true,
        },
      });
      creados++;
    } else {
      existentes++;
    }
  }

  const total = await prisma.catalogo_pendientes.count();
  console.log(`✅ [SEED] Catálogo de pendientes listo: ${creados} nuevos, ${existentes} existentes. Total en BD: ${total}`);
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
