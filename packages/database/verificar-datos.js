/**
 * Verificación completa de datos - Zero Trust
 */
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
    console.log('\n=== VERIFICACIÓN ZERO TRUST - DATOS FASE 0 ===\n');

    // Cliente
    const cliente = await p.clientes.findUnique({
        where: { id_cliente: 13 },
        include: { persona: true }
    });
    console.log('📋 CLIENTE:');
    console.log(`  ID: ${cliente.id_cliente}`);
    console.log(`  Código: ${cliente.codigo_cliente}`);
    console.log(`  Nombre: ${cliente.persona?.razon_social}`);
    console.log(`  NIT: ${cliente.persona?.numero_identificacion}`);
    console.log(`  Dirección: ${cliente.persona?.direccion_principal}`);
    console.log(`  Email: ${cliente.persona?.email_principal}`);

    // Generadores
    console.log('\n⚡ GENERADORES:');
    const generadores = await p.equipos_generador.findMany({
        where: { id_equipo: { in: [108, 109, 110] } }
    });

    for (const g of generadores) {
        const equipo = await p.equipos.findUnique({ where: { id_equipo: g.id_equipo } });
        console.log(`  [${g.id_equipo}] ${equipo?.codigo_equipo}`);
        console.log(`      Equipo: ${equipo?.nombre_equipo}`);
        console.log(`      Serie: ${equipo?.numero_serie_equipo}`);
        console.log(`      Marca: ${g.marca_generador} | Modelo: ${g.modelo_generador}`);
        console.log(`      Potencia: ${g.potencia_kva} KVA / ${g.potencia_kw} KW`);
        console.log(`      Voltaje: ${g.voltaje_salida} | Frecuencia: ${g.frecuencia_hz} Hz`);
        console.log(`      AVR: ${g.tiene_avr ? g.marca_avr : 'N/A'}`);
        console.log(`      Módulo Control: ${g.tiene_modulo_control ? g.marca_modulo_control : 'N/A'}`);
        console.log(`      Tanque: ${g.capacidad_tanque_principal_litros} L`);
        console.log('');
    }

    // Bombas
    console.log('💧 BOMBAS:');
    const bombas = await p.equipos_bomba.findMany({
        where: { id_equipo: { in: [111, 112, 113] } }
    });

    for (const b of bombas) {
        const equipo = await p.equipos.findUnique({ where: { id_equipo: b.id_equipo } });
        console.log(`  [${b.id_equipo}] ${equipo?.codigo_equipo}`);
        console.log(`      Equipo: ${equipo?.nombre_equipo}`);
        console.log(`      Serie: ${equipo?.numero_serie_equipo}`);
        console.log(`      Marca: ${b.marca_bomba} | Modelo: ${b.modelo_bomba}`);
        console.log(`      Tipo: ${b.tipo_bomba}`);
        console.log(`      Caudal: ${b.caudal_maximo_m3h} m³/h`);
        console.log(`      Altura: ${b.altura_presion_trabajo_m} m`);
        console.log(`      Potencia: ${b.potencia_hidraulica_kw} kW`);
        console.log('');
    }

    // Resumen
    console.log('='.repeat(50));
    console.log('✅ RESUMEN FASE 0:');
    console.log(`  - 1 Cliente completo (ID: 13)`);
    console.log(`  - ${generadores.length} Generadores con detalles técnicos`);
    console.log(`  - ${bombas.length} Bombas con detalles técnicos`);
    console.log('='.repeat(50));

    await p.$disconnect();
}

main().catch(console.error);
