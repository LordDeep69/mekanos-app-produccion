import { Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { ResponseGastoOrdenDto } from '../../dto/response-gasto-orden.dto';

/**
 * Mapper: Entidad de base de datos a DTO de respuesta
 * Tabla 13/14 - FASE 3
 */
@Injectable()
export class GastoOrdenMapper {
  toDto(entity: any): ResponseGastoOrdenDto {
    const dto = new ResponseGastoOrdenDto();

    dto.idGasto = entity.id_gasto;
    dto.idOrdenServicio = entity.id_orden_servicio;
    dto.tipoGasto = entity.tipo_gasto;
    dto.descripcion = entity.descripcion;
    dto.justificacion = entity.justificacion;
    
    // Conversión Decimal a Number
    dto.valor = entity.valor instanceof Decimal 
      ? entity.valor.toNumber() 
      : Number(entity.valor);

    dto.tieneComprobante = entity.tiene_comprobante;
    dto.numeroComprobante = entity.numero_comprobante;
    dto.proveedor = entity.proveedor;
    dto.rutaComprobante = entity.ruta_comprobante;
    dto.requiereAprobacion = entity.requiere_aprobacion;
    dto.estadoAprobacion = entity.estado_aprobacion;
    dto.observacionesAprobacion = entity.observaciones_aprobacion;
    dto.fechaGasto = entity.fecha_gasto;
    dto.generadoPor = entity.generado_por;
    dto.aprobadoPor = entity.aprobado_por;
    dto.fechaAprobacion = entity.fecha_aprobacion;
    dto.observaciones = entity.observaciones;
    dto.registradoPor = entity.registrado_por;
    dto.fechaRegistro = entity.fecha_registro;
    dto.modificadoPor = entity.modificado_por;
    dto.fechaModificacion = entity.fecha_modificacion;

    // Relación con ordenes_servicio
    if (entity.ordenes_servicio) {
      dto.ordenServicio = {
        idOrdenServicio: entity.ordenes_servicio.id_orden_servicio,
        numeroOrden: entity.ordenes_servicio.numero_orden,
        fechaProgramada: entity.ordenes_servicio.fecha_programada,
      };
    }

    // Relación con empleados (generadoPor)
    if (entity.empleados) {
      dto.empleado = {
        idEmpleado: entity.empleados.id_empleado,
        codigoEmpleado: entity.empleados.codigo_empleado,
      };
    }

    // Relación con usuarios (aprobadoPor)
    // Prisma usa nombre largo: usuarios_gastos_orden_aprobado_porTousuarios
    const usuarioAprobador = entity.usuarios_gastos_orden_aprobado_porTousuarios || entity.usuarios;
    if (usuarioAprobador) {
      dto.usuarioAprobador = {
        idUsuario: usuarioAprobador.id_usuario,
        nombreUsuario: usuarioAprobador.username,
      };
    }

    return dto;
  }
}
