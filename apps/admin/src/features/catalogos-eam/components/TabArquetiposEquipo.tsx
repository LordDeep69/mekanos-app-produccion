'use client';

import {
  AlertTriangle,
  ArrowUpDown,
  Boxes,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Cpu,
  Droplets,
  Edit3,
  Eye,
  Factory,
  Gauge,
  Info,
  Layers,
  Loader2,
  Lock,
  Plus,
  RotateCw,
  Search,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
  Truck,
  Unlock,
  Wind,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import {
  generarCodigoTipoEquipo,
  generarCodigoCampoTecnico,
  generarCodigoTipoServicio,
  verificarCodigoDuplicado,
} from '../utils/eam-code-generator';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArquetipoEquipo,
  DynamicEquipmentFormPreview,
  EamSelect,
  TIPOS_CONTROL_HUMANOS,
  TipoServicioEam,
  getCriterioIntervaloHumano,
  getModuloBadgeInfo,
  useArquetipoEsquemaEam,
  useArquetiposEam,
  useAtributosEam,
  useAsignarAtributoModuloEam,
  useCreateArquetipoEam,
  useCreateAtributoEam,
  useCreatePlanArquetipoEam,
  useCreateTipoServicioEam,
  useDeleteArquetipoEam,
  useDeletePlanArquetipoEam,
  useDesvincularModuloArquetipoEam,
  useMagnitudesEam,
  useModelosOemEam,
  useModulosEam,
  useResumenEjecutivoEam,
  useTiposServicioEam,
  useUpdateArquetipoEam,
  useVincularModuloArquetipoEam,
} from '../index';

export const MACRO_CATEGORIAS_INDUSTRIALES = [
  'Generación de Energía y Respaldo Eléctrico',
  'Bombeo, Redes Hidráulicas y Presión',
  'Aire Comprimido y Sistemas Neumáticos',
  'Climatización, Refrigeración y HVAC',
  'Transporte Vertical, Elevación y Carga',
  'Transformación Eléctrica y Subestaciones',
  'Mecánica Pesada y Flotas Móviles',
  'Líneas de Producción, Envasado y Manufactura',
  'Otra Maquinaria Industrial',
] as const;

export const PRESETS_MEDIDOR_USO = [
  {
    id: 'HORAS',
    label: 'Horómetro (Horas de Operación)',
    titulo: 'Horómetro de Operación',
    subtitulo: 'Horas acumuladas de marcha (generadores, bombas, compresores, motores)',
    unidad: 'HORAS',
    etiqueta: 'Horómetro',
    requiere_horometro: true,
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: Clock,
    color: 'text-amber-600 bg-amber-50 border-amber-200',
  },
  {
    id: 'CICLOS',
    label: 'Ciclos / Maniobras / Viajes',
    titulo: 'Ciclos y Maniobras',
    subtitulo: 'Viajes, arranques y aperturas (ascensores, grúas, válvulas, prensas)',
    unidad: 'CICLOS',
    etiqueta: 'Ciclos de Viaje',
    requiere_horometro: true,
    badgeClass: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    icon: RotateCw,
    color: 'text-cyan-600 bg-cyan-50 border-cyan-200',
  },
  {
    id: 'KM_ODO',
    label: 'Odómetro (Kilómetros de Recorrido)',
    titulo: 'Odómetro de Distancia',
    subtitulo: 'Kilómetros recorridos (flotas vehiculares, montacargas, camiones)',
    unidad: 'KM_ODO',
    etiqueta: 'Odómetro',
    requiere_horometro: true,
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: Gauge,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  },
  {
    id: 'UPM',
    label: 'Producción (Unidades / Envases)',
    titulo: 'Unidades de Producción',
    subtitulo: 'Piezas, envases o bultos procesados (líneas industriales y envasado)',
    unidad: 'UPM',
    etiqueta: 'Contador de Producción',
    requiere_horometro: true,
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: Boxes,
    color: 'text-purple-600 bg-purple-50 border-purple-200',
  },
  {
    id: 'NA',
    label: 'Sin Contador / No Aplica',
    titulo: 'Sin Contador Físico',
    subtitulo: 'Mantenimiento preventivo por calendario (días, semanas o meses)',
    unidad: 'UND',
    etiqueta: 'N/A',
    requiere_horometro: false,
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
    icon: CalendarClock,
    color: 'text-slate-600 bg-slate-50 border-slate-200',
  },
  {
    id: 'CUSTOM',
    label: 'Personalizado...',
    titulo: 'Métrica Personalizada',
    subtitulo: 'Define tu propia métrica industrial (golpes, disparos, m³, etc.)',
    unidad: '',
    etiqueta: '',
    requiere_horometro: true,
    badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    icon: Sparkles,
    color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
  },
];

export function getCategoryBadgeInfo(categoryName?: string) {
  const norm = categoryName?.toLowerCase() || '';
  if (norm.includes('vertical') || norm.includes('ascensor') || norm.includes('elevaci') || norm.includes('carga')) {
    return { icon: ArrowUpDown, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200', tag: 'Elevación' };
  }
  if (norm.includes('energ') || norm.includes('eléctric') || norm.includes('generaci')) {
    return { icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', tag: 'Energía' };
  }
  if (norm.includes('hidrául') || norm.includes('bombeo') || norm.includes('presión')) {
    return { icon: Droplets, color: 'text-cyan-600', bg: 'bg-cyan-50 border-cyan-200', tag: 'Hidráulica' };
  }
  if (norm.includes('comprimido') || norm.includes('neumátic') || norm.includes('aire')) {
    return { icon: Wind, color: 'text-sky-600', bg: 'bg-sky-50 border-sky-200', tag: 'Neumática' };
  }
  if (norm.includes('clima') || norm.includes('refrig') || norm.includes('hvac') || norm.includes('chiller')) {
    return { icon: Cpu, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', tag: 'HVAC' };
  }
  if (norm.includes('transfor') || norm.includes('subestaci')) {
    return { icon: Zap, color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200', tag: 'Subestación' };
  }
  if (norm.includes('pesada') || norm.includes('flota') || norm.includes('móvil') || norm.includes('vehicul')) {
    return { icon: Truck, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', tag: 'Móvil' };
  }
  if (norm.includes('producc') || norm.includes('envas') || norm.includes('manuf') || norm.includes('línea')) {
    return { icon: Factory, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200', tag: 'Planta' };
  }
  return { icon: Boxes, color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200', tag: 'General' };
}

/** Componente Premium para Selección de Macro-Categoría Industrial */
function MacroCategoriaSelector({
  value,
  isCustom,
  customValue,
  availableCategories,
  onChange,
  onCustomChange,
}: {
  value: string;
  isCustom: boolean;
  customValue: string;
  availableCategories: string[];
  onChange: (category: string, isCustom: boolean) => void;
  onCustomChange: (customCategory: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [filterText, setFilterText] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const activeCategoryName = isCustom ? (customValue || 'Categoría Personalizada') : value;
  const currentBadge = getCategoryBadgeInfo(activeCategoryName);
  const CurrentIcon = currentBadge.icon;

  const filteredCategories = useMemo(() => {
    if (!filterText.trim()) return availableCategories;
    const q = filterText.toLowerCase();
    return availableCategories.filter((c) => c.toLowerCase().includes(q));
  }, [availableCategories, filterText]);

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-xs font-bold text-slate-700 mb-1">
        Macro-Categoría Industrial *
      </label>

      {/* Botón Trigger de Estilo SaaS Premium */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white hover:border-blue-400 hover:bg-slate-50/50 transition-all text-left shadow-2xs group cursor-pointer"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${currentBadge.bg}`}>
            <CurrentIcon className={`h-4 w-4 ${currentBadge.color}`} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-slate-800 truncate">
              {isCustom ? (customValue.trim() ? customValue : 'Escribe tu categoría personalizada...') : value}
            </div>
            <div className="text-[10px] text-slate-400 font-medium">
              {isCustom ? 'Categoría definida por el usuario' : 'Macro-categoría universal del EAM'}
            </div>
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 shrink-0 ml-2 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Popover Flotante Frosted */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 z-50 space-y-1.5 animate-in fade-in zoom-in-95 duration-150">
          {availableCategories.length > 5 && (
            <div className="relative px-1 pt-1 pb-1">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Buscar macro-categoría..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
            </div>
          )}

          <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
            {filteredCategories.map((cat) => {
              const badge = getCategoryBadgeInfo(cat);
              const Icon = badge.icon;
              const isSelected = !isCustom && value === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    onChange(cat, false);
                    setIsOpen(false);
                    setFilterText('');
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50 text-blue-900 font-bold border border-blue-200'
                      : 'hover:bg-slate-100/80 text-slate-700 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${badge.bg}`}>
                      <Icon className={`h-3.5 w-3.5 ${badge.color}`} />
                    </div>
                    <span className="text-xs truncate">{cat}</span>
                  </div>
                  {isSelected && <Check className="h-4 w-4 text-blue-600 shrink-0 ml-2" />}
                </button>
              );
            })}
            {filteredCategories.length === 0 && (
              <div className="p-3 text-center text-xs text-slate-400">
                No se encontraron categorías coincidentes
              </div>
            )}
          </div>

          <div className="pt-1.5 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                onChange('', true);
                setIsOpen(false);
                setFilterText('');
              }}
              className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all cursor-pointer ${
                isCustom
                  ? 'bg-indigo-50 text-indigo-900 font-bold border border-indigo-200'
                  : 'hover:bg-slate-100/80 text-slate-700 font-medium'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-indigo-100 border border-indigo-200">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-700" />
                </div>
                <div>
                  <span className="text-xs font-bold text-indigo-700">+ Otra categoría personalizada...</span>
                  <p className="text-[10px] text-indigo-500">Crea una nueva macro-categoría para tus activos</p>
                </div>
              </div>
              {isCustom && <Check className="h-4 w-4 text-indigo-600 shrink-0 ml-2" />}
            </button>
          </div>
        </div>
      )}

      {/* Tarjeta de entrada cuando se selecciona Personalizada */}
      {isCustom && (
        <div className="mt-2.5 p-3 rounded-xl bg-gradient-to-r from-indigo-50/70 to-blue-50/70 border border-indigo-200 animate-in fade-in duration-150 space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-indigo-900 flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-indigo-600" />
              <span>Nombre de la Nueva Categoría Industrial *</span>
            </label>
            <button
              type="button"
              onClick={() => onChange(availableCategories[0] || 'Generación de Energía y Respaldo Eléctrico', false)}
              className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
            >
              Volver a predefinidas
            </button>
          </div>
          <input
            type="text"
            required
            placeholder="Ej: Transporte Vertical, Elevación y Carga, Minería..."
            value={customValue}
            onChange={(e) => onCustomChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-indigo-300 bg-white text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            autoFocus
          />
          <p className="text-[10px] text-indigo-700/80 font-medium">
            ✓ Esta categoría se registrará permanentemente en PostgreSQL y quedará disponible para futuros equipos.
          </p>
        </div>
      )}
    </div>
  );
}

/** Componente Premium para Selección de Medidor de Uso / Contador de Desgaste */
function MedidorUsoGrid({
  presetId,
  unidadUso,
  etiquetaContador,
  requiereHorometro,
  onChange,
  onCustomEtiquetaChange,
  onCustomUnidadChange,
}: {
  presetId: string;
  unidadUso: string;
  etiquetaContador: string;
  requiereHorometro: boolean;
  onChange: (update: {
    medidor_preset: string;
    unidad_uso: string;
    etiqueta_contador: string;
    requiere_horometro: boolean;
  }) => void;
  onCustomEtiquetaChange: (val: string) => void;
  onCustomUnidadChange: (val: string) => void;
}) {
  return (
    <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3">
      <div>
        <label className="block text-xs font-bold text-slate-800">
          Medidor de Uso / Contador de Desgaste *
        </label>
        <p className="text-[11px] text-slate-500">
          Define la métrica con la que este tipo de activo mide su ciclo de vida y programa sus mantenimientos preventivos.
        </p>
      </div>

      {/* Grid de 6 tarjetas seleccionables */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {PRESETS_MEDIDOR_USO.map((p) => {
          const isSelected = presetId === p.id;
          const Icon = p.icon;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                onChange({
                  medidor_preset: p.id,
                  unidad_uso: p.unidad,
                  etiqueta_contador: p.etiqueta,
                  requiere_horometro: p.requiere_horometro,
                });
              }}
              className={`relative p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 cursor-pointer ${
                isSelected
                  ? 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${p.color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <span className={`text-xs font-bold truncate ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>
                    {p.titulo}
                  </span>
                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold shrink-0 border ${p.badgeClass}`}>
                    {p.id === 'CUSTOM' ? 'CUSTOM' : p.id === 'NA' ? 'CAL' : p.unidad}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight line-clamp-2">
                  {p.subtitulo}
                </p>
              </div>
              {isSelected && (
                <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-2xs">
                  <Check className="h-2.5 w-2.5 stroke-[3]" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Configuración adicional si seleccionó Personalizado */}
      {presetId === 'CUSTOM' && (
        <div className="p-3 rounded-xl bg-gradient-to-r from-indigo-50/70 to-blue-50/70 border border-indigo-200 animate-in fade-in duration-150 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
            <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
            <span>Configuración de Métrica Personalizada</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                Nombre / Etiqueta del Contador *
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Golpes de Troquel, Disparos..."
                value={etiquetaContador}
                onChange={(e) => onCustomEtiquetaChange(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500/20 bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                Código Corto de Unidad *
              </label>
              <input
                type="text"
                required
                placeholder="Ej: GOLPES, DISP, M3..."
                value={unidadUso}
                onChange={(e) => onCustomUnidadChange(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-mono uppercase font-bold focus:ring-2 focus:ring-indigo-500/20 bg-white"
              />
            </div>
          </div>
          <p className="text-[10px] text-indigo-700 font-medium">
            ✓ Esta métrica se guardará en PostgreSQL en las columnas `etiqueta_contador` y `unidad_uso`.
          </p>
        </div>
      )}

      {/* Resumen del contador seleccionado */}
      <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white border border-slate-200 text-[11px]">
        <span className="text-slate-500 font-medium">Métrica activa para este tipo de equipo:</span>
        <span className="font-bold text-slate-800 flex items-center gap-1.5">
          {requiereHorometro ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>{etiquetaContador || 'Medidor de Uso'}</span>
              <span className="font-mono text-[10px] text-slate-500">({unidadUso || 'USO'})</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              <span className="text-slate-600">Planificación 100% por Calendario (Sin contador de desgaste)</span>
            </>
          )}
        </span>
      </div>
    </div>
  );
}

export function TabArquetiposEquipo() {
  const { data: arquetiposRaw = [], isLoading } = useArquetiposEam();
  const { data: modulosDisponibles = [] } = useModulosEam();
  const { data: resumen } = useResumenEjecutivoEam();
  const { data: magnitudes = [] } = useMagnitudesEam();
  const { data: modelosOem = [] } = useModelosOemEam();

  // Ordenar siempre por cantidad de equipos activos descendente:
  // 1° Generador Eléctrico (259), 2° Bomba Hidráulica (203), 3° Motor Industrial (2), 4° Compresor de Aire Industrial (1)
  const arquetipos = useMemo(() => {
    return [...arquetiposRaw].sort((a, b) => {
      const actA = a.equipos_activos ?? a._count?.equipos ?? 0;
      const actB = b.equipos_activos ?? b._count?.equipos ?? 0;
      if (actB !== actA) return actB - actA;
      return (a.id_tipo_equipo || 0) - (b.id_tipo_equipo || 0);
    });
  }, [arquetiposRaw]);

  // Categorías disponibles dinámicamente: combina las presets universales con cualquier categoría guardada en DB
  const categoriasDisponibles = useMemo(() => {
    const cats = new Set<string>(MACRO_CATEGORIAS_INDUSTRIALES);
    if (arquetiposRaw) {
      for (const a of arquetiposRaw) {
        if (a.categoria && typeof a.categoria === 'string' && a.categoria.trim()) {
          cats.add(a.categoria.trim());
        }
      }
    }
    return Array.from(cats);
  }, [arquetiposRaw]);

  const [selectedArqId, setSelectedArqId] = useState<number | null>(null);
  const [showPreviewPanel, setShowPreviewPanel] = useState<boolean>(true);

  useEffect(() => {
    if (!selectedArqId && arquetipos.length > 0) {
      setSelectedArqId(arquetipos[0].id_tipo_equipo);
    }
  }, [arquetipos, selectedArqId]);

  const selectedArquetipo = useMemo(
    () => arquetipos.find((a) => a.id_tipo_equipo === selectedArqId) || arquetipos[0] || null,
    [arquetipos, selectedArqId],
  );

  const { data: esquemaVivo, isLoading: loadingEsquema } = useArquetipoEsquemaEam(
    selectedArquetipo?.id_tipo_equipo || null,
  );

  const createArqMut = useCreateArquetipoEam();
  const updateArqMut = useUpdateArquetipoEam();
  const deleteArqMut = useDeleteArquetipoEam();
  const vincularModMut = useVincularModuloArquetipoEam();
  const desvincularModMut = useDesvincularModuloArquetipoEam();
  const createPlanMut = useCreatePlanArquetipoEam();
  const deletePlanMut = useDeletePlanArquetipoEam();
  const createAttrMut = useCreateAtributoEam();
  const asignarAttrMut = useAsignarAtributoModuloEam();
  const createTipoSrvMut = useCreateTipoServicioEam();
  const { data: tiposServicioList = [] } = useTiposServicioEam();
  const { data: todosAtributos = [] } = useAtributosEam();

  // Estados de autogeneración inteligente y universo de tipos de equipo
  const [isAutoCodigoTipo, setIsAutoCodigoTipo] = useState(true);
  const [isAutoCodigoAtributo, setIsAutoCodigoAtributo] = useState(true);
  const [isAutoCodigoSrv, setIsAutoCodigoSrv] = useState(true);

  const codigosTiposExistentes = useMemo(() => {
    return new Set(
      arquetipos
        .map((a) => (a.codigo_corto || a.codigo_tipo || '').toUpperCase().trim())
        .filter(Boolean),
    );
  }, [arquetipos]);

  const codigosAtributosExistentes = useMemo(() => {
    return new Set(todosAtributos.map((a) => a.codigo_atributo.toLowerCase()));
  }, [todosAtributos]);

  const codigosServiciosExistentes = useMemo(() => {
    return new Set(tiposServicioList.map((s) => s.codigo_tipo.toUpperCase()));
  }, [tiposServicioList]);

  // Modales
  const [showNewArqModal, setShowNewArqModal] = useState(false);
  const [arqForm, setArqForm] = useState({
    codigo_tipo: '',
    nombre_tipo: '',
    categoria: 'Transporte Vertical, Elevación y Carga',
    categoria_custom: '',
    is_custom_categoria: false,
    medidor_preset: 'HORAS',
    unidad_uso: 'HORAS',
    etiqueta_contador: 'Horómetro',
    descripcion: '',
    requiere_horometro: true,
  });

  // Modal Editar Tipo de Equipo
  const [showEditArqModal, setShowEditArqModal] = useState(false);
  const [editingArq, setEditingArq] = useState<ArquetipoEquipo | null>(null);
  const [editArqError, setEditArqError] = useState<string | null>(null);
  const [editArqForm, setEditArqForm] = useState({
    codigo_tipo: '',
    nombre_tipo: '',
    categoria: 'Transporte Vertical, Elevación y Carga',
    categoria_custom: '',
    is_custom_categoria: false,
    medidor_preset: 'HORAS',
    unidad_uso: 'HORAS',
    etiqueta_contador: 'Horómetro',
    descripcion: '',
    requiere_horometro: true,
  });

  // Modal Eliminar Tipo de Equipo
  const [showDeleteArqModal, setShowDeleteArqModal] = useState(false);
  const [deletingArq, setDeletingArq] = useState<ArquetipoEquipo | null>(null);
  const [deleteArqError, setDeleteArqError] = useState<string | null>(null);

  const isCodigoTipoDuplicado = useMemo(() => {
    return verificarCodigoDuplicado(
      arqForm.codigo_tipo,
      codigosTiposExistentes,
      undefined,
      false,
    );
  }, [arqForm.codigo_tipo, codigosTiposExistentes]);

  const isCodigoEditTipoDuplicado = useMemo(() => {
    return verificarCodigoDuplicado(
      editArqForm.codigo_tipo,
      codigosTiposExistentes,
      (editingArq?.codigo_corto || editingArq?.codigo_tipo || '').toUpperCase(),
      false,
    );
  }, [editArqForm.codigo_tipo, codigosTiposExistentes, editingArq]);

  const [showLinkModModal, setShowLinkModModal] = useState(false);
  const [linkModId, setLinkModId] = useState<string>('');
  const [linkModObligatorio, setLinkModObligatorio] = useState<boolean>(true);
  const [linkModSearch, setLinkModSearch] = useState<string>('');
  const [deletingModuloTem, setDeletingModuloTem] = useState<any | null>(null);

  const yaVinculadosModulosIds = useMemo(() => {
    return new Set(
      (selectedArquetipo?.tipo_equipo_modulos || []).map((tem) => tem.modulo.id_modulo),
    );
  }, [selectedArquetipo?.tipo_equipo_modulos]);

  const modulosFiltradosParaVincular = useMemo(() => {
    const q = linkModSearch.trim().toLowerCase();
    if (!q) return modulosDisponibles;
    return modulosDisponibles.filter(
      (m) =>
        m.nombre_modulo.toLowerCase().includes(q) ||
        m.codigo_modulo.toLowerCase().includes(q),
    );
  }, [modulosDisponibles, linkModSearch]);

  const moduloSeleccionadoParaVincular = useMemo(() => {
    return modulosDisponibles.find((m) => String(m.id_modulo) === linkModId) || null;
  }, [modulosDisponibles, linkModId]);

  const handleOpenLinkModal = () => {
    const yaIds = new Set(
      (selectedArquetipo?.tipo_equipo_modulos || []).map((tem) => tem.modulo.id_modulo),
    );
    const primerDisp = modulosDisponibles.find((m) => !yaIds.has(m.id_modulo));
    setLinkModId(primerDisp ? String(primerDisp.id_modulo) : '');
    setLinkModObligatorio(true);
    setLinkModSearch('');
    setShowLinkModModal(true);
  };

  const [showPlanModal, setShowPlanModal] = useState(false);
  const [isCambiarSrvPlan, setIsCambiarSrvPlan] = useState(false);
  const [planForm, setPlanForm] = useState({
    id_tipo_servicio: '',
    nombre_plan: '',
    frecuencia_dias: '90',
    frecuencia_uso: '250',
    criterio_intervalo: 'LO_QUE_OCURRA_PRIMERO',
  });
  const [planSearch, setPlanSearch] = useState('');
  const [planCatFilter, setPlanCatFilter] = useState<string>('TODOS');
  const [showCreateSrvInline, setShowCreateSrvInline] = useState(false);
  const [creatingSrv, setCreatingSrv] = useState(false);
  const [srvInlineError, setSrvInlineError] = useState<string | null>(null);
  const [newSrvForm, setNewSrvForm] = useState({
    codigo_tipo: '',
    nombre_tipo: '',
    categoria: 'PREVENTIVO',
    duracion_estimada_horas: '2',
    color_hex: '#0284c7',
  });

  // Modal Creación Rápida de Campo Técnico desde el Tipo de Equipo
  const [showInPlaceModal, setShowInPlaceModal] = useState(false);
  const [inPlaceForm, setInPlaceForm] = useState({
    codigo_modulo: '',
    codigo_atributo: '',
    nombre_atributo: '',
    tipo_control: 'NUMERICO_MAGNITUD',
    id_magnitud: '',
    unidad_defecto_codigo: '',
    grupo_visual: 'General',
    obligatorio: true,
  });

  const isCodigoAtributoDuplicado = useMemo(() => {
    return verificarCodigoDuplicado(
      inPlaceForm.codigo_atributo,
      codigosAtributosExistentes,
    );
  }, [inPlaceForm.codigo_atributo, codigosAtributosExistentes]);

  const isCodigoSrvDuplicado = useMemo(() => {
    return verificarCodigoDuplicado(
      newSrvForm.codigo_tipo,
      codigosServiciosExistentes,
    );
  }, [newSrvForm.codigo_tipo, codigosServiciosExistentes]);

  // Helper para generar nombres de plan sin redundancias léxicas tipo "Plan Preventivo Preventivo..."
  const construirNombrePlan = (srv: any) => {
    if (!srv) return '';
    const nom = (srv.nombre_tipo || '').trim();
    const isInsp = srv.codigo_tipo === 'INSPECCION' || nom.toLowerCase().includes('inspecci');
    if (isInsp) {
      if (nom.toLowerCase().startsWith('plan')) return nom;
      return `Plan de ${nom}`;
    }
    if (nom.toLowerCase().startsWith('plan')) {
      return nom;
    }
    if (nom.toLowerCase().startsWith('preventivo') || nom.toLowerCase().startsWith('mantenimiento')) {
      return `Plan ${nom}`;
    }
    return `Plan Preventivo ${nom}`;
  };

  // Catálogo completo de servicios normalizado (específicos de este equipo primero, luego universales; excluye correctivos y emergencias)
  const todosLosServicios = useMemo(() => {
    const rawList = tiposServicioList.length > 0 ? tiposServicioList : (resumen?.tipos_servicio_preventivos || []);
    const soloPreventivos = rawList.filter((s) => {
      const cat = (s.categoria || '').toUpperCase();
      const nom = (s.nombre_tipo || '').toLowerCase();
      if (cat === 'CORRECTIVO' || cat === 'EMERGENCIA') return false;
      if (nom.includes('correctivo') || nom.includes('emergencia')) return false;
      return true;
    });
    const currentArqId = selectedArquetipo?.id_tipo_equipo;
    return [...soloPreventivos].sort((a, b) => {
      const aEsEspecifico = currentArqId && a.id_tipo_equipo === currentArqId ? 1 : (a.id_tipo_equipo == null ? 2 : 3);
      const bEsEspecifico = currentArqId && b.id_tipo_equipo === currentArqId ? 1 : (b.id_tipo_equipo == null ? 2 : 3);
      if (aEsEspecifico !== bEsEspecifico) return aEsEspecifico - bEsEspecifico;
      return a.nombre_tipo.localeCompare(b.nombre_tipo);
    });
  }, [tiposServicioList, resumen?.tipos_servicio_preventivos, selectedArquetipo?.id_tipo_equipo]);

  const serviciosFiltrados = useMemo(() => {
    return todosLosServicios.filter((s) => {
      if (planCatFilter !== 'TODOS') {
        const cat = s.categoria?.toUpperCase();
        if (planCatFilter === 'INSPECCION' && cat !== 'INSPECCION' && cat !== 'DIAGNOSTICO') return false;
        if (planCatFilter !== 'INSPECCION' && cat !== planCatFilter) return false;
      }
      if (planSearch.trim()) {
        const q = planSearch.toLowerCase();
        const matchName = s.nombre_tipo?.toLowerCase().includes(q);
        const matchCode = s.codigo_tipo?.toLowerCase().includes(q);
        const matchCat = s.categoria?.toLowerCase().includes(q);
        return matchName || matchCode || matchCat;
      }
      return true;
    });
  }, [todosLosServicios, planCatFilter, planSearch]);

  const tiposServicioPreventivos = todosLosServicios;

  const servicioPlanSeleccionado = useMemo(() => {
    if (!planForm.id_tipo_servicio) return null;
    return todosLosServicios.find((s) => String(s.id_tipo_servicio) === planForm.id_tipo_servicio) || null;
  }, [todosLosServicios, planForm.id_tipo_servicio]);

  const handleSaveNewArq = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalCategoria = arqForm.is_custom_categoria
      ? (arqForm.categoria_custom.trim() || 'Otra Maquinaria Industrial')
      : arqForm.categoria;

    const created = await createArqMut.mutateAsync({
      codigo_tipo: arqForm.codigo_tipo.trim().toUpperCase(),
      prefijo_codigo: arqForm.codigo_tipo.trim().toUpperCase(),
      nombre_tipo: arqForm.nombre_tipo.trim(),
      categoria: finalCategoria,
      descripcion: arqForm.descripcion?.trim() || undefined,
      requiere_horometro: arqForm.requiere_horometro,
      unidad_uso: arqForm.unidad_uso,
      etiqueta_contador: arqForm.etiqueta_contador,
    });
    setSelectedArqId(created.id_tipo_equipo);
    setShowNewArqModal(false);
  };

  const handleOpenEditArq = (arq: ArquetipoEquipo) => {
    setEditingArq(arq);
    setEditArqError(null);
    const existingCat = arq.categoria || 'Generación de Energía y Respaldo Eléctrico';
    const isStandardCat = categoriasDisponibles.includes(existingCat as any);

    const preset = PRESETS_MEDIDOR_USO.find(
      (p) => p.unidad === arq.unidad_uso && p.etiqueta === arq.etiqueta_contador,
    );
    const presetId = preset
      ? preset.id
      : arq.requiere_horometro === false
        ? 'NA'
        : arq.unidad_uso || arq.etiqueta_contador
          ? 'CUSTOM'
          : 'HORAS';

    setEditArqForm({
      codigo_tipo: arq.codigo_corto || arq.codigo_tipo,
      nombre_tipo: arq.nombre_canonico || arq.nombre_tipo,
      categoria: isStandardCat ? existingCat : 'OTRA_CUSTOM',
      categoria_custom: isStandardCat ? '' : existingCat,
      is_custom_categoria: !isStandardCat,
      medidor_preset: presetId,
      unidad_uso: arq.unidad_uso || (preset ? preset.unidad : 'HORAS'),
      etiqueta_contador: arq.etiqueta_contador || (preset ? preset.etiqueta : 'Horómetro'),
      descripcion: arq.descripcion || '',
      requiere_horometro: Boolean(arq.requiere_horometro ?? true),
    });
    setShowEditArqModal(true);
  };

  const handleSaveEditArq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingArq) return;
    try {
      setEditArqError(null);
      const finalCategoria = editArqForm.is_custom_categoria
        ? (editArqForm.categoria_custom.trim() || 'Otra Maquinaria Industrial')
        : editArqForm.categoria;

      await updateArqMut.mutateAsync({
        idTipoEquipo: editingArq.id_tipo_equipo,
        payload: {
          codigo_tipo: editArqForm.codigo_tipo.trim().toUpperCase(),
          prefijo_codigo: editArqForm.codigo_tipo.trim().toUpperCase(),
          nombre_tipo: editArqForm.nombre_tipo.trim(),
          categoria: finalCategoria,
          descripcion: editArqForm.descripcion?.trim() || undefined,
          requiere_horometro: editArqForm.requiere_horometro,
          unidad_uso: editArqForm.unidad_uso,
          etiqueta_contador: editArqForm.etiqueta_contador,
        },
      });
      setShowEditArqModal(false);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Error al actualizar el tipo de equipo';
      setEditArqError(Array.isArray(msg) ? msg.join(', ') : msg);
    }
  };

  const handleOpenDeleteArq = (arq: ArquetipoEquipo) => {
    setDeletingArq(arq);
    setDeleteArqError(null);
    setShowDeleteArqModal(true);
  };

  const handleConfirmDeleteArq = async () => {
    if (!deletingArq) return;
    try {
      await deleteArqMut.mutateAsync(deletingArq.id_tipo_equipo);
      if (selectedArqId === deletingArq.id_tipo_equipo) {
        setSelectedArqId(null);
      }
      setShowDeleteArqModal(false);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'No se pudo eliminar el tipo de equipo';
      setDeleteArqError(msg);
    }
  };

  const handleLinkModulo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedArquetipo || !linkModId) return;
    await vincularModMut.mutateAsync({
      idTipoEquipo: selectedArquetipo.id_tipo_equipo,
      payload: {
        id_modulo: Number(linkModId),
        obligatorio: linkModObligatorio,
      },
    });
    setShowLinkModModal(false);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedArquetipo || !planForm.id_tipo_servicio) return;
    await createPlanMut.mutateAsync({
      idTipoEquipo: selectedArquetipo.id_tipo_equipo,
      payload: {
        id_tipo_servicio: Number(planForm.id_tipo_servicio),
        nombre_plan: planForm.nombre_plan,
        frecuencia_dias: Number(planForm.frecuencia_dias) || 90,
        frecuencia_uso: Number(planForm.frecuencia_uso) || 250,
        criterio_intervalo: planForm.criterio_intervalo,
      },
    });
    setShowPlanModal(false);
  };

  const handleCreateTipoServicioInline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSrvForm.codigo_tipo.trim() || !newSrvForm.nombre_tipo.trim()) return;
    try {
      setCreatingSrv(true);
      setSrvInlineError(null);
      const created = await createTipoSrvMut.mutateAsync({
        codigo_tipo: newSrvForm.codigo_tipo.trim().toUpperCase(),
        nombre_tipo: newSrvForm.nombre_tipo.trim(),
        categoria: newSrvForm.categoria,
        id_tipo_equipo: selectedArquetipo?.id_tipo_equipo,
        duracion_estimada_horas: Number(newSrvForm.duracion_estimada_horas) || 2,
        color_hex: newSrvForm.color_hex,
      });

      const isInsp = created.categoria === 'INSPECCION' || created.nombre_tipo.toLowerCase().includes('inspecci');
      setPlanForm({
        ...planForm,
        id_tipo_servicio: String(created.id_tipo_servicio),
        nombre_plan: isInsp ? 'Plan de Visita de Inspección Periódica' : `Plan de ${created.nombre_tipo}`,
        frecuencia_dias: isInsp ? '30' : '90',
        frecuencia_uso: isInsp ? '100' : '250',
      });
      setShowCreateSrvInline(false);
      setIsCambiarSrvPlan(false);
      setNewSrvForm({
        codigo_tipo: '',
        nombre_tipo: '',
        categoria: 'PREVENTIVO',
        duracion_estimada_horas: '2',
        color_hex: '#0284c7',
      });
    } catch (err: any) {
      setSrvInlineError(err.response?.data?.message || err.message || 'Error al crear el tipo de servicio');
    } finally {
      setCreatingSrv(false);
    }
  };

  const getCategoriaBadge = (cat?: string) => {
    switch (cat?.toUpperCase()) {
      case 'PREVENTIVO':
        return { label: 'Preventivo', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'INSPECCION':
        return { label: 'Inspección', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'DIAGNOSTICO':
        return { label: 'Diagnóstico', bg: 'bg-cyan-50 text-cyan-700 border-cyan-200' };
      case 'CORRECTIVO':
        return { label: 'Correctivo', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'ESPECIALIZADO':
        return { label: 'Especializado', bg: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'EMERGENCIA':
        return { label: 'Emergencia', bg: 'bg-red-50 text-red-700 border-red-200' };
      default:
        return { label: cat || 'General', bg: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
  };

  const handleSaveInPlaceFromArq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inPlaceForm.codigo_modulo) return;
    const isNumMag = inPlaceForm.tipo_control === 'NUMERICO_MAGNITUD';
    const attr = await createAttrMut.mutateAsync({
      codigo_atributo: inPlaceForm.codigo_atributo,
      nombre_atributo: inPlaceForm.nombre_atributo,
      tipo_control: inPlaceForm.tipo_control,
      id_magnitud: isNumMag && inPlaceForm.id_magnitud ? Number(inPlaceForm.id_magnitud) : undefined,
      unidad_defecto_codigo:
        isNumMag && inPlaceForm.unidad_defecto_codigo
          ? inPlaceForm.unidad_defecto_codigo
          : undefined,
    });

    await asignarAttrMut.mutateAsync({
      codigoModulo: inPlaceForm.codigo_modulo,
      payload: {
        id_atributo: attr.id_atributo,
        grupo_visual: inPlaceForm.grupo_visual || 'General',
        obligatorio: inPlaceForm.obligatorio,
        es_filtrable: true,
        visible_en_pdf: true,
      },
    });
    setShowInPlaceModal(false);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200">
        <Loader2 className="h-9 w-9 animate-spin text-blue-600 mb-3" />
        <p className="text-sm font-medium text-slate-600">Cargando Tipos de Equipo...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* SELECTOR DE TIPOS DE EQUIPO ORDENADOS POR RELEVANCIA OPERATIVA */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Cpu className="h-5 w-5 text-blue-600" />
              <span>Tipos de Equipo ({arquetipos.length} Clases)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Selecciona un tipo de equipo para configurar sus partes, planes preventivos y probar su ficha técnica en vivo.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowPreviewPanel((prev) => !prev)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all ${
                showPreviewPanel
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-800'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Eye className="h-4 w-4" />
              <span>
                {showPreviewPanel
                  ? 'Ocultar Simulador de Ficha y PDF'
                  : 'Ver Simulador de Ficha y PDF'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowNewArqModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Nuevo Tipo de Equipo</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {arquetipos.map((arq) => {
            const isSelected = selectedArquetipo?.id_tipo_equipo === arq.id_tipo_equipo;
            const activos = arq.equipos_activos ?? arq._count.equipos;
            const codigoLimpio = arq.codigo_corto || arq.codigo_tipo;

            return (
              <div
                key={arq.id_tipo_equipo}
                onClick={() => setSelectedArqId(arq.id_tipo_equipo)}
                className={`rounded-2xl border p-4 cursor-pointer transition-all flex flex-col justify-between gap-3 ${
                  isSelected
                    ? 'bg-blue-50/70 border-blue-600 ring-2 ring-blue-500/20 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-2xs'
                }`}
              >
                <div className="space-y-2">
                  {/* Línea 1: Nombre en Title Case + Acciones y Horómetro */}
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-extrabold text-slate-900 leading-snug">
                      {arq.nombre_canonico || arq.nombre_tipo}
                    </h4>
                    <div className="flex items-center gap-1 shrink-0">
                      {arq.requiere_horometro === false ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold border border-slate-200">
                          <CalendarClock className="h-3 w-3 shrink-0" />
                          <span>Sin Contador</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-200">
                          <Clock className="h-3 w-3 shrink-0 text-amber-600" />
                          <span>{arq.etiqueta_contador || 'Horómetro'}</span>
                          {arq.unidad_uso && <span className="font-mono text-[9px] opacity-75">({arq.unidad_uso})</span>}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditArq(arq);
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Editar tipo de equipo"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDeleteArq(arq);
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Eliminar tipo de equipo"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {/* Línea 2: 1 solo código limpio + Categoría */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-xs font-bold">
                      Código: {codigoLimpio}
                    </span>
                    {arq.categoria && (() => {
                      const cBadge = getCategoryBadgeInfo(arq.categoria);
                      const CIcon = cBadge.icon;
                      return (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${cBadge.bg} ${cBadge.color}`}
                          title={arq.categoria}
                        >
                          <CIcon className="h-3 w-3 shrink-0" />
                          <span className="truncate max-w-[170px]">{arq.categoria}</span>
                        </span>
                      );
                    })()}
                  </div>
                </div>

                <div className="pt-2.5 border-t border-slate-200/70 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-extrabold text-blue-700 text-sm">{activos}</span>{' '}
                    <span className="text-slate-600 font-medium">equipos activos</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
                    <span>{arq.tipo_equipo_modulos.length} partes</span>
                    <span>•</span>
                    <span>{arq.tipo_equipo_planes.length} planes</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 1° PRIORIDAD VISUAL: CONFIGURACIÓN DE PARTES Y PLANES PREVENTIVOS DEL TIPO DE EQUIPO */}
      {selectedArquetipo && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* SECCIÓN A: PARTES Y SUBSISTEMAS QUE COMPONEN ESTE EQUIPO */}
          <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/60">
              <div>
                <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="h-5 w-5 text-blue-600" />
                  <span>Partes y Subsistemas del Equipo</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Secciones técnicas que integran la ficha de{' '}
                  <strong>{selectedArquetipo.nombre_canonico || selectedArquetipo.nombre_tipo}</strong>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const primerMod =
                      selectedArquetipo.tipo_equipo_modulos[0]?.modulo.codigo_modulo || '';
                    setInPlaceForm({
                      ...inPlaceForm,
                      codigo_modulo: primerMod,
                      codigo_atributo: '',
                      nombre_atributo: '',
                    });
                    setShowInPlaceModal(true);
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition-colors"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>+ Nuevo Campo Rápido</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenLinkModal}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Agregar Parte</span>
                </button>
              </div>
            </div>

            <div className="p-5 space-y-3">
              {selectedArquetipo.tipo_equipo_modulos.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 space-y-2.5">
                  <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-2xs">
                    <Layers className="h-6 w-6" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-800">
                      Sin partes o subsistemas vinculados
                    </h5>
                    <p className="text-[11px] text-slate-500 max-w-sm mx-auto mt-0.5 leading-relaxed">
                      Vincula las partes que componen este activo (ej: Cabina y Sistema de Puertas, Máquina de Tracción) para estructurar su ficha técnica.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenLinkModal}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Vincular Primera Parte</span>
                  </button>
                </div>
              ) : (
                selectedArquetipo.tipo_equipo_modulos.map((tem) => {
                  const mod = tem.modulo;
                  const countAttrs = mod._count?.modulo_atributos ?? mod.modulo_atributos?.length ?? 0;
                  const badgeInfo = getModuloBadgeInfo(mod.codigo_modulo, mod.nombre_modulo);
                  return (
                    <div
                      key={tem.id_tipo_equipo_modulo}
                      className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-300 bg-white hover:shadow-2xs transition-all flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${badgeInfo.badgeClass}`}
                        >
                          <Layers className="h-4 w-4" />
                        </div>
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center flex-wrap gap-2">
                            <span className="font-extrabold text-slate-900 text-sm">
                              {mod.nombre_modulo}
                            </span>
                            <button
                              type="button"
                              onClick={async () => {
                                await vincularModMut.mutateAsync({
                                  idTipoEquipo: selectedArquetipo.id_tipo_equipo,
                                  payload: {
                                    id_modulo: mod.id_modulo,
                                    obligatorio: !tem.obligatorio,
                                  },
                                });
                              }}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                                tem.obligatorio
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                              }`}
                              title="Haz clic para alternar entre Obligatoria y Opcional"
                            >
                              <ShieldCheck className="h-3 w-3 shrink-0" />
                              <span>{tem.obligatorio ? 'Parte Principal (Obligatoria)' : 'Parte Opcional'}</span>
                            </button>
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono text-slate-500 bg-slate-100">
                              {mod.codigo_modulo}
                            </span>
                            <span>•</span>
                            <span className="text-[11px] font-semibold text-slate-600">
                              {countAttrs} campos técnicos en ficha
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setDeletingModuloTem(tem)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Quitar parte de este tipo de equipo"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* SECCIÓN B: PLANES PREVENTIVOS BASE DEL TIPO DE EQUIPO */}
          <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/60">
              <div>
                <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <CalendarClock className="h-5 w-5 text-emerald-600" />
                  <span>Planes de Mantenimiento Preventivo</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Frecuencias recomendadas por calendario (días) y horas de uso
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const srvDefault =
                    todosLosServicios.find((s) => s.id_tipo_equipo === selectedArquetipo.id_tipo_equipo) ||
                    todosLosServicios.find((s) => s.codigo_tipo === 'INSPECCION') ||
                    todosLosServicios[0];
                  const isInsp =
                    srvDefault?.codigo_tipo === 'INSPECCION' ||
                    srvDefault?.nombre_tipo?.toLowerCase().includes('inspecci');

                  setPlanForm({
                    id_tipo_servicio: srvDefault ? String(srvDefault.id_tipo_servicio) : '',
                    nombre_plan: construirNombrePlan(srvDefault),
                    frecuencia_dias: isInsp ? '30' : '90',
                    frecuencia_uso: isInsp ? '100' : '250',
                    criterio_intervalo: 'LO_QUE_OCURRA_PRIMERO',
                  });
                  setPlanSearch('');
                  setPlanCatFilter('TODOS');
                  setShowCreateSrvInline(false);
      setIsCambiarSrvPlan(false);
                  setShowPlanModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Agregar Plan Preventivo</span>
              </button>
            </div>

            <div className="p-5 space-y-3">
              {selectedArquetipo.tipo_equipo_planes.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No hay planes preventivos registrados para este tipo de equipo.
                </div>
              ) : (
                selectedArquetipo.tipo_equipo_planes.map((plan) => (
                  <div
                    key={plan.id_plan}
                    className="p-4 rounded-xl border border-slate-200 bg-white flex items-start justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="text-sm font-bold text-slate-900">
                          {plan.nombre_plan}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                          {plan.tipo_servicio?.nombre_tipo ||
                            plan.tipo_servicio?.codigo_tipo ||
                            `Servicio #${plan.id_tipo_servicio}`}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 flex flex-wrap items-center gap-2.5 pt-0.5">
                        <span className="font-bold text-blue-700">
                          Cada {plan.frecuencia_dias ?? 90} días
                        </span>
                        <span>•</span>
                        <span className="font-bold text-amber-700">
                          Cada {Number(plan.frecuencia_uso ?? 250)} {selectedArquetipo.unidad_uso ? selectedArquetipo.unidad_uso.toLowerCase() : 'horas'}
                        </span>
                        <span>•</span>
                        <span className="text-slate-600 font-medium">
                          {getCriterioIntervaloHumano(plan.criterio_intervalo)}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={async () => {
                        if (window.confirm(`¿Eliminar el plan "${plan.nombre_plan}"?`)) {
                          await deletePlanMut.mutateAsync({
                            idTipoEquipo: selectedArquetipo.id_tipo_equipo,
                            idPlan: plan.id_plan,
                          });
                        }
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Eliminar plan"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2° DEBAJO DE PARTES Y PLANES: SIMULADOR INTERACTIVO EN VIVO (FORMULARIO Y PLACA TÉCNICA PDF) */}
      {showPreviewPanel && selectedArquetipo && (
        <div>
          {loadingEsquema || !esquemaVivo ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 flex flex-col items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-indigo-600 mb-2" />
              <p className="text-xs font-medium text-slate-500">
                Preparando simulador de formulario y placa técnica...
              </p>
            </div>
          ) : (
            <DynamicEquipmentFormPreview
              esquema={esquemaVivo}
              modelosOem={modelosOem}
              magnitudes={magnitudes}
            />
          )}
        </div>
      )}

      {/* MODAL NUEVO TIPO DE EQUIPO */}
      {showNewArqModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h4 className="text-base font-bold text-slate-900">Crear Nuevo Tipo de Equipo</h4>
              <button
                type="button"
                onClick={() => setShowNewArqModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSaveNewArq} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre del Tipo de Equipo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Ascensor de Pasajeros, Puente Grúa..."
                  value={arqForm.nombre_tipo}
                  onChange={(e) => {
                    const nombre = e.target.value;
                    const autoCod = isAutoCodigoTipo
                      ? generarCodigoTipoEquipo(nombre, codigosTiposExistentes)
                      : arqForm.codigo_tipo;
                    setArqForm({
                      ...arqForm,
                      nombre_tipo: nombre,
                      codigo_tipo: autoCod,
                    });
                  }}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-medium"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    Código Corto Identificador / Prefijo TAG *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const nuevoModo = !isAutoCodigoTipo;
                      setIsAutoCodigoTipo(nuevoModo);
                      if (nuevoModo) {
                        const auto = generarCodigoTipoEquipo(arqForm.nombre_tipo, codigosTiposExistentes);
                        setArqForm((prev) => ({ ...prev, codigo_tipo: auto }));
                      }
                    }}
                    className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    {isAutoCodigoTipo ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                    <span>{isAutoCodigoTipo ? 'Personalizar código' : 'Auto-generar'}</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  disabled={isAutoCodigoTipo}
                  placeholder="Ej: ELEV, GEN, HVAC"
                  value={arqForm.codigo_tipo}
                  onChange={(e) =>
                    setArqForm({ ...arqForm, codigo_tipo: e.target.value.toUpperCase().replace(/\s+/g, '_') })
                  }
                  className={`w-full px-3.5 py-2 rounded-xl border font-mono text-sm transition-colors disabled:bg-slate-100 disabled:text-slate-600 ${
                    isCodigoTipoDuplicado
                      ? 'border-rose-400 bg-rose-50/20 text-rose-900 focus:ring-rose-500'
                      : 'border-slate-300'
                  }`}
                />
                {isCodigoTipoDuplicado ? (
                  <p className="text-[11px] text-rose-600 font-bold mt-1.5 flex items-center gap-1.5 animate-in fade-in">
                    ✕ Este código "{arqForm.codigo_tipo}" ya está en uso. Modifícalo para que sea único.
                  </p>
                ) : arqForm.codigo_tipo ? (
                  <p className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1 animate-in fade-in">
                    ✓ Código único garantizado disponible
                  </p>
                ) : isAutoCodigoTipo ? (
                  <p className="text-[11px] text-slate-400 mt-1">
                    Prefijo conciso de 3 a 5 letras para TAGs de equipos (ej: ELEV-001).
                  </p>
                ) : null}
              </div>

              {/* Selector Premium de Macro-Categoría Industrial */}
              <MacroCategoriaSelector
                value={arqForm.categoria}
                isCustom={arqForm.is_custom_categoria}
                customValue={arqForm.categoria_custom}
                availableCategories={categoriasDisponibles}
                onChange={(cat, isCustom) =>
                  setArqForm({
                    ...arqForm,
                    categoria: cat,
                    is_custom_categoria: isCustom,
                    categoria_custom: isCustom ? arqForm.categoria_custom : '',
                  })
                }
                onCustomChange={(val) => setArqForm({ ...arqForm, categoria_custom: val })}
              />

              {/* Selector Premium de Medidor de Uso / Contador de Desgaste */}
              <MedidorUsoGrid
                presetId={arqForm.medidor_preset}
                unidadUso={arqForm.unidad_uso}
                etiquetaContador={arqForm.etiqueta_contador}
                requiereHorometro={arqForm.requiere_horometro}
                onChange={(u) => setArqForm({ ...arqForm, ...u })}
                onCustomEtiquetaChange={(val) => setArqForm({ ...arqForm, etiqueta_contador: val })}
                onCustomUnidadChange={(val) => setArqForm({ ...arqForm, unidad_uso: val })}
              />

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowNewArqModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={
                    createArqMut.isPending ||
                    isCodigoTipoDuplicado ||
                    !arqForm.nombre_tipo.trim() ||
                    !arqForm.codigo_tipo.trim() ||
                    (arqForm.is_custom_categoria && !arqForm.categoria_custom.trim()) ||
                    (arqForm.medidor_preset === 'CUSTOM' && (!arqForm.etiqueta_contador.trim() || !arqForm.unidad_uso.trim()))
                  }
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
                >
                  Guardar Tipo de Equipo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR TIPO DE EQUIPO */}
      {showEditArqModal && editingArq && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Edit3 className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900 leading-tight">
                    Editar Tipo de Equipo
                  </h4>
                  <p className="text-xs text-slate-500 font-mono">
                    ID: {editingArq.id_tipo_equipo}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditArqModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEditArq} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
              {editArqError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                  {editArqError}
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre del Tipo de Equipo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Aire Acondicionado / Chiller"
                  value={editArqForm.nombre_tipo}
                  onChange={(e) =>
                    setEditArqForm({ ...editArqForm, nombre_tipo: e.target.value })
                  }
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Código / Prefijo Identificador *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: ELEV, HVAC, GEN"
                  value={editArqForm.codigo_tipo}
                  onChange={(e) =>
                    setEditArqForm({ ...editArqForm, codigo_tipo: e.target.value.toUpperCase().replace(/\s+/g, '_') })
                  }
                  className={`w-full px-3.5 py-2 rounded-xl border font-mono text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 uppercase transition-colors ${
                    isCodigoEditTipoDuplicado
                      ? 'border-rose-400 bg-rose-50/20 text-rose-900 focus:border-rose-500'
                      : 'border-slate-300 focus:border-blue-500'
                  }`}
                />
                {isCodigoEditTipoDuplicado ? (
                  <p className="text-[11px] text-rose-600 font-bold mt-1.5 flex items-center gap-1.5 animate-in fade-in">
                    ✕ Este código "{editArqForm.codigo_tipo}" ya pertenece a otro tipo de equipo.
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-400 mt-1">
                    Se usa como prefijo para numerar los equipos en la plataforma (ej: ELEV-001).
                  </p>
                )}
              </div>

              {/* Selector Premium de Macro-Categoría Industrial */}
              <MacroCategoriaSelector
                value={editArqForm.categoria}
                isCustom={editArqForm.is_custom_categoria}
                customValue={editArqForm.categoria_custom}
                availableCategories={categoriasDisponibles}
                onChange={(cat, isCustom) =>
                  setEditArqForm({
                    ...editArqForm,
                    categoria: cat,
                    is_custom_categoria: isCustom,
                    categoria_custom: isCustom ? editArqForm.categoria_custom : '',
                  })
                }
                onCustomChange={(val) => setEditArqForm({ ...editArqForm, categoria_custom: val })}
              />

              {/* Selector Premium de Medidor de Uso / Contador de Desgaste */}
              <MedidorUsoGrid
                presetId={editArqForm.medidor_preset}
                unidadUso={editArqForm.unidad_uso}
                etiquetaContador={editArqForm.etiqueta_contador}
                requiereHorometro={editArqForm.requiere_horometro}
                onChange={(u) => setEditArqForm({ ...editArqForm, ...u })}
                onCustomEtiquetaChange={(val) => setEditArqForm({ ...editArqForm, etiqueta_contador: val })}
                onCustomUnidadChange={(val) => setEditArqForm({ ...editArqForm, unidad_uso: val })}
              />

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Descripción (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Notas técnicas o alcance del tipo de equipo..."
                  value={editArqForm.descripcion}
                  onChange={(e) =>
                    setEditArqForm({ ...editArqForm, descripcion: e.target.value })
                  }
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditArqModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={
                    updateArqMut.isPending ||
                    isCodigoEditTipoDuplicado ||
                    !editArqForm.nombre_tipo.trim() ||
                    !editArqForm.codigo_tipo.trim() ||
                    (editArqForm.is_custom_categoria && !editArqForm.categoria_custom.trim()) ||
                    (editArqForm.medidor_preset === 'CUSTOM' && (!editArqForm.etiqueta_contador.trim() || !editArqForm.unidad_uso.trim()))
                  }
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm"
                >
                  {updateArqMut.isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>Guardar Cambios</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ADVERTENCIA ELIMINAR TIPO DE EQUIPO */}
      {showDeleteArqModal && deletingArq && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-rose-50/80">
              <div className="flex items-center gap-2 text-rose-700">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <h4 className="text-sm font-bold">Eliminar Tipo de Equipo</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteArqModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <p className="text-xs font-bold text-slate-800">
                  {deletingArq.nombre_canonico || deletingArq.nombre_tipo}
                </p>
                <p className="text-[11px] font-mono text-slate-500">
                  Código: {deletingArq.codigo_corto || deletingArq.codigo_tipo}
                </p>
                <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-600 font-semibold">
                  <span>{deletingArq.equipos_activos ?? deletingArq._count.equipos} equipos activos</span>
                  <span>•</span>
                  <span>{deletingArq.tipo_equipo_modulos.length} partes</span>
                  <span>•</span>
                  <span>{deletingArq.tipo_equipo_planes.length} planes</span>
                </div>
              </div>

              {(deletingArq.equipos_activos ?? deletingArq._count.equipos) > 0 ? (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Acción Bloqueada por Integridad Operativa</p>
                    <p className="mt-1 text-[11px] text-amber-800 leading-relaxed">
                      Este tipo de equipo tiene <strong>{deletingArq.equipos_activos ?? deletingArq._count.equipos} equipos activos</strong> registrados en Mekanos.
                      Para mantener la trazabilidad de órdenes de servicio e historial de fallas, no puede ser eliminado mientras tenga activos vinculados.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900">
                  <p className="font-bold">¿Confirmas la eliminación definitiva?</p>
                  <p className="mt-1 text-[11px] text-rose-800 leading-relaxed">
                    Esta acción desvinculará sus partes técnicas y rutinas de mantenimiento preventivo asociadas. No se puede deshacer.
                  </p>
                </div>
              )}

              {deleteArqError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                  {deleteArqError}
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowDeleteArqModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={(deletingArq.equipos_activos ?? deletingArq._count.equipos) > 0 || deleteArqMut.isPending}
                  onClick={handleConfirmDeleteArq}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-all inline-flex items-center gap-1.5 shadow-sm"
                >
                  {deleteArqMut.isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Eliminando...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Eliminar Tipo de Equipo</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL AGREGAR PARTE / SUBSISTEMA PRÉMIUM */}
      {showLinkModModal && selectedArquetipo && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header Prémium */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900 leading-tight">
                    Vincular Parte o Subsistema
                  </h4>
                  <p className="text-xs text-slate-500">
                    Añade secciones técnicas a la ficha de{' '}
                    <strong className="text-slate-700">
                      {selectedArquetipo.nombre_canonico || selectedArquetipo.nombre_tipo}
                    </strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLinkModModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleLinkModulo} className="p-6 flex flex-col flex-1 overflow-y-auto space-y-4">
              {/* Buscador de Partes */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-800">
                    Seleccionar Parte / Subsistema del Catálogo Maestro *
                  </label>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {modulosDisponibles.length} disponibles en catálogo
                  </span>
                </div>

                <div className="relative">
                  <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={linkModSearch}
                    onChange={(e) => setLinkModSearch(e.target.value)}
                    placeholder="Buscar por nombre o código (ej: Cabina, Tracción, Motor)..."
                    className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-300 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
                    autoFocus
                  />
                  {linkModSearch && (
                    <button
                      type="button"
                      onClick={() => setLinkModSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Lista visual interactiva de Partes */}
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {modulosFiltradosParaVincular.map((m) => {
                  const isAlreadyLinked = yaVinculadosModulosIds.has(m.id_modulo);
                  const isSelected = linkModId === String(m.id_modulo);
                  const badgeInfo = getModuloBadgeInfo(m.codigo_modulo, m.nombre_modulo);
                  const countAttrs = m._count?.modulo_atributos ?? m.modulo_atributos?.length ?? 0;

                  if (isAlreadyLinked) {
                    return (
                      <div
                        key={m.id_modulo}
                        className="p-3 rounded-xl border border-slate-200 bg-slate-100/70 opacity-60 flex items-center justify-between gap-3 cursor-not-allowed"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-500 flex items-center justify-center shrink-0">
                            <Layers className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-600 truncate">
                              {m.nombre_modulo}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {m.codigo_modulo}
                            </div>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-600 shrink-0">
                          ✓ Ya vinculada a este equipo
                        </span>
                      </div>
                    );
                  }

                  return (
                    <button
                      key={m.id_modulo}
                      type="button"
                      onClick={() => setLinkModId(String(m.id_modulo))}
                      className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/80'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${badgeInfo.badgeClass}`}
                        >
                          <Layers className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs font-bold truncate ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>
                              {m.nombre_modulo}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono text-slate-500 bg-slate-100">
                              {m.codigo_modulo}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {countAttrs} campos técnicos configurados en su ficha
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        {isSelected ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-blue-600 text-white shadow-2xs">
                            <Check className="h-3 w-3 stroke-[3]" />
                            <span>Elegida</span>
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-slate-400 group-hover:text-blue-600">
                            Seleccionar
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}

                {modulosFiltradosParaVincular.length === 0 && (
                  <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    No se encontraron partes con el término "{linkModSearch}".
                  </div>
                )}
              </div>

              {/* Configuración de Obligatoriedad con Switch Interactivo */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3">
                <div className="space-y-0.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="text-xs font-bold text-slate-800">Parte Principal Obligatoria</span>
                    <span
                      className={`px-2 py-0.2 rounded text-[10px] font-bold ${
                        linkModObligatorio
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {linkModObligatorio ? 'Exigida al registrar el equipo' : 'Opcional / Modular'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    {linkModObligatorio
                      ? 'Los campos técnicos de esta parte serán requeridos al registrar nuevos activos de este arquetipo.'
                      : 'Esta sección solo se completará en activos que cuenten físicamente con este subsistema.'}
                  </p>
                </div>

                {/* Toggle Switch */}
                <button
                  type="button"
                  onClick={() => setLinkModObligatorio(!linkModObligatorio)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    linkModObligatorio ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      linkModObligatorio ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Resumen & Botones de Acción */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                <div className="text-[11px] text-slate-500 min-w-0 truncate">
                  {moduloSeleccionadoParaVincular ? (
                    <span className="font-semibold text-slate-700">
                      Se vinculará:{' '}
                      <strong className="text-blue-700 font-bold">{moduloSeleccionadoParaVincular.nombre_modulo}</strong>
                    </span>
                  ) : (
                    <span>Elige una parte de la lista para continuar</span>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowLinkModModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={vincularModMut.isPending || !linkModId || yaVinculadosModulosIds.has(Number(linkModId))}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  >
                    {vincularModMut.isPending ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Vinculando...</span>
                      </>
                    ) : (
                      <span>Vincular Parte al Equipo</span>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL FROSTED CONFIRMACIÓN DESVINCULAR PARTE */}
      {deletingModuloTem && selectedArquetipo && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-2xs">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  ¿Quitar "{deletingModuloTem.modulo.nombre_modulo}"?
                </h4>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Esta parte y sus campos técnicos configurados ya no se requerirán en la plantilla de{' '}
                  <strong className="text-slate-700">
                    {selectedArquetipo.nombre_canonico || selectedArquetipo.nombre_tipo}
                  </strong>.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  type="button"
                  disabled={desvincularModMut.isPending}
                  onClick={() => setDeletingModuloTem(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={desvincularModMut.isPending}
                  onClick={async () => {
                    await desvincularModMut.mutateAsync({
                      idTipoEquipo: selectedArquetipo.id_tipo_equipo,
                      idModulo: deletingModuloTem.modulo.id_modulo,
                    });
                    setDeletingModuloTem(null);
                  }}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold disabled:opacity-50 inline-flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  {desvincularModMut.isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Desvinculando...</span>
                    </>
                  ) : (
                    <span>Sí, Quitar Parte</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL AGREGAR PLAN PREVENTIVO */}
      {showPlanModal && selectedArquetipo && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-emerald-50/40">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                  <CalendarClock className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900">
                    Configurar Plan Preventivo
                  </h4>
                  <p className="text-xs text-slate-500">
                    Asociar protocolo de servicio periódico a {selectedArquetipo.nombre_tipo}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPlanModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              {/* 1. SELECCIÓN DE PROTOCOLO / TIPO DE SERVICIO */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800">
                    1. Protocolo o Tipo de Servicio *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowCreateSrvInline(!showCreateSrvInline)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>{showCreateSrvInline ? 'Ocultar Creador' : '+ Crear Nuevo Tipo de Servicio'}</span>
                  </button>
                </div>

                {/* FORMULARIO INLINE CREAR SERVICIO SI SE ACTIVA */}
                {showCreateSrvInline && (
                  <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-blue-600" />
                        Crear Nuevo Tipo de Servicio para {selectedArquetipo.nombre_tipo}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowCreateSrvInline(false)}
                        className="text-xs text-slate-400 hover:text-slate-600"
                      >
                        Cerrar
                      </button>
                    </div>

                    {srvInlineError && (
                      <div className="p-2.5 rounded-lg bg-red-50 text-red-700 text-xs border border-red-200">
                        {srvInlineError}
                      </div>
                    )}

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Nombre del Servicio *
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: Visita de Inspección y Limpieza de Serpentines"
                        value={newSrvForm.nombre_tipo}
                        onChange={(e) => {
                          const nombre = e.target.value;
                          const auto = isAutoCodigoSrv
                            ? generarCodigoTipoServicio(nombre, newSrvForm.categoria, codigosServiciosExistentes, selectedArquetipo?.codigo_tipo)
                            : newSrvForm.codigo_tipo;
                          setNewSrvForm({
                            ...newSrvForm,
                            nombre_tipo: nombre,
                            codigo_tipo: auto,
                          });
                        }}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white font-medium"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-bold text-slate-600">
                            Código / Prefijo *
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              const nuevoModo = !isAutoCodigoSrv;
                              setIsAutoCodigoSrv(nuevoModo);
                              if (nuevoModo) {
                                const auto = generarCodigoTipoServicio(
                                  newSrvForm.nombre_tipo,
                                  newSrvForm.categoria,
                                  codigosServiciosExistentes,
                                  selectedArquetipo?.codigo_tipo,
                                );
                                setNewSrvForm((prev) => ({ ...prev, codigo_tipo: auto }));
                              }
                            }}
                            className="text-[10px] text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            {isAutoCodigoSrv ? <Unlock className="h-2.5 w-2.5" /> : <Lock className="h-2.5 w-2.5" />}
                            <span>{isAutoCodigoSrv ? 'Personalizar' : 'Auto'}</span>
                          </button>
                        </div>
                        <input
                          type="text"
                          disabled={isAutoCodigoSrv}
                          placeholder="Ej: HVAC_INSP_MENS"
                          value={newSrvForm.codigo_tipo}
                          onChange={(e) =>
                            setNewSrvForm({
                              ...newSrvForm,
                              codigo_tipo: e.target.value.toUpperCase().replace(/\s+/g, '_'),
                            })
                          }
                          className={`w-full px-3 py-1.5 rounded-lg border text-xs font-mono uppercase transition-colors disabled:bg-slate-100 disabled:text-slate-600 ${
                            isCodigoSrvDuplicado
                              ? 'border-rose-400 bg-rose-50/20 text-rose-900 focus:ring-rose-500'
                              : 'border-slate-300 bg-white'
                          }`}
                        />
                        {isCodigoSrvDuplicado ? (
                          <p className="text-[10px] text-rose-600 font-bold mt-1">
                            ✕ Código duplicado. Modifícalo.
                          </p>
                        ) : newSrvForm.codigo_tipo ? (
                          <p className="text-[10px] text-emerald-600 font-medium mt-1">
                            ✓ Código único disponible
                          </p>
                        ) : null}
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Categoría *
                        </label>
                        <EamSelect
                          size="sm"
                          value={newSrvForm.categoria}
                          onChange={(cat) => {
                            const auto = isAutoCodigoSrv
                              ? generarCodigoTipoServicio(newSrvForm.nombre_tipo, cat, codigosServiciosExistentes, selectedArquetipo?.codigo_tipo)
                              : newSrvForm.codigo_tipo;
                            setNewSrvForm({
                              ...newSrvForm,
                              categoria: cat,
                              codigo_tipo: auto,
                            });
                          }}
                          options={[
                            { value: 'PREVENTIVO', label: 'Preventivo' },
                            { value: 'INSPECCION', label: 'Inspección / Rutina' },
                            { value: 'DIAGNOSTICO', label: 'Diagnóstico Técnico' },
                            { value: 'CORRECTIVO', label: 'Correctivo Programado' },
                            { value: 'ESPECIALIZADO', label: 'Especializado' },
                          ]}
                          placeholder="Categoría..."
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        disabled={creatingSrv}
                        onClick={handleCreateTipoServicioInline}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
                      >
                        {creatingSrv ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                        <span>Guardar y Seleccionar Servicio</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* VISTA DEL SERVICIO: SI YA ESTÁ SELECCIONADO, SE MUESTRA SOLO EL SELECCIONADO (SENIOR PREMIUM) */}
                {servicioPlanSeleccionado && !isCambiarSrvPlan ? (
                  <div className="relative overflow-hidden rounded-2xl border-2 border-emerald-500 bg-gradient-to-br from-emerald-50/70 via-white to-slate-50 p-4 shadow-sm animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-200">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-black text-slate-900">
                              {servicioPlanSeleccionado.nombre_tipo}
                            </h4>
                            <span className="font-mono text-xs font-bold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded-md shadow-2xs">
                              {servicioPlanSeleccionado.codigo_tipo}
                            </span>
                            {selectedArquetipo.id_tipo_equipo &&
                            servicioPlanSeleccionado.id_tipo_equipo === selectedArquetipo.id_tipo_equipo ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-200 shadow-2xs">
                                ★ Específico de este equipo
                              </span>
                            ) : servicioPlanSeleccionado.id_tipo_equipo == null ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                Universal
                              </span>
                            ) : null}
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getCategoriaBadge(servicioPlanSeleccionado.categoria).bg}`}
                            >
                              {getCategoriaBadge(servicioPlanSeleccionado.categoria).label}
                            </span>
                          </div>

                          {servicioPlanSeleccionado.descripcion && (
                            <p className="text-xs text-slate-600 line-clamp-2">
                              {servicioPlanSeleccionado.descripcion}
                            </p>
                          )}

                          <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-500">
                            {servicioPlanSeleccionado.tiene_checklist && (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                                Checklist técnico activo
                              </span>
                            )}
                            {servicioPlanSeleccionado.duracion_estimada_horas && (
                              <span className="inline-flex items-center gap-1 text-slate-500">
                                <Clock className="h-3.5 w-3.5 text-slate-400" />
                                Est: {servicioPlanSeleccionado.duracion_estimada_horas}h
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsCambiarSrvPlan(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 hover:border-emerald-600 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 text-xs font-bold transition-all shadow-2xs hover:shadow-sm shrink-0 cursor-pointer"
                        title="Elegir otro protocolo del catálogo"
                      >
                        <RotateCw className="h-3.5 w-3.5 text-slate-500" />
                        <span>Cambiar Servicio</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {isCambiarSrvPlan && servicioPlanSeleccionado && (
                      <div className="flex items-center justify-between pb-1">
                        <span className="text-xs font-bold text-slate-700">
                          Selecciona otro servicio del catálogo:
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsCambiarSrvPlan(false)}
                          className="text-xs font-semibold text-slate-500 hover:text-slate-800 underline cursor-pointer"
                        >
                          Mantener actual
                        </button>
                      </div>
                    )}

                    {/* BUSCADOR Y PÍLDORAS DE CATEGORÍA */}
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Buscar por nombre, código (ej: Inspección, HVAC, Preventivo, Bomba)..."
                          value={planSearch}
                          onChange={(e) => setPlanSearch(e.target.value)}
                          className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:border-blue-500 transition-colors"
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {[
                          { key: 'TODOS', label: `Todos (${todosLosServicios.length})` },
                          { key: 'INSPECCION', label: 'Inspección' },
                          { key: 'PREVENTIVO', label: 'Preventivo' },
                          { key: 'CORRECTIVO', label: 'Correctivo' },
                          { key: 'DIAGNOSTICO', label: 'Diagnóstico' },
                        ].map((cat) => (
                          <button
                            key={cat.key}
                            type="button"
                            onClick={() => setPlanCatFilter(cat.key)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                              planCatFilter === cat.key
                                ? 'bg-slate-900 text-white border-slate-900'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {cat.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* LISTA DE SERVICIOS SELECCIONABLES */}
                    <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 bg-white shadow-inner">
                      {serviciosFiltrados.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400">
                          No se encontraron servicios que coincidan con la búsqueda.
                        </div>
                      ) : (
                        serviciosFiltrados.map((s) => {
                          const isSelected = String(s.id_tipo_servicio) === planForm.id_tipo_servicio;
                          const esEspecifico =
                            selectedArquetipo.id_tipo_equipo &&
                            s.id_tipo_equipo === selectedArquetipo.id_tipo_equipo;
                          const badgeCat = getCategoriaBadge(s.categoria);
                          return (
                            <div
                              key={s.id_tipo_servicio}
                              onClick={() => {
                                const isInsp =
                                  s.codigo_tipo === 'INSPECCION' ||
                                  s.nombre_tipo?.toLowerCase().includes('inspecci');
                                setPlanForm({
                                  ...planForm,
                                  id_tipo_servicio: String(s.id_tipo_servicio),
                                  nombre_plan: construirNombrePlan(s),
                                  frecuencia_dias: isInsp ? '30' : '90',
                                  frecuencia_uso: isInsp ? '100' : '250',
                                });
                                setIsCambiarSrvPlan(false);
                              }}
                              className={`p-3 cursor-pointer flex items-center justify-between gap-3 transition-colors ${
                                isSelected
                                  ? 'bg-emerald-50/70 border-l-4 border-l-emerald-600'
                                  : 'hover:bg-slate-50'
                              }`}
                            >
                              <div className="space-y-0.5 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span
                                    className={`text-xs font-bold ${
                                      isSelected ? 'text-emerald-950 font-black' : 'text-slate-800'
                                    }`}
                                  >
                                    {s.nombre_tipo}
                                  </span>
                                  <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                    {s.codigo_tipo}
                                  </span>
                                  {esEspecifico && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                                      ★ Específico de este equipo
                                    </span>
                                  )}
                                  {s.id_tipo_equipo == null && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                                      Universal
                                    </span>
                                  )}
                                </div>
                                {s.descripcion && (
                                  <p className="text-[11px] text-slate-500 truncate max-w-md">
                                    {s.descripcion}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badgeCat.bg}`}
                                >
                                  {badgeCat.label}
                                </span>
                                <div
                                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                    isSelected
                                      ? 'border-emerald-600 bg-emerald-600 text-white'
                                      : 'border-slate-300'
                                  }`}
                                >
                                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 2. NOMBRE DEL PLAN */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  2. Nombre del Plan de Mantenimiento *
                </label>
                <input
                  type="text"
                  required
                  value={planForm.nombre_plan}
                  onChange={(e) => setPlanForm({ ...planForm, nombre_plan: e.target.value })}
                  placeholder="Ej: Plan de Visita de Inspección cada 30 días / 100 horas"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Nombre descriptivo que verá el técnico y el cliente en la agenda de OTs.
                </p>
              </div>

              {/* 3. FRECUENCIAS */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Cada cuántos Días *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={planForm.frecuencia_dias}
                    onChange={(e) => setPlanForm({ ...planForm, frecuencia_dias: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono text-sm bg-white"
                  />
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="text-[10px] text-slate-400">Atajos:</span>
                    {[
                      { label: '30 d (Mes)', val: '30' },
                      { label: '60 d (Bim)', val: '60' },
                      { label: '90 d (Trim)', val: '90' },
                      { label: '180 d (Sem)', val: '180' },
                    ].map((shortcut) => (
                      <button
                        key={shortcut.val}
                        type="button"
                        onClick={() => setPlanForm({ ...planForm, frecuencia_dias: shortcut.val })}
                        className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-200 hover:bg-slate-300 text-slate-700"
                      >
                        {shortcut.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Cada cuántos {selectedArquetipo.etiqueta_contador || 'Horas de Uso'} ({selectedArquetipo.unidad_uso || 'HORAS'}) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={planForm.frecuencia_uso}
                    onChange={(e) => setPlanForm({ ...planForm, frecuencia_uso: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono text-sm bg-white"
                  />
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="text-[10px] text-slate-400">Atajos:</span>
                    {[
                      { label: `100 ${selectedArquetipo.unidad_uso || 'h'}`, val: '100' },
                      { label: `250 ${selectedArquetipo.unidad_uso || 'h'}`, val: '250' },
                      { label: `500 ${selectedArquetipo.unidad_uso || 'h'}`, val: '500' },
                      { label: `1000 ${selectedArquetipo.unidad_uso || 'h'}`, val: '1000' },
                    ].map((shortcut) => (
                      <button
                        key={shortcut.val}
                        type="button"
                        onClick={() => setPlanForm({ ...planForm, frecuencia_uso: shortcut.val })}
                        className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-200 hover:bg-slate-300 text-slate-700"
                      >
                        {shortcut.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 4. REGLA DE DISPARO */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Regla de Activación del Mantenimiento
                </label>
                <EamSelect
                  value={planForm.criterio_intervalo}
                  onChange={(val) =>
                    setPlanForm({ ...planForm, criterio_intervalo: val })
                  }
                  options={[
                    {
                      value: 'LO_QUE_OCURRA_PRIMERO',
                      label: `⚡ Lo que ocurra primero (Días o ${selectedArquetipo.etiqueta_contador || 'Horas de uso'}) - Recomendado`,
                    },
                    { value: 'DIAS', label: '📅 Solo por Calendario (Días transcurridos)' },
                    { value: 'HORAS', label: `⏱️ Solo por Uso (${selectedArquetipo.etiqueta_contador || 'Horas registradas'})` },
                  ]}
                  placeholder="Seleccionar regla..."
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="text-xs text-slate-500">
                {planForm.id_tipo_servicio ? (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Servicio seleccionado listo
                  </span>
                ) : (
                  <span className="text-amber-600 font-semibold">
                    ⚠️ Selecciona un protocolo de la lista
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowPlanModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={
                    !planForm.id_tipo_servicio ||
                    !planForm.nombre_plan.trim() ||
                    createPlanMut.isPending
                  }
                  onClick={handleSavePlan}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm disabled:opacity-50 transition-colors"
                >
                  {createPlanMut.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  <span>Guardar Plan Preventivo</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CREAR CAMPO RÁPIDO DESDE TIPO DE EQUIPO */}
      {showInPlaceModal && selectedArquetipo && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-indigo-600 text-white">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                <h4 className="text-sm font-bold">
                  Crear Nuevo Campo Técnico para {selectedArquetipo.nombre_canonico || selectedArquetipo.nombre_tipo}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowInPlaceModal(false)}
                className="p-1.5 rounded-lg text-white/80 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSaveInPlaceFromArq} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ¿A qué Parte / Subsistema pertenece este campo? *
                </label>
                <EamSelect
                  value={inPlaceForm.codigo_modulo}
                  onChange={(val) =>
                    setInPlaceForm({ ...inPlaceForm, codigo_modulo: val })
                  }
                  options={selectedArquetipo.tipo_equipo_modulos.map((tem) => ({
                    value: tem.modulo.codigo_modulo,
                    label: tem.modulo.nombre_modulo,
                  }))}
                  placeholder="Seleccionar parte..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre del Campo Técnico *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Caudal Nominal de Operación"
                  value={inPlaceForm.nombre_atributo}
                  onChange={(e) => {
                    const nombre = e.target.value;
                    const auto = isAutoCodigoAtributo
                      ? generarCodigoCampoTecnico(
                          nombre,
                          codigosAtributosExistentes,
                          inPlaceForm.unidad_defecto_codigo || undefined,
                        )
                      : inPlaceForm.codigo_atributo;
                    setInPlaceForm({
                      ...inPlaceForm,
                      nombre_atributo: nombre,
                      codigo_atributo: auto,
                    });
                  }}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tipo de Dato *
                  </label>
                  <EamSelect
                    value={inPlaceForm.tipo_control}
                    onChange={(val) =>
                      setInPlaceForm({ ...inPlaceForm, tipo_control: val })
                    }
                    options={TIPOS_CONTROL_HUMANOS.map((t) => ({
                      value: t.value,
                      label: `${t.iconSymbol} ${t.shortLabel}`,
                    }))}
                    placeholder="Tipo de dato..."
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      Código Identificador *
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const nuevoModo = !isAutoCodigoAtributo;
                        setIsAutoCodigoAtributo(nuevoModo);
                        if (nuevoModo) {
                          const auto = generarCodigoCampoTecnico(
                            inPlaceForm.nombre_atributo,
                            codigosAtributosExistentes,
                            inPlaceForm.unidad_defecto_codigo || undefined,
                          );
                          setInPlaceForm((prev) => ({ ...prev, codigo_atributo: auto }));
                        }
                      }}
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      {isAutoCodigoAtributo ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                      <span>{isAutoCodigoAtributo ? 'Personalizar' : 'Auto'}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    disabled={isAutoCodigoAtributo}
                    placeholder="Ej: caudal_nominal_operacion"
                    value={inPlaceForm.codigo_atributo}
                    onChange={(e) =>
                      setInPlaceForm({
                        ...inPlaceForm,
                        codigo_atributo: e.target.value.toLowerCase().replace(/\s+/g, '_'),
                      })
                    }
                    className={`w-full px-3.5 py-2 rounded-xl border font-mono text-xs transition-colors disabled:bg-slate-100 disabled:text-slate-600 ${
                      isCodigoAtributoDuplicado
                        ? 'border-rose-400 bg-rose-50/20 text-rose-900 focus:ring-rose-500'
                        : 'border-slate-300'
                    }`}
                  />
                  {isCodigoAtributoDuplicado ? (
                    <p className="text-[11px] text-rose-600 font-bold mt-1 flex items-center gap-1">
                      ✕ Código ya existente. Modifícalo.
                    </p>
                  ) : inPlaceForm.codigo_atributo ? (
                    <p className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
                      ✓ Código único disponible
                    </p>
                  ) : null}
                </div>
              </div>

              {inPlaceForm.tipo_control === 'NUMERICO_MAGNITUD' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Magnitud de Medida
                  </label>
                  <EamSelect
                    value={inPlaceForm.id_magnitud}
                    onChange={(idMag) => {
                      const mag = magnitudes.find((m) => String(m.id_magnitud) === idMag);
                      const nuevaU = mag?.unidad_base_codigo || '';
                      const auto = isAutoCodigoAtributo
                        ? generarCodigoCampoTecnico(
                            inPlaceForm.nombre_atributo,
                            codigosAtributosExistentes,
                            nuevaU || undefined,
                          )
                        : inPlaceForm.codigo_atributo;
                      setInPlaceForm({
                        ...inPlaceForm,
                        id_magnitud: idMag,
                        unidad_defecto_codigo: nuevaU,
                        codigo_atributo: auto,
                      });
                    }}
                    options={[
                      { value: '', label: '-- Seleccionar Magnitud --' },
                      ...magnitudes.map((m) => ({
                        value: String(m.id_magnitud),
                        label: `${m.nombre_magnitud} (Unidad base: ${m.unidad_base_codigo})`,
                        badge: m.unidad_base_codigo,
                      })),
                    ]}
                    placeholder="-- Seleccionar Magnitud --"
                    searchable
                  />
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowInPlaceModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={
                    isCodigoAtributoDuplicado ||
                    !inPlaceForm.nombre_atributo.trim() ||
                    !inPlaceForm.codigo_atributo.trim()
                  }
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Crear y Asignar Campo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
