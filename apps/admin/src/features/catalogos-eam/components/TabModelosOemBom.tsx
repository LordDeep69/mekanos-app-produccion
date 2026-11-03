'use client';

import {
  Boxes,
  CheckCircle2,
  Edit3,
  Factory,
  Loader2,
  Package,
  Plus,
  Search,
  Sliders,
  Trash2,
  Wrench,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
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

  // Modal Crear / Editar Modelo de Fábrica
  const [showModeloModal, setShowModeloModal] = useState(false);
  const [editingModelo, setEditingModelo] = useState<ModeloEquipoOem | null>(null);
  const [modeloForm, setModeloForm] = useState({
    codigo_modelo: '',
    marca: '',
    modelo: '',
    id_tipo_equipo: '1',
    nombre_comercial: '',
    especificaciones_json_str: '{\n  "_version": 1,\n  "modulos": {}\n}',
  });

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
    setModeloForm({
      codigo_modelo: '',
      marca: '',
      modelo: '',
      id_tipo_equipo: String(arquetipos[0]?.id_tipo_equipo || 1),
      nombre_comercial: '',
      especificaciones_json_str: JSON.stringify(
        {
          _version: 1,
          modulos: {
            motor_combustion: {
              marca_motor: 'CUMMINS',
              velocidad_nominal_rpm: 1800,
            },
          },
        },
        null,
        2,
      ),
    });
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
      especificaciones_json_str: JSON.stringify(m.especificaciones_base || {}, null, 2),
    });
    setShowModeloModal(true);
  };

  const handleSaveModelo = async (e: React.FormEvent) => {
    e.preventDefault();
    let parsedSpecs: Record<string, any> = {};
    try {
      parsedSpecs = JSON.parse(modeloForm.especificaciones_json_str || '{}');
    } catch {
      window.alert(
        'El bloque de especificaciones por defecto no tiene un formato válido.',
      );
      return;
    }

    if (editingModelo) {
      await updateModMut.mutateAsync({
        idModelo: editingModelo.id_modelo_equipo,
        payload: {
          marca: modeloForm.marca,
          modelo: modeloForm.modelo,
          id_tipo_equipo: Number(modeloForm.id_tipo_equipo),
          nombre_comercial: modeloForm.nombre_comercial,
          especificaciones_base: parsedSpecs,
        },
      });
    } else {
      const created = await createModMut.mutateAsync({
        codigo_modelo: modeloForm.codigo_modelo,
        marca: modeloForm.marca,
        modelo: modeloForm.modelo,
        id_tipo_equipo: Number(modeloForm.id_tipo_equipo),
        nombre_comercial: modeloForm.nombre_comercial,
        especificaciones_base: parsedSpecs,
      });
      setSelectedModeloId(created.id_modelo_equipo);
    }
    setShowModeloModal(false);
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
      {/* COLUMNA IZQUIERDA: CATÁLOGO DE MODELOS DE FÁBRICA */}
      <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 space-y-3">
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
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors"
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

        <div className="divide-y divide-slate-100 max-h-[650px] overflow-y-auto">
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
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase">
                          <th className="py-3 px-4">Repuesto / Insumo de Inventario</th>
                          <th className="py-3 px-4">Función en el Equipo</th>
                          <th className="py-3 px-4 text-center">Cant. Sugerida</th>
                          <th className="py-3 px-4">Notas de Uso</th>
                          <th className="py-3 px-4 text-right">Quitar</th>
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
                  onClick={() => openEditModelo(modeloDetalle)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>Editar Valores de Fábrica</span>
                </button>
              </div>

              <div className="p-5 space-y-5">
                {Object.entries(
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
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* MODAL CREAR / EDITAR MODELO DE FÁBRICA */}
      {showModeloModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h4 className="text-base font-bold text-slate-900">
                {editingModelo
                  ? `Editar Modelo de Fábrica: ${editingModelo.marca} ${editingModelo.modelo}`
                  : 'Crear Nuevo Modelo de Fábrica'}
              </h4>
              <button
                type="button"
                onClick={() => setShowModeloModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSaveModelo} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Código de Referencia de Plantilla *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingModelo)}
                    placeholder="Ej: MOD-CUMMINS-6BT59G2"
                    value={modeloForm.codigo_modelo}
                    onChange={(e) =>
                      setModeloForm({
                        ...modeloForm,
                        codigo_modelo: e.target.value.toUpperCase(),
                      })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-mono text-sm disabled:bg-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tipo de Equipo *
                  </label>
                  <select
                    value={modeloForm.id_tipo_equipo}
                    onChange={(e) =>
                      setModeloForm({ ...modeloForm, id_tipo_equipo: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm bg-white font-semibold"
                  >
                    {arquetipos.map((a) => (
                      <option key={a.id_tipo_equipo} value={a.id_tipo_equipo}>
                        {a.nombre_canonico || a.nombre_tipo}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Marca del Fabricante *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: CUMMINS, PERKINS, GOULDS..."
                    value={modeloForm.marca}
                    onChange={(e) =>
                      setModeloForm({ ...modeloForm, marca: e.target.value.toUpperCase() })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Modelo Comercial *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: 6BT5.9-G2"
                    value={modeloForm.modelo}
                    onChange={(e) => setModeloForm({ ...modeloForm, modelo: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Descripción Comercial del Modelo
                </label>
                <input
                  type="text"
                  placeholder="Ej: Planta Eléctrica Cummins 6BT5.9-G2 100 kVA Standby"
                  value={modeloForm.nombre_comercial}
                  onChange={(e) =>
                    setModeloForm({ ...modeloForm, nombre_comercial: e.target.value })
                  }
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Valores Técnicos Preconfigurados (Estructura por Parte)
                </label>
                <textarea
                  rows={7}
                  value={modeloForm.especificaciones_json_str}
                  onChange={(e) =>
                    setModeloForm({ ...modeloForm, especificaciones_json_str: e.target.value })
                  }
                  className="w-full p-3.5 rounded-xl border border-slate-300 font-mono text-xs bg-slate-900 text-emerald-300"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModeloModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs"
                >
                  Guardar Modelo
                </button>
              </div>
            </form>
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
