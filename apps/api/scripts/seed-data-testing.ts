/**
 * Script: seed-data-testing.ts
 * Crea datos semilla para testing (cliente, sede, equipo, estados)
 * Ejecutar: npx tsx seed-data-testing.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n========================================');
  console.log('   SEED DATA TESTING');
  console.log('========================================\n');

  try {
    // ========================================
    // 1. ESTADOS COTIZACION (si no existen)
    // ========================================
    console.log('PASO 1: Verificando estados cotizacion...');
    const estados = [
      { id_estado: 1, codigo_estado: 'BORRADOR', nombre_estado: 'BORRADOR', descripcion: 'Cotizacion en creacion', orden_visualizacion: 1, es_estado_final: false, permite_edicion: true },
      { id_estado: 2, codigo_estado: 'EN_REVISION', nombre_estado: 'EN_REVISION', descripcion: 'Pendiente aprobacion interna', orden_visualizacion: 2, es_estado_final: false, permite_edicion: false },
      { id_estado: 3, codigo_estado: 'APROBADA_INTERNA', nombre_estado: 'APROBADA_INTERNA', descripcion: 'Aprobada internamente', orden_visualizacion: 3, es_estado_final: false, permite_edicion: false },
      { id_estado: 4, codigo_estado: 'ENVIADA', nombre_estado: 'ENVIADA', descripcion: 'Enviada al cliente', orden_visualizacion: 4, es_estado_final: false, permite_edicion: false },
      { id_estado: 5, codigo_estado: 'APROBADA_CLIENTE', nombre_estado: 'APROBADA_CLIENTE', descripcion: 'Aprobada por cliente', orden_visualizacion: 5, es_estado_final: true, permite_edicion: false },
      { id_estado: 6, codigo_estado: 'RECHAZADA', nombre_estado: 'RECHAZADA', descripcion: 'Rechazada por cliente', orden_visualizacion: 6, es_estado_final: true, permite_edicion: false },
    ];

    for (const estado of estados) {
      await prisma.estados_cotizacion.upsert({
        where: { id_estado: estado.id_estado },
        update: {},
        create: estado,
      });
    }
    console.log('✅ Estados cotizacion verificados (6 estados)\n');

    // ========================================
    // 2. TIPOS EQUIPO
    // ========================================
    console.log('PASO 2: Verificando tipos equipo...');
    const tipoEquipo = await prisma.tipos_equipo.upsert({
      where: { id_tipo_equipo: 1 },
      update: {},
      create: {
        id_tipo_equipo: 1,
        nombre_tipo: 'MOTOR DIESEL',
        descripcion: 'Motor diesel estacionario',
        requiere_especificaciones_motor: true,
        requiere_especificaciones_generador: false,
        requiere_especificaciones_bomba: false,
        activo: true,
      },
    });
    console.log(`✅ Tipo equipo creado: ${tipoEquipo.nombre_tipo}\n`);

    // ========================================
    // 3. CLIENTE (Persona JURIDICA)
    // ========================================
    console.log('PASO 3: Creando cliente test...');
    
    // Eliminar cliente test existente
    const existingCliente = await prisma.clientes.findFirst({
      where: { persona: { numero_identificacion: '9001234567' } },
    });
    
    if (existingCliente) {
      await prisma.clientes.delete({ where: { id_cliente: existingCliente.id_cliente } });
      await prisma.personas.delete({ where: { id_persona: existingCliente.id_persona } });
      console.log('  Cliente test anterior eliminado');
    }

    const personaCliente = await prisma.personas.create({
      data: {
        tipo_identificacion: 'NIT',
        numero_identificacion: '9001234567',
        tipo_persona: 'JURIDICA',
        razon_social: 'HOTEL CARIBE PLAZA S.A.S',
        nombre_comercial: 'Hotel Caribe Plaza',
        representante_legal: 'Carlos Rodriguez',
        cedula_representante: '1234567890',
        email_principal: 'gerencia@hotelcaribe.com',
        telefono_principal: '6051234567',
        celular: '3001234567',
        direccion_principal: 'Carrera 1 # 2-87 Bocagrande',
        barrio_zona: 'Bocagrande',
        ciudad: 'CARTAGENA',
        departamento: 'BOLÍVAR',
        pais: 'COLOMBIA',
        es_cliente: true,
        activo: true,
      },
    });

    const cliente = await prisma.clientes.create({
      data: {
        id_persona: personaCliente.id_persona,
        categoria_cliente: 'PLATINUM',
        tipo_cliente: 'CORPORATIVO',
        fuente_captacion: 'REFERIDO',
        fecha_primer_servicio: new Date('2020-01-15'),
        observaciones_comerciales: 'Cliente Premium - 5 estrellas',
        activo: true,
      },
    });
    console.log(`✅ Cliente creado: ${personaCliente.razon_social} (ID: ${cliente.id_cliente})\n`);

    // ========================================
    // 4. SEDE CLIENTE
    // ========================================
    console.log('PASO 4: Creando sede cliente...');
    
    const existingSede = await prisma.sedes_cliente.findFirst({
      where: { id_cliente: cliente.id_cliente },
    });

    let sede;
    if (existingSede) {
      sede = existingSede;
      console.log(`  Sede existente encontrada (ID: ${sede.id_sede})`);
    } else {
      sede = await prisma.sedes_cliente.create({
        data: {
          id_cliente: cliente.id_cliente,
          nombre_sede: 'Sede Principal',
          tipo_sede: 'PRINCIPAL',
          direccion: 'Carrera 1 # 2-87 Bocagrande',
          barrio_zona: 'Bocagrande',
          ciudad: 'CARTAGENA',
          departamento: 'BOLÍVAR',
          pais: 'COLOMBIA',
          telefono_contacto: '6051234567',
          email_contacto: 'mantenimiento@hotelcaribe.com',
          coordenadas_gps: '10.3997,-75.5493',
          horario_atencion: 'Lunes a Domingo 24 horas',
          sede_activa: true,
        },
      });
      console.log(`✅ Sede creada: ${sede.nombre_sede} (ID: ${sede.id_sede})\n`);
    }

    // ========================================
    // 5. EQUIPO (Motor Diesel)
    // ========================================
    console.log('PASO 5: Creando equipo test...');
    
    const existingEquipo = await prisma.equipos.findFirst({
      where: { numero_serie: 'TEST-MOTOR-001' },
    });

    let equipo;
    if (existingEquipo) {
      equipo = existingEquipo;
      console.log(`  Equipo existente encontrado (ID: ${equipo.id_equipo})`);
    } else {
      const usuario = await prisma.usuarios.findUnique({
        where: { email: 'test@mekanos.com' },
      });

      equipo = await prisma.equipos.create({
        data: {
          id_tipo_equipo: tipoEquipo.id_tipo_equipo,
          id_cliente: cliente.id_cliente,
          id_sede: sede.id_sede,
          numero_serie: 'TEST-MOTOR-001',
          alias: 'Planta Principal Lobby',
          marca: 'CUMMINS',
          modelo: '6BT5.9-G2',
          descripcion: 'Generador diesel 150 KVA - Respaldo principal',
          potencia_nominal: 150.0,
          voltaje_operacion: 480.0,
          fecha_fabricacion: new Date('2018-06-15'),
          fecha_adquisicion: new Date('2018-08-01'),
          anio_fabricacion: 2018,
          condicion_equipo: 'EXCELENTE',
          estado_operativo: 'OPERATIVO',
          ubicacion_fisica: 'Cuarto de maquinas piso 1',
          requiere_mantenimiento_predictivo: true,
          criticidad: 'CRITICA',
          horometro_inicial: 0.0,
          horometro_actual: 2580.5,
          es_propio_cliente: true,
          activo: true,
          creado_por: usuario?.id_usuario || 1,
        },
      });
      console.log(`✅ Equipo creado: ${equipo.alias} (ID: ${equipo.id_equipo})\n`);
    }

    // ========================================
    // 6. MOTIVOS RECHAZO (si no existen)
    // ========================================
    console.log('PASO 6: Verificando motivos rechazo...');
    const motivosRechazo = [
      { id_motivo_rechazo: 1, codigo: 'PRECIO_ALTO', descripcion: 'Precio excede presupuesto', activo: true },
      { id_motivo_rechazo: 2, codigo: 'TIEMPO_ENTREGA', descripcion: 'Tiempo de entrega no aceptable', activo: true },
      { id_motivo_rechazo: 3, codigo: 'ALCANCE_INSUFICIENTE', descripcion: 'Alcance no cubre necesidades', activo: true },
    ];

    for (const motivo of motivosRechazo) {
      await prisma.motivos_rechazo.upsert({
        where: { id_motivo_rechazo: motivo.id_motivo_rechazo },
        update: {},
        create: motivo,
      });
    }
    console.log('✅ Motivos rechazo verificados (3 motivos)\n');

    // ========================================
    // RESUMEN FINAL
    // ========================================
    console.log('========================================');
    console.log('   ✅ SEED DATA COMPLETADO');
    console.log('========================================');
    console.log(`Cliente ID: ${cliente.id_cliente} (${personaCliente.razon_social})`);
    console.log(`Sede ID: ${sede.id_sede} (${sede.nombre_sede})`);
    console.log(`Equipo ID: ${equipo.id_equipo} (${equipo.alias})`);
    console.log(`Estados Cotización: 6 estados`);
    console.log(`Motivos Rechazo: 3 motivos`);
    console.log('\n✅ Backend listo para testing FASE 4.6 + 4.7\n');

  } catch (error) {
    console.error('❌ ERROR:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    console.log('✅ Script completado exitosamente\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script falló:', error.message);
    process.exit(1);
  });
