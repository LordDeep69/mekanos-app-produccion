/**
 * SEED TESTING MINIMAL - DATOS ESENCIALES FASE 4.6-4.9
 * Crea ÚNICAMENTE datos mínimos necesarios para testing:
 * - 1 cliente test
 * - 1 sede test
 * - 1 equipo test
 * - 6 estados cotización
 * - 1 tipo equipo
 * - 1 usuario test (ya existe)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 SEED TESTING MINIMAL - Iniciando...\n');

  // ========================================
  // PASO 1: ESTADOS COTIZACIÓN (6 estados)
  // ========================================
  console.log('[1/6] Insertando estados cotización...');
  
  const estadosCotizacion = [
    { nombre_estado: 'BORRADOR', codigo_estado: 'BORRADOR', orden_visualizacion: 1, color_hex: '#94A3B8', descripcion: 'Cotización en proceso de elaboración', permite_edicion: true, requiere_aprobacion_interna: false, es_estado_final: false },
    { nombre_estado: 'EN_REVISION', codigo_estado: 'EN_REVISION', orden_visualizacion: 2, color_hex: '#FBBF24', descripcion: 'Esperando aprobación interna', permite_edicion: false, requiere_aprobacion_interna: true, es_estado_final: false },
    { nombre_estado: 'APROBADA_INTERNA', codigo_estado: 'APROBADA_INTERNA', orden_visualizacion: 3, color_hex: '#34D399', descripcion: 'Aprobada internamente, lista para enviar', permite_edicion: false, requiere_aprobacion_interna: false, es_estado_final: false },
    { nombre_estado: 'ENVIADA', codigo_estado: 'ENVIADA', orden_visualizacion: 4, color_hex: '#60A5FA', descripcion: 'Enviada al cliente', permite_edicion: false, requiere_aprobacion_interna: false, es_estado_final: false },
    { nombre_estado: 'APROBADA_CLIENTE', codigo_estado: 'APROBADA_CLIENTE', orden_visualizacion: 5, color_hex: '#10B981', descripcion: 'Aprobada por el cliente', permite_edicion: false, requiere_aprobacion_interna: false, es_estado_final: true },
    { nombre_estado: 'RECHAZADA', codigo_estado: 'RECHAZADA', orden_visualizacion: 6, color_hex: '#EF4444', descripcion: 'Rechazada por el cliente', permite_edicion: false, requiere_aprobacion_interna: false, es_estado_final: true },
  ];

  for (const estado of estadosCotizacion) {
    await prisma.estados_cotizacion.upsert({
      where: { codigo_estado: estado.codigo_estado },
      update: {},
      create: estado,
    });
  }
  console.log('   ✅ 6 estados cotización insertados\n');

  // ========================================
  // PASO 2: TIPO EQUIPO (1 tipo)
  // ========================================
  console.log('[2/6] Insertando tipo equipo...');
  
  await prisma.tipos_equipo.upsert({
    where: { codigo_tipo: 'MOTOR' },
    update: {},
    create: {
      nombre_tipo: 'MOTOR',
      codigo_tipo: 'MOTOR',
      descripcion: 'Motor eléctrico industrial',
      categoria: 'ENERGIA',
      tiene_motor: true,
      requiere_horometro: true,
      formato_ficha_tecnica: 'MOTOR_ELECTRICO',
    },
  });
  console.log('   ✅ Tipo equipo MOTOR insertado\n');

  // ========================================
  // PASO 3: PERSONA (1 persona para cliente)
  // ========================================
  console.log('[3/6] Insertando persona test...');
  
  let persona = await prisma.personas.findFirst({
    where: {
      tipo_identificacion: 'NIT',
      numero_identificacion: '900123456-7',
    },
  });

  if (!persona) {
    persona = await prisma.personas.create({
      data: {
        tipo_persona: 'JURIDICA',
        razon_social: 'Empresa Test S.A.S',
        tipo_identificacion: 'NIT',
        numero_identificacion: '900123456-7',
        telefono_principal: '3001234567',
        email_principal: 'contacto@empresatest.com',
        direccion_principal: 'Calle Test 123',
        ciudad: 'Cartagena',
        departamento: 'Bolívar',
        pais: 'Colombia',
      },
    });
  }
  console.log(`   ✅ Persona test insertada (ID: ${persona.id_persona})\n`);

  // ========================================
  // PASO 4: CLIENTE (1 cliente test)
  // ========================================
  console.log('[4/6] Insertando cliente test...');
  
  const cliente = await prisma.clientes.upsert({
    where: { id_persona: persona.id_persona },
    update: {},
    create: {
      id_persona: persona.id_persona,
      fecha_registro: new Date(),
      estado_cliente: 'ACTIVO',
      tipo_cliente: 'CORPORATIVO',
      requiere_orden_compra: false,
      dias_credito: 30,
    },
  });
  console.log('   ✅ Cliente test insertado (ID: 1)\n');

  // ========================================
  // PASO 5: SEDE CLIENTE (1 sede test)
  // ========================================
  console.log('[5/6] Insertando sede cliente test...');
  
  // Buscar si ya existe sede para este cliente
  let sede = await prisma.sedes_cliente.findFirst({
    where: { 
      id_cliente: cliente.id_cliente,
      nombre_sede: 'Sede Principal',
    },
  });

  if (!sede) {
    sede = await prisma.sedes_cliente.create({
      data: {
        id_cliente: cliente.id_cliente,
        nombre_sede: 'Sede Principal',
        direccion: 'Calle Test 123',
        ciudad: 'Cartagena',
        departamento: 'Bolívar',
        pais: 'Colombia',
        telefono_sede: '3001234567',
        es_sede_principal: true,
      },
    });
  }
  console.log('   ✅ Sede cliente insertada (ID: 1)\n');

  // ========================================
  // PASO 6: EQUIPO (1 equipo motor test)
  // ========================================
  console.log('[6/6] Insertando equipo test...');
  
  // Buscar tipo equipo MOTOR
  const tipoMotor = await prisma.tipos_equipo.findUnique({
    where: { codigo_tipo: 'MOTOR' },
  });

  // Buscar si ya existe equipo con este alias
  let equipo = await prisma.equipos.findUnique({
    where: { alias: 'MOTOR-TEST-001' },
  });

  if (!equipo) {
    equipo = await prisma.equipos.create({
      data: {
        alias: 'MOTOR-TEST-001',
        id_tipo_equipo: tipoMotor!.id_tipo_equipo,
        id_cliente: cliente.id_cliente,
        id_sede: sede.id_sede,
        estado_equipo: 'OPERATIVO',
        fecha_instalacion: new Date('2020-01-15'),
        ubicacion_especifica: 'Sala de máquinas planta 2',
        marca: 'WEG',
        modelo: 'W22',
        numero_serie: 'TEST-SERIE-001',
      },
    });
  }
  console.log('   ✅ Equipo test insertado (ID: 1)\n');

  // ========================================
  // RESUMEN FINAL
  // ========================================
  console.log('════════════════════════════════════════');
  console.log('✅ SEED TESTING COMPLETADO EXITOSAMENTE');
  console.log('════════════════════════════════════════');
  console.log(`📊 Datos insertados:`);
  console.log(`   • Estados cotización: 6`);
  console.log(`   • Tipos equipo: 1`);
  console.log(`   • Personas: 1`);
  console.log(`   • Clientes: 1 (ID: ${cliente.id_cliente})`);
  console.log(`   • Sedes: 1 (ID: ${sede.id_sede})`);
  console.log(`   • Equipos: 1 (ID: ${equipo.id_equipo})`);
  console.log(`\n🎯 Testing FASE 4.6-4.9 ahora DESBLOQUEADO\n`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ ERROR SEED:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
