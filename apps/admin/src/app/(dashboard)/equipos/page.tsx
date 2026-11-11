/**
 * PÁGINA DE GESTIÓN DE EQUIPOS (PARQUE DE ACTIVOS INDUSTRIALES EAM) - MEKANOS S.A.S
 *
 * Ruta: /equipos
 * Estándar: Industrial Corporate Light Mode (Zero-Trust EAM 360° - Fase 4)
 * - 4 Tarjetas KPI ejecutivas del parque instalado
 * - Selector dinámico de Tipos de Equipo conectado al Hub EAM Universal
 * - Panel desplegable 🎛️ Filtros Técnicos conectado al índice B-Tree (equipos_atributos_filtro)
 *   con conversión matemática de unidades SI (y = ax + b) en vivo
 * - Tarjetas enriquecidas con KPIs técnicos polimórficos desde especificaciones JSONB + satélites
 * - Enlace directo al expediente del cliente (/clientes/[id]) y al expediente 360° (/equipos/[id])
 */

'use client';

import {
  getModuloBadgeInfo,
  getTipoControlHumano,
  parseOpcionesSeguras,
  useArquetiposEam,
  useMagnitudesEam,
  useModulosEam,
} from '@/features/catalogos-eam';
import dynamic from 'next/dynamic';
import type { EquipoListItem, TipoEquipo } from '@/features/equipos/types';
import {
  useEliminarEquipoCompletamente,
  useEquipos,
  useFacetasEquipos,
} from '@/features/equipos/lib/equipos.service';

const EquipoForm = dynamic(
  () => import('@/features/equipos/components/EquipoForm').then((m) => m.EquipoForm),
  {
    ssr: false,
    loading: () => (
      <div className="py-10 text-center text-sm text-slate-500">Cargando formulario...</div>
    ),
  },
);
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Droplets,
  Edit,
  Eye,
  Factory,
  Gauge,
  Grid3X3,
  Layers,
  List,
  MapPin,
  MoreVertical,
  Plus,
  RefreshCw,
  Scale,
  Search,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Timer,
  Trash2,
  Wind,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EamSelect } from '@/components/ui/eam-select';

// ═══════════════════════════════════════════════════════════════════════════════
// CATÁLOGO BASE DE CAMPOS FILTRABLES B-TREE (Respaldo Instantáneo + Fusión Hub)
// ═══════════════════════════════════════════════════════════════════════════════

interface CampoFiltrableBTree {
  codigo_atributo: string;
  nombre_atributo: string;
  tipo_control: 'NUMERICO_MAGNITUD' | 'NUMERICO_PURO' | 'TEXTO_CORTO' | 'SELECTOR' | 'BOOLEANO';
  codigo_modulo: string;
  nombre_modulo: string;
  magnitud_codigo?: string;
  unidad_defecto?: string;
  unidades_disponibles: Array<{ codigo: string; simbolo: string; nombre: string }>;
  opciones_sugeridas?: Array<{ value: string; label: string }>;
  aplica_tipos?: string[];
}

const UNIDADES_POR_MAGNITUD_FALLBACK: Record<
  string,
  Array<{ codigo: string; simbolo: string; nombre: string }>
> = {
  POTENCIA: [
    { codigo: 'KVA', simbolo: 'kVA', nombre: 'Kilovoltiamperios (kVA)' },
    { codigo: 'KW', simbolo: 'kW', nombre: 'Kilovatios (kW)' },
    { codigo: 'HP', simbolo: 'HP', nombre: 'Caballos de Fuerza (HP)' },
    { codigo: 'CV', simbolo: 'CV', nombre: 'Caballos de Vapor (CV)' },
    { codigo: 'W', simbolo: 'W', nombre: 'Vatios (W)' },
  ],
  CAUDAL: [
    { codigo: 'M3H', simbolo: 'm³/h', nombre: 'Metros Cúbicos por Hora (m³/h)' },
    { codigo: 'GPM', simbolo: 'GPM', nombre: 'Galones por Minuto (GPM)' },
    { codigo: 'LPS', simbolo: 'L/s', nombre: 'Litros por Segundo (L/s)' },
    { codigo: 'LPM', simbolo: 'L/min', nombre: 'Litros por Minuto (L/min)' },
    { codigo: 'CFM', simbolo: 'CFM', nombre: 'Pies Cúbicos por Minuto (CFM)' },
  ],
  PRESION: [
    { codigo: 'PSI', simbolo: 'PSI', nombre: 'Libras por Pulgada Cuadrada (PSI)' },
    { codigo: 'BAR', simbolo: 'bar', nombre: 'Bares (bar)' },
    { codigo: 'MCA', simbolo: 'm.c.a.', nombre: 'Metros Columna de Agua (MCA)' },
    { codigo: 'KPA', simbolo: 'kPa', nombre: 'Kilopascales (kPa)' },
  ],
  LONGITUD: [
    { codigo: 'MET', simbolo: 'm', nombre: 'Metros (m)' },
    { codigo: 'CM', simbolo: 'cm', nombre: 'Centímetros (cm)' },
    { codigo: 'MM', simbolo: 'mm', nombre: 'Milímetros (mm)' },
    { codigo: 'IN', simbolo: 'in', nombre: 'Pulgadas (in)' },
  ],
  VOLUMEN: [
    { codigo: 'L', simbolo: 'L', nombre: 'Litros (L)' },
    { codigo: 'GAL', simbolo: 'gal', nombre: 'Galones US (gal)' },
    { codigo: 'ML', simbolo: 'mL', nombre: 'Mililitros (mL)' },
  ],
  FRECUENCIA_VELOCIDAD: [
    { codigo: 'RPM', simbolo: 'RPM', nombre: 'Revoluciones por Minuto (RPM)' },
    { codigo: 'HZ', simbolo: 'Hz', nombre: 'Hercios (Hz)' },
  ],
  ELECTRICA_TENSION: [
    { codigo: 'VAC', simbolo: 'VAC', nombre: 'Voltios Corriente Alterna (VAC)' },
    { codigo: 'VDC', simbolo: 'VDC', nombre: 'Voltios Corriente Directa (VDC)' },
    { codigo: 'V', simbolo: 'V', nombre: 'Voltios (V)' },
  ],
};

const CAMPOS_BTREE_CANONICOS: CampoFiltrableBTree[] = [
  {
    codigo_atributo: 'potencia_kva',
    nombre_atributo: 'Potencia Aparente (kVA)',
    tipo_control: 'NUMERICO_MAGNITUD',
    codigo_modulo: 'alternador_generador',
    nombre_modulo: 'Alternador / Generador',
    magnitud_codigo: 'POTENCIA',
    unidad_defecto: 'KVA',
    unidades_disponibles: UNIDADES_POR_MAGNITUD_FALLBACK.POTENCIA,
    aplica_tipos: ['GENERADOR'],
  },
  {
    codigo_atributo: 'potencia_kw',
    nombre_atributo: 'Potencia Activa / Nominal (kW)',
    tipo_control: 'NUMERICO_MAGNITUD',
    codigo_modulo: 'alternador_generador',
    nombre_modulo: 'Alternador / Generador',
    magnitud_codigo: 'POTENCIA',
    unidad_defecto: 'KW',
    unidades_disponibles: UNIDADES_POR_MAGNITUD_FALLBACK.POTENCIA,
    aplica_tipos: ['GENERADOR', 'MOTOR'],
  },
  {
    codigo_atributo: 'potencia_motor_hp',
    nombre_atributo: 'Potencia Mecánica del Motor (HP)',
    tipo_control: 'NUMERICO_MAGNITUD',
    codigo_modulo: 'motor_combustion',
    nombre_modulo: 'Motor de Combustión',
    magnitud_codigo: 'POTENCIA',
    unidad_defecto: 'HP',
    unidades_disponibles: UNIDADES_POR_MAGNITUD_FALLBACK.POTENCIA,
    aplica_tipos: ['GENERADOR', 'BOMBA', 'MOTOR'],
  },
  {
    codigo_atributo: 'potencia_hp_electrico',
    nombre_atributo: 'Potencia Motor Eléctrico (HP)',
    tipo_control: 'NUMERICO_MAGNITUD',
    codigo_modulo: 'motor_electrico',
    nombre_modulo: 'Motor Eléctrico',
    magnitud_codigo: 'POTENCIA',
    unidad_defecto: 'HP',
    unidades_disponibles: UNIDADES_POR_MAGNITUD_FALLBACK.POTENCIA,
    aplica_tipos: ['BOMBA', 'COMPRESOR', 'MOTOR'],
  },
  {
    codigo_atributo: 'caudal_maximo_m3h',
    nombre_atributo: 'Caudal Máximo de Bombeo',
    tipo_control: 'NUMERICO_MAGNITUD',
    codigo_modulo: 'bomba_hidraulica',
    nombre_modulo: 'Bomba Hidráulica',
    magnitud_codigo: 'CAUDAL',
    unidad_defecto: 'M3H',
    unidades_disponibles: UNIDADES_POR_MAGNITUD_FALLBACK.CAUDAL,
    aplica_tipos: ['BOMBA'],
  },
  {
    codigo_atributo: 'altura_manometrica_max_m',
    nombre_atributo: 'Altura Manométrica / Presión (MCA)',
    tipo_control: 'NUMERICO_MAGNITUD',
    codigo_modulo: 'bomba_hidraulica',
    nombre_modulo: 'Bomba Hidráulica',
    magnitud_codigo: 'LONGITUD',
    unidad_defecto: 'MET',
    unidades_disponibles: UNIDADES_POR_MAGNITUD_FALLBACK.LONGITUD,
    aplica_tipos: ['BOMBA'],
  },
  {
    codigo_atributo: 'presion_maxima_psi',
    nombre_atributo: 'Presión Máxima de Trabajo',
    tipo_control: 'NUMERICO_MAGNITUD',
    codigo_modulo: 'compresor_industrial',
    nombre_modulo: 'Compresor / Hidráulica',
    magnitud_codigo: 'PRESION',
    unidad_defecto: 'PSI',
    unidades_disponibles: UNIDADES_POR_MAGNITUD_FALLBACK.PRESION,
    aplica_tipos: ['COMPRESOR', 'BOMBA'],
  },
  {
    codigo_atributo: 'caudal_aire_cfm',
    nombre_atributo: 'Caudal de Aire Comprimido (CFM)',
    tipo_control: 'NUMERICO_MAGNITUD',
    codigo_modulo: 'compresor_industrial',
    nombre_modulo: 'Compresor de Aire',
    magnitud_codigo: 'CAUDAL',
    unidad_defecto: 'CFM',
    unidades_disponibles: UNIDADES_POR_MAGNITUD_FALLBACK.CAUDAL,
    aplica_tipos: ['COMPRESOR'],
  },
  {
    codigo_atributo: 'capacidad_aceite_l',
    nombre_atributo: 'Capacidad de Aceite Lubricante',
    tipo_control: 'NUMERICO_MAGNITUD',
    codigo_modulo: 'motor_combustion',
    nombre_modulo: 'Motor de Combustión',
    magnitud_codigo: 'VOLUMEN',
    unidad_defecto: 'L',
    unidades_disponibles: UNIDADES_POR_MAGNITUD_FALLBACK.VOLUMEN,
    aplica_tipos: ['GENERADOR', 'MOTOR'],
  },
  {
    codigo_atributo: 'capacidad_tanque_l',
    nombre_atributo: 'Capacidad Tanque de Combustible',
    tipo_control: 'NUMERICO_MAGNITUD',
    codigo_modulo: 'alternador_generador',
    nombre_modulo: 'Alternador / Generador',
    magnitud_codigo: 'VOLUMEN',
    unidad_defecto: 'L',
    unidades_disponibles: UNIDADES_POR_MAGNITUD_FALLBACK.VOLUMEN,
    aplica_tipos: ['GENERADOR'],
  },
  {
    codigo_atributo: 'marca_motor',
    nombre_atributo: 'Marca del Motor Impulsor',
    tipo_control: 'TEXTO_CORTO',
    codigo_modulo: 'motor_combustion',
    nombre_modulo: 'Motor (Combustión / Eléctrico)',
    unidades_disponibles: [],
    opciones_sugeridas: [
      { value: 'CUMMINS', label: 'CUMMINS' },
      { value: 'PERKINS', label: 'PERKINS' },
      { value: 'CATERPILLAR', label: 'CATERPILLAR' },
      { value: 'JOHN DEERE', label: 'JOHN DEERE' },
      { value: 'VOLVO PENTA', label: 'VOLVO PENTA' },
      { value: 'WEG', label: 'WEG' },
      { value: 'SIEMENS', label: 'SIEMENS' },
      { value: 'BALDOR', label: 'BALDOR' },
    ],
  },
  {
    codigo_atributo: 'marca_generador',
    nombre_atributo: 'Marca del Generador / Alternador',
    tipo_control: 'TEXTO_CORTO',
    codigo_modulo: 'alternador_generador',
    nombre_modulo: 'Alternador / Generador',
    unidades_disponibles: [],
    opciones_sugeridas: [
      { value: 'STAMFORD', label: 'STAMFORD' },
      { value: 'MARATHON', label: 'MARATHON' },
      { value: 'LEROY SOMER', label: 'LEROY SOMER' },
      { value: 'MECC ALTE', label: 'MECC ALTE' },
      { value: 'CUMMINS', label: 'CUMMINS' },
      { value: 'CATERPILLAR', label: 'CATERPILLAR' },
    ],
    aplica_tipos: ['GENERADOR'],
  },
  {
    codigo_atributo: 'marca_bomba',
    nombre_atributo: 'Marca de la Bomba Hidráulica',
    tipo_control: 'TEXTO_CORTO',
    codigo_modulo: 'bomba_hidraulica',
    nombre_modulo: 'Bomba Hidráulica',
    unidades_disponibles: [],
    opciones_sugeridas: [
      { value: 'BARNES', label: 'BARNES' },
      { value: 'GOULDS', label: 'GOULDS' },
      { value: 'PEDROLLO', label: 'PEDROLLO' },
      { value: 'IHM', label: 'IHM' },
      { value: 'HIDROMAC', label: 'HIDROMAC' },
      { value: 'PENTAIR', label: 'PENTAIR' },
      { value: 'GRUNDFOS', label: 'GRUNDFOS' },
    ],
    aplica_tipos: ['BOMBA'],
  },
  {
    codigo_atributo: 'marca_compresor',
    nombre_atributo: 'Marca del Compresor',
    tipo_control: 'TEXTO_CORTO',
    codigo_modulo: 'compresor_industrial',
    nombre_modulo: 'Compresor de Aire',
    unidades_disponibles: [],
    opciones_sugeridas: [
      { value: 'INGERSOLL RAND', label: 'INGERSOLL RAND' },
      { value: 'ATLAS COPCO', label: 'ATLAS COPCO' },
      { value: 'KAESER', label: 'KAESER' },
      { value: 'SCHULZ', label: 'SCHULZ' },
      { value: 'SULLAIR', label: 'SULLAIR' },
    ],
    aplica_tipos: ['COMPRESOR'],
  },
  {
    codigo_atributo: 'tipo_combustible',
    nombre_atributo: 'Tipo de Combustible',
    tipo_control: 'SELECTOR',
    codigo_modulo: 'motor_combustion',
    nombre_modulo: 'Motor de Combustión',
    unidades_disponibles: [],
    opciones_sugeridas: [
      { value: 'DIESEL', label: 'Diésel (ACPM)' },
      { value: 'GASOLINA', label: 'Gasolina' },
      { value: 'GAS_NATURAL', label: 'Gas Natural' },
      { value: 'GLP', label: 'Gas GLP' },
    ],
    aplica_tipos: ['GENERADOR', 'MOTOR'],
  },
  {
    codigo_atributo: 'tipo_bomba',
    nombre_atributo: 'Tipo Constructivo de Bomba',
    tipo_control: 'SELECTOR',
    codigo_modulo: 'bomba_hidraulica',
    nombre_modulo: 'Bomba Hidráulica',
    unidades_disponibles: [],
    opciones_sugeridas: [
      { value: 'CENTRIFUGA', label: 'Centrífuga' },
      { value: 'SUMERGIBLE', label: 'Sumergible' },
      { value: 'MULTIETAPA', label: 'Multietapa' },
      { value: 'PERIFERICA', label: 'Periférica' },
    ],
    aplica_tipos: ['BOMBA'],
  },
  {
    codigo_atributo: 'tiene_cabina_insonorizada',
    nombre_atributo: '¿Tiene Cabina Insonorizada?',
    tipo_control: 'BOOLEANO',
    codigo_modulo: 'alternador_generador',
    nombre_modulo: 'Alternador / Generador',
    unidades_disponibles: [],
    aplica_tipos: ['GENERADOR'],
  },
  {
    codigo_atributo: 'tiene_avr',
    nombre_atributo: '¿Tiene Regulador Automático (AVR)?',
    tipo_control: 'BOOLEANO',
    codigo_modulo: 'alternador_generador',
    nombre_modulo: 'Alternador / Generador',
    unidades_disponibles: [],
    aplica_tipos: ['GENERADOR'],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTES AUXILIARES DE ETIQUETAS (BADGES)
// ═══════════════════════════════════════════════════════════════════════════════

function TipoBadge({
  tipo,
}: {
  tipo?:
    | TipoEquipo
    | { codigo_tipo?: string; nombre_tipo?: string; nombre?: string }
    | string
    | null;
}) {
  const raw =
    typeof tipo === 'string' ? tipo : tipo?.codigo_tipo || tipo?.nombre_tipo || tipo?.nombre || '';
  const normalized = String(raw || '')
    .toUpperCase()
    .trim();
  const fallbackLabel =
    typeof tipo === 'string'
      ? tipo
      : tipo?.nombre_tipo || tipo?.codigo_tipo || tipo?.nombre || 'Equipo';
  const config = {
    GENERADOR: {
      icon: Zap,
      color: 'bg-amber-50 text-amber-800 border-amber-200',
      label: 'Generador',
    },
    GEN: {
      icon: Zap,
      color: 'bg-amber-50 text-amber-800 border-amber-200',
      label: 'Generador',
    },
    BOMBA: {
      icon: Droplets,
      color: 'bg-blue-50 text-blue-800 border-blue-200',
      label: 'Bomba',
    },
    BOM: {
      icon: Droplets,
      color: 'bg-blue-50 text-blue-800 border-blue-200',
      label: 'Bomba',
    },
    MOTOR: {
      icon: Settings,
      color: 'bg-violet-50 text-violet-800 border-violet-200',
      label: 'Motor',
    },
    MOT: {
      icon: Settings,
      color: 'bg-violet-50 text-violet-800 border-violet-200',
      label: 'Motor',
    },
    COMPRESOR: {
      icon: Wind,
      color: 'bg-cyan-50 text-cyan-800 border-cyan-200',
      label: 'Compresor',
    },
    COMP: {
      icon: Wind,
      color: 'bg-cyan-50 text-cyan-800 border-cyan-200',
      label: 'Compresor',
    },
  }[normalized] || {
    icon: Zap,
    color: 'bg-slate-100 text-slate-700 border-slate-200',
    label: fallbackLabel,
  };

  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border whitespace-nowrap',
        config.color,
      )}
    >
      <Icon className="h-3 w-3 shrink-0" />
      {config.label}
    </span>
  );
}

function EstadoBadge({
  estado,
}: {
  estado?: string | { nombre?: string; estado?: string } | null;
}) {
  const normEstado = String(
    typeof estado === 'string' ? estado : estado?.nombre || estado?.estado || estado || '',
  ).toUpperCase();
  const colors: Record<string, string> = {
    OPERATIVO: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    STANDBY: 'bg-blue-50 text-blue-700 border-blue-200',
    INACTIVO: 'bg-slate-100 text-slate-600 border-slate-200',
    EN_REPARACION: 'bg-amber-50 text-amber-800 border-amber-200',
    FUERA_SERVICIO: 'bg-rose-50 text-rose-700 border-rose-200',
    BAJA: 'bg-slate-100 text-slate-500 border-slate-200',
  };

  const labels: Record<string, string> = {
    OPERATIVO: 'Operativo',
    STANDBY: 'Standby',
    INACTIVO: 'Inactivo',
    EN_REPARACION: 'En Reparación',
    FUERA_SERVICIO: 'Fuera de Servicio',
    BAJA: 'Baja',
  };

  return (
    <span
      className={cn(
        'px-2 py-0.5 rounded-md text-[11px] font-semibold border whitespace-nowrap',
        colors[normEstado] || 'bg-slate-100 text-slate-700 border-slate-200',
      )}
    >
      {labels[normEstado] || normEstado || 'Operativo'}
    </span>
  );
}

function CriticidadBadge({
  criticidad,
}: {
  criticidad?: string | { nombre?: string; criticidad?: string } | null;
}) {
  const normCrit = String(
    typeof criticidad === 'string'
      ? criticidad
      : criticidad?.nombre || criticidad?.criticidad || criticidad || 'MEDIA',
  ).toUpperCase();
  const config: Record<string, { color: string; dot: string }> = {
    BAJA: { color: 'text-slate-600 bg-slate-50 border-slate-200', dot: 'bg-blue-500' },
    MEDIA: { color: 'text-amber-700 bg-amber-50/60 border-amber-200', dot: 'bg-amber-500' },
    ALTA: { color: 'text-orange-700 bg-orange-50 border-orange-200', dot: 'bg-orange-500' },
    CRITICA: { color: 'text-rose-700 bg-rose-50 border-rose-200', dot: 'bg-rose-600' },
  };

  const { color, dot } = config[normCrit] || config.MEDIA;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border whitespace-nowrap',
        color,
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dot)} />
      {normCrit}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODAL CREACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-[1px]" />
        <div className="relative w-full max-w-5xl bg-white rounded-xl shadow-2xl border border-slate-200">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-slate-500" />
            </button>
          </div>
          <div className="p-6 max-h-[calc(100vh-120px)] overflow-y-auto">{children}</div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SKELETON LOADING
// ═══════════════════════════════════════════════════════════════════════════════

function EquipoCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="space-y-2">
          <div className="h-4 w-28 bg-slate-200 rounded" />
          <div className="h-5 w-44 bg-slate-200 rounded" />
        </div>
      </div>
      <div className="flex gap-2 mb-3">
        <div className="h-5 w-20 bg-slate-200 rounded" />
        <div className="h-5 w-16 bg-slate-200 rounded" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-36 bg-slate-200 rounded" />
        <div className="h-4 w-28 bg-slate-200 rounded" />
      </div>
      <div className="mt-4 pt-3 border-t border-slate-100">
        <div className="h-4 w-24 bg-slate-200 rounded ml-auto" />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TARJETA DE EQUIPO (ESTÁNDAR EAM 360° CON KPIS POLIMÓRFICOS JSONB + SATÉLITES)
// ═══════════════════════════════════════════════════════════════════════════════

function isValidTechString(val: unknown): val is string {
  if (val === null || val === undefined) return false;
  const s = String(val).trim();
  if (!s) return false;
  const upper = s.toUpperCase();
  return (
    upper !== 'GENERICO' &&
    upper !== 'GENÉRICO' &&
    upper !== 'N/A' &&
    upper !== 'NULL' &&
    upper !== '0'
  );
}

function EquipoCard({ equipo }: { equipo: EquipoListItem }) {
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showHardDeleteConfirm, setShowHardDeleteConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const hardDelete = useEliminarEquipoCompletamente();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowActionsMenu(false);
      }
    }

    if (showActionsMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showActionsMenu]);

  const handleHardDelete = async () => {
    if (confirmText !== 'ELIMINAR_EQUIPO_COMPLETAMENTE') {
      return;
    }

    try {
      await hardDelete.mutateAsync({
        id: equipo.id_equipo,
        confirmacion: confirmText,
      });
      setShowHardDeleteConfirm(false);
      setConfirmText('');
    } catch (error) {
      console.error('Error al eliminar equipo:', error);
    }
  };

  // Unificar lectura de especificaciones JSONB + datos_especificos + motor
  const specsModulos = useMemo(() => {
    const flat: Record<string, unknown> = {};
    const mods = equipo.especificaciones?.modulos;
    if (mods && typeof mods === 'object') {
      for (const mValues of Object.values(mods)) {
        if (mValues && typeof mValues === 'object') {
          Object.assign(flat, mValues);
        }
      }
    }
    if (equipo.datos_especificos && typeof equipo.datos_especificos === 'object') {
      for (const [k, v] of Object.entries(equipo.datos_especificos)) {
        if (v !== null && v !== undefined && v !== '' && flat[k] === undefined) {
          flat[k] = v;
        }
      }
    }
    return flat;
  }, [equipo.especificaciones, equipo.datos_especificos]);

  const motor = (equipo.motor ||
    (
      equipo.datos_especificos as {
        motor?: Record<string, string | number | boolean | null | undefined>;
      } | null
    )?.motor ||
    null) as Record<string, string | number | boolean | null | undefined> | null;

  // 1. KPI de Potencia (kVA / kW / HP / TR)
  const potenciaTexto = useMemo(() => {
    const capEnf = Number(
      specsModulos.capacidad_de_enfriamiento ?? specsModulos.capacidad_enfriamiento,
    );
    if (Number.isFinite(capEnf) && capEnf > 0) {
      const uom =
        equipo.especificaciones?.unidades_personalizadas?.capacidad_de_enfriamiento || 'TR';
      return `${capEnf} ${uom}`;
    }
    const kva = Number(specsModulos.potencia_kva);
    if (Number.isFinite(kva) && kva > 0) return `${kva} kVA`;
    const kw = Number(specsModulos.potencia_kw);
    if (Number.isFinite(kw) && kw > 0) return `${kw} kW`;
    const hidKw = Number(specsModulos.potencia_hidraulica_kw);
    if (Number.isFinite(hidKw) && hidKw > 0) return `${hidKw} kW`;
    const hpElec = Number(specsModulos.potencia_hp_electrico);
    if (Number.isFinite(hpElec) && hpElec > 0) return `${hpElec} HP`;
    const hpMot = Number(specsModulos.potencia_motor_hp ?? motor?.potencia_hp);
    if (Number.isFinite(hpMot) && hpMot > 0) return `${hpMot} HP`;
    const mkw = Number(motor?.potencia_kw ?? specsModulos.potencia_kw_electrico);
    if (Number.isFinite(mkw) && mkw > 0) return `${mkw} kW`;
    return null;
  }, [specsModulos, motor, equipo.especificaciones]);

  // 2. KPI de Presión / Caudal / Altura / Refrigerante
  const metricaFluidoTexto = useMemo(() => {
    const partes: string[] = [];
    const gasRef = specsModulos.gas_refrigerante;
    if (isValidTechString(gasRef)) partes.push(String(gasRef).trim());
    const psi = Number(specsModulos.presion_maxima_psi ?? specsModulos.presion_trabajo_psi);
    if (Number.isFinite(psi) && psi > 0) partes.push(`${psi} PSI`);

    const cfm = Number(specsModulos.caudal_aire_cfm);
    if (Number.isFinite(cfm) && cfm > 0) partes.push(`${cfm} CFM`);

    const m3h = Number(specsModulos.caudal_maximo_m3h);
    if (Number.isFinite(m3h) && m3h > 0) partes.push(`${m3h} m³/h`);

    const mca = Number(specsModulos.altura_manometrica_max_m);
    if (Number.isFinite(mca) && mca > 0 && partes.length < 2) partes.push(`${mca} MCA`);

    return partes.length > 0 ? partes.slice(0, 2).join(' • ') : null;
  }, [specsModulos]);

  // 3. KPI de Marca / Modelo de Subsistema (Motor, Compresor, Bomba o Generador)
  const subsistemaTexto = useMemo(() => {
    const marcaMot =
      motor?.marca_motor ?? specsModulos.marca_motor ?? specsModulos.marca_motor_electrico;
    const modMot =
      motor?.modelo_motor ?? specsModulos.modelo_motor ?? specsModulos.modelo_motor_electrico;
    if (isValidTechString(marcaMot)) {
      return isValidTechString(modMot) ? `${marcaMot.trim()} ${modMot.trim()}` : marcaMot.trim();
    }

    const marcaComp = specsModulos.marca_compresor;
    const modComp = specsModulos.modelo_compresor;
    if (isValidTechString(marcaComp)) {
      return isValidTechString(modComp)
        ? `${marcaComp.trim()} ${modComp.trim()}`
        : marcaComp.trim();
    }

    const marcaBom = specsModulos.marca_bomba;
    const modBom = specsModulos.modelo_bomba;
    if (isValidTechString(marcaBom)) {
      return isValidTechString(modBom) ? `${marcaBom.trim()} ${modBom.trim()}` : marcaBom.trim();
    }

    const marcaGen = specsModulos.marca ?? specsModulos.marca_generador;
    const modGen = specsModulos.modelo ?? specsModulos.modelo_generador;
    if (isValidTechString(marcaGen)) {
      return isValidTechString(modGen) ? `${marcaGen.trim()} ${modGen.trim()}` : marcaGen.trim();
    }

    return null;
  }, [motor, specsModulos]);

  // 4. KPI de RPM o Voltaje
  const rpmVoltajeTexto = useMemo(() => {
    const rpm = Number(
      motor?.velocidad_nominal_rpm ??
        specsModulos.velocidad_nominal_rpm ??
        specsModulos.velocidad_rpm,
    );
    if (Number.isFinite(rpm) && rpm > 0) return `${rpm} RPM`;
    const vac = specsModulos.voltaje_operacion_vac ?? specsModulos.voltaje_salida_vac;
    if (isValidTechString(vac)) return `${vac} VAC`;
    return null;
  }, [motor, specsModulos]);

  const horasNum = Number(equipo.horas_actuales || 0);

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md hover:border-blue-300 transition-all group flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-2.5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Link
                  href={`/equipos/${equipo.id_equipo}`}
                  className="font-mono text-xs font-bold text-slate-800 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 px-2 py-0.5 rounded transition-colors"
                >
                  {equipo.codigo_equipo}
                </Link>
                {equipo.numero_serie_equipo && (
                  <span
                    className="font-mono text-[11px] text-slate-400 truncate max-w-[140px]"
                    title={`S/N: ${equipo.numero_serie_equipo}`}
                  >
                    SN: {equipo.numero_serie_equipo}
                  </span>
                )}
              </div>
              <Link href={`/equipos/${equipo.id_equipo}`} className="block mt-1.5">
                <h3 className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors line-clamp-1 text-sm">
                  {equipo.nombre_equipo || 'Sin nombre'}
                </h3>
              </Link>
            </div>

            {/* Dropdown Menu */}
            <div className="relative shrink-0" ref={menuRef}>
              <button
                onClick={() => setShowActionsMenu(!showActionsMenu)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
                title="Acciones del activo"
              >
                <MoreVertical className="h-4 w-4" />
              </button>

              {showActionsMenu && (
                <div className="absolute right-0 mt-1 w-52 bg-white rounded-xl shadow-lg border border-slate-200 z-20 py-1">
                  <Link
                    href={`/equipos/${equipo.id_equipo}`}
                    className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    onClick={() => setShowActionsMenu(false)}
                  >
                    <Eye className="h-3.5 w-3.5 text-blue-600" />
                    Ver Expediente 360°
                  </Link>
                  <Link
                    href={`/equipos/${equipo.id_equipo}/editar`}
                    className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    onClick={() => setShowActionsMenu(false)}
                  >
                    <Edit className="h-3.5 w-3.5 text-slate-500" />
                    Editar Ficha Técnica
                  </Link>
                  <Link
                    href={`/ordenes/nueva?clienteId=${equipo.cliente?.id_cliente || ''}&equipoId=${equipo.id_equipo}`}
                    className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                    onClick={() => setShowActionsMenu(false)}
                  >
                    <Wrench className="h-3.5 w-3.5 text-emerald-600" />
                    Crear Orden de Servicio
                  </Link>

                  {equipo.activo === false && (
                    <button
                      onClick={() => {
                        setShowActionsMenu(false);
                        setShowHardDeleteConfirm(true);
                      }}
                      className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 w-full text-left border-t border-slate-100 mt-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Eliminar permanentemente
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-1.5 mb-3">
            <TipoBadge tipo={equipo.tipo as TipoEquipo} />
            <EstadoBadge estado={equipo.estado_equipo} />
            <CriticidadBadge criticidad={equipo.criticidad} />
            {equipo.modelo_oem && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 truncate max-w-[150px]"
                title={`Plantilla OEM: ${equipo.modelo_oem.marca} ${equipo.modelo_oem.modelo}`}
              >
                <Factory className="h-2.5 w-2.5 shrink-0" />
                <span className="truncate">
                  {equipo.modelo_oem.marca} {equipo.modelo_oem.modelo}
                </span>
              </span>
            )}
          </div>

          {/* Cliente (con enlace real) y Ubicación */}
          <div className="space-y-1.5 text-xs text-slate-600">
            <div className="flex items-center gap-2 min-w-0">
              <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              {equipo.cliente?.id_cliente ? (
                <Link
                  href={`/clientes/${equipo.cliente.id_cliente}`}
                  className="font-semibold text-slate-800 hover:text-blue-600 hover:underline truncate transition-colors"
                  title={`Ver expediente del cliente: ${equipo.cliente.nombre}`}
                >
                  {equipo.cliente.nombre}
                </Link>
              ) : (
                <span className="truncate">{equipo.cliente?.nombre || 'Sin cliente'}</span>
              )}
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="truncate text-slate-500">
                {equipo.sede?.nombre
                  ? `${equipo.sede.nombre} • ${equipo.ubicacion_texto || ''}`
                  : equipo.ubicacion_texto || 'Sin ubicación'}
              </span>
            </div>
          </div>

          {/* Franja de Especificaciones Rápidas Polimórficas (Potencia / Presión-Caudal / Marca / RPM / Horómetro) */}
          {(potenciaTexto ||
            metricaFluidoTexto ||
            subsistemaTexto ||
            rpmVoltajeTexto ||
            horasNum > 0) && (
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
              {potenciaTexto && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50/70 text-amber-900 border border-amber-200/80 rounded text-[11px] font-mono font-bold">
                  <Zap className="h-3 w-3 text-amber-600" />
                  {potenciaTexto}
                </span>
              )}
              {metricaFluidoTexto && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-cyan-50/70 text-cyan-900 border border-cyan-200/80 rounded text-[11px] font-mono font-semibold">
                  <Gauge className="h-3 w-3 text-cyan-600" />
                  {metricaFluidoTexto}
                </span>
              )}
              {subsistemaTexto && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-50 text-slate-700 border border-slate-200/80 rounded text-[11px] font-medium truncate max-w-[175px]"
                  title={`Subsistema / Marca: ${subsistemaTexto}`}
                >
                  <Settings className="h-3 w-3 text-slate-500 shrink-0" />
                  <span className="truncate">{subsistemaTexto}</span>
                </span>
              )}
              {rpmVoltajeTexto && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-50 text-slate-600 border border-slate-200/80 rounded text-[11px] font-mono">
                  <Gauge className="h-3 w-3 text-slate-400" />
                  {rpmVoltajeTexto}
                </span>
              )}
              {horasNum > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50/70 text-blue-700 border border-blue-200/70 rounded text-[11px] font-mono font-semibold">
                  <Timer className="h-3 w-3 text-blue-600" />
                  {horasNum.toLocaleString()} hrs
                </span>
              )}
            </div>
          )}
        </div>

        {/* Footer de Acciones Directas */}
        <div className="flex items-center justify-between mt-3.5 pt-3 border-t border-slate-100">
          <Link
            href={`/ordenes/nueva?clienteId=${equipo.cliente?.id_cliente || ''}&equipoId=${equipo.id_equipo}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-emerald-700 transition-colors"
            title="Programar Orden de Servicio para este equipo"
          >
            <Plus className="h-3.5 w-3.5" />
            Nueva OT
          </Link>

          <Link
            href={`/equipos/${equipo.id_equipo}`}
            className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
          >
            <Eye className="h-3.5 w-3.5" />
            Expediente 360°
          </Link>
        </div>
      </div>

      {/* Hard Delete Confirmation Modal */}
      {showHardDeleteConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-slate-900/50"
              onClick={() => setShowHardDeleteConfirm(false)}
            />
            <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200">
              <div className="flex items-center gap-3 p-6 border-b border-rose-100">
                <div className="p-3 bg-rose-100 rounded-full">
                  <AlertTriangle className="h-6 w-6 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Eliminar permanentemente</h3>
                  <p className="text-xs text-slate-600">Esta acción no se puede deshacer</p>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                    <div className="text-xs text-rose-700">
                      <p className="font-bold mb-1">¿Está seguro de eliminar este equipo?</p>
                      <p className="mb-2">Se eliminarán permanentemente:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>El equipo principal y su BOM asociado</li>
                        <li>Especificaciones de motor, generador, bomba o compresor</li>
                        <li>Historial de estados y lecturas de horómetro</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Escriba{' '}
                    <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs">
                      ELIMINAR_EQUIPO_COMPLETAMENTE
                    </span>{' '}
                    para confirmar:
                  </label>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                    placeholder="ELIMINAR_EQUIPO_COMPLETAMENTE"
                  />
                </div>
              </div>

              <div className="flex gap-3 p-6 pt-0">
                <button
                  onClick={() => setShowHardDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleHardDelete}
                  disabled={confirmText !== 'ELIMINAR_EQUIPO_COMPLETAMENTE' || hardDelete.isPending}
                  className="flex-1 px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-semibold hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {hardDelete.isPending ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL (/equipos)
// ═══════════════════════════════════════════════════════════════════════════════

type SortBy = 'codigo' | 'nombre' | 'fecha';
type SortOrder = 'asc' | 'desc';

export default function EquiposPage() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<string>('');
  const [estadoFiltro, setEstadoFiltro] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortBy>('codigo');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // ═══════════════════════════════════════════════════════════════════════════
  // CONEXIÓN AL HUB EAM UNIVERSAL (Tipos de Equipo, Módulos y Unidades SI)
  // ═══════════════════════════════════════════════════════════════════════════
  const { data: arquetiposHub } = useArquetiposEam();
  const { data: modulosHub } = useModulosEam();
  const { data: magnitudesHub } = useMagnitudesEam();

  // Opciones dinámicas de Tipos de Equipo para el selector superior
  const tiposEquipoOpciones = useMemo(() => {
    const base = [
      { value: 'GENERADOR', label: '⚡ Generadores / Plantas Eléctricas' },
      { value: 'BOMBA', label: '💧 Bombas Hidráulicas / Sistemas de Bombeo' },
      { value: 'MOTOR', label: '⚙️ Motores Industriales (Combustión / Eléctricos)' },
      { value: 'COMPRESOR', label: '🌀 Compresores de Aire Industrial' },
    ];
    if (!arquetiposHub || arquetiposHub.length === 0) return base;

    const vistos = new Set(base.map((b) => b.value));
    const extras: Array<{ value: string; label: string }> = [];

    for (const arq of arquetiposHub) {
      if (!arq.activo) continue;
      const code = (arq.codigo_tipo || '').toUpperCase().trim();
      if (
        !code ||
        vistos.has(code) ||
        code === 'GEN' ||
        code === 'BOM' ||
        code === 'MOT' ||
        code === 'COMP'
      ) {
        continue;
      }
      vistos.add(code);
      extras.push({
        value: code,
        label: `🔧 ${arq.nombre_canonico || arq.nombre_tipo} (${code})`,
      });
    }

    return [...base, ...extras];
  }, [arquetiposHub]);

  // Construir catálogo unificado de Campos Técnicos Filtrables B-Tree (Hub + Canónicos)
  const camposFiltrablesBTree = useMemo<CampoFiltrableBTree[]>(() => {
    const mapa = new Map<string, CampoFiltrableBTree>();

    // 1. Sembrar los campos canónicos indexados en B-Tree
    for (const c of CAMPOS_BTREE_CANONICOS) {
      mapa.set(c.codigo_atributo, { ...c });
    }

    // 2. Enriquecer y expandir con todos los atributos marcados es_filtrable = true en el Hub
    if (modulosHub && modulosHub.length > 0) {
      for (const mod of modulosHub) {
        const modInfo = getModuloBadgeInfo(mod.codigo_modulo, mod.nombre_modulo);
        for (const ma of mod.modulo_atributos || []) {
          if (!ma.es_filtrable || !ma.atributo) continue;
          const attr = ma.atributo;
          const ctrlInfo = getTipoControlHumano(
            attr.tipo_control,
            Boolean(attr.id_magnitud || attr.magnitud),
          );

          // Resolver unidades compatibles desde magnitudesHub
          const magCode = attr.magnitud?.codigo_magnitud || undefined;
          const magObj = magnitudesHub?.find(
            (m) => m.id_magnitud === attr.id_magnitud || m.codigo_magnitud === magCode,
          );
          const unidadesMag =
            magObj?.unidades_medida?.map((u) => ({
              codigo: u.codigo,
              simbolo: u.simbolo,
              nombre: `${u.nombre} (${u.simbolo})`,
            })) ||
            (magCode ? UNIDADES_POR_MAGNITUD_FALLBACK[magCode] : undefined) ||
            [];

          const opcionesEnum = parseOpcionesSeguras(attr.opciones_json).map((o) => ({
            value: o.value,
            label: o.label,
          }));

          const tiposAplica = (
            mod.tipo_equipo_modulos as
              | Array<{
                  tipo_equipo?:
                    | { codigo_tipo?: string; nombre_tipo?: string; nombre?: string }
                    | string
                    | null;
                } | null>
              | undefined
          )
            ?.map((tem) => {
              if (!tem) return null;
              const te = tem.tipo_equipo;
              const raw =
                typeof te === 'string'
                  ? te
                  : te?.codigo_tipo || te?.nombre_tipo || te?.nombre || '';
              return raw ? String(raw).toUpperCase().trim() : null;
            })
            .filter(Boolean) as string[] | undefined;

          const existente = mapa.get(attr.codigo_atributo);
          mapa.set(attr.codigo_atributo, {
            codigo_atributo: attr.codigo_atributo,
            nombre_atributo:
              attr.nombre_atributo || existente?.nombre_atributo || attr.codigo_atributo,
            tipo_control: ctrlInfo.value as CampoFiltrableBTree['tipo_control'],
            codigo_modulo: mod.codigo_modulo,
            nombre_modulo: modInfo.shortName,
            magnitud_codigo: magCode || existente?.magnitud_codigo,
            unidad_defecto:
              attr.unidad_defecto_codigo || existente?.unidad_defecto || unidadesMag[0]?.codigo,
            unidades_disponibles:
              unidadesMag.length > 0 ? unidadesMag : existente?.unidades_disponibles || [],
            opciones_sugeridas:
              opcionesEnum.length > 0 ? opcionesEnum : existente?.opciones_sugeridas,
            aplica_tipos:
              tiposAplica && tiposAplica.length > 0 ? tiposAplica : existente?.aplica_tipos,
          });
        }
      }
    }

    const todos = Array.from(mapa.values());
    if (!tipoFiltro) return todos;

    // Si hay un tipo seleccionado, mostrar primero los aplicables a ese tipo
    const normTipo = tipoFiltro ? String(tipoFiltro).toUpperCase().trim() : '';
    return todos.filter(
      (c) =>
        !c.aplica_tipos ||
        c.aplica_tipos.length === 0 ||
        (normTipo && c.aplica_tipos.includes(normTipo)),
    );
  }, [modulosHub, magnitudesHub, tipoFiltro]);

  // ═══════════════════════════════════════════════════════════════════════════
  // ESTADO DEL FILTRO B-TREE CON CONVERSIÓN DE UNIDADES SI
  // ═══════════════════════════════════════════════════════════════════════════
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filtroAtributoCodigo, setFiltroAtributoCodigo] = useState<string>('');
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [comboboxSearch, setComboboxSearch] = useState('');
  const [comboboxModuloFiltro, setComboboxModuloFiltro] = useState<string>('TODOS');
  const comboboxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (comboboxRef.current && !comboboxRef.current.contains(e.target as Node)) {
        setComboboxOpen(false);
      }
    }
    if (comboboxOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [comboboxOpen]);
  const [filtroAtributoValorMin, setFiltroAtributoValorMin] = useState<number | ''>('');
  const [filtroAtributoValorMax, setFiltroAtributoValorMax] = useState<number | ''>('');
  const [filtroAtributoUnidad, setFiltroAtributoUnidad] = useState<string>('');
  const [filtroAtributoTexto, setFiltroAtributoTexto] = useState<string>('');
  const [filtroAtributoBooleano, setFiltroAtributoBooleano] = useState<string>('');

  // Debounce de los valores del filtro B-Tree
  const [debouncedBTreeMin, setDebouncedBTreeMin] = useState<number | ''>('');
  const [debouncedBTreeMax, setDebouncedBTreeMax] = useState<number | ''>('');
  const [debouncedBTreeTexto, setDebouncedBTreeTexto] = useState<string>('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedBTreeMin(filtroAtributoValorMin);
      setDebouncedBTreeMax(filtroAtributoValorMax);
      setDebouncedBTreeTexto(filtroAtributoTexto);
      setPage(1);
    }, 280);
    return () => clearTimeout(timer);
  }, [filtroAtributoValorMin, filtroAtributoValorMax, filtroAtributoTexto]);

  const campoBTreeActual = useMemo(() => {
    if (!filtroAtributoCodigo) return null;
    return camposFiltrablesBTree.find((c) => c.codigo_atributo === filtroAtributoCodigo) || null;
  }, [camposFiltrablesBTree, filtroAtributoCodigo]);

  const camposFiltradosCombobox = useMemo(() => {
    let list = camposFiltrablesBTree;
    if (comboboxModuloFiltro !== 'TODOS') {
      list = list.filter((c) => c.codigo_modulo === comboboxModuloFiltro);
    }
    if (!comboboxSearch.trim()) return list;
    const q = comboboxSearch
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
    return list.filter((c) => {
      const nom = c.nombre_atributo
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      const mod = c.nombre_modulo
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      const cod = c.codigo_atributo.toLowerCase();
      return nom.includes(q) || mod.includes(q) || cod.includes(q);
    });
  }, [camposFiltrablesBTree, comboboxModuloFiltro, comboboxSearch]);

  const modulosDisponiblesCombobox = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const c of camposFiltrablesBTree) {
      if (c.codigo_modulo && c.nombre_modulo && !mapa.has(c.codigo_modulo)) {
        mapa.set(c.codigo_modulo, c.nombre_modulo);
      }
    }
    return Array.from(mapa.entries()).map(([codigo, nombre]) => ({ codigo, nombre }));
  }, [camposFiltrablesBTree]);

  // Al cambiar de campo B-Tree, inicializar su unidad por defecto y limpiar valores previos
  const handleSelectCampoBTree = useCallback(
    (codigo: string) => {
      setFiltroAtributoCodigo(codigo);
      const def = camposFiltrablesBTree.find((c) => c.codigo_atributo === codigo);
      setFiltroAtributoUnidad(def?.unidad_defecto || def?.unidades_disponibles?.[0]?.codigo || '');
      setFiltroAtributoValorMin('');
      setFiltroAtributoValorMax('');
      setDebouncedBTreeMin('');
      setDebouncedBTreeMax('');
      setFiltroAtributoTexto('');
      setDebouncedBTreeTexto('');
      setFiltroAtributoBooleano('');
      setPage(1);
    },
    [camposFiltrablesBTree],
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // FILTROS DE FACETAS SECUNDARIOS (Marca de Subsistema + Valores de Trabajo)
  // ═══════════════════════════════════════════════════════════════════════════
  const [filtroMarcaCampo, setFiltroMarcaCampo] = useState<string>('');
  const [filtroMarcaValor, setFiltroMarcaValor] = useState<string>('');
  const [filtroMarcaTabla, setFiltroMarcaTabla] = useState<string>('');
  const [filtroValorCampo, setFiltroValorCampo] = useState<string>('');
  const [filtroValorMin, setFiltroValorMin] = useState<number | ''>('');
  const [filtroValorMax, setFiltroValorMax] = useState<number | ''>('');
  const [filtroValorExacto, setFiltroValorExacto] = useState<string>('');
  const [filtroValorTabla, setFiltroValorTabla] = useState<string>('');

  const [debouncedMarcaValor, setDebouncedMarcaValor] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedMarcaValor(filtroMarcaValor);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [filtroMarcaValor]);

  const [debouncedValorMin, setDebouncedValorMin] = useState<number | ''>('');
  const [debouncedValorMax, setDebouncedValorMax] = useState<number | ''>('');
  const [debouncedValorExacto, setDebouncedValorExacto] = useState<string>('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValorMin(filtroValorMin);
      setDebouncedValorMax(filtroValorMax);
      setDebouncedValorExacto(filtroValorExacto);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [filtroValorMin, filtroValorMax, filtroValorExacto]);

  const { data: facetasData } = useFacetasEquipos(tipoFiltro);
  const marcasDisponibles = useMemo(() => facetasData?.marcas || [], [facetasData]);

  // Sugerencias de marcas para el campo seleccionado (tanto en B-Tree como en facetas)
  const sugerenciasBTreeActual = useMemo(() => {
    if (!campoBTreeActual) return [];
    if (campoBTreeActual.opciones_sugeridas && campoBTreeActual.opciones_sugeridas.length > 0) {
      return campoBTreeActual.opciones_sugeridas;
    }
    const facetaMarca = marcasDisponibles.find((m) => m.campo === campoBTreeActual.codigo_atributo);
    if (facetaMarca?.valoresSugeridos) {
      return facetaMarca.valoresSugeridos.map((v) => ({ value: v, label: v }));
    }
    return [];
  }, [campoBTreeActual, marcasDisponibles]);

  const hasActiveBTreeFilter = useMemo(() => {
    if (!filtroAtributoCodigo) return false;
    return Boolean(
      debouncedBTreeMin !== '' ||
        debouncedBTreeMax !== '' ||
        debouncedBTreeTexto.trim() !== '' ||
        filtroAtributoBooleano !== '',
    );
  }, [
    filtroAtributoCodigo,
    debouncedBTreeMin,
    debouncedBTreeMax,
    debouncedBTreeTexto,
    filtroAtributoBooleano,
  ]);

  const hasActiveFacetFilters = useMemo(() => {
    return Boolean(
      hasActiveBTreeFilter ||
        (filtroMarcaCampo && debouncedMarcaValor.trim()) ||
        (filtroValorCampo &&
          (debouncedValorMin !== '' || debouncedValorMax !== '' || debouncedValorExacto !== '')),
    );
  }, [
    hasActiveBTreeFilter,
    filtroMarcaCampo,
    debouncedMarcaValor,
    filtroValorCampo,
    debouncedValorMin,
    debouncedValorMax,
    debouncedValorExacto,
  ]);

  const activeFacetCount = useMemo(() => {
    let count = 0;
    if (hasActiveBTreeFilter) count++;
    if (filtroMarcaCampo && debouncedMarcaValor.trim()) count++;
    if (
      filtroValorCampo &&
      (debouncedValorMin !== '' || debouncedValorMax !== '' || debouncedValorExacto !== '')
    )
      count++;
    return count;
  }, [
    hasActiveBTreeFilter,
    filtroMarcaCampo,
    debouncedMarcaValor,
    filtroValorCampo,
    debouncedValorMin,
    debouncedValorMax,
    debouncedValorExacto,
  ]);

  const clearAdvancedFacets = useCallback(() => {
    setFiltroAtributoCodigo('');
    setFiltroAtributoValorMin('');
    setFiltroAtributoValorMax('');
    setDebouncedBTreeMin('');
    setDebouncedBTreeMax('');
    setFiltroAtributoUnidad('');
    setFiltroAtributoTexto('');
    setDebouncedBTreeTexto('');
    setFiltroAtributoBooleano('');
    setFiltroMarcaCampo('');
    setFiltroMarcaValor('');
    setDebouncedMarcaValor('');
    setFiltroMarcaTabla('');
    setFiltroValorCampo('');
    setFiltroValorMin('');
    setFiltroValorMax('');
    setDebouncedValorMin('');
    setDebouncedValorMax('');
    setFiltroValorExacto('');
    setDebouncedValorExacto('');
    setFiltroValorTabla('');
    setPage(1);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, isError, refetch, isFetching } = useEquipos({
    page,
    limit: 12,
    tipo: tipoFiltro || undefined,
    estado_equipo: estadoFiltro || undefined,
    search: debouncedSearch || undefined,
    sortBy,
    sortOrder,
    filtroMarcaCampo: filtroMarcaCampo || undefined,
    filtroMarcaValor: debouncedMarcaValor.trim() || undefined,
    filtroMarcaTabla: filtroMarcaTabla || undefined,
    filtroValorCampo: filtroValorCampo || undefined,
    filtroValorMin: typeof debouncedValorMin === 'number' ? debouncedValorMin : undefined,
    filtroValorMax: typeof debouncedValorMax === 'number' ? debouncedValorMax : undefined,
    filtroValorExacto: debouncedValorExacto.trim() || undefined,
    filtroValorTabla: filtroValorTabla || undefined,
    filtroAtributoCodigo: hasActiveBTreeFilter ? filtroAtributoCodigo : undefined,
    filtroAtributoValorMin:
      hasActiveBTreeFilter && typeof debouncedBTreeMin === 'number' ? debouncedBTreeMin : undefined,
    filtroAtributoValorMax:
      hasActiveBTreeFilter && typeof debouncedBTreeMax === 'number' ? debouncedBTreeMax : undefined,
    filtroAtributoUnidad:
      hasActiveBTreeFilter && filtroAtributoUnidad ? filtroAtributoUnidad : undefined,
    filtroAtributoTexto:
      hasActiveBTreeFilter && debouncedBTreeTexto.trim() ? debouncedBTreeTexto.trim() : undefined,
    filtroAtributoBooleano:
      hasActiveBTreeFilter && filtroAtributoBooleano ? filtroAtributoBooleano : undefined,
  });

  const equipos = data?.data || [];
  const pagination = data?.pagination;
  const resumen = data?.resumen;

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (tipoFiltro) count++;
    if (estadoFiltro) count++;
    if (debouncedSearch) count++;
    if (hasActiveBTreeFilter) count++;
    if (filtroMarcaCampo && debouncedMarcaValor.trim()) count++;
    if (
      filtroValorCampo &&
      (debouncedValorMin !== '' || debouncedValorMax !== '' || debouncedValorExacto !== '')
    )
      count++;
    return count;
  }, [
    tipoFiltro,
    estadoFiltro,
    debouncedSearch,
    hasActiveBTreeFilter,
    filtroMarcaCampo,
    debouncedMarcaValor,
    filtroValorCampo,
    debouncedValorMin,
    debouncedValorMax,
    debouncedValorExacto,
  ]);

  const clearFilters = useCallback(() => {
    setSearchInput('');
    setDebouncedSearch('');
    setTipoFiltro('');
    setEstadoFiltro('');
    clearAdvancedFacets();
    setPage(1);
  }, [clearAdvancedFacets]);

  const toggleSort = useCallback(
    (field: SortBy) => {
      if (sortBy === field) {
        setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortBy(field);
        setSortOrder('asc');
      }
      setPage(1);
    },
    [sortBy],
  );

  const handleCreateSuccess = useCallback(() => {
    setShowCreateModal(false);
    refetch();
  }, [refetch]);

  const totalParque = resumen?.total_parque ?? pagination?.total ?? 0;
  const totalGeneradores = resumen?.generadores ?? 0;
  const totalBombas = resumen?.bombas ?? 0;
  const totalOtros = resumen?.otros ?? Math.max(0, totalParque - totalGeneradores - totalBombas);
  const totalOperativos = resumen?.operativos ?? 0;
  const pctOperativo = totalParque > 0 ? Math.round((totalOperativos / totalParque) * 100) : 100;

  return (
    <div className="space-y-5">
      {/* Header Institucional */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 lg:p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-600">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                Parque de Activos Industriales (EAM 360°)
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Directorio universal de equipos, filtros técnicos por especificaciones con
                conversión de unidades, plantillas OEM y repuestos BOM
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/configuracion/catalogos-eam"
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors text-xs font-semibold border border-slate-200"
            title="Configurar Tipos de Equipo, Modelos de Fábrica y Campos Técnicos"
          >
            <Settings className="h-3.5 w-3.5 text-slate-500" />
            Catálogo de Equipos y Fichas
          </Link>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-2xs text-xs font-semibold shrink-0 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Nuevo Equipo
          </button>
        </div>
      </div>

      {/* 4 Tarjetas KPI Ejecutivas del Parque */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <button
          type="button"
          onClick={() => {
            setTipoFiltro('');
            setEstadoFiltro('');
            setPage(1);
          }}
          className={cn(
            'text-left bg-white p-4 rounded-xl border transition-all shadow-2xs cursor-pointer',
            !tipoFiltro && !estadoFiltro
              ? 'border-blue-300 ring-1 ring-blue-100'
              : 'border-slate-200 hover:border-slate-300',
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Parque Activo
            </span>
            <div className="p-1.5 bg-slate-100 text-slate-700 rounded-lg">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {totalParque.toLocaleString()}
            </span>
            <span className="text-xs font-medium text-slate-500">equipos</span>
          </div>
          <p
            className="text-[11px] text-slate-500 mt-1 truncate"
            title={`${totalGeneradores} Generadores • ${totalBombas} Bombas • ${totalOtros} Otros Activos (Total: ${totalParque})`}
          >
            <strong>{totalGeneradores}</strong> Gen • <strong>{totalBombas}</strong> Bombas •{' '}
            <strong>{totalOtros}</strong> Otros
          </p>
        </button>

        <button
          type="button"
          onClick={() => {
            setTipoFiltro(tipoFiltro === 'GENERADOR' ? '' : 'GENERADOR');
            setPage(1);
          }}
          className={cn(
            'text-left bg-white p-4 rounded-xl border transition-all shadow-2xs cursor-pointer',
            tipoFiltro === 'GENERADOR'
              ? 'border-amber-400 ring-1 ring-amber-100 bg-amber-50/20'
              : 'border-slate-200 hover:border-amber-200',
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Plantas Eléctricas
            </span>
            <div className="p-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg">
              <Zap className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {totalGeneradores.toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-amber-700">Generadores</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {totalParque > 0
              ? `${Math.round((totalGeneradores / totalParque) * 100)}% del parque • `
              : ''}
            Grupos electrógenos
          </p>
        </button>

        <button
          type="button"
          onClick={() => {
            setTipoFiltro(tipoFiltro === 'BOMBA' ? '' : 'BOMBA');
            setPage(1);
          }}
          className={cn(
            'text-left bg-white p-4 rounded-xl border transition-all shadow-2xs cursor-pointer',
            tipoFiltro === 'BOMBA'
              ? 'border-blue-400 ring-1 ring-blue-100 bg-blue-50/20'
              : 'border-slate-200 hover:border-blue-200',
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Sistemas de Bombeo
            </span>
            <div className="p-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg">
              <Droplets className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {totalBombas.toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-blue-700">Bombas</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {totalParque > 0
              ? `${Math.round((totalBombas / totalParque) * 100)}% del parque • `
              : ''}
            Presión y red de agua
          </p>
        </button>

        <button
          type="button"
          onClick={() => {
            setEstadoFiltro(estadoFiltro === 'OPERATIVO' ? '' : 'OPERATIVO');
            setPage(1);
          }}
          className={cn(
            'text-left bg-white p-4 rounded-xl border transition-all shadow-2xs cursor-pointer',
            estadoFiltro === 'OPERATIVO'
              ? 'border-emerald-400 ring-1 ring-emerald-100 bg-emerald-50/20'
              : 'border-slate-200 hover:border-emerald-200',
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Disponibilidad Operativa
            </span>
            <div className="p-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700">
              {totalOperativos.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              {pctOperativo}% Operativo
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            En reparación: <strong className="text-amber-700">{resumen?.en_reparacion ?? 0}</strong>{' '}
            • Fuera serv.: <strong className="text-rose-700">{resumen?.fuera_servicio ?? 0}</strong>
          </p>
        </button>
      </div>

      {/* Barra de búsqueda y filtros */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs">
        {/* Fila 1: Búsqueda */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por código (ej: GEN-CLI-DDQU49 o BOM-TAKU-HL3IAD), nombre del equipo, número de serie o cliente..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-10 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded"
            >
              <X className="h-4 w-4 text-slate-400" />
            </button>
          )}
        </div>

        {/* Fila 2: Filtros y ordenación */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Filtro Tipo Dinámico (Conectado al Hub EAM) */}
          <div className="w-64">
            <EamSelect
              size="sm"
              value={tipoFiltro}
              onChange={(val) => {
                setTipoFiltro(val);
                setPage(1);
              }}
              placeholder={`Todos los tipos de equipo (${totalParque})`}
              options={[
                { value: '', label: `Todos los tipos de equipo (${totalParque})` },
                ...tiposEquipoOpciones.map((op) => ({
                  value: op.value,
                  label: op.label,
                })),
              ]}
            />
          </div>

          {/* Filtro Estado */}
          <div className="w-48">
            <EamSelect
              size="sm"
              value={estadoFiltro}
              onChange={(val) => {
                setEstadoFiltro(val);
                setPage(1);
              }}
              placeholder="Todos los estados"
              options={[
                { value: '', label: 'Todos los estados' },
                { value: 'OPERATIVO', label: 'Operativo', badge: 'Activo' },
                { value: 'STANDBY', label: 'Standby', badge: 'Alerta' },
                { value: 'EN_REPARACION', label: 'En Reparación', badge: 'Taller' },
                { value: 'FUERA_SERVICIO', label: 'Fuera de Servicio', badge: 'Crítico' },
                { value: 'BAJA', label: 'Baja', badge: 'Histórico' },
              ]}
            />
          </div>

          <div className="h-5 w-px bg-slate-200 hidden sm:block" />

          {/* Ordenación */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-slate-500 hidden sm:inline mr-1">Ordenar:</span>
            <button
              onClick={() => toggleSort('codigo')}
              className={cn(
                'px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors',
                sortBy === 'codigo'
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50',
              )}
            >
              Código {sortBy === 'codigo' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
            <button
              onClick={() => toggleSort('nombre')}
              className={cn(
                'px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors',
                sortBy === 'nombre'
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50',
              )}
            >
              Nombre {sortBy === 'nombre' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
            <button
              onClick={() => toggleSort('fecha')}
              className={cn(
                'px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors',
                sortBy === 'fecha'
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50',
              )}
            >
              Fecha {sortBy === 'fecha' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
          </div>

          {/* Botón 🎛️ Filtros Técnicos (B-Tree) */}
          <button
            type="button"
            onClick={() => setShowAdvancedFilters((prev) => !prev)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer',
              showAdvancedFilters || hasActiveFacetFilters
                ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-2xs'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400',
            )}
            title="Filtros técnicos rápidos por campo con conversión de unidades de medida"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>🎛️ Filtros Técnicos</span>
            {hasActiveFacetFilters && (
              <span className="ml-0.5 px-1.5 py-0.2 bg-blue-600 text-white rounded-full text-[10px] font-bold">
                {activeFacetCount}
              </span>
            )}
            {showAdvancedFilters ? (
              <ChevronUp className="h-3.5 w-3.5 text-blue-600" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            )}
          </button>

          <div className="flex-1" />

          {activeFiltersCount > 0 && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
              Limpiar ({activeFiltersCount})
            </button>
          )}

          {/* Vista Grid/Lista */}
          <div className="flex border border-slate-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-1.5',
                viewMode === 'grid'
                  ? 'bg-blue-50 text-blue-600'
                  : 'hover:bg-slate-50 text-slate-500',
              )}
              title="Vista cuadrícula"
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-1.5',
                viewMode === 'list'
                  ? 'bg-blue-50 text-blue-600'
                  : 'hover:bg-slate-50 text-slate-500',
              )}
              title="Vista lista"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
            title="Actualizar listado"
          >
            <RefreshCw className={cn('h-4 w-4 text-slate-600', isFetching && 'animate-spin')} />
          </button>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════════
            PANEL DESPLEGABLE: 🎛️ FILTROS TÉCNICOS CONECTADOS AL ÍNDICE B-TREE
            ═══════════════════════════════════════════════════════════════════════════ */}
        {showAdvancedFilters && (
          <div className="pt-3 border-t border-slate-200/80 animate-in fade-in-50 duration-200">
            <div className="bg-slate-50/90 border border-slate-200 rounded-xl p-4 space-y-4">
              {/* Encabezado del panel avanzado */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/70 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-600 text-white rounded-lg shadow-2xs">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      Buscador Técnico por Especificaciones e Ingeniería
                      {tipoFiltro && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                          {tipoFiltro}
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Filtra por potencia, caudal, presión, capacidad o marca. Si eliges otra unidad
                      de medida (ej. kVA, kW o HP), el sistema convierte el rango automáticamente.
                    </p>
                  </div>
                </div>

                {hasActiveFacetFilters && (
                  <button
                    type="button"
                    onClick={clearAdvancedFacets}
                    className="self-start sm:self-auto text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                    Limpiar filtro técnico
                  </button>
                )}
              </div>

              {/* BLOQUE PRINCIPAL: Filtro B-Tree Polimórfico con Conversión de Unidades */}
              <div className="bg-white p-4 rounded-xl border border-blue-200/80 shadow-2xs space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  {/* Columna 1: Buscador y Selector de Campo Filtrable (5 cols) */}
                  <div className="md:col-span-5 relative" ref={comboboxRef}>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold text-slate-700">
                        1. Campo Técnico a Filtrar
                      </label>
                      <span className="text-[10px] text-blue-600 font-semibold">
                        {camposFiltrablesBTree.length} disponibles
                      </span>
                    </div>

                    {/* Trigger del Buscador */}
                    <div
                      onClick={() => setComboboxOpen(!comboboxOpen)}
                      className={cn(
                        'w-full px-3 py-2 border rounded-lg text-xs font-semibold bg-white cursor-pointer flex items-center justify-between transition-all',
                        comboboxOpen
                          ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-sm'
                          : 'border-slate-300 hover:border-blue-400 shadow-2xs',
                        filtroAtributoCodigo ? 'text-slate-900' : 'text-slate-400',
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        {campoBTreeActual ? (
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="font-bold text-slate-900 truncate">
                              {campoBTreeActual.nombre_atributo}
                            </span>
                            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-semibold shrink-0">
                              {campoBTreeActual.nombre_modulo}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-normal truncate">
                            Buscar característica (Potencia, Caudal, Enfriamiento...)...
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        {filtroAtributoCodigo && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectCampoBTree('');
                            }}
                            className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600"
                            title="Limpiar campo"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                        <ChevronDown
                          className={cn(
                            'h-3.5 w-3.5 text-slate-400 transition-transform',
                            comboboxOpen && 'rotate-180',
                          )}
                        />
                      </div>
                    </div>

                    {/* Menú Desplegable con Input de Búsqueda y Pestañas */}
                    {comboboxOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden flex flex-col max-h-[360px] animate-in fade-in-50 zoom-in-95">
                        {/* Input de Búsqueda Directa */}
                        <div className="p-2.5 bg-slate-50 border-b border-slate-200/80 flex items-center gap-2">
                          <Search className="h-4 w-4 text-slate-400 shrink-0" />
                          <input
                            type="text"
                            autoFocus
                            value={comboboxSearch}
                            onChange={(e) => setComboboxSearch(e.target.value)}
                            placeholder="Escribe para filtrar (ej: enfriamiento, TR, gas, caudal)..."
                            className="w-full bg-transparent text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
                          />
                          {comboboxSearch && (
                            <button
                              type="button"
                              onClick={() => setComboboxSearch('')}
                              className="p-0.5 text-slate-400 hover:text-slate-600"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Chips de filtro por Subsistema */}
                        {modulosDisponiblesCombobox.length > 1 && (
                          <div className="px-2.5 py-1.5 bg-slate-50/50 border-b border-slate-100 flex items-center gap-1 overflow-x-auto no-scrollbar">
                            <button
                              type="button"
                              onClick={() => setComboboxModuloFiltro('TODOS')}
                              className={cn(
                                'px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap transition-colors',
                                comboboxModuloFiltro === 'TODOS'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-slate-200/80 text-slate-700 hover:bg-slate-300',
                              )}
                            >
                              Todos ({camposFiltrablesBTree.length})
                            </button>
                            {modulosDisponiblesCombobox.map((m) => (
                              <button
                                key={m.codigo}
                                type="button"
                                onClick={() => setComboboxModuloFiltro(m.codigo)}
                                className={cn(
                                  'px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap transition-colors',
                                  comboboxModuloFiltro === m.codigo
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                                )}
                              >
                                {m.nombre}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Lista de Opciones */}
                        <div className="overflow-y-auto p-1.5 space-y-0.5 flex-1 divide-y divide-slate-100">
                          {camposFiltradosCombobox.length === 0 ? (
                            <div className="p-4 text-center text-xs text-slate-500">
                              <p className="font-semibold text-slate-700">
                                No se encontraron características
                              </p>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                Intenta con otro término de búsqueda o selecciona
                                &ldquo;Todos&rdquo;.
                              </p>
                            </div>
                          ) : (
                            camposFiltradosCombobox.map((c) => {
                              const isSelected = c.codigo_atributo === filtroAtributoCodigo;
                              return (
                                <div
                                  key={c.codigo_atributo}
                                  onClick={() => {
                                    handleSelectCampoBTree(c.codigo_atributo);
                                    setComboboxOpen(false);
                                    setComboboxSearch('');
                                  }}
                                  className={cn(
                                    'p-2 rounded-lg flex items-center justify-between cursor-pointer transition-colors text-xs',
                                    isSelected
                                      ? 'bg-blue-50 text-blue-900 font-bold border border-blue-200'
                                      : 'hover:bg-slate-50 text-slate-800',
                                  )}
                                >
                                  <div className="min-w-0 flex-1 pr-2">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span
                                        className={cn(
                                          'font-bold',
                                          isSelected ? 'text-blue-950' : 'text-slate-900',
                                        )}
                                      >
                                        {c.nombre_atributo}
                                      </span>
                                      {c.unidad_defecto && (
                                        <span className="font-mono text-[10px] px-1 bg-slate-100 text-slate-600 rounded">
                                          {c.unidad_defecto}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                                      {c.codigo_atributo}
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-semibold border border-slate-200">
                                      {c.nombre_modulo}
                                    </span>
                                    {isSelected && <Check className="h-3.5 w-3.5 text-blue-600" />}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Columna 2: Controles dinámicos según el Tipo de Campo (7 cols) */}
                  <div className="md:col-span-7">
                    {!campoBTreeActual ? (
                      <div className="px-3.5 py-2 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-xs text-slate-500 flex items-center gap-2">
                        <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>
                          Selecciona un campo técnico a la izquierda o haz clic en uno de los
                          accesos rápidos de abajo.
                        </span>
                      </div>
                    ) : campoBTreeActual.tipo_control === 'NUMERICO_MAGNITUD' ||
                      campoBTreeActual.tipo_control === 'NUMERICO_PURO' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                        <div className="sm:col-span-4">
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            2. Valor Mínimo
                          </label>
                          <input
                            type="number"
                            step="any"
                            placeholder="Ej: 100"
                            value={filtroAtributoValorMin}
                            onChange={(e) =>
                              setFiltroAtributoValorMin(
                                e.target.value === '' ? '' : Number(e.target.value),
                              )
                            }
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="sm:col-span-4">
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            3. Valor Máximo
                          </label>
                          <input
                            type="number"
                            step="any"
                            placeholder="Ej: 250"
                            value={filtroAtributoValorMax}
                            onChange={(e) =>
                              setFiltroAtributoValorMax(
                                e.target.value === '' ? '' : Number(e.target.value),
                              )
                            }
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        {campoBTreeActual.unidades_disponibles.length > 0 && (
                          <div className="sm:col-span-4">
                            <label className="block text-[11px] font-bold text-blue-700 mb-1 flex items-center gap-1">
                              <Scale className="h-3 w-3" />
                              Unidad de Búsqueda
                            </label>
                            <EamSelect
                              size="sm"
                              value={filtroAtributoUnidad}
                              onChange={(val) => {
                                setFiltroAtributoUnidad(val);
                                setPage(1);
                              }}
                              options={campoBTreeActual.unidades_disponibles.map((u) => ({
                                value: u.codigo,
                                label: `${u.simbolo} — ${u.nombre}`,
                              }))}
                              placeholder="Unidad..."
                            />
                          </div>
                        )}
                      </div>
                    ) : campoBTreeActual.tipo_control === 'BOOLEANO' ? (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          2. Seleccionar Condición
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setFiltroAtributoBooleano(
                                filtroAtributoBooleano === 'true' ? '' : 'true',
                              );
                              setPage(1);
                            }}
                            className={cn(
                              'px-4 py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer',
                              filtroAtributoBooleano === 'true'
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                                : 'bg-white text-slate-700 border-slate-300 hover:bg-emerald-50',
                            )}
                          >
                            ✓ Sí (Cuenta con esta característica)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setFiltroAtributoBooleano(
                                filtroAtributoBooleano === 'false' ? '' : 'false',
                              );
                              setPage(1);
                            }}
                            className={cn(
                              'px-4 py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer',
                              filtroAtributoBooleano === 'false'
                                ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                                : 'bg-white text-slate-700 border-slate-300 hover:bg-rose-50',
                            )}
                          >
                            ✕ No
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          2. Valor o Fabricante a Buscar
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder={`Escribir o seleccionar ${campoBTreeActual.nombre_atributo.toLowerCase()}...`}
                            value={filtroAtributoTexto}
                            onChange={(e) => setFiltroAtributoTexto(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500"
                          />
                          {filtroAtributoTexto && (
                            <button
                              type="button"
                              onClick={() => {
                                setFiltroAtributoTexto('');
                                setDebouncedBTreeTexto('');
                                setPage(1);
                              }}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Accesos rápidos a campos frecuentes o sugerencias de valores */}
                {!campoBTreeActual ? (
                  <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
                    <span className="text-[11px] font-semibold text-slate-500 mr-1">
                      Búsquedas rápidas frecuentes:
                    </span>
                    {[
                      { code: 'potencia_kva', label: '⚡ Potencia (kVA / kW / HP)' },
                      { code: 'potencia_motor_hp', label: '⚙️ Potencia Motor (HP)' },
                      { code: 'caudal_maximo_m3h', label: '💧 Caudal Bomba (m³/h o GPM)' },
                      { code: 'presion_maxima_psi', label: '🌀 Presión Máxima (PSI / bar)' },
                      { code: 'marca_motor', label: '🏷️ Marca del Motor' },
                      { code: 'marca_generador', label: '🏷️ Marca del Generador' },
                      { code: 'marca_bomba', label: '🏷️ Marca de la Bomba' },
                      { code: 'capacidad_aceite_l', label: '🛢️ Capacidad de Aceite (L / gal)' },
                    ].map((quick) => (
                      <button
                        key={quick.code}
                        type="button"
                        onClick={() => handleSelectCampoBTree(quick.code)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-200 transition-colors cursor-pointer"
                      >
                        {quick.label}
                      </button>
                    ))}
                  </div>
                ) : sugerenciasBTreeActual.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
                    <span className="text-[11px] font-semibold text-slate-500 mr-1">
                      Valores sugeridos:
                    </span>
                    {sugerenciasBTreeActual.slice(0, 10).map((sug) => (
                      <button
                        key={sug.value}
                        type="button"
                        onClick={() => {
                          setFiltroAtributoTexto(sug.value);
                          setDebouncedBTreeTexto(sug.value);
                          setPage(1);
                        }}
                        className={cn(
                          'px-2.5 py-0.5 rounded-md text-[11px] font-semibold border transition-colors cursor-pointer',
                          String(filtroAtributoTexto).toUpperCase() ===
                            String(sug.value).toUpperCase()
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-blue-50 hover:text-blue-700',
                        )}
                      >
                        {sug.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  campoBTreeActual.tipo_control === 'NUMERICO_MAGNITUD' && (
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                      <span>
                        💡 Puedes ingresar solo el mínimo, solo el máximo, o ambos para acotar el
                        rango en <strong className="text-slate-700">{filtroAtributoUnidad}</strong>.
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span>Rangos rápidos:</span>
                        {[
                          { min: 10, max: 50, label: '10 – 50' },
                          { min: 50, max: 150, label: '50 – 150' },
                          { min: 100, max: 250, label: '100 – 250' },
                          { min: 250, max: 1000, label: '250+' },
                        ].map((r) => (
                          <button
                            key={r.label}
                            type="button"
                            onClick={() => {
                              setFiltroAtributoValorMin(r.min);
                              setFiltroAtributoValorMax(r.max === 1000 ? '' : r.max);
                              setDebouncedBTreeMin(r.min);
                              setDebouncedBTreeMax(r.max === 1000 ? '' : r.max);
                              setPage(1);
                            }}
                            className="px-2 py-0.5 rounded bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 font-mono text-[10px] font-semibold cursor-pointer"
                          >
                            {r.label} {filtroAtributoUnidad}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        )}

        {/* Barra de Filtros Activos (Chips con eliminación individual) */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2.5 border-t border-slate-100 text-xs">
            <span className="text-[11px] font-semibold text-slate-400 mr-1">Filtros activos:</span>

            {tipoFiltro && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-[11px] font-semibold">
                Tipo: {tipoFiltro}
                <button
                  type="button"
                  onClick={() => {
                    setTipoFiltro('');
                    setPage(1);
                  }}
                  className="hover:text-blue-900 cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {estadoFiltro && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[11px] font-semibold">
                Estado: {estadoFiltro}
                <button
                  type="button"
                  onClick={() => {
                    setEstadoFiltro('');
                    setPage(1);
                  }}
                  className="hover:text-emerald-900 cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {debouncedSearch && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-md text-[11px] font-medium">
                Búsqueda: &ldquo;{debouncedSearch}&rdquo;
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('');
                    setDebouncedSearch('');
                    setPage(1);
                  }}
                  className="hover:text-slate-900 cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {hasActiveBTreeFilter && campoBTreeActual && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-indigo-50 text-indigo-900 border border-indigo-300 rounded-md text-[11px] font-bold">
                <SlidersHorizontal className="h-3 w-3 text-indigo-600" />
                <span>{campoBTreeActual.nombre_atributo}:</span>
                {campoBTreeActual.tipo_control === 'BOOLEANO' ? (
                  <span>{filtroAtributoBooleano === 'true' ? 'Sí' : 'No'}</span>
                ) : debouncedBTreeTexto ? (
                  <span>{debouncedBTreeTexto}</span>
                ) : (
                  <span>
                    {debouncedBTreeMin !== '' ? `≥ ${debouncedBTreeMin}` : ''}
                    {debouncedBTreeMin !== '' && debouncedBTreeMax !== '' ? ' a ' : ''}
                    {debouncedBTreeMax !== '' ? `≤ ${debouncedBTreeMax}` : ''}{' '}
                    {filtroAtributoUnidad}
                  </span>
                )}
                <button
                  type="button"
                  onClick={clearAdvancedFacets}
                  className="hover:text-indigo-950 cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {filtroMarcaCampo && debouncedMarcaValor && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-300 rounded-md text-[11px] font-semibold">
                <Tag className="h-2.5 w-2.5 text-blue-600" />
                {marcasDisponibles.find((m) => m.campo === filtroMarcaCampo)?.etiqueta ||
                  filtroMarcaCampo}
                : {debouncedMarcaValor}
                <button
                  type="button"
                  onClick={() => {
                    setFiltroMarcaValor('');
                    setPage(1);
                  }}
                  className="hover:text-blue-950 cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={clearFilters}
              className="ml-auto text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
            >
              Limpiar todos los filtros
            </button>
          </div>
        )}
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <EquipoCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="flex flex-col items-center justify-center py-12 bg-rose-50 rounded-xl border border-rose-200">
          <AlertCircle className="h-10 w-10 text-rose-500 mb-3" />
          <p className="font-bold text-rose-700">Error al cargar el parque de equipos</p>
          <p className="text-rose-600 text-xs mt-1">
            Por favor, verifica tu conexión e intenta nuevamente
          </p>
          <button
            onClick={() => refetch()}
            className="mt-4 px-4 py-2 bg-rose-600 text-white text-xs font-semibold rounded-lg hover:bg-rose-700"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Contenido */}
      {!isLoading && !isError && (
        <>
          {equipos.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-slate-200">
              {activeFiltersCount > 0 ? (
                <>
                  <Search className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-700 font-bold text-sm">
                    No se encontraron equipos con esos filtros técnicos
                  </p>
                  <p className="text-slate-500 text-xs mt-1">
                    Intenta ampliar el rango numérico, cambiar la unidad de medida o limpiar los
                    filtros activos
                  </p>
                  <button
                    onClick={clearFilters}
                    className="mt-4 px-4 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200 cursor-pointer"
                  >
                    Limpiar filtros
                  </button>
                </>
              ) : (
                <>
                  <Zap className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-700 font-bold text-sm">No hay equipos registrados</p>
                  <p className="text-slate-500 text-xs mt-1">
                    Comienza registrando tu primer activo industrial
                  </p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4" />
                    Nuevo Equipo
                  </button>
                </>
              )}
            </div>
          ) : (
            <>
              <div
                className={cn(
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                    : 'space-y-3',
                )}
              >
                {equipos.map((equipo) => (
                  <EquipoCard key={equipo.id_equipo} equipo={equipo} />
                ))}
              </div>

              {/* Paginación */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
                  <p className="text-xs text-slate-600">
                    Mostrando{' '}
                    <span className="font-bold text-slate-800">
                      {(pagination.page - 1) * pagination.limit + 1}
                    </span>{' '}
                    a{' '}
                    <span className="font-bold text-slate-800">
                      {Math.min(pagination.page * pagination.limit, pagination.total)}
                    </span>{' '}
                    de <span className="font-bold text-slate-800">{pagination.total}</span> equipos
                  </p>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setPage(1)}
                      disabled={page === 1}
                      className={cn(
                        'px-2.5 py-1.5 rounded-lg border text-xs font-medium',
                        page === 1
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50',
                      )}
                    >
                      Primera
                    </button>
                    <button
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                      className={cn(
                        'flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-medium',
                        page === 1
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50',
                      )}
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      Anterior
                    </button>

                    <span className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg border border-blue-200 text-xs font-bold">
                      {page} / {pagination.totalPages}
                    </span>

                    <button
                      onClick={() => setPage(page + 1)}
                      disabled={page >= pagination.totalPages}
                      className={cn(
                        'flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-medium',
                        page >= pagination.totalPages
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50',
                      )}
                    >
                      Siguiente
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setPage(pagination.totalPages)}
                      disabled={page >= pagination.totalPages}
                      className={cn(
                        'px-2.5 py-1.5 rounded-lg border text-xs font-medium',
                        page >= pagination.totalPages
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50',
                      )}
                    >
                      Última
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Modal de creación */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Registrar Nuevo Activo Industrial (Wizard Dinámico EAM)"
      >
        <EquipoForm onSuccess={handleCreateSuccess} onCancel={() => setShowCreateModal(false)} />
      </Modal>
    </div>
  );
}
