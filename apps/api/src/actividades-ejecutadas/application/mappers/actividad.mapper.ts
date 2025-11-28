import { Injectable } from '@nestjs/common';
import { actividades_ejecutadas } from '@prisma/client';
import { ResponseActividadDto } from '../../dto/response-actividad.dto';
import { EstadoActividadEnum } from '../enums/estado-actividad.enum';

@Injectable()
export class ActividadMapper {
  toDto(entity: actividades_ejecutadas & {
    empleados?: any;
    catalogo_actividades?: any;
    ordenes_servicio?: any;
  }): ResponseActividadDto {
    return {
      idActividadEjecutada: entity.id_actividad_ejecutada,
      idOrdenServicio: entity.id_orden_servicio,
      idActividadCatalogo: entity.id_actividad_catalogo ?? undefined,
      descripcionManual: entity.descripcion_manual ?? undefined,
      sistema: entity.sistema ?? undefined,
      ordenSecuencia: entity.orden_secuencia ?? undefined,
      estado: entity.estado as EstadoActividadEnum | undefined,
      observaciones: entity.observaciones ?? undefined,
      ejecutada: entity.ejecutada ?? undefined,
      fechaEjecucion: entity.fecha_ejecucion ?? undefined,
      ejecutadaPor: entity.ejecutada_por ?? undefined,
      tiempoEjecucionMinutos: entity.tiempo_ejecucion_minutos ?? undefined,
      requiereEvidencia: entity.requiere_evidencia ?? undefined,
      evidenciaCapturada: entity.evidencia_capturada ?? undefined,
      fechaRegistro: entity.fecha_registro ?? undefined,
      
      empleados: entity.empleados ? {
        idEmpleado: entity.empleados.id_empleado,
        codigoEmpleado: entity.empleados.codigo_empleado,
        cargo: entity.empleados.cargo,
        esTecnico: entity.empleados.es_tecnico,
      } : undefined,
      
      catalogoActividades: entity.catalogo_actividades ? {
        idActividadCatalogo: entity.catalogo_actividades.id_actividad_catalogo,
        codigoActividad: entity.catalogo_actividades.codigo_actividad,
        descripcionActividad: entity.catalogo_actividades.descripcion_actividad,
        tipoActividad: entity.catalogo_actividades.tipo_actividad,
      } : undefined,
      
      ordenesServicio: entity.ordenes_servicio ? {
        idOrdenServicio: entity.ordenes_servicio.id_orden_servicio,
        numeroOrden: entity.ordenes_servicio.numero_orden,
        idCliente: entity.ordenes_servicio.id_cliente,
        idEquipo: entity.ordenes_servicio.id_equipo,
      } : undefined,
    };
  }
}
