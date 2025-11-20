import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * Seed Database - Usuario Admin para Testing
 * ✅ FASE 1: Crear usuario admin@mekanos.com
 */
async function main() {
  console.log('🌱 Iniciando seed de base de datos...\n');

  // 1. Crear persona para el usuario admin
  console.log('📝 Creando persona admin...');
  const personaAdmin = await prisma.personas.upsert({
    where: {
      uk_identificacion: {
        tipo_identificacion: 'CC',
        numero_identificacion: '12345678',
      },
    },
    update: {},
    create: {
      tipo_identificacion: 'CC',
      numero_identificacion: '12345678',
      tipo_persona: 'NATURAL',
      primer_nombre: 'Admin',
      primer_apellido: 'Mekanos',
      // nombre_completo se genera automáticamente en BD
      email_principal: 'admin@mekanos.com',
      telefono_principal: '3001234567',
      ciudad: 'CARTAGENA',
      departamento: 'BOLÍVAR',
      pais: 'COLOMBIA',
      es_empleado: true,
      activo: true,
    },
  });

  console.log(`✅ Persona creada: ${personaAdmin.nombre_completo} (ID: ${personaAdmin.id_persona})\n`);

  // 2. Hash de contraseña
  const passwordHash = await bcrypt.hash('Admin123!', 10);

  // 3. Crear usuario admin
  console.log('🔐 Creando usuario admin...');
  const usuarioAdmin = await prisma.usuarios.upsert({
    where: { email: 'admin@mekanos.com' },
    update: {
      password_hash: passwordHash, // Actualizar password si ya existe
      estado: 'ACTIVO',
    },
    create: {
      id_persona: personaAdmin.id_persona,
      username: 'admin',
      email: 'admin@mekanos.com',
      password_hash: passwordHash,
      estado: 'ACTIVO',
      debe_cambiar_password: false, // No forzar cambio para testing
      intentos_fallidos: 0,
      bloqueado_por_intentos: false,
    },
  });

  console.log(`✅ Usuario creado: ${usuarioAdmin.email} (ID: ${usuarioAdmin.id_usuario})`);
  console.log(`   Username: ${usuarioAdmin.username}`);
  console.log(`   Password: Admin123!`);
  console.log(`   Estado: ${usuarioAdmin.estado}\n`);

  // ✅ FASE 2: Crear tipos de equipo
  console.log('🔧 Creando tipos de equipo...');
  const tipoGenerador = await prisma.tipos_equipo.upsert({
    where: { codigo_tipo: 'GEN' },
    update: {},
    create: {
      codigo_tipo: 'GEN',
      nombre_tipo: 'GENERADOR ELÉCTRICO',
      descripcion: 'Generador eléctrico industrial',
      categoria: 'ENERGIA',
      tiene_generador: true,
      tiene_motor: true, // Generadores normalmente tienen motor
      tiene_bomba: false,
      formato_ficha_tecnica: 'FORMATO_GENERADOR',
      creado_por: usuarioAdmin.id_usuario,
      activo: true,
    },
  });

  const tipoMotor = await prisma.tipos_equipo.upsert({
    where: { codigo_tipo: 'MOT' },
    update: {},
    create: {
      codigo_tipo: 'MOT',
      nombre_tipo: 'MOTOR INDUSTRIAL',
      descripcion: 'Motor industrial (diesel/gasolina)',
      categoria: 'ENERGIA',
      tiene_generador: false,
      tiene_motor: true,
      tiene_bomba: false,
      formato_ficha_tecnica: 'FORMATO_MOTOR',
      creado_por: usuarioAdmin.id_usuario,
      activo: true,
    },
  });

  const tipoBomba = await prisma.tipos_equipo.upsert({
    where: { codigo_tipo: 'BOM' },
    update: {},
    create: {
      codigo_tipo: 'BOM',
      nombre_tipo: 'BOMBA HIDRÁULICA',
      descripcion: 'Bomba hidráulica industrial',
      categoria: 'HIDRAULICA',
      tiene_generador: false,
      tiene_motor: false,
      tiene_bomba: true,
      formato_ficha_tecnica: 'FORMATO_BOMBA',
      creado_por: usuarioAdmin.id_usuario,
      activo: true,
    },
  });

  console.log(`✅ Tipos de equipo creados:`);
  console.log(`   - ${tipoGenerador.nombre_tipo} (ID: ${tipoGenerador.id_tipo_equipo})`);
  console.log(`   - ${tipoMotor.nombre_tipo} (ID: ${tipoMotor.id_tipo_equipo})`);
  console.log(`   - ${tipoBomba.nombre_tipo} (ID: ${tipoBomba.id_tipo_equipo})\n`);

  // ✅ FASE 2: Crear cliente test
  console.log('🏢 Creando cliente test...');
  const personaCliente = await prisma.personas.upsert({
    where: {
      uk_identificacion: {
        tipo_identificacion: 'NIT',
        numero_identificacion: '900123456',
      },
    },
    update: {},
    create: {
      tipo_identificacion: 'NIT',
      numero_identificacion: '900123456',
      tipo_persona: 'JURIDICA',
      razon_social: 'Empresa Test S.A.S.',
      email_principal: 'contacto@empresatest.com',
      telefono_principal: '6012345678',
      ciudad: 'CARTAGENA',
      departamento: 'BOLÍVAR',
      pais: 'COLOMBIA',
      activo: true,
    },
  });

  const clienteTest = await prisma.clientes.upsert({
    where: { id_persona: personaCliente.id_persona },
    update: {},
    create: {
      id_persona: personaCliente.id_persona,
      tipo_cliente: 'INDUSTRIAL',
      cliente_activo: true,
    },
  });

  console.log(`✅ Cliente creado: ${personaCliente.nombre_completo} (ID: ${clienteTest.id_cliente})\n`);

  // ✅ FASE 2: Crear equipo test
  console.log('⚙️ Creando equipo test...');
  const equipoTest = await prisma.equipos.upsert({
    where: { codigo_equipo: 'EQ-TEST-001' },
    update: {
      nombre_equipo: 'Generador Caterpillar 500KVA - Test',
      ubicacion_texto: 'Planta Principal - Sala de Máquinas A',
      estado_equipo: 'OPERATIVO',
      criticidad: 'ALTA',
    },
    create: {
      codigo_equipo: 'EQ-TEST-001',
      id_cliente: clienteTest.id_cliente,
      id_tipo_equipo: tipoGenerador.id_tipo_equipo,
      ubicacion_texto: 'Planta Principal - Sala de Máquinas A',
      nombre_equipo: 'Generador Caterpillar 500KVA - Test',
      numero_serie_equipo: 'CAT-GEN-2024-001',
      estado_equipo: 'OPERATIVO',
      criticidad: 'ALTA',
      creado_por: usuarioAdmin.id_usuario,
      activo: true,
    },
  });

  console.log(`✅ Equipo creado: ${equipoTest.nombre_equipo}`);
  console.log(`   Código: ${equipoTest.codigo_equipo}`);
  console.log(`   Cliente: ${personaCliente.nombre_completo}`);
  console.log(`   Tipo: ${tipoGenerador.nombre_tipo}`);
  console.log(`   Ubicación: ${equipoTest.ubicacion_texto}\n`);

  // ✅ FASE 3: Crear estados de orden
  console.log('🔄 Creando estados de orden...');
  const estados = await Promise.all([
    prisma.estados_orden.upsert({
      where: { codigo_estado: 'PROGRAMADA' },
      update: {},
      create: {
        codigo_estado: 'PROGRAMADA',
        nombre_estado: 'Programada',
        descripcion: 'Orden creada y programada, pendiente de asignación de técnico',
        permite_edicion: true,
        permite_eliminacion: false,
        es_estado_final: false,
        color_hex: '#3B82F6',
        icono: 'calendar',
        orden_visualizacion: 1,
        activo: true,
      },
    }),
    prisma.estados_orden.upsert({
      where: { codigo_estado: 'ASIGNADA' },
      update: {},
      create: {
        codigo_estado: 'ASIGNADA',
        nombre_estado: 'Asignada',
        descripcion: 'Técnico asignado, pendiente de ejecución en campo',
        permite_edicion: true,
        permite_eliminacion: false,
        es_estado_final: false,
        color_hex: '#8B5CF6',
        icono: 'user-check',
        orden_visualizacion: 2,
        activo: true,
      },
    }),
    prisma.estados_orden.upsert({
      where: { codigo_estado: 'EN_PROCESO' },
      update: {},
      create: {
        codigo_estado: 'EN_PROCESO',
        nombre_estado: 'En Proceso',
        descripcion: 'Técnico ejecutando trabajo en campo',
        permite_edicion: false,
        permite_eliminacion: false,
        es_estado_final: false,
        color_hex: '#F59E0B',
        icono: 'settings',
        orden_visualizacion: 3,
        activo: true,
      },
    }),
    prisma.estados_orden.upsert({
      where: { codigo_estado: 'COMPLETADA' },
      update: {},
      create: {
        codigo_estado: 'COMPLETADA',
        nombre_estado: 'Completada',
        descripcion: 'Trabajo finalizado por técnico, pendiente de aprobación',
        permite_edicion: false,
        permite_eliminacion: false,
        es_estado_final: false,
        color_hex: '#10B981',
        icono: 'check-circle',
        orden_visualizacion: 4,
        activo: true,
      },
    }),
    prisma.estados_orden.upsert({
      where: { codigo_estado: 'APROBADA' },
      update: {},
      create: {
        codigo_estado: 'APROBADA',
        nombre_estado: 'Aprobada',
        descripcion: 'Supervisor/Admin aprobó el trabajo. Estado final.',
        permite_edicion: false,
        permite_eliminacion: false,
        es_estado_final: true,
        color_hex: '#059669',
        icono: 'check-double',
        orden_visualizacion: 5,
        activo: true,
      },
    }),
    prisma.estados_orden.upsert({
      where: { codigo_estado: 'CANCELADA' },
      update: {},
      create: {
        codigo_estado: 'CANCELADA',
        nombre_estado: 'Cancelada',
        descripcion: 'Orden cancelada. Estado final.',
        permite_edicion: false,
        permite_eliminacion: false,
        es_estado_final: true,
        color_hex: '#DC2626',
        icono: 'x-circle',
        orden_visualizacion: 6,
        activo: true,
      },
    }),
    prisma.estados_orden.upsert({
      where: { codigo_estado: 'EN_ESPERA_REPUESTO' },
      update: {},
      create: {
        codigo_estado: 'EN_ESPERA_REPUESTO',
        nombre_estado: 'En Espera de Repuesto',
        descripcion: 'Trabajo bloqueado esperando componentes',
        permite_edicion: false,
        permite_eliminacion: false,
        es_estado_final: false,
        color_hex: '#6B7280',
        icono: 'clock',
        orden_visualizacion: 7,
        activo: true,
      },
    }),
  ]);

  console.log(`✅ Estados creados: ${estados.length} estados`);
  estados.forEach((estado) => {
    console.log(`   - ${estado.nombre_estado} (${estado.codigo_estado})`);
  });
  console.log('');

  // ✅ FASE 3: Crear orden de servicio de prueba
  console.log('📋 Creando orden de servicio test...');
  const ordenTest = await prisma.ordenes_servicio.upsert({
    where: { numero_orden: 'OS-2025-001' },
    update: {},
    create: {
      numero_orden: 'OS-2025-001',
      id_cliente: clienteTest.id_cliente,
      id_equipo: equipoTest.id_equipo,
      id_estado_actual: estados[0].id_estado, // PROGRAMADA
      fecha_programada: new Date('2025-11-20'),
      hora_programada: new Date('1970-01-01T09:00:00'),
      prioridad: 'NORMAL',
      origen_solicitud: 'PROGRAMADO',
      descripcion_inicial: 'Mantenimiento preventivo programado - Revisión general del generador',
      requiere_firma_cliente: true,
      creado_por: usuarioAdmin.id_usuario,
    },
  });

  console.log(`✅ Orden creada: ${ordenTest.numero_orden}`);
  console.log(`   Cliente: ${personaCliente.nombre_completo}`);
  console.log(`   Equipo: ${equipoTest.nombre_equipo}`);
  console.log(`   Estado: PROGRAMADA`);
  console.log(`   Fecha programada: 2025-11-20 09:00:00\n`);

  console.log('🎉 Seed completado exitosamente!');
  console.log('\n📌 Credenciales de testing:');
  console.log('   Email: admin@mekanos.com');
  console.log('   Password: Admin123!');
  console.log('\n📦 Datos de prueba:');
  console.log(`   Cliente ID: ${clienteTest.id_cliente} (${personaCliente.nombre_completo})`);
  console.log(`   Equipo ID: ${equipoTest.id_equipo} (${equipoTest.codigo_equipo})`);
  console.log(`   Tipos Equipo: GENERADOR(${tipoGenerador.id_tipo_equipo}), MOTOR(${tipoMotor.id_tipo_equipo}), BOMBA(${tipoBomba.id_tipo_equipo})`);
  console.log(`   Orden ID: ${ordenTest.id_orden_servicio} (${ordenTest.numero_orden})\n`);
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
