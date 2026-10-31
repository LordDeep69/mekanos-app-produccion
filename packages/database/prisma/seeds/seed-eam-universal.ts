import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('================================================================');
  console.log('🚀 INICIANDO SEMBRADO CANÓNICO DEL METAMODELO EAM UNIVERSAL');
  console.log('================================================================');

  // --------------------------------------------------------------------------
  // 1. MAGNITUDES FÍSICAS CANÓNICAS
  // --------------------------------------------------------------------------
  console.log('\n[1/5] Sembrando Magnitudes Físicas Canónicas...');

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
  console.log('\n[2/5] Sembrando Unidades de Medida y Factores de Conversión...');

  const unidades = [
    // ADIMENSIONAL
    { codigo: 'UND', nombre: 'Unidad', simbolo: 'und', tipo_magnitud: 'CANTIDAD', id_magnitud: mapMagnitudes.get('ADIMENSIONAL'), factor_a: 1.0, factor_b: 0.0, es_unidad_base: true, permite_decimales: false },
    // VOLUMEN
    { codigo: 'LIT', nombre: 'Litros', simbolo: 'L', tipo_magnitud: 'VOLUMEN', id_magnitud: mapMagnitudes.get('VOLUMEN'), factor_a: 1.0, factor_b: 0.0, es_unidad_base: true, permite_decimales: true },
    { codigo: 'GAL', nombre: 'Galones (US)', simbolo: 'Gal', tipo_magnitud: 'VOLUMEN', id_magnitud: mapMagnitudes.get('VOLUMEN'), factor_a: 3.785411784, factor_b: 0.0, es_unidad_base: false, permite_decimales: true },
    // POTENCIA
    { codigo: 'KW', nombre: 'Kilovatios', simbolo: 'kW', tipo_magnitud: 'POTENCIA', id_magnitud: mapMagnitudes.get('POTENCIA'), factor_a: 1.0, factor_b: 0.0, es_unidad_base: true, permite_decimales: true },
    { codigo: 'HP', nombre: 'Caballos de Fuerza', simbolo: 'HP', tipo_magnitud: 'POTENCIA', id_magnitud: mapMagnitudes.get('POTENCIA'), factor_a: 0.745699872, factor_b: 0.0, es_unidad_base: false, permite_decimales: true },
    { codigo: 'KVA', nombre: 'Kilovoltiamperios', simbolo: 'kVA', tipo_magnitud: 'POTENCIA', id_magnitud: mapMagnitudes.get('POTENCIA'), factor_a: 0.8, factor_b: 0.0, es_unidad_base: false, permite_decimales: true },
    { codigo: 'BTU_H', nombre: 'BTU por hora', simbolo: 'BTU/h', tipo_magnitud: 'POTENCIA', id_magnitud: mapMagnitudes.get('POTENCIA'), factor_a: 0.000293071, factor_b: 0.0, es_unidad_base: false, permite_decimales: true },
    { codigo: 'TR', nombre: 'Toneladas de Refrigeración', simbolo: 'TR', tipo_magnitud: 'POTENCIA', id_magnitud: mapMagnitudes.get('POTENCIA'), factor_a: 3.51685284, factor_b: 0.0, es_unidad_base: false, permite_decimales: true },
    // PRESION
    { codigo: 'PSI', nombre: 'Libras por Pulgada Cuadrada', simbolo: 'PSI', tipo_magnitud: 'PRESION', id_magnitud: mapMagnitudes.get('PRESION'), factor_a: 1.0, factor_b: 0.0, es_unidad_base: true, permite_decimales: true },
    { codigo: 'BAR', nombre: 'Bares', simbolo: 'bar', tipo_magnitud: 'PRESION', id_magnitud: mapMagnitudes.get('PRESION'), factor_a: 14.5037738, factor_b: 0.0, es_unidad_base: false, permite_decimales: true },
    { codigo: 'KPA', nombre: 'Kilopascales', simbolo: 'kPa', tipo_magnitud: 'PRESION', id_magnitud: mapMagnitudes.get('PRESION'), factor_a: 0.1450377, factor_b: 0.0, es_unidad_base: false, permite_decimales: true },
    // TEMPERATURA
    { codigo: 'C', nombre: 'Grados Celsius', simbolo: '°C', tipo_magnitud: 'TEMPERATURA', id_magnitud: mapMagnitudes.get('TEMPERATURA'), factor_a: 1.0, factor_b: 0.0, es_unidad_base: true, permite_decimales: true },
    { codigo: 'F', nombre: 'Grados Fahrenheit', simbolo: '°F', tipo_magnitud: 'TEMPERATURA', id_magnitud: mapMagnitudes.get('TEMPERATURA'), factor_a: 0.5555555556, factor_b: -17.7777777778, es_unidad_base: false, permite_decimales: true },
    // CAUDAL
    { codigo: 'M3H', nombre: 'Metros Cúbicos por Hora', simbolo: 'm³/h', tipo_magnitud: 'CAUDAL', id_magnitud: mapMagnitudes.get('CAUDAL'), factor_a: 1.0, factor_b: 0.0, es_unidad_base: true, permite_decimales: true },
    { codigo: 'GPM', nombre: 'Galones por Minuto', simbolo: 'GPM', tipo_magnitud: 'CAUDAL', id_magnitud: mapMagnitudes.get('CAUDAL'), factor_a: 0.2271247, factor_b: 0.0, es_unidad_base: false, permite_decimales: true },
    { codigo: 'LPS', nombre: 'Litros por Segundo', simbolo: 'L/s', tipo_magnitud: 'CAUDAL', id_magnitud: mapMagnitudes.get('CAUDAL'), factor_a: 3.6, factor_b: 0.0, es_unidad_base: false, permite_decimales: true },
    // FRECUENCIA Y VELOCIDAD
    { codigo: 'RPM', nombre: 'Revoluciones por Minuto', simbolo: 'RPM', tipo_magnitud: 'VELOCIDAD', id_magnitud: mapMagnitudes.get('FRECUENCIA_VELOCIDAD'), factor_a: 1.0, factor_b: 0.0, es_unidad_base: true, permite_decimales: false },
    { codigo: 'HZ', nombre: 'Hercio / Frecuencia', simbolo: 'Hz', tipo_magnitud: 'FRECUENCIA', id_magnitud: mapMagnitudes.get('FRECUENCIA_VELOCIDAD'), factor_a: 60.0, factor_b: 0.0, es_unidad_base: false, permite_decimales: true },
    { codigo: 'MMS', nombre: 'Milímetros por Segundo (Vibración)', simbolo: 'mm/s', tipo_magnitud: 'VELOCIDAD', id_magnitud: mapMagnitudes.get('FRECUENCIA_VELOCIDAD'), factor_a: 1.0, factor_b: 0.0, es_unidad_base: false, permite_decimales: true },
    // ELECTRICIDAD
    { codigo: 'V', nombre: 'Voltios', simbolo: 'V', tipo_magnitud: 'VOLTAJE', id_magnitud: mapMagnitudes.get('ELECTRICA_VOLTAJE'), factor_a: 1.0, factor_b: 0.0, es_unidad_base: true, permite_decimales: true },
    { codigo: 'VAC', nombre: 'Voltios Corriente Alterna', simbolo: 'VAC', tipo_magnitud: 'VOLTAJE', id_magnitud: mapMagnitudes.get('ELECTRICA_VOLTAJE'), factor_a: 1.0, factor_b: 0.0, es_unidad_base: false, permite_decimales: true },
    { codigo: 'VDC', nombre: 'Voltios Corriente Directa', simbolo: 'VDC', tipo_magnitud: 'VOLTAJE', id_magnitud: mapMagnitudes.get('ELECTRICA_VOLTAJE'), factor_a: 1.0, factor_b: 0.0, es_unidad_base: false, permite_decimales: true },
    { codigo: 'A', nombre: 'Amperios', simbolo: 'A', tipo_magnitud: 'CORRIENTE', id_magnitud: mapMagnitudes.get('ELECTRICA_CORRIENTE'), factor_a: 1.0, factor_b: 0.0, es_unidad_base: true, permite_decimales: true },
    { codigo: 'CCA', nombre: 'Cold Cranking Amps', simbolo: 'CCA', tipo_magnitud: 'CORRIENTE', id_magnitud: mapMagnitudes.get('ELECTRICA_CORRIENTE'), factor_a: 1.0, factor_b: 0.0, es_unidad_base: false, permite_decimales: false },
    { codigo: 'AH', nombre: 'Amperios-Hora', simbolo: 'Ah', tipo_magnitud: 'CAPACIDAD_ELECTRICA', id_magnitud: mapMagnitudes.get('ELECTRICA_CORRIENTE'), factor_a: 1.0, factor_b: 0.0, es_unidad_base: false, permite_decimales: true },
    // LONGITUD
    { codigo: 'MET', nombre: 'Metros', simbolo: 'm', tipo_magnitud: 'LONGITUD', id_magnitud: mapMagnitudes.get('LONGITUD'), factor_a: 1.0, factor_b: 0.0, es_unidad_base: true, permite_decimales: true },
    { codigo: 'PULG', nombre: 'Pulgadas', simbolo: '"', tipo_magnitud: 'LONGITUD', id_magnitud: mapMagnitudes.get('LONGITUD'), factor_a: 0.0254, factor_b: 0.0, es_unidad_base: false, permite_decimales: true },
    { codigo: 'KM', nombre: 'Kilómetros', simbolo: 'km', tipo_magnitud: 'LONGITUD', id_magnitud: mapMagnitudes.get('LONGITUD'), factor_a: 1000.0, factor_b: 0.0, es_unidad_base: false, permite_decimales: true },
    // TIEMPO
    { codigo: 'HORAS', nombre: 'Horas de Operación', simbolo: 'hrs', tipo_magnitud: 'TIEMPO', id_magnitud: mapMagnitudes.get('TIEMPO_USO'), factor_a: 1.0, factor_b: 0.0, es_unidad_base: true, permite_decimales: true },
    { codigo: 'CICLOS', nombre: 'Ciclos de Arranque', simbolo: 'ciclos', tipo_magnitud: 'CANTIDAD', id_magnitud: mapMagnitudes.get('TIEMPO_USO'), factor_a: 1.0, factor_b: 0.0, es_unidad_base: false, permite_decimales: false },
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
    'mm/s': 'MMS',
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
  // 3. DICCIONARIO ATÓMICO DE ATRIBUTOS TÉCNICOS
  // --------------------------------------------------------------------------
  console.log('\n[3/5] Sembrando Diccionario de Atributos Técnicos...');

  const atributos = [
    // Identificación Primaria
    { codigo: 'marca_principal', nombre: 'Marca Principal', control: 'TEXTO_CORTO', rol: 'MARCA_PRINCIPAL', mag: null, unidad: null },
    { codigo: 'modelo_principal', nombre: 'Modelo Principal', control: 'TEXTO_CORTO', rol: 'MODELO_PRINCIPAL', mag: null, unidad: null },
    { codigo: 'serie_principal', nombre: 'Número de Serie Principal', control: 'TEXTO_CORTO', rol: 'SERIE_PRINCIPAL', mag: null, unidad: null },

    // Potencias y Capacidades
    { codigo: 'potencia_kva', nombre: 'Potencia Aparente (kVA)', control: 'NUMERICO_MAGNITUD', rol: 'POTENCIA_CAPACIDAD_PRINCIPAL', mag: 'POTENCIA', unidad: 'KVA' },
    { codigo: 'potencia_kw', nombre: 'Potencia Activa (kW)', control: 'NUMERICO_MAGNITUD', rol: 'ESTANDAR', mag: 'POTENCIA', unidad: 'KW' },
    { codigo: 'potencia_hp', nombre: 'Potencia Mecánica (HP)', control: 'NUMERICO_MAGNITUD', rol: 'POTENCIA_CAPACIDAD_PRINCIPAL', mag: 'POTENCIA', unidad: 'HP' },
    { codigo: 'caudal_maximo_m3h', nombre: 'Caudal Máximo', control: 'NUMERICO_MAGNITUD', rol: 'POTENCIA_CAPACIDAD_PRINCIPAL', mag: 'CAUDAL', unidad: 'M3H' },
    { codigo: 'presion_maxima_psi', nombre: 'Presión Máxima', control: 'NUMERICO_MAGNITUD', rol: 'ESTANDAR', mag: 'PRESION', unidad: 'PSI' },
    { codigo: 'capacidad_tanque_gal', nombre: 'Capacidad de Tanque', control: 'NUMERICO_MAGNITUD', rol: 'ESTANDAR', mag: 'VOLUMEN', unidad: 'GAL' },

    // Eléctrico y Control
    { codigo: 'voltaje_operacion', nombre: 'Voltaje de Operación', control: 'SELECTOR', rol: 'ESTANDAR', mag: 'ELECTRICA_VOLTAJE', unidad: 'VAC', opciones: [{ valor: '220/127', etiqueta: '220/127 VAC' }, { valor: '440/254', etiqueta: '440/254 VAC' }, { valor: '208/120', etiqueta: '208/120 VAC' }, { valor: '480/277', etiqueta: '480/277 VAC' }] },
    { codigo: 'frecuencia_hz', nombre: 'Frecuencia Nominal', control: 'SELECTOR', rol: 'ESTANDAR', mag: 'FRECUENCIA_VELOCIDAD', unidad: 'HZ', opciones: [{ valor: '60', etiqueta: '60 Hz' }, { valor: '50', etiqueta: '50 Hz' }] },
    { codigo: 'velocidad_rpm', nombre: 'Velocidad de Giro', control: 'NUMERICO_MAGNITUD', rol: 'ESTANDAR', mag: 'FRECUENCIA_VELOCIDAD', unidad: 'RPM' },
    { codigo: 'numero_fases', nombre: 'Número de Fases', control: 'SELECTOR', rol: 'ESTANDAR', mag: null, unidad: null, opciones: [{ valor: '3', etiqueta: 'Trifásico (3F)' }, { valor: '1', etiqueta: 'Monofásico (1F)' }, { valor: '2', etiqueta: 'Bifásico (2F)' }] },
    { codigo: 'factor_potencia', nombre: 'Factor de Potencia (FP)', control: 'NUMERICO_PURO', rol: 'ESTANDAR', mag: null, unidad: null, validacion: { min: 0.1, max: 1.0, decimales: 2 } },
    { codigo: 'tipo_alternador', nombre: 'Tipo de Alternador', control: 'SELECTOR', rol: 'ESTANDAR', mag: null, unidad: null, opciones: [{ valor: 'SIN_ESCOBILLAS', etiqueta: 'Sin Escobillas (Brushless)' }, { valor: 'CON_ESCOBILLAS', etiqueta: 'Con Escobillas' }] },

    // Motor y Fluidos
    { codigo: 'capacidad_aceite_litros', nombre: 'Capacidad de Aceite en Cárter', control: 'NUMERICO_MAGNITUD', rol: 'CAPACIDAD_FLUIDO_LITROS', mag: 'VOLUMEN', unidad: 'LIT' },
    { codigo: 'tipo_aceite', nombre: 'Tipo y Grado de Aceite', control: 'SELECTOR', rol: 'TIPO_FLUIDO', mag: null, unidad: null, opciones: [{ valor: '15W40 CI-4', etiqueta: '15W40 CI-4 Diésel' }, { valor: '15W40 CK-4', etiqueta: '15W40 CK-4 Premium' }, { valor: 'ISO VG 46', etiqueta: 'ISO VG 46 Hidráulico' }, { valor: 'ISO VG 68', etiqueta: 'ISO VG 68 Compresor' }] },
    { codigo: 'capacidad_refrigerante_litros', nombre: 'Capacidad de Refrigerante', control: 'NUMERICO_MAGNITUD', rol: 'ESTANDAR', mag: 'VOLUMEN', unidad: 'LIT' },
    { codigo: 'tipo_refrigerante', nombre: 'Tipo de Refrigerante', control: 'SELECTOR', rol: 'ESTANDAR', mag: null, unidad: null, opciones: [{ valor: '50/50 PREMIX', etiqueta: 'Etilenglicol 50/50 Premix' }, { valor: 'OAT LONGLIFE', etiqueta: 'Orgánico Larga Vida (OAT)' }] },
    { codigo: 'numero_cilindros', nombre: 'Número de Cilindros', control: 'NUMERICO_PURO', rol: 'ESTANDAR', mag: null, unidad: null },
    { codigo: 'aspiracion', nombre: 'Tipo de Aspiración', control: 'SELECTOR', rol: 'ESTANDAR', mag: null, unidad: null, opciones: [{ valor: 'NATURAL', etiqueta: 'Naturalmente Aspirado' }, { valor: 'TURBOCARGADO', etiqueta: 'Turbocargado' }, { valor: 'TURBOCARGADO_POSTENFRIADO', etiqueta: 'Turbocargado Postenfriado (Aftercooler)' }] },
    { codigo: 'bateria_arranque', nombre: 'Configuración Batería Arranque', control: 'SELECTOR', rol: 'BATERIA_ARRANQUE', mag: null, unidad: null, opciones: [{ valor: '12V_1000CCA', etiqueta: '1x 12V 1000 CCA' }, { valor: '24V_1000CCA', etiqueta: '2x 12V (24V Serie) 1000 CCA' }, { valor: '12V_650CCA', etiqueta: '1x 12V 650 CCA' }] },

    // Hidráulica y Compresión
    { codigo: 'tipo_bomba', nombre: 'Tipo de Bomba Hidráulica', control: 'SELECTOR', rol: 'ESTANDAR', mag: null, unidad: null, opciones: [{ valor: 'CENTRIFUGA', etiqueta: 'Centrífuga Horizontal' }, { valor: 'SUMERGIBLE', etiqueta: 'Sumergible Pozo / Achique' }, { valor: 'TURBINA_VERTICAL', etiqueta: 'Turbina Vertical' }, { valor: 'MULTIETAPAS', etiqueta: 'Multietapas Alta Presión' }] },
    { codigo: 'diametro_succion_pulg', nombre: 'Diámetro de Succión', control: 'NUMERICO_MAGNITUD', rol: 'ESTANDAR', mag: 'LONGITUD', unidad: 'PULG' },
    { codigo: 'diametro_descarga_pulg', nombre: 'Diámetro de Descarga', control: 'NUMERICO_MAGNITUD', rol: 'ESTANDAR', mag: 'LONGITUD', unidad: 'PULG' },
    { codigo: 'tipo_compresor', nombre: 'Tecnología de Compresor', control: 'SELECTOR', rol: 'ESTANDAR', mag: null, unidad: null, opciones: [{ valor: 'TORNILLO_ROTATIVO', etiqueta: 'Tornillo Rotativo Lubricado' }, { valor: 'PISTON_RECIPROCANTE', etiqueta: 'Pistón Reciprocante' }, { valor: 'SCROLL', etiqueta: 'Scroll Libre de Aceite' }] },
  ];

  const mapAtributos = new Map<string, number>();

  for (const a of atributos) {
    const res = await prisma.atributos_tecnicos.upsert({
      where: { codigo_atributo: a.codigo },
      create: {
        codigo_atributo: a.codigo,
        nombre_atributo: a.nombre,
        tipo_control: a.control,
        id_magnitud: a.mag ? mapMagnitudes.get(a.mag) : null,
        unidad_defecto_codigo: a.unidad || null,
        rol_semantico: a.rol,
        opciones_json: a.opciones ? (a.opciones as any) : undefined,
        validacion_json: a.validacion ? (a.validacion as any) : undefined,
        es_sistema: true,
        activo: true,
      },
      update: {
        nombre_atributo: a.nombre,
        tipo_control: a.control,
        id_magnitud: a.mag ? mapMagnitudes.get(a.mag) : null,
        unidad_defecto_codigo: a.unidad || null,
        rol_semantico: a.rol,
        opciones_json: a.opciones ? (a.opciones as any) : undefined,
        validacion_json: a.validacion ? (a.validacion as any) : undefined,
        es_sistema: true,
        activo: true,
      },
    });
    mapAtributos.set(a.codigo, res.id_atributo);
  }
  console.log(`✅ ${atributos.length} atributos técnicos registrados en el diccionario.`);

  // --------------------------------------------------------------------------
  // 4. MÓDULOS TÉCNICOS REUTILIZABLES Y ENLACE DE ATRIBUTOS
  // --------------------------------------------------------------------------
  console.log('\n[4/5] Sembrando Módulos Técnicos y Composición de Atributos...');

  const modulos = [
    {
      codigo: 'motor_combustion',
      nombre: 'Motor de Combustión Interna (Diésel / Gas)',
      descripcion: 'Bloque motor, cilindros, sistema de inyección, lubricación y refrigeración',
      icono: 'Flame',
      color: '#ef4444',
      attrs: [
        { cod: 'marca_principal', ord: 1, obl: true, kpi: false, fil: true, pdf: true },
        { cod: 'modelo_principal', ord: 2, obl: false, kpi: false, fil: true, pdf: true },
        { cod: 'serie_principal', ord: 3, obl: true, kpi: false, fil: false, pdf: true },
        { cod: 'potencia_hp', ord: 4, obl: false, kpi: true, fil: true, pdf: true },
        { cod: 'velocidad_rpm', ord: 5, obl: false, kpi: true, fil: false, pdf: true },
        { cod: 'capacidad_aceite_litros', ord: 6, obl: false, kpi: false, fil: false, pdf: true },
        { cod: 'tipo_aceite', ord: 7, obl: false, kpi: false, fil: false, pdf: true },
        { cod: 'capacidad_refrigerante_litros', ord: 8, obl: false, kpi: false, fil: false, pdf: true },
        { cod: 'tipo_refrigerante', ord: 9, obl: false, kpi: false, fil: false, pdf: true },
        { cod: 'numero_cilindros', ord: 10, obl: false, kpi: false, fil: false, pdf: true },
        { cod: 'aspiracion', ord: 11, obl: false, kpi: false, fil: false, pdf: true },
        { cod: 'bateria_arranque', ord: 12, obl: false, kpi: false, fil: false, pdf: true },
      ],
    },
    {
      codigo: 'alternador_generador',
      nombre: 'Alternador / Generador Eléctrico',
      descripcion: 'Cabezal sincrónico generador, devanados, excitatriz y AVR',
      icono: 'Zap',
      color: '#10b981',
      attrs: [
        { cod: 'marca_principal', ord: 1, obl: true, kpi: false, fil: true, pdf: true },
        { cod: 'modelo_principal', ord: 2, obl: false, kpi: false, fil: true, pdf: true },
        { cod: 'serie_principal', ord: 3, obl: true, kpi: false, fil: false, pdf: true },
        { cod: 'potencia_kva', ord: 4, obl: true, kpi: true, fil: true, pdf: true },
        { cod: 'potencia_kw', ord: 5, obl: false, kpi: false, fil: true, pdf: true },
        { cod: 'voltaje_operacion', ord: 6, obl: true, kpi: false, fil: true, pdf: true },
        { cod: 'frecuencia_hz', ord: 7, obl: true, kpi: false, fil: false, pdf: true },
        { cod: 'numero_fases', ord: 8, obl: true, kpi: false, fil: false, pdf: true },
        { cod: 'factor_potencia', ord: 9, obl: false, kpi: false, fil: false, pdf: true },
        { cod: 'tipo_alternador', ord: 10, obl: false, kpi: false, fil: false, pdf: true },
      ],
    },
    {
      codigo: 'bomba_hidraulica',
      nombre: 'Bomba Hidráulica de Fluidos',
      descripcion: 'Cuerpo de bomba, voluta, impulsor y sellos mecánicos',
      icono: 'Droplets',
      color: '#06b6d4',
      attrs: [
        { cod: 'marca_principal', ord: 1, obl: true, kpi: false, fil: true, pdf: true },
        { cod: 'modelo_principal', ord: 2, obl: false, kpi: false, fil: true, pdf: true },
        { cod: 'serie_principal', ord: 3, obl: true, kpi: false, fil: false, pdf: true },
        { cod: 'caudal_maximo_m3h', ord: 4, obl: true, kpi: true, fil: true, pdf: true },
        { cod: 'presion_maxima_psi', ord: 5, obl: false, kpi: true, fil: true, pdf: true },
        { cod: 'tipo_bomba', ord: 6, obl: true, kpi: false, fil: true, pdf: true },
        { cod: 'diametro_succion_pulg', ord: 7, obl: false, kpi: false, fil: false, pdf: true },
        { cod: 'diametro_descarga_pulg', ord: 8, obl: false, kpi: false, fil: false, pdf: true },
      ],
    },
    {
      codigo: 'motor_electrico',
      nombre: 'Motor Eléctrico de Accionamiento',
      descripcion: 'Motor trifásico o monofásico de inducción/jaula de ardilla',
      icono: 'Activity',
      color: '#3b82f6',
      attrs: [
        { cod: 'marca_principal', ord: 1, obl: true, kpi: false, fil: true, pdf: true },
        { cod: 'modelo_principal', ord: 2, obl: false, kpi: false, fil: true, pdf: true },
        { cod: 'serie_principal', ord: 3, obl: true, kpi: false, fil: false, pdf: true },
        { cod: 'potencia_hp', ord: 4, obl: true, kpi: true, fil: true, pdf: true },
        { cod: 'potencia_kw', ord: 5, obl: false, kpi: false, fil: false, pdf: true },
        { cod: 'voltaje_operacion', ord: 6, obl: true, kpi: false, fil: true, pdf: true },
        { cod: 'velocidad_rpm', ord: 7, obl: false, kpi: true, fil: false, pdf: true },
        { cod: 'numero_fases', ord: 8, obl: false, kpi: false, fil: false, pdf: true },
      ],
    },
    {
      codigo: 'compresor_industrial',
      nombre: 'Compresor de Aire Industrial',
      descripcion: 'Unidad de compresión, pulmón de almacenamiento y presostato',
      icono: 'Wind',
      color: '#8b5cf6',
      attrs: [
        { cod: 'marca_principal', ord: 1, obl: true, kpi: false, fil: true, pdf: true },
        { cod: 'modelo_principal', ord: 2, obl: false, kpi: false, fil: true, pdf: true },
        { cod: 'serie_principal', ord: 3, obl: true, kpi: false, fil: false, pdf: true },
        { cod: 'presion_maxima_psi', ord: 4, obl: true, kpi: true, fil: true, pdf: true },
        { cod: 'capacidad_tanque_gal', ord: 5, obl: false, kpi: true, fil: true, pdf: true },
        { cod: 'tipo_compresor', ord: 6, obl: true, kpi: false, fil: true, pdf: true },
      ],
    },
  ];

  const mapModulos = new Map<string, number>();

  for (const mod of modulos) {
    const res = await prisma.modulos_tecnicos.upsert({
      where: { codigo_modulo: mod.codigo },
      create: {
        codigo_modulo: mod.codigo,
        nombre_modulo: mod.nombre,
        descripcion: mod.descripcion,
        icono: mod.icono,
        color_ui: mod.color,
        es_sistema: true,
        activo: true,
      },
      update: {
        nombre_modulo: mod.nombre,
        descripcion: mod.descripcion,
        icono: mod.icono,
        color_ui: mod.color,
        es_sistema: true,
        activo: true,
      },
    });
    mapModulos.set(mod.codigo, res.id_modulo);

    // Enlace de atributos
    for (const attr of mod.attrs) {
      const idAttr = mapAtributos.get(attr.cod);
      if (!idAttr) continue;

      await prisma.modulo_atributos.upsert({
        where: {
          id_modulo_id_atributo: {
            id_modulo: res.id_modulo,
            id_atributo: idAttr,
          },
        },
        create: {
          id_modulo: res.id_modulo,
          id_atributo: idAttr,
          orden_visual: attr.ord,
          obligatorio: attr.obl,
          es_kpi: attr.kpi,
          es_filtrable: attr.fil,
          visible_en_pdf: attr.pdf,
        },
        update: {
          orden_visual: attr.ord,
          obligatorio: attr.obl,
          es_kpi: attr.kpi,
          es_filtrable: attr.fil,
          visible_en_pdf: attr.pdf,
        },
      });
    }
  }
  console.log(`✅ ${modulos.length} módulos técnicos sembrados y configurados con sus atributos.`);

  // --------------------------------------------------------------------------
  // 5. CONFIGURACIÓN DE ARQUETIPOS Y COMPOSICIÓN DE ACTIVOS
  // --------------------------------------------------------------------------
  console.log('\n[5/5] Vinculando Módulos a Arquetipos en tipos_equipo...');

  const tiposEquipo = await prisma.tipos_equipo.findMany();
  for (const te of tiposEquipo) {
    const cod = te.codigo_tipo.toUpperCase().trim();
    const nom = te.nombre_tipo.toUpperCase().trim();

    let modulosParaTipo: string[] = [];
    let iconoUi = 'Box';
    let colorHex = '#6b7280';
    let prefijo = 'EQ-';

    if (cod === 'GEN' || cod === 'GENERADOR' || nom.includes('GENERADOR') || nom.includes('PLANTA')) {
      modulosParaTipo = ['motor_combustion', 'alternador_generador'];
      iconoUi = 'Zap';
      colorHex = '#10b981';
      prefijo = 'GEN-';
    } else if (cod === 'BOM' || cod === 'BOMBA' || nom.includes('BOMBA')) {
      modulosParaTipo = ['motor_electrico', 'bomba_hidraulica'];
      iconoUi = 'Droplets';
      colorHex = '#06b6d4';
      prefijo = 'BOM-';
    } else if (cod === 'COMP' || cod === 'COMPRESOR' || nom.includes('COMPRESOR')) {
      modulosParaTipo = ['motor_electrico', 'compresor_industrial'];
      iconoUi = 'Wind';
      colorHex = '#8b5cf6';
      prefijo = 'COMP-';
    } else if (cod === 'MOT' || cod === 'MOTOR' || nom.includes('MOTOR')) {
      modulosParaTipo = ['motor_combustion'];
      iconoUi = 'Flame';
      colorHex = '#ef4444';
      prefijo = 'MOT-';
    }

    await prisma.tipos_equipo.update({
      where: { id_tipo_equipo: te.id_tipo_equipo },
      data: {
        icono_ui: iconoUi,
        color_hex: colorHex,
        prefijo_codigo: prefijo,
        unidad_uso: 'HORAS',
        etiqueta_contador: 'Horómetro',
        usa_plantilla_universal: true,
        version_esquema: 1,
      },
    });

    let ord = 1;
    for (const modCod of modulosParaTipo) {
      const idMod = mapModulos.get(modCod);
      if (!idMod) continue;

      await prisma.tipo_equipo_modulos.upsert({
        where: {
          id_tipo_equipo_id_modulo: {
            id_tipo_equipo: te.id_tipo_equipo,
            id_modulo: idMod,
          },
        },
        create: {
          id_tipo_equipo: te.id_tipo_equipo,
          id_modulo: idMod,
          orden_visual: ord++,
          obligatorio: true,
        },
        update: {
          orden_visual: ord++,
          obligatorio: true,
        },
      });
    }
  }
  console.log(`✅ Arquetipos en tipos_equipo enriquecidos y vinculados a sus módulos.`);

  // --------------------------------------------------------------------------
  // 6. PLANES BASE EN tipo_equipo_planes
  // --------------------------------------------------------------------------
  console.log('\nConfigurando Planes de Mantenimiento Base en tipo_equipo_planes...');

  const servicios = await prisma.tipos_servicio.findMany({
    where: { activo: true },
  });

  const servPrevA = servicios.find(s => s.codigo_tipo.includes('PREV') || s.codigo_tipo.includes('A') || s.nombre_tipo.includes('Tipo A') || s.nombre_tipo.includes('Preventivo'));
  const servPrevB = servicios.find(s => s.codigo_tipo.includes('B') || s.nombre_tipo.includes('Tipo B'));

  for (const te of tiposEquipo) {
    if (servPrevA) {
      await prisma.tipo_equipo_planes.upsert({
        where: {
          id_tipo_equipo_id_tipo_servicio: {
            id_tipo_equipo: te.id_tipo_equipo,
            id_tipo_servicio: servPrevA.id_tipo_servicio,
          },
        },
        create: {
          id_tipo_equipo: te.id_tipo_equipo,
          id_tipo_servicio: servPrevA.id_tipo_servicio,
          nombre_plan: `Mantenimiento Preventivo Estándar (${te.nombre_tipo})`,
          frecuencia_dias: 180,
          frecuencia_uso: 250,
          criterio_intervalo: 'LO_QUE_OCURRA_PRIMERO',
          es_plan_por_defecto: true,
          activo: true,
        },
        update: {
          nombre_plan: `Mantenimiento Preventivo Estándar (${te.nombre_tipo})`,
          frecuencia_dias: 180,
          frecuencia_uso: 250,
          criterio_intervalo: 'LO_QUE_OCURRA_PRIMERO',
          es_plan_por_defecto: true,
          activo: true,
        },
      });
    }

    if (servPrevB) {
      await prisma.tipo_equipo_planes.upsert({
        where: {
          id_tipo_equipo_id_tipo_servicio: {
            id_tipo_equipo: te.id_tipo_equipo,
            id_tipo_servicio: servPrevB.id_tipo_servicio,
          },
        },
        create: {
          id_tipo_equipo: te.id_tipo_equipo,
          id_tipo_servicio: servPrevB.id_tipo_servicio,
          nombre_plan: `Mantenimiento Mayor Anual (${te.nombre_tipo})`,
          frecuencia_dias: 365,
          frecuencia_uso: 500,
          criterio_intervalo: 'LO_QUE_OCURRA_PRIMERO',
          es_plan_por_defecto: false,
          activo: true,
        },
        update: {
          nombre_plan: `Mantenimiento Mayor Anual (${te.nombre_tipo})`,
          frecuencia_dias: 365,
          frecuencia_uso: 500,
          criterio_intervalo: 'LO_QUE_OCURRA_PRIMERO',
          es_plan_por_defecto: false,
          activo: true,
        },
      });
    }
  }
  console.log(`✅ Planes de mantenimiento preventivo base configurados.`);

  console.log('\n================================================================');
  console.log('🎉 SEMBRADO DEL METAMODELO EAM COMPLETADO EXITOSAMENTE');
  console.log('================================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Error en sembrado:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
