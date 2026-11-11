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
      precioUnitario:
        entity.precio_unitario instanceof Decimal
          ? entity.precio_unitario.toNumber()
          : entity.precio_unitario,
      descuentoPorcentaje:
        entity.descuento_porcentaje instanceof Decimal
          ? entity.descuento_porcentaje.toNumber()
          : entity.descuento_porcentaje,
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

    // ✅ Mapear relaciones si existen (soporta nombres Prisma y alias legacy)
    const ordenRel = entity.ordenes_servicio || entity.orden;
    if (ordenRel) {
      dto.orden = {
        idOrdenServicio: ordenRel.id_orden_servicio,
        numeroOrden: ordenRel.numero_orden,
        idCliente: ordenRel.id_cliente ?? undefined,
        idEquipo: ordenRel.id_equipo ?? undefined,
      };
    }

    const servicioRel = entity.catalogo_servicios || entity.servicio;
    if (servicioRel) {
      dto.servicio = {
        idServicio: servicioRel.id_servicio,
        codigoServicio: servicioRel.codigo_servicio,
        nombreServicio: servicioRel.nombre_servicio,
        descripcion: servicioRel.descripcion ?? undefined,
      };
    }

    const tecnicoRel = entity.empleados || entity.tecnico;
    if (tecnicoRel) {
      dto.tecnico = {
        idEmpleado: tecnicoRel.id_empleado,
        idPersona: tecnicoRel.id_persona,
        nombreCompleto: tecnicoRel.persona?.nombre_completo ?? undefined,
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
