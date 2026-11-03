'use client';

/**
 * MEKANOS S.A.S - Portal Admin
 * Hub Ejecutivo de Ingeniería EAM Universal (5 Capas Canónicas)
 * Ruta: /configuracion/catalogos-eam
 *
 * Incluye los 4 Refinamientos de Excelencia UI/UX:
 * 1. Ergonomía Visual "Cero Apretado / Cero Truncamiento" (p-6, gap-5, jerarquía de 2 líneas).
 * 2. Tarjetas KPI Superiores Interactivas (Mapa Mental clicable que conmuta directamente a cada pestaña).
 * 3. Creación Rápida "In-Place & Elevate" + Vista Previa en Vivo del Arquetipo.
 * 4. Compatibilidad de rutas (/configuracion/catalogos-eam y /configuracion/equipos-maestros).
 */

import {
  ArrowLeft,
  Boxes,
  Cpu,
  Database,
  Factory,
  Scale,
  Sparkles,
  Wrench,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { TabArquetiposEquipo } from '@/features/catalogos-eam/components/TabArquetiposEquipo';
import { TabDiccionarioAtributos } from '@/features/catalogos-eam/components/TabDiccionarioAtributos';
import { TabMagnitudesUom } from '@/features/catalogos-eam/components/TabMagnitudesUom';
import { TabModelosOemBom } from '@/features/catalogos-eam/components/TabModelosOemBom';
import { TabModulosTecnicos } from '@/features/catalogos-eam/components/TabModulosTecnicos';
import { useResumenEjecutivoEam } from '@/features/catalogos-eam';

type EamTabKey = 'magnitudes' | 'diccionario' | 'modulos' | 'arquetipos' | 'modelos';

export default function CatalogosEamHubPage() {
  const [activeTab, setActiveTab] = useState<EamTabKey>('arquetipos');
  const { data: resumen } = useResumenEjecutivoEam();

  const kpiCards: Array<{
    key: EamTabKey;
    step: string;
    title: string;
    metric: string;
    subtext: string;
    icon: React.ComponentType<{ className?: string }>;
    accentBg: string;
    activeBorder: string;
  }> = [
    {
      key: 'magnitudes',
      step: 'CAPA 1 • METROLOGÍA SI',
      title: 'Magnitudes y Unidades UoM',
      metric: `${resumen?.magnitudes ?? 11} Magnitudes • ${resumen?.unidades ?? 39} UoM`,
      subtext: 'Conversión afín exacta y = a·x + b',
      icon: Scale,
      accentBg: 'bg-blue-50 text-blue-600 border-blue-200',
      activeBorder: 'border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/40',
    },
    {
      key: 'diccionario',
      step: 'CAPA 2 • DICCIONARIO EAM',
      title: 'Atributos Técnicos',
      metric: `${resumen?.atributos ?? 145} Atributos Canónicos`,
      subtext: 'Variables tipadas, rangos y enums',
      icon: Database,
      accentBg: 'bg-purple-50 text-purple-600 border-purple-200',
      activeBorder: 'border-purple-600 ring-2 ring-purple-500/20 bg-purple-50/40',
    },
    {
      key: 'modulos',
      step: 'CAPA 3 • COMPOSICIÓN',
      title: 'Módulos Técnicos',
      metric: `${resumen?.modulos ?? 5} Sub-sistemas Activos`,
      subtext: 'Switches B-Tree, KPI y PDF en caliente',
      icon: Boxes,
      accentBg: 'bg-indigo-50 text-indigo-600 border-indigo-200',
      activeBorder: 'border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/40',
    },
    {
      key: 'arquetipos',
      step: 'CAPA 4 • CLASES DE ACTIVO',
      title: 'Arquetipos de Equipo',
      metric: `${resumen?.arquetipos ?? 4} Clases (${resumen?.equipos_activos ?? 464} Equipos)`,
      subtext: 'Esquema dinámico y planes preventivos',
      icon: Cpu,
      accentBg: 'bg-emerald-50 text-emerald-600 border-emerald-200',
      activeBorder: 'border-emerald-600 ring-2 ring-emerald-500/20 bg-emerald-50/40',
    },
    {
      key: 'modelos',
      step: 'CAPA 5 • PLANTILLAS OEM',
      title: 'Modelos OEM y Kits BOM',
      metric: `${resumen?.modelos_oem ?? 4} Modelos con BOM WMS`,
      subtext: 'Pre-llenado técnico y repuestos sugeridos',
      icon: Factory,
      accentBg: 'bg-amber-50 text-amber-600 border-amber-200',
      activeBorder: 'border-amber-600 ring-2 ring-amber-500/20 bg-amber-50/40',
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1680px] mx-auto">
      {/* CABECERA EJECUTIVA */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
        <div className="space-y-1.5">
          <div className="flex items-center flex-wrap gap-2.5">
            <Link
              href="/configuracion"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Configuración</span>
            </Link>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold">
              <Sparkles className="h-3.5 w-3.5" />
              <span>METAMODELO UNIVERSAL EAM • ZERO-TRUST</span>
            </span>
          </div>

          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5 pt-1">
            <Cpu className="h-7 w-7 text-blue-600 shrink-0" />
            Centro de Gobernanza de Ingeniería EAM Universal
          </h1>
          <p className="text-sm text-slate-500 max-w-4xl">
            Arquitectura componible de 5 capas: gobierna magnitudes SI, diccionario de atributos técnicos,
            módulos funcionales, arquetipos canónicos de activos y plantillas de modelos OEM vinculadas al
            inventario WMS.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/equipos"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-colors"
          >
            <Wrench className="h-4 w-4 text-blue-400" />
            <span>Ir al Parque de Equipos ({resumen?.equipos_activos ?? 464})</span>
          </Link>
        </div>
      </div>

      {/* REFINAMIENTO #2: 5 TARJETAS KPI SUPERIORES INTERACTIVAS (MAPA MENTAL DE LAS 5 CAPAS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-5">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          const isActive = activeTab === card.key;
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => setActiveTab(card.key)}
              className={`text-left rounded-2xl border p-5 transition-all flex flex-col justify-between gap-3 ${
                isActive
                  ? `${card.activeBorder} shadow-md`
                  : 'bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between gap-2 w-full">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                  {card.step}
                </span>
                <div
                  className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${card.accentBg}`}
                >
                  <Icon className="h-4 w-4" />
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-sm font-bold text-slate-800">{card.title}</div>
                <div className="text-base font-extrabold text-slate-900">{card.metric}</div>
                <div className="text-xs text-slate-500">{card.subtext}</div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between w-full">
                <span
                  className={`text-[11px] font-bold ${
                    isActive ? 'text-blue-700' : 'text-slate-400'
                  }`}
                >
                  {isActive ? '● Capa Activa en Edición' : 'Clic para gobernar capa'}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* BARRA DE NAVEGACIÓN DE LAS 5 PESTAÑAS */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-sm flex flex-wrap items-center gap-2">
        {kpiCards.map((tab, idx) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>
                {idx + 1}. {tab.title}
              </span>
            </button>
          );
        })}
      </div>

      {/* CONTENIDO DINÁMICO DE LA CAPA SELECCIONADA */}
      <div>
        {activeTab === 'magnitudes' && <TabMagnitudesUom />}
        {activeTab === 'diccionario' && <TabDiccionarioAtributos />}
        {activeTab === 'modulos' && <TabModulosTecnicos />}
        {activeTab === 'arquetipos' && <TabArquetiposEquipo />}
        {activeTab === 'modelos' && <TabModelosOemBom />}
      </div>
    </div>
  );
}
