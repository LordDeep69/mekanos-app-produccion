import { EstadoActividadEnum } from '../application/enums/estado-actividad.enum';

export class ResponseActividadDto {
  idActividadEjecutada: number;
  idOrdenServicio: number;
  idActividadCatalogo?: number;
  descripcionManual?: string;
  sistema?: string;
  ordenSecuencia?: number;
  estado?: EstadoActividadEnum;
  observaciones?: string;
  ejecutada?: boolean;
  fechaEjecucion?: Date;
  ejecutadaPor?: number;
  tiempoEjecucionMinutos?: number;
  requiereEvidencia?: boolean;
  evidenciaCapturada?: boolean;
  fechaRegistro?: Date;
  respuestaJson?: Record<string, unknown> | null;
  
  // Relaciones (NOMBRES EXACTOS Prisma)
  empleados?: {
    idEmpleado: number;
    codigoEmpleado: string;
    cargo: string;
    esTecnico: boolean;
  };
  
  catalogoActividades?: {
    idActividadCatalogo: number;
    codigoActividad: string;
    descripcionActividad: string;
    tipoActividad: string;
    idParametroMedicion?: number;
    tipoControlInput?: string;
    configInputJson?: unknown;
    rolSemantico?: string;
    naturalezaPersonalizada?: string;
  };
  
  ordenesServicio?: {
    idOrdenServicio: number;
    numeroOrden: string;
    idCliente: number;
    idEquipo: number;
  };
}
