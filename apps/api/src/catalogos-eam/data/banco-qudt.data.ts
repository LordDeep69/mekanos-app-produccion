export interface UnidadPreset {
  codigo: string;
  nombre: string;
  simbolo: string;
  factor_a: number;
  factor_b?: number;
  es_unidad_base: boolean;
  permite_decimales?: boolean;
}

export interface MagnitudPreset {
  codigo_magnitud: string;
  nombre_magnitud: string;
  categoria: 'MECANICA' | 'TRANSPORTE' | 'ELECTRICIDAD' | 'FLUIDOS' | 'TERMICA' | 'OPERACION' | 'ACUSTICA_OPTICA';
  descripcion: string;
  unidad_base_codigo: string;
  unidades: UnidadPreset[];
}

export const BANCO_UNIVERSAL_QUDT: MagnitudPreset[] = [
  {
    codigo_magnitud: 'MASA',
    nombre_magnitud: 'Masa / Capacidad de Carga',
    categoria: 'MECANICA',
    descripcion: 'Masa inercial y capacidad de carga estática/dinámica en transporte y elevación (ISO 80000-4)',
    unidad_base_codigo: 'KG',
    unidades: [
      { codigo: 'KG', nombre: 'Kilogramo', simbolo: 'kg', factor_a: 1.0, es_unidad_base: true, permite_decimales: true },
      { codigo: 'G', nombre: 'Gramo', simbolo: 'g', factor_a: 0.001, es_unidad_base: false, permite_decimales: true },
      { codigo: 'TON', nombre: 'Tonelada Métrica', simbolo: 't', factor_a: 1000.0, es_unidad_base: false, permite_decimales: true },
      { codigo: 'LB', nombre: 'Libra Avoirdupois', simbolo: 'lb', factor_a: 0.45359237, es_unidad_base: false, permite_decimales: true },
      { codigo: 'OZ', nombre: 'Onza', simbolo: 'oz', factor_a: 0.02834952, es_unidad_base: false, permite_decimales: true },
      { codigo: 'QUINTAL', nombre: 'Quintal Métrico', simbolo: 'q', factor_a: 100.0, es_unidad_base: false, permite_decimales: true },
    ],
  },
  {
    codigo_magnitud: 'VELOCIDAD_LINEAL',
    nombre_magnitud: 'Velocidad Lineal / Traslación',
    categoria: 'TRANSPORTE',
    descripcion: 'Velocidad de desplazamiento lineal de cabinas, vehículos y bandas transportadoras',
    unidad_base_codigo: 'MS',
    unidades: [
      { codigo: 'MS', nombre: 'Metro por Segundo', simbolo: 'm/s', factor_a: 1.0, es_unidad_base: true, permite_decimales: true },
      { codigo: 'KMH', nombre: 'Kilómetro por Hora', simbolo: 'km/h', factor_a: 0.2777777778, es_unidad_base: false, permite_decimales: true },
      { codigo: 'FPM', nombre: 'Pies por Minuto', simbolo: 'fpm', factor_a: 0.00508, es_unidad_base: false, permite_decimales: true },
      { codigo: 'FPS', nombre: 'Pies por Segundo', simbolo: 'ft/s', factor_a: 0.3048, es_unidad_base: false, permite_decimales: true },
      { codigo: 'M_MIN', nombre: 'Metro por Minuto', simbolo: 'm/min', factor_a: 0.0166666667, es_unidad_base: false, permite_decimales: true },
      { codigo: 'NUDO', nombre: 'Nudo Náutico / Aéreo', simbolo: 'kn', factor_a: 0.5144444444, es_unidad_base: false, permite_decimales: true },
    ],
  },
  {
    codigo_magnitud: 'ACELERACION',
    nombre_magnitud: 'Aceleración Lineal / Confort',
    categoria: 'TRANSPORTE',
    descripcion: 'Tasa de cambio de velocidad y aceleración de arranque/frenado en elevación y tracción',
    unidad_base_codigo: 'MS2',
    unidades: [
      { codigo: 'MS2', nombre: 'Metro por Segundo al Cuadrado', simbolo: 'm/s²', factor_a: 1.0, es_unidad_base: true, permite_decimales: true },
      { codigo: 'GRAVEDAD', nombre: 'Gravedad Terrestre Estándar', simbolo: 'g', factor_a: 9.80665, es_unidad_base: false, permite_decimales: true },
      { codigo: 'FTS2', nombre: 'Pies por Segundo al Cuadrado', simbolo: 'ft/s²', factor_a: 0.3048, es_unidad_base: false, permite_decimales: true },
      { codigo: 'MMS2', nombre: 'Milímetros por Segundo al Cuadrado', simbolo: 'mm/s²', factor_a: 0.001, es_unidad_base: false, permite_decimales: true },
    ],
  },
  {
    codigo_magnitud: 'FUERZA',
    nombre_magnitud: 'Fuerza Mecánica y Tracción',
    categoria: 'MECANICA',
    descripcion: 'Fuerza transmitida por cables, cilindros hidráulicos y transmisiones mecánicas',
    unidad_base_codigo: 'N',
    unidades: [
      { codigo: 'N', nombre: 'Newton', simbolo: 'N', factor_a: 1.0, es_unidad_base: true, permite_decimales: true },
      { codigo: 'KN', nombre: 'Kilonewton', simbolo: 'kN', factor_a: 1000.0, es_unidad_base: false, permite_decimales: true },
      { codigo: 'KGF', nombre: 'Kilogramo-Fuerza / Kilopondio', simbolo: 'kgf', factor_a: 9.80665, es_unidad_base: false, permite_decimales: true },
      { codigo: 'LBF', nombre: 'Libra-Fuerza', simbolo: 'lbf', factor_a: 4.4482216, es_unidad_base: false, permite_decimales: true },
      { codigo: 'MN', nombre: 'Meganewton', simbolo: 'MN', factor_a: 1000000.0, es_unidad_base: false, permite_decimales: true },
    ],
  },
  {
    codigo_magnitud: 'TORQUE',
    nombre_magnitud: 'Torque / Momento de Fuerza',
    categoria: 'MECANICA',
    descripcion: 'Momento de torsión en motores eléctricos, ejes reductores y poleas motrices',
    unidad_base_codigo: 'NM',
    unidades: [
      { codigo: 'NM', nombre: 'Newton Metro', simbolo: 'N·m', factor_a: 1.0, es_unidad_base: true, permite_decimales: true },
      { codigo: 'KNM', nombre: 'Kilonewton Metro', simbolo: 'kN·m', factor_a: 1000.0, es_unidad_base: false, permite_decimales: true },
      { codigo: 'LBFT', nombre: 'Libra Pie', simbolo: 'lb·ft', factor_a: 1.3558179, es_unidad_base: false, permite_decimales: true },
      { codigo: 'LBIN', nombre: 'Libra Pulgada', simbolo: 'lb·in', factor_a: 0.1129848, es_unidad_base: false, permite_decimales: true },
      { codigo: 'KGFM', nombre: 'Kilogramo-Fuerza Metro', simbolo: 'kgf·m', factor_a: 9.80665, es_unidad_base: false, permite_decimales: true },
    ],
  },
  {
    codigo_magnitud: 'ENERGIA_TRABAJO',
    nombre_magnitud: 'Energía, Trabajo y Calor',
    categoria: 'TERMICA',
    descripcion: 'Consumo energético, trabajo mecánico acumulado y capacidad térmica',
    unidad_base_codigo: 'KWH',
    unidades: [
      { codigo: 'KWH', nombre: 'Kilovatio-Hora', simbolo: 'kWh', factor_a: 1.0, es_unidad_base: true, permite_decimales: true },
      { codigo: 'J', nombre: 'Julio / Joule', simbolo: 'J', factor_a: 0.000000277778, es_unidad_base: false, permite_decimales: true },
      { codigo: 'KJ', nombre: 'Kilojulio', simbolo: 'kJ', factor_a: 0.000277778, es_unidad_base: false, permite_decimales: true },
      { codigo: 'MJ', nombre: 'Megajulio', simbolo: 'MJ', factor_a: 0.277778, es_unidad_base: false, permite_decimales: true },
      { codigo: 'MWH', nombre: 'Megavatio-Hora', simbolo: 'MWh', factor_a: 1000.0, es_unidad_base: false, permite_decimales: true },
      { codigo: 'BTU', nombre: 'British Thermal Unit', simbolo: 'BTU', factor_a: 0.000293071, es_unidad_base: false, permite_decimales: true },
      { codigo: 'KCAL', nombre: 'Kilocaloría', simbolo: 'kcal', factor_a: 0.001163, es_unidad_base: false, permite_decimales: true },
    ],
  },
  {
    codigo_magnitud: 'VISCOSIDAD_CINEMATICA',
    nombre_magnitud: 'Viscosidad Cinemática (Lubricación)',
    categoria: 'FLUIDOS',
    descripcion: 'Resistencia al flujo de aceites de motor, reductores y fluidos hidráulicos ISO VG',
    unidad_base_codigo: 'CST',
    unidades: [
      { codigo: 'CST', nombre: 'Centistoke', simbolo: 'cSt', factor_a: 1.0, es_unidad_base: true, permite_decimales: true },
      { codigo: 'MM2S', nombre: 'Milímetro Cuadrado por Segundo', simbolo: 'mm²/s', factor_a: 1.0, es_unidad_base: false, permite_decimales: true },
      { codigo: 'M2S', nombre: 'Metro Cuadrado por Segundo', simbolo: 'm²/s', factor_a: 1000000.0, es_unidad_base: false, permite_decimales: true },
      { codigo: 'ST', nombre: 'Stoke', simbolo: 'St', factor_a: 100.0, es_unidad_base: false, permite_decimales: true },
      { codigo: 'SSU', nombre: 'Segundos Saybolt Universal', simbolo: 'SSU', factor_a: 0.216, es_unidad_base: false, permite_decimales: true },
    ],
  },
  {
    codigo_magnitud: 'DENSIDAD',
    nombre_magnitud: 'Densidad y Masa Volumétrica',
    categoria: 'FLUIDOS',
    descripcion: 'Densidad de combustibles, refrigerantes y aceites de lubricación',
    unidad_base_codigo: 'KGM3',
    unidades: [
      { codigo: 'KGM3', nombre: 'Kilogramo por Metro Cúbico', simbolo: 'kg/m³', factor_a: 1.0, es_unidad_base: true, permite_decimales: true },
      { codigo: 'GL', nombre: 'Gramo por Litro', simbolo: 'g/L', factor_a: 1.0, es_unidad_base: false, permite_decimales: true },
      { codigo: 'GCM3', nombre: 'Gramo por Centímetro Cúbico', simbolo: 'g/cm³', factor_a: 1000.0, es_unidad_base: false, permite_decimales: true },
      { codigo: 'LBGAL', nombre: 'Libra por Galón Americano', simbolo: 'lb/gal', factor_a: 119.8264, es_unidad_base: false, permite_decimales: true },
      { codigo: 'LBFT3', nombre: 'Libra por Pie Cúbico', simbolo: 'lb/ft³', factor_a: 16.01846, es_unidad_base: false, permite_decimales: true },
    ],
  },
  {
    codigo_magnitud: 'CAUDAL_MASICO',
    nombre_magnitud: 'Caudal Másico / Inyección',
    categoria: 'FLUIDOS',
    descripcion: 'Tasa de flujo de masa en refrigeración, inyección de combustible y vapor',
    unidad_base_codigo: 'KGS',
    unidades: [
      { codigo: 'KGS', nombre: 'Kilogramo por Segundo', simbolo: 'kg/s', factor_a: 1.0, es_unidad_base: true, permite_decimales: true },
      { codigo: 'KGH', nombre: 'Kilogramo por Hora', simbolo: 'kg/h', factor_a: 0.0002777778, es_unidad_base: false, permite_decimales: true },
      { codigo: 'TONH', nombre: 'Tonelada por Hora', simbolo: 't/h', factor_a: 0.2777777778, es_unidad_base: false, permite_decimales: true },
      { codigo: 'LBS', nombre: 'Libra por Segundo', simbolo: 'lb/s', factor_a: 0.45359237, es_unidad_base: false, permite_decimales: true },
      { codigo: 'LBH', nombre: 'Libra por Hora', simbolo: 'lb/h', factor_a: 0.0001259979, es_unidad_base: false, permite_decimales: true },
    ],
  },
  {
    codigo_magnitud: 'ELECTRICA_RESISTENCIA',
    nombre_magnitud: 'Resistencia Eléctrica e Impedancia',
    categoria: 'ELECTRICIDAD',
    descripcion: 'Resistencia de devanados, aislamiento de bobinas y continuidad de tierra',
    unidad_base_codigo: 'OHM',
    unidades: [
      { codigo: 'OHM', nombre: 'Ohmio', simbolo: 'Ω', factor_a: 1.0, es_unidad_base: true, permite_decimales: true },
      { codigo: 'MOHM', nombre: 'Miliohmio', simbolo: 'mΩ', factor_a: 0.001, es_unidad_base: false, permite_decimales: true },
      { codigo: 'KOHM', nombre: 'Kiloohmio', simbolo: 'kΩ', factor_a: 1000.0, es_unidad_base: false, permite_decimales: true },
      { codigo: 'MEOHM', nombre: 'Megaohmio (Aislamiento)', simbolo: 'MΩ', factor_a: 1000000.0, es_unidad_base: false, permite_decimales: true },
    ],
  },
  {
    codigo_magnitud: 'ELECTRICA_CAPACITANCIA',
    nombre_magnitud: 'Capacitancia Eléctrica',
    categoria: 'ELECTRICIDAD',
    descripcion: 'Capacidad electrostática en bancos de condensadores y filtros de armónicos',
    unidad_base_codigo: 'UF',
    unidades: [
      { codigo: 'UF', nombre: 'Microfaradio', simbolo: 'µF', factor_a: 1.0, es_unidad_base: true, permite_decimales: true },
      { codigo: 'MF', nombre: 'Milifaradio', simbolo: 'mF', factor_a: 1000.0, es_unidad_base: false, permite_decimales: true },
      { codigo: 'NF', nombre: 'Nanofaradio', simbolo: 'nF', factor_a: 0.001, es_unidad_base: false, permite_decimales: true },
      { codigo: 'PF', nombre: 'Picofaradio', simbolo: 'pF', factor_a: 0.000001, es_unidad_base: false, permite_decimales: true },
      { codigo: 'F', nombre: 'Faradio', simbolo: 'F', factor_a: 1000000.0, es_unidad_base: false, permite_decimales: true },
    ],
  },
  {
    codigo_magnitud: 'NIVEL_SONORO',
    nombre_magnitud: 'Nivel Sonoro y Acústica',
    categoria: 'ACUSTICA_OPTICA',
    descripcion: 'Presión acústica y emisión de ruido en cabinas, salas de máquinas y generadores',
    unidad_base_codigo: 'DBA',
    unidades: [
      { codigo: 'DBA', nombre: 'Decibelio Ponderado A', simbolo: 'dBA', factor_a: 1.0, es_unidad_base: true, permite_decimales: true },
      { codigo: 'DB', nombre: 'Decibelio Lineal', simbolo: 'dB', factor_a: 1.0, es_unidad_base: false, permite_decimales: true },
      { codigo: 'DBC', nombre: 'Decibelio Ponderado C', simbolo: 'dBC', factor_a: 1.0, es_unidad_base: false, permite_decimales: true },
    ],
  },
  {
    codigo_magnitud: 'ILUMINANCIA',
    nombre_magnitud: 'Iluminancia y Flujo Luminoso',
    categoria: 'ACUSTICA_OPTICA',
    descripcion: 'Nivel de iluminación en cabinas de ascensor, cuartos de control y tableros',
    unidad_base_codigo: 'LUX',
    unidades: [
      { codigo: 'LUX', nombre: 'Lux (Lumen por Metro Cuadrado)', simbolo: 'lx', factor_a: 1.0, es_unidad_base: true, permite_decimales: true },
      { codigo: 'FC', nombre: 'Foot-Candle', simbolo: 'fc', factor_a: 10.76391, es_unidad_base: false, permite_decimales: true },
      { codigo: 'LM', nombre: 'Lumen (Flujo Luminoso)', simbolo: 'lm', factor_a: 1.0, es_unidad_base: false, permite_decimales: true },
    ],
  },
  {
    codigo_magnitud: 'CICLOS_OPERACION',
    nombre_magnitud: 'Contador de Maniobras / Desgaste',
    categoria: 'OPERACION',
    descripcion: 'Medición de uso discreto por número de maniobras, viajes y arranques',
    unidad_base_codigo: 'CICLOS',
    unidades: [
      { codigo: 'CICLOS', nombre: 'Ciclos de Maniobra', simbolo: 'ciclos', factor_a: 1.0, es_unidad_base: true, permite_decimales: false },
      { codigo: 'VIAJES', nombre: 'Viajes de Cabina', simbolo: 'viajes', factor_a: 1.0, es_unidad_base: false, permite_decimales: false },
      { codigo: 'MANIOBRAS', nombre: 'Maniobras Eléctricas', simbolo: 'maniobras', factor_a: 1.0, es_unidad_base: false, permite_decimales: false },
      { codigo: 'ARRANQUES', nombre: 'Arranques de Motor', simbolo: 'arranques', factor_a: 1.0, es_unidad_base: false, permite_decimales: false },
      { codigo: 'APERTURAS', nombre: 'Aperturas de Puerta', simbolo: 'aperturas', factor_a: 1.0, es_unidad_base: false, permite_decimales: false },
    ],
  },
];
