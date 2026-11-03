/**
 * MEKANOS S.A.S - Motor Universal de Activos EAM
 * 
 * Script de Sembrado Canónico Exhaustivo (Fase 2 - Cobertura 1:1)
 * 
 * Siembra:
 * 1. 11 Magnitudes Físicas Fundamentales
 * 2. 38 Unidades de Medida Dimensiónales (y = ax + b)
 * 3. Mapeo de unidad_codigo en 27 parámetros de medición
 * 4. ~70 Atributos Técnicos que cubren el 100% de las columnas satélite
 * 5. 5 Módulos Técnicos con asignación de atributos y grupos visuales
 * 6. Vinculación de Arquetipos a sus Módulos y Planes
 * 7. 4 Modelos OEM Maestros con especificaciones base y kits BOM
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('================================================================');
  console.log('🚀 INICIANDO SEMBRADO CANÓNICO EXHAUSTIVO DEL METAMODELO EAM (1:1)');
  console.log('================================================================');

  // --------------------------------------------------------------------------
  // 1. MAGNITUDES FÍSICAS CANÓNICAS
  // --------------------------------------------------------------------------
  console.log('\n[1/6] Sembrando Magnitudes Físicas Canónicas...');

  const magnitudes = [
    { codigo_magnitud: 'POTENCIA', nombre_magnitud: 'Potencia Mecánica / Eléctrica', descripcion: 'Capacidad de trabajo o potencia instalada', unidad_base_codigo: 'KW' },
    { codigo_magnitud: 'PRESION', nombre_magnitud: 'Presión Hidráulica / Neumática', descripcion: 'Fuerza ejercida por unidad de superficie', unidad_base_codigo: 'PSI' },
    { codigo_magnitud: 'CAUDAL', nombre_magnitud: 'Caudal Volumétrico', descripcion: 'Volumen de fluido por unidad de tiempo', unidad_base_codigo: 'M3H' },
    { codigo_magnitud: 'TEMPERATURA', nombre_magnitud: 'Temperatura', descripcion: 'Medición térmica de motores y fluidos', unidad_base_codigo: 'C' },
    { codigo_magnitud: 'VOLUMEN', nombre_magnitud: 'Volumen / Capacidad de Fluidos', descripcion: 'Capacidad de cárter, tanques y refrigerante', unidad_base_codigo: 'LIT' },
    { codigo_magnitud: 'ELECTRICA_VOLTAJE', nombre_magnitud: 'Voltaje / Tensión Eléctrica', descripcion: 'Diferencia de potencial eléctrico en AC o DC', unidad_base_codigo: 'V' },
    { codigo_magnitud: 'ELECTRICA_CORRIENTE', nombre_magnitud: 'Corriente / Amperaje Eléctrico', descripcion: 'Intensidad de corriente eléctrica', unidad_base_codigo: 'A' },
    { codigo_magnitud: 'FRECUENCIA_VELOCIDAD', nombre_magnitud: 'Frecuencia / Velocidad de Rotación', descripcion: 'RPM y frecuencia de red en Hz', unidad_base_codigo: 'RPM' },
    { codigo_magnitud: 'LONGITUD', nombre_magnitud: 'Longitud y Diámetros', descripcion: 'Diámetros de tubería y dimensiones', unidad_base_codigo: 'MET' },
    { codigo_magnitud: 'TIEMPO_USO', nombre_magnitud: 'Tiempo de Uso / Contador', descripcion: 'Horómetro de trabajo o ciclos operativos', unidad_base_codigo: 'HORAS' },
    { codigo_magnitud: 'CAPACIDAD_BATERIA', nombre_magnitud: 'Capacidad de Batería', descripcion: 'Capacidad de almacenamiento y entrega de carga en acumuladores (Ah, mAh)', unidad_base_codigo: 'AH' },
    { codigo_magnitud: 'ADIMENSIONAL', nombre_magnitud: 'Unidad de Conteo / Adimensional', descripcion: 'Conteo por unidades, piezas o sin magnitud', unidad_base_codigo: 'UND' },
  ];

  const mapMagnitudes = new Map<string, number>();

  for (const mag of magnitudes) {
    const res = await prisma.catalogo_magnitudes.upsert({
      where: { codigo_magnitud: mag.codigo_magnitud },
      create: {
        codigo_magnitud: mag.codigo_magnitud,
        nombre_magnitud: mag.nombre_magnitud,
        descripcion: mag.descripcion,
        unidad_base_codigo: mag.unidad_base_codigo,
        es_sistema: true,
        activo: true,
      },
      update: {
        nombre_magnitud: mag.nombre_magnitud,
        descripcion: mag.descripcion,
        unidad_base_codigo: mag.unidad_base_codigo,
        es_sistema: true,
        activo: true,
      },
    });
    mapMagnitudes.set(mag.codigo_magnitud, res.id_magnitud);
  }
  console.log(`✅ ${magnitudes.length} magnitudes físicas sembradas.`);

  // --------------------------------------------------------------------------
  // 2. UNIDADES DE MEDIDA DIMENSIONALES (y = ax + b)
  // --------------------------------------------------------------------------
  console.log('\n[2/6] Sembrando Unidades de Medida y Factores de Conversión...');

  const unidades = [
    // ADIMENSIONAL
    { codigo: 'UND', nombre: 'Unidad', simbolo: 'und', tipo_magnitud: 'CANTIDAD', id_magnitud: mapMagnitudes.get('ADIMENSIONAL'), factor_a: 1.0, factor_b: 0.0, es_unidad_base: true, permite_decimales: false },
    { codigo: 'PAR', nombre: 'Par', simbolo: 'par', tipo_magnitud: 'CANTIDAD', id_magnitud: mapMagnitudes.get('ADIMENSIONAL'), factor_a: 2.0, factor_b: 0.0, es_unidad_base: false, permite_decimales: false },
    { codigo: 'KIT', nombre: 'Juego / Kit', simbolo: 'kit', tipo_magnitud: 'CANTIDAD', id_magnitud: mapMagnitudes.get('ADIMENSIONAL'), factor_a: 1.0, factor_b: 0.0, es_unidad_base: false, permite_decimales: false },

    // VOLUMEN
    { codigo: 'LIT', nombre: 'Litros', simbolo: 'L', tipo_magnitud: 'VOLUMEN', id_magnitud: mapMagnitudes.get('VOLUMEN'), factor_a: 1.0, factor_b: 0.0, es_unidad_base: true, permite_decimales: true },
    { codigo: 'GAL', nombre: 'Galones (US)', simbolo: 'Gal', tipo_magnitud: 'VOLUMEN', id_magnitud: mapMagnitudes.get('VOLUMEN'), factor_a: 3.785411784, factor_b: 0.0, es_unidad_base: false, permite_decimales: true },
    { codigo: 'ML', nombre: 'Mililitros', simbolo: 'mL', tipo_magnitud: 'VOLUMEN', id_magnitud: mapMagnitudes.get('VOLUMEN'), factor_a: 0.001, factor_b: 0.0, es_unidad_base: false, permite_decimales: true },
    { codigo: 'M3_VOL', nombre: 'Metros Cúbicos', simbolo: 'm³', tipo_magnitud: 'VOLUMEN', id_magnitud: mapMagnitudes.get('VOLUMEN'), factor_a: 1000.0, factor_b: 0.0, es_unidad_base: false, permite_decimales: true },

    // POTENCIA
    { codigo: 'KW', nombre: 'Kilovatios', simbolo: 'kW', tipo_magnitud: 'POTENCIA', id_magnitud: mapMagnitudes.get('POTENCIA'), factor_a: 1.0, factor_b: 0.0, es_unidad_base: true, permite_decimales: true },
    { codigo: 'HP', nombre: 'Caballos de Fuerza', simbolo: 'HP', tipo_magnitud: 'POTENCIA', id_magnitud: mapMagnitudes.get('POTENCIA'), factor_a: 0.745699872, factor_b: 0.0, es_unidad_base: false, permite_decimales: true },
    { codigo: 'KVA', nombre: 'Kilovoltiamperios', simbolo: 'kVA', tipo_magnitud: 'POTENCIA', id_magnitud: mapMagnitudes.get('POTENCIA'), factor_a: 0.8, factor_b: 0.0, es_unidad_base: false, permite_decimales: true },
    { codigo: 'BTU_H', nombre: 'BTU por hora', simbolo: 'BTU/h', tipo_magnitud: 'POTENCIA', id_magnitud: mapMagnitudes.get('POTENCIA'), factor_a: 0.000293071, factor_b: 0.0, es_unidad_base: false, permite_decimales: true },
    { codigo: 'TR', nombre: 'Toneladas de Refrigeración', simbolo: 'TR', tipo_magnitud: 'POTENCIA', id_magnitud: mapMagnitudes.get('POTENCIA'), factor_a: 3.51685284, factor_b: 0.0, es_unidad_base: false, permite_decimales: true },
    { codigo: 'W', nombre: 'Vatios', simbolo: 'W', tipo_magnitud: 'POTENCIA', id_magnitud: mapMagnitudes.get('POTENCIA'), factor_a: 0.001, factor_b: 0.0, es_unidad_base: false, permite_decimales: true },

    // PRESION
    { codigo: 'PSI', nombre: 'Libras por Pulgada Cuadrada', simbolo: 'PSI', tipo_magnitud: 'PRESION', id_magnitud: mapMagnitudes.get('PRESION'), factor_a: 1.0, factor_b: 0.0, es_unidad_base: true, permite_decimales: true },
    { codigo: 'BAR', nombre: 'Bares', simbolo: 'bar', tipo_magnitud: 'PRESION', id_magnitud: mapMagnitudes.get('PRESION'), factor_a: 14.5037738, factor_b: 0.0, es_unidad_base: false, permite_decimales: true },
    { codigo: 'KPA', nombre: 'Kilopascales', simbolo: 'kPa', tipo_magnitud: 'PRESION', id_magnitud: mapMagnitudes.get('PRESION'), factor_a: 0.1450377, factor_b: 0.0, es_unidad_base: false, permite_decimales: true },
    { codigo: 'MPA', nombre: 'Megapascales', simbolo: 'MPa', tipo_magnitud: 'PRESION', id_magnitud: mapMagnitudes.get('PRESION'), factor_a: 145.037738, factor_b: 0.0, es_unidad_base: false, permite_decimales: true },

    // TEMPERATURA
    { codigo: 'C', nombre: 'Grados Celsius', simbolo: '°C', tipo_magnitud: 'TEMPERATURA', id_magnitud: mapMagnitudes.get('TEMPERATURA'), factor_a: 1.0, factor_b: 0.0, es_unidad_base: true, permite_decimales: true },
    { codigo: 'F', nombre: 'Grados Fahrenheit', simbolo: '°F', tipo_magnitud: 'TEMPERATURA', id_magnitud: mapMagnitudes.get('TEMPERATURA'), factor_a: 5 / 9, factor_b: -160 / 9, es_unidad_base: false, permite_decimales: true },
    { codigo: 'K', nombre: 'Kelvin', simbolo: 'K', tipo_magnitud: 'TEMPERATURA', id_magnitud: mapMagnitudes.get('TEMPERATURA'), factor_a: 1.0, factor_b: -273.15, es_unidad_base: false, permite_decimales: true },

    // CAUDAL
    { codigo: 'M3H', nombre: 'Metros Cúbicos por Hora', simbolo: 'm³/h', tipo_magnitud: 'CAUDAL', id_magnitud: mapMagnitudes.get('CAUDAL'), factor_a: 1.0, factor_b: 0.0, es_unidad_base: true, permite_decimales: true },
    { codigo: 'GPM', nombre: 'Galones por Minuto', simbolo: 'GPM', tipo_magnitud: 'CAUDAL', id_magnitud: mapMagnitudes.get('CAUDAL'), factor_a: 0.2271247, factor_b: 0.0, es_unidad_base: false, permite_decimales: true },
    { codigo: 'LPS', nombre: 'Litros por Segundo', simbolo: 'L/s', tipo_magnitud: 'CAUDAL', id_magnitud: mapMagnitudes.get('CAUDAL'), factor_a: 3.6, factor_b: 0.0, es_unidad_base: false, permite_decimales: true },
    { codigo: 'LPM', nombre: 'Litros por Minuto', simbolo: 'L/min', tipo_magnitud: 'CAUDAL', id_magnitud: mapMagnitudes.get('CAUDAL'), factor_a: 0.06, factor_b: 0.0, es_unidad_base: false, permite_decimales: true },

    // ELECTRICA_VOLTAJE
    { codigo: 'V', nombre: 'Voltios', simbolo: 'V', tipo_magnitud: 'ELECTRICA_VOLTAJE', id_magnitud: mapMagnitudes.get('ELECTRICA_VOLTAJE'), factor_a: 1.0, factor_b: 0.0, es_unidad_base: true, permite_decimales: true },
    { codigo: 'VAC', nombre: 'Voltios Corriente Alterna', simbolo: 'VAC', tipo_magnitud: 'ELECTRICA_VOLTAJE', id_magnitud: mapMagnitudes.get('ELECTRICA_VOLTAJE'), factor_a: 1.0, factor_b: 0.0, es_unidad_base: false, permite_decimales: true },
    { codigo: 'VDC', nombre: 'Voltios Corriente Continua', simbolo: 'VDC', tipo_magnitud: 'ELECTRICA_VOLTAJE', id_magnitud: mapMagnitudes.get('ELECTRICA_VOLTAJE'), factor_a: 1.0, factor_b: 0.0, es_unidad_base: false, permite_decimales: true },
    { codigo: 'KV_VOLT', nombre: 'Kilovoltios', simbolo: 'kV', tipo_magnitud: 'ELECTRICA_VOLTAJE', id_magnitud: mapMagnitudes.get('ELECTRICA_VOLTAJE'), factor_a: 1000.0, factor_b: 0.0, es_unidad_base: false, permite_decimales: true },

    // ELECTRICA_CORRIENTE
    { codigo: 'A', nombre: 'Amperios', simbolo: 'A', tipo_magnitud: 'ELECTRICA_CORRIENTE', id_magnitud: mapMagnitudes.get('ELECTRICA_CORRIENTE'), factor_a: 1.0, factor_b: 0.0, es_unidad_base: true, permite_decimales: true },
    { codigo: 'MA', nombre: 'Miliamperios', simbolo: 'mA', tipo_magnitud: 'ELECTRICA_CORRIENTE', id_magnitud: mapMagnitudes.get('ELECTRICA_CORRIENTE'), factor_a: 0.001, factor_b: 0.0, es_unidad_base: false, permite_decimales: true },

    // CAPACIDAD_BATERIA
    { codigo: 'AH', nombre: 'Amperios-Hora', simbolo: 'Ah', tipo_magnitud: 'CAPACIDAD_BATERIA', id_magnitud: mapMagnitudes.get('CAPACIDAD_BATERIA'), factor_a: 1.0, factor_b: 0.0, es_unidad_base: true, permite_decimales: true },
    { codigo: 'MAH', nombre: 'Miliamperios-Hora', simbolo: 'mAh', tipo_magnitud: 'CAPACIDAD_BATERIA', id_magnitud: mapMagnitudes.get('CAPACIDAD_BATERIA'), factor_a: 0.001, factor_b: 0.0, es_unidad_base: false, permite_decimales: true },

    // FRECUENCIA_VELOCIDAD
    { codigo: 'RPM', nombre: 'Revoluciones por Minuto', simbolo: 'RPM', tipo_magnitud: 'FRECUENCIA_VELOCIDAD', id_magnitud: mapMagnitudes.get('FRECUENCIA_VELOCIDAD'), factor_a: 1.0, factor_b: 0.0, es_unidad_base: true, permite_decimales: false },
    { codigo: 'HZ', nombre: 'Hercios', simbolo: 'Hz', tipo_magnitud: 'FRECUENCIA_VELOCIDAD', id_magnitud: mapMagnitudes.get('FRECUENCIA_VELOCIDAD'), factor_a: 1.0, factor_b: 0.0, es_unidad_base: false, permite_decimales: true },

    // LONGITUD
    { codigo: 'MET', nombre: 'Metros', simbolo: 'm', tipo_magnitud: 'LONGITUD', id_magnitud: mapMagnitudes.get('LONGITUD'), factor_a: 1.0, factor_b: 0.0, es_unidad_base: true, permite_decimales: true },
    { codigo: 'MM', nombre: 'Milímetros', simbolo: 'mm', tipo_magnitud: 'LONGITUD', id_magnitud: mapMagnitudes.get('LONGITUD'), factor_a: 0.001, factor_b: 0.0, es_unidad_base: false, permite_decimales: true },
    { codigo: 'CM', nombre: 'Centímetros', simbolo: 'cm', tipo_magnitud: 'LONGITUD', id_magnitud: mapMagnitudes.get('LONGITUD'), factor_a: 0.01, factor_b: 0.0, es_unidad_base: false, permite_decimales: true },
    { codigo: 'PULG', nombre: 'Pulgadas', simbolo: 'in', tipo_magnitud: 'LONGITUD', id_magnitud: mapMagnitudes.get('LONGITUD'), factor_a: 0.0254, factor_b: 0.0, es_unidad_base: false, permite_decimales: true },

    // TIEMPO_USO
    { codigo: 'HORAS', nombre: 'Horas', simbolo: 'h', tipo_magnitud: 'TIEMPO_USO', id_magnitud: mapMagnitudes.get('TIEMPO_USO'), factor_a: 1.0, factor_b: 0.0, es_unidad_base: true, permite_decimales: true },
    { codigo: 'MIN', nombre: 'Minutos', simbolo: 'min', tipo_magnitud: 'TIEMPO_USO', id_magnitud: mapMagnitudes.get('TIEMPO_USO'), factor_a: 1 / 60, factor_b: 0.0, es_unidad_base: false, permite_decimales: true },
    { codigo: 'DIAS', nombre: 'Días', simbolo: 'd', tipo_magnitud: 'TIEMPO_USO', id_magnitud: mapMagnitudes.get('TIEMPO_USO'), factor_a: 24.0, factor_b: 0.0, es_unidad_base: false, permite_decimales: true },
  ];

  for (const u of unidades) {
    await prisma.unidades_medida.upsert({
      where: { codigo: u.codigo },
      create: {
        codigo: u.codigo,
        nombre: u.nombre,
        simbolo: u.simbolo,
        tipo_magnitud: u.tipo_magnitud,
        id_magnitud: u.id_magnitud,
        factor_a: u.factor_a,
        factor_b: u.factor_b,
        es_unidad_base: u.es_unidad_base,
        permite_decimales: u.permite_decimales,
        activo: true,
      },
      update: {
        nombre: u.nombre,
        simbolo: u.simbolo,
        tipo_magnitud: u.tipo_magnitud,
        id_magnitud: u.id_magnitud,
        factor_a: u.factor_a,
        factor_b: u.factor_b,
        es_unidad_base: u.es_unidad_base,
        permite_decimales: u.permite_decimales,
        activo: true,
      },
    });
  }
  console.log(`✅ ${unidades.length} unidades de medida sembradas y vinculadas a magnitudes.`);

  // Vincular los 27 parámetros de medición a su unidad_codigo canónico
  const mapUnidadParametros: Record<string, string> = {
    'V': 'V',
    '°C': 'C',
    'PSI': 'PSI',
    'RPM': 'RPM',
    'Hrs': 'HORAS',
    'Hz': 'HZ',
    'A': 'A',
    'VDC': 'VDC',
    'VAC': 'VAC',
    'mm/s': 'MM',
    'N/A': 'UND',
  };

  const params = await prisma.parametros_medicion.findMany();
  for (const p of params) {
    const unidadCodigo = mapUnidadParametros[p.unidad_medida] || 'UND';
    await prisma.parametros_medicion.update({
      where: { id_parametro_medicion: p.id_parametro_medicion },
      data: { unidad_codigo: unidadCodigo },
    });
  }
  console.log(`✅ ${params.length} parámetros de medición vinculados al código de unidad canónico.`);

  // --------------------------------------------------------------------------
  // 3. DICCIONARIO ATÓMICO DE ATRIBUTOS TÉCNICOS (COBERTURA 1:1 CON SATÉLITES)
  // --------------------------------------------------------------------------
  console.log('\n[3/6] Sembrando Diccionario Completo de Atributos Técnicos (1:1)...');

  const atributos = [
    // --- Identificación Primaria Universal ---
    { codigo: 'marca_principal', nombre: 'Marca Principal', control: 'TEXTO_CORTO', rol: 'MARCA_PRINCIPAL', mag: null, unidad: null },
    { codigo: 'modelo_principal', nombre: 'Modelo Principal', control: 'TEXTO_CORTO', rol: 'MODELO_PRINCIPAL', mag: null, unidad: null },
    { codigo: 'serie_principal', nombre: 'Número de Serie Principal', control: 'TEXTO_CORTO', rol: 'SERIE_PRINCIPAL', mag: null, unidad: null },

    // --- Motor Combustión: Identificación ---
    { codigo: 'marca_motor', nombre: 'Marca del Motor', control: 'TEXTO_CORTO', rol: 'MARCA_MOTOR', mag: null, unidad: null },
    { codigo: 'modelo_motor', nombre: 'Modelo del Motor', control: 'TEXTO_CORTO', rol: 'MODELO_MOTOR', mag: null, unidad: null },
    { codigo: 'numero_serie_motor', nombre: 'Número de Serie del Motor', control: 'TEXTO_CORTO', rol: 'SERIE_MOTOR', mag: null, unidad: null },
    { codigo: 'tipo_motor', nombre: 'Tipo de Motor', control: 'SELECTOR', rol: 'ESTANDAR', mag: null, unidad: null, opciones: [{ valor: 'COMBUSTION', etiqueta: 'Combustión Interna' }, { valor: 'ELECTRICO', etiqueta: 'Motor Eléctrico' }] },
    { codigo: 'tipo_combustible', nombre: 'Tipo de Combustible', control: 'SELECTOR', rol: 'ESTANDAR', mag: null, unidad: null, opciones: [{ valor: 'DIESEL', etiqueta: 'Diésel' }, { valor: 'GASOLINA', etiqueta: 'Gasolina' }, { valor: 'GAS_NATURAL', etiqueta: 'Gas Natural' }, { valor: 'GLP', etiqueta: 'GLP' }] },
    { codigo: 'ano_fabricacion_motor', nombre: 'Año de Fabricación del Motor', control: 'NUMERICO_PURO', rol: 'ESTANDAR', mag: null, unidad: null },

    // --- Motor Combustión: Rendimiento & Cilindros ---
    { codigo: 'potencia_hp', nombre: 'Potencia Mecánica (HP)', control: 'NUMERICO_MAGNITUD', rol: 'POTENCIA_CAPACIDAD_PRINCIPAL', mag: 'POTENCIA', unidad: 'HP' },
    { codigo: 'potencia_kw_motor', nombre: 'Potencia Activa Motor (kW)', control: 'NUMERICO_MAGNITUD', rol: 'ESTANDAR', mag: 'POTENCIA', unidad: 'KW' },
    { codigo: 'velocidad_rpm', nombre: 'Velocidad de Giro (RPM)', control: 'NUMERICO_MAGNITUD', rol: 'ESTANDAR', mag: 'FRECUENCIA_VELOCIDAD', unidad: 'RPM' },
    { codigo: 'numero_cilindros', nombre: 'Número de Cilindros', control: 'NUMERICO_PURO', rol: 'ESTANDAR', mag: null, unidad: null },
    { codigo: 'cilindrada_cc', nombre: 'Cilindrada (cc)', control: 'NUMERICO_PURO', rol: 'ESTANDAR', mag: null, unidad: null },
    { codigo: 'aspiracion', nombre: 'Tipo de Aspiración', control: 'SELECTOR', rol: 'ESTANDAR', mag: null, unidad: null, opciones: [{ valor: 'NATURAL', etiqueta: 'Naturalmente Aspirado' }, { valor: 'TURBOCARGADO', etiqueta: 'Turbocargado' }, { valor: 'TURBOCARGADO_POSTENFRIADO', etiqueta: 'Turbocargado Postenfriado (Aftercooler)' }] },
    { codigo: 'tiene_turbocargador', nombre: '¿Tiene Turbocargador?', control: 'BOOLEANO', rol: 'ESTANDAR', mag: null, unidad: null },

    // --- Motor Combustión: Arranque y Baterías ---
    { codigo: 'tipo_arranque', nombre: 'Tipo de Arranque', control: 'SELECTOR', rol: 'ESTANDAR', mag: null, unidad: null, opciones: [{ valor: 'ELECTRICO', etiqueta: 'Eléctrico' }, { valor: 'MANUAL', etiqueta: 'Manual' }, { valor: 'AIRE', etiqueta: 'Neumático / Aire' }, { valor: 'HIDRAULICO', etiqueta: 'Hidráulico' }] },
    { codigo: 'voltaje_arranque_vdc', nombre: 'Voltaje de Arranque (VDC)', control: 'NUMERICO_MAGNITUD', rol: 'ESTANDAR', mag: 'ELECTRICA_VOLTAJE', unidad: 'VDC' },
    { codigo: 'amperaje_arranque_cca', nombre: 'Amperaje de Arranque (CCA)', control: 'NUMERICO_MAGNITUD', rol: 'ESTANDAR', mag: 'ELECTRICA_CORRIENTE', unidad: 'A' },
    { codigo: 'cantidad_baterias', nombre: 'Cantidad de Baterías', control: 'NUMERICO_PURO', rol: 'ESTANDAR', mag: null, unidad: null },
    { codigo: 'referencia_bateria', nombre: 'Referencia / Tipo Batería', control: 'TEXTO_CORTO', rol: 'BATERIA_ARRANQUE', mag: null, unidad: null },
    { codigo: 'capacidad_bateria_ah', nombre: 'Capacidad Batería (Ah)', control: 'NUMERICO_MAGNITUD', rol: 'ESTANDAR', mag: 'CAPACIDAD_BATERIA', unidad: 'AH' },
    { codigo: 'tiene_cargador_bateria', nombre: '¿Tiene Cargador de Batería?', control: 'BOOLEANO', rol: 'ESTANDAR', mag: null, unidad: null },
    { codigo: 'marca_cargador', nombre: 'Marca Cargador de Batería', control: 'TEXTO_CORTO', rol: 'ESTANDAR', mag: null, unidad: null },
    { codigo: 'modelo_cargador', nombre: 'Modelo Cargador de Batería', control: 'TEXTO_CORTO', rol: 'ESTANDAR', mag: null, unidad: null },
    { codigo: 'amperaje_cargador', nombre: 'Amperaje Cargador (A)', control: 'NUMERICO_MAGNITUD', rol: 'ESTANDAR', mag: 'ELECTRICA_CORRIENTE', unidad: 'A' },

    // --- Motor Combustión: Lubricación y Refrigeración ---
    { codigo: 'capacidad_aceite_litros', nombre: 'Capacidad Aceite Cárter', control: 'NUMERICO_MAGNITUD', rol: 'CAPACIDAD_FLUIDO_LITROS', mag: 'VOLUMEN', unidad: 'LIT' },
    { codigo: 'tipo_aceite', nombre: 'Tipo y Grado de Aceite', control: 'SELECTOR', rol: 'TIPO_FLUIDO', mag: null, unidad: null, opciones: [{ valor: '15W40 CI-4', etiqueta: '15W40 CI-4 Diésel' }, { valor: '15W40 CK-4', etiqueta: '15W40 CK-4 Premium' }, { valor: '10W30', etiqueta: '10W30 Multigrado' }, { valor: '20W50', etiqueta: '20W50 Alto Kilometraje' }, { valor: 'ISO VG 46', etiqueta: 'ISO VG 46 Hidráulico' }, { valor: 'ISO VG 68', etiqueta: 'ISO VG 68 Compresor' }] },
    { codigo: 'capacidad_refrigerante_litros', nombre: 'Capacidad de Refrigerante', control: 'NUMERICO_MAGNITUD', rol: 'CAPACIDAD_FLUIDO_LITROS', mag: 'VOLUMEN', unidad: 'LIT' },
    { codigo: 'tipo_refrigerante', nombre: 'Tipo de Refrigerante', control: 'SELECTOR', rol: 'TIPO_FLUIDO', mag: null, unidad: null, opciones: [{ valor: '50/50 PREMIX', etiqueta: 'Etilenglicol 50/50 Premix' }, { valor: 'OAT LONGLIFE', etiqueta: 'Orgánico Larga Vida (OAT)' }, { valor: 'CONCENTRADO', etiqueta: 'Refrigerante Concentrado' }] },
    { codigo: 'tiene_radiador', nombre: '¿Tiene Radiador?', control: 'BOOLEANO', rol: 'ESTANDAR', mag: null, unidad: null },
    { codigo: 'radiador_alto_cm', nombre: 'Alto de Radiador (cm)', control: 'NUMERICO_MAGNITUD', rol: 'ESTANDAR', mag: 'LONGITUD', unidad: 'CM' },
    { codigo: 'radiador_ancho_cm', nombre: 'Ancho de Radiador (cm)', control: 'NUMERICO_MAGNITUD', rol: 'ESTANDAR', mag: 'LONGITUD', unidad: 'CM' },
    { codigo: 'radiador_espesor_cm', nombre: 'Espesor de Radiador (cm)', control: 'NUMERICO_MAGNITUD', rol: 'ESTANDAR', mag: 'LONGITUD', unidad: 'CM' },

    // --- Motor Eléctrico ---
    { codigo: 'marca_motor_electrico', nombre: 'Marca del Motor Eléctrico', control: 'TEXTO_CORTO', rol: 'MARCA_MOTOR', mag: null, unidad: null },
    { codigo: 'modelo_motor_electrico', nombre: 'Modelo del Motor Eléctrico', control: 'TEXTO_CORTO', rol: 'MODELO_MOTOR', mag: null, unidad: null },
    { codigo: 'numero_serie_motor_electrico', nombre: 'Número de Serie Motor Eléctrico', control: 'TEXTO_CORTO', rol: 'SERIE_MOTOR', mag: null, unidad: null },
    { codigo: 'potencia_hp_electrico', nombre: 'Potencia Eléctrica (HP)', control: 'NUMERICO_MAGNITUD', rol: 'POTENCIA_CAPACIDAD_PRINCIPAL', mag: 'POTENCIA', unidad: 'HP' },
    { codigo: 'potencia_kw_electrico', nombre: 'Potencia Eléctrica (kW)', control: 'NUMERICO_MAGNITUD', rol: 'ESTANDAR', mag: 'POTENCIA', unidad: 'KW' },
    { codigo: 'voltaje_operacion_vac', nombre: 'Voltaje de Operación (VAC)', control: 'SELECTOR', rol: 'ESTANDAR', mag: 'ELECTRICA_VOLTAJE', unidad: 'VAC', opciones: [{ valor: '220/127', etiqueta: '220/127 VAC' }, { valor: '440/254', etiqueta: '440/254 VAC' }, { valor: '208/120', etiqueta: '208/120 VAC' }, { valor: '480/277', etiqueta: '480/277 VAC' }, { valor: '380/220', etiqueta: '380/220 VAC' }] },
    { codigo: 'numero_fases_motor', nombre: 'Número de Fases Motor', control: 'SELECTOR', rol: 'ESTANDAR', mag: null, unidad: null, opciones: [{ valor: '3', etiqueta: 'Trifásico (3F)' }, { valor: '1', etiqueta: 'Monofásico (1F)' }, { valor: '2', etiqueta: 'Bifásico (2F)' }] },
    { codigo: 'frecuencia_hz_motor', nombre: 'Frecuencia Motor (Hz)', control: 'SELECTOR', rol: 'ESTANDAR', mag: 'FRECUENCIA_VELOCIDAD', unidad: 'HZ', opciones: [{ valor: '60', etiqueta: '60 Hz' }, { valor: '50', etiqueta: '50 Hz' }] },
    { codigo: 'amperaje_nominal_motor', nombre: 'Amperaje Nominal Motor (A)', control: 'NUMERICO_MAGNITUD', rol: 'ESTANDAR', mag: 'ELECTRICA_CORRIENTE', unidad: 'A' },
    { codigo: 'factor_potencia_motor', nombre: 'Factor de Potencia Motor (cos φ)', control: 'NUMERICO_PURO', rol: 'ESTANDAR', mag: null, unidad: null },
    { codigo: 'clase_aislamiento_motor', nombre: 'Clase de Aislamiento Motor', control: 'SELECTOR', rol: 'ESTANDAR', mag: null, unidad: null, opciones: [{ valor: 'CLASE_H', etiqueta: 'Clase H (180°C)' }, { valor: 'CLASE_F', etiqueta: 'Clase F (155°C)' }, { valor: 'CLASE_B', etiqueta: 'Clase B (130°C)' }] },
    { codigo: 'grado_proteccion_ip_motor', nombre: 'Grado Protección IP Motor', control: 'SELECTOR', rol: 'ESTANDAR', mag: null, unidad: null, opciones: [{ valor: 'IP55', etiqueta: 'IP55 (Estándar Industrial)' }, { valor: 'IP54', etiqueta: 'IP54' }, { valor: 'IP23', etiqueta: 'IP23' }, { valor: 'IP65', etiqueta: 'IP65' }] },
    { codigo: 'ano_fabricacion_motor_electrico', nombre: 'Año Fabricación Motor Eléctrico', control: 'NUMERICO_PURO', rol: 'ESTANDAR', mag: null, unidad: null },

    // --- Alternador / Generador ---
    { codigo: 'marca_generador', nombre: 'Marca del Generador', control: 'TEXTO_CORTO', rol: 'MARCA_PRINCIPAL', mag: null, unidad: null },
    { codigo: 'modelo_generador', nombre: 'Modelo del Generador', control: 'TEXTO_CORTO', rol: 'MODELO_PRINCIPAL', mag: null, unidad: null },
    { codigo: 'numero_serie_generador', nombre: 'Número de Serie del Generador', control: 'TEXTO_CORTO', rol: 'SERIE_PRINCIPAL', mag: null, unidad: null },
    { codigo: 'marca_alternador', nombre: 'Marca del Alternador', control: 'TEXTO_CORTO', rol: 'ESTANDAR', mag: null, unidad: null },
    { codigo: 'modelo_alternador', nombre: 'Modelo del Alternador', control: 'TEXTO_CORTO', rol: 'ESTANDAR', mag: null, unidad: null },
    { codigo: 'numero_serie_alternador', nombre: 'Número de Serie Alternador', control: 'TEXTO_CORTO', rol: 'ESTANDAR', mag: null, unidad: null },
    { codigo: 'potencia_kva', nombre: 'Potencia Aparente (kVA)', control: 'NUMERICO_MAGNITUD', rol: 'POTENCIA_CAPACIDAD_PRINCIPAL', mag: 'POTENCIA', unidad: 'KVA' },
    { codigo: 'potencia_kw', nombre: 'Potencia Activa (kW)', control: 'NUMERICO_MAGNITUD', rol: 'ESTANDAR', mag: 'POTENCIA', unidad: 'KW' },
    { codigo: 'factor_potencia', nombre: 'Factor de Potencia Generador', control: 'NUMERICO_PURO', rol: 'ESTANDAR', mag: null, unidad: null },
    { codigo: 'voltaje_salida', nombre: 'Voltaje de Salida Generador', control: 'SELECTOR', rol: 'ESTANDAR', mag: 'ELECTRICA_VOLTAJE', unidad: 'VAC', opciones: [{ valor: '220/127', etiqueta: '220/127 VAC' }, { valor: '440/254', etiqueta: '440/254 VAC' }, { valor: '208/120', etiqueta: '208/120 VAC' }, { valor: '480/277', etiqueta: '480/277 VAC' }, { valor: '380/220', etiqueta: '380/220 VAC' }] },
    { codigo: 'numero_fases', nombre: 'Número de Fases Generador', control: 'SELECTOR', rol: 'ESTANDAR', mag: null, unidad: null, opciones: [{ valor: '3', etiqueta: 'Trifásico (3F)' }, { valor: '1', etiqueta: 'Monofásico (1F)' }, { valor: '2', etiqueta: 'Bifásico (2F)' }] },
    { codigo: 'frecuencia_hz', nombre: 'Frecuencia Generador (Hz)', control: 'SELECTOR', rol: 'ESTANDAR', mag: 'FRECUENCIA_VELOCIDAD', unidad: 'HZ', opciones: [{ valor: '60', etiqueta: '60 Hz' }, { valor: '50', etiqueta: '50 Hz' }] },
    { codigo: 'amperaje_nominal_salida', nombre: 'Amperaje Nominal Salida (A)', control: 'NUMERICO_MAGNITUD', rol: 'ESTANDAR', mag: 'ELECTRICA_CORRIENTE', unidad: 'A' },
    { codigo: 'configuracion_salida', nombre: 'Configuración Conexión', control: 'SELECTOR', rol: 'ESTANDAR', mag: null, unidad: null, opciones: [{ valor: 'ESTRELLA_SERIE', etiqueta: 'Estrella Serie (Wye)' }, { valor: 'ESTRELLA_PARALELO', etiqueta: 'Estrella Paralelo' }, { valor: 'DELTA_SERIE', etiqueta: 'Delta Serie' }, { valor: 'DELTA_ZIGZAG', etiqueta: 'Delta Zig-Zag' }] },
    { codigo: 'clase_aislamiento', nombre: 'Clase de Aislamiento Alternador', control: 'SELECTOR', rol: 'ESTANDAR', mag: null, unidad: null, opciones: [{ valor: 'CLASE_H', etiqueta: 'Clase H' }, { valor: 'CLASE_F', etiqueta: 'Clase F' }] },
    { codigo: 'grado_proteccion_ip', nombre: 'Grado Protección IP Alternador', control: 'SELECTOR', rol: 'ESTANDAR', mag: null, unidad: null, opciones: [{ valor: 'IP23', etiqueta: 'IP23' }, { valor: 'IP21', etiqueta: 'IP21' }, { valor: 'IP54', etiqueta: 'IP54' }] },
    { codigo: 'ano_fabricacion_generador', nombre: 'Año Fabricación Generador', control: 'NUMERICO_PURO', rol: 'ESTANDAR', mag: null, unidad: null },

    // --- Regulación, Control & Transferencia ---
    { codigo: 'tiene_avr', nombre: '¿Tiene Regulador de Voltaje (AVR)?', control: 'BOOLEANO', rol: 'ESTANDAR', mag: null, unidad: null },
    { codigo: 'marca_avr', nombre: 'Marca del AVR', control: 'TEXTO_CORTO', rol: 'ESTANDAR', mag: null, unidad: null },
    { codigo: 'modelo_avr', nombre: 'Modelo del AVR', control: 'TEXTO_CORTO', rol: 'ESTANDAR', mag: null, unidad: null },
    { codigo: 'referencia_avr', nombre: 'Referencia / Código AVR', control: 'TEXTO_CORTO', rol: 'ESTANDAR', mag: null, unidad: null },
    { codigo: 'tiene_modulo_control', nombre: '¿Tiene Módulo de Control?', control: 'BOOLEANO', rol: 'ESTANDAR', mag: null, unidad: null },
    { codigo: 'marca_modulo_control', nombre: 'Marca Módulo de Control', control: 'TEXTO_CORTO', rol: 'ESTANDAR', mag: null, unidad: null },
    { codigo: 'modelo_modulo_control', nombre: 'Modelo Módulo de Control', control: 'TEXTO_CORTO', rol: 'ESTANDAR', mag: null, unidad: null },
    { codigo: 'tiene_arranque_automatico', nombre: '¿Tiene Arranque Automático?', control: 'BOOLEANO', rol: 'ESTANDAR', mag: null, unidad: null },
    { codigo: 'capacidad_tanque_principal_litros', nombre: 'Tanque Principal Combustible (L)', control: 'NUMERICO_MAGNITUD', rol: 'ESTANDAR', mag: 'VOLUMEN', unidad: 'LIT' },
    { codigo: 'tiene_tanque_auxiliar', nombre: '¿Tiene Tanque Auxiliar?', control: 'BOOLEANO', rol: 'ESTANDAR', mag: null, unidad: null },
    { codigo: 'capacidad_tanque_auxiliar_litros', nombre: 'Tanque Auxiliar Combustible (L)', control: 'NUMERICO_MAGNITUD', rol: 'ESTANDAR', mag: 'VOLUMEN', unidad: 'LIT' },
    { codigo: 'tiene_cabina_insonorizada', nombre: '¿Tiene Cabina Insonorizada?', control: 'BOOLEANO', rol: 'ESTANDAR', mag: null, unidad: null },
    { codigo: 'tiene_tablero_transferencia', nombre: '¿Tiene Tablero de Transferencia?', control: 'BOOLEANO', rol: 'ESTANDAR', mag: null, unidad: null },
    { codigo: 'tipo_transferencia', nombre: 'Tipo de Transferencia', control: 'SELECTOR', rol: 'ESTANDAR', mag: null, unidad: null, opciones: [{ valor: 'AUTOMATICA', etiqueta: 'Automática (ATS)' }, { valor: 'MANUAL', etiqueta: 'Manual (MTS)' }, { valor: 'SIN_TRANSFERENCIA', etiqueta: 'Sin Transferencia' }] },
    { codigo: 'ubicacion_transferencia', nombre: 'Ubicación de Transferencia', control: 'SELECTOR', rol: 'ESTANDAR', mag: null, unidad: null, opciones: [{ valor: 'INTEGRADA', etiqueta: 'Integrada en Cabina' }, { valor: 'EXTERNA_PARED', etiqueta: 'Externa en Pared' }, { valor: 'EXTERNA_PEDESTAL', etiqueta: 'Externa en Pedestal' }] },
    { codigo: 'amperaje_transferencia', nombre: 'Amperaje de Transferencia (A)', control: 'NUMERICO_MAGNITUD', rol: 'ESTANDAR', mag: 'ELECTRICA_CORRIENTE', unidad: 'A' },
    { codigo: 'calibre_cable_potencia', nombre: 'Calibre Cable de Potencia', control: 'TEXTO_CORTO', rol: 'ESTANDAR', mag: null, unidad: null },
    { codigo: 'longitud_cable_m', nombre: 'Longitud de Cable (m)', control: 'NUMERICO_MAGNITUD', rol: 'ESTANDAR', mag: 'LONGITUD', unidad: 'MET' },

    // --- Bomba Hidráulica ---
    { codigo: 'marca_bomba', nombre: 'Marca de la Bomba', control: 'TEXTO_CORTO', rol: 'MARCA_PRINCIPAL', mag: null, unidad: null },
    { codigo: 'modelo_bomba', nombre: 'Modelo de la Bomba', control: 'TEXTO_CORTO', rol: 'MODELO_PRINCIPAL', mag: null, unidad: null },
    { codigo: 'numero_serie_bomba', nombre: 'Número de Serie de la Bomba', control: 'TEXTO_CORTO', rol: 'SERIE_PRINCIPAL', mag: null, unidad: null },
    { codigo: 'tipo_bomba', nombre: 'Tipo de Bomba Hidráulica', control: 'SELECTOR', rol: 'ESTANDAR', mag: null, unidad: null, opciones: [{ valor: 'CENTRIFUGA', etiqueta: 'Centrífuga Horizontal' }, { valor: 'SUMERGIBLE', etiqueta: 'Sumergible Pozo / Achique' }, { valor: 'MULTIETAPAS', etiqueta: 'Multietapas Alta Presión' }, { valor: 'TURBINA_VERTICAL', etiqueta: 'Turbina Vertical' }, { valor: 'ENGRANAJES', etiqueta: 'Desplazamiento Positivo / Engranajes' }, { valor: 'DIAFRAGMA', etiqueta: 'Diafragma / Neumática' }] },
    { codigo: 'aplicacion_bomba', nombre: 'Aplicación de la Bomba', control: 'SELECTOR', rol: 'ESTANDAR', mag: null, unidad: null, opciones: [{ valor: 'PRESION_CONSTANTE', etiqueta: 'Presión Constante / Hidroneumático' }, { valor: 'AGUA_POTABLE', etiqueta: 'Abastecimiento Agua Potable' }, { valor: 'ACHIQUE_RESIDUALES', etiqueta: 'Achique y Aguas Residuales' }, { valor: 'CONTRA_INCENDIO', etiqueta: 'Red Contra Incendio (RCI)' }, { valor: 'RIEGO', etiqueta: 'Riego Agrícola' }, { valor: 'RECIRCULACION', etiqueta: 'Recirculación Industrial / HVAC' }] },
    { codigo: 'caudal_maximo_m3h', nombre: 'Caudal Máximo (m³/h)', control: 'NUMERICO_MAGNITUD', rol: 'POTENCIA_CAPACIDAD_PRINCIPAL', mag: 'CAUDAL', unidad: 'M3H' },
    { codigo: 'altura_manometrica_maxima_m', nombre: 'Altura Manométrica Máxima (m)', control: 'NUMERICO_MAGNITUD', rol: 'ESTANDAR', mag: 'LONGITUD', unidad: 'MET' },
    { codigo: 'altura_presion_trabajo_m', nombre: 'Altura / Presión de Trabajo (m)', control: 'NUMERICO_MAGNITUD', rol: 'ESTANDAR', mag: 'LONGITUD', unidad: 'MET' },
    { codigo: 'potencia_hidraulica_kw', nombre: 'Potencia Hidráulica (kW)', control: 'NUMERICO_MAGNITUD', rol: 'ESTANDAR', mag: 'POTENCIA', unidad: 'KW' },
    { codigo: 'eficiencia_porcentaje', nombre: 'Eficiencia Hidráulica (%)', control: 'NUMERICO_PURO', rol: 'ESTANDAR', mag: null, unidad: null },
    { codigo: 'diametro_succion', nombre: 'Diámetro de Succión', control: 'TEXTO_CORTO', rol: 'ESTANDAR', mag: null, unidad: null },
    { codigo: 'diametro_descarga', nombre: 'Diámetro de Descarga', control: 'TEXTO_CORTO', rol: 'ESTANDAR', mag: null, unidad: null },
    { codigo: 'total_bombas_sistema', nombre: 'Total Bombas en el Sistema', control: 'NUMERICO_PURO', rol: 'ESTANDAR', mag: null, unidad: null },
    { codigo: 'posicion_bomba_numero', nombre: 'Posición de Bomba en Sistema', control: 'NUMERICO_PURO', rol: 'ESTANDAR', mag: null, unidad: null },
    { codigo: 'ano_fabricacion_bomba', nombre: 'Año Fabricación de Bomba', control: 'NUMERICO_PURO', rol: 'ESTANDAR', mag: null, unidad: null },

    // --- Bomba: Control, Presión e Instrumentación ---
    { codigo: 'tiene_panel_control_bomba', nombre: '¿Tiene Panel de Control?', control: 'BOOLEANO', rol: 'ESTANDAR', mag: null, unidad: null },
    { codigo: 'marca_panel_control_bomba', nombre: 'Marca Panel de Control', control: 'TEXTO_CORTO', rol: 'ESTANDAR', mag: null, unidad: null },
    { codigo: 'modelo_panel_control_bomba', nombre: 'Modelo Panel de Control', control: 'TEXTO_CORTO', rol: 'ESTANDAR', mag: null, unidad: null },
    { codigo: 'tiene_presostato', nombre: '¿Tiene Presostato?', control: 'BOOLEANO', rol: 'ESTANDAR', mag: null, unidad: null },
    { codigo: 'marca_presostato', nombre: 'Marca del Presostato', control: 'TEXTO_CORTO', rol: 'ESTANDAR', mag: null, unidad: null },
    { codigo: 'modelo_presostato', nombre: 'Modelo del Presostato', control: 'TEXTO_CORTO', rol: 'ESTANDAR', mag: null, unidad: null },
    { codigo: 'presion_encendido_psi', nombre: 'Presión de Encendido (PSI)', control: 'NUMERICO_MAGNITUD', rol: 'ESTANDAR', mag: 'PRESION', unidad: 'PSI' },
    { codigo: 'presion_apagado_psi', nombre: 'Presión de Apagado (PSI)', control: 'NUMERICO_MAGNITUD', rol: 'ESTANDAR', mag: 'PRESION', unidad: 'PSI' },
    { codigo: 'tiene_contactor_externo', nombre: '¿Tiene Contactor Externo?', control: 'BOOLEANO', rol: 'ESTANDAR', mag: null, unidad: null },
    { codigo: 'marca_contactor', nombre: 'Marca del Contactor', control: 'TEXTO_CORTO', rol: 'ESTANDAR', mag: null, unidad: null },
    { codigo: 'amperaje_contactor', nombre: 'Amperaje Contactor (A)', control: 'NUMERICO_MAGNITUD', rol: 'ESTANDAR', mag: 'ELECTRICA_CORRIENTE', unidad: 'A' },
    { codigo: 'tiene_arrancador_suave', nombre: '¿Tiene Arrancador Suave?', control: 'BOOLEANO', rol: 'ESTANDAR', mag: null, unidad: null },
    { codigo: 'tiene_variador_frecuencia_vfd', nombre: '¿Tiene Variador de Frecuencia (VFD)?', control: 'BOOLEANO', rol: 'ESTANDAR', mag: null, unidad: null },
    { codigo: 'marca_variador', nombre: 'Marca Variador VFD', control: 'TEXTO_CORTO', rol: 'ESTANDAR', mag: null, unidad: null },
    { codigo: 'modelo_variador', nombre: 'Modelo Variador VFD', control: 'TEXTO_CORTO', rol: 'ESTANDAR', mag: null, unidad: null },
    { codigo: 'tiene_tanques_hidroneumaticos', nombre: '¿Tiene Tanques Hidroneumáticos?', control: 'BOOLEANO', rol: 'ESTANDAR', mag: null, unidad: null },
    { codigo: 'cantidad_tanques_hidro', nombre: 'Cantidad de Tanques Hidroneumáticos', control: 'NUMERICO_PURO', rol: 'ESTANDAR', mag: null, unidad: null },
    { codigo: 'capacidad_tanques_litros', nombre: 'Capacidad de Tanques (L)', control: 'NUMERICO_MAGNITUD', rol: 'ESTANDAR', mag: 'VOLUMEN', unidad: 'LIT' },
    { codigo: 'presion_tanques_psi', nombre: 'Presión Precarga Tanques (PSI)', control: 'NUMERICO_MAGNITUD', rol: 'ESTANDAR', mag: 'PRESION', unidad: 'PSI' },
    { codigo: 'tiene_manometro', nombre: '¿Tiene Manómetro?', control: 'BOOLEANO', rol: 'ESTANDAR', mag: null, unidad: null },
    { codigo: 'rango_manometro_min_psi', nombre: 'Rango Mínimo Manómetro (PSI)', control: 'NUMERICO_MAGNITUD', rol: 'ESTANDAR', mag: 'PRESION', unidad: 'PSI' },
    { codigo: 'rango_manometro_max_psi', nombre: 'Rango Máximo Manómetro (PSI)', control: 'NUMERICO_MAGNITUD', rol: 'ESTANDAR', mag: 'PRESION', unidad: 'PSI' },
    { codigo: 'tiene_proteccion_nivel', nombre: '¿Tiene Protección de Nivel?', control: 'BOOLEANO', rol: 'ESTANDAR', mag: null, unidad: null },
    { codigo: 'tipo_proteccion_nivel', nombre: 'Tipo Protección de Nivel', control: 'SELECTOR', rol: 'ESTANDAR', mag: null, unidad: null, opciones: [{ valor: 'ELECTRODOS', etiqueta: 'Electrodos de Nivel' }, { valor: 'FLOTADOR', etiqueta: 'Flotador Mecánico / Eléctrico' }, { valor: 'BOYAS', etiqueta: 'Boyas de Nivel' }, { valor: 'PRESOSTATO', etiqueta: 'Presostato de Baja' }, { valor: 'OTRO', etiqueta: 'Otro Sensor' }] },
    { codigo: 'tiene_valvula_purga', nombre: '¿Tiene Válvula de Purga?', control: 'BOOLEANO', rol: 'ESTANDAR', mag: null, unidad: null },
    { codigo: 'tiene_valvula_cebado', nombre: '¿Tiene Válvula de Cebado?', control: 'BOOLEANO', rol: 'ESTANDAR', mag: null, unidad: null },
    { codigo: 'tiene_valvula_cheque', nombre: '¿Tiene Válvula Cheque (Retención)?', control: 'BOOLEANO', rol: 'ESTANDAR', mag: null, unidad: null },
    { codigo: 'tiene_valvula_pie', nombre: '¿Tiene Válvula de Pie?', control: 'BOOLEANO', rol: 'ESTANDAR', mag: null, unidad: null },
    { codigo: 'referencia_sello_mecanico', nombre: 'Referencia / Tipo Sello Mecánico', control: 'TEXTO_CORTO', rol: 'ESTANDAR', mag: null, unidad: null },

    // --- Compresor Industrial ---
    { codigo: 'marca_compresor', nombre: 'Marca del Compresor', control: 'TEXTO_CORTO', rol: 'MARCA_PRINCIPAL', mag: null, unidad: null },
    { codigo: 'modelo_compresor', nombre: 'Modelo del Compresor', control: 'TEXTO_CORTO', rol: 'MODELO_PRINCIPAL', mag: null, unidad: null },
    { codigo: 'numero_serie_compresor', nombre: 'Número de Serie Compresor', control: 'TEXTO_CORTO', rol: 'SERIE_PRINCIPAL', mag: null, unidad: null },
    { codigo: 'tipo_compresor', nombre: 'Tecnología del Compresor', control: 'SELECTOR', rol: 'ESTANDAR', mag: null, unidad: null, opciones: [{ valor: 'TORNILLO_ROTATIVO', etiqueta: 'Tornillo Rotativo Lubricado' }, { valor: 'PISTON_RECIPROCANTE', etiqueta: 'Pistón Reciprocante' }, { valor: 'SCROLL', etiqueta: 'Scroll Libre de Aceite' }, { valor: 'CENTRIFUGO', etiqueta: 'Centrífugo Dinámico' }] },
    { codigo: 'presion_maxima_psi', nombre: 'Presión Máxima de Trabajo (PSI)', control: 'NUMERICO_MAGNITUD', rol: 'POTENCIA_CAPACIDAD_PRINCIPAL', mag: 'PRESION', unidad: 'PSI' },
    { codigo: 'presion_carga_psi', nombre: 'Presión de Carga (PSI)', control: 'NUMERICO_MAGNITUD', rol: 'ESTANDAR', mag: 'PRESION', unidad: 'PSI' },
    { codigo: 'presion_descarga_psi', nombre: 'Presión de Descarga (PSI)', control: 'NUMERICO_MAGNITUD', rol: 'ESTANDAR', mag: 'PRESION', unidad: 'PSI' },
    { codigo: 'caudal_aire_cfm', nombre: 'Caudal de Aire (CFM)', control: 'NUMERICO_PURO', rol: 'ESTANDAR', mag: null, unidad: null },
    { codigo: 'capacidad_tanque_receptor_litros', nombre: 'Capacidad Tanque Pulmón (L)', control: 'NUMERICO_MAGNITUD', rol: 'ESTANDAR', mag: 'VOLUMEN', unidad: 'LIT' },
    { codigo: 'tipo_acople', nombre: 'Tipo de Acople', control: 'SELECTOR', rol: 'ESTANDAR', mag: null, unidad: null, opciones: [{ valor: 'DIRECTO_FLEXIBLE', etiqueta: 'Directo Flexible' }, { valor: 'CORREAS_POLEAS', etiqueta: 'Correas y Poleas' }, { valor: 'ENGRANAJES', etiqueta: 'Caja de Engranajes' }] },
    { codigo: 'tiene_secador_integrado', nombre: '¿Tiene Secador Integrado?', control: 'BOOLEANO', rol: 'ESTANDAR', mag: null, unidad: null },
    { codigo: 'tipo_refrigerante_secador', nombre: 'Refrigerante del Secador', control: 'TEXTO_CORTO', rol: 'ESTANDAR', mag: null, unidad: null },
    { codigo: 'ano_fabricacion_compresor', nombre: 'Año Fabricación Compresor', control: 'NUMERICO_PURO', rol: 'ESTANDAR', mag: null, unidad: null },
  ];

  const mapAtributos = new Map<string, number>();

  for (const attr of atributos) {
    const idMag = attr.mag ? mapMagnitudes.get(attr.mag) || null : null;
    const res = await prisma.atributos_tecnicos.upsert({
      where: { codigo_atributo: attr.codigo },
      create: {
        codigo_atributo: attr.codigo,
        nombre_atributo: attr.nombre,
        tipo_control: attr.control,
        id_magnitud: idMag,
        unidad_defecto_codigo: attr.unidad,
        rol_semantico: attr.rol,
        opciones_json: (attr as any).opciones || null,
        validacion_json: (attr as any).validacion || null,
        es_sistema: true,
        activo: true,
      },
      update: {
        nombre_atributo: attr.nombre,
        tipo_control: attr.control,
        id_magnitud: idMag,
        unidad_defecto_codigo: attr.unidad,
        rol_semantico: attr.rol,
        opciones_json: (attr as any).opciones || null,
        validacion_json: (attr as any).validacion || null,
        es_sistema: true,
        activo: true,
      },
    });
    mapAtributos.set(attr.codigo, res.id_atributo);
  }
  console.log(`✅ ${atributos.length} atributos técnicos canónicos sembrados.`);

  // --------------------------------------------------------------------------
  // 4. MÓDULOS TÉCNICOS FUNCIONALES Y ASIGNACIÓN (modulo_atributos)
  // --------------------------------------------------------------------------
  console.log('\n[4/6] Sembrando Módulos Técnicos y Ensamblando Atributos con Grupos Visuales...');

  const modulos = [
    { codigo_modulo: 'motor_combustion', nombre_modulo: 'Motor de Combustión Interna', descripcion: 'Motor diésel, gasolina o gas', icono: 'engine' },
    { codigo_modulo: 'motor_electrico', nombre_modulo: 'Motor Eléctrico', descripcion: 'Motor de inducción o síncrono', icono: 'zap' },
    { codigo_modulo: 'alternador_generador', nombre_modulo: 'Alternador / Generador Eléctrico', descripcion: 'Cabezal de generación eléctrica', icono: 'activity' },
    { codigo_modulo: 'bomba_hidraulica', nombre_modulo: 'Bomba Hidráulica', descripcion: 'Cuerpo de bombeo y succión/descarga', icono: 'droplets' },
    { codigo_modulo: 'compresor_industrial', nombre_modulo: 'Compresor de Aire Industrial', descripcion: 'Unidad de compresión y tanque de aire', icono: 'wind' },
  ];

  const mapModulos = new Map<string, number>();

  for (const mod of modulos) {
    const res = await prisma.modulos_tecnicos.upsert({
      where: { codigo_modulo: mod.codigo_modulo },
      create: {
        codigo_modulo: mod.codigo_modulo,
        nombre_modulo: mod.nombre_modulo,
        descripcion: mod.descripcion,
        icono: mod.icono,
        es_sistema: true,
        activo: true,
      },
      update: {
        nombre_modulo: mod.nombre_modulo,
        descripcion: mod.descripcion,
        icono: mod.icono,
        es_sistema: true,
        activo: true,
      },
    });
    mapModulos.set(mod.codigo_modulo, res.id_modulo);
  }
  console.log(`✅ ${modulos.length} módulos técnicos funcionales sembrados.`);

  // Definición granular de atributos por módulo
  interface AsignacionModulo {
    codigo_attr: string;
    grupo: string;
    orden: number;
    obligatorio?: boolean;
    es_kpi?: boolean;
    es_filtrable?: boolean;
    visible_pdf?: boolean;
  }

  const estructuraModulos: Record<string, AsignacionModulo[]> = {
    motor_combustion: [
      // Identificación
      { codigo_attr: 'marca_motor', grupo: 'Identificación', orden: 1, obligatorio: true, es_kpi: false, es_filtrable: true },
      { codigo_attr: 'modelo_motor', grupo: 'Identificación', orden: 2, obligatorio: false, es_kpi: false, es_filtrable: true },
      { codigo_attr: 'numero_serie_motor', grupo: 'Identificación', orden: 3, obligatorio: true, es_kpi: false, es_filtrable: true },
      { codigo_attr: 'tipo_combustible', grupo: 'Identificación', orden: 4, obligatorio: false, es_kpi: false, es_filtrable: true },
      { codigo_attr: 'ano_fabricacion_motor', grupo: 'Identificación', orden: 5, obligatorio: false, es_kpi: false, es_filtrable: false },

      // Potencia & Desempeño
      { codigo_attr: 'potencia_hp', grupo: 'Potencia y Rendimiento', orden: 10, obligatorio: true, es_kpi: true, es_filtrable: true },
      { codigo_attr: 'potencia_kw_motor', grupo: 'Potencia y Rendimiento', orden: 11, obligatorio: false, es_kpi: false, es_filtrable: true },
      { codigo_attr: 'velocidad_rpm', grupo: 'Potencia y Rendimiento', orden: 12, obligatorio: true, es_kpi: true, es_filtrable: true },
      { codigo_attr: 'numero_cilindros', grupo: 'Potencia y Rendimiento', orden: 13, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'cilindrada_cc', grupo: 'Potencia y Rendimiento', orden: 14, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'aspiracion', grupo: 'Potencia y Rendimiento', orden: 15, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'tiene_turbocargador', grupo: 'Potencia y Rendimiento', orden: 16, obligatorio: false, es_kpi: false, es_filtrable: false },

      // Arranque & Baterías
      { codigo_attr: 'tipo_arranque', grupo: 'Arranque y Baterías', orden: 20, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'voltaje_arranque_vdc', grupo: 'Arranque y Baterías', orden: 21, obligatorio: true, es_kpi: true, es_filtrable: true },
      { codigo_attr: 'amperaje_arranque_cca', grupo: 'Arranque y Baterías', orden: 22, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'cantidad_baterias', grupo: 'Arranque y Baterías', orden: 23, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'referencia_bateria', grupo: 'Arranque y Baterías', orden: 24, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'capacidad_bateria_ah', grupo: 'Arranque y Baterías', orden: 25, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'tiene_cargador_bateria', grupo: 'Arranque y Baterías', orden: 26, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'marca_cargador', grupo: 'Arranque y Baterías', orden: 27, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'modelo_cargador', grupo: 'Arranque y Baterías', orden: 28, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'amperaje_cargador', grupo: 'Arranque y Baterías', orden: 29, obligatorio: false, es_kpi: false, es_filtrable: false },

      // Lubricación & Enfriamiento
      { codigo_attr: 'capacidad_aceite_litros', grupo: 'Lubricación y Refrigeración', orden: 30, obligatorio: true, es_kpi: false, es_filtrable: true },
      { codigo_attr: 'tipo_aceite', grupo: 'Lubricación y Refrigeración', orden: 31, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'capacidad_refrigerante_litros', grupo: 'Lubricación y Refrigeración', orden: 32, obligatorio: false, es_kpi: false, es_filtrable: true },
      { codigo_attr: 'tipo_refrigerante', grupo: 'Lubricación y Refrigeración', orden: 33, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'tiene_radiador', grupo: 'Lubricación y Refrigeración', orden: 34, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'radiador_alto_cm', grupo: 'Lubricación y Refrigeración', orden: 35, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'radiador_ancho_cm', grupo: 'Lubricación y Refrigeración', orden: 36, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'radiador_espesor_cm', grupo: 'Lubricación y Refrigeración', orden: 37, obligatorio: false, es_kpi: false, es_filtrable: false },
    ],

    motor_electrico: [
      // Identificación
      { codigo_attr: 'marca_motor_electrico', grupo: 'Identificación', orden: 1, obligatorio: true, es_kpi: false, es_filtrable: true },
      { codigo_attr: 'modelo_motor_electrico', grupo: 'Identificación', orden: 2, obligatorio: false, es_kpi: false, es_filtrable: true },
      { codigo_attr: 'numero_serie_motor_electrico', grupo: 'Identificación', orden: 3, obligatorio: true, es_kpi: false, es_filtrable: true },
      { codigo_attr: 'ano_fabricacion_motor_electrico', grupo: 'Identificación', orden: 4, obligatorio: false, es_kpi: false, es_filtrable: false },

      // Potencia & Eléctrico
      { codigo_attr: 'potencia_hp_electrico', grupo: 'Potencia y Rendimiento', orden: 10, obligatorio: true, es_kpi: true, es_filtrable: true },
      { codigo_attr: 'potencia_kw_electrico', grupo: 'Potencia y Rendimiento', orden: 11, obligatorio: false, es_kpi: false, es_filtrable: true },
      { codigo_attr: 'voltaje_operacion_vac', grupo: 'Potencia y Rendimiento', orden: 12, obligatorio: true, es_kpi: true, es_filtrable: true },
      { codigo_attr: 'numero_fases_motor', grupo: 'Potencia y Rendimiento', orden: 13, obligatorio: true, es_kpi: false, es_filtrable: true },
      { codigo_attr: 'frecuencia_hz_motor', grupo: 'Potencia y Rendimiento', orden: 14, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'velocidad_rpm', grupo: 'Potencia y Rendimiento', orden: 15, obligatorio: true, es_kpi: true, es_filtrable: true },
      { codigo_attr: 'amperaje_nominal_motor', grupo: 'Potencia y Rendimiento', orden: 16, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'factor_potencia_motor', grupo: 'Potencia y Rendimiento', orden: 17, obligatorio: false, es_kpi: false, es_filtrable: false },

      // Protección & Aislamiento
      { codigo_attr: 'clase_aislamiento_motor', grupo: 'Aislamiento y Protección', orden: 20, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'grado_proteccion_ip_motor', grupo: 'Aislamiento y Protección', orden: 21, obligatorio: false, es_kpi: false, es_filtrable: false },
    ],

    alternador_generador: [
      // Identificación
      { codigo_attr: 'marca_generador', grupo: 'Identificación', orden: 1, obligatorio: true, es_kpi: false, es_filtrable: true },
      { codigo_attr: 'modelo_generador', grupo: 'Identificación', orden: 2, obligatorio: false, es_kpi: false, es_filtrable: true },
      { codigo_attr: 'numero_serie_generador', grupo: 'Identificación', orden: 3, obligatorio: true, es_kpi: false, es_filtrable: true },
      { codigo_attr: 'marca_alternador', grupo: 'Identificación Alternador', orden: 4, obligatorio: false, es_kpi: false, es_filtrable: true },
      { codigo_attr: 'modelo_alternador', grupo: 'Identificación Alternador', orden: 5, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'numero_serie_alternador', grupo: 'Identificación Alternador', orden: 6, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'ano_fabricacion_generador', grupo: 'Identificación', orden: 7, obligatorio: false, es_kpi: false, es_filtrable: false },

      // Generación Eléctrica
      { codigo_attr: 'potencia_kva', grupo: 'Generación Eléctrica', orden: 10, obligatorio: true, es_kpi: true, es_filtrable: true },
      { codigo_attr: 'potencia_kw', grupo: 'Generación Eléctrica', orden: 11, obligatorio: false, es_kpi: false, es_filtrable: true },
      { codigo_attr: 'factor_potencia', grupo: 'Generación Eléctrica', orden: 12, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'voltaje_salida', grupo: 'Generación Eléctrica', orden: 13, obligatorio: true, es_kpi: true, es_filtrable: true },
      { codigo_attr: 'numero_fases', grupo: 'Generación Eléctrica', orden: 14, obligatorio: true, es_kpi: false, es_filtrable: true },
      { codigo_attr: 'frecuencia_hz', grupo: 'Generación Eléctrica', orden: 15, obligatorio: true, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'amperaje_nominal_salida', grupo: 'Generación Eléctrica', orden: 16, obligatorio: false, es_kpi: true, es_filtrable: false },
      { codigo_attr: 'configuracion_salida', grupo: 'Generación Eléctrica', orden: 17, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'clase_aislamiento', grupo: 'Generación Eléctrica', orden: 18, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'grado_proteccion_ip', grupo: 'Generación Eléctrica', orden: 19, obligatorio: false, es_kpi: false, es_filtrable: false },

      // Control & Regulación
      { codigo_attr: 'tiene_avr', grupo: 'Regulación y Control', orden: 20, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'marca_avr', grupo: 'Regulación y Control', orden: 21, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'modelo_avr', grupo: 'Regulación y Control', orden: 22, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'referencia_avr', grupo: 'Regulación y Control', orden: 23, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'tiene_modulo_control', grupo: 'Regulación y Control', orden: 24, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'marca_modulo_control', grupo: 'Regulación y Control', orden: 25, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'modelo_modulo_control', grupo: 'Regulación y Control', orden: 26, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'tiene_arranque_automatico', grupo: 'Regulación y Control', orden: 27, obligatorio: false, es_kpi: false, es_filtrable: false },

      // Combustible & Cabina
      { codigo_attr: 'capacidad_tanque_principal_litros', grupo: 'Combustible y Cabina', orden: 30, obligatorio: false, es_kpi: false, es_filtrable: true },
      { codigo_attr: 'tiene_tanque_auxiliar', grupo: 'Combustible y Cabina', orden: 31, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'capacidad_tanque_auxiliar_litros', grupo: 'Combustible y Cabina', orden: 32, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'tiene_cabina_insonorizada', grupo: 'Combustible y Cabina', orden: 33, obligatorio: false, es_kpi: false, es_filtrable: false },

      // Transferencia & Conexión
      { codigo_attr: 'tiene_tablero_transferencia', grupo: 'Transferencia y Cableado', orden: 40, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'tipo_transferencia', grupo: 'Transferencia y Cableado', orden: 41, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'ubicacion_transferencia', grupo: 'Transferencia y Cableado', orden: 42, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'amperaje_transferencia', grupo: 'Transferencia y Cableado', orden: 43, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'calibre_cable_potencia', grupo: 'Transferencia y Cableado', orden: 44, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'longitud_cable_m', grupo: 'Transferencia y Cableado', orden: 45, obligatorio: false, es_kpi: false, es_filtrable: false },
    ],

    bomba_hidraulica: [
      // Identificación
      { codigo_attr: 'marca_bomba', grupo: 'Identificación', orden: 1, obligatorio: true, es_kpi: false, es_filtrable: true },
      { codigo_attr: 'modelo_bomba', grupo: 'Identificación', orden: 2, obligatorio: false, es_kpi: false, es_filtrable: true },
      { codigo_attr: 'numero_serie_bomba', grupo: 'Identificación', orden: 3, obligatorio: true, es_kpi: false, es_filtrable: true },
      { codigo_attr: 'tipo_bomba', grupo: 'Identificación', orden: 4, obligatorio: true, es_kpi: false, es_filtrable: true },
      { codigo_attr: 'aplicacion_bomba', grupo: 'Identificación', orden: 5, obligatorio: false, es_kpi: false, es_filtrable: true },
      { codigo_attr: 'ano_fabricacion_bomba', grupo: 'Identificación', orden: 6, obligatorio: false, es_kpi: false, es_filtrable: false },

      // Hidráulica & Desempeño
      { codigo_attr: 'caudal_maximo_m3h', grupo: 'Hidráulica y Desempeño', orden: 10, obligatorio: true, es_kpi: true, es_filtrable: true },
      { codigo_attr: 'altura_manometrica_maxima_m', grupo: 'Hidráulica y Desempeño', orden: 11, obligatorio: true, es_kpi: true, es_filtrable: true },
      { codigo_attr: 'altura_presion_trabajo_m', grupo: 'Hidráulica y Desempeño', orden: 12, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'potencia_hidraulica_kw', grupo: 'Hidráulica y Desempeño', orden: 13, obligatorio: false, es_kpi: false, es_filtrable: true },
      { codigo_attr: 'eficiencia_porcentaje', grupo: 'Hidráulica y Desempeño', orden: 14, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'diametro_succion', grupo: 'Hidráulica y Desempeño', orden: 15, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'diametro_descarga', grupo: 'Hidráulica y Desempeño', orden: 16, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'total_bombas_sistema', grupo: 'Hidráulica y Desempeño', orden: 17, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'posicion_bomba_numero', grupo: 'Hidráulica y Desempeño', orden: 18, obligatorio: false, es_kpi: false, es_filtrable: false },

      // Control & Presión
      { codigo_attr: 'tiene_panel_control_bomba', grupo: 'Control y Presión', orden: 20, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'marca_panel_control_bomba', grupo: 'Control y Presión', orden: 21, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'modelo_panel_control_bomba', grupo: 'Control y Presión', orden: 22, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'tiene_presostato', grupo: 'Control y Presión', orden: 23, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'marca_presostato', grupo: 'Control y Presión', orden: 24, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'modelo_presostato', grupo: 'Control y Presión', orden: 25, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'presion_encendido_psi', grupo: 'Control y Presión', orden: 26, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'presion_apagado_psi', grupo: 'Control y Presión', orden: 27, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'tiene_contactor_externo', grupo: 'Control y Presión', orden: 28, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'marca_contactor', grupo: 'Control y Presión', orden: 29, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'amperaje_contactor', grupo: 'Control y Presión', orden: 30, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'tiene_arrancador_suave', grupo: 'Control y Presión', orden: 31, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'tiene_variador_frecuencia_vfd', grupo: 'Control y Presión', orden: 32, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'marca_variador', grupo: 'Control y Presión', orden: 33, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'modelo_variador', grupo: 'Control y Presión', orden: 34, obligatorio: false, es_kpi: false, es_filtrable: false },

      // Tanques e Instrumentación
      { codigo_attr: 'tiene_tanques_hidroneumaticos', grupo: 'Tanques e Instrumentación', orden: 40, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'cantidad_tanques_hidro', grupo: 'Tanques e Instrumentación', orden: 41, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'capacidad_tanques_litros', grupo: 'Tanques e Instrumentación', orden: 42, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'presion_tanques_psi', grupo: 'Tanques e Instrumentación', orden: 43, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'tiene_manometro', grupo: 'Tanques e Instrumentación', orden: 44, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'rango_manometro_min_psi', grupo: 'Tanques e Instrumentación', orden: 45, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'rango_manometro_max_psi', grupo: 'Tanques e Instrumentación', orden: 46, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'tiene_proteccion_nivel', grupo: 'Tanques e Instrumentación', orden: 47, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'tipo_proteccion_nivel', grupo: 'Tanques e Instrumentación', orden: 48, obligatorio: false, es_kpi: false, es_filtrable: false },

      // Válvulas & Sellos
      { codigo_attr: 'tiene_valvula_purga', grupo: 'Válvulas y Sellos', orden: 50, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'tiene_valvula_cebado', grupo: 'Válvulas y Sellos', orden: 51, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'tiene_valvula_cheque', grupo: 'Válvulas y Sellos', orden: 52, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'tiene_valvula_pie', grupo: 'Válvulas y Sellos', orden: 53, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'referencia_sello_mecanico', grupo: 'Válvulas y Sellos', orden: 54, obligatorio: false, es_kpi: false, es_filtrable: false },
    ],

    compresor_industrial: [
      // Identificación
      { codigo_attr: 'marca_compresor', grupo: 'Identificación', orden: 1, obligatorio: true, es_kpi: false, es_filtrable: true },
      { codigo_attr: 'modelo_compresor', grupo: 'Identificación', orden: 2, obligatorio: false, es_kpi: false, es_filtrable: true },
      { codigo_attr: 'numero_serie_compresor', grupo: 'Identificación', orden: 3, obligatorio: true, es_kpi: false, es_filtrable: true },
      { codigo_attr: 'tipo_compresor', grupo: 'Identificación', orden: 4, obligatorio: true, es_kpi: false, es_filtrable: true },
      { codigo_attr: 'ano_fabricacion_compresor', grupo: 'Identificación', orden: 5, obligatorio: false, es_kpi: false, es_filtrable: false },

      // Presión & Capacidad
      { codigo_attr: 'presion_maxima_psi', grupo: 'Presión y Rendimiento', orden: 10, obligatorio: true, es_kpi: true, es_filtrable: true },
      { codigo_attr: 'presion_carga_psi', grupo: 'Presión y Rendimiento', orden: 11, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'presion_descarga_psi', grupo: 'Presión y Rendimiento', orden: 12, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'caudal_aire_cfm', grupo: 'Presión y Rendimiento', orden: 13, obligatorio: true, es_kpi: true, es_filtrable: true },
      { codigo_attr: 'capacidad_tanque_receptor_litros', grupo: 'Presión y Rendimiento', orden: 14, obligatorio: false, es_kpi: false, es_filtrable: true },
      { codigo_attr: 'tipo_acople', grupo: 'Presión y Rendimiento', orden: 15, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'tiene_secador_integrado', grupo: 'Presión y Rendimiento', orden: 16, obligatorio: false, es_kpi: false, es_filtrable: false },
      { codigo_attr: 'tipo_refrigerante_secador', grupo: 'Presión y Rendimiento', orden: 17, obligatorio: false, es_kpi: false, es_filtrable: false },
    ],
  };

  let totalAsignaciones = 0;

  // Limpieza defensiva de asignaciones preliminares sin grupo visual
  await prisma.modulo_atributos.deleteMany({
    where: { grupo_visual: null },
  });

  for (const [codModulo, items] of Object.entries(estructuraModulos)) {
    const idModulo = mapModulos.get(codModulo);
    if (!idModulo) continue;

    for (const item of items) {
      const idAttr = mapAtributos.get(item.codigo_attr);
      if (!idAttr) continue;

      await prisma.modulo_atributos.upsert({
        where: {
          id_modulo_id_atributo: {
            id_modulo: idModulo,
            id_atributo: idAttr,
          },
        },
        create: {
          id_modulo: idModulo,
          id_atributo: idAttr,
          orden_visual: item.orden,
          obligatorio: item.obligatorio || false,
          es_kpi: item.es_kpi || false,
          es_filtrable: item.es_filtrable || false,
          visible_en_pdf: item.visible_pdf !== false,
          grupo_visual: item.grupo,
        },
        update: {
          orden_visual: item.orden,
          obligatorio: item.obligatorio || false,
          es_kpi: item.es_kpi || false,
          es_filtrable: item.es_filtrable || false,
          visible_en_pdf: item.visible_pdf !== false,
          grupo_visual: item.grupo,
        },
      });
      totalAsignaciones++;
    }
  }
  console.log(`✅ ${totalAsignaciones} asignaciones módulo-atributo registradas con grupos visuales.`);

  // --------------------------------------------------------------------------
  // 5. VINCULACIÓN ARQUETIPO -> MÓDULOS (tipo_equipo_modulos) & PLANES
  // --------------------------------------------------------------------------
  console.log('\n[5/6] Vinculando Arquetipos a sus Módulos Técnicos y Planes de Servicio...');

  const mapaArquetipos = [
    // GENERADOR: Combustión + Alternador
    { tipos: [1, 3], modulos: ['motor_combustion', 'alternador_generador'] },
    // BOMBA: Motor Eléctrico + Bomba Hidráulica
    { tipos: [2, 5], modulos: ['motor_electrico', 'bomba_hidraulica'] },
    // MOTOR INDUSTRIAL: Motor Combustión + Motor Eléctrico
    { tipos: [4, 6], modulos: ['motor_combustion', 'motor_electrico'] },
    // COMPRESOR: Motor Eléctrico + Compresor Industrial
    { tipos: [20], modulos: ['motor_electrico', 'compresor_industrial'] },
  ];

  for (const arch of mapaArquetipos) {
    for (const idTipo of arch.tipos) {
      const tipoExiste = await prisma.tipos_equipo.findUnique({ where: { id_tipo_equipo: idTipo } });
      if (!tipoExiste) continue;

      let orden = 1;
      for (const codMod of arch.modulos) {
        const idMod = mapModulos.get(codMod);
        if (!idMod) continue;

        const existe = await prisma.tipo_equipo_modulos.findFirst({
          where: { id_tipo_equipo: idTipo, id_modulo: idMod },
        });

        if (!existe) {
          await prisma.tipo_equipo_modulos.create({
            data: {
              id_tipo_equipo: idTipo,
              id_modulo: idMod,
              orden_visual: orden++,
              obligatorio: true,
            },
          });
        }
      }
    }
  }

  // 5.1 Saneamiento de Basura E2E en tipos_equipo y tipos_servicio
  const tiposBasura = await prisma.tipos_equipo.findMany({
    where: { codigo_tipo: { contains: 'TEST', mode: 'insensitive' } },
    select: { id_tipo_equipo: true, codigo_tipo: true },
  });
  if (tiposBasura.length > 0) {
    const idsBasura = tiposBasura.map((t) => t.id_tipo_equipo);
    await prisma.tipo_equipo_planes.deleteMany({ where: { id_tipo_equipo: { in: idsBasura } } });
    await prisma.tipo_equipo_modulos.deleteMany({ where: { id_tipo_equipo: { in: idsBasura } } });
    await prisma.tipos_equipo.updateMany({
      where: { id_tipo_equipo: { in: idsBasura } },
      data: { activo: false },
    });
    console.log(`🧹 Desactivados y limpiados ${idsBasura.length} arquetipos residuales de test E2E: ${tiposBasura.map(t => t.codigo_tipo).join(', ')}`);
  }

  await prisma.tipos_servicio.updateMany({
    where: { codigo_tipo: { contains: 'TEST', mode: 'insensitive' } },
    data: { activo: false },
  });

  // 5.2 Depuración semántica de tipo_equipo_planes: erradicar servicios CORRECTIVO / EMERGENCIA / TEST de los planes preventivos
  const serviciosNoPreventivos = await prisma.tipos_servicio.findMany({
    where: {
      OR: [
        { categoria: { in: ['CORRECTIVO', 'EMERGENCIA'] } },
        { codigo_tipo: { contains: 'TEST', mode: 'insensitive' } },
        { codigo_tipo: { in: ['CORRECTIVO', 'EMERGENCIA', 'GEN_CORR', 'BOM_CORR'] } },
      ],
    },
    select: { id_tipo_servicio: true },
  });
  if (serviciosNoPreventivos.length > 0) {
    await prisma.tipo_equipo_planes.deleteMany({
      where: { id_tipo_servicio: { in: serviciosNoPreventivos.map((s) => s.id_tipo_servicio) } },
    });
  }

  // 5.3 Planes de mantenimiento preventivo e inspección canónicos con simetría 100% en pares (1↔3, 2↔5, 4↔6, 20)
  const planesCanonicos = [
    // GENERADORES (1: GENERADOR, 3: GEN)
    {
      tipos: [1, 3],
      planes: [
        { id_tipo_servicio: 3, nombre_plan: 'Plan Preventivo Tipo A - Generador (Cambio Fluidos y Filtros)', frecuencia_dias: 90, frecuencia_uso: 250 },
        { id_tipo_servicio: 4, nombre_plan: 'Plan Preventivo Tipo B - Generador (Mantenimiento Mayor)', frecuencia_dias: 180, frecuencia_uso: 500 },
        { id_tipo_servicio: 8, nombre_plan: 'Plan de Visita de Inspección y Diagnóstico Técnico', frecuencia_dias: 30, frecuencia_uso: 100 },
      ],
    },
    // BOMBAS HIDRÁULICAS (2: BOMBA, 5: BOM)
    {
      tipos: [2, 5],
      planes: [
        { id_tipo_servicio: 5, nombre_plan: 'Plan Preventivo Tipo A - Sistema de Bombeo Hidráulico', frecuencia_dias: 90, frecuencia_uso: 250 },
        { id_tipo_servicio: 19, nombre_plan: 'Plan Preventivo Tipo A - Motobomba Combustión / Red Contra Incendio', frecuencia_dias: 90, frecuencia_uso: 200 },
        { id_tipo_servicio: 8, nombre_plan: 'Plan de Visita de Inspección Hidráulica y Presiones', frecuencia_dias: 30, frecuencia_uso: 100 },
      ],
    },
    // MOTORES INDUSTRIALES (4: MOT, 6: MOTOR)
    {
      tipos: [4, 6],
      planes: [
        { id_tipo_servicio: 1, nombre_plan: 'Plan Preventivo Estándar Motor Industrial Tipo A', frecuencia_dias: 90, frecuencia_uso: 250 },
        { id_tipo_servicio: 8, nombre_plan: 'Plan de Inspección Termográfica y Aislamiento', frecuencia_dias: 60, frecuencia_uso: 150 },
      ],
    },
    // COMPRESORES INDUSTRIALES (20: COMP)
    {
      tipos: [20],
      planes: [
        { id_tipo_servicio: 17, nombre_plan: 'Plan Preventivo Tipo A - Compresor Industrial', frecuencia_dias: 90, frecuencia_uso: 250 },
        { id_tipo_servicio: 8, nombre_plan: 'Plan de Inspección de Red Neumática y Secador', frecuencia_dias: 30, frecuencia_uso: 100 },
      ],
    },
  ];

  // Limpiar planes huérfanos en los arquetipos canónicos antes de sembrar la matriz simétrica
  await prisma.tipo_equipo_planes.deleteMany({
    where: { id_tipo_equipo: { in: [1, 2, 3, 4, 5, 6, 20] } },
  });

  for (const grupo of planesCanonicos) {
    for (const idTipo of grupo.planes.length ? grupo.tipos : []) {
      const tipoExiste = await prisma.tipos_equipo.findUnique({ where: { id_tipo_equipo: idTipo } });
      if (!tipoExiste) continue;

      for (const p of grupo.planes) {
        const srvExiste = await prisma.tipos_servicio.findUnique({ where: { id_tipo_servicio: p.id_tipo_servicio } });
        if (!srvExiste) continue;

        await prisma.tipo_equipo_planes.upsert({
          where: {
            id_tipo_equipo_id_tipo_servicio: {
              id_tipo_equipo: idTipo,
              id_tipo_servicio: p.id_tipo_servicio,
            },
          },
          create: {
            id_tipo_equipo: idTipo,
            id_tipo_servicio: p.id_tipo_servicio,
            nombre_plan: p.nombre_plan,
            frecuencia_dias: p.frecuencia_dias,
            frecuencia_uso: p.frecuencia_uso,
            criterio_intervalo: 'LO_QUE_OCURRA_PRIMERO',
            es_plan_por_defecto: true,
            activo: true,
          },
          update: {
            nombre_plan: p.nombre_plan,
            frecuencia_dias: p.frecuencia_dias,
            frecuencia_uso: p.frecuencia_uso,
            criterio_intervalo: 'LO_QUE_OCURRA_PRIMERO',
            activo: true,
          },
        });
      }
    }
  }
  console.log('✅ Arquetipos vinculados simétricamente a sus módulos y planes preventivos reales.');

  // --------------------------------------------------------------------------
  // 6. MODELOS OEM MAESTROS Y KITS BOM (modelos_equipo & modelos_equipo_bom)
  // --------------------------------------------------------------------------
  console.log('\n[6/6] Sembrando 4 Modelos OEM Maestros Reales y sus Kits BOM...');

  const componentesReales = await prisma.catalogo_componentes.findMany({
    take: 10,
    select: { id_componente: true, descripcion_corta: true, referencia_fabricante: true },
  });

  const modelosOEM = [
    {
      id_tipo_equipo: 1, // GENERADOR
      codigo_modelo: 'MOD-STAMFORD-HCI634F',
      marca: 'STAMFORD',
      modelo: 'HCI-634F',
      nombre_comercial: 'Generador Síncrono Stamford HCI-634F 250 kVA',
      especificaciones_base: {
        _version: 1,
        modulos: {
          alternador_generador: {
            marca_generador: 'STAMFORD',
            modelo_generador: 'HCI-634F',
            potencia_kva: 250,
            potencia_kw: 200,
            voltaje_salida: '220/127',
            numero_fases: '3',
            frecuencia_hz: '60',
            factor_potencia: 0.8,
            tiene_avr: true,
            referencia_avr: 'MX341',
            clase_aislamiento: 'CLASE_H',
            grado_proteccion_ip: 'IP23',
          },
        },
      },
    },
    {
      id_tipo_equipo: 1, // GENERADOR
      codigo_modelo: 'MOD-DOOSAN-P126TI',
      marca: 'DOOSAN',
      modelo: 'P126TI-II / STAMFORD',
      nombre_comercial: 'Planta Eléctrica Doosan P126TI-II 250 kVA Standby',
      especificaciones_base: {
        _version: 1,
        modulos: {
          motor_combustion: {
            marca_motor: 'DOOSAN',
            modelo_motor: 'P126TI-II',
            tipo_combustible: 'DIESEL',
            potencia_hp: 345,
            potencia_kw_motor: 257,
            velocidad_rpm: 1800,
            numero_cilindros: 6,
            aspiracion: 'TURBOCARGADO_POSTENFRIADO',
            capacidad_aceite_litros: 23,
            tipo_aceite: '15W40 CI-4',
            capacidad_refrigerante_litros: 48,
            voltaje_arranque_vdc: 24,
            cantidad_baterias: 2,
          },
          alternador_generador: {
            marca_generador: 'STAMFORD',
            modelo_generador: 'UCI274K',
            potencia_kva: 250,
            potencia_kw: 200,
            voltaje_salida: '220/127',
            numero_fases: '3',
            frecuencia_hz: '60',
            factor_potencia: 0.8,
            tiene_modulo_control: true,
            marca_modulo_control: 'DEEP SEA',
            modelo_modulo_control: 'DSE 7320',
          },
        },
      },
    },
    {
      id_tipo_equipo: 2, // BOMBA
      codigo_modelo: 'MOD-GOULDS-3196-MTX',
      marca: 'GOULDS',
      modelo: '3196-MTX',
      nombre_comercial: 'Bomba Centrífuga ANSI Goulds 3196 MTX 3x4-10',
      especificaciones_base: {
        _version: 1,
        modulos: {
          bomba_hidraulica: {
            marca_bomba: 'GOULDS',
            modelo_bomba: '3196-MTX',
            tipo_bomba: 'CENTRIFUGA',
            aplicacion_bomba: 'PRESION_CONSTANTE',
            caudal_maximo_m3h: 85,
            altura_manometrica_maxima_m: 65,
            diametro_succion: '4 pulg',
            diametro_descarga: '3 pulg',
            potencia_hidraulica_kw: 15,
            eficiencia_porcentaje: 78,
          },
          motor_electrico: {
            marca_motor_electrico: 'WEG',
            modelo_motor_electrico: 'W22 IE3',
            potencia_hp_electrico: 20,
            potencia_kw_electrico: 15,
            voltaje_operacion_vac: '220/127',
            numero_fases_motor: '3',
            frecuencia_hz_motor: '60',
            velocidad_rpm: 3500,
            clase_aislamiento_motor: 'CLASE_F',
            grado_proteccion_ip_motor: 'IP55',
          },
        },
      },
    },
    {
      id_tipo_equipo: 2, // BOMBA
      codigo_modelo: 'MOD-PEDROLLO-PKM60',
      marca: 'PEDROLLO',
      modelo: 'PKm 60',
      nombre_comercial: 'Electrobomba Periférica Pedrollo PKm 60 0.5 HP',
      especificaciones_base: {
        _version: 1,
        modulos: {
          bomba_hidraulica: {
            marca_bomba: 'PEDROLLO',
            modelo_bomba: 'PKm 60',
            tipo_bomba: 'CENTRIFUGA',
            aplicacion_bomba: 'AGUA_POTABLE',
            caudal_maximo_m3h: 2.4,
            altura_manometrica_maxima_m: 40,
            diametro_succion: '1 pulg',
            diametro_descarga: '1 pulg',
          },
          motor_electrico: {
            marca_motor_electrico: 'PEDROLLO',
            modelo_motor_electrico: 'PKm 60 Integrado',
            potencia_hp_electrico: 0.5,
            potencia_kw_electrico: 0.37,
            voltaje_operacion_vac: '220/127',
            numero_fases_motor: '1',
            frecuencia_hz_motor: '60',
            velocidad_rpm: 3450,
          },
        },
      },
    },
  ];

  for (const m of modelosOEM) {
    const modLand = await prisma.modelos_equipo.upsert({
      where: { codigo_modelo: m.codigo_modelo },
      create: {
        id_tipo_equipo: m.id_tipo_equipo,
        codigo_modelo: m.codigo_modelo,
        marca: m.marca,
        modelo: m.modelo,
        nombre_comercial: m.nombre_comercial,
        especificaciones_base: m.especificaciones_base,
        activo: true,
      },
      update: {
        id_tipo_equipo: m.id_tipo_equipo,
        marca: m.marca,
        modelo: m.modelo,
        nombre_comercial: m.nombre_comercial,
        especificaciones_base: m.especificaciones_base,
        activo: true,
      },
    });

    // Asociar al menos un componente al BOM si hay en catálogo
    if (componentesReales.length > 0) {
      const comp = componentesReales[0];
      await prisma.modelos_equipo_bom.upsert({
        where: {
          id_modelo_equipo_id_componente: {
            id_modelo_equipo: modLand.id_modelo_equipo,
            id_componente: comp.id_componente,
          },
        },
        create: {
          id_modelo_equipo: modLand.id_modelo_equipo,
          id_componente: comp.id_componente,
          cantidad_sugerida: 1.0,
          rol_bom: 'FILTRO_ACEITE_TITULAR',
          notas: 'Filtro sugerido por fabricante',
        },
        update: {
          cantidad_sugerida: 1.0,
          rol_bom: 'FILTRO_ACEITE_TITULAR',
        },
      });
    }
  }
  console.log(`✅ ${modelosOEM.length} Modelos OEM Maestros con kits BOM sembrados exitosamente.`);

  console.log('\n================================================================');
  console.log('🏁 SEMBRADO CANÓNICO EXHAUSTIVO (1:1) COMPLETADO CON ÉXITO');
  console.log('================================================================');
}

main()
  .catch((e) => {
    console.error('❌ Error ejecutando sembrado canónico:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
