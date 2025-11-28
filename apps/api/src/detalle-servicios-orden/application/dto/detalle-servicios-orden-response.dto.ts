import { EstadoDetalleServicioEnum } from '../enums/estado-detalle-servicio.enum';

export class DetalleServiciosOrdenResponseDto {
  idDetalleServicio: number;
  idOrdenServicio: number;
  idServicio: number;
  cantidad: number;
  idTecnicoEjecutor?: number;
  fechaInicioServicio?: Date;
  fechaFinServicio?: Date;
  duracionServicioMinutos?: number;
  precioUnitario: number;
  descuentoPorcentaje?: number;
  subtotal?: number;
  tieneGarantiaServicio?: boolean;
  mesesGarantiaServicio?: number;
  observaciones?: string;
  justificacionPrecio?: string;
  estadoServicio?: EstadoDetalleServicioEnum;
  fechaRegistro?: Date;
  registradoPor?: number;
  fechaModificacion?: Date;
  modificadoPor?: number;

  // Relaciones (opcional según include)
  orden?: {
    idOrdenServicio: number;
    numeroOrden: string;
    idCliente?: number;
    idEquipo?: number;
  };
  servicio?: {
    idServicio: number;
    codigoServicio: string;
    nombreServicio: string;
    descripcion?: string;
  };
  tecnico?: {
    idEmpleado: number;
    idPersona: number;
    nombreCompleto?: string;
  };
  registradoPorUsuario?: {
    idUsuario: number;
    email: string;
  };
  modificadoPorUsuario?: {
    idUsuario: number;
    email: string;
  };
}
