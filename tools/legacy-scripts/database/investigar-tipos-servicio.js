/**
 * Script de investigación exhaustiva de tipos de servicio
 * Para encontrar por qué no existe el tipo CORRECTIVO
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('\n🔍 INVESTIGACIÓN EXHAUSTIVA DE TIPOS DE SERVICIO');
    console.log('═'.repeat(60));

    // 1. Listar TODOS los tipos de servicio
    console.log('\n📋 TODOS los tipos de servicio en la BD:');
    const todosLosTipos = await prisma.tipos_servicio.findMany({
        orderBy: { id_tipo_servicio: 'asc' }
    });

    console.log(`\nTotal encontrados: ${todosLosTipos.length}\n`);

    for (const tipo of todosLosTipos) {
        console.log(`ID: ${tipo.id_tipo_servicio}`);
        console.log(`  Código: ${tipo.codigo_tipo}`);
        console.log(`  Nombre: ${tipo.nombre}`);
        console.log(`  Categoría: ${tipo.categoria_servicio}`);
        console.log(`  Activo: ${tipo.activo}`);
        console.log(`  Tipo Equipo ID: ${tipo.id_tipo_equipo}`);
        console.log('');
    }

    // 2. Buscar cualquier tipo que contenga "CORR" en su código
    console.log('\n🔎 Buscando tipos con "CORR" en el código:');
    const tiposCorr = todosLosTipos.filter(t =>
        t.codigo_tipo?.toUpperCase().includes('CORR')
    );

    if (tiposCorr.length === 0) {
        console.log('❌ NO SE ENCONTRARON tipos con "CORR" en el código');
    } else {
        for (const tipo of tiposCorr) {
            console.log(`✅ ${tipo.codigo_tipo}: ${tipo.nombre}`);
        }
    }

    // 3. Buscar cualquier tipo que contenga "CORRECTIVO" en el nombre
    console.log('\n🔎 Buscando tipos con "CORRECTIVO" en el nombre:');
    const tiposCorrectivo = todosLosTipos.filter(t =>
        t.nombre?.toUpperCase().includes('CORRECTIVO')
    );

    if (tiposCorrectivo.length === 0) {
        console.log('❌ NO SE ENCONTRARON tipos con "CORRECTIVO" en el nombre');
    } else {
        for (const tipo of tiposCorrectivo) {
            console.log(`✅ ${tipo.codigo_tipo}: ${tipo.nombre}`);
        }
    }

    // 4. Verificar categorías de servicio disponibles
    console.log('\n📊 Categorías de servicio únicas:');
    const categorias = [...new Set(todosLosTipos.map(t => t.categoria_servicio))];
    categorias.forEach(cat => console.log(`  - ${cat}`));

    // 5. Verificar tipos de equipo
    console.log('\n🔧 Tipos de equipo asociados:');
    const tiposEquipo = await prisma.tipos_equipo.findMany();
    for (const te of tiposEquipo) {
        console.log(`  ID ${te.id_tipo_equipo}: ${te.codigo_tipo} - ${te.nombre_tipo}`);
    }

    // 6. Verificar estructura del schema para tipos_servicio
    console.log('\n📐 Verificando si existe enum categoria_servicio_enum...');

    // Conclusión
    console.log('\n' + '═'.repeat(60));
    console.log('📋 CONCLUSIÓN:');

    if (tiposCorr.length === 0 && tiposCorrectivo.length === 0) {
        console.log('\n⚠️  NO EXISTE ningún tipo de servicio CORRECTIVO en la BD');
        console.log('    Esto indica que los datos semilla no incluyeron correctivos.');
        console.log('\n💡 SOLUCIÓN: Crear tipos de servicio correctivo para GEN y BOM');
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
