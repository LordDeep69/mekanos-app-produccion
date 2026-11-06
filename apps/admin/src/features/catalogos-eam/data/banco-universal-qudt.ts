/**
 * MEKANOS S.A.S - Portal Admin
 * Banco Universal de Magnitudes Físicas e Industriales (Fase 5.6)
 * 
 * Basado en las normas internacionales:
 * - ISO 80000 (Cantidades y Unidades)
 * - QUDT.org (Quantities, Units, Dimensions and Types - NASA / W3C)
 * - UCUM (Unified Code for Units of Measure)
 * 
 * 60 dimensiones universales multi-industria activas por defecto.
 */

export interface UnidadPreset {
  codigo: string;
  nombre: string;
  simbolo: string;
  factor_a: number;
  factor_b?: number;
  es_unidad_base: boolean;
  permite_decimales?: boolean;
}

export type CategoriaMagnitud =
  | 'MECANICA_POTENCIA'
  | 'FLUIDOS_PRESION'
  | 'TERMICA_HVAC'
  | 'ELECTRICIDAD'
  | 'VIBRACION_ACUSTICA'
  | 'QUIMICA_AGUA'
  | 'OPTICA_ILUMINACION'
  | 'TI_DIGITAL'
  | 'OPERACION_DESGASTE';

export interface MagnitudPreset {
  codigo_magnitud: string;
  nombre_magnitud: string;
  categoria: CategoriaMagnitud;
  descripcion: string;
  unidad_base_codigo: string;
  unidades: UnidadPreset[];
}

export const CATEGORIAS_QUDT: { id: CategoriaMagnitud | 'TODAS'; label: string; icon?: string }[] = [
  { id: 'TODAS', label: 'Todas las Disciplinas', icon: 'Globe' },
  { id: 'MECANICA_POTENCIA', label: 'Mecánica & Potencia', icon: 'Wrench' },
  { id: 'FLUIDOS_PRESION', label: 'Fluidos & Presión', icon: 'Droplets' },
  { id: 'TERMICA_HVAC', label: 'Térmica & HVAC', icon: 'Flame' },
  { id: 'ELECTRICIDAD', label: 'Electricidad & Señal', icon: 'Zap' },
  { id: 'VIBRACION_ACUSTICA', label: 'Vibración & Acústica', icon: 'Activity' },
  { id: 'QUIMICA_AGUA', label: 'Química & Calidad de Agua', icon: 'FlaskConical' },
  { id: 'OPTICA_ILUMINACION', label: 'Óptica & Ambiente', icon: 'Sun' },
  { id: 'TI_DIGITAL', label: 'TI & Telecomunicaciones', icon: 'Server' },
  { id: 'OPERACION_DESGASTE', label: 'Operación & Desgaste', icon: 'Clock' },
];

export const BANCO_UNIVERSAL_MAGNITUDES: MagnitudPreset[] = [
  {
    "codigo_magnitud": "POTENCIA",
    "nombre_magnitud": "Potencia Mecánica / Eléctrica",
    "categoria": "MECANICA_POTENCIA",
    "descripcion": "Régimen de entrega de potencia activa en motores, generadores y chillers",
    "unidad_base_codigo": "KW",
    "unidades": [
      {
        "codigo": "KW",
        "nombre": "Kilovatios",
        "simbolo": "kW",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": true,
        "permite_decimales": true
      },
      {
        "codigo": "HP",
        "nombre": "Caballos de Fuerza",
        "simbolo": "HP",
        "factor_a": 0.745699872,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "KVA",
        "nombre": "Kilovoltiamperios",
        "simbolo": "kVA",
        "factor_a": 0.8,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "BTU_H",
        "nombre": "BTU por hora",
        "simbolo": "BTU/h",
        "factor_a": 0.000293071,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "TR",
        "nombre": "Toneladas de Refrigeración",
        "simbolo": "TR",
        "factor_a": 3.51685284,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "W",
        "nombre": "Vatios",
        "simbolo": "W",
        "factor_a": 0.001,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "MW_POT",
        "nombre": "Megavatios",
        "simbolo": "MW",
        "factor_a": 1000,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "CV_POT",
        "nombre": "Caballos de Vapor",
        "simbolo": "CV",
        "factor_a": 0.73549875,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      }
    ]
  },
  {
    "codigo_magnitud": "PRESION",
    "nombre_magnitud": "Presión Hidráulica / Neumática",
    "categoria": "FLUIDOS_PRESION",
    "descripcion": "Presión de trabajo en bombas, compresores, manifolds y calderas",
    "unidad_base_codigo": "PSI",
    "unidades": [
      {
        "codigo": "PSI",
        "nombre": "Libras por Pulgada Cuadrada",
        "simbolo": "PSI",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": true,
        "permite_decimales": true
      },
      {
        "codigo": "BAR",
        "nombre": "Bares",
        "simbolo": "bar",
        "factor_a": 14.5037738,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "KPA",
        "nombre": "Kilopascales",
        "simbolo": "kPa",
        "factor_a": 0.1450377,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "MPA",
        "nombre": "Megapascales",
        "simbolo": "MPa",
        "factor_a": 145.037738,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "PA",
        "nombre": "Pascales",
        "simbolo": "Pa",
        "factor_a": 0.0001450377,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "ATM",
        "nombre": "Atmósferas Estándar",
        "simbolo": "atm",
        "factor_a": 14.6959488,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "MCA_P",
        "nombre": "Metros Columna de Agua",
        "simbolo": "mca",
        "factor_a": 1.42233433,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "MMHG",
        "nombre": "Milímetros de Mercurio (Torr)",
        "simbolo": "mmHg",
        "factor_a": 0.019336775,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "INH2O",
        "nombre": "Pulgadas Columna de Agua",
        "simbolo": "inH2O",
        "factor_a": 0.03612729,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      }
    ]
  },
  {
    "codigo_magnitud": "CAUDAL",
    "nombre_magnitud": "Caudal Volumétrico",
    "categoria": "FLUIDOS_PRESION",
    "descripcion": "Gasto volumétrico de fluidos en bombeo, lubricación y aire comprimido",
    "unidad_base_codigo": "M3H",
    "unidades": [
      {
        "codigo": "M3H",
        "nombre": "Metros Cúbicos por Hora",
        "simbolo": "m³/h",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": true,
        "permite_decimales": true
      },
      {
        "codigo": "GPM",
        "nombre": "Galones por Minuto (US)",
        "simbolo": "GPM",
        "factor_a": 0.2271247,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "LPS",
        "nombre": "Litros por Segundo",
        "simbolo": "L/s",
        "factor_a": 3.6,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "LPM",
        "nombre": "Litros por Minuto",
        "simbolo": "L/min",
        "factor_a": 0.06,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "CFM",
        "nombre": "Pies Cúbicos por Minuto",
        "simbolo": "CFM",
        "factor_a": 1.699010795,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "BPD",
        "nombre": "Barriles por Día (Petróleo)",
        "simbolo": "BPD",
        "factor_a": 0.00662447,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      }
    ]
  },
  {
    "codigo_magnitud": "TEMPERATURA",
    "nombre_magnitud": "Temperatura",
    "categoria": "TERMICA_HVAC",
    "descripcion": "Temperatura de fluidos, refrigerantes, devanados y gases de combustión",
    "unidad_base_codigo": "C",
    "unidades": [
      {
        "codigo": "C",
        "nombre": "Grados Celsius",
        "simbolo": "°C",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": true,
        "permite_decimales": true
      },
      {
        "codigo": "F",
        "nombre": "Grados Fahrenheit",
        "simbolo": "°F",
        "factor_a": 0.5555555556,
        "factor_b": -17.7777777778,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "K",
        "nombre": "Kelvin",
        "simbolo": "K",
        "factor_a": 1,
        "factor_b": -273.15,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "RAN",
        "nombre": "Grados Rankine",
        "simbolo": "°R",
        "factor_a": 0.5555555556,
        "factor_b": -273.15,
        "es_unidad_base": false,
        "permite_decimales": true
      }
    ]
  },
  {
    "codigo_magnitud": "VOLUMEN",
    "nombre_magnitud": "Volumen / Capacidad de Fluidos",
    "categoria": "FLUIDOS_PRESION",
    "descripcion": "Capacidad de cárter, tanques de combustible, pulmones y depósitos",
    "unidad_base_codigo": "LIT",
    "unidades": [
      {
        "codigo": "LIT",
        "nombre": "Litros",
        "simbolo": "L",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": true,
        "permite_decimales": true
      },
      {
        "codigo": "GAL",
        "nombre": "Galones (US)",
        "simbolo": "Gal",
        "factor_a": 3.785411784,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "ML",
        "nombre": "Mililitros",
        "simbolo": "mL",
        "factor_a": 0.001,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "M3_VOL",
        "nombre": "Metros Cúbicos",
        "simbolo": "m³",
        "factor_a": 1000,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "BBL_VOL",
        "nombre": "Barriles (US)",
        "simbolo": "bbl",
        "factor_a": 158.987295,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "FT3_VOL",
        "nombre": "Pies Cúbicos",
        "simbolo": "ft³",
        "factor_a": 28.3168466,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      }
    ]
  },
  {
    "codigo_magnitud": "ELECTRICA_VOLTAJE",
    "nombre_magnitud": "Voltaje / Tensión Eléctrica",
    "categoria": "ELECTRICIDAD",
    "descripcion": "Tensión entre fases, neutro y tierra en tableros, generadores y celdas",
    "unidad_base_codigo": "V",
    "unidades": [
      {
        "codigo": "V",
        "nombre": "Voltios",
        "simbolo": "V",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": true,
        "permite_decimales": true
      },
      {
        "codigo": "VAC",
        "nombre": "Voltios Corriente Alterna",
        "simbolo": "VAC",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "VDC",
        "nombre": "Voltios Corriente Continua",
        "simbolo": "VDC",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "KV_VOLT",
        "nombre": "Kilovoltios",
        "simbolo": "kV",
        "factor_a": 1000,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "MV_VOLT",
        "nombre": "Milivoltios",
        "simbolo": "mV",
        "factor_a": 0.001,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      }
    ]
  },
  {
    "codigo_magnitud": "ELECTRICA_CORRIENTE",
    "nombre_magnitud": "Corriente / Amperaje Eléctrico",
    "categoria": "ELECTRICIDAD",
    "descripcion": "Intensidad de corriente por fase en alternadores, motores y cargas",
    "unidad_base_codigo": "A",
    "unidades": [
      {
        "codigo": "A",
        "nombre": "Amperios",
        "simbolo": "A",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": true,
        "permite_decimales": true
      },
      {
        "codigo": "CCA",
        "nombre": "Cold Cranking Amps",
        "simbolo": "CCA",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "MA",
        "nombre": "Miliamperios",
        "simbolo": "mA",
        "factor_a": 0.001,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "KA_AMP",
        "nombre": "Kiloamperios",
        "simbolo": "kA",
        "factor_a": 1000,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "UA_AMP",
        "nombre": "Microamperios",
        "simbolo": "µA",
        "factor_a": 0.000001,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      }
    ]
  },
  {
    "codigo_magnitud": "FRECUENCIA_VELOCIDAD",
    "nombre_magnitud": "Frecuencia / Velocidad de Rotación",
    "categoria": "MECANICA_POTENCIA",
    "descripcion": "Velocidad angular de motores, poleas y frecuencia de red en Hz",
    "unidad_base_codigo": "RPM",
    "unidades": [
      {
        "codigo": "RPM",
        "nombre": "Revoluciones por Minuto",
        "simbolo": "RPM",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": true,
        "permite_decimales": true
      },
      {
        "codigo": "HZ",
        "nombre": "Hercios (Frecuencia Eléctrica)",
        "simbolo": "Hz",
        "factor_a": 60,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "MMS",
        "nombre": "Milímetros por Segundo (Vibración)",
        "simbolo": "mm/s",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "RAD_S",
        "nombre": "Radianes por Segundo",
        "simbolo": "rad/s",
        "factor_a": 9.549296586,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      }
    ]
  },
  {
    "codigo_magnitud": "LONGITUD",
    "nombre_magnitud": "Longitud y Diámetros",
    "categoria": "MECANICA_POTENCIA",
    "descripcion": "Distancias, diámetros de bridas, carreras de vástagos y espesores",
    "unidad_base_codigo": "MET",
    "unidades": [
      {
        "codigo": "MET",
        "nombre": "Metros",
        "simbolo": "m",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": true,
        "permite_decimales": true
      },
      {
        "codigo": "KM",
        "nombre": "Kilómetros",
        "simbolo": "km",
        "factor_a": 1000,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "CM",
        "nombre": "Centímetros",
        "simbolo": "cm",
        "factor_a": 0.01,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "MM",
        "nombre": "Milímetros",
        "simbolo": "mm",
        "factor_a": 0.001,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "PULG",
        "nombre": "Pulgadas",
        "simbolo": "in",
        "factor_a": 0.0254,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "FT_LON",
        "nombre": "Pies",
        "simbolo": "ft",
        "factor_a": 0.3048,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "UM_LON",
        "nombre": "Micrómetros / Micras",
        "simbolo": "µm",
        "factor_a": 0.000001,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "MIL_LON",
        "nombre": "Milésimas de Pulgada",
        "simbolo": "mil",
        "factor_a": 0.0000254,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      }
    ]
  },
  {
    "codigo_magnitud": "TIEMPO_USO",
    "nombre_magnitud": "Tiempo de Uso / Contador Horario",
    "categoria": "OPERACION_DESGASTE",
    "descripcion": "Horómetros acumulados, tiempo transcurrido y ciclos de servicio",
    "unidad_base_codigo": "HORAS",
    "unidades": [
      {
        "codigo": "HORAS",
        "nombre": "Horas",
        "simbolo": "h",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": true,
        "permite_decimales": true
      },
      {
        "codigo": "MIN",
        "nombre": "Minutos",
        "simbolo": "min",
        "factor_a": 0.0166666667,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "DIAS",
        "nombre": "Días",
        "simbolo": "d",
        "factor_a": 24,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "CICLOS",
        "nombre": "Ciclos de Arranque",
        "simbolo": "ciclos",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": false
      },
      {
        "codigo": "SEG_TIEMPO",
        "nombre": "Segundos",
        "simbolo": "s",
        "factor_a": 0.000277778,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "MES_TIEMPO",
        "nombre": "Meses Industriales",
        "simbolo": "mes",
        "factor_a": 730,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      }
    ]
  },
  {
    "codigo_magnitud": "ADIMENSIONAL",
    "nombre_magnitud": "Unidad de Conteo / Cantidad",
    "categoria": "OPERACION_DESGASTE",
    "descripcion": "Conteo discreto de piezas, juegos de empaquetaduras y repuestos",
    "unidad_base_codigo": "UND",
    "unidades": [
      {
        "codigo": "UND",
        "nombre": "Unidad",
        "simbolo": "und",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": true,
        "permite_decimales": true
      },
      {
        "codigo": "PAR",
        "nombre": "Par",
        "simbolo": "par",
        "factor_a": 2,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "KIT",
        "nombre": "Juego / Kit",
        "simbolo": "kit",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "DOC_ADIM",
        "nombre": "Docena",
        "simbolo": "doc",
        "factor_a": 12,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": false
      },
      {
        "codigo": "PZA_ADIM",
        "nombre": "Pieza",
        "simbolo": "pza",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      }
    ]
  },
  {
    "codigo_magnitud": "CAPACIDAD_BATERIA",
    "nombre_magnitud": "Capacidad de Batería y Acumuladores",
    "categoria": "ELECTRICIDAD",
    "descripcion": "Capacidad de almacenamiento y entrega de carga en bancos de baterías y UPS",
    "unidad_base_codigo": "AH",
    "unidades": [
      {
        "codigo": "AH",
        "nombre": "Amperios-Hora",
        "simbolo": "Ah",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": true,
        "permite_decimales": true
      },
      {
        "codigo": "MAH",
        "nombre": "Miliamperios-Hora",
        "simbolo": "mAh",
        "factor_a": 0.001,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "KAH",
        "nombre": "Kiloamperios-Hora",
        "simbolo": "kAh",
        "factor_a": 1000,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "COULOMB",
        "nombre": "Culombios",
        "simbolo": "C",
        "factor_a": 0.000277778,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      }
    ]
  },
  {
    "codigo_magnitud": "MASA",
    "nombre_magnitud": "Masa / Capacidad de Carga",
    "categoria": "MECANICA_POTENCIA",
    "descripcion": "Masa inercial, tara de máquinas y capacidad de elevación estática y dinámica",
    "unidad_base_codigo": "KG",
    "unidades": [
      {
        "codigo": "KG",
        "nombre": "Kilogramo",
        "simbolo": "kg",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": true,
        "permite_decimales": true
      },
      {
        "codigo": "G",
        "nombre": "Gramo",
        "simbolo": "g",
        "factor_a": 0.001,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "TON",
        "nombre": "Tonelada Métrica",
        "simbolo": "t",
        "factor_a": 1000,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "LB",
        "nombre": "Libra Avoirdupois",
        "simbolo": "lb",
        "factor_a": 0.45359237,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "OZ",
        "nombre": "Onza",
        "simbolo": "oz",
        "factor_a": 0.02834952,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "QUINTAL",
        "nombre": "Quintal Métrico",
        "simbolo": "q",
        "factor_a": 100,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "TON_US",
        "nombre": "Tonelada Corta (US)",
        "simbolo": "ton US",
        "factor_a": 907.18474,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      }
    ]
  },
  {
    "codigo_magnitud": "AREA",
    "nombre_magnitud": "Área y Superficie",
    "categoria": "MECANICA_POTENCIA",
    "descripcion": "Área de transferencia en radiadores, ductos y cámaras de combustión",
    "unidad_base_codigo": "M2",
    "unidades": [
      {
        "codigo": "M2",
        "nombre": "Metro Cuadrado",
        "simbolo": "m²",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": true,
        "permite_decimales": true
      },
      {
        "codigo": "CM2",
        "nombre": "Centímetro Cuadrado",
        "simbolo": "cm²",
        "factor_a": 0.0001,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "MM2",
        "nombre": "Milímetro Cuadrado",
        "simbolo": "mm²",
        "factor_a": 0.000001,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "IN2_AREA",
        "nombre": "Pulgada Cuadrada",
        "simbolo": "in²",
        "factor_a": 0.00064516,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "FT2_AREA",
        "nombre": "Pie Cuadrado",
        "simbolo": "ft²",
        "factor_a": 0.09290304,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "HA_AREA",
        "nombre": "Hectárea",
        "simbolo": "ha",
        "factor_a": 10000,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      }
    ]
  },
  {
    "codigo_magnitud": "DENSIDAD",
    "nombre_magnitud": "Densidad de Masa",
    "categoria": "FLUIDOS_PRESION",
    "descripcion": "Masa volumétrica de combustibles, salmueras, aceites y refrigerantes",
    "unidad_base_codigo": "KGM3",
    "unidades": [
      {
        "codigo": "KGM3",
        "nombre": "Kilogramo por Metro Cúbico",
        "simbolo": "kg/m³",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": true,
        "permite_decimales": true
      },
      {
        "codigo": "G_CM3",
        "nombre": "Gramo por Centímetro Cúbico",
        "simbolo": "g/cm³",
        "factor_a": 1000,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "KG_L",
        "nombre": "Kilogramo por Litro",
        "simbolo": "kg/L",
        "factor_a": 1000,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "LB_FT3",
        "nombre": "Libra por Pie Cúbico",
        "simbolo": "lb/ft³",
        "factor_a": 16.018463,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "LB_GAL",
        "nombre": "Libra por Galón (US)",
        "simbolo": "lb/gal",
        "factor_a": 119.826427,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      }
    ]
  },
  {
    "codigo_magnitud": "VELOCIDAD_LINEAL",
    "nombre_magnitud": "Velocidad Lineal / Traslación",
    "categoria": "MECANICA_POTENCIA",
    "descripcion": "Velocidad de bandas transportadoras, cabinas de elevador y pistones",
    "unidad_base_codigo": "MS",
    "unidades": [
      {
        "codigo": "MS",
        "nombre": "Metro por Segundo",
        "simbolo": "m/s",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": true,
        "permite_decimales": true
      },
      {
        "codigo": "KMH",
        "nombre": "Kilómetro por Hora",
        "simbolo": "km/h",
        "factor_a": 0.277777778,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "FPM",
        "nombre": "Pies por Minuto",
        "simbolo": "fpm",
        "factor_a": 0.00508,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "FT_S",
        "nombre": "Pies por Segundo",
        "simbolo": "ft/s",
        "factor_a": 0.3048,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "M_MIN",
        "nombre": "Metros por Minuto",
        "simbolo": "m/min",
        "factor_a": 0.016666667,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "KNOT",
        "nombre": "Nudos",
        "simbolo": "kn",
        "factor_a": 0.514444444,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      }
    ]
  },
  {
    "codigo_magnitud": "ACELERACION",
    "nombre_magnitud": "Aceleración Lineal",
    "categoria": "MECANICA_POTENCIA",
    "descripcion": "Tasa de cambio de velocidad en elevación y rampas de arranque",
    "unidad_base_codigo": "MS2",
    "unidades": [
      {
        "codigo": "MS2",
        "nombre": "Metro por Segundo Cuadrado",
        "simbolo": "m/s²",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": true,
        "permite_decimales": true
      },
      {
        "codigo": "G_ACC",
        "nombre": "Gravedad Estándar Terrestre",
        "simbolo": "g",
        "factor_a": 9.80665,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "FT_S2",
        "nombre": "Pie por Segundo Cuadrado",
        "simbolo": "ft/s²",
        "factor_a": 0.3048,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "MM_S2",
        "nombre": "Milímetro por Segundo Cuadrado",
        "simbolo": "mm/s²",
        "factor_a": 0.001,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      }
    ]
  },
  {
    "codigo_magnitud": "FUERZA",
    "nombre_magnitud": "Fuerza Mecánica y Tracción",
    "categoria": "MECANICA_POTENCIA",
    "descripcion": "Empuje de cilindros neumáticos e hidráulicos y tracción de cables",
    "unidad_base_codigo": "N",
    "unidades": [
      {
        "codigo": "N",
        "nombre": "Newton",
        "simbolo": "N",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": true,
        "permite_decimales": true
      },
      {
        "codigo": "KN_FRZ",
        "nombre": "Kilonewton",
        "simbolo": "kN",
        "factor_a": 1000,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "KGF",
        "nombre": "Kilogramo-Fuerza",
        "simbolo": "kgf",
        "factor_a": 9.80665,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "LBF",
        "nombre": "Libra-Fuerza",
        "simbolo": "lbf",
        "factor_a": 4.448221615,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "TF_FRZ",
        "nombre": "Tonelada-Fuerza",
        "simbolo": "tf",
        "factor_a": 9806.65,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "MN_FRZ",
        "nombre": "Meganewton",
        "simbolo": "MN",
        "factor_a": 1000000,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      }
    ]
  },
  {
    "codigo_magnitud": "TORQUE",
    "nombre_magnitud": "Torque / Momento de Fuerza",
    "categoria": "MECANICA_POTENCIA",
    "descripcion": "Momento de torsión en pernos de culata, ejes reductores y poleas motrices",
    "unidad_base_codigo": "NM",
    "unidades": [
      {
        "codigo": "NM",
        "nombre": "Newton-Metro",
        "simbolo": "N·m",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": true,
        "permite_decimales": true
      },
      {
        "codigo": "KNM",
        "nombre": "Kilonewton-Metro",
        "simbolo": "kN·m",
        "factor_a": 1000,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "LB_FT",
        "nombre": "Libra-Pie",
        "simbolo": "lb·ft",
        "factor_a": 1.355817948,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "LB_IN",
        "nombre": "Libra-Pulgada",
        "simbolo": "lb·in",
        "factor_a": 0.112984829,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "KGF_M",
        "nombre": "Kilogramo-Fuerza Metro",
        "simbolo": "kgf·m",
        "factor_a": 9.80665,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "DAN_M",
        "nombre": "Decanewton-Metro",
        "simbolo": "daN·m",
        "factor_a": 10,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      }
    ]
  },
  {
    "codigo_magnitud": "MOMENTO_INERCIA",
    "nombre_magnitud": "Momento de Inercia Rotacional",
    "categoria": "MECANICA_POTENCIA",
    "descripcion": "Inercia de rotores, volantes de motor y tambores de arrastre",
    "unidad_base_codigo": "KGM2",
    "unidades": [
      {
        "codigo": "KGM2",
        "nombre": "Kilogramo Metro Cuadrado",
        "simbolo": "kg·m²",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": true,
        "permite_decimales": true
      },
      {
        "codigo": "LB_FT2",
        "nombre": "Libra Pie Cuadrado",
        "simbolo": "lb·ft²",
        "factor_a": 0.04214011,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "G_CM2",
        "nombre": "Gramo Centímetro Cuadrado",
        "simbolo": "g·cm²",
        "factor_a": 1e-7,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      }
    ]
  },
  {
    "codigo_magnitud": "RIGIDEZ_RESORTE",
    "nombre_magnitud": "Rigidez / Constante Elástica",
    "categoria": "MECANICA_POTENCIA",
    "descripcion": "Constante elástica en resortes de válvulas y tacos antivibratorios",
    "unidad_base_codigo": "N_MM",
    "unidades": [
      {
        "codigo": "N_MM",
        "nombre": "Newton por Milímetro",
        "simbolo": "N/mm",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": true,
        "permite_decimales": true
      },
      {
        "codigo": "N_M_RIG",
        "nombre": "Newton por Metro",
        "simbolo": "N/m",
        "factor_a": 0.001,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "KN_M",
        "nombre": "Kilonewton por Metro",
        "simbolo": "kN/m",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "LBF_IN",
        "nombre": "Libra-fuerza por Pulgada",
        "simbolo": "lbf/in",
        "factor_a": 0.1751268,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      }
    ]
  },
  {
    "codigo_magnitud": "CAUDAL_MASICO",
    "nombre_magnitud": "Caudal Másico",
    "categoria": "FLUIDOS_PRESION",
    "descripcion": "Flujo másico de vapor en calderas e inyección de combustible",
    "unidad_base_codigo": "KGS",
    "unidades": [
      {
        "codigo": "KGS",
        "nombre": "Kilogramo por Segundo",
        "simbolo": "kg/s",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": true,
        "permite_decimales": true
      },
      {
        "codigo": "KG_H",
        "nombre": "Kilogramo por Hora",
        "simbolo": "kg/h",
        "factor_a": 0.000277778,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "TON_H",
        "nombre": "Tonelada por Hora",
        "simbolo": "t/h",
        "factor_a": 0.277777778,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "LB_H",
        "nombre": "Libra por Hora",
        "simbolo": "lb/h",
        "factor_a": 0.000125998,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "LB_S",
        "nombre": "Libra por Segundo",
        "simbolo": "lb/s",
        "factor_a": 0.45359237,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      }
    ]
  },
  {
    "codigo_magnitud": "VISCOSIDAD_CINEMATICA",
    "nombre_magnitud": "Viscosidad Cinemática",
    "categoria": "FLUIDOS_PRESION",
    "descripcion": "Resistencia a fluir en lubricantes ISO VG y combustibles líquidos",
    "unidad_base_codigo": "CST",
    "unidades": [
      {
        "codigo": "CST",
        "nombre": "Centistokes",
        "simbolo": "cSt",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": true,
        "permite_decimales": true
      },
      {
        "codigo": "MM2_S",
        "nombre": "Milímetro Cuadrado por Segundo",
        "simbolo": "mm²/s",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "M2_S",
        "nombre": "Metro Cuadrado por Segundo",
        "simbolo": "m²/s",
        "factor_a": 1000000,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "SSU",
        "nombre": "Saybolt Universal Seconds",
        "simbolo": "SSU",
        "factor_a": 0.216,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      }
    ]
  },
  {
    "codigo_magnitud": "VISCOSIDAD_DINAMICA",
    "nombre_magnitud": "Viscosidad Dinámica / Absoluta",
    "categoria": "FLUIDOS_PRESION",
    "descripcion": "Tensión de cizallamiento interno en aceites de alta viscosidad y polímeros",
    "unidad_base_codigo": "CP",
    "unidades": [
      {
        "codigo": "CP",
        "nombre": "Centipoise",
        "simbolo": "cP",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": true,
        "permite_decimales": true
      },
      {
        "codigo": "MPA_S",
        "nombre": "Milipascal-Segundo",
        "simbolo": "mPa·s",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "PA_S",
        "nombre": "Pascal-Segundo",
        "simbolo": "Pa·s",
        "factor_a": 1000,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "POISE",
        "nombre": "Poise",
        "simbolo": "P",
        "factor_a": 100,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      }
    ]
  },
  {
    "codigo_magnitud": "NIVEL_ALTURA",
    "nombre_magnitud": "Cabeza Hidráulica / Nivel de Tanque",
    "categoria": "FLUIDOS_PRESION",
    "descripcion": "Altura manométrica total de bombeo (TDH) y nivel hidrostático de tanques",
    "unidad_base_codigo": "M_NIV",
    "unidades": [
      {
        "codigo": "M_NIV",
        "nombre": "Metros de Columna / Nivel",
        "simbolo": "m",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": true,
        "permite_decimales": true
      },
      {
        "codigo": "MCA",
        "nombre": "Metros Columna de Agua",
        "simbolo": "mca",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "FT_NIV",
        "nombre": "Pies de Columna / Nivel",
        "simbolo": "ft",
        "factor_a": 0.3048,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "IN_NIV",
        "nombre": "Pulgadas de Columna / Nivel",
        "simbolo": "in",
        "factor_a": 0.0254,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "CM_NIV",
        "nombre": "Centímetros de Nivel",
        "simbolo": "cm",
        "factor_a": 0.01,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "PORC_TK",
        "nombre": "Porcentaje de Tanque",
        "simbolo": "%",
        "factor_a": 0.01,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      }
    ]
  },
  {
    "codigo_magnitud": "TENSION_SUPERFICIAL",
    "nombre_magnitud": "Tensión Superficial de Fluidos",
    "categoria": "FLUIDOS_PRESION",
    "descripcion": "Energía interfacial en agentes desengrasantes y emulsiones refrigerantes",
    "unidad_base_codigo": "N_M_SURF",
    "unidades": [
      {
        "codigo": "N_M_SURF",
        "nombre": "Newton por Metro",
        "simbolo": "N/m",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": true,
        "permite_decimales": true
      },
      {
        "codigo": "MN_M",
        "nombre": "Milinewton por Metro",
        "simbolo": "mN/m",
        "factor_a": 0.001,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "DYN_CM",
        "nombre": "Dina por Centímetro",
        "simbolo": "dyn/cm",
        "factor_a": 0.001,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      }
    ]
  },
  {
    "codigo_magnitud": "DELTA_TEMPERATURA",
    "nombre_magnitud": "Diferencial Térmico (Delta T)",
    "categoria": "TERMICA_HVAC",
    "descripcion": "Salto térmico entre entrada y salida de intercambiadores y chillers",
    "unidad_base_codigo": "DELTA_C",
    "unidades": [
      {
        "codigo": "DELTA_C",
        "nombre": "Delta Grados Celsius",
        "simbolo": "°C",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": true,
        "permite_decimales": true
      },
      {
        "codigo": "DELTA_K",
        "nombre": "Delta Kelvin",
        "simbolo": "K",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "DELTA_F",
        "nombre": "Delta Grados Fahrenheit",
        "simbolo": "°F",
        "factor_a": 0.5555555556,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      }
    ]
  },
  {
    "codigo_magnitud": "CAPACIDAD_ENFRIAMIENTO",
    "nombre_magnitud": "Capacidad Frigorífica / Climatización",
    "categoria": "TERMICA_HVAC",
    "descripcion": "Capacidad nominal de enfriamiento en chillers, paquetes rooftop y splits",
    "unidad_base_codigo": "TR_ENF",
    "unidades": [
      {
        "codigo": "TR_ENF",
        "nombre": "Toneladas de Refrigeración",
        "simbolo": "TR",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": true,
        "permite_decimales": true
      },
      {
        "codigo": "KW_TERM",
        "nombre": "Kilovatios Térmicos",
        "simbolo": "kWt",
        "factor_a": 0.284345136,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "BTU_H_ENF",
        "nombre": "BTU por Hora",
        "simbolo": "BTU/h",
        "factor_a": 0.000083333333,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "FRIG_H",
        "nombre": "Frigorías por Hora",
        "simbolo": "Frig/h",
        "factor_a": 0.000330693,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "KCAL_H",
        "nombre": "Kilocalorías por Hora",
        "simbolo": "kcal/h",
        "factor_a": 0.000330693,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "MW_TERM",
        "nombre": "Megavatios Térmicos",
        "simbolo": "MWt",
        "factor_a": 284.345136,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      }
    ]
  },
  {
    "codigo_magnitud": "ENERGIA_TRABAJO",
    "nombre_magnitud": "Energía, Trabajo y Calor",
    "categoria": "TERMICA_HVAC",
    "descripcion": "Consumo acumulado de energía eléctrica, calor disipado y trabajo",
    "unidad_base_codigo": "KWH",
    "unidades": [
      {
        "codigo": "KWH",
        "nombre": "Kilovatio-Hora",
        "simbolo": "kWh",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": true,
        "permite_decimales": true
      },
      {
        "codigo": "MWH",
        "nombre": "Megavatio-Hora",
        "simbolo": "MWh",
        "factor_a": 1000,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "MJ",
        "nombre": "Megajulio",
        "simbolo": "MJ",
        "factor_a": 0.277777778,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "GJ",
        "nombre": "Gigajulio",
        "simbolo": "GJ",
        "factor_a": 277.777778,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "BTU_ENG",
        "nombre": "Unidad Térmica Británica (BTU)",
        "simbolo": "BTU",
        "factor_a": 0.000293071,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "THERM",
        "nombre": "Termias",
        "simbolo": "therm",
        "factor_a": 29.300111,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "HPH",
        "nombre": "Caballos de Vapor Hora",
        "simbolo": "HP·h",
        "factor_a": 0.745699872,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      }
    ]
  },
  {
    "codigo_magnitud": "CONSUMO_COMBUSTIBLE",
    "nombre_magnitud": "Consumo Horario de Combustible",
    "categoria": "TERMICA_HVAC",
    "descripcion": "Régimen de gasto de combustible en plantas eléctricas diésel/gas y calderas",
    "unidad_base_codigo": "LH",
    "unidades": [
      {
        "codigo": "LH",
        "nombre": "Litros por Hora",
        "simbolo": "L/h",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": true,
        "permite_decimales": true
      },
      {
        "codigo": "GPH",
        "nombre": "Galones por Hora (US)",
        "simbolo": "GPH",
        "factor_a": 3.785411784,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "M3H_COMB",
        "nombre": "Metros Cúbicos por Hora (Gas)",
        "simbolo": "m³/h",
        "factor_a": 1000,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "G_KWH",
        "nombre": "Gramos por Kilovatio-Hora (Específico)",
        "simbolo": "g/kWh",
        "factor_a": 0.00119,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      }
    ]
  },
  {
    "codigo_magnitud": "CONDUCTIVIDAD_TERMICA",
    "nombre_magnitud": "Conductividad Térmica",
    "categoria": "TERMICA_HVAC",
    "descripcion": "Capacidad de conducción de calor en aislamientos de tubería y calderas",
    "unidad_base_codigo": "W_MK",
    "unidades": [
      {
        "codigo": "W_MK",
        "nombre": "Vatio por Metro Kelvin",
        "simbolo": "W/(m·K)",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": true,
        "permite_decimales": true
      },
      {
        "codigo": "BTU_H_FT_F",
        "nombre": "BTU por Hora Pie °F",
        "simbolo": "BTU/(h·ft·°F)",
        "factor_a": 1.730735,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "KCAL_H_M_C",
        "nombre": "Kilocaloría por Hora Metro °C",
        "simbolo": "kcal/(h·m·°C)",
        "factor_a": 1.163,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      }
    ]
  },
  {
    "codigo_magnitud": "CALOR_ESPECIFICO",
    "nombre_magnitud": "Capacidad Calorífica Específica",
    "categoria": "TERMICA_HVAC",
    "descripcion": "Calor específico de salmueras, aceites térmicos y refrigerantes",
    "unidad_base_codigo": "KJ_KGK",
    "unidades": [
      {
        "codigo": "KJ_KGK",
        "nombre": "Kilojulio por Kilogramo Kelvin",
        "simbolo": "kJ/(kg·K)",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": true,
        "permite_decimales": true
      },
      {
        "codigo": "J_KGK",
        "nombre": "Julio por Kilogramo Kelvin",
        "simbolo": "J/(kg·K)",
        "factor_a": 0.001,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "BTU_LB_F",
        "nombre": "BTU por Libra °F",
        "simbolo": "BTU/(lb·°F)",
        "factor_a": 4.1868,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      }
    ]
  },
  {
    "codigo_magnitud": "POTENCIA_APARENTE",
    "nombre_magnitud": "Potencia Aparente",
    "categoria": "ELECTRICIDAD",
    "descripcion": "Capacidad de dimensionamiento en alternadores sincrónicos y transformadores",
    "unidad_base_codigo": "KVA_APA",
    "unidades": [
      {
        "codigo": "KVA_APA",
        "nombre": "Kilovoltiamperios",
        "simbolo": "kVA",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": true,
        "permite_decimales": true
      },
      {
        "codigo": "VA_APA",
        "nombre": "Voltiamperios",
        "simbolo": "VA",
        "factor_a": 0.001,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "MVA_APA",
        "nombre": "Megavoltiamperios",
        "simbolo": "MVA",
        "factor_a": 1000,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      }
    ]
  },
  {
    "codigo_magnitud": "POTENCIA_REACTIVA",
    "nombre_magnitud": "Potencia Reactiva",
    "categoria": "ELECTRICIDAD",
    "descripcion": "Potencia reactiva inductiva y capacitiva en corrección de factor de potencia",
    "unidad_base_codigo": "KVAR",
    "unidades": [
      {
        "codigo": "KVAR",
        "nombre": "Kilovoltiamperios Reactivos",
        "simbolo": "kVAR",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": true,
        "permite_decimales": true
      },
      {
        "codigo": "VAR_RCT",
        "nombre": "Voltiamperios Reactivos",
        "simbolo": "VAR",
        "factor_a": 0.001,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "MVAR",
        "nombre": "Megavoltiamperios Reactivos",
        "simbolo": "MVAR",
        "factor_a": 1000,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      }
    ]
  },
  {
    "codigo_magnitud": "FACTOR_POTENCIA",
    "nombre_magnitud": "Factor de Potencia / Coseno Phi",
    "categoria": "ELECTRICIDAD",
    "descripcion": "Rendimiento energético de la red eléctrica y relación entre kW y kVA",
    "unidad_base_codigo": "FP_COS",
    "unidades": [
      {
        "codigo": "FP_COS",
        "nombre": "Adimensional (0 a 1)",
        "simbolo": "cos φ",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": true,
        "permite_decimales": true
      },
      {
        "codigo": "PORC_FP",
        "nombre": "Porcentaje",
        "simbolo": "%",
        "factor_a": 0.01,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      }
    ]
  },
  {
    "codigo_magnitud": "ELECTRICA_RESISTENCIA",
    "nombre_magnitud": "Resistencia Eléctrica e Impedancia",
    "categoria": "ELECTRICIDAD",
    "descripcion": "Resistencia ohmica de bobinados, mallas de puesta a tierra y aislamiento Megger",
    "unidad_base_codigo": "OHM",
    "unidades": [
      {
        "codigo": "OHM",
        "nombre": "Ohmio",
        "simbolo": "Ω",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": true,
        "permite_decimales": true
      },
      {
        "codigo": "MOHM",
        "nombre": "Miliohmio",
        "simbolo": "mΩ",
        "factor_a": 0.001,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "UOHM",
        "nombre": "Microohmio",
        "simbolo": "µΩ",
        "factor_a": 0.000001,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "KOHM",
        "nombre": "Kiloohmio",
        "simbolo": "kΩ",
        "factor_a": 1000,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "MEOHM",
        "nombre": "Megaohmio (Aislamiento Dieléctrico)",
        "simbolo": "MΩ",
        "factor_a": 1000000,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "GOHM",
        "nombre": "Gigaohmio",
        "simbolo": "GΩ",
        "factor_a": 1000000000,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      }
    ]
  },
  {
    "codigo_magnitud": "ELECTRICA_CAPACITANCIA",
    "nombre_magnitud": "Capacitancia Eléctrica",
    "categoria": "ELECTRICIDAD",
    "descripcion": "Capacidad electrostática en bancos de condensadores y filtros de armónicos",
    "unidad_base_codigo": "UF",
    "unidades": [
      {
        "codigo": "UF",
        "nombre": "Microfaradio",
        "simbolo": "µF",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": true,
        "permite_decimales": true
      },
      {
        "codigo": "MF_CAP",
        "nombre": "Milifaradio",
        "simbolo": "mF",
        "factor_a": 1000,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "NF",
        "nombre": "Nanofaradio",
        "simbolo": "nF",
        "factor_a": 0.001,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "PF",
        "nombre": "Picofaradio",
        "simbolo": "pF",
        "factor_a": 0.000001,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "FARAD",
        "nombre": "Faradio",
        "simbolo": "F",
        "factor_a": 1000000,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      }
    ]
  },
  {
    "codigo_magnitud": "INDUCTANCIA",
    "nombre_magnitud": "Inductancia Electromagnética",
    "categoria": "ELECTRICIDAD",
    "descripcion": "Inductancia de bobinas de choque, reactancias de filtro y transformadores",
    "unidad_base_codigo": "MH_IND",
    "unidades": [
      {
        "codigo": "MH_IND",
        "nombre": "Milihenrio",
        "simbolo": "mH",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": true,
        "permite_decimales": true
      },
      {
        "codigo": "HENRY",
        "nombre": "Henrio",
        "simbolo": "H",
        "factor_a": 1000,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "UH_IND",
        "nombre": "Microhenrio",
        "simbolo": "µH",
        "factor_a": 0.001,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      }
    ]
  },
  {
    "codigo_magnitud": "CAMPO_MAGNETICO",
    "nombre_magnitud": "Campo Magnético / Inducción",
    "categoria": "ELECTRICIDAD",
    "descripcion": "Densidad de flujo magnético en entrehierros de motores y núcleos de ferrita",
    "unidad_base_codigo": "TESLA",
    "unidades": [
      {
        "codigo": "TESLA",
        "nombre": "Tesla",
        "simbolo": "T",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": true,
        "permite_decimales": true
      },
      {
        "codigo": "GAUSS",
        "nombre": "Gauss",
        "simbolo": "G",
        "factor_a": 0.0001,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "MT_MAG",
        "nombre": "Militesla",
        "simbolo": "mT",
        "factor_a": 0.001,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      }
    ]
  },
  {
    "codigo_magnitud": "VIBRACION_VELOCIDAD",
    "nombre_magnitud": "Velocidad de Vibración (Severidad ISO)",
    "categoria": "VIBRACION_ACUSTICA",
    "descripcion": "Severidad global de vibración RMS según norma ISO 10816 / ISO 20816",
    "unidad_base_codigo": "MMS_RMS",
    "unidades": [
      {
        "codigo": "MMS_RMS",
        "nombre": "Milímetro por Segundo RMS",
        "simbolo": "mm/s RMS",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": true,
        "permite_decimales": true
      },
      {
        "codigo": "IPS_PEAK",
        "nombre": "Pulgada por Segundo Pico",
        "simbolo": "in/s pk",
        "factor_a": 25.4,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "MMS_PEAK",
        "nombre": "Milímetro por Segundo Pico",
        "simbolo": "mm/s pk",
        "factor_a": 1.41421356,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "CMS_RMS",
        "nombre": "Centímetro por Segundo RMS",
        "simbolo": "cm/s",
        "factor_a": 10,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      }
    ]
  },
  {
    "codigo_magnitud": "VIBRACION_ACELERACION",
    "nombre_magnitud": "Aceleración de Vibración (Impactos / Rodamientos)",
    "categoria": "VIBRACION_ACUSTICA",
    "descripcion": "Picos de impacto, envolvente demodulada y fallo en pistas de rodamientos",
    "unidad_base_codigo": "G_VIB",
    "unidades": [
      {
        "codigo": "G_VIB",
        "nombre": "Gravedad Estándar (G-pk)",
        "simbolo": "g",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": true,
        "permite_decimales": true
      },
      {
        "codigo": "MS2_VIB",
        "nombre": "Metro por Segundo Cuadrado",
        "simbolo": "m/s²",
        "factor_a": 0.1019716,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "MM_S2_VIB",
        "nombre": "Milímetro por Segundo Cuadrado",
        "simbolo": "mm/s²",
        "factor_a": 0.00010197,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      }
    ]
  },
  {
    "codigo_magnitud": "VIBRACION_DESPLAZAMIENTO",
    "nombre_magnitud": "Desplazamiento de Vibración (Órbitas / Ejes)",
    "categoria": "VIBRACION_ACUSTICA",
    "descripcion": "Holguras dinámicas y órbitas en cojinetes de película de aceite",
    "unidad_base_codigo": "UM_PK",
    "unidades": [
      {
        "codigo": "UM_PK",
        "nombre": "Micrómetro Pico a Pico",
        "simbolo": "µm pk-pk",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": true,
        "permite_decimales": true
      },
      {
        "codigo": "MILS_PK",
        "nombre": "Milésima de Pulgada Pico a Pico",
        "simbolo": "mils pk-pk",
        "factor_a": 25.4,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "MM_PK",
        "nombre": "Milímetro Pico a Pico",
        "simbolo": "mm pk-pk",
        "factor_a": 1000,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      }
    ]
  },
  {
    "codigo_magnitud": "NIVEL_SONORO",
    "nombre_magnitud": "Nivel Sonoro y Acústica",
    "categoria": "VIBRACION_ACUSTICA",
    "descripcion": "Presión acústica y emisión de ruido en cabinas insonorizadas y escapes",
    "unidad_base_codigo": "DBA",
    "unidades": [
      {
        "codigo": "DBA",
        "nombre": "Decibelio Ponderado A",
        "simbolo": "dBA",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": true,
        "permite_decimales": true
      },
      {
        "codigo": "DB_LIN",
        "nombre": "Decibelio Lineal",
        "simbolo": "dB",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "DBC",
        "nombre": "Decibelio Ponderado C",
        "simbolo": "dBC",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      }
    ]
  },
  {
    "codigo_magnitud": "CONCENTRACION_GASES",
    "nombre_magnitud": "Concentración de Gases y Emisiones",
    "categoria": "QUIMICA_AGUA",
    "descripcion": "Concentración de monóxido de carbono, NOx, hidrocarburos y partículas",
    "unidad_base_codigo": "PPM_GAS",
    "unidades": [
      {
        "codigo": "PPM_GAS",
        "nombre": "Partes por Millón",
        "simbolo": "ppm",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": true,
        "permite_decimales": true
      },
      {
        "codigo": "PPB",
        "nombre": "Partes por Billón",
        "simbolo": "ppb",
        "factor_a": 0.001,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "PORC_VOL",
        "nombre": "Porcentaje en Volumen",
        "simbolo": "% Vol",
        "factor_a": 10000,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "MG_M3",
        "nombre": "Miligramo por Metro Cúbico",
        "simbolo": "mg/m³",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      }
    ]
  },
  {
    "codigo_magnitud": "CONDUCTIVIDAD_AGUA",
    "nombre_magnitud": "Conductividad Electrolítica de Agua",
    "categoria": "QUIMICA_AGUA",
    "descripcion": "Pureza y salinidad del agua en torres de enfriamiento, calderas y desionizadores",
    "unidad_base_codigo": "US_CM",
    "unidades": [
      {
        "codigo": "US_CM",
        "nombre": "Microsiemens por Centímetro",
        "simbolo": "µS/cm",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": true,
        "permite_decimales": true
      },
      {
        "codigo": "MS_CM",
        "nombre": "Milisiemens por Centímetro",
        "simbolo": "mS/cm",
        "factor_a": 1000,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "US_M",
        "nombre": "Microsiemens por Metro",
        "simbolo": "µS/m",
        "factor_a": 0.01,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      }
    ]
  },
  {
    "codigo_magnitud": "SOLIDOS_DISUELTOS",
    "nombre_magnitud": "Sólidos Totales Disueltos (TDS)",
    "categoria": "QUIMICA_AGUA",
    "descripcion": "Mineralización y sales minerales disueltas en circuitos de recirculación",
    "unidad_base_codigo": "PPM_TDS",
    "unidades": [
      {
        "codigo": "PPM_TDS",
        "nombre": "Partes por Millón TDS",
        "simbolo": "ppm",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": true,
        "permite_decimales": true
      },
      {
        "codigo": "MG_L_TDS",
        "nombre": "Miligramos por Litro",
        "simbolo": "mg/L",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "G_L_TDS",
        "nombre": "Gramos por Litro",
        "simbolo": "g/L",
        "factor_a": 1000,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      }
    ]
  },
  {
    "codigo_magnitud": "TURBIDEZ",
    "nombre_magnitud": "Turbidez de Fluidos",
    "categoria": "QUIMICA_AGUA",
    "descripcion": "Claridad óptica del agua y grado de sólidos en suspensión en filtros",
    "unidad_base_codigo": "NTU",
    "unidades": [
      {
        "codigo": "NTU",
        "nombre": "Unidades Nefelométricas de Turbidez",
        "simbolo": "NTU",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": true,
        "permite_decimales": true
      },
      {
        "codigo": "FNU",
        "nombre": "Formazin Nephelometric Unit",
        "simbolo": "FNU",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "EBC",
        "nombre": "European Brewery Convention",
        "simbolo": "EBC",
        "factor_a": 0.25,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      }
    ]
  },
  {
    "codigo_magnitud": "PH_ACIDEZ",
    "nombre_magnitud": "Potencial de Hidrógeno y Acidez",
    "categoria": "QUIMICA_AGUA",
    "descripcion": "Acidez / basicidad de refrigerantes, agua de circuito y degradación de aceites",
    "unidad_base_codigo": "PH",
    "unidades": [
      {
        "codigo": "PH",
        "nombre": "Escala pH (0 a 14)",
        "simbolo": "pH",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": true,
        "permite_decimales": true
      },
      {
        "codigo": "TAN_OIL",
        "nombre": "Total Acid Number (TAN)",
        "simbolo": "mg KOH/g",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "TBN_OIL",
        "nombre": "Total Base Number (TBN)",
        "simbolo": "mg KOH/g",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      }
    ]
  },
  {
    "codigo_magnitud": "HUMEDAD_RELATIVA",
    "nombre_magnitud": "Humedad Relativa y Ambiente",
    "categoria": "TERMICA_HVAC",
    "descripcion": "Humedad psicrométrica en cuartos limpios, salas de control y centros de cómputo",
    "unidad_base_codigo": "PORC_HR",
    "unidades": [
      {
        "codigo": "PORC_HR",
        "nombre": "Porcentaje de Humedad Relativa",
        "simbolo": "% HR",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": true,
        "permite_decimales": true
      },
      {
        "codigo": "FRAC_HR",
        "nombre": "Fracción Decimal",
        "simbolo": "HR",
        "factor_a": 100,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      }
    ]
  },
  {
    "codigo_magnitud": "ILUMINANCIA",
    "nombre_magnitud": "Iluminancia y Nivel Lumínico",
    "categoria": "OPTICA_ILUMINACION",
    "descripcion": "Nivel lumínico en cabinas de ascensor, cuartos de control y tableros",
    "unidad_base_codigo": "LUX",
    "unidades": [
      {
        "codigo": "LUX",
        "nombre": "Lux (Lumen por Metro Cuadrado)",
        "simbolo": "lx",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": true,
        "permite_decimales": true
      },
      {
        "codigo": "FC_ILUM",
        "nombre": "Foot-Candle",
        "simbolo": "fc",
        "factor_a": 10.76391,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      }
    ]
  },
  {
    "codigo_magnitud": "FLUJO_LUMINOSO",
    "nombre_magnitud": "Flujo Luminoso Total",
    "categoria": "OPTICA_ILUMINACION",
    "descripcion": "Potencia lumínica emitida por lámparas de torre, reflectores y balastros",
    "unidad_base_codigo": "LM_LUM",
    "unidades": [
      {
        "codigo": "LM_LUM",
        "nombre": "Lumen",
        "simbolo": "lm",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": true,
        "permite_decimales": true
      },
      {
        "codigo": "KLM",
        "nombre": "Kilolumen",
        "simbolo": "klm",
        "factor_a": 1000,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      }
    ]
  },
  {
    "codigo_magnitud": "IRRADIANCIA_SOLAR",
    "nombre_magnitud": "Radiación e Irradiancia Solar",
    "categoria": "OPTICA_ILUMINACION",
    "descripcion": "Potencia radiante por unidad de área en plantas fotovoltaicas y techos",
    "unidad_base_codigo": "WM2",
    "unidades": [
      {
        "codigo": "WM2",
        "nombre": "Vatio por Metro Cuadrado",
        "simbolo": "W/m²",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": true,
        "permite_decimales": true
      },
      {
        "codigo": "KWM2",
        "nombre": "Kilovatio por Metro Cuadrado",
        "simbolo": "kW/m²",
        "factor_a": 1000,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "BTU_H_FT2",
        "nombre": "BTU por Hora Pie Cuadrado",
        "simbolo": "BTU/(h·ft²)",
        "factor_a": 3.15459,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      }
    ]
  },
  {
    "codigo_magnitud": "CAPACIDAD_DATOS",
    "nombre_magnitud": "Almacenamiento / Memoria Digital",
    "categoria": "TI_DIGITAL",
    "descripcion": "Capacidad de almacenamiento en servidores, memorias PLC, NVR y tarjetas SD",
    "unidad_base_codigo": "GB",
    "unidades": [
      {
        "codigo": "GB",
        "nombre": "Gigabyte",
        "simbolo": "GB",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": true,
        "permite_decimales": true
      },
      {
        "codigo": "MB_DAT",
        "nombre": "Megabyte",
        "simbolo": "MB",
        "factor_a": 0.001,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "TB_DAT",
        "nombre": "Terabyte",
        "simbolo": "TB",
        "factor_a": 1000,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "PB_DAT",
        "nombre": "Petabyte",
        "simbolo": "PB",
        "factor_a": 1000000,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "KB_DAT",
        "nombre": "Kilobyte",
        "simbolo": "KB",
        "factor_a": 0.000001,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "BYTE_DAT",
        "nombre": "Byte",
        "simbolo": "B",
        "factor_a": 1e-9,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      }
    ]
  },
  {
    "codigo_magnitud": "VELOCIDAD_DATOS",
    "nombre_magnitud": "Ancho de Banda / Transferencia de Red",
    "categoria": "TI_DIGITAL",
    "descripcion": "Tasa de transmisión de datos en enlaces SCADA, switches y telemetría",
    "unidad_base_codigo": "MBPS",
    "unidades": [
      {
        "codigo": "MBPS",
        "nombre": "Megabits por Segundo",
        "simbolo": "Mbps",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": true,
        "permite_decimales": true
      },
      {
        "codigo": "GBPS",
        "nombre": "Gigabits por Segundo",
        "simbolo": "Gbps",
        "factor_a": 1000,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "KBPS",
        "nombre": "Kilobits por Segundo",
        "simbolo": "kbps",
        "factor_a": 0.001,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "MBS_BYTE",
        "nombre": "Megabytes por Segundo",
        "simbolo": "MB/s",
        "factor_a": 8,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      }
    ]
  },
  {
    "codigo_magnitud": "POTENCIA_SENAL",
    "nombre_magnitud": "Nivel de Señal RF y Óptica",
    "categoria": "TI_DIGITAL",
    "descripcion": "Potencia de señal en antenas de telemetría celular, radioenlaces y fibra óptica",
    "unidad_base_codigo": "DBM",
    "unidades": [
      {
        "codigo": "DBM",
        "nombre": "Decibelio-Milivatio",
        "simbolo": "dBm",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": true,
        "permite_decimales": true
      },
      {
        "codigo": "DB_ATEN",
        "nombre": "Decibelio de Atenuación",
        "simbolo": "dB",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      }
    ]
  },
  {
    "codigo_magnitud": "CADENCIA_PRODUCCION",
    "nombre_magnitud": "Velocidad de Producción y Empaque",
    "categoria": "OPERACION_DESGASTE",
    "descripcion": "Régimen de empaque de envases, unidades manufacturadas y páginas de impresión",
    "unidad_base_codigo": "UPM",
    "unidades": [
      {
        "codigo": "UPM",
        "nombre": "Unidades por Minuto",
        "simbolo": "u/min",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": true,
        "permite_decimales": true
      },
      {
        "codigo": "UPH",
        "nombre": "Unidades por Hora",
        "simbolo": "u/h",
        "factor_a": 0.016666667,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "PPM_IMP",
        "nombre": "Páginas por Minuto (Impresión)",
        "simbolo": "ppm",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "BPM_ENV",
        "nombre": "Envases / Botellas por Minuto",
        "simbolo": "bpm",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      }
    ]
  },
  {
    "codigo_magnitud": "DISTANCIA_RECORRIDO",
    "nombre_magnitud": "Odómetro / Recorrido Vehicular",
    "categoria": "MECANICA_POTENCIA",
    "descripcion": "Distancia acumulada en flotas, montacargas, camiones grúa y vehículos de servicio",
    "unidad_base_codigo": "KM_ODO",
    "unidades": [
      {
        "codigo": "KM_ODO",
        "nombre": "Kilómetros de Odómetro",
        "simbolo": "km",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": true,
        "permite_decimales": true
      },
      {
        "codigo": "MI_ODO",
        "nombre": "Millas de Odómetro",
        "simbolo": "mi",
        "factor_a": 1.609344,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "M_ODO",
        "nombre": "Metros de Recorrido",
        "simbolo": "m",
        "factor_a": 0.001,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "NM_ODO",
        "nombre": "Millas Náuticas",
        "simbolo": "nm",
        "factor_a": 1.852,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      }
    ]
  },
  {
    "codigo_magnitud": "RENDIMIENTO_COMBUSTIBLE",
    "nombre_magnitud": "Rendimiento y Eficiencia de Combustible",
    "categoria": "MECANICA_POTENCIA",
    "descripcion": "Eficiencia de consumo de combustible en flotas y vehículos de mantenimiento",
    "unidad_base_codigo": "KML",
    "unidades": [
      {
        "codigo": "KML",
        "nombre": "Kilómetros por Litro",
        "simbolo": "km/L",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": true,
        "permite_decimales": true
      },
      {
        "codigo": "KMGAL",
        "nombre": "Kilómetros por Galón",
        "simbolo": "km/gal",
        "factor_a": 0.264172052,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "MPG_US",
        "nombre": "Millas por Galón (US)",
        "simbolo": "mpg",
        "factor_a": 0.425143707,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      }
    ]
  },
  {
    "codigo_magnitud": "ANGULO_INCLINACION",
    "nombre_magnitud": "Ángulo, Inclinación y Alineación",
    "categoria": "MECANICA_POTENCIA",
    "descripcion": "Alineación láser de ejes, inclinación de plumas de grúa y nivelación",
    "unidad_base_codigo": "GRADO_ANG",
    "unidades": [
      {
        "codigo": "GRADO_ANG",
        "nombre": "Grado Sexagesimal",
        "simbolo": "°",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": true,
        "permite_decimales": true
      },
      {
        "codigo": "RAD_ANG",
        "nombre": "Radianes",
        "simbolo": "rad",
        "factor_a": 57.2957795,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "MRAD_ANG",
        "nombre": "Miliradianes",
        "simbolo": "mrad",
        "factor_a": 0.05729578,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "PORC_PEND",
        "nombre": "Porcentaje de Pendiente",
        "simbolo": "% pend.",
        "factor_a": 0.5729387,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      }
    ]
  },
  {
    "codigo_magnitud": "DUREZA_AGUA",
    "nombre_magnitud": "Dureza de Agua en Calderas y Torres",
    "categoria": "QUIMICA_AGUA",
    "descripcion": "Contenido total de carbonato de calcio para control de incrustaciones calcáreas",
    "unidad_base_codigo": "PPM_CACO3",
    "unidades": [
      {
        "codigo": "PPM_CACO3",
        "nombre": "PPM Carbonato de Calcio",
        "simbolo": "ppm CaCO₃",
        "factor_a": 1,
        "factor_b": 0,
        "es_unidad_base": true,
        "permite_decimales": true
      },
      {
        "codigo": "GPG_AGUA",
        "nombre": "Granos por Galón (US)",
        "simbolo": "gpg",
        "factor_a": 17.11806,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      },
      {
        "codigo": "DH_ALEMAN",
        "nombre": "Grado Alemán de Dureza",
        "simbolo": "°dH",
        "factor_a": 17.848,
        "factor_b": 0,
        "es_unidad_base": false,
        "permite_decimales": true
      }
    ]
  }
];

export const BANCO_UNIVERSAL_QUDT = BANCO_UNIVERSAL_MAGNITUDES;
