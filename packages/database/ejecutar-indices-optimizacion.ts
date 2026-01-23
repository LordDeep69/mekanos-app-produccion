/**
 * Script para ejecutar índices de optimización en Supabase
 * Ejecutar con: npx ts-node ejecutar-indices-optimizacion.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function crearIndices() {
    console.log('🚀 Iniciando creación de índices de optimización...\n');

    const indices = [
        {
            nombre: 'idx_ordenes_estado_fecha',
            sql: `CREATE INDEX IF NOT EXISTS idx_ordenes_estado_fecha ON ordenes_servicio(id_estado_actual, fecha_programada DESC NULLS LAST)`,
        },
        {
            nombre: 'idx_ordenes_tecnico_estado',
            sql: `CREATE INDEX IF NOT EXISTS idx_ordenes_tecnico_estado ON ordenes_servicio(id_tecnico_asignado, id_estado_actual) WHERE id_tecnico_asignado IS NOT NULL`,
        },
        {
            nombre: 'idx_ordenes_cliente_estado',
            sql: `CREATE INDEX IF NOT EXISTS idx_ordenes_cliente_estado ON ordenes_servicio(id_cliente, id_estado_actual)`,
        },
        {
            nombre: 'idx_ordenes_fecha_creacion',
            sql: `CREATE INDEX IF NOT EXISTS idx_ordenes_fecha_creacion ON ordenes_servicio(fecha_creacion DESC)`,
        },
        {
            nombre: 'idx_ordenes_tipo_estado',
            sql: `CREATE INDEX IF NOT EXISTS idx_ordenes_tipo_estado ON ordenes_servicio(id_tipo_servicio, id_estado_actual) WHERE id_tipo_servicio IS NOT NULL`,
        },
        {
            nombre: 'idx_ordenes_prioridad_estado',
            sql: `CREATE INDEX IF NOT EXISTS idx_ordenes_prioridad_estado ON ordenes_servicio(prioridad, id_estado_actual)`,
        },
        {
            nombre: 'idx_clientes_activo',
            sql: `CREATE INDEX IF NOT EXISTS idx_clientes_activo ON clientes(cliente_activo) WHERE cliente_activo = true`,
        },
        {
            nombre: 'idx_equipos_cliente',
            sql: `CREATE INDEX IF NOT EXISTS idx_equipos_cliente ON equipos(id_cliente)`,
        },
        {
            nombre: 'idx_equipos_cliente_sede',
            sql: `CREATE INDEX IF NOT EXISTS idx_equipos_cliente_sede ON equipos(id_cliente, id_sede) WHERE id_sede IS NOT NULL`,
        },
        {
            nombre: 'idx_personas_nombre_comercial',
            sql: `CREATE INDEX IF NOT EXISTS idx_personas_nombre_comercial ON personas(nombre_comercial) WHERE nombre_comercial IS NOT NULL`,
        },
        {
            nombre: 'idx_personas_identificacion',
            sql: `CREATE INDEX IF NOT EXISTS idx_personas_identificacion ON personas(numero_identificacion)`,
        },
        {
            nombre: 'idx_ordenes_fecha_fin',
            sql: `CREATE INDEX IF NOT EXISTS idx_ordenes_fecha_fin ON ordenes_servicio(fecha_fin_real) WHERE fecha_fin_real IS NOT NULL`,
        },
    ];

    let exitosos = 0;
    let fallidos = 0;

    for (const indice of indices) {
        try {
            console.log(`📌 Creando índice: ${indice.nombre}...`);
            await prisma.$executeRawUnsafe(indice.sql);
            console.log(`   ✅ ${indice.nombre} creado exitosamente`);
            exitosos++;
        } catch (error: any) {
            if (error.message?.includes('already exists')) {
                console.log(`   ⚠️ ${indice.nombre} ya existe (OK)`);
                exitosos++;
            } else {
                console.error(`   ❌ Error en ${indice.nombre}:`, error.message);
                fallidos++;
            }
        }
    }

    // Actualizar estadísticas
    console.log('\n📊 Actualizando estadísticas de tablas...');
    try {
        await prisma.$executeRawUnsafe('ANALYZE ordenes_servicio');
        await prisma.$executeRawUnsafe('ANALYZE clientes');
        await prisma.$executeRawUnsafe('ANALYZE equipos');
        await prisma.$executeRawUnsafe('ANALYZE personas');
        console.log('   ✅ Estadísticas actualizadas');
    } catch (error: any) {
        console.error('   ⚠️ Error actualizando estadísticas:', error.message);
    }

    // Verificar índices creados
    console.log('\n📋 Verificando índices creados...');
    const indicesCreados = await prisma.$queryRaw<Array<{ indexname: string; tablename: string }>>`
    SELECT indexname, tablename
    FROM pg_indexes 
    WHERE tablename IN ('ordenes_servicio', 'clientes', 'equipos', 'personas')
    AND indexname LIKE 'idx_%'
    ORDER BY tablename, indexname
  `;

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📊 ÍNDICES DE OPTIMIZACIÓN EN LA BASE DE DATOS:');
    console.log('═══════════════════════════════════════════════════════════');
    for (const idx of indicesCreados) {
        console.log(`   📌 ${idx.tablename}.${idx.indexname}`);
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log(`✅ RESUMEN: ${exitosos} exitosos, ${fallidos} fallidos`);
    console.log('═══════════════════════════════════════════════════════════\n');

    await prisma.$disconnect();
}

crearIndices()
    .then(() => {
        console.log('🎉 Script completado exitosamente');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Error fatal:', error);
        process.exit(1);
    });
