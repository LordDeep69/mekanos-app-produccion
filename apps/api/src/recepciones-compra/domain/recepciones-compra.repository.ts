import { recepciones_compra } from '@prisma/client';

export interface CreateRecepcionCompraData {
  id_orden_compra: number;
  id_detalle_orden: number;
  cantidad_recibida: number;
  cantidad_aceptada: number;
  cantidad_rechazada: number;
  tipo_recepcion?: 'PARCIAL' | 'FINAL' | 'UNICA';
  calidad?: 'OK' | 'PARCIAL_DA_ADO' | 'RECHAZADO';
  recibido_por: number;
  id_ubicacion_destino?: number;
  observaciones?: string;
  costo_unitario_real?: number;
}

export interface ItemRecepcionLoteData {
  id_detalle_orden: number;
  cantidad_recibida: number;
  cantidad_aceptada: number;
  cantidad_rechazada: number;
  calidad?: 'OK' | 'PARCIAL_DA_ADO' | 'RECHAZADO';
  id_ubicacion_destino?: number;
  observaciones?: string;
  costo_unitario_real?: number;
}

export interface CreateRecepcionLoteData {
  id_orden_compra: number;
  recibido_por: number;
  id_ubicacion_destino?: number;
  guia_remision?: string;
  observaciones?: string;
  items: ItemRecepcionLoteData[];
}

export interface ResultadoRecepcionLote {
  numero_recepcion: string;
  id_orden_compra: number;
  numero_orden_compra: string;
  nuevo_estado_orden: string;
  total_items_procesados: number;
  recepciones: recepciones_compra[];
}

export interface IRecepcionesCompraRepository {
  create(data: CreateRecepcionCompraData): Promise<recepciones_compra>;
  createLote(data: CreateRecepcionLoteData): Promise<ResultadoRecepcionLote>;
  findAll(params: any): Promise<{ data: recepciones_compra[]; total: number }>;
  findById(id: number): Promise<recepciones_compra | null>;
  findByOrdenCompra(idOrdenCompra: number): Promise<recepciones_compra[]>;
}
