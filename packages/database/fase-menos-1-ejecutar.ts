/**
 * FASE -1: LIMPIEZA Y PREPARACIÓN DE BD SUPABASE
 * ================================================
 * Ejecutar con: npx ts-node scripts/fase-menos-1-ejecutar.ts
 * 
 * Este script:
 * 1. Diagnostica el estado actual de la BD
 * 2. Limpia datos de prueba
 * 3. Inserta catálogos correctos según formatos reales de Mekanos
 * 4. Verifica integridad
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['warn', 'error'],
});

// ============================================================================
// UTILIDADES
// ============================================================================

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
// PASO 1: DIAGNÓSTICO
// ============================================================================

async function diagnostico() {
  separator('PASO 1: DIAGNÓSTICO INICIAL');

  const counts = {
    tipos_servicio: await prisma.tipos_servicio.count({ where: { activo: true } }),
    sistemas: await prisma.catalogo_sistemas.count({ where: { activo: true } }),
    parametros: await prisma.parametros_medicion.count({ where: { activo: true } }),
    actividades: await prisma.catalogo_actividades.count({ where: { activo: true } }),
    estados_orden: await prisma.estados_orden.count({ where: { activo: true } }),
    personas: await prisma.personas.count(),
    clientes: await prisma.clientes.count(),
    equipos: await prisma.equipos.count({ where: { activo: true } }),
    ordenes: await prisma.ordenes_servicio.count(),
  };

  console.log('\nEstado actual de tablas:');
  console.log(`  Tipos de Servicio: ${counts.tipos_servicio}`);
  console.log(`  Sistemas:          ${counts.sistemas}`);
  console.log(`  Parámetros:        ${counts.parametros}`);
  console.log(`  Actividades:       ${counts.actividades}`);
  console.log(`  Estados Orden:     ${counts.estados_orden}`);
  console.log(`  Personas:          ${counts.personas}`);
  console.log(`  Clientes:          ${counts.clientes}`);
  console.log(`  Equipos:           ${counts.equipos}`);
  console.log(`  Órdenes:           ${counts.ordenes}`);

  // Buscar datos de prueba
  const personasPrueba = await prisma.personas.findMany({
    where: {
      numero_identificacion: {
        in: ['12345678', '900123456', '900123456-1', '900123456-7', '800987654-3', '1234567890', '9876543210']
      }
    },
    select: { id_persona: true, numero_identificacion: true }
  });

  const equiposPrueba = await prisma.equipos.findMany({
    where: {
      OR: [
        { codigo_equipo: { contains: 'TEST' } },
        { nombre_equipo: { contains: 'Test' } }
      ]
    },
    select: { id_equipo: true, codigo_equipo: true }
  });

  console.log(`\nDatos de prueba detectados:`);
  console.log(`  Personas test: ${personasPrueba.length}`);
  console.log(`  Equipos test:  ${equiposPrueba.length}`);

  return counts;
}

// ============================================================================
// PASO 2: LIMPIEZA (Solo identificación - limpieza manual si es necesario)
// ============================================================================

async function limpieza() {
  separator('PASO 2: IDENTIFICACIÓN DE DATOS DE PRUEBA');

  // Identificar órdenes de prueba (no eliminar automáticamente por constraints)
  const ordenesPrueba = await prisma.ordenes_servicio.findMany({
    where: {
      OR: [
        { numero_orden: { startsWith: 'OS-2025-001' } },
        { numero_orden: { startsWith: 'TEST-' } },
      ]
    },
    select: { id_orden_servicio: true, numero_orden: true }
  });

  if (ordenesPrueba.length > 0) {
    log(`Órdenes de prueba detectadas: ${ordenesPrueba.length}`, 'warn');
    ordenesPrueba.forEach((o: any) => console.log(`    - ${o.numero_orden}`));
    log('NOTA: Limpieza manual recomendada desde Supabase Dashboard', 'info');
  } else {
    log('No hay órdenes de prueba', 'success');
  }

  // Identificar equipos de prueba
  const equiposPrueba = await prisma.equipos.findMany({
    where: {
      OR: [
        { codigo_equipo: { contains: 'TEST' } },
      ]
    },
    select: { id_equipo: true, codigo_equipo: true }
  });

  if (equiposPrueba.length > 0) {
    log(`Equipos de prueba detectados: ${equiposPrueba.length}`, 'warn');
    equiposPrueba.forEach((e: any) => console.log(`    - ${e.codigo_equipo}`));
  } else {
    log('No hay equipos de prueba', 'success');
  }

  log('Identificación completada - Procediendo con inserción de catálogos', 'info');
}

// ============================================================================
// PASO 3: INSERTAR TIPOS DE SERVICIO
// ============================================================================

async function insertarTiposServicio() {
  separator('PASO 3: TIPOS DE SERVICIO');

  // Obtener IDs de tipos de equipo para vinculación
  const tipoGen = await prisma.tipos_equipo.findUnique({ where: { codigo_tipo: 'GEN' } });
  const tipoBomba = await prisma.tipos_equipo.findUnique({ where: { codigo_tipo: 'BOM' } });
  const tipoMotor = await prisma.tipos_equipo.findUnique({ where: { codigo_tipo: 'MOT' } });

  const tipos = [
    {
      codigo_tipo: 'GEN_PREV_A',
      nombre_tipo: 'Preventivo Tipo A - Generador',
      categoria: 'PREVENTIVO',
      id_tipo_equipo: tipoGen?.id_tipo_equipo,
      tiene_checklist: true,
      requiere_mediciones: true,
      duracion_estimada_horas: 2.5
    },
    {
      codigo_tipo: 'GEN_PREV_B',
      nombre_tipo: 'Preventivo Tipo B - Generador',
      categoria: 'PREVENTIVO',
      id_tipo_equipo: tipoGen?.id_tipo_equipo,
      tiene_checklist: true,
      requiere_mediciones: true,
      duracion_estimada_horas: 4.0
    },
    {
      codigo_tipo: 'BOM_PREV_A',
      nombre_tipo: 'Preventivo Tipo A - Bomba',
      categoria: 'PREVENTIVO',
      id_tipo_equipo: tipoBomba?.id_tipo_equipo,
      tiene_checklist: true,
      requiere_mediciones: true,
      duracion_estimada_horas: 2.0
    },
    {
      codigo_tipo: 'CORRECTIVO',
      nombre_tipo: 'Mantenimiento Correctivo',
      categoria: 'CORRECTIVO',
      tiene_checklist: false,
      requiere_mediciones: true,
      duracion_estimada_horas: 3.0
    },
    {
      codigo_tipo: 'EMERGENCIA',
      nombre_tipo: 'Servicio de Emergencia',
      categoria: 'EMERGENCIA',
      tiene_checklist: false,
      requiere_mediciones: true,
      duracion_estimada_horas: 2.0
    },
    {
      codigo_tipo: 'INSPECCION',
      nombre_tipo: 'Visita de Inspección',
      categoria: 'DIAGNOSTICO',
      tiene_checklist: false,
      requiere_mediciones: false,
      duracion_estimada_horas: 1.5
    },
  ];

  for (const tipo of tipos) {
    await prisma.tipos_servicio.upsert({
      where: { codigo_tipo: tipo.codigo_tipo },
      update: {
        nombre_tipo: tipo.nombre_tipo,
        id_tipo_equipo: tipo.id_tipo_equipo,
        activo: true
      },
      create: { ...tipo, activo: true } as any,
    });
    log(`Tipo servicio: ${tipo.codigo_tipo} -> Equipo: ${tipo.id_tipo_equipo || 'TODOS'}`, 'success');
  }

  const count = await prisma.tipos_servicio.count({ where: { activo: true } });
  log(`Total tipos de servicio: ${count}`, 'info');
}

// ============================================================================
// PASO 4: INSERTAR SISTEMAS
// ============================================================================

async function insertarSistemas() {
  separator('PASO 4: SISTEMAS DE EQUIPOS');

  const sistemas = [
    { codigo_sistema: 'SIS_ENFRIAMIENTO', nombre_sistema: 'Sistema de Enfriamiento', orden_visualizacion: 1 },
    { codigo_sistema: 'SIS_ASPIRACION', nombre_sistema: 'Sistema de Aspiración', orden_visualizacion: 2 },
    { codigo_sistema: 'SIS_COMBUSTIBLE', nombre_sistema: 'Sistema de Combustible', orden_visualizacion: 3 },
    { codigo_sistema: 'SIS_LUBRICACION', nombre_sistema: 'Sistema de Lubricación', orden_visualizacion: 4 },
    { codigo_sistema: 'SIS_ESCAPE', nombre_sistema: 'Sistema de Escape', orden_visualizacion: 5 },
    { codigo_sistema: 'SIS_ELECTRICO_MOTOR', nombre_sistema: 'Sistema Eléctrico del Motor', orden_visualizacion: 6 },
    { codigo_sistema: 'SIS_MODULO_CONTROL', nombre_sistema: 'Módulo de Control', orden_visualizacion: 7 },
    { codigo_sistema: 'SIS_GENERAL', nombre_sistema: 'General', orden_visualizacion: 8 },
    { codigo_sistema: 'SIS_BOMBA', nombre_sistema: 'Sistema de Bomba', orden_visualizacion: 1 },
  ];

  for (const sis of sistemas) {
    await prisma.catalogo_sistemas.upsert({
      where: { codigo_sistema: sis.codigo_sistema },
      update: { nombre_sistema: sis.nombre_sistema, activo: true },
      create: { ...sis, activo: true } as any,
    });
    log(`Sistema: ${sis.codigo_sistema}`, 'success');
  }

  const count = await prisma.catalogo_sistemas.count({ where: { activo: true } });
  log(`Total sistemas: ${count}`, 'info');
}

// ============================================================================
// PASO 5: INSERTAR PARÁMETROS DE MEDICIÓN
// ============================================================================

async function insertarParametros() {
  separator('PASO 5: PARÁMETROS DE MEDICIÓN');

  const parametros = [
    // Generadores
    { codigo_parametro: 'GEN_RPM', nombre_parametro: 'Velocidad Motor (RPM)', unidad_medida: 'RPM', tipo_dato: 'NUMERICO', categoria: 'MECANICO', valor_minimo_normal: 1750, valor_maximo_normal: 1850, valor_minimo_critico: 1700, valor_maximo_critico: 1900 },
    { codigo_parametro: 'GEN_PRESION_ACEITE', nombre_parametro: 'Presión de Aceite', unidad_medida: 'PSI', tipo_dato: 'NUMERICO', categoria: 'MECANICO', valor_minimo_normal: 40, valor_maximo_normal: 80, valor_minimo_critico: 30, valor_maximo_critico: 90 },
    { codigo_parametro: 'GEN_TEMP_REFRIGERANTE', nombre_parametro: 'Temperatura Refrigerante', unidad_medida: '°C', tipo_dato: 'NUMERICO', categoria: 'MECANICO', valor_minimo_normal: 70, valor_maximo_normal: 95, valor_minimo_critico: 50, valor_maximo_critico: 110 },
    { codigo_parametro: 'GEN_VOLTAJE_BATERIA', nombre_parametro: 'Carga de Batería', unidad_medida: 'VDC', tipo_dato: 'NUMERICO', categoria: 'ELECTRICO', valor_minimo_normal: 12.5, valor_maximo_normal: 14.5, valor_minimo_critico: 11.5, valor_maximo_critico: 15.0 },
    { codigo_parametro: 'GEN_HOROMETRO', nombre_parametro: 'Horas de Trabajo', unidad_medida: 'Hrs', tipo_dato: 'NUMERICO', categoria: 'OPERACIONAL', valor_minimo_normal: null, valor_maximo_normal: null, valor_minimo_critico: null, valor_maximo_critico: null },
    { codigo_parametro: 'GEN_VOLTAJE_SALIDA', nombre_parametro: 'Voltaje del Generador', unidad_medida: 'V', tipo_dato: 'NUMERICO', categoria: 'ELECTRICO', valor_minimo_normal: 215, valor_maximo_normal: 230, valor_minimo_critico: 200, valor_maximo_critico: 240 },
    { codigo_parametro: 'GEN_FRECUENCIA', nombre_parametro: 'Frecuencia del Generador', unidad_medida: 'Hz', tipo_dato: 'NUMERICO', categoria: 'ELECTRICO', valor_minimo_normal: 59, valor_maximo_normal: 61, valor_minimo_critico: 57, valor_maximo_critico: 63 },
    { codigo_parametro: 'GEN_CORRIENTE', nombre_parametro: 'Corriente del Generador', unidad_medida: 'A', tipo_dato: 'NUMERICO', categoria: 'ELECTRICO', valor_minimo_normal: 0, valor_maximo_normal: null, valor_minimo_critico: 0, valor_maximo_critico: null },

    // Bombas
    { codigo_parametro: 'BOM_PRESION', nombre_parametro: 'Medición de Presiones', unidad_medida: 'PSI', tipo_dato: 'NUMERICO', categoria: 'HIDRAULICO', valor_minimo_normal: 40, valor_maximo_normal: 80, valor_minimo_critico: 20, valor_maximo_critico: 100 },
    { codigo_parametro: 'BOM_VOLTAJE', nombre_parametro: 'Medición de Voltaje', unidad_medida: 'V', tipo_dato: 'NUMERICO', categoria: 'ELECTRICO', valor_minimo_normal: 210, valor_maximo_normal: 230, valor_minimo_critico: 190, valor_maximo_critico: 250 },
    { codigo_parametro: 'BOM_AMPERAJE', nombre_parametro: 'Medición de Amperaje', unidad_medida: 'A', tipo_dato: 'NUMERICO', categoria: 'ELECTRICO', valor_minimo_normal: 5, valor_maximo_normal: 20, valor_minimo_critico: 0, valor_maximo_critico: 25 },
    { codigo_parametro: 'BOM_TEMPERATURA', nombre_parametro: 'Temperatura', unidad_medida: '°C', tipo_dato: 'NUMERICO', categoria: 'MECANICO', valor_minimo_normal: 40, valor_maximo_normal: 80, valor_minimo_critico: 30, valor_maximo_critico: 100 },
    { codigo_parametro: 'BOM_PRESION_ENCENDIDO', nombre_parametro: 'Presostato Presión Encendido', unidad_medida: 'PSI', tipo_dato: 'NUMERICO', categoria: 'HIDRAULICO', valor_minimo_normal: 20, valor_maximo_normal: 40, valor_minimo_critico: 10, valor_maximo_critico: 50 },
    { codigo_parametro: 'BOM_PRESION_APAGADO', nombre_parametro: 'Presostato Presión Apagado', unidad_medida: 'PSI', tipo_dato: 'NUMERICO', categoria: 'HIDRAULICO', valor_minimo_normal: 50, valor_maximo_normal: 80, valor_minimo_critico: 40, valor_maximo_critico: 100 },
    { codigo_parametro: 'BOM_PRESION_TANQUES', nombre_parametro: 'Presión Tanques', unidad_medida: 'PSI', tipo_dato: 'NUMERICO', categoria: 'HIDRAULICO', valor_minimo_normal: 15, valor_maximo_normal: 35, valor_minimo_critico: 10, valor_maximo_critico: 45 },
    { codigo_parametro: 'BOM_VIBRACION', nombre_parametro: 'Análisis de Vibración', unidad_medida: 'mm/s', tipo_dato: 'NUMERICO', categoria: 'MECANICO', valor_minimo_normal: 0, valor_maximo_normal: 4.5, valor_minimo_critico: 0, valor_maximo_critico: 7.1 },
  ];

  for (const param of parametros) {
    await prisma.parametros_medicion.upsert({
      where: { codigo_parametro: param.codigo_parametro },
      update: { nombre_parametro: param.nombre_parametro, activo: true },
      create: { ...param, activo: true, es_obligatorio: true } as any,
    });
    log(`Parámetro: ${param.codigo_parametro}`, 'success');
  }

  const count = await prisma.parametros_medicion.count({ where: { activo: true } });
  log(`Total parámetros: ${count}`, 'info');
}

// ============================================================================
// PASO 6: INSERTAR ACTIVIDADES - GEN_PREV_A (42 actividades)
// ============================================================================

async function insertarActividadesGenPrevA() {
  separator('PASO 6: ACTIVIDADES GEN_PREV_A (Formato Real)');

  const tipoServicio = await prisma.tipos_servicio.findUnique({ where: { codigo_tipo: 'GEN_PREV_A' } });
  if (!tipoServicio) throw new Error('Tipo servicio GEN_PREV_A no encontrado');

  const getSistema = async (codigo: string) => {
    const s = await prisma.catalogo_sistemas.findUnique({ where: { codigo_sistema: codigo } });
    return s?.id_sistema || null;
  };

  const getParametro = async (codigo: string) => {
    const p = await prisma.parametros_medicion.findUnique({ where: { codigo_parametro: codigo } });
    return p?.id_parametro_medicion || null;
  };

  // Según FORMATO_TIPO_A_GENERADORES.MD
  const actividades = [
    // SISTEMA DE ENFRIAMIENTO (7)
    { codigo: 'GPA_ENF_01', desc: 'REVISAR TAPA DE RADIADOR', sistema: 'SIS_ENFRIAMIENTO', tipo: 'INSPECCION', orden: 1 },
    { codigo: 'GPA_ENF_02', desc: 'REVISAR NIVEL DE REFRIGERANTE Y SU ESTADO', sistema: 'SIS_ENFRIAMIENTO', tipo: 'INSPECCION', orden: 2 },
    { codigo: 'GPA_ENF_03', desc: 'REVISAR FUGAS EN MANGUERAS, ABRAZADERAS, TUBERÍAS, RADIADOR', sistema: 'SIS_ENFRIAMIENTO', tipo: 'INSPECCION', orden: 3 },
    { codigo: 'GPA_ENF_04', desc: 'INSPECCIONAR ASPAS DEL VENTILADOR, GUARDAS Y SOPORTES', sistema: 'SIS_ENFRIAMIENTO', tipo: 'INSPECCION', orden: 4 },
    { codigo: 'GPA_ENF_05', desc: 'REVISAR PANAL DEL RADIADOR, LIMPIEZA, CONDICIÓN Y ESTADO', sistema: 'SIS_ENFRIAMIENTO', tipo: 'INSPECCION', orden: 5 },
    { codigo: 'GPA_ENF_06', desc: 'REVISAR ESTADO Y TENSIÓN DE LAS CORREAS', sistema: 'SIS_ENFRIAMIENTO', tipo: 'INSPECCION', orden: 6 },
    { codigo: 'GPA_ENF_07', desc: 'REVISAR Y LUBRICAR RODAMIENTOS DEL VENTILADOR, POLEAS Y POLEA TENSORA', sistema: 'SIS_ENFRIAMIENTO', tipo: 'LUBRICACION', orden: 7 },

    // SISTEMA DE ASPIRACIÓN (3)
    { codigo: 'GPA_ASP_01', desc: 'REVISAR ESTADO DE LOS FILTROS DE AIRE', sistema: 'SIS_ASPIRACION', tipo: 'INSPECCION', orden: 8 },
    { codigo: 'GPA_ASP_02', desc: 'APRETAR ABRAZADERAS, TUBERÍAS Y MANGUERAS DEL SISTEMA DE ADMISIÓN', sistema: 'SIS_ASPIRACION', tipo: 'AJUSTE', orden: 9 },
    { codigo: 'GPA_ASP_03', desc: 'INSPECCIÓN DE TURBOCARGADOR, ÁLABES Y ROTACIÓN LIBRE', sistema: 'SIS_ASPIRACION', tipo: 'INSPECCION', orden: 10 },

    // SISTEMA DE COMBUSTIBLE (7)
    { codigo: 'GPA_COMB_01', desc: 'REVISAR MANGUERAS, TUBERÍAS Y ABRAZADERAS DE ALIMENTACIÓN', sistema: 'SIS_COMBUSTIBLE', tipo: 'INSPECCION', orden: 11 },
    { codigo: 'GPA_COMB_02', desc: 'INSPECCIONAR SISTEMA RIEL COMÚN DE SUMINISTRO DE COMBUSTIBLE', sistema: 'SIS_COMBUSTIBLE', tipo: 'INSPECCION', orden: 12 },
    { codigo: 'GPA_COMB_03', desc: 'REVISAR OPERACIÓN Y ESTADO DE BOMBA DE TRANSFERENCIA', sistema: 'SIS_COMBUSTIBLE', tipo: 'INSPECCION', orden: 13 },
    { codigo: 'GPA_COMB_04', desc: 'INSPECCIÓN DE FILTROS, TRAMPAS SEPARADORAS, DRENAR CONDENSACIÓN', sistema: 'SIS_COMBUSTIBLE', tipo: 'INSPECCION', orden: 14 },
    { codigo: 'GPA_COMB_05', desc: 'INSPECCIONAR Y LUBRICAR ACTUADORES O SOLENOIDES', sistema: 'SIS_COMBUSTIBLE', tipo: 'LUBRICACION', orden: 15 },
    { codigo: 'GPA_COMB_06', desc: 'REVISAR NIVEL DE COMBUSTIBLE', sistema: 'SIS_COMBUSTIBLE', tipo: 'INSPECCION', orden: 16 },
    { codigo: 'GPA_COMB_07', desc: 'REVISAR TANQUE DE COMBUSTIBLE', sistema: 'SIS_COMBUSTIBLE', tipo: 'INSPECCION', orden: 17 },

    // SISTEMA DE LUBRICACIÓN (2)
    { codigo: 'GPA_LUB_01', desc: 'REVISAR NIVEL DE ACEITE', sistema: 'SIS_LUBRICACION', tipo: 'INSPECCION', orden: 18 },
    { codigo: 'GPA_LUB_02', desc: 'INSPECCIÓN POR FUGAS', sistema: 'SIS_LUBRICACION', tipo: 'INSPECCION', orden: 19 },

    // SISTEMA DE ESCAPE (2)
    { codigo: 'GPA_ESC_01', desc: 'INSPECCIÓN VISUAL A TUBOS DE ESCAPE, CONEXIONES, ABRAZADERAS', sistema: 'SIS_ESCAPE', tipo: 'INSPECCION', orden: 20 },
    { codigo: 'GPA_ESC_02', desc: 'REVISAR CONDICIÓN EXTERNA DEL TURBOCARGADOR', sistema: 'SIS_ESCAPE', tipo: 'INSPECCION', orden: 21 },

    // SISTEMA ELÉCTRICO DEL MOTOR (7)
    { codigo: 'GPA_ELEC_01', desc: 'REVISAR ESTADO DEL CABLEADO, CONEXIONES, TERMINALES', sistema: 'SIS_ELECTRICO_MOTOR', tipo: 'INSPECCION', orden: 22 },
    { codigo: 'GPA_ELEC_02', desc: 'REVISAR AMARRES Y PUNTOS DE SUJECIÓN DEL CABLEADO', sistema: 'SIS_ELECTRICO_MOTOR', tipo: 'INSPECCION', orden: 23 },
    { codigo: 'GPA_ELEC_03', desc: 'REVISAR CARGADOR DE BATERÍA', sistema: 'SIS_ELECTRICO_MOTOR', tipo: 'INSPECCION', orden: 24 },
    { codigo: 'GPA_ELEC_04', desc: 'REVISAR ELECTROLITOS DE BATERÍA', sistema: 'SIS_ELECTRICO_MOTOR', tipo: 'INSPECCION', orden: 25 },
    { codigo: 'GPA_ELEC_05', desc: 'REVISAR SISTEMA DE CARGA DE BATERÍAS', sistema: 'SIS_ELECTRICO_MOTOR', tipo: 'INSPECCION', orden: 26 },
    { codigo: 'GPA_ELEC_06', desc: 'REVISAR VOLTAJE DE ALTERNADOR', sistema: 'SIS_ELECTRICO_MOTOR', tipo: 'INSPECCION', orden: 27 },
    { codigo: 'GPA_ELEC_07', desc: 'LIMPIEZA Y AJUSTE DE BORNES', sistema: 'SIS_ELECTRICO_MOTOR', tipo: 'LIMPIEZA', orden: 28 },

    // MÓDULO DE CONTROL / MEDICIONES (9)
    { codigo: 'GPA_CTRL_01', desc: 'REVISAR INSTRUMENTOS Y CONTROLES', sistema: 'SIS_MODULO_CONTROL', tipo: 'INSPECCION', orden: 29 },
    { codigo: 'GPA_CTRL_02', desc: 'VELOCIDAD DE MOTOR (R.P.M)', sistema: 'SIS_MODULO_CONTROL', tipo: 'MEDICION', orden: 30, parametro: 'GEN_RPM' },
    { codigo: 'GPA_CTRL_03', desc: 'PRESIÓN DE ACEITE', sistema: 'SIS_MODULO_CONTROL', tipo: 'MEDICION', orden: 31, parametro: 'GEN_PRESION_ACEITE' },
    { codigo: 'GPA_CTRL_04', desc: 'TEMPERATURA DE REFRIGERANTE', sistema: 'SIS_MODULO_CONTROL', tipo: 'MEDICION', orden: 32, parametro: 'GEN_TEMP_REFRIGERANTE' },
    { codigo: 'GPA_CTRL_05', desc: 'CARGA DE BATERÍA', sistema: 'SIS_MODULO_CONTROL', tipo: 'MEDICION', orden: 33, parametro: 'GEN_VOLTAJE_BATERIA' },
    { codigo: 'GPA_CTRL_06', desc: 'HORAS DE TRABAJO', sistema: 'SIS_MODULO_CONTROL', tipo: 'MEDICION', orden: 34, parametro: 'GEN_HOROMETRO' },
    { codigo: 'GPA_CTRL_07', desc: 'VOLTAJE DEL GENERADOR (V)', sistema: 'SIS_MODULO_CONTROL', tipo: 'MEDICION', orden: 35, parametro: 'GEN_VOLTAJE_SALIDA' },
    { codigo: 'GPA_CTRL_08', desc: 'FRECUENCIA DEL GENERADOR (Hz)', sistema: 'SIS_MODULO_CONTROL', tipo: 'MEDICION', orden: 36, parametro: 'GEN_FRECUENCIA' },
    { codigo: 'GPA_CTRL_09', desc: 'CORRIENTE DEL GENERADOR (AMPERIOS)', sistema: 'SIS_MODULO_CONTROL', tipo: 'MEDICION', orden: 37, parametro: 'GEN_CORRIENTE' },

    // GENERAL (5)
    { codigo: 'GPA_GEN_01', desc: 'EL EQUIPO REQUIERE PINTURA (SI/NO)', sistema: 'SIS_GENERAL', tipo: 'VERIFICACION', orden: 38 },
    { codigo: 'GPA_GEN_02', desc: 'EL EQUIPO CUENTA CON CARGADOR DE BATERÍA (SI/NO)', sistema: 'SIS_GENERAL', tipo: 'VERIFICACION', orden: 39 },
    { codigo: 'GPA_GEN_03', desc: 'EL CUARTO DE MÁQUINAS CUENTA CON BOMBA DE TRASIEGO (SI/NO)', sistema: 'SIS_GENERAL', tipo: 'VERIFICACION', orden: 40 },
    { codigo: 'GPA_GEN_04', desc: 'EL CUARTO DE MÁQUINAS SE ENCUENTRA ASEADO Y ORDENADO (SI/NO)', sistema: 'SIS_GENERAL', tipo: 'VERIFICACION', orden: 41 },
    { codigo: 'GPA_GEN_05', desc: 'EL CUARTO DE MÁQUINAS CUENTA CON BUENA ILUMINACIÓN (SI/NO)', sistema: 'SIS_GENERAL', tipo: 'VERIFICACION', orden: 42 },
  ];

  let count = 0;
  for (const act of actividades) {
    const idSistema = await getSistema(act.sistema);
    const idParametro = act.parametro ? await getParametro(act.parametro) : null;

    await prisma.catalogo_actividades.upsert({
      where: { codigo_actividad: act.codigo },
      update: { descripcion_actividad: act.desc, activo: true },
      create: {
        codigo_actividad: act.codigo,
        descripcion_actividad: act.desc,
        id_tipo_servicio: tipoServicio.id_tipo_servicio,
        id_sistema: idSistema,
        tipo_actividad: act.tipo as any,
        orden_ejecucion: act.orden,
        es_obligatoria: true,
        id_parametro_medicion: idParametro,
        activo: true,
      },
    });
    count++;
  }

  log(`GEN_PREV_A: ${count} actividades insertadas`, 'success');
}

// ============================================================================
// PASO 7: INSERTAR ACTIVIDADES - GEN_PREV_B (28 actividades según formato real)
// ============================================================================

async function insertarActividadesGenPrevB() {
  separator('PASO 7: ACTIVIDADES GEN_PREV_B (Formato Real)');

  const tipoServicio = await prisma.tipos_servicio.findUnique({ where: { codigo_tipo: 'GEN_PREV_B' } });
  if (!tipoServicio) throw new Error('Tipo servicio GEN_PREV_B no encontrado');

  const getSistema = async (codigo: string) => {
    const s = await prisma.catalogo_sistemas.findUnique({ where: { codigo_sistema: codigo } });
    return s?.id_sistema || null;
  };

  const getParametro = async (codigo: string) => {
    const p = await prisma.parametros_medicion.findUnique({ where: { codigo_parametro: codigo } });
    return p?.id_parametro_medicion || null;
  };

  // Según FORMATO_TIPO_B_GENERADORES.MD - Exactamente como está en el documento
  const actividades = [
    // SISTEMA DE ENFRIAMIENTO (6)
    { codigo: 'GPB_ENF_01', desc: 'REVISAR TAPA DE RADIADOR', sistema: 'SIS_ENFRIAMIENTO', tipo: 'INSPECCION', orden: 1 },
    { codigo: 'GPB_ENF_02', desc: 'REALIZAR CAMBIO DE REFRIGERANTE', sistema: 'SIS_ENFRIAMIENTO', tipo: 'CAMBIO', orden: 2 },
    { codigo: 'GPB_ENF_03', desc: 'REVISAR FUGAS EN MANGUERAS, ABRAZADERAS, TUBERÍAS, RADIADOR', sistema: 'SIS_ENFRIAMIENTO', tipo: 'INSPECCION', orden: 3 },
    { codigo: 'GPB_ENF_04', desc: 'INSPECCIONAR ASPAS DEL VENTILADOR, GUARDAS Y SOPORTES', sistema: 'SIS_ENFRIAMIENTO', tipo: 'INSPECCION', orden: 4 },
    { codigo: 'GPB_ENF_05', desc: 'REVISAR PANAL DEL RADIADOR, LIMPIEZA, CONDICIÓN Y ESTADO', sistema: 'SIS_ENFRIAMIENTO', tipo: 'INSPECCION', orden: 5 },
    { codigo: 'GPB_ENF_06', desc: 'REVISAR ESTADO Y TENSIÓN DE LAS CORREAS', sistema: 'SIS_ENFRIAMIENTO', tipo: 'INSPECCION', orden: 6 },

    // SISTEMA DE ASPIRACIÓN (1)
    { codigo: 'GPB_ASP_01', desc: 'REALIZAR CAMBIO DE FILTROS DE AIRE', sistema: 'SIS_ASPIRACION', tipo: 'CAMBIO', orden: 7 },

    // SISTEMA DE COMBUSTIBLE (5)
    { codigo: 'GPB_COMB_01', desc: 'REVISAR MANGUERAS, TUBERÍAS Y ABRAZADERAS DE ALIMENTACIÓN', sistema: 'SIS_COMBUSTIBLE', tipo: 'INSPECCION', orden: 8 },
    { codigo: 'GPB_COMB_02', desc: 'INSPECCIONAR SISTEMA RIEL COMÚN DE SUMINISTRO DE COMBUSTIBLE', sistema: 'SIS_COMBUSTIBLE', tipo: 'INSPECCION', orden: 9 },
    { codigo: 'GPB_COMB_03', desc: 'REVISAR OPERACIÓN Y ESTADO DE BOMBA DE TRANSFERENCIA', sistema: 'SIS_COMBUSTIBLE', tipo: 'INSPECCION', orden: 10 },
    { codigo: 'GPB_COMB_04', desc: 'REALIZAR CAMBIO DE FILTRO DE COMBUSTIBLE', sistema: 'SIS_COMBUSTIBLE', tipo: 'CAMBIO', orden: 11 },
    { codigo: 'GPB_COMB_05', desc: 'REVISAR NIVEL DE COMBUSTIBLE', sistema: 'SIS_COMBUSTIBLE', tipo: 'INSPECCION', orden: 12 },

    // SISTEMA DE LUBRICACIÓN (3)
    { codigo: 'GPB_LUB_01', desc: 'REALIZAR CAMBIO DE ACEITE', sistema: 'SIS_LUBRICACION', tipo: 'CAMBIO', orden: 13 },
    { codigo: 'GPB_LUB_02', desc: 'REALIZAR CAMBIO DE FILTRO DE ACEITE', sistema: 'SIS_LUBRICACION', tipo: 'CAMBIO', orden: 14 },
    { codigo: 'GPB_LUB_03', desc: 'INSPECCIÓN POR FUGAS', sistema: 'SIS_LUBRICACION', tipo: 'INSPECCION', orden: 15 },

    // SISTEMA ELÉCTRICO (5)
    { codigo: 'GPB_ELEC_01', desc: 'REVISAR CARGADOR DE BATERÍA', sistema: 'SIS_ELECTRICO_MOTOR', tipo: 'INSPECCION', orden: 16 },
    { codigo: 'GPB_ELEC_02', desc: 'REVISAR ELECTROLITOS DE BATERÍA', sistema: 'SIS_ELECTRICO_MOTOR', tipo: 'INSPECCION', orden: 17 },
    { codigo: 'GPB_ELEC_03', desc: 'REVISAR SISTEMA DE CARGA DE BATERÍAS', sistema: 'SIS_ELECTRICO_MOTOR', tipo: 'INSPECCION', orden: 18 },
    { codigo: 'GPB_ELEC_04', desc: 'LIMPIEZA Y AJUSTE DE BORNES', sistema: 'SIS_ELECTRICO_MOTOR', tipo: 'LIMPIEZA', orden: 19 },
    { codigo: 'GPB_ELEC_05', desc: 'REVISAR INSTRUMENTOS Y CONTROLES', sistema: 'SIS_ELECTRICO_MOTOR', tipo: 'INSPECCION', orden: 20 },

    // MÓDULO DE CONTROL / MEDICIONES (8)
    { codigo: 'GPB_CTRL_01', desc: 'VELOCIDAD DE MOTOR (R.P.M)', sistema: 'SIS_MODULO_CONTROL', tipo: 'MEDICION', orden: 21, parametro: 'GEN_RPM' },
    { codigo: 'GPB_CTRL_02', desc: 'PRESIÓN DE ACEITE', sistema: 'SIS_MODULO_CONTROL', tipo: 'MEDICION', orden: 22, parametro: 'GEN_PRESION_ACEITE' },
    { codigo: 'GPB_CTRL_03', desc: 'TEMPERATURA DE REFRIGERANTE', sistema: 'SIS_MODULO_CONTROL', tipo: 'MEDICION', orden: 23, parametro: 'GEN_TEMP_REFRIGERANTE' },
    { codigo: 'GPB_CTRL_04', desc: 'CARGA DE BATERÍA', sistema: 'SIS_MODULO_CONTROL', tipo: 'MEDICION', orden: 24, parametro: 'GEN_VOLTAJE_BATERIA' },
    { codigo: 'GPB_CTRL_05', desc: 'HORAS DE TRABAJO', sistema: 'SIS_MODULO_CONTROL', tipo: 'MEDICION', orden: 25, parametro: 'GEN_HOROMETRO' },
    { codigo: 'GPB_CTRL_06', desc: 'VOLTAJE DEL GENERADOR (V)', sistema: 'SIS_MODULO_CONTROL', tipo: 'MEDICION', orden: 26, parametro: 'GEN_VOLTAJE_SALIDA' },
    { codigo: 'GPB_CTRL_07', desc: 'FRECUENCIA DEL GENERADOR (Hz)', sistema: 'SIS_MODULO_CONTROL', tipo: 'MEDICION', orden: 27, parametro: 'GEN_FRECUENCIA' },
    { codigo: 'GPB_CTRL_08', desc: 'CORRIENTE DEL GENERADOR (AMPERIOS)', sistema: 'SIS_MODULO_CONTROL', tipo: 'MEDICION', orden: 28, parametro: 'GEN_CORRIENTE' },
  ];

  let count = 0;
  for (const act of actividades) {
    const idSistema = await getSistema(act.sistema);
    const idParametro = act.parametro ? await getParametro(act.parametro) : null;

    await prisma.catalogo_actividades.upsert({
      where: { codigo_actividad: act.codigo },
      update: { descripcion_actividad: act.desc, activo: true },
      create: {
        codigo_actividad: act.codigo,
        descripcion_actividad: act.desc,
        id_tipo_servicio: tipoServicio.id_tipo_servicio,
        id_sistema: idSistema,
        tipo_actividad: act.tipo as any,
        orden_ejecucion: act.orden,
        es_obligatoria: true,
        id_parametro_medicion: idParametro,
        activo: true,
      },
    });
    count++;
  }

  log(`GEN_PREV_B: ${count} actividades insertadas`, 'success');
}

// ============================================================================
// PASO 8: INSERTAR ACTIVIDADES - BOM_PREV_A (25 actividades según formato real)
// ============================================================================

async function insertarActividadesBomPrevA() {
  separator('PASO 8: ACTIVIDADES BOM_PREV_A (Formato Real)');

  const tipoServicio = await prisma.tipos_servicio.findUnique({ where: { codigo_tipo: 'BOM_PREV_A' } });
  if (!tipoServicio) throw new Error('Tipo servicio BOM_PREV_A no encontrado');

  const getSistema = async (codigo: string) => {
    const s = await prisma.catalogo_sistemas.findUnique({ where: { codigo_sistema: codigo } });
    return s?.id_sistema || null;
  };

  const getParametro = async (codigo: string) => {
    const p = await prisma.parametros_medicion.findUnique({ where: { codigo_parametro: codigo } });
    return p?.id_parametro_medicion || null;
  };

  // Según FORMATO_TIPO_A_BOMBAS.MD - EXACTAMENTE como está en el documento (25 actividades)
  const actividades = [
    { codigo: 'BPA_01', desc: 'LIMPIEZA GENERAL DEL SISTEMA', sistema: 'SIS_BOMBA', tipo: 'LIMPIEZA', orden: 1 },
    { codigo: 'BPA_02', desc: 'ANÁLISIS DE VIBRACIÓN Y RUIDO EN RODAMIENTOS', sistema: 'SIS_BOMBA', tipo: 'MEDICION', orden: 2, parametro: 'BOM_VIBRACION' },
    { codigo: 'BPA_03', desc: 'MEDICIÓN DE LAS PRESIONES', sistema: 'SIS_BOMBA', tipo: 'MEDICION', orden: 3, parametro: 'BOM_PRESION' },
    { codigo: 'BPA_04', desc: 'MEDICIÓN DE VOLTAJE', sistema: 'SIS_BOMBA', tipo: 'MEDICION', orden: 4, parametro: 'BOM_VOLTAJE' },
    { codigo: 'BPA_05', desc: 'MEDICIÓN DE AMPERAJE', sistema: 'SIS_BOMBA', tipo: 'MEDICION', orden: 5, parametro: 'BOM_AMPERAJE' },
    { codigo: 'BPA_06', desc: 'TEMPERATURA', sistema: 'SIS_BOMBA', tipo: 'MEDICION', orden: 6, parametro: 'BOM_TEMPERATURA' },
    { codigo: 'BPA_07', desc: 'REVISIÓN DE FUGAS EN BOMBAS, TANQUES Y TUBERÍA INMEDIATA', sistema: 'SIS_BOMBA', tipo: 'INSPECCION', orden: 7 },
    { codigo: 'BPA_08', desc: 'LIMPIEZA Y REVISIÓN DE FUNCIONAMIENTO DEL TABLERO DE CONTROL', sistema: 'SIS_BOMBA', tipo: 'LIMPIEZA', orden: 8 },
    { codigo: 'BPA_09', desc: 'RETORQUEO DE CONEXIONES EN EL TABLERO', sistema: 'SIS_BOMBA', tipo: 'AJUSTE', orden: 9 },
    { codigo: 'BPA_10', desc: 'ESTADO DE JUAN OMEGA', sistema: 'SIS_BOMBA', tipo: 'INSPECCION', orden: 10 },
    { codigo: 'BPA_11', desc: 'ENGRASAR PUNTOS DE LUBRICACIÓN', sistema: 'SIS_BOMBA', tipo: 'LUBRICACION', orden: 11 },
    { codigo: 'BPA_12', desc: 'REVISAR SELLO MECÁNICO', sistema: 'SIS_BOMBA', tipo: 'INSPECCION', orden: 12 },
    { codigo: 'BPA_13', desc: 'AJUSTAR Y REVISAR SELLO TIPO PRENSA', sistema: 'SIS_BOMBA', tipo: 'AJUSTE', orden: 13 },
    { codigo: 'BPA_14', desc: 'REVISAR FUNCIONAMIENTO PRESOSTATO', sistema: 'SIS_BOMBA', tipo: 'INSPECCION', orden: 14 },
    { codigo: 'BPA_15', desc: 'PRESOSTATO PRESIÓN DE ENCENDIDO PSI', sistema: 'SIS_BOMBA', tipo: 'MEDICION', orden: 15, parametro: 'BOM_PRESION_ENCENDIDO' },
    { codigo: 'BPA_16', desc: 'PRESOSTATO PRESIÓN DE APAGADO PSI', sistema: 'SIS_BOMBA', tipo: 'MEDICION', orden: 16, parametro: 'BOM_PRESION_APAGADO' },
    { codigo: 'BPA_17', desc: 'LIMPIAR SEÑAL HIDRÁULICA DE PRESOSTATO', sistema: 'SIS_BOMBA', tipo: 'LIMPIEZA', orden: 17 },
    { codigo: 'BPA_18', desc: 'PROBAR SWITCH NIVEL DE PROTECCIÓN ENCENDIDO Y APAGADO', sistema: 'SIS_BOMBA', tipo: 'INSPECCION', orden: 18 },
    { codigo: 'BPA_19', desc: 'ABRIR Y CERRAR VÁLVULAS DE OPERACIÓN DEL SISTEMA', sistema: 'SIS_BOMBA', tipo: 'INSPECCION', orden: 19 },
    { codigo: 'BPA_20', desc: 'REVISAR PRESIÓN DE LOS TANQUES, PSI', sistema: 'SIS_BOMBA', tipo: 'MEDICION', orden: 20, parametro: 'BOM_PRESION_TANQUES' },
    { codigo: 'BPA_21', desc: 'VERIFICAR QUE LAS MEMBRANAS NO ESTÉN LLENAS DE AGUA', sistema: 'SIS_BOMBA', tipo: 'INSPECCION', orden: 21 },
    { codigo: 'BPA_22', desc: 'SE DEBE O NO CAMBIAR TANQUE, ¿POR QUÉ?', sistema: 'SIS_BOMBA', tipo: 'VERIFICACION', orden: 22 },
    { codigo: 'BPA_23', desc: 'EL SISTEMA TIENE O NO VÁLVULA DE PURGA', sistema: 'SIS_BOMBA', tipo: 'VERIFICACION', orden: 23 },
    { codigo: 'BPA_24', desc: 'LAS BOMBAS TIENEN VÁLVULAS DE PURGA Y CEBADO', sistema: 'SIS_BOMBA', tipo: 'VERIFICACION', orden: 24 },
    { codigo: 'BPA_25', desc: 'PRUEBA GENERAL DEL SISTEMA', sistema: 'SIS_BOMBA', tipo: 'INSPECCION', orden: 25 },
  ];

  let count = 0;
  for (const act of actividades) {
    const idSistema = await getSistema(act.sistema);
    const idParametro = act.parametro ? await getParametro(act.parametro) : null;

    await prisma.catalogo_actividades.upsert({
      where: { codigo_actividad: act.codigo },
      update: { descripcion_actividad: act.desc, activo: true },
      create: {
        codigo_actividad: act.codigo,
        descripcion_actividad: act.desc,
        id_tipo_servicio: tipoServicio.id_tipo_servicio,
        id_sistema: idSistema,
        tipo_actividad: act.tipo as any,
        orden_ejecucion: act.orden,
        es_obligatoria: true,
        id_parametro_medicion: idParametro,
        activo: true,
      },
    });
    count++;
  }

  log(`BOM_PREV_A: ${count} actividades insertadas`, 'success');
}

// ============================================================================
// PASO 9: VERIFICACIÓN FINAL
// ============================================================================

async function verificacionFinal() {
  separator('PASO 9: VERIFICACIÓN FINAL');

  const tiposServicio = await prisma.tipos_servicio.count({ where: { activo: true } });
  const sistemas = await prisma.catalogo_sistemas.count({ where: { activo: true } });
  const parametros = await prisma.parametros_medicion.count({ where: { activo: true } });

  const actGenA = await prisma.catalogo_actividades.count({
    where: {
      activo: true,
      tipos_servicio: { codigo_tipo: 'GEN_PREV_A' }
    }
  });

  const actGenB = await prisma.catalogo_actividades.count({
    where: {
      activo: true,
      tipos_servicio: { codigo_tipo: 'GEN_PREV_B' }
    }
  });

  const actBomA = await prisma.catalogo_actividades.count({
    where: {
      activo: true,
      tipos_servicio: { codigo_tipo: 'BOM_PREV_A' }
    }
  });

  // Contar mediciones con parámetro vinculado
  const medicionesConParam = await prisma.catalogo_actividades.count({
    where: {
      activo: true,
      tipo_actividad: 'MEDICION',
      id_parametro_medicion: { not: null }
    }
  });

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║              RESULTADOS FASE -1                              ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  Tipos de Servicio:     ${String(tiposServicio).padStart(3)} (mínimo 6)                      ║`);
  console.log(`║  Sistemas:              ${String(sistemas).padStart(3)} (mínimo 9)                      ║`);
  console.log(`║  Parámetros Medición:   ${String(parametros).padStart(3)} (mínimo 16)                     ║`);
  console.log(`║  Actividades GEN_A:     ${String(actGenA).padStart(3)} (esperado 42)                    ║`);
  console.log(`║  Actividades GEN_B:     ${String(actGenB).padStart(3)} (esperado 28)                    ║`);
  console.log(`║  Actividades BOM_A:     ${String(actBomA).padStart(3)} (esperado 25)                    ║`);
  console.log(`║  Mediciones c/parámetro:${String(medicionesConParam).padStart(3)}                                  ║`);
  console.log('╠══════════════════════════════════════════════════════════════╣');

  const totalAct = actGenA + actGenB + actBomA;
  const todoOk = tiposServicio >= 6 && sistemas >= 9 && parametros >= 16 &&
    actGenA === 42 && actGenB === 28 && actBomA === 25;

  if (todoOk) {
    console.log('║                                                              ║');
    console.log('║  ✅ FASE -1 COMPLETADA EXITOSAMENTE                          ║');
    console.log('║                                                              ║');
    console.log(`║  Total actividades: ${totalAct} (42+28+25=95)                      ║`);
    console.log('║                                                              ║');
  } else {
    console.log('║                                                              ║');
    console.log('║  ⚠️  REVISAR DISCREPANCIAS                                   ║');
    console.log('║                                                              ║');
  }
  console.log('╚══════════════════════════════════════════════════════════════╝');
}

// ============================================================================
// PASO 9: ACTIVIDADES PARA CORRECTIVOS, EMERGENCIA E INSPECCIÓN
// ============================================================================

async function insertarActividadesCorrectivos() {
  separator('PASO 9: ACTIVIDADES PARA CORRECTIVOS/EMERGENCIA/INSPECCIÓN');

  // Obtener los tipos de servicio
  const tipoCorrectivo = await prisma.tipos_servicio.findUnique({ where: { codigo_tipo: 'CORRECTIVO' } });
  const tipoEmergencia = await prisma.tipos_servicio.findUnique({ where: { codigo_tipo: 'EMERGENCIA' } });
  const tipoInspeccion = await prisma.tipos_servicio.findUnique({ where: { codigo_tipo: 'INSPECCION' } });

  if (!tipoCorrectivo || !tipoEmergencia || !tipoInspeccion) {
    log('No se encontraron todos los tipos de servicio', 'error');
    return;
  }

  // Actividades genéricas para CORRECTIVO
  const actividadesCorrectivo = [
    { codigo: 'COR_DIAG', nombre: 'Diagnóstico de Falla', descripcion: 'Identificar causa raíz del problema', orden: 1 },
    { codigo: 'COR_REPARACION', nombre: 'Reparación/Corrección', descripcion: 'Ejecutar la reparación necesaria', orden: 2 },
    { codigo: 'COR_PRUEBA', nombre: 'Prueba de Funcionamiento', descripcion: 'Verificar correcto funcionamiento post-reparación', orden: 3 },
    { codigo: 'COR_LIMPIEZA', nombre: 'Limpieza del Área', descripcion: 'Dejar área de trabajo limpia', orden: 4 },
  ];

  // Actividades genéricas para EMERGENCIA
  const actividadesEmergencia = [
    { codigo: 'EME_EVALUACION', nombre: 'Evaluación de Emergencia', descripcion: 'Evaluar situación de emergencia', orden: 1 },
    { codigo: 'EME_INTERVENCION', nombre: 'Intervención Inmediata', descripcion: 'Acción correctiva de emergencia', orden: 2 },
    { codigo: 'EME_VERIFICACION', nombre: 'Verificación de Seguridad', descripcion: 'Verificar que equipo es seguro para operar', orden: 3 },
  ];

  // Actividades genéricas para INSPECCIÓN
  const actividadesInspeccion = [
    { codigo: 'INS_VISUAL', nombre: 'Inspección Visual', descripcion: 'Revisión visual del equipo', orden: 1 },
    { codigo: 'INS_REPORTE', nombre: 'Generación de Reporte', descripcion: 'Documentar hallazgos', orden: 2 },
  ];

  // Insertar actividades para CORRECTIVO
  for (const act of actividadesCorrectivo) {
    await prisma.catalogo_actividades.upsert({
      where: { codigo_actividad: act.codigo },
      update: { nombre_actividad: act.nombre, activo: true },
      create: {
        codigo_actividad: act.codigo,
        nombre_actividad: act.nombre,
        descripcion: act.descripcion,
        tipo_actividad: 'VERIFICACION',
        id_tipo_servicio: tipoCorrectivo.id_tipo_servicio,
        orden_ejecucion: act.orden,
        es_obligatoria: true,
        activo: true,
      },
    });
    log(`Actividad CORRECTIVO: ${act.codigo}`, 'success');
  }

  // Insertar actividades para EMERGENCIA
  for (const act of actividadesEmergencia) {
    await prisma.catalogo_actividades.upsert({
      where: { codigo_actividad: act.codigo },
      update: { nombre_actividad: act.nombre, activo: true },
      create: {
        codigo_actividad: act.codigo,
        nombre_actividad: act.nombre,
        descripcion: act.descripcion,
        tipo_actividad: 'VERIFICACION',
        id_tipo_servicio: tipoEmergencia.id_tipo_servicio,
        orden_ejecucion: act.orden,
        es_obligatoria: true,
        activo: true,
      },
    });
    log(`Actividad EMERGENCIA: ${act.codigo}`, 'success');
  }

  // Insertar actividades para INSPECCIÓN
  for (const act of actividadesInspeccion) {
    await prisma.catalogo_actividades.upsert({
      where: { codigo_actividad: act.codigo },
      update: { nombre_actividad: act.nombre, activo: true },
      create: {
        codigo_actividad: act.codigo,
        nombre_actividad: act.nombre,
        descripcion: act.descripcion,
        tipo_actividad: 'VERIFICACION',
        id_tipo_servicio: tipoInspeccion.id_tipo_servicio,
        orden_ejecucion: act.orden,
        es_obligatoria: true,
        activo: true,
      },
    });
    log(`Actividad INSPECCIÓN: ${act.codigo}`, 'success');
  }

  const countCorrectivo = await prisma.catalogo_actividades.count({
    where: { id_tipo_servicio: tipoCorrectivo.id_tipo_servicio, activo: true }
  });
  const countEmergencia = await prisma.catalogo_actividades.count({
    where: { id_tipo_servicio: tipoEmergencia.id_tipo_servicio, activo: true }
  });
  const countInspeccion = await prisma.catalogo_actividades.count({
    where: { id_tipo_servicio: tipoInspeccion.id_tipo_servicio, activo: true }
  });

  log(`Total actividades CORRECTIVO: ${countCorrectivo}`, 'info');
  log(`Total actividades EMERGENCIA: ${countEmergencia}`, 'info');
  log(`Total actividades INSPECCIÓN: ${countInspeccion}`, 'info');
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║         FASE -1: LIMPIEZA Y PREPARACIÓN BD                   ║');
  console.log('║              MEKANOS S.A.S - App Mobile                      ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  try {
    await diagnostico();
    await limpieza();
    await insertarTiposServicio();
    await insertarSistemas();
    await insertarParametros();
    await insertarActividadesGenPrevA();
    await insertarActividadesGenPrevB();
    await insertarActividadesBomPrevA();
    await insertarActividadesCorrectivos();
    await verificacionFinal();

    log('\nProceso completado exitosamente', 'success');
  } catch (error) {
    log(`Error: ${error}`, 'error');
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
