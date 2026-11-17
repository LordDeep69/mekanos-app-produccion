/**
 * SEED: SERVICIO CORRECTIVO GENERADORES (GEN_CORR)
 * =================================================
 * Ejecutar con: npx ts-node seed-correctivo-generadores.ts
 * 
 * Este script inserta:
 * 1. Tipo de servicio GEN_CORR
 * 2. Actividades del catálogo (15 items)
 * 3. Vinculación a sistemas y parámetros existentes
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['warn', 'error'],
});

function log(message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') {
  const icons = { info: '📋', success: '✅', error: '❌', warn: '⚠️' };
  console.log(`${icons[type]} ${message}`);
}

function separator(title?: string) {
  console.log('\n' + '═'.repeat(60));
  if (title) console.log(`  ${title}`);
  console.log('═'.repeat(60));
}

// ============================================================================
// PASO 1: INSERTAR TIPO DE SERVICIO GEN_CORR
// ============================================================================

async function insertarTipoServicioCorrectivo() {
  separator('PASO 1: TIPO DE SERVICIO GEN_CORR');

  const tipoGen = await prisma.tipos_equipo.findFirst({
    where: { codigo_tipo: 'GEN' }
  });

  if (!tipoGen) {
    throw new Error('Tipo de equipo GEN no encontrado. Ejecutar fase-menos-1-ejecutar.ts primero.');
  }

  // Buscar si ya existe
  let tipoServicio = await prisma.tipos_servicio.findFirst({
    where: { codigo_tipo: 'GEN_CORR' }
  });

  if (tipoServicio) {
    // Actualizar existente
    tipoServicio = await prisma.tipos_servicio.update({
      where: { id_tipo_servicio: tipoServicio.id_tipo_servicio },
      data: {
        nombre_tipo: 'Correctivo - Generador',
        activo: true
      }
    });
    log(`Tipo servicio GEN_CORR actualizado. ID: ${tipoServicio.id_tipo_servicio}`, 'success');
  } else {
    // Crear nuevo
    tipoServicio = await prisma.tipos_servicio.create({
      data: {
        codigo_tipo: 'GEN_CORR',
        nombre_tipo: 'Correctivo - Generador',
        descripcion: 'Mantenimiento correctivo para equipos generadores. Incluye diagnóstico, reparación y verificación post-intervención.',
        categoria: 'CORRECTIVO',
        id_tipo_equipo: tipoGen.id_tipo_equipo,
        tiene_checklist: true,
        tiene_plantilla_informe: true,
        requiere_mediciones: true,
        duracion_estimada_horas: 4.00,
        orden_visualizacion: 10,
        icono: 'tool',
        color_hex: '#F59E0B',
        activo: true,
      },
    });
    log(`Tipo servicio GEN_CORR creado. ID: ${tipoServicio.id_tipo_servicio}`, 'success');
  }

  return tipoServicio;
}

// ============================================================================
// PASO 2: INSERTAR ACTIVIDADES DEL CATÁLOGO
// ============================================================================

async function insertarActividadesCorrectivo() {
  separator('PASO 2: ACTIVIDADES GEN_CORR');

  const tipoServicio = await prisma.tipos_servicio.findFirst({
    where: { codigo_tipo: 'GEN_CORR' }
  });

  if (!tipoServicio) {
    throw new Error('Tipo servicio GEN_CORR no encontrado');
  }

  const getSistema = async (codigo: string) => {
    const s = await prisma.catalogo_sistemas.findUnique({
      where: { codigo_sistema: codigo }
    });
    return s?.id_sistema || null;
  };

  const getParametro = async (codigo: string) => {
    const p = await prisma.parametros_medicion.findUnique({
      where: { codigo_parametro: codigo }
    });
    return p?.id_parametro_medicion || null;
  };

  const actividades = [
    // ═══════════════════════════════════════════════════════════════════════
    // SECCIÓN 1: REPORTE INICIAL (3 actividades)
    // Usamos VERIFICACION para estados y INSPECCION para texto libre
    // ═══════════════════════════════════════════════════════════════════════
    {
      codigo: 'GCR_REP_01',
      desc: 'ESTADO INICIAL DEL EQUIPO',
      sistema: 'SIS_GENERAL',
      tipo: 'VERIFICACION',
      orden: 1,
      instrucciones: 'Verificar estado inicial: OPERATIVO, PARADO, FALLA INTERMITENTE, INACCESIBLE'
    },
    {
      codigo: 'GCR_REP_02',
      desc: 'DESCRIPCIÓN DEL PROBLEMA REPORTADO',
      sistema: 'SIS_GENERAL',
      tipo: 'INSPECCION',
      orden: 2,
      instrucciones: 'Describir detalladamente el problema reportado por el cliente o detectado en la inspección inicial'
    },
    {
      codigo: 'GCR_REP_03',
      desc: 'SÍNTOMAS OBSERVADOS',
      sistema: 'SIS_GENERAL',
      tipo: 'INSPECCION',
      orden: 3,
      instrucciones: 'Listar los síntomas observados: ruidos anormales, fugas, lecturas fuera de rango, etc.'
    },

    // ═══════════════════════════════════════════════════════════════════════
    // SECCIÓN 2: DIAGNÓSTICO (3 actividades)
    // ═══════════════════════════════════════════════════════════════════════
    {
      codigo: 'GCR_DIAG_01',
      desc: 'SISTEMAS AFECTADOS',
      sistema: 'SIS_GENERAL',
      tipo: 'VERIFICACION',
      orden: 4,
      instrucciones: 'Identificar sistemas afectados: ENFRIAMIENTO, COMBUSTIBLE, LUBRICACIÓN, ELÉCTRICO, ADMISIÓN/ESCAPE, CONTROL, ALTERNADOR, TRANSFERENCIA'
    },
    {
      codigo: 'GCR_DIAG_02',
      desc: 'DIAGNÓSTICO Y CAUSA RAÍZ',
      sistema: 'SIS_GENERAL',
      tipo: 'INSPECCION',
      orden: 5,
      instrucciones: 'Describir el diagnóstico técnico y la causa raíz del problema identificado'
    },
    {
      codigo: 'GCR_DIAG_03',
      desc: 'TRABAJOS REALIZADOS',
      sistema: 'SIS_GENERAL',
      tipo: 'INSPECCION',
      orden: 6,
      instrucciones: 'Describir detalladamente los trabajos de reparación/corrección realizados'
    },

    // ═══════════════════════════════════════════════════════════════════════
    // SECCIÓN 3: REPUESTOS Y MATERIALES (2 actividades)
    // ═══════════════════════════════════════════════════════════════════════
    {
      codigo: 'GCR_REP_04',
      desc: 'REPUESTOS UTILIZADOS',
      sistema: 'SIS_GENERAL',
      tipo: 'CAMBIO',
      orden: 7,
      instrucciones: 'Listar repuestos utilizados con cantidad y referencia. Ej: 1x Filtro aceite REF-12345, 2x Fusible 15A'
    },
    {
      codigo: 'GCR_REP_05',
      desc: 'MATERIALES E INSUMOS',
      sistema: 'SIS_GENERAL',
      tipo: 'CAMBIO',
      orden: 8,
      instrucciones: 'Listar materiales e insumos utilizados. Ej: 5 Gal Aceite 15W40, 2 Gal Refrigerante, etc.'
    },

    // ═══════════════════════════════════════════════════════════════════════
    // SECCIÓN 4: RESULTADO (3 actividades)
    // ═══════════════════════════════════════════════════════════════════════
    {
      codigo: 'GCR_RES_01',
      desc: 'ESTADO FINAL DEL EQUIPO',
      sistema: 'SIS_GENERAL',
      tipo: 'VERIFICACION',
      orden: 9,
      instrucciones: 'Verificar estado final: OPERATIVO, REPARACIÓN PARCIAL, REQUIERE REPUESTOS, FUERA DE SERVICIO'
    },
    {
      codigo: 'GCR_RES_02',
      desc: 'TRABAJOS PENDIENTES',
      sistema: 'SIS_GENERAL',
      tipo: 'INSPECCION',
      orden: 10,
      instrucciones: 'Describir trabajos pendientes y razón (falta de repuestos, tiempo, autorización del cliente, etc.)'
    },
    {
      codigo: 'GCR_RES_03',
      desc: 'RECOMENDACIONES',
      sistema: 'SIS_GENERAL',
      tipo: 'INSPECCION',
      orden: 11,
      instrucciones: 'Recomendaciones técnicas: próximo mantenimiento, repuestos a conseguir, mejoras sugeridas'
    },

    // ═══════════════════════════════════════════════════════════════════════
    // SECCIÓN 5: MEDICIONES POST-INTERVENCIÓN (8 actividades)
    // Solo aplican si el equipo quedó operativo
    // ═══════════════════════════════════════════════════════════════════════
    {
      codigo: 'GCR_MED_01',
      desc: 'VELOCIDAD DE MOTOR (R.P.M)',
      sistema: 'SIS_MODULO_CONTROL',
      tipo: 'MEDICION',
      orden: 12,
      parametro: 'GEN_RPM',
      instrucciones: 'Medir RPM del motor en operación. Rango normal: 1750-1850 RPM'
    },
    {
      codigo: 'GCR_MED_02',
      desc: 'PRESIÓN DE ACEITE',
      sistema: 'SIS_MODULO_CONTROL',
      tipo: 'MEDICION',
      orden: 13,
      parametro: 'GEN_PRESION_ACEITE',
      instrucciones: 'Medir presión de aceite en operación. Rango normal: 40-80 PSI'
    },
    {
      codigo: 'GCR_MED_03',
      desc: 'TEMPERATURA DE REFRIGERANTE',
      sistema: 'SIS_MODULO_CONTROL',
      tipo: 'MEDICION',
      orden: 14,
      parametro: 'GEN_TEMP_REFRIGERANTE',
      instrucciones: 'Medir temperatura de refrigerante en operación. Rango normal: 70-95°C'
    },
    {
      codigo: 'GCR_MED_04',
      desc: 'CARGA DE BATERÍA',
      sistema: 'SIS_MODULO_CONTROL',
      tipo: 'MEDICION',
      orden: 15,
      parametro: 'GEN_VOLTAJE_BATERIA',
      instrucciones: 'Medir voltaje de batería. Rango normal: 12.5-14.5 VDC'
    },
    {
      codigo: 'GCR_MED_05',
      desc: 'HORAS DE TRABAJO',
      sistema: 'SIS_MODULO_CONTROL',
      tipo: 'MEDICION',
      orden: 16,
      parametro: 'GEN_HOROMETRO',
      instrucciones: 'Registrar lectura actual del horómetro'
    },
    {
      codigo: 'GCR_MED_06',
      desc: 'VOLTAJE DEL GENERADOR',
      sistema: 'SIS_MODULO_CONTROL',
      tipo: 'MEDICION',
      orden: 17,
      parametro: 'GEN_VOLTAJE_SALIDA',
      instrucciones: 'Medir voltaje de salida del generador. Rango normal: 215-230 V'
    },
    {
      codigo: 'GCR_MED_07',
      desc: 'FRECUENCIA DEL GENERADOR',
      sistema: 'SIS_MODULO_CONTROL',
      tipo: 'MEDICION',
      orden: 18,
      parametro: 'GEN_FRECUENCIA',
      instrucciones: 'Medir frecuencia del generador. Rango normal: 59-61 Hz'
    },
    {
      codigo: 'GCR_MED_08',
      desc: 'CORRIENTE DEL GENERADOR',
      sistema: 'SIS_MODULO_CONTROL',
      tipo: 'MEDICION',
      orden: 19,
      parametro: 'GEN_CORRIENTE',
      instrucciones: 'Medir corriente de salida del generador en amperios'
    },
  ];

  let count = 0;
  for (const act of actividades) {
    const idSistema = await getSistema(act.sistema);
    const idParametro = (act as any).parametro ? await getParametro((act as any).parametro) : null;

    // Buscar si ya existe
    const existente = await prisma.catalogo_actividades.findFirst({
      where: { codigo_actividad: act.codigo }
    });

    if (existente) {
      await prisma.catalogo_actividades.update({
        where: { id_actividad_catalogo: existente.id_actividad_catalogo },
        data: {
          descripcion_actividad: act.desc,
          instrucciones: act.instrucciones,
          activo: true
        }
      });
    } else {
      await prisma.catalogo_actividades.create({
        data: {
          codigo_actividad: act.codigo,
          descripcion_actividad: act.desc,
          id_tipo_servicio: tipoServicio.id_tipo_servicio,
          id_sistema: idSistema,
          tipo_actividad: act.tipo as any,
          orden_ejecucion: act.orden,
          es_obligatoria: act.tipo === 'MEDICION' ? false : true,
          id_parametro_medicion: idParametro,
          instrucciones: act.instrucciones,
          activo: true,
        },
      });
    }
    count++;
    log(`  ${act.codigo}: ${act.desc}`, 'success');
  }

  log(`\nGEN_CORR: ${count} actividades insertadas`, 'success');
}

// ============================================================================
// PASO 3: VERIFICACIÓN
// ============================================================================

async function verificarInsertados() {
  separator('PASO 3: VERIFICACIÓN');

  const tipoServicio = await prisma.tipos_servicio.findUnique({
    where: { codigo_tipo: 'GEN_CORR' },
    include: {
      catalogo_actividades: {
        where: { activo: true },
        orderBy: { orden_ejecucion: 'asc' },
      },
    },
  });

  if (!tipoServicio) {
    log('ERROR: Tipo servicio GEN_CORR no encontrado', 'error');
    return;
  }

  console.log('\n📊 RESUMEN DE INSERCIÓN:');
  console.log(`   Tipo Servicio: ${tipoServicio.nombre_tipo}`);
  console.log(`   Código: ${tipoServicio.codigo_tipo}`);
  console.log(`   Categoría: ${tipoServicio.categoria}`);
  console.log(`   Actividades: ${tipoServicio.catalogo_actividades.length}`);

  console.log('\n📋 ACTIVIDADES POR TIPO:');

  const porTipo = tipoServicio.catalogo_actividades.reduce((acc: any, act) => {
    acc[act.tipo_actividad] = (acc[act.tipo_actividad] || 0) + 1;
    return acc;
  }, {});

  Object.entries(porTipo).forEach(([tipo, count]) => {
    console.log(`   ${tipo}: ${count}`);
  });

  const conMedicion = tipoServicio.catalogo_actividades.filter(
    (a) => a.id_parametro_medicion !== null
  );
  console.log(`\n📏 Actividades con parámetro de medición: ${conMedicion.length}`);

  log('\n✅ Verificación completada exitosamente', 'success');
}

// ============================================================================
// EJECUCIÓN PRINCIPAL
// ============================================================================

async function main() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║   SEED: SERVICIO CORRECTIVO GENERADORES (GEN_CORR)          ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  try {
    await insertarTipoServicioCorrectivo();
    await insertarActividadesCorrectivo();
    await verificarInsertados();

    separator('EJECUCIÓN COMPLETADA');
    log('Tipo de servicio GEN_CORR listo para uso', 'success');
    log('Próximo paso: Ejecutar backend y crear órdenes de prueba', 'info');
  } catch (error) {
    console.error('\n❌ ERROR:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
