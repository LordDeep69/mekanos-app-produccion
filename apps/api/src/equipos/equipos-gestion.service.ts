/**
 * SERVICIO DE GESTIÓN DE EQUIPOS POLIMÓRFICO Y MODULAR EAM - MEKANOS S.A.S
 *
 * Maneja la creación, consulta, filtrado B-Tree y actualización unificada de equipos:
 * 1. Tabla padre (equipos) con documento modular JSONB (especificaciones) y Modelo OEM
 * 2. Tablas satélite en Dual-Write (equipos_generador, equipos_bomba, equipos_motor)
 * 3. Proyección automática de filtros B-Tree con conversión UoM SI (equipos_atributos_filtro)
 * 4. Herencia opcional de Kits BOM desde Modelos de Fábrica (modelos_equipo_bom -> componentes_equipo)
 */

import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import {
  Prisma,
  aplicacion_bomba_enum,
  clase_aislamiento_enum,
  criticidad_enum,
  estado_equipo_enum,
  numero_fases_enum,
  tipo_arranque_enum,
  tipo_bomba_enum,
  tipo_combustible_enum,
  tipo_motor_enum,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { ClientesService } from '../clientes/clientes.service';
import {
  CambiarEstadoEquipoDto,
  RegistrarLecturaHorometroDto,
} from './dto/cambiar-estado-equipo.dto';
import { UpdateDatosEspecificosDto } from './dto/update-datos-especificos.dto';
import {
  CreateEquipoCompletoDto,
  CreateEquipoCompletoResponse,
  TipoEquipoDiscriminator,
  TipoMotorEnum,
} from './dto/create-equipo-completo.dto';
import {
  FACETAS_MARCA_REGISTRO,
  FACETAS_VALOR_TRABAJO_REGISTRO,
  resolverBloquesActivos,
} from './domain/equipment-facets.config';
import { EquipoFilterProjectionService } from './services/equipo-filter-projection.service';
import { UomConversionService } from './services/uom-conversion.service';


/**
 * Normalizadores defensivos de ENUMs de PostgreSQL para tablas satélite legacy
 */
function parseClaseAislamientoSegura(val: unknown): clase_aislamiento_enum {
  if (!val) return clase_aislamiento_enum.F;
  const str = String(val).toUpperCase().trim();
  if (str === 'H' || str.includes('CLASE_H') || str.includes('CLASE H')) return clase_aislamiento_enum.H;
  if (str === 'F' || str.includes('CLASE_F') || str.includes('CLASE F')) return clase_aislamiento_enum.F;
  if (str === 'B' || str.includes('CLASE_B') || str.includes('CLASE B')) return clase_aislamiento_enum.B;
  if (str === 'A' || str.includes('CLASE_A') || str.includes('CLASE A')) return clase_aislamiento_enum.A;
  if (Object.values(clase_aislamiento_enum).includes(str as any)) {
    return str as clase_aislamiento_enum;
  }
  return clase_aislamiento_enum.F;
}

function parseNumeroFasesSeguro(val: unknown): numero_fases_enum {
  if (!val) return numero_fases_enum.TRIFASICO;
  const str = String(val).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  if (str === '1' || str.includes('MONO') || str.includes('1F')) return numero_fases_enum.MONOFASICO;
  return numero_fases_enum.TRIFASICO;
}

function parseTipoCombustibleSeguro(val: unknown): tipo_combustible_enum {
  if (!val) return tipo_combustible_enum.DIESEL;
  const str = String(val).toUpperCase().trim();
  if (Object.values(tipo_combustible_enum).includes(str as any)) {
    return str as tipo_combustible_enum;
  }
  if (str.includes('GASOLINA')) return tipo_combustible_enum.GASOLINA;
  if (str.includes('NATURAL')) return tipo_combustible_enum.GAS_NATURAL;
  if (str.includes('GLP')) return tipo_combustible_enum.GLP;
  if (str.includes('DUAL')) return tipo_combustible_enum.DUAL;
  if (str.includes('BIODIESEL')) return tipo_combustible_enum.BIODIESEL;
  return tipo_combustible_enum.DIESEL;
}

function parseTipoArranqueSeguro(val: unknown): tipo_arranque_enum {
  if (!val) return tipo_arranque_enum.ELECTRICO;
  const str = String(val).toUpperCase().trim();
  if (Object.values(tipo_arranque_enum).includes(str as any)) {
    return str as tipo_arranque_enum;
  }
  if (str.includes('MANUAL')) return tipo_arranque_enum.MANUAL;
  if (str.includes('NEUMAT') || str.includes('AIRE')) return tipo_arranque_enum.NEUMATICO;
  if (str.includes('HIDRAUL')) return tipo_arranque_enum.HIDRAULICO;
  if (str.includes('AUTO')) return tipo_arranque_enum.AUTOMATICO;
  return tipo_arranque_enum.ELECTRICO;
}

function parseAplicacionBombaSegura(val: unknown): aplicacion_bomba_enum {
  if (!val) return aplicacion_bomba_enum.AGUA_POTABLE;
  const str = String(val).toUpperCase().trim();
  if (Object.values(aplicacion_bomba_enum).includes(str as any)) {
    return str as aplicacion_bomba_enum;
  }
  if (str.includes('INCENDIO')) return aplicacion_bomba_enum.CONTRAINCENDIOS;
  if (str.includes('RESIDUAL') || str.includes('ACHIQUE')) return aplicacion_bomba_enum.AGUAS_RESIDUALES;
  if (str.includes('LLUVIA')) return aplicacion_bomba_enum.AGUAS_LLUVIAS;
  if (str.includes('RIEGO')) return aplicacion_bomba_enum.RIEGO;
  if (str.includes('PISCINA')) return aplicacion_bomba_enum.PISCINA;
  if (str.includes('INDUSTR')) return aplicacion_bomba_enum.INDUSTRIAL;
  return aplicacion_bomba_enum.AGUA_POTABLE;
}

@Injectable()
export class EquiposGestionService {
  private readonly fallbackUomService = new UomConversionService();

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly clientesService?: ClientesService,
    @Optional() private readonly projectionService?: EquipoFilterProjectionService,
    @Optional() private readonly uomService?: UomConversionService,
  ) {}

  private get uom(): UomConversionService {
    return this.uomService || this.fallbackUomService;
  }

  /**
   * Extrae datos para las tablas satélite (equipos_motor, equipos_generador, equipos_bomba)
   * a partir del documento modular JSONB `especificaciones.modulos` cuando el usuario
   * registra o edita desde el Wizard Dinámico EAM.
   */
  private extraerSatelitesDesdeEspecificaciones(
    especificaciones?: Record<string, any>,
    datosMotorExplicito?: any,
    datosGeneradorExplicito?: any,
    datosBombaExplicito?: any,
  ): {
    datosMotor?: any;
    datosGenerador?: any;
    datosBomba?: any;
  } {
    const modulos = especificaciones?.modulos || {};
    const mComb = modulos.motor_combustion;
    const mElec = modulos.motor_electrico;
    const mGen = modulos.alternador_generador;
    const mBom = modulos.bomba_hidraulica;

    let datosMotor = datosMotorExplicito ? { ...datosMotorExplicito } : undefined;
    if (!datosMotor && (mComb || mElec)) {
      if (mComb && Object.keys(mComb).length > 0) {
        datosMotor = {
          tipo_motor: TipoMotorEnum.COMBUSTION,
          marca_motor: mComb.marca_motor || 'GENERICO',
          modelo_motor: mComb.modelo_motor,
          numero_serie_motor: mComb.numero_serie_motor,
          potencia_hp:
            (mComb.potencia_hp ?? mComb.potencia_motor_hp) !== undefined
              ? Number(mComb.potencia_hp ?? mComb.potencia_motor_hp)
              : undefined,
          potencia_kw:
            mComb.potencia_kw_motor !== undefined
              ? Number(mComb.potencia_kw_motor)
              : mComb.potencia_kw !== undefined
                ? Number(mComb.potencia_kw)
                : undefined,
          velocidad_nominal_rpm:
            mComb.velocidad_rpm !== undefined ? Number(mComb.velocidad_rpm) : undefined,
          tipo_combustible: mComb.tipo_combustible || 'DIESEL',
          numero_cilindros:
            mComb.numero_cilindros !== undefined ? Number(mComb.numero_cilindros) : undefined,
          cilindrada_cc:
            mComb.cilindrada_cc !== undefined ? Number(mComb.cilindrada_cc) : undefined,
          tiene_turbocargador:
            typeof mComb.tiene_turbocargador === 'boolean' ? mComb.tiene_turbocargador : undefined,
          tipo_arranque: mComb.tipo_arranque || 'ELECTRICO',
          voltaje_arranque_vdc:
            mComb.voltaje_arranque_vdc !== undefined
              ? Number(mComb.voltaje_arranque_vdc)
              : undefined,
          amperaje_arranque:
            mComb.amperaje_arranque_cca !== undefined
              ? Number(mComb.amperaje_arranque_cca)
              : undefined,
          numero_baterias:
            mComb.cantidad_baterias !== undefined ? Number(mComb.cantidad_baterias) : undefined,
          referencia_bateria: mComb.referencia_bateria,
          capacidad_bateria_ah:
            mComb.capacidad_bateria_ah !== undefined
              ? Number(mComb.capacidad_bateria_ah)
              : undefined,
          tiene_radiador:
            typeof mComb.tiene_radiador === 'boolean' ? mComb.tiene_radiador : undefined,
          radiador_alto_cm:
            mComb.radiador_alto_cm !== undefined ? Number(mComb.radiador_alto_cm) : undefined,
          radiador_ancho_cm:
            mComb.radiador_ancho_cm !== undefined ? Number(mComb.radiador_ancho_cm) : undefined,
          radiador_espesor_cm:
            mComb.radiador_espesor_cm !== undefined ? Number(mComb.radiador_espesor_cm) : undefined,
          tiene_cargador_bateria:
            typeof mComb.tiene_cargador_bateria === 'boolean'
              ? mComb.tiene_cargador_bateria
              : undefined,
          marca_cargador: mComb.marca_cargador,
          modelo_cargador: mComb.modelo_cargador,
          amperaje_cargador:
            mComb.amperaje_cargador !== undefined ? Number(mComb.amperaje_cargador) : undefined,
          capacidad_aceite_litros:
            (mComb.capacidad_aceite_litros ?? mComb.capacidad_aceite_l) !== undefined
              ? Number(mComb.capacidad_aceite_litros ?? mComb.capacidad_aceite_l)
              : undefined,
          tipo_aceite: mComb.tipo_aceite,
          capacidad_refrigerante_litros:
            (mComb.capacidad_refrigerante_litros ?? mComb.capacidad_refrigerante_l) !== undefined
              ? Number(mComb.capacidad_refrigerante_litros ?? mComb.capacidad_refrigerante_l)
              : undefined,
          tipo_refrigerante: mComb.tipo_refrigerante,
          anio_fabricacion:
            mComb.ano_fabricacion_motor !== undefined
              ? Number(mComb.ano_fabricacion_motor)
              : undefined,
        };
      } else if (mElec && Object.keys(mElec).length > 0) {
        const fasesRaw = String(mElec.numero_fases_motor || mElec.numero_fases || '').toUpperCase();
        const numeroFases =
          fasesRaw === '1' || fasesRaw.includes('MONO') ? 'MONOFASICO' : 'TRIFASICO';
        datosMotor = {
          tipo_motor: TipoMotorEnum.ELECTRICO,
          marca_motor: mElec.marca_motor_electrico || mElec.marca_motor || 'GENERICO',
          modelo_motor: mElec.modelo_motor_electrico || mElec.modelo_motor,
          numero_serie_motor: mElec.numero_serie_motor_electrico || mElec.numero_serie_motor,
          potencia_hp:
            mElec.potencia_hp_electrico !== undefined
              ? Number(mElec.potencia_hp_electrico)
              : mElec.potencia_hp !== undefined
                ? Number(mElec.potencia_hp)
                : undefined,
          potencia_kw:
            mElec.potencia_kw_electrico !== undefined
              ? Number(mElec.potencia_kw_electrico)
              : mElec.potencia_kw !== undefined
                ? Number(mElec.potencia_kw)
                : undefined,
          velocidad_nominal_rpm:
            mElec.velocidad_rpm !== undefined ? Number(mElec.velocidad_rpm) : undefined,
          voltaje_operacion_vac: mElec.voltaje_operacion_vac
            ? String(mElec.voltaje_operacion_vac)
            : '220V',
          numero_fases: numeroFases,
          frecuencia_hz:
            mElec.frecuencia_hz_motor !== undefined
              ? Number(mElec.frecuencia_hz_motor)
              : 60,
          amperaje_nominal:
            mElec.amperaje_nominal_motor !== undefined
              ? Number(mElec.amperaje_nominal_motor)
              : undefined,
          factor_potencia:
            mElec.factor_potencia_motor !== undefined
              ? Number(mElec.factor_potencia_motor)
              : undefined,
          clase_aislamiento: parseClaseAislamientoSegura(mElec.clase_aislamiento_motor),
          grado_proteccion_ip: mElec.grado_proteccion_ip_motor || 'IP55',
          anio_fabricacion:
            mElec.ano_fabricacion_motor_electrico !== undefined
              ? Number(mElec.ano_fabricacion_motor_electrico)
              : undefined,
        };
      }
    }

    let datosGenerador = datosGeneradorExplicito ? { ...datosGeneradorExplicito } : undefined;
    if (!datosGenerador && mGen && Object.keys(mGen).length > 0) {
      const fasesGen = Number(mGen.numero_fases);
      datosGenerador = {
        marca_generador: mGen.marca_generador || mGen.marca_alternador || 'GENERICO',
        modelo_generador: mGen.modelo_generador,
        numero_serie_generador: mGen.numero_serie_generador,
        marca_alternador: mGen.marca_alternador,
        modelo_alternador: mGen.modelo_alternador,
        numero_serie_alternador: mGen.numero_serie_alternador,
        potencia_kva: mGen.potencia_kva !== undefined ? Number(mGen.potencia_kva) : undefined,
        potencia_kw: mGen.potencia_kw !== undefined ? Number(mGen.potencia_kw) : undefined,
        factor_potencia:
          mGen.factor_potencia !== undefined ? Number(mGen.factor_potencia) : 0.8,
        voltaje_salida: mGen.voltaje_salida ? String(mGen.voltaje_salida) : '220/127V',
        numero_fases: fasesGen === 1 ? 1 : 3,
        frecuencia_hz: Number(mGen.frecuencia_hz) === 50 ? 50 : 60,
        amperaje_nominal_salida:
          mGen.amperaje_nominal_salida !== undefined
            ? Number(mGen.amperaje_nominal_salida)
            : undefined,
        configuracion_salida: mGen.configuracion_salida,
        clase_aislamiento: mGen.clase_aislamiento,
        grado_proteccion_ip: mGen.grado_proteccion_ip,
        tiene_avr: typeof mGen.tiene_avr === 'boolean' ? mGen.tiene_avr : undefined,
        marca_avr: mGen.marca_avr,
        modelo_avr: mGen.modelo_avr,
        referencia_avr: mGen.referencia_avr,
        tiene_modulo_control:
          typeof mGen.tiene_modulo_control === 'boolean' ? mGen.tiene_modulo_control : undefined,
        marca_modulo_control: mGen.marca_modulo_control,
        modelo_modulo_control: mGen.modelo_modulo_control,
        tiene_arranque_automatico:
          typeof mGen.tiene_arranque_automatico === 'boolean'
            ? mGen.tiene_arranque_automatico
            : undefined,
        capacidad_tanque_principal_litros:
          mGen.capacidad_tanque_principal_litros !== undefined
            ? Number(mGen.capacidad_tanque_principal_litros)
            : undefined,
        tiene_tanque_auxiliar:
          typeof mGen.tiene_tanque_auxiliar === 'boolean' ? mGen.tiene_tanque_auxiliar : undefined,
        capacidad_tanque_auxiliar_litros:
          mGen.capacidad_tanque_auxiliar_litros !== undefined
            ? Number(mGen.capacidad_tanque_auxiliar_litros)
            : undefined,
        anio_fabricacion:
          mGen.ano_fabricacion_generador !== undefined
            ? Number(mGen.ano_fabricacion_generador)
            : undefined,
      };
    }

    let datosBomba = datosBombaExplicito ? { ...datosBombaExplicito } : undefined;
    if (!datosBomba && mBom && Object.keys(mBom).length > 0) {
      datosBomba = {
        marca_bomba: mBom.marca_bomba || 'GENERICO',
        modelo_bomba: mBom.modelo_bomba,
        numero_serie_bomba: mBom.numero_serie_bomba,
        tipo_bomba: mBom.tipo_bomba || 'CENTRIFUGA',
        aplicacion_bomba: mBom.aplicacion_bomba || 'AGUA_POTABLE',
        diametro_aspiracion: mBom.diametro_succion || mBom.diametro_aspiracion,
        diametro_descarga: mBom.diametro_descarga,
        caudal_maximo_m3h:
          mBom.caudal_maximo_m3h !== undefined ? Number(mBom.caudal_maximo_m3h) : undefined,
        altura_manometrica_maxima_m:
          mBom.altura_manometrica_maxima_m !== undefined
            ? Number(mBom.altura_manometrica_maxima_m)
            : undefined,
        altura_presion_trabajo_m:
          mBom.altura_presion_trabajo_m !== undefined
            ? Number(mBom.altura_presion_trabajo_m)
            : undefined,
        potencia_hidraulica_kw:
          mBom.potencia_hidraulica_kw !== undefined
            ? Number(mBom.potencia_hidraulica_kw)
            : undefined,
        eficiencia_porcentaje:
          mBom.eficiencia_porcentaje !== undefined
            ? Number(mBom.eficiencia_porcentaje)
            : undefined,
        numero_total_bombas_sistema:
          mBom.total_bombas_sistema !== undefined ? Number(mBom.total_bombas_sistema) : undefined,
        numero_bomba_en_sistema:
          mBom.posicion_bomba_numero !== undefined
            ? Number(mBom.posicion_bomba_numero)
            : undefined,
        tiene_panel_control:
          typeof mBom.tiene_panel_control_bomba === 'boolean'
            ? mBom.tiene_panel_control_bomba
            : undefined,
        marca_panel_control: mBom.marca_panel_control_bomba,
        modelo_panel_control: mBom.modelo_panel_control_bomba,
        tiene_presostato:
          typeof mBom.tiene_presostato === 'boolean' ? mBom.tiene_presostato : undefined,
        marca_presostato: mBom.marca_presostato,
        modelo_presostato: mBom.modelo_presostato,
        presion_encendido_psi:
          mBom.presion_encendido_psi !== undefined
            ? Number(mBom.presion_encendido_psi)
            : undefined,
        presion_apagado_psi:
          mBom.presion_apagado_psi !== undefined ? Number(mBom.presion_apagado_psi) : undefined,
        tiene_contactor_externo:
          typeof mBom.tiene_contactor_externo === 'boolean'
            ? mBom.tiene_contactor_externo
            : undefined,
        marca_contactor: mBom.marca_contactor,
        amperaje_contactor:
          mBom.amperaje_contactor !== undefined ? Number(mBom.amperaje_contactor) : undefined,
        tiene_arrancador_suave:
          typeof mBom.tiene_arrancador_suave === 'boolean'
            ? mBom.tiene_arrancador_suave
            : undefined,
        tiene_variador_frecuencia:
          typeof mBom.tiene_variador_frecuencia_vfd === 'boolean'
            ? mBom.tiene_variador_frecuencia_vfd
            : undefined,
        marca_variador: mBom.marca_variador,
        modelo_variador: mBom.modelo_variador,
        tiene_tanques_hidroneumaticos:
          typeof mBom.tiene_tanques_hidroneumaticos === 'boolean'
            ? mBom.tiene_tanques_hidroneumaticos
            : undefined,
        cantidad_tanques:
          mBom.cantidad_tanques_hidro !== undefined
            ? Number(mBom.cantidad_tanques_hidro)
            : undefined,
        capacidad_tanques_litros:
          mBom.capacidad_tanques_litros !== undefined
            ? Number(mBom.capacidad_tanques_litros)
            : undefined,
        presion_tanques_psi:
          mBom.presion_tanques_psi !== undefined ? Number(mBom.presion_tanques_psi) : undefined,
        tiene_manometro:
          typeof mBom.tiene_manometro === 'boolean' ? mBom.tiene_manometro : undefined,
        rango_manometro_min_psi:
          mBom.rango_manometro_min_psi !== undefined
            ? Number(mBom.rango_manometro_min_psi)
            : undefined,
        rango_manometro_max_psi:
          mBom.rango_manometro_max_psi !== undefined
            ? Number(mBom.rango_manometro_max_psi)
            : undefined,
        tiene_proteccion_nivel:
          typeof mBom.tiene_proteccion_nivel === 'boolean'
            ? mBom.tiene_proteccion_nivel
            : undefined,
        tipo_proteccion_nivel: mBom.tipo_proteccion_nivel,
        tiene_valvula_purga:
          typeof mBom.tiene_valvula_purga === 'boolean' ? mBom.tiene_valvula_purga : undefined,
        tiene_valvula_cebado:
          typeof mBom.tiene_valvula_cebado === 'boolean' ? mBom.tiene_valvula_cebado : undefined,
        tiene_valvula_cheque:
          typeof mBom.tiene_valvula_cheque === 'boolean' ? mBom.tiene_valvula_cheque : undefined,
        tiene_valvula_pie:
          typeof mBom.tiene_valvula_pie === 'boolean' ? mBom.tiene_valvula_pie : undefined,
        referencia_sello_mecanico: mBom.referencia_sello_mecanico,
        anio_fabricacion:
          mBom.ano_fabricacion_bomba !== undefined
            ? Number(mBom.ano_fabricacion_bomba)
            : undefined,
      };
    }

    return { datosMotor, datosGenerador, datosBomba };
  }

  /**
   * Copia los repuestos sugeridos de un Modelo de Fábrica (modelos_equipo_bom)
   * hacia la matriz BOM del equipo (componentes_equipo), evitando duplicados.
   */
  private async vincularKitBomDesdeModeloOem(
    idEquipo: number,
    idModelo: number,
    userId: number,
    tx: Prisma.TransactionClient,
  ): Promise<number> {
    if (!idModelo || !(tx as any).modelos_equipo_bom) return 0;

    const kitItems = await tx.modelos_equipo_bom.findMany({
      where: { id_modelo_equipo: idModelo },
      include: {
        catalogo_componentes: {
          select: {
            id_componente: true,
            id_tipo_componente: true,
            descripcion_corta: true,
          },
        },
      },
    });

    if (!kitItems.length) return 0;

    const existentes = await tx.componentes_equipo.findMany({
      where: { id_equipo: idEquipo, activo: { not: false } },
      select: { id_componente: true },
    });
    const setExistentes = new Set(existentes.map((e) => e.id_componente).filter(Boolean));

    let vinculados = 0;
    for (const item of kitItems) {
      if (setExistentes.has(item.id_componente)) continue;

      const rolRaw = (item.rol_bom || 'REPUESTO_GENERAL').toUpperCase();
      const categoria = EquiposGestionService.BOM_APLICACIONES[rolRaw]
        ? rolRaw
        : 'REPUESTO_GENERAL';
      const aplicacion = EquiposGestionService.BOM_APLICACIONES[categoria];
      const cantidad = Number(item.cantidad_sugerida ?? 1) || 1;

      await tx.componentes_equipo.create({
        data: {
          id_equipo: idEquipo,
          id_componente: item.id_componente,
          id_tipo_componente:
            aplicacion?.tipo ?? item.catalogo_componentes?.id_tipo_componente ?? 1,
          posicion_descripcion:
            aplicacion?.label ||
            item.rol_bom ||
            item.catalogo_componentes?.descripcion_corta ||
            'Repuesto Sugerido OEM',
          unidades_por_cambio: Math.max(1, Math.ceil(cantidad)),
          especificaciones_adicionales: {
            categoria_aplicacion: categoria,
            rol_repuesto: 'TITULAR',
            cantidad_requerida: cantidad,
            frecuencia_cambio_horas: 250,
            origen_kit_oem: idModelo,
          },
          notas: item.notas || 'Vinculado automáticamente desde Modelo de Fábrica (OEM)',
          activo: true,
          creado_por: userId || 1,
        },
      });

      setExistentes.add(item.id_componente);
      vinculados++;
    }

    return vinculados;
  }

  /**
   * Construye el objeto consolidado de motor y datos_especificos combinando
   * el documento JSONB `especificaciones` con las tablas satélite legadas.
   */
  private consolidarEspecificacionesEquipo(eq: any): {
    tipoEquipo: string;
    motorConsolidado: any;
    datosEspecificos: any;
  } {
    const codTipo = (eq.tipos_equipo?.codigo_tipo || '').toUpperCase();
    const specsDoc = (eq.especificaciones as any) || {};
    const specsModulos = specsDoc.modulos || {};

    // Consolidar motor desde satélite o desde módulos JSONB (motor_combustion / motor_electrico)
    const modComb = specsModulos.motor_combustion || {};
    const modElec = specsModulos.motor_electrico || {};
    let motorDesdeJson: any = null;

    if (Object.keys(modComb).length > 0) {
      motorDesdeJson = {
        tipo_motor: 'COMBUSTION',
        marca_motor: modComb.marca_motor || null,
        modelo_motor: modComb.modelo_motor || null,
        numero_serie_motor: modComb.numero_serie_motor || null,
        potencia_hp: modComb.potencia_hp ?? modComb.potencia_motor_hp ?? null,
        potencia_kw: modComb.potencia_kw_motor ?? modComb.potencia_kw ?? null,
        velocidad_nominal_rpm: modComb.velocidad_rpm ?? null,
        tipo_combustible: modComb.tipo_combustible || 'DIESEL',
        numero_cilindros: modComb.numero_cilindros ?? null,
        voltaje_arranque_vdc: modComb.voltaje_arranque_vdc ?? null,
        capacidad_aceite_litros: modComb.capacidad_aceite_litros ?? null,
        capacidad_refrigerante_litros: modComb.capacidad_refrigerante_litros ?? null,
        amperaje_arranque: modComb.amperaje_arranque_cca ?? null,
        numero_baterias: modComb.cantidad_baterias ?? null,
        referencia_bateria: modComb.referencia_bateria ?? null,
        capacidad_bateria_ah: modComb.capacidad_bateria_ah ?? null,
      };
    } else if (Object.keys(modElec).length > 0) {
      motorDesdeJson = {
        tipo_motor: 'ELECTRICO',
        marca_motor: modElec.marca_motor_electrico || modElec.marca_motor || null,
        modelo_motor: modElec.modelo_motor_electrico || modElec.modelo_motor || null,
        numero_serie_motor:
          modElec.numero_serie_motor_electrico || modElec.numero_serie_motor || null,
        potencia_hp: modElec.potencia_hp_electrico ?? modElec.potencia_hp ?? null,
        potencia_kw: modElec.potencia_kw_electrico ?? modElec.potencia_kw ?? null,
        velocidad_nominal_rpm: modElec.velocidad_rpm ?? null,
        voltaje_operacion_vac: modElec.voltaje_operacion_vac ?? null,
        numero_fases: modElec.numero_fases_motor ?? modElec.numero_fases ?? null,
        frecuencia_hz: modElec.frecuencia_hz_motor ?? modElec.frecuencia_hz ?? null,
        amperaje_nominal: modElec.amperaje_nominal_motor ?? null,
      };
    }

    const motorConsolidado = eq.equipos_motor
      ? { ...(motorDesdeJson || {}), ...eq.equipos_motor }
      : motorDesdeJson;

    // Aplanar todos los atributos de todos los módulos JSONB para acceso directo en KPIs y tarjetas
    const todosAtributosModulos: Record<string, any> = {};
    for (const [_, modVal] of Object.entries(specsModulos)) {
      if (modVal && typeof modVal === 'object') {
        Object.assign(todosAtributosModulos, modVal);
      }
    }

    let tipoEquipo = codTipo || 'DESCONOCIDO';
    let datosEspecificos: any = null;

    if (codTipo === 'COMP' || codTipo === 'COMPRESOR') {
      tipoEquipo = 'COMPRESOR';
      datosEspecificos = {
        ...todosAtributosModulos,
        ...(specsModulos.compresor_industrial || {}),
        motor: motorConsolidado,
      };
    } else if (codTipo === 'BOMBA' || codTipo === 'BOM') {
      tipoEquipo = 'BOMBA';
      datosEspecificos = {
        ...todosAtributosModulos,
        ...(specsModulos.bomba_hidraulica || {}),
        ...(eq.equipos_bomba || {}),
        motor: motorConsolidado,
      };
    } else if (codTipo === 'GENERADOR' || codTipo === 'GEN') {
      tipoEquipo = 'GENERADOR';
      datosEspecificos = {
        ...todosAtributosModulos,
        ...(specsModulos.alternador_generador || {}),
        ...(eq.equipos_generador || {}),
        motor: motorConsolidado,
      };
    } else if (codTipo === 'MOTOR' || codTipo === 'MOT') {
      tipoEquipo = 'MOTOR';
      datosEspecificos = {
        ...todosAtributosModulos,
        motor: motorConsolidado,
      };
    } else if (codTipo) {
      // Cualquier nuevo arquetipo creado en el Hub (ej. CHILLER, TORRE_ENFRIAMIENTO)
      tipoEquipo = codTipo;
      datosEspecificos = {
        ...todosAtributosModulos,
        ...(eq.equipos_generador || {}),
        ...(eq.equipos_bomba || {}),
        motor: motorConsolidado,
      };
    } else if (eq.equipos_bomba) {
      tipoEquipo = 'BOMBA';
      datosEspecificos = { ...todosAtributosModulos, ...eq.equipos_bomba, motor: motorConsolidado };
    } else if (eq.equipos_generador) {
      tipoEquipo = 'GENERADOR';
      datosEspecificos = {
        ...todosAtributosModulos,
        ...eq.equipos_generador,
        motor: motorConsolidado,
      };
    } else if (motorConsolidado) {
      tipoEquipo = 'MOTOR';
      datosEspecificos = { ...todosAtributosModulos, motor: motorConsolidado };
    } else if (Object.keys(todosAtributosModulos).length > 0) {
      datosEspecificos = { ...todosAtributosModulos, motor: motorConsolidado };
    }

    return { tipoEquipo, motorConsolidado, datosEspecificos };
  }

  /**
   * Crear equipo completo con tabla padre + tabla hija + JSONB + B-Tree + BOM OEM en transacción
   */
  async crearEquipoCompleto(
    dto: CreateEquipoCompletoDto,
    userId: number,
  ): Promise<CreateEquipoCompletoResponse> {
    // 1. Validar que el código no exista
    const existeCodigo = await this.prisma.equipos.findFirst({
      where: { codigo_equipo: dto.datosEquipo.codigo_equipo.trim().toUpperCase() },
    });

    if (existeCodigo) {
      throw new ConflictException(
        `Ya existe un equipo con el código ${dto.datosEquipo.codigo_equipo}`,
      );
    }

    // 1.1. Validar que el número de serie no esté duplicado si se proporciona
    if (dto.datosEquipo.numero_serie_equipo) {
      const existeSerial = await this.prisma.equipos.findFirst({
        where: { numero_serie_equipo: dto.datosEquipo.numero_serie_equipo.trim() },
      });

      if (existeSerial) {
        throw new ConflictException(
          `Ya existe un equipo registrado con el número de serie ${dto.datosEquipo.numero_serie_equipo}. Por favor, verifíquelo.`,
        );
      }
    }

    // 2. Validar que el cliente exista
    const cliente = await this.prisma.clientes.findUnique({
      where: { id_cliente: dto.datosEquipo.id_cliente },
      select: { id_cliente: true, id_persona: true },
    });

    if (!cliente) {
      throw new NotFoundException(
        `No se encontró el cliente con ID ${dto.datosEquipo.id_cliente}`,
      );
    }

    // Obtener nombre del cliente desde persona
    const personaCliente = await this.prisma.personas.findUnique({
      where: { id_persona: cliente.id_persona },
      select: {
        primer_nombre: true,
        primer_apellido: true,
        razon_social: true,
        tipo_persona: true,
      },
    });

    const nombreCompleto = `${personaCliente?.primer_nombre || ''} ${personaCliente?.primer_apellido || ''}`.trim();
    const nombreCliente = nombreCompleto || personaCliente?.razon_social || 'Sin nombre';

    // 3. Validar sede si se proporciona
    let sedeInfo: { id_sede: number; nombre: string } | null = null;
    if (dto.datosEquipo.id_sede) {
      const sede = await this.prisma.sedes_cliente.findUnique({
        where: { id_sede: dto.datosEquipo.id_sede },
        select: { id_sede: true, nombre_sede: true, id_cliente: true },
      });

      if (!sede) {
        throw new NotFoundException(
          `No se encontró la sede con ID ${dto.datosEquipo.id_sede}`,
        );
      }

      if (sede.id_cliente !== dto.datosEquipo.id_cliente) {
        throw new ConflictException(
          `La sede ${dto.datosEquipo.id_sede} no pertenece al cliente ${dto.datosEquipo.id_cliente}`,
        );
      }

      sedeInfo = { id_sede: sede.id_sede, nombre: sede.nombre_sede };
    }

    // Extraer o fusionar satélites desde especificaciones JSONB si se enviaron
    const { datosMotor, datosGenerador, datosBomba } =
      this.extraerSatelitesDesdeEspecificaciones(
        dto.especificaciones,
        dto.datosMotor,
        dto.datosGenerador,
        dto.datosBomba,
      );

    const idModeloEquipo =
      dto.id_modelo_equipo ?? dto.datosEquipo.id_modelo_equipo ?? null;

    const configParametrosFinal: Record<string, any> = {
      ...(dto.config_parametros || {}),
    };
    if (dto.planes_preventivos_override && dto.planes_preventivos_override.length > 0) {
      configParametrosFinal.planes_preventivos = dto.planes_preventivos_override;
    }

    const planTipoA = dto.planes_preventivos_override?.find(
      (p) => p.activo !== false && /tipo\s*a|preventivo\s*a/i.test(p.nombre_plan || ''),
    );
    const planTipoB = dto.planes_preventivos_override?.find(
      (p) => p.activo !== false && /tipo\s*b|preventivo\s*b/i.test(p.nombre_plan || ''),
    );

    const tipoNorm = (dto.tipo || '').trim().toUpperCase();

    // 4. TRANSACCIÓN: Crear equipo padre + motor + hijo específico + BOM OEM
    try {
      const resultado = await this.prisma.$transaction(async (tx) => {
        // 4.1. Crear registro en tabla EQUIPOS (padre)
        const createData: any = {
          codigo_equipo: dto.datosEquipo.codigo_equipo.trim().toUpperCase(),
          id_cliente: dto.datosEquipo.id_cliente,
          id_tipo_equipo: dto.datosEquipo.id_tipo_equipo,
          ubicacion_texto: (dto.datosEquipo.ubicacion_texto || 'SIN UBICACIÓN ESPECIFICADA').trim(),
          id_sede: dto.datosEquipo.id_sede || null,
          nombre_equipo: (
            dto.datosEquipo.nombre_equipo ||
            `EQUIPO-${tipoNorm}-${dto.datosEquipo.codigo_equipo}`
          ).trim(),
          numero_serie_equipo: dto.datosEquipo.numero_serie_equipo?.trim() || null,
          estado_equipo:
            (dto.datosEquipo.estado_equipo as unknown as estado_equipo_enum) || 'OPERATIVO',
          criticidad:
            (dto.datosEquipo.criticidad as unknown as criticidad_enum) || 'MEDIA',
          criticidad_justificacion: dto.datosEquipo.criticidad_justificacion || null,
          fecha_instalacion: dto.datosEquipo.fecha_instalacion
            ? new Date(dto.datosEquipo.fecha_instalacion)
            : null,
          fecha_inicio_servicio_mekanos: dto.datosEquipo.fecha_inicio_servicio_mekanos
            ? new Date(dto.datosEquipo.fecha_inicio_servicio_mekanos)
            : null,
          en_garantia: dto.datosEquipo.en_garantia ?? false,
          fecha_inicio_garantia: dto.datosEquipo.fecha_inicio_garantia
            ? new Date(dto.datosEquipo.fecha_inicio_garantia)
            : null,
          fecha_fin_garantia: dto.datosEquipo.fecha_fin_garantia
            ? new Date(dto.datosEquipo.fecha_fin_garantia)
            : null,
          config_parametros: configParametrosFinal,
          activo: true,
          creado_por: userId,
        };

        if (idModeloEquipo) {
          createData.id_modelo_equipo = Number(idModeloEquipo);
        }
        if (dto.especificaciones) {
          createData.especificaciones = dto.especificaciones as unknown as Prisma.InputJsonValue;
        }
        if (dto.datosEquipo.horas_actuales !== undefined) {
          createData.horas_actuales = Number(dto.datosEquipo.horas_actuales);
        }
        if (dto.datosEquipo.observaciones_generales !== undefined) {
          createData.observaciones_generales = dto.datosEquipo.observaciones_generales;
        }
        if (
          dto.datosEquipo.intervalo_tipo_a_dias_override !== undefined ||
          planTipoA?.frecuencia_dias !== undefined
        ) {
          createData.intervalo_tipo_a_dias_override =
            dto.datosEquipo.intervalo_tipo_a_dias_override ?? planTipoA?.frecuencia_dias;
        }
        if (
          dto.datosEquipo.intervalo_tipo_a_horas_override !== undefined ||
          planTipoA?.frecuencia_uso !== undefined
        ) {
          createData.intervalo_tipo_a_horas_override =
            dto.datosEquipo.intervalo_tipo_a_horas_override ?? planTipoA?.frecuencia_uso;
        }
        if (
          dto.datosEquipo.intervalo_tipo_b_dias_override !== undefined ||
          planTipoB?.frecuencia_dias !== undefined
        ) {
          createData.intervalo_tipo_b_dias_override =
            dto.datosEquipo.intervalo_tipo_b_dias_override ?? planTipoB?.frecuencia_dias;
        }
        if (
          dto.datosEquipo.intervalo_tipo_b_horas_override !== undefined ||
          planTipoB?.frecuencia_uso !== undefined
        ) {
          createData.intervalo_tipo_b_horas_override =
            dto.datosEquipo.intervalo_tipo_b_horas_override ?? planTipoB?.frecuencia_uso;
        }

        const equipoCreado = await tx.equipos.create({
          data: createData,
        });

        // 4.2. Crear registro en tabla EQUIPOS_MOTOR (si se proporciona o se extrajo de especificaciones)
        if (datosMotor) {
          const marcaMotor = (datosMotor.marca_motor || 'GENERICO').trim().toUpperCase();
          const modeloMotor = (datosMotor.modelo_motor || 'N/A').trim().toUpperCase();
          const serialMotor = (datosMotor.numero_serie_motor || `SN-TEMP-${Date.now()}`)
            .trim()
            .toUpperCase();

          let potenciaHp = datosMotor.potencia_hp;
          let potenciaKw = datosMotor.potencia_kw;

          if (!potenciaHp && !potenciaKw) {
            if (
              (tipoNorm === TipoEquipoDiscriminator.GENERADOR || tipoNorm === 'GEN') &&
              datosGenerador?.potencia_kw
            ) {
              potenciaKw = datosGenerador.potencia_kw;
            } else {
              potenciaKw = 1.0;
            }
          }

          const datosMotorFinal: any = {
            id_equipo: equipoCreado.id_equipo,
            tipo_motor: (datosMotor.tipo_motor || 'COMBUSTION') as tipo_motor_enum,
            marca_motor: marcaMotor,
            modelo_motor: modeloMotor,
            numero_serie_motor: serialMotor,
            potencia_hp: potenciaHp || null,
            potencia_kw: potenciaKw || null,
            velocidad_nominal_rpm: datosMotor.velocidad_nominal_rpm || 1800,
            a_o_fabricacion: datosMotor.anio_fabricacion || null,
            creado_por: userId,
          };

          if (datosMotor.tipo_motor === TipoMotorEnum.COMBUSTION) {
            datosMotorFinal.tipo_combustible =
              parseTipoCombustibleSeguro(datosMotor.tipo_combustible);
            datosMotorFinal.numero_cilindros = datosMotor.numero_cilindros || null;
            datosMotorFinal.voltaje_arranque_vdc =
              [12, 24, 48].includes(Number(datosMotor.voltaje_arranque_vdc))
                ? Number(datosMotor.voltaje_arranque_vdc)
                : 12;
            datosMotorFinal.capacidad_aceite_litros = datosMotor.capacidad_aceite_litros || null;
            datosMotorFinal.capacidad_refrigerante_litros =
              datosMotor.capacidad_refrigerante_litros || null;
            datosMotorFinal.tiene_turbocargador = datosMotor.tiene_turbocargador ?? false;
            datosMotorFinal.tipo_arranque =
              parseTipoArranqueSeguro(datosMotor.tipo_arranque);
            datosMotorFinal.amperaje_arranque = datosMotor.amperaje_arranque || null;
            datosMotorFinal.numero_baterias = datosMotor.numero_baterias || 1;
            datosMotorFinal.referencia_bateria = datosMotor.referencia_bateria || 'N/A';
            datosMotorFinal.capacidad_bateria_ah = datosMotor.capacidad_bateria_ah || null;
            datosMotorFinal.tiene_radiador = datosMotor.tiene_radiador ?? true;
            datosMotorFinal.radiador_alto_cm = datosMotor.radiador_alto_cm || null;
            datosMotorFinal.radiador_ancho_cm = datosMotor.radiador_ancho_cm || null;
            datosMotorFinal.radiador_espesor_cm = datosMotor.radiador_espesor_cm || null;
            datosMotorFinal.tiene_cargador_bateria = datosMotor.tiene_cargador_bateria ?? false;
            datosMotorFinal.marca_cargador = datosMotor.marca_cargador || null;
            datosMotorFinal.modelo_cargador = datosMotor.modelo_cargador || null;
            datosMotorFinal.amperaje_cargador = datosMotor.amperaje_cargador || null;
            datosMotorFinal.tipo_aceite = datosMotor.tipo_aceite || '15W40';
            datosMotorFinal.tipo_refrigerante = datosMotor.tipo_refrigerante || '50/50';

            datosMotorFinal.voltaje_operacion_vac = null;
            datosMotorFinal.numero_fases = null;
            datosMotorFinal.frecuencia_hz = null;
            datosMotorFinal.clase_aislamiento = null;
            datosMotorFinal.grado_proteccion_ip = null;
            datosMotorFinal.amperaje_nominal = null;
            datosMotorFinal.factor_potencia = null;
          } else {
            datosMotorFinal.voltaje_operacion_vac = datosMotor.voltaje_operacion_vac || '220V';
            datosMotorFinal.numero_fases =
              parseNumeroFasesSeguro(datosMotor.numero_fases);
            datosMotorFinal.frecuencia_hz = datosMotor.frecuencia_hz || 60;
            datosMotorFinal.clase_aislamiento =
              parseClaseAislamientoSegura(datosMotor.clase_aislamiento);
            datosMotorFinal.grado_proteccion_ip = datosMotor.grado_proteccion_ip || 'IP55';
            datosMotorFinal.amperaje_nominal = datosMotor.amperaje_nominal || null;
            datosMotorFinal.factor_potencia = datosMotor.factor_potencia || 0.85;

            datosMotorFinal.tipo_combustible = null;
            datosMotorFinal.capacidad_aceite_litros = null;
            datosMotorFinal.capacidad_refrigerante_litros = null;
            datosMotorFinal.numero_cilindros = null;
            datosMotorFinal.voltaje_arranque_vdc = null;
            datosMotorFinal.tipo_arranque = null;
          }

          await tx.equipos_motor.create({
            data: datosMotorFinal,
          });
        }

        let datosEspecificos: Record<string, any> = {};

        // 4.3. Crear registro en tabla hija según discriminador (Dual-Write)
        if (tipoNorm === TipoEquipoDiscriminator.GENERADOR || tipoNorm === 'GEN') {
          if (!datosGenerador && !dto.especificaciones) {
            throw new ConflictException('datosGenerador es requerido para tipo GENERADOR');
          }
          const dg = datosGenerador || { marca_generador: 'GENERICO', voltaje_salida: '220/127V' };

          const kva = dg.potencia_kva || (dg.potencia_kw ? dg.potencia_kw / 0.8 : 0);
          const kw = dg.potencia_kw || (dg.potencia_kva ? dg.potencia_kva * 0.8 : 0);

          const generador = await tx.equipos_generador.create({
            data: {
              id_equipo: equipoCreado.id_equipo,
              marca_generador: (dg.marca_generador || 'GENERICO').trim().toUpperCase(),
              modelo_generador: (dg.modelo_generador || 'N/A').trim().toUpperCase(),
              numero_serie_generador: (dg.numero_serie_generador || `SN-GEN-${Date.now()}`)
                .trim()
                .toUpperCase(),
              marca_alternador: (dg.marca_alternador || 'N/A').trim().toUpperCase(),
              modelo_alternador: (dg.modelo_alternador || 'N/A').trim().toUpperCase(),
              numero_serie_alternador: (dg.numero_serie_alternador || 'N/A').trim().toUpperCase(),
              potencia_kw: kw || 0,
              potencia_kva: kva || 0,
              factor_potencia: dg.factor_potencia || 0.8,
              voltaje_salida: dg.voltaje_salida || '220/127V',
              numero_fases: dg.numero_fases || 3,
              frecuencia_hz: dg.frecuencia_hz || 60,
              amperaje_nominal_salida: dg.amperaje_nominal_salida || null,
              configuracion_salida: dg.configuracion_salida || 'ESTRELLA',
              tiene_avr: dg.tiene_avr ?? true,
              marca_avr: dg.marca_avr || 'N/A',
              modelo_avr: dg.modelo_avr || 'N/A',
              referencia_avr: dg.referencia_avr || 'N/A',
              tiene_modulo_control: dg.tiene_modulo_control ?? true,
              marca_modulo_control: dg.marca_modulo_control || 'N/A',
              modelo_modulo_control: dg.modelo_modulo_control || 'N/A',
              tiene_arranque_automatico: dg.tiene_arranque_automatico ?? true,
              capacidad_tanque_principal_litros: dg.capacidad_tanque_principal_litros || null,
              tiene_tanque_auxiliar: dg.tiene_tanque_auxiliar ?? false,
              capacidad_tanque_auxiliar_litros: dg.capacidad_tanque_auxiliar_litros || null,
              clase_aislamiento: dg.clase_aislamiento || 'H',
              grado_proteccion_ip: dg.grado_proteccion_ip || 'IP23',
              a_o_fabricacion: dg.anio_fabricacion || null,
              observaciones: dg.observaciones || null,
              creado_por: userId,
            },
          });

          if ((dg as any).horometro_actual !== undefined) {
            await tx.equipos.update({
              where: { id_equipo: equipoCreado.id_equipo },
              data: { horas_actuales: (dg as any).horometro_actual },
            });
          }

          datosEspecificos = {
            tabla: 'equipos_generador',
            ...generador,
          };
        } else if (tipoNorm === TipoEquipoDiscriminator.BOMBA || tipoNorm === 'BOM') {
          if (!datosBomba && !dto.especificaciones) {
            throw new ConflictException('datosBomba es requerido para tipo BOMBA');
          }
          const db = datosBomba || { marca_bomba: 'GENERICO', tipo_bomba: 'CENTRIFUGA' };

          const tiposBombaValidos = [
            'CENTRIFUGA',
            'TURBINA_VERTICAL_POZO',
            'SUMERGIBLE',
            'PERIFERICA',
            'TURBINA',
            'DESPLAZAMIENTO_POSITIVO',
            'HIDRO',
            'TANQUE_A_TANQUE',
          ];
          const tipoBombaSeguro = tiposBombaValidos.includes(String(db.tipo_bomba || '').toUpperCase())
            ? (String(db.tipo_bomba).toUpperCase() as unknown as tipo_bomba_enum)
            : ('CENTRIFUGA' as unknown as tipo_bomba_enum);

          const bomba = await tx.equipos_bomba.create({
            data: {
              id_equipo: equipoCreado.id_equipo,
              marca_bomba: (db.marca_bomba || 'GENERICO').trim().toUpperCase(),
              tipo_bomba: tipoBombaSeguro,
              modelo_bomba: (db.modelo_bomba || 'N/A').trim().toUpperCase(),
              numero_serie_bomba: (db.numero_serie_bomba || `SN-BOM-${Date.now()}`)
                .trim()
                .toUpperCase(),
              aplicacion_bomba:
                parseAplicacionBombaSegura(db.aplicacion_bomba),
              diametro_aspiracion: db.diametro_aspiracion || 'N/A',
              diametro_descarga: db.diametro_descarga || 'N/A',
              caudal_maximo_m3h: db.caudal_maximo_m3h || 0,
              altura_manometrica_maxima_m: db.altura_manometrica_maxima_m || 0,
              altura_presion_trabajo_m: db.altura_presion_trabajo_m || 0,
              potencia_hidraulica_kw: db.potencia_hidraulica_kw || 0,
              eficiencia_porcentaje: db.eficiencia_porcentaje || 0,
              numero_total_bombas_sistema: db.numero_total_bombas_sistema || 1,
              numero_bomba_en_sistema: db.numero_bomba_en_sistema || 1,
              tiene_panel_control: db.tiene_panel_control ?? false,
              marca_panel_control: db.marca_panel_control || 'N/A',
              modelo_panel_control: db.modelo_panel_control || 'N/A',
              tiene_presostato: db.tiene_presostato ?? false,
              marca_presostato: db.marca_presostato || 'N/A',
              modelo_presostato: db.modelo_presostato || 'N/A',
              presion_encendido_psi: db.presion_encendido_psi || null,
              presion_apagado_psi: db.presion_apagado_psi || null,
              tiene_contactor_externo: db.tiene_contactor_externo ?? false,
              marca_contactor: db.marca_contactor || 'N/A',
              amperaje_contactor: db.amperaje_contactor || null,
              tiene_arrancador_suave: db.tiene_arrancador_suave ?? false,
              tiene_variador_frecuencia: db.tiene_variador_frecuencia ?? false,
              marca_variador: db.marca_variador || 'N/A',
              modelo_variador: db.modelo_variador || 'N/A',
              tiene_tanques_hidroneumaticos: db.tiene_tanques_hidroneumaticos ?? false,
              cantidad_tanques: db.cantidad_tanques || null,
              capacidad_tanques_litros: db.capacidad_tanques_litros || null,
              presion_tanques_psi: db.presion_tanques_psi || null,
              tiene_manometro: db.tiene_manometro ?? false,
              rango_manometro_min_psi: db.rango_manometro_min_psi || 0,
              rango_manometro_max_psi: db.rango_manometro_max_psi || null,
              tiene_proteccion_nivel: db.tiene_proteccion_nivel ?? false,
              tipo_proteccion_nivel: db.tipo_proteccion_nivel || 'N/A',
              tiene_valvula_purga: db.tiene_valvula_purga ?? false,
              tiene_valvula_cebado: db.tiene_valvula_cebado ?? false,
              tiene_valvula_cheque: db.tiene_valvula_cheque ?? false,
              tiene_valvula_pie: db.tiene_valvula_pie ?? false,
              referencia_sello_mecanico: db.referencia_sello_mecanico || 'N/A',
              a_o_fabricacion: db.anio_fabricacion || null,
              observaciones: db.observaciones || null,
              creado_por: userId,
            },
          });

          datosEspecificos = {
            tabla: 'equipos_bomba',
            ...bomba,
          };
        } else {
          // MOTOR, COMPRESOR o cualquier nuevo arquetipo del Hub EAM Universal
          datosEspecificos = {
            tabla: datosMotor ? 'equipos_motor' : 'especificaciones_jsonb',
            ...(dto.especificaciones?.modulos || {}),
          };
        }

        // 4.4. Si se solicitó heredar el Kit BOM del Modelo de Fábrica (OEM)
        let repuestosBomVinculados = 0;
        if (idModeloEquipo && dto.vincular_kit_bom) {
          repuestosBomVinculados = await this.vincularKitBomDesdeModeloOem(
            equipoCreado.id_equipo,
            Number(idModeloEquipo),
            userId,
            tx,
          );
        }

        return {
          equipo: equipoCreado,
          datosEspecificos,
          repuestosBomVinculados,
        };
      });

      this.clientesService?.invalidateClientesCache();

      // ✅ EAM FASE 2 & 4: Doble escritura JSONB y proyección B-Tree en equipos_atributos_filtro
      let especificacionesFinales = dto.especificaciones;
      if (this.projectionService) {
        try {
          const resProj = await this.projectionService.reconstruirJsonYProyectar(
            resultado.equipo.id_equipo,
            undefined,
            dto.especificaciones,
          );
          if (resProj.json) {
            especificacionesFinales = resProj.json;
          }
        } catch {
          // No bloqueante
        }
      }

      return {
        success: true,
        message: `Equipo tipo ${dto.tipo} creado exitosamente`,
        data: {
          id_equipo: resultado.equipo.id_equipo,
          codigo_equipo: resultado.equipo.codigo_equipo,
          tipo: dto.tipo,
          nombre_equipo: resultado.equipo.nombre_equipo,
          cliente: {
            id_cliente: cliente.id_cliente,
            nombre: nombreCliente,
          },
          sede: sedeInfo,
          estado_equipo: resultado.equipo.estado_equipo || 'OPERATIVO',
          fecha_creacion:
            resultado.equipo.fecha_creacion?.toISOString() || new Date().toISOString(),
          datos_especificos: resultado.datosEspecificos,
          especificaciones: especificacionesFinales,
          id_modelo_equipo: idModeloEquipo,
          repuestos_bom_vinculados: resultado.repuestosBomVinculados,
        },
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          const targets = error.meta?.target as string[];
          const field = targets?.join(', ') || 'campo único';
          throw new ConflictException(
            `Error de duplicidad: Ya existe un registro con el mismo ${field}. Por favor, verifique el código de equipo o número de serie.`,
          );
        }
      }
      if (error instanceof ConflictException || error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(
        'Error inesperado al registrar el equipo: ' + errorMessage,
      );
    }
  }

  /**
   * Listar equipos con datos polimórficos y Filtros B-Tree con Conversión UoM en Vivo
   */
  async listarEquiposCompletos(params: {
    id_cliente?: number;
    id_sede?: number;
    id_tipo_equipo?: number;
    tipo?: string;
    estado_equipo?: string;
    search?: string;
    sortBy?: 'codigo' | 'nombre' | 'fecha' | 'cliente';
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
    idAsesorAsignado?: number;
    filtroMarcaCampo?: string;
    filtroMarcaValor?: string;
    filtroMarcaTabla?: string;
    filtroValorCampo?: string;
    filtroValorMin?: number;
    filtroValorMax?: number;
    filtroValorExacto?: string;
    filtroValorTabla?: string;
    filtroAtributoCodigo?: string;
    filtroAtributoValorMin?: number;
    filtroAtributoValorMax?: number;
    filtroAtributoUnidad?: string;
    filtroAtributoTexto?: string;
    filtroAtributoBooleano?: string;
  }) {
    try {
      const {
        id_cliente,
        id_sede,
        id_tipo_equipo,
        tipo,
        estado_equipo,
        search,
        sortBy = 'codigo',
        sortOrder = 'asc',
        page = 1,
        limit = 20,
        idAsesorAsignado,
        filtroMarcaCampo,
        filtroMarcaValor,
        filtroMarcaTabla,
        filtroValorCampo,
        filtroValorMin,
        filtroValorMax,
        filtroValorExacto,
        filtroValorTabla,
      } = params;
      const pageNum = Math.max(1, Number(page) || 1);
      const limitNum = Math.max(1, Number(limit) || 20);
      const skip = (pageNum - 1) * limitNum;

      const where: any = { activo: true };
      if (id_cliente) where.id_cliente = id_cliente;
      if (id_sede) where.id_sede = id_sede;
      if (id_tipo_equipo) where.id_tipo_equipo = Number(id_tipo_equipo);
      if (estado_equipo) where.estado_equipo = estado_equipo;

      if (idAsesorAsignado) {
        where.clientes = {
          id_asesor_asignado: idAsesorAsignado,
        };
      }

      // Filtro por tipo (GENERADOR, BOMBA, COMPRESOR, MOTOR, OTRO o cualquier nuevo arquetipo del Hub)
      if (tipo && !id_tipo_equipo) {
        const tipoUp = tipo.trim().toUpperCase();
        if (tipoUp === 'GENERADOR' || tipoUp === 'GEN') {
          where.tipos_equipo = { codigo_tipo: { in: ['GENERADOR', 'GEN'] } };
        } else if (tipoUp === 'BOMBA' || tipoUp === 'BOM') {
          where.tipos_equipo = { codigo_tipo: { in: ['BOMBA', 'BOM'] } };
        } else if (tipoUp === 'COMPRESOR' || tipoUp === 'COMP') {
          where.tipos_equipo = { codigo_tipo: { in: ['COMP', 'COMPRESOR'] } };
        } else if (tipoUp === 'MOTOR' || tipoUp === 'MOT') {
          where.tipos_equipo = { codigo_tipo: { in: ['MOTOR', 'MOT'] } };
        } else if (tipoUp === 'OTRO') {
          where.tipos_equipo = {
            codigo_tipo: { notIn: ['GENERADOR', 'GEN', 'BOMBA', 'BOM'] },
          };
        } else {
          where.tipos_equipo = {
            codigo_tipo: { equals: tipoUp, mode: 'insensitive' },
          };
        }
      }

      // ✅ APLICAR FACETAS DINÁMICAS EAM (Zero-Trust)
      const applyRelationFilter = (
        relation: 'equipos_motor' | 'equipos_generador' | 'equipos_bomba',
        field: string,
        condition: any,
      ) => {
        if (!where[relation]) {
          where[relation] = { is: {} };
        } else if (!where[relation].is) {
          where[relation].is = {};
        }
        where[relation].is[field] = condition;
      };

      const resolverTabla = (
        campo: string,
        tablaEspecificada?: string,
      ): 'equipos_motor' | 'equipos_generador' | 'equipos_bomba' => {
        if (
          tablaEspecificada === 'equipos_motor' ||
          tablaEspecificada === 'equipos_generador' ||
          tablaEspecificada === 'equipos_bomba'
        ) {
          return tablaEspecificada;
        }
        const defMarca = FACETAS_MARCA_REGISTRO.find((f) => f.campo === campo);
        if (defMarca) return defMarca.tabla;
        const defValor = FACETAS_VALOR_TRABAJO_REGISTRO.find((f) => f.campo === campo);
        if (defValor) return defValor.tabla;
        if (
          campo.includes('motor') ||
          campo.includes('cargador') ||
          campo.includes('bateria') ||
          campo.includes('aceite')
        )
          return 'equipos_motor';
        if (
          campo.includes('bomba') ||
          campo.includes('caudal') ||
          campo.includes('presion') ||
          campo.includes('variador') ||
          campo.includes('sello')
        )
          return 'equipos_bomba';
        return 'equipos_generador';
      };

      if (filtroMarcaCampo && filtroMarcaValor && filtroMarcaValor.trim()) {
        const tabla = resolverTabla(filtroMarcaCampo, filtroMarcaTabla);
        applyRelationFilter(tabla, filtroMarcaCampo, {
          contains: filtroMarcaValor.trim(),
          mode: 'insensitive',
        });
      }

      if (filtroValorCampo) {
        const tabla = resolverTabla(filtroValorCampo, filtroValorTabla);
        const condition: any = {};
        if (
          filtroValorMin !== undefined &&
          filtroValorMin !== null &&
          !isNaN(Number(filtroValorMin))
        ) {
          condition.gte = Number(filtroValorMin);
        }
        if (
          filtroValorMax !== undefined &&
          filtroValorMax !== null &&
          !isNaN(Number(filtroValorMax))
        ) {
          condition.lte = Number(filtroValorMax);
        }
        if (
          filtroValorExacto !== undefined &&
          filtroValorExacto !== null &&
          String(filtroValorExacto).trim() !== ''
        ) {
          const num = Number(filtroValorExacto);
          condition.equals = !isNaN(num) ? num : String(filtroValorExacto).trim();
        }

        if (Object.keys(condition).length > 0) {
          applyRelationFilter(tabla, filtroValorCampo, condition);
        }
      }

      // ✅ EAM FASE 2 & 4: Filtro Dinámico Universal B-Tree (equipos_atributos_filtro)
      // con Conversión Matemática de Unidades ($y = ax + b$) hacia la Unidad Base SI
      if (params.filtroAtributoCodigo) {
        const attrCode = params.filtroAtributoCodigo.trim();
        const condFiltro: any = {
          codigo_atributo: attrCode,
        };

        // Determinar unidad de entrada para conversión a base SI
        let unidadEntrada = (
          params.filtroAtributoUnidad ||
          this.projectionService?.getUnidadOrigenDefecto(attrCode) ||
          ''
        )
          .trim()
          .toUpperCase();

        if (!unidadEntrada) {
          const attrDb = await this.prisma.atributos_tecnicos.findUnique({
            where: { codigo_atributo: attrCode },
            select: { unidad_defecto_codigo: true },
          });
          if (attrDb?.unidad_defecto_codigo) {
            unidadEntrada = attrDb.unidad_defecto_codigo.toUpperCase().trim();
          }
        }

        const convertirValorFiltro = (val: number): number => {
          if (!unidadEntrada) return val;
          try {
            return this.uom.convertirABase(val, unidadEntrada).valorBase;
          } catch {
            return val;
          }
        };

        const condNum: any = {};
        if (
          params.filtroAtributoValorMin !== undefined &&
          params.filtroAtributoValorMin !== null &&
          !isNaN(Number(params.filtroAtributoValorMin))
        ) {
          condNum.gte = convertirValorFiltro(Number(params.filtroAtributoValorMin));
        }
        if (
          params.filtroAtributoValorMax !== undefined &&
          params.filtroAtributoValorMax !== null &&
          !isNaN(Number(params.filtroAtributoValorMax))
        ) {
          condNum.lte = convertirValorFiltro(Number(params.filtroAtributoValorMax));
        }
        if (Object.keys(condNum).length > 0) {
          // Redondear suavemente bordes por precisión punto flotante (ej. 150 KVA -> 120 KW)
          if (condNum.gte !== undefined) condNum.gte = Number((condNum.gte - 0.0001).toFixed(6));
          if (condNum.lte !== undefined) condNum.lte = Number((condNum.lte + 0.0001).toFixed(6));
          condFiltro.valor_num_base = condNum;
        }

        if (params.filtroAtributoBooleano && String(params.filtroAtributoBooleano).trim() !== '') {
          const bRaw = String(params.filtroAtributoBooleano).trim().toUpperCase();
          const esTrue = bRaw === 'TRUE' || bRaw === 'SI' || bRaw === 'SÍ' || bRaw === '1';
          condFiltro.valor_texto = { equals: esTrue ? 'true' : 'false', mode: 'insensitive' };
        } else if (params.filtroAtributoTexto && String(params.filtroAtributoTexto).trim()) {
          condFiltro.valor_texto = {
            contains: String(params.filtroAtributoTexto).trim(),
            mode: 'insensitive',
          };
        }

        where.equipos_atributos_filtro = {
          some: condFiltro,
        };
      }

      // Base filter for global park KPI summary
      const baseParkWhere: any = { activo: true };
      if (id_cliente) baseParkWhere.id_cliente = id_cliente;
      if (id_sede) baseParkWhere.id_sede = id_sede;
      if (idAsesorAsignado) {
        baseParkWhere.clientes = { id_asesor_asignado: idAsesorAsignado };
      }

      // Búsqueda por código, nombre, número de serie o cliente
      if (search && search.trim()) {
        const searchTerm = search.trim();
        where.OR = [
          { codigo_equipo: { contains: searchTerm, mode: 'insensitive' } },
          { nombre_equipo: { contains: searchTerm, mode: 'insensitive' } },
          { numero_serie_equipo: { contains: searchTerm, mode: 'insensitive' } },
          {
            clientes: {
              persona: { razon_social: { contains: searchTerm, mode: 'insensitive' } },
            },
          },
          {
            clientes: {
              persona: { nombre_comercial: { contains: searchTerm, mode: 'insensitive' } },
            },
          },
          {
            clientes: {
              persona: { primer_nombre: { contains: searchTerm, mode: 'insensitive' } },
            },
          },
        ];
      }

      // Ordenación dinámica
      let orderBy: any = { codigo_equipo: sortOrder };
      if (sortBy === 'nombre') orderBy = { nombre_equipo: sortOrder };
      if (sortBy === 'fecha') orderBy = { fecha_creacion: sortOrder };

      const [
        equipos,
        total,
        totalParque,
        totalGeneradores,
        totalBombas,
        totalOperativos,
        totalEnReparacion,
        totalFueraServicio,
        totalCriticidadAlta,
      ] = await Promise.all([
        this.prisma.equipos.findMany({
          where,
          skip,
          take: limitNum,
          include: {
            clientes: {
              include: {
                persona: true,
              },
            },
            sedes_cliente: {
              select: { id_sede: true, nombre_sede: true },
            },
            tipos_equipo: {
              select: { id_tipo_equipo: true, nombre_tipo: true, codigo_tipo: true },
            },
            equipos_generador: true,
            equipos_bomba: true,
            equipos_motor: true,
          },
          orderBy,
        }),
        this.prisma.equipos.count({ where }),
        this.prisma.equipos.count({ where: baseParkWhere }),
        this.prisma.equipos.count({
          where: {
            ...baseParkWhere,
            tipos_equipo: { codigo_tipo: { in: ['GENERADOR', 'GEN'] } },
          },
        }),
        this.prisma.equipos.count({
          where: {
            ...baseParkWhere,
            tipos_equipo: { codigo_tipo: { in: ['BOMBA', 'BOM'] } },
          },
        }),
        this.prisma.equipos.count({ where: { ...baseParkWhere, estado_equipo: 'OPERATIVO' } }),
        this.prisma.equipos.count({ where: { ...baseParkWhere, estado_equipo: 'EN_REPARACION' } }),
        this.prisma.equipos.count({ where: { ...baseParkWhere, estado_equipo: 'FUERA_SERVICIO' } }),
        this.prisma.equipos.count({
          where: { ...baseParkWhere, criticidad: { in: ['ALTA', 'CRITICA'] } },
        }),
      ]);

      const data = equipos.map((eq) => {
        const persona = eq.clientes?.persona;
        const nombrePersona = `${persona?.primer_nombre || ''} ${persona?.primer_apellido || ''}`.trim();
        const nombreCliente =
          nombrePersona || persona?.razon_social || persona?.nombre_comercial || 'Sin nombre';

        const { tipoEquipo, motorConsolidado, datosEspecificos } =
          this.consolidarEspecificacionesEquipo(eq);

        return {
          id_equipo: eq.id_equipo,
          codigo_equipo: eq.codigo_equipo,
          nombre_equipo: eq.nombre_equipo,
          numero_serie_equipo: eq.numero_serie_equipo,
          horas_actuales: eq.horas_actuales ? Number(eq.horas_actuales) : 0,
          tipo: tipoEquipo,
          id_tipo_equipo: eq.id_tipo_equipo,
          id_modelo_equipo: (eq as any).id_modelo_equipo ?? null,
          tipos_equipo: eq.tipos_equipo,
          estado_equipo: eq.estado_equipo,
          criticidad: eq.criticidad,
          ubicacion_texto: eq.ubicacion_texto,
          cliente: {
            id_cliente: eq.id_cliente,
            nombre: nombreCliente || 'Sin nombre',
          },
          sede: eq.sedes_cliente
            ? { id_sede: eq.sedes_cliente.id_sede, nombre: eq.sedes_cliente.nombre_sede }
            : null,
          fecha_creacion: eq.fecha_creacion,
          motor: motorConsolidado,
          datos_especificos: datosEspecificos,
          especificaciones: (eq as any).especificaciones || null,
        };
      });

      return {
        data,
        resumen: {
          total_parque: totalParque,
          generadores: totalGeneradores,
          bombas: totalBombas,
          otros: Math.max(0, totalParque - totalGeneradores - totalBombas),
          operativos: totalOperativos,
          en_reparacion: totalEnReparacion,
          fuera_servicio: totalFueraServicio,
          criticidad_alta: totalCriticidadAlta,
        },
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          const targets = error.meta?.target as string[];
          const field = targets?.join(', ') || 'campo único';
          throw new ConflictException(
            `Error de duplicidad: Ya existe un registro con el mismo ${field}. Por favor, verifique el código de equipo o número de serie.`,
          );
        }
      }
      if (error instanceof ConflictException || error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(
        'Error inesperado al listar los equipos: ' + errorMessage,
      );
    }
  }

  /**
   * Obtener equipo por ID con datos polimórficos completos y especificaciones JSONB
   */
  async obtenerEquipoCompleto(id: number) {
    try {
      const equipo = await this.prisma.equipos.findUnique({
        where: { id_equipo: id },
        include: {
          clientes: {
            include: {
              persona: true,
            },
          },
          sedes_cliente: true,
          tipos_equipo: true,
          modelos_equipo: true,
          equipos_generador: true,
          equipos_bomba: true,
          equipos_motor: true,
          lecturas_horometro: {
            take: 5,
            orderBy: { fecha_lectura: 'desc' },
          },
          historial_estados_equipo: {
            take: 10,
            orderBy: { fecha_cambio: 'desc' },
          },
        },
      });

      if (!equipo) {
        throw new NotFoundException(`No se encontró el equipo con ID ${id}`);
      }

      const persona = equipo.clientes?.persona;
      const nombrePersona = `${persona?.primer_nombre || ''} ${persona?.primer_apellido || ''}`.trim();
      const nombreCliente = nombrePersona || persona?.razon_social || 'Sin nombre';

      const { tipoEquipo, motorConsolidado, datosEspecificos } =
        this.consolidarEspecificacionesEquipo(equipo);

      return {
        id_equipo: equipo.id_equipo,
        codigo_equipo: equipo.codigo_equipo,
        nombre_equipo: equipo.nombre_equipo,
        numero_serie_equipo: equipo.numero_serie_equipo,
        id_tipo_equipo: equipo.id_tipo_equipo,
        id_modelo_equipo: (equipo as any).id_modelo_equipo ?? null,
        modelo_oem: (equipo as any).modelos_equipo ?? null,
        tipo: tipoEquipo,
        estado_equipo: equipo.estado_equipo,
        criticidad: equipo.criticidad,
        criticidad_justificacion: equipo.criticidad_justificacion,
        ubicacion_texto: equipo.ubicacion_texto,
        cliente: {
          id_cliente: equipo.id_cliente,
          nombre: nombreCliente || 'Sin nombre',
        },
        sede: equipo.sedes_cliente
          ? {
              id_sede: equipo.sedes_cliente.id_sede,
              nombre: equipo.sedes_cliente.nombre_sede,
            }
          : null,
        tipo_equipo: equipo.tipos_equipo,
        motor: motorConsolidado,
        datos_especificos: datosEspecificos,
        especificaciones: (equipo as any).especificaciones || null,
        config_parametros: equipo.config_parametros || {},
        // Fechas importantes
        fecha_instalacion: equipo.fecha_instalacion,
        fecha_inicio_servicio_mekanos: equipo.fecha_inicio_servicio_mekanos,
        fecha_creacion: equipo.fecha_creacion,
        fecha_modificacion: equipo.fecha_modificacion,
        // Garantía
        en_garantia: equipo.en_garantia,
        fecha_inicio_garantia: equipo.fecha_inicio_garantia,
        fecha_fin_garantia: equipo.fecha_fin_garantia,
        proveedor_garantia: equipo.proveedor_garantia,
        // Horas y mantenimiento
        horas_actuales: equipo.horas_actuales,
        fecha_ultima_lectura_horas: equipo.fecha_ultima_lectura_horas,
        tipo_contrato: equipo.tipo_contrato,
        // Intervalos override
        intervalo_tipo_a_dias_override: equipo.intervalo_tipo_a_dias_override,
        intervalo_tipo_a_horas_override: equipo.intervalo_tipo_a_horas_override,
        intervalo_tipo_b_dias_override: equipo.intervalo_tipo_b_dias_override,
        intervalo_tipo_b_horas_override: equipo.intervalo_tipo_b_horas_override,
        criterio_intervalo_override: equipo.criterio_intervalo_override,
        // Estado físico
        estado_pintura: equipo.estado_pintura,
        requiere_pintura: equipo.requiere_pintura,
        // Observaciones
        observaciones_generales: equipo.observaciones_generales,
        configuracion_especial: equipo.configuracion_especial,
        // Estado de baja
        activo: equipo.activo,
        fecha_baja: equipo.fecha_baja,
        motivo_baja: equipo.motivo_baja,
        // Relaciones
        lecturas_horometro: equipo.lecturas_horometro,
        historial_estados: equipo.historial_estados_equipo,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          const targets = error.meta?.target as string[];
          const field = targets?.join(', ') || 'campo único';
          throw new ConflictException(
            `Error de duplicidad: Ya existe un registro con el mismo ${field}. Por favor, verifique el código de equipo o número de serie.`,
          );
        }
      }
      if (error instanceof ConflictException || error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(
        'Error inesperado al obtener el equipo: ' + errorMessage,
      );
    }
  }

  /**
   * ✅ OPTIMIZACIÓN 05-ENE-2026: Query ULTRA-LIGERA para selectores
   */
  async findForSelector(params: {
    search?: string;
    clienteId?: number;
    sedeId?: number;
    limit?: number;
    idAsesorAsignado?: number;
  }) {
    const { search, clienteId, sedeId, limit = 20, idAsesorAsignado } = params;

    const where: any = {
      activo: true,
      ...(clienteId && { id_cliente: clienteId }),
      ...(sedeId && { id_sede: sedeId }),
      ...(idAsesorAsignado && {
        clientes: { id_asesor_asignado: idAsesorAsignado },
      }),
      ...(search && {
        OR: [
          { codigo_equipo: { contains: search, mode: 'insensitive' } },
          { nombre_equipo: { contains: search, mode: 'insensitive' } },
          { numero_serie_equipo: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const equipos = await this.prisma.equipos.findMany({
      where,
      select: {
        id_equipo: true,
        codigo_equipo: true,
        nombre_equipo: true,
        numero_serie_equipo: true,
        id_tipo_equipo: true,
        tipos_equipo: {
          select: {
            id_tipo_equipo: true,
            nombre_tipo: true,
            codigo_tipo: true,
            categoria: true,
          },
        },
      },
      take: limit,
      orderBy: { codigo_equipo: 'asc' },
    });

    return equipos.map((e) => ({
      id_equipo: e.id_equipo,
      codigo_equipo: e.codigo_equipo,
      nombre: e.nombre_equipo || e.codigo_equipo,
      serie: e.numero_serie_equipo,
      id_tipo_equipo: e.id_tipo_equipo,
      tipo: e.tipos_equipo?.nombre_tipo || e.tipos_equipo?.codigo_tipo,
      tipos_equipo: e.tipos_equipo,
    }));
  }

  /**
   * Cambiar estado del equipo con registro en historial
   */
  async cambiarEstadoEquipo(
    idEquipo: number,
    dto: CambiarEstadoEquipoDto,
    userId: number,
  ) {
    const equipo = await this.prisma.equipos.findUnique({
      where: { id_equipo: idEquipo },
      select: { id_equipo: true, codigo_equipo: true, estado_equipo: true },
    });

    if (!equipo) {
      throw new NotFoundException(`No se encontró el equipo con ID ${idEquipo}`);
    }

    const estadoAnterior = equipo.estado_equipo;
    const nuevoEstado = dto.nuevo_estado as estado_equipo_enum;

    if (estadoAnterior === nuevoEstado) {
      return {
        id_equipo: equipo.id_equipo,
        codigo_equipo: equipo.codigo_equipo,
        estado_anterior: estadoAnterior,
        estado_nuevo: nuevoEstado,
        mensaje: 'El equipo ya se encuentra en este estado',
      };
    }

    const resultado = await this.prisma.$transaction(async (tx) => {
      await tx.equipos.update({
        where: { id_equipo: idEquipo },
        data: {
          estado_equipo: nuevoEstado,
          modificado_por: userId,
          fecha_modificacion: new Date(),
        },
      });

      const historial = await tx.historial_estados_equipo.create({
        data: {
          id_equipo: idEquipo,
          estado_anterior: estadoAnterior,
          estado_nuevo: nuevoEstado,
          motivo_cambio: dto.motivo_cambio,
          cambiado_por: userId,
          fecha_cambio: new Date(),
        },
      });

      return historial;
    });

    return {
      id_equipo: equipo.id_equipo,
      codigo_equipo: equipo.codigo_equipo,
      estado_anterior: estadoAnterior,
      estado_nuevo: nuevoEstado,
      motivo_cambio: dto.motivo_cambio,
      fecha_cambio: resultado.fecha_cambio,
      id_historial: resultado.id_historial,
    };
  }

  /**
   * Registrar nueva lectura de horómetro
   */
  async registrarLecturaHorometro(
    idEquipo: number,
    dto: RegistrarLecturaHorometroDto,
    userId: number,
  ) {
    const equipo = await this.prisma.equipos.findUnique({
      where: { id_equipo: idEquipo },
      select: {
        id_equipo: true,
        codigo_equipo: true,
        horas_actuales: true,
        fecha_ultima_lectura_horas: true,
      },
    });

    if (!equipo) {
      throw new NotFoundException(`No se encontró el equipo con ID ${idEquipo}`);
    }

    const horasActuales = equipo.horas_actuales ? Number(equipo.horas_actuales) : 0;
    const nuevasHoras = dto.horas_lectura;

    if (nuevasHoras < horasActuales) {
      throw new BadRequestException(
        `La lectura (${nuevasHoras} hrs) no puede ser menor a las horas actuales (${horasActuales} hrs)`,
      );
    }

    const horasTranscurridas = nuevasHoras - horasActuales;
    let diasTranscurridos: number | null = null;
    let horasPromedioDia: number | null = null;

    if (equipo.fecha_ultima_lectura_horas) {
      const fechaAnterior = new Date(equipo.fecha_ultima_lectura_horas);
      const fechaActual = new Date();
      const diffMs = fechaActual.getTime() - fechaAnterior.getTime();
      diasTranscurridos = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diasTranscurridos > 0) {
        horasPromedioDia = parseFloat((horasTranscurridas / diasTranscurridos).toFixed(2));
      }
    }

    const resultado = await this.prisma.$transaction(async (tx) => {
      const lectura = await tx.lecturas_horometro.create({
        data: {
          id_equipo: idEquipo,
          horas_lectura: nuevasHoras,
          fecha_lectura: new Date(),
          tipo_lectura: (dto.tipo_lectura as any) || 'MANUAL',
          horas_transcurridas: horasTranscurridas,
          dias_transcurridos: diasTranscurridos,
          horas_promedio_dia: horasPromedioDia,
          observaciones: dto.observaciones,
          registrado_por: userId,
        },
      });

      await tx.equipos.update({
        where: { id_equipo: idEquipo },
        data: {
          horas_actuales: nuevasHoras,
          fecha_ultima_lectura_horas: new Date(),
          modificado_por: userId,
          fecha_modificacion: new Date(),
        },
      });

      return lectura;
    });

    return {
      id_lectura: resultado.id_lectura,
      id_equipo: equipo.id_equipo,
      codigo_equipo: equipo.codigo_equipo,
      horas_anteriores: horasActuales,
      horas_nuevas: nuevasHoras,
      horas_transcurridas: horasTranscurridas,
      dias_transcurridos: diasTranscurridos,
      horas_promedio_dia: horasPromedioDia,
      fecha_lectura: resultado.fecha_lectura,
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ACTUALIZAR DATOS ESPECÍFICOS (JSONB Modular + Motor + Generador + Bomba)
  // ════════════════════════════════════════════════════════════════════════════

  async actualizarDatosEspecificos(
    idEquipo: number,
    dto: UpdateDatosEspecificosDto,
    userId: number,
  ) {
    const equipo = await this.prisma.equipos.findUnique({
      where: { id_equipo: idEquipo },
      select: {
        id_equipo: true,
        codigo_equipo: true,
        tipos_equipo: { select: { codigo_tipo: true } },
      },
    });

    if (!equipo) {
      throw new NotFoundException(`No se encontró el equipo con ID ${idEquipo}`);
    }

    const { datosMotor, datosGenerador, datosBomba } =
      this.extraerSatelitesDesdeEspecificaciones(
        dto.especificaciones,
        dto.datosMotor,
        dto.datosGenerador,
        dto.datosBomba,
      );
    const desdeJsonModular = Boolean(dto.especificaciones);

    const resultado = await this.prisma.$transaction(async (tx) => {
      const updated: Record<string, any> = {};

      // 2. Actualizar MOTOR si se proporcionan datos
      if (datosMotor) {
        const motorExiste = await tx.equipos_motor.findUnique({
          where: { id_equipo: idEquipo },
        });

        if (motorExiste) {
          const motorData: any = { modificado_por: userId, fecha_modificacion: new Date() };

          if (datosMotor.tipo_motor !== undefined)
            motorData.tipo_motor = datosMotor.tipo_motor as tipo_motor_enum;
          if (datosMotor.marca_motor !== undefined) motorData.marca_motor = datosMotor.marca_motor;
          if (datosMotor.modelo_motor !== undefined)
            motorData.modelo_motor = datosMotor.modelo_motor;
          if (datosMotor.numero_serie_motor !== undefined)
            motorData.numero_serie_motor = datosMotor.numero_serie_motor;
          if (datosMotor.potencia_hp !== undefined) motorData.potencia_hp = datosMotor.potencia_hp;
          if (datosMotor.potencia_kw !== undefined) motorData.potencia_kw = datosMotor.potencia_kw;
          if (datosMotor.velocidad_nominal_rpm !== undefined)
            motorData.velocidad_nominal_rpm = datosMotor.velocidad_nominal_rpm;
          if (datosMotor.tipo_combustible !== undefined)
            motorData.tipo_combustible = parseTipoCombustibleSeguro(datosMotor.tipo_combustible);
          if (datosMotor.numero_cilindros !== undefined)
            motorData.numero_cilindros = datosMotor.numero_cilindros;
          if (datosMotor.cilindrada_cc !== undefined)
            motorData.cilindrada_cc = datosMotor.cilindrada_cc;
          if (datosMotor.tiene_turbocargador !== undefined)
            motorData.tiene_turbocargador = datosMotor.tiene_turbocargador;
          if (datosMotor.tipo_arranque !== undefined)
            motorData.tipo_arranque = parseTipoArranqueSeguro(datosMotor.tipo_arranque);
          if (datosMotor.voltaje_arranque_vdc !== undefined)
            motorData.voltaje_arranque_vdc = datosMotor.voltaje_arranque_vdc;
          if (datosMotor.amperaje_arranque !== undefined)
            motorData.amperaje_arranque = datosMotor.amperaje_arranque;
          if (datosMotor.numero_baterias !== undefined)
            motorData.numero_baterias = datosMotor.numero_baterias;
          if (datosMotor.referencia_bateria !== undefined)
            motorData.referencia_bateria = datosMotor.referencia_bateria;
          if (datosMotor.capacidad_bateria_ah !== undefined)
            motorData.capacidad_bateria_ah = datosMotor.capacidad_bateria_ah;
          if (datosMotor.tiene_radiador !== undefined)
            motorData.tiene_radiador = datosMotor.tiene_radiador;
          if (datosMotor.radiador_alto_cm !== undefined)
            motorData.radiador_alto_cm = datosMotor.radiador_alto_cm;
          if (datosMotor.radiador_ancho_cm !== undefined)
            motorData.radiador_ancho_cm = datosMotor.radiador_ancho_cm;
          if (datosMotor.radiador_espesor_cm !== undefined)
            motorData.radiador_espesor_cm = datosMotor.radiador_espesor_cm;
          if (datosMotor.tiene_cargador_bateria !== undefined)
            motorData.tiene_cargador_bateria = datosMotor.tiene_cargador_bateria;
          if (datosMotor.marca_cargador !== undefined)
            motorData.marca_cargador = datosMotor.marca_cargador;
          if (datosMotor.modelo_cargador !== undefined)
            motorData.modelo_cargador = datosMotor.modelo_cargador;
          if (datosMotor.amperaje_cargador !== undefined)
            motorData.amperaje_cargador = datosMotor.amperaje_cargador;
          if (datosMotor.capacidad_aceite_litros !== undefined)
            motorData.capacidad_aceite_litros = datosMotor.capacidad_aceite_litros;
          if (datosMotor.tipo_aceite !== undefined) motorData.tipo_aceite = datosMotor.tipo_aceite;
          if (datosMotor.capacidad_refrigerante_litros !== undefined)
            motorData.capacidad_refrigerante_litros = datosMotor.capacidad_refrigerante_litros;
          if (datosMotor.tipo_refrigerante !== undefined)
            motorData.tipo_refrigerante = datosMotor.tipo_refrigerante;
          if (datosMotor.voltaje_operacion_vac !== undefined)
            motorData.voltaje_operacion_vac = datosMotor.voltaje_operacion_vac;
          if (datosMotor.numero_fases !== undefined)
            motorData.numero_fases = parseNumeroFasesSeguro(datosMotor.numero_fases);
          if (datosMotor.frecuencia_hz !== undefined)
            motorData.frecuencia_hz = datosMotor.frecuencia_hz;
          if (datosMotor.clase_aislamiento !== undefined)
            motorData.clase_aislamiento = parseClaseAislamientoSegura(datosMotor.clase_aislamiento);
          if (datosMotor.grado_proteccion_ip !== undefined)
            motorData.grado_proteccion_ip = datosMotor.grado_proteccion_ip;
          if (datosMotor.amperaje_nominal !== undefined)
            motorData.amperaje_nominal = datosMotor.amperaje_nominal;
          if (datosMotor.factor_potencia !== undefined)
            motorData.factor_potencia = datosMotor.factor_potencia;
          if (datosMotor.anio_fabricacion !== undefined)
            motorData.a_o_fabricacion = datosMotor.anio_fabricacion;
          if (datosMotor.observaciones !== undefined)
            motorData.observaciones = datosMotor.observaciones;

          updated.motor = await tx.equipos_motor.update({
            where: { id_equipo: idEquipo },
            data: motorData,
          });
        } else if (!desdeJsonModular) {
          throw new NotFoundException(
            `El equipo ${idEquipo} no tiene registro de motor. Créelo primero.`,
          );
        }
      }

      // 3. Actualizar GENERADOR si se proporcionan datos
      if (datosGenerador) {
        const genExiste = await tx.equipos_generador.findUnique({
          where: { id_equipo: idEquipo },
        });

        if (genExiste) {
          const genData: any = { modificado_por: userId, fecha_modificacion: new Date() };

          if (datosGenerador.marca_generador !== undefined)
            genData.marca_generador = datosGenerador.marca_generador;
          if (datosGenerador.modelo_generador !== undefined)
            genData.modelo_generador = datosGenerador.modelo_generador;
          if (datosGenerador.numero_serie_generador !== undefined)
            genData.numero_serie_generador = datosGenerador.numero_serie_generador;
          if (datosGenerador.marca_alternador !== undefined)
            genData.marca_alternador = datosGenerador.marca_alternador;
          if (datosGenerador.modelo_alternador !== undefined)
            genData.modelo_alternador = datosGenerador.modelo_alternador;
          if (datosGenerador.numero_serie_alternador !== undefined)
            genData.numero_serie_alternador = datosGenerador.numero_serie_alternador;
          if (datosGenerador.potencia_kw !== undefined)
            genData.potencia_kw = datosGenerador.potencia_kw;
          if (datosGenerador.potencia_kva !== undefined)
            genData.potencia_kva = datosGenerador.potencia_kva;
          if (datosGenerador.factor_potencia !== undefined)
            genData.factor_potencia = datosGenerador.factor_potencia;
          if (datosGenerador.voltaje_salida !== undefined)
            genData.voltaje_salida = datosGenerador.voltaje_salida;
          if (datosGenerador.numero_fases !== undefined)
            genData.numero_fases = datosGenerador.numero_fases;
          if (datosGenerador.frecuencia_hz !== undefined)
            genData.frecuencia_hz = datosGenerador.frecuencia_hz;
          if (datosGenerador.amperaje_nominal_salida !== undefined)
            genData.amperaje_nominal_salida = datosGenerador.amperaje_nominal_salida;
          if (datosGenerador.configuracion_salida !== undefined)
            genData.configuracion_salida = datosGenerador.configuracion_salida;
          if (datosGenerador.tiene_avr !== undefined) genData.tiene_avr = datosGenerador.tiene_avr;
          if (datosGenerador.marca_avr !== undefined) genData.marca_avr = datosGenerador.marca_avr;
          if (datosGenerador.modelo_avr !== undefined)
            genData.modelo_avr = datosGenerador.modelo_avr;
          if (datosGenerador.referencia_avr !== undefined)
            genData.referencia_avr = datosGenerador.referencia_avr;
          if (datosGenerador.tiene_modulo_control !== undefined)
            genData.tiene_modulo_control = datosGenerador.tiene_modulo_control;
          if (datosGenerador.marca_modulo_control !== undefined)
            genData.marca_modulo_control = datosGenerador.marca_modulo_control;
          if (datosGenerador.modelo_modulo_control !== undefined)
            genData.modelo_modulo_control = datosGenerador.modelo_modulo_control;
          if (datosGenerador.tiene_arranque_automatico !== undefined)
            genData.tiene_arranque_automatico = datosGenerador.tiene_arranque_automatico;
          if (datosGenerador.capacidad_tanque_principal_litros !== undefined)
            genData.capacidad_tanque_principal_litros =
              datosGenerador.capacidad_tanque_principal_litros;
          if (datosGenerador.tiene_tanque_auxiliar !== undefined)
            genData.tiene_tanque_auxiliar = datosGenerador.tiene_tanque_auxiliar;
          if (datosGenerador.capacidad_tanque_auxiliar_litros !== undefined)
            genData.capacidad_tanque_auxiliar_litros =
              datosGenerador.capacidad_tanque_auxiliar_litros;
          if (datosGenerador.clase_aislamiento !== undefined)
            genData.clase_aislamiento = datosGenerador.clase_aislamiento;
          if (datosGenerador.grado_proteccion_ip !== undefined)
            genData.grado_proteccion_ip = datosGenerador.grado_proteccion_ip;
          if (datosGenerador.anio_fabricacion !== undefined)
            genData.a_o_fabricacion = datosGenerador.anio_fabricacion;
          if (datosGenerador.observaciones !== undefined)
            genData.observaciones = datosGenerador.observaciones;

          updated.generador = await tx.equipos_generador.update({
            where: { id_equipo: idEquipo },
            data: genData,
          });
        } else if (!desdeJsonModular) {
          throw new NotFoundException(`El equipo ${idEquipo} no tiene registro de generador.`);
        }
      }

      // 4. Actualizar BOMBA si se proporcionan datos
      if (datosBomba) {
        const bombaExiste = await tx.equipos_bomba.findUnique({
          where: { id_equipo: idEquipo },
        });

        if (bombaExiste) {
          const bombaData: any = { modificado_por: userId, fecha_modificacion: new Date() };

          if (datosBomba.marca_bomba !== undefined) bombaData.marca_bomba = datosBomba.marca_bomba;
          if (datosBomba.modelo_bomba !== undefined)
            bombaData.modelo_bomba = datosBomba.modelo_bomba;
          if (datosBomba.numero_serie_bomba !== undefined)
            bombaData.numero_serie_bomba = datosBomba.numero_serie_bomba;
          if (datosBomba.tipo_bomba !== undefined)
            bombaData.tipo_bomba = datosBomba.tipo_bomba as any;
          if (datosBomba.aplicacion_bomba !== undefined)
            bombaData.aplicacion_bomba = datosBomba.aplicacion_bomba as any;
          if (datosBomba.diametro_aspiracion !== undefined)
            bombaData.diametro_aspiracion = datosBomba.diametro_aspiracion;
          if (datosBomba.diametro_descarga !== undefined)
            bombaData.diametro_descarga = datosBomba.diametro_descarga;
          if (datosBomba.caudal_maximo_m3h !== undefined)
            bombaData.caudal_maximo_m3h = datosBomba.caudal_maximo_m3h;
          if (datosBomba.altura_manometrica_maxima_m !== undefined)
            bombaData.altura_manometrica_maxima_m = datosBomba.altura_manometrica_maxima_m;
          if (datosBomba.altura_presion_trabajo_m !== undefined)
            bombaData.altura_presion_trabajo_m = datosBomba.altura_presion_trabajo_m;
          if (datosBomba.potencia_hidraulica_kw !== undefined)
            bombaData.potencia_hidraulica_kw = datosBomba.potencia_hidraulica_kw;
          if (datosBomba.eficiencia_porcentaje !== undefined)
            bombaData.eficiencia_porcentaje = datosBomba.eficiencia_porcentaje;
          if (datosBomba.numero_total_bombas_sistema !== undefined)
            bombaData.numero_total_bombas_sistema = datosBomba.numero_total_bombas_sistema;
          if (datosBomba.numero_bomba_en_sistema !== undefined)
            bombaData.numero_bomba_en_sistema = datosBomba.numero_bomba_en_sistema;
          if (datosBomba.tiene_panel_control !== undefined)
            bombaData.tiene_panel_control = datosBomba.tiene_panel_control;
          if (datosBomba.marca_panel_control !== undefined)
            bombaData.marca_panel_control = datosBomba.marca_panel_control;
          if (datosBomba.modelo_panel_control !== undefined)
            bombaData.modelo_panel_control = datosBomba.modelo_panel_control;
          if (datosBomba.tiene_presostato !== undefined)
            bombaData.tiene_presostato = datosBomba.tiene_presostato;
          if (datosBomba.marca_presostato !== undefined)
            bombaData.marca_presostato = datosBomba.marca_presostato;
          if (datosBomba.modelo_presostato !== undefined)
            bombaData.modelo_presostato = datosBomba.modelo_presostato;
          if (datosBomba.presion_encendido_psi !== undefined)
            bombaData.presion_encendido_psi = datosBomba.presion_encendido_psi;
          if (datosBomba.presion_apagado_psi !== undefined)
            bombaData.presion_apagado_psi = datosBomba.presion_apagado_psi;
          if (datosBomba.tiene_contactor_externo !== undefined)
            bombaData.tiene_contactor_externo = datosBomba.tiene_contactor_externo;
          if (datosBomba.marca_contactor !== undefined)
            bombaData.marca_contactor = datosBomba.marca_contactor;
          if (datosBomba.amperaje_contactor !== undefined)
            bombaData.amperaje_contactor = datosBomba.amperaje_contactor;
          if (datosBomba.tiene_arrancador_suave !== undefined)
            bombaData.tiene_arrancador_suave = datosBomba.tiene_arrancador_suave;
          if (datosBomba.tiene_variador_frecuencia !== undefined)
            bombaData.tiene_variador_frecuencia = datosBomba.tiene_variador_frecuencia;
          if (datosBomba.marca_variador !== undefined)
            bombaData.marca_variador = datosBomba.marca_variador;
          if (datosBomba.modelo_variador !== undefined)
            bombaData.modelo_variador = datosBomba.modelo_variador;
          if (datosBomba.tiene_tanques_hidroneumaticos !== undefined)
            bombaData.tiene_tanques_hidroneumaticos = datosBomba.tiene_tanques_hidroneumaticos;
          if (datosBomba.cantidad_tanques !== undefined)
            bombaData.cantidad_tanques = datosBomba.cantidad_tanques;
          if (datosBomba.capacidad_tanques_litros !== undefined)
            bombaData.capacidad_tanques_litros = datosBomba.capacidad_tanques_litros;
          if (datosBomba.presion_tanques_psi !== undefined)
            bombaData.presion_tanques_psi = datosBomba.presion_tanques_psi;
          if (datosBomba.tiene_manometro !== undefined)
            bombaData.tiene_manometro = datosBomba.tiene_manometro;
          if (datosBomba.rango_manometro_min_psi !== undefined)
            bombaData.rango_manometro_min_psi = datosBomba.rango_manometro_min_psi;
          if (datosBomba.rango_manometro_max_psi !== undefined)
            bombaData.rango_manometro_max_psi = datosBomba.rango_manometro_max_psi;
          if (datosBomba.tiene_proteccion_nivel !== undefined)
            bombaData.tiene_proteccion_nivel = datosBomba.tiene_proteccion_nivel;
          if (datosBomba.tipo_proteccion_nivel !== undefined)
            bombaData.tipo_proteccion_nivel = datosBomba.tipo_proteccion_nivel;
          if (datosBomba.tiene_valvula_purga !== undefined)
            bombaData.tiene_valvula_purga = datosBomba.tiene_valvula_purga;
          if (datosBomba.tiene_valvula_cebado !== undefined)
            bombaData.tiene_valvula_cebado = datosBomba.tiene_valvula_cebado;
          if (datosBomba.tiene_valvula_cheque !== undefined)
            bombaData.tiene_valvula_cheque = datosBomba.tiene_valvula_cheque;
          if (datosBomba.tiene_valvula_pie !== undefined)
            bombaData.tiene_valvula_pie = datosBomba.tiene_valvula_pie;
          if (datosBomba.referencia_sello_mecanico !== undefined)
            bombaData.referencia_sello_mecanico = datosBomba.referencia_sello_mecanico;
          if (datosBomba.anio_fabricacion !== undefined)
            bombaData.a_o_fabricacion = datosBomba.anio_fabricacion;
          if (datosBomba.observaciones !== undefined)
            bombaData.observaciones = datosBomba.observaciones;

          updated.bomba = await tx.equipos_bomba.update({
            where: { id_equipo: idEquipo },
            data: bombaData,
          });
        } else if (!desdeJsonModular) {
          throw new NotFoundException(`El equipo ${idEquipo} no tiene registro de bomba.`);
        }
      }

      // 5. Actualizar equipo padre (fecha_modificacion, especificaciones JSONB e id_modelo_equipo si aplica)
      const updateParentData: any = {
        modificado_por: userId,
        fecha_modificacion: new Date(),
      };
      if (dto.especificaciones !== undefined) {
        updateParentData.especificaciones =
          dto.especificaciones as unknown as Prisma.InputJsonValue;
        updated.especificaciones = dto.especificaciones;
      }
      if (dto.id_modelo_equipo !== undefined) {
        updateParentData.id_modelo_equipo = dto.id_modelo_equipo;
      }

      await tx.equipos.update({
        where: { id_equipo: idEquipo },
        data: updateParentData,
      });

      if (dto.id_modelo_equipo && dto.vincular_kit_bom) {
        updated.repuestos_bom_vinculados = await this.vincularKitBomDesdeModeloOem(
          idEquipo,
          Number(dto.id_modelo_equipo),
          userId,
          tx,
        );
      }

      return updated;
    });

    this.clientesService?.invalidateClientesCache();

    // ✅ EAM FASE 2 & 4: Proyección B-Tree y sincronización JSONB
    if (this.projectionService) {
      try {
        await this.projectionService.reconstruirJsonYProyectar(
          idEquipo,
          undefined,
          dto.especificaciones,
        );
      } catch {
        // No bloqueante
      }
    }

    return {
      success: true,
      message: 'Datos específicos actualizados exitosamente',
      data: resultado,
    };
  }

  /**
   * ✅ TRAZABILIDAD 360° / HOJA DE VIDA DEL EQUIPO:
   * Retorna todas las intervenciones de mantenimiento realizadas a la máquina
   */
  async getTrazabilidadServicios(idEquipo: number) {
    const equipo = await this.prisma.equipos.findUnique({
      where: { id_equipo: idEquipo },
      include: {
        tipos_equipo: true,
        clientes: {
          include: {
            persona: true,
          },
        },
      },
    });

    if (!equipo) {
      throw new NotFoundException(`Equipo con ID ${idEquipo} no encontrado`);
    }

    const ordenes = await this.prisma.ordenes_servicio.findMany({
      where: {
        OR: [
          { id_equipo: idEquipo },
          { ordenes_equipos: { some: { id_equipo: idEquipo } } },
        ],
      },
      orderBy: [{ fecha_programada: 'desc' }, { id_orden_servicio: 'desc' }],
      select: {
        id_orden_servicio: true,
        numero_orden: true,
        fecha_programada: true,
        fecha_inicio_real: true,
        fecha_fin_real: true,
        fecha_creacion: true,
        prioridad: true,
        descripcion_inicial: true,
        observaciones_tecnico: true,
        observaciones_cierre: true,
        trabajo_realizado: true,
        estados_orden: {
          select: {
            id_estado: true,
            codigo_estado: true,
            nombre_estado: true,
            color_hex: true,
          },
        },
        tipos_servicio: {
          select: {
            id_tipo_servicio: true,
            codigo_tipo: true,
            nombre_tipo: true,
            categoria: true,
            icono: true,
          },
        },
        empleados_ordenes_servicio_id_tecnico_asignadoToempleados: {
          select: {
            id_empleado: true,
            persona: {
              select: {
                nombre_completo: true,
                primer_nombre: true,
                primer_apellido: true,
              },
            },
          },
        },
        detalle_servicios_orden: {
          select: {
            id_detalle_servicio: true,
            cantidad: true,
            estado_servicio: true,
            precio_unitario: true,
            catalogo_servicios: {
              select: {
                id_servicio: true,
                codigo_servicio: true,
                nombre_servicio: true,
                categoria: true,
                duracion_estimada_horas: true,
              },
            },
          },
        },
        mediciones_servicio: {
          where: {
            OR: [{ id_orden_equipo: null }, { ordenes_equipos: { id_equipo: idEquipo } }],
          },
          select: {
            id_medicion: true,
            valor_numerico: true,
            valor_texto: true,
            unidad_medida: true,
            fuera_de_rango: true,
            nivel_alerta: true,
            parametros_medicion: {
              select: {
                nombre_parametro: true,
                unidad_medida: true,
              },
            },
          },
        },
        informes: {
          orderBy: { fecha_generacion: 'desc' },
          take: 1,
          select: {
            id_informe: true,
            numero_informe: true,
            fecha_generacion: true,
            documentos_generados: {
              select: {
                id_documento: true,
                ruta_archivo: true,
                tipo_documento: true,
              },
            },
          },
        },
      },
    });

    const intervenciones = ordenes.map((orden) => ({
      ...orden,
      diagnostico_tecnico: orden.observaciones_tecnico || orden.observaciones_cierre || null,
      mediciones_servicio: (orden.mediciones_servicio || []).map((m) => ({
        id_medicion: m.id_medicion,
        valor_medido:
          m.valor_numerico !== null && m.valor_numerico !== undefined
            ? Number(m.valor_numerico)
            : (m.valor_texto ?? ''),
        es_critico: m.nivel_alerta === 'CRITICO',
        fuera_de_rango: Boolean(m.fuera_de_rango),
        parametros_medicion: m.parametros_medicion
          ? {
              nombre_parametro: m.parametros_medicion.nombre_parametro,
              unidad_medida: m.unidad_medida || m.parametros_medicion.unidad_medida || '',
            }
          : undefined,
      })),
    }));

    return {
      equipo: {
        id_equipo: equipo.id_equipo,
        codigo_equipo: equipo.codigo_equipo,
        nombre_equipo: equipo.nombre_equipo,
        tipo: equipo.tipos_equipo?.codigo_tipo || 'GENERADOR',
        horas_actuales: equipo.horas_actuales,
        ubicacion_texto: equipo.ubicacion_texto,
        cliente_nombre:
          equipo.clientes?.persona?.nombre_comercial ||
          equipo.clientes?.persona?.razon_social ||
          equipo.clientes?.persona?.nombre_completo,
      },
      total_intervenciones: intervenciones.length,
      intervenciones,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPEDIENTE LOGÍSTICO 360° DEL ACTIVO: BOM + HISTORIAL WMS + ÓRDENES
  // ═══════════════════════════════════════════════════════════════════════════

  private static readonly BOM_APLICACIONES: Record<string, { label: string; tipo?: number }> = {
    FILTRO_ACEITE: { label: 'Filtro de Aceite', tipo: 3 },
    FILTRO_COMBUSTIBLE: { label: 'Filtro de Combustible', tipo: 2 },
    FILTRO_SEPARADOR_AGUA: { label: 'Filtro Separador de Agua', tipo: 4 },
    FILTRO_AIRE: { label: 'Filtro de Aire', tipo: 1 },
    LUBRICANTE_MOTOR: { label: 'Aceite de Motor', tipo: 11 },
    REFRIGERANTE: { label: 'Refrigerante', tipo: 12 },
    CORREA: { label: 'Correa', tipo: 5 },
    BATERIA: { label: 'Batería de Arranque', tipo: 7 },
    SELLO_MECANICO: { label: 'Sello Mecánico', tipo: 8 },
    RODAMIENTO: { label: 'Rodamiento / Cojinete', tipo: 10 },
    REPUESTO_GENERAL: { label: 'Repuesto General' },
  };

  private resolverStockPorBodega(componente: any) {
    const mapa = new Map<
      number,
      { id_ubicacion: number; codigo: string; nombre: string; stock: number }
    >();
    for (const lote of componente?.lotes_componentes || []) {
      const mov = lote.movimientos_inventario?.[0];
      const ubi = mov?.ubicaciones_bodega;
      const idUbi = ubi?.id_ubicacion ?? mov?.id_ubicacion ?? 1;
      const actual = mapa.get(idUbi) || {
        id_ubicacion: idUbi,
        codigo: ubi?.codigo_ubicacion || 'BOD-CENTRAL',
        nombre: ubi?.zona || 'Bodega Central Taller',
        stock: 0,
      };
      actual.stock += Number(lote.cantidad_actual ?? 0);
      mapa.set(idUbi, actual);
    }
    if (mapa.size === 0 && (componente?.stock_actual ?? 0) > 0) {
      mapa.set(1, {
        id_ubicacion: 1,
        codigo: 'BOD-CENTRAL',
        nombre: 'Bodega Central Taller',
        stock: Number(componente.stock_actual),
      });
    }
    return Array.from(mapa.values()).filter((b) => b.stock > 0);
  }

  private mapearBomItem(rel: any) {
    const c = rel.catalogo_componentes;
    const specs = (rel.especificaciones_adicionales || {}) as Record<string, any>;
    const stockActual = Number(c?.stock_actual ?? 0);
    const stockMinimo = Number(c?.stock_minimo ?? 0);
    const cantidadRequerida = Number(specs.cantidad_requerida ?? rel.unidades_por_cambio ?? 1);
    const faltante = Math.max(0, Math.round((cantidadRequerida - stockActual) * 100) / 100);

    let estadoStock: 'OK' | 'BAJO' | 'INSUFICIENTE' | 'AGOTADO';
    if (stockActual <= 0) {
      estadoStock = 'AGOTADO';
    } else if (stockActual < cantidadRequerida) {
      estadoStock = 'INSUFICIENTE';
    } else if (stockMinimo > 0 && stockActual <= stockMinimo) {
      estadoStock = 'BAJO';
    } else {
      estadoStock = 'OK';
    }

    const categoria = specs.categoria_aplicacion || 'REPUESTO_GENERAL';
    const esAlternativoPorNota = /alternativ|homolog|opcional|reemplazo/i.test(rel.notas || '');
    const rolRepuesto: 'TITULAR' | 'ALTERNATIVO' =
      specs.rol_repuesto === 'ALTERNATIVO' || (!specs.rol_repuesto && esAlternativoPorNota)
        ? 'ALTERNATIVO'
        : 'TITULAR';

    return {
      id_componente_equipo: rel.id_componente_equipo,
      id_componente: rel.id_componente,
      categoria_aplicacion: categoria,
      aplicacion_label:
        EquiposGestionService.BOM_APLICACIONES[categoria]?.label || rel.posicion_descripcion,
      posicion_descripcion: rel.posicion_descripcion,
      rol_repuesto: rolRepuesto,
      cantidad_requerida: cantidadRequerida,
      faltante,
      frecuencia_cambio_horas:
        specs.frecuencia_cambio_horas != null ? Number(specs.frecuencia_cambio_horas) : null,
      notas_tecnicas: rel.notas,
      fecha_ultimo_cambio: rel.fecha_ultimo_cambio,
      sku: c?.codigo_interno ?? null,
      referencia_fabricante: c?.referencia_fabricante ?? null,
      descripcion: c?.descripcion_corta ?? rel.referencia_manual ?? 'Artículo sin descripción',
      marca: c?.marca ?? rel.marca_manual ?? null,
      unidad: c?.unidad_medida ?? 'UND',
      precio_compra: Number(c?.precio_compra ?? 0),
      precio_venta: Number(c?.precio_venta ?? 0),
      stock_actual: stockActual,
      stock_minimo: stockMinimo,
      estado_stock: estadoStock,
      bodegas: c ? this.resolverStockPorBodega(c) : [],
    };
  }

  private static readonly BOM_INCLUDE = {
    catalogo_componentes: {
      include: {
        lotes_componentes: {
          where: { cantidad_actual: { gt: 0 } },
          include: {
            movimientos_inventario: {
              take: 1,
              orderBy: { fecha_movimiento: 'desc' as const },
              include: { ubicaciones_bodega: true },
            },
          },
        },
      },
    },
  };

  async getFichaLogistica(idEquipo: number) {
    const equipo = await this.prisma.equipos.findUnique({
      where: { id_equipo: idEquipo },
      select: { id_equipo: true, codigo_equipo: true },
    });
    if (!equipo) {
      throw new NotFoundException(`Equipo con ID ${idEquipo} no encontrado`);
    }

    const [bomRows, ordenes] = await Promise.all([
      this.prisma.componentes_equipo.findMany({
        where: { id_equipo: idEquipo, activo: { not: false } },
        include: EquiposGestionService.BOM_INCLUDE,
        orderBy: [{ posicion_descripcion: 'asc' }, { id_componente_equipo: 'asc' }],
      }),
      this.prisma.ordenes_servicio.findMany({
        where: {
          OR: [{ id_equipo: idEquipo }, { ordenes_equipos: { some: { id_equipo: idEquipo } } }],
        },
        orderBy: [{ fecha_programada: 'desc' }, { id_orden_servicio: 'desc' }],
        select: {
          id_orden_servicio: true,
          numero_orden: true,
          fecha_programada: true,
          fecha_creacion: true,
          fecha_fin_real: true,
          prioridad: true,
          total_general: true,
          estados_orden: { select: { codigo_estado: true, nombre_estado: true, color_hex: true } },
          tipos_servicio: { select: { nombre_tipo: true, categoria: true } },
          empleados_ordenes_servicio_id_tecnico_asignadoToempleados: {
            select: {
              persona: {
                select: { nombre_completo: true, primer_nombre: true, primer_apellido: true },
              },
            },
          },
        },
      }),
    ]);

    const idsOrdenes = ordenes.map((o) => o.id_orden_servicio);
    const usados = idsOrdenes.length
      ? await this.prisma.componentes_usados.findMany({
          where: { id_orden_servicio: { in: idsOrdenes } },
          orderBy: [{ fecha_uso: 'desc' }, { id_componente_usado: 'desc' }],
          include: {
            ordenes_servicio: { select: { numero_orden: true } },
            catalogo_componentes: {
              select: { codigo_interno: true, marca: true, referencia_fabricante: true },
            },
            ubicaciones_bodega: { select: { codigo_ubicacion: true, zona: true } },
            lotes_componentes: { select: { codigo_lote: true } },
          },
        })
      : [];

    const repuestosInstalados = usados.map((u) => ({
      id_componente_usado: u.id_componente_usado,
      fecha_uso: u.fecha_uso,
      id_orden_servicio: u.id_orden_servicio,
      numero_orden: u.ordenes_servicio?.numero_orden ?? null,
      id_componente: u.id_componente,
      sku: u.catalogo_componentes?.codigo_interno ?? null,
      descripcion: u.descripcion,
      marca: u.catalogo_componentes?.marca ?? u.marca_manual ?? null,
      cantidad: Number(u.cantidad ?? 0),
      unidad: u.unidad ?? 'UND',
      costo_unitario: Number(u.costo_unitario ?? 0),
      costo_total: Number(u.costo_total ?? 0),
      origen_componente: u.origen_componente,
      bodega_codigo: u.ubicaciones_bodega?.codigo_ubicacion ?? null,
      bodega_nombre: u.ubicaciones_bodega?.zona ?? null,
      codigo_lote: u.lotes_componentes?.codigo_lote ?? null,
      id_movimiento_inventario: u.id_movimiento_inventario,
    }));

    const bom = bomRows.map((r) => this.mapearBomItem(r));

    return {
      id_equipo: equipo.id_equipo,
      codigo_equipo: equipo.codigo_equipo,
      repuestos_compatibles: bom,
      repuestos_instalados: repuestosInstalados,
      ordenes: ordenes.map((o) => {
        const p = o.empleados_ordenes_servicio_id_tecnico_asignadoToempleados?.persona;
        return {
          id_orden_servicio: o.id_orden_servicio,
          numero_orden: o.numero_orden,
          fecha_programada: o.fecha_programada,
          fecha_creacion: o.fecha_creacion,
          fecha_fin_real: o.fecha_fin_real,
          prioridad: o.prioridad,
          total_general: Number(o.total_general ?? 0),
          estado_codigo: o.estados_orden?.codigo_estado ?? null,
          estado_nombre: o.estados_orden?.nombre_estado ?? null,
          estado_color: o.estados_orden?.color_hex ?? null,
          tipo_servicio: o.tipos_servicio?.nombre_tipo ?? null,
          categoria_servicio: o.tipos_servicio?.categoria ?? null,
          tecnico:
            p?.nombre_completo ||
            [p?.primer_nombre, p?.primer_apellido].filter(Boolean).join(' ') ||
            null,
        };
      }),
      resumen: {
        total_ordenes: ordenes.length,
        total_bom: bom.length,
        bom_titulares: bom.filter((b) => b.rol_repuesto !== 'ALTERNATIVO').length,
        bom_alternativos: bom.filter((b) => b.rol_repuesto === 'ALTERNATIVO').length,
        bom_en_bodega: bom.filter((b) => b.stock_actual > 0).length,
        bom_bajo_pedido: bom.filter((b) => b.stock_actual <= 0).length,
        bom_con_kit_completo: bom.filter((b) => b.stock_actual >= b.cantidad_requerida).length,
        bom_insuficientes: bom.filter(
          (b) => b.stock_actual > 0 && b.stock_actual < b.cantidad_requerida,
        ).length,
        bom_agotados: bom.filter((b) => b.estado_stock === 'AGOTADO').length,
        bom_bajo_minimo: bom.filter((b) => b.estado_stock === 'BAJO').length,
        total_lineas_instaladas: repuestosInstalados.length,
        total_unidades_instaladas: repuestosInstalados.reduce((s, r) => s + r.cantidad, 0),
        total_inversion_repuestos: repuestosInstalados.reduce((s, r) => s + r.costo_total, 0),
        ultimo_cambio: repuestosInstalados[0]?.fecha_uso ?? null,
      },
    };
  }

  async getComponentesCompatibles(idEquipo: number) {
    const rows = await this.prisma.componentes_equipo.findMany({
      where: { id_equipo: idEquipo, activo: { not: false } },
      include: EquiposGestionService.BOM_INCLUDE,
      orderBy: { id_componente_equipo: 'asc' },
    });
    return rows.map((r) => this.mapearBomItem(r));
  }

  async vincularComponenteCompatible(
    idEquipo: number,
    body: {
      id_componente?: number;
      categoria_aplicacion?: string;
      rol_repuesto?: 'TITULAR' | 'ALTERNATIVO';
      cantidad_requerida?: number;
      frecuencia_cambio_horas?: number | null;
      notas_tecnicas?: string | null;
    },
    userId: number,
  ) {
    const idComponente = Number(body?.id_componente);
    if (!Number.isInteger(idComponente) || idComponente <= 0) {
      throw new BadRequestException('Debe seleccionar un artículo del Catálogo Maestro');
    }
    const categoria =
      body?.categoria_aplicacion && EquiposGestionService.BOM_APLICACIONES[body.categoria_aplicacion]
        ? body.categoria_aplicacion
        : 'REPUESTO_GENERAL';
    const cantidad = Number(body?.cantidad_requerida ?? 1);
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      throw new BadRequestException('La cantidad requerida por servicio debe ser mayor a 0');
    }
    const frecuencia =
      body?.frecuencia_cambio_horas === null ||
      body?.frecuencia_cambio_horas === undefined ||
      (body.frecuencia_cambio_horas as any) === ''
        ? null
        : Number(body.frecuencia_cambio_horas);
    if (frecuencia !== null && (!Number.isFinite(frecuencia) || frecuencia <= 0)) {
      throw new BadRequestException('La frecuencia de cambio debe ser un número de horas mayor a 0');
    }

    const [equipo, componente, duplicado] = await Promise.all([
      this.prisma.equipos.findUnique({
        where: { id_equipo: idEquipo },
        select: { id_equipo: true },
      }),
      this.prisma.catalogo_componentes.findUnique({
        where: { id_componente: idComponente },
        select: {
          id_componente: true,
          id_tipo_componente: true,
          descripcion_corta: true,
          codigo_interno: true,
        },
      }),
      this.prisma.componentes_equipo.findFirst({
        where: { id_equipo: idEquipo, id_componente: idComponente, activo: { not: false } },
        select: { id_componente_equipo: true },
      }),
    ]);
    if (!equipo) throw new NotFoundException(`Equipo con ID ${idEquipo} no encontrado`);
    if (!componente)
      throw new NotFoundException(`Artículo ${idComponente} no existe en el Catálogo Maestro`);
    if (duplicado) {
      throw new ConflictException(
        `El artículo ${componente.codigo_interno} ya está vinculado al BOM de este equipo`,
      );
    }

    const aplicacion = EquiposGestionService.BOM_APLICACIONES[categoria];
    const notasRaw = body?.notas_tecnicas?.toString().trim() || null;
    const rolRepuesto: 'TITULAR' | 'ALTERNATIVO' =
      body?.rol_repuesto === 'ALTERNATIVO' ||
      (!body?.rol_repuesto && /alternativ|homolog|opcional|reemplazo/i.test(notasRaw || ''))
        ? 'ALTERNATIVO'
        : 'TITULAR';

    const creado = await this.prisma.componentes_equipo.create({
      data: {
        id_equipo: idEquipo,
        id_componente: idComponente,
        id_tipo_componente: aplicacion.tipo ?? componente.id_tipo_componente ?? 1,
        posicion_descripcion: aplicacion.label,
        unidades_por_cambio: Math.max(1, Math.ceil(cantidad)),
        especificaciones_adicionales: {
          categoria_aplicacion: categoria,
          rol_repuesto: rolRepuesto,
          cantidad_requerida: cantidad,
          frecuencia_cambio_horas: frecuencia,
        },
        notas: notasRaw,
        activo: true,
        creado_por: userId || 1,
      },
      include: EquiposGestionService.BOM_INCLUDE,
    });

    return this.mapearBomItem(creado);
  }

  async actualizarComponenteCompatible(
    idEquipo: number,
    idRelacion: number,
    body: {
      categoria_aplicacion?: string;
      rol_repuesto?: 'TITULAR' | 'ALTERNATIVO';
      cantidad_requerida?: number;
      frecuencia_cambio_horas?: number | null;
      notas_tecnicas?: string | null;
    },
    userId: number,
  ) {
    const rel = await this.prisma.componentes_equipo.findFirst({
      where: { id_componente_equipo: idRelacion, id_equipo: idEquipo, activo: { not: false } },
      include: { catalogo_componentes: true },
    });
    if (!rel) {
      throw new NotFoundException('El vínculo BOM no existe o ya fue desvinculado');
    }

    const specsActuales = (rel.especificaciones_adicionales || {}) as Record<string, any>;
    const categoria =
      body.categoria_aplicacion && EquiposGestionService.BOM_APLICACIONES[body.categoria_aplicacion]
        ? body.categoria_aplicacion
        : specsActuales.categoria_aplicacion || 'REPUESTO_GENERAL';

    const cantidad =
      body.cantidad_requerida !== undefined
        ? Number(body.cantidad_requerida)
        : Number(specsActuales.cantidad_requerida ?? rel.unidades_por_cambio ?? 1);
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      throw new BadRequestException('La cantidad requerida por servicio debe ser mayor a 0');
    }

    const frecuencia =
      body.frecuencia_cambio_horas !== undefined
        ? body.frecuencia_cambio_horas === null || (body.frecuencia_cambio_horas as any) === ''
          ? null
          : Number(body.frecuencia_cambio_horas)
        : specsActuales.frecuencia_cambio_horas != null
          ? Number(specsActuales.frecuencia_cambio_horas)
          : null;
    if (frecuencia !== null && (!Number.isFinite(frecuencia) || frecuencia <= 0)) {
      throw new BadRequestException('La frecuencia de cambio debe ser un número de horas mayor a 0');
    }

    const notasNuevas =
      body.notas_tecnicas !== undefined
        ? body.notas_tecnicas?.toString().trim() || null
        : rel.notas;
    const rolRepuesto: 'TITULAR' | 'ALTERNATIVO' = body.rol_repuesto
      ? body.rol_repuesto === 'ALTERNATIVO'
        ? 'ALTERNATIVO'
        : 'TITULAR'
      : specsActuales.rol_repuesto === 'ALTERNATIVO' ||
          (!specsActuales.rol_repuesto &&
            /alternativ|homolog|opcional|reemplazo/i.test(notasNuevas || ''))
        ? 'ALTERNATIVO'
        : 'TITULAR';

    const aplicacion = EquiposGestionService.BOM_APLICACIONES[categoria];
    const actualizado = await this.prisma.componentes_equipo.update({
      where: { id_componente_equipo: idRelacion },
      data: {
        id_tipo_componente: aplicacion?.tipo ?? rel.id_tipo_componente,
        posicion_descripcion: aplicacion?.label || rel.posicion_descripcion,
        unidades_por_cambio: Math.max(1, Math.ceil(cantidad)),
        especificaciones_adicionales: {
          ...specsActuales,
          categoria_aplicacion: categoria,
          rol_repuesto: rolRepuesto,
          cantidad_requerida: cantidad,
          frecuencia_cambio_horas: frecuencia,
        },
        notas: notasNuevas,
        modificado_por: userId || 1,
        fecha_modificacion: new Date(),
      },
      include: EquiposGestionService.BOM_INCLUDE,
    });

    return this.mapearBomItem(actualizado);
  }

  async desvincularComponenteCompatible(idEquipo: number, idRelacion: number, userId: number) {
    const rel = await this.prisma.componentes_equipo.findFirst({
      where: { id_componente_equipo: idRelacion, id_equipo: idEquipo, activo: { not: false } },
      select: { id_componente_equipo: true },
    });
    if (!rel) {
      throw new NotFoundException('El vínculo BOM no existe o ya fue desvinculado');
    }
    await this.prisma.componentes_equipo.update({
      where: { id_componente_equipo: idRelacion },
      data: {
        activo: false,
        fecha_desactivacion: new Date(),
        motivo_desactivacion: 'Desvinculado manualmente del BOM desde el portal',
        modificado_por: userId || 1,
        fecha_modificacion: new Date(),
      },
    });
    return { id_componente_equipo: idRelacion, desvinculado: true };
  }

  async getPendientesEquipo(idEquipo: number, estadoFiltro?: string) {
    const where: any = {
      OR: [
        { id_equipo: idEquipo },
        { ordenes_servicio: { id_equipo: idEquipo } },
        { ordenes_servicio: { ordenes_equipos: { some: { id_equipo: idEquipo } } } },
      ],
    };
    if (estadoFiltro && estadoFiltro !== 'TODOS') {
      where.estado = estadoFiltro;
    }

    const items = await this.prisma.ordenes_pendientes.findMany({
      where,
      orderBy: { fecha_creacion: 'desc' },
      include: {
        ordenes_servicio: {
          select: {
            id_orden_servicio: true,
            numero_orden: true,
            fecha_programada: true,
            estados_orden: {
              select: {
                nombre_estado: true,
                color_hex: true,
              },
            },
          },
        },
        ordenes_equipos: {
          select: {
            id_orden_equipo: true,
            orden_secuencia: true,
            nombre_sistema: true,
          },
        },
        orden_resolucion: {
          select: {
            id_orden_servicio: true,
            numero_orden: true,
            fecha_programada: true,
            tipo_visita: true,
            numero_visita_caso: true,
            estados_orden: {
              select: {
                nombre_estado: true,
                color_hex: true,
              },
            },
          },
        },
        catalogo_pendientes: true,
        empleados_ordenes_pendientes_creado_porToempleados: {
          include: {
            persona: {
              select: {
                nombre_completo: true,
                primer_nombre: true,
                primer_apellido: true,
              },
            },
          },
        },
        empleados_ordenes_pendientes_resuelto_porToempleados: {
          include: {
            persona: {
              select: {
                nombre_completo: true,
                primer_nombre: true,
                primer_apellido: true,
              },
            },
          },
        },
      },
    });

    const activos = items.filter((p) => p.estado === 'PENDIENTE' || p.estado === 'EN_GESTION');
    const resueltos = items.filter((p) => p.estado === 'RESUELTO');
    const cancelados = items.filter((p) => p.estado === 'CANCELADO');

    return {
      total: items.length,
      activosCount: activos.length,
      resueltosCount: resueltos.length,
      canceladosCount: cancelados.length,
      items,
    };
  }

  async obtenerFacetasDinamicas(tipo?: string) {
    let tipoDb: any = null;
    if (tipo && tipo.trim() !== '') {
      tipoDb = await this.prisma.tipos_equipo.findFirst({
        where: {
          OR: [
            { codigo_tipo: { equals: tipo.trim().toUpperCase(), mode: 'insensitive' } },
            { nombre_tipo: { contains: tipo.trim(), mode: 'insensitive' } },
          ],
        },
      });
    }

    const bloquesActivos = resolverBloquesActivos(tipo, tipoDb);

    const marcasFiltradas = FACETAS_MARCA_REGISTRO.filter((m) => bloquesActivos.includes(m.bloque));
    const valoresTrabajoFiltrados = FACETAS_VALOR_TRABAJO_REGISTRO.filter((v) =>
      bloquesActivos.includes(v.bloque),
    );

    const marcasConValores = await Promise.all(
      marcasFiltradas.map(async (def) => {
        try {
          let rows: any[] = [];
          if (def.tabla === 'equipos_motor') {
            rows = await this.prisma.equipos_motor.findMany({
              select: { [def.campo]: true },
              distinct: [def.campo as any],
            });
          } else if (def.tabla === 'equipos_generador') {
            rows = await this.prisma.equipos_generador.findMany({
              select: { [def.campo]: true },
              distinct: [def.campo as any],
            });
          } else if (def.tabla === 'equipos_bomba') {
            rows = await this.prisma.equipos_bomba.findMany({
              select: { [def.campo]: true },
              distinct: [def.campo as any],
            });
          }

          const valoresSugeridos = Array.from(
            new Set(
              rows
                .map((r) => r[def.campo]?.toString().trim())
                .filter(
                  (val) =>
                    !!val &&
                    val.toUpperCase() !== 'N/A' &&
                    val.toUpperCase() !== 'NULL' &&
                    val !== '0',
                ),
            ),
          ).sort((a, b) => a.localeCompare(b));

          return {
            ...def,
            valoresSugeridos,
          };
        } catch {
          return {
            ...def,
            valoresSugeridos: [],
          };
        }
      }),
    );

    return {
      tipo: tipo || null,
      bloquesActivos,
      marcas: marcasConValores,
      valoresTrabajo: valoresTrabajoFiltrados,
    };
  }
}
