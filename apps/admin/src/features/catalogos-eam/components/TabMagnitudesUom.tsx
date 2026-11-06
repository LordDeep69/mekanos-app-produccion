'use client';

import {
  AlertTriangle,
  ArrowRightLeft,
  BookOpen,
  Calculator,
  Check,
  CheckCircle2,
  Edit3,
  Gauge,
  Globe,
  Info,
  Layers,
  Loader2,
  Lock,
  Plus,
  Ruler,
  Scale,
  Search,
  Sparkles,
  Trash2,
  Unlock,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  MagnitudFisica,
  UnidadMedidaEam,
  useActivarMagnitudBancoEam,
  useConvertirUomEam,
  useCreateMagnitudEam,
  useCreateUnidadEam,
  useDeleteMagnitudEam,
  useDeleteUnidadEam,
  useMagnitudesEam,
  useUpdateMagnitudEam,
  useUpdateUnidadEam,
} from '../index';
import {
  BANCO_UNIVERSAL_QUDT,
  CATEGORIAS_QUDT,
  CategoriaMagnitud,
  MagnitudPreset,
} from '../data/banco-universal-qudt';

function generarSlugCodigo(nombre: string, maxLen = 20): string {
  return nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, maxLen);
}

function generarCodigoDesdeSimbolo(simbolo: string, nombre: string): string {
  if (!simbolo && !nombre) return '';
  const mapSpecial: Record<string, string> = {
    'Ω': 'OHM',
    'mΩ': 'MOHM',
    'kΩ': 'KOHM',
    'MΩ': 'MEOHM',
    'µF': 'UF',
    'uF': 'UF',
    'm/s': 'MS',
    'm/s²': 'MS2',
    'ft/s': 'FPS',
    'ft/s²': 'FTS2',
    'km/h': 'KMH',
    'N·m': 'NM',
    'kg/m³': 'KGM3',
    'mm²/s': 'MM2S',
    '°C': 'CEL',
    '°F': 'FAH',
    'K': 'KEL',
  };
  if (mapSpecial[simbolo]) return mapSpecial[simbolo];
  const clean = simbolo.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10);
  if (clean.length >= 1) return clean;
  return generarSlugCodigo(nombre, 10);
}

export function TabMagnitudesUom() {
  const { data: magnitudes = [], isLoading } = useMagnitudesEam();
  const [selectedMagCode, setSelectedMagCode] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Estado Conversor Rápido de Unidades (Compacto en 1 Sola Fila)
  const [calcMagCode, setCalcMagCode] = useState<string>('PRESION');
  const [calcValor, setCalcValor] = useState<string>('150');
  const [calcOrigen, setCalcOrigen] = useState<string>('PSI');
  const [calcDestino, setCalcDestino] = useState<string>('BAR');
  const convertirMut = useConvertirUomEam();

  // Banco Universal QUDT / UCUM Explorer Modal
  const [showBancoModal, setShowBancoModal] = useState(false);
  const [bancoSearch, setBancoSearch] = useState('');
  const [bancoCat, setBancoCat] = useState<CategoriaMagnitud | 'TODAS'>('TODAS');
  const [activandoPreset, setActivandoPreset] = useState<string | null>(null);
  const [bancoFeedback, setBancoFeedback] = useState<{ tipo: 'success' | 'error'; msg: string } | null>(null);
  const activarBancoMut = useActivarMagnitudBancoEam();

  // Modales CRUD Magnitud y Unidad
  const [showMagModal, setShowMagModal] = useState(false);
  const [editingMag, setEditingMag] = useState<MagnitudFisica | null>(null);
  const [customSlugMag, setCustomSlugMag] = useState(false);
  const [magForm, setMagForm] = useState({
    codigo_magnitud: '',
    nombre_magnitud: '',
    descripcion: '',
    unidad_base_codigo: '',
    // Creación atómica de unidad base inicial
    crearUnidadBase: true,
    base_nombre: '',
    base_simbolo: '',
    base_codigo: '',
    customSlugBaseUnit: false,
  });

  const [showUnitModal, setShowUnitModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState<UnidadMedidaEam | null>(null);
  const [customSlugUnit, setCustomSlugUnit] = useState(false);
  const [unitForm, setUnitForm] = useState({
    codigo: '',
    nombre: '',
    simbolo: '',
    factor_a: '1',
    factor_b: '0',
    es_unidad_base: false,
    permite_decimales: true,
  });

  const createMagMut = useCreateMagnitudEam();
  const updateMagMut = useUpdateMagnitudEam();
  const deleteMagMut = useDeleteMagnitudEam();
  const createUnitMut = useCreateUnidadEam();
  const updateUnitMut = useUpdateUnidadEam();
  const deleteUnitMut = useDeleteUnidadEam();

  // Estado del Modal de Advertencia y Confirmación de Eliminación
  const [deleteTarget, setDeleteTarget] = useState<{
    tipo: 'magnitud' | 'unidad';
    codigo: string;
    nombre: string;
    simbolo?: string;
    extraInfo?: string;
  } | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    try {
      if (deleteTarget.tipo === 'magnitud') {
        await deleteMagMut.mutateAsync(deleteTarget.codigo);
        // Si se eliminó la magnitud actualmente seleccionada, seleccionar otra
        if (selectedMagCode === deleteTarget.codigo) {
          const restantes = magnitudes.filter(
            (m) => m.codigo_magnitud !== deleteTarget.codigo,
          );
          setSelectedMagCode(restantes[0]?.codigo_magnitud || '');
        }
      } else {
        await deleteUnitMut.mutateAsync(deleteTarget.codigo);
      }
      setDeleteTarget(null);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Ocurrió un error al procesar la eliminación';
      setDeleteError(msg);
    }
  };

  useEffect(() => {
    if (!selectedMagCode && magnitudes.length > 0) {
      setSelectedMagCode(magnitudes[0].codigo_magnitud);
    }
  }, [magnitudes, selectedMagCode]);

  const magnitudesFiltradas = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return magnitudes;
    return magnitudes.filter((m) => {
      const matchNombre = m.nombre_magnitud.toLowerCase().includes(q);
      const matchCodigo = m.codigo_magnitud.toLowerCase().includes(q);
      const matchDesc = (m.descripcion || '').toLowerCase().includes(q);
      const matchBase = (m.unidad_base_codigo || '').toLowerCase().includes(q);
      const matchUnidades = m.unidades_medida?.some(
        (u) =>
          u.nombre.toLowerCase().includes(q) ||
          u.simbolo.toLowerCase().includes(q) ||
          u.codigo.toLowerCase().includes(q),
      );
      return matchNombre || matchCodigo || matchDesc || matchBase || matchUnidades;
    });
  }, [magnitudes, searchQuery]);

  // Si el usuario filtra y la magnitud activa queda fuera de los resultados, auto-seleccionar la primera coincidencia
  useEffect(() => {
    if (searchQuery.trim() && magnitudesFiltradas.length > 0) {
      const exists = magnitudesFiltradas.some((m) => m.codigo_magnitud === selectedMagCode);
      if (!exists) {
        setSelectedMagCode(magnitudesFiltradas[0].codigo_magnitud);
      }
    }
  }, [searchQuery, magnitudesFiltradas, selectedMagCode]);

  const selectedMagnitud = useMemo(
    () => magnitudes.find((m) => m.codigo_magnitud === selectedMagCode) || magnitudes[0] || null,
    [magnitudes, selectedMagCode],
  );

  const calcMagnitudObj = useMemo(
    () => magnitudes.find((m) => m.codigo_magnitud === calcMagCode) || magnitudes[0] || null,
    [magnitudes, calcMagCode],
  );

  const unidadesCalcDisponibles = useMemo(
    () => calcMagnitudObj?.unidades_medida || [],
    [calcMagnitudObj],
  );

  const handleSelectCalcMagnitud = (cod: string) => {
    setCalcMagCode(cod);
    const mag = magnitudes.find((m) => m.codigo_magnitud === cod);
    const units = mag?.unidades_medida || [];
    if (units.length >= 2) {
      setCalcOrigen(units[1].codigo);
      setCalcDestino(units[0].codigo);
    } else if (units.length === 1) {
      setCalcOrigen(units[0].codigo);
      setCalcDestino(units[0].codigo);
    }
  };

  const handleRunConversion = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const num = parseFloat(calcValor);
    if (isNaN(num) || !calcOrigen || !calcDestino) return;
    await convertirMut.mutateAsync({
      valor: num,
      unidadOrigen: calcOrigen,
      unidadDestino: calcDestino,
    });
  };

  // Disparar conversión inicial al montar
  useEffect(() => {
    if (magnitudes.length > 0 && !convertirMut.data && !convertirMut.isPending) {
      convertirMut.mutate({
        valor: 150,
        unidadOrigen: 'PSI',
        unidadDestino: 'BAR',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [magnitudes.length]);

  // Filtrado reactivo de presets del Banco Canónico QUDT/UCUM
  const presetsFiltrados = useMemo(() => {
    let list = BANCO_UNIVERSAL_QUDT;
    if (bancoCat !== 'TODAS') {
      list = list.filter((p) => p.categoria === bancoCat);
    }
    const q = bancoSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter((p) => {
      const mNom = p.nombre_magnitud.toLowerCase().includes(q);
      const mCod = p.codigo_magnitud.toLowerCase().includes(q);
      const mDesc = p.descripcion.toLowerCase().includes(q);
      const mBase = p.unidad_base_codigo.toLowerCase().includes(q);
      const mUnits = p.unidades.some(
        (u) =>
          u.nombre.toLowerCase().includes(q) ||
          u.simbolo.toLowerCase().includes(q) ||
          u.codigo.toLowerCase().includes(q),
      );
      return mNom || mCod || mDesc || mBase || mUnits;
    });
  }, [bancoCat, bancoSearch]);

  const handleActivarPreset = async (preset: MagnitudPreset) => {
    setActivandoPreset(preset.codigo_magnitud);
    setBancoFeedback(null);
    try {
      await activarBancoMut.mutateAsync(preset.codigo_magnitud);
      setSelectedMagCode(preset.codigo_magnitud);
      setBancoFeedback({
        tipo: 'success',
        msg: `¡Magnitud "${preset.nombre_magnitud}" activada exitosamente con sus ${preset.unidades.length} unidades canónicas!`,
      });
      setTimeout(() => setBancoFeedback(null), 4500);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || err?.message || 'Error al activar la magnitud preconfigurada';
      setBancoFeedback({ tipo: 'error', msg });
    } finally {
      setActivandoPreset(null);
    }
  };

  const openNewMagnitud = () => {
    setEditingMag(null);
    setCustomSlugMag(false);
    setMagForm({
      codigo_magnitud: '',
      nombre_magnitud: '',
      descripcion: '',
      unidad_base_codigo: '',
      crearUnidadBase: true,
      base_nombre: '',
      base_simbolo: '',
      base_codigo: '',
      customSlugBaseUnit: false,
    });
    setShowMagModal(true);
  };

  const openEditMagnitud = (mag: MagnitudFisica) => {
    setEditingMag(mag);
    setCustomSlugMag(true);
    setMagForm({
      codigo_magnitud: mag.codigo_magnitud,
      nombre_magnitud: mag.nombre_magnitud,
      descripcion: mag.descripcion || '',
      unidad_base_codigo: mag.unidad_base_codigo || '',
      crearUnidadBase: false,
      base_nombre: '',
      base_simbolo: '',
      base_codigo: '',
      customSlugBaseUnit: false,
    });
    setShowMagModal(true);
  };

  const handleNombreMagChange = (nombre: string) => {
    setMagForm((prev) => ({
      ...prev,
      nombre_magnitud: nombre,
      codigo_magnitud: customSlugMag ? prev.codigo_magnitud : generarSlugCodigo(nombre, 25),
    }));
  };

  const handleSaveMagnitud = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingMag) {
      await updateMagMut.mutateAsync({
        codigo: editingMag.codigo_magnitud,
        payload: {
          nombre_magnitud: magForm.nombre_magnitud,
          descripcion: magForm.descripcion,
          unidad_base_codigo: magForm.unidad_base_codigo || undefined,
        },
      });
    } else {
      const payload: any = {
        codigo_magnitud: magForm.codigo_magnitud.trim().toUpperCase(),
        nombre_magnitud: magForm.nombre_magnitud.trim(),
        descripcion: magForm.descripcion?.trim() || undefined,
      };

      if (magForm.crearUnidadBase && magForm.base_nombre && magForm.base_simbolo) {
        const uCod = (
          magForm.base_codigo ||
          generarCodigoDesdeSimbolo(magForm.base_simbolo, magForm.base_nombre)
        ).trim().toUpperCase();

        payload.unidad_base = {
          codigo: uCod,
          nombre: magForm.base_nombre.trim(),
          simbolo: magForm.base_simbolo.trim(),
          permite_decimales: true,
        };
        payload.unidad_base_codigo = uCod;
      } else if (magForm.unidad_base_codigo) {
        payload.unidad_base_codigo = magForm.unidad_base_codigo.trim().toUpperCase();
      }

      const created = await createMagMut.mutateAsync(payload);
      setSelectedMagCode(created.codigo_magnitud);
    }
    setShowMagModal(false);
  };

  const openNewUnit = () => {
    setEditingUnit(null);
    setCustomSlugUnit(false);
    setUnitForm({
      codigo: '',
      nombre: '',
      simbolo: '',
      factor_a: '1',
      factor_b: '0',
      es_unidad_base: false,
      permite_decimales: true,
    });
    setShowUnitModal(true);
  };

  const openEditUnit = (u: UnidadMedidaEam) => {
    setEditingUnit(u);
    setCustomSlugUnit(true);
    setUnitForm({
      codigo: u.codigo,
      nombre: u.nombre,
      simbolo: u.simbolo,
      factor_a: String(u.factor_a ?? 1),
      factor_b: String(u.factor_b ?? 0),
      es_unidad_base: Boolean(u.es_unidad_base),
      permite_decimales: Boolean(u.permite_decimales),
    });
    setShowUnitModal(true);
  };

  const handleNombreUnitChange = (nombre: string) => {
    setUnitForm((prev) => {
      const cod = customSlugUnit
        ? prev.codigo
        : prev.simbolo
        ? generarCodigoDesdeSimbolo(prev.simbolo, nombre)
        : generarSlugCodigo(nombre, 10);
      return { ...prev, nombre, codigo: cod };
    });
  };

  const handleSimboloUnitChange = (simbolo: string) => {
    setUnitForm((prev) => {
      const cod = customSlugUnit
        ? prev.codigo
        : generarCodigoDesdeSimbolo(simbolo, prev.nombre);
      return { ...prev, simbolo, codigo: cod };
    });
  };

  const handleToggleUnidadBase = (checked: boolean) => {
    setUnitForm((prev) => ({
      ...prev,
      es_unidad_base: checked,
      factor_a: checked ? '1' : prev.factor_a,
      factor_b: checked ? '0' : prev.factor_b,
    }));
  };

  const handleSaveUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMagnitud) return;

    const factorA = unitForm.es_unidad_base ? 1.0 : parseFloat(unitForm.factor_a) || 1;
    const factorB = unitForm.es_unidad_base ? 0.0 : parseFloat(unitForm.factor_b) || 0;

    if (editingUnit) {
      await updateUnitMut.mutateAsync({
        codigo: editingUnit.codigo,
        payload: {
          nombre: unitForm.nombre.trim(),
          simbolo: unitForm.simbolo.trim(),
          id_magnitud: selectedMagnitud.id_magnitud,
          factor_a: factorA,
          factor_b: factorB,
          es_unidad_base: unitForm.es_unidad_base,
          permite_decimales: unitForm.permite_decimales,
        },
      });
    } else {
      await createUnitMut.mutateAsync({
        codigo: unitForm.codigo.trim().toUpperCase(),
        nombre: unitForm.nombre.trim(),
        simbolo: unitForm.simbolo.trim(),
        id_magnitud: selectedMagnitud.id_magnitud,
        codigo_magnitud: selectedMagnitud.codigo_magnitud,
        factor_a: factorA,
        factor_b: factorB,
        es_unidad_base: unitForm.es_unidad_base,
        permite_decimales: unitForm.permite_decimales,
      });
    }
    setShowUnitModal(false);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200">
        <Loader2 className="h-9 w-9 animate-spin text-blue-600 mb-3" />
        <p className="text-sm font-medium text-slate-600">Cargando Unidades de Medida...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* BARRA HORIZONTAL COMPACTA DE 1 SOLA FILA: CONVERSOR RÁPIDO DE UNIDADES */}
      <form
        onSubmit={handleRunConversion}
        className="rounded-2xl bg-slate-900 text-white px-5 py-3 shadow-sm border border-slate-800 flex flex-wrap items-center justify-between gap-3"
      >
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Calculator className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-extrabold text-white">
              Conversor Rápido de Unidades
            </div>
            <div className="text-[11px] text-slate-400">
              Prueba equivalencias exactas (PSI ↔ BAR, kW ↔ HP, °F ↔ °C, GPM ↔ L/s)
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={calcMagCode}
            onChange={(e) => handleSelectCalcMagnitud(e.target.value)}
            className="h-9 px-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-semibold focus:ring-2 focus:ring-blue-500"
          >
            {magnitudes.map((m) => (
              <option key={m.codigo_magnitud} value={m.codigo_magnitud}>
                {m.nombre_magnitud}
              </option>
            ))}
          </select>

          <input
            type="number"
            step="any"
            value={calcValor}
            onChange={(e) => setCalcValor(e.target.value)}
            className="h-9 w-24 px-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono text-xs font-bold focus:ring-2 focus:ring-blue-500"
          />

          <select
            value={calcOrigen}
            onChange={(e) => setCalcOrigen(e.target.value)}
            className="h-9 px-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-semibold focus:ring-2 focus:ring-blue-500"
          >
            {unidadesCalcDisponibles.map((u) => (
              <option key={u.codigo} value={u.codigo}>
                {u.simbolo} — {u.nombre}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => {
              const tmp = calcOrigen;
              setCalcOrigen(calcDestino);
              setCalcDestino(tmp);
            }}
            className="h-9 w-9 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 flex items-center justify-center text-slate-200 transition-colors"
            title="Invertir unidades"
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
          </button>

          <select
            value={calcDestino}
            onChange={(e) => setCalcDestino(e.target.value)}
            className="h-9 px-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-semibold focus:ring-2 focus:ring-blue-500"
          >
            {unidadesCalcDisponibles.map((u) => (
              <option key={u.codigo} value={u.codigo}>
                {u.simbolo} — {u.nombre}
              </option>
            ))}
          </select>

          <button
            type="submit"
            disabled={convertirMut.isPending}
            className="h-9 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
          >
            {convertirMut.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            <span>Convertir</span>
          </button>

          {convertirMut.data && (
            <div className="h-9 px-3.5 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center gap-2">
              <span className="text-[11px] font-bold text-emerald-300">=</span>
              <span className="text-sm font-extrabold font-mono text-white">
                {Number(convertirMut.data.valorDestino).toLocaleString('es-CO', {
                  maximumFractionDigits: 4,
                })}{' '}
                <span className="text-emerald-300">{convertirMut.data.unidadDestino}</span>
              </span>
            </div>
          )}
        </div>
      </form>

      {/* MAESTRO-DETALLE VISIBLE DE INMEDIATO SIN SCROLL: 11 MAGNITUDES Y SUS UNIDADES */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Columna Izquierda: Lista de Magnitudes Físicas */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Scale className="h-5 w-5 text-blue-600" />
                <span>Magnitudes de Medida ({magnitudes.length})</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Selecciona una magnitud para ver y administrar sus unidades
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setBancoFeedback(null);
                  setShowBancoModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 transition-colors shadow-2xs"
                title="Explorar e incorporar magnitudes canónicas estándar (QUDT & UCUM)"
              >
                <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                <span>Banco QUDT</span>
              </button>
              <button
                type="button"
                onClick={openNewMagnitud}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Nueva Magnitud</span>
              </button>
            </div>
          </div>

          {/* Buscador Rápido y Reactivo de Magnitudes */}
          <div className="p-3 bg-slate-50/80 border-b border-slate-100 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar magnitud, unidad o símbolo (ej: Potencia, TR, PSI, kW)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setSearchQuery('');
                }}
                className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  title="Limpiar búsqueda (Esc)"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {searchQuery.trim() && (
              <div className="flex items-center justify-between px-1 text-[11px] text-slate-500">
                <span>
                  Mostrando <strong className="text-blue-600 font-bold">{magnitudesFiltradas.length}</strong> de {magnitudes.length} magnitudes
                </span>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-blue-600 hover:text-blue-700 font-semibold hover:underline"
                >
                  Restablecer lista
                </button>
              </div>
            )}
          </div>

          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {magnitudesFiltradas.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                  <Search className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">No se encontraron magnitudes</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    No hay coincidencias para &ldquo;<span className="text-slate-600 font-medium">{searchQuery}</span>&rdquo;
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Limpiar filtro</span>
                </button>
              </div>
            ) : (
              magnitudesFiltradas.map((mag) => {
                const isSelected = selectedMagnitud?.codigo_magnitud === mag.codigo_magnitud;
                const numUnidades = mag.unidades_medida?.length || 0;
                return (
                  <div
                    key={mag.id_magnitud}
                    onClick={() => setSelectedMagCode(mag.codigo_magnitud)}
                    className={`p-4 cursor-pointer transition-all flex items-start justify-between gap-3 ${
                      isSelected
                        ? 'bg-blue-50/80 border-l-4 border-l-blue-600'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="text-sm font-bold text-slate-900">
                          {mag.nombre_magnitud}
                        </span>
                        {mag.unidad_base_codigo && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
                            Principal: {mag.unidad_base_codigo}
                          </span>
                        )}
                      </div>
                      {mag.descripcion && (
                        <div className="text-xs text-slate-500">{mag.descripcion}</div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold">
                        {numUnidades} unidades
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditMagnitud(mag);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Editar magnitud"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteError(null);
                          setDeleteTarget({
                            tipo: 'magnitud',
                            codigo: mag.codigo_magnitud,
                            nombre: mag.nombre_magnitud,
                            extraInfo: `${numUnidades} unidades asociadas${
                              mag.unidad_base_codigo
                                ? ` · Principal: ${mag.unidad_base_codigo}`
                                : ''
                            }`,
                          });
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Eliminar magnitud"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Columna Derecha: Unidades de Medida de la Magnitud Seleccionada */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          {selectedMagnitud ? (
            <>
              <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/60">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Ruler className="h-5 w-5 text-indigo-600" />
                    <h3 className="text-base font-bold text-slate-900">
                      Unidades de {selectedMagnitud.nombre_magnitud}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500">
                    Unidad principal de referencia:{' '}
                    <strong className="text-slate-800">
                      {selectedMagnitud.unidad_base_codigo || 'Estándar'}
                    </strong>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={openNewUnit}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors shrink-0"
                >
                  <Plus className="h-4 w-4" />
                  <span>Nueva Unidad</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-5">Nombre de la Unidad</th>
                      <th className="py-3 px-4">Símbolo</th>
                      <th className="py-3 px-4">Tipo</th>
                      <th className="py-3 px-4">Factor de Conversión</th>
                      <th className="py-3 px-4">Desplazamiento (Térmico)</th>
                      <th className="py-3 px-5 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {(selectedMagnitud.unidades_medida || []).map((u) => (
                      <tr key={u.codigo} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-5">
                          <div className="font-bold text-slate-900">{u.nombre}</div>
                          <div className="font-mono text-xs text-slate-400 mt-0.5">
                            Código: {u.codigo}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-mono text-xs font-bold">
                            {u.simbolo}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {u.es_unidad_base ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Unidad Principal</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                              Unidad Equivalente
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-slate-700 font-semibold">
                          × {Number(u.factor_a)}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-slate-600">
                          {Number(u.factor_b) === 0 ? '—' : `+ ${Number(u.factor_b)}`}
                        </td>
                        <td className="py-3 px-5 text-right">
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            <button
                              type="button"
                              onClick={() => openEditUnit(u)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-xs font-semibold text-slate-700 hover:text-blue-700 transition-colors"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                              <span>Editar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteError(null);
                                setDeleteTarget({
                                  tipo: 'unidad',
                                  codigo: u.codigo,
                                  nombre: u.nombre,
                                  simbolo: u.simbolo,
                                  extraInfo: u.es_unidad_base
                                    ? 'Unidad Principal de la magnitud'
                                    : `Factor de conversión: × ${Number(u.factor_a)}`,
                                });
                              }}
                              className="p-1.5 rounded-lg border border-transparent text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors"
                              title="Eliminar unidad de medida"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-slate-500 text-sm">
              Selecciona una magnitud de medida a la izquierda.
            </div>
          )}
        </div>
      </div>

      {/* MODAL EXPLORADOR DEL BANCO UNIVERSAL CANÓNICO (QUDT & UCUM) */}
      {showBancoModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Cabecera */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-white flex items-center gap-2">
                    <span>Banco Universal de Magnitudes Físicas</span>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-500/30 border border-indigo-400/40 text-[10px] font-bold text-indigo-200 uppercase tracking-wider">
                      QUDT / UCUM
                    </span>
                  </h4>
                  <p className="text-xs text-indigo-200/70">
                    Estándares ontológicos internacionales (NASA / W3C / ISO 80000). Activa magnitudes completas con factores exactos en 1 clic.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBancoModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Barra de Búsqueda y Categorías */}
            <div className="p-4 bg-slate-50 border-b border-slate-100 space-y-3">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar magnitud, unidad o símbolo (ej: masa, kg, velocidad, aceleración, viscosidad, ciclos)..."
                  value={bancoSearch}
                  onChange={(e) => setBancoSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs font-medium"
                />
              </div>

              {/* Categorías Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                {CATEGORIAS_QUDT.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setBancoCat(cat.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                      bancoCat === cat.id
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {bancoFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 ${
                    bancoFeedback.tipo === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {bancoFeedback.tipo === 'success' ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                    )}
                    <span>{bancoFeedback.msg}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBancoFeedback(null)}
                    className="p-1 hover:opacity-70"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Listado de Tarjetas de Magnitud */}
            <div className="p-6 overflow-y-auto flex-1 space-y-3 bg-slate-50/50">
              {presetsFiltrados.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs">
                  No se encontraron magnitudes estándar para la búsqueda &ldquo;{bancoSearch}&rdquo;.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {presetsFiltrados.map((preset) => {
                    const yaActivada = magnitudes.some(
                      (m) => m.codigo_magnitud === preset.codigo_magnitud,
                    );
                    const isProcessing =
                      activarBancoMut.isPending && activandoPreset === preset.codigo_magnitud;

                    return (
                      <div
                        key={preset.codigo_magnitud}
                        className={`rounded-2xl border p-4.5 bg-white flex flex-col justify-between gap-3 transition-all ${
                          yaActivada
                            ? 'border-emerald-200 shadow-2xs'
                            : 'border-slate-200 hover:border-indigo-300 hover:shadow-sm'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700">
                                  {preset.codigo_magnitud}
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                                  {preset.categoria}
                                </span>
                              </div>
                              <h5 className="text-sm font-bold text-slate-900 mt-1">
                                {preset.nombre_magnitud}
                              </h5>
                            </div>

                            {yaActivada ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200 shrink-0">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                <span>Activa</span>
                              </span>
                            ) : null}
                          </div>

                          <p className="text-xs text-slate-500 leading-relaxed">
                            {preset.descripcion}
                          </p>

                          {/* Unidades incluidas */}
                          <div className="pt-2 border-t border-slate-100 space-y-1.5">
                            <div className="text-[11px] font-bold text-slate-600 flex items-center justify-between">
                              <span>Unidad Base: <strong className="font-mono text-indigo-700">{preset.unidad_base_codigo}</strong></span>
                              <span className="text-[10px] text-slate-400">{preset.unidades.length} unidades canónicas</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {preset.unidades.map((u) => (
                                <span
                                  key={u.codigo}
                                  title={`${u.nombre} (Factor: ${u.factor_a})`}
                                  className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold ${
                                    u.es_unidad_base
                                      ? 'bg-indigo-100 text-indigo-900 border border-indigo-200 font-bold'
                                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                                  }`}
                                >
                                  {u.simbolo}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Botón de Acción */}
                        <div className="pt-2">
                          {yaActivada ? (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedMagCode(preset.codigo_magnitud);
                                setShowBancoModal(false);
                              }}
                              className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                            >
                              <span>Ver en Catálogo</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={activarBancoMut.isPending}
                              onClick={() => handleActivarPreset(preset)}
                              className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                            >
                              {isProcessing ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Plus className="h-4 w-4" />
                              )}
                              <span>Activar en 1 Clic ({preset.unidades.length} UoM)</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pie del Modal */}
            <div className="px-6 py-3 border-t border-slate-200 bg-white flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-slate-400" />
                <span>
                  Las magnitudes activadas se integran automáticamente en los selectores de fichas técnicas y telemetría.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowBancoModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CREAR / EDITAR MAGNITUD DE MEDIDA */}
      {showMagModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Gauge className="h-5 w-5 text-blue-600" />
                <h4 className="text-base font-bold text-slate-900">
                  {editingMag
                    ? `Editar Magnitud: ${editingMag.nombre_magnitud}`
                    : 'Nueva Magnitud de Medida'}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowMagModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMagnitud} className="p-6 space-y-4">
              {/* 1° NOMBRE DE LA MAGNITUD PRIMERO CON AUTOFOCUS */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre de la Magnitud *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Ej: Masa / Carga de Transporte"
                  value={magForm.nombre_magnitud}
                  onChange={(e) => handleNombreMagChange(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              {/* 2° CÓDIGO IDENTIFICADOR AUTO-SUGERIDO */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    Código Identificador *
                  </label>
                  {!editingMag && (
                    <button
                      type="button"
                      onClick={() => setCustomSlugMag(!customSlugMag)}
                      className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
                    >
                      {customSlugMag ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                      <span>{customSlugMag ? 'Auto-generar slug' : 'Personalizar código'}</span>
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  required
                  disabled={Boolean(editingMag) || !customSlugMag}
                  placeholder="Ej: MASA"
                  value={magForm.codigo_magnitud}
                  onChange={(e) =>
                    setMagForm({ ...magForm, codigo_magnitud: e.target.value.toUpperCase() })
                  }
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-mono text-sm disabled:bg-slate-100 disabled:text-slate-600"
                />
                {!customSlugMag && !editingMag && (
                  <p className="text-[11px] text-slate-400 mt-1">
                    Generado automáticamente a partir del nombre. Haz clic en personalizar si requieres un código específico.
                  </p>
                )}
              </div>

              {/* 3° DESCRIPCIÓN */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Descripción
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej: Capacidad máxima admisible en cabina y masa de contrapeso..."
                  value={magForm.descripcion}
                  onChange={(e) => setMagForm({ ...magForm, descripcion: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              {/* 4° DEFINICIÓN DE UNIDAD BASE (SUB-CARD ELEGANTE) */}
              {!editingMag ? (
                <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Ruler className="h-4 w-4 text-blue-600" />
                      <span className="text-xs font-bold text-blue-950">
                        Unidad Principal de Referencia (Base 1.0)
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-200/50 text-blue-800">
                      Factor: 1.0
                    </span>
                  </div>

                  <p className="text-[11px] text-blue-900/70 leading-relaxed">
                    Toda magnitud física requiere una unidad canónica contra la cual se calculan los factores de conversión de las demás unidades.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Nombre de Unidad Base *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: Kilogramo"
                        value={magForm.base_nombre}
                        onChange={(e) => {
                          const n = e.target.value;
                          setMagForm((prev) => ({
                            ...prev,
                            base_nombre: n,
                            base_codigo: prev.customSlugBaseUnit
                              ? prev.base_codigo
                              : prev.base_simbolo
                              ? generarCodigoDesdeSimbolo(prev.base_simbolo, n)
                              : generarSlugCodigo(n, 10),
                          }));
                        }}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Símbolo * (sensible a mayúsculas)
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: kg"
                        value={magForm.base_simbolo}
                        onChange={(e) => {
                          const sym = e.target.value;
                          setMagForm((prev) => ({
                            ...prev,
                            base_simbolo: sym,
                            base_codigo: prev.customSlugBaseUnit
                              ? prev.base_codigo
                              : generarCodigoDesdeSimbolo(sym, prev.base_nombre),
                          }));
                        }}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-mono text-xs font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-700">
                        Código de Unidad Base
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setMagForm((prev) => ({
                            ...prev,
                            customSlugBaseUnit: !prev.customSlugBaseUnit,
                          }))
                        }
                        className="text-[10px] text-blue-600 hover:text-blue-700 font-semibold"
                      >
                        {magForm.customSlugBaseUnit ? 'Auto-código' : 'Personalizar código'}
                      </button>
                    </div>
                    <input
                      type="text"
                      disabled={!magForm.customSlugBaseUnit}
                      placeholder="Ej: KG"
                      value={magForm.base_codigo}
                      onChange={(e) =>
                        setMagForm({ ...magForm, base_codigo: e.target.value.toUpperCase() })
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono text-xs disabled:bg-white/50"
                    />
                  </div>
                </div>
              ) : (
                /* Modo edición: Selector limpio de la unidad principal */
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Unidad Principal de Referencia
                  </label>
                  <select
                    value={magForm.unidad_base_codigo}
                    onChange={(e) =>
                      setMagForm({ ...magForm, unidad_base_codigo: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-mono text-sm bg-white"
                  >
                    <option value="">-- Sin asignar --</option>
                    {(editingMag.unidades_medida || []).map((u) => (
                      <option key={u.codigo} value={u.codigo}>
                        {u.simbolo} — {u.nombre} ({u.codigo})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowMagModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMagMut.isPending || updateMagMut.isPending}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs"
                >
                  Guardar Magnitud
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CREAR / EDITAR UNIDAD DE MEDIDA */}
      {showUnitModal && selectedMagnitud && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Ruler className="h-5 w-5 text-indigo-600" />
                <h4 className="text-base font-bold text-slate-900">
                  {editingUnit
                    ? `Editar Unidad: ${editingUnit.nombre}`
                    : `Nueva Unidad para ${selectedMagnitud.nombre_magnitud}`}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowUnitModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUnit} className="p-6 space-y-4">
              {/* 1° NOMBRE DE LA UNIDAD PRIMERO CON AUTOFOCUS */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre de la Unidad *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Ej: Metro por Segundo"
                  value={unitForm.nombre}
                  onChange={(e) => handleNombreUnitChange(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

              {/* 2° SÍMBOLO Y CÓDIGO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Símbolo * (sensible a mayúsculas)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: m/s, kg, Hz, Pa, N·m"
                    value={unitForm.simbolo}
                    onChange={(e) => handleSimboloUnitChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-sm font-bold"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Respeta mayúsculas/minúsculas (ej: <span className="font-mono">kg</span>, <span className="font-mono">m/s</span>, <span className="font-mono">Hz</span>).
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      Código *
                    </label>
                    {!editingUnit && (
                      <button
                        type="button"
                        onClick={() => setCustomSlugUnit(!customSlugUnit)}
                        className="text-[11px] text-indigo-600 hover:text-indigo-700 font-semibold"
                      >
                        {customSlugUnit ? 'Auto' : 'Personalizar'}
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingUnit) || !customSlugUnit}
                    placeholder="Ej: MS"
                    value={unitForm.codigo}
                    onChange={(e) =>
                      setUnitForm({ ...unitForm, codigo: e.target.value.toUpperCase() })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-sm disabled:bg-slate-100 disabled:text-slate-600"
                  />
                </div>
              </div>

              {/* 3° SWITCH UNIDAD PRINCIPAL */}
              <div className="pt-2">
                <label className="inline-flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-800 p-3 rounded-xl border border-slate-200 bg-slate-50 w-full hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={unitForm.es_unidad_base}
                    onChange={(e) => handleToggleUnidadBase(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <div>
                    <span className="block font-bold text-slate-900">¿Es la Unidad Principal de la Magnitud?</span>
                    <span className="block text-[11px] font-normal text-slate-500">
                      Se registrará como la referencia base (Factor = 1.0) para todas las conversiones.
                    </span>
                  </div>
                </label>
              </div>

              {/* 4° FACTORES DE CONVERSIÓN */}
              {unitForm.es_unidad_base ? (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-emerald-900">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-xs leading-relaxed">
                    <strong className="font-bold">Unidad Base Canónica:</strong> El Factor de Conversión se fijará automáticamente en <span className="font-mono font-bold">1.0</span> y el Desplazamiento Térmico en <span className="font-mono font-bold">0.0</span>.
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Factor de Conversión * (A)
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="Ej: 1000"
                      value={unitForm.factor_a}
                      onChange={(e) => setUnitForm({ ...unitForm, factor_a: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-sm bg-white"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      1 {unitForm.simbolo || 'unidad'} = A × {selectedMagnitud.unidad_base_codigo || 'base'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Desplazamiento Térmico (B)
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={unitForm.factor_b}
                      onChange={(e) => setUnitForm({ ...unitForm, factor_b: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-sm bg-white"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Para escalas de temperatura (A × x + B)
                    </p>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowUnitModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createUnitMut.isPending || updateUnitMut.isPending}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs"
                >
                  Guardar Unidad
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE ADVERTENCIA Y CONFIRMACIÓN DE ELIMINACIÓN */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-rose-100 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Cabecera con alerta visual */}
            <div className="px-6 pt-6 pb-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-base font-bold text-slate-900">
                  {deleteTarget.tipo === 'magnitud'
                    ? '¿Eliminar Magnitud de Medida?'
                    : '¿Eliminar Unidad de Medida?'}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Esta acción requiere confirmación de seguridad
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteError(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-6 py-2 space-y-3.5">
              {/* Tarjeta resumen del elemento a eliminar */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 truncate">
                    {deleteTarget.nombre}
                  </span>
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 font-bold">
                    {deleteTarget.codigo}
                  </span>
                </div>
                {deleteTarget.extraInfo && (
                  <p className="text-[11px] text-slate-500 font-medium">
                    {deleteTarget.extraInfo}
                  </p>
                )}
              </div>

              {/* Advertencia de Integridad Referencial */}
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-amber-900">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <strong className="font-bold">Advertencia de trazabilidad:</strong> Se eliminará el elemento de los catálogos activos. Si posee vínculos con órdenes o equipos existentes, se preservará la integridad histórica mediante desactivación controlada.
                </div>
              </div>

              {/* Mensaje de error si la validación del backend rechaza la operación */}
              {deleteError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="font-medium leading-relaxed">{deleteError}</div>
                </div>
              )}
            </div>

            {/* Acciones */}
            <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end gap-2.5 mt-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteError(null);
                }}
                disabled={deleteMagMut.isPending || deleteUnitMut.isPending}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-white hover:border-slate-400 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteMagMut.isPending || deleteUnitMut.isPending}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
              >
                {deleteMagMut.isPending || deleteUnitMut.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                <span>Eliminar Definitivamente</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
