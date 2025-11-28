/**
 * ============================================================================
 * TEST E2E COMPLETO - MEKANOS S.A.S - FLUJO REAL ORDEN DE SERVICIO
 * ============================================================================
 * 
 * Este test simula el flujo completo de un servicio de mantenimiento TIPO A:
 * 1. Verificar/Crear datos base (cliente, técnico, equipo)
 * 2. Crear orden de servicio
 * 3. Asignar técnico y ejecutar servicio
 * 4. Registrar mediciones y actividades
 * 5. Subir evidencias fotográficas a Cloudinary
 * 6. Registrar firmas digitales
 * 7. Generar PDF del informe
 * 8. Subir PDF a Cloudflare R2
 * 9. Enviar email al cliente
 * 
 * Ejecutar: node src/testing/test-e2e-orden-completa.js
 * ============================================================================
 */

const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');
const puppeteer = require('puppeteer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIGURACIÓN
// ============================================================================
const CONFIG = {
  TEST_EMAIL_DESTINO: 'lorddeep3@gmail.com',
  SMTP: {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: 'mekanossas4@gmail.com',
      pass: 'jvsd znpw hsfv jgmy'
    }
  },
  // Cloudflare R2 - configuración desde .env
  R2: {
    accountId: process.env.CLOUDFLARE_R2_ACCOUNT_ID || '',
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '',
    bucketName: process.env.CLOUDFLARE_R2_BUCKET_NAME || 'mekanos-documentos'
  }
};

const prisma = new PrismaClient();

// ============================================================================
// UTILIDADES
// ============================================================================
const formatCurrency = (value) => {
  if (!value) return '$0';
  return new Intl.NumberFormat('es-CO', { 
    style: 'currency', 
    currency: 'COP',
    minimumFractionDigits: 0 
  }).format(value);
};

const generateHash = (data) => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

const log = (emoji, message) => {
  console.log(`${emoji} ${message}`);
};

const logSection = (title) => {
  console.log('\n' + '='.repeat(70));
  console.log(`📌 ${title}`);
  console.log('='.repeat(70));
};

// ============================================================================
// SECCIÓN 1: VERIFICAR DATOS BASE
// ============================================================================
async function verificarDatosBase() {
  logSection('SECCIÓN 1: VERIFICANDO DATOS BASE');
  
  const resultados = {
    cliente: null,
    tecnico: null,
    equipo: null,
    tipoServicio: null,
    estadoOrden: null,
    usuario: null
  };
  
  try {
    // 1.1 Verificar cliente
    log('👤', 'Buscando cliente...');
    resultados.cliente = await prisma.clientes.findFirst({
      where: { cliente_activo: true },
      include: { persona: true }
    });
    
    if (resultados.cliente) {
      log('✅', `Cliente: ${resultados.cliente.persona?.nombre_completo || resultados.cliente.persona?.razon_social}`);
    } else {
      log('❌', 'No hay clientes activos');
      return null;
    }
    
    // 1.2 Verificar técnico
    log('🔧', 'Buscando técnico...');
    resultados.tecnico = await prisma.empleados.findFirst({
      where: { 
        es_tecnico: true,
        empleado_activo: true 
      },
      include: { persona: true }
    });
    
    if (resultados.tecnico) {
      log('✅', `Técnico: ${resultados.tecnico.persona?.nombre_completo} (${resultados.tecnico.codigo_empleado})`);
    } else {
      log('❌', 'No hay técnicos activos');
      return null;
    }
    
    // 1.3 Verificar equipo
    log('⚙️', 'Buscando equipo...');
    resultados.equipo = await prisma.equipos.findFirst({
      where: { activo: true },
      include: { 
        tipo_equipo: true,
        cliente: { include: { persona: true } }
      }
    });
    
    if (resultados.equipo) {
      log('✅', `Equipo: ${resultados.equipo.nombre_equipo} (${resultados.equipo.codigo_interno})`);
    } else {
      log('❌', 'No hay equipos activos');
      return null;
    }
    
    // 1.4 Verificar tipo de servicio
    log('📋', 'Buscando tipo de servicio...');
    resultados.tipoServicio = await prisma.tipos_servicio.findFirst({
      where: { activo: true }
    });
    
    if (resultados.tipoServicio) {
      log('✅', `Tipo servicio: ${resultados.tipoServicio.nombre_servicio}`);
    } else {
      log('❌', 'No hay tipos de servicio');
      return null;
    }
    
    // 1.5 Verificar estados de orden
    log('📊', 'Buscando estados de orden...');
    const estados = await prisma.estados_orden.findMany();
    resultados.estadoOrden = estados.find(e => 
      e.nombre_estado?.toLowerCase().includes('programad') || 
      e.codigo_estado?.toLowerCase().includes('prog')
    ) || estados[0];
    
    if (resultados.estadoOrden) {
      log('✅', `Estado inicial: ${resultados.estadoOrden.nombre_estado}`);
    } else {
      log('❌', 'No hay estados de orden');
      return null;
    }
    
    // 1.6 Verificar usuario
    log('👨‍💻', 'Buscando usuario del sistema...');
    resultados.usuario = await prisma.usuarios.findFirst({
      where: { estado: 'ACTIVO' }
    });
    
    if (resultados.usuario) {
      log('✅', `Usuario: ${resultados.usuario.username}`);
    } else {
      log('❌', 'No hay usuarios activos');
      return null;
    }
    
    log('🎉', 'Todos los datos base verificados correctamente');
    return resultados;
    
  } catch (error) {
    log('❌', `Error verificando datos: ${error.message}`);
    return null;
  }
}

// Exportar para uso modular
module.exports = { verificarDatosBase, CONFIG, prisma, log, logSection, formatCurrency, generateHash };

// ============================================================================
// SECCIÓN 2: CREAR ORDEN DE SERVICIO
// ============================================================================
async function crearOrdenServicio(datosBase) {
  logSection('SECCIÓN 2: CREANDO ORDEN DE SERVICIO');
  
  try {
    // Generar número de orden único
    const fecha = new Date();
    const year = fecha.getFullYear();
    const ultimaOrden = await prisma.ordenes_servicio.findFirst({
      orderBy: { id_orden_servicio: 'desc' }
    });
    
    const secuencial = ultimaOrden ? 
      parseInt(ultimaOrden.numero_orden.split('-')[2] || '0') + 1 : 1;
    const numeroOrden = `OS-${year}-${String(secuencial).padStart(4, '0')}`;
    
    log('📝', `Creando orden: ${numeroOrden}`);
    
    const orden = await prisma.ordenes_servicio.create({
      data: {
        numero_orden: numeroOrden,
        id_cliente: datosBase.cliente.id_cliente,
        id_equipo: datosBase.equipo.id_equipo,
        id_tipo_servicio: datosBase.tipoServicio?.id_tipo_servicio,
        fecha_programada: new Date(),
        hora_programada: new Date(),
        prioridad: 'NORMAL',
        origen_solicitud: 'PROGRAMADO',
        id_tecnico_asignado: datosBase.tecnico.id_empleado,
        fecha_asignacion: new Date(),
        id_estado_actual: datosBase.estadoOrden.id_estado,
        descripcion_inicial: 'Mantenimiento preventivo TIPO A - Generador de emergencia. Incluye cambio de aceite, filtros, revisión de sistemas eléctricos y pruebas de carga.',
        requiere_firma_cliente: true,
        creado_por: datosBase.usuario.id_usuario
      },
      include: {
        cliente: { include: { persona: true } },
        equipo: { include: { tipo_equipo: true } },
        tecnico: { include: { persona: true } },
        estado: true
      }
    });
    
    log('✅', `Orden creada: ${orden.numero_orden}`);
    log('📋', `Cliente: ${orden.cliente?.persona?.nombre_completo || orden.cliente?.persona?.razon_social}`);
    log('⚙️', `Equipo: ${orden.equipo?.nombre_equipo}`);
    log('🔧', `Técnico: ${orden.tecnico?.persona?.nombre_completo}`);
    log('📊', `Estado: ${orden.estado?.nombre_estado}`);
    
    return orden;
    
  } catch (error) {
    log('❌', `Error creando orden: ${error.message}`);
    return null;
  }
}

// ============================================================================
// SECCIÓN 3: EJECUTAR ORDEN (CAMBIAR ESTADO A EN EJECUCIÓN)
// ============================================================================
async function ejecutarOrden(orden, datosBase) {
  logSection('SECCIÓN 3: EJECUTANDO ORDEN DE SERVICIO');
  
  try {
    // Buscar estado "En Ejecución"
    const estadoEjecucion = await prisma.estados_orden.findFirst({
      where: {
        OR: [
          { nombre_estado: { contains: 'Ejecuci' } },
          { codigo_estado: { contains: 'EJEC' } }
        ]
      }
    });
    
    if (!estadoEjecucion) {
      log('⚠️', 'Estado "En Ejecución" no encontrado, continuando...');
    }
    
    // Actualizar orden
    const ordenActualizada = await prisma.ordenes_servicio.update({
      where: { id_orden_servicio: orden.id_orden_servicio },
      data: {
        id_estado_actual: estadoEjecucion?.id_estado || orden.id_estado_actual,
        fecha_inicio_real: new Date(),
        trabajo_realizado: `
MANTENIMIENTO PREVENTIVO TIPO A - GENERADOR DE EMERGENCIA

1. INSPECCIÓN VISUAL GENERAL
   - Revisión de conexiones eléctricas: OK
   - Verificación de fugas de aceite/combustible: Sin fugas
   - Estado de mangueras y correas: Buen estado

2. SISTEMA DE LUBRICACIÓN
   - Cambio de aceite motor: 15W-40 (18 litros)
   - Cambio de filtro de aceite: Caterpillar 1R-0716
   - Nivel verificado: OK

3. SISTEMA DE COMBUSTIBLE
   - Cambio de filtro de combustible primario
   - Cambio de filtro de combustible secundario
   - Drenaje de agua del tanque: Realizado

4. SISTEMA DE REFRIGERACIÓN
   - Nivel de refrigerante: Verificado y completado
   - Estado de radiador: Limpio
   - Funcionamiento de termostato: OK

5. SISTEMA ELÉCTRICO
   - Voltaje de baterías: 24.5V DC
   - Carga del alternador: 28V DC
   - Conexiones: Ajustadas

6. PRUEBAS DE FUNCIONAMIENTO
   - Arranque en frío: OK (3 segundos)
   - Prueba de carga al 75%: 1 hora
   - Frecuencia: 60 Hz estable
   - Voltaje de salida: 440V trifásico
        `.trim(),
        observaciones_tecnico: 'Equipo en excelente estado. Se recomienda próximo mantenimiento en 250 horas o 3 meses.',
        modificado_por: datosBase.usuario.id_usuario,
        fecha_modificacion: new Date()
      }
    });
    
    log('✅', 'Orden en ejecución');
    log('📝', 'Trabajo realizado registrado');
    
    return ordenActualizada;
    
  } catch (error) {
    log('❌', `Error ejecutando orden: ${error.message}`);
    return null;
  }
}

// ============================================================================
// SECCIÓN 4: REGISTRAR MEDICIONES
// ============================================================================
async function registrarMediciones(orden, datosBase) {
  logSection('SECCIÓN 4: REGISTRANDO MEDICIONES');
  
  try {
    // Buscar parámetros de medición existentes
    const parametros = await prisma.parametros_medicion.findMany({
      take: 5
    });
    
    if (parametros.length === 0) {
      log('⚠️', 'No hay parámetros de medición, creando algunos...');
      
      // Crear parámetros básicos si no existen
      const nuevosParametros = await prisma.parametros_medicion.createMany({
        data: [
          { nombre_parametro: 'Voltaje AC', unidad_medida: 'V', valor_minimo: 420, valor_maximo: 460, creado_por: datosBase.usuario.id_usuario },
          { nombre_parametro: 'Frecuencia', unidad_medida: 'Hz', valor_minimo: 59, valor_maximo: 61, creado_por: datosBase.usuario.id_usuario },
          { nombre_parametro: 'Temperatura Aceite', unidad_medida: '°C', valor_minimo: 70, valor_maximo: 100, creado_por: datosBase.usuario.id_usuario },
          { nombre_parametro: 'Presión Aceite', unidad_medida: 'PSI', valor_minimo: 40, valor_maximo: 80, creado_por: datosBase.usuario.id_usuario },
          { nombre_parametro: 'Voltaje DC Baterías', unidad_medida: 'V', valor_minimo: 24, valor_maximo: 28, creado_por: datosBase.usuario.id_usuario }
        ],
        skipDuplicates: true
      });
      log('✅', `Creados ${nuevosParametros.count} parámetros de medición`);
    }
    
    // Obtener parámetros actualizados
    const parametrosActuales = await prisma.parametros_medicion.findMany({ take: 5 });
    
    // Valores de medición reales de campo
    const mediciones = [
      { parametro: parametrosActuales[0], valor: 440 },
      { parametro: parametrosActuales[1], valor: 60 },
      { parametro: parametrosActuales[2], valor: 85 },
      { parametro: parametrosActuales[3], valor: 55 },
      { parametro: parametrosActuales[4], valor: 24.5 }
    ];
    
    for (const med of mediciones) {
      if (!med.parametro) continue;
      
      await prisma.mediciones_servicio.create({
        data: {
          id_orden_servicio: orden.id_orden_servicio,
          id_parametro_medicion: med.parametro.id_parametro_medicion,
          valor_medido: med.valor,
          id_tecnico_medicion: datosBase.tecnico.id_empleado,
          fecha_medicion: new Date(),
          observaciones: `Medición dentro de parámetros normales`
        }
      });
      
      log('📊', `${med.parametro.nombre_parametro}: ${med.valor} ${med.parametro.unidad_medida}`);
    }
    
    log('✅', 'Mediciones registradas correctamente');
    return true;
    
  } catch (error) {
    log('❌', `Error registrando mediciones: ${error.message}`);
    return false;
  }
}

// Si se ejecuta directamente, correr verificación
if (require.main === module) {
  (async () => {
    const datosBase = await verificarDatosBase();
    if (!datosBase) {
      console.log('\n❌ Faltan datos base.');
      await prisma.$disconnect();
      return;
    }
    
    const orden = await crearOrdenServicio(datosBase);
    if (!orden) {
      await prisma.$disconnect();
      return;
    }
    
    const ordenEjecutada = await ejecutarOrden(orden, datosBase);
    if (!ordenEjecutada) {
      await prisma.$disconnect();
      return;
    }
    
    await registrarMediciones(ordenEjecutada, datosBase);
    
    console.log('\n✅ Secciones 1-4 completadas. Continuar con siguiente fase.');
    await prisma.$disconnect();
  })();
}
