'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  ArquetipoEquipo,
  getArquetiposEam,
} from '@/features/catalogos-eam/api/catalogos-eam.service';
import { comprasService } from '@/lib/api/compras.service';
import { TipoComponente } from '@/types/compras.types';
import { Check, Cpu, Globe2, Loader2, Save, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

interface AplicabilidadTiposComponenteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AplicabilidadTiposComponenteDialog({
  open,
  onOpenChange,
}: AplicabilidadTiposComponenteDialogProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tiposComponente, setTiposComponente] = useState<TipoComponente[]>([]);
  const [tiposEquipo, setTiposEquipo] = useState<ArquetipoEquipo[]>([]);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [aplicaTodos, setAplicaTodos] = useState(true);
  const [selectedEquipoIds, setSelectedEquipoIds] = useState<number[]>([]);

  const hydrateSelection = useCallback((item: TipoComponente | null) => {
    if (!item) {
      setSelectedId(null);
      setAplicaTodos(true);
      setSelectedEquipoIds([]);
      return;
    }
    setSelectedId(item.id_tipo_componente);
    setAplicaTodos(item.aplica_todos_tipos ?? true);
    const ids = Array.isArray(item.tipos_equipo_ids)
      ? item.tipos_equipo_ids
      : Array.isArray(item.tipos_equipo)
        ? item.tipos_equipo.map((t) => t.id_tipo_equipo)
        : [];
    setSelectedEquipoIds(ids);
  }, []);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const [componentes, arquetipos] = await Promise.all([
        comprasService.getTiposComponente(),
        getArquetiposEam(),
      ]);
      setTiposComponente(componentes);
      setTiposEquipo(arquetipos.filter((a) => a.activo !== false));
      if (componentes.length > 0) {
        const current =
          componentes.find((c) => c.id_tipo_componente === selectedId) || componentes[0];
        hydrateSelection(current);
      } else {
        hydrateSelection(null);
      }
    } catch (err) {
      console.error('Error cargando aplicabilidad de tipos de componente:', err);
      toast.error('No se pudo cargar la matriz de aplicabilidad por tipos de equipo');
    } finally {
      setLoading(false);
    }
  }, [hydrateSelection, selectedId]);

  useEffect(() => {
    if (open) {
      cargarDatos();
    }
  }, [open, cargarDatos]);

  const filteredComponentes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tiposComponente;
    return tiposComponente.filter(
      (c) =>
        c.nombre_componente.toLowerCase().includes(q) ||
        (c.codigo_tipo || '').toLowerCase().includes(q) ||
        (c.categoria || '').toLowerCase().includes(q),
    );
  }, [tiposComponente, search]);

  const selectedComponente = useMemo(
    () => tiposComponente.find((c) => c.id_tipo_componente === selectedId) || null,
    [tiposComponente, selectedId],
  );

  const toggleEquipoId = (idTipoEquipo: number) => {
    setSelectedEquipoIds((prev) =>
      prev.includes(idTipoEquipo)
        ? prev.filter((id) => id !== idTipoEquipo)
        : [...prev, idTipoEquipo],
    );
  };

  const handleGuardar = async () => {
    if (!selectedComponente) return;
    if (!aplicaTodos && selectedEquipoIds.length === 0) {
      toast.error('Seleccione al menos un tipo de equipo o active "Aplica a todos los tipos"');
      return;
    }

    setSaving(true);
    try {
      const updated = await comprasService.updateTipoComponenteAplicabilidad(
        selectedComponente.id_tipo_componente,
        {
          aplica_todos_tipos: aplicaTodos,
          tipos_equipo_ids: aplicaTodos ? [] : selectedEquipoIds,
        },
      );

      setTiposComponente((prev) =>
        prev.map((item) =>
          item.id_tipo_componente === updated.id_tipo_componente ? { ...item, ...updated } : item,
        ),
      );
      hydrateSelection({ ...selectedComponente, ...updated });
      toast.success(`Aplicabilidad guardada para "${selectedComponente.nombre_componente}"`);
    } catch (err) {
      console.error('Error guardando aplicabilidad N:M:', err);
      toast.error('No se pudo actualizar la aplicabilidad del tipo de componente');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Cpu className="h-5 w-5 text-blue-600" />
            Aplicabilidad Multi-Tipo de Repuestos y Componentes (N:M)
          </DialogTitle>
          <DialogDescription>
            Define si cada tipo de componente aplica universalmente a todo el parque o solo a clases
            específicas de equipos del catálogo EAM.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-gray-500 gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            Cargando tipos de componente y clases de equipo...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 flex-1 min-h-0 overflow-hidden pt-2">
            {/* Columna izquierda: listado de tipos_componente */}
            <div className="md:col-span-5 flex flex-col min-h-0 border rounded-xl bg-gray-50/70 overflow-hidden">
              <div className="p-2.5 border-b bg-white">
                <div className="relative">
                  <Search className="h-3.5 w-3.5 text-gray-400 absolute left-2.5 top-2.5" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar tipo de componente..."
                    className="pl-8 h-8 text-xs"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {filteredComponentes.map((tc) => {
                  const isSelected = tc.id_tipo_componente === selectedId;
                  const countTipos = tc.tipos_equipo_ids?.length ?? tc.tipos_equipo?.length ?? 0;
                  const esUniversal = tc.aplica_todos_tipos !== false;

                  return (
                    <button
                      key={tc.id_tipo_componente}
                      type="button"
                      onClick={() => hydrateSelection(tc)}
                      className={`w-full text-left p-2.5 rounded-lg border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50 border-blue-300 shadow-xs'
                          : 'bg-white border-gray-200/80 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-gray-900 truncate">
                          {tc.nombre_componente}
                        </span>
                        <Badge
                          variant="outline"
                          className={
                            esUniversal
                              ? 'text-[10px] shrink-0 bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'text-[10px] shrink-0 bg-indigo-50 text-indigo-700 border-indigo-200'
                          }
                        >
                          {esUniversal ? 'Todos los tipos' : `${countTipos} tipo(s)`}
                        </Badge>
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5 truncate">
                        {tc.codigo_tipo || `#${tc.id_tipo_componente}`}
                        {tc.categoria ? ` · ${tc.categoria}` : ''}
                      </div>
                    </button>
                  );
                })}
                {filteredComponentes.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-8">
                    No se encontraron tipos de componente.
                  </p>
                )}
              </div>
            </div>

            {/* Columna derecha: editor N:M */}
            <div className="md:col-span-7 flex flex-col min-h-0 border rounded-xl bg-white overflow-hidden">
              {selectedComponente ? (
                <>
                  <div className="p-4 border-b bg-slate-50/70">
                    <h4 className="text-sm font-bold text-gray-900">
                      {selectedComponente.nombre_componente}
                    </h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Código: <span className="font-mono">{selectedComponente.codigo_tipo}</span>
                      {selectedComponente.categoria
                        ? ` · Categoría: ${selectedComponente.categoria}`
                        : ''}
                    </p>
                  </div>

                  <div className="p-4 space-y-4 flex-1 overflow-y-auto">
                    <div className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-emerald-50/40 border-emerald-200/70">
                      <div className="flex items-start gap-2.5">
                        <Globe2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                        <div>
                          <div className="text-xs font-semibold text-gray-900">
                            Aplica a todos los tipos de equipo
                          </div>
                          <p className="text-[11px] text-gray-600">
                            Disponible de forma universal para cualquier arquetipo activo (presente
                            y futuro).
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={aplicaTodos}
                        onCheckedChange={(checked) => setAplicaTodos(checked)}
                      />
                    </div>

                    {!aplicaTodos && (
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-700">
                            Seleccione los tipos de equipo aplicables ({selectedEquipoIds.length}{' '}
                            seleccionados)
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedEquipoIds(tiposEquipo.map((t) => t.id_tipo_equipo))
                              }
                              className="text-[11px] font-medium text-blue-600 hover:underline cursor-pointer"
                            >
                              Seleccionar todos
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedEquipoIds([])}
                              className="text-[11px] font-medium text-gray-500 hover:underline cursor-pointer"
                            >
                              Limpiar
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {tiposEquipo.map((eq) => {
                            const checked = selectedEquipoIds.includes(eq.id_tipo_equipo);
                            return (
                              <button
                                key={eq.id_tipo_equipo}
                                type="button"
                                onClick={() => toggleEquipoId(eq.id_tipo_equipo)}
                                className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                                  checked
                                    ? 'bg-blue-50 border-blue-400 text-blue-950'
                                    : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700'
                                }`}
                              >
                                <span
                                  className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                                    checked
                                      ? 'bg-blue-600 border-blue-600 text-white'
                                      : 'border-gray-300 bg-white'
                                  }`}
                                >
                                  {checked && <Check className="h-3 w-3" />}
                                </span>
                                <div className="min-w-0">
                                  <div className="text-xs font-semibold truncate">
                                    {eq.nombre_tipo}
                                  </div>
                                  <div className="text-[10px] text-gray-500 font-mono truncate">
                                    {eq.codigo_tipo}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-3 border-t bg-gray-50 flex items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onOpenChange(false)}
                      disabled={saving}
                    >
                      Cerrar
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleGuardar}
                      disabled={saving}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {saving ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      Guardar Aplicabilidad
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center flex-1 text-xs text-gray-400 p-8">
                  Seleccione un tipo de componente para configurar su aplicabilidad por equipo.
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
