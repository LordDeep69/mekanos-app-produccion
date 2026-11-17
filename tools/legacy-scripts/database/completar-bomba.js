/**
 * Completar datos del equipo bomba ID 114 y actualizar órdenes
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const idEquipoBomba = 114;
    const usuario = await prisma.usuarios.findFirst();

    console.log('🔧 Completando equipo BOMBA ID 114...\n');

    // Verificar si ya tiene equipos_bomba
    const bombaExiste = await prisma.equipos_bomba.findUnique({
        where: { id_equipo: idEquipoBomba }
    });

    if (!bombaExiste) {
        console.log('📋 Creando datos específicos de bomba...');
        await prisma.equipos_bomba.create({
            data: {
                id_equipo: idEquipoBomba,
                marca_bomba: 'GRUNDFOS',
                modelo_bomba: 'CR 32-5',
                tipo_bomba: 'CENTRIFUGA',
                caudal_maximo_m3h: 115, // ~500 GPM
                altura_manometrica_maxima_m: 45, // ~150 pies
                diametro_aspiracion: '4 pulgadas',
                diametro_descarga: '3 pulgadas',
                creado_por: usuario.id_usuario,
            }
        });
        console.log('  ✅ Datos de bomba creados');
    } else {
        console.log('  ⚠️ Datos de bomba ya existen');
    }

    // Verificar si ya tiene equipos_motor
    const motorExiste = await prisma.equipos_motor.findUnique({
        where: { id_equipo: idEquipoBomba }
    });

    if (!motorExiste) {
        console.log('📋 Creando datos de motor asociado...');
        await prisma.equipos_motor.create({
            data: {
                id_equipo: idEquipoBomba,
                marca_motor: 'WEG',
                modelo_motor: 'W22 Premium',
                numero_serie_motor: 'WEG-2025-BOM-001',
                potencia_hp: 50,
                potencia_kw: 37.3,
                velocidad_nominal_rpm: 3550,
                tipo_motor: 'ELECTRICO',
                voltaje_operacion_vac: '460V',
                amperaje_nominal: 60,
                frecuencia_hz: 60,
                numero_fases: 'TRIFASICO',
                creado_por: usuario.id_usuario,
            }
        });
        console.log('  ✅ Datos de motor creados');
    } else {
        console.log('  ⚠️ Datos de motor ya existen');
    }

    // Actualizar órdenes BOM_PREV_A
    console.log('\n📋 Actualizando órdenes BOM_PREV_A...');
    const tipoBomPrevA = await prisma.tipos_servicio.findFirst({
        where: { codigo_tipo: 'BOM_PREV_A' }
    });

    if (tipoBomPrevA) {
        const result = await prisma.ordenes_servicio.updateMany({
            where: { id_tipo_servicio: tipoBomPrevA.id_tipo_servicio },
            data: { id_equipo: idEquipoBomba }
        });
        console.log(`  ✅ ${result.count} órdenes actualizadas`);
    }

    // Verificación
    const equipoCompleto = await prisma.equipos.findUnique({
        where: { id_equipo: idEquipoBomba },
        include: {
            equipos_bomba: true,
            equipos_motor: true,
            tipo_equipo: true
        }
    });

    console.log(`\n🎉 EQUIPO BOMBA COMPLETO:`);
    console.log(`  - ID: ${equipoCompleto.id_equipo}`);
    console.log(`  - Nombre: ${equipoCompleto.nombre_equipo}`);
    console.log(`  - Código: ${equipoCompleto.codigo_equipo}`);
    console.log(`  - Tipo: ${equipoCompleto.tipo_equipo?.nombre_tipo}`);
    console.log(`  - Bomba: ${equipoCompleto.equipos_bomba?.marca_bomba || 'N/A'} ${equipoCompleto.equipos_bomba?.modelo_bomba || ''}`);
    console.log(`  - Motor: ${equipoCompleto.equipos_motor?.marca_motor || 'N/A'} ${equipoCompleto.equipos_motor?.potencia_hp || ''}HP`);

    const ordenesConBomba = await prisma.ordenes_servicio.count({
        where: { id_equipo: idEquipoBomba }
    });
    console.log(`\n  📊 Total órdenes con este equipo: ${ordenesConBomba}`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
