/**
 * MEKANOS S.A.S - Motor Universal de Activos EAM
 * 
 * UomConversionService: Motor Dimensional Afín de Unidades de Medida
 * 
 * Implementa el modelo de transformación dimensional:
 *   y = a * x + b
 * donde 'y' es el valor en la unidad canónica base de la magnitud física,
 * 'x' es el valor en la unidad evaluada, 'a' es la pendiente (escala) y 'b' el desplazamiento (bias).
 * 
 * Permite conversión bidireccional exacta:
 *   x_dest = ((a_origen * x_origen + b_origen) - b_destino) / a_destino
 */

import { Injectable, Optional } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface InfoUnidad {
  codigo: string;
  nombre: string;
  simbolo: string;
  magnitudCodigo: string;
  factorA: number;
  factorB: number;
  esUnidadBase: boolean;
  permiteDecimales: boolean;
  aliases: string[];
}

export interface ResultadoConversionBase {
  valorOriginal: number;
  unidadOriginal: string;
  valorBase: number;
  unidadBaseCodigo: string;
  simboloBase: string;
  magnitudCodigo: string;
}

export interface OpcionesConversion {
  decimales?: number;
  factorPotencia?: number; // Para conversiones kVA <-> kW si difiere de 0.8
}

export interface OpcionesFormateo {
  decimales?: number;
  parentesis?: boolean;
  espacio?: boolean;
}

@Injectable()
export class UomConversionService {
  /**
   * Catálogo canónico estático in-memory.
   * Garantiza Zero-Latency, ejecución determinista y disponibilidad sin mockeo de BD.
   */
  private static readonly UNIDADES_CANONICAS: Record<string, InfoUnidad> = {
    // --------------------------------------------------------------------------
    // VOLUMEN (Base: LIT)
    // --------------------------------------------------------------------------
    LIT: {
      codigo: 'LIT',
      nombre: 'Litros',
      simbolo: 'L',
      magnitudCodigo: 'VOLUMEN',
      factorA: 1.0,
      factorB: 0.0,
      esUnidadBase: true,
      permiteDecimales: true,
      aliases: ['L', 'LIT', 'LITRO', 'LITROS', 'LT', 'LTS'],
    },
    GAL: {
      codigo: 'GAL',
      nombre: 'Galones (US)',
      simbolo: 'Gal',
      magnitudCodigo: 'VOLUMEN',
      factorA: 3.785411784,
      factorB: 0.0,
      esUnidadBase: false,
      permiteDecimales: true,
      aliases: ['GAL', 'GALON', 'GALONES', 'GLN', 'GLNS', 'GALS'],
    },
    ML: {
      codigo: 'ML',
      nombre: 'Mililitros',
      simbolo: 'mL',
      magnitudCodigo: 'VOLUMEN',
      factorA: 0.001,
      factorB: 0.0,
      esUnidadBase: false,
      permiteDecimales: true,
      aliases: ['ML', 'CC', 'CENTIMETROS_CUBICOS'],
    },
    M3_VOL: {
      codigo: 'M3_VOL',
      nombre: 'Metros Cúbicos',
      simbolo: 'm³',
      magnitudCodigo: 'VOLUMEN',
      factorA: 1000.0,
      factorB: 0.0,
      esUnidadBase: false,
      permiteDecimales: true,
      aliases: ['M3', 'M^3', 'METRO_CUBICO', 'METROS_CUBICOS'],
    },

    // --------------------------------------------------------------------------
    // POTENCIA (Base: KW)
    // --------------------------------------------------------------------------
    KW: {
      codigo: 'KW',
      nombre: 'Kilovatios',
      simbolo: 'kW',
      magnitudCodigo: 'POTENCIA',
      factorA: 1.0,
      factorB: 0.0,
      esUnidadBase: true,
      permiteDecimales: true,
      aliases: ['KW', 'KILOVATIO', 'KILOVATIOS', 'KILOWATT', 'KILOWATTS'],
    },
    HP: {
      codigo: 'HP',
      nombre: 'Caballos de Fuerza',
      simbolo: 'HP',
      magnitudCodigo: 'POTENCIA',
      factorA: 0.745699872,
      factorB: 0.0,
      esUnidadBase: false,
      permiteDecimales: true,
      aliases: ['HP', 'CABALLO', 'CABALLOS', 'BHP', 'CV'],
    },
    KVA: {
      codigo: 'KVA',
      nombre: 'Kilovoltiamperios',
      simbolo: 'kVA',
      magnitudCodigo: 'POTENCIA',
      factorA: 0.8, // Factor de potencia estándar cos(phi) = 0.8
      factorB: 0.0,
      esUnidadBase: false,
      permiteDecimales: true,
      aliases: ['KVA', 'KILOVOLTIAMPERIO', 'KILOVOLTIAMPERIOS'],
    },
    BTU_H: {
      codigo: 'BTU_H',
      nombre: 'BTU por hora',
      simbolo: 'BTU/h',
      magnitudCodigo: 'POTENCIA',
      factorA: 0.000293071,
      factorB: 0.0,
      esUnidadBase: false,
      permiteDecimales: true,
      aliases: ['BTU_H', 'BTU/H', 'BTUH', 'BTU'],
    },
    TR: {
      codigo: 'TR',
      nombre: 'Toneladas de Refrigeración',
      simbolo: 'TR',
      magnitudCodigo: 'POTENCIA',
      factorA: 3.51685284,
      factorB: 0.0,
      esUnidadBase: false,
      permiteDecimales: true,
      aliases: ['TR', 'TON_REF', 'TONELADA_REFRIGERACION', 'TONELADAS_REFRIGERACION'],
    },
    W: {
      codigo: 'W',
      nombre: 'Vatios',
      simbolo: 'W',
      magnitudCodigo: 'POTENCIA',
      factorA: 0.001,
      factorB: 0.0,
      esUnidadBase: false,
      permiteDecimales: true,
      aliases: ['W', 'WATT', 'WATTS', 'VATIO', 'VATIOS'],
    },

    // --------------------------------------------------------------------------
    // PRESION (Base: PSI)
    // --------------------------------------------------------------------------
    PSI: {
      codigo: 'PSI',
      nombre: 'Libras por Pulgada Cuadrada',
      simbolo: 'PSI',
      magnitudCodigo: 'PRESION',
      factorA: 1.0,
      factorB: 0.0,
      esUnidadBase: true,
      permiteDecimales: true,
      aliases: ['PSI', 'PSIG', 'LB/IN2', 'LBS/PULG2'],
    },
    BAR: {
      codigo: 'BAR',
      nombre: 'Bares',
      simbolo: 'bar',
      magnitudCodigo: 'PRESION',
      factorA: 14.5037738, // 1 bar = 14.5037738 PSI
      factorB: 0.0,
      esUnidadBase: false,
      permiteDecimales: true,
      aliases: ['BAR', 'BARES'],
    },
    KPA: {
      codigo: 'KPA',
      nombre: 'Kilopascales',
      simbolo: 'kPa',
      magnitudCodigo: 'PRESION',
      factorA: 0.1450377, // 1 kPa = 0.1450377 PSI
      factorB: 0.0,
      esUnidadBase: false,
      permiteDecimales: true,
      aliases: ['KPA', 'KILOPASCAL', 'KILOPASCALES'],
    },
    MPA: {
      codigo: 'MPA',
      nombre: 'Megapascales',
      simbolo: 'MPa',
      magnitudCodigo: 'PRESION',
      factorA: 145.037738,
      factorB: 0.0,
      esUnidadBase: false,
      permiteDecimales: true,
      aliases: ['MPA', 'MEGAPASCAL', 'MEGAPASCALES'],
    },

    // --------------------------------------------------------------------------
    // TEMPERATURA (Base: C)
    // --------------------------------------------------------------------------
    C: {
      codigo: 'C',
      nombre: 'Grados Celsius',
      simbolo: '°C',
      magnitudCodigo: 'TEMPERATURA',
      factorA: 1.0,
      factorB: 0.0,
      esUnidadBase: true,
      permiteDecimales: true,
      aliases: ['C', '°C', 'CELSIUS', 'CENTIGRADOS', 'GRADOS_C', 'GRADOS_CELSIUS'],
    },
    F: {
      codigo: 'F',
      nombre: 'Grados Fahrenheit',
      simbolo: '°F',
      magnitudCodigo: 'TEMPERATURA',
      factorA: 5 / 9, // ~0.5555555555555556
      factorB: -160 / 9, // ~-17.77777777777778  => C = (F - 32) * 5/9 = F * (5/9) - 160/9
      esUnidadBase: false,
      permiteDecimales: true,
      aliases: ['F', '°F', 'FAHRENHEIT', 'GRADOS_F', 'GRADOS_FAHRENHEIT'],
    },
    K: {
      codigo: 'K',
      nombre: 'Kelvin',
      simbolo: 'K',
      magnitudCodigo: 'TEMPERATURA',
      factorA: 1.0,
      factorB: -273.15, // C = K - 273.15
      esUnidadBase: false,
      permiteDecimales: true,
      aliases: ['K', 'KELVIN'],
    },

    // --------------------------------------------------------------------------
    // CAUDAL (Base: M3H)
    // --------------------------------------------------------------------------
    M3H: {
      codigo: 'M3H',
      nombre: 'Metros Cúbicos por Hora',
      simbolo: 'm³/h',
      magnitudCodigo: 'CAUDAL',
      factorA: 1.0,
      factorB: 0.0,
      esUnidadBase: true,
      permiteDecimales: true,
      aliases: ['M3H', 'M3/H', 'M^3/H', 'M3_H'],
    },
    GPM: {
      codigo: 'GPM',
      nombre: 'Galones por Minuto',
      simbolo: 'GPM',
      magnitudCodigo: 'CAUDAL',
      factorA: 0.2271247, // 1 GPM = 0.2271247 m³/h
      factorB: 0.0,
      esUnidadBase: false,
      permiteDecimales: true,
      aliases: ['GPM', 'GAL/MIN', 'GALONES/MIN'],
    },
    LPS: {
      codigo: 'LPS',
      nombre: 'Litros por Segundo',
      simbolo: 'L/s',
      magnitudCodigo: 'CAUDAL',
      factorA: 3.6, // 1 L/s = 3.6 m³/h
      factorB: 0.0,
      esUnidadBase: false,
      permiteDecimales: true,
      aliases: ['LPS', 'L/S', 'LITROS/SEG'],
    },
    LPM: {
      codigo: 'LPM',
      nombre: 'Litros por Minuto',
      simbolo: 'L/min',
      magnitudCodigo: 'CAUDAL',
      factorA: 0.06, // 1 L/min = 0.06 m³/h
      factorB: 0.0,
      esUnidadBase: false,
      permiteDecimales: true,
      aliases: ['LPM', 'L/MIN', 'LITROS/MIN'],
    },

    // --------------------------------------------------------------------------
    // ELECTRICA_VOLTAJE (Base: V)
    // --------------------------------------------------------------------------
    V: {
      codigo: 'V',
      nombre: 'Voltios',
      simbolo: 'V',
      magnitudCodigo: 'ELECTRICA_VOLTAJE',
      factorA: 1.0,
      factorB: 0.0,
      esUnidadBase: true,
      permiteDecimales: true,
      aliases: ['V', 'VOLT', 'VOLTIOS', 'VAC', 'VDC'],
    },
    KV_VOLT: {
      codigo: 'KV_VOLT',
      nombre: 'Kilovoltios',
      simbolo: 'kV',
      magnitudCodigo: 'ELECTRICA_VOLTAJE',
      factorA: 1000.0,
      factorB: 0.0,
      esUnidadBase: false,
      permiteDecimales: true,
      aliases: ['KV', 'KILOVOLTIOS'],
    },

    // --------------------------------------------------------------------------
    // ELECTRICA_CORRIENTE (Base: A)
    // --------------------------------------------------------------------------
    A: {
      codigo: 'A',
      nombre: 'Amperios',
      simbolo: 'A',
      magnitudCodigo: 'ELECTRICA_CORRIENTE',
      factorA: 1.0,
      factorB: 0.0,
      esUnidadBase: true,
      permiteDecimales: true,
      aliases: ['A', 'AMP', 'AMPERIOS', 'AMPERIO'],
    },
    MA: {
      codigo: 'MA',
      nombre: 'Miliamperios',
      simbolo: 'mA',
      magnitudCodigo: 'ELECTRICA_CORRIENTE',
      factorA: 0.001,
      factorB: 0.0,
      esUnidadBase: false,
      permiteDecimales: true,
      aliases: ['MA', 'MILIAMPERIOS'],
    },

    // --------------------------------------------------------------------------
    // FRECUENCIA_VELOCIDAD (Base: RPM)
    // --------------------------------------------------------------------------
    RPM: {
      codigo: 'RPM',
      nombre: 'Revoluciones por Minuto',
      simbolo: 'RPM',
      magnitudCodigo: 'FRECUENCIA_VELOCIDAD',
      factorA: 1.0,
      factorB: 0.0,
      esUnidadBase: true,
      permiteDecimales: false,
      aliases: ['RPM', 'REV/MIN', 'RPM_MOTOR'],
    },
    HZ: {
      codigo: 'HZ',
      nombre: 'Hercios',
      simbolo: 'Hz',
      magnitudCodigo: 'FRECUENCIA_VELOCIDAD',
      factorA: 1.0, // Equivalente dimensional en frecuencia
      factorB: 0.0,
      esUnidadBase: false,
      permiteDecimales: true,
      aliases: ['HZ', 'HERCIOS', 'HERTZ'],
    },

    // --------------------------------------------------------------------------
    // LONGITUD (Base: MET)
    // --------------------------------------------------------------------------
    MET: {
      codigo: 'MET',
      nombre: 'Metros',
      simbolo: 'm',
      magnitudCodigo: 'LONGITUD',
      factorA: 1.0,
      factorB: 0.0,
      esUnidadBase: true,
      permiteDecimales: true,
      aliases: ['MET', 'M', 'METRO', 'METROS'],
    },
    MM: {
      codigo: 'MM',
      nombre: 'Milímetros',
      simbolo: 'mm',
      magnitudCodigo: 'LONGITUD',
      factorA: 0.001,
      factorB: 0.0,
      esUnidadBase: false,
      permiteDecimales: true,
      aliases: ['MM', 'MILIMETRO', 'MILIMETROS'],
    },
    PULG: {
      codigo: 'PULG',
      nombre: 'Pulgadas',
      simbolo: 'in',
      magnitudCodigo: 'LONGITUD',
      factorA: 0.0254, // 1 in = 0.0254 m
      factorB: 0.0,
      esUnidadBase: false,
      permiteDecimales: true,
      aliases: ['PULG', 'IN', 'INCH', 'PULGADA', 'PULGADAS', '"'],
    },

    // --------------------------------------------------------------------------
    // TIEMPO_USO (Base: HORAS)
    // --------------------------------------------------------------------------
    HORAS: {
      codigo: 'HORAS',
      nombre: 'Horas',
      simbolo: 'h',
      magnitudCodigo: 'TIEMPO_USO',
      factorA: 1.0,
      factorB: 0.0,
      esUnidadBase: true,
      permiteDecimales: true,
      aliases: ['HORAS', 'H', 'HR', 'HRS', 'HORA'],
    },
    MIN: {
      codigo: 'MIN',
      nombre: 'Minutos',
      simbolo: 'min',
      magnitudCodigo: 'TIEMPO_USO',
      factorA: 1 / 60,
      factorB: 0.0,
      esUnidadBase: false,
      permiteDecimales: true,
      aliases: ['MIN', 'MINUTO', 'MINUTOS'],
    },
    DIAS: {
      codigo: 'DIAS',
      nombre: 'Días',
      simbolo: 'd',
      magnitudCodigo: 'TIEMPO_USO',
      factorA: 24.0,
      factorB: 0.0,
      esUnidadBase: false,
      permiteDecimales: true,
      aliases: ['DIAS', 'DIA', 'D'],
    },

    // --------------------------------------------------------------------------
    // ADIMENSIONAL (Base: UND)
    // --------------------------------------------------------------------------
    UND: {
      codigo: 'UND',
      nombre: 'Unidad',
      simbolo: 'und',
      magnitudCodigo: 'ADIMENSIONAL',
      factorA: 1.0,
      factorB: 0.0,
      esUnidadBase: true,
      permiteDecimales: false,
      aliases: ['UND', 'UNIDAD', 'UNIDADES', 'PZA', 'PZ', 'PTE'],
    },
  };

  /** Índice inverso para resolución ultra rápida de alias a código canónico */
  private static readonly ALIAS_MAP: Map<string, string> = (() => {
    const map = new Map<string, string>();
    for (const [codigo, info] of Object.entries(UomConversionService.UNIDADES_CANONICAS)) {
      map.set(codigo.toUpperCase().trim(), codigo);
      for (const alias of info.aliases) {
        map.set(alias.toUpperCase().trim(), codigo);
      }
    }
    return map;
  })();

  constructor(@Optional() private readonly prisma?: PrismaService) {}

  /**
   * Sincroniza el catálogo dinámico de unidades desde PostgreSQL en tiempo de ejecución.
   * Si no hay conexión o falla, el servicio opera de forma ininterrumpida con el catálogo estático.
   */
  public async recargarDesdeBD(): Promise<number> {
    if (!this.prisma) return 0;
    try {
      const unidades = await this.prisma.unidades_medida.findMany({
        where: { activo: true },
        include: { magnitud: true },
      });

      for (const u of unidades) {
        if (!u.codigo) continue;
        const cod = u.codigo.toUpperCase().trim();
        const factorA = u.factor_a !== null ? Number(u.factor_a) : 1.0;
        const factorB = u.factor_b !== null ? Number(u.factor_b) : 0.0;
        const magCodigo = u.magnitud?.codigo_magnitud || 'ADIMENSIONAL';

        const existing = UomConversionService.UNIDADES_CANONICAS[cod];
        UomConversionService.UNIDADES_CANONICAS[cod] = {
          codigo: cod,
          nombre: u.nombre,
          simbolo: u.simbolo || cod,
          magnitudCodigo: magCodigo,
          factorA,
          factorB,
          esUnidadBase: !!u.es_unidad_base,
          permiteDecimales: u.permite_decimales !== false,
          aliases: existing?.aliases || [cod],
        };
        UomConversionService.ALIAS_MAP.set(cod, cod);
      }
      return unidades.length;
    } catch {
      return 0;
    }
  }

  /**
   * Resuelve el código canónico de una unidad a partir de cualquier alias o símbolo.
   */
  public static normalizarCodigo(unidad: string): string | null {
    if (!unidad || typeof unidad !== 'string') return null;
    const limpia = unidad.trim().toUpperCase().replace(/[\s_]+/g, '_');
    // Casos especiales directos
    if (limpia === '°C' || limpia === 'ºC' || limpia === 'C') return 'C';
    if (limpia === '°F' || limpia === 'ºF' || limpia === 'F') return 'F';
    if (limpia === 'M³' || limpia === 'M3') return 'M3_VOL';
    if (limpia === 'M³/H' || limpia === 'M3/H') return 'M3H';
    if (limpia === 'KV' || limpia === 'KILOVOLT') return 'KV_VOLT';

    const match = UomConversionService.ALIAS_MAP.get(limpia);
    return match || null;
  }

  /**
   * Obtiene la información técnica y dimensional de una unidad.
   */
  public static obtenerInfo(unidad: string): InfoUnidad | null {
    const codigoCanónico = UomConversionService.normalizarCodigo(unidad);
    if (!codigoCanónico) return null;
    return UomConversionService.UNIDADES_CANONICAS[codigoCanónico] || null;
  }

  /**
   * Determina si dos unidades pertenecen a la misma magnitud física y son convertibles.
   */
  public static sonCompatibles(unidadOrigen: string, unidadDestino: string): boolean {
    const infoOrigen = UomConversionService.obtenerInfo(unidadOrigen);
    const infoDestino = UomConversionService.obtenerInfo(unidadDestino);
    if (!infoOrigen || !infoDestino) return false;
    return infoOrigen.magnitudCodigo === infoDestino.magnitudCodigo;
  }

  /**
   * Transforma cualquier valor a la unidad base de su magnitud física:
   *   y = a * x + b
   */
  public static convertirABase(valor: number, unidadOrigen: string): ResultadoConversionBase {
    if (typeof valor !== 'number' || isNaN(valor)) {
      throw new Error(`UomConversionService: El valor proporcionado (${valor}) no es un número válido.`);
    }

    const info = UomConversionService.obtenerInfo(unidadOrigen);
    if (!info) {
      throw new Error(`UomConversionService: Unidad origen desconocida '${unidadOrigen}'.`);
    }

    const valorBase = info.factorA * valor + info.factorB;
    const infoBase = UomConversionService.obtenerInfoBaseDeMagnitud(info.magnitudCodigo);

    return {
      valorOriginal: valor,
      unidadOriginal: info.codigo,
      valorBase,
      unidadBaseCodigo: infoBase?.codigo || info.codigo,
      simboloBase: infoBase?.simbolo || info.simbolo,
      magnitudCodigo: info.magnitudCodigo,
    };
  }

  /**
   * Conversión universal entre dos unidades cualesquiera de la misma magnitud:
   *   x_dest = ((a_orig * x_orig + b_orig) - b_dest) / a_dest
   */
  public static convertir(
    valor: number,
    unidadOrigen: string,
    unidadDestino: string,
    opciones?: OpcionesConversion,
  ): number {
    if (typeof valor !== 'number' || isNaN(valor)) {
      throw new Error(`UomConversionService: Valor no numérico: ${valor}`);
    }

    const infoOrigen = UomConversionService.obtenerInfo(unidadOrigen);
    const infoDestino = UomConversionService.obtenerInfo(unidadDestino);

    if (!infoOrigen) {
      throw new Error(`UomConversionService: Unidad de origen '${unidadOrigen}' no está registrada en el catálogo.`);
    }
    if (!infoDestino) {
      throw new Error(`UomConversionService: Unidad de destino '${unidadDestino}' no está registrada en el catálogo.`);
    }

    if (infoOrigen.magnitudCodigo !== infoDestino.magnitudCodigo) {
      throw new Error(
        `UomConversionService: Incompatibilidad dimensional. No se puede convertir ${infoOrigen.codigo} (${infoOrigen.magnitudCodigo}) a ${infoDestino.codigo} (${infoDestino.magnitudCodigo}).`,
      );
    }

    // Caso idéntico: no calcular para evitar errores de coma flotante
    if (infoOrigen.codigo === infoDestino.codigo) {
      return opciones?.decimales !== undefined ? Number(valor.toFixed(opciones.decimales)) : valor;
    }

    // Ajuste dinámico de factor de potencia para kVA si se especifica
    let factorA_orig = infoOrigen.factorA;
    let factorA_dest = infoDestino.factorA;

    if (opciones?.factorPotencia && opciones.factorPotencia > 0) {
      if (infoOrigen.codigo === 'KVA') {
        factorA_orig = opciones.factorPotencia;
      }
      if (infoDestino.codigo === 'KVA') {
        factorA_dest = opciones.factorPotencia;
      }
    }

    // 1. Convertir origen a base: valor_base = a1 * valor + b1
    const valorBase = factorA_orig * valor + infoOrigen.factorB;

    // 2. Convertir base a destino: valor_dest = (valor_base - b2) / a2
    const valorDestino = (valorBase - infoDestino.factorB) / factorA_dest;

    if (opciones?.decimales !== undefined) {
      return Number(valorDestino.toFixed(opciones.decimales));
    }

    return valorDestino;
  }

  /**
   * Genera una representación de texto estandarizada con equivalencia:
   * Ej: 65 GAL a LIT => "65 Gal (~246.05 L)"
   * Ej: 100 HP a KW => "100 HP (~74.57 kW)"
   * Ej: 150 PSI a BAR => "150 PSI (~10.34 bar)"
   */
  public static formatearEquivalencia(
    valor: number,
    unidadOrigen: string,
    unidadDestino: string,
    opciones?: OpcionesFormateo,
  ): string {
    const infoOrigen = UomConversionService.obtenerInfo(unidadOrigen);
    const infoDestino = UomConversionService.obtenerInfo(unidadDestino);

    if (!infoOrigen || !infoDestino) {
      return `${valor} ${unidadOrigen}`;
    }

    const decimales = opciones?.decimales ?? (infoDestino.permiteDecimales ? 2 : 0);
    const converted = UomConversionService.convertir(valor, unidadOrigen, unidadDestino, { decimales });

    const decOrig = infoOrigen.permiteDecimales ? (Number.isInteger(valor) ? 0 : 2) : 0;
    const strOrig = `${decOrig > 0 ? valor.toFixed(decOrig) : valor} ${infoOrigen.simbolo}`;
    const strDest = `${converted} ${infoDestino.simbolo}`;

    if (opciones?.parentesis === false) {
      return `${strOrig} / ~${strDest}`;
    }

    return `${strOrig} (~${strDest})`;
  }

  /**
   * Formatea un valor con su símbolo canónico oficial:
   * Ej: (75, 'HP') => "75 HP"
   * Ej: (246.05, 'LIT') => "246.05 L"
   * Ej: (82.2, 'C') => "82.2 °C"
   */
  public static formatearConSimbolo(
    valor: number,
    unidad: string,
    opciones?: { decimales?: number },
  ): string {
    const info = UomConversionService.obtenerInfo(unidad);
    if (!info) return `${valor} ${unidad}`;

    const num = opciones?.decimales !== undefined ? valor.toFixed(opciones.decimales) : valor;
    return `${num} ${info.simbolo}`;
  }

  /**
   * Obtiene la unidad base canónica para una magnitud dada.
   */
  public static obtenerInfoBaseDeMagnitud(magnitudCodigo: string): InfoUnidad | null {
    for (const info of Object.values(UomConversionService.UNIDADES_CANONICAS)) {
      if (info.magnitudCodigo === magnitudCodigo && info.esUnidadBase) {
        return info;
      }
    }
    return null;
  }

  /**
   * Lista todas las unidades registradas para una magnitud dada.
   */
  public static listarPorMagnitud(magnitudCodigo: string): InfoUnidad[] {
    return Object.values(UomConversionService.UNIDADES_CANONICAS).filter(
      (u) => u.magnitudCodigo === magnitudCodigo,
    );
  }

  // --------------------------------------------------------------------------
  // MÉTODOS DE INSTANCIA (Para inyección de dependencias NestJS)
  // --------------------------------------------------------------------------

  public normalizarCodigo(unidad: string): string | null {
    return UomConversionService.normalizarCodigo(unidad);
  }

  public obtenerInfo(unidad: string): InfoUnidad | null {
    return UomConversionService.obtenerInfo(unidad);
  }

  public sonCompatibles(unidadOrigen: string, unidadDestino: string): boolean {
    return UomConversionService.sonCompatibles(unidadOrigen, unidadDestino);
  }

  public convertirABase(valor: number, unidadOrigen: string): ResultadoConversionBase {
    return UomConversionService.convertirABase(valor, unidadOrigen);
  }

  public convertir(
    valor: number,
    unidadOrigen: string,
    unidadDestino: string,
    opciones?: OpcionesConversion,
  ): number {
    return UomConversionService.convertir(valor, unidadOrigen, unidadDestino, opciones);
  }

  public formatearEquivalencia(
    valor: number,
    unidadOrigen: string,
    unidadDestino: string,
    opciones?: OpcionesFormateo,
  ): string {
    return UomConversionService.formatearEquivalencia(valor, unidadOrigen, unidadDestino, opciones);
  }

  public formatearConSimbolo(valor: number, unidad: string, opciones?: { decimales?: number }): string {
    return UomConversionService.formatearConSimbolo(valor, unidad, opciones);
  }

  public listarPorMagnitud(magnitudCodigo: string): InfoUnidad[] {
    return UomConversionService.listarPorMagnitud(magnitudCodigo);
  }
}
