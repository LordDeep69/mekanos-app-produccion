'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EamSelect, type EamSelectOption } from '@/components/ui/eam-select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  getArquetiposEam,
  getModelosOemEam,
} from '@/features/catalogos-eam/api/catalogos-eam.service';
import {
  RUBRO_OTRO_PRESETS,
  type PlantillaCotizacionItem,
  type PlantillaCotizacionRecord,
} from '@/features/comercial/api/comercial.service';
import {
  usePlantillasActions,
  usePlantillasCotizacion,
  useTiposOfertaActions,
  useTiposOfertaCotizacion,
} from '@/features/comercial/hooks/use-comercial';
import {
  getConfiguracionEmpresa,
  type ConfiguracionEmpresa,
} from '@/features/configuracion/api/configuracion.service';
import { useServiciosComerciales } from '@/features/ordenes/hooks/use-catalogos';
import { useOrgFormatters } from '@/hooks/use-org-formatters';
import { comprasService } from '@/lib/api/compras.service';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  FileCheck2,
  FileText,
  Layers,
  Leaf,
  Loader2,
  Lock,
  Package,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Settings2,
  Shield,
  Sparkles,
  Trash2,
  TrendingUp,
  Truck,
  Users,
  Utensils,
  Wrench,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  buildUnidadOptions,
  CpqBulletListEditor,
  CpqCreatableCombobox,
  CpqMoneyInput,
  CpqSmartNumberInput,
  FORMA_PAGO_COMBOBOX_OPTIONS,
  matchesAllTokens,
  RUBRO_OTRO_COMBOBOX_OPTIONS,
} from './cpq-premium-controls';
import {
  buildTipoOfertaComboboxOptions,
  normalizeTipoOfertaCodigo,
  resolveTipoOfertaLabel,
  TiposOfertaManagerModal,
} from './tipos-oferta-manager-modal';

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS DE ESTADO LOCAL DEL TEMPLATE STUDIO
// ═══════════════════════════════════════════════════════════════════════════════

export interface PlantillaCotizacionStudioProps {
  mode: 'create' | 'edit' | 'duplicate';
  plantilla?: PlantillaCotizacionRecord;
  onBack: () => void;
  onSaved?: (saved: PlantillaCotizacionRecord) => void;
  onSelectForNewQuote?: (plantilla: PlantillaCotizacionRecord) => void;
}

interface TplServicioRow {
  uid: string;
  id_servicio?: number | null;
  descripcion: string;
  cantidad_base: number;
  unidad: string;
  costo_unitario_fijo: number;
  precio_unitario_fijo: number;
  precio_catalogo_vivo: number | null;
  es_por_equipo: boolean;
  usar_precio_catalogo: boolean;
  es_opcional: boolean;
  iva_aplicable: boolean;
  observaciones: string;
}

interface TplComponenteRow {
  uid: string;
  id_componente?: number | null;
  descripcion: string;
  referencia_label: string;
  marca_label: string;
  cantidad_base: number;
  unidad: string;
  costo_unitario_fijo: number;
  precio_unitario_fijo: number;
  precio_venta_vivo: number | null;
  precio_compra_vivo: number | null;
  stock_actual: number | null;
  es_por_equipo: boolean;
  usar_precio_catalogo: boolean;
  es_opcional: boolean;
  iva_aplicable: boolean;
  garantia_meses?: number | null;
  observaciones: string;
}

interface TplOtroRow {
  uid: string;
  categoria_rubro: string;
  descripcion: string;
  detalle_calculo: string;
  cantidad_base: number;
  unidad: string;
  costo_unitario_fijo: number;
  precio_unitario_fijo: number;
  es_por_equipo: boolean;
  visible_cliente: boolean;
  es_opcional: boolean;
  iva_aplicable: boolean;
  observaciones: string;
}

type PdfPresentationMode = 'HEREDAR' | 'SUMA_ALZADA' | 'DETALLADO';

const SIM_EQUIPOS_OPTIONS = [1, 2, 3, 5] as const;

let tplUidCounter = 1;
const nextTplUid = (prefix: string) => `${prefix}-${Date.now()}-${tplUidCounter++}`;

const CODIGO_PLANTILLA_STOPWORDS = new Set([
  'DE',
  'DEL',
  'LA',
  'LAS',
  'EL',
  'LOS',
  'Y',
  'E',
  'O',
  'U',
  'EN',
  'PARA',
  'CON',
  'POR',
  'A',
  'AL',
  'UN',
  'UNA',
  'UNOS',
  'UNAS',
  'SU',
  'SUS',
  'SIN',
  'SOBRE',
  'ENTRE',
  'COPIA',
]);

/**
 * Genera un código semántico breve (TPL-...) con 2-3 palabras significativas completas
 * (sin cortes de sílabas a la mitad) y sufijo incremental anti-colisión (-02, -03...).
 */
function buildSmartPlantillaCode(nombre: string, existingCodes: Set<string>): string {
  const raw = nombre.trim();
  if (!raw) return '';

  const allTokens = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter(Boolean);

  if (allTokens.length === 0) return '';

  const meaningful = allTokens.filter((t) => !CODIGO_PLANTILLA_STOPWORDS.has(t));
  const source = meaningful.length > 0 ? meaningful : allTokens;

  const chosen: string[] = [];
  let base = 'TPL';
  for (const tok of source) {
    if (chosen.length >= 3) break;
    const candidate = `${base}-${tok}`;
    if (chosen.length === 0) {
      chosen.push(tok.slice(0, 22));
      base = `TPL-${chosen[0]}`;
    } else if (candidate.length <= 28) {
      chosen.push(tok);
      base = candidate;
    }
  }

  if (chosen.length === 0) return '';

  let finalCode = base;
  let seq = 2;
  while (existingCodes.has(finalCode)) {
    finalCode = `${base}-${String(seq).padStart(2, '0')}`;
    seq += 1;
  }
  return finalCode;
}

function normalizeManualPlantillaCode(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+/, '')
    .slice(0, 40);
}

function toPdfMode(val?: boolean | null): PdfPresentationMode {
  if (val === true) return 'DETALLADO';
  if (val === false) return 'SUMA_ALZADA';
  return 'HEREDAR';
}

function fromPdfMode(mode: PdfPresentationMode): boolean | null {
  if (mode === 'DETALLADO') return true;
  if (mode === 'SUMA_ALZADA') return false;
  return null;
}

function computeSimulatedEconomics(params: {
  simEquipos: number;
  serviciosRows: TplServicioRow[];
  componentesRows: TplComponenteRow[];
  otrosRows: TplOtroRow[];
  usaAiu: boolean;
  aiuAdminPct: number;
  aiuImprevPct: number;
  aiuUtilPct: number;
  ivaSobreUtilidadAiu: boolean;
  ivaPorcentaje: number;
  orgConfig?: ConfiguracionEmpresa;
  srvLiveMap: Map<number, number>;
  cmpLiveMap: Map<number, { venta: number; compra: number }>;
}) {
  const {
    simEquipos,
    serviciosRows,
    componentesRows,
    otrosRows,
    usaAiu,
    aiuAdminPct,
    aiuImprevPct,
    aiuUtilPct,
    ivaSobreUtilidadAiu,
    ivaPorcentaje,
    orgConfig,
    srvLiveMap,
    cmpLiveMap,
  } = params;

  const mult = Math.max(1, simEquipos);

  let subServ = 0;
  let subComp = 0;
  let subOtros = 0;
  let subOpcionales = 0;
  let subGravableBruto = 0;
  let costoTotal = 0;
  let costosAbsorbidos = 0;
  let lineasEscalables = 0;
  let lineasFijas = 0;

  for (const s of serviciosRows) {
    if (s.es_por_equipo) lineasEscalables += 1;
    else lineasFijas += 1;
    const cant =
      Math.round(Number(s.cantidad_base || 0) * (s.es_por_equipo ? mult : 1) * 100) / 100;
    const livePu =
      s.usar_precio_catalogo && s.id_servicio
        ? (srvLiveMap.get(s.id_servicio) ?? s.precio_catalogo_vivo)
        : null;
    const pu = livePu != null ? livePu : Number(s.precio_unitario_fijo || 0);
    const cu = Number(s.costo_unitario_fijo || 0);
    const sub = Math.round(cant * pu * 100) / 100;

    if (s.es_opcional) {
      subOpcionales += sub;
    } else {
      subServ += sub;
      if (s.iva_aplicable) subGravableBruto += sub;
      costoTotal += cant * cu;
    }
  }

  for (const c of componentesRows) {
    if (c.es_por_equipo) lineasEscalables += 1;
    else lineasFijas += 1;
    const cant =
      Math.round(Number(c.cantidad_base || 0) * (c.es_por_equipo ? mult : 1) * 100) / 100;
    const liveEntry = c.id_componente ? cmpLiveMap.get(c.id_componente) : undefined;
    const livePu =
      c.usar_precio_catalogo && c.id_componente ? (liveEntry?.venta ?? c.precio_venta_vivo) : null;
    const liveCu =
      c.usar_precio_catalogo && c.id_componente
        ? (liveEntry?.compra ?? c.precio_compra_vivo)
        : null;
    const pu = livePu != null ? livePu : Number(c.precio_unitario_fijo || 0);
    const cu = liveCu != null ? liveCu : Number(c.costo_unitario_fijo || 0);
    const sub = Math.round(cant * pu * 100) / 100;

    if (c.es_opcional) {
      subOpcionales += sub;
    } else {
      subComp += sub;
      if (c.iva_aplicable) subGravableBruto += sub;
      costoTotal += cant * cu;
    }
  }

  for (const o of otrosRows) {
    if (o.es_por_equipo) lineasEscalables += 1;
    else lineasFijas += 1;
    const cant =
      Math.round(Number(o.cantidad_base || 0) * (o.es_por_equipo ? mult : 1) * 100) / 100;
    const pu = Number(o.precio_unitario_fijo || 0);
    const cuRaw = Number(o.costo_unitario_fijo || 0);
    const costoUnitEfectivo = cuRaw > 0 ? cuRaw : !o.visible_cliente ? pu : 0;
    const sub = Math.round(cant * pu * 100) / 100;

    if (o.es_opcional) {
      if (o.visible_cliente) subOpcionales += sub;
    } else {
      const cLinea = cant * costoUnitEfectivo;
      costoTotal += cLinea;
      if (!o.visible_cliente) {
        costosAbsorbidos += cLinea;
      } else {
        subOtros += sub;
        if (o.iva_aplicable) subGravableBruto += sub;
      }
    }
  }

  const subtotalGeneral = Math.round((subServ + subComp + subOtros) * 100) / 100;
  const aiuAdminVal = usaAiu ? Math.round(subtotalGeneral * (aiuAdminPct / 100) * 100) / 100 : 0;
  const aiuImprevVal = usaAiu ? Math.round(subtotalGeneral * (aiuImprevPct / 100) * 100) / 100 : 0;
  const aiuUtilVal = usaAiu ? Math.round(subtotalGeneral * (aiuUtilPct / 100) * 100) / 100 : 0;
  const aiuTotal = Math.round((aiuAdminVal + aiuImprevVal + aiuUtilVal) * 100) / 100;

  const ivaSobreUtil = usaAiu && ivaSobreUtilidadAiu;
  const baseGravable = ivaSobreUtil
    ? aiuUtilVal
    : Math.round((subGravableBruto + (usaAiu ? aiuTotal : 0)) * 100) / 100;
  const ivaValor = Math.round(baseGravable * (ivaPorcentaje / 100) * 100) / 100;

  const ingresoNetoSinIva = Math.round((subtotalGeneral + aiuTotal) * 100) / 100;
  const totalEstimado = Math.round((ingresoNetoSinIva + ivaValor) * 100) / 100;
  const costoRedondeado = Math.round(costoTotal * 100) / 100;
  const utilidadBruta = Math.round((ingresoNetoSinIva - costoRedondeado) * 100) / 100;
  const margenPct =
    ingresoNetoSinIva > 0 ? Math.round((utilidadBruta / ingresoNetoSinIva) * 10000) / 100 : 0;

  // Reglas oficiales de Gobernanza CPQ (Espejo exacto de CotizacionStudio / backend)
  const governanceEnabled = Boolean(orgConfig?.enable_cpq_governance);
  const umbralSup = Number(orgConfig?.umbral_aprobacion_supervisor ?? 0);
  const umbralGer = Number(orgConfig?.umbral_aprobacion_gerente ?? 0);
  const margenAlerta = Number(orgConfig?.margen_minimo_alerta ?? 0);
  const margenAprob = Number(orgConfig?.margen_minimo_aprobacion ?? 0);

  let estadoGobernanza: 'MODO_AGIL' | 'LIBRE' | 'ALERTA_MARGEN' | 'SUPERVISOR' | 'GERENTE' =
    governanceEnabled ? 'LIBRE' : 'MODO_AGIL';
  let alertaMargen = false;

  if (governanceEnabled) {
    alertaMargen = margenAlerta > 0 && costoRedondeado > 0 && margenPct < margenAlerta;
    const hitGerente =
      (umbralGer > 0 && totalEstimado > umbralGer) ||
      (margenAprob > 0 && costoRedondeado > 0 && margenPct < margenAprob);
    const hitSupervisor = umbralSup > 0 && totalEstimado > umbralSup;

    if (hitGerente) estadoGobernanza = 'GERENTE';
    else if (hitSupervisor) estadoGobernanza = 'SUPERVISOR';
    else if (alertaMargen) estadoGobernanza = 'ALERTA_MARGEN';
    else estadoGobernanza = 'LIBRE';
  }

  return {
    subServ,
    subComp,
    subOtros,
    subOpcionales,
    subtotalGeneral,
    aiuAdminVal,
    aiuImprevVal,
    aiuUtilVal,
    aiuTotal,
    ivaSobreUtil,
    ivaValor,
    totalEstimado,
    valorPorEquipo: Math.round((totalEstimado / mult) * 100) / 100,
    costoTotal: costoRedondeado,
    costosAbsorbidos: Math.round(costosAbsorbidos * 100) / 100,
    utilidadBruta,
    margenPct,
    margenAlerta,
    margenAprob,
    alertaMargen,
    governanceEnabled,
    estadoGobernanza,
    lineasEscalables,
    lineasFijas,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL: TEMPLATE STUDIO HOMÓLOGO (FULL-WIDTH 2 COLUMNAS)
// ═══════════════════════════════════════════════════════════════════════════════

export function PlantillaCotizacionStudio({
  mode,
  plantilla,
  onBack,
  onSaved,
  onSelectForNewQuote,
}: PlantillaCotizacionStudioProps) {
  const { formatCurrency, locale, currencySymbol, taxLabel, taxRate } = useOrgFormatters();
  const { crear, actualizar } = usePlantillasActions();
  const { data: todasLasPlantillas = [] } = usePlantillasCotizacion({ incluir_inactivas: true });
  const { data: tiposOfertaCatalogo = [] } = useTiposOfertaCotizacion();
  const tiposOfertaActions = useTiposOfertaActions();
  const [tiposModalOpen, setTiposModalOpen] = useState<boolean>(false);

  const isEdit = mode === 'edit' && Boolean(plantilla?.id_plantilla);
  const isDuplicate = mode === 'duplicate';

  // Queries de soporte EAM + Catálogos + Organización
  const { data: orgConfig } = useQuery<ConfiguracionEmpresa>({
    queryKey: ['config-org-empresa-cpq'],
    queryFn: () => getConfiguracionEmpresa(),
    staleTime: 60_000,
  });
  const { data: serviciosCatalogo = [] } = useServiciosComerciales({ activo: true, limit: 300 });
  const { data: catalogoArticulosData } = useQuery({
    queryKey: ['cpq-catalogo-componentes-maestro'],
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

  // ── Estado Sección 1: Identidad & Smart Match EAU ─────────────────────────
  const [nombre, setNombre] = useState<string>(
    plantilla ? (isDuplicate ? `${plantilla.nombre} (Copia)` : plantilla.nombre) : '',
  );
  const [codigoManual, setCodigoManual] = useState<boolean>(isEdit);
  const [codigoManualValor, setCodigoManualValor] = useState<string>(
    plantilla && isEdit ? plantilla.codigo_plantilla : '',
  );
  const [descripcion, setDescripcion] = useState<string>(plantilla?.descripcion || '');
  const [tipoCotizacion, setTipoCotizacion] = useState<string>(
    plantilla?.tipo_cotizacion || 'SERVICIO_TECNICO',
  );
  const [idTipoEquipo, setIdTipoEquipo] = useState<string>(
    plantilla?.id_tipo_equipo ? String(plantilla.id_tipo_equipo) : 'NONE',
  );
  const [idModulo, setIdModulo] = useState<string>(
    plantilla?.id_modulo ? String(plantilla.id_modulo) : 'NONE',
  );
  const [idModeloEquipo, setIdModeloEquipo] = useState<string>(
    plantilla?.id_modelo_equipo ? String(plantilla.id_modelo_equipo) : 'NONE',
  );

  // Conjunto de códigos ocupados (activos + inactivos en BD) excluyendo la plantilla en edición
  const existingCodesSet = useMemo(() => {
    const set = new Set<string>();
    for (const pl of todasLasPlantillas) {
      if (isEdit && plantilla && pl.id_plantilla === plantilla.id_plantilla) continue;
      if (pl.codigo_plantilla) {
        set.add(pl.codigo_plantilla.trim().toUpperCase());
      }
    }
    return set;
  }, [todasLasPlantillas, isEdit, plantilla]);

  const autoCodigoSugerido = useMemo(
    () => buildSmartPlantillaCode(nombre, existingCodesSet),
    [nombre, existingCodesSet],
  );
  const codigoDisplay = codigoManual ? codigoManualValor : autoCodigoSugerido;
  const codigoLimpio = codigoDisplay.replace(/-+$/g, '').trim();
  const codigoDuplicado = Boolean(codigoLimpio) && existingCodesSet.has(codigoLimpio);

  const tipoOfertaOptions = useMemo(
    () => buildTipoOfertaComboboxOptions(tiposOfertaCatalogo),
    [tiposOfertaCatalogo],
  );

  // ── Estado Sección 2: Objeto, Alcance y Exclusiones ───────────────────────
  const [asuntoSugerido, setAsuntoSugerido] = useState<string>(plantilla?.asunto_sugerido || '');
  const [descripcionGeneral, setDescripcionGeneral] = useState<string>(
    plantilla?.descripcion_general || '',
  );
  const [alcanceTrabajo, setAlcanceTrabajo] = useState<string>(plantilla?.alcance_trabajo || '');
  const [exclusiones, setExclusiones] = useState<string>(plantilla?.exclusiones || '');
  const [descGenExpandida, setDescGenExpandida] = useState<boolean>(
    Boolean(plantilla?.descripcion_general?.trim()),
  );

  // ── Estado Secciones 3, 4, 5: Líneas ──────────────────────────────────────
  const [serviciosRows, setServiciosRows] = useState<TplServicioRow[]>(() =>
    (plantilla?.items || [])
      .filter((i) => i.tipo_linea === 'SERVICIO')
      .map((i) => ({
        uid: nextTplUid('tsrv'),
        id_servicio: i.id_servicio ?? null,
        descripcion: i.descripcion,
        cantidad_base: Number(i.cantidad_base) || 1,
        unidad: i.unidad || 'servicio',
        costo_unitario_fijo: Number(i.costo_unitario_fijo ?? 0),
        precio_unitario_fijo: Number(i.precio_unitario_fijo ?? 0),
        precio_catalogo_vivo:
          i.catalogo_servicios?.precio_base != null
            ? Number(i.catalogo_servicios.precio_base)
            : null,
        es_por_equipo: i.es_por_equipo !== false,
        usar_precio_catalogo: Boolean(i.usar_precio_catalogo && i.id_servicio),
        es_opcional: Boolean(i.es_opcional),
        iva_aplicable: i.iva_aplicable !== false,
        observaciones: i.observaciones || '',
      })),
  );

  const [componentesRows, setComponentesRows] = useState<TplComponenteRow[]>(() =>
    (plantilla?.items || [])
      .filter((i) => i.tipo_linea === 'COMPONENTE')
      .map((i) => {
        const cmp = i.catalogo_componentes;
        return {
          uid: nextTplUid('tcmp'),
          id_componente: i.id_componente ?? null,
          descripcion: i.descripcion,
          referencia_label: cmp?.referencia_fabricante || cmp?.codigo_interno || '',
          marca_label: cmp?.marca || '',
          cantidad_base: Number(i.cantidad_base) || 1,
          unidad: i.unidad || cmp?.unidad_medida || 'unidad',
          costo_unitario_fijo: Number(i.costo_unitario_fijo ?? 0),
          precio_unitario_fijo: Number(i.precio_unitario_fijo ?? 0),
          precio_venta_vivo: cmp?.precio_venta != null ? Number(cmp.precio_venta) : null,
          precio_compra_vivo: cmp?.precio_compra != null ? Number(cmp.precio_compra) : null,
          stock_actual:
            cmp && cmp.es_inventariable !== false ? Number(cmp.stock_actual ?? 0) : null,
          es_por_equipo: i.es_por_equipo !== false,
          usar_precio_catalogo: Boolean(i.usar_precio_catalogo && i.id_componente),
          es_opcional: Boolean(i.es_opcional),
          iva_aplicable: i.iva_aplicable !== false,
          garantia_meses: i.garantia_meses ?? null,
          observaciones: i.observaciones || '',
        };
      }),
  );

  const [otrosRows, setOtrosRows] = useState<TplOtroRow[]>(() =>
    (plantilla?.items || [])
      .filter((i) => i.tipo_linea === 'OTRO')
      .map((i) => ({
        uid: nextTplUid('totr'),
        categoria_rubro: i.categoria_rubro || 'OTRO',
        descripcion: i.descripcion,
        detalle_calculo: i.detalle_calculo || '',
        cantidad_base: Number(i.cantidad_base) || 1,
        unidad: i.unidad || 'global',
        costo_unitario_fijo: Number(i.costo_unitario_fijo ?? 0),
        precio_unitario_fijo: Number(i.precio_unitario_fijo ?? 0),
        es_por_equipo: Boolean(i.es_por_equipo),
        visible_cliente: i.visible_cliente !== false,
        es_opcional: Boolean(i.es_opcional),
        iva_aplicable: i.iva_aplicable !== false,
        observaciones: i.observaciones || '',
      })),
  );

  // ── Estado Sección 6: Condiciones Comerciales ─────────────────────────────
  const [formaPago, setFormaPago] = useState<string>(plantilla?.forma_pago || 'CONTADO');
  const [tiempoDias, setTiempoDias] = useState<string>(
    plantilla?.tiempo_estimado_dias != null ? String(plantilla.tiempo_estimado_dias) : '2',
  );
  const [mesesGarantia, setMesesGarantia] = useState<string>(
    String(plantilla?.meses_garantia ?? orgConfig?.garantia_meses_defecto ?? 3),
  );
  const [terminosCondiciones, setTerminosCondiciones] = useState<string>(
    plantilla?.terminos_condiciones || '',
  );

  // ── Estado Simulador Sticky & AIU & PDF Mode ──────────────────────────────
  const [simEquipos, setSimEquipos] = useState<number>(1);
  const [usaAiu, setUsaAiu] = useState<boolean>(Boolean(plantilla?.usa_aiu));
  const [aiuAdminPct, setAiuAdminPct] = useState<number>(
    Number(plantilla?.aiu_admin_porcentaje ?? 10),
  );
  const [aiuImprevPct, setAiuImprevPct] = useState<number>(
    Number(plantilla?.aiu_imprevistos_porcentaje ?? 5),
  );
  const [aiuUtilPct, setAiuUtilPct] = useState<number>(
    Number(plantilla?.aiu_utilidad_porcentaje ?? 5),
  );
  const [ivaSobreUtilidadAiu, setIvaSobreUtilidadAiu] = useState<boolean>(
    Boolean(plantilla?.iva_sobre_utilidad_aiu),
  );
  const [pdfMode, setPdfMode] = useState<PdfPresentationMode>(() =>
    toPdfMode(plantilla?.mostrar_desglose_precios),
  );

  // Buscadores y toggles de UI
  const [showCostosInternos, setShowCostosInternos] = useState<boolean>(true);
  const [srvSearch, setSrvSearch] = useState<string>('');
  const [cmpSearch, setCmpSearch] = useState<string>('');

  const cmpQueryTrim = cmpSearch.trim();
  const { data: catalogoSearchData } = useQuery({
    queryKey: ['cpq-catalogo-componentes-search', cmpQueryTrim],
    queryFn: () => comprasService.getArticulos({ activo: true, q: cmpQueryTrim, limit: 30 }),
    enabled: cmpQueryTrim.length >= 2,
    staleTime: 30_000,
  });

  const articulosMaestro = useMemo(
    () => catalogoArticulosData?.items || [],
    [catalogoArticulosData],
  );
  const articulosSearch = useMemo(() => catalogoSearchData?.items || [], [catalogoSearchData]);
  const unidadOptions = useMemo(() => buildUnidadOptions(unidadesMedida), [unidadesMedida]);

  const moneyLocale = orgConfig?.locale || locale || 'es-CO';
  const moneySymbol = orgConfig?.simbolo_moneda || currencySymbol || '$';
  const moneyDecimals = Number(orgConfig?.decimales_moneda ?? 0);
  const ivaPorcentaje = Number(orgConfig?.tasa_impuesto_defecto ?? taxRate ?? 19);

  // Mapas de precios vivos de catálogo para el simulador y filas vinculadas
  const srvLiveMap = useMemo(() => {
    const m = new Map<number, number>();
    for (const s of serviciosCatalogo) {
      if (s.precio_base != null) m.set(s.id_servicio, Number(s.precio_base));
    }
    return m;
  }, [serviciosCatalogo]);

  const cmpLiveMap = useMemo(() => {
    const m = new Map<number, { venta: number; compra: number }>();
    for (const c of articulosMaestro) {
      m.set(c.id_componente, {
        venta: Number(c.precio_venta ?? 0),
        compra: Number(c.precio_compra ?? 0),
      });
    }
    for (const c of articulosSearch) {
      m.set(c.id_componente, {
        venta: Number(c.precio_venta ?? 0),
        compra: Number(c.precio_compra ?? 0),
      });
    }
    return m;
  }, [articulosMaestro, articulosSearch]);

  // ── Cascada EAM: Arquetipo → Subsistemas & Modelos OEM ────────────────────
  const arquetipoSeleccionado = useMemo(
    () =>
      idTipoEquipo !== 'NONE'
        ? arquetipos.find((a) => String(a.id_tipo_equipo) === idTipoEquipo) || null
        : null,
    [arquetipos, idTipoEquipo],
  );

  const modulosDisponibles = useMemo(() => {
    if (!arquetipoSeleccionado) return [];
    return (arquetipoSeleccionado.tipo_equipo_modulos || [])
      .filter((tm) => tm.modulo)
      .map((tm) => ({
        id_modulo: tm.id_modulo,
        nombre: tm.etiqueta_local || tm.modulo.nombre_modulo,
        codigo: tm.modulo.codigo_modulo,
      }));
  }, [arquetipoSeleccionado]);

  const modelosFiltrados = useMemo(() => {
    if (idTipoEquipo === 'NONE') return modelos;
    return modelos.filter((m) => String(m.id_tipo_equipo) === idTipoEquipo);
  }, [modelos, idTipoEquipo]);

  const arquetipoOptions: EamSelectOption[] = useMemo(
    () => [
      {
        value: 'NONE',
        label: 'Universal · Todos los equipos',
        badge: 'ALL',
        description: 'Aplica a cualquier clase de activo',
      },
      ...arquetipos.map((a) => ({
        value: String(a.id_tipo_equipo),
        label: a.nombre_tipo,
        badge: a.codigo_tipo,
        description:
          a.tipo_equipo_modulos && a.tipo_equipo_modulos.length > 0
            ? `${a.tipo_equipo_modulos.length} subsistema(s) EAM`
            : undefined,
      })),
    ],
    [arquetipos],
  );

  const moduloOptions: EamSelectOption[] = useMemo(
    () => [
      { value: 'NONE', label: 'Todos los subsistemas', badge: 'ALL' },
      ...modulosDisponibles.map((m) => ({
        value: String(m.id_modulo),
        label: m.nombre,
        badge: m.codigo,
      })),
    ],
    [modulosDisponibles],
  );

  const modeloOptions: EamSelectOption[] = useMemo(
    () => [
      { value: 'NONE', label: 'Cualquier modelo OEM', badge: 'ALL' },
      ...modelosFiltrados.map((m) => ({
        value: String(m.id_modelo_equipo),
        label: `${m.marca} ${m.modelo}`.trim(),
        badge: m.codigo_modelo,
      })),
    ],
    [modelosFiltrados],
  );

  // Píldora explicativa Smart Match EAU en lenguaje humano
  const smartMatchExplain = useMemo(() => {
    const tipoLabel = resolveTipoOfertaLabel(
      tipoCotizacion || 'SERVICIO_TECNICO',
      tiposOfertaCatalogo,
    );
    const modSel =
      idModulo !== 'NONE' ? modulosDisponibles.find((m) => String(m.id_modulo) === idModulo) : null;
    const modeloSel =
      idModeloEquipo !== 'NONE'
        ? modelos.find((m) => String(m.id_modelo_equipo) === idModeloEquipo)
        : null;

    if (modeloSel) {
      return {
        tier: 'Alta precisión · Modelo OEM',
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        text: `El Asistente CPQ sugerirá esta plantilla en primer lugar cuando la cotización incluya equipos modelo ${modeloSel.marca} ${modeloSel.modelo}${
          modSel ? ` (Subsistema: ${modSel.nombre})` : ''
        } o cuando el asesor seleccione ofertas tipo "${tipoLabel}".`,
      };
    }
    if (arquetipoSeleccionado) {
      return {
        tier: modSel ? 'Especializada · Clase + Subsistema EAM' : 'Especializada · Clase EAM',
        badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
        text: `Se recomendará automáticamente al cotizar activos de clase "${arquetipoSeleccionado.nombre_tipo}"${
          modSel ? ` (enfocada en subsistema "${modSel.nombre}")` : ''
        } y recibirá impulso adicional en ofertas de tipo "${tipoLabel}".`,
      };
    }
    return {
      tier: 'Universal · Multi-Equipo',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
      text: `Plantilla transversal disponible para cualquier clase de equipo; el Asistente CPQ la priorizará automáticamente cuando el asesor elija ofertas de tipo "${tipoLabel}".`,
    };
  }, [
    tipoCotizacion,
    tiposOfertaCatalogo,
    arquetipoSeleccionado,
    idModulo,
    modulosDisponibles,
    idModeloEquipo,
    modelos,
  ]);

  // ── Búsquedas tokenizadas (Servicios y Repuestos WMS) ─────────────────────
  const selectedTipoIdNum = idTipoEquipo !== 'NONE' ? Number(idTipoEquipo) : null;

  const serviciosFiltrados = useMemo(() => {
    const q = srvSearch.trim();
    const list = q
      ? serviciosCatalogo.filter((s) =>
          matchesAllTokens(q, [s.nombre_servicio, s.codigo_servicio, s.categoria]),
        )
      : serviciosCatalogo;

    const scoreSrv = (tid?: number | null) => {
      if (!selectedTipoIdNum) return 0;
      if (tid === selectedTipoIdNum) return 2;
      if (!tid) return 1;
      return 0;
    };

    return [...list]
      .sort((a, b) => scoreSrv(b.id_tipo_equipo) - scoreSrv(a.id_tipo_equipo))
      .slice(0, 30);
  }, [serviciosCatalogo, srvSearch, selectedTipoIdNum]);

  const componentesFiltrados = useMemo(() => {
    const q = cmpSearch.trim();
    const byId = new Map<number, (typeof articulosMaestro)[number]>();

    if (q.length >= 2) {
      for (const item of articulosSearch) {
        byId.set(item.id_componente, item);
      }
    }
    for (const item of articulosMaestro) {
      if (byId.has(item.id_componente)) continue;
      if (
        !q ||
        matchesAllTokens(q, [
          item.descripcion_corta,
          item.referencia_fabricante,
          item.codigo_interno,
          item.marca,
          item.marcas?.nombre,
        ])
      ) {
        byId.set(item.id_componente, item);
      }
    }

    const scoreCmp = (c: (typeof articulosMaestro)[number]) => {
      if (!selectedTipoIdNum) return 0;
      const tiposIds = c.tipos_equipo_ids || c.tipos_equipo?.map((t) => t.id_tipo_equipo) || [];
      if (c.aplica_todos_tipos === false && tiposIds.includes(selectedTipoIdNum)) return 2;
      if (c.aplica_todos_tipos !== false) return 1;
      return 0;
    };

    return Array.from(byId.values())
      .sort((a, b) => scoreCmp(b) - scoreCmp(a))
      .slice(0, 30);
  }, [articulosMaestro, articulosSearch, cmpSearch, selectedTipoIdNum]);

  // ── Simulador Financiero en Vivo (N equipos + baseline 1 equipo) ──────────
  const sim = useMemo(
    () =>
      computeSimulatedEconomics({
        simEquipos,
        serviciosRows,
        componentesRows,
        otrosRows,
        usaAiu,
        aiuAdminPct,
        aiuImprevPct,
        aiuUtilPct,
        ivaSobreUtilidadAiu,
        ivaPorcentaje,
        orgConfig,
        srvLiveMap,
        cmpLiveMap,
      }),
    [
      simEquipos,
      serviciosRows,
      componentesRows,
      otrosRows,
      usaAiu,
      aiuAdminPct,
      aiuImprevPct,
      aiuUtilPct,
      ivaSobreUtilidadAiu,
      ivaPorcentaje,
      orgConfig,
      srvLiveMap,
      cmpLiveMap,
    ],
  );

  const sim1Eq = useMemo(
    () =>
      simEquipos === 1
        ? sim
        : computeSimulatedEconomics({
            simEquipos: 1,
            serviciosRows,
            componentesRows,
            otrosRows,
            usaAiu,
            aiuAdminPct,
            aiuImprevPct,
            aiuUtilPct,
            ivaSobreUtilidadAiu,
            ivaPorcentaje,
            orgConfig,
            srvLiveMap,
            cmpLiveMap,
          }),
    [
      simEquipos,
      sim,
      serviciosRows,
      componentesRows,
      otrosRows,
      usaAiu,
      aiuAdminPct,
      aiuImprevPct,
      aiuUtilPct,
      ivaSobreUtilidadAiu,
      ivaPorcentaje,
      orgConfig,
      srvLiveMap,
      cmpLiveMap,
    ],
  );

  // ── Acciones de Construcción de Líneas ────────────────────────────────────
  const addOtroPreset = (categoria: string, label: string) => {
    const defaults: Record<string, { desc: string; und: string }> = {
      TRANSPORTE: {
        desc: 'Transporte técnico y movilización de equipos/herramientas',
        und: 'global',
      },
      VIATICOS: {
        desc: 'Viáticos de personal técnico (alimentación y hospedaje)',
        und: 'dia-tecnico',
      },
      POLIZA: {
        desc: 'Constitución de pólizas de cumplimiento y calidad del servicio',
        und: 'global',
      },
      ALQUILER: { desc: 'Alquiler de equipo auxiliar / grúa / andamio certificado', und: 'dia' },
      DISPOSICION_AMBIENTAL: {
        desc: 'Disposición ambiental final certificada de residuos peligrosos (RESPEL)',
        und: 'global',
      },
      SUBCONTRATO: { desc: 'Servicio especializado subcontratado', und: 'global' },
      OTRO: { desc: label === 'Otro Rubro' ? '' : label, und: 'global' },
    };
    const d = defaults[categoria] || defaults.OTRO;
    setOtrosRows((prev) => [
      ...prev,
      {
        uid: nextTplUid('totr'),
        categoria_rubro: categoria,
        descripcion: d.desc,
        detalle_calculo: '',
        cantidad_base: 1,
        unidad: d.und,
        costo_unitario_fijo: 0,
        precio_unitario_fijo: 0,
        es_por_equipo: false, // Logística, viáticos y pólizas inician fijos por evento
        visible_cliente: true,
        es_opcional: false,
        iva_aplicable: categoria !== 'POLIZA', // Póliza inicia exenta de IVA
        observaciones: '',
      },
    ]);
  };

  // ── Guardado Atómico (Payload estrictamente saneado contra DTO) ───────────
  const isSaving = crear.isPending || actualizar.isPending;

  const handleSave = async () => {
    if (!nombre.trim()) {
      toast.error('Ingresa el nombre de la plantilla estándar');
      return;
    }
    if (!codigoLimpio) {
      toast.error('El código único de la plantilla es obligatorio');
      return;
    }
    if (codigoDuplicado) {
      toast.error(
        `El código "${codigoLimpio}" ya está registrado en otra plantilla. Edítalo o pulsa Autogenerar.`,
      );
      return;
    }

    const itemsPayload: PlantillaCotizacionItem[] = [];
    let ord = 0;

    for (const s of serviciosRows) {
      if (!s.descripcion.trim()) continue;
      ord += 1;
      const livePu =
        s.usar_precio_catalogo && s.id_servicio
          ? (srvLiveMap.get(s.id_servicio) ?? s.precio_catalogo_vivo)
          : null;
      itemsPayload.push({
        tipo_linea: 'SERVICIO',
        id_servicio: s.id_servicio ?? null,
        id_componente: null,
        categoria_rubro: null,
        descripcion: s.descripcion.trim(),
        detalle_calculo: null,
        unidad: (s.unidad || 'servicio').trim().slice(0, 30),
        cantidad_base: Math.max(0.01, Number(s.cantidad_base) || 1),
        es_por_equipo: Boolean(s.es_por_equipo),
        usar_precio_catalogo: Boolean(s.usar_precio_catalogo && s.id_servicio),
        precio_unitario_fijo: livePu != null ? Number(livePu) : Number(s.precio_unitario_fijo || 0),
        costo_unitario_fijo: Number(s.costo_unitario_fijo || 0),
        visible_cliente: true,
        es_opcional: Boolean(s.es_opcional),
        iva_aplicable: s.iva_aplicable !== false,
        garantia_meses: null,
        orden_item: ord,
        observaciones: s.observaciones.trim() || null,
      });
    }

    for (const c of componentesRows) {
      if (!c.descripcion.trim()) continue;
      ord += 1;
      const liveEntry = c.id_componente ? cmpLiveMap.get(c.id_componente) : undefined;
      const livePu =
        c.usar_precio_catalogo && c.id_componente
          ? (liveEntry?.venta ?? c.precio_venta_vivo)
          : null;
      const liveCu =
        c.usar_precio_catalogo && c.id_componente
          ? (liveEntry?.compra ?? c.precio_compra_vivo)
          : null;
      itemsPayload.push({
        tipo_linea: 'COMPONENTE',
        id_servicio: null,
        id_componente: c.id_componente ?? null,
        categoria_rubro: null,
        descripcion: c.descripcion.trim(),
        detalle_calculo: null,
        unidad: (c.unidad || 'unidad').trim().slice(0, 30),
        cantidad_base: Math.max(0.01, Number(c.cantidad_base) || 1),
        es_por_equipo: Boolean(c.es_por_equipo),
        usar_precio_catalogo: Boolean(c.usar_precio_catalogo && c.id_componente),
        precio_unitario_fijo: livePu != null ? Number(livePu) : Number(c.precio_unitario_fijo || 0),
        costo_unitario_fijo: liveCu != null ? Number(liveCu) : Number(c.costo_unitario_fijo || 0),
        visible_cliente: true,
        es_opcional: Boolean(c.es_opcional),
        iva_aplicable: c.iva_aplicable !== false,
        garantia_meses: c.garantia_meses != null ? Number(c.garantia_meses) : null,
        orden_item: ord,
        observaciones: c.observaciones.trim() || null,
      });
    }

    for (const o of otrosRows) {
      if (!o.descripcion.trim()) continue;
      ord += 1;
      itemsPayload.push({
        tipo_linea: 'OTRO',
        id_servicio: null,
        id_componente: null,
        categoria_rubro: (o.categoria_rubro?.trim() || 'OTRO').toUpperCase().slice(0, 40),
        descripcion: o.descripcion.trim(),
        detalle_calculo: o.detalle_calculo.trim() || null,
        unidad: (o.unidad || 'global').trim().slice(0, 30),
        cantidad_base: Math.max(0.01, Number(o.cantidad_base) || 1),
        es_por_equipo: Boolean(o.es_por_equipo),
        usar_precio_catalogo: false,
        precio_unitario_fijo: o.visible_cliente ? Number(o.precio_unitario_fijo || 0) : 0,
        costo_unitario_fijo: Number(o.costo_unitario_fijo || 0),
        visible_cliente: o.visible_cliente !== false,
        es_opcional: Boolean(o.es_opcional),
        iva_aplicable: o.visible_cliente ? o.iva_aplicable !== false : false,
        garantia_meses: null,
        orden_item: ord,
        observaciones: o.observaciones.trim() || null,
      });
    }

    if (itemsPayload.length === 0) {
      toast.error('Agrega al menos una línea con descripción antes de guardar la plantilla');
      return;
    }

    const payload: Partial<PlantillaCotizacionRecord> = {
      codigo_plantilla: codigoLimpio,
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || null,
      tipo_cotizacion: tipoCotizacion.trim() || 'SERVICIO_TECNICO',
      id_tipo_equipo: idTipoEquipo !== 'NONE' ? Number(idTipoEquipo) : null,
      id_modelo_equipo: idModeloEquipo !== 'NONE' ? Number(idModeloEquipo) : null,
      id_modulo: idModulo !== 'NONE' ? Number(idModulo) : null,
      asunto_sugerido: asuntoSugerido.trim() || null,
      descripcion_general: descripcionGeneral.trim() || null,
      alcance_trabajo: alcanceTrabajo.trim() || null,
      exclusiones: exclusiones.trim() || null,
      terminos_condiciones: terminosCondiciones.trim() || null,
      forma_pago: formaPago.trim() || 'CONTADO',
      meses_garantia: Math.max(0, Number(mesesGarantia) || 0),
      tiempo_estimado_dias: tiempoDias.trim() !== '' ? Math.max(0, Number(tiempoDias) || 0) : null,
      usa_aiu: usaAiu,
      aiu_admin_porcentaje: usaAiu ? Number(aiuAdminPct) || 0 : 0,
      aiu_imprevistos_porcentaje: usaAiu ? Number(aiuImprevPct) || 0 : 0,
      aiu_utilidad_porcentaje: usaAiu ? Number(aiuUtilPct) || 0 : 0,
      iva_sobre_utilidad_aiu: usaAiu && ivaSobreUtilidadAiu,
      mostrar_desglose_precios: fromPdfMode(pdfMode),
      items: itemsPayload,
    };

    try {
      const saved =
        isEdit && plantilla
          ? await actualizar.mutateAsync({ id: plantilla.id_plantilla, payload })
          : await crear.mutateAsync(payload);
      onSaved?.(saved);
    } catch {
      // El toast de error ya se dispara desde usePlantillasActions()
    }
  };

  const totalLineas = serviciosRows.length + componentesRows.length + otrosRows.length;
  const orgDefaultPdfLabel = orgConfig?.cot_mostrar_desglose_precios ? 'Detallado' : 'Suma Alzada';

  return (
    <div className="space-y-5 -mx-3 sm:-mx-5 px-3 sm:px-5 pt-3 pb-14 bg-slate-50/90 min-h-screen rounded-2xl">
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* BARRA SUPERIOR EJECUTIVA STICKY                                        */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div className="sticky top-0 z-20 px-4 py-3 bg-white/95 backdrop-blur border border-slate-200/90 rounded-xl shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button type="button" variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Volver al Hub de Plantillas
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-slate-900 truncate flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary shrink-0" />
                {isEdit
                  ? 'Editar Plantilla Estándar CPQ'
                  : isDuplicate
                    ? 'Duplicar Plantilla Estándar CPQ'
                    : 'Nueva Plantilla Estándar CPQ'}
              </h1>
              <Badge
                variant="outline"
                className={`font-mono text-[11px] ${
                  codigoDuplicado
                    ? 'bg-rose-50 text-rose-700 border-rose-300'
                    : 'bg-slate-50 text-slate-600'
                }`}
              >
                {codigoLimpio || 'TPL-...'}
              </Badge>
              <Badge
                variant="outline"
                className="text-[11px] bg-primary/5 text-primary border-primary/20"
              >
                {resolveTipoOfertaLabel(tipoCotizacion || 'SERVICIO_TECNICO', tiposOfertaCatalogo)}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 truncate">
              {nombre.trim() ||
                'Define la receta comercial reutilizable con auto-escalado × Equipo, precios vivos o tarifas de paquete'}
              {totalLineas > 0 && (
                <span className="ml-2 text-slate-400">
                  · {totalLineas} línea{totalLineas !== 1 ? 's' : ''} ({sim.lineasEscalables}{' '}
                  escalan × Equipo · {sim.lineasFijas} fija{sim.lineasFijas !== 1 ? 's' : ''})
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isEdit && plantilla && onSelectForNewQuote && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onSelectForNewQuote(plantilla)}
              className="gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Usar en Nueva COT
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" onClick={onBack} disabled={isSaving}>
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={isSaving || codigoDuplicado}
            className="gap-1.5"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isEdit ? 'Guardar Cambios' : 'Crear Plantilla'}
          </Button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* LAYOUT SPLIT-SCREEN (8 COL CONSTRUCTOR + 4 COL SIMULADOR STICKY)       */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* COLUMNA IZQUIERDA (8) */}
        <div className="xl:col-span-8 space-y-5">
          {/* SECCIÓN 1: IDENTIDAD COMERCIAL Y REGLAS SMART MATCH EAU */}
          <Card className="bg-white border-slate-200/90 shadow-sm rounded-xl">
            <CardHeader className="py-3.5 px-5 border-b border-slate-100 bg-slate-50/40 rounded-t-xl">
              <CardTitle className="text-sm font-bold flex items-center gap-2.5 text-slate-900">
                <span className="h-6 w-6 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-xs font-extrabold shrink-0">
                  1
                </span>
                <Layers className="h-4 w-4 text-primary shrink-0" />
                <span>Identidad Comercial y Reglas Smart Match EAU</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2 space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">
                    Nombre de la Plantilla *
                  </Label>
                  <Input
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej: Overhaul Turbo + Banco de Carga (Generador)"
                    className="h-9 text-sm font-medium bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-xs font-semibold text-slate-700">Código Único *</Label>
                    {codigoManual && nombre.trim() && (
                      <button
                        type="button"
                        onClick={() => {
                          setCodigoManual(false);
                          setCodigoManualValor('');
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                        title="Volver al código breve autogenerado desde el nombre"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Autogenerar
                      </button>
                    )}
                  </div>
                  <Input
                    value={codigoDisplay}
                    onChange={(e) => {
                      setCodigoManual(true);
                      setCodigoManualValor(normalizeManualPlantillaCode(e.target.value));
                    }}
                    onBlur={() => {
                      if (codigoManual) {
                        setCodigoManualValor((v) => v.replace(/-+$/g, ''));
                      }
                    }}
                    placeholder="TPL-..."
                    className={`h-9 text-xs font-mono bg-white uppercase ${
                      codigoDuplicado
                        ? 'border-rose-400 focus-visible:ring-rose-200 text-rose-700'
                        : ''
                    }`}
                    maxLength={40}
                  />
                  {codigoDuplicado ? (
                    <p className="text-[11px] font-medium text-rose-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      Código ya registrado en otra plantilla
                    </p>
                  ) : codigoLimpio ? (
                    <p className="text-[11px] font-medium text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 shrink-0" />
                      Código único disponible{!codigoManual ? ' (auto)' : ''}
                    </p>
                  ) : codigoManual ? (
                    <p className="text-[11px] font-medium text-rose-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      El código único es obligatorio
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-400">
                      Se autogenerará al escribir el nombre
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">
                  Resumen Interno del Hub (Opcional)
                </Label>
                <Input
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Breve guía para que el equipo comercial reconozca cuándo elegir esta receta..."
                  className="h-9 text-xs bg-white"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-xs font-semibold text-slate-700">
                      Tipo de Oferta (Abierto)
                    </Label>
                    <button
                      type="button"
                      onClick={() => setTiposModalOpen(true)}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-primary transition-colors"
                      title="Crear, renombrar o limpiar tipos de oferta del catálogo CPQ"
                    >
                      <Settings2 className="h-3 w-3" />
                      Gestionar
                    </button>
                  </div>
                  <CpqCreatableCombobox
                    value={tipoCotizacion}
                    onChange={setTipoCotizacion}
                    options={tipoOfertaOptions}
                    placeholder="Seleccionar o crear tipo..."
                    searchPlaceholder="Buscar o escribir tipo nuevo (ej. Overhaul Turbo Especial)..."
                    customLabel="Crear nuevo tipo"
                    normalizeCustom={normalizeTipoOfertaCodigo}
                    showNormalizedPreview
                    onCreateCustom={async (rawLabel, normalizedCode) => {
                      const created = await tiposOfertaActions.crear.mutateAsync({
                        nombre: rawLabel,
                        codigo: normalizedCode,
                      });
                      return created.codigo;
                    }}
                    minDropdownWidth={310}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">
                    Clase de Equipo (Arquetipo EAM)
                  </Label>
                  <EamSelect
                    value={idTipoEquipo}
                    onChange={(v) => {
                      setIdTipoEquipo(v);
                      setIdModulo('NONE');
                      setIdModeloEquipo('NONE');
                    }}
                    options={arquetipoOptions}
                    searchable
                    placeholder="Universal · Todos los equipos"
                    searchPlaceholder="Buscar arquetipo EAM..."
                    size="sm"
                    minDropdownWidth={300}
                    className="h-9 rounded-lg"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">
                    Parte / Subsistema EAM (Opcional)
                  </Label>
                  <EamSelect
                    disabled={idTipoEquipo === 'NONE' || modulosDisponibles.length === 0}
                    value={idModulo}
                    onChange={setIdModulo}
                    options={moduloOptions}
                    searchable={modulosDisponibles.length > 4}
                    placeholder={
                      idTipoEquipo === 'NONE'
                        ? 'Selecciona primero una Clase de Equipo'
                        : modulosDisponibles.length === 0
                          ? 'Sin subsistemas configurados en este arquetipo'
                          : 'Todos los subsistemas'
                    }
                    searchPlaceholder="Buscar subsistema..."
                    size="sm"
                    minDropdownWidth={280}
                    className="h-9 rounded-lg"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">
                    Modelo OEM Específico (Opcional)
                  </Label>
                  <EamSelect
                    value={idModeloEquipo}
                    onChange={setIdModeloEquipo}
                    options={modeloOptions}
                    searchable
                    placeholder="Cualquier modelo OEM"
                    searchPlaceholder="Buscar marca o modelo OEM..."
                    size="sm"
                    minDropdownWidth={280}
                    className="h-9 rounded-lg"
                  />
                </div>
              </div>

              {/* Píldora Explicativa Smart Match EAU */}
              <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 via-white to-indigo-50/50 p-3 flex items-start gap-2.5">
                <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-slate-800">
                      Regla de Sugerencia Smart Match EAU
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-semibold ${smartMatchExplain.badgeClass}`}
                    >
                      {smartMatchExplain.tier}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{smartMatchExplain.text}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SECCIÓN 2: OBJETO SUGERIDO, ALCANCE TÉCNICO Y EXCLUSIONES */}
          <Card className="bg-white border-slate-200/90 shadow-sm rounded-xl">
            <CardHeader className="py-3.5 px-5 border-b border-slate-100 bg-slate-50/40 rounded-t-xl">
              <CardTitle className="text-sm font-bold flex items-center gap-2.5 text-slate-900">
                <span className="h-6 w-6 rounded-lg bg-blue-50 text-blue-700 border border-blue-200/80 flex items-center justify-center text-xs font-extrabold shrink-0">
                  2
                </span>
                <FileText className="h-4 w-4 text-blue-600 shrink-0" />
                <span>Objeto Sugerido, Alcance Técnico y Exclusiones Estándar</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 space-y-4">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">
                  Asunto / Título Comercial Sugerido
                </Label>
                <Input
                  value={asuntoSugerido}
                  onChange={(e) => setAsuntoSugerido(e.target.value)}
                  placeholder="Título comercial que se precargará al instanciar una COT desde esta plantilla"
                  className="h-9 text-xs font-medium bg-white"
                  maxLength={300}
                />
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setDescGenExpandida((v) => !v)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                >
                  {descGenExpandida ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                  {descGenExpandida
                    ? 'Ocultar descripción general introductoria'
                    : 'Agregar descripción general introductoria (opcional)'}
                </button>
                {descGenExpandida && (
                  <div className="mt-2 space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">
                      Descripción General Introductoria
                    </Label>
                    <Textarea
                      rows={2}
                      value={descripcionGeneral}
                      onChange={(e) => setDescripcionGeneral(e.target.value)}
                      placeholder="Texto introductorio estándar que antecede al alcance técnico en el PDF..."
                      className="text-xs bg-white"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-emerald-800">
                    Alcance Técnico Estándar
                  </Label>
                  <CpqBulletListEditor
                    variant="incluido"
                    value={alcanceTrabajo}
                    onChange={setAlcanceTrabajo}
                    placeholder="Actividad o entregable incluido (Enter para añadir)..."
                    emptyMessage="Sin ítems de alcance estándar aún."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-rose-800">
                    Exclusiones Estándar
                  </Label>
                  <CpqBulletListEditor
                    variant="exclusion"
                    value={exclusiones}
                    onChange={setExclusiones}
                    placeholder="Concepto excluido (Enter para añadir)..."
                    emptyMessage="Sin exclusiones estándar aún."
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SECCIÓN 3: SERVICIOS TÉCNICOS Y MANO DE OBRA */}
          <Card className="bg-white border-slate-200/90 shadow-sm rounded-xl">
            <CardHeader className="py-3.5 px-5 border-b border-slate-100 bg-slate-50/40 rounded-t-xl flex flex-row items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-sm font-bold flex items-center gap-2.5 text-slate-900">
                <span className="h-6 w-6 rounded-lg bg-blue-50 text-blue-700 border border-blue-200/80 flex items-center justify-center text-xs font-extrabold shrink-0">
                  3
                </span>
                <Wrench className="h-4 w-4 text-blue-600 shrink-0" />
                <span>Servicios Técnicos y Mano de Obra ({serviciosRows.length})</span>
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[11px] text-slate-500"
                  onClick={() => setShowCostosInternos((v) => !v)}
                >
                  {showCostosInternos ? (
                    <EyeOff className="h-3.5 w-3.5 mr-1" />
                  ) : (
                    <Eye className="h-3.5 w-3.5 mr-1" />
                  )}
                  {showCostosInternos ? 'Ocultar Costos' : 'Ver Costos'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() =>
                    setServiciosRows((prev) => [
                      ...prev,
                      {
                        uid: nextTplUid('tsrv'),
                        id_servicio: null,
                        descripcion: '',
                        cantidad_base: 1,
                        unidad: 'servicio',
                        costo_unitario_fijo: 0,
                        precio_unitario_fijo: 0,
                        precio_catalogo_vivo: null,
                        es_por_equipo: true,
                        usar_precio_catalogo: false,
                        es_opcional: false,
                        iva_aplicable: true,
                        observaciones: '',
                      },
                    ])
                  }
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Línea Libre
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {/* Buscador tokenizado de catálogo de servicios */}
              <div className="relative">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={srvSearch}
                  onChange={(e) => setSrvSearch(e.target.value)}
                  placeholder="Buscar en Catálogo de Servicios para agregar (nombre, código o categoría)..."
                  className="pl-8 h-8 text-xs bg-slate-50"
                />
                {srvSearch.trim().length > 0 && (
                  <div className="absolute z-30 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-64 overflow-y-auto divide-y divide-slate-100">
                    {serviciosFiltrados.length === 0 ? (
                      <div className="p-3 text-xs text-slate-500">
                        Sin coincidencias en catálogo. Usa &ldquo;+ Línea Libre&rdquo; para un
                        servicio a medida.
                      </div>
                    ) : (
                      serviciosFiltrados.map((s) => {
                        const esCompatibleSrv =
                          selectedTipoIdNum != null && s.id_tipo_equipo === selectedTipoIdNum;
                        const precioBase = Number(s.precio_base || 0);
                        return (
                          <button
                            key={s.id_servicio}
                            type="button"
                            onClick={() => {
                              setServiciosRows((prev) => [
                                ...prev,
                                {
                                  uid: nextTplUid('tsrv'),
                                  id_servicio: s.id_servicio,
                                  descripcion: s.nombre_servicio,
                                  cantidad_base: 1,
                                  unidad: 'servicio',
                                  costo_unitario_fijo: Math.round(precioBase * 0.45),
                                  precio_unitario_fijo: precioBase,
                                  precio_catalogo_vivo: precioBase,
                                  es_por_equipo: true,
                                  usar_precio_catalogo: true,
                                  es_opcional: false,
                                  iva_aplicable: true,
                                  observaciones: '',
                                },
                              ]);
                              setSrvSearch('');
                            }}
                            className="w-full px-3 py-2 text-left text-xs hover:bg-blue-50/70 flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <span className="font-mono text-[10px] text-slate-400 mr-1.5">
                                {s.codigo_servicio}
                              </span>
                              <span className="font-medium text-slate-800">
                                {s.nombre_servicio}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {esCompatibleSrv ? (
                                <Badge
                                  variant="outline"
                                  className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]"
                                >
                                  Compatible
                                </Badge>
                              ) : !s.id_tipo_equipo ? (
                                <Badge
                                  variant="outline"
                                  className="bg-slate-50 text-slate-600 border-slate-200 text-[10px]"
                                >
                                  Universal
                                </Badge>
                              ) : s.tipos_equipo?.codigo_tipo ? (
                                <Badge
                                  variant="outline"
                                  className="bg-slate-50 text-slate-500 border-slate-200 text-[10px]"
                                >
                                  {s.tipos_equipo.codigo_tipo}
                                </Badge>
                              ) : null}
                              <span className="font-mono font-bold text-slate-700">
                                {formatCurrency(precioBase)}
                              </span>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {serviciosRows.length === 0 ? (
                <div className="py-3.5 px-4 flex items-center justify-center gap-2 text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                  <Wrench className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                  <span>
                    Sin servicios aún. Busca en el catálogo arriba o añade una línea libre.
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="hidden md:grid grid-cols-12 gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <div className="col-span-5">Descripción del Servicio</div>
                    <div className="col-span-1 text-center">Base</div>
                    {showCostosInternos && (
                      <div className="col-span-2 text-right text-amber-700/80">Costo Ref.</div>
                    )}
                    <div
                      className={
                        showCostosInternos ? 'col-span-2 text-right' : 'col-span-4 text-right'
                      }
                    >
                      Tarifa Unit.
                    </div>
                    <div className="col-span-2 text-right pr-1">Sim. ({simEquipos} eq.)</div>
                  </div>
                  {serviciosRows.map((row, idx) => {
                    const livePu = row.id_servicio
                      ? (srvLiveMap.get(row.id_servicio) ?? row.precio_catalogo_vivo)
                      : null;
                    const precioEfectivo =
                      row.usar_precio_catalogo && livePu != null
                        ? livePu
                        : row.precio_unitario_fijo;
                    const cantSim =
                      Math.round(row.cantidad_base * (row.es_por_equipo ? simEquipos : 1) * 100) /
                      100;
                    const subSim = Math.round(cantSim * precioEfectivo * 100) / 100;

                    return (
                      <div
                        key={row.uid}
                        className={`p-3 rounded-xl border space-y-2.5 transition-all hover:border-slate-300 ${
                          row.es_opcional
                            ? 'bg-slate-50/80 border-dashed border-slate-300'
                            : 'bg-white border-slate-200/90 shadow-[0_1px_2px_rgba(15,23,42,0.03)]'
                        }`}
                      >
                        <div className="grid grid-cols-12 gap-2 items-center">
                          <div className="col-span-12 md:col-span-5">
                            <Input
                              value={row.descripcion}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) =>
                                setServiciosRows((prev) =>
                                  prev.map((r, i) =>
                                    i === idx ? { ...r, descripcion: e.target.value } : r,
                                  ),
                                )
                              }
                              placeholder="Descripción del servicio *"
                              className="h-8 text-xs font-medium"
                            />
                          </div>
                          <div className="col-span-4 md:col-span-1">
                            <CpqSmartNumberInput
                              min={0.01}
                              decimals={2}
                              align="center"
                              value={row.cantidad_base}
                              onChange={(val) =>
                                setServiciosRows((prev) =>
                                  prev.map((r, i) =>
                                    i === idx ? { ...r, cantidad_base: val || 1 } : r,
                                  ),
                                )
                              }
                              title="Cantidad base (para 1 equipo)"
                            />
                          </div>
                          {showCostosInternos && (
                            <div className="col-span-4 md:col-span-2">
                              <CpqMoneyInput
                                tone="cost"
                                value={row.costo_unitario_fijo}
                                locale={moneyLocale}
                                symbol={moneySymbol}
                                decimals={moneyDecimals}
                                onChange={(val) =>
                                  setServiciosRows((prev) =>
                                    prev.map((r, i) =>
                                      i === idx ? { ...r, costo_unitario_fijo: val } : r,
                                    ),
                                  )
                                }
                                title="Costo interno de referencia"
                              />
                            </div>
                          )}
                          <div
                            className={
                              showCostosInternos
                                ? 'col-span-4 md:col-span-2'
                                : 'col-span-8 md:col-span-4'
                            }
                          >
                            <CpqMoneyInput
                              value={precioEfectivo}
                              locale={moneyLocale}
                              symbol={moneySymbol}
                              decimals={moneyDecimals}
                              onChange={(val) =>
                                setServiciosRows((prev) =>
                                  prev.map((r, i) =>
                                    i === idx
                                      ? {
                                          ...r,
                                          precio_unitario_fijo: val,
                                          // Libertad total de tarifa de paquete: al editar el valor cambia a tarifa fija
                                          usar_precio_catalogo: false,
                                        }
                                      : r,
                                  ),
                                )
                              }
                              title={
                                row.usar_precio_catalogo
                                  ? 'Precio vivo del catálogo (edita para fijar tarifa de paquete)'
                                  : 'Tarifa fija de paquete definida en esta plantilla'
                              }
                            />
                          </div>
                          <div className="col-span-12 md:col-span-2 text-right font-mono text-xs font-bold text-slate-800">
                            <div>{formatCurrency(subSim)}</div>
                            {simEquipos > 1 && row.es_por_equipo && (
                              <span className="text-[10px] font-normal text-primary">
                                {cantSim} {row.unidad}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-100 text-[11px] text-slate-600">
                          <div className="flex flex-wrap items-center gap-3">
                            <div className="w-28">
                              <CpqCreatableCombobox
                                size="xs"
                                value={row.unidad}
                                onChange={(val) =>
                                  setServiciosRows((prev) =>
                                    prev.map((r, i) => (i === idx ? { ...r, unidad: val } : r)),
                                  )
                                }
                                options={unidadOptions}
                                placeholder="Unidad"
                                searchPlaceholder="Buscar unidad..."
                                customLabel="Usar unidad"
                                minDropdownWidth={230}
                              />
                            </div>
                            <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-800">
                              <input
                                type="checkbox"
                                checked={row.es_por_equipo}
                                onChange={(e) =>
                                  setServiciosRows((prev) =>
                                    prev.map((r, i) =>
                                      i === idx ? { ...r, es_por_equipo: e.target.checked } : r,
                                    ),
                                  )
                                }
                              />
                              Escalar × Equipo
                            </label>
                            {row.id_servicio && (
                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={row.usar_precio_catalogo}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    setServiciosRows((prev) =>
                                      prev.map((r, i) =>
                                        i === idx
                                          ? {
                                              ...r,
                                              usar_precio_catalogo: checked,
                                              precio_unitario_fijo:
                                                checked && livePu != null
                                                  ? livePu
                                                  : r.precio_unitario_fijo,
                                            }
                                          : r,
                                      ),
                                    );
                                  }}
                                />
                                <span
                                  className={
                                    row.usar_precio_catalogo
                                      ? 'text-teal-700 font-semibold inline-flex items-center gap-1'
                                      : 'text-slate-600'
                                  }
                                >
                                  {row.usar_precio_catalogo ? (
                                    <>
                                      <RefreshCw className="h-3 w-3" />
                                      Precio vivo catálogo
                                    </>
                                  ) : (
                                    'Tarifa fija paquete'
                                  )}
                                </span>
                              </label>
                            )}
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={row.iva_aplicable}
                                onChange={(e) =>
                                  setServiciosRows((prev) =>
                                    prev.map((r, i) =>
                                      i === idx ? { ...r, iva_aplicable: e.target.checked } : r,
                                    ),
                                  )
                                }
                              />
                              {taxLabel}
                            </label>
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={row.es_opcional}
                                onChange={(e) =>
                                  setServiciosRows((prev) =>
                                    prev.map((r, i) =>
                                      i === idx ? { ...r, es_opcional: e.target.checked } : r,
                                    ),
                                  )
                                }
                              />
                              Opcional
                            </label>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setServiciosRows((prev) => prev.filter((_, i) => i !== idx))
                            }
                            className="text-rose-500 hover:text-rose-700 p-1"
                            title="Eliminar servicio"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* SECCIÓN 4: REPUESTOS, COMPONENTES E INSUMOS WMS */}
          <Card className="bg-white border-slate-200/90 shadow-sm rounded-xl">
            <CardHeader className="py-3.5 px-5 border-b border-slate-100 bg-slate-50/40 rounded-t-xl flex flex-row items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-sm font-bold flex items-center gap-2.5 text-slate-900">
                <span className="h-6 w-6 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center justify-center text-xs font-extrabold shrink-0">
                  4
                </span>
                <Package className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Repuestos, Componentes e Insumos WMS ({componentesRows.length})</span>
              </CardTitle>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() =>
                  setComponentesRows((prev) => [
                    ...prev,
                    {
                      uid: nextTplUid('tcmp'),
                      id_componente: null,
                      descripcion: '',
                      referencia_label: '',
                      marca_label: '',
                      cantidad_base: 1,
                      unidad: 'unidad',
                      costo_unitario_fijo: 0,
                      precio_unitario_fijo: 0,
                      precio_venta_vivo: null,
                      precio_compra_vivo: null,
                      stock_actual: null,
                      es_por_equipo: true,
                      usar_precio_catalogo: false,
                      es_opcional: false,
                      iva_aplicable: true,
                      garantia_meses: null,
                      observaciones: '',
                    },
                  ])
                }
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Repuesto Manual
              </Button>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {/* Buscador inteligente dual del Catálogo Maestro WMS */}
              <div className="relative">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={cmpSearch}
                  onChange={(e) => setCmpSearch(e.target.value)}
                  placeholder="Buscar en Catálogo Maestro de Artículos por descripción, SKU, referencia o marca..."
                  className="pl-8 h-8 text-xs bg-slate-50"
                />
                {cmpSearch.trim().length > 0 && (
                  <div className="absolute z-30 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {componentesFiltrados.length === 0 ? (
                      <div className="p-3 text-xs text-slate-500">
                        Sin coincidencias en el Catálogo Maestro. Usa &ldquo;+ Repuesto
                        Manual&rdquo; sin restricciones.
                      </div>
                    ) : (
                      componentesFiltrados.map((c) => {
                        const stock = Number(c.stock_actual ?? 0);
                        const marcaNom = c.marcas?.nombre || c.marca || '';
                        const unidadNom = c.unidades_medida?.simbolo || c.unidad_medida || 'unidad';
                        const tiposIds =
                          c.tipos_equipo_ids || c.tipos_equipo?.map((t) => t.id_tipo_equipo) || [];
                        const esCompatibleNm =
                          selectedTipoIdNum != null &&
                          c.aplica_todos_tipos === false &&
                          tiposIds.includes(selectedTipoIdNum);
                        const esUniversal = c.aplica_todos_tipos !== false;

                        return (
                          <button
                            key={c.id_componente}
                            type="button"
                            onClick={() => {
                              const pv = Number(c.precio_venta || 0);
                              const pc = Number(c.precio_compra || 0);
                              setComponentesRows((prev) => [
                                ...prev,
                                {
                                  uid: nextTplUid('tcmp'),
                                  id_componente: c.id_componente,
                                  descripcion: c.descripcion_corta || c.referencia_fabricante,
                                  referencia_label:
                                    c.referencia_fabricante || c.codigo_interno || '',
                                  marca_label: marcaNom,
                                  cantidad_base: 1,
                                  unidad: unidadNom,
                                  costo_unitario_fijo: pc,
                                  precio_unitario_fijo: pv,
                                  precio_venta_vivo: pv,
                                  precio_compra_vivo: pc,
                                  stock_actual: c.es_inventariable === false ? null : stock,
                                  es_por_equipo: true,
                                  usar_precio_catalogo: true,
                                  es_opcional: false,
                                  iva_aplicable: true,
                                  garantia_meses: null,
                                  observaciones: '',
                                },
                              ]);
                              setCmpSearch('');
                            }}
                            className="w-full px-3 py-2 text-left text-xs hover:bg-emerald-50/70 flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <span className="font-mono text-[10px] text-slate-400 mr-1.5">
                                {c.codigo_interno || c.referencia_fabricante}
                              </span>
                              <span className="font-medium text-slate-800">
                                {c.descripcion_corta || c.referencia_fabricante}
                              </span>
                              {marcaNom && (
                                <span className="text-[10px] text-slate-500 ml-1.5">
                                  · {marcaNom}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {esCompatibleNm ? (
                                <Badge
                                  variant="outline"
                                  className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]"
                                >
                                  Compatible N:M
                                </Badge>
                              ) : esUniversal ? (
                                <Badge
                                  variant="outline"
                                  className="bg-slate-50 text-slate-600 border-slate-200 text-[10px]"
                                >
                                  Universal
                                </Badge>
                              ) : null}
                              {c.es_inventariable === false ? (
                                <Badge
                                  variant="outline"
                                  className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]"
                                >
                                  No inv.
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className={
                                    stock > 0
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]'
                                      : 'bg-rose-50 text-rose-700 border-rose-200 text-[10px]'
                                  }
                                >
                                  Stock: {stock}
                                </Badge>
                              )}
                              <span className="font-mono font-bold text-slate-800">
                                {formatCurrency(Number(c.precio_venta || 0))}
                              </span>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {componentesRows.length === 0 ? (
                <div className="py-3.5 px-4 flex items-center justify-center gap-2 text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                  <Package className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                  <span>
                    Sin repuestos ni insumos agregados. Busca en el catálogo WMS o añade un repuesto
                    manual.
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="hidden md:grid grid-cols-12 gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <div className="col-span-5">Repuesto / Suministro</div>
                    <div className="col-span-1 text-center">Base</div>
                    {showCostosInternos && (
                      <div className="col-span-2 text-right text-amber-700/80">Costo Compra</div>
                    )}
                    <div
                      className={
                        showCostosInternos ? 'col-span-2 text-right' : 'col-span-4 text-right'
                      }
                    >
                      Tarifa Unit.
                    </div>
                    <div className="col-span-2 text-right pr-1">Sim. ({simEquipos} eq.)</div>
                  </div>

                  {componentesRows.map((row, idx) => {
                    const liveEntry = row.id_componente
                      ? cmpLiveMap.get(row.id_componente)
                      : undefined;
                    const liveVenta = liveEntry?.venta ?? row.precio_venta_vivo;
                    const liveCompra = liveEntry?.compra ?? row.precio_compra_vivo;
                    const precioEfectivo =
                      row.usar_precio_catalogo && liveVenta != null
                        ? liveVenta
                        : row.precio_unitario_fijo;
                    const costoEfectivo =
                      row.usar_precio_catalogo && liveCompra != null
                        ? liveCompra
                        : row.costo_unitario_fijo;
                    const cantSim =
                      Math.round(row.cantidad_base * (row.es_por_equipo ? simEquipos : 1) * 100) /
                      100;
                    const subSim = Math.round(cantSim * precioEfectivo * 100) / 100;

                    return (
                      <div
                        key={row.uid}
                        className={`p-3 rounded-xl border space-y-2.5 transition-all hover:border-slate-300 ${
                          row.es_opcional
                            ? 'bg-slate-50/80 border-dashed border-slate-300'
                            : 'bg-white border-slate-200/90 shadow-[0_1px_2px_rgba(15,23,42,0.03)]'
                        }`}
                      >
                        <div className="grid grid-cols-12 gap-2 items-center">
                          <div className="col-span-12 md:col-span-5">
                            <Input
                              value={row.descripcion}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) =>
                                setComponentesRows((prev) =>
                                  prev.map((r, i) =>
                                    i === idx ? { ...r, descripcion: e.target.value } : r,
                                  ),
                                )
                              }
                              placeholder="Descripción del repuesto o suministro *"
                              className="h-8 text-xs font-medium"
                            />
                          </div>
                          <div className="col-span-4 md:col-span-1">
                            <CpqSmartNumberInput
                              min={0.01}
                              decimals={2}
                              align="center"
                              value={row.cantidad_base}
                              onChange={(val) =>
                                setComponentesRows((prev) =>
                                  prev.map((r, i) =>
                                    i === idx ? { ...r, cantidad_base: val || 1 } : r,
                                  ),
                                )
                              }
                              title="Cantidad base (para 1 equipo)"
                            />
                          </div>
                          {showCostosInternos && (
                            <div className="col-span-4 md:col-span-2">
                              <CpqMoneyInput
                                tone="cost"
                                value={costoEfectivo}
                                locale={moneyLocale}
                                symbol={moneySymbol}
                                decimals={moneyDecimals}
                                onChange={(val) =>
                                  setComponentesRows((prev) =>
                                    prev.map((r, i) =>
                                      i === idx
                                        ? {
                                            ...r,
                                            costo_unitario_fijo: val,
                                            usar_precio_catalogo: false,
                                          }
                                        : r,
                                    ),
                                  )
                                }
                                title="Costo de compra de referencia"
                              />
                            </div>
                          )}
                          <div
                            className={
                              showCostosInternos
                                ? 'col-span-4 md:col-span-2'
                                : 'col-span-8 md:col-span-4'
                            }
                          >
                            <CpqMoneyInput
                              value={precioEfectivo}
                              locale={moneyLocale}
                              symbol={moneySymbol}
                              decimals={moneyDecimals}
                              onChange={(val) =>
                                setComponentesRows((prev) =>
                                  prev.map((r, i) =>
                                    i === idx
                                      ? {
                                          ...r,
                                          precio_unitario_fijo: val,
                                          usar_precio_catalogo: false,
                                        }
                                      : r,
                                  ),
                                )
                              }
                              title={
                                row.usar_precio_catalogo
                                  ? 'Precio vivo del catálogo WMS (edita para definir tarifa fija de paquete)'
                                  : 'Tarifa fija de paquete definida en esta plantilla'
                              }
                            />
                          </div>
                          <div className="col-span-12 md:col-span-2 text-right font-mono text-xs font-bold text-slate-800">
                            <div>{formatCurrency(subSim)}</div>
                            {simEquipos > 1 && row.es_por_equipo && (
                              <span className="text-[10px] font-normal text-primary">
                                {cantSim} {row.unidad}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-100 text-[11px] text-slate-600">
                          <div className="flex flex-wrap items-center gap-3">
                            {row.referencia_label && (
                              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                {row.referencia_label}
                                {row.marca_label ? ` · ${row.marca_label}` : ''}
                              </span>
                            )}
                            <div className="w-24">
                              <CpqCreatableCombobox
                                size="xs"
                                value={row.unidad}
                                onChange={(val) =>
                                  setComponentesRows((prev) =>
                                    prev.map((r, i) => (i === idx ? { ...r, unidad: val } : r)),
                                  )
                                }
                                options={unidadOptions}
                                placeholder="Und"
                                searchPlaceholder="Buscar unidad..."
                                customLabel="Usar unidad"
                                minDropdownWidth={220}
                              />
                            </div>
                            {row.stock_actual != null && (
                              <span
                                className={`px-1.5 py-0.5 rounded font-semibold ${
                                  cantSim > row.stock_actual
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-emerald-50 text-emerald-700'
                                }`}
                              >
                                Stock WMS: {row.stock_actual}
                              </span>
                            )}
                            <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-800">
                              <input
                                type="checkbox"
                                checked={row.es_por_equipo}
                                onChange={(e) =>
                                  setComponentesRows((prev) =>
                                    prev.map((r, i) =>
                                      i === idx ? { ...r, es_por_equipo: e.target.checked } : r,
                                    ),
                                  )
                                }
                              />
                              Escalar × Equipo
                            </label>
                            {row.id_componente && (
                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={row.usar_precio_catalogo}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    setComponentesRows((prev) =>
                                      prev.map((r, i) =>
                                        i === idx
                                          ? {
                                              ...r,
                                              usar_precio_catalogo: checked,
                                              precio_unitario_fijo:
                                                checked && liveVenta != null
                                                  ? liveVenta
                                                  : r.precio_unitario_fijo,
                                              costo_unitario_fijo:
                                                checked && liveCompra != null
                                                  ? liveCompra
                                                  : r.costo_unitario_fijo,
                                            }
                                          : r,
                                      ),
                                    );
                                  }}
                                />
                                <span
                                  className={
                                    row.usar_precio_catalogo
                                      ? 'text-teal-700 font-semibold inline-flex items-center gap-1'
                                      : 'text-slate-600'
                                  }
                                >
                                  {row.usar_precio_catalogo ? (
                                    <>
                                      <RefreshCw className="h-3 w-3" />
                                      Precio vivo catálogo
                                    </>
                                  ) : (
                                    'Tarifa fija paquete'
                                  )}
                                </span>
                              </label>
                            )}
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={row.iva_aplicable}
                                onChange={(e) =>
                                  setComponentesRows((prev) =>
                                    prev.map((r, i) =>
                                      i === idx ? { ...r, iva_aplicable: e.target.checked } : r,
                                    ),
                                  )
                                }
                              />
                              {taxLabel}
                            </label>
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={row.es_opcional}
                                onChange={(e) =>
                                  setComponentesRows((prev) =>
                                    prev.map((r, i) =>
                                      i === idx ? { ...r, es_opcional: e.target.checked } : r,
                                    ),
                                  )
                                }
                              />
                              Opcional
                            </label>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setComponentesRows((prev) => prev.filter((_, i) => i !== idx))
                            }
                            className="text-rose-500 hover:text-rose-700 p-1"
                            title="Eliminar repuesto"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* SECCIÓN 5: LOGÍSTICA, VIÁTICOS, PÓLIZAS Y OTROS RUBROS */}
          <Card className="bg-white border-slate-200/90 shadow-sm rounded-xl">
            <CardHeader className="py-3.5 px-5 border-b border-slate-100 bg-slate-50/40 rounded-t-xl space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2.5 text-slate-900">
                  <span className="h-6 w-6 rounded-lg bg-amber-50 text-amber-700 border border-amber-200/80 flex items-center justify-center text-xs font-extrabold shrink-0">
                    5
                  </span>
                  <Truck className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>Logística, Viáticos, Pólizas y Otros Rubros ({otrosRows.length})</span>
                </CardTitle>
                <span className="text-[11px] text-slate-500">
                  Inician como monto fijo (× Equipo desmarcado)
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {RUBRO_OTRO_PRESETS.map((p) => {
                  const iconMap: Record<string, React.ReactNode> = {
                    TRANSPORTE: <Truck className="h-3 w-3 shrink-0" />,
                    VIATICOS: <Utensils className="h-3 w-3 shrink-0" />,
                    POLIZA: <Shield className="h-3 w-3 shrink-0" />,
                    ALQUILER: <Wrench className="h-3 w-3 shrink-0" />,
                    DISPOSICION_AMBIENTAL: <Leaf className="h-3 w-3 shrink-0" />,
                    SUBCONTRATO: <Users className="h-3 w-3 shrink-0" />,
                    OTRO: <Plus className="h-3 w-3 shrink-0" />,
                  };
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => addOtroPreset(p.value, p.label)}
                      className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-[11px] font-medium bg-slate-50 text-slate-700 border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 transition-colors"
                    >
                      {iconMap[p.value] || <Plus className="h-3 w-3 shrink-0" />}
                      <span>{p.label.split(' / ')[0]}</span>
                    </button>
                  );
                })}
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5">
              {otrosRows.length === 0 ? (
                <div className="py-3.5 px-4 flex items-center justify-center gap-2 text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                  <Truck className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                  <span>
                    Sin gastos de transporte, viáticos ni pólizas. Usa las píldoras rápidas arriba
                    (facturables o absorbidos).
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="hidden md:grid grid-cols-12 gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <div className="col-span-2">Categoría</div>
                    <div className="col-span-4">Concepto del Rubro</div>
                    <div className="col-span-1 text-center">Base</div>
                    <div className="col-span-2 text-right text-amber-700/80">Costo Real</div>
                    <div className="col-span-2 text-right">Precio Cliente</div>
                    <div className="col-span-1 text-right">Sim.</div>
                  </div>
                  {otrosRows.map((row, idx) => {
                    const cantSim =
                      Math.round(row.cantidad_base * (row.es_por_equipo ? simEquipos : 1) * 100) /
                      100;
                    const subSim = Math.round(cantSim * row.precio_unitario_fijo * 100) / 100;

                    return (
                      <div
                        key={row.uid}
                        className={`p-3 rounded-xl border space-y-2.5 transition-all hover:border-slate-300 ${
                          !row.visible_cliente
                            ? 'bg-amber-50/50 border-amber-200 border-dashed'
                            : row.es_opcional
                              ? 'bg-slate-50/80 border-dashed border-slate-300'
                              : 'bg-white border-slate-200/90 shadow-[0_1px_2px_rgba(15,23,42,0.03)]'
                        }`}
                      >
                        <div className="grid grid-cols-12 gap-2 items-center">
                          <div className="col-span-12 md:col-span-2">
                            <CpqCreatableCombobox
                              size="sm"
                              value={row.categoria_rubro}
                              onChange={(val) =>
                                setOtrosRows((prev) =>
                                  prev.map((r, i) =>
                                    i === idx ? { ...r, categoria_rubro: val } : r,
                                  ),
                                )
                              }
                              options={RUBRO_OTRO_COMBOBOX_OPTIONS}
                              placeholder="Categoría..."
                              searchPlaceholder="Buscar o crear rubro (ej. Prueba Banco Carga)..."
                              customLabel="Crear rubro"
                              normalizeCustom={normalizeTipoOfertaCodigo}
                              minDropdownWidth={240}
                            />
                          </div>
                          <div className="col-span-12 md:col-span-4">
                            <Input
                              value={row.descripcion}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) =>
                                setOtrosRows((prev) =>
                                  prev.map((r, i) =>
                                    i === idx ? { ...r, descripcion: e.target.value } : r,
                                  ),
                                )
                              }
                              placeholder="Concepto del rubro *"
                              className="h-8 text-xs font-medium"
                            />
                          </div>
                          <div className="col-span-4 md:col-span-1">
                            <CpqSmartNumberInput
                              min={0.01}
                              decimals={2}
                              align="center"
                              value={row.cantidad_base}
                              onChange={(val) =>
                                setOtrosRows((prev) =>
                                  prev.map((r, i) =>
                                    i === idx ? { ...r, cantidad_base: val || 1 } : r,
                                  ),
                                )
                              }
                            />
                          </div>
                          <div className="col-span-4 md:col-span-2">
                            <CpqMoneyInput
                              tone="cost"
                              value={row.costo_unitario_fijo}
                              locale={moneyLocale}
                              symbol={moneySymbol}
                              decimals={moneyDecimals}
                              onChange={(val) =>
                                setOtrosRows((prev) =>
                                  prev.map((r, i) =>
                                    i === idx ? { ...r, costo_unitario_fijo: val } : r,
                                  ),
                                )
                              }
                              title="Costo Interno Real"
                            />
                          </div>
                          <div className="col-span-4 md:col-span-2">
                            <CpqMoneyInput
                              disabled={!row.visible_cliente}
                              value={row.visible_cliente ? row.precio_unitario_fijo : 0}
                              locale={moneyLocale}
                              symbol={moneySymbol}
                              decimals={moneyDecimals}
                              onChange={(val) =>
                                setOtrosRows((prev) =>
                                  prev.map((r, i) =>
                                    i === idx ? { ...r, precio_unitario_fijo: val } : r,
                                  ),
                                )
                              }
                              title="Precio Facturable al Cliente"
                            />
                          </div>
                          <div className="col-span-12 md:col-span-1 text-right font-mono text-xs font-bold text-slate-800">
                            {row.visible_cliente ? formatCurrency(subSim) : 'Absorb.'}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-100 text-[11px] text-slate-600">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <div className="w-28">
                              <CpqCreatableCombobox
                                size="xs"
                                value={row.unidad}
                                onChange={(val) =>
                                  setOtrosRows((prev) =>
                                    prev.map((r, i) => (i === idx ? { ...r, unidad: val } : r)),
                                  )
                                }
                                options={unidadOptions}
                                placeholder="Unidad"
                                searchPlaceholder="Buscar unidad..."
                                customLabel="Usar unidad"
                                minDropdownWidth={220}
                              />
                            </div>
                            <input
                              value={row.detalle_calculo}
                              onChange={(e) =>
                                setOtrosRows((prev) =>
                                  prev.map((r, i) =>
                                    i === idx ? { ...r, detalle_calculo: e.target.value } : r,
                                  ),
                                )
                              }
                              placeholder="Fórmula (ej. 2 técnicos × 2 días)"
                              className="w-44 border border-slate-200 rounded px-2 py-0.5 text-[11px] bg-white"
                            />
                            <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-800">
                              <input
                                type="checkbox"
                                checked={row.es_por_equipo}
                                onChange={(e) =>
                                  setOtrosRows((prev) =>
                                    prev.map((r, i) =>
                                      i === idx ? { ...r, es_por_equipo: e.target.checked } : r,
                                    ),
                                  )
                                }
                              />
                              Escalar × Equipo
                            </label>
                            <label className="flex items-center gap-1 cursor-pointer font-medium text-slate-800">
                              <input
                                type="checkbox"
                                checked={row.visible_cliente}
                                onChange={(e) =>
                                  setOtrosRows((prev) =>
                                    prev.map((r, i) =>
                                      i === idx ? { ...r, visible_cliente: e.target.checked } : r,
                                    ),
                                  )
                                }
                              />
                              Visible al cliente
                            </label>
                            {!row.visible_cliente && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-semibold">
                                Costo interno absorbido
                              </span>
                            )}
                            {row.visible_cliente && (
                              <>
                                <label className="flex items-center gap-1 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={row.iva_aplicable}
                                    onChange={(e) =>
                                      setOtrosRows((prev) =>
                                        prev.map((r, i) =>
                                          i === idx ? { ...r, iva_aplicable: e.target.checked } : r,
                                        ),
                                      )
                                    }
                                  />
                                  {taxLabel}
                                </label>
                                <label className="flex items-center gap-1 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={row.es_opcional}
                                    onChange={(e) =>
                                      setOtrosRows((prev) =>
                                        prev.map((r, i) =>
                                          i === idx ? { ...r, es_opcional: e.target.checked } : r,
                                        ),
                                      )
                                    }
                                  />
                                  Opcional
                                </label>
                              </>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => setOtrosRows((prev) => prev.filter((_, i) => i !== idx))}
                            className="text-rose-500 hover:text-rose-700 p-1"
                            title="Eliminar rubro"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* SECCIÓN 6: CONDICIONES COMERCIALES Y TÉRMINOS LEGALES ESTÁNDAR */}
          <Card className="bg-white border-slate-200/90 shadow-sm rounded-xl">
            <CardHeader className="py-3.5 px-5 border-b border-slate-100 bg-slate-50/40 rounded-t-xl">
              <CardTitle className="text-sm font-bold flex items-center gap-2.5 text-slate-900">
                <span className="h-6 w-6 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200/80 flex items-center justify-center text-xs font-extrabold shrink-0">
                  6
                </span>
                <FileCheck2 className="h-4 w-4 text-indigo-600 shrink-0" />
                <span>Condiciones Comerciales y Términos Legales Estándar</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Forma de Pago</Label>
                  <CpqCreatableCombobox
                    value={formaPago}
                    onChange={setFormaPago}
                    options={FORMA_PAGO_COMBOBOX_OPTIONS}
                    placeholder="Seleccionar forma de pago..."
                    searchPlaceholder="Buscar o escribir forma de pago..."
                    customLabel="Usar forma de pago"
                    minDropdownWidth={260}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">
                    Tiempo Estimado (días hábiles)
                  </Label>
                  <CpqSmartNumberInput
                    min={0}
                    decimals={0}
                    align="left"
                    value={Number(tiempoDias) || 0}
                    onChange={(v) => setTiempoDias(String(v))}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Garantía (meses)</Label>
                  <CpqSmartNumberInput
                    min={0}
                    decimals={0}
                    align="left"
                    value={Number(mesesGarantia) || 0}
                    onChange={(v) => setMesesGarantia(String(v))}
                    className="h-9 text-xs"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">
                  Términos y Condiciones Sugeridos para el PDF
                </Label>
                <Textarea
                  rows={3}
                  value={terminosCondiciones}
                  onChange={(e) => setTerminosCondiciones(e.target.value)}
                  placeholder="Si se deja vacío, la cotización heredará los términos estándar White-Label de la organización..."
                  className="text-xs bg-white"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* COLUMNA DERECHA STICKY (4): SIMULADOR DE ESCALA + RENTABILIDAD BASE    */}
        {/* ═══════════════════════════════════════════════════════════════════════ */}
        <div className="xl:col-span-4 space-y-4 xl:sticky xl:top-20">
          {/* Simulador Económico */}
          <Card className="border-primary/30 shadow-md overflow-hidden bg-white">
            <div className="px-4 py-3 bg-primary text-white flex items-center justify-between gap-2">
              <span className="text-sm font-bold flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4" />
                Simulador Económico
              </span>
              <span className="text-xs font-mono opacity-90">
                {orgConfig?.codigo_moneda || 'COP'}
              </span>
            </div>

            <CardContent className="p-4 space-y-3 text-sm">
              {/* Selector interactivo Simular para [1 | 2 | 3 | 5] + [ N ] equipos */}
              <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-800">Simular escala multi-equipo</span>
                  <span className="text-slate-500">
                    {sim.lineasEscalables} × eq. · {sim.lineasFijas} fija
                    {sim.lineasFijas !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="grid grid-cols-4 gap-1 flex-1">
                    {SIM_EQUIPOS_OPTIONS.map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setSimEquipos(n)}
                        className={`h-8 rounded-md text-xs font-bold transition-all border ${
                          simEquipos === n
                            ? 'bg-primary text-white border-primary shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-primary/40 hover:text-primary'
                        }`}
                      >
                        {n} eq.
                      </button>
                    ))}
                  </div>
                  <div
                    className={`w-[80px] shrink-0 rounded-md transition-all ${
                      !(SIM_EQUIPOS_OPTIONS as readonly number[]).includes(simEquipos)
                        ? 'ring-2 ring-primary/30'
                        : ''
                    }`}
                    title="Cantidad personalizada de equipos a simular (1 a 500)"
                  >
                    <CpqSmartNumberInput
                      min={1}
                      max={500}
                      decimals={0}
                      align="center"
                      suffix="eq."
                      value={simEquipos}
                      onChange={(val) =>
                        setSimEquipos(Math.max(1, Math.min(500, Math.round(val || 1))))
                      }
                      className={`h-8 text-xs font-bold ${
                        !(SIM_EQUIPOS_OPTIONS as readonly number[]).includes(simEquipos)
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'bg-white text-slate-700'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Desglose por rubro */}
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600">Subtotal Servicios</span>
                  <span className="font-mono font-semibold">{formatCurrency(sim.subServ)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Subtotal Repuestos WMS</span>
                  <span className="font-mono font-semibold">{formatCurrency(sim.subComp)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Logística, Viáticos y Otros</span>
                  <span className="font-mono font-semibold">{formatCurrency(sim.subOtros)}</span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-slate-200 font-bold text-slate-800">
                  <span>Subtotal Directo</span>
                  <span className="font-mono">{formatCurrency(sim.subtotalGeneral)}</span>
                </div>
              </div>

              {/* Estructura AIU por Defecto */}
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                <label className="flex items-center justify-between text-xs font-semibold text-slate-800 cursor-pointer">
                  <span>Estructura AIU por Defecto</span>
                  <input
                    type="checkbox"
                    checked={usaAiu}
                    onChange={(e) => setUsaAiu(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                </label>
                {usaAiu && (
                  <div className="space-y-2 pt-1">
                    <div className="grid grid-cols-3 gap-1.5">
                      <div>
                        <span className="text-[10px] text-slate-500">Admin %</span>
                        <CpqSmartNumberInput
                          min={0}
                          max={100}
                          decimals={1}
                          suffix="%"
                          value={aiuAdminPct}
                          onChange={setAiuAdminPct}
                          className="h-7"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500">Imprev %</span>
                        <CpqSmartNumberInput
                          min={0}
                          max={100}
                          decimals={1}
                          suffix="%"
                          value={aiuImprevPct}
                          onChange={setAiuImprevPct}
                          className="h-7"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500">Utilid %</span>
                        <CpqSmartNumberInput
                          min={0}
                          max={100}
                          decimals={1}
                          suffix="%"
                          value={aiuUtilPct}
                          onChange={setAiuUtilPct}
                          className="h-7"
                        />
                      </div>
                    </div>
                    <label className="flex items-center gap-1.5 text-[11px] text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ivaSobreUtilidadAiu}
                        onChange={(e) => setIvaSobreUtilidadAiu(e.target.checked)}
                      />
                      Calcular {taxLabel} únicamente sobre Utilidad AIU
                    </label>
                    <div className="flex justify-between text-xs font-semibold text-slate-700 pt-1 border-t border-slate-200">
                      <span>Total AIU</span>
                      <span className="font-mono">{formatCurrency(sim.aiuTotal)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Impuesto simulado */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">
                  {taxLabel} ({ivaPorcentaje}%) {sim.ivaSobreUtil ? 's/ Utilidad' : ''}
                </span>
                <span className="font-mono font-semibold text-slate-800">
                  {formatCurrency(sim.ivaValor)}
                </span>
              </div>

              {/* Total Estimado */}
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/25 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase text-primary">
                    Total Estimado ({simEquipos} eq.)
                  </span>
                  <span className="text-xl font-extrabold font-mono text-primary">
                    {formatCurrency(sim.totalEstimado)}
                  </span>
                </div>
                {simEquipos > 1 && (
                  <div className="flex items-center justify-between text-[11px] text-primary/80">
                    <span>Promedio por equipo</span>
                    <span className="font-mono font-semibold">
                      {formatCurrency(sim.valorPorEquipo)} / eq.
                    </span>
                  </div>
                )}
              </div>

              {sim.subOpcionales > 0 && (
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Ítems Opcionales (no sumados)</span>
                  <span className="font-mono font-semibold">
                    {formatCurrency(sim.subOpcionales)}
                  </span>
                </div>
              )}

              {/* Presentación PDF Sugerida (Tri-estado limpio) */}
              <div className="pt-2.5 border-t border-slate-100 space-y-1.5">
                <span className="text-[11px] font-bold text-slate-800 block">
                  Presentación PDF Sugerida al Instanciar
                </span>
                <div className="grid grid-cols-3 gap-1">
                  {(
                    [
                      {
                        key: 'HEREDAR',
                        label: 'Heredar',
                        title: `Política empresa (${orgDefaultPdfLabel})`,
                      },
                      {
                        key: 'SUMA_ALZADA',
                        label: 'Suma Alzada',
                        title: '1 pág. sin desglose unitario',
                      },
                      {
                        key: 'DETALLADO',
                        label: 'Detallado',
                        title: 'Con precios unitarios por sección',
                      },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      title={opt.title}
                      onClick={() => setPdfMode(opt.key)}
                      className={`py-1.5 px-1.5 rounded-md text-[11px] font-semibold border transition-colors ${
                        pdfMode === opt.key
                          ? 'bg-primary text-white border-primary'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500">
                  {pdfMode === 'HEREDAR'
                    ? `Usará la política vigente de la empresa (${orgDefaultPdfLabel}).`
                    : pdfMode === 'SUMA_ALZADA'
                      ? 'Al aplicar la plantilla, la COT arrancará en Suma Alzada (1 pág. ejecutiva).'
                      : 'Al aplicar la plantilla, la COT arrancará en modo Detallado (licitación).'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* TARJETA OSCURA PRIVADA: RENTABILIDAD BASE ESTIMADA & GOBERNANZA */}
          <Card className="border-slate-200 bg-slate-900 text-slate-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-amber-400" />
                  Rentabilidad Base Estimada
                </span>
                <Badge
                  className={
                    sim.costoTotal === 0 || !sim.governanceEnabled
                      ? 'bg-slate-700 text-slate-200'
                      : sim.margenAprob > 0 && sim.margenPct < sim.margenAprob
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : sim.alertaMargen
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }
                >
                  Margen: {sim.margenPct.toFixed(1)}%
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Costo Directo + Logística ({simEquipos} eq.)</span>
                <span className="font-mono font-semibold">{formatCurrency(sim.costoTotal)}</span>
              </div>
              {sim.costosAbsorbidos > 0 && (
                <div className="flex justify-between text-amber-300/90 text-[11px]">
                  <span>↳ Incluye costos absorbidos ocultos</span>
                  <span className="font-mono">{formatCurrency(sim.costosAbsorbidos)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold pt-1.5 border-t border-slate-700">
                <span>Utilidad Bruta Estimada</span>
                <span
                  className={`font-mono ${
                    sim.utilidadBruta >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {formatCurrency(sim.utilidadBruta)}
                </span>
              </div>
              {simEquipos > 1 && sim.costoTotal > 0 && (
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Efecto escala (1 eq. → {simEquipos} eq.):</span>
                  <span className="font-mono text-emerald-300 font-semibold">
                    {sim1Eq.margenPct.toFixed(1)}% → {sim.margenPct.toFixed(1)}%
                  </span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-800 text-[11px] flex items-center justify-between text-slate-400 gap-2">
                <span>Gobernanza ({simEquipos} eq.):</span>
                <span
                  className={`font-semibold text-right ${
                    sim.estadoGobernanza === 'GERENTE'
                      ? 'text-rose-300'
                      : sim.estadoGobernanza === 'SUPERVISOR' ||
                          sim.estadoGobernanza === 'ALERTA_MARGEN'
                        ? 'text-amber-300'
                        : sim.estadoGobernanza === 'MODO_AGIL'
                          ? 'text-slate-300'
                          : 'text-emerald-300'
                  }`}
                >
                  {sim.estadoGobernanza === 'MODO_AGIL'
                    ? 'Modo ágil (sin bloqueo)'
                    : sim.estadoGobernanza === 'GERENTE'
                      ? 'Requeriría Gerente'
                      : sim.estadoGobernanza === 'SUPERVISOR'
                        ? 'Requeriría Supervisor'
                        : sim.estadoGobernanza === 'ALERTA_MARGEN'
                          ? 'Alerta Visual de Margen'
                          : 'Libre · Aprobación Automática'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <TiposOfertaManagerModal
        open={tiposModalOpen}
        onOpenChange={setTiposModalOpen}
        onSelectTipo={(codigo) => setTipoCotizacion(codigo)}
      />
    </div>
  );
}
