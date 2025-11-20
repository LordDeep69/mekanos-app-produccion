/**
 * 🔧 Script de corrección masiva - Primary Keys
 * 
 * PROBLEMA: Services usan where: { id } pero Prisma espera where: { id_tabla }
 * SOLUCIÓN: Mapear correctamente el campo PK de cada tabla
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Mapeo de tabla → campo primary key
 */
const PRIMARY_KEY_MAPPING: Record<string, string> = {
  'personas': 'id_persona',
  'usuarios': 'id_usuario',
  'proveedores': 'id_proveedor',
  'sedes-cliente': 'id_sede',
  'tipos-equipo': 'id_tipo_equipo',
  'archivos-equipo': 'id_archivo',
  'historial-estados-equipo': 'id_historial',
  'lecturas-horometro': 'id_lectura',
  'equipos-generador': 'id_equipo_generador',
  'equipos-motor': 'id_equipo_motor',
  'equipos-bomba': 'id_equipo_bomba',
  'estados-orden': 'id_estado',
  'tipos-servicio': 'id_tipo_servicio',
  'catalogo-servicios': 'id_servicio',
  'catalogo-actividades': 'id_actividad',
  'actividades-orden': 'id_actividad_orden',
  'parametros-medicion': 'id_parametro',
  'mediciones-orden': 'id_medicion',
  'evidencias-orden': 'id_evidencia',
  'firmas-digitales': 'id_firma_digital',
  'estados-cotizacion': 'id_estado',
  'motivos-rechazo': 'id_motivo_rechazo',
  'cotizaciones': 'id_cotizacion',
  'items-cotizacion-servicios': 'id_item_servicio',
  'items-cotizacion-componentes': 'id_item_componente',
  'propuestas-correctivo': 'id_propuesta',
  'items-propuesta': 'id_item_propuesta',
  'aprobaciones-cotizacion': 'id_aprobacion',
  'historial-envios': 'id_envio',
  'movimientos-inventario': 'id_movimiento',
  'ubicaciones-bodega': 'id_ubicacion',
  'lotes-componentes': 'id_lote',
  'alertas-stock': 'id_alerta',
  'remisiones': 'id_remision',
  'remisiones-detalle': 'id_detalle_remision',
  'ordenes-compra': 'id_orden_compra',
  'ordenes-compra-detalle': 'id_detalle',
  'recepciones-compra': 'id_recepcion',
  'devoluciones-proveedor': 'id_devolucion',
  'motivos-ajuste': 'id_motivo_ajuste',
  'plantillas-informe': 'id_plantilla_informe',
  'informes': 'id_informe',
  'documentos-generados': 'id_documento',
  'bitacoras': 'id_bitacora',
  'bitacoras-informes': 'id_bitacora_informe',
  'contratos-mantenimiento': 'id_contrato',
  'equipos-contrato': 'id_equipo_contrato',
  'cronogramas-servicio': 'id_cronograma',
  'historial-contrato': 'id_historial',
};

/**
 * Corrige el primary key en un archivo service
 */
function fixPrimaryKeyInService(filePath: string, moduleName: string): number {
  try {
    const pkField = PRIMARY_KEY_MAPPING[moduleName];
    if (!pkField) {
      console.warn(`⚠️  No PK mapping para ${moduleName}`);
      return 0;
    }
    
    let content = fs.readFileSync(filePath, 'utf-8');
    let changes = 0;
    
    // Reemplazar patrones:
    // 1. where: { id } → where: { pkField: id }
    // 2. orderBy: { id: 'desc' } → orderBy: { pkField: 'desc' }
    
    // Patrón 1: where: { id }
    const wherePattern1 = /where:\s*\{\s*id\s*\}/g;
    if (wherePattern1.test(content)) {
      content = content.replace(wherePattern1, `where: { ${pkField}: id }`);
      changes += 3; // Usado 3 veces (findOne, update, delete)
    }
    
    // Patrón 2: orderBy: { id: 'desc' }
    const orderPattern = /orderBy:\s*\{\s*id:\s*['"]desc['"]\s*\}/g;
    if (orderPattern.test(content)) {
      content = content.replace(orderPattern, `orderBy: { ${pkField}: 'desc' }`);
      changes += 1;
    }
    
    if (changes > 0) {
      fs.writeFileSync(filePath, content, 'utf-8');
    }
    
    return changes;
  } catch (error) {
    console.error(`❌ Error procesando ${filePath}:`, (error as Error).message);
    return 0;
  }
}

/**
 * Procesa todos los services generados
 */
function fixAllPrimaryKeys(baseDir: string): void {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🔧 CORRECTOR AUTOMÁTICO - PRIMARY KEYS');
  console.log('═══════════════════════════════════════════════════════\n');
  
  const modules = Object.keys(PRIMARY_KEY_MAPPING);
  
  let totalFiles = 0;
  let totalChanges = 0;
  
  modules.forEach((module) => {
    const serviceFile = path.join(baseDir, module, `${module}.service.ts`);
    
    if (fs.existsSync(serviceFile)) {
      const changes = fixPrimaryKeyInService(serviceFile, module);
      if (changes > 0) {
        totalFiles++;
        totalChanges += changes;
        console.log(`✅ ${module}.service.ts - ${changes} correcciones`);
      }
    }
  });
  
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('📊 RESUMEN');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`✅ Archivos corregidos: ${totalFiles}`);
  console.log(`🔧 Cambios totales: ${totalChanges}`);
  console.log('\n💡 Primary keys corregidos correctamente.');
}

// Ejecutar
const apiSrcDir = path.resolve(process.cwd(), 'apps/api/src');
fixAllPrimaryKeys(apiSrcDir);
