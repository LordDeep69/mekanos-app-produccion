/**
 * FICHA TÉCNICA POLIMÓRFICA EAM 360° (FASE 4) - MEKANOS S.A.S
 *
 * Renderiza con diseño industrial de alta legibilidad la Placa de Especificaciones
 * de cualquier Tipo de Equipo (Generador, Bomba, Motor, Compresor ID 214 o nuevos arquetipos)
 * unificando:
 * - `equipo.especificaciones` (JSONB modular)
 * - `equipo.datos_especificos` + `equipo.motor` (tablas satélite)
 * - Esquema dinámico del Tipo de Equipo (`useArquetipoEsquemaEam`)
 *
 * Incluye:
 * - Cabecera de Indicadores Principales de Placa (KPIs)
 * - Equivalencias metrológicas automáticas (Litros ≈ Galones, PSI ≈ bar, m³/h ≈ GPM, kW ≈ HP)
 * - Tarjetas estructuradas por Parte / Subsistema y Sección (`grupo_visual`)
 * - Modal de Edición Rápida en Caliente con `<DynamicModularSpecsEditor />` conectado a
 *   `PATCH /api/equipos/:id/datos-especificos` (actualiza JSONB, satélites e índice B-Tree)
 */

'use client';

import {
  getModuloBadgeInfo,
  humanizeFallbackKey,
  parseOpcionesSeguras,
  useArquetipoEsquemaEam,
  useArquetiposEam,
} from '@/features/catalogos-eam';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  Cpu,
  Edit3,
  Factory,
  Gauge,
  Layers,
  Loader2,
  Save,
  Scale,
  Sparkles,
  Star,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useActualizarDatosEspecificos } from '../lib/equipos.service';
import type { EquipoDetalle } from '../types';
import { DynamicModularSpecsEditor } from './DynamicModularSpecsEditor';

export interface FichaTecnicaPolimorficaEamProps {
  equipo: EquipoDetalle;
  onUpdated?: () => void;
}

function isMeaningfulValue(val: unknown): boolean {
  if (val === null || val === undefined || val === '') return false;
  const s = String(val).trim();
  if (!s) return false;
  const upper = s.toUpperCase();
  return upper !== 'NULL' && upper !== 'UNDEFINED' && upper !== 'N/A';
}

function formatEquivalenciaAutomatica(
  val: unknown,
  unidadCodigo?: string | null,
  codigoAtributo?: string,
): string | null {
  const num = Number(val);
  if (!Number.isFinite(num) || num <= 0) return null;
  const u = (unidadCodigo || '').toUpperCase().trim();
  const attr = (codigoAtributo || '').toLowerCase();

  // Litros -> Galones
  if (u === 'L' || attr.endsWith('_l') || attr.endsWith('_litros')) {
    return `≈ ${(num / 3.78541178).toFixed(1)} gal`;
  }
  // Galones -> Litros
  if (u === 'GAL' || attr.endsWith('_galones')) {
    return `≈ ${(num * 3.78541178).toFixed(1)} L`;
  }
  // PSI -> bar
  if (u === 'PSI' || attr.endsWith('_psi')) {
    return `≈ ${(num / 14.5037738).toFixed(2)} bar`;
  }
  // m3/h -> GPM
  if (u === 'M3H' || attr.endsWith('_m3h')) {
    return `≈ ${(num / 0.2271247).toFixed(1)} GPM`;
  }
  // CFM -> m3/h
  if (u === 'CFM' || attr.endsWith('_cfm')) {
    return `≈ ${(num * 1.6990108).toFixed(1)} m³/h`;
  }
  // HP -> kW
  if (u === 'HP' || attr.includes('_hp')) {
    return `≈ ${(num * 0.7457).toFixed(1)} kW`;
  }
  return null;
}

export function FichaTecnicaPolimorficaEam({
  equipo,
  onUpdated,
}: FichaTecnicaPolimorficaEamProps) {
  const { toast } = useToast();
  const { data: arquetipos } = useArquetiposEam();
  const actualizarEspecificos = useActualizarDatosEspecificos();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editModulos, setEditModulos] = useState<Record<string, Record<string, any>>>({});
  const [editOrigenes, setEditOrigenes] = useState<Record<string, 'MODELO' | 'CUSTOM'>>({});
  const [editUnidades, setEditUnidades] = useState<Record<string, string>>({});

  // Resolver idTipoEquipo efectivo
  const effectiveIdTipo = useMemo(() => {
    const directId = equipo.id_tipo_equipo || equipo.tipo_equipo?.id_tipo_equipo;
    if (directId && arquetipos?.some((a) => a.id_tipo_equipo === directId)) {
      return directId;
    }
    if (arquetipos && equipo.tipo) {
      const rawTipo = typeof equipo.tipo === 'string' ? equipo.tipo : ((equipo.tipo as any)?.codigo_tipo || (equipo.tipo as any)?.nombre_tipo || (equipo.tipo as any)?.nombre || '');
      const norm = String(rawTipo || '').toUpperCase().trim();
      const match = arquetipos.find(
        (a) =>
          a.codigo_tipo?.toUpperCase() === norm ||
          a.codigo_corto?.toUpperCase() === norm ||
          a.codigos_sincronizados?.some((c) => c.toUpperCase() === norm),
      );
      if (match) return match.id_tipo_equipo;
    }
    return directId || null;
  }, [equipo.id_tipo_equipo, equipo.tipo_equipo, equipo.tipo, arquetipos]);

  const { data: esquema, isLoading: loadingEsquema } = useArquetipoEsquemaEam(effectiveIdTipo);

  // Consolidar valores de todos los módulos desde especificaciones JSONB + datos_especificos + motor
  const modulosConsolidados = useMemo(() => {
    const result: Record<string, Record<string, any>> = {};
    const specsMods = equipo.especificaciones?.modulos;
    if (specsMods && typeof specsMods === 'object') {
      for (const [mCode, mVals] of Object.entries(specsMods)) {
        if (mVals && typeof mVals === 'object') {
          result[mCode] = { ...mVals };
        }
      }
    }

    // Fallback para campos en datos_especificos o motor si algún módulo aún no estaba en JSONB
    const de = (equipo.datos_especificos || {}) as Record<string, any>;
    const mot = (equipo.motor || de.motor || null) as Record<string, any> | null;

    if (mot) {
      const targetMod =
        mot.tipo_motor === 'ELECTRICO' ? 'motor_electrico' : 'motor_combustion';
      result[targetMod] = {
        ...mot,
        potencia_motor_hp: mot.potencia_hp,
        potencia_motor_kw: mot.potencia_kw,
        capacidad_aceite_l: mot.capacidad_aceite_litros,
        capacidad_refrigerante_l: mot.capacidad_refrigerante_litros,
        ...(result[targetMod] || {}),
      };
    }

    if (equipo.tipo === 'GENERADOR' && Object.keys(de).length > 0) {
      result.alternador_generador = {
        ...de,
        voltaje_salida_vac: de.voltaje_salida,
        capacidad_tanque_l: de.capacidad_tanque_principal_litros,
        ...(result.alternador_generador || {}),
      };
    } else if (equipo.tipo === 'BOMBA' && Object.keys(de).length > 0) {
      result.bomba_hidraulica = {
        ...de,
        altura_manometrica_max_m: de.altura_manometrica_maxima_m,
        diametro_succion_pulg: de.diametro_aspiracion,
        diametro_descarga_pulg: de.diametro_descarga,
        ...(result.bomba_hidraulica || {}),
      };
    }

    return result;
  }, [equipo.especificaciones, equipo.datos_especificos, equipo.motor, equipo.tipo]);

  // Mapa plano de todos los valores para búsqueda rápida
  const valoresPlanos = useMemo(() => {
    const flat: Record<string, any> = {};
    for (const vals of Object.values(modulosConsolidados)) {
      if (vals && typeof vals === 'object') {
        for (const [k, v] of Object.entries(vals)) {
          if (isMeaningfulValue(v) && flat[k] === undefined) {
            flat[k] = v;
          }
        }
      }
    }
    return flat;
  }, [modulosConsolidados]);

  const origenesActuales = useMemo(
    () => equipo.especificaciones?.origen_atributos || {},
    [equipo.especificaciones],
  );
  const unidadesActuales = useMemo(
    () => equipo.especificaciones?.unidades_personalizadas || {},
    [equipo.especificaciones],
  );

  // Extraer Indicadores Principales de Placa (KPIs) para la franja superior
  const kpisPlaca = useMemo(() => {
    const items: Array<{
      codigo: string;
      etiqueta: string;
      valorFormateado: string;
      equivalencia: string | null;
      modulo: string;
    }> = [];
    const vistos = new Set<string>();

    if (esquema?.modulos) {
      for (const mod of esquema.modulos) {
        const badgeMod = getModuloBadgeInfo(mod.codigo_modulo, mod.nombre_modulo);
        for (const grp of mod.grupos) {
          for (const attr of grp.atributos) {
            if (!attr.es_kpi) continue;
            const rawVal =
              modulosConsolidados[mod.codigo_modulo]?.[attr.codigo_atributo] ??
              valoresPlanos[attr.codigo_atributo];
            if (!isMeaningfulValue(rawVal) || vistos.has(attr.codigo_atributo)) continue;
            vistos.add(attr.codigo_atributo);

            const uCode = unidadesActuales[attr.codigo_atributo] || attr.unidad_defecto || '';
            const uSimbolo =
              attr.unidades_disponibles?.find((u) => u.codigo === uCode)?.simbolo || uCode;

            let formatted = String(rawVal);
            if (typeof rawVal === 'boolean') {
              formatted = rawVal ? 'Sí' : 'No';
            } else if (uSimbolo) {
              formatted = `${rawVal} ${uSimbolo}`;
            }

            items.push({
              codigo: attr.codigo_atributo,
              etiqueta: attr.nombre_atributo,
              valorFormateado: formatted,
              equivalencia: formatEquivalenciaAutomatica(rawVal, uCode, attr.codigo_atributo),
              modulo: badgeMod.shortName,
            });
          }
        }
      }
    }

    // Si hay menos de 6 KPIs, completar con métricas clave presentes en valoresPlanos
    const candidatosFallback: Array<{ code: string; label: string; unit?: string; mod: string }> = [
      { code: 'potencia_kva', label: 'Potencia Aparente', unit: 'kVA', mod: 'Generador' },
      { code: 'potencia_kw', label: 'Potencia Activa', unit: 'kW', mod: 'Generador' },
      { code: 'potencia_hp_electrico', label: 'Potencia Motor Eléctrico', unit: 'HP', mod: 'Motor Eléctrico' },
      { code: 'potencia_motor_hp', label: 'Potencia Motor', unit: 'HP', mod: 'Motor' },
      { code: 'presion_maxima_psi', label: 'Presión Máxima', unit: 'PSI', mod: 'Compresor / Bomba' },
      { code: 'caudal_aire_cfm', label: 'Caudal de Aire', unit: 'CFM', mod: 'Compresor' },
      { code: 'caudal_maximo_m3h', label: 'Caudal Máximo', unit: 'm³/h', mod: 'Bomba' },
      { code: 'altura_manometrica_max_m', label: 'Altura Manométrica', unit: 'm', mod: 'Bomba' },
      { code: 'marca_compresor', label: 'Marca Compresor', mod: 'Compresor' },
      { code: 'modelo_compresor', label: 'Modelo Compresor', mod: 'Compresor' },
      { code: 'marca_bomba', label: 'Marca Bomba', mod: 'Bomba' },
      { code: 'marca_generador', label: 'Marca Generador', mod: 'Generador' },
      { code: 'marca_motor', label: 'Marca Motor', mod: 'Motor' },
      { code: 'voltaje_operacion_vac', label: 'Voltaje Operación', unit: 'VAC', mod: 'Eléctrico' },
      { code: 'velocidad_nominal_rpm', label: 'Velocidad Giro', unit: 'RPM', mod: 'Motor' },
    ];

    for (const cand of candidatosFallback) {
      if (items.length >= 6) break;
      if (vistos.has(cand.code)) continue;
      const val = valoresPlanos[cand.code];
      if (!isMeaningfulValue(val)) continue;
      vistos.add(cand.code);
      items.push({
        codigo: cand.code,
        etiqueta: cand.label,
        valorFormateado: cand.unit ? `${val} ${cand.unit}` : String(val),
        equivalencia: formatEquivalenciaAutomatica(val, cand.unit, cand.code),
        modulo: cand.mod,
      });
    }

    return items.slice(0, 6);
  }, [esquema, modulosConsolidados, valoresPlanos, unidadesActuales]);

  // Abrir modal de edición rápida
  const handleOpenEditModal = () => {
    setEditModulos(JSON.parse(JSON.stringify(modulosConsolidados)));
    setEditOrigenes({ ...origenesActuales });
    setEditUnidades({ ...unidadesActuales });
    setIsEditModalOpen(true);
  };

  const handleChangeEditValor = useCallback(
    (
      codigoModulo: string,
      codigoAtributo: string,
      nuevoValor: any,
      origen: 'MODELO' | 'CUSTOM' = 'CUSTOM',
    ) => {
      setEditModulos((prev) => ({
        ...prev,
        [codigoModulo]: {
          ...(prev[codigoModulo] || {}),
          [codigoAtributo]: nuevoValor,
        },
      }));
      setEditOrigenes((prev) => ({
        ...prev,
        [codigoAtributo]: origen,
      }));
    },
    [],
  );

  const handleChangeEditUnidad = useCallback(
    (
      codigoModulo: string,
      codigoAtributo: string,
      nuevaUnidad: string,
      valorConvertido?: number,
    ) => {
      setEditUnidades((prev) => ({
        ...prev,
        [codigoAtributo]: nuevaUnidad,
      }));
      if (valorConvertido !== undefined && Number.isFinite(valorConvertido)) {
        setEditModulos((prev) => ({
          ...prev,
          [codigoModulo]: {
            ...(prev[codigoModulo] || {}),
            [codigoAtributo]: valorConvertido,
          },
        }));
        setEditOrigenes((prev) => ({
          ...prev,
          [codigoAtributo]: 'CUSTOM',
        }));
      }
    },
  []);

  const handleSaveQuickEdit = async () => {
    try {
      await actualizarEspecificos.mutateAsync({
        id: equipo.id_equipo,
        payload: {
          especificaciones: {
            _version: 1,
            modulos: editModulos,
            origen_atributos: editOrigenes,
            unidades_personalizadas: editUnidades,
          },
        },
      });
      toast({
        title: '✅ Ficha técnica actualizada en tiempo real',
        description:
          'Se actualizaron las especificaciones JSONB, tablas satélite y el índice de búsqueda rápida.',
      });
      setIsEditModalOpen(false);
      if (onUpdated) onUpdated();
    } catch (error: any) {
      toast({
        title: '❌ Error al actualizar especificaciones',
        description: error?.message || 'Intenta nuevamente',
        variant: 'destructive',
      });
    }
  };

  // Formatear un valor técnico para visualización en tabla
  const renderValorAtributo = (
    rawVal: unknown,
    attr?: {
      codigo_atributo: string;
      tipo_control: string;
      unidad_defecto?: string | null;
      unidades_disponibles?: Array<{ codigo: string; simbolo: string }>;
      opciones?: any[];
    },
  ) => {
    if (!isMeaningfulValue(rawVal)) {
      return <span className="text-slate-300 font-normal">—</span>;
    }

    if (typeof rawVal === 'boolean' || rawVal === 'true' || rawVal === 'false') {
      const isTrue = rawVal === true || rawVal === 'true';
      return (
        <span
          className={cn(
            'px-2 py-0.5 rounded text-[11px] font-bold border',
            isTrue
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-slate-100 text-slate-600 border-slate-200',
          )}
        >
          {isTrue ? '✓ Sí' : 'No'}
        </span>
      );
    }

    if (attr?.opciones && attr.opciones.length > 0) {
      const parsedOps = parseOpcionesSeguras(attr.opciones);
      const match = parsedOps.find(
        (o) => o.value.toUpperCase() === String(rawVal).toUpperCase(),
      );
      if (match) return <span className="font-bold text-slate-900">{match.label}</span>;
    }

    const uCode =
      (attr ? unidadesActuales[attr.codigo_atributo] || attr.unidad_defecto : '') || '';
    const uSimbolo =
      attr?.unidades_disponibles?.find((u) => u.codigo === uCode)?.simbolo || uCode;
    const equiv = formatEquivalenciaAutomatica(rawVal, uCode, attr?.codigo_atributo);

    return (
      <span className="inline-flex items-baseline gap-1.5 flex-wrap justify-end">
        <span className="font-mono font-bold text-slate-900">
          {String(rawVal)}
          {uSimbolo ? ` ${uSimbolo}` : ''}
        </span>
        {equiv && (
          <span className="text-[10px] font-mono font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
            {equiv}
          </span>
        )}
      </span>
    );
  };

  return (
    <div className="space-y-5">
      {/* Encabezado de la Placa de Ingeniería + Botón de Edición en Caliente */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 lg:p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-2xs">
              <Gauge className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">
                  Placa de Especificaciones de Ingeniería ({equipo.tipo_equipo?.nombre_tipo || (typeof equipo.tipo === 'string' ? equipo.tipo : ((equipo.tipo as any)?.nombre_tipo || (equipo.tipo as any)?.nombre || 'Equipo'))})
                </h2>
                {equipo.modelo_oem && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                    <Factory className="h-3 w-3 text-indigo-600" />
                    Plantilla OEM: {equipo.modelo_oem.marca} {equipo.modelo_oem.modelo}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Ficha técnica modular unificada con equivalencias automáticas de unidades e indicadores de placa.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenEditModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-extrabold transition-colors cursor-pointer self-start sm:self-center shrink-0"
          >
            <Edit3 className="h-3.5 w-3.5" />
            <span>Editar Especificaciones Técnicas</span>
          </button>
        </div>

        {/* Franja Superior: Indicadores Principales de Placa (KPIs) */}
        {kpisPlaca.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                Indicadores Principales de Placa (KPIs)
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {kpisPlaca.map((kpi) => (
                <div
                  key={kpi.codigo}
                  className="px-3 py-2 rounded-xl bg-slate-50/90 border border-slate-200/80 flex flex-col justify-between min-h-[58px]"
                >
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block truncate leading-tight">
                      {kpi.modulo}
                    </span>
                    <span
                      className="text-[11px] font-bold text-slate-700 truncate block mt-0.5"
                      title={kpi.etiqueta}
                    >
                      {kpi.etiqueta}
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between gap-1">
                    <span className="text-sm font-black font-mono text-slate-900 truncate">
                      {kpi.valorFormateado}
                    </span>
                    {kpi.equivalencia && (
                      <span className="text-[10px] font-mono font-semibold text-blue-700 shrink-0">
                        {kpi.equivalencia}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tarjetas por Parte / Subsistema del Equipo */}
      {loadingEsquema ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 flex items-center justify-center gap-2 text-xs text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          Cargando estructura modular de ingeniería...
        </div>
      ) : esquema && esquema.modulos.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {esquema.modulos.map((mod) => {
            const badgeInfo = getModuloBadgeInfo(mod.codigo_modulo, mod.nombre_modulo);
            const valoresMod = modulosConsolidados[mod.codigo_modulo] || {};

            return (
              <div
                key={mod.codigo_modulo}
                className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col"
              >
                {/* Header de la Parte / Subsistema */}
                <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-blue-600" />
                    <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-800">
                      {mod.etiqueta_local || badgeInfo.fullName}
                    </h3>
                  </div>
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded text-[10px] font-bold border',
                      badgeInfo.badgeClass,
                    )}
                  >
                    {badgeInfo.shortName}
                  </span>
                </div>

                {/* Secciones (grupo_visual) dentro del Subsistema */}
                <div className="p-4 space-y-4 flex-1">
                  {mod.grupos.map((grupo) => {
                    const getEffectiveValue = (attrItem: typeof grupo.atributos[0]) => {
                      let val = valoresMod[attrItem.codigo_atributo] ?? valoresPlanos[attrItem.codigo_atributo];
                      if (!isMeaningfulValue(val)) {
                        const code = attrItem.codigo_atributo.toLowerCase();
                        if (code.includes('serie') || code.includes('serial')) {
                          val = (equipo as any).numero_serie_equipo || equipo.numero_serie || null;
                        } else if (code === 'marca' || code === 'marca_equipo') {
                          val = equipo.marca || null;
                        } else if (code === 'modelo' || code === 'modelo_equipo') {
                          val = equipo.modelo || null;
                        }
                      }
                      return val;
                    };

                    // Mostrar todos los atributos con valor o, si ninguno tiene valor, mostrar los principales
                    const atributosConValor = grupo.atributos.filter((attr) =>
                      isMeaningfulValue(getEffectiveValue(attr)),
                    );
                    const listaMostrar =
                      atributosConValor.length > 0
                        ? atributosConValor
                        : grupo.atributos.slice(0, 6);

                    return (
                      <div key={grupo.nombre} className="space-y-1.5">
                        <div className="flex items-center gap-1.5 pb-1 border-b border-slate-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                            {grupo.nombre}
                          </h4>
                        </div>

                        <div className="divide-y divide-slate-100">
                          {listaMostrar.map((attr) => {
                            const rawVal = getEffectiveValue(attr);
                            const origen = origenesActuales[attr.codigo_atributo];

                            return (
                              <div
                                key={attr.codigo_atributo}
                                className="flex items-center justify-between py-1.5 gap-3 text-xs"
                              >
                                <span className="text-slate-600 flex items-center gap-1.5">
                                  <span>{attr.nombre_atributo}</span>
                                  {origen === 'MODELO' && isMeaningfulValue(rawVal) && (
                                    <span
                                      className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200"
                                      title="Valor pre-llenado desde plantilla de Modelo de Fábrica (OEM)"
                                    >
                                      OEM
                                    </span>
                                  )}
                                </span>
                                <div className="text-right">
                                  {renderValorAtributo(rawVal, attr)}
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
            );
          })}
        </div>
      ) : (
        /* Respaldo polimórfico cuando se leen directamente las claves de modulosConsolidados */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Object.entries(modulosConsolidados).map(([codMod, vals]) => {
            const badgeInfo = getModuloBadgeInfo(codMod);
            const entries = Object.entries(vals).filter(
              ([k, v]) =>
                isMeaningfulValue(v) &&
                !['id_equipo', 'creado_por', 'fecha_creacion', 'tabla', 'motor'].includes(k),
            );
            if (entries.length === 0) return null;

            return (
              <div
                key={codMod}
                className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden"
              >
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-800">
                    {badgeInfo.fullName}
                  </h3>
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded text-[10px] font-bold border',
                      badgeInfo.badgeClass,
                    )}
                  >
                    {entries.length} especificaciones
                  </span>
                </div>
                <div className="p-4 divide-y divide-slate-100">
                  {entries.map(([k, v]) => (
                    <div
                      key={k}
                      className="flex items-center justify-between py-1.5 gap-3 text-xs"
                    >
                      <span className="text-slate-600">{humanizeFallbackKey(k)}</span>
                      <div className="text-right">
                        {renderValorAtributo(v, {
                          codigo_atributo: k,
                          tipo_control: typeof v === 'boolean' ? 'BOOLEANO' : 'TEXTO',
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Edición Rápida de Especificaciones Técnicas en Caliente */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-[1px]"
              onClick={() => setIsEditModalOpen(false)}
            />
            <div className="relative w-full max-w-5xl bg-slate-50 rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
              <div className="bg-white px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-200">
                    <Cpu className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">
                      Editar Especificaciones Técnicas ({equipo.codigo_equipo})
                    </h3>
                    <p className="text-xs text-slate-500">
                      Los cambios actualizan en vivo la ficha técnica, los subsistemas y el índice de búsqueda rápida.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 max-h-[calc(100vh-190px)] overflow-y-auto">
                <DynamicModularSpecsEditor
                  idTipoEquipo={effectiveIdTipo}
                  codigoTipo={equipo.tipo}
                  modulosValues={editModulos}
                  origenAtributos={editOrigenes}
                  unidadesPersonalizadas={editUnidades}
                  onChangeValor={handleChangeEditValor}
                  onChangeUnidad={handleChangeEditUnidad}
                  modeloOemActivo={equipo.modelo_oem || null}
                />
              </div>

              <div className="bg-white px-6 py-4 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveQuickEdit}
                  disabled={actualizarEspecificos.isPending}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold shadow-2xs cursor-pointer"
                >
                  {actualizarEspecificos.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Guardando y Re-indexando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>Guardar Especificaciones Técnicas</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
