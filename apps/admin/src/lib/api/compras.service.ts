/**
 * MEKANOS S.A.S - Portal Admin
 * Servicio API de Compras, Abastecimiento y Catálogo Maestro
 */

import { apiClient } from '@/lib/api/client';
import {
  ActualizarPrecioProveedorPayload,
  ArticuloMaestro,
  ArticuloProveedor,
  ArticulosResponse,
  CategoriaNodo,
  CreateArticuloMaestroPayload,
  CreateCategoriaPayload,
  CreateMarcaPayload,
  FiltrosArticulos,
  HistorialCostoCompra,
  Marca,
  TipoComponente,
  UnidadMedida,
  VincularProveedorPayload,
  ProveedorCompleto,
} from '@/types/compras.types';

export const comprasService = {
  /**
   * Listar artículos con filtros avanzados
   */
  async getArticulos(filtros: FiltrosArticulos = {}): Promise<ArticulosResponse> {
    const params = new URLSearchParams();
    if (filtros.q) params.append('q', filtros.q);
    if (filtros.destino_articulo) params.append('destino_articulo', filtros.destino_articulo);
    if (filtros.id_tipo_componente) params.append('id_tipo_componente', String(filtros.id_tipo_componente));
    if (filtros.id_proveedor) params.append('id_proveedor', String(filtros.id_proveedor));
    if (filtros.marca) params.append('marca', filtros.marca);
    if (filtros.id_marca) params.append('id_marca', String(filtros.id_marca));
    if (filtros.id_categoria) params.append('id_categoria', String(filtros.id_categoria));
    if (filtros.codigo_unidad_medida) params.append('codigo_unidad_medida', filtros.codigo_unidad_medida);
    if (filtros.es_comprable !== undefined) params.append('es_comprable', String(filtros.es_comprable));
    if (filtros.es_inventariable !== undefined) params.append('es_inventariable', String(filtros.es_inventariable));
    if (filtros.activo !== undefined) params.append('activo', String(filtros.activo));
    if (filtros.skip !== undefined) params.append('skip', String(filtros.skip));
    if (filtros.limit !== undefined) params.append('limit', String(filtros.limit));

    const response = await apiClient.get<ArticulosResponse>(
      `/catalogo-componentes?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Obtener detalle completo de un artículo (Ficha 360°)
   */
  async getArticuloById(id: number): Promise<ArticuloMaestro> {
    const response = await apiClient.get<ArticuloMaestro>(`/catalogo-componentes/${id}`);
    return response.data;
  },

  /**
   * Creación atómica de un recurso maestro con proveedores y auditoría
   */
  async createArticulo(payload: CreateArticuloMaestroPayload): Promise<ArticuloMaestro> {
    const response = await apiClient.post<ArticuloMaestro>(
      '/catalogo-componentes',
      payload
    );
    return response.data;
  },

  /**
   * Actualizar especificaciones del recurso maestro
   */
  async updateArticulo(id: number, payload: Partial<CreateArticuloMaestroPayload>): Promise<any> {
    const response = await apiClient.put(`/catalogo-componentes/${id}`, payload);
    return response.data;
  },

  /**
   * Desactivar un artículo
   */
  async deleteArticulo(id: number): Promise<any> {
    const response = await apiClient.delete(`/catalogo-componentes/${id}`);
    return response.data;
  },

  /**
   * Obtener fuentes de suministro (referencias cruzadas)
   */
  async getFuentesSuministro(idComponente: number): Promise<ArticuloProveedor[]> {
    const response = await apiClient.get<ArticuloProveedor[]>(
      `/catalogo-componentes/${idComponente}/proveedores`
    );
    return response.data;
  },

  /**
   * Vincular nuevo proveedor a un artículo
   */
  async vincularProveedor(
    idComponente: number,
    payload: VincularProveedorPayload
  ): Promise<ArticuloProveedor> {
    const response = await apiClient.post<ArticuloProveedor>(
      `/catalogo-componentes/${idComponente}/proveedores`,
      payload
    );
    return response.data;
  },

  /**
   * Actualizar precio pactado de proveedor con auditoría
   */
  async actualizarPrecioProveedor(
    idComponente: number,
    idProveedor: number,
    payload: ActualizarPrecioProveedorPayload
  ): Promise<{ vinculo: ArticuloProveedor; historial: HistorialCostoCompra; variacion_porcentual: number }> {
    const response = await apiClient.put(
      `/catalogo-componentes/${idComponente}/proveedores/${idProveedor}/precio`,
      payload
    );
    return response.data;
  },

  /**
   * Desvincular proveedor de un artículo
   */
  async desvincularProveedor(idComponente: number, idProveedor: number): Promise<any> {
    const response = await apiClient.delete(
      `/catalogo-componentes/${idComponente}/proveedores/${idProveedor}`
    );
    return response.data;
  },

  /**
   * Obtener historial inmutable de costos de compra
   */
  async getHistorialCostos(
    idComponente: number,
    idProveedor?: number
  ): Promise<HistorialCostoCompra[]> {
    const params = idProveedor ? `?idProveedor=${idProveedor}` : '';
    const response = await apiClient.get<HistorialCostoCompra[]>(
      `/catalogo-componentes/${idComponente}/historial-costos${params}`
    );
    return response.data;
  },

  /**
   * Obtener listado de proveedores activos para selects
   */
  async getProveedores(): Promise<any[]> {
    try {
      const response = await apiClient.get('/proveedores');
      // Soporta respuesta array directa o { data: [] } o { items: [] }
      if (Array.isArray(response.data)) return response.data;
      if (Array.isArray((response.data as any)?.data)) return (response.data as any).data;
      if (Array.isArray((response.data as any)?.items)) return (response.data as any).items;
      return [];
    } catch (e) {
      // Fallback a /inventario/proveedores si /proveedores no está disponible
      try {
        const fallback = await apiClient.get('/inventario/proveedores');
        if (Array.isArray(fallback.data)) return fallback.data;
      } catch {
        // Ignorar
      }
      console.warn('No se pudo cargar la lista de proveedores:', e);
      return [];
    }
  },

  /**
   * Obtener listado de tipos de componente / categorías
   */
  async getTiposComponente(): Promise<TipoComponente[]> {
    try {
      const response = await apiClient.get('/tipos-componente', {
        params: { page: 1, limit: 100, activo: true },
      });
      if (Array.isArray(response.data)) return response.data;
      if (Array.isArray((response.data as any)?.data)) return (response.data as any).data;
      if (Array.isArray((response.data as any)?.items)) return (response.data as any).items;
      return [];
    } catch (e) {
      // Fallback a /inventario/tipos-componente para resiliencia total
      try {
        const fallback = await apiClient.get('/inventario/tipos-componente');
        if (Array.isArray(fallback.data)) {
          return fallback.data.map((t: any) => ({
            id_tipo_componente: t.id,
            codigo_tipo: t.codigo,
            nombre_componente: t.nombre,
          }));
        }
      } catch {
        // Ignorar
      }
      console.warn('No se pudo cargar tipos de componente:', e);
      return [];
    }
  },

  /**
   * Obtener marcas (búsqueda rápida con ?q=...)
   */
  async getMarcas(q?: string, limit = 20): Promise<Marca[]> {
    try {
      const params = new URLSearchParams();
      if (q && q.trim()) params.append('q', q.trim());
      if (limit) params.append('limit', String(limit));

      const queryStr = params.toString() ? `?${params.toString()}` : '';
      const response = await apiClient.get<Marca[]>(`/marcas${queryStr}`);
      return Array.isArray(response.data) ? response.data : [];
    } catch (e) {
      console.error('Error al obtener marcas:', e);
      return [];
    }
  },

  /**
   * Crear marca al vuelo (in-context)
   */
  async createMarca(payload: CreateMarcaPayload): Promise<Marca> {
    const response = await apiClient.post<Marca>('/marcas', payload);
    return response.data;
  },

  /**
   * Actualizar marca existente
   */
  async updateMarca(id: number, payload: Partial<CreateMarcaPayload>): Promise<Marca> {
    const response = await apiClient.put<Marca>(`/marcas/${id}`, payload);
    return response.data;
  },

  /**
   * Obtener detalle de marca por ID
   */
  async getMarca(id: number): Promise<Marca> {
    const response = await apiClient.get<Marca>(`/marcas/${id}`);
    return response.data;
  },

  /**
   * Obtener árbol jerárquico de categorías taxonómicas
   */
  async getCategoriasArbol(): Promise<CategoriaNodo[]> {
    try {
      const response = await apiClient.get<CategoriaNodo[]>('/categorias-componente/arbol');
      return Array.isArray(response.data) ? response.data : [];
    } catch (e) {
      console.error('Error al obtener árbol de categorías:', e);
      return [];
    }
  },

  /**
   * Crear categoría taxonómica in-context o desde vista dedicada
   */
  async createCategoria(payload: CreateCategoriaPayload): Promise<CategoriaNodo> {
    const response = await apiClient.post<CategoriaNodo>('/categorias-componente', payload);
    return response.data;
  },

  /**
   * Actualizar categoría taxonómica existente
   */
  async updateCategoria(id: number, payload: Partial<CreateCategoriaPayload>): Promise<CategoriaNodo> {
    const response = await apiClient.put<CategoriaNodo>(`/categorias-componente/${id}`, payload);
    return response.data;
  },

  /**
   * Obtener unidades de medida normalizadas (opcionalmente filtradas por tipo de magnitud)
   */
  async getUnidadesMedida(tipo_magnitud?: string): Promise<UnidadMedida[]> {
    try {
      const params = tipo_magnitud ? `?tipo_magnitud=${tipo_magnitud}` : '';
      const response = await apiClient.get<UnidadMedida[]>(`/unidades-medida${params}`);
      return Array.isArray(response.data) ? response.data : [];
    } catch (e) {
      console.error('Error al obtener unidades de medida:', e);
      return [];
    }
  },

  /**
   * Directorio de Proveedores con paginación
   */
  async getProveedoresDirectorio(page = 1, limit = 50): Promise<{ data: ProveedorCompleto[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
    try {
      const response = await apiClient.get('/proveedores', {
        params: { page, limit },
      });
      return response.data;
    } catch (e) {
      console.error('Error al obtener proveedores:', e);
      return { data: [], meta: { total: 0, page: 1, limit, totalPages: 0 } };
    }
  },

  /**
   * Crear proveedor
   */
  async createProveedor(payload: any): Promise<ProveedorCompleto> {
    const response = await apiClient.post<ProveedorCompleto>('/proveedores', payload);
    return response.data;
  },

  /**
   * Actualizar proveedor
   */
  async updateProveedor(id: number, payload: any): Promise<ProveedorCompleto> {
    const response = await apiClient.put<ProveedorCompleto>(`/proveedores/${id}`, payload);
    return response.data;
  },

  /**
   * Eliminar proveedor
   */
  async deleteProveedor(id: number): Promise<void> {
    await apiClient.delete(`/proveedores/${id}`);
  },
};
