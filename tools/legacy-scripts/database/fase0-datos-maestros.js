/**
 * FASE 0: PREPARACIÓN DE DATOS MAESTROS
 * Protocolo Zero Trust - Verificación en cada paso
 * 
 * Crea:
 * - 1 Cliente completo (MEKANOS DEMO)
 * - 3 Generadores
 * - 3 Bombas
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Colores para consola
const log = {
    info: (msg) => console.log(`\x1b[36mℹ️  ${msg}\x1b[0m`),
    success: (msg) => console.log(`\x1b[32m✅ ${msg}\x1b[0m`),
    error: (msg) => console.log(`\x1b[31m❌ ${msg}\x1b[0m`),
    warning: (msg) => console.log(`\x1b[33m⚠️  ${msg}\x1b[0m`),
    step: (msg) => console.log(`\n\x1b[35m🔷 ${msg}\x1b[0m`),
    data: (obj) => console.log(JSON.stringify(obj, null, 2))
};

async function main() {
    console.log('\n' + '='.repeat(60));
    console.log('🏗️  FASE 0: PREPARACIÓN DE DATOS MAESTROS');
    console.log('    Protocolo Zero Trust - Verificación completa');
    console.log('='.repeat(60) + '\n');

    try {
        // ============================================================
        // PASO 0.1: CREAR PERSONA PARA EL CLIENTE
        // ============================================================
        log.step('PASO 0.1: Crear Persona para Cliente MEKANOS DEMO');

        // Verificar si ya existe
        let persona = await prisma.personas.findFirst({
            where: {
                OR: [
                    { razon_social: 'MEKANOS DEMO INDUSTRIAL S.A.S.' },
                    { numero_identificacion: '900999888' }
                ]
            }
        });

        if (persona) {
            log.warning(`Persona ya existe con ID: ${persona.id_persona}`);
        } else {
            persona = await prisma.personas.create({
                data: {
                    tipo_persona: 'JURIDICA',
                    tipo_identificacion: 'NIT',
                    numero_identificacion: '900999888',
                    razon_social: 'MEKANOS DEMO INDUSTRIAL S.A.S.',
                    nombre_comercial: 'MEKANOS DEMO',
                    representante_legal: 'Carlos Mendoza López',
                    cedula_representante: '12345678',
                    direccion_principal: 'Zona Industrial Mamonal Km 12, Bodega 45',
                    barrio_zona: 'Mamonal',
                    ciudad: 'Cartagena',
                    departamento: 'Bolívar',
                    pais: 'Colombia',
                    telefono_principal: '+57 315 987 6543',
                    celular: '+57 315 987 6543',
                    email_principal: 'demo@mekanosindustrial.com',
                    es_cliente: true,
                    activo: true,
                    creado_por: 1
                }
            });
            log.success(`Persona creada con ID: ${persona.id_persona}`);
        }

        // Verificar
        const personaVerificada = await prisma.personas.findUnique({
            where: { id_persona: persona.id_persona }
        });
        log.info('Verificación persona:');
        log.data({
            id: personaVerificada.id_persona,
            razon_social: personaVerificada.razon_social,
            nit: personaVerificada.numero_identificacion,
            direccion: personaVerificada.direccion_principal,
            ciudad: personaVerificada.ciudad,
            email: personaVerificada.email_principal,
            representante: personaVerificada.representante_legal
        });

        // ============================================================
        // PASO 0.2: CREAR CLIENTE
        // ============================================================
        log.step('PASO 0.2: Crear Cliente MEKANOS DEMO');

        let cliente = await prisma.clientes.findFirst({
            where: { id_persona: persona.id_persona }
        });

        if (cliente) {
            log.warning(`Cliente ya existe con ID: ${cliente.id_cliente}`);
        } else {
            // codigo_cliente es generado automáticamente por la BD
            cliente = await prisma.clientes.create({
                data: {
                    id_persona: persona.id_persona,
                    tipo_cliente: 'INDUSTRIAL',
                    periodicidad_mantenimiento: 'TRIMESTRAL',
                    cliente_activo: true,
                    tiene_acceso_portal: false,
                    creado_por: 1
                }
            });
            log.success(`Cliente creado con ID: ${cliente.id_cliente}, Código: ${cliente.codigo_cliente}`);
        }

        // Verificar cliente con persona
        const clienteVerificado = await prisma.clientes.findUnique({
            where: { id_cliente: cliente.id_cliente },
            include: { persona: true }
        });
        log.info('Verificación cliente completo:');
        log.data({
            id_cliente: clienteVerificado.id_cliente,
            codigo: clienteVerificado.codigo_cliente,
            tipo: clienteVerificado.tipo_cliente,
            nombre: clienteVerificado.persona?.razon_social,
            nit: clienteVerificado.persona?.numero_documento,
            direccion: clienteVerificado.persona?.direccion_principal,
            ciudad: clienteVerificado.persona?.ciudad,
            email: clienteVerificado.persona?.email_principal,
            contacto: clienteVerificado.persona?.nombre_contacto
        });

        // ============================================================
        // PASO 0.3: CREAR GENERADORES
        // ============================================================
        log.step('PASO 0.3: Crear 3 Generadores');

        const generadoresData = [
            {
                codigo: 'GEN-DEMO-001',
                nombre: 'Generador Caterpillar 3512B',
                serie: 'CAT3512B-2024-001',
                marca: 'Caterpillar',
                modelo: '3512B',
                potencia_kva: 1500,
                motor: 'Cat 3512B',
                alternador: 'SR4B',
                año: 2022
            },
            {
                codigo: 'GEN-DEMO-002',
                nombre: 'Generador Cummins QSK60',
                serie: 'CUMMINS-QSK60-002',
                marca: 'Cummins',
                modelo: 'QSK60',
                potencia_kva: 2000,
                motor: 'QSK60-G23',
                alternador: 'Stamford HCI634J',
                año: 2021
            },
            {
                codigo: 'GEN-DEMO-003',
                nombre: 'Generador Volvo TAD1643GE',
                serie: 'VOLVO-TAD1643-003',
                marca: 'Volvo Penta',
                modelo: 'TAD1643GE',
                potencia_kva: 500,
                motor: 'TAD1643GE',
                alternador: 'Mecc Alte ECO40',
                año: 2023
            }
        ];

        for (const genData of generadoresData) {
            // Verificar si ya existe
            let equipo = await prisma.equipos.findFirst({
                where: { codigo_equipo: genData.codigo }
            });

            if (equipo) {
                log.warning(`Equipo ${genData.codigo} ya existe con ID: ${equipo.id_equipo}`);
            } else {
                // Crear equipo base
                equipo = await prisma.equipos.create({
                    data: {
                        codigo_equipo: genData.codigo,
                        nombre_equipo: genData.nombre,
                        numero_serie_equipo: genData.serie,
                        id_cliente: cliente.id_cliente,
                        id_tipo_equipo: 1, // GENERADOR
                        ubicacion_texto: 'Planta Principal - Sala de Máquinas',
                        ubicacion_detallada: 'Zona Industrial Mamonal',
                        estado_equipo: 'OPERATIVO',
                        criticidad: 'ALTA',
                        horas_actuales: Math.floor(Math.random() * 5000) + 500,
                        creado_por: 1
                    }
                });

                // Crear detalle de generador (solo campos requeridos)
                await prisma.equipos_generador.create({
                    data: {
                        id_equipo: equipo.id_equipo,
                        marca_generador: genData.marca,
                        modelo_generador: genData.modelo,
                        potencia_kva: genData.potencia_kva,
                        voltaje_salida: '480V',
                        frecuencia_hz: 60,
                        marca_motor: genData.marca,
                        modelo_motor: genData.motor,
                        marca_alternador: genData.alternador.split(' ')[0],
                        modelo_alternador: genData.alternador,
                        a_o_fabricacion: genData.año,
                        creado_por: 1
                    }
                });

                log.success(`Generador ${genData.codigo} creado con ID: ${equipo.id_equipo}`);
            }
        }

        // Verificar generadores
        const generadores = await prisma.equipos.findMany({
            where: {
                codigo_equipo: { startsWith: 'GEN-DEMO' }
            },
            include: { equipos_generador: true }
        });
        log.info(`Generadores encontrados: ${generadores.length}`);
        generadores.forEach(g => {
            const det = g.equipos_generador?.[0];
            log.data({
                id: g.id_equipo,
                codigo: g.codigo_equipo,
                nombre: g.nombre_equipo,
                serie: g.numero_serie_equipo,
                marca: det?.marca_generador || 'N/A',
                modelo: det?.modelo_generador || 'N/A',
                potencia: det?.potencia_kva ? `${det.potencia_kva} KVA` : 'N/A',
                horas: g.horas_actuales
            });
        });

        // ============================================================
        // PASO 0.4: CREAR BOMBAS
        // ============================================================
        log.step('PASO 0.4: Crear 3 Bombas');

        const bombasData = [
            {
                codigo: 'BOM-DEMO-001',
                nombre: 'Bomba Grundfos CR 95-2',
                serie: 'GRUNDFOS-CR95-001',
                marca: 'Grundfos',
                modelo: 'CR 95-2',
                tipo: 'CENTRIFUGA',
                potencia_hp: 25,
                caudal: 95,
                presion: 45
            },
            {
                codigo: 'BOM-DEMO-002',
                nombre: 'Bomba Flygt NP 3153',
                serie: 'FLYGT-NP3153-002',
                marca: 'Flygt',
                modelo: 'NP 3153',
                tipo: 'SUMERGIBLE',
                potencia_hp: 15,
                caudal: 150,
                presion: 25
            },
            {
                codigo: 'BOM-DEMO-003',
                nombre: 'Bomba Pedrollo F32',
                serie: 'PEDROLLO-F32-003',
                marca: 'Pedrollo',
                modelo: 'F32/200C',
                tipo: 'CENTRIFUGA',
                potencia_hp: 10,
                caudal: 200,
                presion: 32
            }
        ];

        for (const bombaData of bombasData) {
            let equipo = await prisma.equipos.findFirst({
                where: { codigo_equipo: bombaData.codigo }
            });

            if (equipo) {
                log.warning(`Equipo ${bombaData.codigo} ya existe con ID: ${equipo.id_equipo}`);
            } else {
                equipo = await prisma.equipos.create({
                    data: {
                        codigo_equipo: bombaData.codigo,
                        nombre_equipo: bombaData.nombre,
                        numero_serie_equipo: bombaData.serie,
                        id_cliente: cliente.id_cliente,
                        id_tipo_equipo: 2, // BOMBA
                        ubicacion_texto: 'Cuarto de Bombas - Nivel Sótano',
                        ubicacion_detallada: 'Zona Industrial Mamonal',
                        estado_equipo: 'OPERATIVO',
                        criticidad: 'ALTA',
                        horas_actuales: Math.floor(Math.random() * 3000) + 200,
                        creado_por: 1
                    }
                });

                // Crear detalle de bomba (solo campos disponibles)
                await prisma.equipos_bomba.create({
                    data: {
                        id_equipo: equipo.id_equipo,
                        marca_bomba: bombaData.marca,
                        modelo_bomba: bombaData.modelo,
                        tipo_bomba: bombaData.tipo,
                        caudal_maximo_m3h: bombaData.caudal,
                        altura_presion_trabajo_m: bombaData.presion,
                        potencia_hidraulica_kw: bombaData.potencia_hp * 0.746,
                        creado_por: 1
                    }
                });

                log.success(`Bomba ${bombaData.codigo} creada con ID: ${equipo.id_equipo}`);
            }
        }

        // Verificar bombas
        const bombas = await prisma.equipos.findMany({
            where: {
                codigo_equipo: { startsWith: 'BOM-DEMO' }
            },
            include: { equipos_bomba: true }
        });
        log.info(`Bombas encontradas: ${bombas.length}`);
        bombas.forEach(b => {
            const det = b.equipos_bomba?.[0];
            log.data({
                id: b.id_equipo,
                codigo: b.codigo_equipo,
                nombre: b.nombre_equipo,
                serie: b.numero_serie_equipo,
                marca: det?.marca_bomba || 'N/A',
                modelo: det?.modelo_bomba || 'N/A',
                tipo: det?.tipo_bomba || 'N/A',
                potencia: det?.potencia_hp ? `${det.potencia_hp} HP` : 'N/A',
                horas: b.horas_actuales
            });
        });

        // ============================================================
        // RESUMEN FINAL
        // ============================================================
        console.log('\n' + '='.repeat(60));
        log.success('FASE 0 COMPLETADA - RESUMEN');
        console.log('='.repeat(60));

        const resumen = {
            cliente: {
                id: cliente.id_cliente,
                codigo: clienteVerificado.codigo_cliente,
                nombre: clienteVerificado.persona?.razon_social
            },
            generadores: generadores.map(g => ({
                id: g.id_equipo,
                codigo: g.codigo_equipo
            })),
            bombas: bombas.map(b => ({
                id: b.id_equipo,
                codigo: b.codigo_equipo
            }))
        };

        console.log('\n📊 DATOS CREADOS:');
        log.data(resumen);

        console.log('\n✅ FASE 0 EXITOSA - Datos listos para Fase 1');
        console.log('='.repeat(60) + '\n');

    } catch (error) {
        log.error(`Error en Fase 0: ${error.message}`);
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
