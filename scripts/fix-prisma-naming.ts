/**
 * 🔧 Script de corrección masiva - Prisma Naming Convention
 * 
 * PROBLEMA: Los services generados usan camelCase (this.prisma.tiposEquipo)
 * REALIDAD: Prisma schema usa snake_case (model tipos_equipo)
 * 
 * Este script corrige los 49 services automáticamente.
 */

import * as fs from 'fs';
import * as path from 'path';

// Mapeo de nombres incorrectos → correctos
const PRISMA_MODEL_MAPPING: Record<string, string> = {
  // FASE 1
  tiposEquipo: 'tipos_equipo',
  archivosEquipo: 'archivos_equipo',
  historialEstadosEquipo: 'historial_estados_equipo',
  lecturasHorometro: 'lecturas_horometro',
  equiposGenerador: 'equipos_generador',
  equiposMotor: 'equipos_motor',
  equiposBomba: 'equipos_bomba',
  
  // FASE 2
  sedesCliente: 'sedes_cliente',
  proveedores: 'proveedores',
  
  // FASE 3
  estadosOrden: 'estados_orden',
  tiposServicio: 'tipos_servicio',
  catalogoServicios: 'catalogo_servicios',
  catalogoActividades: 'catalogo_actividades',
  actividadesOrden: 'actividades_orden',
  parametrosMedicion: 'parametros_medicion',
  medicionesOrden: 'mediciones_orden',
  evidenciasOrden: 'evidencias_orden',
  firmasDigitales: 'firmas_digitales',
  
  // FASE 4
  estadosCotizacion: 'estados_cotizacion',
  motivosRechazo: 'motivos_rechazo',
  cotizaciones: 'cotizaciones',
  itemsCotizacionServicios: 'items_cotizacion_servicios',
  itemsCotizacionComponentes: 'items_cotizacion_componentes',
  propuestasCorrectivo: 'propuestas_correctivo',
  itemsPropuesta: 'items_propuesta',
  aprobacionesCotizacion: 'aprobaciones_cotizacion',
  historialEnvios: 'historial_envios',
  
  // FASE 5
  movimientosInventario: 'movimientos_inventario',
  ubicacionesBodega: 'ubicaciones_bodega',
  lotesComponentes: 'lotes_componentes',
  alertasStock: 'alertas_stock',
  remisiones: 'remisiones',
  remisionesDetalle: 'remisiones_detalle',
  ordenesCompra: 'ordenes_compra',
  ordenesCompraDetalle: 'ordenes_compra_detalle',
  recepcionesCompra: 'recepciones_compra',
  devolucionesProveedor: 'devoluciones_proveedor',
  motivosAjuste: 'motivos_ajuste',
  
  // FASE 6
  plantillasInforme: 'plantillas_informe',
  informes: 'informes',
  documentosGenerados: 'documentos_generados',
  bitacoras: 'bitacoras',
  bitacorasInformes: 'bitacoras_informes',
  
  // FASE 7
  contratosMantenimiento: 'contratos_mantenimiento',
  equiposContrato: 'equipos_contrato',
  cronogramasServicio: 'cronogramas_servicio',
  historialContrato: 'historial_contrato',
};

/**
 * Corrige el contenido de un archivo service
 */
function fixServiceFile(filePath: string): number {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    let changes = 0;
    
    // 1. Corregir nombres de modelos Prisma
    Object.entries(PRISMA_MODEL_MAPPING).forEach(([camelCase, snake_case]) => {
      const regex = new RegExp(`this\\.prisma\\.${camelCase}\\b`, 'g');
      const matches = content.match(regex);
      if (matches) {
        content = content.replace(regex, `this.prisma.${snake_case}`);
        changes += matches.length;
      }
    });
    
    // 2. Corregir error typing
    // Buscar: } catch (error) {
    // Reemplazar con tipo explícito y safe casting
    const catchRegex = /} catch \(error\) {\s*throw new InternalServerErrorException\(\s*`([^`]+)\$\{error\.message\}`/g;
    if (catchRegex.test(content)) {
      content = content.replace(
        /} catch \(error\) {/g,
        '} catch (error: unknown) {'
      );
      content = content.replace(
        /error\.message/g,
        '(error as Error).message'
      );
      changes += 10; // Estimado
    }
    
    // Escribir cambios
    if (changes > 0) {
      fs.writeFileSync(filePath, content, 'utf-8');
    }
    
    return changes;
  } catch (error) {
    console.error(`❌ Error procesando ${filePath}:`, error);
    return 0;
  }
}

/**
 * Escanea recursivamente directorios y corrige services
 */
function fixAllServices(baseDir: string): void {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🔧 CORRECTOR AUTOMÁTICO - PRISMA NAMING');
  console.log('═══════════════════════════════════════════════════════\n');
  
  let totalFiles = 0;
  let totalChanges = 0;
  
  // Lista de módulos a procesar (basado en los generados)
  const modulesToFix = [
    'tipos-equipo', 'archivos-equipo', 'historial-estados-equipo', 'lecturas-horometro',
    'equipos-generador', 'equipos-motor', 'equipos-bomba',
    'personas', 'usuarios', 'sedes-cliente', 'proveedores',
    'estados-orden', 'tipos-servicio', 'catalogo-servicios', 'catalogo-actividades',
    'actividades-orden', 'parametros-medicion', 'mediciones-orden', 'evidencias-orden',
    'firmas-digitales',
    'estados-cotizacion', 'motivos-rechazo', 'cotizaciones', 'items-cotizacion-servicios',
    'items-cotizacion-componentes', 'propuestas-correctivo', 'items-propuesta',
    'aprobaciones-cotizacion', 'historial-envios',
    'movimientos-inventario', 'ubicaciones-bodega', 'lotes-componentes', 'alertas-stock',
    'remisiones', 'remisiones-detalle', 'ordenes-compra', 'ordenes-compra-detalle',
    'recepciones-compra', 'devoluciones-proveedor', 'motivos-ajuste',
    'plantillas-informe', 'informes', 'documentos-generados', 'bitacoras', 'bitacoras-informes',
    'contratos-mantenimiento', 'equipos-contrato', 'cronogramas-servicio', 'historial-contrato',
  ];
  
  modulesToFix.forEach((module) => {
    const serviceFile = path.join(baseDir, module, `${module}.service.ts`);
    
    if (fs.existsSync(serviceFile)) {
      const changes = fixServiceFile(serviceFile);
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
  console.log('\n💡 Ejecuta pnpm build para verificar las correcciones.');
}

// Ejecutar
const apiSrcDir = path.resolve(process.cwd(), 'apps/api/src');
fixAllServices(apiSrcDir);
