/**
 * SEEDS DATOS DEMO - CLIENTES Y EMPLEADOS
 *
 * Autor: GitHub Copilot
 * Fecha: 14 Nov 2025
 * Propósito: Datos mínimos para testing Cotizaciones
 *
 * Ejecución: node seed-clientes-demo.js
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seeds datos demo...\n');

  // ============================================
  // 1. PERSONAS BASE
  // ============================================
  console.log('📋 Creando personas...');

  await prisma.personas.upsert({
    where: { id_persona: 1 },
    update: {},
    create: {
      id_persona: 1,
      tipo_identificacion: 'NIT',
      numero_identificacion: '900123456-1',
      tipo_persona: 'JURIDICA',
      razon_social: 'HOTEL CARIBE S.A.S.',
      telefono_principal: '3001234567',
      email_principal: 'gerencia@hotelcaribe.com',
      activo: true,
      es_cliente: true,
    },
  });

  await prisma.personas.upsert({
    where: { id_persona: 2 },
    update: {},
    create: {
      id_persona: 2,
      tipo_identificacion: 'NIT',
      numero_identificacion: '800987654-3',
      tipo_persona: 'JURIDICA',
      razon_social: 'CLINICA BOCAGRANDE LTDA',
      telefono_principal: '3109876543',
      email_principal: 'admin@clinicabocagrande.com',
      activo: true,
      es_cliente: true,
    },
  });

  await prisma.personas.upsert({
    where: { id_persona: 3 },
    update: {},
    create: {
      id_persona: 3,
      tipo_identificacion: 'CC',
      numero_identificacion: '1234567890',
      tipo_persona: 'NATURAL',
      primer_nombre: 'Juan',
      segundo_nombre: 'Carlos',
      primer_apellido: 'Pérez',
      segundo_apellido: 'Gómez',
      telefono_principal: '3201234567',
      email_principal: 'juan.perez@mekanos.com',
      activo: true,
      es_empleado: true,
    },
  });

  await prisma.personas.upsert({
    where: { id_persona: 4 },
    update: {},
    create: {
      id_persona: 4,
      tipo_identificacion: 'CC',
      numero_identificacion: '9876543210',
      tipo_persona: 'NATURAL',
      primer_nombre: 'Carlos',
      segundo_nombre: 'Alberto',
      primer_apellido: 'López',
      segundo_apellido: 'Torres',
      telefono_principal: '3109876543',
      email_principal: 'carlos.lopez@mekanos.com',
      activo: true,
      es_empleado: true,
    },
  });

  console.log('✅ Personas creadas (4)');

  // ============================================
  // 2. CLIENTES
  // ============================================
  console.log('📋 Creando clientes...');

  await prisma.clientes.upsert({
    where: { id_cliente: 1 },
    update: {},
    create: {
      id_cliente: 1,
      id_persona: 1,
      codigo_cliente: 'CLI-001',
      tipo_cliente: 'HOTELERO',
      tiene_credito: true,
      dias_credito: 30,
      limite_credito: 50000000,
      descuento_autorizado: 5,
      cliente_activo: true,
      creado_por: 1,
    },
  });

  await prisma.clientes.upsert({
    where: { id_cliente: 2 },
    update: {},
    create: {
      id_cliente: 2,
      id_persona: 2,
      codigo_cliente: 'CLI-002',
      tipo_cliente: 'HOSPITALARIO',
      tiene_credito: true,
      dias_credito: 60,
      limite_credito: 100000000,
      descuento_autorizado: 10,
      cliente_activo: true,
      creado_por: 1,
    },
  });

  console.log('✅ Clientes creados (2)');

  // ============================================
  // 3. SEDES CLIENTES
  // ============================================
  console.log('📋 Creando sedes...');

  await prisma.sedes_cliente.upsert({
    where: { id_sede: 1 },
    update: {},
    create: {
      id_sede: 1,
      id_cliente: 1,
      nombre_sede: 'Sede Principal - Hotel Caribe',
      direccion_sede: 'Carrera 1 # 2-87, Bocagrande',
      ciudad_sede: 'Cartagena',
      departamento_sede: 'Bolívar',
      telefono_sede: '6651234',
      activo: true,
      creado_por: 1,
    },
  });

  await prisma.sedes_cliente.upsert({
    where: { id_sede: 2 },
    update: {},
    create: {
      id_sede: 2,
      id_cliente: 2,
      nombre_sede: 'Clínica Bocagrande - Torre A',
      direccion_sede: 'Avenida San Martín # 7-123',
      ciudad_sede: 'Cartagena',
      departamento_sede: 'Bolívar',
      telefono_sede: '6659876',
      activo: true,
      creado_por: 1,
    },
  });

  console.log('✅ Sedes creadas (2)');

  // ============================================
  // 4. EMPLEADOS
  // ============================================
  console.log('📋 Creando empleados...');

  await prisma.empleados.upsert({
    where: { id_empleado: 1 },
    update: {},
    create: {
      id_empleado: 1,
      id_persona: 3,
      codigo_empleado: 'MEK-001',
      cargo: 'ASESOR_COMERCIAL',
      tipo_contrato: 'INDEFINIDO',
      fecha_ingreso: new Date('2020-01-15'),
      contacto_emergencia: 'Familiar MEKANOS',
      telefono_emergencia: '3000000001',
      es_asesor: true,
      empleado_activo: true,
      creado_por: 1,
    },
  });

  await prisma.empleados.upsert({
    where: { id_empleado: 2 },
    update: {},
    create: {
      id_empleado: 2,
      id_persona: 4,
      codigo_empleado: 'MEK-002',
      cargo: 'TECNICO_SENIOR',
      tipo_contrato: 'INDEFINIDO',
      fecha_ingreso: new Date('2019-06-01'),
      contacto_emergencia: 'Familiar MEKANOS',
      telefono_emergencia: '3000000002',
      es_tecnico: true,
      empleado_activo: true,
      creado_por: 1,
    },
  });

  console.log('✅ Empleados creados (2)');

  // ============================================
  // 5. TIPOS EQUIPO
  // ============================================
  console.log('📋 Creando tipos equipo...');

  await prisma.tipos_equipo.upsert({
    where: { id_tipo_equipo: 1 },
    update: {},
    create: {
      id_tipo_equipo: 1,
      codigo_tipo: 'GEN',
      nombre_tipo: 'GENERADOR_ELECTRICO',
      categoria: 'ENERGIA',
      formato_ficha_tecnica: 'GEN_FICHA',
      tiene_motor: true,
      tiene_generador: true,
    },
  });

  await prisma.tipos_equipo.upsert({
    where: { id_tipo_equipo: 2 },
    update: {},
    create: {
      id_tipo_equipo: 2,
      codigo_tipo: 'BOMBA',
      nombre_tipo: 'MOTOBOMBA',
      categoria: 'HIDRAULICA',
      formato_ficha_tecnica: 'BOMBA_FICHA',
      tiene_bomba: true,
    },
  });

  console.log('✅ Tipos equipo creados (2)');

  // ============================================
  // 6. EQUIPOS
  // ============================================
  console.log('📋 Creando equipos...');

  await prisma.equipos.upsert({
    where: { id_equipo: 1 },
    update: {},
    create: {
      id_equipo: 1,
      id_cliente: 1,
      id_sede: 1,
      id_tipo_equipo: 1,
      codigo_equipo: 'GEN-HC-001',
      nombre_equipo: 'Generador CATERPILLAR C18 500kVA',
      numero_serie_equipo: 'CAT12345XYZ',
      ubicacion_texto: 'Cuarto máquinas sótano 1',
      estado_equipo: 'OPERATIVO',
      activo: true,
      creado_por: 1,
    },
  });

  await prisma.equipos.upsert({
    where: { id_equipo: 2 },
    update: {},
    create: {
      id_equipo: 2,
      id_cliente: 2,
      id_sede: 2,
      id_tipo_equipo: 2,
      codigo_equipo: 'BMB-CB-001',
      nombre_equipo: 'Motobomba FLOWSERVE D-3000',
      numero_serie_equipo: 'FLS98765ABC',
      ubicacion_texto: 'Tanque principal agua',
      estado_equipo: 'OPERATIVO',
      activo: true,
      creado_por: 1,
    },
  });

  console.log('✅ Equipos creados (2)');

  // ============================================
  // 7. ESTADOS COTIZACIÓN
  // ============================================
  console.log('📋 Creando estados cotización...');

  const estados = [
    { id: 1, nombre: 'BORRADOR', color: '#9CA3AF', edicion: true, aprobacion: false },
    { id: 2, nombre: 'ENVIADA', color: '#3B82F6', edicion: false, aprobacion: true },
    { id: 3, nombre: 'APROBADA', color: '#10B981', edicion: false, aprobacion: false },
    { id: 4, nombre: 'RECHAZADA', color: '#EF4444', edicion: false, aprobacion: false },
    { id: 5, nombre: 'VENCIDA', color: '#F59E0B', edicion: false, aprobacion: false },
    { id: 6, nombre: 'CONVERTIDA_OS', color: '#8B5CF6', edicion: false, aprobacion: false },
  ];

  for (const estado of estados) {
    await prisma.estados_cotizacion.upsert({
      where: { id_estado: estado.id },
      update: {},
      create: {
        id_estado: estado.id,
        codigo_estado: estado.nombre,
        nombre_estado: estado.nombre,
        color_hex: estado.color,
        permite_edicion: estado.edicion,
        requiere_aprobacion_interna: estado.aprobacion,
        orden_visualizacion: estado.id,
      },
    });
  }

  console.log('✅ Estados cotización creados (6)');

  // ============================================
  // VERIFICACIÓN
  // ============================================
  console.log('\n📊 VERIFICACIÓN SEEDS:\n');

  const counts = {
    clientes: await prisma.clientes.count(),
    empleados: await prisma.empleados.count(),
    equipos: await prisma.equipos.count(),
    estados: await prisma.estados_cotizacion.count(),
  };

  console.log(`Clientes: ${counts.clientes}`);
  console.log(`Empleados: ${counts.empleados}`);
  console.log(`Equipos: ${counts.equipos}`);
  console.log(`Estados Cotización: ${counts.estados}`);

  console.log('\n✅ Seeds completados exitosamente!');
}

main()
  .catch((e) => {
    console.error('\n❌ Error ejecutando seeds:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
