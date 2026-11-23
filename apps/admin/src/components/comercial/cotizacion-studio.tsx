'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  ESTADO_LABELS_COTIZACION,
  getEstadoCodigoCotizacion,
  guardarFirmaCotizacion,
  RUBRO_OTRO_PRESETS,
  type ConvertirCotizacionOrdenResponse,
  type CotizacionRecord,
  type GuardarStudioPayload,
  type PlantillaCotizacionRecord,
} from '@/features/comercial/api/comercial.service';
import { EamSelect } from '@/components/ui/eam-select';
import {
  DigitalSignatureModal,
  normalizeSignatureDataUri,
} from '@/components/shared/digital-signature-modal';
import { CotizacionPdfPreviewModal } from './cotizacion-pdf-preview-modal';
import {
  buildUnidadOptions,
  CpqBulletListEditor,
  CpqCreatableCombobox,
  CpqMoneyInput,
  CpqSmartNumberInput,
  FORMA_PAGO_COMBOBOX_OPTIONS,
  matchesAllTokens,
  RUBRO_OTRO_COMBOBOX_OPTIONS,
  TIPO_OFERTA_COMBOBOX_OPTIONS,
} from './cpq-premium-controls';
import {
  useCotizacionDetalle,
  useCotizacionFirmaActions,
  useCotizacionItemActions,
  useCotizacionWorkflowActions,
  useCreateCotizacion,
  useFirmasHistorialEmpleado,
  useGuardarStudioCotizacion,
  useMotivosRechazo,
  usePlantillasCotizacion,
  useSugerenciasCpq,
} from '@/features/comercial/hooks/use-comercial';
import {
  getConfiguracionEmpresa,
  type ConfiguracionEmpresa,
} from '@/features/configuracion/api/configuracion.service';
import { getNombreCompleto, useEmpleados } from '@/features/empleados';
import {
  useClientesSelector,
  useEquiposSelector,
  useSedesCliente,
  useServiciosComerciales,
  useTecnicosSelector,
  useTiposServicio,
} from '@/features/ordenes/hooks/use-catalogos';
import { useOrgFormatters } from '@/hooks/use-org-formatters';
import { apiClient } from '@/lib/api/client';
import { comprasService } from '@/lib/api/compras.service';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ArrowRightCircle,
  BookmarkPlus,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Cpu,
  Eye,
  EyeOff,
  FileCheck2,
  FileText,
  History,
  Layers,
  Leaf,
  Loader2,
  Lock,
  Mail,
  Package,
  Pen,
  Plus,
  RotateCcw,
  Save,
  Search,
  Send,
  Shield,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  Truck,
  User,
  UserCheck,
  Users,
  Utensils,
  Wrench,
  X,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS DE ESTADO LOCAL DEL STUDIO
// ═══════════════════════════════════════════════════════════════════════════════

interface ServicioRow {
  uid: string;
  id_servicio?: number | null;
  id_equipo?: number | null;
  descripcion: string;
  cantidad: number;
  unidad: string;
  costo_unitario: number;
  precio_unitario: number;
  descuento_porcentaje: number;
  es_opcional: boolean;
  iva_aplicable: boolean;
  observaciones?: string;
}

interface ComponenteRow {
  uid: string;
  id_componente?: number | null;
  id_tipo_componente?: number | null;
  id_equipo?: number | null;
  descripcion: string;
  referencia_manual?: string;
  marca_manual?: string;
  cantidad: number;
  unidad: string;
  costo_unitario: number;
  precio_unitario: number;
  descuento_porcentaje: number;
  es_opcional: boolean;
  iva_aplicable: boolean;
  garantia_meses?: number;
  stock_actual?: number | null;
}

interface OtroRow {
  uid: string;
  id_equipo?: number | null;
  categoria_rubro: string;
  descripcion: string;
  detalle_calculo?: string;
  cantidad: number;
  unidad: string;
  costo_unitario: number;
  precio_unitario: number;
  descuento_porcentaje: number;
  visible_cliente: boolean;
  es_opcional: boolean;
  iva_aplicable: boolean;
}

const ESTADO_BADGE: Record<string, string> = {
  BORRADOR: 'bg-slate-100 text-slate-700 border-slate-300',
  EN_REVISION: 'bg-amber-100 text-amber-800 border-amber-300',
  APROBADA_INTERNA: 'bg-blue-100 text-blue-800 border-blue-300',
  ENVIADA: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  APROBADA_CLIENTE: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  RECHAZADA: 'bg-rose-100 text-rose-800 border-rose-300',
  VENCIDA: 'bg-slate-200 text-slate-600 border-slate-300',
};

let uidCounter = 1;
const nextUid = (prefix: string) => `${prefix}-${Date.now()}-${uidCounter++}`;

function toDateInput(iso?: string | null, fallbackDaysOffset = 0): string {
  if (iso) return String(iso).slice(0, 10);
  return new Date(Date.now() + fallbackDaysOffset * 86400_000).toISOString().slice(0, 10);
}

// ═══════════════════════════════════════════════════════════════════════════════
// WRAPPER DE CARGA (Evita setState síncrono en useEffect)
// ═══════════════════════════════════════════════════════════════════════════════

export function CotizacionStudio({
  cotizacionId,
  initialPlantillaId,
}: {
  cotizacionId?: number;
  initialPlantillaId?: number;
}) {
  const { data: detalle, isLoading: loadingCot } = useCotizacionDetalle(cotizacionId ?? null);
  const { data: plantillas = [] } = usePlantillasCotizacion();
  const { data: orgConfig } = useQuery<ConfiguracionEmpresa>({
    queryKey: ['config-org-empresa-cpq'],
    queryFn: () => getConfiguracionEmpresa(),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  if (cotizacionId && (loadingCot || !detalle)) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium">Cargando Studio CPQ de Cotización...</p>
      </div>
    );
  }

  const initialPlantilla =
    !cotizacionId && initialPlantillaId
      ? plantillas.find((p) => p.id_plantilla === initialPlantillaId)
      : undefined;

  const editorKey = cotizacionId
    ? `edit-${detalle?.id_cotizacion}-${detalle?.version}-${detalle?.id_estado}-${detalle?.items_servicios?.length || 0}-${detalle?.items_componentes?.length || 0}-${detalle?.items_otros?.length || 0}`
    : `new-${initialPlantilla?.id_plantilla || 'blank'}-${orgConfig?.tasa_impuesto_defecto ?? 'def'}-${orgConfig?.cot_mostrar_desglose_precios ? '1' : '0'}`;

  return (
    <CotizacionStudioEditor
      key={editorKey}
      cotizacion={detalle}
      initialPlantilla={initialPlantilla}
      orgConfig={orgConfig}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EDITOR PRINCIPAL FULL-SCREEN SPLIT-SCREEN
// ═══════════════════════════════════════════════════════════════════════════════

function CotizacionStudioEditor({
  cotizacion,
  initialPlantilla,
  orgConfig,
}: {
  cotizacion?: CotizacionRecord;
  initialPlantilla?: PlantillaCotizacionRecord;
  orgConfig?: ConfiguracionEmpresa;
}) {
  const router = useRouter();
  const { formatCurrency, formatDate, taxLabel, taxRate } = useOrgFormatters();

  const isEdit = Boolean(cotizacion?.id_cotizacion);
  const estadoCodigo = isEdit ? getEstadoCodigoCotizacion(cotizacion) : 'BORRADOR';
  const isEditable = estadoCodigo === 'BORRADOR';

  // Estado del formulario (inicializado limpiamente desde cotizacion o plantilla)
  const [clienteId, setClienteId] = useState<string>(
    cotizacion?.id_cliente ? String(cotizacion.id_cliente) : '',
  );
  const [clienteSearch, setClienteSearch] = useState('');
  const [clienteDropdownOpen, setClienteDropdownOpen] = useState(false);

  const [sedeId, setSedeId] = useState<string>(
    cotizacion?.id_sede ? String(cotizacion.id_sede) : 'NONE',
  );
  const [atencionANombre, setAtencionANombre] = useState<string>(
    cotizacion?.atencion_a_nombre || '',
  );
  const [atencionACargo, setAtencionACargo] = useState<string>(cotizacion?.atencion_a_cargo || '');
  const [elaboradaPor, setElaboradaPor] = useState<string>(
    cotizacion?.elaborada_por ? String(cotizacion.elaborada_por) : '',
  );
  const [tipoCotizacion, setTipoCotizacion] = useState<string>(
    cotizacion?.tipo_cotizacion || initialPlantilla?.tipo_cotizacion || 'SERVICIO_TECNICO',
  );
  const [plantillaOrigenId, setPlantillaOrigenId] = useState<number | null>(
    cotizacion?.id_plantilla_origen ?? initialPlantilla?.id_plantilla ?? null,
  );
  const [fechaCotizacion, setFechaCotizacion] = useState<string>(
    toDateInput(cotizacion?.fecha_cotizacion, 0),
  );
  const [fechaVencimiento, setFechaVencimiento] = useState<string>(
    toDateInput(cotizacion?.fecha_vencimiento, orgConfig?.validez_cotizacion_dias_defecto ?? 30),
  );
  const [asunto, setAsunto] = useState<string>(
    cotizacion?.asunto || initialPlantilla?.asunto_sugerido || '',
  );
  const [descripcionGeneral, setDescripcionGeneral] = useState<string>(
    cotizacion?.descripcion_general || initialPlantilla?.descripcion_general || '',
  );
  const [alcanceTrabajo, setAlcanceTrabajo] = useState<string>(
    cotizacion?.alcance_trabajo || initialPlantilla?.alcance_trabajo || '',
  );
  const [exclusiones, setExclusiones] = useState<string>(
    cotizacion?.exclusiones || initialPlantilla?.exclusiones || '',
  );
  const [alcanceExpandido, setAlcanceExpandido] = useState<boolean>(() =>
    Boolean(
      (cotizacion?.descripcion_general || initialPlantilla?.descripcion_general || '').trim() ||
        (cotizacion?.alcance_trabajo || initialPlantilla?.alcance_trabajo || '').trim() ||
        (cotizacion?.exclusiones || initialPlantilla?.exclusiones || '').trim(),
    ),
  );
  const [formaPago, setFormaPago] = useState<string>(
    cotizacion?.forma_pago || initialPlantilla?.forma_pago || 'CONTADO',
  );
  const [tiempoDias, setTiempoDias] = useState<string>(
    cotizacion?.tiempo_estimado_dias != null
      ? String(cotizacion.tiempo_estimado_dias)
      : initialPlantilla?.tiempo_estimado_dias != null
        ? String(initialPlantilla.tiempo_estimado_dias)
        : '3',
  );
  const [mesesGarantia, setMesesGarantia] = useState<string>(
    String(
      cotizacion?.meses_garantia ??
        initialPlantilla?.meses_garantia ??
        orgConfig?.garantia_meses_defecto ??
        3,
    ),
  );
  const [obsGarantia, setObsGarantia] = useState<string>(cotizacion?.observaciones_garantia || '');
  const [terminosCondiciones, setTerminosCondiciones] = useState<string>(
    cotizacion?.terminos_condiciones ||
      initialPlantilla?.terminos_condiciones ||
      orgConfig?.terminos_cotizacion_defecto ||
      '',
  );

  // Parámetros financieros y AIU opcional
  const [descuentoGlobal, setDescuentoGlobal] = useState<number>(
    Number(cotizacion?.descuento_porcentaje ?? 0),
  );
  const [ivaPorcentaje, setIvaPorcentaje] = useState<number>(
    cotizacion?.iva_porcentaje !== undefined && cotizacion?.iva_porcentaje !== null
      ? Number(cotizacion.iva_porcentaje)
      : Number(orgConfig?.tasa_impuesto_defecto ?? taxRate ?? 19),
  );
  const [usaAiu, setUsaAiu] = useState<boolean>(
    Boolean(cotizacion?.usa_aiu ?? initialPlantilla?.usa_aiu ?? false),
  );
  const [aiuAdminPct, setAiuAdminPct] = useState<number>(
    Number(cotizacion?.aiu_admin_porcentaje ?? initialPlantilla?.aiu_admin_porcentaje ?? 10),
  );
  const [aiuImprevPct, setAiuImprevPct] = useState<number>(
    Number(
      cotizacion?.aiu_imprevistos_porcentaje ?? initialPlantilla?.aiu_imprevistos_porcentaje ?? 5,
    ),
  );
  const [aiuUtilPct, setAiuUtilPct] = useState<number>(
    Number(cotizacion?.aiu_utilidad_porcentaje ?? initialPlantilla?.aiu_utilidad_porcentaje ?? 5),
  );
  const [ivaSobreUtilidadAiu, setIvaSobreUtilidadAiu] = useState<boolean>(
    Boolean(
      cotizacion?.iva_sobre_utilidad_aiu ?? initialPlantilla?.iva_sobre_utilidad_aiu ?? false,
    ),
  );
  const [mostrarDesglosePrecios, setMostrarDesglosePrecios] = useState<boolean>(
    Boolean(
      cotizacion?.mostrar_desglose_precios ?? orgConfig?.cot_mostrar_desglose_precios ?? false,
    ),
  );

  // Equipos N:M seleccionados
  const [equiposIds, setEquiposIds] = useState<number[]>(() => {
    if (cotizacion?.equipos_vinculados && cotizacion.equipos_vinculados.length > 0) {
      return cotizacion.equipos_vinculados.map((ce) => ce.id_equipo);
    }
    return cotizacion?.id_equipo ? [cotizacion.id_equipo] : [];
  });
  const [equipoSearch, setEquipoSearch] = useState('');

  // Líneas editables: Servicios, Componentes, Otros Rubros
  const [serviciosRows, setServiciosRows] = useState<ServicioRow[]>(() => {
    if (cotizacion?.items_servicios) {
      return cotizacion.items_servicios.map((s) => ({
        uid: nextUid('srv'),
        id_servicio: s.id_servicio ?? null,
        id_equipo: s.id_equipo ?? null,
        descripcion:
          s.descripcion_personalizada ||
          s.catalogo_servicios?.nombre_servicio ||
          'Servicio Técnico',
        cantidad: Number(s.cantidad) || 1,
        unidad: s.unidad || 'servicio',
        costo_unitario: Number(s.costo_unitario || 0),
        precio_unitario: Number(s.precio_unitario || 0),
        descuento_porcentaje: Number(s.descuento_porcentaje || 0),
        es_opcional: Boolean(s.es_opcional),
        iva_aplicable: s.iva_aplicable !== false,
        observaciones: s.observaciones || '',
      }));
    }
    if (initialPlantilla) {
      return initialPlantilla.items
        .filter((i) => i.tipo_linea === 'SERVICIO')
        .map((i) => ({
          uid: nextUid('srv'),
          id_servicio: i.id_servicio ?? null,
          descripcion: i.descripcion,
          cantidad: Number(i.cantidad_base) || 1,
          unidad: i.unidad || 'servicio',
          costo_unitario: Number(i.costo_unitario_fijo || 0),
          precio_unitario: Number(i.precio_unitario_fijo || 0),
          descuento_porcentaje: 0,
          es_opcional: Boolean(i.es_opcional),
          iva_aplicable: i.iva_aplicable !== false,
          observaciones: i.observaciones || '',
        }));
    }
    return [];
  });

  const [componentesRows, setComponentesRows] = useState<ComponenteRow[]>(() => {
    if (cotizacion?.items_componentes) {
      return cotizacion.items_componentes.map((c) => ({
        uid: nextUid('cmp'),
        id_componente: c.id_componente ?? null,
        id_tipo_componente: c.id_tipo_componente ?? null,
        id_equipo: c.id_equipo ?? null,
        descripcion: c.descripcion,
        referencia_manual:
          c.referencia_manual || c.catalogo_componentes?.referencia_fabricante || '',
        marca_manual: c.marca_manual || '',
        cantidad: Number(c.cantidad) || 1,
        unidad: c.unidad || 'unidad',
        costo_unitario: Number(c.costo_unitario ?? c.catalogo_componentes?.precio_compra ?? 0),
        precio_unitario: Number(c.precio_unitario || 0),
        descuento_porcentaje: Number(c.descuento_porcentaje || 0),
        es_opcional: Boolean(c.es_opcional),
        iva_aplicable: c.iva_aplicable !== false,
        garantia_meses: c.garantia_meses ?? undefined,
        stock_actual: c.catalogo_componentes?.stock_actual ?? null,
      }));
    }
    if (initialPlantilla) {
      return initialPlantilla.items
        .filter((i) => i.tipo_linea === 'COMPONENTE')
        .map((i) => ({
          uid: nextUid('cmp'),
          id_componente: i.id_componente ?? null,
          descripcion: i.descripcion,
          cantidad: Number(i.cantidad_base) || 1,
          unidad: i.unidad || 'unidad',
          costo_unitario: Number(i.costo_unitario_fijo || 0),
          precio_unitario: Number(i.precio_unitario_fijo || 0),
          descuento_porcentaje: 0,
          es_opcional: Boolean(i.es_opcional),
          iva_aplicable: i.iva_aplicable !== false,
          garantia_meses: i.garantia_meses ?? undefined,
        }));
    }
    return [];
  });

  const [otrosRows, setOtrosRows] = useState<OtroRow[]>(() => {
    if (cotizacion?.items_otros) {
      return cotizacion.items_otros.map((o) => ({
        uid: nextUid('otr'),
        id_equipo: o.id_equipo ?? null,
        categoria_rubro: o.categoria_rubro || 'OTRO',
        descripcion: o.descripcion,
        detalle_calculo: o.detalle_calculo || '',
        cantidad: Number(o.cantidad) || 1,
        unidad: o.unidad || 'global',
        costo_unitario: Number(o.costo_unitario || 0),
        precio_unitario: Number(o.precio_unitario || 0),
        descuento_porcentaje: Number(o.descuento_porcentaje || 0),
        visible_cliente: o.visible_cliente !== false,
        es_opcional: Boolean(o.es_opcional),
        iva_aplicable: o.iva_aplicable !== false,
      }));
    }
    if (initialPlantilla) {
      return initialPlantilla.items
        .filter((i) => i.tipo_linea === 'OTRO')
        .map((i) => ({
          uid: nextUid('otr'),
          categoria_rubro: i.categoria_rubro || 'OTRO',
          descripcion: i.descripcion,
          detalle_calculo: i.detalle_calculo || '',
          cantidad: Number(i.cantidad_base) || 1,
          unidad: i.unidad || 'global',
          costo_unitario: Number(i.costo_unitario_fijo || 0),
          precio_unitario: Number(i.precio_unitario_fijo || 0),
          descuento_porcentaje: 0,
          visible_cliente: i.visible_cliente !== false,
          es_opcional: Boolean(i.es_opcional),
          iva_aplicable: i.iva_aplicable !== false,
        }));
    }
    return [];
  });

  // Buscadores rápidos para agregar plantillas / servicios / repuestos
  const [plantillaSearch, setPlantillaSearch] = useState('');
  const [mostrarTodasPlantillas, setMostrarTodasPlantillas] = useState(false);
  const [srvSearch, setSrvSearch] = useState('');
  const [cmpSearch, setCmpSearch] = useState('');
  const [showCostosInternos, setShowCostosInternos] = useState(true);

  // Modales de workflow
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [solicitarOpen, setSolicitarOpen] = useState(false);
  const [solicitarObs, setSolicitarObs] = useState('');

  const [enviarOpen, setEnviarOpen] = useState(false);
  const [enviarEmail, setEnviarEmail] = useState(
    cotizacion?.sede?.email_sede || cotizacion?.cliente?.persona?.email_principal || '',
  );
  const [enviarNombre, setEnviarNombre] = useState(
    cotizacion?.atencion_a_nombre ||
      cotizacion?.cliente?.persona?.razon_social ||
      cotizacion?.cliente?.persona?.nombre_comercial ||
      '',
  );
  const [enviarCopia, setEnviarCopia] = useState('');

  const [aprobarOpen, setAprobarOpen] = useState(false);
  const [aprobarPO, setAprobarPO] = useState('');
  const [aprobarObs, setAprobarObs] = useState('');

  const [rechazarOpen, setRechazarOpen] = useState(false);
  const [motivoRechazoId, setMotivoRechazoId] = useState('');
  const [obsRechazo, setObsRechazo] = useState('');

  const [reabrirOpen, setReabrirOpen] = useState(false);
  const [reabrirMotivo, setReabrirMotivo] = useState('');

  const [saveTplOpen, setSaveTplOpen] = useState(false);
  const [saveTplNombre, setSaveTplNombre] = useState('');
  const [saveTplDesc, setSaveTplDesc] = useState('');

  const [q2oOpen, setQ2oOpen] = useState(false);
  const [q2oFecha, setQ2oFecha] = useState(toDateInput(null, 1));
  const [q2oPrioridad, setQ2oPrioridad] = useState('NORMAL');
  const [q2oTecnicoId, setQ2oTecnicoId] = useState('NONE');
  const [q2oTipoServId, setQ2oTipoServId] = useState('AUTO');
  const [q2oObs, setQ2oObs] = useState('');
  const [q2oResultado, setQ2oResultado] = useState<ConvertirCotizacionOrdenResponse | null>(null);

  // Firmas Digitales Opcionales (reutiliza firmas_digitales de OS)
  const [firmaAsesorLocal, setFirmaAsesorLocal] = useState<{
    id_firma_digital?: number;
    firma_base64: string;
  } | null>(() =>
    cotizacion?.firma_asesor?.firma_base64
      ? {
          id_firma_digital: cotizacion.firma_asesor.id_firma_digital,
          firma_base64: cotizacion.firma_asesor.firma_base64,
        }
      : null,
  );
  const [firmaClienteLocal, setFirmaClienteLocal] = useState<{
    id_firma_digital?: number;
    firma_base64: string;
  } | null>(() =>
    cotizacion?.firma_cliente?.firma_base64
      ? {
          id_firma_digital: cotizacion.firma_cliente.id_firma_digital,
          firma_base64: cotizacion.firma_cliente.firma_base64,
        }
      : null,
  );
  const [firmasExpandido, setFirmasExpandido] = useState<boolean>(() =>
    Boolean(cotizacion?.firma_asesor?.firma_base64 || cotizacion?.firma_cliente?.firma_base64),
  );
  const [firmaModalTipo, setFirmaModalTipo] = useState<'ASESOR' | 'CLIENTE' | null>(null);

  // Queries
  const { data: clientes = [] } = useClientesSelector();
  const { data: sedes = [] } = useSedesCliente(clienteId ? Number(clienteId) : undefined);
  const { data: equiposCliente = [] } = useEquiposSelector(
    {
      idCliente: clienteId ? Number(clienteId) : undefined,
      idSede: sedeId !== 'NONE' ? Number(sedeId) : undefined,
      limit: 200,
    },
    Boolean(clienteId),
  );
  const { data: empleadosData } = useEmpleados({ empleado_activo: true, take: 100 });
  const { data: serviciosCatalogo = [] } = useServiciosComerciales({ activo: true, limit: 300 });
  const { data: catalogoArticulosData } = useQuery({
    queryKey: ['cpq-catalogo-componentes-maestro'],
    queryFn: () => comprasService.getArticulos({ activo: true, limit: 300 }),
    staleTime: 2 * 60_000,
  });
  const cmpQueryTrim = cmpSearch.trim();
  const { data: catalogoSearchData } = useQuery({
    queryKey: ['cpq-catalogo-componentes-search', cmpQueryTrim],
    queryFn: () => comprasService.getArticulos({ activo: true, q: cmpQueryTrim, limit: 30 }),
    enabled: isEditable && cmpQueryTrim.length >= 2,
    staleTime: 30_000,
  });
  const { data: unidadesMedida = [] } = useQuery({
    queryKey: ['cpq-unidades-medida'],
    queryFn: () => comprasService.getUnidadesMedida(),
    staleTime: 30 * 60_000,
  });
  const { data: motivosRechazo = [] } = useMotivosRechazo();
  const { data: tecnicos = [] } = useTecnicosSelector(undefined, q2oOpen);
  const { data: tiposServicio = [] } = useTiposServicio({ activo: true });
  const { data: plantillasAll = [] } = usePlantillasCotizacion();

  const { data: sugerencias, isFetching: loadingSugerencias } = useSugerenciasCpq(
    equiposIds,
    tipoCotizacion,
    isEditable,
  );

  // Mutations
  const createMut = useCreateCotizacion();
  const guardarStudioMut = useGuardarStudioCotizacion(cotizacion?.id_cotizacion ?? null);
  const itemActions = useCotizacionItemActions(cotizacion?.id_cotizacion ?? null);
  const firmaActions = useCotizacionFirmaActions(cotizacion?.id_cotizacion ?? null);
  const workflow = useCotizacionWorkflowActions();

  const empleados = useMemo(() => empleadosData?.data || [], [empleadosData]);

  const asesorActivoId = useMemo(() => {
    const parsed = Number(elaboradaPor);
    if (Number.isInteger(parsed) && parsed > 0) return parsed;
    return empleados[0]?.id_empleado ?? null;
  }, [elaboradaPor, empleados]);

  const asesorActivoNombre = useMemo(() => {
    const emp = empleados.find((e) => e.id_empleado === asesorActivoId);
    const fromEmp = emp ? getNombreCompleto(emp.persona) : '';
    if (fromEmp && fromEmp !== 'Sin nombre') return fromEmp;

    const pCot = cotizacion?.elaborador?.persona;
    const fromCot = pCot
      ? pCot.nombre_completo?.trim() ||
        [pCot.primer_nombre, pCot.segundo_nombre, pCot.primer_apellido, pCot.segundo_apellido]
          .filter(Boolean)
          .join(' ')
          .trim()
      : '';
    if (fromCot && fromCot !== 'Sin nombre') return fromCot;

    return 'Asesor Responsable';
  }, [empleados, asesorActivoId, cotizacion?.elaborador?.persona]);

  const { data: historialFirmasAsesor = [], isLoading: loadingHistorialFirmasAsesor } =
    useFirmasHistorialEmpleado(asesorActivoId, firmaAsesorLocal?.id_firma_digital ?? null);

  const firmaEstandarAsesor = useMemo(
    () => historialFirmasAsesor.find((f) => f.es_estandar) || historialFirmasAsesor[0] || null,
    [historialFirmasAsesor],
  );

  const canManageFirmas = estadoCodigo !== 'RECHAZADA' && estadoCodigo !== 'VENCIDA';
  const articulosMaestro = useMemo(
    () => catalogoArticulosData?.items || [],
    [catalogoArticulosData],
  );
  const articulosSearch = useMemo(() => catalogoSearchData?.items || [], [catalogoSearchData]);

  const moneyLocale = orgConfig?.locale || 'es-CO';
  const moneySymbol = orgConfig?.simbolo_moneda || '$';
  const moneyDecimals = Number(orgConfig?.decimales_moneda ?? 0);

  const unidadOptions = useMemo(() => buildUnidadOptions(unidadesMedida), [unidadesMedida]);

  const asesorOptions = useMemo(
    () =>
      empleados.map((emp) => ({
        value: String(emp.id_empleado),
        label: getNombreCompleto(emp.persona),
        badge: emp.cargo || emp.codigo_empleado || undefined,
        description: emp.persona?.numero_identificacion
          ? `ID: ${emp.persona.numero_identificacion}`
          : undefined,
      })),
    [empleados],
  );

  const selectedTiposEquipoIds = useMemo(() => {
    const ids = new Set<number>();
    const byId = new Map<number, number>();
    for (const ce of cotizacion?.equipos_vinculados || []) {
      const tid = ce.equipos?.tipos_equipo?.id_tipo_equipo;
      if (tid) byId.set(ce.id_equipo, tid);
    }
    for (const eq of equiposCliente) {
      const tid = eq.id_tipo_equipo ?? eq.tipos_equipo?.id_tipo_equipo;
      if (tid) byId.set(eq.id_equipo, tid);
    }
    for (const eqId of equiposIds) {
      const tid = byId.get(eqId);
      if (tid) ids.add(tid);
    }
    return ids;
  }, [equiposIds, equiposCliente, cotizacion]);

  const clienteSeleccionado = useMemo(
    () => clientes.find((c) => String(c.id_cliente) === clienteId),
    [clientes, clienteId],
  );

  const sedeSeleccionada = useMemo(
    () => (sedeId !== 'NONE' ? sedes.find((s) => String(s.id_sede) === sedeId) : undefined),
    [sedes, sedeId],
  );

  const contactoFichaSugerido = useMemo(() => {
    const nombreSede = sedeSeleccionada?.contacto_sede?.trim() || '';
    const cargoSede = sedeSeleccionada?.cargo_contacto?.trim() || '';
    if (nombreSede) {
      return { nombre: nombreSede, cargo: cargoSede, origen: 'sede' as const };
    }
    const nombreCliente =
      clienteSeleccionado?.persona?.representante_legal?.trim() ||
      cotizacion?.cliente?.persona?.representante_legal?.trim() ||
      '';
    const cargoCliente = clienteSeleccionado?.cargo_contacto?.trim() || '';
    if (nombreCliente) {
      return { nombre: nombreCliente, cargo: cargoCliente, origen: 'cliente' as const };
    }
    return { nombre: '', cargo: '', origen: null };
  }, [sedeSeleccionada, clienteSeleccionado, cotizacion]);

  const handleSelectSede = (nextSedeId: string) => {
    setSedeId(nextSedeId);
    if (nextSedeId !== 'NONE') {
      const sedeObj = sedes.find((s) => String(s.id_sede) === nextSedeId);
      const contactoSede = sedeObj?.contacto_sede?.trim() || '';
      const cargoSede = sedeObj?.cargo_contacto?.trim() || '';
      const repCliente = clienteSeleccionado?.persona?.representante_legal?.trim() || '';
      if (contactoSede && (!atencionANombre.trim() || atencionANombre.trim() === repCliente)) {
        setAtencionANombre(contactoSede);
        setAtencionACargo(cargoSede);
      }
      if (sedeObj?.email_sede) {
        setEnviarEmail(sedeObj.email_sede);
      }
    }
  };

  const clientesFiltrados = useMemo(() => {
    if (!clienteSearch.trim()) return clientes.slice(0, 40);
    return clientes
      .filter((c) =>
        matchesAllTokens(clienteSearch, [
          c.nombre_sede,
          c.persona?.nombre_comercial,
          c.persona?.razon_social,
          c.persona?.numero_identificacion,
        ]),
      )
      .slice(0, 40);
  }, [clientes, clienteSearch]);

  const equiposFiltrados = useMemo(() => {
    if (!equipoSearch.trim()) return equiposCliente;
    return equiposCliente.filter((e) =>
      matchesAllTokens(equipoSearch, [
        e.codigo_equipo,
        e.nombre_equipo,
        e.tipos_equipo?.nombre_tipo,
      ]),
    );
  }, [equiposCliente, equipoSearch]);

  const equiposSeleccionadosInfo = useMemo(() => {
    const map = new Map<number, { codigo: string; nombre: string; tipo?: string }>();
    for (const ce of cotizacion?.equipos_vinculados || []) {
      if (ce.equipos) {
        map.set(ce.id_equipo, {
          codigo: ce.equipos.codigo_equipo,
          nombre: ce.equipos.nombre_equipo || ce.equipos.codigo_equipo,
          tipo: ce.equipos.tipos_equipo?.nombre_tipo,
        });
      }
    }
    for (const e of equiposCliente) {
      map.set(e.id_equipo, {
        codigo: e.codigo_equipo,
        nombre: e.nombre_equipo || e.codigo_equipo,
        tipo: e.tipos_equipo?.nombre_tipo,
      });
    }
    return equiposIds.map((id) => ({
      id,
      ...(map.get(id) || { codigo: `EQ-${id}`, nombre: `Equipo #${id}` }),
    }));
  }, [equiposIds, equiposCliente, cotizacion]);

  const lockCatalogUnitPrice = Boolean(
    orgConfig?.enable_cpq_governance && orgConfig?.lock_catalog_unit_price,
  );

  const srvPrecioCatalogoMap = useMemo(() => {
    const m = new Map<number, number>();
    for (const s of serviciosCatalogo) {
      if (Number(s.precio_base || 0) > 0) m.set(s.id_servicio, Number(s.precio_base));
    }
    for (const s of cotizacion?.items_servicios || []) {
      if (s.id_servicio && Number(s.catalogo_servicios?.precio_base || 0) > 0) {
        m.set(s.id_servicio, Number(s.catalogo_servicios?.precio_base));
      }
    }
    return m;
  }, [serviciosCatalogo, cotizacion]);

  const compPrecioCatalogoMap = useMemo(() => {
    const m = new Map<number, number>();
    for (const c of articulosMaestro) {
      if (Number(c.precio_venta || 0) > 0) m.set(c.id_componente, Number(c.precio_venta));
    }
    for (const c of articulosSearch) {
      if (Number(c.precio_venta || 0) > 0) m.set(c.id_componente, Number(c.precio_venta));
    }
    for (const c of cotizacion?.items_componentes || []) {
      if (c.id_componente && Number(c.catalogo_componentes?.precio_venta || 0) > 0) {
        m.set(c.id_componente, Number(c.catalogo_componentes?.precio_venta));
      }
    }
    return m;
  }, [articulosMaestro, articulosSearch, cotizacion]);

  // ═══════════════════════════════════════════════════════════════════════════
  // MOTOR FINANCIERO EN VIVO (Espejo exacto de CotizacionCalculoService)
  // ═══════════════════════════════════════════════════════════════════════════
  const resumenFinanciero = useMemo(() => {
    const calcSub = (cant: number, pu: number, desc = 0) =>
      Math.round(cant * pu * (1 - desc / 100) * 100) / 100;

    let subServ = 0;
    let subComp = 0;
    let subOtros = 0;
    let subOpcionales = 0;
    let brutoSinDescuentos = 0;
    let subGravableBruto = 0;
    let costoTotal = 0;
    let costosAbsorbidos = 0;

    for (const s of serviciosRows) {
      const sub = calcSub(s.cantidad, s.precio_unitario, s.descuento_porcentaje);
      if (s.es_opcional) {
        subOpcionales += sub;
      } else {
        subServ += sub;
        brutoSinDescuentos += s.cantidad * s.precio_unitario;
        if (s.iva_aplicable) subGravableBruto += sub;
        costoTotal += s.cantidad * (s.costo_unitario || 0);
      }
    }

    for (const c of componentesRows) {
      const sub = calcSub(c.cantidad, c.precio_unitario, c.descuento_porcentaje);
      if (c.es_opcional) {
        subOpcionales += sub;
      } else {
        subComp += sub;
        brutoSinDescuentos += c.cantidad * c.precio_unitario;
        if (c.iva_aplicable) subGravableBruto += sub;
        costoTotal += c.cantidad * (c.costo_unitario || 0);
      }
    }

    for (const o of otrosRows) {
      const sub = calcSub(o.cantidad, o.precio_unitario, o.descuento_porcentaje);
      const costoUnitEfectivo =
        (o.costo_unitario || 0) > 0 ? o.costo_unitario : !o.visible_cliente ? o.precio_unitario : 0;

      if (o.es_opcional) {
        if (o.visible_cliente) subOpcionales += sub;
      } else {
        const cLinea = o.cantidad * costoUnitEfectivo;
        costoTotal += cLinea;
        if (!o.visible_cliente) {
          costosAbsorbidos += cLinea;
        } else {
          subOtros += sub;
          brutoSinDescuentos += o.cantidad * o.precio_unitario;
          if (o.iva_aplicable) subGravableBruto += sub;
        }
      }
    }

    const subtotalGeneral = Math.round((subServ + subComp + subOtros) * 100) / 100;
    const descFactor = 1 - descuentoGlobal / 100;
    const descuentoValor = Math.round(subtotalGeneral * (descuentoGlobal / 100) * 100) / 100;
    const subtotalConDescuento = Math.round((subtotalGeneral - descuentoValor) * 100) / 100;

    const aiuAdminVal = usaAiu
      ? Math.round(subtotalConDescuento * (aiuAdminPct / 100) * 100) / 100
      : 0;
    const aiuImprevVal = usaAiu
      ? Math.round(subtotalConDescuento * (aiuImprevPct / 100) * 100) / 100
      : 0;
    const aiuUtilVal = usaAiu
      ? Math.round(subtotalConDescuento * (aiuUtilPct / 100) * 100) / 100
      : 0;
    const aiuTotal = Math.round((aiuAdminVal + aiuImprevVal + aiuUtilVal) * 100) / 100;

    const ivaSobreUtil = usaAiu && ivaSobreUtilidadAiu;
    const baseGravable = ivaSobreUtil
      ? aiuUtilVal
      : Math.round((subGravableBruto * descFactor + (usaAiu ? aiuTotal : 0)) * 100) / 100;
    const ivaValor = Math.round(baseGravable * (ivaPorcentaje / 100) * 100) / 100;

    const ingresoNetoSinIva = Math.round((subtotalConDescuento + aiuTotal) * 100) / 100;
    const totalCotizacion = Math.round((ingresoNetoSinIva + ivaValor) * 100) / 100;
    const utilidadBruta = Math.round((ingresoNetoSinIva - costoTotal) * 100) / 100;
    const margenPct =
      ingresoNetoSinIva > 0 ? Math.round((utilidadBruta / ingresoNetoSinIva) * 10000) / 100 : 0;

    // Descuento efectivo real (combina descuentos por línea + descuento global)
    const descuentoCombinado =
      brutoSinDescuentos > 0
        ? Math.max(
            0,
            Math.round(((brutoSinDescuentos - subtotalConDescuento) / brutoSinDescuentos) * 10000) /
              100,
          )
        : 0;
    const descuentoEfectivo = Math.max(descuentoGlobal, descuentoCombinado);

    // Reglas oficiales de Gobernanza CPQ (Espejo exacto de evaluarGobernanzaCpq en backend)
    const governanceEnabled = Boolean(orgConfig?.enable_cpq_governance);
    const umbralSup = Number(orgConfig?.umbral_aprobacion_supervisor ?? 0);
    const umbralGer = Number(orgConfig?.umbral_aprobacion_gerente ?? 0);
    const descMax = Number(orgConfig?.descuento_max_sin_aprobacion ?? 0);
    const descGer = descMax > 0 ? Math.min(100, descMax + 10) : 0;
    const margenAlerta = Number(orgConfig?.margen_minimo_alerta ?? 0);
    const margenAprob = Number(orgConfig?.margen_minimo_aprobacion ?? 0);

    let nivelAprobacion: 'NINGUNO' | 'SUPERVISOR' | 'GERENTE' = 'NINGUNO';
    let estadoGobernanza: 'MODO_AGIL' | 'LIBRE' | 'ALERTA_MARGEN' | 'SUPERVISOR' | 'GERENTE' =
      governanceEnabled ? 'LIBRE' : 'MODO_AGIL';
    let alertaMargen = false;

    if (governanceEnabled) {
      alertaMargen = margenAlerta > 0 && costoTotal > 0 && margenPct < margenAlerta;
      const hitGerente =
        (umbralGer > 0 && totalCotizacion > umbralGer) ||
        (descMax > 0 && descGer < 100 && descuentoEfectivo > descGer) ||
        (margenAprob > 0 && costoTotal > 0 && margenPct < margenAprob);
      const hitSupervisor =
        (umbralSup > 0 && totalCotizacion > umbralSup) ||
        (descMax > 0 && descuentoEfectivo > descMax);

      if (hitGerente) {
        nivelAprobacion = 'GERENTE';
        estadoGobernanza = 'GERENTE';
      } else if (hitSupervisor) {
        nivelAprobacion = 'SUPERVISOR';
        estadoGobernanza = 'SUPERVISOR';
      } else if (alertaMargen) {
        nivelAprobacion = 'NINGUNO';
        estadoGobernanza = 'ALERTA_MARGEN';
      } else {
        nivelAprobacion = 'NINGUNO';
        estadoGobernanza = 'LIBRE';
      }
    }

    return {
      subServ,
      subComp,
      subOtros,
      subOpcionales,
      subtotalGeneral,
      descuentoValor,
      subtotalConDescuento,
      aiuAdminVal,
      aiuImprevVal,
      aiuUtilVal,
      aiuTotal,
      ivaSobreUtil,
      ivaValor,
      totalCotizacion,
      costoTotal: Math.round(costoTotal * 100) / 100,
      costosAbsorbidos: Math.round(costosAbsorbidos * 100) / 100,
      utilidadBruta,
      margenPct,
      margenAlerta,
      margenAprob,
      alertaMargen,
      governanceEnabled,
      estadoGobernanza,
      nivelAprobacion,
    };
  }, [
    serviciosRows,
    componentesRows,
    otrosRows,
    descuentoGlobal,
    ivaPorcentaje,
    usaAiu,
    aiuAdminPct,
    aiuImprevPct,
    aiuUtilPct,
    ivaSobreUtilidadAiu,
    orgConfig,
  ]);

  // ═══════════════════════════════════════════════════════════════════════════
  // ACCIONES DE CONSTRUCCIÓN DE LÍNEAS Y PLANTILLAS EN MEMORIA
  // ═══════════════════════════════════════════════════════════════════════════

  const toggleEquipo = (id: number) => {
    setEquiposIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const applyPlantillaLocal = (pl: PlantillaCotizacionRecord, reemplazar = false) => {
    const mult = Math.max(1, equiposIds.length);
    const nuevosServ: ServicioRow[] = [];
    const nuevosComp: ComponenteRow[] = [];
    const nuevosOtros: OtroRow[] = [];

    for (const it of pl.items || []) {
      const cant =
        Math.round(Number(it.cantidad_base || 1) * (it.es_por_equipo ? mult : 1) * 100) / 100;
      if (it.tipo_linea === 'SERVICIO') {
        const srvCat = it.id_servicio
          ? serviciosCatalogo.find((s) => s.id_servicio === it.id_servicio)
          : undefined;
        nuevosServ.push({
          uid: nextUid('srv'),
          id_servicio: it.id_servicio ?? null,
          descripcion: it.descripcion,
          cantidad: cant,
          unidad: it.unidad || 'servicio',
          costo_unitario: Number(it.costo_unitario_fijo ?? 0),
          precio_unitario:
            it.usar_precio_catalogo && srvCat?.precio_base != null
              ? Number(srvCat.precio_base)
              : Number(it.precio_unitario_fijo ?? 0),
          descuento_porcentaje: 0,
          es_opcional: Boolean(it.es_opcional),
          iva_aplicable: it.iva_aplicable !== false,
          observaciones: it.observaciones || '',
        });
      } else if (it.tipo_linea === 'COMPONENTE') {
        const cmpCat = it.id_componente
          ? articulosMaestro.find((c) => c.id_componente === it.id_componente)
          : undefined;
        nuevosComp.push({
          uid: nextUid('cmp'),
          id_componente: it.id_componente ?? null,
          id_tipo_componente: cmpCat?.id_tipo_componente ?? null,
          descripcion: it.descripcion,
          referencia_manual: cmpCat?.referencia_fabricante || cmpCat?.codigo_interno || '',
          marca_manual: cmpCat?.marcas?.nombre || cmpCat?.marca || '',
          cantidad: cant,
          unidad:
            it.unidad || cmpCat?.unidades_medida?.simbolo || cmpCat?.unidad_medida || 'unidad',
          costo_unitario:
            it.usar_precio_catalogo && cmpCat?.precio_compra != null
              ? Number(cmpCat.precio_compra)
              : Number(it.costo_unitario_fijo ?? 0),
          precio_unitario:
            it.usar_precio_catalogo && cmpCat?.precio_venta != null
              ? Number(cmpCat.precio_venta)
              : Number(it.precio_unitario_fijo ?? 0),
          descuento_porcentaje: 0,
          es_opcional: Boolean(it.es_opcional),
          iva_aplicable: it.iva_aplicable !== false,
          garantia_meses: it.garantia_meses ?? undefined,
          stock_actual:
            cmpCat && cmpCat.es_inventariable !== false ? Number(cmpCat.stock_actual ?? 0) : null,
        });
      } else {
        nuevosOtros.push({
          uid: nextUid('otr'),
          categoria_rubro: it.categoria_rubro || 'OTRO',
          descripcion: it.descripcion,
          detalle_calculo: it.detalle_calculo || '',
          cantidad: cant,
          unidad: it.unidad || 'global',
          costo_unitario: Number(it.costo_unitario_fijo ?? 0),
          precio_unitario: Number(it.precio_unitario_fijo ?? 0),
          descuento_porcentaje: 0,
          visible_cliente: it.visible_cliente !== false,
          es_opcional: Boolean(it.es_opcional),
          iva_aplicable: it.iva_aplicable !== false,
        });
      }
    }

    setServiciosRows((prev) => (reemplazar ? nuevosServ : [...prev, ...nuevosServ]));
    setComponentesRows((prev) => (reemplazar ? nuevosComp : [...prev, ...nuevosComp]));
    setOtrosRows((prev) => (reemplazar ? nuevosOtros : [...prev, ...nuevosOtros]));

    setPlantillaOrigenId(pl.id_plantilla);
    if (pl.tipo_cotizacion) setTipoCotizacion(pl.tipo_cotizacion);
    if (!asunto.trim() && pl.asunto_sugerido) setAsunto(pl.asunto_sugerido);
    if (!descripcionGeneral.trim() && pl.descripcion_general) {
      setDescripcionGeneral(pl.descripcion_general);
      setAlcanceExpandido(true);
    }
    if (!alcanceTrabajo.trim() && pl.alcance_trabajo) {
      setAlcanceTrabajo(pl.alcance_trabajo);
      setAlcanceExpandido(true);
    }
    if (!exclusiones.trim() && pl.exclusiones) {
      setExclusiones(pl.exclusiones);
      setAlcanceExpandido(true);
    }
    if (pl.forma_pago) setFormaPago(pl.forma_pago);
    if (pl.meses_garantia != null) setMesesGarantia(String(pl.meses_garantia));
    if (pl.tiempo_estimado_dias != null) setTiempoDias(String(pl.tiempo_estimado_dias));
    if (pl.usa_aiu) {
      setUsaAiu(true);
      setAiuAdminPct(pl.aiu_admin_porcentaje);
      setAiuImprevPct(pl.aiu_imprevistos_porcentaje);
      setAiuUtilPct(pl.aiu_utilidad_porcentaje);
      setIvaSobreUtilidadAiu(pl.iva_sobre_utilidad_aiu);
    }

    toast.success(
      `Plantilla "${pl.nombre}" cargada (×${mult} equipo${mult > 1 ? 's' : ''}): +${nuevosServ.length} serv., +${nuevosComp.length} rep., +${nuevosOtros.length} rubros`,
    );
  };

  const importBomKitLocal = (kit: NonNullable<typeof sugerencias>['bom_kits'][number]) => {
    const nuevos: ComponenteRow[] = kit.items
      .filter((i) => i.rol_bom === 'TITULAR')
      .map((i) => ({
        uid: nextUid('bom'),
        id_componente: i.id_componente,
        descripcion: i.descripcion,
        referencia_manual: i.referencia_fabricante,
        cantidad: i.cantidad_total_sugerida,
        unidad: i.unidad || 'unidad',
        costo_unitario: i.precio_compra,
        precio_unitario: i.precio_venta,
        descuento_porcentaje: 0,
        es_opcional: false,
        iva_aplicable: true,
        stock_actual: i.stock_actual,
      }));
    if (nuevos.length === 0) {
      toast.info('Este modelo no tiene repuestos titulares en su BOM');
      return;
    }
    setComponentesRows((prev) => [...prev, ...nuevos]);
    toast.success(
      `Importados ${nuevos.length} repuestos BOM OEM de ${kit.etiqueta_modelo} (×${kit.equipos_gemelos})`,
    );
  };

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
      OTRO: { desc: label, und: 'global' },
    };
    const d = defaults[categoria] || defaults.OTRO;
    setOtrosRows((prev) => [
      ...prev,
      {
        uid: nextUid('otr'),
        categoria_rubro: categoria,
        descripcion: d.desc,
        detalle_calculo: '',
        cantidad: 1,
        unidad: d.und,
        costo_unitario: 0,
        precio_unitario: 0,
        descuento_porcentaje: 0,
        visible_cliente: true,
        es_opcional: false,
        iva_aplicable: categoria !== 'POLIZA',
      },
    ]);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // GUARDADO ATÓMICO EN BACKEND
  // ═══════════════════════════════════════════════════════════════════════════

  const buildStudioPayload = (): GuardarStudioPayload => ({
    id_cliente: Number(clienteId),
    id_sede: sedeId !== 'NONE' ? Number(sedeId) : null,
    atencion_a_nombre: atencionANombre.trim() || null,
    atencion_a_cargo: atencionACargo.trim() || null,
    elaborada_por: elaboradaPor ? Number(elaboradaPor) : undefined,
    tipo_cotizacion: tipoCotizacion.trim() || 'SERVICIO_TECNICO',
    id_plantilla_origen: plantillaOrigenId,
    fecha_cotizacion: fechaCotizacion,
    fecha_vencimiento: fechaVencimiento,
    asunto: asunto.trim(),
    descripcion_general: descripcionGeneral.trim() || null,
    alcance_trabajo: alcanceTrabajo.trim() || null,
    exclusiones: exclusiones.trim() || null,
    descuento_porcentaje: descuentoGlobal,
    iva_porcentaje: ivaPorcentaje,
    usa_aiu: usaAiu,
    aiu_admin_porcentaje: usaAiu ? aiuAdminPct : 0,
    aiu_imprevistos_porcentaje: usaAiu ? aiuImprevPct : 0,
    aiu_utilidad_porcentaje: usaAiu ? aiuUtilPct : 0,
    iva_sobre_utilidad_aiu: usaAiu && ivaSobreUtilidadAiu,
    mostrar_desglose_precios: mostrarDesglosePrecios,
    forma_pago: formaPago.trim() || 'CONTADO',
    tiempo_estimado_dias: tiempoDias ? Number(tiempoDias) : null,
    meses_garantia: Number(mesesGarantia) || 0,
    observaciones_garantia: obsGarantia.trim() || null,
    terminos_condiciones: terminosCondiciones.trim() || null,
    equipos: equiposIds.map((id, idx) => ({ id_equipo: id, orden_secuencia: idx + 1 })),
    items_servicios: serviciosRows
      .filter((s) => s.descripcion.trim().length > 0)
      .map((s, idx) => ({
        id_servicio: s.id_servicio ?? null,
        id_equipo: s.id_equipo ?? null,
        descripcion_personalizada: s.descripcion.trim(),
        cantidad: Number(s.cantidad) || 1,
        unidad: s.unidad || 'servicio',
        costo_unitario: Number(s.costo_unitario) || 0,
        precio_unitario: Number(s.precio_unitario) || 0,
        descuento_porcentaje: Number(s.descuento_porcentaje) || 0,
        es_opcional: s.es_opcional,
        iva_aplicable: s.iva_aplicable,
        observaciones: s.observaciones || undefined,
        orden_item: idx + 1,
      })),
    items_componentes: componentesRows
      .filter((c) => c.descripcion.trim().length > 0)
      .map((c, idx) => ({
        id_componente: c.id_componente ?? null,
        id_tipo_componente: c.id_tipo_componente ?? null,
        id_equipo: c.id_equipo ?? null,
        descripcion: c.descripcion.trim(),
        referencia_manual: c.referencia_manual || undefined,
        marca_manual: c.marca_manual || undefined,
        cantidad: Number(c.cantidad) || 1,
        unidad: c.unidad || 'unidad',
        costo_unitario: Number(c.costo_unitario) || 0,
        precio_unitario: Number(c.precio_unitario) || 0,
        descuento_porcentaje: Number(c.descuento_porcentaje) || 0,
        es_opcional: c.es_opcional,
        iva_aplicable: c.iva_aplicable,
        garantia_meses: c.garantia_meses,
        orden_item: idx + 1,
      })),
    items_otros: otrosRows
      .filter((o) => o.descripcion.trim().length > 0)
      .map((o, idx) => ({
        id_equipo: o.id_equipo ?? null,
        categoria_rubro: o.categoria_rubro || 'OTRO',
        descripcion: o.descripcion.trim(),
        detalle_calculo: o.detalle_calculo || undefined,
        cantidad: Number(o.cantidad) || 1,
        unidad: o.unidad || 'global',
        costo_unitario: Number(o.costo_unitario) || 0,
        precio_unitario: Number(o.precio_unitario) || 0,
        descuento_porcentaje: Number(o.descuento_porcentaje) || 0,
        visible_cliente: o.visible_cliente,
        es_opcional: o.es_opcional,
        iva_aplicable: o.iva_aplicable,
        orden_item: idx + 1,
      })),
  });

  const handleSave = async (): Promise<number | null> => {
    if (!clienteId) {
      toast.error('Selecciona un cliente para la cotización');
      return null;
    }
    if (!asunto.trim()) {
      toast.error('Ingresa el asunto o título comercial de la cotización');
      return null;
    }
    if (fechaVencimiento <= fechaCotizacion) {
      toast.error('La fecha de vencimiento debe ser posterior a la fecha de emisión');
      return null;
    }

    const studioPayload = buildStudioPayload();

    if (isEdit && cotizacion) {
      await guardarStudioMut.mutateAsync(studioPayload);
      return cotizacion.id_cotizacion;
    }

    // Crear cabecera primero y luego guardar atómicamente el Studio completo
    const empId = elaboradaPor ? Number(elaboradaPor) : empleados[0]?.id_empleado;
    const creada = await createMut.mutateAsync({
      id_cliente: Number(clienteId),
      id_sede: sedeId !== 'NONE' ? Number(sedeId) : undefined,
      atencion_a_nombre: atencionANombre.trim() || undefined,
      atencion_a_cargo: atencionACargo.trim() || undefined,
      equipos_ids: equiposIds,
      tipo_cotizacion: tipoCotizacion.trim() || 'SERVICIO_TECNICO',
      id_plantilla_origen: plantillaOrigenId ?? undefined,
      fecha_cotizacion: fechaCotizacion,
      fecha_vencimiento: fechaVencimiento,
      asunto: asunto.trim(),
      descripcion_general: descripcionGeneral.trim() || undefined,
      alcance_trabajo: alcanceTrabajo.trim() || undefined,
      exclusiones: exclusiones.trim() || undefined,
      descuento_porcentaje: descuentoGlobal,
      iva_porcentaje: ivaPorcentaje,
      usa_aiu: usaAiu,
      aiu_admin_porcentaje: usaAiu ? aiuAdminPct : 0,
      aiu_imprevistos_porcentaje: usaAiu ? aiuImprevPct : 0,
      aiu_utilidad_porcentaje: usaAiu ? aiuUtilPct : 0,
      iva_sobre_utilidad_aiu: usaAiu && ivaSobreUtilidadAiu,
      mostrar_desglose_precios: mostrarDesglosePrecios,
      tiempo_estimado_dias: tiempoDias ? Number(tiempoDias) : undefined,
      forma_pago: formaPago.trim() || 'CONTADO',
      meses_garantia: Number(mesesGarantia) || 0,
      observaciones_garantia: obsGarantia.trim() || undefined,
      terminos_condiciones: terminosCondiciones.trim() || undefined,
      elaborada_por: empId,
    });

    if (
      creada?.id_cotizacion &&
      (studioPayload.items_servicios?.length ||
        studioPayload.items_componentes?.length ||
        studioPayload.items_otros?.length)
    ) {
      await apiClient.put(`/cotizaciones/${creada.id_cotizacion}/studio`, studioPayload);
    }

    if (creada?.id_cotizacion) {
      // Persistir firmas digitales opcionales si fueron pre-adjuntadas antes de crear la cotización
      if (firmaAsesorLocal?.firma_base64 || firmaAsesorLocal?.id_firma_digital) {
        await guardarFirmaCotizacion(creada.id_cotizacion, 'ASESOR', {
          id_firma_digital: firmaAsesorLocal.id_firma_digital,
          firma_base64: firmaAsesorLocal.id_firma_digital
            ? undefined
            : firmaAsesorLocal.firma_base64,
        }).catch(() => null);
      }
      if (firmaClienteLocal?.firma_base64 || firmaClienteLocal?.id_firma_digital) {
        await guardarFirmaCotizacion(creada.id_cotizacion, 'CLIENTE', {
          id_firma_digital: firmaClienteLocal.id_firma_digital,
          firma_base64: firmaClienteLocal.id_firma_digital
            ? undefined
            : firmaClienteLocal.firma_base64,
        }).catch(() => null);
      }
      router.replace(`/comercial/cotizaciones/${creada.id_cotizacion}`);
      return creada.id_cotizacion;
    }
    return null;
  };

  // Filtrados para comboboxes rápidos de catálogo (búsqueda tokenizada sin tildes + prioridad N:M)
  const serviciosFiltrados = useMemo(() => {
    const q = srvSearch.trim();
    const list = q
      ? serviciosCatalogo.filter((s) =>
          matchesAllTokens(q, [s.nombre_servicio, s.codigo_servicio, s.categoria]),
        )
      : serviciosCatalogo;

    const scoreSrv = (idTipoEquipo?: number | null) => {
      if (selectedTiposEquipoIds.size === 0) return 0;
      if (idTipoEquipo && selectedTiposEquipoIds.has(idTipoEquipo)) return 2;
      if (!idTipoEquipo) return 1;
      return 0;
    };

    return [...list]
      .sort((a, b) => scoreSrv(b.id_tipo_equipo) - scoreSrv(a.id_tipo_equipo))
      .slice(0, 30);
  }, [serviciosCatalogo, srvSearch, selectedTiposEquipoIds]);

  const componentesFiltrados = useMemo(() => {
    const q = cmpSearch.trim();
    const byId = new Map<number, (typeof articulosMaestro)[number]>();

    // Resultados en vivo del servidor cuando el usuario escribe >= 2 caracteres
    if (q.length >= 2) {
      for (const item of articulosSearch) {
        byId.set(item.id_componente, item);
      }
    }

    // Más coincidencia local instantánea tokenizada e insensible a acentos sobre los primeros 300
    for (const c of articulosMaestro) {
      if (byId.has(c.id_componente)) continue;
      if (!q) {
        byId.set(c.id_componente, c);
        continue;
      }
      if (
        matchesAllTokens(q, [
          c.descripcion_corta,
          c.referencia_fabricante,
          c.codigo_interno,
          c.marcas?.nombre,
          c.marca,
          c.categorias_componente?.nombre,
        ])
      ) {
        byId.set(c.id_componente, c);
      }
    }

    const scoreArt = (c: (typeof articulosMaestro)[number]) => {
      if (selectedTiposEquipoIds.size === 0) return 0;
      if (c.aplica_todos_tipos === false) {
        const ids = c.tipos_equipo_ids || c.tipos_equipo?.map((t) => t.id_tipo_equipo) || [];
        return ids.some((id) => selectedTiposEquipoIds.has(id)) ? 2 : 0;
      }
      return 1; // Universal
    };

    return Array.from(byId.values())
      .sort((a, b) => scoreArt(b) - scoreArt(a))
      .slice(0, 30);
  }, [articulosMaestro, articulosSearch, cmpSearch, selectedTiposEquipoIds]);

  const { plantillasVisibles, totalPlantillasDisponibles, bomKitsVisibles } = useMemo(() => {
    const mult = Math.max(1, equiposIds.length);
    const sugMap = new Map(
      (sugerencias?.plantillas_sugeridas || []).map((s, idx) => [s.id_plantilla, { s, idx }]),
    );

    const ordenadas = [...plantillasAll].sort((a, b) => {
      const ra = sugMap.get(a.id_plantilla)?.idx ?? 9999;
      const rb = sugMap.get(b.id_plantilla)?.idx ?? 9999;
      if (ra !== rb) return ra - rb;
      return (b.veces_usada || 0) - (a.veces_usada || 0);
    });

    const q = plantillaSearch.trim();
    const filtradas = q
      ? ordenadas.filter((p) =>
          matchesAllTokens(q, [
            p.nombre,
            p.codigo_plantilla,
            p.descripcion,
            p.tipo_cotizacion,
            p.tipos_equipo?.nombre_tipo,
            p.modelos_equipo?.marca,
            p.modelos_equipo?.modelo,
            p.modulos_tecnicos?.nombre_modulo,
            ...(p.items || []).map((it) => it.descripcion),
          ]),
        )
      : ordenadas;

    const mapped = filtradas.map((p) => {
      const sug = sugMap.get(p.id_plantilla)?.s;
      const estCalc =
        sug?.subtotal_estimado ??
        (p.items || [])
          .filter((i) => !i.es_opcional && i.visible_cliente !== false)
          .reduce(
            (acc, i) =>
              acc +
              Number(i.cantidad_base || 1) *
                (i.es_por_equipo ? mult : 1) *
                Number(i.precio_unitario_fijo || 0),
            0,
          );
      return {
        plantilla: p,
        total_items: sug?.total_items ?? (p.items?.length || 0),
        subtotal_estimado: estCalc,
      };
    });

    const kits = (sugerencias?.bom_kits || []).filter((kit) =>
      q
        ? matchesAllTokens(q, [
            kit.etiqueta_modelo,
            ...kit.items.map((it) => it.descripcion),
            ...kit.items.map((it) => it.referencia_fabricante),
          ])
        : true,
    );

    const visibles = q || mostrarTodasPlantillas ? mapped : mapped.slice(0, 4);
    return {
      plantillasVisibles: visibles,
      totalPlantillasDisponibles: ordenadas.length,
      bomKitsVisibles: kits,
    };
  }, [plantillasAll, sugerencias, equiposIds.length, plantillaSearch, mostrarTodasPlantillas]);

  const isSaving = createMut.isPending || guardarStudioMut.isPending;

  return (
    <div className="space-y-5 -mx-3 sm:-mx-5 px-3 sm:px-5 pt-3 pb-14 bg-slate-50/90 min-h-screen rounded-2xl">
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* HEADER EJECUTIVO & BARRA DE WORKFLOW                                   */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div className="sticky top-0 z-20 px-4 py-3 bg-white/95 backdrop-blur border border-slate-200/90 rounded-xl shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="outline" size="sm" asChild>
            <Link href="/comercial/cotizaciones">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Listado
            </Link>
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-slate-900 font-mono truncate">
                {isEdit ? cotizacion?.numero_cotizacion : 'Nueva Cotización CPQ'}
              </h1>
              <Badge
                variant="outline"
                className={ESTADO_BADGE[estadoCodigo] || 'bg-slate-100 text-slate-700'}
              >
                {ESTADO_LABELS_COTIZACION[estadoCodigo] || estadoCodigo}
              </Badge>
              {isEdit && (
                <Badge variant="outline" className="font-mono text-[11px] bg-slate-50">
                  v{cotizacion?.version || 1}
                </Badge>
              )}
              {cotizacion?.orden_compra_cliente && (
                <Badge className="bg-emerald-600 text-white text-[11px]">
                  PO: {cotizacion.orden_compra_cliente}
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 truncate">
              {asunto || 'Configura cliente, parque de equipos, servicios, repuestos y logística'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isEditable && (
            <Button onClick={handleSave} disabled={isSaving} size="sm" className="gap-1.5">
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isEdit ? 'Guardar Cambios' : 'Crear y Guardar'}
            </Button>
          )}

          {isEdit && cotizacion && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPdfPreviewOpen(true)}
                title="Previsualizar y descargar PDF corporativo"
              >
                <FileText className="h-4 w-4 mr-1.5" />
                PDF
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSaveTplNombre(asunto || `Plantilla ${cotizacion.numero_cotizacion}`);
                  setSaveTplDesc('');
                  setSaveTplOpen(true);
                }}
                title="Guardar esta oferta como plantilla estándar reutilizable"
              >
                <BookmarkPlus className="h-4 w-4 mr-1.5" />
                Como Plantilla
              </Button>

              <Button
                variant="outline"
                size="sm"
                disabled={workflow.duplicar.isPending}
                onClick={async () => {
                  const copia = await workflow.duplicar.mutateAsync(cotizacion.id_cotizacion);
                  if (copia?.id_cotizacion) {
                    router.push(`/comercial/cotizaciones/${copia.id_cotizacion}`);
                  }
                }}
              >
                <Copy className="h-4 w-4 mr-1" />
                Duplicar
              </Button>

              {estadoCodigo === 'BORRADOR' && (
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => setSolicitarOpen(true)}
                >
                  <ShieldCheck className="h-4 w-4 mr-1.5" />
                  {resumenFinanciero.nivelAprobacion === 'NINGUNO'
                    ? 'Aprobar para Envío'
                    : `Solicitar Aprobación (${resumenFinanciero.nivelAprobacion})`}
                </Button>
              )}

              {estadoCodigo === 'APROBADA_INTERNA' && (
                <Button
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  onClick={() => {
                    if (atencionANombre.trim()) {
                      setEnviarNombre(atencionANombre.trim());
                    }
                    setEnviarOpen(true);
                  }}
                >
                  <Mail className="h-4 w-4 mr-1.5" />
                  Enviar al Cliente
                </Button>
              )}

              {estadoCodigo === 'ENVIADA' && (
                <>
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => setAprobarOpen(true)}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1.5" />
                    Aprobada por Cliente
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => setRechazarOpen(true)}>
                    <XCircle className="h-4 w-4 mr-1.5" />
                    Rechazada
                  </Button>
                </>
              )}

              {estadoCodigo === 'APROBADA_CLIENTE' && !cotizacion.id_orden_servicio_generada && (
                <Button
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-white"
                  onClick={() => {
                    setQ2oResultado(null);
                    setQ2oOpen(true);
                  }}
                >
                  <ArrowRightCircle className="h-4 w-4 mr-1.5" />
                  Convertir a Orden de Servicio
                </Button>
              )}

              {cotizacion.id_orden_servicio_generada && (
                <Button size="sm" variant="secondary" asChild>
                  <Link href={`/ordenes/${cotizacion.id_orden_servicio_generada}`}>
                    <ArrowRightCircle className="h-4 w-4 mr-1.5" />
                    Ver Orden #{cotizacion.id_orden_servicio_generada}
                  </Link>
                </Button>
              )}

              {!isEditable &&
                !(estadoCodigo === 'APROBADA_CLIENTE' && cotizacion.id_orden_servicio_generada) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setReabrirOpen(true)}
                    title="Archiva snapshot de versión y vuelve a BORRADOR para editar"
                  >
                    <RotateCcw className="h-4 w-4 mr-1.5" />
                    Reabrir (v{(cotizacion.version || 1) + 1})
                  </Button>
                )}
            </>
          )}
        </div>
      </div>

      {!isEditable && (
        <div className="px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between gap-2">
          <span>
            Esta cotización está en estado <strong>{ESTADO_LABELS_COTIZACION[estadoCodigo]}</strong>{' '}
            y se muestra en modo lectura para proteger el historial comercial.
          </span>
          {isEdit && !cotizacion?.id_orden_servicio_generada && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs bg-white"
              onClick={() => setReabrirOpen(true)}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Reabrir como nueva versión
            </Button>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* LAYOUT SPLIT-SCREEN (8 COL CONSTRUCTOR + 4 COL STICKY FINANCIERO)      */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* COLUMNA IZQUIERDA (8) */}
        <div className="xl:col-span-8 space-y-5">
          {/* PASO 1: CLIENTE, SEDE, TIPO Y PARQUE MULTI-EQUIPO */}
          <Card className="bg-white border-slate-200/90 shadow-sm rounded-xl">
            <CardHeader className="py-3.5 px-5 border-b border-slate-100 bg-slate-50/40 rounded-t-xl">
              <CardTitle className="text-sm font-bold flex items-center gap-2.5 text-slate-900">
                <span className="h-6 w-6 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-xs font-extrabold shrink-0">
                  1
                </span>
                <Building2 className="h-4 w-4 text-primary shrink-0" />
                <span>Cliente, Contexto Comercial y Parque de Equipos</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Selector buscable de Cliente */}
                <div className="md:col-span-2 space-y-1 relative">
                  <Label className="text-xs font-semibold">Cliente *</Label>
                  <div className="relative">
                    <button
                      type="button"
                      disabled={!isEditable}
                      onClick={() => setClienteDropdownOpen((o) => !o)}
                      className="w-full h-9 px-3 text-left text-sm bg-white border border-slate-200 rounded-md flex items-center justify-between hover:border-slate-300 disabled:bg-slate-50 disabled:text-slate-500"
                    >
                      <span className="truncate">
                        {clienteSeleccionado
                          ? clienteSeleccionado.nombre_sede ||
                            clienteSeleccionado.persona?.nombre_comercial ||
                            clienteSeleccionado.persona?.razon_social
                          : cotizacion?.cliente?.persona?.razon_social ||
                            'Buscar y seleccionar cliente...'}
                      </span>
                      <Search className="h-3.5 w-3.5 text-slate-400 shrink-0 ml-2" />
                    </button>
                    {clienteDropdownOpen && isEditable && (
                      <div className="absolute z-30 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl p-2 space-y-1.5">
                        <Input
                          autoFocus
                          value={clienteSearch}
                          onChange={(e) => setClienteSearch(e.target.value)}
                          placeholder="Buscar por razón social, sede o NIT..."
                          className="h-8 text-xs"
                        />
                        <div className="max-h-56 overflow-y-auto divide-y divide-slate-50">
                          {clientesFiltrados.map((c) => {
                            const label =
                              c.nombre_sede ||
                              c.persona?.nombre_comercial ||
                              c.persona?.razon_social ||
                              `Cliente #${c.id_cliente}`;
                            return (
                              <button
                                key={c.id_cliente}
                                type="button"
                                onClick={() => {
                                  const repNombre = c.persona?.representante_legal?.trim() || '';
                                  const repCargo = c.cargo_contacto?.trim() || '';
                                  setClienteId(String(c.id_cliente));
                                  setSedeId('NONE');
                                  setEquiposIds([]);
                                  setClienteDropdownOpen(false);
                                  setClienteSearch('');
                                  setAtencionANombre(repNombre);
                                  setAtencionACargo(repCargo);
                                  setEnviarNombre(repNombre || label);
                                  if (c.persona?.email_principal) {
                                    setEnviarEmail(c.persona.email_principal);
                                  }
                                }}
                                className="w-full px-2.5 py-2 text-left text-xs hover:bg-primary/5 rounded flex items-center justify-between"
                              >
                                <span className="font-medium text-slate-800 truncate">{label}</span>
                                {c.persona?.numero_identificacion && (
                                  <span className="text-[10px] font-mono text-slate-400 ml-2">
                                    {c.persona.numero_identificacion}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sede */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Sede (Opcional)</Label>
                  <Select
                    disabled={!isEditable || !clienteId || sedes.length === 0}
                    value={sedeId}
                    onValueChange={handleSelectSede}
                  >
                    <SelectTrigger className="h-9 text-xs bg-white">
                      <SelectValue placeholder="Todas / Principal" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">Principal / Sin sede específica</SelectItem>
                      {sedes.map((s) => (
                        <SelectItem key={s.id_sede} value={String(s.id_sede)}>
                          {s.nombre_sede}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Destinatario Comercial ("Atención a / Representante") */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-xs font-semibold text-slate-700">
                      Atención a / Representante (Opcional)
                    </Label>
                    {isEditable &&
                      contactoFichaSugerido.nombre &&
                      (atencionANombre.trim() !== contactoFichaSugerido.nombre ||
                        (Boolean(contactoFichaSugerido.cargo) &&
                          atencionACargo.trim() !== contactoFichaSugerido.cargo)) && (
                        <button
                          type="button"
                          onClick={() => {
                            setAtencionANombre(contactoFichaSugerido.nombre);
                            setAtencionACargo(contactoFichaSugerido.cargo);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                          title={`Restaurar desde ficha del ${contactoFichaSugerido.origen}: ${contactoFichaSugerido.nombre}`}
                        >
                          <RotateCcw className="h-3 w-3" />
                          Restaurar de ficha
                        </button>
                      )}
                  </div>
                  <Input
                    disabled={!isEditable}
                    value={atencionANombre}
                    onChange={(e) => setAtencionANombre(e.target.value)}
                    maxLength={200}
                    placeholder="Ej: Ing. María Fernanda Gómez (aparece en encabezado y firma del PDF)"
                    className="h-9 text-xs bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">
                    Cargo / Dependencia (Opcional)
                  </Label>
                  <Input
                    disabled={!isEditable}
                    value={atencionACargo}
                    onChange={(e) => setAtencionACargo(e.target.value)}
                    maxLength={120}
                    placeholder="Ej: Administración / Compras / Ingeniería"
                    className="h-9 text-xs bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Tipo de Oferta</Label>
                  <CpqCreatableCombobox
                    disabled={!isEditable}
                    value={tipoCotizacion}
                    onChange={setTipoCotizacion}
                    options={TIPO_OFERTA_COMBOBOX_OPTIONS}
                    placeholder="Seleccionar tipo de oferta..."
                    searchPlaceholder="Buscar o escribir tipo personalizado..."
                    customLabel="Crear tipo de oferta"
                    normalizeCustom={(raw) =>
                      raw
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')
                        .toUpperCase()
                        .replace(/[^A-Z0-9]+/g, '_')
                        .replace(/^_+|_+$/g, '')
                        .slice(0, 40)
                    }
                    minDropdownWidth={290}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Asesor Responsable</Label>
                  <EamSelect
                    disabled={!isEditable}
                    value={elaboradaPor || (empleados[0] ? String(empleados[0].id_empleado) : '')}
                    onChange={setElaboradaPor}
                    options={asesorOptions}
                    searchable
                    placeholder="Seleccionar asesor..."
                    searchPlaceholder="Buscar asesor por nombre o cargo..."
                    size="sm"
                    minDropdownWidth={280}
                    className="h-9 rounded-lg"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Emisión *</Label>
                  <Input
                    type="date"
                    disabled={!isEditable}
                    value={fechaCotizacion}
                    onChange={(e) => setFechaCotizacion(e.target.value)}
                    className="h-9 text-xs bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Vencimiento *</Label>
                  <Input
                    type="date"
                    disabled={!isEditable}
                    value={fechaVencimiento}
                    onChange={(e) => setFechaVencimiento(e.target.value)}
                    className="h-9 text-xs bg-white"
                  />
                </div>
              </div>

              {/* Selector Multi-Equipo */}
              <div className="pt-2 border-t border-slate-100 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label className="text-xs font-semibold flex items-center gap-1.5 text-slate-800">
                    <Cpu className="h-3.5 w-3.5 text-primary" />
                    Equipos Cubiertos por esta Cotización ({equiposIds.length})
                  </Label>
                  {isEditable && equiposCliente.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Input
                        value={equipoSearch}
                        onChange={(e) => setEquipoSearch(e.target.value)}
                        placeholder="Filtrar equipos..."
                        className="h-7 w-44 text-xs bg-white"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() =>
                          setEquiposIds(
                            equiposIds.length === equiposCliente.length
                              ? []
                              : equiposCliente.map((e) => e.id_equipo),
                          )
                        }
                      >
                        {equiposIds.length === equiposCliente.length
                          ? 'Limpiar todos'
                          : `Seleccionar todos (${equiposCliente.length})`}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Chips seleccionados */}
                {equiposSeleccionadosInfo.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {equiposSeleccionadosInfo.map((eq) => (
                      <span
                        key={eq.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                      >
                        <span className="font-mono font-bold">{eq.codigo}</span>
                        <span className="max-w-[180px] truncate">{eq.nombre}</span>
                        {eq.tipo && <span className="text-[10px] opacity-75">· {eq.tipo}</span>}
                        {isEditable && (
                          <button
                            type="button"
                            onClick={() => toggleEquipo(eq.id)}
                            className="hover:text-rose-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                )}

                {/* Grid de check multi-equipo cuando es editable */}
                {isEditable && clienteId && (
                  <div className="max-h-44 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 bg-slate-50/40">
                    {equiposFiltrados.length === 0 ? (
                      <p className="p-3 text-xs text-slate-500 text-center">
                        Este cliente no tiene equipos registrados en la sede seleccionada (puedes
                        cotizar igualmente sin equipo).
                      </p>
                    ) : (
                      equiposFiltrados.map((eq) => {
                        const checked = equiposIds.includes(eq.id_equipo);
                        return (
                          <label
                            key={eq.id_equipo}
                            className={`flex items-center justify-between gap-2 px-3 py-2 text-xs cursor-pointer transition-colors ${
                              checked ? 'bg-primary/5' : 'hover:bg-white'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleEquipo(eq.id_equipo)}
                                className="rounded border-slate-300 text-primary"
                              />
                              <span className="font-mono font-bold text-slate-700 shrink-0">
                                {eq.codigo_equipo}
                              </span>
                              <span className="text-slate-800 truncate">
                                {eq.nombre_equipo || eq.codigo_equipo}
                              </span>
                            </div>
                            <Badge variant="outline" className="text-[10px] shrink-0 bg-white">
                              {eq.tipos_equipo?.nombre_tipo || 'Equipo'}
                            </Badge>
                          </label>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* ═══════════════════════════════════════════════════════════════ */}
              {/* SMART MATCH BANNER: GEMELOS + PLANTILLAS + BOM OEM             */}
              {/* ═══════════════════════════════════════════════════════════════ */}
              {isEditable && (
                <div className="rounded-xl border border-primary/25 bg-gradient-to-br from-primary/5 via-white to-emerald-50/40 p-3.5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Sparkles className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-xs font-bold text-slate-900 truncate">
                        Asistente Inteligente CPQ · Plantillas & Kits OEM
                      </span>
                      {totalPlantillasDisponibles > 0 && (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 h-4 bg-white/80 text-slate-600 border-slate-200 font-mono"
                        >
                          {totalPlantillasDisponibles}
                        </Badge>
                      )}
                      {loadingSugerencias && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="relative">
                        <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <Input
                          value={plantillaSearch}
                          onChange={(e) => setPlantillaSearch(e.target.value)}
                          placeholder="Buscar plantilla o kit..."
                          className="h-7 w-48 sm:w-56 pl-7 pr-6 text-xs bg-white/95 border-slate-200 rounded-lg"
                        />
                        {plantillaSearch && (
                          <button
                            type="button"
                            onClick={() => setPlantillaSearch('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            title="Limpiar búsqueda"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 text-[11px] px-2" asChild>
                        <Link href="/comercial/cotizaciones/plantillas">
                          <Layers className="h-3 w-3 mr-1" />
                          Gestionar
                        </Link>
                      </Button>
                    </div>
                  </div>

                  {/* Alerta de Equipos Gemelos detectados */}
                  {sugerencias?.grupos_gemelos &&
                    sugerencias.grupos_gemelos.some((g) => g.es_gemelo_multiple) && (
                      <div className="flex flex-wrap gap-2">
                        {sugerencias.grupos_gemelos
                          .filter((g) => g.es_gemelo_multiple)
                          .map((g, idx) => (
                            <div
                              key={idx}
                              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-100/80 border border-emerald-300 text-xs text-emerald-900"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                              <span>
                                <strong>{g.cantidad_equipos} equipos gemelos</strong> detectados:{' '}
                                <strong>{g.etiqueta}</strong> (escalado automático activo)
                              </span>
                            </div>
                          ))}
                      </div>
                    )}

                  {/* Plantillas sugeridas y resultados de búsqueda */}
                  {plantillasVisibles.length === 0 && bomKitsVisibles.length === 0 ? (
                    <div className="py-3 px-4 flex items-center justify-between gap-2 text-xs text-slate-500 border border-dashed border-slate-200 rounded-lg bg-white/70">
                      <span>
                        {plantillaSearch.trim()
                          ? `Sin plantillas ni kits que coincidan con "${plantillaSearch.trim()}".`
                          : 'Aún no hay plantillas estándar creadas en el catálogo.'}
                      </span>
                      {plantillaSearch.trim() && (
                        <button
                          type="button"
                          onClick={() => setPlantillaSearch('')}
                          className="text-primary font-semibold hover:underline shrink-0"
                        >
                          Limpiar filtro
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-0.5">
                        {plantillasVisibles.map(
                          ({ plantilla: fullTpl, total_items, subtotal_estimado }) => (
                            <button
                              key={fullTpl.id_plantilla}
                              type="button"
                              onClick={() => applyPlantillaLocal(fullTpl, false)}
                              className="group text-left px-3 py-2.5 rounded-xl bg-slate-50/70 hover:bg-emerald-50/50 border border-slate-200/90 hover:border-emerald-300 hover:shadow-sm transition-all flex items-start justify-between gap-2.5"
                            >
                              <div className="flex items-start gap-2.5 min-w-0">
                                <div className="h-7 w-7 mt-0.5 rounded-lg bg-primary/10 text-primary group-hover:bg-emerald-100 group-hover:text-emerald-700 flex items-center justify-center shrink-0 transition-colors">
                                  <Layers className="h-3.5 w-3.5" />
                                </div>
                                <div className="min-w-0 space-y-0.5">
                                  <p className="text-xs font-bold text-slate-800 group-hover:text-emerald-950 line-clamp-2 leading-snug">
                                    {fullTpl.nombre}
                                  </p>
                                  <p className="text-[11px] text-slate-500">
                                    {total_items} líneas · ×{Math.max(1, equiposIds.length)} eq.
                                    {subtotal_estimado > 0
                                      ? ` · Est. ${formatCurrency(subtotal_estimado)}`
                                      : ''}
                                  </p>
                                </div>
                              </div>
                              <span className="inline-flex items-center gap-0.5 shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white border border-slate-200 text-slate-600 group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600 transition-colors mt-0.5">
                                Aplicar
                                <ArrowRight className="h-2.5 w-2.5" />
                              </span>
                            </button>
                          ),
                        )}

                        {/* Kits OEM BOM detectados */}
                        {bomKitsVisibles.map((kit) => (
                          <button
                            key={kit.id_modelo_equipo}
                            type="button"
                            onClick={() => importBomKitLocal(kit)}
                            className="group text-left px-3 py-2.5 rounded-xl bg-emerald-50/70 hover:bg-emerald-100/70 border border-emerald-200 hover:border-emerald-400 hover:shadow-sm transition-all flex items-start justify-between gap-2.5"
                          >
                            <div className="flex items-start gap-2.5 min-w-0">
                              <div className="h-7 w-7 mt-0.5 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                                <Package className="h-3.5 w-3.5" />
                              </div>
                              <div className="min-w-0 space-y-0.5">
                                <p className="text-xs font-bold text-emerald-950 line-clamp-2 leading-snug">
                                  Kit BOM OEM · {kit.etiqueta_modelo}
                                </p>
                                <p className="text-[11px] text-emerald-800">
                                  {kit.items.length} repuestos OEM × {kit.equipos_gemelos} equipo(s)
                                </p>
                              </div>
                            </div>
                            <span className="inline-flex items-center gap-0.5 shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-600 text-white mt-0.5">
                              Importar
                              <ArrowRight className="h-2.5 w-2.5" />
                            </span>
                          </button>
                        ))}
                      </div>

                      {!plantillaSearch.trim() && totalPlantillasDisponibles > 4 && (
                        <div className="flex justify-center pt-0.5">
                          <button
                            type="button"
                            onClick={() => setMostrarTodasPlantillas((v) => !v)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                          >
                            {mostrarTodasPlantillas ? (
                              <>
                                <ChevronUp className="h-3.5 w-3.5" />
                                Mostrar solo sugeridas (4)
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-3.5 w-3.5" />
                                Ver todas las plantillas ({totalPlantillasDisponibles})
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* PASO 2: OBJETO COMERCIAL Y ALCANCE TÉCNICO */}
          <Card className="bg-white border-slate-200/90 shadow-sm rounded-xl">
            <CardHeader className="py-3.5 px-5 border-b border-slate-100 bg-slate-50/40 rounded-t-xl">
              <CardTitle className="text-sm font-bold flex items-center gap-2.5 text-slate-900">
                <span className="h-6 w-6 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-xs font-extrabold shrink-0">
                  2
                </span>
                <FileText className="h-4 w-4 text-primary shrink-0" />
                <span>Objeto de la Oferta, Alcance Técnico y Exclusiones</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">
                  Asunto / Título Comercial *
                </Label>
                <Input
                  disabled={!isEditable}
                  value={asunto}
                  onChange={(e) => setAsunto(e.target.value)}
                  placeholder="Ej: Suministro e instalación de bancos de baterías para 2 plantas de emergencia"
                  className="bg-white font-medium h-9"
                />
              </div>

              <div className="pt-0.5">
                <button
                  type="button"
                  onClick={() => setAlcanceExpandido((v) => !v)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-primary transition-colors py-1"
                >
                  {alcanceExpandido ? (
                    <ChevronUp className="h-3.5 w-3.5 text-primary" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                  )}
                  <span>
                    {alcanceExpandido
                      ? 'Ocultar descripción general, alcance incluido y exclusiones'
                      : 'Agregar descripción general, alcance incluido y exclusiones (opcional)'}
                  </span>
                  {!alcanceExpandido &&
                    [descripcionGeneral, alcanceTrabajo, exclusiones].filter((t) => t.trim())
                      .length > 0 && (
                      <Badge
                        variant="outline"
                        className="text-[10px] ml-1 bg-primary/5 text-primary border-primary/20"
                      >
                        {
                          [descripcionGeneral, alcanceTrabajo, exclusiones].filter((t) => t.trim())
                            .length
                        }{' '}
                        con texto
                      </Badge>
                    )}
                </button>
              </div>

              {alcanceExpandido && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">
                      Descripción General (Opcional)
                    </Label>
                    <Textarea
                      disabled={!isEditable}
                      rows={2}
                      value={descripcionGeneral}
                      onChange={(e) => setDescripcionGeneral(e.target.value)}
                      placeholder="Resumen ejecutivo de la necesidad o contexto técnico..."
                      className="bg-white text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-emerald-800">
                        Alcance Incluido
                      </Label>
                      <CpqBulletListEditor
                        variant="incluido"
                        disabled={!isEditable}
                        value={alcanceTrabajo}
                        onChange={setAlcanceTrabajo}
                        placeholder="Escribe actividad incluida y presiona Enter..."
                        emptyMessage="Sin ítems de alcance definidos."
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-rose-800">Exclusiones</Label>
                      <CpqBulletListEditor
                        variant="exclusion"
                        disabled={!isEditable}
                        value={exclusiones}
                        onChange={setExclusiones}
                        placeholder="Escribe una exclusión y presiona Enter..."
                        emptyMessage="Sin exclusiones registradas."
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* PASO 3: SERVICIOS TÉCNICOS */}
          <Card className="bg-white border-slate-200/90 shadow-sm rounded-xl">
            <CardHeader className="py-3.5 px-5 border-b border-slate-100 bg-slate-50/40 rounded-t-xl flex flex-row items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-sm font-bold flex items-center gap-2.5 text-slate-900">
                  <span className="h-6 w-6 rounded-lg bg-blue-50 text-blue-700 border border-blue-200/80 flex items-center justify-center text-xs font-extrabold shrink-0">
                    3
                  </span>
                  <Wrench className="h-4 w-4 text-blue-600 shrink-0" />
                  <span>Servicios Técnicos y Mano de Obra ({serviciosRows.length})</span>
                </CardTitle>
                {lockCatalogUnitPrice && isEditable && (
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-slate-50 text-slate-600 border-slate-200 gap-1"
                  >
                    <Lock className="h-2.5 w-2.5" />
                    Precios catálogo protegidos (rebajas vía Desc%)
                  </Badge>
                )}
              </div>
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
                {isEditable && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() =>
                      setServiciosRows((prev) => [
                        ...prev,
                        {
                          uid: nextUid('srv'),
                          id_servicio: null,
                          descripcion: '',
                          cantidad: Math.max(1, equiposIds.length),
                          unidad: 'servicio',
                          costo_unitario: 0,
                          precio_unitario: 0,
                          descuento_porcentaje: 0,
                          es_opcional: false,
                          iva_aplicable: true,
                        },
                      ])
                    }
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Línea Libre
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {isEditable && (
                <div className="relative">
                  <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    value={srvSearch}
                    onChange={(e) => setSrvSearch(e.target.value)}
                    placeholder="Buscar en Catálogo de Servicios para agregar (nombre o código)..."
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
                            selectedTiposEquipoIds.size > 0 &&
                            s.id_tipo_equipo != null &&
                            selectedTiposEquipoIds.has(s.id_tipo_equipo);
                          return (
                            <button
                              key={s.id_servicio}
                              type="button"
                              onClick={() => {
                                setServiciosRows((prev) => [
                                  ...prev,
                                  {
                                    uid: nextUid('srv'),
                                    id_servicio: s.id_servicio,
                                    descripcion: s.nombre_servicio,
                                    cantidad: Math.max(1, equiposIds.length),
                                    unidad: 'servicio',
                                    costo_unitario: Math.round(Number(s.precio_base || 0) * 0.45),
                                    precio_unitario: Number(s.precio_base || 0),
                                    descuento_porcentaje: 0,
                                    es_opcional: false,
                                    iva_aplicable: true,
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
                                  {formatCurrency(s.precio_base || 0)}
                                </span>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              )}

              {serviciosRows.length === 0 ? (
                <div className="py-3.5 px-4 flex items-center justify-center gap-2 text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                  <Wrench className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                  <span>
                    Sin servicios agregados aún. Busca en el catálogo arriba o añade una línea
                    libre.
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Cabecera de columnas (desktop) */}
                  <div className="hidden md:grid grid-cols-12 gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <div className="col-span-5">Descripción del Servicio</div>
                    <div className="col-span-1 text-center">Cant.</div>
                    {showCostosInternos && (
                      <div className="col-span-2 text-right text-amber-700/80">Costo Interno</div>
                    )}
                    <div
                      className={
                        showCostosInternos ? 'col-span-2 text-right' : 'col-span-3 text-right'
                      }
                    >
                      Precio Venta
                    </div>
                    <div className="col-span-2 text-right pr-1">Subtotal</div>
                  </div>
                  {serviciosRows.map((row, idx) => {
                    const sub =
                      Math.round(
                        row.cantidad *
                          row.precio_unitario *
                          (1 - row.descuento_porcentaje / 100) *
                          100,
                      ) / 100;
                    const precioSrvBloqueado =
                      lockCatalogUnitPrice &&
                      row.id_servicio != null &&
                      (srvPrecioCatalogoMap.get(row.id_servicio) ?? 0) > 0;
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
                              disabled={!isEditable}
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
                              disabled={!isEditable}
                              value={row.cantidad}
                              onChange={(val) =>
                                setServiciosRows((prev) =>
                                  prev.map((r, i) => (i === idx ? { ...r, cantidad: val } : r)),
                                )
                              }
                              title="Cantidad"
                            />
                          </div>
                          {showCostosInternos && (
                            <div className="col-span-4 md:col-span-2">
                              <CpqMoneyInput
                                tone="cost"
                                disabled={!isEditable}
                                value={row.costo_unitario}
                                locale={moneyLocale}
                                symbol={moneySymbol}
                                decimals={moneyDecimals}
                                onChange={(val) =>
                                  setServiciosRows((prev) =>
                                    prev.map((r, i) =>
                                      i === idx ? { ...r, costo_unitario: val } : r,
                                    ),
                                  )
                                }
                                title="Costo Interno (Privado)"
                              />
                            </div>
                          )}
                          <div
                            className={
                              showCostosInternos
                                ? 'col-span-4 md:col-span-2'
                                : 'col-span-5 md:col-span-3'
                            }
                          >
                            <CpqMoneyInput
                              disabled={!isEditable}
                              locked={precioSrvBloqueado}
                              value={row.precio_unitario}
                              locale={moneyLocale}
                              symbol={moneySymbol}
                              decimals={moneyDecimals}
                              onChange={(val) =>
                                setServiciosRows((prev) =>
                                  prev.map((r, i) =>
                                    i === idx ? { ...r, precio_unitario: val } : r,
                                  ),
                                )
                              }
                              title={
                                precioSrvBloqueado
                                  ? 'Precio de catálogo protegido por política CPQ — aplica rebajas en Desc%'
                                  : 'Precio Unitario Venta'
                              }
                            />
                          </div>
                          <div className="col-span-10 md:col-span-2 text-right font-mono text-xs font-bold text-slate-800 pr-1">
                            {formatCurrency(sub)}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-100 text-[11px] text-slate-600">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <div className="w-28">
                              <CpqCreatableCombobox
                                size="xs"
                                disabled={!isEditable}
                                value={row.unidad}
                                onChange={(val) =>
                                  setServiciosRows((prev) =>
                                    prev.map((r, i) => (i === idx ? { ...r, unidad: val } : r)),
                                  )
                                }
                                options={unidadOptions}
                                placeholder="Unidad"
                                searchPlaceholder="Buscar unidad (ej. servicio, hr, día)..."
                                customLabel="Usar unidad"
                                minDropdownWidth={230}
                              />
                            </div>
                            <div
                              className="flex items-center gap-1.5"
                              title="Descuento por línea (%)"
                            >
                              <span className="text-[11px] font-medium text-slate-400">Desc.</span>
                              <div className="w-16">
                                <CpqSmartNumberInput
                                  min={0}
                                  max={100}
                                  decimals={1}
                                  suffix="%"
                                  disabled={!isEditable}
                                  value={row.descuento_porcentaje}
                                  onChange={(val) =>
                                    setServiciosRows((prev) =>
                                      prev.map((r, i) =>
                                        i === idx ? { ...r, descuento_porcentaje: val } : r,
                                      ),
                                    )
                                  }
                                  className="h-7 text-[11px]"
                                />
                              </div>
                            </div>
                            {equiposSeleccionadosInfo.length > 1 && (
                              <select
                                disabled={!isEditable}
                                value={row.id_equipo ?? ''}
                                onChange={(e) =>
                                  setServiciosRows((prev) =>
                                    prev.map((r, i) =>
                                      i === idx
                                        ? {
                                            ...r,
                                            id_equipo: e.target.value
                                              ? Number(e.target.value)
                                              : null,
                                          }
                                        : r,
                                    ),
                                  )
                                }
                                className="border border-slate-200 rounded px-1.5 py-0.5 text-[11px] bg-white max-w-[160px]"
                              >
                                <option value="">Todos los equipos</option>
                                {equiposSeleccionadosInfo.map((eq) => (
                                  <option key={eq.id} value={eq.id}>
                                    {eq.codigo}
                                  </option>
                                ))}
                              </select>
                            )}
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="checkbox"
                                disabled={!isEditable}
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
                                disabled={!isEditable}
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
                          {isEditable && (
                            <button
                              type="button"
                              onClick={() =>
                                setServiciosRows((prev) => prev.filter((_, i) => i !== idx))
                              }
                              className="text-rose-500 hover:text-rose-700 p-1"
                              title="Eliminar línea"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* PASO 4: REPUESTOS, COMPONENTES E INSUMOS WMS */}
          <Card className="bg-white border-slate-200/90 shadow-sm rounded-xl">
            <CardHeader className="py-3.5 px-5 border-b border-slate-100 bg-slate-50/40 rounded-t-xl flex flex-row items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-sm font-bold flex items-center gap-2.5 text-slate-900">
                  <span className="h-6 w-6 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center justify-center text-xs font-extrabold shrink-0">
                    4
                  </span>
                  <Package className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Repuestos, Componentes e Insumos WMS ({componentesRows.length})</span>
                </CardTitle>
                {lockCatalogUnitPrice && isEditable && (
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-slate-50 text-slate-600 border-slate-200 gap-1"
                  >
                    <Lock className="h-2.5 w-2.5" />
                    Precios catálogo protegidos (rebajas vía Desc%)
                  </Badge>
                )}
              </div>
              {isEditable && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() =>
                    setComponentesRows((prev) => [
                      ...prev,
                      {
                        uid: nextUid('cmp'),
                        id_componente: null,
                        descripcion: '',
                        referencia_manual: '',
                        marca_manual: '',
                        cantidad: Math.max(1, equiposIds.length),
                        unidad: 'unidad',
                        costo_unitario: 0,
                        precio_unitario: 0,
                        descuento_porcentaje: 0,
                        es_opcional: false,
                        iva_aplicable: true,
                      },
                    ])
                  }
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Repuesto Manual
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {isEditable && (
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
                          const unidadNom =
                            c.unidades_medida?.simbolo || c.unidad_medida || 'unidad';
                          const tiposIds =
                            c.tipos_equipo_ids ||
                            c.tipos_equipo?.map((t) => t.id_tipo_equipo) ||
                            [];
                          const esCompatibleNm =
                            selectedTiposEquipoIds.size > 0 &&
                            c.aplica_todos_tipos === false &&
                            tiposIds.some((id) => selectedTiposEquipoIds.has(id));
                          const esUniversal = c.aplica_todos_tipos !== false;

                          return (
                            <button
                              key={c.id_componente}
                              type="button"
                              onClick={() => {
                                setComponentesRows((prev) => [
                                  ...prev,
                                  {
                                    uid: nextUid('cmp'),
                                    id_componente: c.id_componente,
                                    id_tipo_componente: c.id_tipo_componente ?? null,
                                    descripcion: c.descripcion_corta || c.referencia_fabricante,
                                    referencia_manual:
                                      c.referencia_fabricante || c.codigo_interno || '',
                                    marca_manual: marcaNom,
                                    cantidad: Math.max(1, equiposIds.length),
                                    unidad: unidadNom,
                                    costo_unitario: Number(c.precio_compra || 0),
                                    precio_unitario: Number(c.precio_venta || 0),
                                    descuento_porcentaje: 0,
                                    es_opcional: false,
                                    iva_aplicable: true,
                                    stock_actual: c.es_inventariable === false ? null : stock,
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
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="bg-slate-50 text-slate-500 border-slate-200 text-[10px]"
                                  >
                                    {c.tipos_equipo && c.tipos_equipo.length > 0
                                      ? c.tipos_equipo
                                          .slice(0, 2)
                                          .map((t) => t.codigo_tipo)
                                          .join('/')
                                      : `${tiposIds.length} tipo(s)`}
                                  </Badge>
                                )}
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
              )}

              {componentesRows.length === 0 ? (
                <div className="py-3.5 px-4 flex items-center justify-center gap-2 text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                  <Package className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                  <span>
                    Sin repuestos ni insumos agregados. Busca en el catálogo WMS o importa un Kit
                    BOM OEM.
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Cabecera de columnas (desktop) */}
                  <div className="hidden md:grid grid-cols-12 gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <div className="col-span-5">Repuesto / Suministro</div>
                    <div className="col-span-1 text-center">Cant.</div>
                    {showCostosInternos && (
                      <div className="col-span-2 text-right text-amber-700/80">Costo Compra</div>
                    )}
                    <div
                      className={
                        showCostosInternos ? 'col-span-2 text-right' : 'col-span-3 text-right'
                      }
                    >
                      Precio Venta
                    </div>
                    <div className="col-span-2 text-right pr-1">Subtotal</div>
                  </div>
                  {componentesRows.map((row, idx) => {
                    const sub =
                      Math.round(
                        row.cantidad *
                          row.precio_unitario *
                          (1 - row.descuento_porcentaje / 100) *
                          100,
                      ) / 100;
                    const faltaStock =
                      row.id_componente != null &&
                      row.stock_actual != null &&
                      row.cantidad > row.stock_actual;
                    const precioCmpBloqueado =
                      lockCatalogUnitPrice &&
                      row.id_componente != null &&
                      (compPrecioCatalogoMap.get(row.id_componente) ?? 0) > 0;
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
                              disabled={!isEditable}
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
                              disabled={!isEditable}
                              value={row.cantidad}
                              onChange={(val) =>
                                setComponentesRows((prev) =>
                                  prev.map((r, i) => (i === idx ? { ...r, cantidad: val } : r)),
                                )
                              }
                              title="Cantidad"
                            />
                          </div>
                          {showCostosInternos && (
                            <div className="col-span-4 md:col-span-2">
                              <CpqMoneyInput
                                tone="cost"
                                disabled={!isEditable}
                                value={row.costo_unitario}
                                locale={moneyLocale}
                                symbol={moneySymbol}
                                decimals={moneyDecimals}
                                onChange={(val) =>
                                  setComponentesRows((prev) =>
                                    prev.map((r, i) =>
                                      i === idx ? { ...r, costo_unitario: val } : r,
                                    ),
                                  )
                                }
                                title="Costo Compra (Privado)"
                              />
                            </div>
                          )}
                          <div
                            className={
                              showCostosInternos
                                ? 'col-span-4 md:col-span-2'
                                : 'col-span-5 md:col-span-3'
                            }
                          >
                            <CpqMoneyInput
                              disabled={!isEditable}
                              locked={precioCmpBloqueado}
                              value={row.precio_unitario}
                              locale={moneyLocale}
                              symbol={moneySymbol}
                              decimals={moneyDecimals}
                              onChange={(val) =>
                                setComponentesRows((prev) =>
                                  prev.map((r, i) =>
                                    i === idx ? { ...r, precio_unitario: val } : r,
                                  ),
                                )
                              }
                              title={
                                precioCmpBloqueado
                                  ? 'Precio de catálogo protegido por política CPQ — aplica rebajas en Desc%'
                                  : 'Precio Unitario Venta'
                              }
                            />
                          </div>
                          <div className="col-span-10 md:col-span-2 text-right font-mono text-xs font-bold text-slate-800 pr-1">
                            {formatCurrency(sub)}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-100 text-[11px] text-slate-600">
                          <div className="flex flex-wrap items-center gap-2.5">
                            {row.id_componente != null && row.referencia_manual ? (
                              <span
                                title={row.referencia_manual}
                                className="inline-flex items-center font-mono text-xs text-slate-700 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded truncate max-w-[180px]"
                              >
                                {row.referencia_manual}
                              </span>
                            ) : (
                              <input
                                disabled={!isEditable}
                                value={row.referencia_manual || ''}
                                title={row.referencia_manual || 'Referencia o número de parte'}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) =>
                                  setComponentesRows((prev) =>
                                    prev.map((r, i) =>
                                      i === idx ? { ...r, referencia_manual: e.target.value } : r,
                                    ),
                                  )
                                }
                                placeholder="Ref / P/N"
                                className="w-40 h-7 border border-slate-200 rounded-md px-2 text-xs font-mono bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                              />
                            )}
                            <div className="w-24">
                              <CpqCreatableCombobox
                                size="xs"
                                disabled={!isEditable}
                                value={row.unidad}
                                onChange={(val) =>
                                  setComponentesRows((prev) =>
                                    prev.map((r, i) => (i === idx ? { ...r, unidad: val } : r)),
                                  )
                                }
                                options={unidadOptions}
                                placeholder="Und"
                                searchPlaceholder="Buscar unidad (ej. und, gal, kit)..."
                                customLabel="Usar unidad"
                                minDropdownWidth={230}
                              />
                            </div>
                            <div
                              className="flex items-center gap-1.5"
                              title="Descuento por línea (%)"
                            >
                              <span className="text-[11px] font-medium text-slate-400">Desc.</span>
                              <div className="w-16">
                                <CpqSmartNumberInput
                                  min={0}
                                  max={100}
                                  decimals={1}
                                  suffix="%"
                                  disabled={!isEditable}
                                  value={row.descuento_porcentaje}
                                  onChange={(val) =>
                                    setComponentesRows((prev) =>
                                      prev.map((r, i) =>
                                        i === idx ? { ...r, descuento_porcentaje: val } : r,
                                      ),
                                    )
                                  }
                                  className="h-7 text-[11px]"
                                />
                              </div>
                            </div>
                            {equiposSeleccionadosInfo.length > 1 && (
                              <select
                                disabled={!isEditable}
                                value={row.id_equipo ?? ''}
                                onChange={(e) =>
                                  setComponentesRows((prev) =>
                                    prev.map((r, i) =>
                                      i === idx
                                        ? {
                                            ...r,
                                            id_equipo: e.target.value
                                              ? Number(e.target.value)
                                              : null,
                                          }
                                        : r,
                                    ),
                                  )
                                }
                                className="border border-slate-200 rounded px-1.5 py-0.5 text-[11px] bg-white max-w-[160px]"
                              >
                                <option value="">Todos los equipos</option>
                                {equiposSeleccionadosInfo.map((eq) => (
                                  <option key={eq.id} value={eq.id}>
                                    {eq.codigo}
                                  </option>
                                ))}
                              </select>
                            )}
                            {row.stock_actual != null && (
                              <span
                                className={`px-1.5 py-0.5 rounded font-semibold ${
                                  faltaStock
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-emerald-50 text-emerald-700'
                                }`}
                              >
                                {faltaStock
                                  ? `Stock ${row.stock_actual} (Déficit: ${(row.cantidad - row.stock_actual).toFixed(0)} · Requiere compra)`
                                  : `Stock WMS: ${row.stock_actual}`}
                              </span>
                            )}
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="checkbox"
                                disabled={!isEditable}
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
                                disabled={!isEditable}
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
                          {isEditable && (
                            <button
                              type="button"
                              onClick={() =>
                                setComponentesRows((prev) => prev.filter((_, i) => i !== idx))
                              }
                              className="text-rose-500 hover:text-rose-700 p-1"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* PASO 5: LOGÍSTICA, VIÁTICOS, PÓLIZAS Y OTROS RUBROS */}
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
              </div>
              {isEditable && (
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
              )}
            </CardHeader>
            <CardContent className="p-4 space-y-2.5">
              {otrosRows.length === 0 ? (
                <div className="py-3.5 px-4 flex items-center justify-center gap-2 text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                  <Truck className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                  <span>
                    Sin gastos de transporte, viáticos ni pólizas. Usa los accesos rápidos arriba
                    (facturables o absorbidos).
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Cabecera de columnas (desktop) */}
                  <div className="hidden md:grid grid-cols-12 gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <div className="col-span-2">Categoría</div>
                    <div className="col-span-4">Concepto del Rubro</div>
                    <div className="col-span-1 text-center">Cant.</div>
                    <div className="col-span-2 text-right text-amber-700/80">Costo Real</div>
                    <div className="col-span-2 text-right">Precio Cliente</div>
                    <div className="col-span-1 text-right">Subtotal</div>
                  </div>
                  {otrosRows.map((row, idx) => {
                    const sub =
                      Math.round(
                        row.cantidad *
                          row.precio_unitario *
                          (1 - row.descuento_porcentaje / 100) *
                          100,
                      ) / 100;
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
                              disabled={!isEditable}
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
                              searchPlaceholder="Buscar o crear rubro..."
                              customLabel="Crear rubro"
                              normalizeCustom={(raw) =>
                                raw
                                  .normalize('NFD')
                                  .replace(/[\u0300-\u036f]/g, '')
                                  .toUpperCase()
                                  .replace(/[^A-Z0-9]+/g, '_')
                                  .replace(/^_+|_+$/g, '')
                                  .slice(0, 40)
                              }
                              minDropdownWidth={230}
                            />
                          </div>
                          <div className="col-span-12 md:col-span-4">
                            <Input
                              disabled={!isEditable}
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
                              disabled={!isEditable}
                              value={row.cantidad}
                              onChange={(val) =>
                                setOtrosRows((prev) =>
                                  prev.map((r, i) => (i === idx ? { ...r, cantidad: val } : r)),
                                )
                              }
                            />
                          </div>
                          <div className="col-span-4 md:col-span-2">
                            <CpqMoneyInput
                              tone="cost"
                              disabled={!isEditable}
                              value={row.costo_unitario}
                              locale={moneyLocale}
                              symbol={moneySymbol}
                              decimals={moneyDecimals}
                              onChange={(val) =>
                                setOtrosRows((prev) =>
                                  prev.map((r, i) =>
                                    i === idx ? { ...r, costo_unitario: val } : r,
                                  ),
                                )
                              }
                              title="Costo Interno Real"
                            />
                          </div>
                          <div className="col-span-4 md:col-span-2">
                            <CpqMoneyInput
                              disabled={!isEditable || !row.visible_cliente}
                              value={row.visible_cliente ? row.precio_unitario : 0}
                              locale={moneyLocale}
                              symbol={moneySymbol}
                              decimals={moneyDecimals}
                              onChange={(val) =>
                                setOtrosRows((prev) =>
                                  prev.map((r, i) =>
                                    i === idx ? { ...r, precio_unitario: val } : r,
                                  ),
                                )
                              }
                              title="Precio Facturable al Cliente"
                            />
                          </div>
                          <div className="col-span-12 md:col-span-1 text-right font-mono text-xs font-bold text-slate-800">
                            {row.visible_cliente ? formatCurrency(sub) : 'Absorb.'}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-100 text-[11px] text-slate-600">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <div className="w-28">
                              <CpqCreatableCombobox
                                size="xs"
                                disabled={!isEditable}
                                value={row.unidad}
                                onChange={(val) =>
                                  setOtrosRows((prev) =>
                                    prev.map((r, i) => (i === idx ? { ...r, unidad: val } : r)),
                                  )
                                }
                                options={unidadOptions}
                                placeholder="Unidad"
                                searchPlaceholder="Buscar unidad (ej. global, día, km)..."
                                customLabel="Usar unidad"
                                minDropdownWidth={230}
                              />
                            </div>
                            {row.visible_cliente && (
                              <div
                                className="flex items-center gap-1.5"
                                title="Descuento por línea (%)"
                              >
                                <span className="text-[11px] font-medium text-slate-400">
                                  Desc.
                                </span>
                                <div className="w-16">
                                  <CpqSmartNumberInput
                                    min={0}
                                    max={100}
                                    decimals={1}
                                    suffix="%"
                                    disabled={!isEditable}
                                    value={row.descuento_porcentaje}
                                    onChange={(val) =>
                                      setOtrosRows((prev) =>
                                        prev.map((r, i) =>
                                          i === idx ? { ...r, descuento_porcentaje: val } : r,
                                        ),
                                      )
                                    }
                                    className="h-7 text-[11px]"
                                  />
                                </div>
                              </div>
                            )}
                            {equiposSeleccionadosInfo.length > 1 && (
                              <select
                                disabled={!isEditable}
                                value={row.id_equipo ?? ''}
                                onChange={(e) =>
                                  setOtrosRows((prev) =>
                                    prev.map((r, i) =>
                                      i === idx
                                        ? {
                                            ...r,
                                            id_equipo: e.target.value
                                              ? Number(e.target.value)
                                              : null,
                                          }
                                        : r,
                                    ),
                                  )
                                }
                                className="border border-slate-200 rounded px-1.5 py-0.5 text-[11px] bg-white max-w-[160px]"
                              >
                                <option value="">Todos los equipos</option>
                                {equiposSeleccionadosInfo.map((eq) => (
                                  <option key={eq.id} value={eq.id}>
                                    {eq.codigo}
                                  </option>
                                ))}
                              </select>
                            )}
                            <input
                              disabled={!isEditable}
                              value={row.detalle_calculo || ''}
                              onChange={(e) =>
                                setOtrosRows((prev) =>
                                  prev.map((r, i) =>
                                    i === idx ? { ...r, detalle_calculo: e.target.value } : r,
                                  ),
                                )
                              }
                              placeholder="Fórmula (ej. 2 técnicos × 2 días)"
                              className="w-48 border border-slate-200 rounded px-1.5 py-0.5 text-[11px] bg-white"
                            />
                            <label className="flex items-center gap-1 cursor-pointer font-medium text-slate-800">
                              <input
                                type="checkbox"
                                disabled={!isEditable}
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
                                    disabled={!isEditable}
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
                                    disabled={!isEditable}
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
                          {isEditable && (
                            <button
                              type="button"
                              onClick={() =>
                                setOtrosRows((prev) => prev.filter((_, i) => i !== idx))
                              }
                              className="text-rose-500 hover:text-rose-700 p-1"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* PASO 6: CONDICIONES COMERCIALES Y TÉRMINOS */}
          <Card className="bg-white border-slate-200/90 shadow-sm rounded-xl">
            <CardHeader className="py-3.5 px-5 border-b border-slate-100 bg-slate-50/40 rounded-t-xl">
              <CardTitle className="text-sm font-bold flex items-center gap-2.5 text-slate-900">
                <span className="h-6 w-6 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200/80 flex items-center justify-center text-xs font-extrabold shrink-0">
                  6
                </span>
                <FileCheck2 className="h-4 w-4 text-indigo-600 shrink-0" />
                <span>Condiciones Comerciales, Garantía y Términos Legales</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Forma de Pago</Label>
                  <CpqCreatableCombobox
                    disabled={!isEditable}
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
                    disabled={!isEditable}
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
                    disabled={!isEditable}
                    value={Number(mesesGarantia) || 0}
                    onChange={(v) => setMesesGarantia(String(v))}
                    className="h-9 text-xs"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">
                  Observaciones de Garantía (Opcional)
                </Label>
                <Input
                  disabled={!isEditable}
                  value={obsGarantia}
                  onChange={(e) => setObsGarantia(e.target.value)}
                  placeholder="Ej: Garantía válida por defectos de fabricación e instalación bajo uso normal..."
                  className="h-9 text-xs bg-white"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">
                  Términos y Condiciones del PDF
                </Label>
                <Textarea
                  disabled={!isEditable}
                  rows={4}
                  value={terminosCondiciones}
                  onChange={(e) => setTerminosCondiciones(e.target.value)}
                  placeholder="Si se deja vacío, el PDF aplicará los términos estándar White-Label de la organización..."
                  className="text-xs bg-white"
                />
              </div>

              {/* Bloque Colapsable: Firmas Digitales Opcionales */}
              <div className="pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setFirmasExpandido((prev) => !prev)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-slate-100/80 transition-colors text-left"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Pen className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-xs font-bold text-slate-800">
                      Firmas Digitales (Opcional)
                    </span>
                    <Badge
                      variant="outline"
                      className={
                        firmaAsesorLocal || firmaClienteLocal
                          ? 'text-[10px] bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold'
                          : 'text-[10px] bg-white border-slate-200 text-slate-500'
                      }
                    >
                      {(firmaAsesorLocal ? 1 : 0) + (firmaClienteLocal ? 1 : 0)}/2 adjuntas
                    </Badge>
                    {!firmaAsesorLocal && firmaEstandarAsesor && (
                      <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                        <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-500" />
                        Firma estándar disponible
                      </span>
                    )}
                  </div>
                  {firmasExpandido ? (
                    <ChevronUp className="h-4 w-4 text-slate-500 shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-500 shrink-0" />
                  )}
                </button>

                {firmasExpandido && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                    {/* Tarjeta 1: Firma del Asesor / Emisor */}
                    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden flex flex-col">
                      <div className="px-3.5 py-2 bg-emerald-50/70 border-b border-emerald-100 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <UserCheck className="h-4 w-4 text-emerald-700 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">
                              Firma Asesor Emisor
                            </p>
                            <p className="text-[10px] text-slate-500 truncate">
                              {asesorActivoNombre}
                            </p>
                          </div>
                        </div>
                        {firmaAsesorLocal ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-[10px]">
                            Adjunta
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-slate-500 bg-white">
                            Línea física
                          </Badge>
                        )}
                      </div>

                      <div className="p-3 flex-1 flex flex-col justify-between gap-2.5">
                        {firmaAsesorLocal ? (
                          <>
                            <div className="h-20 rounded-lg border border-slate-200 bg-slate-50/40 flex items-center justify-center p-2">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={normalizeSignatureDataUri(firmaAsesorLocal.firma_base64) || ''}
                                alt="Firma del Asesor Emisor"
                                className="max-h-16 max-w-full object-contain mix-blend-multiply"
                              />
                            </div>
                            {canManageFirmas && (
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-[11px]"
                                  disabled={
                                    firmaActions.guardarFirma.isPending ||
                                    firmaActions.eliminarFirma.isPending
                                  }
                                  onClick={() => setFirmaModalTipo('ASESOR')}
                                >
                                  <Pen className="h-3 w-3 mr-1" /> Cambiar
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-[11px] text-rose-700 hover:text-rose-800 hover:bg-rose-50"
                                  disabled={firmaActions.eliminarFirma.isPending}
                                  onClick={async () => {
                                    if (isEdit && cotizacion) {
                                      await firmaActions.eliminarFirma.mutateAsync('ASESOR');
                                    }
                                    setFirmaAsesorLocal(null);
                                  }}
                                >
                                  <Trash2 className="h-3 w-3 mr-1" /> Quitar
                                </Button>
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 p-3 text-center space-y-1.5">
                              <p className="text-[11px] text-slate-500 leading-snug">
                                Sin firma adjunta — En el PDF aparecerá línea para firma física.
                              </p>
                              {firmaEstandarAsesor && canManageFirmas && (
                                <button
                                  type="button"
                                  disabled={firmaActions.guardarFirma.isPending}
                                  onClick={async () => {
                                    if (isEdit && cotizacion) {
                                      const res = await firmaActions.guardarFirma.mutateAsync({
                                        tipo: 'ASESOR',
                                        payload: {
                                          id_firma_digital: firmaEstandarAsesor.id_firma_digital,
                                        },
                                      });
                                      setFirmaAsesorLocal({
                                        id_firma_digital:
                                          res.data.firma_asesor?.id_firma_digital ??
                                          firmaEstandarAsesor.id_firma_digital,
                                        firma_base64:
                                          res.data.firma_asesor?.firma_base64 ||
                                          firmaEstandarAsesor.firma_base64,
                                      });
                                    } else {
                                      setFirmaAsesorLocal({
                                        id_firma_digital: firmaEstandarAsesor.id_firma_digital,
                                        firma_base64: firmaEstandarAsesor.firma_base64,
                                      });
                                      toast.success(
                                        'Firma estándar del asesor precargada (se guardará al crear la cotización)',
                                      );
                                    }
                                  }}
                                  className="w-full mt-1 p-2 rounded-lg border border-amber-300 bg-amber-50/80 hover:bg-amber-100/80 transition-colors flex items-center justify-between gap-2 text-left"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className="h-8 w-14 rounded bg-white border border-amber-200 flex items-center justify-center p-0.5 shrink-0">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={
                                          normalizeSignatureDataUri(
                                            firmaEstandarAsesor.firma_base64,
                                          ) || ''
                                        }
                                        alt="Firma estándar"
                                        className="max-h-7 max-w-full object-contain mix-blend-multiply"
                                      />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
                                        <Star className="h-3 w-3 fill-amber-400 text-amber-500 shrink-0" />
                                        Usar firma estándar en 1 clic
                                      </p>
                                      <p className="text-[10px] text-amber-700 truncate">
                                        {firmaEstandarAsesor.veces_usada} uso
                                        {firmaEstandarAsesor.veces_usada !== 1 ? 's' : ''}{' '}
                                        registrado
                                        {firmaEstandarAsesor.veces_usada !== 1 ? 's' : ''}
                                      </p>
                                    </div>
                                  </div>
                                </button>
                              )}
                            </div>
                            {canManageFirmas && (
                              <div className="flex justify-end">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-[11px]"
                                  onClick={() => setFirmaModalTipo('ASESOR')}
                                >
                                  <Pen className="h-3 w-3 mr-1" /> Dibujar o Subir Firma
                                </Button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Tarjeta 2: Firma de Aceptación del Cliente (Opcional) */}
                    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden flex flex-col">
                      <div className="px-3.5 py-2 bg-indigo-50/70 border-b border-indigo-100 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <User className="h-4 w-4 text-indigo-700 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">
                              Firma Cliente — Opcional
                            </p>
                            <p className="text-[10px] text-slate-500 truncate">
                              {atencionANombre.trim()
                                ? `${atencionANombre.trim()}${atencionACargo.trim() ? ` · ${atencionACargo.trim()}` : ''}`
                                : 'Para cierres presenciales o aprobación firmada'}
                            </p>
                          </div>
                        </div>
                        {firmaClienteLocal ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-[10px]">
                            Adjunta
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-slate-500 bg-white">
                            Línea física
                          </Badge>
                        )}
                      </div>

                      <div className="p-3 flex-1 flex flex-col justify-between gap-2.5">
                        {firmaClienteLocal ? (
                          <>
                            <div className="h-20 rounded-lg border border-slate-200 bg-slate-50/40 flex items-center justify-center p-2">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={
                                  normalizeSignatureDataUri(firmaClienteLocal.firma_base64) || ''
                                }
                                alt="Firma de Aceptación del Cliente"
                                className="max-h-16 max-w-full object-contain mix-blend-multiply"
                              />
                            </div>
                            {canManageFirmas && (
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-[11px]"
                                  disabled={
                                    firmaActions.guardarFirma.isPending ||
                                    firmaActions.eliminarFirma.isPending
                                  }
                                  onClick={() => setFirmaModalTipo('CLIENTE')}
                                >
                                  <Pen className="h-3 w-3 mr-1" /> Cambiar
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-[11px] text-rose-700 hover:text-rose-800 hover:bg-rose-50"
                                  disabled={firmaActions.eliminarFirma.isPending}
                                  onClick={async () => {
                                    if (isEdit && cotizacion) {
                                      await firmaActions.eliminarFirma.mutateAsync('CLIENTE');
                                    }
                                    setFirmaClienteLocal(null);
                                  }}
                                >
                                  <Trash2 className="h-3 w-3 mr-1" /> Quitar
                                </Button>
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 p-3 text-center flex items-center justify-center min-h-[80px]">
                              <p className="text-[11px] text-slate-500 leading-snug">
                                Sin firma adjunta — En el PDF aparecerá línea para firma física.
                              </p>
                            </div>
                            {canManageFirmas && (
                              <div className="flex justify-end">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-[11px]"
                                  onClick={() => setFirmaModalTipo('CLIENTE')}
                                >
                                  <Pen className="h-3 w-3 mr-1" /> Adjuntar Firma Cliente
                                </Button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* COLUMNA DERECHA STICKY (4): RESUMEN FINANCIERO + RENTABILIDAD PRIVADA  */}
        {/* ═══════════════════════════════════════════════════════════════════════ */}
        <div className="xl:col-span-4 space-y-4 xl:sticky xl:top-20">
          {/* Resumen Económico Cliente */}
          <Card className="border-primary/30 shadow-md overflow-hidden">
            <div className="px-4 py-3 bg-primary text-white flex items-center justify-between">
              <span className="text-sm font-bold">Resumen Económico</span>
              <span className="text-xs font-mono opacity-90">
                {cotizacion?.moneda || orgConfig?.codigo_moneda || 'COP'}
              </span>
            </div>
            <CardContent className="p-4 space-y-3 text-sm">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600">Subtotal Servicios</span>
                  <span className="font-mono font-semibold">
                    {formatCurrency(resumenFinanciero.subServ)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Subtotal Repuestos WMS</span>
                  <span className="font-mono font-semibold">
                    {formatCurrency(resumenFinanciero.subComp)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Logística, Viáticos y Otros</span>
                  <span className="font-mono font-semibold">
                    {formatCurrency(resumenFinanciero.subOtros)}
                  </span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-slate-200 font-bold text-slate-800">
                  <span>Subtotal Directo</span>
                  <span className="font-mono">
                    {formatCurrency(resumenFinanciero.subtotalGeneral)}
                  </span>
                </div>
              </div>

              {/* Descuento Global */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <span className="text-xs text-slate-600">Descuento Global (%)</span>
                <div className="flex items-center gap-2">
                  <div className="w-20">
                    <CpqSmartNumberInput
                      min={0}
                      max={100}
                      decimals={1}
                      suffix="%"
                      disabled={!isEditable}
                      value={descuentoGlobal}
                      onChange={setDescuentoGlobal}
                      className="h-7"
                    />
                  </div>
                  {resumenFinanciero.descuentoValor > 0 && (
                    <span className="text-xs font-mono text-emerald-700 font-semibold">
                      -{formatCurrency(resumenFinanciero.descuentoValor)}
                    </span>
                  )}
                </div>
              </div>

              {/* Switch AIU Opcional */}
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                <label className="flex items-center justify-between text-xs font-semibold text-slate-800 cursor-pointer">
                  <span>Estructura AIU (Opcional)</span>
                  <input
                    type="checkbox"
                    disabled={!isEditable}
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
                          disabled={!isEditable}
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
                          disabled={!isEditable}
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
                          disabled={!isEditable}
                          value={aiuUtilPct}
                          onChange={setAiuUtilPct}
                          className="h-7"
                        />
                      </div>
                    </div>
                    <label className="flex items-center gap-1.5 text-[11px] text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        disabled={!isEditable}
                        checked={ivaSobreUtilidadAiu}
                        onChange={(e) => setIvaSobreUtilidadAiu(e.target.checked)}
                      />
                      Calcular {taxLabel} únicamente sobre Utilidad AIU
                    </label>
                    <div className="flex justify-between text-xs font-semibold text-slate-700 pt-1 border-t border-slate-200">
                      <span>Total AIU</span>
                      <span className="font-mono">
                        {formatCurrency(resumenFinanciero.aiuTotal)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Impuesto / IVA */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-600">
                  {taxLabel} (%) {resumenFinanciero.ivaSobreUtil ? 's/ Utilidad' : ''}
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-20">
                    <CpqSmartNumberInput
                      min={0}
                      max={100}
                      decimals={1}
                      suffix="%"
                      disabled={!isEditable}
                      value={ivaPorcentaje}
                      onChange={setIvaPorcentaje}
                      className="h-7"
                    />
                  </div>
                  <span className="text-xs font-mono font-semibold text-slate-800">
                    {formatCurrency(resumenFinanciero.ivaValor)}
                  </span>
                </div>
              </div>

              {/* TOTAL CLIENTE */}
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/25 flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-primary">
                  Total Oferta Cliente
                </span>
                <span className="text-xl font-extrabold font-mono text-primary">
                  {formatCurrency(resumenFinanciero.totalCotizacion)}
                </span>
              </div>

              {resumenFinanciero.subOpcionales > 0 && (
                <div className="flex justify-between text-xs text-slate-500 pt-1">
                  <span>Ítems Opcionales (no sumados)</span>
                  <span className="font-mono font-semibold">
                    {formatCurrency(resumenFinanciero.subOpcionales)}
                  </span>
                </div>
              )}

              {/* Preferencia de presentación PDF */}
              <div className="pt-2.5 border-t border-slate-100">
                <label className="flex items-start gap-2 cursor-pointer text-xs text-slate-700 select-none">
                  <input
                    type="checkbox"
                    disabled={!isEditable}
                    checked={mostrarDesglosePrecios}
                    onChange={(e) => setMostrarDesglosePrecios(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-primary"
                  />
                  <span>
                    <span className="font-semibold text-slate-800 block">
                      Desglosar precios unitarios en PDF
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      {mostrarDesglosePrecios
                        ? 'Modo licitación: muestra precios unitarios y subtotales por sección.'
                        : 'Modo Suma Alzada (1 pág.): tabla única de alcance sin precios unitarios.'}
                    </span>
                  </span>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* TARJETA PRIVADA DE RENTABILIDAD & GOBERNANZA (NUNCA SALE EN PDF) */}
          <Card className="border-slate-200 bg-slate-900 text-slate-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-amber-400" />
                  Rentabilidad Interna (Privado)
                </span>
                <Badge
                  className={
                    resumenFinanciero.costoTotal === 0 || !resumenFinanciero.governanceEnabled
                      ? 'bg-slate-700 text-slate-200'
                      : resumenFinanciero.margenAprob > 0 &&
                          resumenFinanciero.margenPct < resumenFinanciero.margenAprob
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : resumenFinanciero.alertaMargen
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }
                >
                  Margen: {resumenFinanciero.margenPct.toFixed(1)}%
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Costo Directo + Logística</span>
                <span className="font-mono font-semibold">
                  {formatCurrency(resumenFinanciero.costoTotal)}
                </span>
              </div>
              {resumenFinanciero.costosAbsorbidos > 0 && (
                <div className="flex justify-between text-amber-300/90 text-[11px]">
                  <span>↳ Incluye costos absorbidos ocultos</span>
                  <span className="font-mono">
                    {formatCurrency(resumenFinanciero.costosAbsorbidos)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold pt-1.5 border-t border-slate-700">
                <span>Utilidad Bruta Estimada</span>
                <span
                  className={`font-mono ${
                    resumenFinanciero.utilidadBruta >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {formatCurrency(resumenFinanciero.utilidadBruta)}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-800 text-[11px] flex items-center justify-between text-slate-400 gap-2">
                <span>Gobernanza Aprobación:</span>
                <span
                  className={`font-semibold text-right ${
                    resumenFinanciero.estadoGobernanza === 'GERENTE'
                      ? 'text-rose-300'
                      : resumenFinanciero.estadoGobernanza === 'SUPERVISOR' ||
                          resumenFinanciero.estadoGobernanza === 'ALERTA_MARGEN'
                        ? 'text-amber-300'
                        : resumenFinanciero.estadoGobernanza === 'MODO_AGIL'
                          ? 'text-slate-300'
                          : 'text-emerald-300'
                  }`}
                >
                  {resumenFinanciero.estadoGobernanza === 'MODO_AGIL'
                    ? 'Modo ágil (sin bloqueo)'
                    : resumenFinanciero.estadoGobernanza === 'GERENTE'
                      ? 'Requiere Gerente'
                      : resumenFinanciero.estadoGobernanza === 'SUPERVISOR'
                        ? 'Requiere Supervisor'
                        : resumenFinanciero.estadoGobernanza === 'ALERTA_MARGEN'
                          ? 'Alerta Visual de Margen'
                          : 'Libre · Aprobación Automática'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Historial de Versiones */}
          {isEdit && cotizacion?.versiones && cotizacion.versiones.length > 0 && (
            <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold uppercase text-slate-600 flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5 text-primary" />
                  Versiones Archivadas ({cotizacion.versiones.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {cotizacion.versiones.slice(0, 5).map((v) => (
                  <div
                    key={v.id_version}
                    className="p-2 rounded bg-slate-50 border border-slate-100 text-xs flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <span className="font-mono font-bold text-slate-800 mr-1.5">
                        v{v.numero_version}
                      </span>
                      <span className="text-slate-600 truncate">
                        {v.motivo_cambio || v.resumen_cambios || 'Snapshot'}
                      </span>
                      {v.fecha_version && (
                        <span className="block text-[10px] text-slate-400">
                          {formatDate(v.fecha_version)}
                        </span>
                      )}
                    </div>
                    <span className="font-mono font-semibold text-slate-700 shrink-0">
                      {formatCurrency(v.total_version || 0)}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* MODALES DE WORKFLOW COMERCIAL                                          */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}

      {/* Solicitar Aprobación */}
      <Dialog open={solicitarOpen} onOpenChange={setSolicitarOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>Enviar a Aprobación Interna</DialogTitle>
            <DialogDescription>
              Guardaremos tus cambios actuales y evaluaremos la cotización contra las políticas
              comerciales de la organización.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Observaciones para el aprobador</Label>
            <Textarea
              rows={3}
              value={solicitarObs}
              onChange={(e) => setSolicitarObs(e.target.value)}
              placeholder="Ej: Cotización lista con margen validado y costos logísticos incluidos..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSolicitarOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={workflow.solicitarAprobacion.isPending || isSaving}
              onClick={async () => {
                const savedId = await handleSave();
                if (!savedId) return;
                await workflow.solicitarAprobacion.mutateAsync({
                  id: savedId,
                  observaciones: solicitarObs.trim() || 'Cotización lista para revisión y envío',
                });
                setSolicitarOpen(false);
              }}
            >
              <Send className="h-4 w-4 mr-1.5" />
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enviar por Correo */}
      <Dialog open={enviarOpen} onOpenChange={setEnviarOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>Enviar Cotización al Cliente</DialogTitle>
            <DialogDescription>
              Se generará el PDF corporativo actualizado y se enviará adjunto al correo del cliente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nombre del Destinatario *</Label>
              <Input
                value={enviarNombre}
                onChange={(e) => setEnviarNombre(e.target.value)}
                placeholder="Ej: Ing. Carlos Martínez"
              />
            </div>
            <div className="space-y-1">
              <Label>Correo Principal *</Label>
              <Input
                type="email"
                value={enviarEmail}
                onChange={(e) => setEnviarEmail(e.target.value)}
                placeholder="compras@cliente.com"
              />
            </div>
            <div className="space-y-1">
              <Label>Copias CC (separadas por coma)</Label>
              <Input
                value={enviarCopia}
                onChange={(e) => setEnviarCopia(e.target.value)}
                placeholder="jefe.mantenimiento@cliente.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEnviarOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={workflow.enviar.isPending}
              onClick={async () => {
                if (!cotizacion || !enviarEmail.trim() || !enviarNombre.trim()) {
                  toast.error('Completa nombre y correo del destinatario');
                  return;
                }
                const cc = enviarCopia
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean);
                await workflow.enviar.mutateAsync({
                  id: cotizacion.id_cotizacion,
                  destinatario_email: enviarEmail.trim(),
                  destinatario_nombre: enviarNombre.trim(),
                  emails_copia: cc.length ? cc : undefined,
                });
                setEnviarOpen(false);
              }}
            >
              {workflow.enviar.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Enviar Cotización
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Aprobación Cliente (+ Orden de Compra PO) */}
      <Dialog open={aprobarOpen} onOpenChange={setAprobarOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
              Registrar Aprobación del Cliente
            </DialogTitle>
            <DialogDescription>
              Una vez aprobada por el cliente podrás convertir esta cotización en Orden de Servicio
              con un clic.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Número de Orden de Compra Cliente / PO (Opcional)</Label>
              <Input
                value={aprobarPO}
                onChange={(e) => setAprobarPO(e.target.value)}
                placeholder="Ej: OC-2026-4410"
                className="font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label>Observaciones de Aprobación</Label>
              <Textarea
                rows={3}
                value={aprobarObs}
                onChange={(e) => setAprobarObs(e.target.value)}
                placeholder="Aprobación confirmada por correo / condiciones acordadas..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAprobarOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={workflow.aprobarCliente.isPending}
              onClick={async () => {
                if (!cotizacion) return;
                await workflow.aprobarCliente.mutateAsync({
                  id: cotizacion.id_cotizacion,
                  orden_compra_cliente: aprobarPO.trim() || undefined,
                  observaciones: aprobarObs.trim() || 'Aprobada por cliente',
                });
                setAprobarOpen(false);
              }}
            >
              <Check className="h-4 w-4 mr-1.5" />
              Confirmar Aprobación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rechazo Cliente */}
      <Dialog open={rechazarOpen} onOpenChange={setRechazarOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>Registrar Rechazo del Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Motivo de Rechazo *</Label>
              <Select value={motivoRechazoId} onValueChange={setMotivoRechazoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar motivo" />
                </SelectTrigger>
                <SelectContent>
                  {motivosRechazo.map((m) => (
                    <SelectItem key={m.id_motivo_rechazo} value={String(m.id_motivo_rechazo)}>
                      {m.nombre_motivo || m.descripcion || `Motivo #${m.id_motivo_rechazo}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Detalle / Retroalimentación *</Label>
              <Textarea
                rows={3}
                value={obsRechazo}
                onChange={(e) => setObsRechazo(e.target.value)}
                placeholder="Motivo detallado del rechazo..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRechazarOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={workflow.rechazarCliente.isPending}
              onClick={async () => {
                if (!cotizacion || !motivoRechazoId || !obsRechazo.trim()) {
                  toast.error('Selecciona motivo y detalle');
                  return;
                }
                await workflow.rechazarCliente.mutateAsync({
                  id: cotizacion.id_cotizacion,
                  id_motivo_rechazo: Number(motivoRechazoId),
                  observaciones_rechazo: obsRechazo.trim(),
                });
                setRechazarOpen(false);
              }}
            >
              Confirmar Rechazo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reabrir como nueva versión */}
      <Dialog open={reabrirOpen} onOpenChange={setReabrirOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>Reabrir Cotización para Edición</DialogTitle>
            <DialogDescription>
              El estado actual se archivará automáticamente como snapshot inmutable en el historial
              de versiones antes de regresar a BORRADOR.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            <Label>Motivo del cambio / renegociación</Label>
            <Textarea
              rows={3}
              value={reabrirMotivo}
              onChange={(e) => setReabrirMotivo(e.target.value)}
              placeholder="Ej: Ajuste de descuento y adición de segundo banco de baterías..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReabrirOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={workflow.reabrirBorrador.isPending}
              onClick={async () => {
                if (!cotizacion) return;
                await workflow.reabrirBorrador.mutateAsync({
                  id: cotizacion.id_cotizacion,
                  motivo_cambio: reabrirMotivo.trim() || undefined,
                });
                setReabrirOpen(false);
                setReabrirMotivo('');
              }}
            >
              <RotateCcw className="h-4 w-4 mr-1.5" />
              Archivar Versión y Reabrir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Guardar como Plantilla */}
      <Dialog open={saveTplOpen} onOpenChange={setSaveTplOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>Guardar como Plantilla Estándar CPQ</DialogTitle>
            <DialogDescription>
              Se guardarán los servicios, repuestos, logística, alcance y configuración AIU en el
              Hub de Plantillas para reutilizarlos en futuras cotizaciones.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nombre de la Plantilla *</Label>
              <Input
                value={saveTplNombre}
                onChange={(e) => setSaveTplNombre(e.target.value)}
                placeholder="Ej: Suministro de Baterías 24V"
              />
            </div>
            <div className="space-y-1">
              <Label>Descripción (Opcional)</Label>
              <Textarea
                rows={2}
                value={saveTplDesc}
                onChange={(e) => setSaveTplDesc(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveTplOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={itemActions.guardarComoPlantilla.isPending}
              onClick={async () => {
                if (!saveTplNombre.trim()) {
                  toast.error('Ingresa un nombre para la plantilla');
                  return;
                }
                await itemActions.guardarComoPlantilla.mutateAsync({
                  nombre: saveTplNombre.trim(),
                  descripcion: saveTplDesc.trim() || undefined,
                  normalizar_por_equipo: true,
                });
                setSaveTplOpen(false);
              }}
            >
              <BookmarkPlus className="h-4 w-4 mr-1.5" />
              Guardar Plantilla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quote-to-Order: Convertir a Orden de Servicio + Diagnóstico WMS */}
      <Dialog open={q2oOpen} onOpenChange={setQ2oOpen}>
        <DialogContent className="max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightCircle className="h-5 w-5 text-primary" />
              Convertir Cotización a Orden de Servicio
            </DialogTitle>
            <DialogDescription>
              Genera una Orden de Servicio multi-equipo vinculada automáticamente a{' '}
              {cotizacion?.numero_cotizacion} y verifica disponibilidad en inventario WMS.
            </DialogDescription>
          </DialogHeader>

          {q2oResultado ? (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 space-y-1">
                <p className="text-sm font-bold text-emerald-900">
                  ¡Orden {q2oResultado.orden_servicio.numero_orden} creada exitosamente!
                </p>
                <p className="text-xs text-emerald-800">
                  Estado: <strong>{q2oResultado.orden_servicio.estado}</strong> ·{' '}
                  {q2oResultado.orden_servicio.equipos_count} equipo(s) vinculado(s) · Valor:{' '}
                  <strong className="font-mono">
                    {formatCurrency(q2oResultado.orden_servicio.total_general)}
                  </strong>
                </p>
              </div>

              {q2oResultado.diagnostico_inventario.total_repuestos_catalogo > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase text-slate-600">
                    Diagnóstico de Inventario WMS (
                    {q2oResultado.diagnostico_inventario.listos_para_remision} listos ·{' '}
                    {q2oResultado.diagnostico_inventario.con_deficit_compra} con déficit)
                  </p>
                  <div className="max-h-48 overflow-y-auto border rounded-lg divide-y text-xs">
                    {q2oResultado.diagnostico_inventario.items.map((it) => (
                      <div
                        key={it.id_componente}
                        className="p-2.5 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800 truncate">{it.descripcion}</p>
                          <p className="text-[11px] text-slate-500">
                            Req: {it.cantidad_requerida} · Stock: {it.stock_actual}
                          </p>
                        </div>
                        <Badge
                          className={
                            it.deficit > 0
                              ? 'bg-amber-100 text-amber-800 border-amber-200'
                              : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          }
                        >
                          {it.deficit > 0 ? `Comprar ${it.deficit}` : 'Listo Remisión'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setQ2oOpen(false)}>
                  Cerrar
                </Button>
                <Button asChild>
                  <Link href={`/ordenes/${q2oResultado.orden_servicio.id_orden_servicio}`}>
                    Abrir Orden {q2oResultado.orden_servicio.numero_orden}
                  </Link>
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-3">
              {equiposIds.length === 0 && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  Esta cotización no tiene equipos vinculados. Reábrela y vincula al menos un equipo
                  antes de convertirla.
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Fecha Programada</Label>
                  <Input
                    type="date"
                    value={q2oFecha}
                    onChange={(e) => setQ2oFecha(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Prioridad</Label>
                  <Select value={q2oPrioridad} onValueChange={setQ2oPrioridad}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NORMAL">Normal</SelectItem>
                      <SelectItem value="ALTA">Alta</SelectItem>
                      <SelectItem value="URGENTE">Urgente</SelectItem>
                      <SelectItem value="EMERGENCIA">Emergencia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Tipo de Servicio (Opcional)</Label>
                  <Select value={q2oTipoServId} onValueChange={setQ2oTipoServId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AUTO">Automático según cotización</SelectItem>
                      {tiposServicio.map((ts) => (
                        <SelectItem key={ts.id_tipo_servicio} value={String(ts.id_tipo_servicio)}>
                          {ts.nombre_tipo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Técnico Asignado (Opcional)</Label>
                  <Select value={q2oTecnicoId} onValueChange={setQ2oTecnicoId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">Sin asignar (PROGRAMADA)</SelectItem>
                      {tecnicos.map((t) => (
                        <SelectItem key={t.id_empleado} value={String(t.id_empleado)}>
                          {t.persona?.nombre_completo ||
                            [t.persona?.primer_nombre, t.persona?.primer_apellido]
                              .filter(Boolean)
                              .join(' ') ||
                            `Técnico #${t.id_empleado}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Notas para el Técnico / Operaciones</Label>
                <Textarea
                  rows={2}
                  value={q2oObs}
                  onChange={(e) => setQ2oObs(e.target.value)}
                  placeholder="Instrucciones de acceso, horarios, contacto en sitio..."
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setQ2oOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  disabled={workflow.convertirAOrden.isPending || equiposIds.length === 0}
                  onClick={async () => {
                    if (!cotizacion) return;
                    const res = await workflow.convertirAOrden.mutateAsync({
                      id: cotizacion.id_cotizacion,
                      payload: {
                        fecha_programada: q2oFecha,
                        prioridad: q2oPrioridad,
                        id_tipo_servicio:
                          q2oTipoServId !== 'AUTO' ? Number(q2oTipoServId) : undefined,
                        id_tecnico_asignado:
                          q2oTecnicoId !== 'NONE' ? Number(q2oTecnicoId) : undefined,
                        observaciones: q2oObs.trim() || undefined,
                      },
                    });
                    setQ2oResultado(res);
                  }}
                >
                  {workflow.convertirAOrden.isPending && (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  )}
                  Generar Orden de Servicio
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <DigitalSignatureModal
        open={firmaModalTipo !== null}
        onClose={() => setFirmaModalTipo(null)}
        roleVariant={firmaModalTipo === 'CLIENTE' ? 'cliente' : 'emisor'}
        title={
          firmaModalTipo === 'CLIENTE'
            ? 'Firma de Aceptación del Cliente (Opcional)'
            : 'Firma del Asesor / Emisor'
        }
        subtitle={
          firmaModalTipo === 'CLIENTE'
            ? 'Dibuje, suba o ajuste el firmante del cliente para el cierre comercial'
            : `Dibuje, suba una imagen o reutilice una firma estándar de ${asesorActivoNombre}`
        }
        existingSignatureDataUri={
          firmaModalTipo === 'CLIENTE'
            ? (firmaClienteLocal?.firma_base64 ?? null)
            : (firmaAsesorLocal?.firma_base64 ?? null)
        }
        showSignerFields={firmaModalTipo === 'CLIENTE'}
        signerSectionLabel="Destinatario / Firmante del Cliente"
        initialNombre={atencionANombre}
        initialCargo={atencionACargo}
        historyItems={firmaModalTipo === 'ASESOR' ? historialFirmasAsesor : []}
        historyLoading={firmaModalTipo === 'ASESOR' ? loadingHistorialFirmasAsesor : false}
        historyTitle={`Firmas estándares de ${asesorActivoNombre}`}
        historyEmptyText="Sin firmas previas registradas para este asesor."
        isSaving={firmaActions.guardarFirma.isPending || firmaActions.eliminarFirma.isPending}
        onRemove={
          (firmaModalTipo === 'ASESOR' && firmaAsesorLocal) ||
          (firmaModalTipo === 'CLIENTE' && firmaClienteLocal)
            ? async () => {
                const tipoActual = firmaModalTipo!;
                if (isEdit && cotizacion) {
                  await firmaActions.eliminarFirma.mutateAsync(tipoActual);
                }
                if (tipoActual === 'ASESOR') setFirmaAsesorLocal(null);
                else setFirmaClienteLocal(null);
                setFirmaModalTipo(null);
              }
            : undefined
        }
        onSave={async (result) => {
          const tipoActual = firmaModalTipo;
          if (!tipoActual) return;

          if (tipoActual === 'CLIENTE') {
            if (result.nombre_firmante !== undefined) setAtencionANombre(result.nombre_firmante);
            if (result.cargo_firmante !== undefined) setAtencionACargo(result.cargo_firmante);
          }

          if (isEdit && cotizacion) {
            const payload: {
              firma_base64?: string;
              id_firma_digital?: number;
              atencion_a_nombre?: string;
              atencion_a_cargo?: string;
            } = {};
            if (result.id_firma_digital) {
              payload.id_firma_digital = result.id_firma_digital;
            } else if (result.firma_base64) {
              payload.firma_base64 = result.firma_base64;
            }
            if (tipoActual === 'CLIENTE') {
              payload.atencion_a_nombre = result.nombre_firmante;
              payload.atencion_a_cargo = result.cargo_firmante;
            }

            if (
              payload.id_firma_digital ||
              payload.firma_base64 ||
              payload.atencion_a_nombre !== undefined ||
              payload.atencion_a_cargo !== undefined
            ) {
              const res = await firmaActions.guardarFirma.mutateAsync({
                tipo: tipoActual,
                payload,
              });
              if (tipoActual === 'ASESOR' && res.data.firma_asesor?.firma_base64) {
                setFirmaAsesorLocal({
                  id_firma_digital: res.data.firma_asesor.id_firma_digital,
                  firma_base64: res.data.firma_asesor.firma_base64,
                });
              } else if (tipoActual === 'CLIENTE' && res.data.firma_cliente?.firma_base64) {
                setFirmaClienteLocal({
                  id_firma_digital: res.data.firma_cliente.id_firma_digital,
                  firma_base64: res.data.firma_cliente.firma_base64,
                });
              }
            }
          } else {
            // Cotización nueva aún no guardada: mantener en estado local hasta pulsar Guardar
            if (result.firma_base64) {
              const localFirma = {
                id_firma_digital: result.id_firma_digital,
                firma_base64: result.firma_base64,
              };
              if (tipoActual === 'ASESOR') setFirmaAsesorLocal(localFirma);
              else setFirmaClienteLocal(localFirma);
              toast.success('Firma preparada (se guardará automáticamente al crear la cotización)');
            }
          }

          setFirmaModalTipo(null);
        }}
      />

      <CotizacionPdfPreviewModal
        open={pdfPreviewOpen}
        onOpenChange={setPdfPreviewOpen}
        cotizacionId={cotizacion?.id_cotizacion ?? null}
        numeroCotizacion={cotizacion?.numero_cotizacion}
        version={cotizacion?.version}
        estadoLabel={ESTADO_LABELS_COTIZACION[estadoCodigo] || estadoCodigo}
        cacheKey={[
          cotizacion?.fecha_modificacion ?? '',
          cotizacion?.version ?? 1,
          cotizacion?.total_cotizacion ?? 0,
          cotizacion?.id_estado ?? 0,
          cotizacion?.items_servicios?.length ?? 0,
          cotizacion?.items_componentes?.length ?? 0,
          cotizacion?.items_otros?.length ?? 0,
          firmaAsesorLocal?.id_firma_digital ?? (firmaAsesorLocal ? 'local' : 0),
          firmaClienteLocal?.id_firma_digital ?? (firmaClienteLocal ? 'local' : 0),
          atencionANombre,
          atencionACargo,
          orgConfig?.enable_cpq_governance ? 'gov1' : 'gov0',
          orgConfig?.fecha_modificacion ?? '',
        ].join('-')}
        mostrarDesglosePrecios={mostrarDesglosePrecios}
        onDesgloseChange={setMostrarDesglosePrecios}
      />
    </div>
  );
}
