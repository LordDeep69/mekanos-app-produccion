import { DetalleServiciosOrdenResponseDto } from '../application/dto/detalle-servicios-orden-response.dto';

export interface IDetalleServiciosOrdenRepository {
  crear(data: any): Promise<DetalleServiciosOrdenResponseDto>;
  actualizar(id: number, data: any): Promise<DetalleServiciosOrdenResponseDto>;
  encontrarPorId(id: number): Promise<DetalleServiciosOrdenResponseDto | null>;
  encontrarPorIdDetallado(id: number): Promise<DetalleServiciosOrdenResponseDto | null>;
  verificarPorId(id: number): Promise<DetalleServiciosOrdenResponseDto | null>;
  listar(skip: number, take: number): Promise<DetalleServiciosOrdenResponseDto[]>;
  listarPorOrden(idOrdenServicio: number, skip: number, take: number): Promise<DetalleServiciosOrdenResponseDto[]>;
  contar(): Promise<number>;
  contarPorOrden(idOrdenServicio: number): Promise<number>;
}
