'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  getArquetiposEam,
  getModelosOemEam,
} from '@/features/catalogos-eam/api/catalogos-eam.service';
import {
  RUBRO_OTRO_PRESETS,
  TIPO_COTIZACION_PRESETS,
  type PlantillaCotizacionItem,
  type PlantillaCotizacionRecord,
} from '@/features/comercial/api/comercial.service';
import {
  usePlantillasActions,
  usePlantillasCotizacion,
} from '@/features/comercial/hooks/use-comercial';
import { useServiciosComerciales } from '@/features/ordenes/hooks/use-catalogos';
import { useOrgFormatters } from '@/hooks/use-org-formatters';
import { comprasService } from '@/lib/api/compras.service';
import { useQuery } from '@tanstack/react-query';
import {
  Copy,
  Edit3,
  Layers,
  Loader2,
  Package,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Truck,
  Wrench,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

interface Props {
  onSelectForNewQuote?: (plantilla: PlantillaCotizacionRecord) => void;
}

interface DraftPlantilla {
  id_plantilla?: number;
  codigo_plantilla: string;
  nombre: string;
  descripcion: string;
  tipo_cotizacion: string;
  id_tipo_equipo: string;
  id_modelo_equipo: string;
  id_modulo: string;
  asunto_sugerido: string;
  descripcion_general: string;
  alcance_trabajo: string;
  exclusiones: string;
  terminos_condiciones: string;
  forma_pago: string;
  meses_garantia: string;
  tiempo_estimado_dias: string;
  usa_aiu: boolean;
  aiu_admin_porcentaje: string;
  aiu_imprevistos_porcentaje: string;
  aiu_utilidad_porcentaje: string;
  iva_sobre_utilidad_aiu: boolean;
  items: PlantillaCotizacionItem[];
}

const EMPTY_DRAFT: DraftPlantilla = {
  codigo_plantilla: '',
  nombre: '',
  descripcion: '',
  tipo_cotizacion: 'SERVICIO_TECNICO',
  id_tipo_equipo: 'NONE',
  id_modelo_equipo: 'NONE',
  id_modulo: 'NONE',
  asunto_sugerido: '',
  descripcion_general: '',
  alcance_trabajo: '',
  exclusiones: '',
  terminos_condiciones: '',
  forma_pago: 'CONTADO',
  meses_garantia: '3',
  tiempo_estimado_dias: '2',
  usa_aiu: false,
  aiu_admin_porcentaje: '10',
  aiu_imprevistos_porcentaje: '5',
  aiu_utilidad_porcentaje: '5',
  iva_sobre_utilidad_aiu: false,
  items: [],
};

function plantillaToDraft(pl: PlantillaCotizacionRecord, asCopy = false): DraftPlantilla {
  return {
    id_plantilla: asCopy ? undefined : pl.id_plantilla,
    codigo_plantilla: asCopy ? '' : pl.codigo_plantilla,
    nombre: asCopy ? `${pl.nombre} (Copia)` : pl.nombre,
    descripcion: pl.descripcion || '',
    tipo_cotizacion: pl.tipo_cotizacion || 'SERVICIO_TECNICO',
    id_tipo_equipo: pl.id_tipo_equipo ? String(pl.id_tipo_equipo) : 'NONE',
    id_modelo_equipo: pl.id_modelo_equipo ? String(pl.id_modelo_equipo) : 'NONE',
    id_modulo: pl.id_modulo ? String(pl.id_modulo) : 'NONE',
    asunto_sugerido: pl.asunto_sugerido || '',
    descripcion_general: pl.descripcion_general || '',
    alcance_trabajo: pl.alcance_trabajo || '',
    exclusiones: pl.exclusiones || '',
    terminos_condiciones: pl.terminos_condiciones || '',
    forma_pago: pl.forma_pago || 'CONTADO',
    meses_garantia: String(pl.meses_garantia ?? 3),
    tiempo_estimado_dias: pl.tiempo_estimado_dias != null ? String(pl.tiempo_estimado_dias) : '',
    usa_aiu: Boolean(pl.usa_aiu),
    aiu_admin_porcentaje: String(pl.aiu_admin_porcentaje ?? 0),
    aiu_imprevistos_porcentaje: String(pl.aiu_imprevistos_porcentaje ?? 0),
    aiu_utilidad_porcentaje: String(pl.aiu_utilidad_porcentaje ?? 0),
    iva_sobre_utilidad_aiu: Boolean(pl.iva_sobre_utilidad_aiu),
    items: (pl.items || []).map((it, idx) => ({ ...it, orden_item: idx + 1 })),
  };
}

export function PlantillasCotizacionManager({ onSelectForNewQuote }: Props) {
  const { formatCurrency } = useOrgFormatters();
  const [search, setSearch] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('TODOS');
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<DraftPlantilla>(EMPTY_DRAFT);

  const { data: plantillas = [], isLoading } = usePlantillasCotizacion();
  const { crear, actualizar, eliminar } = usePlantillasActions();
  const { data: servicios = [] } = useServiciosComerciales({ activo: true, limit: 300 });
  const { data: componentesData } = useQuery({
    queryKey: ['cpq-catalogo-componentes-plantillas'],
    queryFn: () => comprasService.getArticulos({ activo: true, limit: 300 }),
    staleTime: 2 * 60_000,
  });
  const { data: unidadesMedida = [] } = useQuery({
    queryKey: ['cpq-unidades-medida'],
    queryFn: () => comprasService.getUnidadesMedida(),
    staleTime: 30 * 60_000,
  });
  const { data: arquetipos = [] } = useQuery({
    queryKey: ['eam-arquetipos-plantillas'],
    queryFn: () => getArquetiposEam(),
    staleTime: 10 * 60_000,
  });
  const { data: modelos = [] } = useQuery({
    queryKey: ['eam-modelos-plantillas'],
    queryFn: () => getModelosOemEam(),
    staleTime: 10 * 60_000,
  });

  const componentes = useMemo(() => componentesData?.items || [], [componentesData]);

  const tiposFiltroOpciones = useMemo(() => {
    const map = new Map<string, string>();
    for (const preset of TIPO_COTIZACION_PRESETS) {
      map.set(preset.value, preset.label);
    }
    for (const pl of plantillas) {
      if (pl.tipo_cotizacion && !map.has(pl.tipo_cotizacion)) {
        map.set(pl.tipo_cotizacion, pl.tipo_cotizacion.replace(/_/g, ' '));
      }
    }
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [plantillas]);

  const modulosDisponibles = useMemo(() => {
    if (draft.id_tipo_equipo === 'NONE') return [];
    const arq = arquetipos.find((a) => String(a.id_tipo_equipo) === draft.id_tipo_equipo);
    return (arq?.tipo_equipo_modulos || [])
      .filter((tm) => tm.modulo)
      .map((tm) => ({
        id_modulo: tm.id_modulo,
        nombre: tm.etiqueta_local || tm.modulo.nombre_modulo,
        codigo: tm.modulo.codigo_modulo,
      }));
  }, [arquetipos, draft.id_tipo_equipo]);

  const filtradas = useMemo(() => {
    const q = search.trim().toLowerCase();
    return plantillas.filter((p) => {
      if (tipoFiltro !== 'TODOS' && p.tipo_cotizacion !== tipoFiltro) return false;
      if (!q) return true;
      return (
        p.nombre.toLowerCase().includes(q) ||
        p.codigo_plantilla.toLowerCase().includes(q) ||
        (p.descripcion || '').toLowerCase().includes(q) ||
        (p.tipos_equipo?.nombre_tipo || '').toLowerCase().includes(q)
      );
    });
  }, [plantillas, search, tipoFiltro]);

  const modelosFiltrados = useMemo(() => {
    if (draft.id_tipo_equipo === 'NONE') return modelos;
    return modelos.filter((m) => String(m.id_tipo_equipo) === draft.id_tipo_equipo);
  }, [modelos, draft.id_tipo_equipo]);

  const openNew = () => {
    setDraft(EMPTY_DRAFT);
    setEditorOpen(true);
  };

  const openEdit = (pl: PlantillaCotizacionRecord) => {
    setDraft(plantillaToDraft(pl, false));
    setEditorOpen(true);
  };

  const openDuplicate = (pl: PlantillaCotizacionRecord) => {
    setDraft(plantillaToDraft(pl, true));
    setEditorOpen(true);
  };

  const addDraftLine = (tipo: 'SERVICIO' | 'COMPONENTE' | 'OTRO') => {
    const next: PlantillaCotizacionItem = {
      tipo_linea: tipo,
      id_servicio: null,
      id_componente: null,
      categoria_rubro: tipo === 'OTRO' ? 'TRANSPORTE' : null,
      descripcion: '',
      detalle_calculo: '',
      unidad: tipo === 'SERVICIO' ? 'servicio' : tipo === 'OTRO' ? 'global' : 'unidad',
      cantidad_base: 1,
      es_por_equipo: tipo !== 'OTRO',
      usar_precio_catalogo: tipo !== 'OTRO',
      precio_unitario_fijo: 0,
      costo_unitario_fijo: 0,
      visible_cliente: true,
      es_opcional: false,
      iva_aplicable: true,
      orden_item: draft.items.length + 1,
    };
    setDraft((prev) => ({ ...prev, items: [...prev.items, next] }));
  };

  const updateLine = (idx: number, patch: Partial<PlantillaCotizacionItem>) => {
    setDraft((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === idx ? { ...item, ...patch } : item)),
    }));
  };

  const removeLine = (idx: number) => {
    setDraft((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.nombre.trim()) {
      toast.error('Ingresa el nombre de la plantilla');
      return;
    }
    const itemsValidos = draft.items.filter((i) => i.descripcion.trim().length > 0);
    if (itemsValidos.length === 0) {
      toast.error('Agrega al menos una línea con descripción a la plantilla');
      return;
    }

    const payload: Partial<PlantillaCotizacionRecord> = {
      codigo_plantilla: draft.codigo_plantilla.trim() || undefined,
      nombre: draft.nombre.trim(),
      descripcion: draft.descripcion.trim() || null,
      tipo_cotizacion: draft.tipo_cotizacion.trim() || 'SERVICIO_TECNICO',
      id_tipo_equipo: draft.id_tipo_equipo !== 'NONE' ? Number(draft.id_tipo_equipo) : null,
      id_modelo_equipo: draft.id_modelo_equipo !== 'NONE' ? Number(draft.id_modelo_equipo) : null,
      id_modulo: draft.id_modulo !== 'NONE' ? Number(draft.id_modulo) : null,
      asunto_sugerido: draft.asunto_sugerido.trim() || null,
      descripcion_general: draft.descripcion_general.trim() || null,
      alcance_trabajo: draft.alcance_trabajo.trim() || null,
      exclusiones: draft.exclusiones.trim() || null,
      terminos_condiciones: draft.terminos_condiciones.trim() || null,
      forma_pago: draft.forma_pago.trim() || 'CONTADO',
      meses_garantia: Number(draft.meses_garantia) || 0,
      tiempo_estimado_dias: draft.tiempo_estimado_dias ? Number(draft.tiempo_estimado_dias) : null,
      usa_aiu: draft.usa_aiu,
      aiu_admin_porcentaje: draft.usa_aiu ? Number(draft.aiu_admin_porcentaje) || 0 : 0,
      aiu_imprevistos_porcentaje: draft.usa_aiu ? Number(draft.aiu_imprevistos_porcentaje) || 0 : 0,
      aiu_utilidad_porcentaje: draft.usa_aiu ? Number(draft.aiu_utilidad_porcentaje) || 0 : 0,
      iva_sobre_utilidad_aiu: draft.usa_aiu && draft.iva_sobre_utilidad_aiu,
      items: itemsValidos.map((it, idx) => ({
        ...it,
        cantidad_base: Number(it.cantidad_base) || 1,
        precio_unitario_fijo:
          it.precio_unitario_fijo != null ? Number(it.precio_unitario_fijo) : 0,
        costo_unitario_fijo: it.costo_unitario_fijo != null ? Number(it.costo_unitario_fijo) : 0,
        orden_item: idx + 1,
      })),
    };

    if (draft.id_plantilla) {
      await actualizar.mutateAsync({ id: draft.id_plantilla, payload });
    } else {
      await crear.mutateAsync(payload);
    }
    setEditorOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Barra superior */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar plantilla por nombre, código o clase de equipo..."
              className="pl-9 bg-white"
            />
          </div>
          <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
            <SelectTrigger className="w-56 bg-white">
              <SelectValue placeholder="Todos los tipos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos los tipos de oferta</SelectItem>
              {tiposFiltroOpciones.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openNew} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Nueva Plantilla Estándar
        </Button>
      </div>

      {/* Listado */}
      {isLoading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : filtradas.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center space-y-2">
            <Layers className="h-10 w-10 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">
              No hay plantillas que coincidan con el filtro
            </p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Crea plantillas estándar (ej. Suministro de Baterías, Preventivo Multi-Equipo, Correctivo con Viáticos) para cotizar en segundos con auto-escalado por equipos gemelos.
            </p>
            <Button size="sm" variant="outline" onClick={openNew} className="mt-2">
              <Plus className="h-4 w-4 mr-1" />
              Crear primera plantilla
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtradas.map((pl) => {
            const countServ = pl.items.filter((i) => i.tipo_linea === 'SERVICIO').length;
            const countComp = pl.items.filter((i) => i.tipo_linea === 'COMPONENTE').length;
            const countOtro = pl.items.filter((i) => i.tipo_linea === 'OTRO').length;
            const subtotalBase = pl.items
              .filter((i) => !i.es_opcional && i.visible_cliente !== false)
              .reduce((acc, i) => acc + Number(i.cantidad_base) * Number(i.precio_unitario_fijo || 0), 0);

            return (
              <Card
                key={pl.id_plantilla}
                className="group border-slate-200 hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-mono font-semibold text-slate-400">
                        {pl.codigo_plantilla}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 leading-snug mt-0.5">
                        {pl.nombre}
                      </h3>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0 bg-slate-50">
                      {pl.tipo_cotizacion.replace(/_/g, ' ')}
                    </Badge>
                  </div>

                  {pl.descripcion && (
                    <p className="text-xs text-slate-600 line-clamp-2">{pl.descripcion}</p>
                  )}

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {pl.modelos_equipo ? (
                      <Badge className="bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-50 text-[10px]">
                        OEM: {pl.modelos_equipo.marca} {pl.modelos_equipo.modelo}
                      </Badge>
                    ) : pl.tipos_equipo ? (
                      <Badge className="bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-50 text-[10px]">
                        {pl.tipos_equipo.nombre_tipo}
                      </Badge>
                    ) : (
                      <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 text-[10px]">
                        Universal · Todos los equipos
                      </Badge>
                    )}
                    {pl.modulos_tecnicos && (
                      <Badge className="bg-indigo-50 text-indigo-800 border border-indigo-200 hover:bg-indigo-50 text-[10px]">
                        Subsistema: {pl.modulos_tecnicos.nombre_modulo}
                      </Badge>
                    )}
                    {pl.usa_aiu && (
                      <Badge className="bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-50 text-[10px]">
                        AIU {pl.aiu_admin_porcentaje}/{pl.aiu_imprevistos_porcentaje}/{pl.aiu_utilidad_porcentaje}%
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
                    <div className="rounded-md bg-slate-50 py-1.5 px-2">
                      <p className="text-[10px] text-slate-500">Servicios</p>
                      <p className="text-sm font-bold text-slate-800">{countServ}</p>
                    </div>
                    <div className="rounded-md bg-slate-50 py-1.5 px-2">
                      <p className="text-[10px] text-slate-500">Repuestos</p>
                      <p className="text-sm font-bold text-slate-800">{countComp}</p>
                    </div>
                    <div className="rounded-md bg-slate-50 py-1.5 px-2">
                      <p className="text-[10px] text-slate-500">Logística/Otros</p>
                      <p className="text-sm font-bold text-slate-800">{countOtro}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                    <span>
                      Base ref.: <strong className="font-mono text-slate-800">{formatCurrency(subtotalBase)}</strong>
                    </span>
                    <span>Usada {pl.veces_usada}x</span>
                  </div>
                </CardContent>

                <div className="px-5 py-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(pl)} title="Editar plantilla">
                      <Edit3 className="h-3.5 w-3.5 mr-1" />
                      Editar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openDuplicate(pl)} title="Duplicar">
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                      onClick={() => eliminar.mutate(pl.id_plantilla)}
                      title="Desactivar"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {onSelectForNewQuote && (
                    <Button size="sm" onClick={() => onSelectForNewQuote(pl)} className="gap-1">
                      <Sparkles className="h-3.5 w-3.5" />
                      Usar
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Editor de Plantilla CPQ */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              {draft.id_plantilla ? 'Editar Plantilla Comercial CPQ' : 'Nueva Plantilla Comercial CPQ'}
            </DialogTitle>
            <DialogDescription>
              Define la receta estándar reutilizable. Marca <strong>× Equipo</strong> en líneas que deban multiplicarse automáticamente al seleccionar equipos gemelos, y desmárcalo en rubros únicos como transporte o pólizas.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2 space-y-1">
                <Label>Nombre de la Plantilla *</Label>
                <Input
                  value={draft.nombre}
                  onChange={(e) => setDraft({ ...draft, nombre: e.target.value })}
                  placeholder="Ej: Suministro e Instalación de Baterías"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Código (opcional)</Label>
                <Input
                  value={draft.codigo_plantilla}
                  onChange={(e) => setDraft({ ...draft, codigo_plantilla: e.target.value })}
                  placeholder="Auto: TPL-..."
                  className="font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label>Tipo de Cotización (Abierto)</Label>
                <Input
                  list="tpl-tipos-cotizacion"
                  value={draft.tipo_cotizacion}
                  onChange={(e) => setDraft({ ...draft, tipo_cotizacion: e.target.value })}
                  placeholder="Ej: SUMINISTRO_BATERIAS"
                />
              </div>
              <div className="space-y-1">
                <Label>Clase de Equipo (Opcional)</Label>
                <Select
                  value={draft.id_tipo_equipo}
                  onValueChange={(v) =>
                    setDraft({
                      ...draft,
                      id_tipo_equipo: v,
                      id_modelo_equipo: 'NONE',
                      id_modulo: 'NONE',
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Universal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Universal · Todos los equipos</SelectItem>
                    {arquetipos.map((a) => (
                      <SelectItem key={a.id_tipo_equipo} value={String(a.id_tipo_equipo)}>
                        {a.nombre_tipo} ({a.codigo_tipo})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Parte / Subsistema (Opcional)</Label>
                <Select
                  disabled={draft.id_tipo_equipo === 'NONE' || modulosDisponibles.length === 0}
                  value={draft.id_modulo}
                  onValueChange={(v) => setDraft({ ...draft, id_modulo: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los subsistemas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Todos los subsistemas</SelectItem>
                    {modulosDisponibles.map((mod) => (
                      <SelectItem key={mod.id_modulo} value={String(mod.id_modulo)}>
                        {mod.nombre} ({mod.codigo})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Modelo OEM Específico (Opcional)</Label>
                <Select
                  value={draft.id_modelo_equipo}
                  onValueChange={(v) => setDraft({ ...draft, id_modelo_equipo: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Cualquier modelo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Cualquier modelo</SelectItem>
                    {modelosFiltrados.map((m) => (
                      <SelectItem key={m.id_modelo_equipo} value={String(m.id_modelo_equipo)}>
                        {m.marca} {m.modelo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Asunto Sugerido</Label>
                <Input
                  value={draft.asunto_sugerido}
                  onChange={(e) => setDraft({ ...draft, asunto_sugerido: e.target.value })}
                  placeholder="Título comercial que se precargará en la cotización"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label>Forma Pago</Label>
                  <Input
                    value={draft.forma_pago}
                    onChange={(e) => setDraft({ ...draft, forma_pago: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Garantía (m)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={draft.meses_garantia}
                    onChange={(e) => setDraft({ ...draft, meses_garantia: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Días Est.</Label>
                  <Input
                    type="number"
                    min={0}
                    value={draft.tiempo_estimado_dias}
                    onChange={(e) => setDraft({ ...draft, tiempo_estimado_dias: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Alcance Técnico Estándar</Label>
                <Textarea
                  rows={3}
                  value={draft.alcance_trabajo}
                  onChange={(e) => setDraft({ ...draft, alcance_trabajo: e.target.value })}
                  placeholder="Actividades y entregables incluidos..."
                />
              </div>
              <div className="space-y-1">
                <Label>Exclusiones Estándar</Label>
                <Textarea
                  rows={3}
                  value={draft.exclusiones}
                  onChange={(e) => setDraft({ ...draft, exclusiones: e.target.value })}
                  placeholder="Conceptos no contemplados en esta plantilla..."
                />
              </div>
            </div>

            {/* AIU opcional de la plantilla */}
            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 space-y-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.usa_aiu}
                  onChange={(e) => setDraft({ ...draft, usa_aiu: e.target.checked })}
                  className="rounded border-slate-300"
                />
                Activar estructura AIU por defecto al aplicar esta plantilla
              </label>
              {draft.usa_aiu && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1">
                  <div>
                    <Label className="text-[11px]">Admin %</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={draft.aiu_admin_porcentaje}
                      onChange={(e) => setDraft({ ...draft, aiu_admin_porcentaje: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="text-[11px]">Imprevistos %</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={draft.aiu_imprevistos_porcentaje}
                      onChange={(e) =>
                        setDraft({ ...draft, aiu_imprevistos_porcentaje: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-[11px]">Utilidad %</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={draft.aiu_utilidad_porcentaje}
                      onChange={(e) =>
                        setDraft({ ...draft, aiu_utilidad_porcentaje: e.target.value })
                      }
                    />
                  </div>
                  <label className="flex items-center gap-1.5 text-xs text-slate-700 pt-5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.iva_sobre_utilidad_aiu}
                      onChange={(e) =>
                        setDraft({ ...draft, iva_sobre_utilidad_aiu: e.target.checked })
                      }
                    />
                    IVA solo s/ Utilidad
                  </label>
                </div>
              )}
            </div>

            {/* Constructor de líneas */}
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label className="text-sm font-bold">Líneas de la Plantilla ({draft.items.length})</Label>
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => addDraftLine('SERVICIO')}
                  >
                    <Wrench className="h-3.5 w-3.5 mr-1 text-blue-600" />
                    + Servicio
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => addDraftLine('COMPONENTE')}
                  >
                    <Package className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                    + Repuesto
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => addDraftLine('OTRO')}
                  >
                    <Truck className="h-3.5 w-3.5 mr-1 text-amber-600" />
                    + Logística / Viático / Póliza
                  </Button>
                </div>
              </div>

              {draft.items.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 border border-dashed rounded-lg">
                  Agrega servicios, repuestos o rubros de logística/viáticos usando los botones superiores.
                </div>
              ) : (
                <div className="space-y-2">
                  {draft.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-slate-200 bg-slate-50/40 space-y-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={
                              item.tipo_linea === 'SERVICIO'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : item.tipo_linea === 'COMPONENTE'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                            }
                          >
                            {item.tipo_linea}
                          </Badge>
                          {item.tipo_linea === 'SERVICIO' && (
                            <select
                              className="text-xs border border-slate-200 rounded px-2 py-1 bg-white max-w-[260px]"
                              value={item.id_servicio ?? ''}
                              onChange={(e) => {
                                const id = e.target.value ? Number(e.target.value) : null;
                                const found = servicios.find((s) => s.id_servicio === id);
                                updateLine(idx, {
                                  id_servicio: id,
                                  descripcion: found ? found.nombre_servicio : item.descripcion,
                                  precio_unitario_fijo: found
                                    ? Number(found.precio_base || 0)
                                    : item.precio_unitario_fijo,
                                  usar_precio_catalogo: Boolean(id),
                                });
                              }}
                            >
                              <option value="">Servicio personalizado (libre)</option>
                              {servicios.map((s) => (
                                <option key={s.id_servicio} value={s.id_servicio}>
                                  {s.codigo_servicio} · {s.nombre_servicio}
                                </option>
                              ))}
                            </select>
                          )}
                          {item.tipo_linea === 'COMPONENTE' && (
                            <select
                              className="text-xs border border-slate-200 rounded px-2 py-1 bg-white max-w-[280px]"
                              value={item.id_componente ?? ''}
                              onChange={(e) => {
                                const id = e.target.value ? Number(e.target.value) : null;
                                const found = componentes.find((c) => c.id_componente === id);
                                updateLine(idx, {
                                  id_componente: id,
                                  descripcion: found
                                    ? found.descripcion_corta || found.referencia_fabricante
                                    : item.descripcion,
                                  unidad:
                                    found?.unidades_medida?.simbolo ||
                                    found?.unidad_medida ||
                                    'unidad',
                                  precio_unitario_fijo: found
                                    ? Number(found.precio_venta || 0)
                                    : item.precio_unitario_fijo,
                                  costo_unitario_fijo: found
                                    ? Number(found.precio_compra || 0)
                                    : item.costo_unitario_fijo,
                                  usar_precio_catalogo: Boolean(id),
                                });
                              }}
                            >
                              <option value="">Repuesto manual (fuera de catálogo)</option>
                              {componentes.map((c) => (
                                <option key={c.id_componente} value={c.id_componente}>
                                  {c.codigo_interno || c.referencia_fabricante} ·{' '}
                                  {c.descripcion_corta || c.referencia_fabricante}
                                  {c.es_inventariable === false
                                    ? ' [No inv.]'
                                    : ` [Stock: ${Number(c.stock_actual ?? 0)}]`}
                                </option>
                              ))}
                            </select>
                          )}
                          {item.tipo_linea === 'OTRO' && (
                            <Input
                              list="tpl-rubros-otros"
                              className="h-7 text-xs bg-white w-52"
                              placeholder="Categoría (ej. TRANSPORTE)"
                              value={item.categoria_rubro || ''}
                              onChange={(e) => updateLine(idx, { categoria_rubro: e.target.value })}
                            />
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-rose-600"
                          onClick={() => removeLine(idx)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                        <div className="md:col-span-5">
                          <Input
                            placeholder="Descripción de la línea *"
                            value={item.descripcion}
                            onChange={(e) => updateLine(idx, { descripcion: e.target.value })}
                            className="h-8 text-xs bg-white"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Input
                            type="number"
                            step="0.01"
                            min={0.01}
                            placeholder="Cant."
                            value={item.cantidad_base}
                            onChange={(e) =>
                              updateLine(idx, { cantidad_base: Number(e.target.value) || 1 })
                            }
                            className="h-8 text-xs bg-white"
                          />
                        </div>
                        <div className="md:col-span-1">
                          <Input
                            list="tpl-unidades-medida"
                            placeholder="Und"
                            value={item.unidad || ''}
                            onChange={(e) => updateLine(idx, { unidad: e.target.value })}
                            className="h-8 text-xs bg-white"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Input
                            type="number"
                            min={0}
                            placeholder="Costo ref."
                            value={item.costo_unitario_fijo ?? 0}
                            onChange={(e) =>
                              updateLine(idx, { costo_unitario_fijo: Number(e.target.value) || 0 })
                            }
                            className="h-8 text-xs bg-white"
                            title="Costo interno de referencia"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Input
                            type="number"
                            min={0}
                            placeholder="Precio venta"
                            value={item.precio_unitario_fijo ?? 0}
                            onChange={(e) =>
                              updateLine(idx, { precio_unitario_fijo: Number(e.target.value) || 0 })
                            }
                            className="h-8 text-xs bg-white font-mono"
                            title="Precio unitario de venta"
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-600 pt-0.5">
                        <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-800">
                          <input
                            type="checkbox"
                            checked={item.es_por_equipo}
                            onChange={(e) => updateLine(idx, { es_por_equipo: e.target.checked })}
                          />
                          Escalar × cantidad de equipos
                        </label>
                        {(item.id_servicio || item.id_componente) && (
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={item.usar_precio_catalogo}
                              onChange={(e) =>
                                updateLine(idx, { usar_precio_catalogo: e.target.checked })
                              }
                            />
                            Usar precio vivo de catálogo
                          </label>
                        )}
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(item.es_opcional)}
                            onChange={(e) => updateLine(idx, { es_opcional: e.target.checked })}
                          />
                          Ítem opcional
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.iva_aplicable !== false}
                            onChange={(e) => updateLine(idx, { iva_aplicable: e.target.checked })}
                          />
                          Grava impuesto
                        </label>
                        {item.tipo_linea === 'OTRO' && (
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={item.visible_cliente !== false}
                              onChange={(e) =>
                                updateLine(idx, { visible_cliente: e.target.checked })
                              }
                            />
                            Visible en PDF cliente
                          </label>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <datalist id="tpl-tipos-cotizacion">
              {TIPO_COTIZACION_PRESETS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </datalist>
            <datalist id="tpl-rubros-otros">
              {RUBRO_OTRO_PRESETS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </datalist>
            <datalist id="tpl-unidades-medida">
              <option value="servicio">Servicio</option>
              <option value="global">Global</option>
              <option value="dia">Día</option>
              <option value="hora">Hora</option>
              <option value="dia-tecnico">Día-Técnico</option>
              <option value="km">Kilómetro</option>
              {unidadesMedida.map((u) => (
                <option key={u.codigo} value={u.simbolo || u.codigo}>
                  {u.nombre} ({u.codigo})
                </option>
              ))}
            </datalist>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditorOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={crear.isPending || actualizar.isPending}>
                {(crear.isPending || actualizar.isPending) && (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                )}
                {draft.id_plantilla ? 'Guardar Cambios' : 'Crear Plantilla'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
