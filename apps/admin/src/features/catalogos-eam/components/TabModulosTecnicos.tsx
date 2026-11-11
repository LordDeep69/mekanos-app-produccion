'use client';

import {
  AlertTriangle,
  Boxes,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Edit3,
  GripVertical,
  Layers,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
  Lock,
  Unlock,
} from 'lucide-react';
import {
  generarCodigoParteModulo,
  generarCodigoCampoTecnico,
  verificarCodigoDuplicado,
} from '../utils/eam-code-generator';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  EamSelect,
  ModuloAtributoItem,
  ModuloTecnico,
  TIPOS_CONTROL_HUMANOS,
  getTipoControlHumano,
  useAsignarAtributoModuloEam,
  useAtributosEam,
  useCreateAtributoEam,
  useCreateModuloEam,
  useDeleteModuloEam,
  useDesasignarAtributoModuloEam,
  useMagnitudesEam,
  useModuloDetalleEam,
  useModulosEam,
  useUpdateAtributoModuloEam,
  useUpdateModuloEam,
} from '../index';

const SECCIONES_PRESET_INGENIERIA = [
  {
    name: 'Especificaciones Técnicas',
    desc: 'Recomendada · Datos clave y placa técnica del equipo',
  },
  {
    name: 'Desempeño y Capacidad',
    desc: 'Potencia, caudales, presiones y rendimiento',
  },
  {
    name: 'Identificación',
    desc: 'Marca, modelo, serie y fabricante',
  },
  {
    name: 'Control y Seguridad',
    desc: 'Protecciones, presostatos y sensores',
  },
];

export function TabModulosTecnicos() {
  const { data: modulos = [], isLoading } = useModulosEam();
  const [selectedModuloCodeRaw, setSelectedModuloCode] = useState<string>('');
  const selectedModuloCode = selectedModuloCodeRaw || modulos[0]?.codigo_modulo || '';

  const [searchModQuery, setSearchModQuery] = useState<string>('');

  const modulosFiltrados = useMemo(() => {
    const q = searchModQuery.trim().toLowerCase();
    if (!q) return modulos;
    return modulos.filter((m) => {
      const matchNombre = m.nombre_modulo.toLowerCase().includes(q);
      const matchCodigo = m.codigo_modulo.toLowerCase().includes(q);
      const matchDesc = (m.descripcion || '').toLowerCase().includes(q);
      return matchNombre || matchCodigo || matchDesc;
    });
  }, [modulos, searchModQuery]);

  const selectedModulo = useMemo(
    () => modulos.find((m) => m.codigo_modulo === selectedModuloCode) || modulos[0] || null,
    [modulos, selectedModuloCode],
  );

  const otrosModulos = useMemo(
    () => modulosFiltrados.filter((m) => m.codigo_modulo !== selectedModuloCode),
    [modulosFiltrados, selectedModuloCode],
  );

  const { data: moduloDetalle, isLoading: loadingDetalle } = useModuloDetalleEam(
    selectedModuloCode || null,
  );

  const { data: todosAtributos = [] } = useAtributosEam();
  const { data: magnitudes = [] } = useMagnitudesEam();

  const createModMut = useCreateModuloEam();
  const updateModMut = useUpdateModuloEam();
  const deleteModMut = useDeleteModuloEam();
  const asignarMut = useAsignarAtributoModuloEam();
  const updateFlagMut = useUpdateAtributoModuloEam();
  const desasignarMut = useDesasignarAtributoModuloEam();
  const createAttrMut = useCreateAtributoEam();

  // Estado del Modal de Advertencia y Confirmación de Eliminación
  const [deleteTarget, setDeleteTarget] = useState<ModuloTecnico | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    try {
      await deleteModMut.mutateAsync(deleteTarget.codigo_modulo);
      if (selectedModuloCode === deleteTarget.codigo_modulo) {
        const restantes = modulos.filter((m) => m.codigo_modulo !== deleteTarget.codigo_modulo);
        setSelectedModuloCode(restantes[0]?.codigo_modulo || '');
      }
      setDeleteTarget(null);
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } }; message?: string };
      const msg =
        apiErr?.response?.data?.message ||
        apiErr?.message ||
        'Ocurrió un error al procesar la eliminación';
      setDeleteError(msg);
    }
  };

  // Estados de autogeneración inteligente y universos de unicidad
  const [isAutoCodigoModulo, setIsAutoCodigoModulo] = useState(true);
  const [isAutoCodigoAtributo, setIsAutoCodigoAtributo] = useState(true);

  const codigosModulosExistentes = useMemo(() => {
    return new Set(modulos.map((m) => m.codigo_modulo.toLowerCase()));
  }, [modulos]);

  const codigosAtributosExistentes = useMemo(() => {
    return new Set(todosAtributos.map((a) => a.codigo_atributo.toLowerCase()));
  }, [todosAtributos]);

  // Modal Crear / Editar Parte o Subsistema
  const [showModModal, setShowModModal] = useState(false);
  const [editingMod, setEditingMod] = useState<ModuloTecnico | null>(null);
  const [modForm, setModForm] = useState({
    codigo_modulo: '',
    nombre_modulo: '',
    descripcion: '',
    color_ui: '#3B82F6',
  });

  // Modal Asignar Campo Existente
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignSelectorOpen, setAssignSelectorOpen] = useState(true);
  const [assignSearch, setAssignSearch] = useState('');
  const [assignTypeFilter, setAssignTypeFilter] = useState<
    'ALL' | 'NUM_MAG' | 'SELECT' | 'BOOL' | 'OTROS'
  >('ALL');
  const [assignSectionMode, setAssignSectionMode] = useState<'existing' | 'new'>('existing');
  const [assignNewSection, setAssignNewSection] = useState('');
  const [assignForm, setAssignForm] = useState({
    id_atributo: '',
    grupo_visual: 'Especificaciones Técnicas',
    orden_visual: '10',
    obligatorio: false,
    es_kpi: false,
    es_filtrable: true,
    visible_en_pdf: true,
  });

  // Modal Editar Asignación de Campo en esta parte (cambiar sección o switches)
  const [editingAssignment, setEditingAssignment] = useState<ModuloAtributoItem | null>(null);
  const [editAssignSectionMode, setEditAssignSectionMode] = useState<'existing' | 'new'>(
    'existing',
  );
  const [editAssignNewSection, setEditAssignNewSection] = useState('');
  const [editAssignForm, setEditAssignForm] = useState({
    grupo_visual: 'Especificaciones Técnicas',
    obligatorio: false,
    es_kpi: false,
    es_filtrable: true,
    visible_en_pdf: true,
  });

  // Modal Confirmación Prémium para Quitar Campo de Parte
  const [unassignTarget, setUnassignTarget] = useState<ModuloAtributoItem | null>(null);

  // Drag & Drop state para reordenar campos
  const dragRowRef = useRef<{ grupoNombre: string; idx: number } | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<{ grupoNombre: string; idx: number } | null>(
    null,
  );

  // Modal Crear y Asignar Nuevo Campo en un solo paso
  const [showInPlaceModal, setShowInPlaceModal] = useState(false);
  const [inPlaceForm, setInPlaceForm] = useState({
    codigo_atributo: '',
    nombre_atributo: '',
    tipo_control: 'NUMERICO_MAGNITUD',
    id_magnitud: '',
    unidad_defecto_codigo: '',
    opciones_csv: '',
    grupo_visual: 'Identificación',
    orden_visual: '20',
    obligatorio: false,
    es_kpi: false,
    es_filtrable: true,
    visible_en_pdf: true,
  });

  const isCodigoModuloDuplicado = useMemo(() => {
    return verificarCodigoDuplicado(
      modForm.codigo_modulo,
      codigosModulosExistentes,
      editingMod?.codigo_modulo,
    );
  }, [modForm.codigo_modulo, codigosModulosExistentes, editingMod]);

  const isCodigoAtributoDuplicado = useMemo(() => {
    return verificarCodigoDuplicado(inPlaceForm.codigo_atributo, codigosAtributosExistentes);
  }, [inPlaceForm.codigo_atributo, codigosAtributosExistentes]);

  const gruposVisualesMap = useMemo(() => {
    const map = new Map<string, ModuloAtributoItem[]>();
    const items = moduloDetalle?.modulo_atributos || [];
    for (const item of items) {
      const grp = item.grupo_visual || 'General';
      if (!map.has(grp)) map.set(grp, []);
      map.get(grp)!.push(item);
    }
    return Array.from(map.entries());
  }, [moduloDetalle]);

  const atributosDisponiblesParaAsignar = useMemo(() => {
    const yaAsignados = new Set(
      (moduloDetalle?.modulo_atributos || []).map((ma) => ma.id_atributo),
    );
    return todosAtributos.filter((a) => !yaAsignados.has(a.id_atributo));
  }, [todosAtributos, moduloDetalle]);

  const atributosDisponiblesFiltrados = useMemo(() => {
    const q = assignSearch.trim().toLowerCase();
    return atributosDisponiblesParaAsignar.filter((a) => {
      // Filtro por categoría rápida
      if (
        assignTypeFilter === 'NUM_MAG' &&
        !a.id_magnitud &&
        a.tipo_control !== 'NUMERICO_MAGNITUD'
      ) {
        return false;
      }
      if (
        assignTypeFilter === 'SELECT' &&
        a.tipo_control !== 'SELECT' &&
        a.tipo_control !== 'SELECTOR'
      ) {
        return false;
      }
      if (
        assignTypeFilter === 'BOOL' &&
        a.tipo_control !== 'BOOLEANO' &&
        a.tipo_control !== 'BOOLEAN'
      ) {
        return false;
      }
      if (assignTypeFilter === 'OTROS') {
        const isNumMag = Boolean(a.id_magnitud) || a.tipo_control === 'NUMERICO_MAGNITUD';
        const isSel = a.tipo_control === 'SELECT' || a.tipo_control === 'SELECTOR';
        const isBool = a.tipo_control === 'BOOLEANO' || a.tipo_control === 'BOOLEAN';
        if (isNumMag || isSel || isBool) return false;
      }

      if (!q) return true;
      const matchNombre = a.nombre_atributo.toLowerCase().includes(q);
      const matchCodigo = a.codigo_atributo.toLowerCase().includes(q);
      const matchMagnitud = (a.magnitud?.nombre_magnitud || '').toLowerCase().includes(q);
      const matchUnidad = (a.unidad_defecto_codigo || '').toLowerCase().includes(q);
      return matchNombre || matchCodigo || matchMagnitud || matchUnidad;
    });
  }, [atributosDisponiblesParaAsignar, assignSearch, assignTypeFilter]);

  const selectedAtributoParaAsignar = useMemo(() => {
    if (!assignForm.id_atributo) return null;
    return (
      atributosDisponiblesParaAsignar.find(
        (a) => String(a.id_atributo) === String(assignForm.id_atributo),
      ) || null
    );
  }, [atributosDisponiblesParaAsignar, assignForm.id_atributo]);

  const seccionesDisponibles = useMemo(() => {
    const mapItems = new Map<string, ModuloAtributoItem[]>();
    for (const [secName, secItems] of gruposVisualesMap) {
      mapItems.set(secName, secItems);
    }

    // 1. Las 4 secciones estándar de ingeniería (siempre presentes para elegir)
    const list = SECCIONES_PRESET_INGENIERIA.map((preset) => {
      const items = mapItems.get(preset.name);
      return {
        name: preset.name,
        desc:
          items && items.length > 0
            ? `${items.length} ${items.length === 1 ? 'campo' : 'campos'} · Se ubicará al final`
            : preset.desc,
        count: items?.length || 0,
      };
    });

    // 2. Cualquier otra sección personalizada creada por el usuario en este módulo
    for (const [secName, secItems] of gruposVisualesMap) {
      if (!SECCIONES_PRESET_INGENIERIA.some((p) => p.name === secName)) {
        list.push({
          name: secName,
          desc: `${secItems.length} ${secItems.length === 1 ? 'campo' : 'campos'} · Sección personalizada`,
          count: secItems.length,
        });
      }
    }

    return list;
  }, [gruposVisualesMap]);

  const handleOpenAssignModal = () => {
    setAssignSearch('');
    setAssignTypeFilter('ALL');
    setAssignSelectorOpen(true);
    const hasSections = gruposVisualesMap.length > 0;
    // Si ya hay secciones → modo "elegir existente" con la primera; si está vacío → "Especificaciones Técnicas" (NUNCA el nombre de la parte)
    const defaultSection = hasSections ? gruposVisualesMap[0][0] : 'Especificaciones Técnicas';
    setAssignSectionMode('existing');
    setAssignNewSection('');
    const allItems = moduloDetalle?.modulo_atributos || [];
    // Calcula la sección seleccionada: buscar el máximo orden en esa sección para auto-append
    const sectionItems = allItems.filter((ma) => (ma.grupo_visual || 'General') === defaultSection);
    const maxOrder = sectionItems.reduce((max, ma) => Math.max(max, ma.orden_visual || 0), 0);
    setAssignForm({
      id_atributo: '',
      grupo_visual: defaultSection,
      orden_visual: String(maxOrder + 10),
      obligatorio: false,
      es_kpi: false,
      es_filtrable: true,
      visible_en_pdf: true,
    });
    setShowAssignModal(true);
  };

  const magnitudInPlaceObj = useMemo(
    () => magnitudes.find((m) => String(m.id_magnitud) === String(inPlaceForm.id_magnitud)) || null,
    [magnitudes, inPlaceForm.id_magnitud],
  );

  const handleToggleFlag = async (
    item: ModuloAtributoItem,
    field: 'obligatorio' | 'es_filtrable' | 'es_kpi' | 'visible_en_pdf',
  ) => {
    if (!selectedModuloCode) return;
    await updateFlagMut.mutateAsync({
      codigoModulo: selectedModuloCode,
      idAtributo: item.id_atributo,
      payload: {
        [field]: !item[field],
      },
    });
  };

  const handleOpenEditAssignment = (ma: ModuloAtributoItem) => {
    setEditingAssignment(ma);
    const sec = ma.grupo_visual || 'Especificaciones Técnicas';
    setEditAssignSectionMode('existing');
    setEditAssignNewSection('');
    setEditAssignForm({
      grupo_visual: sec,
      obligatorio: Boolean(ma.obligatorio),
      es_kpi: Boolean(ma.es_kpi),
      es_filtrable: ma.es_filtrable ?? true,
      visible_en_pdf: ma.visible_en_pdf ?? true,
    });
  };

  const handleSaveEditAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModuloCode || !editingAssignment) return;
    const grupoFinal =
      editAssignSectionMode === 'new' ? editAssignNewSection.trim() : editAssignForm.grupo_visual;
    if (!grupoFinal) return;

    await updateFlagMut.mutateAsync({
      codigoModulo: selectedModuloCode,
      idAtributo: editingAssignment.id_atributo,
      payload: {
        grupo_visual: grupoFinal,
        obligatorio: editAssignForm.obligatorio,
        es_kpi: editAssignForm.es_kpi,
        es_filtrable: editAssignForm.es_filtrable,
        visible_en_pdf: editAssignForm.visible_en_pdf,
      },
    });

    setEditingAssignment(null);
  };

  const handleConfirmUnassign = async () => {
    if (!unassignTarget || !moduloDetalle) return;
    try {
      await desasignarMut.mutateAsync({
        codigoModulo: moduloDetalle.codigo_modulo,
        idAtributo: unassignTarget.id_atributo,
      });
      setUnassignTarget(null);
    } catch (err) {
      console.error('Error desasignando campo:', err);
    }
  };

  // ----- Drag & Drop: Reordenar campos dentro de una sección -----
  const handleDragStart = useCallback(
    (grupoNombre: string, idx: number, e: React.DragEvent<HTMLTableRowElement>) => {
      dragRowRef.current = { grupoNombre, idx };
      e.dataTransfer.effectAllowed = 'move';
      // Efecto visual de la fila arrastrada
      if (e.currentTarget) {
        e.currentTarget.style.opacity = '0.4';
      }
    },
    [],
  );

  const handleDragOver = useCallback(
    (grupoNombre: string, idx: number, e: React.DragEvent<HTMLTableRowElement>) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      // Solo aceptar drop dentro de la misma sección
      if (dragRowRef.current && dragRowRef.current.grupoNombre === grupoNombre) {
        setDragOverTarget({ grupoNombre, idx });
      }
    },
    [],
  );

  const handleDragEnd = useCallback((e: React.DragEvent<HTMLTableRowElement>) => {
    if (e.currentTarget) {
      e.currentTarget.style.opacity = '1';
    }
    dragRowRef.current = null;
    setDragOverTarget(null);
  }, []);

  const handleDrop = useCallback(
    async (grupoNombre: string, targetIdx: number, sectionItems: ModuloAtributoItem[]) => {
      const source = dragRowRef.current;
      if (!source || source.grupoNombre !== grupoNombre || source.idx === targetIdx) {
        dragRowRef.current = null;
        setDragOverTarget(null);
        return;
      }
      if (!selectedModuloCode) return;

      // Reordenar en memoria
      const reordered = [...sectionItems];
      const [moved] = reordered.splice(source.idx, 1);
      reordered.splice(targetIdx, 0, moved);

      // Asignar nuevos orden_visual incrementales: 10, 20, 30...
      const updates = reordered.map((ma, i) => ({
        idAtributo: ma.id_atributo,
        newOrder: (i + 1) * 10,
      }));

      dragRowRef.current = null;
      setDragOverTarget(null);

      // Actualizar cada fila cuyo orden haya cambiado
      for (const upd of updates) {
        const original = sectionItems.find((ma) => ma.id_atributo === upd.idAtributo);
        if (original && original.orden_visual !== upd.newOrder) {
          await updateFlagMut.mutateAsync({
            codigoModulo: selectedModuloCode,
            idAtributo: upd.idAtributo,
            payload: { orden_visual: upd.newOrder },
          });
        }
      }
    },
    [selectedModuloCode, updateFlagMut],
  );

  // ----- Mover campo con micro-flechas ↑ ↓ (1 clic, accesible) -----
  const handleMoveField = useCallback(
    async (
      grupoNombre: string,
      fromIdx: number,
      toIdx: number,
      sectionItems: ModuloAtributoItem[],
    ) => {
      if (toIdx < 0 || toIdx >= sectionItems.length || fromIdx === toIdx || !selectedModuloCode)
        return;

      const reordered = [...sectionItems];
      const [moved] = reordered.splice(fromIdx, 1);
      reordered.splice(toIdx, 0, moved);

      const updates = reordered.map((ma, i) => ({
        idAtributo: ma.id_atributo,
        newOrder: (i + 1) * 10,
      }));

      for (const upd of updates) {
        const original = sectionItems.find((ma) => ma.id_atributo === upd.idAtributo);
        if (original && original.orden_visual !== upd.newOrder) {
          await updateFlagMut.mutateAsync({
            codigoModulo: selectedModuloCode,
            idAtributo: upd.idAtributo,
            payload: { orden_visual: upd.newOrder },
          });
        }
      }
    },
    [selectedModuloCode, updateFlagMut],
  );

  // Helper para auto-calcular el grupo_visual cuando el usuario cambia de sección en el modal
  const handleSelectAssignSection = useCallback(
    (sectionName: string) => {
      const allItems = moduloDetalle?.modulo_atributos || [];
      const sectionItems = allItems.filter((ma) => (ma.grupo_visual || 'General') === sectionName);
      const maxOrder = sectionItems.reduce((max, ma) => Math.max(max, ma.orden_visual || 0), 0);
      setAssignSectionMode('existing');
      setAssignForm((prev) => ({
        ...prev,
        grupo_visual: sectionName,
        orden_visual: String(maxOrder + 10),
      }));
    },
    [moduloDetalle],
  );

  const handleOpenNewMod = () => {
    setEditingMod(null);
    setIsAutoCodigoModulo(true);
    setModForm({
      codigo_modulo: '',
      nombre_modulo: '',
      descripcion: '',
      color_ui: '#3B82F6',
    });
    setShowModModal(true);
  };

  const handleOpenEditMod = (mod: ModuloTecnico) => {
    setEditingMod(mod);
    setIsAutoCodigoModulo(false);
    setModForm({
      codigo_modulo: mod.codigo_modulo,
      nombre_modulo: mod.nombre_modulo,
      descripcion: mod.descripcion || '',
      color_ui: mod.color_ui || '#3B82F6',
    });
    setShowModModal(true);
  };

  const handleSaveMod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingMod) {
      await updateModMut.mutateAsync({
        codigo: editingMod.codigo_modulo,
        payload: {
          nombre_modulo: modForm.nombre_modulo,
          descripcion: modForm.descripcion,
          color_ui: modForm.color_ui,
        },
      });
    } else {
      const created = await createModMut.mutateAsync({
        codigo_modulo: modForm.codigo_modulo,
        nombre_modulo: modForm.nombre_modulo,
        descripcion: modForm.descripcion,
        color_ui: modForm.color_ui,
      });
      setSelectedModuloCode(created.codigo_modulo);
    }
    setShowModModal(false);
  };

  const handleSaveAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModuloCode || !assignForm.id_atributo) return;

    const allItems = moduloDetalle?.modulo_atributos || [];
    const targetSection =
      assignSectionMode === 'new' && assignNewSection.trim()
        ? assignNewSection.trim()
        : assignForm.grupo_visual || 'Especificaciones Técnicas';
    const sectionItems = allItems.filter((ma) => (ma.grupo_visual || 'General') === targetSection);
    const maxOrder = sectionItems.reduce((max, ma) => Math.max(max, ma.orden_visual || 0), 0);
    const autoOrder = maxOrder + 10;

    await asignarMut.mutateAsync({
      codigoModulo: selectedModuloCode,
      payload: {
        id_atributo: Number(assignForm.id_atributo),
        grupo_visual: targetSection,
        orden_visual: autoOrder,
        obligatorio: assignForm.obligatorio,
        es_kpi: assignForm.es_kpi,
        es_filtrable: assignForm.es_filtrable,
        visible_en_pdf: assignForm.visible_en_pdf,
      },
    });
    setShowAssignModal(false);
  };

  const handleSaveInPlace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModuloCode) return;

    const isSelect =
      inPlaceForm.tipo_control === 'SELECTOR' || inPlaceForm.tipo_control === 'SELECT';
    const isNumMag = inPlaceForm.tipo_control === 'NUMERICO_MAGNITUD';

    const opciones_json =
      isSelect && inPlaceForm.opciones_csv.trim()
        ? inPlaceForm.opciones_csv
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
            .map((item) => ({
              valor: item.toUpperCase().replace(/\s+/g, '_'),
              etiqueta: item,
            }))
        : undefined;

    // 1. Crear el campo técnico en el Catálogo General
    const nuevoAtributo = await createAttrMut.mutateAsync({
      codigo_atributo: inPlaceForm.codigo_atributo,
      nombre_atributo: inPlaceForm.nombre_atributo,
      tipo_control: inPlaceForm.tipo_control,
      id_magnitud:
        isNumMag && inPlaceForm.id_magnitud ? Number(inPlaceForm.id_magnitud) : undefined,
      unidad_defecto_codigo:
        isNumMag && inPlaceForm.unidad_defecto_codigo
          ? inPlaceForm.unidad_defecto_codigo
          : undefined,
      opciones_json,
    });

    // 2. Asignar inmediatamente a la Parte / Subsistema activo con orden auto-calculado
    const allItems = moduloDetalle?.modulo_atributos || [];
    const targetSection = inPlaceForm.grupo_visual?.trim() || 'Especificaciones Técnicas';
    const sectionItems = allItems.filter((ma) => (ma.grupo_visual || 'General') === targetSection);
    const maxOrder = sectionItems.reduce((max, ma) => Math.max(max, ma.orden_visual || 0), 0);
    const autoOrder = maxOrder + 10;

    await asignarMut.mutateAsync({
      codigoModulo: selectedModuloCode,
      payload: {
        id_atributo: nuevoAtributo.id_atributo,
        grupo_visual: targetSection,
        orden_visual: autoOrder,
        obligatorio: inPlaceForm.obligatorio,
        es_kpi: inPlaceForm.es_kpi,
        es_filtrable: inPlaceForm.es_filtrable,
        visible_en_pdf: inPlaceForm.visible_en_pdf,
      },
    });

    setShowInPlaceModal(false);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200">
        <Loader2 className="h-9 w-9 animate-spin text-blue-600 mb-3" />
        <p className="text-sm font-medium text-slate-600">Cargando Partes y Subsistemas...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* COLUMNA IZQUIERDA: LISTA DE PARTES Y SUBSISTEMAS (STICKY CON SPOTLIGHT SELECCIONADO ARRIBA) */}
      <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col sticky top-4 max-h-[calc(100vh-120px)]">
        {/* Cabecera */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Boxes className="h-5 w-5 text-blue-600" />
              <span>Partes y Subsistemas ({modulos.length})</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Secciones reutilizables de fichas técnicas
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenNewMod}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Nueva Parte</span>
          </button>
        </div>

        {/* Buscador Rápido de Partes */}
        <div className="p-3 bg-slate-50/80 border-b border-slate-100 space-y-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar parte o subsistema..."
              value={searchModQuery}
              onChange={(e) => setSearchModQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setSearchModQuery('');
              }}
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs font-medium"
            />
            {searchModQuery && (
              <button
                type="button"
                onClick={() => setSearchModQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                title="Limpiar búsqueda (Esc)"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {searchModQuery.trim() && (
            <div className="flex items-center justify-between px-1 text-[11px] text-slate-500">
              <span>
                Mostrando{' '}
                <strong className="text-blue-600 font-bold">{modulosFiltrados.length}</strong> de{' '}
                {modulos.length} partes
              </span>
              <button
                type="button"
                onClick={() => setSearchModQuery('')}
                className="text-blue-600 hover:underline font-semibold"
              >
                Restablecer
              </button>
            </div>
          )}
        </div>

        {/* Contenedor scrolleable: Subsistema Seleccionado arriba + Lista de otras partes */}
        <div className="overflow-y-auto flex-1 p-3 space-y-3">
          {/* APARTADO DESTACADO ARRIBA: SUBSISTEMA SELECCIONADO EN EDICIÓN */}
          {selectedModulo && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                  Subsistema Seleccionado
                </span>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md font-mono">
                  ACTIVO
                </span>
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50/70 border-2 border-blue-500/40 shadow-xs flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs ring-2 ring-white"
                      style={{ backgroundColor: selectedModulo.color_ui || '#3B82F6' }}
                    />
                    <span className="text-sm font-extrabold text-blue-950">
                      {selectedModulo.nombre_modulo}
                    </span>
                  </div>
                  {selectedModulo.descripcion && (
                    <p className="text-xs text-slate-600 leading-relaxed pt-0.5 line-clamp-2">
                      {selectedModulo.descripcion}
                    </p>
                  )}
                  <div className="pt-1.5 flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white text-[11px] font-bold shadow-2xs">
                      {selectedModulo._count?.modulo_atributos ?? 0} campos
                    </span>
                    <span className="text-[11px] font-mono text-slate-500 font-semibold">
                      {selectedModulo.codigo_modulo}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 pt-0.5">
                  <button
                    type="button"
                    onClick={() => handleOpenEditMod(selectedModulo)}
                    className="p-1.5 rounded-lg text-blue-700 hover:bg-blue-100 transition-colors"
                    title="Editar parte o subsistema"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteError(null);
                      setDeleteTarget(selectedModulo);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Eliminar parte o subsistema"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* OTRAS PARTES Y SUBSISTEMAS */}
          <div className="pt-1">
            <div className="px-1 pb-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {otrosModulos.length > 0
                ? `Otras Partes (${otrosModulos.length})`
                : 'Todas las Partes'}
            </div>

            {modulosFiltrados.length === 0 ? (
              <div className="p-6 text-center space-y-2 rounded-xl bg-slate-50 border border-slate-100">
                <Search className="h-5 w-5 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-700">Sin coincidencias</p>
                <p className="text-[11px] text-slate-400">
                  No hay resultados para &ldquo;{searchModQuery}&rdquo;
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {otrosModulos.map((mod) => {
                  const totalAttrs = mod._count?.modulo_atributos ?? 0;
                  return (
                    <div
                      key={mod.id_modulo}
                      onClick={() => setSelectedModuloCode(mod.codigo_modulo)}
                      className="p-3 rounded-xl cursor-pointer transition-all flex items-start justify-between gap-3 hover:bg-slate-50 border border-transparent hover:border-slate-200/80 group"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: mod.color_ui || '#3B82F6' }}
                          />
                          <span className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                            {mod.nombre_modulo}
                          </span>
                        </div>
                        {mod.descripcion && (
                          <p className="text-[11px] text-slate-500 leading-relaxed truncate">
                            {mod.descripcion}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold">
                          {totalAttrs}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditMod(mod);
                          }}
                          className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Editar parte o subsistema"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteError(null);
                            setDeleteTarget(mod);
                          }}
                          className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Eliminar parte o subsistema"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* COLUMNA DERECHA: CAMPOS TÉCNICOS CON SCROLL VERTICAL INTERNO */}
      <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col sticky top-4 max-h-[calc(100vh-120px)]">
        {loadingDetalle || !moduloDetalle ? (
          <div className="p-16 flex flex-col items-center justify-center flex-1">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-3" />
            <p className="text-sm text-slate-500">Cargando campos de la parte...</p>
          </div>
        ) : (
          <>
            {/* Cabecera Fija de la Parte Seleccionada */}
            <div className="p-5 border-b border-slate-100 bg-slate-50/80 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 shrink-0">
              <div className="space-y-1">
                <div className="flex items-center flex-wrap gap-2.5">
                  <Layers className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-bold text-slate-900">
                    {moduloDetalle.nombre_modulo}
                  </h3>
                  <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[11px] font-mono font-bold">
                    {moduloDetalle.codigo_modulo}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Elige qué campos son obligatorios al registrar el equipo, cuáles sirven para
                  filtrar, cuáles son KPI y cuáles se imprimen en el PDF.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={handleOpenAssignModal}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs transition-colors"
                >
                  <Plus className="h-4 w-4 text-blue-600" />
                  <span>Agregar Campo Existente</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setInPlaceForm({
                      codigo_atributo: '',
                      nombre_atributo: '',
                      tipo_control: 'NUMERICO_MAGNITUD',
                      id_magnitud: '',
                      unidad_defecto_codigo: '',
                      opciones_csv: '',
                      grupo_visual: gruposVisualesMap[0]?.[0] || 'Especificaciones Técnicas',
                      orden_visual: '20',
                      obligatorio: false,
                      es_kpi: false,
                      es_filtrable: true,
                      visible_en_pdf: true,
                    });
                    setShowInPlaceModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-sm transition-all"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>+ Crear Nuevo Campo aquí</span>
                </button>
              </div>
            </div>

            {/* Secciones Visuales de la Parte con Scroll Vertical Interno */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1 overscroll-contain">
              {gruposVisualesMap.length === 0 ? (
                <div className="p-12 text-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50">
                  <div className="w-12 h-12 mx-auto rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                    <Boxes className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-700">
                    Esta parte aún no tiene campos técnicos asignados
                  </p>
                  <p className="text-xs text-slate-400 mt-1 mb-4">
                    Usa los botones para vincular campos del catálogo global o crear campos
                    exclusivos para esta parte.
                  </p>
                  <div className="inline-flex flex-wrap items-center justify-center gap-2.5">
                    <button
                      type="button"
                      onClick={handleOpenAssignModal}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Agregar Campo Existente</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setInPlaceForm({
                          codigo_atributo: '',
                          nombre_atributo: '',
                          tipo_control: 'NUMERICO_MAGNITUD',
                          id_magnitud: '',
                          unidad_defecto_codigo: '',
                          opciones_csv: '',
                          grupo_visual: 'Especificaciones Técnicas',
                          orden_visual: '20',
                          obligatorio: false,
                          es_kpi: false,
                          es_filtrable: true,
                          visible_en_pdf: true,
                        });
                        setShowInPlaceModal(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs transition-colors"
                    >
                      <Sparkles className="h-4 w-4 text-blue-600" />
                      <span>Crear Nuevo Campo</span>
                    </button>
                  </div>
                </div>
              ) : (
                gruposVisualesMap.map(([grupoNombre, items]) => (
                  <div
                    key={grupoNombre}
                    className="rounded-xl border border-slate-200 overflow-hidden shadow-2xs"
                  >
                    <div className="px-5 py-3 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                        Sección de Ficha: {grupoNombre}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        {items.length} campos
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50/50 text-[11px] font-bold text-slate-500 uppercase">
                            <th
                              className="py-3 px-2 w-14 text-center"
                              title="Reordenar (arrastrar o flechas)"
                            >
                              Orden
                            </th>
                            <th className="py-3 px-4">Campo Técnico</th>
                            <th className="py-3 px-3">Tipo de Dato y Unidad</th>
                            <th className="py-3 px-3 text-center">Obligatorio</th>
                            <th className="py-3 px-3 text-center">Permitir Filtrar</th>
                            <th className="py-3 px-3 text-center">Destacar en Tarjeta (KPI)</th>
                            <th className="py-3 px-3 text-center">Imprimir en PDF</th>
                            <th className="py-3 px-4 text-right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                          {items.map((ma, idx) => {
                            const attr = ma.atributo;
                            const ctrlInfo = getTipoControlHumano(
                              attr.tipo_control,
                              Boolean(attr.id_magnitud || attr.unidad_defecto_codigo),
                            );
                            const isDragOver =
                              dragOverTarget?.grupoNombre === grupoNombre &&
                              dragOverTarget?.idx === idx;

                            return (
                              <tr
                                key={ma.id_modulo_atributo}
                                draggable
                                onDragStart={(e) => handleDragStart(grupoNombre, idx, e)}
                                onDragOver={(e) => handleDragOver(grupoNombre, idx, e)}
                                onDragEnd={handleDragEnd}
                                onDrop={() => handleDrop(grupoNombre, idx, items)}
                                className={`hover:bg-slate-50/80 transition-colors cursor-grab active:cursor-grabbing ${
                                  isDragOver ? 'border-t-2 !border-t-blue-500' : ''
                                }`}
                              >
                                {/* Grip Handle + Micro-flechas ↑ ↓ */}
                                <td className="py-2.5 px-2 text-center select-none">
                                  <div className="inline-flex items-center gap-1 justify-center">
                                    <span title="Arrastrar para mover de posición">
                                      <GripVertical className="h-4 w-4 text-slate-300 hover:text-slate-600 transition-colors cursor-grab" />
                                    </span>
                                    <div className="flex flex-col -space-y-0.5">
                                      <button
                                        type="button"
                                        disabled={idx === 0}
                                        onClick={() =>
                                          handleMoveField(grupoNombre, idx, idx - 1, items)
                                        }
                                        className="p-0.5 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-20 disabled:pointer-events-none transition-colors"
                                        title="Subir un puesto"
                                      >
                                        <ChevronUp className="h-3 w-3 stroke-[2.5]" />
                                      </button>
                                      <button
                                        type="button"
                                        disabled={idx === items.length - 1}
                                        onClick={() =>
                                          handleMoveField(grupoNombre, idx, idx + 1, items)
                                        }
                                        className="p-0.5 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-20 disabled:pointer-events-none transition-colors"
                                        title="Bajar un puesto"
                                      >
                                        <ChevronDown className="h-3 w-3 stroke-[2.5]" />
                                      </button>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3.5 px-4">
                                  <div className="font-bold text-slate-900 text-sm">
                                    {attr.nombre_atributo}
                                  </div>
                                  {attr.descripcion && (
                                    <div className="text-xs text-slate-500 mt-0.5">
                                      {attr.descripcion}
                                    </div>
                                  )}
                                </td>

                                <td className="py-3.5 px-3">
                                  <div className="flex flex-col gap-1 items-start">
                                    <span
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-bold ${ctrlInfo.badgeClass}`}
                                    >
                                      <span>{ctrlInfo.iconSymbol}</span>
                                      <span>{ctrlInfo.shortLabel}</span>
                                    </span>
                                    {attr.unidad_defecto_codigo && (
                                      <span className="text-[11px] text-blue-700 font-semibold">
                                        Unidad: {attr.unidad_defecto_codigo}
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* Switch Obligatorio */}
                                <td className="py-3.5 px-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleFlag(ma, 'obligatorio')}
                                    className={`inline-flex items-center justify-center w-9 h-5 rounded-full transition-colors ${
                                      ma.obligatorio ? 'bg-rose-600' : 'bg-slate-200'
                                    }`}
                                    title="Exigir este dato obligatoriamente al registrar el equipo"
                                  >
                                    <span
                                      className={`w-3.5 h-3.5 rounded-full bg-white shadow transform transition-transform ${
                                        ma.obligatorio ? 'translate-x-2' : '-translate-x-2'
                                      }`}
                                    />
                                  </button>
                                </td>

                                {/* Switch Permitir Filtrar */}
                                <td className="py-3.5 px-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleFlag(ma, 'es_filtrable')}
                                    className={`inline-flex items-center justify-center w-9 h-5 rounded-full transition-colors ${
                                      ma.es_filtrable ? 'bg-blue-600' : 'bg-slate-200'
                                    }`}
                                    title="Permitir buscar y filtrar equipos por este campo en el directorio"
                                  >
                                    <span
                                      className={`w-3.5 h-3.5 rounded-full bg-white shadow transform transition-transform ${
                                        ma.es_filtrable ? 'translate-x-2' : '-translate-x-2'
                                      }`}
                                    />
                                  </button>
                                </td>

                                {/* Switch Destacar en Tarjeta (KPI) */}
                                <td className="py-3.5 px-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleFlag(ma, 'es_kpi')}
                                    className={`inline-flex items-center justify-center w-9 h-5 rounded-full transition-colors ${
                                      ma.es_kpi ? 'bg-amber-500' : 'bg-slate-200'
                                    }`}
                                    title="Destacar como dato principal en la tarjeta del equipo y cabecera del PDF"
                                  >
                                    <span
                                      className={`w-3.5 h-3.5 rounded-full bg-white shadow transform transition-transform ${
                                        ma.es_kpi ? 'translate-x-2' : '-translate-x-2'
                                      }`}
                                    />
                                  </button>
                                </td>

                                {/* Switch Imprimir en PDF */}
                                <td className="py-3.5 px-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleFlag(ma, 'visible_en_pdf')}
                                    className={`inline-flex items-center justify-center w-9 h-5 rounded-full transition-colors ${
                                      ma.visible_en_pdf ? 'bg-emerald-600' : 'bg-slate-200'
                                    }`}
                                    title="Incluir este campo en la placa técnica del informe PDF"
                                  >
                                    <span
                                      className={`w-3.5 h-3.5 rounded-full bg-white shadow transform transition-transform ${
                                        ma.visible_en_pdf ? 'translate-x-2' : '-translate-x-2'
                                      }`}
                                    />
                                  </button>
                                </td>

                                <td className="py-3.5 px-4 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditAssignment(ma)}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                      title="Editar sección y configuración de este campo en esta parte"
                                    >
                                      <Edit3 className="h-4 w-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setUnassignTarget(ma)}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                      title="Quitar campo de esta parte"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* MODAL CREAR / EDITAR PARTE O SUBSISTEMA */}
      {showModModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h4 className="text-base font-bold text-slate-900">
                {editingMod
                  ? `Editar Parte: ${editingMod.nombre_modulo}`
                  : 'Nueva Parte o Subsistema'}
              </h4>
              <button
                type="button"
                onClick={() => setShowModModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSaveMod} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre de la Parte o Subsistema *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Tablero de Transferencia Automática (ATS)"
                  value={modForm.nombre_modulo}
                  onChange={(e) => {
                    const nombre = e.target.value;
                    const auto = editingMod
                      ? modForm.codigo_modulo
                      : isAutoCodigoModulo
                        ? generarCodigoParteModulo(nombre, codigosModulosExistentes)
                        : modForm.codigo_modulo;
                    setModForm({
                      ...modForm,
                      nombre_modulo: nombre,
                      codigo_modulo: auto,
                    });
                  }}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-medium"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Código Identificador *</label>
                  {!editingMod && (
                    <button
                      type="button"
                      onClick={() => {
                        const nuevoModo = !isAutoCodigoModulo;
                        setIsAutoCodigoModulo(nuevoModo);
                        if (nuevoModo) {
                          const auto = generarCodigoParteModulo(
                            modForm.nombre_modulo,
                            codigosModulosExistentes,
                          );
                          setModForm((prev) => ({ ...prev, codigo_modulo: auto }));
                        }
                      }}
                      className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      {isAutoCodigoModulo ? (
                        <Unlock className="h-3 w-3" />
                      ) : (
                        <Lock className="h-3 w-3" />
                      )}
                      <span>{isAutoCodigoModulo ? 'Personalizar código' : 'Auto-generar'}</span>
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  required
                  disabled={Boolean(editingMod) || isAutoCodigoModulo}
                  placeholder="Ej: tablero_transferencia_ats"
                  value={modForm.codigo_modulo}
                  onChange={(e) =>
                    setModForm({
                      ...modForm,
                      codigo_modulo: e.target.value.toLowerCase().replace(/\s+/g, '_'),
                    })
                  }
                  className={`w-full px-3.5 py-2 rounded-xl border font-mono text-xs transition-colors disabled:bg-slate-100 disabled:text-slate-600 ${
                    isCodigoModuloDuplicado
                      ? 'border-rose-400 bg-rose-50/20 text-rose-900 focus:ring-rose-500'
                      : 'border-slate-300'
                  }`}
                />
                {isCodigoModuloDuplicado ? (
                  <p className="text-[11px] text-rose-600 font-bold mt-1.5 flex items-center gap-1.5 animate-in fade-in">
                    ✕ Este código &ldquo;{modForm.codigo_modulo}&rdquo; ya existe. Modifícalo para
                    que sea único.
                  </p>
                ) : modForm.codigo_modulo && !editingMod ? (
                  <p className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1 animate-in fade-in">
                    ✓ Código único garantizado disponible
                  </p>
                ) : isAutoCodigoModulo && !editingMod ? (
                  <p className="text-[11px] text-slate-400 mt-1">
                    Generado automáticamente garantizando unicidad. Pulsa en &ldquo;Personalizar
                    código&rdquo; para editarlo.
                  </p>
                ) : null}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Descripción Breve
                </label>
                <textarea
                  rows={2}
                  value={modForm.descripcion}
                  onChange={(e) => setModForm({ ...modForm, descripcion: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={
                    createModMut.isPending ||
                    updateModMut.isPending ||
                    isCodigoModuloDuplicado ||
                    !modForm.nombre_modulo.trim() ||
                    !modForm.codigo_modulo.trim()
                  }
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Guardar Parte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL AGREGAR CAMPO EXISTENTE (SELECTOR PREMIUM BUSCABLE) */}
      {showAssignModal && moduloDetalle && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Cabecera del Modal */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 shadow-2xs">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900 leading-tight">
                    Agregar Campo Existente a {moduloDetalle.nombre_modulo}
                  </h4>
                  <p className="text-xs text-slate-500">
                    Busca en los {atributosDisponiblesParaAsignar.length} campos del catálogo
                    técnico global y vincúlalo en 1 clic.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSaveAssign} className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Buscador y Selector de Campos */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800">
                    1. Seleccionar Campo Técnico del Catálogo *
                  </label>
                  {(!selectedAtributoParaAsignar || assignSelectorOpen) && (
                    <span className="text-[11px] font-semibold text-slate-500">
                      {atributosDisponiblesFiltrados.length} de{' '}
                      {atributosDisponiblesParaAsignar.length} disponibles
                    </span>
                  )}
                </div>

                {selectedAtributoParaAsignar && !assignSelectorOpen ? (
                  /* Tarjeta compacta del campo seleccionado (selector colapsado para máxima fluidez y espacio) */
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50/90 to-indigo-50/90 border border-blue-200 flex items-center justify-between gap-3 text-xs text-blue-950 shadow-2xs animate-in fade-in duration-150">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Check className="h-4 w-4 stroke-[3]" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-900 truncate text-sm">
                            {selectedAtributoParaAsignar.nombre_atributo}
                          </p>
                          <span className="text-[10px] font-mono text-blue-700 bg-blue-100/90 px-2 py-0.5 rounded-md font-bold shrink-0">
                            {selectedAtributoParaAsignar.codigo_atributo}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 font-medium">
                          <span>
                            {
                              getTipoControlHumano(
                                selectedAtributoParaAsignar.tipo_control,
                                Boolean(selectedAtributoParaAsignar.id_magnitud),
                              ).shortLabel
                            }
                          </span>
                          {selectedAtributoParaAsignar.magnitud && (
                            <span>
                              • {selectedAtributoParaAsignar.magnitud.nombre_magnitud} (
                              {selectedAtributoParaAsignar.unidad_defecto_codigo || 'Estándar'})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAssignSelectorOpen(true)}
                      className="px-3 py-1.5 rounded-xl border border-blue-300 text-blue-700 bg-white hover:bg-blue-50 font-bold text-xs transition-colors shrink-0 shadow-2xs cursor-pointer"
                    >
                      Cambiar campo
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Input Buscador */}
                    <div className="relative">
                      <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={assignSearch}
                        onChange={(e) => setAssignSearch(e.target.value)}
                        placeholder="Buscar por nombre, código o magnitud (ej: Capacidad, Gas, Presión, Potencia)..."
                        className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white shadow-2xs"
                        autoFocus
                      />
                      {assignSearch && (
                        <button
                          type="button"
                          onClick={() => setAssignSearch('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Filtros Rápidos por Tipo de Dato */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className="text-slate-400 font-semibold mr-1">Filtrar:</span>
                      <button
                        type="button"
                        onClick={() => setAssignTypeFilter('ALL')}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                          assignTypeFilter === 'ALL'
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Todos ({atributosDisponiblesParaAsignar.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setAssignTypeFilter('NUM_MAG')}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                          assignTypeFilter === 'NUM_MAG'
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        # Con Unidad
                      </button>
                      <button
                        type="button"
                        onClick={() => setAssignTypeFilter('SELECT')}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                          assignTypeFilter === 'SELECT'
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        ☰ Listas
                      </button>
                      <button
                        type="button"
                        onClick={() => setAssignTypeFilter('BOOL')}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                          assignTypeFilter === 'BOOL'
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        ✓ Sí / No
                      </button>
                      <button
                        type="button"
                        onClick={() => setAssignTypeFilter('OTROS')}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                          assignTypeFilter === 'OTROS'
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Aa Texto / Simple
                      </button>
                    </div>

                    {/* Lista de Campos Desplegables / Scroll */}
                    <div className="max-h-52 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white shadow-2xs overscroll-contain">
                      {atributosDisponiblesFiltrados.length === 0 ? (
                        <div className="p-6 text-center text-slate-400">
                          <p className="text-xs font-semibold">
                            No se encontraron campos con &ldquo;{assignSearch}&rdquo;
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setShowAssignModal(false);
                              setInPlaceForm({
                                codigo_atributo: '',
                                nombre_atributo: assignSearch,
                                tipo_control: 'NUMERICO_MAGNITUD',
                                id_magnitud: '',
                                unidad_defecto_codigo: '',
                                opciones_csv: '',
                                grupo_visual:
                                  assignForm.grupo_visual || 'Especificaciones Técnicas',
                                orden_visual: '20',
                                obligatorio: false,
                                es_kpi: false,
                                es_filtrable: true,
                                visible_en_pdf: true,
                              });
                              setShowInPlaceModal(true);
                            }}
                            className="mt-2 text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1"
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                            Crear &ldquo;{assignSearch || 'nuevo campo'}&rdquo; desde cero aquí
                          </button>
                        </div>
                      ) : (
                        atributosDisponiblesFiltrados.map((a) => {
                          const isSelected =
                            String(assignForm.id_atributo) === String(a.id_atributo);
                          const info = getTipoControlHumano(a.tipo_control, Boolean(a.id_magnitud));
                          const opts = Array.isArray(a.opciones_json) ? a.opciones_json : [];
                          return (
                            <div
                              key={a.id_atributo}
                              onClick={() => {
                                setAssignForm({
                                  ...assignForm,
                                  id_atributo: String(a.id_atributo),
                                });
                                setAssignSelectorOpen(false);
                              }}
                              className={`p-3 cursor-pointer flex items-center justify-between gap-3 transition-colors ${
                                isSelected
                                  ? 'bg-blue-50/90 border-l-4 border-l-blue-600 text-blue-950 font-semibold'
                                  : 'hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div
                                  className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                                    isSelected
                                      ? 'border-blue-600 bg-blue-600 text-white'
                                      : 'border-slate-300 bg-white'
                                  }`}
                                >
                                  {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold truncate leading-snug">
                                    {a.nombre_atributo}
                                  </p>
                                  <p className="text-[10px] font-mono text-slate-400 truncate">
                                    {a.codigo_atributo}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${info.badgeClass}`}
                                >
                                  <span>{info.iconSymbol}</span>
                                  <span>{info.shortLabel}</span>
                                </span>
                                {a.magnitud && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                    {a.magnitud.nombre_magnitud}
                                    {a.unidad_defecto_codigo ? ` (${a.unidad_defecto_codigo})` : ''}
                                  </span>
                                )}
                                {opts.length > 0 && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                    {opts.length} opciones
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Sección en la Ficha Técnica — Selección por Píldoras (Cero Texto Libre por defecto) */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800">
                    2. ¿En qué sección de la ficha aparecerá este campo?
                  </label>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {assignSectionMode === 'existing' ? (
                      <span className="text-blue-700 font-bold inline-flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                        <Check className="h-3 w-3 stroke-[3] text-blue-600" />
                        Sección: {assignForm.grupo_visual}
                      </span>
                    ) : (
                      <span className="text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                        Nueva sub-sección personalizada
                      </span>
                    )}
                  </span>
                </div>

                {/* Lista de píldoras / tarjetas interactivas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {seccionesDisponibles.map((sec) => {
                    const isActive =
                      assignSectionMode === 'existing' && assignForm.grupo_visual === sec.name;
                    return (
                      <button
                        key={sec.name}
                        type="button"
                        onClick={() => handleSelectAssignSection(sec.name)}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          isActive
                            ? 'bg-blue-50/90 border-blue-500 shadow-2xs ring-2 ring-blue-500/20'
                            : 'bg-slate-50/50 border-slate-200 hover:bg-slate-100/70 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                              isActive
                                ? 'border-blue-600 bg-blue-600 text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isActive && <Check className="h-3 w-3 stroke-[3]" />}
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-800 block truncate">
                              {sec.name}
                            </span>
                            <span className="text-[10px] text-slate-500">{sec.desc}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  {/* Botón "+ Nueva sub-sección" */}
                  <button
                    type="button"
                    onClick={() => {
                      setAssignSectionMode('new');
                      setAssignNewSection('');
                      setAssignForm((prev) => ({ ...prev, grupo_visual: '' }));
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      assignSectionMode === 'new'
                        ? 'bg-blue-50/90 border-blue-500 shadow-2xs ring-2 ring-blue-500/20'
                        : 'bg-slate-50/50 border-dashed border-slate-300 hover:bg-slate-100/70 hover:border-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                          assignSectionMode === 'new'
                            ? 'border-blue-600 bg-blue-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {assignSectionMode === 'new' ? (
                          <Check className="h-3 w-3 stroke-[3]" />
                        ) : (
                          <Plus className="h-3 w-3 text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-700 block">
                          + Nueva sub-sección
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Escribir nombre personalizado
                        </span>
                      </div>
                    </div>
                  </button>
                </div>

                {/* Input condicional (Solo se despliega si pulsa intencionalmente "+ Nueva sub-sección") */}
                {assignSectionMode === 'new' && (
                  <div className="pt-1.5 animate-in fade-in duration-150">
                    <input
                      type="text"
                      required
                      placeholder="Escribe el nombre de la nueva sección (ej: Refrigeración, Controles Eléctricos...)"
                      value={assignNewSection}
                      onChange={(e) => {
                        setAssignNewSection(e.target.value);
                        setAssignForm((prev) => ({ ...prev, grupo_visual: e.target.value }));
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-blue-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white shadow-2xs"
                      autoFocus
                    />
                  </div>
                )}
              </div>

              {/* Comportamiento del Campo (4 Switches Modernos) */}
              <div className="space-y-2 pt-1">
                <label className="block text-xs font-bold text-slate-800">
                  3. Comportamiento del Campo en la Plataforma
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Switch Obligatorio */}
                  <div
                    onClick={() =>
                      setAssignForm({ ...assignForm, obligatorio: !assignForm.obligatorio })
                    }
                    className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between gap-2 transition-all ${
                      assignForm.obligatorio
                        ? 'bg-rose-50/70 border-rose-300 shadow-2xs'
                        : 'bg-slate-50/50 border-slate-200 hover:bg-slate-100/60'
                    }`}
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">
                        Obligatorio al Registrar
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Exige valor al dar de alta el equipo
                      </span>
                    </div>
                    <div
                      className={`inline-flex items-center w-8 h-4.5 rounded-full transition-colors shrink-0 ${
                        assignForm.obligatorio ? 'bg-rose-600' : 'bg-slate-200'
                      }`}
                    >
                      <span
                        className={`w-3.5 h-3.5 rounded-full bg-white shadow transform transition-transform ${
                          assignForm.obligatorio ? 'translate-x-3.5' : 'translate-x-0.5'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Switch Permitir Filtrar */}
                  <div
                    onClick={() =>
                      setAssignForm({ ...assignForm, es_filtrable: !assignForm.es_filtrable })
                    }
                    className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between gap-2 transition-all ${
                      assignForm.es_filtrable
                        ? 'bg-blue-50/70 border-blue-300 shadow-2xs'
                        : 'bg-slate-50/50 border-slate-200 hover:bg-slate-100/60'
                    }`}
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">
                        Permitir Filtrar
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Búsqueda avanzada en /equipos
                      </span>
                    </div>
                    <div
                      className={`inline-flex items-center w-8 h-4.5 rounded-full transition-colors shrink-0 ${
                        assignForm.es_filtrable ? 'bg-blue-600' : 'bg-slate-200'
                      }`}
                    >
                      <span
                        className={`w-3.5 h-3.5 rounded-full bg-white shadow transform transition-transform ${
                          assignForm.es_filtrable ? 'translate-x-3.5' : 'translate-x-0.5'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Switch Destacar KPI */}
                  <div
                    onClick={() => setAssignForm({ ...assignForm, es_kpi: !assignForm.es_kpi })}
                    className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between gap-2 transition-all ${
                      assignForm.es_kpi
                        ? 'bg-amber-50/70 border-amber-300 shadow-2xs'
                        : 'bg-slate-50/50 border-slate-200 hover:bg-slate-100/60'
                    }`}
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">
                        Destacar en Tarjeta (KPI)
                      </span>
                      <span className="text-[10px] text-slate-500">Resaltar en cabecera y PDF</span>
                    </div>
                    <div
                      className={`inline-flex items-center w-8 h-4.5 rounded-full transition-colors shrink-0 ${
                        assignForm.es_kpi ? 'bg-amber-500' : 'bg-slate-200'
                      }`}
                    >
                      <span
                        className={`w-3.5 h-3.5 rounded-full bg-white shadow transform transition-transform ${
                          assignForm.es_kpi ? 'translate-x-3.5' : 'translate-x-0.5'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Switch Imprimir en PDF */}
                  <div
                    onClick={() =>
                      setAssignForm({ ...assignForm, visible_en_pdf: !assignForm.visible_en_pdf })
                    }
                    className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between gap-2 transition-all ${
                      assignForm.visible_en_pdf
                        ? 'bg-emerald-50/70 border-emerald-300 shadow-2xs'
                        : 'bg-slate-50/50 border-slate-200 hover:bg-slate-100/60'
                    }`}
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">
                        Imprimir en PDF
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Placa técnica del informe de OT
                      </span>
                    </div>
                    <div
                      className={`inline-flex items-center w-8 h-4.5 rounded-full transition-colors shrink-0 ${
                        assignForm.visible_en_pdf ? 'bg-emerald-600' : 'bg-slate-200'
                      }`}
                    >
                      <span
                        className={`w-3.5 h-3.5 rounded-full bg-white shadow transform transition-transform ${
                          assignForm.visible_en_pdf ? 'translate-x-3.5' : 'translate-x-0.5'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Botonera Inferior */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
                <div className="text-xs text-slate-500">
                  {!assignForm.id_atributo && (
                    <span className="text-amber-600 font-semibold flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4" />
                      Selecciona un campo para continuar
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowAssignModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={!assignForm.id_atributo || asignarMut.isPending}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-sm transition-all inline-flex items-center gap-2"
                  >
                    {asignarMut.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Agregando a la Parte...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        <span>Agregar a {moduloDetalle.nombre_modulo}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CREAR NUEVO CAMPO Y ASIGNAR EN UN PASO */}
      {showInPlaceModal && moduloDetalle && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                <div>
                  <h4 className="text-sm font-bold">
                    Crear Nuevo Campo Técnico para {moduloDetalle.nombre_modulo}
                  </h4>
                  <p className="text-[11px] text-blue-100">
                    Se guardará en el Catálogo General y quedará asignado a esta parte de inmediato.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInPlaceModal(false)}
                className="p-1.5 rounded-lg text-white/80 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveInPlace} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre del Campo Técnico *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Temperatura Máxima de Devanado"
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tipo de Dato *
                  </label>
                  <EamSelect
                    value={inPlaceForm.tipo_control}
                    onChange={(val) => setInPlaceForm({ ...inPlaceForm, tipo_control: val })}
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
                      className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      {isAutoCodigoAtributo ? (
                        <Unlock className="h-3 w-3" />
                      ) : (
                        <Lock className="h-3 w-3" />
                      )}
                      <span>{isAutoCodigoAtributo ? 'Personalizar' : 'Auto'}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    disabled={isAutoCodigoAtributo}
                    placeholder="Ej: temperatura_devanado_c"
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-blue-50/70 p-4 rounded-xl border border-blue-200">
                  <div>
                    <label className="block text-xs font-bold text-blue-900 mb-1">
                      Magnitud de Medida
                    </label>
                    <EamSelect
                      value={inPlaceForm.id_magnitud}
                      onChange={(idMag) => {
                        const magObj = magnitudes.find((m) => String(m.id_magnitud) === idMag);
                        const nuevaU = magObj?.unidad_base_codigo || '';
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
                          label: m.nombre_magnitud,
                          badge: m.unidad_base_codigo,
                        })),
                      ]}
                      placeholder="-- Seleccionar Magnitud --"
                      searchable
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-blue-900 mb-1">
                      Unidad por Defecto
                    </label>
                    <EamSelect
                      value={inPlaceForm.unidad_defecto_codigo}
                      onChange={(nuevaU) => {
                        const auto = isAutoCodigoAtributo
                          ? generarCodigoCampoTecnico(
                              inPlaceForm.nombre_atributo,
                              codigosAtributosExistentes,
                              nuevaU || undefined,
                            )
                          : inPlaceForm.codigo_atributo;
                        setInPlaceForm({
                          ...inPlaceForm,
                          unidad_defecto_codigo: nuevaU,
                          codigo_atributo: auto,
                        });
                      }}
                      options={[
                        { value: '', label: '-- Seleccionar Unidad --' },
                        ...(magnitudInPlaceObj?.unidades_medida || []).map((u) => ({
                          value: u.codigo,
                          label: `${u.nombre} (${u.simbolo})`,
                          badge: u.simbolo,
                        })),
                      ]}
                      placeholder="-- Seleccionar Unidad --"
                      searchable
                    />
                  </div>
                </div>
              )}

              {(inPlaceForm.tipo_control === 'SELECTOR' ||
                inPlaceForm.tipo_control === 'SELECT') && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Opciones de la Lista (separadas por coma) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: IP23, IP54, IP55, IP68"
                    value={inPlaceForm.opciones_csv}
                    onChange={(e) =>
                      setInPlaceForm({ ...inPlaceForm, opciones_csv: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Sección en la Ficha Técnica ({moduloDetalle.nombre_modulo}) *
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Especificaciones Técnicas',
                    'Desempeño y Capacidad',
                    'Identificación',
                    'Control y Seguridad',
                  ].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setInPlaceForm({ ...inPlaceForm, grupo_visual: sec })}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                        inPlaceForm.grupo_visual === sec
                          ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold shadow-2xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {sec}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  required
                  placeholder="O escribe otra sección personalizada..."
                  value={inPlaceForm.grupo_visual}
                  onChange={(e) => setInPlaceForm({ ...inPlaceForm, grupo_visual: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-6 pt-1">
                <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={inPlaceForm.obligatorio}
                    onChange={(e) =>
                      setInPlaceForm({ ...inPlaceForm, obligatorio: e.target.checked })
                    }
                    className="rounded text-blue-600"
                  />
                  <span>Obligatorio</span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={inPlaceForm.es_kpi}
                    onChange={(e) => setInPlaceForm({ ...inPlaceForm, es_kpi: e.target.checked })}
                    className="rounded text-blue-600"
                  />
                  <span>Destacar (KPI)</span>
                </label>
              </div>

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
                    createAttrMut.isPending ||
                    asignarMut.isPending ||
                    isCodigoAtributoDuplicado ||
                    !inPlaceForm.nombre_atributo.trim() ||
                    !inPlaceForm.codigo_atributo.trim()
                  }
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="h-4 w-4" />
                  <span>Guardar y Asignar Campo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE ADVERTENCIA Y CONFIRMACIÓN DE ELIMINACIÓN DE PARTE O SUBSISTEMA */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-rose-100 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 pt-6 pb-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-base font-bold text-slate-900">
                  ¿Eliminar Parte o Subsistema?
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">Confirmación de seguridad requerida</p>
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
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: deleteTarget.color_ui || '#3B82F6' }}
                    />
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {deleteTarget.nombre_modulo}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 font-bold shrink-0">
                    {deleteTarget.codigo_modulo}
                  </span>
                </div>
                {deleteTarget.descripcion && (
                  <p className="text-[11px] text-slate-500 font-medium line-clamp-2">
                    {deleteTarget.descripcion}
                  </p>
                )}
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-amber-900">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <strong className="font-bold">Advertencia de integridad:</strong> La parte no debe
                  estar vinculada a tipos de equipo existentes. Al eliminarla, se removerán sus
                  configuraciones de sección respetando los históricos de órdenes.
                </div>
              </div>

              {deleteError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="font-medium leading-relaxed">{deleteError}</div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end gap-2.5 mt-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteError(null);
                }}
                disabled={deleteModMut.isPending}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-white hover:border-slate-400 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteModMut.isPending}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
              >
                {deleteModMut.isPending ? (
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

      {/* MODAL CONFIRMACIÓN PRÉMIUM PARA QUITAR CAMPO DE ESTA PARTE */}
      {unassignTarget && moduloDetalle && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-rose-100 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 pt-6 pb-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-base font-bold text-slate-900">¿Quitar Campo de esta Parte?</h4>
                <p className="text-xs text-slate-500 mt-0.5">Confirmación de desvinculación</p>
              </div>
              <button
                type="button"
                onClick={() => setUnassignTarget(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-6 py-2 space-y-3.5">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 truncate">
                    {unassignTarget.atributo.nombre_atributo}
                  </span>
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 font-bold shrink-0">
                    {unassignTarget.atributo.codigo_atributo}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 flex items-center gap-2">
                  <span>
                    Parte: <strong className="text-slate-700">{moduloDetalle.nombre_modulo}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Sección:{' '}
                    <strong className="text-slate-700">
                      {unassignTarget.grupo_visual || 'General'}
                    </strong>
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 flex items-start gap-2.5 text-blue-900">
                <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <strong className="font-bold">No destructivo:</strong> Esta acción únicamente
                  retira este campo de la ficha de{' '}
                  <span className="font-medium">{moduloDetalle.nombre_modulo}</span>. El campo
                  técnico y su historial permanecerán intactos en el Catálogo Global (Pestaña 4).
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end gap-2.5 mt-2">
              <button
                type="button"
                onClick={() => setUnassignTarget(null)}
                disabled={desasignarMut.isPending}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-white hover:border-slate-400 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmUnassign}
                disabled={desasignarMut.isPending}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
              >
                {desasignarMut.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                <span>Sí, Quitar de esta Parte</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDITAR ASIGNACIÓN DE CAMPO EN ESTA PARTE */}
      {editingAssignment && moduloDetalle && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Cabecera */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Edit3 className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Editar Configuración de Campo
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Parte: <strong className="text-slate-700">{moduloDetalle.nombre_modulo}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingAssignment(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditAssignment} className="p-6 space-y-5 overflow-y-auto">
              {/* Ficha Resumen del Campo */}
              <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-100 flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    {editingAssignment.atributo.nombre_atributo}
                  </span>
                  <span className="font-mono text-[10px] text-slate-500">
                    {editingAssignment.atributo.codigo_atributo}
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border bg-white border-blue-200 text-blue-700">
                  {
                    getTipoControlHumano(
                      editingAssignment.atributo.tipo_control,
                      Boolean(
                        editingAssignment.atributo.id_magnitud ||
                          editingAssignment.atributo.unidad_defecto_codigo,
                      ),
                    ).shortLabel
                  }
                </span>
              </div>

              {/* Sección en la Ficha Técnica */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800">
                    ¿En qué sección de la ficha debe aparecer?
                  </label>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {editAssignSectionMode === 'existing' ? (
                      <span className="text-blue-700 font-bold inline-flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                        <Check className="h-3 w-3 stroke-[3] text-blue-600" />
                        Sección: {editAssignForm.grupo_visual}
                      </span>
                    ) : (
                      <span className="text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                        Nueva sub-sección personalizada
                      </span>
                    )}
                  </span>
                </div>

                {/* Grid de píldoras de secciones */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {seccionesDisponibles.map((sec) => {
                    const isActive =
                      editAssignSectionMode === 'existing' &&
                      editAssignForm.grupo_visual === sec.name;
                    return (
                      <button
                        key={sec.name}
                        type="button"
                        onClick={() => {
                          setEditAssignSectionMode('existing');
                          setEditAssignNewSection('');
                          setEditAssignForm((prev) => ({ ...prev, grupo_visual: sec.name }));
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          isActive
                            ? 'bg-blue-50/90 border-blue-500 shadow-2xs ring-2 ring-blue-500/20'
                            : 'bg-slate-50/50 border-slate-200 hover:bg-slate-100/70 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                              isActive
                                ? 'border-blue-600 bg-blue-600 text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isActive && <Check className="h-3 w-3 stroke-[3]" />}
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-800 block truncate">
                              {sec.name}
                            </span>
                            <span className="text-[10px] text-slate-500">{sec.desc}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  {/* Opción "+ Nueva sub-sección" */}
                  <button
                    type="button"
                    onClick={() => {
                      setEditAssignSectionMode('new');
                      setEditAssignNewSection('');
                      setEditAssignForm((prev) => ({ ...prev, grupo_visual: '' }));
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      editAssignSectionMode === 'new'
                        ? 'bg-blue-50/90 border-blue-500 shadow-2xs ring-2 ring-blue-500/20'
                        : 'bg-slate-50/50 border-dashed border-slate-300 hover:bg-slate-100/70 hover:border-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                          editAssignSectionMode === 'new'
                            ? 'border-blue-600 bg-blue-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {editAssignSectionMode === 'new' ? (
                          <Check className="h-3 w-3 stroke-[3]" />
                        ) : (
                          <Plus className="h-3 w-3 text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-700 block">
                          + Nueva sub-sección
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Escribir nombre personalizado
                        </span>
                      </div>
                    </div>
                  </button>
                </div>

                {editAssignSectionMode === 'new' && (
                  <div className="pt-1.5 animate-in fade-in duration-150">
                    <input
                      type="text"
                      required
                      placeholder="Escribe el nombre de la nueva sección (ej: Control de Cabina, Guiado...)"
                      value={editAssignNewSection}
                      onChange={(e) => {
                        setEditAssignNewSection(e.target.value);
                        setEditAssignForm((prev) => ({ ...prev, grupo_visual: e.target.value }));
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-blue-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white shadow-2xs"
                      autoFocus
                    />
                  </div>
                )}
              </div>

              {/* Comportamiento del Campo (4 Switches) */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  Comportamiento del Campo en la Plataforma
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Switch Obligatorio */}
                  <div
                    onClick={() =>
                      setEditAssignForm({
                        ...editAssignForm,
                        obligatorio: !editAssignForm.obligatorio,
                      })
                    }
                    className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between gap-2 transition-all ${
                      editAssignForm.obligatorio
                        ? 'bg-rose-50/70 border-rose-300 shadow-2xs'
                        : 'bg-slate-50/50 border-slate-200 hover:bg-slate-100/60'
                    }`}
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">
                        Obligatorio al Registrar
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Exige valor al dar de alta el equipo
                      </span>
                    </div>
                    <div
                      className={`inline-flex items-center w-8 h-4.5 rounded-full transition-colors shrink-0 ${
                        editAssignForm.obligatorio ? 'bg-rose-600' : 'bg-slate-200'
                      }`}
                    >
                      <span
                        className={`w-3.5 h-3.5 rounded-full bg-white shadow transform transition-transform ${
                          editAssignForm.obligatorio ? 'translate-x-3.5' : 'translate-x-0.5'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Switch Permitir Filtrar */}
                  <div
                    onClick={() =>
                      setEditAssignForm({
                        ...editAssignForm,
                        es_filtrable: !editAssignForm.es_filtrable,
                      })
                    }
                    className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between gap-2 transition-all ${
                      editAssignForm.es_filtrable
                        ? 'bg-blue-50/70 border-blue-300 shadow-2xs'
                        : 'bg-slate-50/50 border-slate-200 hover:bg-slate-100/60'
                    }`}
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">
                        Permitir Filtrar
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Búsqueda avanzada en /equipos
                      </span>
                    </div>
                    <div
                      className={`inline-flex items-center w-8 h-4.5 rounded-full transition-colors shrink-0 ${
                        editAssignForm.es_filtrable ? 'bg-blue-600' : 'bg-slate-200'
                      }`}
                    >
                      <span
                        className={`w-3.5 h-3.5 rounded-full bg-white shadow transform transition-transform ${
                          editAssignForm.es_filtrable ? 'translate-x-3.5' : 'translate-x-0.5'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Switch Destacar KPI */}
                  <div
                    onClick={() =>
                      setEditAssignForm({ ...editAssignForm, es_kpi: !editAssignForm.es_kpi })
                    }
                    className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between gap-2 transition-all ${
                      editAssignForm.es_kpi
                        ? 'bg-amber-50/70 border-amber-300 shadow-2xs'
                        : 'bg-slate-50/50 border-slate-200 hover:bg-slate-100/60'
                    }`}
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">
                        Destacar en Tarjeta (KPI)
                      </span>
                      <span className="text-[10px] text-slate-500">Resaltar en cabecera y PDF</span>
                    </div>
                    <div
                      className={`inline-flex items-center w-8 h-4.5 rounded-full transition-colors shrink-0 ${
                        editAssignForm.es_kpi ? 'bg-amber-500' : 'bg-slate-200'
                      }`}
                    >
                      <span
                        className={`w-3.5 h-3.5 rounded-full bg-white shadow transform transition-transform ${
                          editAssignForm.es_kpi ? 'translate-x-3.5' : 'translate-x-0.5'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Switch Imprimir en PDF */}
                  <div
                    onClick={() =>
                      setEditAssignForm({
                        ...editAssignForm,
                        visible_en_pdf: !editAssignForm.visible_en_pdf,
                      })
                    }
                    className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between gap-2 transition-all ${
                      editAssignForm.visible_en_pdf
                        ? 'bg-emerald-50/70 border-emerald-300 shadow-2xs'
                        : 'bg-slate-50/50 border-slate-200 hover:bg-slate-100/60'
                    }`}
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">
                        Imprimir en PDF
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Placa técnica del informe de OT
                      </span>
                    </div>
                    <div
                      className={`inline-flex items-center w-8 h-4.5 rounded-full transition-colors shrink-0 ${
                        editAssignForm.visible_en_pdf ? 'bg-emerald-600' : 'bg-slate-200'
                      }`}
                    >
                      <span
                        className={`w-3.5 h-3.5 rounded-full bg-white shadow transform transition-transform ${
                          editAssignForm.visible_en_pdf ? 'translate-x-3.5' : 'translate-x-0.5'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingAssignment(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={
                    updateFlagMut.isPending ||
                    (editAssignSectionMode === 'new' && !editAssignNewSection.trim())
                  }
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50"
                >
                  {updateFlagMut.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  <span>Guardar Configuración</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
