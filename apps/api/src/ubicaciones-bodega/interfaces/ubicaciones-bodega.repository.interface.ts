export interface IUbicacionesBodegaRepository {
  crear(data: CrearUbicacionData): Promise<UbicacionBodega>;
  actualizar(id: number, data: ActualizarUbicacionData): Promise<UbicacionBodega>;
  desactivar(id: number): Promise<UbicacionBodega>;
  findAll(filtros: FiltrosUbicacion): Promise<UbicacionesPaginadas>;
  findById(id: number): Promise<UbicacionBodega | null>;
  findByCodigo(codigo: string): Promise<UbicacionBodega | null>;
}

export interface UbicacionBodega {
  id_ubicacion: number;
  codigo_ubicacion: string;
  zona: string;
  pasillo: string | null;
  estante: string | null;
  nivel: string | null;
  activo: boolean;
}

export interface CrearUbicacionData {
  codigo_ubicacion: string;
  zona: string;
  pasillo?: string;
  estante?: string;
  nivel?: string;
}

export interface ActualizarUbicacionData {
  codigo_ubicacion?: string;
  zona?: string;
  pasillo?: string;
  estante?: string;
  nivel?: string;
  activo?: boolean;
}

export interface FiltrosUbicacion {
  zona?: string;
  activo?: boolean;
  page?: number;
  limit?: number;
}

export interface UbicacionesPaginadas {
  data: UbicacionBodega[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
