import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 SEED TESTING MINIMAL V2 - SQL RAW - Iniciando...\n');

  try {
    // PASO 1: Estados cotización
    console.log('[1/6] Insertando estados cotización...');
    await prisma.$executeRawUnsafe(`
      INSERT INTO estados_cotizacion (codigo_estado, nombre_estado, descripcion, orden_visualizacion, color_hex, permite_edicion, requiere_aprobacion_interna, es_estado_final)
      VALUES 
        ('BORRADOR', 'BORRADOR', 'Cotización en proceso de elaboración', 1, '#94A3B8', true, false, false),
        ('EN_REVISION', 'EN_REVISION', 'Esperando aprobación interna', 2, '#FBBF24', false, true, false),
        ('APROBADA_INTERNA', 'APROBADA_INTERNA', 'Aprobada internamente, lista para enviar', 3, '#34D399', false, false, false),
        ('ENVIADA', 'ENVIADA', 'Enviada al cliente', 4, '#60A5FA', false, false, false),
        ('APROBADA_CLIENTE', 'APROBADA_CLIENTE', 'Aprobada por el cliente', 5, '#10B981', false, false, true),
        ('RECHAZADA', 'RECHAZADA', 'Rechazada por el cliente', 6, '#EF4444', false, false, true)
      ON CONFLICT (codigo_estado) DO NOTHING;
    `);
    console.log('   ✅ 6 estados cotización insertados\n');

    // PASO 2: Tipo equipo MOTOR
    console.log('[2/6] Insertando tipo equipo...');
    await prisma.$executeRawUnsafe(`
      INSERT INTO tipos_equipo (codigo_tipo, nombre_tipo, descripcion, categoria, tiene_motor, requiere_horometro, formato_ficha_tecnica)
      VALUES ('MOTOR', 'MOTOR', 'Motor eléctrico industrial', 'ENERGIA', true, true, 'MOTOR_ELECTRICO')
      ON CONFLICT (codigo_tipo) DO NOTHING;
    `);
    console.log('   ✅ Tipo equipo MOTOR insertado\n');

    // PASO 3: Persona test
    console.log('[3/6] Insertando persona test...');
    await prisma.$executeRawUnsafe(`
      INSERT INTO personas (tipo_persona, tipo_identificacion, numero_identificacion, razon_social, telefono_principal, email_principal, direccion_principal, ciudad, departamento, pais)
      VALUES ('JURIDICA', 'NIT', '900123456-7', 'Empresa Test S.A.S', '3001234567', 'testing-fase4@mekanos.local', 'Calle Test 123', 'Cartagena', 'Bolívar', 'Colombia')
      ON CONFLICT (tipo_identificacion, numero_identificacion) DO NOTHING;
    `);
    const persona = await prisma.$queryRawUnsafe<any[]>(`SELECT id_persona FROM personas WHERE numero_identificacion = '900123456-7' LIMIT 1`);
    console.log(`   ✅ Persona test insertada (ID: ${persona[0]?.id_persona})\n`);

    // PASO 4: Cliente test
    console.log('[4/6] Insertando cliente test...');
    await prisma.$executeRawUnsafe(`
      INSERT INTO clientes (id_persona, fecha_inicio_servicio, cliente_activo, tipo_cliente, dias_credito)
      SELECT id_persona, CURRENT_DATE, true, 'COMERCIAL', 30
      FROM personas 
      WHERE numero_identificacion = '900123456-7'
      ON CONFLICT (id_persona) DO NOTHING;
    `);
    const cliente = await prisma.$queryRawUnsafe<any[]>(`
      SELECT c.id_cliente FROM clientes c JOIN personas p ON c.id_persona = p.id_persona 
      WHERE p.numero_identificacion = '900123456-7' LIMIT 1
    `);
    console.log(`   ✅ Cliente test insertado (ID: ${cliente[0]?.id_cliente})\n`);

    // PASO 5: Sede cliente test
    console.log('[5/6] Insertando sede cliente test...');
    await prisma.$executeRawUnsafe(`
      INSERT INTO sedes_cliente (id_cliente, nombre_sede, direccion_sede, ciudad_sede, departamento_sede, telefono_sede, creado_por)
      SELECT c.id_cliente, 'Sede Principal', 'Carrera 50 # 100-200', 'Cartagena', 'Bolívar', '3001234567', 1
      FROM clientes c JOIN personas p ON c.id_persona = p.id_persona
      WHERE p.numero_identificacion = '900123456-7'
      AND NOT EXISTS (SELECT 1 FROM sedes_cliente sc WHERE sc.id_cliente = c.id_cliente AND sc.nombre_sede = 'Sede Principal');
    `);
    const sede = await prisma.$queryRawUnsafe<any[]>(`
      SELECT sc.id_sede FROM sedes_cliente sc JOIN clientes c ON sc.id_cliente = c.id_cliente 
      JOIN personas p ON c.id_persona = p.id_persona 
      WHERE p.numero_identificacion = '900123456-7' AND sc.nombre_sede = 'Sede Principal' LIMIT 1
    `);
    console.log(`   ✅ Sede cliente insertada (ID: ${sede[0]?.id_sede})\n`);

    // PASO 6: Equipo motor test
    console.log('[6/6] Insertando equipo motor test...');
    await prisma.$executeRawUnsafe(`
      INSERT INTO equipos (codigo_equipo, id_tipo_equipo, id_cliente, id_sede, estado_equipo, nombre_equipo, numero_serie_equipo, ubicacion_texto, fecha_instalacion, creado_por)
      SELECT 'MOTOR-TEST-001', te.id_tipo_equipo, c.id_cliente, sc.id_sede, 'OPERATIVO', 'Motor Test WEG W22', 'TEST-SN-001', 'Área de pruebas - Zona industrial', '2020-06-15', 1
      FROM tipos_equipo te
      CROSS JOIN clientes c JOIN personas p ON c.id_persona = p.id_persona
      JOIN sedes_cliente sc ON sc.id_cliente = c.id_cliente
      WHERE te.codigo_tipo = 'MOTOR' AND p.numero_identificacion = '900123456-7' AND sc.nombre_sede = 'Sede Principal'
      AND NOT EXISTS (SELECT 1 FROM equipos e WHERE e.codigo_equipo = 'MOTOR-TEST-001');
    `);
    const equipo = await prisma.$queryRawUnsafe<any[]>(`SELECT id_equipo FROM equipos WHERE codigo_equipo = 'MOTOR-TEST-001' LIMIT 1`);
    console.log(`   ✅ Equipo motor insertado (ID: ${equipo[0]?.id_equipo})\n`);

    console.log('✅ SEED COMPLETADO EXITOSAMENTE!\n');
    console.log('📊 Resumen datos insertados:');
    console.log('   • 6 estados cotización');
    console.log('   • 1 tipo equipo (MOTOR)');
    console.log(`   • 1 persona test (ID: ${persona[0]?.id_persona})`);
    console.log(`   • 1 cliente test (ID: ${cliente[0]?.id_cliente})`);
    console.log(`   • 1 sede cliente (ID: ${sede[0]?.id_sede})`);
    console.log(`   • 1 equipo motor (ID: ${equipo[0]?.id_equipo})\n`);

  } catch (error) {
    console.error('❌ ERROR SEED:', error);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error('❌ ERROR FATAL:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
