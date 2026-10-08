/**
 * MEKANOS S.A.S - Portal Admin
 * Tipos de Compras, Abastecimiento y Catálogo Maestro
 */

export type DestinoArticulo =
  | 'INSUMO_SERVICIO'
  | 'REPUESTO_CORRECTIVO'
  | 'HERRAMIENTA_ACTIVO'
  | 'DOTACION_EPP'
  | 'CONSUMIBLE_TALLER';

export type OrigenCosto =
  | 'REGISTRO_INICIAL'
  | 'ACTUALIZACION_PROVEEDOR'
  | 'ORDEN_COMPRA'
  | 'RECEPCION_FACTURA'
  | 'AJUSTE_AUDITORIA';

export interface EscalaPrecio {
  cantidad_min: number;
  costo_unitario: number;
  descuento_porcentaje?: number;
}

export interface Marca {
  id_marca: number;
  nombre: string;
  slug?: string;
  pais_origen?: string | null;
  es_fabricante_oem: boolean;
  sitio_web?: string | null;
  logo_url?: string | null;
  activo: boolean;
  fecha_creacion?: string;
  fecha_modificacion?: string | null;
  _count?: {
    catalogo_componentes?: number;
    articulos_proveedores?: number;
  };
}

export interface CreateMarcaPayload {
  nombre: string;
  slug?: string;
  descripcion?: string;
  pais_origen?: string;
  es_fabricante_oem?: boolean;
  sitio_web?: string;
  logo_url?: string;
  notas?: string;
  activo?: boolean;
}

export interface FusionarMarcasPayload {
  id_marca_origen: number;
  id_marca_destino: number;
  eliminar_origen?: boolean;
}

export type TipoMagnitud = 'CANTIDAD' | 'VOLUMEN' | 'LONGITUD' | 'MASA' | 'CONJUNTO';

export interface UnidadMedida {
  codigo_unidad: string;
  nombre: string;
  simbolo: string;
  tipo_magnitud: TipoMagnitud;
  factor_conversion_base: number;
  activo: boolean;
}

export interface CategoriaNodo {
  id_categoria: number;
  codigo_categoria: string;
  nombre: string;
  slug?: string;
  id_padre: number | null;
  nivel: number;
  ruta_jerarquica: string;
  slug_path?: string;
  descripcion?: string | null;
  activo: boolean;
  hijos?: CategoriaNodo[];
  subcategorias?: CategoriaNodo[];
  categoria_padre?: {
    id_categoria: number;
    nombre: string;
    ruta_jerarquica: string;
  } | null;
  _count?: {
    catalogo_componentes?: number;
    subcategorias?: number;
  };
  total_articulos?: number;
  articulos_directos?: number;
}

export interface CreateCategoriaPayload {
  codigo_categoria?: string;
  nombre: string;
  id_padre?: number | null;
  descripcion?: string;
  activo?: boolean;
}

export interface ProveedorCompleto {
  id_proveedor: number;
  id_persona: number;
  codigo_proveedor?: string | null;
  categoria_proveedor: string;
  tipo_proveedor: string;
  responsable_iva: boolean;
  tiempo_entrega_dias?: number | null;
  servicios_ofrecidos?: string | null;
  realiza_entregas: boolean;
  zona_cobertura?: string | null;
  proveedor_activo: boolean;
  observaciones?: string | null;
  fecha_registro?: string;
  persona?: PersonaProveedor;
  _count?: {
    catalogo_componentes?: number;
    articulos_proveedores?: number;
    ordenes_compra?: number;
  };
}

export interface PersonaProveedor {
  id_persona: number;
  razon_social?: string | null;
  nombre_comercial?: string | null;
  numero_identificacion?: string | null;
  telefono_principal?: string | null;
  email_principal?: string | null;
  representante_legal?: string | null;
  direccion_principal?: string | null;
  url_ubicacion?: string | null;
  sitio_web?: string | null;
}

export interface ProveedorBasico {
  id_proveedor: number;
  codigo_proveedor?: string | null;
  persona?: PersonaProveedor;
}

export interface ArticuloProveedor {
  id_componente: number;
  id_proveedor: number;
  referencia_proveedor: string;
  marca_ofrecida?: string | null;
  id_marca_ofrecida?: number | null;
  nombre_segun_proveedor?: string | null;
  costo_actual: number | string;
  moneda: string;
  tiempo_entrega_dias?: number | null;
  cantidad_minima_compra?: number | string | null;
  escalas_precios?: EscalaPrecio[] | null;
  es_proveedor_preferido: boolean;
  url_producto_proveedor?: string | null;
  activo: boolean;
  notas?: string | null;
  fecha_registro: string;
  fecha_actualizacion?: string | null;
  proveedores?: ProveedorBasico;
  marcas?: Marca | null;
}

export interface HistorialCostoCompra {
  id_historial_costo: number;
  id_componente: number;
  id_proveedor?: number | null;
  costo_unitario: number | string;
  costo_unitario_anterior?: number | string | null;
  moneda: string;
  porcentaje_variacion?: number | string | null;
  cantidad_adquirida?: number | string | null;
  numero_factura_oc?: string | null;
  origen_cambio: OrigenCosto;
  observaciones?: string | null;
  id_usuario?: number | null;
  fecha_registro: string;
  proveedores?: {
    persona?: {
      razon_social?: string | null;
      nombre_comercial?: string | null;
    };
  };
  usuarios?: {
    username: string;
    email: string;
  };
}

export interface TipoComponente {
  id_tipo_componente: number;
  codigo_tipo?: string;
  nombre_componente: string;
  categoria?: string;
  subcategoria?: string | null;
}

export interface ArticuloMaestro {
  id_componente: number;
  id_tipo_componente: number;
  codigo_interno?: string | null;
  referencia_fabricante: string;
  marca?: string | null;
  id_marca?: number | null;
  codigo_unidad_medida?: string | null;
  id_categoria?: number | null;
  descripcion_corta?: string | null;
  descripcion_detallada?: string | null;
  especificaciones_tecnicas?: Record<string, any> | null;
  notas_instalacion?: string | null;
  tipo_comercial?: string | null;
  destino_articulo: DestinoArticulo;
  es_comprable: boolean;
  es_inventariable: boolean;
  es_facturable: boolean;
  requiere_serializacion: boolean;
  es_activo_fijo: boolean;
  numero_serie_activo?: string | null;
  placa_inventario?: string | null;
  frecuencia_mantenimiento_meses?: number | null;
  precio_compra?: number | string | null;
  precio_venta?: number | string | null;
  margen_utilidad_porcentaje?: number | string | null;
  moneda: string;
  id_proveedor_principal?: number | null;
  stock_minimo: number;
  stock_actual: number;
  unidad_medida: string;
  activo: boolean;
  fecha_creacion: string;
  fecha_modificacion?: string | null;
  tipos_componente?: TipoComponente;
  proveedores?: ProveedorBasico;
  marcas?: Marca | null;
  unidades_medida?: UnidadMedida | null;
  categorias_componente?: CategoriaNodo | null;
  articulos_proveedores?: ArticuloProveedor[];
  historial_costos_compra?: HistorialCostoCompra[];
}

export interface ArticulosResponse {
  items: ArticuloMaestro[];
  total: number;
  skip: number;
  limit: number;
  page?: number;
  totalPages?: number;
}

export interface ResumenCatalogo {
  total_articulos: number;
  total_activos: number;
  total_inactivos: number;
  total_inventariables: number;
  articulos_stock_bajo: number;
  articulos_sin_stock: number;
  valor_total_inventario: number;
  por_arquetipo: Record<string, number>;
}

export interface ArticuloProveedorInicialPayload {
  id_proveedor: number;
  referencia_proveedor: string;
  marca_ofrecida?: string;
  id_marca_ofrecida?: number;
  nombre_segun_proveedor?: string;
  costo_actual: number;
  moneda?: string;
  tiempo_entrega_dias?: number;
  cantidad_minima_compra?: number;
  escalas_precios?: EscalaPrecio[];
  es_proveedor_preferido?: boolean;
  url_producto_proveedor?: string;
  notas?: string;
}

export interface CreateArticuloMaestroPayload {
  id_tipo_componente: number;
  codigo_interno?: string;
  referencia_fabricante: string;
  marca?: string;
  id_marca?: number;
  codigo_unidad_medida?: string;
  id_categoria?: number;
  descripcion_corta?: string;
  descripcion_detallada?: string;
  especificaciones_tecnicas?: Record<string, any>;
  tipo_comercial?: string;
  destino_articulo: DestinoArticulo;
  es_comprable?: boolean;
  es_inventariable?: boolean;
  es_facturable?: boolean;
  requiere_serializacion?: boolean;
  es_activo_fijo?: boolean;
  numero_serie_activo?: string;
  placa_inventario?: string;
  frecuencia_mantenimiento_meses?: number;
  stock_minimo?: number;
  stock_actual?: number;
  precio_compra?: number;
  precio_venta?: number;
  margen_utilidad_porcentaje?: number;
  moneda?: string;
  unidad_medida?: string;
  proveedores_iniciales?: ArticuloProveedorInicialPayload[];
  id_proveedor_principal?: number;
  observaciones?: string;
  notas_instalacion?: string;
}

export interface VincularProveedorPayload {
  id_proveedor: number;
  referencia_proveedor: string;
  marca_ofrecida?: string;
  id_marca_ofrecida?: number;
  nombre_segun_proveedor?: string;
  costo_actual: number;
  moneda?: string;
  tiempo_entrega_dias?: number;
  cantidad_minima_compra?: number;
  escalas_precios?: EscalaPrecio[];
  es_proveedor_preferido?: boolean;
  url_producto_proveedor?: string;
  notas?: string;
  numero_factura_oc?: string;
  origen_cambio?: OrigenCosto;
}

export interface ActualizarPrecioProveedorPayload {
  nuevo_costo: number;
  moneda?: string;
  cantidad_adquirida?: number;
  numero_factura_oc?: string;
  origen_cambio?: OrigenCosto;
  observaciones?: string;
  escalas_precios?: EscalaPrecio[];
}

export interface FiltrosArticulos {
  q?: string;
  destino_articulo?: DestinoArticulo;
  id_tipo_componente?: number;
  id_proveedor?: number;
  marca?: string;
  id_marca?: number;
  id_categoria?: number;
  codigo_unidad_medida?: string;
  es_comprable?: boolean;
  es_inventariable?: boolean;
  activo?: boolean;
  page?: number;
  skip?: number;
  limit?: number;
}
