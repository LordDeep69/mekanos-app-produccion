// Script para verificar equipos en la base de datos
const { PrismaClient } = require('@prisma/client');

async function checkEquipos() {
  const prisma = new PrismaClient();

  try {
    console.log('=== CONSULTA TODOS LOS EQUIPOS ===');
    const equipos = await prisma.equipos.findMany({
      select: {
        id_equipo: true,
        codigo_equipo: true,
        activo: true,
        fecha_creacion: true,
        fecha_modificacion: true,
        modificado_por: true,
        fecha_baja: true,
        motivo_baja: true
      },
      orderBy: { id_equipo: 'asc' }
    });

    console.log('Total equipos encontrados:', equipos.length);
    equipos.forEach(eq => {
      console.log(`ID: ${eq.id_equipo} | Codigo: ${eq.codigo_equipo} | Activo: ${eq.activo} | Creado: ${eq.fecha_creacion} | Modificado: ${eq.fecha_modificacion} | Modificado por: ${eq.modificado_por}`);
    });

    console.log('\n=== DETALLE COMPLETO DEL EQUIPO ID 2 ===');
    const equipo2 = await prisma.equipos.findUnique({
      where: { id_equipo: 2 },
      select: {
        id_equipo: true,
        codigo_equipo: true,
        activo: true,
        fecha_creacion: true,
        fecha_modificacion: true,
        modificado_por: true,
        fecha_baja: true,
        motivo_baja: true
      }
    });

    if (equipo2) {
      console.log('Equipo ID 2:', JSON.stringify(equipo2, null, 2));
    } else {
      console.log('Equipo ID 2 no encontrado');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkEquipos();