/**
 * ═══════════════════════════════════════════════════════════════════
 * GENERADOR AUTOMÁTICO DE MÓDULOS CRUD
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Propósito: Generar los 66 módulos CRUD faltantes para alcanzar 69/69 tablas
 * 
 * Genera por cada tabla:
 * - module.ts
 * - controller.ts (5 endpoints: POST, GET, GET/:id, PUT, DELETE)
 * - service.ts (5 métodos CRUD)
 * - dto/create-{tabla}.dto.ts
 * - dto/update-{tabla}.dto.ts
 * 
 * Total output: 66 módulos × 5 archivos = 330 archivos
 * Total endpoints: 66 × 5 = 330 endpoints
 * 
 * Uso: npx ts-node scripts/generate-crud-modules.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// ═══════════════════════════════════════════════════════════════════
// TABLAS PARA GENERAR (66 módulos faltantes)
// ═══════════════════════════════════════════════════════════════════

const TABLAS_FASE_4 = [
  'estados_cotizacion',
  'motivos_rechazo',
  'cotizaciones',
  'items_cotizacion_servicios',
  'items_cotizacion_componentes',
  'propuestas_correctivo',
  'items_propuesta',
  'aprobaciones_cotizacion',
  'historial_envios',
];

const TABLAS_FASE_5 = [
  'movimientos_inventario',
  'ubicaciones_bodega',
  'lotes_componentes',
  'alertas_stock',
  'remisiones',
  'remisiones_detalle',
  'ordenes_compra',
  'ordenes_compra_detalle',
  'recepciones_compra',
  'devoluciones_proveedor',
  'motivos_ajuste',
];

const TABLAS_FASE_6 = [
  'plantillas_informe',
  'informes',
  'documentos_generados',
  'bitacoras',
  'bitacoras_informes',
];

const TABLAS_FASE_7 = [
  'contratos_mantenimiento',
  'equipos_contrato',
  'cronogramas_servicio',
  'historial_contrato',
];

// Tablas FASE 1-3 que faltan (ajustar según lo que ya existe)
const TABLAS_FASE_1 = [
  'tipos_equipo',
  'archivos_equipo',
  'historial_estados_equipo',
  'lecturas_horometro',
  'equipos_generador',
  'equipos_motor',
  'equipos_bomba',
];

const TABLAS_FASE_2 = [
  'personas',
  'usuarios',
  'sedes_cliente',
  'proveedores',
];

const TABLAS_FASE_3 = [
  'estados_orden',
  'tipos_servicio',
  'catalogo_servicios',
  'catalogo_actividades',
  'actividades_orden',
  'parametros_medicion',
  'mediciones_orden',
  'evidencias_orden',
  'firmas_digitales',
];

// Combinar todas
const TODAS_LAS_TABLAS = [
  ...TABLAS_FASE_1,
  ...TABLAS_FASE_2,
  ...TABLAS_FASE_3,
  ...TABLAS_FASE_4,
  ...TABLAS_FASE_5,
  ...TABLAS_FASE_6,
  ...TABLAS_FASE_7,
];

// ═══════════════════════════════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════════════════════════════

function toPascalCase(str: string): string {
  return str
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function toKebabCase(str: string): string {
  return str.replace(/_/g, '-');
}

// ═══════════════════════════════════════════════════════════════════
// TEMPLATES DE ARCHIVOS
// ═══════════════════════════════════════════════════════════════════

function generateModuleTemplate(tableName: string): string {
  const className = toPascalCase(tableName);
  return `import { Module } from '@nestjs/common';
import { ${className}Controller } from './${toKebabCase(tableName)}.controller';
import { ${className}Service } from './${toKebabCase(tableName)}.service';

@Module({
  controllers: [${className}Controller],
  providers: [${className}Service],
  exports: [${className}Service],
})
export class ${className}Module {}
`;
}

function generateControllerTemplate(tableName: string): string {
  const className = toPascalCase(tableName);
  const varName = toCamelCase(tableName);
  const kebab = toKebabCase(tableName);

  return `import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ${className}Service } from './${kebab}.service';
import { Create${className}Dto } from './dto/create-${kebab}.dto';
import { Update${className}Dto } from './dto/update-${kebab}.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('${kebab}')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ${className}Controller {
  constructor(private readonly ${varName}Service: ${className}Service) {}

  @Post()
  create(@Body() createDto: Create${className}Dto) {
    return this.${varName}Service.create(createDto);
  }

  @Get()
  findAll(
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 10,
  ) {
    return this.${varName}Service.findAll(page, limit);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.${varName}Service.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: Update${className}Dto,
  ) {
    return this.${varName}Service.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.${varName}Service.remove(id);
  }
}
`;
}

function generateServiceTemplate(tableName: string): string {
  const className = toPascalCase(tableName);
  const varName = toCamelCase(tableName);
  const kebab = toKebabCase(tableName);

  return `import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '@mekanos/database';
import { Create${className}Dto } from './dto/create-${kebab}.dto';
import { Update${className}Dto } from './dto/update-${kebab}.dto';

@Injectable()
export class ${className}Service {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: Create${className}Dto) {
    try {
      return await this.prisma.${varName}.create({
        data: createDto,
      });
    } catch (error) {
      throw new InternalServerErrorException(
        \`Error al crear ${tableName}: \${error.message}\`,
      );
    }
  }

  async findAll(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;
      
      const [data, total] = await Promise.all([
        this.prisma.${varName}.findMany({
          skip,
          take: limit,
          orderBy: { id: 'desc' },
        }),
        this.prisma.${varName}.count(),
      ]);

      return {
        data,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new InternalServerErrorException(
        \`Error al obtener ${tableName}: \${error.message}\`,
      );
    }
  }

  async findOne(id: number) {
    try {
      const record = await this.prisma.${varName}.findUnique({
        where: { id },
      });

      if (!record) {
        throw new NotFoundException(\`${className} con ID \${id} no encontrado\`);
      }

      return record;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        \`Error al obtener ${tableName}: \${error.message}\`,
      );
    }
  }

  async update(id: number, updateDto: Update${className}Dto) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.${varName}.update({
        where: { id },
        data: updateDto,
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        \`Error al actualizar ${tableName}: \${error.message}\`,
      );
    }
  }

  async remove(id: number) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.${varName}.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        \`Error al eliminar ${tableName}: \${error.message}\`,
      );
    }
  }
}
`;
}

function generateCreateDtoTemplate(tableName: string): string {
  const className = toPascalCase(tableName);

  return `import { IsNotEmpty, IsOptional, IsString, IsNumber, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO para crear ${tableName}
 * 
 * TODO: Ajustar los campos según el modelo Prisma real
 * Este es un template base que debe ser personalizado
 */
export class Create${className}Dto {
  // TODO: Agregar campos reales del modelo ${tableName}
  // Ejemplo:
  // @ApiProperty({ description: 'Nombre del registro' })
  // @IsNotEmpty()
  // @IsString()
  // nombre: string;
  
  @ApiPropertyOptional({ description: 'Observaciones' })
  @IsOptional()
  @IsString()
  observaciones?: string;
}
`;
}

function generateUpdateDtoTemplate(tableName: string): string {
  const className = toPascalCase(tableName);
  const kebab = toKebabCase(tableName);

  return `import { PartialType } from '@nestjs/swagger';
import { Create${className}Dto } from './create-${kebab}.dto';

/**
 * DTO para actualizar ${tableName}
 * Todos los campos son opcionales
 */
export class Update${className}Dto extends PartialType(Create${className}Dto) {}
`;
}

// ═══════════════════════════════════════════════════════════════════
// GENERACIÓN DE ARCHIVOS
// ═══════════════════════════════════════════════════════════════════

function generateCrudModule(tableName: string, baseDir: string) {
  const moduleName = toKebabCase(tableName);
  const moduleDir = path.join(baseDir, moduleName);
  const dtoDir = path.join(moduleDir, 'dto');

  // Crear directorios
  if (!fs.existsSync(moduleDir)) {
    fs.mkdirSync(moduleDir, { recursive: true });
  }
  if (!fs.existsSync(dtoDir)) {
    fs.mkdirSync(dtoDir, { recursive: true });
  }

  // Generar archivos
  const files = [
    { path: path.join(moduleDir, `${moduleName}.module.ts`), content: generateModuleTemplate(tableName) },
    { path: path.join(moduleDir, `${moduleName}.controller.ts`), content: generateControllerTemplate(tableName) },
    { path: path.join(moduleDir, `${moduleName}.service.ts`), content: generateServiceTemplate(tableName) },
    { path: path.join(dtoDir, `create-${moduleName}.dto.ts`), content: generateCreateDtoTemplate(tableName) },
    { path: path.join(dtoDir, `update-${moduleName}.dto.ts`), content: generateUpdateDtoTemplate(tableName) },
  ];

  files.forEach(({ path: filePath, content }) => {
    fs.writeFileSync(filePath, content, 'utf-8');
  });

  console.log(`✅ Módulo ${moduleName} generado (5 archivos)`);
}

// ═══════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════

function main() {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('🚀 GENERADOR AUTOMÁTICO DE MÓDULOS CRUD');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`Total tablas a generar: ${TODAS_LAS_TABLAS.length}`);
  console.log(`Total archivos: ${TODAS_LAS_TABLAS.length * 5}`);
  console.log(`Total endpoints: ${TODAS_LAS_TABLAS.length * 5}`);
  console.log('');

  // Usar path absoluto directo
  const baseDir = path.resolve(process.cwd(), 'apps/api/src');

  let generatedCount = 0;
  let skippedCount = 0;

  TODAS_LAS_TABLAS.forEach((tabla, index) => {
    const moduleName = toKebabCase(tabla);
    const moduleDir = path.join(baseDir, moduleName);

    // Verificar si ya existe
    if (fs.existsSync(moduleDir)) {
      console.log(`⏭️  [${index + 1}/${TODAS_LAS_TABLAS.length}] ${moduleName} - Ya existe, omitido`);
      skippedCount++;
      return;
    }

    try {
      generateCrudModule(tabla, baseDir);
      generatedCount++;
    } catch (error: any) {
      console.error(`❌ Error generando ${moduleName}:`, error?.message || error);
    }
  });

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('📊 RESUMEN GENERACIÓN');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`✅ Módulos generados: ${generatedCount}`);
  console.log(`⏭️  Módulos existentes omitidos: ${skippedCount}`);
  console.log(`📁 Archivos creados: ${generatedCount * 5}`);
  console.log(`🔌 Endpoints REST: ${generatedCount * 5}`);
  console.log('');
  console.log('⚠️  IMPORTANTE: Los DTOs generados son templates básicos.');
  console.log('   Debes ajustarlos según los campos reales de cada modelo Prisma.');
  console.log('');
  console.log('✅ GENERACIÓN COMPLETADA');
  console.log('═══════════════════════════════════════════════════════════════════');
}

// Ejecutar
main();
