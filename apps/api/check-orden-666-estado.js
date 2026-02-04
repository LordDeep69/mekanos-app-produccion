const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

BigInt.prototype.toJSON = function() { return this.toString(); };

async function checkOrden() {
  try {
    const orden = await prisma.ordenes_servicio.findUnique({
      where: { id_orden_servicio: 666 },
      include: {
        estados_orden: true
      }
    });
    
    console.log('Orden 666:');
    console.log('  Número:', orden.numero_orden);
    console.log('  Estado ID:', orden.id_estado_actual);
    console.log('  Estado código:', orden.estados_orden.codigo_estado);
    console.log('  Estado nombre:', orden.estados_orden.nombre_estado);
    console.log('  Es estado final:', orden.estados_orden.es_estado_final);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkOrden();
