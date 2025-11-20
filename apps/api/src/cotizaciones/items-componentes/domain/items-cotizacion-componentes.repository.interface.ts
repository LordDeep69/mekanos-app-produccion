// Repository Interface - Items Cotización Componentes

import { ItemCotizacionComponente } from './item-cotizacion-componente.entity';

export interface ItemsCotizacionComponentesRepository {
  save(
    data: Partial<ItemCotizacionComponente>,
  ): Promise<ItemCotizacionComponente>;

  findById(
    id: number,
    includeRelations?: {
      includeCotizacion?: boolean;
      includeComponente?: boolean;
      includeTipoComponente?: boolean;
      includeUsuario?: boolean;
    },
  ): Promise<ItemCotizacionComponente | null>;

  findByCotizacionId(
    idCotizacion: number,
    includeRelations?: {
      includeComponente?: boolean;
      includeTipoComponente?: boolean;
      includeUsuario?: boolean;
    },
  ): Promise<ItemCotizacionComponente[]>;

  update(
    id: number,
    data: Partial<ItemCotizacionComponente>,
  ): Promise<ItemCotizacionComponente>;

  delete(id: number): Promise<void>;

  calcularSubtotalComponentes(idCotizacion: number): Promise<number>;
}
