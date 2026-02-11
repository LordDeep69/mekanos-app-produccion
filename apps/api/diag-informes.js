const { PrismaClient } = require('./node_modules/.prisma/client');
const p = new PrismaClient();

(async () => {
  try {
    // === DIAGNOSTICO MULTI-SEDE COMFENALCO ===

    // 1. Cliente principal 50
    const c50 = await p.clientes.findUnique({
      where: { id_cliente: 50 },
      include: {
        persona: { select: { razon_social: true, nombre_comercial: true, nombre_completo: true, numero_identificacion: true, id_persona: true } },
      },
    });
    console.log('=== CLIENTE 50 (Comfenalco Principal) ===');
    console.log('  id_persona:', c50.id_persona);
    console.log('  razon_social:', c50.persona?.razon_social);
    console.log('  nombre_comercial:', c50.persona?.nombre_comercial);
    console.log('  nombre_sede:', c50.nombre_sede);
    console.log('  es_cliente_principal:', c50.es_cliente_principal);
    console.log('  id_cliente_principal:', c50.id_cliente_principal);
    console.log('  NIT:', c50.persona?.numero_identificacion);

    // 2. Clientes-sede de Comfenalco (registros en tabla clientes con id_cliente_principal=50)
    const sedesCliente = await p.clientes.findMany({
      where: { id_cliente_principal: 50 },
      include: {
        persona: { select: { razon_social: true, nombre_completo: true, numero_identificacion: true, id_persona: true } },
      },
    });
    console.log('\n=== CLIENTES-SEDE (id_cliente_principal=50) ===');
    console.log('Total:', sedesCliente.length);
    sedesCliente.forEach(s => {
      console.log(`  id_cliente: ${s.id_cliente} | sede: "${s.nombre_sede}" | persona_id: ${s.id_persona} | razon_social: ${s.persona?.razon_social} | es_principal: ${s.es_cliente_principal}`);
    });

    // 3. Sedes en tabla sedes_cliente para clientes Comfenalco
    const allComfenalcoIds = [50, ...sedesCliente.map(s => s.id_cliente)];
    const sedesReales = await p.sedes_cliente.findMany({
      where: { id_cliente: { in: allComfenalcoIds } },
    });
    console.log('\n=== TABLA sedes_cliente para IDs Comfenalco ===');
    console.log('Total:', sedesReales.length);
    sedesReales.forEach(s => {
      console.log(`  id_sede: ${s.id_sede} | cliente_id: ${s.id_cliente} | nombre: "${s.nombre_sede}" | ciudad: ${s.ciudad_sede} | activo: ${s.activo}`);
    });

    // 4. Órdenes de Comfenalco (todas las sedes)
    const ordenes = await p.ordenes_servicio.findMany({
      where: { id_cliente: { in: allComfenalcoIds } },
      select: { id_orden_servicio: true, numero_orden: true, id_cliente: true, id_sede: true },
      take: 20,
      orderBy: { id_orden_servicio: 'desc' },
    });
    console.log('\n=== ORDENES Comfenalco (últimas 20) ===');
    ordenes.forEach(o => {
      console.log(`  orden: ${o.numero_orden} | cliente_id: ${o.id_cliente} | sede_id: ${o.id_sede}`);
    });

    // 5. Equipos vinculados a clientes Comfenalco
    const equipos = await p.equipos.findMany({
      where: { id_cliente: { in: allComfenalcoIds } },
      select: { id_equipo: true, codigo_equipo: true, nombre_equipo: true, id_cliente: true, id_sede: true },
    });
    console.log('\n=== EQUIPOS Comfenalco ===');
    console.log('Total:', equipos.length);
    equipos.forEach(e => {
      console.log(`  id: ${e.id_equipo} | codigo: ${e.codigo_equipo} | nombre: ${e.nombre_equipo} | cliente_id: ${e.id_cliente} | sede_id: ${e.id_sede}`);
    });

    // 6. Todos los clientes que comparten la misma persona (NIT)
    if (c50.id_persona) {
      const mismaPersona = await p.clientes.findMany({
        where: { id_persona: c50.id_persona },
        select: { id_cliente: true, nombre_sede: true, es_cliente_principal: true, id_cliente_principal: true },
      });
      console.log('\n=== CLIENTES con misma persona (id_persona=' + c50.id_persona + ') ===');
      mismaPersona.forEach(c => {
        console.log(`  id_cliente: ${c.id_cliente} | sede: "${c.nombre_sede}" | es_principal: ${c.es_cliente_principal} | principal_id: ${c.id_cliente_principal}`);
      });
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await p.$disconnect();
  }
})();
