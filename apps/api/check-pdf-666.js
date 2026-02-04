const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

BigInt.prototype.toJSON = function () { return this.toString(); };

async function checkPdf() {
  try {
    const doc = await prisma.documentos_generados.findFirst({
      where: {
        id_referencia: 666,
        tipo_documento: 'INFORME_SERVICIO'
      },
      orderBy: { fecha_generacion: 'desc' }
    });

    console.log('Documento encontrado:', JSON.stringify(doc, null, 2));

    if (!doc) {
      console.log('\n❌ NO HAY DOCUMENTO REGISTRADO EN BD');
      console.log('Buscando todos los documentos de la orden 666...');
      const allDocs = await prisma.documentos_generados.findMany({
        where: { id_referencia: 666 }
      });
      console.log('Documentos encontrados:', allDocs.length);
      allDocs.forEach(d => console.log(`  - ID: ${d.id_documento}, Tipo: ${d.tipo_documento}, URL: ${d.ruta_archivo}`));
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPdf();
