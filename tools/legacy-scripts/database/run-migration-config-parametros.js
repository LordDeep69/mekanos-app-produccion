/**
 * Script para ejecutar migración de config_parametros
 * Fecha: 2026-01-06
 * 
 * Ejecutar con: node run-migration-config-parametros.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Iniciando migración: config_parametros_equipos');
    console.log('='.repeat(60));

    try {
        // PASO 1: Crear tabla plantillas_parametros
        console.log('[1/5] Creando tabla plantillas_parametros...');
        try {
            await prisma.$executeRawUnsafe(`
                CREATE TABLE IF NOT EXISTS plantillas_parametros (
                    id_plantilla           SERIAL PRIMARY KEY,
                    codigo_plantilla       VARCHAR(50) UNIQUE NOT NULL,
                    nombre                 VARCHAR(100) NOT NULL,
                    descripcion            TEXT,
                    marca                  VARCHAR(50),
                    modelo                 VARCHAR(50),
                    id_tipo_equipo         INTEGER REFERENCES tipos_equipo(id_tipo_equipo) ON DELETE SET NULL,
                    configuracion          JSONB NOT NULL DEFAULT '{}',
                    activo                 BOOLEAN DEFAULT TRUE,
                    creado_por             INTEGER REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
                    fecha_creacion         TIMESTAMP DEFAULT NOW(),
                    modificado_por         INTEGER REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
                    fecha_modificacion     TIMESTAMP
                )
            `);
            console.log('    ✅ Tabla creada');
        } catch (err) {
            if (err.message.includes('already exists')) {
                console.log('    ⚠️ Ya existe');
            } else {
                throw err;
            }
        }

        // PASO 2: Agregar columna config_parametros a equipos
        console.log('[2/5] Agregando columna config_parametros a equipos...');
        try {
            await prisma.$executeRawUnsafe(`
                ALTER TABLE equipos 
                ADD COLUMN IF NOT EXISTS config_parametros JSONB DEFAULT '{}'
            `);
            console.log('    ✅ Columna agregada');
        } catch (err) {
            if (err.message.includes('already exists') || err.message.includes('duplicate column')) {
                console.log('    ⚠️ Ya existe');
            } else {
                throw err;
            }
        }

        // PASO 3: Agregar columna id_plantilla_parametros a equipos
        console.log('[3/5] Agregando columna id_plantilla_parametros a equipos...');
        try {
            await prisma.$executeRawUnsafe(`
                ALTER TABLE equipos 
                ADD COLUMN IF NOT EXISTS id_plantilla_parametros INTEGER REFERENCES plantillas_parametros(id_plantilla) ON DELETE SET NULL
            `);
            console.log('    ✅ Columna agregada');
        } catch (err) {
            if (err.message.includes('already exists') || err.message.includes('duplicate column')) {
                console.log('    ⚠️ Ya existe');
            } else {
                throw err;
            }
        }

        // PASO 4: Crear índices
        console.log('[4/5] Creando índices...');
        try {
            await prisma.$executeRawUnsafe(`
                CREATE INDEX IF NOT EXISTS idx_equipos_config_parametros 
                ON equipos USING GIN (config_parametros)
            `);
            console.log('    ✅ Índice GIN creado');
        } catch (err) {
            console.log('    ⚠️ Índice ya existe o error:', err.message.substring(0, 50));
        }

        try {
            await prisma.$executeRawUnsafe(`
                CREATE INDEX IF NOT EXISTS idx_equipos_plantilla_parametros 
                ON equipos (id_plantilla_parametros) 
                WHERE id_plantilla_parametros IS NOT NULL
            `);
            console.log('    ✅ Índice FK creado');
        } catch (err) {
            console.log('    ⚠️ Índice ya existe');
        }

        // PASO 5: Verificación
        console.log('[5/5] Verificando migración...');

        const columnas = await prisma.$queryRaw`
            SELECT column_name, data_type, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'equipos' 
              AND column_name IN ('config_parametros', 'id_plantilla_parametros')
        `;

        console.log('');
        console.log('='.repeat(60));
        console.log('📊 Resultado de verificación:');
        console.log('');
        console.log('Columnas en tabla equipos:');
        for (const col of columnas) {
            console.log(`   ✅ ${col.column_name}: ${col.data_type}`);
        }

        // Verificar tabla plantillas
        const tablaPlantillas = await prisma.$queryRaw`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'plantillas_parametros'
            ) as existe
        `;

        console.log(`   ✅ Tabla plantillas_parametros: ${tablaPlantillas[0].existe ? 'Existe' : 'NO EXISTE'}`);

        // Contar equipos
        const countEquipos = await prisma.equipos.count();
        console.log(`   📊 Total equipos en BD: ${countEquipos}`);

        console.log('');
        console.log('✅ MIGRACIÓN COMPLETADA EXITOSAMENTE!');
        console.log('');
        console.log('📋 Próximos pasos:');
        console.log('   1. Ejecutar: npx prisma db pull');
        console.log('   2. Ejecutar: npx prisma generate');

    } catch (error) {
        console.error('');
        console.error('❌ Error en migración:', error.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
