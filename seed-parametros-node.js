// Script Node.js para ejecutar seed parametros_medicion
// Uso: node seed-parametros-node.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding parametros_medicion...');

  // DELETE existing if any
  await prisma.$executeRaw`DELETE FROM parametros_medicion WHERE id_parametro_medicion IN (1, 2, 3)`;
  console.log('✅ Parámetros anteriores eliminados');

  // Parámetro 1: VOLTAJE_TRIFASICO
  const param1 = await prisma.parametros_medicion.create({
    data: {
      id_parametro_medicion: 1,
      nombre_parametro: 'VOLTAJE_TRIFASICO',
      codigo_parametro: 'VOLT-TRI',
      unidad_medida: 'V',
      tipo_dato: 'NUMERICO',
      categoria: 'ELECTRICO',
      valor_minimo_normal: 210.00,
      valor_maximo_normal: 230.00,
      valor_minimo_critico: 200.00,
      valor_maximo_critico: 250.00,
      valor_ideal: 220.00,
      decimales_precision: 2,
      descripcion: 'Medición de voltaje trifásico en bornes principales del equipo. Rango nominal 220V ±10V (normal), ±20V (crítico)',
      es_critico_seguridad: true,
      es_obligatorio: true,
      orden_visualizacion: 1,
      instrucciones_medicion: 'Utilizar multímetro calibrado (Fluke 87V o similar). Medir voltaje L1-N, L2-N, L3-N y promediar. Equipo debe estar en operación normal.',
      activo: true,
      creado_por: 1
    }
  });
  console.log(`✅ Parámetro 1 creado: ${param1.nombre_parametro} (ID: ${param1.id_parametro_medicion})`);

  // Parámetro 2: TEMPERATURA_MOTOR
  const param2 = await prisma.parametros_medicion.create({
    data: {
      id_parametro_medicion: 2,
      nombre_parametro: 'TEMPERATURA_MOTOR',
      codigo_parametro: 'TEMP-MOT',
      unidad_medida: '°C',
      tipo_dato: 'NUMERICO',
      categoria: 'TERMICO',
      valor_minimo_normal: 60.00,
      valor_maximo_normal: 85.00,
      valor_minimo_critico: 50.00,
      valor_maximo_critico: 95.00,
      valor_ideal: 75.00,
      decimales_precision: 1,
      descripcion: 'Temperatura superficial del motor eléctrico en operación normal. Límite crítico basado en clase térmica B (130°C) con factor seguridad.',
      es_critico_seguridad: true,
      es_obligatorio: true,
      orden_visualizacion: 2,
      instrucciones_medicion: 'Usar termómetro infrarrojo (pirometro). Medir en carcasa motor (punto más caliente), equipo con mínimo 15 minutos operación continua.',
      activo: true,
      creado_por: 1
    }
  });
  console.log(`✅ Parámetro 2 creado: ${param2.nombre_parametro} (ID: ${param2.id_parametro_medicion})`);

  // Parámetro 3: ESTADO_VISUAL_PINTURA (no numérico)
  const param3 = await prisma.parametros_medicion.create({
    data: {
      id_parametro_medicion: 3,
      nombre_parametro: 'ESTADO_VISUAL_PINTURA',
      codigo_parametro: 'EST-VIS-PINT',
      unidad_medida: null,
      tipo_dato: 'TEXTO',
      categoria: 'VISUAL',
      valor_minimo_normal: null,
      valor_maximo_normal: null,
      valor_minimo_critico: null,
      valor_maximo_critico: null,
      valor_ideal: null,
      decimales_precision: null,
      descripcion: 'Evaluación visual del estado de la pintura y acabados del equipo. Valores posibles: BUENO, REGULAR, MALO, MUY_MALO.',
      es_critico_seguridad: false,
      es_obligatorio: false,
      orden_visualizacion: 10,
      instrucciones_medicion: 'Inspeccionar visualmente: corrosión, descascaramiento, oxidación. Registrar observaciones detalladas.',
      activo: true,
      creado_por: 1
    }
  });
  console.log(`✅ Parámetro 3 creado: ${param3.nombre_parametro} (ID: ${param3.id_parametro_medicion})`);

  // Verificación
  const total = await prisma.parametros_medicion.count();
  console.log(`\n📊 Total parametros_medicion en DB: ${total}`);

  console.log('\n✅ Seed completado exitosamente');
  console.log('🔍 Verificar: SELECT * FROM parametros_medicion WHERE id_parametro_medicion IN (1,2,3);');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Error en seed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
