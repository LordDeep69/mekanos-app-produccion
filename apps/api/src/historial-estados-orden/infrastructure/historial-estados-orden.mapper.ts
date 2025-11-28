export class HistorialEstadosOrdenMapper {
  static toResponse(historial: any): any {
    return {
      idHistorial: historial.id_historial,
      idOrdenServicio: historial.id_orden_servicio,
      idEstadoAnterior: historial.id_estado_anterior,
      idEstadoNuevo: historial.id_estado_nuevo,
      motivoCambio: historial.motivo_cambio,
      observaciones: historial.observaciones,
      accion: historial.accion,
      fechaCambio: historial.fecha_cambio,
      realizadoPor: historial.realizado_por,
      ipOrigen: historial.ip_origen,
      userAgent: historial.user_agent,
      duracionEstadoAnteriorMinutos: historial.duracion_estado_anterior_minutos,
      metadata: historial.metadata,
      // Relaciones
      ...(historial.ordenes_servicio && {
        orden: {
          idOrdenServicio: historial.ordenes_servicio.id_orden_servicio,
          numeroOrden: historial.ordenes_servicio.numero_orden,
          ...(historial.ordenes_servicio.id_cliente !== undefined && {
            idCliente: historial.ordenes_servicio.id_cliente,
          }),
          ...(historial.ordenes_servicio.id_equipo !== undefined && {
            idEquipo: historial.ordenes_servicio.id_equipo,
          }),
        },
      }),
      ...(historial.estados_orden_historial_estados_orden_id_estado_anteriorToestados_orden && {
        estadoAnterior: {
          idEstado:
            historial
              .estados_orden_historial_estados_orden_id_estado_anteriorToestados_orden
              .id_estado,
          codigoEstado:
            historial
              .estados_orden_historial_estados_orden_id_estado_anteriorToestados_orden
              .codigo_estado,
          nombreEstado:
            historial
              .estados_orden_historial_estados_orden_id_estado_anteriorToestados_orden
              .nombre_estado,
          colorHex:
            historial
              .estados_orden_historial_estados_orden_id_estado_anteriorToestados_orden
              .color_hex,
        },
      }),
      ...(historial.estados_orden_historial_estados_orden_id_estado_nuevoToestados_orden && {
        estadoNuevo: {
          idEstado:
            historial
              .estados_orden_historial_estados_orden_id_estado_nuevoToestados_orden
              .id_estado,
          codigoEstado:
            historial
              .estados_orden_historial_estados_orden_id_estado_nuevoToestados_orden
              .codigo_estado,
          nombreEstado:
            historial
              .estados_orden_historial_estados_orden_id_estado_nuevoToestados_orden
              .nombre_estado,
          colorHex:
            historial
              .estados_orden_historial_estados_orden_id_estado_nuevoToestados_orden
              .color_hex,
        },
      }),
      ...(historial.usuarios && {
        usuarioRealizador: {
          idUsuario: historial.usuarios.id_usuario,
          email: historial.usuarios.email,
        },
      }),
    };
  }
}
