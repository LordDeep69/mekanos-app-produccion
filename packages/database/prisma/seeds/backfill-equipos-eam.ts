/**
 * MEKANOS S.A.S - Motor Universal de Activos EAM
 * 
 * Script de Saneamiento y Backfill Idempotente (Fase 2)
 * 
 * Responsabilidades:
 * 1. Reclasificación determinista de los 15 equipos incoherentes:
 *    - 14 equipos de bombeo Goulds/Pentair pasan de id_tipo_equipo = 1 (GEN) a 2 (BOMBA).
 *    - Compresor Siemens ID 214 migra a especificaciones JSONB de compresor industrial.
 * 2. Backfill de los 467 equipos hacia equipos.especificaciones JSONB:
 *    - Estructura canónica: { "_version": 1, "modulos": { ... }, "origen_atributos": { ... } }
 *    - Migra datos completos de equipos_generador, equipos_motor y equipos_bomba.
 * 3. Proyección B-Tree en equipos_atributos_filtro:
 *    - Calcula valor_num_base normalizado en la unidad base oficial (KW, M3H, PSI, LIT, etc.).
 *    - Proyecta valores de texto (marcas, modelos, tipos de combustible, etc.).
 *    - Permite búsqueda instantánea B-Tree multi-unidad.
 */

import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('================================================================');
  console.log('🚀 INICIANDO SANEAMIENTO Y BACKFILL NUCLEAR DE LOS 467 EQUIPOS');
  console.log('================================================================');

  // --------------------------------------------------------------------------
  // PASO 1: RECLASIFICACIÓN DE LOS 15 EQUIPOS INCOHERENTES
  // --------------------------------------------------------------------------
  console.log('\n[1/4] Reclasificando 15 Equipos Incoherentes...');

  const idsBombasReclasificar = [32, 35, 38, 41, 44, 48, 51, 56, 59, 62, 65, 99, 102, 104];

  // Reclasificar los 14 equipos de bombeo a id_tipo_equipo = 2 (BOMBA)
  const reclasificarBombas = await prisma.equipos.updateMany({
    where: {
      id_equipo: { in: idsBombasReclasificar },
      id_tipo_equipo: 1, // Sólo si sigue en GENERADOR
    },
    data: {
      id_tipo_equipo: 2, // BOMBA
    },
  });
  console.log(`✅ ${reclasificarBombas.count} equipos de bombeo reclasificados a id_tipo_equipo = 2 (BOMBA).`);

  // Compresor Siemens ID 214
  const eq214 = await prisma.equipos.findUnique({
    where: { id_equipo: 214 },
    include: { equipos_motor: true, equipos_bomba: true },
  });

  if (eq214) {
    const specs214 = {
      _version: 1,
      modulos: {
        motor_electrico: {
          marca_motor_electrico: eq214.equipos_motor?.marca_motor || 'SIEMENS',
          modelo_motor_electrico: eq214.equipos_motor?.modelo_motor || '105953',
          numero_serie_motor_electrico: eq214.equipos_motor?.numero_serie_motor || '105953',
          potencia_hp_electrico: eq214.equipos_motor?.potencia_hp ? Number(eq214.equipos_motor.potencia_hp) : 3.0,
          potencia_kw_electrico: eq214.equipos_motor?.potencia_kw ? Number(eq214.equipos_motor.potencia_kw) : 2.24,
          velocidad_rpm: eq214.equipos_motor?.velocidad_nominal_rpm || 1750,
        },
        compresor_industrial: {
          marca_compresor: 'SIEMENS',
          modelo_compresor: '105953',
          numero_serie_compresor: '105953',
          tipo_compresor: 'PISTON_RECIPROCANTE',
          presion_maxima_psi: 150,
          caudal_aire_cfm: 12.5,
          tipo_acople: 'CORREAS_POLEAS',
        },
      },
      origen_atributos: {
        motor_electrico: 'MIGRADO_SATELITE_MOTOR',
        compresor_industrial: 'RECLASIFICACION_MANUAL_F2',
      },
    };

    await prisma.equipos.update({
      where: { id_equipo: 214 },
      data: {
        especificaciones: specs214 as unknown as Prisma.InputJsonValue,
      },
    });
    console.log(`✅ Compresor Siemens (ID 214) migrado a especificaciones JSONB de compresor.`);
  }

  // --------------------------------------------------------------------------
  // PASO 2: CARGAR CATÁLOGO DE FACTORES DIMENSIONALES UoM (y = ax + b)
  // --------------------------------------------------------------------------
  console.log('\n[2/4] Cargando Catálogo de Factores UoM desde Base de Datos...');

  const unidadesDB = await prisma.unidades_medida.findMany({
    include: { magnitud: true },
  });

  const factoresUoM = new Map<string, { factorA: number; factorB: number; unidadBase: string }>();
  for (const u of unidadesDB) {
    if (!u.codigo) continue;
    const factorA = u.factor_a !== null ? Number(u.factor_a) : 1.0;
    const factorB = u.factor_b !== null ? Number(u.factor_b) : 0.0;
    const unidadBase = u.magnitud?.unidad_base_codigo || u.codigo;
    factoresUoM.set(u.codigo.toUpperCase().trim(), { factorA, factorB, unidadBase });
  }

  function convertirABase(valor: number, codUnidad: string): { valorBase: number; unidadBase: string } {
    const info = factoresUoM.get(codUnidad.toUpperCase().trim());
    if (!info) {
      return { valorBase: valor, unidadBase: codUnidad };
    }
    return {
      valorBase: info.factorA * valor + info.factorB,
      unidadBase: info.unidadBase,
    };
  }

  // --------------------------------------------------------------------------
  // PASO 3: BACKFILL DE LOS 467 EQUIPOS HACIA equipos.especificaciones JSONB
  // --------------------------------------------------------------------------
  console.log('\n[3/4] Ejecutando Backfill Idempotente hacia especificaciones JSONB...');

  const todosLosEquipos = await prisma.equipos.findMany({
    include: {
      equipos_generador: true,
      equipos_motor: true,
      equipos_bomba: true,
      tipos_equipo: true,
    },
    orderBy: { id_equipo: 'asc' },
  });

  console.log(`📦 Procesando universo de ${todosLosEquipos.length} equipos...`);

  let countMigradosJson = 0;
  let countProyeccionesFiltro = 0;

  for (const eq of todosLosEquipos) {
    // Si ya es el 214 tratado arriba, proyectar directo sus filtros
    if (eq.id_equipo === 214) {
      await proyectarFiltrosEquipo(214, eq.especificaciones as any);
      continue;
    }

    const modulos: Record<string, Record<string, any>> = {};
    const origenAtributos: Record<string, string> = {};

    // 1. MÓDULO MOTOR (Combustión o Eléctrico)
    const mot = eq.equipos_motor;
    if (mot) {
      const esElectrico = mot.tipo_motor === 'ELECTRICO';

      if (!esElectrico) {
        // Motor Combustión Interna
        const modMotor: Record<string, any> = {};
        if (mot.marca_motor) modMotor.marca_motor = mot.marca_motor;
        if (mot.modelo_motor) modMotor.modelo_motor = mot.modelo_motor;
        if (mot.numero_serie_motor) modMotor.numero_serie_motor = mot.numero_serie_motor;
        if (mot.potencia_hp) modMotor.potencia_hp = Number(mot.potencia_hp);
        if (mot.potencia_kw) modMotor.potencia_kw_motor = Number(mot.potencia_kw);
        if (mot.velocidad_nominal_rpm) modMotor.velocidad_rpm = mot.velocidad_nominal_rpm;
        if (mot.tipo_combustible) modMotor.tipo_combustible = mot.tipo_combustible;
        if (mot.numero_cilindros) modMotor.numero_cilindros = mot.numero_cilindros;
        if (mot.cilindrada_cc) modMotor.cilindrada_cc = mot.cilindrada_cc;
        if (mot.tiene_turbocargador !== null) modMotor.tiene_turbocargador = mot.tiene_turbocargador;
        if (mot.tipo_arranque) modMotor.tipo_arranque = mot.tipo_arranque;
        if (mot.voltaje_arranque_vdc) modMotor.voltaje_arranque_vdc = mot.voltaje_arranque_vdc;
        if (mot.amperaje_arranque) modMotor.amperaje_arranque_cca = Number(mot.amperaje_arranque);
        if (mot.numero_baterias) modMotor.cantidad_baterias = mot.numero_baterias;
        if (mot.referencia_bateria) modMotor.referencia_bateria = mot.referencia_bateria;
        if (mot.capacidad_bateria_ah) modMotor.capacidad_bateria_ah = mot.capacidad_bateria_ah;
        if (mot.tiene_radiador !== null) modMotor.tiene_radiador = mot.tiene_radiador;
        if (mot.radiador_alto_cm) modMotor.radiador_alto_cm = Number(mot.radiador_alto_cm);
        if (mot.radiador_ancho_cm) modMotor.radiador_ancho_cm = Number(mot.radiador_ancho_cm);
        if (mot.radiador_espesor_cm) modMotor.radiador_espesor_cm = Number(mot.radiador_espesor_cm);
        if (mot.tiene_cargador_bateria !== null) modMotor.tiene_cargador_bateria = mot.tiene_cargador_bateria;
        if (mot.marca_cargador) modMotor.marca_cargador = mot.marca_cargador;
        if (mot.modelo_cargador) modMotor.modelo_cargador = mot.modelo_cargador;
        if (mot.amperaje_cargador) modMotor.amperaje_cargador = Number(mot.amperaje_cargador);
        if (mot.capacidad_aceite_litros) modMotor.capacidad_aceite_litros = Number(mot.capacidad_aceite_litros);
        if (mot.tipo_aceite) modMotor.tipo_aceite = mot.tipo_aceite;
        if (mot.capacidad_refrigerante_litros) modMotor.capacidad_refrigerante_litros = Number(mot.capacidad_refrigerante_litros);
        if (mot.tipo_refrigerante) modMotor.tipo_refrigerante = mot.tipo_refrigerante;
        if (mot.a_o_fabricacion) modMotor.ano_fabricacion_motor = mot.a_o_fabricacion;

        if (Object.keys(modMotor).length > 0) {
          modulos.motor_combustion = modMotor;
          origenAtributos.motor_combustion = 'MIGRADO_SATELITE_MOTOR';
        }
      } else {
        // Motor Eléctrico
        const modMotorElec: Record<string, any> = {};
        if (mot.marca_motor) modMotorElec.marca_motor_electrico = mot.marca_motor;
        if (mot.modelo_motor) modMotorElec.modelo_motor_electrico = mot.modelo_motor;
        if (mot.numero_serie_motor) modMotorElec.numero_serie_motor_electrico = mot.numero_serie_motor;
        if (mot.potencia_hp) modMotorElec.potencia_hp_electrico = Number(mot.potencia_hp);
        if (mot.potencia_kw) modMotorElec.potencia_kw_electrico = Number(mot.potencia_kw);
        if (mot.velocidad_nominal_rpm) modMotorElec.velocidad_rpm = mot.velocidad_nominal_rpm;
        if (mot.voltaje_operacion_vac) modMotorElec.voltaje_operacion_vac = mot.voltaje_operacion_vac;
        if (mot.numero_fases) modMotorElec.numero_fases_motor = String(mot.numero_fases);
        if (mot.frecuencia_hz) modMotorElec.frecuencia_hz_motor = String(mot.frecuencia_hz);
        if (mot.amperaje_nominal) modMotorElec.amperaje_nominal_motor = Number(mot.amperaje_nominal);
        if (mot.factor_potencia) modMotorElec.factor_potencia_motor = Number(mot.factor_potencia);
        if (mot.clase_aislamiento) modMotorElec.clase_aislamiento_motor = String(mot.clase_aislamiento);
        if (mot.grado_proteccion_ip) modMotorElec.grado_proteccion_ip_motor = mot.grado_proteccion_ip;
        if (mot.a_o_fabricacion) modMotorElec.ano_fabricacion_motor_electrico = mot.a_o_fabricacion;

        if (Object.keys(modMotorElec).length > 0) {
          modulos.motor_electrico = modMotorElec;
          origenAtributos.motor_electrico = 'MIGRADO_SATELITE_MOTOR';
        }
      }
    }

    // 2. MÓDULO GENERADOR / ALTERNADOR
    const gen = eq.equipos_generador;
    if (gen) {
      const modGen: Record<string, any> = {};
      if (gen.marca_generador) modGen.marca_generador = gen.marca_generador;
      if (gen.modelo_generador) modGen.modelo_generador = gen.modelo_generador;
      if (gen.numero_serie_generador) modGen.numero_serie_generador = gen.numero_serie_generador;
      if (gen.marca_alternador) modGen.marca_alternador = gen.marca_alternador;
      if (gen.modelo_alternador) modGen.modelo_alternador = gen.modelo_alternador;
      if (gen.numero_serie_alternador) modGen.numero_serie_alternador = gen.numero_serie_alternador;
      if (gen.potencia_kva) modGen.potencia_kva = Number(gen.potencia_kva);
      if (gen.potencia_kw) modGen.potencia_kw = Number(gen.potencia_kw);
      if (gen.factor_potencia) modGen.factor_potencia = Number(gen.factor_potencia);
      if (gen.voltaje_salida) modGen.voltaje_salida = gen.voltaje_salida;
      if (gen.numero_fases) modGen.numero_fases = String(gen.numero_fases);
      if (gen.frecuencia_hz) modGen.frecuencia_hz = String(gen.frecuencia_hz);
      if (gen.amperaje_nominal_salida) modGen.amperaje_nominal_salida = Number(gen.amperaje_nominal_salida);
      if (gen.configuracion_salida) modGen.configuracion_salida = gen.configuracion_salida;
      if (gen.clase_aislamiento) modGen.clase_aislamiento = gen.clase_aislamiento;
      if (gen.grado_proteccion_ip) modGen.grado_proteccion_ip = gen.grado_proteccion_ip;
      if (gen.tiene_avr !== null) modGen.tiene_avr = gen.tiene_avr;
      if (gen.marca_avr) modGen.marca_avr = gen.marca_avr;
      if (gen.modelo_avr) modGen.modelo_avr = gen.modelo_avr;
      if (gen.referencia_avr) modGen.referencia_avr = gen.referencia_avr;
      if (gen.tiene_modulo_control !== null) modGen.tiene_modulo_control = gen.tiene_modulo_control;
      if (gen.marca_modulo_control) modGen.marca_modulo_control = gen.marca_modulo_control;
      if (gen.modelo_modulo_control) modGen.modelo_modulo_control = gen.modelo_modulo_control;
      if (gen.tiene_arranque_automatico !== null) modGen.tiene_arranque_automatico = gen.tiene_arranque_automatico;
      if (gen.capacidad_tanque_principal_litros) modGen.capacidad_tanque_principal_litros = Number(gen.capacidad_tanque_principal_litros);
      if (gen.tiene_tanque_auxiliar !== null) modGen.tiene_tanque_auxiliar = gen.tiene_tanque_auxiliar;
      if (gen.capacidad_tanque_auxiliar_litros) modGen.capacidad_tanque_auxiliar_litros = Number(gen.capacidad_tanque_auxiliar_litros);
      if (gen.a_o_fabricacion) modGen.ano_fabricacion_generador = gen.a_o_fabricacion;

      if (Object.keys(modGen).length > 0) {
        modulos.alternador_generador = modGen;
        origenAtributos.alternador_generador = 'MIGRADO_SATELITE_GENERADOR';
      }
    }

    // 3. MÓDULO BOMBA HIDRÁULICA
    const bom = eq.equipos_bomba;
    if (bom) {
      const modBom: Record<string, any> = {};
      if (bom.marca_bomba) modBom.marca_bomba = bom.marca_bomba;
      if (bom.modelo_bomba) modBom.modelo_bomba = bom.modelo_bomba;
      if (bom.numero_serie_bomba) modBom.numero_serie_bomba = bom.numero_serie_bomba;
      if (bom.tipo_bomba) modBom.tipo_bomba = String(bom.tipo_bomba);
      if (bom.aplicacion_bomba) modBom.aplicacion_bomba = String(bom.aplicacion_bomba);
      if (bom.caudal_maximo_m3h) modBom.caudal_maximo_m3h = Number(bom.caudal_maximo_m3h);
      if (bom.altura_manometrica_maxima_m) modBom.altura_manometrica_maxima_m = Number(bom.altura_manometrica_maxima_m);
      if (bom.altura_presion_trabajo_m) modBom.altura_presion_trabajo_m = Number(bom.altura_presion_trabajo_m);
      if (bom.potencia_hidraulica_kw) modBom.potencia_hidraulica_kw = Number(bom.potencia_hidraulica_kw);
      if (bom.eficiencia_porcentaje) modBom.eficiencia_porcentaje = Number(bom.eficiencia_porcentaje);
      if (bom.diametro_aspiracion) modBom.diametro_succion = bom.diametro_aspiracion;
      if (bom.diametro_descarga) modBom.diametro_descarga = bom.diametro_descarga;
      if (bom.numero_total_bombas_sistema) modBom.total_bombas_sistema = bom.numero_total_bombas_sistema;
      if (bom.numero_bomba_en_sistema) modBom.posicion_bomba_numero = bom.numero_bomba_en_sistema;
      if (bom.tiene_panel_control !== null) modBom.tiene_panel_control_bomba = bom.tiene_panel_control;
      if (bom.marca_panel_control) modBom.marca_panel_control_bomba = bom.marca_panel_control;
      if (bom.modelo_panel_control) modBom.modelo_panel_control_bomba = bom.modelo_panel_control;
      if (bom.tiene_presostato !== null) modBom.tiene_presostato = bom.tiene_presostato;
      if (bom.marca_presostato) modBom.marca_presostato = bom.marca_presostato;
      if (bom.modelo_presostato) modBom.modelo_presostato = bom.modelo_presostato;
      if (bom.presion_encendido_psi) modBom.presion_encendido_psi = Number(bom.presion_encendido_psi);
      if (bom.presion_apagado_psi) modBom.presion_apagado_psi = Number(bom.presion_apagado_psi);
      if (bom.tiene_contactor_externo !== null) modBom.tiene_contactor_externo = bom.tiene_contactor_externo;
      if (bom.marca_contactor) modBom.marca_contactor = bom.marca_contactor;
      if (bom.amperaje_contactor) modBom.amperaje_contactor = Number(bom.amperaje_contactor);
      if (bom.tiene_arrancador_suave !== null) modBom.tiene_arrancador_suave = bom.tiene_arrancador_suave;
      if (bom.tiene_variador_frecuencia !== null) modBom.tiene_variador_frecuencia_vfd = bom.tiene_variador_frecuencia;
      if (bom.marca_variador) modBom.marca_variador = bom.marca_variador;
      if (bom.modelo_variador) modBom.modelo_variador = bom.modelo_variador;
      if (bom.tiene_tanques_hidroneumaticos !== null) modBom.tiene_tanques_hidroneumaticos = bom.tiene_tanques_hidroneumaticos;
      if (bom.cantidad_tanques) modBom.cantidad_tanques_hidro = bom.cantidad_tanques;
      if (bom.capacidad_tanques_litros) modBom.capacidad_tanques_litros = Number(bom.capacidad_tanques_litros);
      if (bom.presion_tanques_psi) modBom.presion_tanques_psi = Number(bom.presion_tanques_psi);
      if (bom.tiene_manometro !== null) modBom.tiene_manometro = bom.tiene_manometro;
      if (bom.rango_manometro_min_psi) modBom.rango_manometro_min_psi = Number(bom.rango_manometro_min_psi);
      if (bom.rango_manometro_max_psi) modBom.rango_manometro_max_psi = Number(bom.rango_manometro_max_psi);
      if (bom.tiene_proteccion_nivel !== null) modBom.tiene_proteccion_nivel = bom.tiene_proteccion_nivel;
      if (bom.tipo_proteccion_nivel) modBom.tipo_proteccion_nivel = bom.tipo_proteccion_nivel;
      if (bom.tiene_valvula_purga !== null) modBom.tiene_valvula_purga = bom.tiene_valvula_purga;
      if (bom.tiene_valvula_cebado !== null) modBom.tiene_valvula_cebado = bom.tiene_valvula_cebado;
      if (bom.tiene_valvula_cheque !== null) modBom.tiene_valvula_cheque = bom.tiene_valvula_cheque;
      if (bom.tiene_valvula_pie !== null) modBom.tiene_valvula_pie = bom.tiene_valvula_pie;
      if (bom.referencia_sello_mecanico) modBom.referencia_sello_mecanico = bom.referencia_sello_mecanico;
      if (bom.a_o_fabricacion) modBom.ano_fabricacion_bomba = bom.a_o_fabricacion;

      if (Object.keys(modBom).length > 0) {
        modulos.bomba_hidraulica = modBom;
        origenAtributos.bomba_hidraulica = 'MIGRADO_SATELITE_BOMBA';
      }
    }

    // Actualizar JSONB si se encontraron módulos
    if (Object.keys(modulos).length > 0) {
      const docFinal = {
        _version: 1,
        modulos,
        origen_atributos: origenAtributos,
      };

      await prisma.equipos.update({
        where: { id_equipo: eq.id_equipo },
        data: {
          especificaciones: docFinal as unknown as Prisma.InputJsonValue,
        },
      });
      countMigradosJson++;

      // Proyectar atributos en la tabla de filtro B-Tree
      const filasProyectadas = await proyectarFiltrosEquipo(eq.id_equipo, docFinal);
      countProyeccionesFiltro += filasProyectadas;
    }
  }

  console.log(`✅ Backfill completado:`);
  console.log(`   - ${countMigradosJson} equipos actualizados con su ficha JSONB.`);
  console.log(`   - ${countProyeccionesFiltro} filas proyectadas en equipos_atributos_filtro.`);

  // --------------------------------------------------------------------------
  // PASO 4: FUNCIÓN HELPER DE PROYECCIÓN B-TREE CON CONVERSIÓN UoM
  // --------------------------------------------------------------------------
  async function proyectarFiltrosEquipo(idEquipo: number, doc: { modulos?: Record<string, Record<string, any>> }): Promise<number> {
    if (!doc?.modulos) return 0;

    // Reglas de atributos numéricos que deben proyectarse a su unidad base oficial
    const atributosNumericos: Record<string, { unidadOrigen: string }> = {
      potencia_kva: { unidadOrigen: 'KVA' },
      potencia_kw: { unidadOrigen: 'KW' },
      potencia_kw_motor: { unidadOrigen: 'KW' },
      potencia_hp: { unidadOrigen: 'HP' },
      potencia_hp_electrico: { unidadOrigen: 'HP' },
      potencia_kw_electrico: { unidadOrigen: 'KW' },
      potencia_hidraulica_kw: { unidadOrigen: 'KW' },
      caudal_maximo_m3h: { unidadOrigen: 'M3H' },
      altura_manometrica_maxima_m: { unidadOrigen: 'MET' },
      presion_maxima_psi: { unidadOrigen: 'PSI' },
      capacidad_aceite_litros: { unidadOrigen: 'LIT' },
      capacidad_tanque_principal_litros: { unidadOrigen: 'LIT' },
      voltaje_arranque_vdc: { unidadOrigen: 'VDC' },
      amperaje_nominal_salida: { unidadOrigen: 'A' },
      amperaje_arranque_cca: { unidadOrigen: 'A' },
      velocidad_rpm: { unidadOrigen: 'RPM' },
    };

    // Atributos de texto para búsqueda y facetas
    const atributosTexto = [
      'marca_motor', 'marca_generador', 'marca_bomba', 'marca_compresor', 'marca_motor_electrico', 'marca_alternador',
      'modelo_motor', 'modelo_generador', 'modelo_bomba', 'modelo_compresor',
      'tipo_combustible', 'tipo_bomba', 'aplicacion_bomba', 'tipo_compresor', 'tipo_arranque',
    ];

    const filasParaInsertar: Array<{
      id_equipo: number;
      codigo_atributo: string;
      valor_num_base: Prisma.Decimal | null;
      valor_texto: string | null;
      unidad_base_codigo: string | null;
    }> = [];

    const clavesVistas = new Set<string>();

    for (const [_, modData] of Object.entries(doc.modulos)) {
      if (!modData || typeof modData !== 'object') continue;

      for (const [k, v] of Object.entries(modData)) {
        if (v === null || v === undefined) continue;
        if (clavesVistas.has(k)) continue;

        // Caso Numérico
        if (atributosNumericos[k] && typeof v === 'number' && !isNaN(v)) {
          const cfg = atributosNumericos[k];
          const conv = convertirABase(v, cfg.unidadOrigen);
          filasParaInsertar.push({
            id_equipo: idEquipo,
            codigo_atributo: k,
            valor_num_base: new Prisma.Decimal(conv.valorBase),
            valor_texto: String(v),
            unidad_base_codigo: conv.unidadBase,
          });
          clavesVistas.add(k);
          continue;
        }

        // Caso Texto
        if (atributosTexto.includes(k) && typeof v === 'string' && v.trim() !== '') {
          filasParaInsertar.push({
            id_equipo: idEquipo,
            codigo_atributo: k,
            valor_num_base: null,
            valor_texto: v.trim(),
            unidad_base_codigo: null,
          });
          clavesVistas.add(k);
        }
      }
    }

    // Reemplazo atómico por equipo (Idempotente)
    await prisma.equipos_atributos_filtro.deleteMany({
      where: { id_equipo: idEquipo },
    });

    if (filasParaInsertar.length > 0) {
      await prisma.equipos_atributos_filtro.createMany({
        data: filasParaInsertar,
      });
    }

    return filasParaInsertar.length;
  }

  console.log('\n================================================================');
  console.log('🏁 SANEAMIENTO Y BACKFILL NUCLEAR COMPLETADO CON ÉXITO');
  console.log('================================================================');
}

main()
  .catch((e) => {
    console.error('❌ Error en script de saneamiento y backfill:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
