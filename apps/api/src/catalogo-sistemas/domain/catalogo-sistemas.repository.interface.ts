import { catalogo_sistemas } from '@prisma/client';

export interface ICatalogoSistemasRepository {
  // Consultas básicas
  findAll(page: number, limit: number): Promise<{ data: catalogo_sistemas[]; total: number }>;
  findActivos(): Promise<catalogo_sistemas[]>;
  findById(id: number): Promise<catalogo_sistemas | null>;
  findByCodigo(codigo: string): Promise<catalogo_sistemas | null>;
  findByOrden(orden: number): Promise<catalogo_sistemas | null>;

  // Operaciones CRUD
  create(data: any): Promise<catalogo_sistemas>;
  update(id: number, data: any): Promise<catalogo_sistemas>;
  softDelete(id: number): Promise<catalogo_sistemas>;
}
