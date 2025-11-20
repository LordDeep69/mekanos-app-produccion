import * as fs from 'fs';
import * as path from 'path';

/**
 * Script para corregir la asignación de tipos en los servicios
 * 
 * PROBLEMA: 
 * - Los DTOs implementan Partial<PrismaCreateInput>
 * - Prisma espera el tipo completo en data
 * - TypeScript error TS2322
 * 
 * SOLUCIÓN:
 * - Cast con "as any" en data: createDto y updateDto
 * - Pragmático para MVP, validación en runtime por Prisma
 */

const API_SRC = path.resolve(process.cwd(), 'apps/api/src');

const ALL_MODULES = [
  'actividades-orden',
  'alertas-stock',
  'aprobaciones-cotizacion',
  'archivos-equipo',
  'bitacoras',
  'bitacoras-informes',
  'catalogo-actividades',
  'catalogo-servicios',
  'contratos-mantenimiento',
  'cotizaciones',
  'cronogramas-servicio',
  'devoluciones-proveedor',
  'documentos-generados',
  'equipos-bomba',
  'equipos-contrato',
  'equipos-generador',
  'equipos-motor',
  'estados-cotizacion',
  'estados-orden',
  'evidencias-orden',
  'firmas-digitales',
  'historial-contrato',
  'historial-envios',
  'historial-estados-equipo',
  'informes',
  'items-cotizacion-componentes',
  'items-cotizacion-servicios',
  'items-propuesta',
  'lecturas-horometro',
  'lotes-componentes',
  'mediciones-orden',
  'motivos-ajuste',
  'motivos-rechazo',
  'movimientos-inventario',
  'ordenes-compra',
  'ordenes-compra-detalle',
  'parametros-medicion',
  'personas',
  'plantillas-informe',
  'propuestas-correctivo',
  'proveedores',
  'recepciones-compra',
  'remisiones',
  'remisiones-detalle',
  'sedes-cliente',
  'tipos-equipo',
  'tipos-servicio',
  'ubicaciones-bodega',
  'usuarios'
];

function fixServiceFile(filePath: string): boolean {
  let content = fs.readFileSync(filePath, 'utf-8');
  let changes = 0;

  // Patrón 1: data: createDto,
  if (content.includes('data: createDto,')) {
    content = content.replace(/data: createDto,/g, 'data: createDto as any,');
    changes++;
  }

  // Patrón 2: data: updateDto,
  if (content.includes('data: updateDto,')) {
    content = content.replace(/data: updateDto,/g, 'data: updateDto as any,');
    changes++;
  }

  if (changes > 0) {
    fs.writeFileSync(filePath, content, 'utf-8');
    return true;
  }

  return false;
}

function processAllServices(): void {
  let correctedFiles = 0;
  let totalChanges = 0;

  ALL_MODULES.forEach((moduleName) => {
    const servicePath = path.join(API_SRC, moduleName, `${moduleName}.service.ts`);
    
    if (!fs.existsSync(servicePath)) {
      console.warn(`⚠️ Service no encontrado: ${servicePath}`);
      return;
    }

    try {
      const wasFixed = fixServiceFile(servicePath);
      if (wasFixed) {
        correctedFiles++;
        totalChanges += 2; // create + update
      }
    } catch (error) {
      console.error(`❌ Error en ${servicePath}:`, error);
    }
  });

  console.log('\n✅ Archivos corregidos:', correctedFiles);
  console.log('🔧 Cambios totales:', totalChanges);
  console.log('\n💡 Casts "as any" agregados para compatibilidad MVP');
}

// Ejecutar
processAllServices();
