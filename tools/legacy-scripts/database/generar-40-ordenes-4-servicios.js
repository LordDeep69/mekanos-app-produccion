/**
 * Script ROBUSTO para generar 40 órdenes de prueba (10 por cada servicio core):
 * - 10 GEN_PREV_A (Generador Preventivo Tipo A)
 * - 10 GEN_PREV_B (Generador Preventivo Tipo B)
 * - 10 BOM_PREV_A (Bomba Preventivo Tipo A)
 * - 10 GEN_CORR o BOM_CORR (Correctivo)
 * 
 * VERIFICACIONES PREVIAS:
 * 1. Cliente con estructura completa (Personas → Usuarios → Clientes)
 * 2. Empleado admin@mekanos.com verificado
 * 3. Equipos con tablas derivadas (equipos_motor, equipos_generador/equipos_bomba)
 * 4. Tipos de servicio existentes
 * 5. Estados de orden existentes
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Colores para consola
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
};

const log = {
    success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
    warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
    error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
    info: (msg) => console.log(`${colors.cyan}ℹ️  ${msg}${colors.reset}`),
    header: (msg) => console.log(`\n${colors.magenta}═══ ${msg} ═══${colors.reset}`)
};

async function main() {
    console.log('\n🚀 SCRIPT DE GENERACIÓN DE 40 ÓRDENES DE PRUEBA');
    console.log('═'.repeat(60));

    // ═══════════════════════════════════════════════════════════════
    // FASE 1: VERIFICACIÓN DEL EMPLEADO/TÉCNICO
    // ═══════════════════════════════════════════════════════════════
    log.header('FASE 1: VERIFICACIÓN DEL EMPLEADO admin@mekanos.com');

    const usuario = await prisma.usuarios.findFirst({
        where: { email: 'admin@mekanos.com' },
        include: { persona: true }
    });

    if (!usuario) {
        log.error('No se encontró usuario admin@mekanos.com');
        process.exit(1);
    }

    log.success(`Usuario encontrado: ID ${usuario.id_usuario} - ${usuario.email}`);
    log.info(`  Persona ID: ${usuario.id_persona}`);
    log.info(`  Nombre: ${usuario.persona?.nombre_completo || usuario.persona?.primer_nombre || 'N/A'}`);

    // Verificar si tiene registro de empleado
    let empleado = await prisma.empleados.findFirst({
        where: { id_persona: usuario.id_persona }
    });

    if (!empleado) {
        log.warning('El usuario no tiene registro de empleado. Creando...');
        empleado = await prisma.empleados.create({
            data: {
                id_persona: usuario.id_persona,
                cargo: 'TECNICO',
                fecha_ingreso: new Date(),
                es_tecnico: true,
                contacto_emergencia: 'N/A',
                telefono_emergencia: '0000000000',
                creado_por: usuario.id_usuario,
                empleado_activo: true
            }
        });
        log.success(`Empleado creado con ID: ${empleado.id_empleado}`);
    } else {
        log.success(`Empleado existente: ID ${empleado.id_empleado}`);
    }

    const tecnicoId = empleado.id_empleado;

    // ═══════════════════════════════════════════════════════════════
    // FASE 2: VERIFICACIÓN/CREACIÓN DE CLIENTE COMPLETO
    // ═══════════════════════════════════════════════════════════════
    log.header('FASE 2: VERIFICACIÓN DE CLIENTE CON ESTRUCTURA COMPLETA');

    let cliente = await prisma.clientes.findFirst({
        include: {
            persona: true,
            sedes: true
        }
    });

    if (!cliente) {
        log.warning('No existe ningún cliente. Creando estructura completa...');

        // Crear persona para cliente
        const personaCliente = await prisma.personas.create({
            data: {
                tipo_identificacion: 'NIT',
                numero_identificacion: '900123456-1',
                tipo_persona: 'JURIDICA',
                razon_social: 'EMPRESA DE PRUEBAS S.A.S.',
                nombre_comercial: 'PRUEBAS MEKANOS',
                email_principal: 'cliente.pruebas@ejemplo.com',
                telefono_principal: '3001234567',
                direccion_principal: 'Calle 123 # 45-67',
                ciudad: 'CARTAGENA',
                departamento: 'BOLÍVAR',
                es_cliente: true,
                activo: true,
                creado_por: usuario.id_usuario
            }
        });
        log.success(`Persona cliente creada: ID ${personaCliente.id_persona}`);

        // Crear cliente
        cliente = await prisma.clientes.create({
            data: {
                id_persona: personaCliente.id_persona,
                tipo_cliente: 'COMERCIAL',
                fecha_inicio_servicio: new Date(),
                cliente_activo: true,
                creado_por: usuario.id_usuario
            },
            include: {
                persona: true,
                sedes: true
            }
        });
        log.success(`Cliente creado: ID ${cliente.id_cliente}`);

        // Crear sede
        const sede = await prisma.sedes_cliente.create({
            data: {
                id_cliente: cliente.id_cliente,
                nombre_sede: 'SEDE PRINCIPAL',
                direccion_sede: 'Calle 123 # 45-67, Bodega 1',
                ciudad_sede: 'CARTAGENA',
                departamento_sede: 'BOLÍVAR',
                zona_geografica: 'URBANA',
                activo: true,
                creado_por: usuario.id_usuario
            }
        });
        log.success(`Sede creada: ID ${sede.id_sede}`);

        // Refetch cliente con sede
        cliente = await prisma.clientes.findUnique({
            where: { id_cliente: cliente.id_cliente },
            include: { persona: true, sedes: true }
        });
    } else {
        log.success(`Cliente existente: ID ${cliente.id_cliente} - ${cliente.persona?.razon_social || cliente.persona?.nombre_completo}`);

        // Verificar que tenga sede
        if (cliente.sedes.length === 0) {
            log.warning('Cliente sin sedes. Creando sede principal...');
            await prisma.sedes_cliente.create({
                data: {
                    id_cliente: cliente.id_cliente,
                    nombre_sede: 'SEDE PRINCIPAL',
                    direccion_sede: cliente.persona.direccion_principal || 'Dirección pendiente',
                    ciudad_sede: 'CARTAGENA',
                    creado_por: usuario.id_usuario
                }
            });
            cliente = await prisma.clientes.findUnique({
                where: { id_cliente: cliente.id_cliente },
                include: { persona: true, sedes: true }
            });
        }
    }

    log.info(`  Sedes disponibles: ${cliente.sedes.length}`);

    // ═══════════════════════════════════════════════════════════════
    // FASE 3: VERIFICACIÓN DE TIPOS DE EQUIPO
    // ═══════════════════════════════════════════════════════════════
    log.header('FASE 3: VERIFICACIÓN DE TIPOS DE EQUIPO');

    const tipoGenerador = await prisma.tipos_equipo.findFirst({
        where: { codigo_tipo: 'GEN' }
    });
    const tipoBomba = await prisma.tipos_equipo.findFirst({
        where: { codigo_tipo: 'BOM' }
    });

    if (!tipoGenerador) {
        log.error('No existe tipo de equipo GEN (Generador)');
        process.exit(1);
    }
    if (!tipoBomba) {
        log.error('No existe tipo de equipo BOM (Bomba)');
        process.exit(1);
    }

    log.success(`Tipo Generador: ID ${tipoGenerador.id_tipo_equipo}`);
    log.success(`Tipo Bomba: ID ${tipoBomba.id_tipo_equipo}`);

    // ═══════════════════════════════════════════════════════════════
    // FASE 4: VERIFICACIÓN/CREACIÓN DE EQUIPOS COMPLETOS
    // ═══════════════════════════════════════════════════════════════
    log.header('FASE 4: VERIFICACIÓN DE EQUIPOS CON TABLAS DERIVADAS');

    const sedeId = cliente.sedes[0]?.id_sede || null;

    // === EQUIPO GENERADOR ===
    let equipoGenerador = await prisma.equipos.findFirst({
        where: { id_tipo_equipo: tipoGenerador.id_tipo_equipo },
        include: {
            equipos_motor: true,
            equipos_generador: true
        }
    });

    if (!equipoGenerador) {
        log.warning('No existe equipo generador. Creando estructura completa...');

        const timestamp = Date.now().toString().slice(-6);
        equipoGenerador = await prisma.equipos.create({
            data: {
                codigo_equipo: `GEN-TEST-${timestamp}`,
                id_cliente: cliente.id_cliente,
                id_sede: sedeId,
                id_tipo_equipo: tipoGenerador.id_tipo_equipo,
                nombre_equipo: 'Generador de Pruebas',
                ubicacion_texto: 'Planta Principal - Área de Generación',
                estado_equipo: 'OPERATIVO',
                criticidad: 'ALTA',
                activo: true,
                creado_por: usuario.id_usuario
            },
            include: {
                equipos_motor: true,
                equipos_generador: true
            }
        });
        log.success(`Equipo generador creado: ID ${equipoGenerador.id_equipo}`);
    } else {
        log.success(`Equipo generador existente: ID ${equipoGenerador.id_equipo} - ${equipoGenerador.nombre_equipo || equipoGenerador.codigo_equipo}`);
    }

    // Verificar/crear equipos_motor
    if (!equipoGenerador.equipos_motor) {
        log.warning('  Equipo sin registro de motor. Creando...');
        await prisma.equipos_motor.create({
            data: {
                id_equipo: equipoGenerador.id_equipo,
                tipo_motor: 'COMBUSTION',
                marca_motor: 'CUMMINS',
                modelo_motor: 'QSK60-G23',
                potencia_hp: 2000,
                potencia_kw: 1500,
                velocidad_nominal_rpm: 1800,
                tipo_combustible: 'DIESEL',
                numero_cilindros: 16,
                tiene_turbocargador: true,
                tipo_arranque: 'ELECTRICO',
                voltaje_arranque_vdc: 24,
                numero_baterias: 4,
                capacidad_aceite_litros: 150,
                tipo_aceite: '15W-40',
                capacidad_refrigerante_litros: 200,
                creado_por: usuario.id_usuario
            }
        });
        log.success('  Motor creado');
    } else {
        log.success('  Motor existente ✓');
    }

    // Verificar/crear equipos_generador
    if (!equipoGenerador.equipos_generador) {
        log.warning('  Equipo sin registro de generador. Creando...');
        await prisma.equipos_generador.create({
            data: {
                id_equipo: equipoGenerador.id_equipo,
                marca_generador: 'STAMFORD',
                modelo_generador: 'HCI634H',
                potencia_kw: 1500,
                potencia_kva: 1875,
                factor_potencia: 0.8,
                voltaje_salida: '480V',
                numero_fases: 3,
                frecuencia_hz: 60,
                tiene_avr: true,
                marca_avr: 'STAMFORD',
                tiene_modulo_control: true,
                marca_modulo_control: 'DEEP SEA',
                modelo_modulo_control: 'DSE7320',
                tiene_arranque_automatico: true,
                capacidad_tanque_principal_litros: 1000,
                creado_por: usuario.id_usuario
            }
        });
        log.success('  Generador creado');
    } else {
        log.success('  Generador existente ✓');
    }

    // === EQUIPO BOMBA ===
    let equipoBomba = await prisma.equipos.findFirst({
        where: { id_tipo_equipo: tipoBomba.id_tipo_equipo },
        include: {
            equipos_motor: true,
            equipos_bomba: true
        }
    });

    if (!equipoBomba) {
        log.warning('No existe equipo bomba. Creando estructura completa...');

        const timestamp = Date.now().toString().slice(-6);
        equipoBomba = await prisma.equipos.create({
            data: {
                codigo_equipo: `BOM-TEST-${timestamp}`,
                id_cliente: cliente.id_cliente,
                id_sede: sedeId,
                id_tipo_equipo: tipoBomba.id_tipo_equipo,
                nombre_equipo: 'Bomba de Pruebas',
                ubicacion_texto: 'Cuarto de Bombas - Sistema Contra Incendio',
                estado_equipo: 'OPERATIVO',
                criticidad: 'CRITICA',
                activo: true,
                creado_por: usuario.id_usuario
            },
            include: {
                equipos_motor: true,
                equipos_bomba: true
            }
        });
        log.success(`Equipo bomba creado: ID ${equipoBomba.id_equipo}`);
    } else {
        log.success(`Equipo bomba existente: ID ${equipoBomba.id_equipo} - ${equipoBomba.nombre_equipo || equipoBomba.codigo_equipo}`);
    }

    // Verificar/crear equipos_motor para bomba
    if (!equipoBomba.equipos_motor) {
        log.warning('  Bomba sin registro de motor. Creando...');
        await prisma.equipos_motor.create({
            data: {
                id_equipo: equipoBomba.id_equipo,
                tipo_motor: 'COMBUSTION',
                marca_motor: 'JOHN DEERE',
                modelo_motor: '6068HF485',
                potencia_hp: 250,
                potencia_kw: 186,
                velocidad_nominal_rpm: 2100,
                tipo_combustible: 'DIESEL',
                numero_cilindros: 6,
                tiene_turbocargador: true,
                tipo_arranque: 'ELECTRICO',
                voltaje_arranque_vdc: 24,
                numero_baterias: 2,
                capacidad_aceite_litros: 25,
                tipo_aceite: '15W-40',
                capacidad_refrigerante_litros: 35,
                creado_por: usuario.id_usuario
            }
        });
        log.success('  Motor bomba creado');
    } else {
        log.success('  Motor bomba existente ✓');
    }

    // Verificar/crear equipos_bomba
    if (!equipoBomba.equipos_bomba) {
        log.warning('  Equipo sin registro de bomba. Creando...');
        await prisma.equipos_bomba.create({
            data: {
                id_equipo: equipoBomba.id_equipo,
                marca_bomba: 'PEERLESS',
                modelo_bomba: '8AEF12',
                tipo_bomba: 'CENTRIFUGA_HORIZONTAL',
                aplicacion: 'CONTRA_INCENDIO',
                capacidad_gpm: 1500,
                presion_psi: 150,
                velocidad_rpm: 2100,
                diametro_succion_pulg: 8,
                diametro_descarga_pulg: 6,
                tiene_valvula_alivio: true,
                tipo_sello: 'EMPAQUE',
                creado_por: usuario.id_usuario
            }
        });
        log.success('  Bomba creada');
    } else {
        log.success('  Bomba existente ✓');
    }

    // ═══════════════════════════════════════════════════════════════
    // FASE 5: VERIFICACIÓN DE TIPOS DE SERVICIO
    // ═══════════════════════════════════════════════════════════════
    log.header('FASE 5: VERIFICACIÓN DE TIPOS DE SERVICIO');

    const tiposServicio = await prisma.tipos_servicio.findMany({
        where: {
            codigo_tipo: { in: ['GEN_PREV_A', 'GEN_PREV_B', 'BOM_PREV_A', 'GEN_CORR', 'BOM_CORR'] }
        }
    });

    const tipoMap = {};
    for (const tipo of tiposServicio) {
        tipoMap[tipo.codigo_tipo] = tipo;
        log.success(`${tipo.codigo_tipo}: ID ${tipo.id_tipo_servicio} - ${tipo.nombre}`);
    }

    // Definir los 4 servicios a usar
    const serviciosCore = [];

    if (tipoMap['GEN_PREV_A']) serviciosCore.push({ tipo: tipoMap['GEN_PREV_A'], equipo: equipoGenerador, prefijo: 'GENA' });
    if (tipoMap['GEN_PREV_B']) serviciosCore.push({ tipo: tipoMap['GEN_PREV_B'], equipo: equipoGenerador, prefijo: 'GENB' });
    if (tipoMap['BOM_PREV_A']) serviciosCore.push({ tipo: tipoMap['BOM_PREV_A'], equipo: equipoBomba, prefijo: 'BOMA' });

    // Agregar correctivo (preferir GEN_CORR, si no BOM_CORR)
    if (tipoMap['GEN_CORR']) {
        serviciosCore.push({ tipo: tipoMap['GEN_CORR'], equipo: equipoGenerador, prefijo: 'GCORR' });
    } else if (tipoMap['BOM_CORR']) {
        serviciosCore.push({ tipo: tipoMap['BOM_CORR'], equipo: equipoBomba, prefijo: 'BCORR' });
    }

    if (serviciosCore.length < 4) {
        log.warning(`Solo se encontraron ${serviciosCore.length} tipos de servicio de 4 esperados`);
        // Si faltan, reutilizar los existentes
        while (serviciosCore.length < 4 && tiposServicio.length > 0) {
            const tipoExtra = tiposServicio.find(t => !serviciosCore.some(s => s.tipo.id_tipo_servicio === t.id_tipo_servicio));
            if (tipoExtra) {
                const esGenerador = tipoExtra.codigo_tipo.startsWith('GEN');
                serviciosCore.push({
                    tipo: tipoExtra,
                    equipo: esGenerador ? equipoGenerador : equipoBomba,
                    prefijo: tipoExtra.codigo_tipo.substring(0, 4).toUpperCase()
                });
            } else {
                break;
            }
        }
    }

    log.info(`Servicios core configurados: ${serviciosCore.map(s => s.tipo.codigo_tipo).join(', ')}`);

    // ═══════════════════════════════════════════════════════════════
    // FASE 6: VERIFICACIÓN DE ESTADOS DE ORDEN
    // ═══════════════════════════════════════════════════════════════
    log.header('FASE 6: VERIFICACIÓN DE ESTADOS DE ORDEN');

    const estados = await prisma.estados_orden.findMany();
    log.info(`Estados disponibles: ${estados.map(e => e.codigo_estado).join(', ')}`);

    const estadoAsignada = estados.find(e => e.codigo_estado === 'ASIGNADA');
    const estadoPendiente = estados.find(e => e.codigo_estado === 'PENDIENTE');
    const estadoEnProceso = estados.find(e => e.codigo_estado === 'EN_PROCESO');
    const estadoParaUsar = estadoAsignada || estadoPendiente || estados[0];

    if (!estadoParaUsar) {
        log.error('No se encontró ningún estado de orden válido');
        process.exit(1);
    }

    log.success(`Estado a usar: ${estadoParaUsar.codigo_estado} (ID ${estadoParaUsar.id_estado})`);

    // ═══════════════════════════════════════════════════════════════
    // FASE 7: GENERACIÓN DE 40 ÓRDENES
    // ═══════════════════════════════════════════════════════════════
    log.header('FASE 7: GENERACIÓN DE 40 ÓRDENES DE SERVICIO');

    const timestamp = Date.now().toString().slice(-6);
    const prioridades = ['NORMAL', 'ALTA', 'URGENTE'];
    let totalCreadas = 0;

    for (const servicio of serviciosCore) {
        console.log(`\n📋 Creando 10 órdenes ${servicio.tipo.codigo_tipo}...`);

        for (let i = 1; i <= 10; i++) {
            const fechaProg = new Date();
            fechaProg.setDate(fechaProg.getDate() + Math.floor(Math.random() * 30));

            const numeroOrden = `${servicio.prefijo}-${timestamp}-${String(totalCreadas + i).padStart(3, '0')}`;

            try {
                await prisma.ordenes_servicio.create({
                    data: {
                        numero_orden: numeroOrden,
                        id_cliente: cliente.id_cliente,
                        id_equipo: servicio.equipo.id_equipo,
                        id_tecnico_asignado: tecnicoId,
                        id_tipo_servicio: servicio.tipo.id_tipo_servicio,
                        id_estado_actual: estadoParaUsar.id_estado,
                        prioridad: prioridades[(i - 1) % prioridades.length],
                        fecha_programada: fechaProg,
                        descripcion_inicial: `${servicio.tipo.nombre} - Orden de prueba #${i}`,
                        creado_por: usuario.id_usuario
                    }
                });
                process.stdout.write(`  ✅ ${i}/10 `);
            } catch (err) {
                log.error(`Error creando orden ${numeroOrden}: ${err.message}`);
            }
        }
        console.log('');
        totalCreadas += 10;
    }

    // ═══════════════════════════════════════════════════════════════
    // FASE 8: RESUMEN FINAL
    // ═══════════════════════════════════════════════════════════════
    log.header('FASE 8: RESUMEN FINAL');

    const resumen = await prisma.ordenes_servicio.groupBy({
        by: ['id_tipo_servicio'],
        _count: true
    });

    console.log('\n📊 Órdenes por tipo de servicio:');
    for (const r of resumen) {
        const tipo = await prisma.tipos_servicio.findUnique({
            where: { id_tipo_servicio: r.id_tipo_servicio }
        });
        console.log(`   ${tipo?.codigo_tipo || 'N/A'}: ${r._count} órdenes`);
    }

    const totalOrdenes = await prisma.ordenes_servicio.count();
    console.log(`\n🎉 TOTAL DE ÓRDENES EN BASE DE DATOS: ${totalOrdenes}`);

    log.success(`Se crearon ${totalCreadas} órdenes nuevas exitosamente`);
}

main()
    .catch((e) => {
        log.error(`Error fatal: ${e.message}`);
        console.error(e);
    })
    .finally(() => prisma.$disconnect());
