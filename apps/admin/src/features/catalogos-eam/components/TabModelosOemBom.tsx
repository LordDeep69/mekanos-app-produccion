'use client';

import {
  AlertTriangle,
  Boxes,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Code2,
  Edit3,
  Factory,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Save,
  Search,
  Sliders,
  Sparkles,
  Trash2,
  Unlock,
  Wrench,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { DynamicModularSpecsEditor } from '@/features/equipos/components/DynamicModularSpecsEditor';
import {
  AtributoTecnico,
  ModeloEquipoOem,
  ROLES_BOM_OPTIONS,
  getModuloBadgeInfo,
  getRolBomHumano,
  humanizeFallbackKey,
  parseOpcionesSeguras,
  useAgregarItemBomOemEam,
  useArquetiposEam,
  useAtributosEam,
  useComponentesWmsEam,
  useCreateModeloOemEam,
  useDeleteModeloOemEam,
  useEliminarItemBomOemEam,
  useMagnitudesEam,
  useModeloOemDetalleEam,
  useModelosOemEam,
  useModulosEam,
  useUpdateModeloOemEam,
} from '../index';

/**
 * Sugiere un código canónico inteligente para el modelo de fábrica:
 * ej: MOD-[MARCA]-[MODELO], garantizando unicidad con sufijos (-2, -3) si ya existe.
 */
export function sugerirCodigoModelo(
  marca: string,
  modelo: string,
  modelosExistentes: ModeloEquipoOem[],
  currentId?: number | null,
): string {
  const mClean = marca.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const modClean = modelo.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!mClean && !modClean) return '';

  const base = `MOD-${mClean || 'OEM'}-${modClean || 'STD'}`;

  let candidato = base;
  let contador = 2;
  const usados = new Set(
    modelosExistentes
      .filter((m) => !currentId || m.id_modelo_equipo !== currentId)
      .map((m) => m.codigo_modelo.toUpperCase().trim()),
  );

  while (usados.has(candidato)) {
    candidato = `${base}-${contador}`;
    contador++;
  }
  return candidato;
}

/**
 * Sugiere una descripción comercial legible a partir del tipo de equipo, marca y modelo.
 */
export function sugerirDescripcionModelo(
  idTipoEquipo: string | number,
  marca: string,
  modelo: string,
  arquetiposList: any[],
): string {
  const arq = arquetiposList.find((a) => String(a.id_tipo_equipo) === String(idTipoEquipo));
  const nombreTipo = arq ? (arq.nombre_canonico || arq.nombre_tipo || '').trim() : '';
  const tipoLabel = nombreTipo ? nombreTipo.split('/')[0].trim() : 'Equipo';
  const m = marca.trim();
  const mod = modelo.trim();
  if (!m && !mod) return '';
  return `${tipoLabel} ${m} ${mod}`.trim();
}

export function TabModelosOemBom() {
  const [filtroArquetipo, setFiltroArquetipo] = useState<string>('');
  const { data: arquetipos = [] } = useArquetiposEam();
  const { data: modelos = [], isLoading } = useModelosOemEam(
    filtroArquetipo ? Number(filtroArquetipo) : undefined,
  );
  const { data: todosAtributos = [] } = useAtributosEam();
  const { data: todosModulos = [] } = useModulosEam();
  const { data: magnitudes = [] } = useMagnitudesEam();

  // Mapa rápido de atributos por código para traducir claves técnicas a Nombre Humano + Unidad/Opción
  const atributoByCodeMap = useMemo(() => {
    const map = new Map<string, AtributoTecnico>();
    for (const attr of todosAtributos) {
      map.set(attr.codigo_atributo, attr);
    }
    return map;
  }, [todosAtributos]);

  // Mapa rápido de símbolos de unidad
  const unitSymbolMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const mag of magnitudes) {
      for (const u of mag.unidades_medida || []) {
        map.set(u.codigo.toUpperCase(), u.simbolo || u.codigo);
      }
    }
    return map;
  }, [magnitudes]);

  // Mapa rápido de nombres humanos de módulos
  const moduloNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const mod of todosModulos) {
      map.set(mod.codigo_modulo, mod.nombre_modulo);
    }
    return map;
  }, [todosModulos]);

  const [selectedModeloId, setSelectedModeloId] = useState<number | null>(null);

  useEffect(() => {
    if (!selectedModeloId && modelos.length > 0) {
      setSelectedModeloId(modelos[0].id_modelo_equipo);
    }
  }, [modelos, selectedModeloId]);

  const { data: modeloDetalle, isLoading: loadingDetalle } = useModeloOemDetalleEam(
    selectedModeloId,
  );

  const createModMut = useCreateModeloOemEam();
  const updateModMut = useUpdateModeloOemEam();
  const deleteModMut = useDeleteModeloOemEam();
  const addBomMut = useAgregarItemBomOemEam();
  const removeBomMut = useEliminarItemBomOemEam();

  // Modal Crear / Editar Identidad del Modelo de Fábrica
  const [showModeloModal, setShowModeloModal] = useState(false);
  const [editingModelo, setEditingModelo] = useState<ModeloEquipoOem | null>(null);
  const [modeloForm, setModeloForm] = useState({
    codigo_modelo: '',
    marca: '',
    modelo: '',
    id_tipo_equipo: '1',
    nombre_comercial: '',
  });
  const [isAutoCodigo, setIsAutoCodigo] = useState(true);
  const [isAutoNombre, setIsAutoNombre] = useState(true);
  const [showSpecsInCreate, setShowSpecsInCreate] = useState(false);
  const [createSpecsModulos, setCreateSpecsModulos] = useState<Record<string, Record<string, any>>>({});
  const [createSpecsUnidades, setCreateSpecsUnidades] = useState<Record<string, string>>({});

  // Modal Dedicado de Edición Visual de Especificaciones Técnicas de Fábrica
  const [showSpecsModal, setShowSpecsModal] = useState(false);
  const [editingSpecsModelo, setEditingSpecsModelo] = useState<ModeloEquipoOem | null>(null);
  const [specsModulos, setSpecsModulos] = useState<Record<string, Record<string, any>>>({});
  const [specsUnidades, setSpecsUnidades] = useState<Record<string, string>>({});
  const [showJsonAvanzado, setShowJsonAvanzado] = useState(false);

  // Validación de unicidad de código en tiempo real
  const isCodigoDuplicado = useMemo(() => {
    const cod = modeloForm.codigo_modelo.trim().toUpperCase();
    if (!cod) return false;
    return modelos.some(
      (m) =>
        (!editingModelo || m.id_modelo_equipo !== editingModelo.id_modelo_equipo) &&
        m.codigo_modelo.toUpperCase() === cod,
    );
  }, [modeloForm.codigo_modelo, modelos, editingModelo]);

  const handleMarcaChange = (val: string) => {
    const nuevaMarca = val.toUpperCase();
    const nuevoCodigo = isAutoCodigo
      ? sugerirCodigoModelo(nuevaMarca, modeloForm.modelo, modelos, editingModelo?.id_modelo_equipo)
      : modeloForm.codigo_modelo;
    const nuevoNombre = isAutoNombre
      ? sugerirDescripcionModelo(modeloForm.id_tipo_equipo, nuevaMarca, modeloForm.modelo, arquetipos)
      : modeloForm.nombre_comercial;

    setModeloForm((prev) => ({
      ...prev,
      marca: nuevaMarca,
      codigo_modelo: nuevoCodigo,
      nombre_comercial: nuevoNombre,
    }));
  };

  const handleModeloChange = (val: string) => {
    const nuevoModelo = val;
    const nuevoCodigo = isAutoCodigo
      ? sugerirCodigoModelo(modeloForm.marca, nuevoModelo, modelos, editingModelo?.id_modelo_equipo)
      : modeloForm.codigo_modelo;
    const nuevoNombre = isAutoNombre
      ? sugerirDescripcionModelo(modeloForm.id_tipo_equipo, modeloForm.marca, nuevoModelo, arquetipos)
      : modeloForm.nombre_comercial;

    setModeloForm((prev) => ({
      ...prev,
      modelo: nuevoModelo,
      codigo_modelo: nuevoCodigo,
      nombre_comercial: nuevoNombre,
    }));
  };

  const handleTipoChange = (newIdTipo: string) => {
    const nuevoNombre = isAutoNombre
      ? sugerirDescripcionModelo(newIdTipo, modeloForm.marca, modeloForm.modelo, arquetipos)
      : modeloForm.nombre_comercial;

    setModeloForm((prev) => ({
      ...prev,
      id_tipo_equipo: newIdTipo,
      nombre_comercial: nuevoNombre,
    }));
  };

  // Modal Agregar Repuesto BOM desde Catálogo WMS
  const [showBomModal, setShowBomModal] = useState(false);
  const [searchWms, setSearchWms] = useState('');
  const { data: componentesWms = [] } = useComponentesWmsEam(searchWms, showBomModal);
  const [bomForm, setBomForm] = useState({
    id_componente: '',
    cantidad_sugerida: '1',
    rol_bom: 'FILTRO_ACEITE_TITULAR',
    notas: '',
  });

  /**
   * Traduce cada par (codigo_atributo, valor) del modelo de fábrica en:
   * - label: Nombre Humano del Campo ("Capacidad de Aceite del Cárter")
   * - formattedValue: Valor con su unidad o etiqueta de opción ("23 L", "Turbocargado Postenfriado")
   */
  const formatSpecHuman = (key: string, rawVal: any): { label: string; formattedValue: string } => {
    const attr = atributoByCodeMap.get(key);
    const label = attr?.nombre_atributo || humanizeFallbackKey(key);

    if (rawVal === undefined || rawVal === null || String(rawVal).trim() === '') {
      return { label, formattedValue: '—' };
    }

    if (typeof rawVal === 'boolean' || (attr?.tipo_control || '').toUpperCase() === 'BOOLEANO') {
      return {
        label,
        formattedValue: rawVal === true || rawVal === 'true' ? 'Sí (Incluido)' : 'No',
      };
    }

    if (attr && ((attr.tipo_control || '').toUpperCase() === 'SELECTOR' || attr.opciones_json)) {
      const opciones = parseOpcionesSeguras(attr.opciones_json);
      const match = opciones.find(
        (o) => o.value.toUpperCase() === String(rawVal).trim().toUpperCase(),
      );
      if (match) {
        return { label, formattedValue: match.label };
      }
    }

    const uCode = attr?.unidad_defecto_codigo || attr?.magnitud?.unidad_base_codigo || '';
    if (uCode) {
      const symbol = unitSymbolMap.get(uCode.toUpperCase()) || uCode;
      return { label, formattedValue: `${rawVal} ${symbol}` };
    }

    return { label, formattedValue: String(rawVal) };
  };

  const openNewModelo = () => {
    setEditingModelo(null);
    const initialTipo = filtroArquetipo || String(arquetipos[0]?.id_tipo_equipo || 1);
    setModeloForm({
      codigo_modelo: '',
      marca: '',
      modelo: '',
      id_tipo_equipo: initialTipo,
      nombre_comercial: '',
    });
    setIsAutoCodigo(true);
    setIsAutoNombre(true);
    setShowSpecsInCreate(false);
    setCreateSpecsModulos({});
    setCreateSpecsUnidades({});
    setShowModeloModal(true);
  };

  const openEditModelo = (m: ModeloEquipoOem) => {
    setEditingModelo(m);
    setModeloForm({
      codigo_modelo: m.codigo_modelo,
      marca: m.marca,
      modelo: m.modelo,
      id_tipo_equipo: String(m.id_tipo_equipo),
      nombre_comercial: m.nombre_comercial || '',
    });
    setIsAutoCodigo(false);
    setIsAutoNombre(false);
    setShowSpecsInCreate(false);
    setCreateSpecsModulos((m.especificaciones_base as any)?.modulos || {});
    setCreateSpecsUnidades((m.especificaciones_base as any)?.unidades || {});
    setShowModeloModal(true);
  };

  const openEditSpecsModal = (m: ModeloEquipoOem) => {
    setEditingSpecsModelo(m);
    const base = (m.especificaciones_base as any) || {};
    setSpecsModulos(base.modulos || {});
    setSpecsUnidades(base.unidades || {});
    setShowJsonAvanzado(false);
    setShowSpecsModal(true);
  };

  const handleSaveModelo = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isCodigoDuplicado) {
      toast.error('El código de referencia de plantilla ya existe en otro modelo. Elige uno diferente.');
      return;
    }

    const codFinal =
      modeloForm.codigo_modelo.trim().toUpperCase() ||
      sugerirCodigoModelo(modeloForm.marca, modeloForm.modelo, modelos, editingModelo?.id_modelo_equipo);

    if (!codFinal) {
      toast.error('El código de referencia es requerido');
      return;
    }

    if (editingModelo) {
      await updateModMut.mutateAsync({
        idModelo: editingModelo.id_modelo_equipo,
        payload: {
          marca: modeloForm.marca.trim().toUpperCase(),
          modelo: modeloForm.modelo.trim().toUpperCase(),
          id_tipo_equipo: Number(modeloForm.id_tipo_equipo),
          nombre_comercial: modeloForm.nombre_comercial.trim() || undefined,
          ...(showSpecsInCreate
            ? {
                especificaciones_base: {
                  _version: 1,
                  modulos: createSpecsModulos,
                  unidades: createSpecsUnidades,
                },
              }
            : {}),
        },
      });
      toast.success('Modelo de fábrica actualizado exitosamente');
    } else {
      const initialSpecs = showSpecsInCreate
        ? { _version: 1, modulos: createSpecsModulos, unidades: createSpecsUnidades }
        : { _version: 1, modulos: {} };

      const created = await createModMut.mutateAsync({
        codigo_modelo: codFinal,
        marca: modeloForm.marca.trim().toUpperCase(),
        modelo: modeloForm.modelo.trim().toUpperCase(),
        id_tipo_equipo: Number(modeloForm.id_tipo_equipo),
        nombre_comercial: modeloForm.nombre_comercial.trim() || undefined,
        especificaciones_base: initialSpecs,
      });
      setSelectedModeloId(created.id_modelo_equipo);
      toast.success('Nuevo modelo de fábrica registrado');
    }
    setShowModeloModal(false);
  };

  const handleSaveSpecsModal = async () => {
    if (!editingSpecsModelo) return;
    await updateModMut.mutateAsync({
      idModelo: editingSpecsModelo.id_modelo_equipo,
      payload: {
        especificaciones_base: {
          _version: 1,
          modulos: specsModulos,
          unidades: specsUnidades,
        },
      },
    });
    toast.success('Ficha técnica del modelo guardada exitosamente');
    setShowSpecsModal(false);
  };

  const handleSaveBom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModeloId || !bomForm.id_componente) return;
    await addBomMut.mutateAsync({
      idModelo: selectedModeloId,
      payload: {
        id_componente: Number(bomForm.id_componente),
        cantidad_sugerida: parseFloat(bomForm.cantidad_sugerida) || 1,
        rol_bom: bomForm.rol_bom,
        notas: bomForm.notas || undefined,
      },
    });
    setShowBomModal(false);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200">
        <Loader2 className="h-9 w-9 animate-spin text-blue-600 mb-3" />
        <p className="text-sm font-medium text-slate-600">
          Cargando Modelos de Fábrica y Kits de Repuestos...
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* COLUMNA IZQUIERDA: CATÁLOGO DE MODELOS DE FÁBRICA (ESTÁTICO / STICKY EN DESKTOP) */}
      <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden lg:sticky lg:top-20 flex flex-col max-h-[calc(100vh-6rem)]">
        <div className="p-5 border-b border-slate-100 space-y-3 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Factory className="h-5 w-5 text-blue-600" />
                <span>Modelos de Fábrica ({modelos.length})</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Plantillas preconfiguradas con datos técnicos y repuestos de inventario
              </p>
            </div>
            <button
              type="button"
              onClick={openNewModelo}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>Nuevo Modelo</span>
            </button>
          </div>

          <select
            value={filtroArquetipo}
            onChange={(e) => setFiltroArquetipo(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 bg-slate-50"
          >
            <option value="">Todos los Tipos de Equipo</option>
            {arquetipos.map((a) => (
              <option key={a.id_tipo_equipo} value={a.id_tipo_equipo}>
                {a.nombre_canonico || a.nombre_tipo}
              </option>
            ))}
          </select>
        </div>

        <div className="divide-y divide-slate-100 flex-1 overflow-y-auto min-h-0">
          {modelos.map((m) => {
            const isSelected = m.id_modelo_equipo === selectedModeloId;
            const bomCount = m._count?.modelos_equipo_bom ?? 0;
            return (
              <div
                key={m.id_modelo_equipo}
                onClick={() => setSelectedModeloId(m.id_modelo_equipo)}
                className={`p-5 cursor-pointer transition-all flex items-start justify-between gap-4 ${
                  isSelected
                    ? 'bg-blue-50/80 border-l-4 border-l-blue-600'
                    : 'hover:bg-slate-50'
                }`}
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center flex-wrap gap-2">
                    <span className="px-2 py-0.5 rounded bg-slate-900 text-white text-xs font-extrabold">
                      {m.marca}
                    </span>
                    <span className="text-sm font-bold text-slate-900">{m.modelo}</span>
                    {m.tipo_equipo && (
                      <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[11px] font-bold">
                        {m.tipo_equipo.nombre_tipo}
                      </span>
                    )}
                  </div>
                  {m.nombre_comercial && (
                    <div className="text-xs text-slate-600 font-medium">
                      {m.nombre_comercial}
                    </div>
                  )}
                  <div className="font-mono text-[11px] text-slate-400">
                    Ref. Plantilla: {m.codigo_modelo}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                    {bomCount} repuestos en kit
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModelo(m);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      title="Editar Modelo de Fábrica"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (
                          window.confirm(
                            `¿Desactivar el modelo "${m.marca} ${m.modelo}"?`,
                          )
                        ) {
                          await deleteModMut.mutateAsync(m.id_modelo_equipo);
                        }
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Desactivar Modelo"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* COLUMNA DERECHA: KIT DE REPUESTOS WMS + ESPECIFICACIONES TÉCNICAS LEGIBLES */}
      <div className="lg:col-span-7 space-y-6">
        {loadingDetalle || !modeloDetalle ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-16 flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-3" />
            <p className="text-sm text-slate-500">
              Cargando ficha del modelo y kit de repuestos...
            </p>
          </div>
        ) : (
          <>
            {/* TARJETA 1: KIT DE REPUESTOS Y CONSUMIBLES (BOM REAL CONECTADO A INVENTARIO WMS) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center flex-wrap gap-2">
                    <Package className="h-5 w-5 text-emerald-600" />
                    <h4 className="text-base font-bold text-slate-900">
                      Kit de Repuestos y Consumibles Sugeridos (BOM)
                    </h4>
                    {modeloDetalle.modelos_equipo_bom && modeloDetalle.modelos_equipo_bom.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                        {modeloDetalle.modelos_equipo_bom.length}{' '}
                        {modeloDetalle.modelos_equipo_bom.length === 1 ? 'repuesto' : 'repuestos'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    Artículos reales del inventario sugeridos para el mantenimiento de{' '}
                    <strong>
                      {modeloDetalle.marca} {modeloDetalle.modelo}
                    </strong>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSearchWms('');
                    setBomForm({
                      id_componente: '',
                      cantidad_sugerida: '1',
                      rol_bom: 'FILTRO_ACEITE_TITULAR',
                      notas: '',
                    });
                    setShowBomModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors shrink-0"
                >
                  <Plus className="h-4 w-4" />
                  <span>Agregar Repuesto / Insumo</span>
                </button>
              </div>

              <div className="p-5">
                {!modeloDetalle.modelos_equipo_bom ||
                modeloDetalle.modelos_equipo_bom.length === 0 ? (
                  <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
                    Este modelo aún no tiene repuestos asociados en su kit de mantenimiento.
                  </div>
                ) : (
                  <div>
                    <div className="overflow-x-auto overflow-y-auto max-h-[380px] rounded-xl border border-slate-200 shadow-2xs">
                      <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 shadow-2xs">
                          <tr className="text-[11px] font-bold text-slate-500 uppercase">
                            <th className="py-3 px-4 bg-slate-50/95 backdrop-blur-xs">Repuesto / Insumo de Inventario</th>
                            <th className="py-3 px-4 bg-slate-50/95 backdrop-blur-xs">Función en el Equipo</th>
                            <th className="py-3 px-4 text-center bg-slate-50/95 backdrop-blur-xs">Cant. Sugerida</th>
                            <th className="py-3 px-4 bg-slate-50/95 backdrop-blur-xs">Notas de Uso</th>
                            <th className="py-3 px-4 text-right bg-slate-50/95 backdrop-blur-xs">Quitar</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                          {modeloDetalle.modelos_equipo_bom.map((item) => {
                            const comp = item.catalogo_componentes;
                            return (
                              <tr
                                key={item.id_modelo_bom}
                                className="hover:bg-slate-50/80 transition-colors"
                              >
                                <td className="py-3.5 px-4">
                                  <div className="font-bold text-slate-900">
                                    {comp?.descripcion_corta || comp?.referencia_fabricante}
                                  </div>
                                  <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-1.5">
                                    <span>
                                      Ref:{' '}
                                      <strong className="font-mono text-slate-700">
                                        {comp?.referencia_fabricante}
                                      </strong>
                                    </span>
                                    {comp?.marca && (
                                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold">
                                        {comp.marca}
                                      </span>
                                    )}
                                    {comp?.codigo_interno && (
                                      <span className="font-mono text-[11px] text-slate-400">
                                        [{comp.codigo_interno}]
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3.5 px-4">
                                  <span className="px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold">
                                    {getRolBomHumano(item.rol_bom)}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-center font-bold text-slate-900">
                                  {Number(item.cantidad_sugerida)}{' '}
                                  <span className="text-xs font-semibold text-slate-500">
                                    {comp?.codigo_unidad_medida ||
                                      comp?.unidad_medida ||
                                      'UND'}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-xs text-slate-600">
                                  {item.notas || '—'}
                                </td>
                                <td className="py-3.5 px-4 text-right">
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (
                                        window.confirm(
                                          '¿Retirar este repuesto del kit del modelo?',
                                        )
                                      ) {
                                        await removeBomMut.mutateAsync({
                                          idModelo: modeloDetalle.id_modelo_equipo,
                                          idBom: item.id_modelo_bom,
                                        });
                                      }
                                    }}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {modeloDetalle.modelos_equipo_bom.length > 3 && (
                      <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 px-1">
                        <span>
                          Mostrando <strong className="text-slate-600 font-semibold">{modeloDetalle.modelos_equipo_bom.length}</strong> repuestos en este kit
                        </span>
                        <span className="flex items-center gap-1 text-slate-500 font-medium">
                          ↕ Desplaza verticalmente para ver todos los repuestos
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* TARJETA 2: ESPECIFICACIONES TÉCNICAS POR DEFECTO CON ETIQUETAS HUMANAS Y UNIDADES */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Sliders className="h-5 w-5 text-indigo-600" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Especificaciones Técnicas por Defecto del Modelo
                    </h4>
                    <p className="text-xs text-slate-500">
                      Datos de fábrica que se pre-llenan automáticamente al registrar un equipo de este modelo
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openEditSpecsModal(modeloDetalle)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-2xs transition-colors cursor-pointer"
                >
                  <Edit3 className="h-3.5 w-3.5 text-blue-600" />
                  <span>Editar Valores de Fábrica</span>
                </button>
              </div>

              <div className="p-5 space-y-5">
                {Object.keys((modeloDetalle.especificaciones_base as any)?.modulos || {}).length === 0 ? (
                  <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 space-y-3">
                    <Sliders className="h-8 w-8 text-slate-300 mx-auto" />
                    <div className="text-xs text-slate-600 font-medium">
                      Este modelo aún no tiene especificaciones técnicas de fábrica preconfiguradas.
                    </div>
                    <button
                      type="button"
                      onClick={() => openEditSpecsModal(modeloDetalle)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Configurar Valores de Fábrica</span>
                    </button>
                  </div>
                ) : (
                  Object.entries(
                    (modeloDetalle.especificaciones_base as any)?.modulos || {},
                  ).map(([modCode, attrsObj]: [string, any]) => {
                    const nombreModuloHumano =
                      moduloNameMap.get(modCode) ||
                      getModuloBadgeInfo(modCode).fullName;
                    const modBadge = getModuloBadgeInfo(modCode, nombreModuloHumano);
                    const entries = Object.entries(attrsObj || {});

                    return (
                      <div
                        key={modCode}
                        className="rounded-xl border border-slate-200 p-4 bg-slate-50/40 space-y-3.5"
                      >
                        <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                          <div className="flex items-center gap-2">
                            <Wrench className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-extrabold text-slate-900">
                              Parte: {nombreModuloHumano}
                            </span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold border ${modBadge.badgeClass}`}
                          >
                            {entries.length} datos preconfigurados
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {entries.map(([k, v]) => {
                            const { label, formattedValue } = formatSpecHuman(k, v);
                            return (
                              <div
                                key={k}
                                className="p-3 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between"
                              >
                                <div className="text-[11px] font-semibold text-slate-500 leading-snug">
                                  {label}
                                </div>
                                <div className="text-xs font-extrabold text-slate-900 mt-1">
                                  {formattedValue}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* MODAL CREAR / EDITAR IDENTIDAD DEL MODELO DE FÁBRICA (SIN TEXTAREA JSON) */}
      {showModeloModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Encabezado */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <Factory className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900">
                    {editingModelo ? 'Editar Datos del Modelo de Fábrica' : 'Crear Nuevo Modelo de Fábrica'}
                  </h4>
                  <p className="text-xs text-slate-500">
                    {editingModelo
                      ? `Modifica los datos comerciales de ${editingModelo.marca} ${editingModelo.modelo}`
                      : 'Define la plantilla OEM base para agilizar el registro de nuevos activos'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModeloModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSaveModelo} className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Tipo de Equipo */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tipo de Activo Industrial *
                </label>
                <select
                  value={modeloForm.id_tipo_equipo}
                  onChange={(e) => handleTipoChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white shadow-2xs focus:ring-2 focus:ring-blue-500"
                >
                  {arquetipos.map((a) => (
                    <option key={a.id_tipo_equipo} value={a.id_tipo_equipo}>
                      {a.nombre_canonico || a.nombre_tipo} ({a.codigo_tipo || 'GEN'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Marca y Modelo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Marca del Fabricante *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: TRANE, CUMMINS, GOULDS..."
                    value={modeloForm.marca}
                    onChange={(e) => handleMarcaChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-bold uppercase shadow-2xs focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Modelo Comercial *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: CGAM-20, C100D5, 3196..."
                    value={modeloForm.modelo}
                    onChange={(e) => handleModeloChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-bold shadow-2xs focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Nombre Comercial del Modelo */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <span>Nombre Comercial del Modelo *</span>
                    <span className="text-[10px] font-normal text-slate-500">(Nombre oficial / Alias del activo)</span>
                  </label>
                  {isAutoNombre ? (
                    <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <Sparkles className="h-2.5 w-2.5" />
                      Sugerido automáticamente
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setIsAutoNombre(true);
                        const auto = sugerirDescripcionModelo(
                          modeloForm.id_tipo_equipo,
                          modeloForm.marca,
                          modeloForm.modelo,
                          arquetipos,
                        );
                        setModeloForm((prev) => ({ ...prev, nombre_comercial: auto }));
                      }}
                      className="text-[10px] font-bold text-slate-500 hover:text-blue-600 flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="h-2.5 w-2.5" />
                      Restablecer sugerido
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  required
                  placeholder="Ej: Chiller Trane 20 TR / Planta Eléctrica Cummins 100 kVA"
                  value={modeloForm.nombre_comercial}
                  onChange={(e) => {
                    setIsAutoNombre(false);
                    setModeloForm({ ...modeloForm, nombre_comercial: e.target.value });
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 shadow-2xs focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Nombre descriptivo con el que se identificará este modelo en catálogos y que se heredará al registrar equipos en campo.
                </p>
              </div>

              {/* Código de Referencia de Plantilla */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span>Código de Referencia de Plantilla *</span>
                    <span className="text-[10px] font-semibold text-slate-500">(Nomenclatura EAM)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    {isAutoCodigo ? (
                      <button
                        type="button"
                        onClick={() => setIsAutoCodigo(false)}
                        className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                        title="Habilita la edición manual del código de referencia"
                      >
                        <Unlock className="h-3 w-3" />
                        <span>Personalizar código</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setIsAutoCodigo(true);
                          const auto = sugerirCodigoModelo(
                            modeloForm.marca,
                            modeloForm.modelo,
                            modelos,
                            editingModelo?.id_modelo_equipo,
                          );
                          setModeloForm((prev) => ({ ...prev, codigo_modelo: auto }));
                        }}
                        className="text-[11px] font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                        title="Vuelve a generar el código canónico automáticamente"
                      >
                        <Sparkles className="h-3 w-3" />
                        <span>Generar inteligente</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    required
                    readOnly={isAutoCodigo && !editingModelo}
                    placeholder="Ej: MOD-TRANE-CGAM20"
                    value={modeloForm.codigo_modelo}
                    onChange={(e) => {
                      setIsAutoCodigo(false);
                      setModeloForm({
                        ...modeloForm,
                        codigo_modelo: e.target.value.toUpperCase().replace(/\s+/g, '-'),
                      });
                    }}
                    className={`w-full px-3.5 py-2.5 rounded-xl border font-mono text-xs font-bold shadow-2xs transition-colors ${
                      isCodigoDuplicado
                        ? 'border-rose-500 bg-rose-50 text-rose-900 focus:ring-rose-500'
                        : isAutoCodigo
                          ? 'border-emerald-300 bg-emerald-50/50 text-emerald-900'
                          : 'border-slate-300 bg-white text-slate-900'
                    }`}
                  />
                  {isAutoCodigo && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      Auto
                    </span>
                  )}
                </div>

                {/* Feedback en vivo de validación */}
                {isCodigoDuplicado ? (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-rose-600">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span>Este código ya está en uso por otro modelo. Modifícalo o pulsa "Generar inteligente".</span>
                  </div>
                ) : modeloForm.codigo_modelo ? (
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    <span>Código único garantizado en el catálogo de modelos OEM.</span>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500">
                    El código se genera automáticamente a partir de la Marca y Modelo ingresados.
                  </p>
                )}
              </div>

              {/* Acordeón Ergonómico: Configurar Especificaciones Técnicas In-Place */}
              {!editingModelo && (
                <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                  <div className="p-4 bg-gradient-to-r from-indigo-50/80 via-blue-50/50 to-white border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-xs shrink-0">
                        <Sliders className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900">
                            Ficha Técnica Predeterminada del Modelo
                          </h4>
                          <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                            Opcional
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Pre-configura los valores técnicos estándar de fábrica (ej: Capacidad 20 TR, Gas R410A). Se heredarán al crear equipos.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowSpecsInCreate(!showSpecsInCreate)}
                      className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-2xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                    >
                      {showSpecsInCreate ? (
                        <>
                          <span>Ocultar Ficha</span>
                          <ChevronUp className="h-4 w-4 text-slate-500" />
                        </>
                      ) : (
                        <>
                          <span>Desplegar Ficha Técnica</span>
                          <ChevronDown className="h-4 w-4 text-slate-500" />
                        </>
                      )}
                    </button>
                  </div>

                  {showSpecsInCreate && (
                    <div className="p-5 bg-slate-50/40">
                      <DynamicModularSpecsEditor
                        idTipoEquipo={Number(modeloForm.id_tipo_equipo)}
                        modulosValues={createSpecsModulos}
                        origenAtributos={{}}
                        unidadesPersonalizadas={createSpecsUnidades}
                        onChangeValor={(mod, attr, val) => {
                          setCreateSpecsModulos((prev) => ({
                            ...prev,
                            [mod]: { ...(prev[mod] || {}), [attr]: val },
                          }));
                        }}
                        onChangeUnidad={(mod, attr, unit, convertedVal) => {
                          setCreateSpecsUnidades((prev) => ({ ...prev, [attr]: unit }));
                          if (convertedVal !== undefined && Number.isFinite(convertedVal)) {
                            setCreateSpecsModulos((prev) => ({
                              ...prev,
                              [mod]: { ...(prev[mod] || {}), [attr]: convertedVal },
                            }));
                          }
                        }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Botones de Acción */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModeloModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCodigoDuplicado || createModMut.isPending || updateModMut.isPending}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  {createModMut.isPending || updateModMut.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>{editingModelo ? 'Guardar Cambios' : 'Guardar Modelo'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL VISUAL: EDITAR ESPECIFICACIONES TÉCNICAS DE FÁBRICA */}
      {showSpecsModal && editingSpecsModelo && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Cabecera */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <Sliders className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-bold text-slate-900">
                      Especificaciones de Fábrica: {editingSpecsModelo.marca} {editingSpecsModelo.modelo}
                    </h4>
                    {editingSpecsModelo.tipo_equipo && (
                      <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[11px] font-bold">
                        {editingSpecsModelo.tipo_equipo.nombre_tipo}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configura los valores predeterminados de cada parte. Se heredarán automáticamente al registrar equipos de este modelo.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSpecsModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Cuerpo: Editor Modular Dinámico EAM */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <DynamicModularSpecsEditor
                idTipoEquipo={editingSpecsModelo.id_tipo_equipo}
                codigoTipo={editingSpecsModelo.tipo_equipo?.codigo_tipo}
                modulosValues={specsModulos}
                origenAtributos={{}}
                unidadesPersonalizadas={specsUnidades}
                onChangeValor={(codigoModulo, codigoAtributo, nuevoValor) => {
                  setSpecsModulos((prev) => ({
                    ...prev,
                    [codigoModulo]: {
                      ...(prev[codigoModulo] || {}),
                      [codigoAtributo]: nuevoValor,
                    },
                  }));
                }}
                onChangeUnidad={(codigoModulo, codigoAtributo, nuevaUnidad, valorConvertido) => {
                  setSpecsUnidades((prev) => ({
                    ...prev,
                    [codigoAtributo]: nuevaUnidad,
                  }));
                  if (valorConvertido !== undefined && Number.isFinite(valorConvertido)) {
                    setSpecsModulos((prev) => ({
                      ...prev,
                      [codigoModulo]: {
                        ...(prev[codigoModulo] || {}),
                        [codigoAtributo]: valorConvertido,
                      },
                    }));
                  }
                }}
                modeloOemActivo={{
                  marca: editingSpecsModelo.marca,
                  modelo: editingSpecsModelo.modelo,
                  nombre_comercial: editingSpecsModelo.nombre_comercial,
                }}
              />

              {/* Visor JSON Avanzado (Colapsable y Opcional) */}
              <div className="pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowJsonAvanzado(!showJsonAvanzado)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Code2 className="h-3.5 w-3.5" />
                  <span>{showJsonAvanzado ? 'Ocultar JSON técnico' : 'Ver JSON técnico generado (Avanzado)'}</span>
                </button>
                {showJsonAvanzado && (
                  <pre className="mt-2 p-3 rounded-xl bg-slate-900 text-emerald-300 font-mono text-[11px] overflow-x-auto max-h-40">
                    {JSON.stringify({ _version: 1, modulos: specsModulos, unidades: specsUnidades }, null, 2)}
                  </pre>
                )}
              </div>
            </div>

            {/* Pie */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="text-xs text-slate-500 font-medium">
                Los cambios aplicarán a nuevos equipos registrados con este modelo.
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowSpecsModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveSpecsModal}
                  disabled={updateModMut.isPending}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  {updateModMut.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Guardando Ficha...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>Guardar Valores de Fábrica</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL VINCULAR REPUESTO DE INVENTARIO AL KIT DEL MODELO */}
      {showBomModal && modeloDetalle && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h4 className="text-base font-bold text-slate-900">
                Agregar Repuesto o Consumible a {modeloDetalle.marca} {modeloDetalle.modelo}
              </h4>
              <button
                type="button"
                onClick={() => setShowBomModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSaveBom} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Buscar Artículo en Inventario
                </label>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filtrar por referencia, marca o descripción..."
                    value={searchWms}
                    onChange={(e) => setSearchWms(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
                <select
                  required
                  value={bomForm.id_componente}
                  onChange={(e) => setBomForm({ ...bomForm, id_componente: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white font-semibold"
                >
                  <option value="">-- Seleccionar Repuesto / Insumo --</option>
                  {componentesWms.map((c) => (
                    <option key={c.id_componente} value={c.id_componente}>
                      [{c.referencia_fabricante}] {c.descripcion_corta || c.marca} (Stock:{' '}
                      {c.stock_actual ?? 0} {c.codigo_unidad_medida || c.unidad_medida || 'UND'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Función en el Equipo *
                  </label>
                  <select
                    value={bomForm.rol_bom}
                    onChange={(e) => setBomForm({ ...bomForm, rol_bom: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white"
                  >
                    {ROLES_BOM_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Cantidad Sugerida *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={bomForm.cantidad_sugerida}
                    onChange={(e) =>
                      setBomForm({ ...bomForm, cantidad_sugerida: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-mono text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Notas de Uso o Mantenimiento
                </label>
                <input
                  type="text"
                  placeholder="Ej: Cambio en mantenimiento preventivo cada 250 horas"
                  value={bomForm.notas}
                  onChange={(e) => setBomForm({ ...bomForm, notas: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowBomModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={addBomMut.isPending}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Agregar al Kit</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
