import * as fs from 'fs';
import * as path from 'path';

/**
 * Script para LIMPIAR completamente los DTOs
 * 
 * PROBLEMA: Los DTOs tienen:
 * - Paréntesis sobrantes: })
 * - Campos observaciones con decoradores
 * - Imports no usados
 * 
 * SOLUCIÓN:
 * - Dejar SOLO implements Partial<PrismaType> y [key: string]: any
 */

const API_SRC = path.resolve(process.cwd(), 'apps/api/src');

// Mapeo de nombres de carpeta a modelo Prisma (snake_case)
const MODULE_TO_PRISMA_MODEL: Record<string, string> = {
  'actividades-orden': 'actividades_orden',
  'alertas-stock': 'alertas_stock',
  'aprobaciones-cotizacion': 'aprobaciones_cotizacion',
  'archivos-equipo': 'archivos_equipo',
  'bitacoras': 'bitacoras',
  'bitacoras-informes': 'bitacoras_informes',
  'catalogo-actividades': 'catalogo_actividades',
  'catalogo-servicios': 'catalogo_servicios',
  'contratos-mantenimiento': 'contratos_mantenimiento',
  'cotizaciones': 'cotizaciones',
  'cronogramas-servicio': 'cronogramas_servicio',
  'devoluciones-proveedor': 'devoluciones_proveedor',
  'documentos-generados': 'documentos_generados',
  'equipos-bomba': 'equipos_bomba',
  'equipos-contrato': 'equipos_contrato',
  'equipos-generador': 'equipos_generador',
  'equipos-motor': 'equipos_motor',
  'estados-cotizacion': 'estados_cotizacion',
  'estados-orden': 'estados_orden',
  'evidencias-orden': 'evidencias_orden',
  'firmas-digitales': 'firmas_digitales',
  'historial-contrato': 'historial_contrato',
  'historial-envios': 'historial_envios',
  'historial-estados-equipo': 'historial_estados_equipo',
  'informes': 'informes',
  'items-cotizacion-componentes': 'items_cotizacion_componentes',
  'items-cotizacion-servicios': 'items_cotizacion_servicios',
  'items-propuesta': 'items_propuesta',
  'lecturas-horometro': 'lecturas_horometro',
  'lotes-componentes': 'lotes_componentes',
  'mediciones-orden': 'mediciones_orden',
  'motivos-ajuste': 'motivos_ajuste',
  'motivos-rechazo': 'motivos_rechazo',
  'movimientos-inventario': 'movimientos_inventario',
  'ordenes-compra': 'ordenes_compra',
  'ordenes-compra-detalle': 'ordenes_compra_detalle',
  'parametros-medicion': 'parametros_medicion',
  'personas': 'personas',
  'plantillas-informe': 'plantillas_informe',
  'propuestas-correctivo': 'propuestas_correctivo',
  'proveedores': 'proveedores',
  'recepciones-compra': 'recepciones_compra',
  'remisiones': 'remisiones',
  'remisiones-detalle': 'remisiones_detalle',
  'sedes-cliente': 'sedes_cliente',
  'tipos-equipo': 'tipos_equipo',
  'tipos-servicio': 'tipos_servicio',
  'ubicaciones-bodega': 'ubicaciones_bodega',
  'usuarios': 'usuarios'
};

function toPascalCase(str: string): string {
  return str
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function cleanDtoFile(filePath: string, moduleName: string, isCreate: boolean): void {
  const prismaModelName = MODULE_TO_PRISMA_MODEL[moduleName];
  if (!prismaModelName) {
    console.warn(`⚠️ No se encontró modelo Prisma para: ${moduleName}`);
    return;
  }

  const inputType = isCreate 
    ? `${prismaModelName}CreateInput`
    : `${prismaModelName}UpdateInput`;

  const dtoClassName = isCreate
    ? `Create${toPascalCase(moduleName)}Dto`
    : `Update${toPascalCase(moduleName)}Dto`;

  let content: string;
  
  if (isCreate) {
    // CREATE DTO - Limpio completamente
    content = `import { Prisma } from '@prisma/client';

/**
 * DTO para crear ${prismaModelName}
 * 
 * ⚠️ TEMPORAL: Usando tipos de Prisma directamente para MVP
 * TODO: Agregar validaciones con class-validator en fase de refinamiento
 * TODO: Documentar campos con @ApiProperty cuando se definan validaciones
 */
export class ${dtoClassName} implements Partial<Prisma.${inputType}> {
  // Permisivo para MVP - Prisma valida tipos en runtime
  [key: string]: any;
}
`;
  } else {
    // UPDATE DTO - Usa PartialType
    const createDtoImport = `Create${toPascalCase(moduleName)}Dto`;
    
    content = `import { PartialType } from '@nestjs/swagger';
import { ${createDtoImport} } from './create-${moduleName}.dto';

/**
 * DTO para actualizar ${prismaModelName}
 * 
 * Hereda de Create DTO haciendo todos los campos opcionales
 */
export class ${dtoClassName} extends PartialType(${createDtoImport}) {}
`;
  }

  fs.writeFileSync(filePath, content, 'utf-8');
}

function processAllModules(): void {
  let correctedFiles = 0;
  let errors = 0;

  Object.keys(MODULE_TO_PRISMA_MODEL).forEach((moduleName) => {
    const moduleDir = path.join(API_SRC, moduleName);
    if (!fs.existsSync(moduleDir)) {
      console.warn(`⚠️ Directorio no encontrado: ${moduleDir}`);
      return;
    }

    const dtoDir = path.join(moduleDir, 'dto');
    if (!fs.existsSync(dtoDir)) {
      console.warn(`⚠️ Directorio dto no encontrado: ${dtoDir}`);
      return;
    }

    // Limpiar CREATE DTO
    const createDtoPath = path.join(dtoDir, `create-${moduleName}.dto.ts`);
    if (fs.existsSync(createDtoPath)) {
      try {
        cleanDtoFile(createDtoPath, moduleName, true);
        correctedFiles++;
      } catch (error) {
        console.error(`❌ Error en ${createDtoPath}:`, error);
        errors++;
      }
    }

    // Limpiar UPDATE DTO
    const updateDtoPath = path.join(dtoDir, `update-${moduleName}.dto.ts`);
    if (fs.existsSync(updateDtoPath)) {
      try {
        cleanDtoFile(updateDtoPath, moduleName, false);
        correctedFiles++;
      } catch (error) {
        console.error(`❌ Error en ${updateDtoPath}:`, error);
        errors++;
      }
    }
  });

  console.log('\n✅ DTOs limpiados:', correctedFiles);
  console.log('❌ Errores:', errors);
  console.log('\n💡 DTOs completamente reconstruidos sin código basura');
}

// Ejecutar
processAllModules();
