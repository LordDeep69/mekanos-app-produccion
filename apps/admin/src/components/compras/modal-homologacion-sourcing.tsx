'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Package,
  Search,
  Check,
  RefreshCw,
  Truck,
  Copy,
  DollarSign,
  Tag,
  Globe,
  FileText,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { comprasService } from '@/lib/api/compras.service';
import {
  ArticuloMaestro,
  ProveedorCompleto,
  OrigenCosto,
  getNombreProveedor,
} from '@/types/compras.types';

export interface ModalHomologacionSourcingProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modo: 'crear' | 'editar';
  origen: 'desde_proveedor' | 'desde_articulo';

  // Si origen === 'desde_proveedor', el proveedor está predefinido
  proveedorFijo?: {
    id_proveedor: number;
    nombre: string;
    nit?: string;
  };

  // Si origen === 'desde_articulo', el repuesto maestro está predefinido
  articuloFijo?: {
    id_componente: number;
    codigo_interno?: string;
    descripcion_corta: string;
    referencia_fabricante?: string;
    marca?: string;
    precio_base?: number;
  };

  // Datos para modo 'editar' o prellenado avanzado
  datosIniciales?: {
    id_componente: number;
    id_proveedor: number;
    nombre_segun_proveedor?: string;
    referencia_proveedor: string;
    marca_ofrecida?: string;
    costo_actual: number;
    costo_anterior?: number;
    tiempo_entrega_dias?: number;
    cantidad_minima_compra?: number;
    url_producto_proveedor?: string;
    es_proveedor_preferido?: boolean;
    observaciones?: string;
    notas?: string;
    numero_factura_oc?: string;
    origen_cambio?: OrigenCosto;
    moneda?: string;
    // Metadatos para cabecera de contexto
    nombre_articulo?: string;
    codigo_articulo?: string;
    ref_oem_articulo?: string;
    nombre_proveedor?: string;
    nit_proveedor?: string;
  };

  onSuccess: () => void;
}

export function ModalHomologacionSourcing({
  open,
  onOpenChange,
  modo,
  origen,
  proveedorFijo,
  articuloFijo,
  datosIniciales,
  onSuccess,
}: ModalHomologacionSourcingProps) {
  // Estado del formulario unificado
  const [formData, setFormData] = useState({
    id_componente: 0,
    id_proveedor: 0,
    nombre_segun_proveedor: '',
    referencia_proveedor: '',
    marca_ofrecida: '',
    costo_actual: 0,
    tiempo_entrega_dias: 1,
    cantidad_minima_compra: 1,
    es_proveedor_preferido: false,
    url_producto_proveedor: '',
    observaciones: '',
    numero_factura_oc: '',
    origen_cambio: 'ACTUALIZACION_PROVEEDOR' as OrigenCosto,
    moneda: 'COP',
  });

  const [submitting, setSubmitting] = useState(false);

  // Listados para selectores cuando se requiere selección en modo 'crear'
  const [listaComponentes, setListaComponentes] = useState<ArticuloMaestro[]>([]);
  const [cargandoComponentes, setCargandoComponentes] = useState(false);
  const [busquedaComponente, setBusquedaComponente] = useState('');
  const [menuComponentesAbierto, setMenuComponentesAbierto] = useState(false);
  const [componenteSeleccionado, setComponenteSeleccionado] = useState<ArticuloMaestro | null>(null);

  const [listaProveedores, setListaProveedores] = useState<ProveedorCompleto[]>([]);
  const [cargandoProveedores, setCargandoProveedores] = useState(false);
  const [busquedaProveedor, setBusquedaProveedor] = useState('');
  const [menuProveedoresAbierto, setMenuProveedoresAbierto] = useState(false);
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState<ProveedorCompleto | null>(null);

  // Carga inicial y reset de estado reactivo al abrir
  useEffect(() => {
    if (!open) return;

    if (modo === 'editar' && datosIniciales) {
      setFormData({
        id_componente: datosIniciales.id_componente,
        id_proveedor: datosIniciales.id_proveedor,
        nombre_segun_proveedor: datosIniciales.nombre_segun_proveedor || '',
        referencia_proveedor: datosIniciales.referencia_proveedor || '',
        marca_ofrecida: datosIniciales.marca_ofrecida || '',
        costo_actual: Number(datosIniciales.costo_actual) || 0,
        tiempo_entrega_dias: Number(datosIniciales.tiempo_entrega_dias) || 1,
        cantidad_minima_compra: Number(datosIniciales.cantidad_minima_compra) || 1,
        es_proveedor_preferido: Boolean(datosIniciales.es_proveedor_preferido),
        url_producto_proveedor: datosIniciales.url_producto_proveedor || '',
        observaciones: datosIniciales.observaciones || datosIniciales.notas || '',
        numero_factura_oc: datosIniciales.numero_factura_oc || '',
        origen_cambio: datosIniciales.origen_cambio || 'ACTUALIZACION_PROVEEDOR',
        moneda: datosIniciales.moneda || 'COP',
      });
    } else {
      // Modo Crear
      const idCompInicial = articuloFijo ? articuloFijo.id_componente : 0;
      const idProvInicial = proveedorFijo ? proveedorFijo.id_proveedor : 0;

      setFormData({
        id_componente: idCompInicial,
        id_proveedor: idProvInicial,
        nombre_segun_proveedor: articuloFijo?.descripcion_corta || '',
        referencia_proveedor: articuloFijo?.referencia_fabricante || '',
        marca_ofrecida: articuloFijo?.marca || '',
        costo_actual: Number(articuloFijo?.precio_base || 0),
        tiempo_entrega_dias: 1,
        cantidad_minima_compra: 1,
        es_proveedor_preferido: false,
        url_producto_proveedor: '',
        observaciones: '',
        numero_factura_oc: '',
        origen_cambio: 'ACTUALIZACION_PROVEEDOR',
        moneda: 'COP',
      });

      setComponenteSeleccionado(null);
      setProveedorSeleccionado(null);
      setBusquedaComponente('');
      setBusquedaProveedor('');
      setMenuComponentesAbierto(false);
      setMenuProveedoresAbierto(false);

      // Cargar lista de componentes si el origen es desde proveedor
      if (origen === 'desde_proveedor') {
        cargarArticulosMaestros();
      }
      // Cargar lista de proveedores si el origen es desde artículo
      if (origen === 'desde_articulo') {
        cargarProveedoresDirectorio();
      }
    }
  }, [open, modo, origen, proveedorFijo, articuloFijo, datosIniciales]);

  // Carga de catálogo de repuestos
  const cargarArticulosMaestros = async () => {
    if (listaComponentes.length > 0) return;
    try {
      setCargandoComponentes(true);
      const res = await comprasService.getArticulos({ limit: 300, activo: true });
      const items = (res as any)?.items || (res as any)?.data || (Array.isArray(res) ? res : []);
      setListaComponentes(items);
    } catch (e) {
      console.error('Error al cargar catálogo de componentes:', e);
      toast.error('No se pudo cargar la lista de repuestos del catálogo');
    } finally {
      setCargandoComponentes(false);
    }
  };

  // Carga de directorio de proveedores
  const cargarProveedoresDirectorio = async () => {
    if (listaProveedores.length > 0) return;
    try {
      setCargandoProveedores(true);
      const res = await comprasService.getProveedoresDirectorio(1, 100);
      setListaProveedores(res.data || []);
    } catch (e) {
      console.error('Error al cargar proveedores:', e);
      toast.error('No se pudo cargar el directorio de proveedores');
    } finally {
      setCargandoProveedores(false);
    }
  };

  // Filtro de artículos interactivo
  const componentesFiltrados = useMemo(() => {
    if (!busquedaComponente.trim()) return listaComponentes.slice(0, 50);
    const q = busquedaComponente.toLowerCase().trim();
    return listaComponentes.filter(
      (c) =>
        (c.descripcion_corta || '').toLowerCase().includes(q) ||
        (c.codigo_interno || '').toLowerCase().includes(q) ||
        (c.referencia_fabricante || '').toLowerCase().includes(q) ||
        (c.marca || '').toLowerCase().includes(q)
    );
  }, [listaComponentes, busquedaComponente]);

  // Filtro de proveedores interactivo
  const proveedoresFiltrados = useMemo(() => {
    if (!busquedaProveedor.trim()) return listaProveedores.slice(0, 50);
    const q = busquedaProveedor.toLowerCase().trim();
    return listaProveedores.filter((p) => {
      const nombre = getNombreProveedor(p.persona, p.id_proveedor).toLowerCase();
      const nit = (p.persona?.numero_identificacion || '').toLowerCase();
      return nombre.includes(q) || nit.includes(q);
    });
  }, [listaProveedores, busquedaProveedor]);

  // Manejador de selección de componente en modo crear desde proveedor
  const handleSeleccionarComponente = (c: ArticuloMaestro) => {
    setComponenteSeleccionado(c);
    setFormData((prev) => ({
      ...prev,
      id_componente: c.id_componente,
      referencia_proveedor: c.referencia_fabricante || prev.referencia_proveedor || '',
      nombre_segun_proveedor: c.descripcion_corta || prev.nombre_segun_proveedor || '',
      marca_ofrecida: c.marcas?.nombre || c.marca || prev.marca_ofrecida || '',
      costo_actual: prev.costo_actual > 0 ? prev.costo_actual : Number(c.precio_compra || 0),
    }));
    setMenuComponentesAbierto(false);
  };

  // Manejador de selección de proveedor en modo crear desde artículo
  const handleSeleccionarProveedor = (p: ProveedorCompleto) => {
    setProveedorSeleccionado(p);
    setFormData((prev) => ({
      ...prev,
      id_proveedor: p.id_proveedor,
      tiempo_entrega_dias: p.tiempo_entrega_dias || prev.tiempo_entrega_dias || 1,
    }));
    setMenuProveedoresAbierto(false);
  };

  // Cálculo reactivo de variación de costo en edición
  const calculoVariacion = useMemo(() => {
    if (modo !== 'editar' || !datosIniciales?.costo_anterior) return null;
    const anterior = Number(datosIniciales.costo_anterior);
    const actual = Number(formData.costo_actual);
    if (anterior <= 0) return null;
    const diff = actual - anterior;
    const pct = ((diff / anterior) * 100);
    return {
      diff,
      pct: Math.round(pct * 100) / 100,
      incremento: diff > 0,
      sinCambio: diff === 0,
    };
  }, [modo, datosIniciales, formData.costo_actual]);

  // Contexto del repuesto maestro
  const repuestoContexto = useMemo(() => {
    if (articuloFijo) {
      return {
        codigo: articuloFijo.codigo_interno || `REF-${articuloFijo.id_componente}`,
        descripcion: articuloFijo.descripcion_corta,
        oem: articuloFijo.referencia_fabricante,
        marca: articuloFijo.marca,
      };
    }
    if (componenteSeleccionado) {
      return {
        codigo: componenteSeleccionado.codigo_interno || `REF-${componenteSeleccionado.id_componente}`,
        descripcion: componenteSeleccionado.descripcion_corta,
        oem: componenteSeleccionado.referencia_fabricante,
        marca: componenteSeleccionado.marcas?.nombre || componenteSeleccionado.marca,
      };
    }
    if (datosIniciales) {
      return {
        codigo: datosIniciales.codigo_articulo || `REF-${datosIniciales.id_componente}`,
        descripcion: datosIniciales.nombre_articulo || 'Repuesto Maestro',
        oem: datosIniciales.ref_oem_articulo,
        marca: undefined,
      };
    }
    return null;
  }, [articuloFijo, componenteSeleccionado, datosIniciales]);

  // Contexto del proveedor
  const proveedorContexto = useMemo(() => {
    if (proveedorFijo) {
      return {
        nombre: proveedorFijo.nombre,
        nit: proveedorFijo.nit,
      };
    }
    if (proveedorSeleccionado) {
      return {
        nombre: getNombreProveedor(proveedorSeleccionado.persona, proveedorSeleccionado.id_proveedor),
        nit: proveedorSeleccionado.persona?.numero_identificacion,
      };
    }
    if (datosIniciales) {
      return {
        nombre: datosIniciales.nombre_proveedor || `Proveedor #${datosIniciales.id_proveedor}`,
        nit: datosIniciales.nit_proveedor,
      };
    }
    return null;
  }, [proveedorFijo, proveedorSeleccionado, datosIniciales]);

  // Envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const idComp = formData.id_componente;
    const idProv = formData.id_proveedor;

    if (!idComp || idComp <= 0) {
      toast.error('Debes seleccionar un repuesto del catálogo maestro');
      return;
    }
    if (!idProv || idProv <= 0) {
      toast.error('Debes seleccionar un proveedor válido');
      return;
    }
    if (!formData.referencia_proveedor.trim()) {
      toast.error('La referencia o SKU del proveedor es obligatorio');
      return;
    }
    if (formData.costo_actual <= 0) {
      toast.error('El costo unitario pactado debe ser mayor a 0 COP');
      return;
    }

    try {
      setSubmitting(true);

      if (modo === 'crear') {
        const payload: any = {
          id_componente: idComp,
          id_proveedor: idProv,
          referencia_proveedor: formData.referencia_proveedor.trim(),
          nombre_segun_proveedor: formData.nombre_segun_proveedor.trim() || undefined,
          marca_ofrecida: formData.marca_ofrecida.trim() || undefined,
          costo_actual: formData.costo_actual,
          moneda: formData.moneda || 'COP',
          tiempo_entrega_dias: formData.tiempo_entrega_dias,
          cantidad_minima_compra: formData.cantidad_minima_compra,
          es_proveedor_preferido: formData.es_proveedor_preferido,
          url_producto_proveedor: formData.url_producto_proveedor.trim() || undefined,
          notas: formData.observaciones.trim() || undefined,
        };

        if (origen === 'desde_proveedor') {
          await comprasService.homologarArticuloProveedor(idProv, payload);
        } else {
          await comprasService.vincularProveedor(idComp, payload);
        }
        toast.success('Repuesto homologado exitosamente en la matriz de abastecimiento');
      } else {
        // Modo Editar
        const payload = {
          nuevo_costo: formData.costo_actual,
          referencia_proveedor: formData.referencia_proveedor.trim(),
          nombre_segun_proveedor: formData.nombre_segun_proveedor.trim() || undefined,
          marca_ofrecida: formData.marca_ofrecida.trim() || undefined,
          tiempo_entrega_dias: formData.tiempo_entrega_dias,
          cantidad_minima_compra: formData.cantidad_minima_compra,
          es_proveedor_preferido: formData.es_proveedor_preferido,
          url_producto_proveedor: formData.url_producto_proveedor.trim() || undefined,
          observaciones: formData.observaciones.trim() || undefined,
          notas: formData.observaciones.trim() || undefined,
          numero_factura_oc: formData.numero_factura_oc.trim() || undefined,
          origen_cambio: formData.origen_cambio,
          moneda: formData.moneda || 'COP',
        };

        if (origen === 'desde_proveedor') {
          await comprasService.actualizarArticuloProveedor(idProv, idComp, payload);
        } else {
          await comprasService.actualizarPrecioProveedor(idComp, idProv, payload);
        }
        toast.success('Condiciones comerciales de homologación actualizadas exitosamente');
      }

      onOpenChange(false);
      onSuccess();
    } catch (e: any) {
      console.error('Error al guardar homologación:', e);
      const msg = e?.response?.data?.message || e?.message || 'Error al procesar la homologación';
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl w-full p-0 rounded-2xl border border-slate-200 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col bg-white">
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          {/* CABECERA ESTANDARIZADA */}
          <DialogHeader className="p-5 pb-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
            <div className="flex items-center gap-3">
              <div
                className={`h-10 w-10 rounded-xl flex items-center justify-center shadow-sm shrink-0 ${
                  modo === 'crear' ? 'bg-blue-600 text-white' : 'bg-indigo-600 text-white'
                }`}
              >
                <Package className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-bold text-slate-900 truncate">
                  {modo === 'crear'
                    ? origen === 'desde_proveedor'
                      ? 'Homologar Repuesto Comercial'
                      : 'Homologar Fuente de Suministro'
                    : 'Editar Condiciones de Homologación'}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 truncate">
                  {modo === 'crear'
                    ? origen === 'desde_proveedor'
                      ? `Vincula un artículo del catálogo maestro con ${proveedorContexto?.nombre || 'el proveedor'}.`
                      : 'Vincula una fuente comercial con sus códigos y acuerdos de entrega.'
                    : `Matriz de abastecimiento y condiciones comerciales bilaterales.`}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* CUERPO DEL FORMULARIO CON SCROLL */}
          <div className="p-6 space-y-4 text-xs overflow-y-auto max-h-[calc(90vh-140px)]">
            {/* 1. SELECTOR DINÁMICO EN MODO CREAR */}
            {modo === 'crear' && origen === 'desde_proveedor' && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-blue-600" />
                    Artículo Base del Catálogo Maestro *
                  </Label>
                  {componenteSeleccionado && (
                    <button
                      type="button"
                      onClick={() => setMenuComponentesAbierto(true)}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                    >
                      Cambiar repuesto maestro
                    </button>
                  )}
                </div>

                {!componenteSeleccionado || menuComponentesAbierto ? (
                  <div className="relative">
                    <div
                      onClick={() => setMenuComponentesAbierto(!menuComponentesAbierto)}
                      className="flex items-center justify-between w-full h-10 px-3 border border-slate-200 rounded-xl bg-white cursor-pointer hover:border-blue-400 transition-colors shadow-xs"
                    >
                      {componenteSeleccionado ? (
                        <div className="truncate text-xs">
                          <strong className="text-slate-900 font-mono mr-2">
                            {componenteSeleccionado.codigo_interno || `REF-${componenteSeleccionado.id_componente}`}
                          </strong>
                          <span className="text-slate-700 font-medium">
                            {componenteSeleccionado.descripcion_corta}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">
                          Selecciona o busca un componente del catálogo...
                        </span>
                      )}
                      <Search className="h-4 w-4 text-slate-400 shrink-0 ml-2" />
                    </div>

                    {menuComponentesAbierto && (
                      <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl p-2 space-y-2 max-h-60 overflow-y-auto">
                        <Input
                          placeholder="Filtrar por nombre, SKU o marca..."
                          value={busquedaComponente}
                          onChange={(e) => setBusquedaComponente(e.target.value)}
                          className="h-8 text-xs border-slate-200"
                          autoFocus
                        />
                        <div className="divide-y divide-slate-100">
                          {cargandoComponentes ? (
                            <div className="py-6 flex flex-col items-center justify-center gap-2 text-xs text-slate-500">
                              <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                              <span>Cargando catálogo maestro...</span>
                            </div>
                          ) : componentesFiltrados.length === 0 ? (
                            <div className="py-4 text-center text-xs text-slate-400">
                              No se encontraron componentes con esa búsqueda
                            </div>
                          ) : (
                            componentesFiltrados.map((c) => (
                              <div
                                key={c.id_componente}
                                onClick={() => handleSeleccionarComponente(c)}
                                className="p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors flex items-center justify-between gap-2"
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-xs text-slate-900">
                                      {c.codigo_interno || `REF-${c.id_componente}`}
                                    </span>
                                    {c.marcas?.nombre && (
                                      <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-slate-200">
                                        {c.marcas.nombre}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-600 truncate mt-0.5">
                                    {c.descripcion_corta}
                                  </p>
                                  {c.referencia_fabricante && (
                                    <p className="text-[10px] text-slate-400 font-mono">
                                      OEM: {c.referencia_fabricante}
                                    </p>
                                  )}
                                </div>
                                <span className="font-mono font-semibold text-xs text-slate-800 shrink-0">
                                  ${Number(c.precio_compra || 0).toLocaleString()}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            )}

            {modo === 'crear' && origen === 'desde_articulo' && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Truck className="h-3.5 w-3.5 text-indigo-600" />
                    Proveedor Comercial a Homologar *
                  </Label>
                  {proveedorSeleccionado && (
                    <button
                      type="button"
                      onClick={() => setMenuProveedoresAbierto(true)}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer"
                    >
                      Cambiar proveedor
                    </button>
                  )}
                </div>

                {!proveedorSeleccionado || menuProveedoresAbierto ? (
                  <div className="relative">
                    <div
                      onClick={() => setMenuProveedoresAbierto(!menuProveedoresAbierto)}
                      className="flex items-center justify-between w-full h-10 px-3 border border-slate-200 rounded-xl bg-white cursor-pointer hover:border-indigo-400 transition-colors shadow-xs"
                    >
                      {proveedorSeleccionado ? (
                        <div className="truncate text-xs">
                          <strong className="text-slate-900 mr-2">
                            {getNombreProveedor(proveedorSeleccionado.persona, proveedorSeleccionado.id_proveedor)}
                          </strong>
                          {proveedorSeleccionado.persona?.numero_identificacion && (
                            <span className="text-slate-500 font-mono text-[11px]">
                              NIT: {proveedorSeleccionado.persona.numero_identificacion}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">
                          Selecciona o busca un proveedor del directorio...
                        </span>
                      )}
                      <Search className="h-4 w-4 text-slate-400 shrink-0 ml-2" />
                    </div>

                    {menuProveedoresAbierto && (
                      <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl p-2 space-y-2 max-h-60 overflow-y-auto">
                        <Input
                          placeholder="Filtrar por razón social o NIT..."
                          value={busquedaProveedor}
                          onChange={(e) => setBusquedaProveedor(e.target.value)}
                          className="h-8 text-xs border-slate-200"
                          autoFocus
                        />
                        <div className="divide-y divide-slate-100">
                          {cargandoProveedores ? (
                            <div className="py-6 flex flex-col items-center justify-center gap-2 text-xs text-slate-500">
                              <RefreshCw className="h-4 w-4 animate-spin text-indigo-600" />
                              <span>Cargando proveedores...</span>
                            </div>
                          ) : proveedoresFiltrados.length === 0 ? (
                            <div className="py-4 text-center text-xs text-slate-400">
                              No se encontraron proveedores con ese filtro
                            </div>
                          ) : (
                            proveedoresFiltrados.map((p) => {
                              const nombreProv = getNombreProveedor(p.persona, p.id_proveedor);
                              return (
                                <div
                                  key={p.id_proveedor}
                                  onClick={() => handleSeleccionarProveedor(p)}
                                  className="p-2.5 hover:bg-indigo-50/50 rounded-lg cursor-pointer transition-colors flex items-center justify-between gap-2"
                                >
                                  <div className="min-w-0">
                                    <span className="font-bold text-xs text-slate-900 block truncate">
                                      {nombreProv}
                                    </span>
                                    {p.persona?.numero_identificacion && (
                                      <span className="text-[10px] text-slate-400 font-mono">
                                        NIT: {p.persona.numero_identificacion}
                                      </span>
                                    )}
                                  </div>
                                  <Badge variant="outline" className="text-[10px] border-slate-200 text-slate-600 shrink-0">
                                    {p.categoria_proveedor}
                                  </Badge>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            )}

            {/* TARJETA DE CONTEXTO DUAL (REPUESTO & PROVEEDOR) */}
            {(repuestoContexto || proveedorContexto) && (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-3">
                {repuestoContexto && (
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Repuesto Catálogo Base
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-xs font-bold text-slate-900">
                        {repuestoContexto.codigo}
                      </span>
                      {repuestoContexto.marca && (
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-slate-200 bg-white">
                          {repuestoContexto.marca}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-700 font-medium truncate" title={repuestoContexto.descripcion}>
                      {repuestoContexto.descripcion}
                    </p>
                    {repuestoContexto.oem && (
                      <p className="text-[10px] text-slate-500 font-mono">
                        Ref. OEM: {repuestoContexto.oem}
                      </p>
                    )}
                  </div>
                )}

                {proveedorContexto && (
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Fuente Comercial (Proveedor)
                    </span>
                    <span className="font-bold text-xs text-slate-900 block truncate" title={proveedorContexto.nombre}>
                      {proveedorContexto.nombre}
                    </span>
                    {proveedorContexto.nit && (
                      <span className="text-[11px] font-mono text-slate-500 block">
                        NIT: {proveedorContexto.nit}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 2. IDENTIFICACIÓN EN FACTURAS DEL PROVEEDOR */}
            <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-900">
                    Identificación Comercial en Facturas del Proveedor
                  </span>
                </div>
                <span className="text-[10px] text-slate-400">Datos con los que el proveedor factura</span>
              </div>

              {/* Nombre según Proveedor con botón de copia rápida */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-700">
                    Nombre / Denominación según Proveedor (Factura) *
                  </Label>
                  {repuestoContexto?.descripcion &&
                    formData.nombre_segun_proveedor !== repuestoContexto.descripcion && (
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            nombre_segun_proveedor: repuestoContexto.descripcion || '',
                          }))
                        }
                        className="text-[10px] font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        <Copy className="h-2.5 w-2.5" />
                        Copiar nombre del catálogo base
                      </button>
                    )}
                </div>
                <Input
                  placeholder="Ej. Elemento Filtrante Lubricante Donaldson P550388..."
                  value={formData.nombre_segun_proveedor}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      nombre_segun_proveedor: e.target.value,
                    }))
                  }
                  required
                  className="text-xs h-9 bg-white border-slate-200 font-medium"
                />
                <p className="text-[11px] text-slate-500">
                  Nombre o descripción literal con la que este proveedor factura o cotiza el ítem.
                </p>
              </div>

              {/* Referencia Proveedor & Marca Ofrecida */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-700">
                      Referencia / SKU del Proveedor *
                    </Label>
                    {repuestoContexto?.oem &&
                      formData.referencia_proveedor !== repuestoContexto.oem && (
                        <button
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              referencia_proveedor: repuestoContexto.oem || '',
                            }))
                          }
                          className="text-[10px] font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline cursor-pointer"
                        >
                          Usar Ref. OEM ({repuestoContexto.oem})
                        </button>
                      )}
                  </div>
                  <Input
                    placeholder="Ej. P550388, 1R-0719, FL-9921..."
                    value={formData.referencia_proveedor}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        referencia_proveedor: e.target.value,
                      }))
                    }
                    required
                    className="font-mono font-bold text-xs h-9 bg-white border-slate-200 text-indigo-900"
                  />
                  <p className="text-[11px] text-slate-500">
                    Código de parte con el que este proveedor factura.
                  </p>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">
                    Marca Comercial Ofrecida
                  </Label>
                  <Input
                    placeholder="Ej. Caterpillar, Donaldson, Baldwin..."
                    value={formData.marca_ofrecida}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        marca_ofrecida: e.target.value,
                      }))
                    }
                    className="text-xs h-9 bg-white border-slate-200"
                  />
                  <p className="text-[11px] text-slate-500">
                    Marca suministrada (OEM o alternativa equivalente).
                  </p>
                </div>
              </div>
            </div>

            {/* 3. CONDICIONES COMERCIALES Y DE ENTREGA */}
            <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-xl space-y-3.5">
              <div className="flex items-center gap-2 border-b border-slate-200/70 pb-2">
                <DollarSign className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-900">
                  Condiciones Comerciales y de Entrega
                </span>
              </div>

              {/* Comparador de Costo en Modo Editar */}
              {modo === 'editar' && datosIniciales?.costo_anterior !== undefined && (
                <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Costo Pactado Anterior
                    </span>
                    <span className="font-mono font-bold text-xs text-slate-700">
                      ${Number(datosIniciales.costo_anterior || 0).toLocaleString()} {formData.moneda}
                    </span>
                  </div>

                  {calculoVariacion && !calculoVariacion.sinCambio && (
                    <Badge
                      className={`text-xs font-mono font-bold flex items-center gap-1 ${
                        calculoVariacion.incremento
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {calculoVariacion.incremento ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {calculoVariacion.pct > 0 ? `+${calculoVariacion.pct}%` : `${calculoVariacion.pct}%`}
                    </Badge>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">
                    {modo === 'editar' ? 'Nuevo Costo Pactado ($ COP) *' : 'Costo Unitario Pactado ($ COP) *'}
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                      $
                    </span>
                    <Input
                      type="number"
                      min={0}
                      step={100}
                      placeholder="0"
                      value={formData.costo_actual || ''}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          costo_actual: Number(e.target.value),
                        }))
                      }
                      required
                      className="pl-7 font-mono font-bold text-xs h-9 bg-white border-slate-200 text-emerald-800"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">
                    Tiempo de Entrega (Días)
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.tiempo_entrega_dias || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        tiempo_entrega_dias: Number(e.target.value),
                      }))
                    }
                    className="font-mono text-xs h-9 bg-white border-slate-200"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">
                    Pedido Mínimo (MOQ)
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    value={formData.cantidad_minima_compra || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        cantidad_minima_compra: Number(e.target.value),
                      }))
                    }
                    className="font-mono text-xs h-9 bg-white border-slate-200"
                  />
                </div>
              </div>

              {/* URL Producto en Catálogo del Proveedor */}
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-slate-400" />
                  Enlace al Producto en Portal / Catálogo del Proveedor (Opcional)
                </Label>
                <Input
                  placeholder="https://tienda.proveedor.com/item/12345"
                  value={formData.url_producto_proveedor}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      url_producto_proveedor: e.target.value,
                    }))
                  }
                  className="text-xs h-9 bg-white border-slate-200 font-mono"
                />
              </div>

              {/* Switch Proveedor Preferente */}
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3.5 flex items-start gap-3">
                <Switch
                  id="switch-pref-sourcing"
                  checked={formData.es_proveedor_preferido}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({
                      ...prev,
                      es_proveedor_preferido: checked,
                    }))
                  }
                  className="mt-0.5"
                />
                <div className="space-y-0.5">
                  <Label htmlFor="switch-pref-sourcing" className="text-xs font-bold text-indigo-950 cursor-pointer">
                    Establecer como Proveedor Preferente (Suministro Principal)
                  </Label>
                  <p className="text-[11px] text-indigo-700 leading-tight">
                    Al generar órdenes de compra para este repuesto, este proveedor será la primera opción automática sugerida.
                  </p>
                </div>
              </div>
            </div>

            {/* 4. TRAZABILIDAD Y AUDITORÍA EN MODO EDITAR */}
            {modo === 'editar' && (
              <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-200/70 pb-2">
                  <FileText className="h-4 w-4 text-slate-600" />
                  <span className="text-xs font-bold text-slate-900">
                    Justificación y Bitácora Histórica de Auditoría
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700">Evento de Origen *</Label>
                    <select
                      value={formData.origen_cambio}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          origen_cambio: e.target.value as OrigenCosto,
                        }))
                      }
                      className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:outline-hidden"
                    >
                      <option value="ACTUALIZACION_PROVEEDOR">Negociación / Tarifa Proveedor</option>
                      <option value="RECEPCION_FACTURA">Recepción Factura de Compra</option>
                      <option value="ORDEN_COMPRA">Orden de Compra Aprobada</option>
                      <option value="AJUSTE_AUDITORIA">Ajuste de Auditoría</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700">No. Factura / OC de Respaldo</Label>
                    <Input
                      placeholder="Ej: FAC-98214 o OC-2026-0042"
                      value={formData.numero_factura_oc}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          numero_factura_oc: e.target.value,
                        }))
                      }
                      className="text-xs h-9 bg-white border-slate-200"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">
                    Observaciones / Motivo del Cambio
                  </Label>
                  <Textarea
                    placeholder="Motivo del cambio: ajuste de lista de precios, incremento arancelario, nuevo acuerdo comercial..."
                    value={formData.observaciones}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        observaciones: e.target.value,
                      }))
                    }
                    rows={2}
                    className="text-xs border-slate-200 resize-none bg-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* FOOTER */}
          <DialogFooter className="p-4 px-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className={`text-xs font-semibold text-white shadow-xs ${
                modo === 'crear'
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {submitting ? (
                <>
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Check className="mr-1.5 h-3.5 w-3.5" />
                  {modo === 'crear' ? 'Guardar Homologación' : 'Confirmar y Registrar en Bitácora'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
