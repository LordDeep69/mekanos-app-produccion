const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function verificarURLs() {
  console.log('\n=== VERIFICACIÓN DE URLs CLOUD ===\n');
  
  // Verificar evidencias con URLs de Cloudinary
  const evidencias = await p.evidencias_fotograficas.findMany({
    take: 3,
    orderBy: { id_evidencia: 'desc' },
    select: {
      nombre_archivo: true,
      ruta_archivo: true
    }
  });
  
  console.log('📷 EVIDENCIAS (URLs):');
  evidencias.forEach(e => {
    const esCloudinary = e.ruta_archivo?.includes('cloudinary.com');
    console.log(`   ${e.nombre_archivo}`);
    console.log(`   URL: ${e.ruta_archivo?.substring(0, 70)}...`);
    console.log(`   ¿Cloudinary Real?: ${esCloudinary ? '✅ SÍ' : '❌ NO (simulado)'}\n`);
  });
  
  // Verificar documentos con URLs de R2
  const docs = await p.documentos_generados.findMany({
    take: 3,
    orderBy: { id_documento: 'desc' },
    select: {
      numero_documento: true,
      ruta_archivo: true
    }
  });
  
  console.log('📄 DOCUMENTOS (URLs):');
  docs.forEach(d => {
    const esR2 = d.ruta_archivo?.includes('r2.cloudflarestorage.com');
    console.log(`   ${d.numero_documento}`);
    console.log(`   URL: ${d.ruta_archivo?.substring(0, 70)}...`);
    console.log(`   ¿R2 Real?: ${esR2 ? '✅ SÍ' : '❌ NO (simulado)'}\n`);
  });
  
  await p.$disconnect();
}

verificarURLs().catch(console.error);
