import { Decimal } from '@prisma/client/runtime/library';
import { DetalleServiciosOrdenResponseDto } from '../application/dto/detalle-servicios-orden-response.dto';

export class DetalleServiciosOrdenMapper {
  static toCamelCase(entity: any): DetalleServiciosOrdenResponseDto {
    const dto: DetalleServiciosOrdenResponseDto = {
      idDetalleServicio: entity.id_detalle_servicio,
      idOrdenServicio: entity.id_orden_servicio,
      idServicio: entity.id_servicio,
      cantidad: entity.cantidad instanceof Decimal ? entity.cantidad.toNumber() : entity.cantidad,
      idTecnicoEjecutor: entity.id_tecnico_ejecutor ?? undefined,
      fechaInicioServicio: entity.fecha_inicio_servicio ?? undefined,
      fechaFinServicio: entity.fecha_fin_servicio ?? undefined,
      duracionServicioMinutos: entity.duracion_servicio_minutos ?? undefined,
      precioUnitario: entity.precio_unitario instanceof Decimal ? entity.precio_unitario.toNumber() : entity.precio_unitario,
      descuentoPorcentaje: entity.descuento_porcentaje instanceof Decimal ? entity.descuento_porcentaje.toNumber() : entity.descuento_porcentaje,
      subtotal: entity.subtotal instanceof Decimal ? entity.subtotal.toNumber() : entity.subtotal,
      tieneGarantiaServicio: entity.tiene_garantia_servicio ?? undefined,
      mesesGarantiaServicio: entity.meses_garantia_servicio ?? undefined,
      observaciones: entity.observaciones ?? undefined,
      justificacionPrecio: entity.justificacion_precio ?? undefined,
      estadoServicio: entity.estado_servicio ?? undefined,
      fechaRegistro: entity.fecha_registro ?? undefined,
      registradoPor: entity.registrado_por ?? undefined,
      fechaModificacion: entity.fecha_modificacion ?? undefined,
      modificadoPor: entity.modificado_por ?? undefined,
    };

    // ✅ Mapear relaciones si existen
    if (entity.orden) {
      dto.orden = {
        idOrdenServicio: entity.orden.id_orden_servicio,
        numeroOrden: entity.orden.numero_orden,
        idCliente: entity.orden.id_cliente ?? undefined,
        idEquipo: entity.orden.id_equipo ?? undefined,
      };
    }

    if (entity.servicio) {
      dto.servicio = {
        idServicio: entity.servicio.id_servicio,
        codigoServicio: entity.servicio.codigo_servicio,
        nombreServicio: entity.servicio.nombre_servicio,
        descripcion: entity.servicio.descripcion ?? undefined,
      };
    }

    if (entity.tecnico) {
      dto.tecnico = {
        idEmpleado: entity.tecnico.id_empleado,
        idPersona: entity.tecnico.id_persona,
        nombreCompleto: entity.tecnico.persona?.nombre_completo ?? undefined,
      };
    }

    // ✅ Nombres EXACTOS de relaciones (60 caracteres)
    if (entity.usuarios_detalle_servicios_orden_registrado_porTousuarios) {
      dto.registradoPorUsuario = {
        idUsuario: entity.usuarios_detalle_servicios_orden_registrado_porTousuarios.id_usuario,
        email: entity.usuarios_detalle_servicios_orden_registrado_porTousuarios.email,
      };
    }

    if (entity.usuarios_detalle_servicios_orden_modificado_porTousuarios) {
      dto.modificadoPorUsuario = {
        idUsuario: entity.usuarios_detalle_servicios_orden_modificado_porTousuarios.id_usuario,
        email: entity.usuarios_detalle_servicios_orden_modificado_porTousuarios.email,
      };
    }

    return dto;
  }
}
