/**
 * SEED: parametros_medicion con rangos críticos definidos
 * Ejecutar: pnpm ts-node scripts/seed-parametros-medicion.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function main() {
  console.log('🌱 Iniciando seed parametros_medicion...\n');

  // Limpiar parámetros existentes (testing)
  try {
    await prisma.$executeRaw`DELETE FROM parametros_medicion WHERE id_parametro_medicion IN (1, 2, 3)`;
    console.log('✅ Parámetros test anteriores eliminados\n');
  } catch (error) {
    console.log('ℹ️ No hay parámetros previos a eliminar\n');
  }

  // ==========================================
  // PARÁMETRO 1: VOLTAJE_TRIFASICO
  // ==========================================
  console.log('📊 Creando PARÁMETRO 1: VOLTAJE_TRIFASICO');
  const param1 = await prisma.parametros_medicion.create({
    data: {
      nombre_parametro: 'VOLTAJE_TRIFASICO',
      codigo_parametro: 'VOLT-TRI',
      unidad_medida: 'V',
      tipo_dato: 'NUMERICO',
      categoria: 'ELECTRICO',
      
      // RANGOS CRÍTICOS
      valor_minimo_normal: 210.00,    // 220V -4.5%
      valor_maximo_normal: 230.00,    // 220V +4.5%
      valor_minimo_critico: 200.00,   // 220V -9%
      valor_maximo_critico: 250.00,   // 220V +13.6%
      valor_ideal: 220.00,
      
      decimales_precision: 2,
      descripcion: 'Medición de voltaje trifásico en bornes principales del equipo. Rango nominal 220V ±10V (normal), ±20V (crítico).',
      
      // FLAGS
      es_critico_seguridad: true,
      es_obligatorio: true,
      
      observaciones: 'Parámetro crítico - Requiere medición con multímetro calibrado certificado',
      
      activo: true,
      creado_por: 1,
      fecha_creacion: new Date(),
    },
  });

  console.log(`   ✅ ID: ${param1.id_parametro_medicion}`);
  console.log(`   📏 Rango Normal: ${param1.valor_minimo_normal} - ${param1.valor_maximo_normal} V`);
  console.log(`   ⚠️  Rango Crítico: ${param1.valor_minimo_critico} - ${param1.valor_maximo_critico} V`);
  console.log(`   🎯 Valor Ideal: ${param1.valor_ideal} V\n`);

  // ==========================================
  // PARÁMETRO 2: TEMPERATURA_MOTOR
  // ==========================================
  console.log('📊 Creando PARÁMETRO 2: TEMPERATURA_MOTOR');
  const param2 = await prisma.parametros_medicion.create({
    data: {
      nombre_parametro: 'TEMPERATURA_MOTOR',
      codigo_parametro: 'TEMP-MOT',
      unidad_medida: '°C',
      tipo_dato: 'NUMERICO',
      categoria: 'ELECTRICO',
      
      // RANGOS CRÍTICOS
      valor_minimo_normal: 60.00,
      valor_maximo_normal: 85.00,
      valor_minimo_critico: 50.00,
      valor_maximo_critico: 95.00,
      valor_ideal: 75.00,
      
      decimales_precision: 1,
      descripcion: 'Temperatura superficial del motor eléctrico en operación normal. Límite crítico basado en clase térmica B (130°C) con factor de seguridad.',
      
      // FLAGS
      es_critico_seguridad: true,
      es_obligatorio: true,
      
      observaciones: 'Medición térmica crítica - Usar pirómetro calibrado',
      
      activo: true,
      creado_por: 1,
      fecha_creacion: new Date(),
    },
  });

  console.log(`   ✅ ID: ${param2.id_parametro_medicion}`);
  console.log(`   📏 Rango Normal: ${param2.valor_minimo_normal} - ${param2.valor_maximo_normal} °C`);
  console.log(`   ⚠️  Rango Crítico: ${param2.valor_minimo_critico} - ${param2.valor_maximo_critico} °C`);
  console.log(`   🎯 Valor Ideal: ${param2.valor_ideal} °C\n`);

  // ==========================================
  // PARÁMETRO 3: ESTADO_VISUAL_PINTURA (No numérico)
  // ==========================================
  console.log('📊 Creando PARÁMETRO 3: ESTADO_VISUAL_PINTURA');
  const param3 = await prisma.parametros_medicion.create({
    data: {
      nombre_parametro: 'ESTADO_VISUAL_PINTURA',
      codigo_parametro: 'EST-VIS-PINT',
      unidad_medida: 'N/A',
      tipo_dato: 'TEXTO',
      categoria: 'OPERACIONAL',
      
      // Sin rangos (tipo TEXTO)
      valor_minimo_normal: null,
      valor_maximo_normal: null,
      valor_minimo_critico: null,
      valor_maximo_critico: null,
      valor_ideal: null,
      decimales_precision: null,
      
      descripcion: 'Evaluación visual del estado de la pintura y acabados del equipo. Valores posibles: BUENO, REGULAR, MALO, MUY_MALO.',
      
      // FLAGS
      es_critico_seguridad: false,
      es_obligatorio: false,
      
      observaciones: 'Parámetro visual cualitativo - Inspeccionar corrosión, descascaramiento, oxidación',
      
      activo: true,
      creado_por: 1,
      fecha_creacion: new Date(),
    },
  });

  console.log(`   ✅ ID: ${param3.id_parametro_medicion}`);
  console.log(`   📝 Tipo: ${param3.tipo_dato} (sin rangos numéricos)`);
  console.log(`   📋 Valores: BUENO | REGULAR | MALO | MUY_MALO\n`);

  // ==========================================
  // VERIFICACIÓN FINAL
  // ==========================================
  console.log('🔍 Verificando parámetros creados...');
  const totalParams = await prisma.parametros_medicion.count();
  console.log(`   📊 Total parámetros en DB: ${totalParams}`);

  const paramsCreated = await prisma.parametros_medicion.findMany({
    where: {
      id_parametro_medicion: { in: [1, 2, 3] },
    },
    select: {
      id_parametro_medicion: true,
      nombre_parametro: true,
      codigo_parametro: true,
      categoria: true,
      es_critico_seguridad: true,
      activo: true,
    },
    orderBy: { id_parametro_medicion: 'asc' },
  });

  console.log('\n📋 Parámetros creados:');
  paramsCreated.forEach((p) => {
    console.log(`   ${p.es_critico_seguridad ? '⚠️' : '📌'} [${p.id_parametro_medicion}] ${p.codigo_parametro} - ${p.nombre_parametro} (${p.categoria})`);
  });

  console.log('\n✅ Seed completado exitosamente');
  console.log('🚀 Listo para testing mediciones con validación automática de rangos\n');
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('🔌 Prisma Client desconectado');
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('\n❌ ERROR en seed:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
