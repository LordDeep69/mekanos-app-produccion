import { catalogo_actividades } from '@prisma/client';
import {
  PropagarActividadBancoDto,
  ReordenarActividadesLoteDto,
  VincularActividadesLoteDto,
} from '../application/dto/fase59-actividades.dto';

export interface CatalogoActividadesFilterParams {
  skip?: number;
  take?: number;
  activo?: boolean | 'all';
  tipoServicioId?: number;
  tipoEquipoId?: number;
  sistemaId?: number;
  soloPlantillas?: boolean;
  tipoActividad?: string;
  search?: string;
}

export interface CatalogoActividadesRepository {
  create(data: any): Promise<catalogo_actividades>;
  update(id: number, data: any): Promise<catalogo_actividades>;
  softDelete(id: number, modificadoPor: number): Promise<catalogo_actividades>;
  findAll(skip?: number, take?: number): Promise<{ data: catalogo_actividades[]; total: number }>;
  findActive(skip?: number, take?: number): Promise<{ data: catalogo_actividades[]; total: number }>;
  findFiltered(params: CatalogoActividadesFilterParams): Promise<{ data: catalogo_actividades[]; total: number }>;
  findById(id: number): Promise<catalogo_actividades | null>;
  findByCodigo(codigo: string): Promise<catalogo_actividades | null>;
  existsTipoServicio(id: number): Promise<boolean>;
  existsTipoEquipo(id: number): Promise<boolean>;
  existsSistema(id: number): Promise<boolean>;
  existsParametroMedicion(id: number): Promise<boolean>;
  existsTipoComponente(id: number): Promise<boolean>;
  getMaxOrdenPorServicio(idTipoServicio?: number | null): Promise<number>;
  vincularLote(dto: VincularActividadesLoteDto, userId: number): Promise<{
    createdCount: number;
    skippedCount: number;
    created: catalogo_actividades[];
  }>;
  reordenarLote(dto: ReordenarActividadesLoteDto, userId: number): Promise<{
    updatedCount: number;
  }>;
  propagarCambios(dto: PropagarActividadBancoDto, userId: number): Promise<{
    origin: catalogo_actividades;
    propagatedCount: number;
    affectedServiceIds: number[];
  }>;
}
