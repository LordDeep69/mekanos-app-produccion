import { catalogo_actividades } from '@prisma/client';
import { CatalogoActividadesResponseDto } from '../application/dto/catalogo-actividades-response.dto';

export class CatalogoActividadesMapper {
  static toCamelCase(
    entity: catalogo_actividades & {
      tipos_servicio?: any;
      catalogo_sistemas?: any;
      parametros_medicion?: any;
      tipos_componente?: any;
      usuarios_catalogo_actividades_creado_porTousuarios?: any;
      usuarios_catalogo_actividades_modificado_porTousuarios?: any;
    },
  ): CatalogoActividadesResponseDto {
    return {
      idActividadCatalogo: entity.id_actividad_catalogo,
      codigoActividad: entity.codigo_actividad,
      descripcionActividad: entity.descripcion_actividad,
      idTipoServicio: entity.id_tipo_servicio,
      idSistema: entity.id_sistema,
      tipoActividad: entity.tipo_actividad as any,
      ordenEjecucion: entity.orden_ejecucion,
      esObligatoria: entity.es_obligatoria ?? true,
      tiempoEstimadoMinutos: entity.tiempo_estimado_minutos,
      idParametroMedicion: entity.id_parametro_medicion,
      idTipoComponente: entity.id_tipo_componente,
      instrucciones: entity.instrucciones,
      precauciones: entity.precauciones,
      activo: entity.activo ?? true,
      observaciones: entity.observaciones,
      creadoPor: entity.creado_por,
      fechaCreacion: entity.fecha_creacion ?? new Date(),
      modificadoPor: entity.modificado_por,
      fechaModificacion: entity.fecha_modificacion,

      // Relaciones
      tipoServicio: entity.tipos_servicio
        ? {
            idTipoServicio: entity.tipos_servicio.id_tipo_servicio,
            codigoTipoServicio: entity.tipos_servicio.codigo_tipo,
            nombreTipoServicio: entity.tipos_servicio.nombre_tipo,
            aplicaA:
              entity.tipos_servicio.aplica_a ??
              (entity.tipos_servicio.tipos_equipo?.codigo_tipo
                ? [entity.tipos_servicio.tipos_equipo.codigo_tipo]
                : null),
            idTipoEquipo: entity.tipos_servicio.id_tipo_equipo ?? null,
            categoria: entity.tipos_servicio.categoria ?? null,
          }
        : undefined,

      sistema: entity.catalogo_sistemas
        ? {
            idSistema: entity.catalogo_sistemas.id_sistema,
            codigoSistema: entity.catalogo_sistemas.codigo_sistema,
            nombreSistema: entity.catalogo_sistemas.nombre_sistema,
            aplicaA: entity.catalogo_sistemas.aplica_a ?? null,
          }
        : undefined,

      parametroMedicion: entity.parametros_medicion
        ? {
            idParametroMedicion: entity.parametros_medicion.id_parametro_medicion,
            codigoParametro: entity.parametros_medicion.codigo_parametro,
            nombreParametro: entity.parametros_medicion.nombre_parametro,
            unidadMedida: entity.parametros_medicion.unidad_medida ?? null,
            valorMinimoNormal:
              entity.parametros_medicion.valor_minimo_normal != null
                ? Number(entity.parametros_medicion.valor_minimo_normal)
                : null,
            valorMaximoNormal:
              entity.parametros_medicion.valor_maximo_normal != null
                ? Number(entity.parametros_medicion.valor_maximo_normal)
                : null,
            valorMinimoCritico:
              entity.parametros_medicion.valor_minimo_critico != null
                ? Number(entity.parametros_medicion.valor_minimo_critico)
                : null,
            valorMaximoCritico:
              entity.parametros_medicion.valor_maximo_critico != null
                ? Number(entity.parametros_medicion.valor_maximo_critico)
                : null,
            valorIdeal:
              entity.parametros_medicion.valor_ideal != null
                ? Number(entity.parametros_medicion.valor_ideal)
                : null,
            idTipoEquipo: entity.parametros_medicion.id_tipo_equipo ?? null,
          }
        : undefined,
    };
  }

  static toSnakeCase(dto: any): any {
    return {
      codigo_actividad: dto.codigoActividad?.toUpperCase().trim(),
      descripcion_actividad: dto.descripcionActividad,
      id_tipo_servicio: dto.idTipoServicio,
      id_sistema: dto.idSistema,
      tipo_actividad: dto.tipoActividad,
      orden_ejecucion: dto.ordenEjecucion,
      es_obligatoria: dto.esObligatoria ?? true,
      tiempo_estimado_minutos: dto.tiempoEstimadoMinutos,
      id_parametro_medicion: dto.idParametroMedicion,
      id_tipo_componente: dto.idTipoComponente,
      instrucciones: dto.instrucciones,
      precauciones: dto.precauciones,
      activo: dto.activo ?? true,
      observaciones: dto.observaciones,
      creado_por: dto.creadoPor,
      modificado_por: dto.modificadoPor,
    };
  }
}
