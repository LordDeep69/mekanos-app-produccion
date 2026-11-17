const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Ver todos los parámetros de medición
    const params = await prisma.parametros_medicion.findMany({
        select: {
            id_parametro_medicion: true,
            codigo_parametro: true,
            nombre_parametro: true,
            unidad_medida: true
        }
    });

    console.log('=== TODOS LOS PARÁMETROS DE MEDICIÓN ===');
    params.forEach(p => {
        console.log(`${p.codigo_parametro}: ${p.nombre_parametro} (${p.unidad_medida})`);
    });

    // Ver actividades de tipo MEDICION para Bombas
    const actBombas = await prisma.actividades_mantenimiento.findMany({
        where: {
            tipos_servicio: { codigo_tipo: 'BOM_PREV_A' },
            tipo_actividad: 'MEDICION'
        },
        select: {
            descripcion_actividad: true,
            id_parametro_medicion: true,
            parametros_medicion: {
                select: { codigo_parametro: true, nombre_parametro: true }
            }
        }
    });

    console.log('\n=== ACTIVIDADES TIPO MEDICION (BOMBAS) ===');
    actBombas.forEach(a => {
        console.log(`${a.descripcion_actividad} -> ${a.parametros_medicion?.codigo_parametro || 'SIN PARAMETRO'}`);
    });
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
