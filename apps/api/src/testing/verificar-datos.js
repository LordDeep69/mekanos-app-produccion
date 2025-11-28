const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function verificar() {
  console.log('\n=== VERIFICACIÓN DE DATOS CREADOS ===\n');
  
  // Últimas órdenes
  const ordenes = await p.ordenes_servicio.findMany({
    take: 5,
    orderBy: { id_orden_servicio: 'desc' },
    include: { estado: true }
  });
  
  console.log('📋 ÚLTIMAS ÓRDENES:');
  ordenes.forEach(o => {
    console.log(`   ${o.numero_orden} - ${o.estado?.nombre_estado} - ${o.trabajo_realizado ? '✅ CON TRABAJO' : '❌ SIN TRABAJO'}`);
  });
  
  // Firmas digitales
  const firmas = await p.firmas_digitales.findMany({
    take: 5,
    orderBy: { id_firma_digital: 'desc' }
  });
  console.log(`\n✍️ FIRMAS DIGITALES: ${firmas.length} recientes`);
  
  // Evidencias
  const evidencias = await p.evidencias_fotograficas.findMany({
    take: 5,
    orderBy: { id_evidencia: 'desc' }
  });
  console.log(`📷 EVIDENCIAS: ${evidencias.length} recientes`);
  evidencias.forEach(e => console.log(`   ${e.nombre_archivo}`));
  
  // Documentos
  const docs = await p.documentos_generados.findMany({
    take: 5,
    orderBy: { id_documento: 'desc' }
  });
  console.log(`📄 DOCUMENTOS PDF: ${docs.length} recientes`);
  docs.forEach(d => console.log(`   ${d.numero_documento} - ${d.tama_o_bytes} bytes`));
  
  // Informes
  const informes = await p.informes.findMany({
    take: 5,
    orderBy: { id_informe: 'desc' }
  });
  console.log(`📝 INFORMES: ${informes.length} recientes`);
  informes.forEach(i => console.log(`   ${i.numero_informe} - ${i.estado_informe}`));
  
  console.log('\n=== FIN VERIFICACIÓN ===\n');
  
  await p.$disconnect();
}

verificar().catch(console.error);
