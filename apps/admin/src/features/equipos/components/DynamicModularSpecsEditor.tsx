/**
 * EDITOR MODULAR DINÁMICO DE ESPECIFICACIONES TÉCNICAS EAM - MEKANOS S.A.S
 *
 * Renderiza dinámicamente las Partes / Subsistemas (`modulos_tecnicos`) y sus
 * Secciones (`grupo_visual`) a partir del esquema del Tipo de Equipo (`GET /api/catalogos/arquetipos/:id/esquema`).
 *
 * Características:
 * - Diseño UI/UX Enterprise Premium con ergonomía visual 10/10.
 * - Iconografía semántica para cada subsistema (Refrigeración, Eléctrico, Combustión, Bombeo, Neumático, etc.).
 * - Selector de subsistemas flexible que nunca trunca los nombres de las partes.
 * - Grupos de entrada integrados (número + unidad) al estilo Linear / Stripe.
 * - Soporta los 5 controles humanos:
 *   1. # Número con Unidad (con conversión matemática afín en vivo y = ax + b al cambiar la unidad)
 *   2. # Número Simple
 *   3. ☰ Lista de Opciones (parseo seguro polimórfico sin [object Object])
 *   4. Aa Texto
 *   5. ✓ Sí / No
 * - Badges sutiles de KPI, De fábrica y Personalizado.
 */

'use client';

import {
  getModuloBadgeInfo,
  getTipoControlHumano,
  parseOpcionesSeguras,
  useArquetipoEsquemaEam,
  useArquetiposEam,
  useMagnitudesEam,
} from '@/features/catalogos-eam';
import { cn } from '@/lib/utils';

const getDynamicNumericPlaceholder = (codigo: string, nombre: string, def?: string): string => {
  if (def) return `Ej: ${def}`;
  const c = (codigo || '').toLowerCase();
  const n = (nombre || '').toLowerCase();
  if (c.includes('rpm') || c.includes('velocidad') || n.includes('rpm')) return 'Ej: 1800';
  if (c.includes('ano') || c.includes('año') || c.includes('fabricacion')) return 'Ej: 2024';
  if (c.includes('factor') || c.includes('fp') || c.includes('cos')) return 'Ej: 0.85';
  if (c.includes('frecuencia') || c.includes('hz')) return 'Ej: 60';
  if (c.includes('voltaje') || c.includes('vac') || c.includes('vdc')) return 'Ej: 220';
  if (c.includes('amperaje') || c.includes('amp') || c.includes('corriente')) return 'Ej: 15';
  if (c.includes('fases') || c.includes('polos')) return 'Ej: 3';
  if (c.includes('temperatura') || c.includes('temp')) return 'Ej: 80';
  if (c.includes('presion') || c.includes('psi')) return 'Ej: 120';
  if (c.includes('horas') || c.includes('horometro')) return 'Ej: 1500';
  return '0.00';
};
import {
  CheckCircle2,
  Cpu,
  Droplets,
  Factory,
  Flame,
  Gauge,
  Layers,
  Loader2,
  Pencil,
  Scale,
  Snowflake,
  Star,
  Wind,
  Zap,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

export interface DynamicModularSpecsEditorProps {
  idTipoEquipo: number | null;
  codigoTipo?: string | null;
  modulosValues: Record<string, Record<string, any>>;
  origenAtributos: Record<string, 'MODELO' | 'CUSTOM'>;
  unidadesPersonalizadas: Record<string, string>;
  onChangeValor: (
    codigoModulo: string,
    codigoAtributo: string,
    nuevoValor: any,
    origen?: 'MODELO' | 'CUSTOM',
  ) => void;
  onChangeUnidad: (
    codigoModulo: string,
    codigoAtributo: string,
    nuevaUnidad: string,
    valorConvertido?: number,
  ) => void;
  modeloOemActivo?: {
    marca: string;
    modelo: string;
    nombre_comercial?: string | null;
  } | null;
}

// Tabla afín de respaldo instantáneo (valor_base = factor_a * x + factor_b)
const FACTORES_AFINES_FALLBACK: Record<string, { a: number; b: number }> = {
  // POTENCIA (Base: KW)
  KW: { a: 1, b: 0 },
  KVA: { a: 0.8, b: 0 },
  HP: { a: 0.74569987, b: 0 },
  CV: { a: 0.73549875, b: 0 },
  W: { a: 0.001, b: 0 },
  TR: { a: 3.516853, b: 0 },
  'BTU/H': { a: 0.000293071, b: 0 },
  // PRESIÓN (Base: PSI)
  PSI: { a: 1, b: 0 },
  BAR: { a: 14.5037738, b: 0 },
  KPA: { a: 0.14503774, b: 0 },
  MCA: { a: 1.42233433, b: 0 },
  // CAUDAL (Base: M3H)
  M3H: { a: 1, b: 0 },
  GPM: { a: 0.2271247, b: 0 },
  LPS: { a: 3.6, b: 0 },
  LPM: { a: 0.06, b: 0 },
  CFM: { a: 1.6990108, b: 0 },
  // VOLUMEN (Base: L)
  L: { a: 1, b: 0 },
  GAL: { a: 3.78541178, b: 0 },
  ML: { a: 0.001, b: 0 },
  CC: { a: 0.001, b: 0 },
  // TEMPERATURA (Base: C)
  C: { a: 1, b: 0 },
  F: { a: 0.55555556, b: -17.77777778 },
  K: { a: 1, b: -273.15 },
  // LONGITUD (Base: MET)
  MET: { a: 1, b: 0 },
  M: { a: 1, b: 0 },
  CM: { a: 0.01, b: 0 },
  MM: { a: 0.001, b: 0 },
  IN: { a: 0.0254, b: 0 },
};

/**
 * Resuelve icono y paleta semántica por tipo de subsistema
 */
function getSubsystemVisuals(codigoModulo?: string | null) {
  const code = (codigoModulo || '').toLowerCase();
  if (
    code.includes('refrigera') ||
    code.includes('chiller') ||
    code.includes('clima') ||
    code.includes('hvac')
  ) {
    return {
      Icon: Snowflake,
      color: 'text-teal-600',
      bg: 'bg-teal-50',
      border: 'border-teal-200',
    };
  }
  if (
    code.includes('combustion') ||
    code.includes('diesel') ||
    code.includes('gasolina') ||
    code.includes('motor_combustion')
  ) {
    return {
      Icon: Flame,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
      border: 'border-rose-200',
    };
  }
  if (
    code.includes('motor_electrico') ||
    code.includes('electrico') ||
    code.includes('potencia')
  ) {
    return {
      Icon: Zap,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
    };
  }
  if (code.includes('generador') || code.includes('alternador')) {
    return {
      Icon: Gauge,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
    };
  }
  if (code.includes('compresor') || code.includes('aire') || code.includes('neumat')) {
    return {
      Icon: Wind,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      border: 'border-purple-200',
    };
  }
  if (code.includes('bomba') || code.includes('hidraul')) {
    return {
      Icon: Droplets,
      color: 'text-cyan-600',
      bg: 'bg-cyan-50',
      border: 'border-cyan-200',
    };
  }
  return {
    Icon: Cpu,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
  };
}

export function DynamicModularSpecsEditor({
  idTipoEquipo,
  codigoTipo,
  modulosValues,
  origenAtributos,
  unidadesPersonalizadas,
  onChangeValor,
  onChangeUnidad,
  modeloOemActivo,
}: DynamicModularSpecsEditorProps) {
  const { data: arquetipos } = useArquetiposEam();
  const { data: magnitudes } = useMagnitudesEam();

  // Resolver idTipoEquipo efectivo a partir de idTipoEquipo o codigoTipo
  const effectiveIdTipo = useMemo(() => {
    if (idTipoEquipo && idTipoEquipo > 0) return idTipoEquipo;
    if (!codigoTipo || !arquetipos) return null;
    const norm = codigoTipo.toUpperCase().trim();
    const match = arquetipos.find(
      (a) =>
        a.codigo_tipo?.toUpperCase() === norm ||
        a.codigo_corto?.toUpperCase() === norm ||
        a.codigos_sincronizados?.some((c) => c.toUpperCase() === norm) ||
        a.nombre_tipo?.toUpperCase().includes(norm),
    );
    return match?.id_tipo_equipo || null;
  }, [idTipoEquipo, codigoTipo, arquetipos]);

  const { data: esquema, isLoading } = useArquetipoEsquemaEam(effectiveIdTipo);
  const [activeModuloCode, setActiveModuloCode] = useState<string>('');

  const modulos = useMemo(() => esquema?.modulos || [], [esquema]);

  useEffect(() => {
    if (modulos.length > 0 && !modulos.some((m) => m.codigo_modulo === activeModuloCode)) {
      setActiveModuloCode(modulos[0].codigo_modulo);
    }
  }, [modulos, activeModuloCode]);

  // Diccionario de factores afines combinando magnitudes del Hub + respaldo
  const mapaUnidades = useMemo(() => {
    const map = new Map<string, { a: number; b: number; simbolo: string; nombre: string }>();
    for (const [code, fac] of Object.entries(FACTORES_AFINES_FALLBACK)) {
      map.set(code.toUpperCase(), { ...fac, simbolo: code, nombre: code });
    }
    if (magnitudes) {
      for (const mag of magnitudes) {
        for (const u of mag.unidades_medida || []) {
          const a = Number(u.factor_a);
          const b = Number(u.factor_b);
          if (Number.isFinite(a) && a !== 0) {
            map.set(u.codigo.toUpperCase(), {
              a,
              b: Number.isFinite(b) ? b : 0,
              simbolo: u.simbolo || u.codigo,
              nombre: u.nombre || u.codigo,
            });
          }
        }
      }
    }
    return map;
  }, [magnitudes]);

  const convertirValorEnVivo = (
    valorActual: unknown,
    unidadOrigen: string,
    unidadDestino: string,
  ): number | undefined => {
    if (valorActual === '' || valorActual === null || valorActual === undefined) return undefined;
    const num = Number(valorActual);
    if (!Number.isFinite(num)) return undefined;
    const orig = mapaUnidades.get(unidadOrigen.toUpperCase());
    const dest = mapaUnidades.get(unidadDestino.toUpperCase());
    if (!orig || !dest || orig.a === 0 || dest.a === 0) return undefined;

    const valorBase = orig.a * num + orig.b;
    const convertido = (valorBase - dest.b) / dest.a;
    return Number(convertido.toFixed(2));
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-10 flex flex-col items-center justify-center gap-3 text-slate-500 shadow-2xs">
        <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
        <p className="text-sm font-semibold">
          Cargando ficha técnica modular del tipo de equipo...
        </p>
      </div>
    );
  }

  if (!esquema || modulos.length === 0) {
    return (
      <div className="bg-amber-50/70 rounded-2xl border border-amber-200 p-6 text-center space-y-2 shadow-2xs">
        <Cpu className="h-8 w-8 text-amber-600 mx-auto" />
        <p className="text-sm font-bold text-amber-900">
          Este tipo de equipo aún no tiene partes o subsistemas vinculados en el Hub EAM
        </p>
        <p className="text-xs text-amber-700">
          Puedes vincularle partes (Motor, Generador, Bomba, Compresor, Refrigeración, etc.) desde Configuración → Catálogo de Equipos Maestros.
        </p>
      </div>
    );
  }

  const moduloActivo =
    modulos.find((m) => m.codigo_modulo === activeModuloCode) || modulos[0];

  // Contar campos diligenciados por módulo
  const contarDiligenciados = (codigoMod: string) => {
    const vals = modulosValues[codigoMod] || {};
    return Object.values(vals).filter(
      (v) => v !== undefined && v !== null && v !== '',
    ).length;
  };

  const totalAtributosModulo = (mod: (typeof modulos)[number]) =>
    mod.grupos.reduce((acc, g) => acc + g.atributos.length, 0);

  return (
    <div className="space-y-4">
      {/* Banner de Plantilla OEM activa si existe */}
      {modeloOemActivo && (
        <div className="bg-gradient-to-r from-indigo-50/90 to-blue-50/80 border border-indigo-200/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs shrink-0">
              <Factory className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-950">
                  Ficha Pre-llenada con Modelo de Fábrica
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">
                  {modeloOemActivo.marca} • {modeloOemActivo.modelo}
                </span>
              </div>
              <p className="text-xs text-indigo-800/80 mt-0.5">
                Los campos marcados con <strong>🏭 De fábrica</strong> provienen de esta plantilla. Puedes modificar o complementar cualquier valor para este equipo.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Selector Horizontal Ergonómico de Partes / Subsistemas del Activo */}
      <div className="bg-slate-50/90 rounded-2xl border border-slate-200 p-3 shadow-2xs space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-blue-600" />
            Partes y Subsistemas del Activo ({modulos.length})
          </span>
          <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
            Selecciona una parte para editar sus parámetros
          </span>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {modulos.map((mod) => {
            const isSelected = mod.codigo_modulo === moduloActivo.codigo_modulo;
            const badgeInfo = getModuloBadgeInfo(mod.codigo_modulo, mod.nombre_modulo);
            const { Icon, color, bg } = getSubsystemVisuals(mod.codigo_modulo);
            const llenos = contarDiligenciados(mod.codigo_modulo);
            const total = totalAtributosModulo(mod);
            const displayName = mod.etiqueta_local || badgeInfo.fullName || mod.nombre_modulo;

            return (
              <button
                key={mod.codigo_modulo}
                type="button"
                onClick={() => setActiveModuloCode(mod.codigo_modulo)}
                className={cn(
                  'group flex items-center gap-3 px-3.5 py-2.5 rounded-xl border transition-all cursor-pointer text-left',
                  isSelected
                    ? 'bg-white border-blue-500 shadow-xs ring-2 ring-blue-500/15'
                    : 'bg-white/80 border-slate-200 hover:bg-white hover:border-slate-300 shadow-2xs',
                )}
              >
                <div
                  className={cn(
                    'p-2 rounded-lg transition-colors shrink-0',
                    isSelected ? bg : 'bg-slate-100 group-hover:bg-slate-200/70',
                  )}
                >
                  <Icon className={cn('h-4 w-4', isSelected ? color : 'text-slate-500')} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        'text-xs font-bold whitespace-nowrap',
                        isSelected ? 'text-blue-950 font-extrabold' : 'text-slate-800',
                      )}
                    >
                      {displayName}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500">
                    <span>{mod.grupos.length} secciones</span>
                    <span>•</span>
                    <span
                      className={cn(
                        'font-bold font-mono',
                        llenos > 0 ? 'text-emerald-600' : 'text-slate-400',
                      )}
                    >
                      {llenos > 0 ? `${llenos}/${total} listos` : `${total} campos`}
                    </span>
                  </div>
                </div>
                {llenos === total && total > 0 && (
                  <span className="p-0.5 rounded-full bg-emerald-100 text-emerald-700 ml-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Secciones (grupo_visual) del Subsistema Activo */}
      {moduloActivo && (
        <div className="space-y-4">
          {moduloActivo.grupos.map((grupo) => (
            <div
              key={grupo.nombre}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden"
            >
              {/* Encabezado de Sección */}
              <div className="bg-slate-50/90 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                    Sección: {grupo.nombre}
                  </h4>
                </div>
                <span className="text-[11px] font-semibold text-slate-400">
                  {grupo.atributos.length} variables técnicas
                </span>
              </div>

              {/* Grilla Ergonómica de Campos Técnicos */}
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {grupo.atributos.map((attr) => {
                  const codigoMod = moduloActivo.codigo_modulo;
                  const codigoAttr = attr.codigo_atributo;
                  const valActual = modulosValues[codigoMod]?.[codigoAttr] ?? '';
                  const origen = origenAtributos[codigoAttr];
                  const ctrlHumano = getTipoControlHumano(
                    attr.tipo_control,
                    Boolean(
                      attr.magnitud ||
                        (attr.unidades_disponibles && attr.unidades_disponibles.length > 0),
                    ),
                  );

                  const unidadActual =
                    unidadesPersonalizadas[codigoAttr] ||
                    attr.unidad_defecto ||
                    attr.unidades_disponibles?.[0]?.codigo ||
                    '';

                  const opciones = parseOpcionesSeguras(attr.opciones);

                  return (
                    <div
                      key={codigoAttr}
                      className={cn(
                        'p-3 rounded-xl border transition-all space-y-2',
                        origen === 'MODELO'
                          ? 'bg-indigo-50/20 border-indigo-200/80'
                          : origen === 'CUSTOM' && valActual !== ''
                            ? 'bg-blue-50/20 border-blue-200'
                            : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-2xs',
                      )}
                    >
                      {/* Etiqueta + Badges de KPI / Obligatorio / Origen */}
                      <div className="flex items-start justify-between gap-1.5">
                        <label className="text-xs font-bold text-slate-800 leading-snug">
                          {attr.nombre_atributo}
                          {attr.obligatorio && (
                            <span
                              className="text-rose-600 ml-1 font-extrabold"
                              title="Campo requerido"
                            >
                              *
                            </span>
                          )}
                        </label>

                        <div className="flex items-center gap-1 shrink-0">
                          {attr.es_kpi && (
                            <span
                              className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-0.5 shadow-2xs"
                              title="Indicador Principal de Placa (KPI)"
                            >
                              <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                              KPI
                            </span>
                          )}
                          {origen === 'MODELO' && valActual !== '' && (
                            <span
                              className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-0.5"
                              title="Valor heredado de la plantilla de Modelo de Fábrica"
                            >
                              <Factory className="h-2.5 w-2.5" />
                              De fábrica
                            </span>
                          )}
                          {origen === 'CUSTOM' && valActual !== '' && modeloOemActivo && (
                            <span
                              className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-0.5"
                              title="Valor ajustado manualmente para este equipo"
                            >
                              <Pencil className="h-2.5 w-2.5" />
                              Personalizado
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Control Dinámico según Tipo */}
                      {ctrlHumano.value === 'NUMERICO_MAGNITUD' ? (
                        <div className="space-y-1">
                          {/* Grupo de Entrada Integrado: Input + Selector de Unidad pegado */}
                          <div className="flex items-stretch rounded-xl border border-slate-300/90 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 overflow-hidden shadow-2xs transition-all">
                            <input
                              type="number"
                              step="any"
                              value={
                                valActual === null || valActual === undefined ? '' : valActual
                              }
                              onChange={(e) => {
                                const raw = e.target.value;
                                const parsed = raw === '' ? '' : Number(raw);
                                onChangeValor(codigoMod, codigoAttr, parsed, 'CUSTOM');
                              }}
                              placeholder={getDynamicNumericPlaceholder(
                                attr.codigo_atributo,
                                attr.nombre_atributo,
                                attr.valor_defecto,
                              )}
                              className="w-full px-3 py-2 text-xs font-mono font-bold text-slate-900 border-0 focus:ring-0 focus:outline-none"
                            />
                            {attr.unidades_disponibles && attr.unidades_disponibles.length > 0 ? (
                              <select
                                value={unidadActual}
                                onChange={(e) => {
                                  const nuevaU = e.target.value;
                                  const convertido = convertirValorEnVivo(
                                    valActual,
                                    unidadActual,
                                    nuevaU,
                                  );
                                  onChangeUnidad(codigoMod, codigoAttr, nuevaU, convertido);
                                }}
                                className="bg-slate-50 hover:bg-slate-100 border-l border-slate-200 px-2.5 py-2 text-xs font-bold text-blue-900 cursor-pointer focus:ring-0 focus:outline-none transition-colors"
                                title="Cambiar unidad (convierte el valor en vivo automáticamente)"
                              >
                                {attr.unidades_disponibles.map((u) => (
                                  <option key={u.codigo} value={u.codigo}>
                                    {u.simbolo || u.codigo}
                                  </option>
                                ))}
                              </select>
                            ) : unidadActual ? (
                              <span className="bg-slate-50 border-l border-slate-200 px-2.5 py-2 text-xs font-mono font-bold text-slate-600 flex items-center">
                                {unidadActual}
                              </span>
                            ) : null}
                          </div>

                          {/* Nota de conversión sutil en 1 sola línea */}
                          {attr.unidades_disponibles && attr.unidades_disponibles.length > 1 && (
                            <p className="text-[10px] text-blue-600 font-medium flex items-center gap-1 px-0.5">
                              <Scale className="h-2.5 w-2.5 text-blue-500 shrink-0" />
                              <span className="truncate">
                                Conversión en vivo (
                                {attr.unidades_disponibles
                                  .map((u) => u.simbolo || u.codigo)
                                  .join(' ↔ ')}
                                )
                              </span>
                            </p>
                          )}
                        </div>
                      ) : ctrlHumano.value === 'NUMERICO_PURO' ? (
                        <input
                          type="number"
                          step="any"
                          value={valActual === null || valActual === undefined ? '' : valActual}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const parsed = raw === '' ? '' : Number(raw);
                            onChangeValor(codigoMod, codigoAttr, parsed, 'CUSTOM');
                          }}
                          placeholder={getDynamicNumericPlaceholder(
                            attr.codigo_atributo,
                            attr.nombre_atributo,
                            attr.valor_defecto,
                          )}
                          className="w-full px-3 py-2 bg-white border border-slate-300/90 rounded-xl text-xs font-mono font-bold text-slate-900 shadow-2xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                        />
                      ) : ctrlHumano.value === 'BOOLEANO' ? (
                        <div className="flex items-center gap-1.5 pt-0.5">
                          <button
                            type="button"
                            onClick={() => onChangeValor(codigoMod, codigoAttr, true, 'CUSTOM')}
                            className={cn(
                              'flex-1 py-1.5 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1',
                              valActual === true || valActual === 'true'
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-emerald-50 hover:border-emerald-300',
                            )}
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Sí</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onChangeValor(codigoMod, codigoAttr, false, 'CUSTOM')}
                            className={cn(
                              'flex-1 py-1.5 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1',
                              valActual === false || valActual === 'false'
                                ? 'bg-slate-800 text-white border-slate-800 shadow-2xs'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100',
                            )}
                          >
                            <span>No</span>
                          </button>
                        </div>
                      ) : ctrlHumano.value === 'SELECTOR' && opciones.length > 0 ? (() => {
                        const matchOption = (v1: unknown, v2: unknown) => {
                          if (v1 === v2) return true;
                          const s1 = String(v1 ?? '').toUpperCase().trim();
                          const s2 = String(v2 ?? '').toUpperCase().trim();
                          if (s1 === s2) return true;
                          if ((s1 === 'H' && s2 === 'CLASE_H') || (s1 === 'CLASE_H' && s2 === 'H')) return true;
                          if ((s1 === 'F' && s2 === 'CLASE_F') || (s1 === 'CLASE_F' && s2 === 'F')) return true;
                          if ((s1 === 'B' && s2 === 'CLASE_B') || (s1 === 'CLASE_B' && s2 === 'B')) return true;
                          if ((s1 === 'A' && s2 === 'CLASE_A') || (s1 === 'CLASE_A' && s2 === 'A')) return true;
                          return false;
                        };
                        const matchedOp = opciones.find((op) => matchOption(valActual, op.value));
                        const selectVal = matchedOp ? matchedOp.value : (valActual === null || valActual === undefined ? '' : String(valActual));

                        return (
                          <select
                            value={selectVal}
                            onChange={(e) =>
                              onChangeValor(codigoMod, codigoAttr, e.target.value, 'CUSTOM')
                            }
                            className="w-full px-3 py-2 bg-white border border-slate-300/90 rounded-xl text-xs font-semibold text-slate-800 shadow-2xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none cursor-pointer"
                          >
                            <option value="">Seleccionar opción...</option>
                            {opciones.map((op) => (
                              <option key={op.key} value={op.value}>
                                {op.label}
                              </option>
                            ))}
                          </select>
                        );
                      })() : (
                        <input
                          type="text"
                          value={
                            valActual === null || valActual === undefined ? '' : String(valActual)
                          }
                          onChange={(e) =>
                            onChangeValor(codigoMod, codigoAttr, e.target.value, 'CUSTOM')
                          }
                          placeholder={
                            attr.descripcion || `Ingresar ${attr.nombre_atributo.toLowerCase()}...`
                          }
                          className="w-full px-3 py-2 bg-white border border-slate-300/90 rounded-xl text-xs font-medium text-slate-900 shadow-2xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
