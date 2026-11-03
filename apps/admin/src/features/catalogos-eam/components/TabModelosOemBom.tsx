'use client';

import {
  Boxes,
  Code2,
  Edit3,
  Factory,
  Loader2,
  Package,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  ModeloEquipoOem,
  useAgregarItemBomOemEam,
  useArquetiposEam,
  useComponentesWmsEam,
  useCreateModeloOemEam,
  useDeleteModeloOemEam,
  useEliminarItemBomOemEam,
  useModeloOemDetalleEam,
  useModelosOemEam,
  useUpdateModeloOemEam,
} from '../index';

const ROLES_BOM = [
  'FILTRO_ACEITE_TITULAR',
  'FILTRO_COMBUSTIBLE_TITULAR',
  'FILTRO_AIRE_TITULAR',
  'SEPARADOR_AGUA_COMBUSTIBLE',
  'LUBRICANTE_MOTOR',
  'REFRIGERANTE_MOTOR',
  'CORREA_VENTILADOR',
  'SELLO_MECANICO_BOMBA',
  'RODAMIENTO_TITULAR',
  'BATERIA_ARRANQUE',
  'REPUESTO_GENERAL',
];

export function TabModelosOemBom() {
  const [filtroArquetipo, setFiltroArquetipo] = useState<string>('');
  const { data: arquetipos = [] } = useArquetiposEam();
  const { data: modelos = [], isLoading } = useModelosOemEam(
    filtroArquetipo ? Number(filtroArquetipo) : undefined,
  );

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

  // Modal Crear / Editar Modelo OEM
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
              velocidad_rpm: 1800,
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
      window.alert('El bloque JSON de especificaciones por defecto no tiene un formato JSON válido.');
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
          Cargando Modelos Maestros OEM y Kits BOM WMS...
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* COLUMNA IZQUIERDA: CATÁLOGO DE MODELOS MAESTROS OEM */}
      <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Factory className="h-5 w-5 text-blue-600" />
                Modelos Maestros OEM ({modelos.length})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Plantillas de fabricante con pre-llenado técnico y BOM WMS
              </p>
            </div>
            <button
              type="button"
              onClick={openNewModelo}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Nuevo Modelo OEM</span>
            </button>
          </div>

          <select
            value={filtroArquetipo}
            onChange={(e) => setFiltroArquetipo(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 bg-slate-50"
          >
            <option value="">Todos los Arquetipos de Equipo</option>
            {arquetipos.map((a) => (
              <option key={a.id_tipo_equipo} value={a.id_tipo_equipo}>
                {a.nombre_canonico || a.nombre_tipo} ({a.codigo_tipo})
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
                  {/* Línea 1: Marca + Modelo + Badge Arquetipo */}
                  <div className="flex items-center flex-wrap gap-2">
                    <span className="px-2 py-0.5 rounded bg-slate-900 text-white text-xs font-extrabold">
                      {m.marca}
                    </span>
                    <span className="text-sm font-bold text-slate-900">{m.modelo}</span>
                    {m.tipo_equipo && (
                      <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-mono text-[11px] font-bold">
                        {m.tipo_equipo.codigo_tipo}
                      </span>
                    )}
                  </div>
                  {/* Línea 2: Código completo en font-mono sin truncar */}
                  <div className="font-mono text-xs text-slate-500">{m.codigo_modelo}</div>
                  {m.nombre_comercial && (
                    <div className="text-xs text-slate-600 font-medium">{m.nombre_comercial}</div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold">
                    {bomCount} ítems BOM
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModelo(m);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      title="Editar Modelo OEM"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (window.confirm(`¿Desactivar el modelo OEM "${m.marca} ${m.modelo}"?`)) {
                          await deleteModMut.mutateAsync(m.id_modelo_equipo);
                        }
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Desactivar Modelo OEM"
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

      {/* COLUMNA DERECHA: DETALLE DEL MODELO OEM + KIT BOM WMS + ESPECIFICACIONES JSONB */}
      <div className="lg:col-span-7 space-y-6">
        {loadingDetalle || !modeloDetalle ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-16 flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-3" />
            <p className="text-sm text-slate-500">Cargando ficha OEM y kit BOM...</p>
          </div>
        ) : (
          <>
            {/* TARJETA 1: LISTA DE MATERIALES (BOM DEFAULT) CONECTADA A WMS */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center flex-wrap gap-2">
                    <Package className="h-5 w-5 text-emerald-600" />
                    <h4 className="text-base font-bold text-slate-900">
                      Kit de Materiales y Consumibles (BOM Default WMS)
                    </h4>
                  </div>
                  <p className="text-xs text-slate-500">
                    Repuestos y fluidos sugeridos automáticamente al crear órdenes preventivas para{' '}
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
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-colors shrink-0"
                >
                  <Plus className="h-4 w-4" />
                  <span>Vincular Repuesto / Fluido WMS</span>
                </button>
              </div>

              <div className="p-6">
                {!modeloDetalle.modelos_equipo_bom ||
                modeloDetalle.modelos_equipo_bom.length === 0 ? (
                  <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
                    Este modelo OEM aún no tiene repuestos asociados en su BOM Default.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase">
                          <th className="py-3 px-4">Artículo WMS / Referencia</th>
                          <th className="py-3 px-4">Rol en BOM</th>
                          <th className="py-3 px-4 text-center">Cant. Sugerida</th>
                          <th className="py-3 px-4">Notas Técnicas</th>
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
                                <div className="font-mono text-xs text-slate-500 mt-0.5">
                                  Ref: <span className="font-semibold text-slate-700">{comp?.referencia_fabricante}</span>
                                  {comp?.codigo_interno ? ` • [${comp.codigo_interno}]` : ''}
                                </div>
                              </td>
                              <td className="py-3.5 px-4">
                                <span className="px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200 text-blue-800 font-mono text-xs font-bold">
                                  {item.rol_bom}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-900">
                                {Number(item.cantidad_sugerida)}{' '}
                                <span className="text-xs font-normal text-slate-500">
                                  {comp?.codigo_unidad_medida || comp?.unidad_medida || 'UND'}
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
                                        '¿Retirar este componente de la lista BOM del modelo OEM?',
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

            {/* TARJETA 2: ESPECIFICACIONES TÉCNICAS POR DEFECTO (PLANTILLA JSONB) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Code2 className="h-5 w-5 text-indigo-600" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Especificaciones Técnicas por Defecto (Pre-llenado Inteligente JSONB)
                    </h4>
                    <p className="text-xs text-slate-500">
                      Valores de fábrica que hereda cualquier equipo al seleccionar este Modelo OEM
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openEditModelo(modeloDetalle)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>Editar Especificaciones Base</span>
                </button>
              </div>

              <div className="p-6 space-y-4">
                {Object.entries((modeloDetalle.especificaciones_base as any)?.modulos || {}).map(
                  ([modCode, attrsObj]: [string, any]) => (
                    <div
                      key={modCode}
                      className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 space-y-3"
                    >
                      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2">
                        <Boxes className="h-4 w-4 text-blue-600" />
                        <span className="font-mono text-xs font-bold text-slate-800 uppercase">
                          Módulo: {modCode}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {Object.entries(attrsObj || {}).map(([k, v]) => (
                          <div
                            key={k}
                            className="p-2.5 rounded-lg bg-white border border-slate-200/90"
                          >
                            <div className="font-mono text-[11px] text-slate-500">{k}</div>
                            <div className="text-xs font-extrabold text-slate-900 mt-0.5">
                              {String(v)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* MODAL CREAR / EDITAR MODELO OEM */}
      {showModeloModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h4 className="text-base font-bold text-slate-900">
                {editingModelo
                  ? `Editar Modelo OEM: ${editingModelo.codigo_modelo}`
                  : 'Crear Nuevo Modelo Maestro OEM'}
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
                    Código del Modelo OEM *
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
                    Arquetipo de Equipo *
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
                        {a.nombre_canonico || a.nombre_tipo} ({a.codigo_tipo})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Marca Fabricante *
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
                    Referencia de Modelo *
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
                  Nombre Comercial Descriptivo
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
                  Especificaciones Base por Defecto (JSONB Estructurado)
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
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm"
                >
                  Guardar Modelo OEM
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL VINCULAR COMPONENTE WMS AL BOM DEL MODELO OEM */}
      {showBomModal && modeloDetalle && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h4 className="text-base font-bold text-slate-900">
                Agregar Componente WMS a BOM ({modeloDetalle.marca} {modeloDetalle.modelo})
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
                  Buscar Artículo en Catálogo Maestro WMS
                </label>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filtrar por código, referencia o descripción..."
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
                  <option value="">-- Seleccionar Componente WMS --</option>
                  {componentesWms.map((c) => (
                    <option key={c.id_componente} value={c.id_componente}>
                      [{c.referencia_fabricante}] {c.descripcion_corta || c.marca} (Disp:{' '}
                      {c.stock_actual ?? 0} {c.codigo_unidad_medida || c.unidad_medida || 'UND'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Rol en Lista de Partes (BOM) *
                  </label>
                  <select
                    value={bomForm.rol_bom}
                    onChange={(e) => setBomForm({ ...bomForm, rol_bom: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs bg-white"
                  >
                    {ROLES_BOM.map((r) => (
                      <option key={r} value={r}>
                        {r}
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
                  Notas de Aplicación
                </label>
                <input
                  type="text"
                  placeholder="Ej: Cambio obligatorio en Preventivo Tipo A (250h)"
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
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm"
                >
                  Agregar a BOM
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
