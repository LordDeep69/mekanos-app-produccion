'use client';

import {
  EamSelect,
  useArquetiposEam,
  useBancoMagnitudesEam,
  useUnidadesEam,
} from '@/features/catalogos-eam';
import {
  ModoRespuestaSelector,
  getModoRespuestaBadgeLabel,
  type ConfigInputDeclarativo,
} from './ModoRespuestaSelector';
import {
  TIPOS_ACTIVIDAD,
  createCatalogoActividad,
  createCatalogoSistema,
  createParametroMedicion,
  deleteCatalogoActividad,
  getTipoServicioDetalleCompleto,
  reordenarActividadesLote,
  updateCatalogoActividad,
  updateParametroMedicion,
  updateTipoServicio,
  useCatalogoActividades,
  useParametrosMedicion,
  useTiposServicio,
  vincularActividadesLote,
  type ActividadDetalle,
  type CatalogoActividad,
  type TipoActividad,
  type TipoServicioDetalleCompleto,
} from '@/features/catalogos';
import { cn } from '@/lib/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BookOpen,
  Check,
  ClipboardList,
  Edit3,
  Eye,
  FileText,
  Gauge,
  Globe,
  Layers,
  Loader2,
  Plus,
  Power,
  Search,
  Sparkles,
  Trash2,
  Wrench,
  X,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

interface FastProtocolBuilderProps {
  tipoServicioId: number;
  onBack: () => void;
  onSelectServicio: (id: number) => void;
}

const TIPOS_CUALITATIVOS = TIPOS_ACTIVIDAD.filter((t) => t.value !== 'MEDICION');

const UNIDADES_FRECUENTES = [
  { value: 'mm', label: 'mm — Milímetros (Longitud / Nivelación)', badge: 'LONGITUD' },
  { value: 'm/s', label: 'm/s — Metros por segundo (Velocidad Lineal)', badge: 'VELOCIDAD' },
  { value: 's', label: 's — Segundos (Tiempo de Apertura / Respuesta)', badge: 'TIEMPO' },
  { value: 'V', label: 'V — Voltios AC/DC (Tensión Eléctrica)', badge: 'ELÉCTRICO' },
  { value: 'A', label: 'A — Amperios (Corriente Eléctrica)', badge: 'ELÉCTRICO' },
  { value: '°C', label: '°C — Grados Celsius (Temperatura)', badge: 'TÉRMICO' },
  { value: 'PSI', label: 'PSI — Libras por pulgada cuadrada (Presión)', badge: 'PRESIÓN' },
  { value: 'bar', label: 'bar — Bares (Presión)', badge: 'PRESIÓN' },
  { value: 'RPM', label: 'RPM — Revoluciones por minuto', badge: 'MECÁNICO' },
  { value: 'Hz', label: 'Hz — Hercios (Frecuencia)', badge: 'FRECUENCIA' },
  { value: 'mm/s', label: 'mm/s — Severidad de Vibración RMS', badge: 'VIBRACIÓN' },
  { value: 'dB', label: 'dB — Decibelios (Nivel de Ruido)', badge: 'ACÚSTICO' },
  { value: 'kg', label: 'kg — Kilogramos (Masa / Carga)', badge: 'MASA' },
  { value: '%', label: '% — Porcentaje', badge: ' ESCALA' },
];

function inferirCategoriaParametro(
  unidad: string,
  nombre: string,
): 'ELECTRICO' | 'MECANICO' | 'HIDRAULICO' | 'OPERACIONAL' | 'AMBIENTAL' {
  const u = (unidad || '').toUpperCase();
  const n = (nombre || '').toUpperCase();
  if (
    ['V', 'VAC', 'VDC', 'A', 'AMP', 'KW', 'KVA', 'HZ', 'OHM', 'MOHM'].includes(u) ||
    n.includes('VOLT') ||
    n.includes('CORRIENTE') ||
    n.includes('AMPER') ||
    n.includes('AISLAMIENTO')
  ) {
    return 'ELECTRICO';
  }
  if (
    ['PSI', 'BAR', 'KPA', 'MPA', 'GPM', 'L/MIN', 'M3/H'].includes(u) ||
    n.includes('PRESION') ||
    n.includes('CAUDAL') ||
    n.includes('FLUJO')
  ) {
    return 'HIDRAULICO';
  }
  if (
    ['°C', 'C', '°F', 'K', 'DB', 'DBA', '%RH', 'LUX'].includes(u) ||
    n.includes('TEMPERATURA') ||
    n.includes('RUIDO') ||
    n.includes('HUMEDAD')
  ) {
    return 'AMBIENTAL';
  }
  if (
    ['MM', 'CM', 'M', 'M/S', 'RPM', 'MM/S', 'KG', 'N', 'NM'].includes(u) ||
    n.includes('NIVELACION') ||
    n.includes('VIBRACION') ||
    n.includes('VELOCIDAD') ||
    n.includes('DESNIVEL')
  ) {
    return 'MECANICO';
  }
  return 'OPERACIONAL';
}

export function FastProtocolBuilder({
  tipoServicioId,
  onBack,
  onSelectServicio,
}: FastProtocolBuilderProps) {
  const queryClient = useQueryClient();

  // 1. Consulta del Detalle Completo del Protocolo
  const {
    data: detalleResp,
    isLoading,
    refetch: refetchDetalle,
  } = useQuery({
    queryKey: ['catalogos', 'tipos-servicio', 'detalle-completo', tipoServicioId],
    queryFn: () => getTipoServicioDetalleCompleto(tipoServicioId),
    enabled: !!tipoServicioId,
  });

  const detalle: TipoServicioDetalleCompleto | undefined = detalleResp?.data;

  // 2. Catálogos de soporte (Servicios para switcher, Unidades UoM, Parámetros existentes, Banco Universal)
  const { data: serviciosResp } = useTiposServicio({ activo: 'all', limit: 100 });
  const { data: arquetipos = [] } = useArquetiposEam();
  const { data: unidadesDb = [] } = useUnidadesEam();
  const { data: bancoMagnitudes = [] } = useBancoMagnitudesEam();
  const { data: parametrosResp, refetch: refetchParametros } = useParametrosMedicion({
    activo: true,
    limit: 500,
  });
  const { data: allActividadesResp, refetch: refetchActividades } = useCatalogoActividades({
    activo: true,
    limit: 500,
  });

  // Estados para Quick-Add por Subsistema (Zona A)
  const [quickTaskText, setQuickTaskText] = useState<Record<string, string>>({});
  const [quickTaskType, setQuickTaskType] = useState<Record<string, string>>({});
  const [quickCustomNature, setQuickCustomNature] = useState<Record<string, string>>({});
  const [quickControlType, setQuickControlType] = useState<Record<string, string>>({});
  const [quickControlConfig, setQuickControlConfig] = useState<
    Record<string, ConfigInputDeclarativo | null>
  >({});
  const [quickRolSemantico, setQuickRolSemantico] = useState<Record<string, string>>({});
  const [savingSubsystemKey, setSavingSubsystemKey] = useState<string | null>(null);
  const quickInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Estado edición inline de una tarea (Zona A o Zona B)
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const [editTipo, setEditTipo] = useState<string>('INSPECCION');
  const [editCustomNature, setEditCustomNature] = useState('');
  const [editControlType, setEditControlType] = useState<string>('ESCALA_ESTADO');
  const [editControlConfig, setEditControlConfig] = useState<ConfigInputDeclarativo | null>(null);
  const [editRolSemantico, setEditRolSemantico] = useState<string>('');
  const [editSistemaId, setEditSistemaId] = useState<string>('');
  const [editMin, setEditMin] = useState<string>('');
  const [editMax, setEditMax] = useState<string>('');
  const [editUnidad, setEditUnidad] = useState<string>('');
  const [savingEditId, setSavingEditId] = useState<number | null>(null);

  // Estados para Quick-Add de Medición Cuantitativa (Zona B)
  const [medNombre, setMedNombre] = useState('');
  const [medSistemaId, setMedSistemaId] = useState<string>('');
  const [medUnidad, setMedUnidad] = useState<string>('mm');
  const [medMin, setMedMin] = useState<string>('');
  const [medMax, setMedMax] = useState<string>('');
  const [savingMedicion, setSavingMedicion] = useState(false);
  const medNombreInputRef = useRef<HTMLInputElement | null>(null);

  // Modal: + Nueva Sección / Subsistema
  const [isNewSistemaOpen, setIsNewSistemaOpen] = useState(false);
  const [newSistemaNombre, setNewSistemaNombre] = useState('');
  const [newSistemaDesc, setNewSistemaDesc] = useState('');
  const [savingNewSistema, setSavingNewSistema] = useState(false);

  // Modal: Importar en Lote del Banco Universal
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importSearch, setImportSearch] = useState('');
  const [importTipoFilter, setImportTipoFilter] = useState<string>('');
  const [importEquipoFilter, setImportEquipoFilter] = useState<string>('CURRENT');
  const [importTargetSistemaId, setImportTargetSistemaId] = useState<string>('');
  const [selectedImportIds, setSelectedImportIds] = useState<number[]>([]);
  const [savingImport, setSavingImport] = useState(false);

  // Modal: Vista Previa Protocolo PDF
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
  const [togglingServiceStatus, setTogglingServiceStatus] = useState(false);

  // Opciones unificadas de Unidades de Medida (60 Magnitudes / 263 Unidades + Frecuentes)
  const opcionesUnidadesUom = useMemo(() => {
    const map = new Map<string, { value: string; label: string; badge?: string }>();
    for (const f of UNIDADES_FRECUENTES) {
      map.set(f.value.toUpperCase(), f);
    }
    for (const u of unidadesDb) {
      const sym = (u.simbolo || u.codigo || '').trim();
      if (!sym) continue;
      const key = sym.toUpperCase();
      if (!map.has(key)) {
        map.set(key, {
          value: sym,
          label: `${sym} — ${u.nombre}`,
          badge: u.magnitud?.nombre_magnitud || u.tipo_magnitud || 'UOM',
        });
      }
    }
    for (const mag of bancoMagnitudes) {
      for (const u of mag.unidades || []) {
        const sym = (u.simbolo || u.codigo || '').trim();
        if (!sym) continue;
        const key = sym.toUpperCase();
        if (!map.has(key)) {
          map.set(key, {
            value: sym,
            label: `${sym} — ${u.nombre ?? sym}`,
            badge: mag.nombre_magnitud,
          });
        }
      }
    }
    return Array.from(map.values());
  }, [unidadesDb, bancoMagnitudes]);

  // Construir las Secciones de Subsistemas (Zona A) combinando `sistemas_disponibles` + `sistemas_con_actividades` + `General`
  const seccionesSubsistema = useMemo(() => {
    if (!detalle) return [];

    const map = new Map<
      string,
      {
        key: string;
        id_sistema: number | null;
        nombre_sistema: string;
        codigo_sistema: string;
        orden: number;
        esParteEam: boolean;
        tareasCualitativas: ActividadDetalle[];
      }
    >();

    // 1. Primero insertar todos los sistemas disponibles del equipo (Partes EAM + Sistemas)
    for (const s of detalle.sistemas_disponibles || []) {
      const key = `SYS_${s.id_sistema}`;
      map.set(key, {
        key,
        id_sistema: s.id_sistema,
        nombre_sistema: s.nombre_sistema,
        codigo_sistema: s.codigo_sistema,
        orden: s.orden_visualizacion ?? 10,
        esParteEam: Boolean(s.id_modulo),
        tareasCualitativas: [],
      });
    }

    // 2. Poblar con las actividades existentes (solo las cualitativas van a Zona A; las MEDICION van a Zona B)
    for (const grp of detalle.sistemas_con_actividades || []) {
      const key = grp.id_sistema ? `SYS_${grp.id_sistema}` : 'GENERAL';
      if (!map.has(key)) {
        map.set(key, {
          key,
          id_sistema: grp.id_sistema ?? null,
          nombre_sistema: grp.nombre_sistema || 'General',
          codigo_sistema: grp.codigo_sistema || 'GENERAL',
          orden: grp.id_sistema ? 50 : 999,
          esParteEam: false,
          tareasCualitativas: [],
        });
      }
      const target = map.get(key)!;
      const cualitativas = (grp.actividades || []).filter((a) => a.tipo_actividad !== 'MEDICION');
      target.tareasCualitativas.push(...cualitativas);
    }

    // 3. Garantizar siempre una sección General al final para tareas transversales
    if (!map.has('GENERAL')) {
      map.set('GENERAL', {
        key: 'GENERAL',
        id_sistema: null,
        nombre_sistema: 'General / Transversal del Equipo',
        codigo_sistema: 'GENERAL',
        orden: 999,
        esParteEam: false,
        tareasCualitativas: [],
      });
    }

    const list = Array.from(map.values());
    list.sort((a, b) => a.orden - b.orden);
    return list;
  }, [detalle]);

  // Preseleccionar el primer subsistema del equipo para Zona B (Mediciones)
  useEffect(() => {
    if (!medSistemaId && seccionesSubsistema.length > 0) {
      const firstReal = seccionesSubsistema.find((s) => s.id_sistema != null);
      if (firstReal?.id_sistema) {
        setMedSistemaId(String(firstReal.id_sistema));
      }
    }
  }, [seccionesSubsistema, medSistemaId]);

  // Extraer todas las actividades de MEDICION (Zona B)
  const medicionesZonaB = useMemo(() => {
    if (!detalle) return [];
    const list: Array<ActividadDetalle & { nombre_sistema: string }> = [];
    for (const grp of detalle.sistemas_con_actividades || []) {
      for (const act of grp.actividades || []) {
        if (act.tipo_actividad === 'MEDICION') {
          list.push({
            ...act,
            nombre_sistema: grp.nombre_sistema || 'General',
          });
        }
      }
    }
    return list.sort((a, b) => (a.orden_ejecucion ?? 0) - (b.orden_ejecucion ?? 0));
  }, [detalle]);

  const medicionesCountPorSistema = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of medicionesZonaB) {
      const key = m.id_sistema ? `SYS_${m.id_sistema}` : 'GENERAL';
      map.set(key, (map.get(key) || 0) + 1);
    }
    return map;
  }, [medicionesZonaB]);

  const totalInspecciones = useMemo(
    () => seccionesSubsistema.reduce((acc, s) => acc + s.tareasCualitativas.length, 0),
    [seccionesSubsistema],
  );

  const refreshAll = async () => {
    await Promise.all([
      refetchDetalle(),
      refetchActividades(),
      refetchParametros(),
      queryClient.invalidateQueries({ queryKey: ['catalogos', 'tipos-servicio'] }),
      queryClient.invalidateQueries({ queryKey: ['catalogos', 'actividades'] }),
    ]);
  };

  // Toggle Activo/Inactivo del Servicio desde el Header
  const handleToggleServicioActivo = async () => {
    if (!detalle) return;
    const nextActivo = detalle.activo === false;
    setTogglingServiceStatus(true);
    try {
      await updateTipoServicio(detalle.id_tipo_servicio, { activo: nextActivo });
      toast.success(
        nextActivo
          ? `Servicio "${detalle.nombre_tipo}" activado para Órdenes de Servicio`
          : `Servicio "${detalle.nombre_tipo}" marcado como inactivo`,
      );
      await refreshAll();
    } catch {
      toast.error('No se pudo cambiar el estado del servicio');
    } finally {
      setTogglingServiceStatus(false);
    }
  };

  // Acción: Quick-Add de Tarea Cualitativa en un Subsistema (Zona A) con Enter
  const handleQuickAddTask = async (sectionKey: string, idSistema: number | null) => {
    const rawDesc = (quickTaskText[sectionKey] || '').trim();
    if (!rawDesc || !detalle) return;

    const rawTipo = quickTaskType[sectionKey] || 'INSPECCION';
    const isCustomNature = rawTipo === 'OTRA_PERSONALIZADA';
    const customNatureText = (quickCustomNature[sectionKey] || '').trim();
    if (isCustomNature && !customNatureText) {
      toast.error('Escribe el nombre de la naturaleza técnica personalizada');
      return;
    }

    const tipoAct: TipoActividad = isCustomNature ? 'INSPECCION' : (rawTipo as TipoActividad);
    const tipoControlInput = quickControlType[sectionKey] || 'ESCALA_ESTADO';
    const configInputJson =
      tipoControlInput === 'PERSONALIZADO' ? (quickControlConfig[sectionKey] ?? null) : null;
    const rolSemantico = (quickRolSemantico[sectionKey] || '').trim() || null;

    setSavingSubsystemKey(sectionKey);

    try {
      await createCatalogoActividad({
        descripcionActividad: rawDesc,
        idTipoServicio: detalle.id_tipo_servicio,
        idSistema: idSistema ?? undefined,
        idTipoEquipo: detalle.id_tipo_equipo ?? detalle.tipo_equipo?.id ?? undefined,
        tipoActividad: tipoAct,
        naturalezaPersonalizada: isCustomNature ? customNatureText : null,
        tipoControlInput,
        configInputJson,
        rolSemantico,
        esObligatoria: true,
        activo: true,
      });

      setQuickTaskText((prev) => ({ ...prev, [sectionKey]: '' }));
      setQuickRolSemantico((prev) => ({ ...prev, [sectionKey]: '' }));
      await refreshAll();
      toast.success('Tarea agregada al protocolo');

      // Mantener el foco en el input de ese subsistema para captura ultra-rápida con Enter
      setTimeout(() => {
        quickInputRefs.current[sectionKey]?.focus();
      }, 30);
    } catch (err: unknown) {
      const apiErr = err as {
        response?: { data?: { message?: string | string[] } };
        message?: string;
      };
      const msg = apiErr?.response?.data?.message;
      toast.error(
        Array.isArray(msg) ? msg.join(', ') : msg || apiErr?.message || 'Error al agregar tarea',
      );
    } finally {
      setSavingSubsystemKey(null);
    }
  };

  // Acción: Quick-Add de Medición Numérica con Unidad UoM y Rango [Mín — Máx] (Zona B)
  const handleQuickAddMedicion = async () => {
    const rawNombre = medNombre.trim();
    if (!rawNombre || !detalle) {
      toast.error('Escribe el nombre del parámetro o medición');
      return;
    }
    if (!medUnidad.trim()) {
      toast.error('Selecciona una Unidad de Medida (UoM)');
      return;
    }

    const minVal = medMin.trim() !== '' ? Number(medMin) : undefined;
    const maxVal = medMax.trim() !== '' ? Number(medMax) : undefined;
    if (minVal !== undefined && maxVal !== undefined && minVal > maxVal) {
      toast.error(`El valor mínimo (${minVal}) no puede ser mayor que el máximo (${maxVal})`);
      return;
    }

    setSavingMedicion(true);
    try {
      const idTipoEquipo = detalle.id_tipo_equipo ?? detalle.tipo_equipo?.id ?? undefined;
      const existentes = parametrosResp?.data || [];
      const paramMatch = existentes.find(
        (p) =>
          p.nombre_parametro.trim().toLowerCase() === rawNombre.toLowerCase() &&
          p.unidad_medida.trim().toLowerCase() === medUnidad.trim().toLowerCase(),
      );

      let idParametroMedicion = paramMatch?.id_parametro_medicion;

      if (!idParametroMedicion) {
        const slug = rawNombre
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toUpperCase()
          .replace(/[^A-Z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '')
          .slice(0, 26);
        const stamp = Date.now().toString(36).toUpperCase().slice(-4);
        const codigoParametro = `PAR_${slug}_${stamp}`.slice(0, 50);

        const createdParam = (await createParametroMedicion({
          codigoParametro,
          nombreParametro: rawNombre,
          unidadMedida: medUnidad.trim().slice(0, 20),
          categoria: inferirCategoriaParametro(medUnidad, rawNombre),
          tipoDato: 'NUMERICO',
          valorMinimoNormal: minVal,
          valorMaximoNormal: maxVal,
          tipoEquipoId: idTipoEquipo ?? undefined,
          esObligatorio: true,
          decimalesPrecision: 2,
          activo: true,
        })) as { id_parametro_medicion?: number; data?: { id_parametro_medicion?: number } };

        idParametroMedicion =
          createdParam?.id_parametro_medicion ?? createdParam?.data?.id_parametro_medicion;
      } else if (
        minVal !== undefined &&
        maxVal !== undefined &&
        (Number(paramMatch?.valor_minimo_normal) !== minVal ||
          Number(paramMatch?.valor_maximo_normal) !== maxVal)
      ) {
        await updateParametroMedicion(idParametroMedicion, {
          valorMinimoNormal: minVal,
          valorMaximoNormal: maxVal,
        });
      }

      await createCatalogoActividad({
        descripcionActividad: rawNombre,
        idTipoServicio: detalle.id_tipo_servicio,
        idSistema: medSistemaId ? Number(medSistemaId) : undefined,
        idTipoEquipo: idTipoEquipo ?? undefined,
        tipoActividad: 'MEDICION',
        idParametroMedicion,
        esObligatoria: true,
        activo: true,
      });

      setMedNombre('');
      setMedMin('');
      setMedMax('');
      await refreshAll();
      const rangoMsg =
        minVal !== undefined || maxVal !== undefined
          ? ` con rango [${medMin || '—'} — ${medMax || '—'}]`
          : '';
      toast.success(`Medición "${rawNombre} (${medUnidad})" vinculada${rangoMsg}`);

      setTimeout(() => {
        medNombreInputRef.current?.focus();
      }, 30);
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string | string[] } } };
      const msg = apiErr?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg || 'Error al crear la medición');
    } finally {
      setSavingMedicion(false);
    }
  };

  // Acción: Reordenar ↑ / ↓ dentro de una lista de actividades
  const handleMoveTask = async (
    list: ActividadDetalle[],
    index: number,
    direction: 'up' | 'down',
  ) => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;

    const cloned = [...list];
    const temp = cloned[index];
    cloned[index] = cloned[targetIdx];
    cloned[targetIdx] = temp;

    const payloadItems = cloned.map((item, idx) => ({
      idActividadCatalogo: item.id_actividad_catalogo,
      ordenEjecucion: idx + 1,
    }));

    try {
      await reordenarActividadesLote({ items: payloadItems });
      await refreshAll();
    } catch {
      toast.error('No se pudo reordenar la actividad');
    }
  };

  // Acción: Iniciar edición inline de una actividad o medición
  const startEditTask = (act: ActividadDetalle) => {
    setEditingTaskId(act.id_actividad_catalogo);
    setEditDesc(act.descripcion_actividad);
    const hasCustomNat = Boolean(
      act.naturaleza_personalizada && act.naturaleza_personalizada.trim(),
    );
    setEditTipo(
      hasCustomNat ? 'OTRA_PERSONALIZADA' : (act.tipo_actividad as TipoActividad) || 'INSPECCION',
    );
    setEditCustomNature(act.naturaleza_personalizada || '');
    setEditControlType(act.tipo_control_input || 'ESCALA_ESTADO');
    setEditControlConfig(act.config_input_json ?? null);
    setEditRolSemantico(act.rol_semantico || '');
    setEditSistemaId(act.id_sistema ? String(act.id_sistema) : '');
    setEditUnidad(act.parametro_medicion?.unidad || 'mm');
    setEditMin(
      act.parametro_medicion?.rango_min != null ? String(act.parametro_medicion.rango_min) : '',
    );
    setEditMax(
      act.parametro_medicion?.rango_max != null ? String(act.parametro_medicion.rango_max) : '',
    );
  };

  const handleSaveEditTask = async (act: ActividadDetalle) => {
    if (!editDesc.trim()) return;
    const isCustomNat = editTipo === 'OTRA_PERSONALIZADA';
    if (isCustomNat && !editCustomNature.trim()) {
      toast.error('Ingresa el nombre de la naturaleza técnica personalizada');
      return;
    }

    setSavingEditId(act.id_actividad_catalogo);
    try {
      if (act.tipo_actividad === 'MEDICION' && act.parametro_medicion?.id) {
        const minN = editMin.trim() !== '' ? Number(editMin) : undefined;
        const maxN = editMax.trim() !== '' ? Number(editMax) : undefined;
        await updateParametroMedicion(act.parametro_medicion.id, {
          nombreParametro: editDesc.trim(),
          unidadMedida: editUnidad.trim() || act.parametro_medicion.unidad,
          valorMinimoNormal: minN,
          valorMaximoNormal: maxN,
        });
      }

      await updateCatalogoActividad(act.id_actividad_catalogo, {
        descripcionActividad: editDesc.trim(),
        tipoActividad: isCustomNat ? 'INSPECCION' : (editTipo as TipoActividad),
        naturalezaPersonalizada: isCustomNat ? editCustomNature.trim() : null,
        tipoControlInput: editControlType || 'ESCALA_ESTADO',
        configInputJson: editControlType === 'PERSONALIZADO' ? editControlConfig : null,
        rolSemantico: editRolSemantico.trim() || null,
        idSistema: editSistemaId ? Number(editSistemaId) : null,
      });

      setEditingTaskId(null);
      await refreshAll();
      toast.success('Tarea actualizada');
    } catch {
      toast.error('Error al guardar cambios de la tarea');
    } finally {
      setSavingEditId(null);
    }
  };

  const handleDeleteTask = async (act: ActividadDetalle) => {
    try {
      await deleteCatalogoActividad(act.id_actividad_catalogo);
      await refreshAll();
      toast.success('Tarea retirada del protocolo');
    } catch {
      toast.error('No se pudo retirar la tarea');
    }
  };

  // Acción: Crear Nueva Sección / Subsistema inline (Salvaguarda 2)
  const handleCreateNewSistema = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSistemaNombre.trim() || !detalle) return;
    setSavingNewSistema(true);
    try {
      const eqCode =
        detalle.tipo_equipo?.codigo ||
        (Array.isArray(detalle.aplica_a) && detalle.aplica_a[0]) ||
        'OTRO';
      const slug = newSistemaNombre
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 30);
      const codigoSistema = `SIS_${eqCode}_${slug}`.slice(0, 50);

      await createCatalogoSistema({
        codigoSistema,
        nombreSistema: newSistemaNombre.trim(),
        descripcion: newSistemaDesc.trim() || `Subsistema de inspección (${detalle.nombre_tipo})`,
        aplicaA: detalle.aplica_a && detalle.aplica_a.length > 0 ? detalle.aplica_a : [eqCode],
        ordenVisualizacion: (detalle.sistemas_disponibles?.length || 0) + 1,
        icono: 'layers',
        colorHex: '#2563EB',
        activo: true,
      });

      setNewSistemaNombre('');
      setNewSistemaDesc('');
      setIsNewSistemaOpen(false);
      await refreshAll();
      toast.success(`Subsistema "${newSistemaNombre.trim()}" creado y vinculado al equipo`);
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string | string[] } } };
      const msg = apiErr?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg || 'Error al crear subsistema');
    } finally {
      setSavingNewSistema(false);
    }
  };

  // Candidatos deduplicados del Banco Universal para el modal de Importación en Lote
  const candidatosBanco = useMemo(() => {
    const rawList = allActividadesResp?.data || [];
    const existingDescSet = new Set<string>();
    for (const grp of detalle?.sistemas_con_actividades || []) {
      for (const a of grp.actividades || []) {
        existingDescSet.add(a.descripcion_actividad.trim().toLowerCase());
      }
    }

    const dedupMap = new Map<string, CatalogoActividad>();
    for (const item of rawList) {
      const desc = (item.descripcionActividad || item.descripcion_actividad || '').trim();
      if (!desc) continue;
      const key = `${item.tipoActividad || item.tipo_actividad || 'INSPECCION'}_${desc.toLowerCase()}`;
      // Preferir plantilla maestra (idTipoServicio == null) si existe
      if (!dedupMap.has(key) || (item.idTipoServicio == null && item.id_tipo_servicio == null)) {
        dedupMap.set(key, item);
      }
    }

    const targetEqId = detalle?.id_tipo_equipo ?? detalle?.tipo_equipo?.id ?? null;

    const filtrados = Array.from(dedupMap.values())
      .filter((item) => {
        const desc = (item.descripcionActividad || item.descripcion_actividad || '').trim();
        const tipo = item.tipoActividad || item.tipo_actividad || 'INSPECCION';
        if (importTipoFilter && tipo !== importTipoFilter) return false;

        const itemEqId =
          item.idTipoEquipo ??
          item.id_tipo_equipo ??
          item.tipoServicio?.idTipoEquipo ??
          item.tipoEquipo?.idTipoEquipo ??
          null;

        if (importEquipoFilter === 'CURRENT' && targetEqId) {
          // Protocolo actual + Universal (itemEqId == null)
          if (itemEqId !== null && itemEqId !== targetEqId) return false;
        } else if (importEquipoFilter === 'UNIVERSAL') {
          if (itemEqId !== null) return false;
        } else if (
          importEquipoFilter &&
          importEquipoFilter !== 'ALL' &&
          importEquipoFilter !== 'CURRENT'
        ) {
          const eqFilterNum = Number(importEquipoFilter);
          if (!Number.isNaN(eqFilterNum) && itemEqId !== eqFilterNum) return false;
        }

        if (importSearch.trim()) {
          const q = importSearch.trim().toLowerCase();
          const sisName = (
            item.sistema?.nombreSistema ||
            item.catalogo_sistemas?.nombre_sistema ||
            ''
          ).toLowerCase();
          const code = (item.codigoActividad || item.codigo_actividad || '').toLowerCase();
          if (!desc.toLowerCase().includes(q) && !sisName.includes(q) && !code.includes(q)) {
            return false;
          }
        }

        return true;
      })
      .map((item) => {
        const desc = (item.descripcionActividad || item.descripcion_actividad || '').trim();
        return {
          item,
          yaEnProtocolo: existingDescSet.has(desc.toLowerCase()),
        };
      });

    // Ordenar disponibles primero y las ya agregadas después
    filtrados.sort((a, b) => Number(a.yaEnProtocolo) - Number(b.yaEnProtocolo));
    return filtrados;
  }, [allActividadesResp, detalle, importTipoFilter, importEquipoFilter, importSearch]);

  const handleImportarLote = async () => {
    if (!detalle || selectedImportIds.length === 0) return;
    setSavingImport(true);
    try {
      const res = await vincularActividadesLote({
        actividadIds: selectedImportIds,
        tipoServicioIds: [detalle.id_tipo_servicio],
        overrideSistemaId: importTargetSistemaId ? Number(importTargetSistemaId) : null,
      });
      toast.success(
        `Se importaron ${res.createdCount} tarea(s) al protocolo "${detalle.nombre_tipo}"`,
      );
      setSelectedImportIds([]);
      setIsImportModalOpen(false);
      await refreshAll();
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string | string[] } } };
      const msg = apiErr?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg || 'Error al importar lote');
    } finally {
      setSavingImport(false);
    }
  };

  if (isLoading || !detalle) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-16 flex flex-col items-center justify-center gap-3 shadow-xs">
        <Loader2 className="h-9 w-9 animate-spin text-blue-600" />
        <p className="text-sm font-semibold text-slate-600">
          Cargando Mesa de Ingeniería del Protocolo...
        </p>
      </div>
    );
  }

  const allServicesOptions = (serviciosResp?.data || []).map((s) => ({
    value: String(s.id_tipo_servicio),
    label: `${s.nombre_tipo} (${s.codigo_tipo})`,
    badge: s.categoria,
  }));

  const sistemasSelectOptions = [
    { value: '', label: '🌐 General / Transversal' },
    ...seccionesSubsistema
      .filter((s) => s.id_sistema != null)
      .map((s) => ({
        value: String(s.id_sistema),
        label: `📦 ${s.nombre_sistema}`,
        badge: s.codigo_sistema,
      })),
  ];

  return (
    <div className="space-y-6 pb-16">
      {/* ═══════════════════════════════════════════════════════════════════════
          BARRA SUPERIOR DE CONTROL DEL FAST-PROTOCOL BUILDER
      ═══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-6 text-white shadow-lg border border-slate-700/70">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all border border-white/15 cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Volver a Tipos de Servicio</span>
              </button>

              <span className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                {detalle.codigo_tipo}
              </span>

              <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase bg-blue-500/20 text-blue-200 border border-blue-400/30">
                {detalle.categoria}
              </span>

              {detalle.tipo_equipo ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                  <Layers className="h-3.5 w-3.5" />
                  <span>
                    {detalle.tipo_equipo.nombre} (
                    {detalle.tipo_equipo.codigo || detalle.aplica_a?.[0]})
                  </span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-700 text-slate-200">
                  <Globe className="h-3.5 w-3.5" />
                  <span>Universal Multi-Equipo</span>
                </span>
              )}

              <button
                type="button"
                onClick={handleToggleServicioActivo}
                disabled={togglingServiceStatus}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer',
                  detalle.activo !== false
                    ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40 hover:bg-emerald-500/30'
                    : 'bg-amber-500/25 text-amber-200 border-amber-400/50 hover:bg-amber-500/35',
                )}
                title="Activar o desactivar este Tipo de Servicio para nuevas Órdenes de Servicio"
              >
                <Power className="h-3 w-3" />
                <span>
                  {detalle.activo !== false
                    ? 'Servicio Activo en Órdenes'
                    : 'Inactivo (Clic para Activar en Órdenes)'}
                </span>
              </button>
            </div>

            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2.5">
              <Wrench className="h-6 w-6 text-indigo-400 shrink-0" />
              <span>{detalle.nombre_tipo}</span>
            </h1>
            <p className="text-xs text-slate-300 max-w-3xl">
              Mesa de Ingeniería de Protocolo (Fast-Protocol Builder): escribe tareas y presiona{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-white/15 text-white font-mono text-[10px]">
                Enter
              </kbd>{' '}
              en cada subsistema del equipo o registra mediciones cuantitativas con Unidad UoM y
              Rango <span className="font-mono text-indigo-200">[Mín — Máx]</span>.
            </p>
          </div>

          {/* Cambiador rápido de protocolo + Acciones Maestras */}
          <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
            <div className="w-full sm:w-64 text-slate-900">
              <EamSelect
                value={String(detalle.id_tipo_servicio)}
                onChange={(val) => val && onSelectServicio(Number(val))}
                options={allServicesOptions}
                placeholder="Cambiar de protocolo..."
                searchable
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsNewSistemaOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4 text-emerald-300" />
                <span>+ Nueva Sección / Subsistema</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedImportIds([]);
                  setImportEquipoFilter(
                    (detalle.id_tipo_equipo ?? detalle.tipo_equipo?.id) ? 'CURRENT' : 'ALL',
                  );
                  setIsImportModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-all cursor-pointer"
              >
                <BookOpen className="h-4 w-4" />
                <span>📚 Importar en Lote del Banco</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPdfPreviewOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all cursor-pointer"
              >
                <Eye className="h-4 w-4" />
                <span>👁️ Vista Previa PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* KPIs rápidos del Protocolo */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-white/10">
          <div className="bg-white/5 rounded-xl px-4 py-2.5 border border-white/10">
            <div className="text-[11px] text-slate-300 font-medium">
              Secciones / Subsistemas del Equipo
            </div>
            <div className="text-xl font-black text-white mt-0.5">
              {seccionesSubsistema.filter((s) => s.id_sistema != null).length}{' '}
              <span className="text-xs font-normal text-slate-300">+ General</span>
            </div>
          </div>
          <div className="bg-white/5 rounded-xl px-4 py-2.5 border border-white/10">
            <div className="text-[11px] text-blue-200 font-medium">
              Zona A · Tareas de Inspección (Checklist PDF)
            </div>
            <div className="text-xl font-black text-blue-300 mt-0.5">{totalInspecciones}</div>
          </div>
          <div className="bg-white/5 rounded-xl px-4 py-2.5 border border-white/10">
            <div className="text-[11px] text-purple-200 font-medium">
              Zona B · Parámetros Operativos / Mediciones UoM
            </div>
            <div className="text-xl font-black text-purple-300 mt-0.5">
              {medicionesZonaB.length}
            </div>
          </div>
          <div className="bg-white/5 rounded-xl px-4 py-2.5 border border-white/10">
            <div className="text-[11px] text-emerald-200 font-medium">
              Total Puntos del Protocolo
            </div>
            <div className="text-xl font-black text-emerald-300 mt-0.5">
              {totalInspecciones + medicionesZonaB.length}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          ZONA A: PROTOCOLO DE INSPECCIÓN CUALITATIVA POR SUBSISTEMAS (TABLA PDF)
      ═══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-blue-50/90 via-indigo-50/50 to-white border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-xs">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900">
                  ZONA A — Protocolo de Inspección Cualitativa por Subsistemas
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">
                  Tabla Checklist PDF (B / R / M / N/A)
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Las Partes y Subsistemas del Tipo de Equipo aparecen sincronizadas automáticamente.
                Escribe al pie de cada subsistema y presiona{' '}
                <strong className="text-slate-900">Enter</strong>.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {seccionesSubsistema.map((sec, secIdx) => {
            const currentInput = quickTaskText[sec.key] || '';
            const currentType = quickTaskType[sec.key] || 'INSPECCION';
            const isSavingThis = savingSubsystemKey === sec.key;

            return (
              <div
                key={sec.key}
                className="rounded-2xl border border-slate-200/90 bg-slate-50/50 overflow-hidden shadow-2xs"
              >
                {/* Header del Subsistema */}
                <div className="px-5 py-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-lg bg-blue-600 text-white text-xs font-black flex items-center justify-center">
                      {secIdx + 1}
                    </span>
                    <span className="font-bold text-sm text-slate-900">
                      {sec.id_sistema ? `📦 ${sec.nombre_sistema}` : `🌐 ${sec.nombre_sistema}`}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200">
                      {sec.codigo_sistema}
                    </span>
                    {sec.esParteEam && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        ⚡ Sincronizado con Parte EAM
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">
                      {sec.tareasCualitativas.length} tarea(s) de inspección
                    </span>
                    {(medicionesCountPorSistema.get(sec.key) || 0) > 0 && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                        + {medicionesCountPorSistema.get(sec.key)} mediciones en Zona B
                      </span>
                    )}
                  </div>
                </div>

                {/* Lista de tareas del Subsistema */}
                <div className="divide-y divide-slate-200/70 bg-white">
                  {sec.tareasCualitativas.length === 0 ? (
                    <div className="px-5 py-4 text-xs text-slate-400 italic flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                      <span>
                        Aún no hay tareas en «{sec.nombre_sistema}». Usa la barra rápida de abajo y
                        presiona Enter para agregar la primera.
                      </span>
                    </div>
                  ) : (
                    sec.tareasCualitativas.map((act, idx) => {
                      const isEditing = editingTaskId === act.id_actividad_catalogo;
                      const tipoMeta =
                        TIPOS_ACTIVIDAD.find((t) => t.value === act.tipo_actividad) ||
                        TIPOS_ACTIVIDAD[0];

                      return (
                        <div
                          key={act.id_actividad_catalogo}
                          className="px-5 py-2.5 flex items-center justify-between gap-3 hover:bg-blue-50/30 transition-colors"
                        >
                          {isEditing ? (
                            <div className="flex-1 space-y-2.5 bg-blue-50/40 p-3 rounded-xl border border-blue-200">
                              <div className="flex flex-wrap items-center gap-2">
                                <input
                                  type="text"
                                  value={editDesc}
                                  onChange={(e) => setEditDesc(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleSaveEditTask(act);
                                    } else if (e.key === 'Escape') {
                                      setEditingTaskId(null);
                                    }
                                  }}
                                  className="flex-1 min-w-[240px] px-3 py-1.5 text-xs font-semibold border border-blue-400 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
                                  autoFocus
                                />
                                <select
                                  value={editTipo}
                                  onChange={(e) => setEditTipo(e.target.value)}
                                  className="px-2.5 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-white"
                                >
                                  {TIPOS_CUALITATIVOS.map((t) => (
                                    <option key={t.value} value={t.value}>
                                      {t.label}
                                    </option>
                                  ))}
                                  <option value="OTRA_PERSONALIZADA">
                                    + Otra naturaleza personalizada...
                                  </option>
                                </select>
                                {editTipo === 'OTRA_PERSONALIZADA' && (
                                  <input
                                    type="text"
                                    value={editCustomNature}
                                    onChange={(e) => setEditCustomNature(e.target.value)}
                                    placeholder="Nombre naturaleza..."
                                    className="px-2.5 py-1.5 text-xs font-semibold border border-indigo-300 rounded-lg bg-white w-44"
                                  />
                                )}
                                <select
                                  value={editSistemaId}
                                  onChange={(e) => setEditSistemaId(e.target.value)}
                                  className="px-2.5 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white"
                                >
                                  {sistemasSelectOptions.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <ModoRespuestaSelector
                                tipoControlInput={editControlType}
                                configInputJson={editControlConfig}
                                rolSemantico={editRolSemantico}
                                onChange={(next) => {
                                  setEditControlType(next.tipoControlInput);
                                  setEditControlConfig(next.configInputJson);
                                  setEditRolSemantico(next.rolSemantico);
                                }}
                              />

                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setEditingTaskId(null)}
                                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer"
                                >
                                  Cancelar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveEditTask(act)}
                                  disabled={savingEditId === act.id_actividad_catalogo}
                                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 inline-flex items-center gap-1 cursor-pointer"
                                >
                                  {savingEditId === act.id_actividad_catalogo ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Check className="h-3.5 w-3.5" />
                                  )}
                                  <span>Guardar Cambios</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                {/* Botones rápidos ↑ / ↓ */}
                                <div className="flex items-center gap-0.5 shrink-0">
                                  <button
                                    type="button"
                                    disabled={idx === 0}
                                    onClick={() =>
                                      handleMoveTask(sec.tareasCualitativas, idx, 'up')
                                    }
                                    className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700 disabled:opacity-25 cursor-pointer"
                                    title="Subir orden"
                                  >
                                    <ArrowUp className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={idx === sec.tareasCualitativas.length - 1}
                                    onClick={() =>
                                      handleMoveTask(sec.tareasCualitativas, idx, 'down')
                                    }
                                    className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700 disabled:opacity-25 cursor-pointer"
                                    title="Bajar orden"
                                  >
                                    <ArrowDown className="h-3.5 w-3.5" />
                                  </button>
                                </div>

                                <span className="text-[11px] font-mono font-bold text-slate-400 w-6">
                                  #{idx + 1}
                                </span>

                                <span
                                  className={cn(
                                    'px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0',
                                    tipoMeta.color,
                                  )}
                                >
                                  {act.naturaleza_personalizada?.trim() || tipoMeta.label}
                                </span>

                                <span
                                  onClick={() => startEditTask(act)}
                                  className="text-xs font-semibold text-slate-800 hover:text-blue-600 cursor-pointer truncate"
                                  title="Clic para editar tarea inline"
                                >
                                  {act.descripcion_actividad}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {act.rol_semantico && (
                                  <span
                                    title={`Rol semántico: ${act.rol_semantico}`}
                                    className="hidden md:inline-flex px-2 py-0.5 rounded text-[10px] font-mono font-bold text-amber-800 bg-amber-50 border border-amber-200"
                                  >
                                    {act.rol_semantico === 'LECTURA_CONTADOR_ACTIVO'
                                      ? '🔢 CONTADOR'
                                      : act.rol_semantico}
                                  </span>
                                )}
                                <span
                                  title="Modo de respuesta configurado para Mobile y Web"
                                  className={cn(
                                    'hidden sm:inline-flex px-2 py-0.5 rounded text-[10px] font-mono border max-w-[200px] truncate',
                                    act.tipo_control_input &&
                                      act.tipo_control_input !== 'ESCALA_ESTADO'
                                      ? 'font-bold text-indigo-700 bg-indigo-50 border-indigo-200'
                                      : 'text-slate-500 bg-slate-50 border-slate-200',
                                  )}
                                >
                                  {getModoRespuestaBadgeLabel(
                                    act.tipo_control_input,
                                    act.config_input_json,
                                  )}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => startEditTask(act)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                                  title="Editar tarea"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTask(act)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Quitar tarea del protocolo"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* BARRA DE CREACIÓN RÁPIDA INLINE (1 SOLA LÍNEA + ENTER) */}
                <div className="px-4 py-2.5 bg-slate-100/80 border-t border-slate-200/80 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1">
                    <Plus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-600" />
                    <input
                      ref={(el) => {
                        quickInputRefs.current[sec.key] = el;
                      }}
                      type="text"
                      value={currentInput}
                      onChange={(e) =>
                        setQuickTaskText((prev) => ({ ...prev, [sec.key]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleQuickAddTask(sec.key, sec.id_sistema);
                        }
                      }}
                      placeholder={`Escribe una nueva tarea de inspección para «${sec.nombre_sistema}» y presiona Enter...`}
                      className="w-full pl-9 pr-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <select
                      value={currentType}
                      onChange={(e) =>
                        setQuickTaskType((prev) => ({
                          ...prev,
                          [sec.key]: e.target.value,
                        }))
                      }
                      className="px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-xl text-slate-700 focus:outline-none focus:border-blue-500"
                    >
                      {TIPOS_CUALITATIVOS.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                      <option value="OTRA_PERSONALIZADA">+ Otra naturaleza personalizada...</option>
                    </select>

                    {currentType === 'OTRA_PERSONALIZADA' && (
                      <input
                        type="text"
                        value={quickCustomNature[sec.key] || ''}
                        onChange={(e) =>
                          setQuickCustomNature((prev) => ({
                            ...prev,
                            [sec.key]: e.target.value,
                          }))
                        }
                        placeholder="Ej: Calibración Láser"
                        className="px-3 py-2 text-xs font-semibold bg-white border border-indigo-300 rounded-xl w-40 focus:outline-none focus:border-indigo-500"
                      />
                    )}

                    <ModoRespuestaSelector
                      compact
                      tipoControlInput={quickControlType[sec.key] || 'ESCALA_ESTADO'}
                      configInputJson={quickControlConfig[sec.key] ?? null}
                      rolSemantico={quickRolSemantico[sec.key] || ''}
                      onChange={(next) => {
                        setQuickControlType((prev) => ({
                          ...prev,
                          [sec.key]: next.tipoControlInput,
                        }));
                        setQuickControlConfig((prev) => ({
                          ...prev,
                          [sec.key]: next.configInputJson,
                        }));
                        setQuickRolSemantico((prev) => ({ ...prev, [sec.key]: next.rolSemantico }));
                      }}
                    />

                    <button
                      type="button"
                      disabled={!currentInput.trim() || isSavingThis}
                      onClick={() => handleQuickAddTask(sec.key, sec.id_sistema)}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-all inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      {isSavingThis ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Plus className="h-3.5 w-3.5" />
                      )}
                      <span>+ Agregar (Enter)</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          ZONA B: PARÁMETROS OPERATIVOS / TELEMETRÍA CUANTITATIVA (MEDICIÓN UoM)
      ═══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-purple-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-purple-50/90 via-indigo-50/40 to-white border-b border-purple-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-600 text-white shadow-xs">
              <Gauge className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-black text-slate-900">
                  ZONA B — Registro de Parámetros Operativos / Telemetría Cuantitativa (UoM)
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800">
                  Tarjetas de Telemetría PDF · Rango [Mín — Máx]
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Mediciones numéricas que el técnico captura en campo con su Unidad de Medida (60
                Magnitudes / 263 Unidades) y Rango Operativo Normal. Se sincronizan automáticamente
                con{' '}
                <code className="font-mono text-[11px] text-purple-700">parametros_medicion</code>.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Tabla / Tarjetas de Mediciones configuradas */}
          {medicionesZonaB.length === 0 ? (
            <div className="p-6 rounded-2xl border-2 border-dashed border-purple-200 bg-purple-50/30 text-center space-y-1">
              <p className="text-xs font-bold text-purple-900">
                Aún no hay mediciones numéricas configuradas para este protocolo.
              </p>
              <p className="text-xs text-purple-700">
                Usa la barra de abajo para agregar puntos de telemetría (ej.{' '}
                <strong>Precisión de Nivelación en Parada</strong> en <strong>mm</strong> con rango{' '}
                <strong>[0 — 5]</strong>) y presiona <strong>Enter</strong>.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-purple-100 rounded-2xl border border-purple-200 overflow-hidden bg-white">
              {medicionesZonaB.map((med, idx) => {
                const isEditing = editingTaskId === med.id_actividad_catalogo;
                const unidad = med.parametro_medicion?.unidad || '—';
                const min = med.parametro_medicion?.rango_min;
                const max = med.parametro_medicion?.rango_max;

                return (
                  <div
                    key={med.id_actividad_catalogo}
                    className="px-5 py-3 flex flex-wrap items-center justify-between gap-3 hover:bg-purple-50/30 transition-colors"
                  >
                    {isEditing ? (
                      <div className="flex-1 flex flex-wrap items-center gap-2">
                        <input
                          type="text"
                          value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value)}
                          className="flex-1 min-w-[200px] px-3 py-1.5 text-xs font-bold border border-purple-400 rounded-lg"
                          placeholder="Nombre del parámetro..."
                        />
                        <input
                          type="text"
                          value={editUnidad}
                          onChange={(e) => setEditUnidad(e.target.value)}
                          className="w-24 px-2.5 py-1.5 text-xs font-mono font-bold border border-slate-300 rounded-lg"
                          placeholder="Unidad"
                        />
                        <input
                          type="number"
                          step="any"
                          value={editMin}
                          onChange={(e) => setEditMin(e.target.value)}
                          className="w-20 px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                          placeholder="Mín"
                        />
                        <input
                          type="number"
                          step="any"
                          value={editMax}
                          onChange={(e) => setEditMax(e.target.value)}
                          className="w-20 px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                          placeholder="Máx"
                        />
                        <select
                          value={editSistemaId}
                          onChange={(e) => setEditSistemaId(e.target.value)}
                          className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                        >
                          {sistemasSelectOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleSaveEditTask(med)}
                          disabled={savingEditId === med.id_actividad_catalogo}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 inline-flex items-center gap-1"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>Guardar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingTaskId(null)}
                          className="p-1.5 text-slate-400 hover:text-slate-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveTask(medicionesZonaB, idx, 'up')}
                              className="p-1 rounded hover:bg-purple-100 text-slate-400 hover:text-purple-700 disabled:opacity-25 cursor-pointer"
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === medicionesZonaB.length - 1}
                              onClick={() => handleMoveTask(medicionesZonaB, idx, 'down')}
                              className="p-1 rounded hover:bg-purple-100 text-slate-400 hover:text-purple-700 disabled:opacity-25 cursor-pointer"
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 shrink-0">
                            MEDICIÓN
                          </span>

                          <span
                            onClick={() => startEditTask(med)}
                            className="text-xs font-bold text-slate-900 hover:text-purple-700 cursor-pointer truncate"
                          >
                            {med.descripcion_actividad}
                          </span>

                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                            {med.nombre_sistema}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-black bg-indigo-50 text-indigo-800 border border-indigo-200">
                            Unidad: {unidad}
                          </span>
                          <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Rango: [{min ?? '—'} — {max ?? '—'}] {unidad}
                          </span>
                          <button
                            type="button"
                            onClick={() => startEditTask(med)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition-colors cursor-pointer"
                            title="Editar unidad o rango"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTask(med)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Quitar medición"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* BARRA DE CREACIÓN RÁPIDA INLINE DE MEDICIÓN (ZONA B) */}
          <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200/90 space-y-2">
            <div className="text-[11px] font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-purple-600" />
              <span>
                Agregar Parámetro Operativo / Medición Cuantitativa Rápida (Sincroniza con UoM y
                Rango Normal)
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-center">
              <div className="lg:col-span-4">
                <input
                  ref={medNombreInputRef}
                  type="text"
                  value={medNombre}
                  onChange={(e) => setMedNombre(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleQuickAddMedicion();
                    }
                  }}
                  placeholder="Ej: Precisión de Nivelación en Parada"
                  className="w-full px-3.5 py-2 text-xs font-semibold bg-white border border-purple-300 rounded-xl focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-100"
                />
              </div>

              <div className="lg:col-span-2">
                <select
                  value={medSistemaId}
                  onChange={(e) => setMedSistemaId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold bg-white border border-purple-300 rounded-xl text-slate-700 focus:outline-none focus:border-purple-600"
                >
                  {sistemasSelectOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="lg:col-span-3">
                <EamSelect
                  value={medUnidad}
                  onChange={(val) => setMedUnidad(val || 'mm')}
                  options={opcionesUnidadesUom}
                  placeholder="Unidad UoM (mm, m/s, s...)"
                  searchable
                  dropUp
                />
              </div>

              <div className="lg:col-span-1">
                <input
                  type="number"
                  step="any"
                  value={medMin}
                  onChange={(e) => setMedMin(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleQuickAddMedicion();
                    }
                  }}
                  placeholder="Mín"
                  title="Valor Mínimo Normal"
                  className="w-full px-2.5 py-2 text-xs font-mono font-bold text-center bg-white border border-purple-300 rounded-xl focus:outline-none focus:border-purple-600"
                />
              </div>

              <div className="lg:col-span-1">
                <input
                  type="number"
                  step="any"
                  value={medMax}
                  onChange={(e) => setMedMax(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleQuickAddMedicion();
                    }
                  }}
                  placeholder="Máx"
                  title="Valor Máximo Normal"
                  className="w-full px-2.5 py-2 text-xs font-mono font-bold text-center bg-white border border-purple-300 rounded-xl focus:outline-none focus:border-purple-600"
                />
              </div>

              <div className="lg:col-span-1">
                <button
                  type="button"
                  disabled={!medNombre.trim() || savingMedicion}
                  onClick={handleQuickAddMedicion}
                  className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 transition-all inline-flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                >
                  {savingMedicion ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  <span>Enter</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 1: + NUEVA SECCIÓN / SUBSISTEMA DEL EQUIPO (SALVAGUARDA 2)
      ═══════════════════════════════════════════════════════════════════════ */}
      {isNewSistemaOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Layers className="h-5 w-5 text-blue-600" />
                <span>Nueva Sección / Subsistema de Inspección</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsNewSistemaOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewSistema} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre del Subsistema / Sección *
                </label>
                <input
                  type="text"
                  required
                  value={newSistemaNombre}
                  onChange={(e) => setNewSistemaNombre(e.target.value)}
                  placeholder="Ej: Foso, Contrapeso y Amortiguadores"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-blue-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Descripción técnica (Opcional)
                </label>
                <input
                  type="text"
                  value={newSistemaDesc}
                  onChange={(e) => setNewSistemaDesc(e.target.value)}
                  placeholder="Elementos cubiertos en esta sección del protocolo..."
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewSistemaOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 border border-slate-200 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!newSistemaNombre.trim() || savingNewSistema}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {savingNewSistema && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Crear Sección</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 2: IMPORTAR EN LOTE DEL BANCO UNIVERSAL (CON CHECKBOXES)
      ═══════════════════════════════════════════════════════════════════════ */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[88vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <BookOpen className="h-5 w-5 text-indigo-400" />
                <div>
                  <h3 className="text-base font-black">
                    Importar en Lote desde el Banco Universal de Actividades
                  </h3>
                  <p className="text-xs text-slate-300">
                    Selecciona múltiples tareas o mediciones del diccionario maestro para
                    vincularlas a «{detalle.nombre_tipo}».
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Barra de búsqueda y filtros del modal */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
              <div className="sm:col-span-4 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={importSearch}
                  onChange={(e) => setImportSearch(e.target.value)}
                  placeholder="Buscar por descripción o código..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-xl"
                />
              </div>

              <div className="sm:col-span-3">
                <select
                  value={importEquipoFilter}
                  onChange={(e) => setImportEquipoFilter(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl"
                  title="Filtrar por Tipo de Equipo"
                >
                  {Boolean(detalle.id_tipo_equipo ?? detalle.tipo_equipo?.id) && (
                    <option value="CURRENT">
                      {detalle.tipo_equipo?.nombre || 'Equipo del Protocolo'} + Universal
                    </option>
                  )}
                  <option value="ALL">Todos los equipos (Banco completo)</option>
                  <option value="UNIVERSAL">Solo Universal (Sin equipo fijo)</option>
                  {arquetipos.map((a) => (
                    <option key={a.id_tipo_equipo} value={String(a.id_tipo_equipo)}>
                      {a.nombre_tipo} ({a.codigo_tipo})
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <select
                  value={importTipoFilter}
                  onChange={(e) => setImportTipoFilter(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl"
                >
                  <option value="">Naturalezas</option>
                  {TIPOS_ACTIVIDAD.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3">
                <select
                  value={importTargetSistemaId}
                  onChange={(e) => setImportTargetSistemaId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl"
                >
                  <option value="">Subsistema automático</option>
                  {sistemasSelectOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      Asignar a: {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Lista de candidatos con Checkboxes */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2">
              {candidatosBanco.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-400">
                  No se encontraron actividades disponibles con los filtros actuales.
                </div>
              ) : (
                candidatosBanco.map(({ item, yaEnProtocolo }) => {
                  const id = Number(item.idActividadCatalogo || item.id_actividad_catalogo);
                  const checked = selectedImportIds.includes(id);
                  const desc = item.descripcionActividad || item.descripcion_actividad || '';
                  const tipo = item.tipoActividad || item.tipo_actividad || 'INSPECCION';
                  const sis =
                    item.sistema?.nombreSistema ||
                    item.catalogo_sistemas?.nombre_sistema ||
                    'General';
                  const uom =
                    item.parametroMedicion?.unidadMedida || item.parametros_medicion?.unidad_medida;

                  return (
                    <label
                      key={id}
                      className={cn(
                        'flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl transition-colors',
                        yaEnProtocolo
                          ? 'bg-emerald-50/40 opacity-75 cursor-not-allowed'
                          : checked
                            ? 'bg-indigo-50/80 cursor-pointer'
                            : 'hover:bg-slate-50 cursor-pointer',
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          disabled={yaEnProtocolo}
                          checked={checked}
                          onChange={(e) => {
                            if (yaEnProtocolo) return;
                            if (e.target.checked) {
                              setSelectedImportIds((prev) => [...prev, id]);
                            } else {
                              setSelectedImportIds((prev) => prev.filter((x) => x !== id));
                            }
                          }}
                          className="h-4 w-4 rounded text-indigo-600 border-slate-300 disabled:opacity-40"
                        />
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 shrink-0">
                          {item.naturalezaPersonalizada || item.naturaleza_personalizada || tipo}
                        </span>
                        <span className="text-xs font-semibold text-slate-900 truncate">
                          {desc}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {yaEnProtocolo && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            ✓ Ya en este protocolo
                          </span>
                        )}
                        {uom && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-100 text-purple-800">
                            UoM: {uom}
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                          {sis}
                        </span>
                      </div>
                    </label>
                  );
                })
              )}
            </div>

            {/* Footer del modal */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">
                {selectedImportIds.length} actividad(es) seleccionada(s)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 border border-slate-200 bg-white hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={selectedImportIds.length === 0 || savingImport}
                  onClick={handleImportarLote}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {savingImport && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Vincular Seleccionadas ({selectedImportIds.length})</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 3: VISTA PREVIA PROTOCOLO PDF (SIMULADOR 1:1 REPORTE UNIVERSAL)
      ═══════════════════════════════════════════════════════════════════════ */}
      {isPdfPreviewOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileText className="h-5 w-5 text-emerald-400" />
                <div>
                  <h3 className="text-base font-black">
                    Simulación Visual 1:1 — Reporte Técnico PDF Universal EAM
                  </h3>
                  <p className="text-xs text-slate-300">
                    Así se renderizarán la Tabla de Checklist Cualitativo y las Tarjetas de
                    Telemetría UoM al generar el PDF de la orden.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPdfPreviewOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-100">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 space-y-6">
                {/* Encabezado simulado PDF */}
                <div className="border-b-2 border-slate-900 pb-4 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-blue-700">
                      MEKANOS S.A.S · REPORTE TÉCNICO OFICIAL EAM
                    </div>
                    <h4 className="text-lg font-black text-slate-900 mt-0.5">
                      {detalle.nombre_tipo} ({detalle.codigo_tipo})
                    </h4>
                  </div>
                  <div className="text-right text-xs text-slate-600">
                    <div className="font-bold text-slate-900">
                      {detalle.tipo_equipo?.nombre || 'Activo Universal'}
                    </div>
                    <div>
                      {totalInspecciones} inspecciones · {medicionesZonaB.length} mediciones UoM
                    </div>
                  </div>
                </div>

                {/* Bloque 1 PDF: Checklist de Inspección por Subsistemas */}
                <div className="space-y-3">
                  <div className="text-xs font-black uppercase tracking-wider text-slate-800 bg-slate-100 px-3 py-2 rounded-lg border-l-4 border-blue-600">
                    1. LISTA DE CHEQUEO E INSPECCIÓN TÉCNICA POR SUBSISTEMA
                  </div>

                  {seccionesSubsistema
                    .filter((s) => s.tareasCualitativas.length > 0)
                    .map((sec) => (
                      <div
                        key={sec.key}
                        className="border border-slate-200 rounded-lg overflow-hidden"
                      >
                        <div className="bg-slate-800 text-white px-3 py-1.5 text-xs font-bold flex justify-between">
                          <span>{sec.nombre_sistema.toUpperCase()}</span>
                          <span className="font-mono text-[10px] text-slate-300">
                            B = Bueno | R = Regular | M = Malo | C = Corregido | NA
                          </span>
                        </div>
                        <table className="w-full text-xs">
                          <tbody className="divide-y divide-slate-200">
                            {sec.tareasCualitativas.map((t, i) => (
                              <tr key={t.id_actividad_catalogo}>
                                <td className="px-3 py-1.5 font-mono text-slate-400 w-8">
                                  {i + 1}
                                </td>
                                <td className="px-3 py-1.5 font-medium text-slate-800">
                                  <div>{t.descripcion_actividad}</div>
                                  {(t.naturaleza_personalizada || t.rol_semantico) && (
                                    <div className="text-[10px] text-slate-400 mt-0.5">
                                      {t.naturaleza_personalizada
                                        ? `${t.naturaleza_personalizada} `
                                        : ''}
                                      {t.rol_semantico ? `· ${t.rol_semantico}` : ''}
                                    </div>
                                  )}
                                </td>
                                <td className="px-3 py-1.5 w-44 text-center font-mono text-[10px] text-indigo-800 bg-indigo-50/70 font-bold">
                                  [{' '}
                                  {getModoRespuestaBadgeLabel(
                                    t.tipo_control_input,
                                    t.config_input_json,
                                  )}{' '}
                                  ]
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                </div>

                {/* Bloque 2 PDF: Tarjetas de Telemetría / Parámetros Operativos */}
                <div className="space-y-3">
                  <div className="text-xs font-black uppercase tracking-wider text-slate-800 bg-purple-50 px-3 py-2 rounded-lg border-l-4 border-purple-600">
                    2. REGISTRO DE PARÁMETROS OPERATIVOS Y TELEMETRÍA (UoM)
                  </div>

                  {medicionesZonaB.length === 0 ? (
                    <p className="text-xs text-slate-400 italic px-2">
                      Sin mediciones numéricas configuradas.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {medicionesZonaB.map((m) => (
                        <div
                          key={m.id_actividad_catalogo}
                          className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1"
                        >
                          <div className="text-[10px] font-bold text-slate-500 uppercase truncate">
                            {m.nombre_sistema}
                          </div>
                          <div className="text-xs font-bold text-slate-900">
                            {m.descripcion_actividad}
                          </div>
                          <div className="flex items-baseline justify-between pt-1">
                            <span className="text-base font-black font-mono text-indigo-700">
                              — {m.parametro_medicion?.unidad || ''}
                            </span>
                            <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              Normal: [{m.parametro_medicion?.rango_min ?? '—'} -{' '}
                              {m.parametro_medicion?.rango_max ?? '—'}]
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-3 bg-white border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setIsPdfPreviewOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800"
              >
                Cerrar Vista Previa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
