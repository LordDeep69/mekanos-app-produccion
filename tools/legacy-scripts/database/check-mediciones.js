const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.catalogo_actividades.findMany({
    where: { id_tipo_servicio: 3, activo: true },
    select: {
      id_actividad_catalogo: true,
      descripcion_actividad: true,
      id_parametro_medicion: true
    }
  });
  
  const conMedicion = result.filter(a => a.id_parametro_medicion !== null);
  const sinMedicion = result.filter(a => a.id_parametro_medicion === null);
  
  console.log(`\n📊 Tipo servicio 3 (Preventivo Tipo A - Generador):`);
  console.log(`   Total actividades: ${result.length}`);
  console.log(`   Con medición: ${conMedicion.length}`);
  console.log(`   Sin medición: ${sinMedicion.length}`);
  
  if (conMedicion.length > 0) {
    console.log('\n📍 Actividades CON medición:');
    conMedicion.forEach(a => console.log(`   - ${a.descripcion_actividad} (param: ${a.id_parametro_medicion})`));
  }
  
  await prisma.$disconnect();
}

main();
