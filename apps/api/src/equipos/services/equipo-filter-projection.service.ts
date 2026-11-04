/**
 * MEKANOS S.A.S - Motor Universal de Activos EAM
 *
 * Servicio de Proyección B-Tree de Atributos Técnicos (EquipoFilterProjectionService)
 *
 * Mantiene sincronizada la tabla normalizada 'equipos_atributos_filtro' con el documento
 * JSONB 'equipos.especificaciones' y los satélites legados, convirtiendo todas las magnitudes
 * a su unidad física base canónica para permitir búsquedas B-Tree de ultra-alta velocidad.
 */

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { UomConversionService } from './uom-conversion.service';

export interface AtributoNumericoConfig {
  unidadOrigen: string;
}

@Injectable()
export class EquipoFilterProjectionService {
  // Mapeo exhaustivo de atributos numéricos con sus unidades de origen por defecto
  private readonly atributosNumericos: Record<string, AtributoNumericoConfig> = {
    potencia_kva: { unidadOrigen: 'KVA' },
    potencia_kw: { unidadOrigen: 'KW' },
    potencia_kw_motor: { unidadOrigen: 'KW' },
    potencia_hp: { unidadOrigen: 'HP' },
    potencia_motor_hp: { unidadOrigen: 'HP' },
    potencia_hp_electrico: { unidadOrigen: 'HP' },
    potencia_kw_electrico: { unidadOrigen: 'KW' },
    potencia_hidraulica_kw: { unidadOrigen: 'KW' },
    caudal_maximo_m3h: { unidadOrigen: 'M3H' },
    caudal_aire_cfm: { unidadOrigen: 'CFM' },
    altura_manometrica_maxima_m: { unidadOrigen: 'MET' },
    altura_presion_trabajo_m: { unidadOrigen: 'MET' },
    presion_maxima_psi: { unidadOrigen: 'PSI' },
    presion_trabajo_psi: { unidadOrigen: 'PSI' },
    presion_encendido_psi: { unidadOrigen: 'PSI' },
    presion_apagado_psi: { unidadOrigen: 'PSI' },
    presion_tanques_psi: { unidadOrigen: 'PSI' },
    rango_manometro_min_psi: { unidadOrigen: 'PSI' },
    rango_manometro_max_psi: { unidadOrigen: 'PSI' },
    capacidad_aceite_litros: { unidadOrigen: 'LIT' },
    capacidad_refrigerante_litros: { unidadOrigen: 'LIT' },
    capacidad_tanque_principal_litros: { unidadOrigen: 'LIT' },
    capacidad_tanque_auxiliar_litros: { unidadOrigen: 'LIT' },
    capacidad_tanques_litros: { unidadOrigen: 'LIT' },
    capacidad_tanque_galones: { unidadOrigen: 'GAL' },
    voltaje_arranque_vdc: { unidadOrigen: 'VDC' },
    amperaje_nominal_salida: { unidadOrigen: 'A' },
    amperaje_nominal_motor: { unidadOrigen: 'A' },
    amperaje_arranque_cca: { unidadOrigen: 'A' },
    amperaje_cargador: { unidadOrigen: 'A' },
    amperaje_contactor: { unidadOrigen: 'A' },
    velocidad_rpm: { unidadOrigen: 'RPM' },
    numero_cilindros: { unidadOrigen: 'UND' },
    cantidad_baterias: { unidadOrigen: 'UND' },
    capacidad_bateria_ah: { unidadOrigen: 'AH' },
    cilindrada_cc: { unidadOrigen: 'CC' },
    eficiencia_porcentaje: { unidadOrigen: 'PCT' },
    capacidad_de_enfriamiento: { unidadOrigen: 'TR' },
    capacidad_enfriamiento: { unidadOrigen: 'TR' },
  };

  // Atributos de texto indexados para búsqueda rápida y facetas
  private readonly atributosTexto: string[] = [
    'marca_motor',
    'marca_generador',
    'marca_bomba',
    'marca_compresor',
    'marca_motor_electrico',
    'marca_alternador',
    'marca_avr',
    'marca_modulo_control',
    'marca_panel_control_bomba',
    'marca_presostato',
    'marca_variador',
    'marca_contactor',
    'marca_cargador',
    'modelo_motor',
    'modelo_generador',
    'modelo_bomba',
    'modelo_compresor',
    'modelo_motor_electrico',
    'modelo_alternador',
    'modelo_avr',
    'modelo_modulo_control',
    'tipo_combustible',
    'tipo_bomba',
    'aplicacion_bomba',
    'tipo_compresor',
    'tipo_arranque',
    'voltaje_salida',
    'voltaje_operacion_vac',
    'numero_fases',
    'numero_fases_motor',
    'frecuencia_hz',
    'frecuencia_hz_motor',
    'tipo_aceite',
    'tipo_refrigerante',
    'gas_refrigerante',
    'referencia_bateria',
    'referencia_sello_mecanico',
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly uomService: UomConversionService,
  ) {}

  /**
   * Retorna la unidad por defecto asociada a un atributo numérico canónico
   */
  getUnidadOrigenDefecto(codigoAtributo: string): string | undefined {
    return this.atributosNumericos[codigoAtributo]?.unidadOrigen;
  }

  /**
   * Extrae atributos de un documento JSONB y proyecta filas en equipos_atributos_filtro
   */
  async proyectarFiltros(
    idEquipo: number,
    doc: {
      modulos?: Record<string, Record<string, any>>;
      unidades_personalizadas?: Record<string, string>;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const client = tx || this.prisma;

    if (!doc?.modulos || typeof doc.modulos !== 'object') {
      await client.equipos_atributos_filtro.deleteMany({
        where: { id_equipo: idEquipo },
      });
      return 0;
    }

    const filasParaInsertar: Array<{
      id_equipo: number;
      codigo_atributo: string;
      valor_num_base: Prisma.Decimal | null;
      valor_texto: string | null;
      unidad_base_codigo: string | null;
    }> = [];

    const clavesVistas = new Set<string>();
    const unidadesCustom = doc.unidades_personalizadas || {};

    // Consultar catálogo dinámico de atributos en BD para conocer unidades por defecto y tipo_control
    const codigosAconsultar = Object.values(doc.modulos).flatMap((m) => Object.keys(m || {}));
    const attrsDb = codigosAconsultar.length > 0 ? await client.atributos_tecnicos.findMany({
      where: { codigo_atributo: { in: codigosAconsultar } },
      select: {
        codigo_atributo: true,
        tipo_control: true,
        unidad_defecto_codigo: true,
      },
    }) : [];
    const mapaAttrsDb = new Map(attrsDb.map((a) => [a.codigo_atributo, a]));

    for (const [_, modData] of Object.entries(doc.modulos)) {
      if (!modData || typeof modData !== 'object') continue;

      for (const [k, v] of Object.entries(modData)) {
        if (v === null || v === undefined || v === '') continue;
        if (clavesVistas.has(k)) continue;

        // Caso 1: Booleano (Sí / No)
        if (typeof v === 'boolean') {
          filasParaInsertar.push({
            id_equipo: idEquipo,
            codigo_atributo: k,
            valor_num_base: new Prisma.Decimal(v ? 1 : 0),
            valor_texto: v ? 'true' : 'false',
            unidad_base_codigo: 'BOOL',
          });
          clavesVistas.add(k);
          continue;
        }

        // Caso 2: Numérico conocido, valor numérico puro o atributo dinámico NUMERICO
        const cfg = this.atributosNumericos[k];
        const attrDb = mapaAttrsDb.get(k);
        const esNumericoDb = attrDb?.tipo_control === 'NUMERICO_MAGNITUD' || attrDb?.tipo_control === 'NUMERO';
        const numVal =
          typeof v === 'number'
            ? v
            : ((cfg || esNumericoDb) && typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v))
                ? Number(v)
                : typeof v === 'string' && !isNaN(Number(v)) && v.trim() !== '' && !isNaN(parseFloat(v))
                ? Number(v)
                : NaN);

        if (!isNaN(numVal) && (typeof v === 'number' || cfg || esNumericoDb)) {
          const unidadOrigen = (
            unidadesCustom[k] ||
            attrDb?.unidad_defecto_codigo ||
            cfg?.unidadOrigen ||
            'UND'
          ).toUpperCase().trim();
          let valorBase = numVal;
          let unidadBase = unidadOrigen;

          try {
            const resConv = this.uomService.convertirABase(numVal, unidadOrigen);
            valorBase = resConv.valorBase;
            unidadBase = resConv.unidadBaseCodigo;
          } catch {
            // Si la unidad es adimensional o no está en tabla afín, se almacena tal cual
            valorBase = numVal;
          }

          filasParaInsertar.push({
            id_equipo: idEquipo,
            codigo_atributo: k,
            valor_num_base: new Prisma.Decimal(valorBase),
            valor_texto: String(numVal),
            unidad_base_codigo: unidadBase,
          });
          clavesVistas.add(k);
          continue;
        }

        // Caso 3: Texto indexable (explícito o cualquier campo corto de texto/selector en el módulo)
        if (typeof v === 'string' && v.trim() !== '') {
          const limpio = v.trim();
          if (this.atributosTexto.includes(k) || limpio.length <= 150) {
            filasParaInsertar.push({
              id_equipo: idEquipo,
              codigo_atributo: k,
              valor_num_base: null,
              valor_texto: limpio,
              unidad_base_codigo: null,
            });
            clavesVistas.add(k);
          }
        }
      }
    }

    // Reemplazo atómico e idempotente
    await client.equipos_atributos_filtro.deleteMany({
      where: { id_equipo: idEquipo },
    });

    if (filasParaInsertar.length > 0) {
      await client.equipos_atributos_filtro.createMany({
        data: filasParaInsertar,
      });
    }

    return filasParaInsertar.length;
  }

  /**
   * Reconstruye el documento JSONB de especificaciones desde satélites o DB
   * y proyecta inmediatamente sus filtros normalizados.
   */
  async reconstruirJsonYProyectar(
    idEquipo: number,
    tx?: Prisma.TransactionClient,
    specsPersonalizadas?: Record<string, any>,
  ): Promise<{ json: any; proyectados: number }> {
    const client = tx || this.prisma;

    const eq = await client.equipos.findUnique({
      where: { id_equipo: idEquipo },
      include: {
        equipos_generador: true,
        equipos_motor: true,
        equipos_bomba: true,
      },
    });

    if (!eq) {
      return { json: null, proyectados: 0 };
    }

    // Si ya tiene un JSONB personalizado enriquecido, priorizarlo y mergear
    const jsonBase = (eq.especificaciones as any) || {
      _version: 1,
      modulos: {},
      origen_atributos: {},
    };
    const modulos: Record<string, Record<string, any>> = {
      ...(jsonBase.modulos || {}),
    };
    const origenAtributos: Record<string, any> = {
      ...(jsonBase.origen_atributos || {}),
    };
    const unidadesPersonalizadas: Record<string, string> = {
      ...(jsonBase.unidades_personalizadas || {}),
      ...(specsPersonalizadas?.unidades_personalizadas || {}),
    };

    // 1. Motor desde satélite
    const mot = eq.equipos_motor;
    if (mot) {
      const esElectrico = mot.tipo_motor === 'ELECTRICO';
      if (!esElectrico) {
        const modMotor: Record<string, any> = { ...(modulos.motor_combustion || {}) };
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

        modulos.motor_combustion = modMotor;
        if (!origenAtributos.motor_combustion) {
          origenAtributos.motor_combustion = 'MIGRADO_SATELITE_MOTOR';
        }
      } else {
        const modMotorElec: Record<string, any> = { ...(modulos.motor_electrico || {}) };
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

        modulos.motor_electrico = modMotorElec;
        if (!origenAtributos.motor_electrico) {
          origenAtributos.motor_electrico = 'MIGRADO_SATELITE_MOTOR';
        }
      }
    }

    // 2. Generador / Alternador desde satélite
    const gen = eq.equipos_generador;
    if (gen) {
      const modGen: Record<string, any> = { ...(modulos.alternador_generador || {}) };
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

      modulos.alternador_generador = modGen;
      if (!origenAtributos.alternador_generador) {
        origenAtributos.alternador_generador = 'MIGRADO_SATELITE_GENERADOR';
      }
    }

    // 3. Bomba Hidráulica desde satélite
    const bom = eq.equipos_bomba;
    if (bom) {
      const modBom: Record<string, any> = { ...(modulos.bomba_hidraulica || {}) };
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

      modulos.bomba_hidraulica = modBom;
      if (!origenAtributos.bomba_hidraulica) {
        origenAtributos.bomba_hidraulica = 'MIGRADO_SATELITE_BOMBA';
      }
    }

    // 4. Si se enviaron especificaciones personalizadas desde el Wizard o Ficha 360°, tienen prioridad sobre los satélites
    if (specsPersonalizadas?.modulos && typeof specsPersonalizadas.modulos === 'object') {
      for (const [modKey, modValues] of Object.entries(specsPersonalizadas.modulos)) {
        if (modValues && typeof modValues === 'object') {
          modulos[modKey] = {
            ...(modulos[modKey] || {}),
            ...(modValues as Record<string, any>),
          };
        }
      }
    }
    if (specsPersonalizadas?.origen_atributos && typeof specsPersonalizadas.origen_atributos === 'object') {
      Object.assign(origenAtributos, specsPersonalizadas.origen_atributos);
    }

    const docFinal: Record<string, any> = {
      _version: 1,
      modulos,
      origen_atributos: origenAtributos,
    };
    if (Object.keys(unidadesPersonalizadas).length > 0) {
      docFinal.unidades_personalizadas = unidadesPersonalizadas;
    }

    // Actualizar JSONB en DB
    await client.equipos.update({
      where: { id_equipo: idEquipo },
      data: {
        especificaciones: docFinal as unknown as Prisma.InputJsonValue,
      },
    });

    // Proyectar atributos en tabla B-Tree
    const proyectados = await this.proyectarFiltros(idEquipo, docFinal, client);

    return { json: docFinal, proyectados };
  }
}
