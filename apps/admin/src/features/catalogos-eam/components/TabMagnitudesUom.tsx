'use client';

import {
  AlertTriangle,
  ArrowRightLeft,
  BookOpen,
  Calculator,
  Check,
  CheckCircle2,
  Edit3,
  EyeOff,
  Eye,
  Gauge,
  Package,
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
import { useToast } from '@/hooks/use-toast';
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
  useSetActivoMagnitudEam,
  useReactivarTodasMagnitudesEam,
  useSetActivoDisciplinaEam,
} from '../index';
import {
  BANCO_UNIVERSAL_QUDT,
  CATEGORIAS_QUDT,
  CategoriaMagnitud,
  MagnitudPreset,
} from '../data/banco-universal-qudt';

const DISCIPLINAS_COLUMNA: Array<{ id: CategoriaMagnitud | 'TODAS'; label: string }> = [
  { id: 'TODAS', label: 'Todas' },
  { id: 'MECANICA_POTENCIA', label: 'Mecánica & Potencia' },
  { id: 'FLUIDOS_PRESION', label: 'Fluidos & Presión' },
  { id: 'TERMICA_HVAC', label: 'Térmica & HVAC' },
  { id: 'ELECTRICIDAD', label: 'Electricidad & Señal' },
  { id: 'VIBRACION_ACUSTICA', label: 'Vibración' },
  { id: 'QUIMICA_AGUA', label: 'Química & Agua' },
  { id: 'OPTICA_ILUMINACION', label: 'Óptica' },
  { id: 'TI_DIGITAL', label: 'TI & Telecom' },
  { id: 'OPERACION_DESGASTE', label: 'Operación' },
];

/**
 * Normaliza un texto a formato SNAKE_CASE mayúsculas sin acentos ni diacríticos.
 */
function normalizarSlug(texto: string, maxLen = 30): string {
  if (!texto) return '';
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, maxLen);
}

const SIMBOLOS_CANONICOS: Record<string, string> = {
  'Ω': 'OHM',
  'mΩ': 'MOHM',
  'kΩ': 'KOHM',
  'MΩ': 'MEOHM',
  'µ': 'U',
  'µm': 'UM',
  'µF': 'UF',
  'uF': 'UF',
  'µs': 'US',
  'µg': 'UG',
  'm/s': 'MS',
  'm/s²': 'MS2',
  'ft/s': 'FPS',
  'ft/s²': 'FTS2',
  'km/h': 'KMH',
  'N·m': 'NM',
  'N.m': 'NM',
  'Nm': 'NM',
  'kg/m³': 'KGM3',
  'g/cm³': 'GCM3',
  'mm²/s': 'MM2S',
  'mm/s': 'MMS',
  '°C': 'CEL',
  '°F': 'FAH',
  'K': 'KEL',
  '°': 'DEG',
  '%': 'PCT',
  'l/min': 'LPM',
  'L/min': 'LPM',
  'gal/min': 'GPM',
  'pulg': 'IN',
  'pie': 'FT',
  'pies': 'FT',
};

/**
 * Generador Inteligente Anti-Colisión para Magnitudes Físicas.
 * Garantiza al 100% que el código resultante no exista previamente en el catálogo.
 */
function generarCodigoMagnitudInteligente(
  nombre: string,
  codigosExistentes: Set<string>,
  maxLen = 30,
): string {
  if (!nombre || !nombre.trim()) return '';
  const base = normalizarSlug(nombre, maxLen);
  if (!base) return '';

  if (!codigosExistentes.has(base)) {
    return base;
  }

  // Si colisiona, aplica bucle determinista incremental garantizado (_2, _3, ...)
  let contador = 2;
  while (contador < 1000) {
    const sufijo = `_${contador}`;
    const baseRecortada = base.slice(0, Math.max(3, maxLen - sufijo.length));
    const candidato = `${baseRecortada}${sufijo}`;
    if (!codigosExistentes.has(candidato)) {
      return candidato;
    }
    contador++;
  }
  return `${base.slice(0, maxLen - 5)}_${Date.now().toString().slice(-4)}`;
}

/**
 * Generador Inteligente Anti-Colisión para Unidades de Medida.
 * - Desambigua por símbolo técnico universal (ISO/QUDT).
 * - Aplica contextualización por magnitud padre si el símbolo base colisiona.
 * - Garantiza al 100% unicidad estricta contra la PK global (VarChar(20)).
 */
function generarCodigoUnidadInteligente(
  simbolo: string,
  nombre: string,
  codigosExistentes: Set<string>,
  codigoMagnitudPadre?: string,
  maxLen = 20,
): string {
  const sim = (simbolo || '').trim();
  const nom = (nombre || '').trim();
  if (!sim && !nom) return '';

  let raiz = '';
  if (sim) {
    if (SIMBOLOS_CANONICOS[sim]) {
      raiz = SIMBOLOS_CANONICOS[sim];
    } else {
      let limpia = sim
        .replace(/[µμ]/g, 'U')
        .replace(/²/g, '2')
        .replace(/³/g, '3')
        .replace(/[\/·\.\-]/g, '_')
        .replace(/[^a-zA-Z0-9_]/g, '')
        .toUpperCase();
      limpia = limpia.replace(/^_+|_+$/g, '').replace(/_+/g, '_');
      if (limpia.length >= 1) {
        raiz = limpia.slice(0, maxLen);
      }
    }
  }

  if (!raiz && nom) {
    raiz = normalizarSlug(nom, Math.min(10, maxLen));
  }

  if (!raiz) return '';

  // Si la raíz no existe, es la opción ideal y más limpia
  if (!codigosExistentes.has(raiz)) {
    return raiz;
  }

  // Intento de desambiguación semántica por contexto de magnitud padre
  if (codigoMagnitudPadre) {
    const magParts = codigoMagnitudPadre.split('_').filter(Boolean);
    const ultimaParte = magParts[magParts.length - 1] || '';
    const sufijoContexto = (ultimaParte.length > 4 ? ultimaParte.slice(0, 3) : ultimaParte).toUpperCase();

    if (sufijoContexto) {
      const candidatoContextual = `${raiz.slice(0, maxLen - sufijoContexto.length - 1)}_${sufijoContexto}`;
      if (!codigosExistentes.has(candidatoContextual)) {
        return candidatoContextual;
      }
    }
  }

  // Bucle determinista incremental anti-colisión garantizado
  let contador = 2;
  while (contador < 1000) {
    const sufijo = `_${contador}`;
    const raizRecortada = raiz.slice(0, Math.max(2, maxLen - sufijo.length));
    const candidato = `${raizRecortada}${sufijo}`;
    if (!codigosExistentes.has(candidato)) {
      return candidato;
    }
    contador++;
  }

  return `${raiz.slice(0, maxLen - 5)}_${Date.now().toString().slice(-4)}`;
}

// Fallbacks de compatibilidad
function generarSlugCodigo(nombre: string, maxLen = 20): string {
  return normalizarSlug(nombre, maxLen);
}

function generarCodigoDesdeSimbolo(simbolo: string, nombre: string): string {
  return generarCodigoUnidadInteligente(simbolo, nombre, new Set(), undefined, 10);
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

  // Banco Universal ISO 80000 Explorer Modal
  const [showBancoModal, setShowBancoModal] = useState(false);
  const [bancoSearch, setBancoSearch] = useState('');
  const [bancoCat, setBancoCat] = useState<CategoriaMagnitud | 'TODAS'>('TODAS');
  const [filtroDisciplina, setFiltroDisciplina] = useState<CategoriaMagnitud | 'TODAS'>('TODAS');
  const [pestanaBanco, setPestanaBanco] = useState<'CATALOGO' | 'OCULTAS'>('CATALOGO');
  const [activandoPreset, setActivandoPreset] = useState<string | null>(null);
  const [bancoFeedback, setBancoFeedback] = useState<{ tipo: 'success' | 'error'; msg: string } | null>(null);
  const activarBancoMut = useActivarMagnitudBancoEam();
  const setActivoMut = useSetActivoMagnitudEam();
  const reactivarTodasMut = useReactivarTodasMagnitudesEam();
  const setActivoDisciplinaMut = useSetActivoDisciplinaEam();
  const { toast } = useToast();

  // Modales CRUD Magnitud y Unidad
  const [showMagModal, setShowMagModal] = useState(false);
  const [editingMag, setEditingMag] = useState<MagnitudFisica | null>(null);
  const [customSlugMag, setCustomSlugMag] = useState(false);
  const [filtroSelectorUnidad, setFiltroSelectorUnidad] = useState('');
  const [magForm, setMagForm] = useState({
    codigo_magnitud: '',
    nombre_magnitud: '',
    descripcion: '',
    unidad_base_codigo: '',
    // Modo de selección de unidad base en creación: 'SELECTOR' o 'CREAR'
    modoUnidadBase: 'SELECTOR' as 'SELECTOR' | 'CREAR',
    base_nombre: '',
    base_simbolo: '',
    base_codigo: '',
    customSlugBaseUnit: false,
    activo: true,
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

  const MAGNITUD_CATEGORIA_MAP = useMemo(() => {
    const map = new Map<string, CategoriaMagnitud>();
    for (const preset of BANCO_UNIVERSAL_QUDT) {
      map.set(preset.codigo_magnitud, preset.categoria);
    }
    return map;
  }, []);

  const numOcultas = useMemo(() => {
    return BANCO_UNIVERSAL_QUDT.filter(
      (p) => !magnitudes.some((m) => m.codigo_magnitud === p.codigo_magnitud),
    ).length;
  }, [magnitudes]);

  const magnitudesFiltradas = useMemo(() => {
    let list = magnitudes;
    if (filtroDisciplina !== 'TODAS') {
      list = list.filter((m) => {
        const cat = MAGNITUD_CATEGORIA_MAP.get(m.codigo_magnitud);
        return cat === filtroDisciplina;
      });
    }
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter((m) => {
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
  }, [magnitudes, searchQuery, filtroDisciplina, MAGNITUD_CATEGORIA_MAP]);

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

  // Filtrado reactivo de presets del Banco Universal
  const presetsFiltrados = useMemo(() => {
    let list = BANCO_UNIVERSAL_QUDT;
    if (pestanaBanco === 'OCULTAS') {
      list = list.filter((p) => !magnitudes.some((m) => m.codigo_magnitud === p.codigo_magnitud));
    } else {
      if (bancoCat !== 'TODAS') {
        list = list.filter((p) => p.categoria === bancoCat);
      }
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
  }, [bancoCat, bancoSearch, pestanaBanco, magnitudes]);

  const handleReactivarTodas = async () => {
    setBancoFeedback(null);
    try {
      await reactivarTodasMut.mutateAsync();
      setBancoFeedback({
        tipo: 'success',
        msg: '¡Todas las magnitudes del catálogo han sido reactivadas exitosamente!',
      });
      setTimeout(() => setBancoFeedback(null), 4500);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Error al reactivar magnitudes';
      setBancoFeedback({ tipo: 'error', msg });
    }
  };

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

  // Catálogo unificado de todas las unidades existentes en la base de datos + banco de magnitudes
  const todasLasUnidadesDisponibles = useMemo(() => {
    const map = new Map<
      string,
      {
        codigo: string;
        nombre: string;
        simbolo: string;
        categoria?: string;
        origen: 'EXISTENTE' | 'QUDT';
      }
    >();

    // 1. Unidades existentes actualmente en la base de datos
    for (const m of magnitudes) {
      for (const u of m.unidades_medida || []) {
        map.set(u.codigo.toUpperCase(), {
          codigo: u.codigo.toUpperCase(),
          nombre: u.nombre,
          simbolo: u.simbolo,
          categoria: m.nombre_magnitud,
          origen: 'EXISTENTE',
        });
      }
    }

    // 2. Unidades canónicas del Banco Universal QUDT
    for (const preset of BANCO_UNIVERSAL_QUDT) {
      for (const u of preset.unidades) {
        const cod = u.codigo.toUpperCase();
        if (!map.has(cod)) {
          map.set(cod, {
            codigo: cod,
            nombre: u.nombre,
            simbolo: u.simbolo,
            categoria: preset.nombre_magnitud,
            origen: 'QUDT',
          });
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [magnitudes]);

  const unidadesFiltradasSelector = useMemo(() => {
    const q = filtroSelectorUnidad.trim().toLowerCase();
    if (!q) return todasLasUnidadesDisponibles;
    return todasLasUnidadesDisponibles.filter(
      (u) =>
        u.nombre.toLowerCase().includes(q) ||
        u.simbolo.toLowerCase().includes(q) ||
        u.codigo.toLowerCase().includes(q) ||
        (u.categoria && u.categoria.toLowerCase().includes(q)),
    );
  }, [todasLasUnidadesDisponibles, filtroSelectorUnidad]);

  // Códigos existentes en el sistema para garantía de unicidad estricta
  const codigosMagnitudesExistentes = useMemo(() => {
    return new Set(magnitudes.map((m) => m.codigo_magnitud.toUpperCase()));
  }, [magnitudes]);

  const codigosUnidadesExistentes = useMemo(() => {
    return new Set(todasLasUnidadesDisponibles.map((u) => u.codigo.toUpperCase()));
  }, [todasLasUnidadesDisponibles]);

  // Validaciones en tiempo real de colisión / duplicidad
  const isCodigoMagDuplicado = useMemo(() => {
    if (editingMag) return false;
    const cod = (magForm.codigo_magnitud || '').trim().toUpperCase();
    if (!cod) return false;
    return codigosMagnitudesExistentes.has(cod);
  }, [magForm.codigo_magnitud, codigosMagnitudesExistentes, editingMag]);

  const isCodigoUnitDuplicado = useMemo(() => {
    const cod = (unitForm.codigo || '').trim().toUpperCase();
    if (!cod) return false;
    if (editingUnit && editingUnit.codigo.toUpperCase() === cod) return false;
    return codigosUnidadesExistentes.has(cod);
  }, [unitForm.codigo, codigosUnidadesExistentes, editingUnit]);

  const isCodigoBaseUnitDuplicado = useMemo(() => {
    if (magForm.modoUnidadBase !== 'CREAR') return false;
    const cod = (magForm.base_codigo || '').trim().toUpperCase();
    if (!cod) return false;
    return codigosUnidadesExistentes.has(cod);
  }, [magForm.base_codigo, magForm.modoUnidadBase, codigosUnidadesExistentes]);

  const openNewMagnitud = () => {
    setEditingMag(null);
    setCustomSlugMag(false);
    setFiltroSelectorUnidad('');
    setMagForm({
      codigo_magnitud: '',
      nombre_magnitud: '',
      descripcion: '',
      unidad_base_codigo: '',
      modoUnidadBase: 'SELECTOR',
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
    setFiltroSelectorUnidad('');
    setMagForm({
      codigo_magnitud: mag.codigo_magnitud,
      nombre_magnitud: mag.nombre_magnitud,
      descripcion: mag.descripcion || '',
      unidad_base_codigo: mag.unidad_base_codigo || '',
      modoUnidadBase: 'SELECTOR',
      base_nombre: '',
      base_simbolo: '',
      base_codigo: '',
      customSlugBaseUnit: false,
      activo: (mag as any).activo !== false,
    });
    setShowMagModal(true);
  };

  const handleNombreMagChange = (nombre: string) => {
    setMagForm((prev) => {
      const nuevoCodigo = customSlugMag
        ? prev.codigo_magnitud
        : generarCodigoMagnitudInteligente(nombre, codigosMagnitudesExistentes, 30);
      return {
        ...prev,
        nombre_magnitud: nombre,
        codigo_magnitud: nuevoCodigo,
      };
    });
  };

  const handleNombreUnidadBaseChange = (nombre: string) => {
    setMagForm((prev) => {
      const nuevoCod = prev.customSlugBaseUnit
        ? prev.base_codigo
        : generarCodigoUnidadInteligente(
            prev.base_simbolo,
            nombre,
            codigosUnidadesExistentes,
            prev.codigo_magnitud,
          );
      return {
        ...prev,
        base_nombre: nombre,
        base_codigo: nuevoCod,
        unidad_base_codigo: nuevoCod,
      };
    });
  };

  const handleSimboloUnidadBaseChange = (simbolo: string) => {
    setMagForm((prev) => {
      const nuevoCod = prev.customSlugBaseUnit
        ? prev.base_codigo
        : generarCodigoUnidadInteligente(
            simbolo,
            prev.base_nombre,
            codigosUnidadesExistentes,
            prev.codigo_magnitud,
          );
      return {
        ...prev,
        base_simbolo: simbolo,
        base_codigo: nuevoCod,
        unidad_base_codigo: nuevoCod,
      };
    });
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

      if (!magForm.base_codigo && !magForm.base_nombre) {
        alert('Por favor selecciona o define la unidad principal de referencia para la magnitud.');
        return;
      }

      if (magForm.base_nombre && magForm.base_simbolo) {
        const uCod = (
          magForm.base_codigo ||
          generarCodigoUnidadInteligente(
            magForm.base_simbolo,
            magForm.base_nombre,
            codigosUnidadesExistentes,
            payload.codigo_magnitud,
          )
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
        : generarCodigoUnidadInteligente(
            prev.simbolo,
            nombre,
            codigosUnidadesExistentes,
            selectedMagnitud?.codigo_magnitud,
          );
      return { ...prev, nombre, codigo: cod };
    });
  };

  const handleSimboloUnitChange = (simbolo: string) => {
    setUnitForm((prev) => {
      const cod = customSlugUnit
        ? prev.codigo
        : generarCodigoUnidadInteligente(
            simbolo,
            prev.nombre,
            codigosUnidadesExistentes,
            selectedMagnitud?.codigo_magnitud,
          );
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
                title="Explorar e incorporar magnitudes estándar del banco universal"
              >
                <Package className="h-3.5 w-3.5 text-indigo-600" />
                <span>Banco de Magnitudes</span>
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

            {/* Píldoras compactas por disciplina para filtrado inmediato */}
            <div className="flex flex-wrap items-center gap-1 pt-1.5 border-t border-slate-200/60">
              {DISCIPLINAS_COLUMNA.map((p) => {
                const isSelected = filtroDisciplina === p.id;
                const count =
                  p.id === 'TODAS'
                    ? magnitudes.length
                    : magnitudes.filter(
                        (m) => MAGNITUD_CATEGORIA_MAP.get(m.codigo_magnitud) === p.id,
                      ).length;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setFiltroDisciplina(p.id)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    {p.label} ({count})
                  </button>
                );
              })}
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
                        disabled={setActivoMut.isPending}
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await setActivoMut.mutateAsync({
                              codigo: mag.codigo_magnitud,
                              activo: false,
                            });
                            toast({
                              title: 'Magnitud Ocultada',
                              description: `"${mag.nombre_magnitud}" se ha archivado. Puedes reactivarla desde el Banco de Magnitudes.`,
                            });
                          } catch (err: any) {
                            toast({
                              title: 'Error al ocultar',
                              description: err?.message || 'No se pudo ocultar la magnitud',
                              variant: 'destructive',
                            });
                          }
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                        title="Ocultar magnitud"
                      >
                        <EyeOff className="h-4 w-4" />
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

      {/* MODAL EXPLORADOR DEL BANCO UNIVERSAL CANÓNICO (ISO 80000) */}
      {showBancoModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Cabecera Principal */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-white flex items-center gap-2">
                    <span>Banco Universal de Magnitudes</span>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-500/30 border border-indigo-400/40 text-[10px] font-bold text-indigo-200 uppercase tracking-wider">
                      ISO 80000
                    </span>
                  </h4>
                  <p className="text-xs text-indigo-200/70">
                    Estándares ontológicos internacionales (NASA / W3C / ISO 80000). Activa y gestiona magnitudes completas en 1 clic.
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

            {/* Selector de Pestañas del Banco */}
            <div className="px-6 pt-3 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPestanaBanco('CATALOGO')}
                  className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
                    pestanaBanco === 'CATALOGO'
                      ? 'border-indigo-600 text-indigo-800 bg-white rounded-t-xl shadow-2xs'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Package className="h-4 w-4" />
                  <span>Catálogo Maestro por Disciplina</span>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-black border border-indigo-200">
                    {BANCO_UNIVERSAL_QUDT.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPestanaBanco('OCULTAS')}
                  className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
                    pestanaBanco === 'OCULTAS'
                      ? 'border-indigo-600 text-indigo-800 bg-white rounded-t-xl shadow-2xs'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <EyeOff className="h-4 w-4" />
                  <span>Magnitudes Ocultas</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    numOcultas > 0
                      ? 'bg-amber-500 text-white animate-pulse'
                      : 'bg-slate-200 text-slate-600'
                  }`}>
                    {numOcultas}
                  </span>
                </button>
              </div>

              {pestanaBanco === 'OCULTAS' && numOcultas > 0 && (
                <button
                  type="button"
                  onClick={handleReactivarTodas}
                  disabled={reactivarTodasMut.isPending}
                  className="mb-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
                >
                  {reactivarTodasMut.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  <span>Reactivar Todas ({numOcultas})</span>
                </button>
              )}
            </div>

            {/* Barra de Filtros y Búsqueda */}
            <div className="p-4 bg-slate-50 border-b border-slate-100 space-y-2.5">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar magnitud, unidad o símbolo (ej: masa, kg, velocidad, viscosidad, btu, kw)..."
                  value={bancoSearch}
                  onChange={(e) => setBancoSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs font-medium"
                />
              </div>

              {/* Botones de Disciplina (flex-wrap sin scrollbar) */}
              {pestanaBanco === 'CATALOGO' && (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {CATEGORIAS_QUDT.map((cat) => {
                      const count = cat.id === 'TODAS'
                        ? BANCO_UNIVERSAL_QUDT.length
                        : BANCO_UNIVERSAL_QUDT.filter((p) => p.categoria === cat.id).length;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setBancoCat(cat.id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                            bancoCat === cat.id
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {cat.label} ({count})
                        </button>
                      );
                    })}
                  </div>

                  {/* Acción Rápida: Activar / Ocultar toda la disciplina */}
                  {bancoCat !== 'TODAS' && (
                    <div className="flex items-center justify-between pt-1.5 px-1 border-t border-slate-200/70 text-xs">
                      <span className="text-slate-600 font-medium">
                        Disciplina: <strong className="text-slate-900">{CATEGORIAS_QUDT.find((c) => c.id === bancoCat)?.label}</strong> (
                        {BANCO_UNIVERSAL_QUDT.filter((p) => p.categoria === bancoCat).length} magnitudes)
                      </span>
                      {(() => {
                        const magsCat = BANCO_UNIVERSAL_QUDT.filter((p) => p.categoria === bancoCat);
                        const todasActivas = magsCat.every((p) =>
                          magnitudes.some((m) => m.codigo_magnitud === p.codigo_magnitud),
                        );
                        return (
                          <button
                            type="button"
                            disabled={setActivoDisciplinaMut.isPending}
                            onClick={async () => {
                              const nuevoEstado = !todasActivas;
                              setBancoFeedback(null);
                              try {
                                await setActivoDisciplinaMut.mutateAsync({
                                  categoria: bancoCat,
                                  activo: nuevoEstado,
                                });
                                setBancoFeedback({
                                  tipo: 'success',
                                  msg: `Disciplina ${CATEGORIAS_QUDT.find((c) => c.id === bancoCat)?.label} ${
                                    nuevoEstado ? 'activada' : 'ocultada'
                                  } completamente (${magsCat.length} magnitudes).`,
                                });
                                setTimeout(() => setBancoFeedback(null), 4000);
                              } catch (err: any) {
                                setBancoFeedback({
                                  tipo: 'error',
                                  msg: err?.response?.data?.message || err?.message || 'Error al actualizar disciplina',
                                });
                              }
                            }}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs ${
                              todasActivas
                                ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300'
                            }`}
                          >
                            {todasActivas ? <EyeOff className="h-3.5 w-3.5 text-amber-600" /> : <Eye className="h-3.5 w-3.5 text-emerald-600" />}
                            <span>
                              {todasActivas
                                ? `Ocultar toda esta disciplina (${magsCat.length})`
                                : `Activar toda esta disciplina (${magsCat.length})`}
                            </span>
                          </button>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}

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

            {/* Listado de Tarjetas */}
            <div className="p-6 overflow-y-auto flex-1 space-y-3 bg-slate-50/50">
              {presetsFiltrados.length === 0 ? (
                pestanaBanco === 'OCULTAS' ? (
                  <div className="p-12 text-center space-y-3 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-900">
                      ✓ Las {BANCO_UNIVERSAL_QUDT.length} magnitudes del banco mundial están activas
                    </p>
                    <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                      Si ocultas alguna magnitud de tu lista principal, aparecerá aquí para cuando quieras reactivarla.
                    </p>
                  </div>
                ) : (
                  <div className="p-12 text-center text-slate-400 text-xs bg-white rounded-2xl border border-slate-200">
                    No se encontraron magnitudes estándar para la búsqueda &ldquo;{bancoSearch}&rdquo;.
                  </div>
                )
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
                            : 'border-amber-200 bg-amber-50/20 hover:border-amber-300'
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
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 text-[11px] font-bold border border-amber-300 shrink-0">
                                <EyeOff className="h-3.5 w-3.5 text-amber-600" />
                                <span>Oculta</span>
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-500 leading-relaxed">
                            {preset.descripcion}
                          </p>

                          {/* Unidades incluidas */}
                          <div className="pt-2 border-t border-slate-100 space-y-1.5">
                            <div className="text-[11px] font-bold text-slate-600 flex items-center justify-between">
                              <span>
                                Unidad Base: <strong className="font-mono text-indigo-700">{preset.unidad_base_codigo}</strong>
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {preset.unidades.length} unidades canónicas
                              </span>
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

                        {/* Botón de Acción Explícito */}
                        <div className="pt-2">
                          {yaActivada ? (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedMagCode(preset.codigo_magnitud);
                                  setShowBancoModal(false);
                                }}
                                className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                              >
                                <span>Ver en Catálogo</span>
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  setActivoMut.mutate(
                                    { codigo: preset.codigo_magnitud, activo: false },
                                    {
                                      onSuccess: () => {
                                        setBancoFeedback({
                                          tipo: 'success',
                                          msg: `Magnitud "${preset.nombre_magnitud}" ocultada. Puedes reactivarla en cualquier momento desde la pestaña "Magnitudes Ocultas".`,
                                        });
                                        setTimeout(() => setBancoFeedback(null), 4000);
                                      },
                                    }
                                  );
                                }}
                                className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                                title="Ocultar esta magnitud del catálogo diario"
                              >
                                <EyeOff className="h-3.5 w-3.5" />
                                <span>Ocultar</span>
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={activarBancoMut.isPending}
                              onClick={() => handleActivarPreset(preset)}
                              className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                            >
                              {isProcessing ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Plus className="h-4 w-4" />
                              )}
                              <span>Reactivar en 1 Clic ({preset.unidades.length} UoM)</span>
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
                  className={`w-full px-3.5 py-2 rounded-xl border font-mono text-sm transition-colors disabled:bg-slate-100 disabled:text-slate-600 ${
                    isCodigoMagDuplicado
                      ? 'border-rose-400 bg-rose-50/30 text-rose-900 focus:ring-rose-500'
                      : 'border-slate-300 focus:ring-blue-500'
                  }`}
                />
                {isCodigoMagDuplicado ? (
                  <p className="text-[11px] text-rose-600 font-bold mt-1.5 flex items-center gap-1.5 animate-in fade-in">
                    ✕ El código "{magForm.codigo_magnitud.toUpperCase()}" ya existe en el catálogo. Modifícalo para que sea único.
                  </p>
                ) : magForm.codigo_magnitud && !editingMag ? (
                  <p className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1 animate-in fade-in">
                    ✓ Código único garantizado disponible
                  </p>
                ) : !customSlugMag && !editingMag ? (
                  <p className="text-[11px] text-slate-400 mt-1">
                    Generado inteligentemente a partir del nombre con garantía de unicidad.
                  </p>
                ) : null}
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

              {/* 4° UNIDAD PRINCIPAL DE REFERENCIA (COMBOBOX UNIFICADO PRÉMIUM SIN SELECT NATIVO) */}
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
                    Toda magnitud física requiere una unidad canónica inicial contra la cual se calculan los factores de conversión de las demás unidades.
                  </p>

                  {magForm.modoUnidadBase === 'SELECTOR' ? (
                    <div className="space-y-2.5 pt-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-slate-700">
                          Seleccionar Unidad del Banco ({todasLasUnidadesDisponibles.length} estándar) *
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            setMagForm((prev) => ({
                              ...prev,
                              modoUnidadBase: 'CREAR',
                              base_codigo: '',
                              base_nombre: '',
                              base_simbolo: '',
                            }))
                          }
                          className="text-[11px] text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                          <span>Crear unidad personalizada</span>
                        </button>
                      </div>

                      {/* Tarjeta de Selección Confirmada vs Buscador Integrado */}
                      {magForm.base_codigo ? (
                        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 flex items-center justify-between text-xs text-emerald-950 animate-in fade-in duration-150">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                            <span className="font-bold text-emerald-900 shrink-0">✓ Unidad Base Seleccionada:</span>
                            <span className="font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 text-[11px] border border-emerald-300 shrink-0">
                              [{magForm.base_simbolo || magForm.base_codigo}]
                            </span>
                            <span className="font-semibold truncate">{magForm.base_nombre}</span>
                            <span className="text-[10px] text-emerald-700/80 font-mono shrink-0">
                              ({magForm.base_codigo} • Factor: 1.0)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setMagForm((prev) => ({
                                ...prev,
                                base_codigo: '',
                                base_nombre: '',
                                base_simbolo: '',
                                unidad_base_codigo: '',
                              }));
                            }}
                            className="ml-2 px-2.5 py-1 rounded-lg bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 text-[11px] font-bold transition-colors shrink-0 shadow-2xs"
                          >
                            Cambiar
                          </button>
                        </div>
                      ) : (
                        /* Buscador Conectado con Lista Estilizada */
                        <div className="rounded-xl border border-slate-300 overflow-hidden bg-white shadow-2xs">
                          <div className="relative border-b border-slate-200">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                            <input
                              type="text"
                              autoFocus
                              placeholder="Buscar unidad por nombre, código o símbolo (ej: kg, bar, psi, rpm, voltios)..."
                              value={filtroSelectorUnidad}
                              onChange={(e) => setFiltroSelectorUnidad(e.target.value)}
                              className="w-full pl-8 pr-3 py-2 bg-white text-xs font-medium placeholder-slate-400 focus:outline-none"
                            />
                          </div>

                          <div className="max-h-44 overflow-y-auto divide-y divide-slate-100 bg-white">
                            {unidadesFiltradasSelector.length === 0 ? (
                              <div className="p-4 text-center text-xs text-slate-400">
                                No se encontraron unidades para &ldquo;{filtroSelectorUnidad}&rdquo;
                              </div>
                            ) : (
                              unidadesFiltradasSelector.map((u) => (
                                <button
                                  key={u.codigo}
                                  type="button"
                                  onClick={() => {
                                    setMagForm((prev) => ({
                                      ...prev,
                                      base_codigo: u.codigo,
                                      base_nombre: u.nombre,
                                      base_simbolo: u.simbolo,
                                      unidad_base_codigo: u.codigo,
                                    }));
                                  }}
                                  className="w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-blue-50/70 transition-colors group"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 text-[11px] group-hover:bg-blue-100 group-hover:text-blue-900 shrink-0">
                                      {u.simbolo}
                                    </span>
                                    <span className="font-medium text-slate-800 truncate">{u.nombre}</span>
                                    <span className="text-[10px] text-slate-400 font-mono shrink-0">({u.codigo})</span>
                                  </div>
                                  <span className="text-[10px] font-semibold text-slate-400 group-hover:text-blue-600 shrink-0 ml-2">
                                    {u.categoria || 'Canónica'}
                                  </span>
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* MODO CREACIÓN MANUAL PERSONALIZADA */
                    <div className="space-y-3 pt-1 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-800">
                          Creación de Unidad Personalizada
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setMagForm((prev) => ({
                              ...prev,
                              modoUnidadBase: 'SELECTOR',
                              base_codigo: '',
                              base_nombre: '',
                              base_simbolo: '',
                            }))
                          }
                          className="text-[11px] text-blue-600 hover:text-blue-700 font-bold"
                        >
                          ← Volver al catálogo de unidades
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Nombre de la Unidad *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Ej: Toneladas Métricas"
                            value={magForm.base_nombre}
                            onChange={(e) => handleNombreUnidadBaseChange(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Símbolo Visual *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Ej: t, kg, PSI, °C"
                            value={magForm.base_simbolo}
                            onChange={(e) => handleSimboloUnidadBaseChange(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono text-xs font-bold"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-bold text-slate-700">
                            Código Identificador Único *
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
                            {magForm.customSlugBaseUnit ? 'Auto-generar' : 'Personalizar'}
                          </button>
                        </div>
                        <input
                          type="text"
                          required
                          disabled={!magForm.customSlugBaseUnit}
                          placeholder="Ej: TON_MET"
                          value={magForm.base_codigo}
                          onChange={(e) =>
                            setMagForm({
                              ...magForm,
                              base_codigo: e.target.value.toUpperCase(),
                              unidad_base_codigo: e.target.value.toUpperCase(),
                            })
                          }
                          className={`w-full px-3 py-1.5 rounded-lg border font-mono text-xs disabled:bg-slate-100 disabled:text-slate-500 ${
                            isCodigoBaseUnitDuplicado
                              ? 'border-rose-400 bg-rose-50 text-rose-900'
                              : 'border-slate-300'
                          }`}
                        />
                        {isCodigoBaseUnitDuplicado && (
                          <p className="text-[10px] text-rose-600 font-bold mt-1">
                            ✕ Este código de unidad ya existe en el sistema.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Modo edición: Selector limpio de la unidad principal y Switch de Activación */
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Unidad Principal de Referencia
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1.5 border border-slate-200 rounded-xl bg-slate-50/50">
                      {(editingMag.unidades_medida || []).map((u) => {
                        const isSel = magForm.unidad_base_codigo === u.codigo;
                        return (
                          <button
                            key={u.codigo}
                            type="button"
                            onClick={() => setMagForm({ ...magForm, unidad_base_codigo: u.codigo })}
                            className={`p-2.5 rounded-lg border text-left text-xs transition-all flex items-center justify-between ${
                              isSel
                                ? 'bg-blue-50 border-blue-500 text-blue-900 font-bold shadow-2xs ring-1 ring-blue-500'
                                : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 text-[11px] shrink-0">
                                {u.simbolo}
                              </span>
                              <span className="truncate">{u.nombre}</span>
                            </div>
                            {isSel && <Check className="h-4 w-4 text-blue-600 shrink-0 ml-1" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* TARJETA DE ESTADO: ACTIVAR / OCULTAR MAGNITUD */}
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800">
                          Estado: Magnitud Activa en Formularios y Catálogos
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            magForm.activo !== false
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {magForm.activo !== false ? '✓ Activa' : 'Oculta'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Si desactivas esta magnitud, se ocultará de los selectores diarios y quedará archivada en el Banco de Magnitudes para cuando decidas reactivarla.
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={magForm.activo !== false}
                      onClick={() =>
                        setMagForm((prev: any) => ({
                          ...prev,
                          activo: prev.activo === false ? true : false,
                        }))
                      }
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        magForm.activo !== false ? 'bg-emerald-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          magForm.activo !== false ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
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
                  disabled={
                    createMagMut.isPending ||
                    updateMagMut.isPending ||
                    isCodigoMagDuplicado ||
                    isCodigoBaseUnitDuplicado ||
                    !magForm.nombre_magnitud.trim() ||
                    !magForm.codigo_magnitud.trim()
                  }
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
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
                    className={`w-full px-3 py-2 rounded-xl border font-mono text-sm transition-colors disabled:bg-slate-100 disabled:text-slate-600 ${
                      isCodigoUnitDuplicado
                        ? 'border-rose-400 bg-rose-50/30 text-rose-900 focus:ring-rose-500'
                        : 'border-slate-300 focus:ring-indigo-500'
                    }`}
                  />
                  {isCodigoUnitDuplicado ? (
                    <p className="text-[11px] text-rose-600 font-bold mt-1.5 flex items-center gap-1.5 animate-in fade-in">
                      ✕ El código "{unitForm.codigo.toUpperCase()}" ya está en uso. Las unidades tienen clave primaria global.
                    </p>
                  ) : unitForm.codigo && !editingUnit ? (
                    <p className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1 animate-in fade-in">
                      ✓ Código de unidad único disponible
                    </p>
                  ) : null}
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
                  disabled={
                    createUnitMut.isPending ||
                    updateUnitMut.isPending ||
                    isCodigoUnitDuplicado ||
                    !unitForm.nombre.trim() ||
                    !unitForm.simbolo.trim() ||
                    !unitForm.codigo.trim()
                  }
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
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
