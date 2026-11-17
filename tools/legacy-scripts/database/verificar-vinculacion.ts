/**
 * Verificación de vinculación Actividades MEDICION ↔ Parámetros
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║    VERIFICACIÓN: VINCULACIÓN ACTIVIDADES ↔ PARÁMETROS       ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    // Verificar actividades de medición con parámetro vinculado
    const actividadesMedicion = await prisma.catalogo_actividades.findMany({
        where: {
            tipo_actividad: 'MEDICION',
            activo: true,
        },
        include: {
            tipos_servicio: { select: { codigo_tipo: true } },
            parametros_medicion: {
                select: {
                    codigo_parametro: true,
                    nombre_parametro: true,
                    unidad_medida: true,
                    valor_minimo_normal: true,
                    valor_maximo_normal: true
                }
            },
        },
        orderBy: [
            { tipos_servicio: { codigo_tipo: 'asc' } },
            { orden_ejecucion: 'asc' }
        ]
    });

    let currentTipo = '';
    let sinParametro = 0;

    for (const act of actividadesMedicion) {
        const tipo = act.tipos_servicio?.codigo_tipo || 'SIN_TIPO';

        if (tipo !== currentTipo) {
            console.log(`\n━━━ ${tipo} ━━━`);
            currentTipo = tipo;
        }

        const param = act.parametros_medicion;
        if (param) {
            const rango = param.valor_minimo_normal !== null && param.valor_maximo_normal !== null
                ? `[${param.valor_minimo_normal}-${param.valor_maximo_normal} ${param.unidad_medida}]`
                : '[Sin rango]';
            console.log(`  ✅ ${act.descripcion_actividad}`);
            console.log(`     → ${param.codigo_parametro} ${rango}`);
        } else {
            console.log(`  ❌ ${act.descripcion_actividad} - SIN PARÁMETRO VINCULADO`);
            sinParametro++;
        }
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log(`RESUMEN:`);
    console.log(`  Total actividades MEDICION: ${actividadesMedicion.length}`);
    console.log(`  Con parámetro vinculado:    ${actividadesMedicion.length - sinParametro}`);
    console.log(`  Sin parámetro:              ${sinParametro}`);
    console.log('═══════════════════════════════════════════════════════════════');

    if (sinParametro === 0) {
        console.log('\n✅ TODAS LAS MEDICIONES TIENEN PARÁMETRO VINCULADO');
        console.log('   La app mobile renderizará correctamente los inputs con validación.\n');
    } else {
        console.log('\n⚠️  HAY MEDICIONES SIN PARÁMETRO - REVISAR\n');
    }

    await prisma.$disconnect();
}

main();
