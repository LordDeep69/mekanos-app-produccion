import { catalogo_actividades } from '@prisma/client';

export interface CatalogoActividadesRepository {
  create(data: any): Promise<catalogo_actividades>;
  update(id: number, data: any): Promise<catalogo_actividades>;
  softDelete(id: number, modificadoPor: number): Promise<catalogo_actividades>;
  findAll(skip?: number, take?: number): Promise<{ data: catalogo_actividades[]; total: number }>;
  findActive(skip?: number, take?: number): Promise<{ data: catalogo_actividades[]; total: number }>;
  findById(id: number): Promise<catalogo_actividades | null>;
  findByCodigo(codigo: string): Promise<catalogo_actividades | null>;
  existsTipoServicio(id: number): Promise<boolean>;
  existsSistema(id: number): Promise<boolean>;
  existsParametroMedicion(id: number): Promise<boolean>;
  existsTipoComponente(id: number): Promise<boolean>;
}
