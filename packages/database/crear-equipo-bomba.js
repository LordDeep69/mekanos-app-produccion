/**
 * Script para crear equipo BOMBA real con todas sus tablas relacionadas
 * y actualizar las órdenes BOM_PREV_A para apuntar a este equipo.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🔧 Creando equipo BOMBA real...\n');

    // 1. Obtener tipo de equipo BOMBA
    const tipoBomba = await prisma.tipos_equipo.findFirst({
        where: { codigo_tipo: 'BOM' }
    });

    if (!tipoBomba) {
        throw new Error('No existe tipo de equipo BOM. Verificar catálogo.');
    }
    console.log(`✅ Tipo equipo: ${tipoBomba.nombre_tipo} (ID: ${tipoBomba.id_tipo_equipo})`);

    // 2. Obtener cliente y usuario
    const cliente = await prisma.clientes.findFirst({
        include: { persona: true }
    });
    const usuario = await prisma.usuarios.findFirst();

    console.log(`✅ Cliente: ${cliente.persona?.razon_social || 'N/A'}`);
    console.log(`✅ Usuario: ${usuario.email}`);

    // 3. Verificar si ya existe un equipo bomba
    const equipoBombaExistente = await prisma.equipos.findFirst({
        where: {
            tipo_equipo: { codigo_tipo: 'BOM' },
            activo: true
        }
    });

    let idEquipoBomba;

    if (equipoBombaExistente) {
        console.log(`\n⚠️ Ya existe equipo Bomba: ${equipoBombaExistente.nombre_equipo} (ID: ${equipoBombaExistente.id_equipo})`);
        idEquipoBomba = equipoBombaExistente.id_equipo;
    } else {
        // 4. Crear equipo base
        console.log('\n📋 Creando equipo base...');
        const equipoBase = await prisma.equipos.create({
            data: {
                codigo_equipo: 'BOM-TEST-001',
                id_cliente: cliente.id_cliente,
                id_tipo_equipo: tipoBomba.id_tipo_equipo,
                nombre_equipo: 'BOMBA CONTRA INCENDIO TEST',
                numero_serie_equipo: 'SN-BOM-2025-001',
                ubicacion_texto: 'Cuarto de bombas - Edificio Principal',
                estado_equipo: 'OPERATIVO',
                criticidad: 'ALTA',
                criticidad_justificacion: 'Equipo esencial para protección contra incendios',
                fecha_instalacion: new Date('2024-01-15'),
                fecha_inicio_servicio_mekanos: new Date('2024-02-01'),
                activo: true,
                creado_por: usuario.id_usuario,
            }
        });
        console.log(`  ✅ Equipo base creado: ID ${equipoBase.id_equipo}`);
        idEquipoBomba = equipoBase.id_equipo;

        // 5. Crear registro en equipos_bomba
        console.log('📋 Creando datos específicos de bomba...');
        await prisma.equipos_bomba.create({
            data: {
                id_equipo: idEquipoBomba,
                marca_bomba: 'GRUNDFOS',
                modelo_bomba: 'CR 32-5',
                tipo_bomba: 'CENTRIFUGA_HORIZONTAL',
                capacidad_gpm: 500,
                altura_pies: 150,
                tipo_impulsor: 'CERRADO',
                material_impulsor: 'ACERO_INOXIDABLE',
                diametro_succion_pulg: 4,
                diametro_descarga_pulg: 3,
                presion_operacion_psi: 125,
                presion_prueba_psi: 200,
                temperatura_max_f: 180,
                creado_por: usuario.id_usuario,
            }
        });
        console.log('  ✅ Datos de bomba creados');

        // 6. Crear registro en equipos_motor
        console.log('📋 Creando datos de motor asociado...');
        await prisma.equipos_motor.create({
            data: {
                id_equipo: idEquipoBomba,
                marca_motor: 'WEG',
                modelo_motor: 'W22 Premium',
                numero_serie_motor: 'WEG-2025-BOM-001',
                potencia_hp: 50,
                voltaje: 460,
                amperaje_nominal: 60,
                rpm_nominal: 3550,
                tipo_motor: 'ELECTRICO',
                fases: 3,
                frecuencia_hz: 60,
                factor_potencia: 0.87,
                eficiencia_porcentaje: 94.5,
                clase_aislamiento: 'F',
                grado_proteccion_ip: 55,
                creado_por: usuario.id_usuario,
            }
        });
        console.log('  ✅ Datos de motor creados');
    }

    // 7. Actualizar órdenes BOM_PREV_A para apuntar al equipo bomba real
    console.log('\n📋 Actualizando órdenes BOM_PREV_A...');

    const tipoBomPrevA = await prisma.tipos_servicio.findFirst({
        where: { codigo_tipo: 'BOM_PREV_A' }
    });

    if (tipoBomPrevA) {
        const result = await prisma.ordenes_servicio.updateMany({
            where: {
                id_tipo_servicio: tipoBomPrevA.id_tipo_servicio
            },
            data: {
                id_equipo: idEquipoBomba
            }
        });
        console.log(`  ✅ ${result.count} órdenes actualizadas para usar equipo Bomba real`);
    }

    // 8. Verificación final
    console.log('\n📊 VERIFICACIÓN FINAL:');
    const ordenesConBomba = await prisma.ordenes_servicio.count({
        where: { id_equipo: idEquipoBomba }
    });
    console.log(`  Órdenes con equipo Bomba ID ${idEquipoBomba}: ${ordenesConBomba}`);

    const equipoCompleto = await prisma.equipos.findUnique({
        where: { id_equipo: idEquipoBomba },
        include: {
            equipos_bomba: true,
            equipos_motor: true,
            tipo_equipo: true
        }
    });

    console.log(`\n🎉 EQUIPO BOMBA COMPLETO:`);
    console.log(`  - Nombre: ${equipoCompleto.nombre_equipo}`);
    console.log(`  - Código: ${equipoCompleto.codigo_equipo}`);
    console.log(`  - Tipo: ${equipoCompleto.tipo_equipo?.nombre_tipo}`);
    console.log(`  - Bomba: ${equipoCompleto.equipos_bomba?.marca_bomba} ${equipoCompleto.equipos_bomba?.modelo_bomba}`);
    console.log(`  - Motor: ${equipoCompleto.equipos_motor?.marca_motor} ${equipoCompleto.equipos_motor?.potencia_hp}HP`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
