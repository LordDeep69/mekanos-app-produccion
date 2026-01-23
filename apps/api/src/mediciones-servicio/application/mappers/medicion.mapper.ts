import { Injectable } from '@nestjs/common';
import { empleados, mediciones_servicio, ordenes_servicio, parametros_medicion } from '@prisma/client';
import { ResponseMedicionDto } from '../../dto/response-medicion.dto';

/**
 * Mapper para mediciones_servicio - REFACTORIZADO
 * Tabla 10/14 - FASE 3 - camelCase
 * 17 campos + 3 relaciones + conversión Decimal
 */

@Injectable()
export class MedicionMapper {
  toDto(
    entity: mediciones_servicio & {
      empleados?: empleados | null;
      ordenes_servicio?: ordenes_servicio | null;
      parametros_medicion?: parametros_medicion | null;
    },
  ): ResponseMedicionDto {
    return {
      idMedicion: entity.id_medicion,
      idOrdenServicio: entity.id_orden_servicio,
      idParametroMedicion: entity.id_parametro_medicion,

      // ⚠️ Conversión Decimal a number con toNumber()
      valorNumerico: entity.valor_numerico
        ? Number(entity.valor_numerico)
        : undefined,
      valorTexto: entity.valor_texto ?? undefined,
      unidadMedida: entity.unidad_medida ?? undefined,

      fueraDeRango: entity.fuera_de_rango ?? undefined,
      nivelAlerta: entity.nivel_alerta as any,
      mensajeAlerta: entity.mensaje_alerta ?? undefined,
      observaciones: entity.observaciones ?? undefined,

      // ⚠️ Conversión Decimal a number
      temperaturaAmbiente: entity.temperatura_ambiente
        ? Number(entity.temperatura_ambiente)
        : undefined,
      humedadRelativa: entity.humedad_relativa
        ? Number(entity.humedad_relativa)
        : undefined,

      fechaMedicion: entity.fecha_medicion ?? undefined,
      medidoPor: entity.medido_por ?? undefined,
      instrumentoMedicion: entity.instrumento_medicion ?? undefined,
      fechaRegistro: entity.fecha_registro ?? undefined,

      // ======= RELACIONES ANIDADAS =======

      // ⚠️ empleados es PLURAL (consistente con Tabla 9)
      empleados: entity.empleados
        ? {
          idEmpleado: entity.empleados.id_empleado,
          codigoEmpleado: entity.empleados.codigo_empleado ?? '',
          cargo: String(entity.empleados.cargo),
          esTecnico: entity.empleados.es_tecnico ?? false,
        }
        : undefined,

      // ordenes_servicio singular
      ordenesServicio: entity.ordenes_servicio
        ? {
          idOrdenServicio: entity.ordenes_servicio.id_orden_servicio,
          numeroOrden: entity.ordenes_servicio.numero_orden,
          idCliente: entity.ordenes_servicio.id_cliente,
          idEquipo: entity.ordenes_servicio.id_equipo,
        }
        : undefined,

      // parametros_medicion singular
      parametrosMedicion: entity.parametros_medicion
        ? {
          idParametroMedicion: entity.parametros_medicion.id_parametro_medicion,
          codigoParametro: entity.parametros_medicion.codigo_parametro,
          nombreParametro: entity.parametros_medicion.nombre_parametro,
          unidadMedida: entity.parametros_medicion.unidad_medida,
          // ⚠️ Conversión Decimal a number para rangos NORMALES
          valorMinimoNormal: entity.parametros_medicion.valor_minimo_normal
            ? Number(entity.parametros_medicion.valor_minimo_normal)
            : undefined,
          valorMaximoNormal: entity.parametros_medicion.valor_maximo_normal
            ? Number(entity.parametros_medicion.valor_maximo_normal)
            : undefined,
          // ⚠️ Conversión Decimal a number para rangos CRÍTICOS
          valorMinimoCritico: entity.parametros_medicion.valor_minimo_critico
            ? Number(entity.parametros_medicion.valor_minimo_critico)
            : undefined,
          valorMaximoCritico: entity.parametros_medicion.valor_maximo_critico
            ? Number(entity.parametros_medicion.valor_maximo_critico)
            : undefined,
        }
        : undefined,
    };
  }
}
