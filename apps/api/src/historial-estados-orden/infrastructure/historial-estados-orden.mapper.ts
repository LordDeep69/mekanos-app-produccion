export class HistorialEstadosOrdenMapper {
  static toResponse(historial: any): any {
    const estadoAntObj = historial.estados_orden_historial_estados_orden_id_estado_anteriorToestados_orden;
    const estadoNuevoObj = historial.estados_orden_historial_estados_orden_id_estado_nuevoToestados_orden;

    return {
      idHistorial: historial.id_historial,
      id_historial: historial.id_historial,
      idOrdenServicio: historial.id_orden_servicio,
      id_orden_servicio: historial.id_orden_servicio,
      idEstadoAnterior: historial.id_estado_anterior,
      id_estado_anterior: historial.id_estado_anterior,
      idEstadoNuevo: historial.id_estado_nuevo,
      id_estado_nuevo: historial.id_estado_nuevo,
      estado_anterior: estadoAntObj?.codigo_estado || estadoAntObj?.nombre_estado || null,
      estado_nuevo: estadoNuevoObj?.codigo_estado || estadoNuevoObj?.nombre_estado || 'PROGRAMADA',
      motivoCambio: historial.motivo_cambio,
      motivo_cambio: historial.motivo_cambio,
      motivo: historial.motivo_cambio || historial.observaciones || null,
      observaciones: historial.observaciones,
      accion: historial.accion,
      fechaCambio: historial.fecha_cambio,
      fecha_cambio: historial.fecha_cambio,
      realizadoPor: historial.realizado_por,
      realizado_por: historial.realizado_por,
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
      ...(estadoAntObj && {
        estadoAnterior: {
          idEstado: estadoAntObj.id_estado,
          codigoEstado: estadoAntObj.codigo_estado,
          nombreEstado: estadoAntObj.nombre_estado,
          colorHex: estadoAntObj.color_hex,
        },
      }),
      ...(estadoNuevoObj && {
        estadoNuevo: {
          idEstado: estadoNuevoObj.id_estado,
          codigoEstado: estadoNuevoObj.codigo_estado,
          nombreEstado: estadoNuevoObj.nombre_estado,
          colorHex: estadoNuevoObj.color_hex,
        },
      }),
      ...(historial.usuarios && {
        usuarioRealizador: {
          idUsuario: historial.usuarios.id_usuario,
          email: historial.usuarios.email,
        },
        usuario: {
          id_usuario: historial.usuarios.id_usuario,
          nombre: historial.usuarios.nombre || historial.usuarios.email,
          email: historial.usuarios.email,
        },
      }),
    };
  }
}
