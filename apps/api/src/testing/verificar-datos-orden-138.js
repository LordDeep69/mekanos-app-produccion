const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function verificar() {
    const o = await p.ordenes_servicio.findUnique({
        where: { id_orden_servicio: 138 },
        include: {
            cliente: { include: { persona: true } },
            equipo: true,
            tecnico: { include: { persona: true } },
            tipo_servicio: true
        }
    });

    console.log('═══════════════════════════════════════════════════════');
    console.log('DATOS DE LA ORDEN 138 PARA PDF');
    console.log('═══════════════════════════════════════════════════════');
    console.log('CLIENTE:', o?.cliente?.persona?.razon_social || o?.cliente?.persona?.nombre_completo || 'N/A');
    console.log('DIRECCION:', o?.cliente?.persona?.direccion_principal || 'N/A');
    console.log('EQUIPO MARCA:', o?.equipo?.marca || 'N/A');
    console.log('EQUIPO SERIE:', o?.equipo?.serie || 'N/A');
    console.log('TECNICO:', `${o?.tecnico?.persona?.primer_nombre || ''} ${o?.tecnico?.persona?.primer_apellido || ''}`.trim() || 'N/A');
    console.log('TIPO SERVICIO:', o?.tipo_servicio?.nombre || 'N/A');
    console.log('');
    console.log('RAW EQUIPO:', JSON.stringify(o?.equipo, null, 2));
    console.log('RAW TECNICO:', JSON.stringify(o?.tecnico, null, 2));

    await p.$disconnect();
}

verificar().catch(console.error);
