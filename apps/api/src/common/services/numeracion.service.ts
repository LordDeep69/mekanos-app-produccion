/**
 * Servicio de Numeración Automática
 * 
 * Genera códigos únicos secuenciales para:
 * - Órdenes de Servicio: ORD-2025-00001
 * - Cotizaciones: COT-2025-00001
 * - Informes: INF-2025-00001
 * - Contratos: CONT-2025-00001
 * - Remisiones: REM-2025-00001
 * 
 * Características:
 * - Reset automático cada año
 * - Transacción atómica (sin duplicados)
 * - Soporte para múltiples tipos de documento
 */

import { PrismaService } from '@mekanos/database';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

/**
 * Tipos de documentos soportados
 */
export enum DocumentType {
  ORDEN_SERVICIO = 'ORD',
  COTIZACION = 'COT',
  INFORME = 'INF',
  CONTRATO = 'CONT',
  REMISION = 'REM',
  ORDEN_COMPRA = 'OC',
  FACTURA = 'FAC',
  RECEPCION = 'REC',
}

/**
 * Configuración de formato por tipo de documento
 */
interface NumberingConfig {
  prefix: string;
  digits: number;
  separator: string;
  includeYear: boolean;
}

const NUMBERING_CONFIGS: Record<DocumentType, NumberingConfig> = {
  [DocumentType.ORDEN_SERVICIO]: {
    prefix: 'ORD',
    digits: 5,
    separator: '-',
    includeYear: true,
  },
  [DocumentType.COTIZACION]: {
    prefix: 'COT',
    digits: 5,
    separator: '-',
    includeYear: true,
  },
  [DocumentType.INFORME]: {
    prefix: 'INF',
    digits: 5,
    separator: '-',
    includeYear: true,
  },
  [DocumentType.CONTRATO]: {
    prefix: 'CONT',
    digits: 5,
    separator: '-',
    includeYear: true,
  },
  [DocumentType.REMISION]: {
    prefix: 'REM',
    digits: 5,
    separator: '-',
    includeYear: true,
  },
  [DocumentType.ORDEN_COMPRA]: {
    prefix: 'OC',
    digits: 5,
    separator: '-',
    includeYear: true,
  },
  [DocumentType.FACTURA]: {
    prefix: 'FAC',
    digits: 6,
    separator: '-',
    includeYear: true,
  },
  [DocumentType.RECEPCION]: {
    prefix: 'REC',
    digits: 5,
    separator: '-',
    includeYear: true,
  },
};

/**
 * Resultado de generación de número
 */
export interface GeneratedNumber {
  /** Código completo formateado (ej: ORD-2025-00001) */
  code: string;
  /** Número secuencial */
  sequence: number;
  /** Año del documento */
  year: number;
  /** Tipo de documento */
  type: DocumentType;
  /** Timestamp de generación */
  generatedAt: Date;
}

@Injectable()
export class NumeracionService implements OnModuleInit {
  private readonly logger = new Logger(NumeracionService.name);
  
  // Cache de secuencias en memoria (por tipo y año)
  private sequenceCache: Map<string, number> = new Map();
  
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    this.logger.log('Servicio de Numeración inicializado');
    // Precargar secuencias actuales del año en curso
    await this.loadCurrentYearSequences();
  }

  /**
   * Genera el siguiente número para un tipo de documento
   */
  async generateNextNumber(type: DocumentType): Promise<GeneratedNumber> {
    const currentYear = new Date().getFullYear();
    const cacheKey = `${type}-${currentYear}`;

    // Usar transacción para garantizar unicidad
    const result = await this.prisma.$transaction(async (tx) => {
      // Buscar o crear el registro de secuencia
      let sequenceRecord = await tx.sequence_counter.findUnique({
        where: {
          type_year: {
            type: type,
            year: currentYear,
          },
        },
      });

      if (!sequenceRecord) {
        // Crear nuevo registro para este tipo/año
        sequenceRecord = await tx.sequence_counter.create({
          data: {
            type: type,
            year: currentYear,
            currentValue: 1,
          },
        });
      } else {
        // Incrementar secuencia
        sequenceRecord = await tx.sequence_counter.update({
          where: {
            type_year: {
              type: type,
              year: currentYear,
            },
          },
          data: {
            currentValue: {
              increment: 1,
            },
          },
        });
      }

      return sequenceRecord;
    });

    // Actualizar cache
    this.sequenceCache.set(cacheKey, result.currentValue);

    // Formatear código
    const code = this.formatCode(type, currentYear, result.currentValue);

    return {
      code,
      sequence: result.currentValue,
      year: currentYear,
      type,
      generatedAt: new Date(),
    };
  }

  /**
   * Obtiene el próximo número sin consumirlo (preview)
   */
  async previewNextNumber(type: DocumentType): Promise<string> {
    const currentYear = new Date().getFullYear();
    const cacheKey = `${type}-${currentYear}`;

    let nextSequence = (this.sequenceCache.get(cacheKey) ?? 0) + 1;

    // Si no está en cache, consultar BD
    if (!this.sequenceCache.has(cacheKey)) {
      const record = await this.prisma.sequence_counter.findUnique({
        where: {
          type_year: {
            type: type,
            year: currentYear,
          },
        },
      });
      nextSequence = (record?.currentValue ?? 0) + 1;
    }

    return this.formatCode(type, currentYear, nextSequence);
  }

  /**
   * Valida si un código tiene el formato correcto
   */
  validateCode(code: string, type: DocumentType): boolean {
    const config = NUMBERING_CONFIGS[type];
    const pattern = new RegExp(
      `^${config.prefix}${config.separator}\\d{4}${config.separator}\\d{${config.digits}}$`
    );
    return pattern.test(code);
  }

  /**
   * Extrae componentes de un código
   */
  parseCode(code: string): { prefix: string; year: number; sequence: number } | null {
    const parts = code.split('-');
    if (parts.length !== 3) return null;

    const [prefix, yearStr, seqStr] = parts;
    const year = parseInt(yearStr, 10);
    const sequence = parseInt(seqStr, 10);

    if (isNaN(year) || isNaN(sequence)) return null;

    return { prefix, year, sequence };
  }

  /**
   * Obtiene estadísticas de numeración
   */
  async getStatistics(type?: DocumentType): Promise<{
    type: string;
    year: number;
    currentValue: number;
    lastCode: string;
  }[]> {
    const where = type ? { type } : {};
    
    const records = await this.prisma.sequence_counter.findMany({
      where,
      orderBy: [{ year: 'desc' }, { type: 'asc' }],
    });

    return records.map((r: { type: string; year: number; currentValue: number }) => ({
      type: r.type,
      year: r.year,
      currentValue: r.currentValue,
      lastCode: this.formatCode(r.type as DocumentType, r.year, r.currentValue),
    }));
  }

  /**
   * Resetea la secuencia para un tipo (solo para testing)
   */
  async resetSequence(type: DocumentType, year?: number): Promise<void> {
    const targetYear = year ?? new Date().getFullYear();
    
    await this.prisma.sequence_counter.deleteMany({
      where: {
        type: type,
        year: targetYear,
      },
    });

    this.sequenceCache.delete(`${type}-${targetYear}`);
    this.logger.warn(`Secuencia reseteada: ${type} para año ${targetYear}`);
  }

  /**
   * Formatea el código completo
   */
  private formatCode(type: DocumentType, year: number, sequence: number): string {
    const config = NUMBERING_CONFIGS[type];
    const paddedSequence = sequence.toString().padStart(config.digits, '0');
    
    if (config.includeYear) {
      return `${config.prefix}${config.separator}${year}${config.separator}${paddedSequence}`;
    }
    
    return `${config.prefix}${config.separator}${paddedSequence}`;
  }

  /**
   * Carga secuencias del año actual en cache
   */
  private async loadCurrentYearSequences(): Promise<void> {
    const currentYear = new Date().getFullYear();
    
    try {
      const records = await this.prisma.sequence_counter.findMany({
        where: { year: currentYear },
      });

      for (const record of records) {
        this.sequenceCache.set(`${record.type}-${record.year}`, record.currentValue);
      }

      this.logger.log(`Cache de secuencias cargado: ${records.length} registros`);
    } catch (error) {
      // Si la tabla no existe aún, continuar sin error
      this.logger.warn('Tabla de secuencias no encontrada, se creará con el primer uso');
    }
  }
}
