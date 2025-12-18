/**
 * FASE 0B: COMPLETAR DETALLES TÉCNICOS
 * Agrega equipos_generador y equipos_bomba a equipos existentes
 * Protocolo Zero Trust
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
    console.log('🔧 FASE 0B: COMPLETAR DETALLES TÉCNICOS');
    console.log('='.repeat(60) + '\n');

    try {
        // ============================================================
        // PASO 1: DETALLES DE GENERADORES
        // ============================================================
        log.step('PASO 1: Completar detalles de Generadores');

        // Solo campos disponibles según schema Prisma
        const generadoresData = [
            {
                id_equipo: 108,
                marca_generador: 'Caterpillar',
                modelo_generador: '3512B',
                potencia_kva: 1500,
                potencia_kw: 1200,
                voltaje_salida: '480V/277V',
                frecuencia_hz: 60,
                numero_fases: 3,
                factor_potencia: 0.8,
                amperaje_nominal_salida: 1804,
                configuracion_salida: 'Y/Δ',
                tiene_avr: true,
                marca_avr: 'Caterpillar',
                tiene_modulo_control: true,
                marca_modulo_control: 'EMCP 4.2',
                tiene_arranque_automatico: true,
                capacidad_tanque_principal_litros: 750,
                clase_aislamiento: 'H',
                grado_proteccion_ip: 'IP23',
                a_o_fabricacion: 2022
            },
            {
                id_equipo: 109,
                marca_generador: 'Cummins',
                modelo_generador: 'QSK60-G23',
                potencia_kva: 2000,
                potencia_kw: 1600,
                voltaje_salida: '480V/277V',
                frecuencia_hz: 60,
                numero_fases: 3,
                factor_potencia: 0.8,
                amperaje_nominal_salida: 2406,
                configuracion_salida: 'Y/Δ',
                tiene_avr: true,
                marca_avr: 'Stamford',
                tiene_modulo_control: true,
                marca_modulo_control: 'PowerCommand 3.3',
                tiene_arranque_automatico: true,
                capacidad_tanque_principal_litros: 1000,
                clase_aislamiento: 'H',
                grado_proteccion_ip: 'IP23',
                a_o_fabricacion: 2021
            },
            {
                id_equipo: 110,
                marca_generador: 'Volvo Penta',
                modelo_generador: 'TAD1643GE',
                potencia_kva: 500,
                potencia_kw: 400,
                voltaje_salida: '480V/277V',
                frecuencia_hz: 60,
                numero_fases: 3,
                factor_potencia: 0.8,
                amperaje_nominal_salida: 601,
                configuracion_salida: 'Y/Δ',
                tiene_avr: true,
                marca_avr: 'Mecc Alte',
                tiene_modulo_control: true,
                marca_modulo_control: 'ComAp InteliGen',
                tiene_arranque_automatico: true,
                capacidad_tanque_principal_litros: 250,
                clase_aislamiento: 'H',
                grado_proteccion_ip: 'IP23',
                a_o_fabricacion: 2023
            }
        ];

        for (const gen of generadoresData) {
            // Verificar si ya tiene detalle
            const detalleExistente = await prisma.equipos_generador.findFirst({
                where: { id_equipo: gen.id_equipo }
            });

            if (detalleExistente) {
                log.warning(`Generador ${gen.id_equipo} ya tiene detalle técnico`);
            } else {
                await prisma.equipos_generador.create({
                    data: {
                        id_equipo: gen.id_equipo,
                        marca_generador: gen.marca_generador,
                        modelo_generador: gen.modelo_generador,
                        potencia_kva: gen.potencia_kva,
                        potencia_kw: gen.potencia_kw,
                        voltaje_salida: gen.voltaje_salida,
                        frecuencia_hz: gen.frecuencia_hz,
                        numero_fases: gen.numero_fases,
                        factor_potencia: gen.factor_potencia,
                        amperaje_nominal_salida: gen.amperaje_nominal_salida,
                        configuracion_salida: gen.configuracion_salida,
                        tiene_avr: gen.tiene_avr,
                        marca_avr: gen.marca_avr,
                        tiene_modulo_control: gen.tiene_modulo_control,
                        marca_modulo_control: gen.marca_modulo_control,
                        tiene_arranque_automatico: gen.tiene_arranque_automatico,
                        capacidad_tanque_principal_litros: gen.capacidad_tanque_principal_litros,
                        clase_aislamiento: gen.clase_aislamiento,
                        grado_proteccion_ip: gen.grado_proteccion_ip,
                        a_o_fabricacion: gen.a_o_fabricacion,
                        creado_por: 1
                    }
                });
                log.success(`Detalle generador ${gen.id_equipo} creado`);
            }
        }

        // Verificar
        const generadores = await prisma.equipos_generador.findMany({
            where: { id_equipo: { in: [108, 109, 110] } }
        });
        log.info(`Detalles de generadores: ${generadores.length}`);
        generadores.forEach(g => {
            log.data({
                id_equipo: g.id_equipo,
                marca: g.marca_generador,
                modelo: g.modelo_generador,
                potencia_kva: g.potencia_kva
            });
        });

        // ============================================================
        // PASO 2: DETALLES DE BOMBAS
        // ============================================================
        log.step('PASO 2: Completar detalles de Bombas');

        const bombasData = [
            {
                id_equipo: 111,
                marca_bomba: 'Grundfos',
                modelo_bomba: 'CR 95-2',
                tipo_bomba: 'CENTRIFUGA',
                caudal_maximo_m3h: 95,
                altura_presion_trabajo_m: 45,
                potencia_hidraulica_kw: 18.65
            },
            {
                id_equipo: 112,
                marca_bomba: 'Flygt',
                modelo_bomba: 'NP 3153',
                tipo_bomba: 'SUMERGIBLE',
                caudal_maximo_m3h: 150,
                altura_presion_trabajo_m: 25,
                potencia_hidraulica_kw: 11.19
            },
            {
                id_equipo: 113,
                marca_bomba: 'Pedrollo',
                modelo_bomba: 'F32/200C',
                tipo_bomba: 'CENTRIFUGA',
                caudal_maximo_m3h: 200,
                altura_presion_trabajo_m: 32,
                potencia_hidraulica_kw: 7.46
            }
        ];

        for (const bom of bombasData) {
            const detalleExistente = await prisma.equipos_bomba.findFirst({
                where: { id_equipo: bom.id_equipo }
            });

            if (detalleExistente) {
                log.warning(`Bomba ${bom.id_equipo} ya tiene detalle técnico`);
            } else {
                await prisma.equipos_bomba.create({
                    data: {
                        id_equipo: bom.id_equipo,
                        marca_bomba: bom.marca_bomba,
                        modelo_bomba: bom.modelo_bomba,
                        tipo_bomba: bom.tipo_bomba,
                        caudal_maximo_m3h: bom.caudal_maximo_m3h,
                        altura_presion_trabajo_m: bom.altura_presion_trabajo_m,
                        potencia_hidraulica_kw: bom.potencia_hidraulica_kw,
                        creado_por: 1
                    }
                });
                log.success(`Detalle bomba ${bom.id_equipo} creado`);
            }
        }

        // Verificar
        const bombas = await prisma.equipos_bomba.findMany({
            where: { id_equipo: { in: [111, 112, 113] } }
        });
        log.info(`Detalles de bombas: ${bombas.length}`);
        bombas.forEach(b => {
            log.data({
                id_equipo: b.id_equipo,
                marca: b.marca_bomba,
                modelo: b.modelo_bomba,
                tipo: b.tipo_bomba
            });
        });

        // ============================================================
        // RESUMEN FINAL
        // ============================================================
        console.log('\n' + '='.repeat(60));
        log.success('FASE 0B COMPLETADA');
        console.log('='.repeat(60));

        // Verificación completa final
        log.step('VERIFICACIÓN FINAL - Zero Trust');

        const equiposCompletos = await prisma.equipos.findMany({
            where: { codigo_equipo: { startsWith: 'GEN-DEMO' } },
            include: {
                equipos_generador: true,
                cliente: { include: { persona: true } }
            }
        });

        log.info('GENERADORES CON DATOS COMPLETOS:');
        equiposCompletos.forEach(e => {
            const det = e.equipos_generador?.[0];
            const cli = e.cliente?.persona?.razon_social;
            console.log(`  [${e.id_equipo}] ${e.codigo_equipo}`);
            console.log(`      Cliente: ${cli}`);
            console.log(`      Equipo: ${e.nombre_equipo} - Serie: ${e.numero_serie_equipo}`);
            console.log(`      Detalle: ${det ? `${det.marca_generador} ${det.modelo_generador} ${det.potencia_kva}KVA` : '❌ SIN DETALLE'}`);
        });

        const bombasCompletas = await prisma.equipos.findMany({
            where: { codigo_equipo: { startsWith: 'BOM-DEMO' } },
            include: {
                equipos_bomba: true,
                cliente: { include: { persona: true } }
            }
        });

        log.info('\nBOMBAS CON DATOS COMPLETOS:');
        bombasCompletas.forEach(e => {
            const det = e.equipos_bomba?.[0];
            const cli = e.cliente?.persona?.razon_social;
            console.log(`  [${e.id_equipo}] ${e.codigo_equipo}`);
            console.log(`      Cliente: ${cli}`);
            console.log(`      Equipo: ${e.nombre_equipo} - Serie: ${e.numero_serie_equipo}`);
            console.log(`      Detalle: ${det ? `${det.marca_bomba} ${det.modelo_bomba} ${det.tipo_bomba}` : '❌ SIN DETALLE'}`);
        });

        console.log('\n✅ FASE 0 + 0B COMPLETAS - Datos 100% listos');
        console.log('='.repeat(60) + '\n');

    } catch (error) {
        log.error(`Error: ${error.message}`);
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
