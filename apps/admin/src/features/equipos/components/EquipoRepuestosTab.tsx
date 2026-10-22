/**
 * MEKANOS S.A.S - Portal Admin
 * Componente: Repuestos Compatibles (BOM) & Consumo WMS del Activo
 *
 * Bloque A — Matriz BOM: repuestos homologados para la máquina con stock WMS en vivo.
 * Bloque B — Historial Clínico: repuestos e insumos realmente instalados (componentes_usados vía OTs).
 */

'use client';

import { useComponentesStock } from '@/features/inventario/api/inventario-motor.service';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Layers,
  Link2,
  Loader2,
  Package,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  Warehouse,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  BOM_APLICACIONES,
  useDesvincularBomEquipo,
  useVincularBomEquipo,
  type BomItem,
  type FichaLogisticaEquipo,
} from '../lib/equipos-bom.service';

const cop = (v: number) => `$${Math.round(v || 0).toLocaleString('es-CO')}`;
const fecha = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

function StockBadge({ item }: { item: BomItem }) {
  if (item.estado_stock === 'AGOTADO') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap">
        <AlertCircle className="h-3 w-3" /> AGOTADO
      </span>
    );
  }
  return (
    <div className="flex flex-col gap-1 items-start">
      <span
        className={cn(
          'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border whitespace-nowrap',
          item.estado_stock === 'BAJO'
            ? 'bg-amber-50 text-amber-800 border-amber-200'
            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
        )}
      >
        <CheckCircle2 className="h-3 w-3" />
        {item.stock_actual} {item.unidad} {item.estado_stock === 'BAJO' ? '• BAJO MÍNIMO' : 'EN ALMACÉN'}
      </span>
      <div className="flex flex-wrap gap-1">
        {item.bodegas.map((b) => (
          <span
            key={b.id_ubicacion}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px] text-slate-700 whitespace-nowrap"
          >
            <Warehouse className="h-2.5 w-2.5 text-slate-400" />
            {b.codigo}: <strong>{b.stock}</strong>
          </span>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODAL: VINCULAR REPUESTO AL BOM
// ═══════════════════════════════════════════════════════════════════════════════
function ModalVincularBom({
  idEquipo,
  yaVinculados,
  onClose,
}: {
  idEquipo: number;
  yaVinculados: Set<number>;
  onClose: () => void;
}) {
  const [busqueda, setBusqueda] = useState('');
  const [debounced, setDebounced] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [seleccionado, setSeleccionado] = useState<any | null>(null);
  const [categoria, setCategoria] = useState('FILTRO_ACEITE');
  const [cantidad, setCantidad] = useState('1');
  const [frecuencia, setFrecuencia] = useState('');
  const [notas, setNotas] = useState('');
  const [error, setError] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const vincular = useVincularBomEquipo(idEquipo);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(busqueda), 250);
    return () => clearTimeout(t);
  }, [busqueda]);

  useEffect(() => {
    if (!showDropdown) return;
    const h = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showDropdown]);

  const { data, isLoading } = useComponentesStock({ busqueda: debounced || undefined, limit: 12 });
  const resultados = useMemo(() => data?.data || [], [data]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!seleccionado) {
      setError('Seleccione un artículo del Catálogo Maestro');
      return;
    }
    const cant = parseFloat(cantidad);
    if (!(cant > 0)) {
      setError('La cantidad por servicio debe ser mayor a 0');
      return;
    }
    const frec = frecuencia.trim() === '' ? null : parseInt(frecuencia, 10);
    if (frec !== null && !(frec > 0)) {
      setError('La frecuencia debe ser un número de horas mayor a 0');
      return;
    }
    try {
      await vincular.mutateAsync({
        id_componente: seleccionado.id_componente,
        categoria_aplicacion: categoria,
        cantidad_requerida: cant,
        frecuencia_cambio_horas: frec,
        notas_tecnicas: notas.trim() || null,
      });
      toast.success('Repuesto vinculado al BOM del equipo');
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'No se pudo vincular el repuesto');
    }
  };

  const inputCls =
    'w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 shadow-2xs hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl border bg-blue-50 text-blue-700 border-blue-200">
              <Link2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Vincular Repuesto al BOM del Equipo</h2>
              <p className="text-xs text-slate-500">Homologa un artículo del Catálogo Maestro como compatible con esta máquina</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-5 overflow-y-auto space-y-4 flex-1">
            {error && (
              <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Artículo del Catálogo Maestro *</label>
              {seleccionado ? (
                <div className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-xl flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="font-mono text-xs font-bold text-slate-800 bg-slate-200/80 px-2 py-0.5 rounded border border-slate-300/60">
                      {seleccionado.codigo || `ART-${seleccionado.id_componente}`}
                    </span>
                    <p className="text-sm font-bold text-slate-900 mt-1.5">{seleccionado.nombre || seleccionado.referencia}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Ref: {seleccionado.referencia} • Marca: {seleccionado.marca || 'N/A'} • Stock global:{' '}
                      <strong>{seleccionado.stock_actual} {seleccionado.unidad || 'UND'}</strong>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSeleccionado(null); setBusqueda(''); }}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 text-blue-700 border border-slate-200 rounded-lg text-xs font-semibold shrink-0 cursor-pointer"
                  >
                    Cambiar
                  </button>
                </div>
              ) : (
                <div ref={wrapRef} className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar por código ART-2026, referencia o descripción (Ej: Filtro, Aceite)..."
                    value={busqueda}
                    onChange={(e) => { setBusqueda(e.target.value); setShowDropdown(true); }}
                    onFocus={() => setShowDropdown(true)}
                    className={cn(inputCls, 'pl-10')}
                  />
                  {showDropdown && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100">
                      {isLoading ? (
                        <div className="p-4 text-xs text-slate-500 flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" /> Consultando catálogo...
                        </div>
                      ) : resultados.length === 0 ? (
                        <p className="p-4 text-xs text-slate-500 text-center font-medium">No se encontraron artículos</p>
                      ) : (
                        resultados.map((c: any) => {
                          const ya = yaVinculados.has(c.id_componente);
                          return (
                            <button
                              key={c.id_componente}
                              type="button"
                              disabled={ya}
                              onClick={() => { setSeleccionado(c); setShowDropdown(false); }}
                              className="w-full text-left p-3 hover:bg-blue-50/60 flex items-center justify-between gap-3 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                    {c.codigo || `ART-${c.id_componente}`}
                                  </span>
                                  <p className="text-xs font-bold text-slate-900 truncate">{c.nombre || c.referencia}</p>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5">REF: {c.referencia} • Marca: {c.marca || 'S/M'}</p>
                              </div>
                              <span className={cn('text-xs font-bold shrink-0 whitespace-nowrap', ya ? 'text-slate-500' : c.stock_actual > 0 ? 'text-emerald-700' : 'text-rose-600')}>
                                {ya ? 'Ya vinculado' : `Stock: ${c.stock_actual} ${c.unidad || 'UND'}`}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Aplicación en la máquina *</label>
                <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className={inputCls}>
                  {BOM_APLICACIONES.map((a) => (
                    <option key={a.value} value={a.value}>{a.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Cantidad por servicio * {seleccionado?.unidad ? `(${seleccionado.unidad})` : ''}
                </label>
                <input type="number" min="0.01" step="any" value={cantidad} onChange={(e) => setCantidad(e.target.value)} className={inputCls} required />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Frecuencia de cambio (horas) <span className="text-slate-400 normal-case font-medium">— opcional</span>
              </label>
              <input type="number" min="1" step="1" placeholder="Ej: 250" value={frecuencia} onChange={(e) => setFrecuencia(e.target.value)} className={inputCls} />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Notas técnicas <span className="text-slate-400 normal-case font-medium">— opcional</span>
              </label>
              <input type="text" placeholder="Ej: Cárter 16.4 L, SAE 15W40" value={notas} onChange={(e) => setNotas(e.target.value)} className={inputCls} />
            </div>
          </div>

          <div className="px-5 py-3 bg-slate-50/90 border-t border-slate-200 flex items-center justify-end gap-2.5 shrink-0">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={vincular.isPending || !seleccionado}
              className="px-4 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {vincular.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
              Vincular al BOM
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PESTAÑA 2
// ═══════════════════════════════════════════════════════════════════════════════
export function EquipoRepuestosTab({
  idEquipo,
  ficha,
  isLoading,
  isError,
  onRetry,
}: {
  idEquipo: number;
  ficha?: FichaLogisticaEquipo;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  const [showVincular, setShowVincular] = useState(false);
  const [aDesvincular, setADesvincular] = useState<BomItem | null>(null);
  const desvincular = useDesvincularBomEquipo(idEquipo);

  const bom = ficha?.repuestos_compatibles ?? [];
  const instalados = ficha?.repuestos_instalados ?? [];
  const yaVinculados = useMemo(() => new Set(bom.map((b) => b.id_componente)), [bom]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
      </div>
    );
  }
  if (isError || !ficha) {
    return (
      <div className="p-8 text-center bg-red-50 rounded-2xl border border-red-200 text-red-700">
        <AlertCircle className="h-8 w-8 mx-auto mb-2" />
        <p className="font-bold">No se pudo cargar el expediente logístico del activo</p>
        <button onClick={onRetry} className="mt-3 px-3 py-1.5 text-xs font-semibold bg-white border border-red-200 rounded-lg hover:bg-red-100 cursor-pointer">
          Reintentar
        </button>
      </div>
    );
  }

  const confirmarDesvinculacion = async () => {
    if (!aDesvincular) return;
    try {
      await desvincular.mutateAsync(aDesvincular.id_componente_equipo);
      toast.success('Repuesto desvinculado del BOM');
      setADesvincular(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'No se pudo desvincular el repuesto');
    }
  };

  return (
    <div className="space-y-6">
      {/* BLOQUE A — MATRIZ BOM */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-slate-900 flex items-center gap-2">
                <Layers className="h-5 w-5 text-blue-600" />
                Matriz BOM — Repuestos Compatibles con esta Máquina
              </h4>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                {bom.length} {bom.length === 1 ? 'ítem' : 'ítems'}
              </span>
              {ficha.resumen.bom_agotados > 0 && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                  {ficha.resumen.bom_agotados} agotado{ficha.resumen.bom_agotados > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Stock en vivo del Almacén WMS por bodega, con acceso directo a ficha logística y reposición</p>
          </div>
          <button
            type="button"
            onClick={() => setShowVincular(true)}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Vincular Repuesto al BOM
          </button>
        </div>

        {bom.length === 0 ? (
          <div className="text-center py-10 px-4 text-slate-500">
            <Package className="h-11 w-11 mx-auto mb-2.5 text-slate-300" />
            <p className="font-semibold text-slate-700 text-sm">Este equipo aún no tiene repuestos homologados</p>
            <p className="text-xs mt-0.5 max-w-md mx-auto">
              Vincule filtros, lubricantes, correas y baterías compatibles para ver su disponibilidad en almacén y sugerirlos al despachar en una orden.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <th className="px-4 py-3">SKU / Repuesto</th>
                  <th className="px-4 py-3">Aplicación</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Cant. / Servicio</th>
                  <th className="px-4 py-3">Disponibilidad WMS</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Costo Unit.</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bom.map((b) => (
                  <tr key={b.id_componente_equipo} className="hover:bg-slate-50/70 transition-colors align-top">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 whitespace-nowrap">
                          {b.sku || `ART-${b.id_componente}`}
                        </span>
                        <span className="text-sm font-bold text-slate-900">{b.descripcion}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {b.referencia_fabricante ? `Ref: ${b.referencia_fabricante}` : 'Ref: Estándar'}
                        {b.marca ? ` • Marca: ${b.marca}` : ''}
                        {b.notas_tecnicas ? ` • ${b.notas_tecnicas}` : ''}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
                        {b.aplicacion_label}
                      </span>
                      {b.frecuencia_cambio_horas && (
                        <p className="text-[10px] text-slate-400 mt-1 whitespace-nowrap">Cada {b.frecuencia_cambio_horas.toLocaleString('es-CO')} hrs</p>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right text-sm font-bold text-slate-900 whitespace-nowrap">
                      {b.cantidad_requerida} <span className="text-[10px] font-semibold text-slate-500">{b.unidad}</span>
                    </td>
                    <td className="px-4 py-3.5"><StockBadge item={b} /></td>
                    <td className="px-4 py-3.5 text-right text-sm font-mono text-slate-700 whitespace-nowrap">{cop(b.precio_compra)}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/inventario/${b.id_componente}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg whitespace-nowrap"
                          title="Abrir ficha logística en Inventario WMS"
                        >
                          <ExternalLink className="h-3.5 w-3.5" /> Ver en WMS
                        </Link>
                        {b.estado_stock !== 'OK' && (
                          <Link
                            href={`/compras/ordenes/nueva?componenteId=${b.id_componente}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg whitespace-nowrap"
                            title="Crear orden de compra para reponer"
                          >
                            <ShoppingCart className="h-3.5 w-3.5" /> Pedir
                          </Link>
                        )}
                        <button
                          type="button"
                          onClick={() => setADesvincular(b)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                          title="Desvincular del BOM"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* BLOQUE B — HISTORIAL CLÍNICO DE REPUESTOS INSTALADOS */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-bold text-slate-900 flex items-center gap-2">
              <Package className="h-5 w-5 text-amber-600" />
              Historial Clínico de Repuestos e Insumos Instalados
            </h4>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
              {instalados.length} {instalados.length === 1 ? 'registro' : 'registros'}
            </span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              Inversión acumulada: {cop(ficha.resumen.total_inversion_repuestos)}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Consolidado automático desde las Órdenes de Servicio ejecutadas sobre este activo</p>
        </div>

        {instalados.length === 0 ? (
          <div className="text-center py-10 px-4 text-slate-500">
            <Package className="h-11 w-11 mx-auto mb-2.5 text-slate-300" />
            <p className="font-semibold text-slate-700 text-sm">Sin repuestos imputados a este equipo</p>
            <p className="text-xs mt-0.5">Los despachos hechos en sus Órdenes de Servicio aparecerán aquí automáticamente.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Orden</th>
                  <th className="px-4 py-3">Repuesto / Insumo</th>
                  <th className="px-4 py-3">Origen / Lote</th>
                  <th className="px-4 py-3">Kardex</th>
                  <th className="px-4 py-3 text-right">Cant.</th>
                  <th className="px-4 py-3 text-right text-emerald-700">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {instalados.map((r) => (
                  <tr key={r.id_componente_usado} className="hover:bg-slate-50/70 transition-colors align-top">
                    <td className="px-4 py-3.5 text-xs text-slate-600 whitespace-nowrap">{fecha(r.fecha_uso)}</td>
                    <td className="px-4 py-3.5">
                      <Link
                        href={`/ordenes/${r.id_orden_servicio}`}
                        className="inline-flex items-center gap-1 font-mono text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded border border-blue-200 whitespace-nowrap"
                      >
                        {r.numero_orden || `OS #${r.id_orden_servicio}`}
                        <ExternalLink className="h-3 w-3 opacity-70" />
                      </Link>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        {r.id_componente ? (
                          <Link
                            href={`/inventario/${r.id_componente}`}
                            className="font-mono text-xs font-bold text-slate-800 bg-slate-100 hover:bg-amber-50 px-2 py-0.5 rounded border border-slate-200 whitespace-nowrap"
                          >
                            {r.sku || `ART-${r.id_componente}`}
                          </Link>
                        ) : (
                          <span className="font-mono text-[10px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">EXTERNO</span>
                        )}
                        <span className="text-sm font-bold text-slate-900">{r.descripcion}</span>
                      </div>
                      {r.marca && <p className="text-[11px] text-slate-500 mt-0.5">Marca: {r.marca}</p>}
                    </td>
                    <td className="px-4 py-3.5">
                      {r.origen_componente === 'BODEGA' && r.bodega_codigo ? (
                        <div className="flex flex-col gap-1 items-start">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 whitespace-nowrap">
                            <Warehouse className="h-3 w-3" /> {r.bodega_codigo}
                          </span>
                          {r.codigo_lote && (
                            <span className="inline-flex px-2 py-0.5 rounded font-mono text-[10px] font-semibold bg-amber-50 text-amber-900 border border-amber-200 whitespace-nowrap">
                              {r.codigo_lote}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
                          {r.origen_componente === 'BODEGA' ? 'BODEGA WMS' : 'COMPRA DIRECTA'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {r.id_movimiento_inventario ? (
                        <span className="inline-flex font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 whitespace-nowrap">
                          KARDEX #{r.id_movimiento_inventario}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic whitespace-nowrap">Imputación directa</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right text-sm font-bold text-slate-900 whitespace-nowrap">
                      {r.cantidad} <span className="text-[10px] font-semibold text-slate-500">{r.unidad}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right text-sm font-mono font-bold text-emerald-800 whitespace-nowrap">{cop(r.costo_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showVincular && (
        <ModalVincularBom idEquipo={idEquipo} yaVinculados={yaVinculados} onClose={() => setShowVincular(false)} />
      )}

      {aDesvincular && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs" onClick={() => setADesvincular(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200">
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200">
                <Trash2 className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Desvincular repuesto del BOM</h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="font-mono text-[10px] font-bold text-slate-500">{aDesvincular.sku}</span>
                <p className="text-sm font-bold text-slate-900">{aDesvincular.descripcion}</p>
                <p className="text-xs text-slate-500">{aDesvincular.aplicacion_label}</p>
              </div>
              <p className="text-xs text-slate-600">
                El artículo dejará de sugerirse como compatible con esta máquina. No se modifica el inventario ni los consumos ya registrados.
              </p>
              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button type="button" onClick={() => setADesvincular(null)} disabled={desvincular.isPending} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer">
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmarDesvinculacion}
                  disabled={desvincular.isPending}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {desvincular.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  Desvincular
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
