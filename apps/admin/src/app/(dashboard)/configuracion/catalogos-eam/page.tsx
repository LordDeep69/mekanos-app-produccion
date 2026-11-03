'use client';

/**
 * MEKANOS S.A.S - Portal Admin
 * Configuración de Equipos Maestros y Fichas Técnicas (Fase 3.5)
 * Ruta: /configuracion/catalogos-eam
 *
 * Diseño ergonómico Top-Down (de lo General a lo Específico):
 * 1. Tipos de Equipo (4 Clases • 464 Equipos)
 * 2. Modelos de Fábrica y Kits BOM (4 Modelos Preconfigurados)
 * 3. Partes y Subsistemas (5 Módulos Reutilizables)
 * 4. Catálogo de Campos Técnicos (145 Campos de Ficha)
 * 5. Unidades de Medida (11 Magnitudes • Conversor)
 */

import {
  ArrowLeft,
  Boxes,
  Cpu,
  Database,
  Factory,
  Scale,
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

type EamTabKey = 'arquetipos' | 'modelos' | 'modulos' | 'diccionario' | 'magnitudes';

export default function CatalogosEamHubPage() {
  const [activeTab, setActiveTab] = useState<EamTabKey>('arquetipos');
  const { data: resumen } = useResumenEjecutivoEam();

  // Orden Mental Humano (Top-Down: de lo General a lo Específico) en 1 Sola Barra Compacta
  const navTabs: Array<{
    key: EamTabKey;
    stepNum: number;
    title: string;
    metricBadge: string;
    icon: React.ComponentType<{ className?: string }>;
    activeClasses: string;
    iconBgClass: string;
  }> = [
    {
      key: 'arquetipos',
      stepNum: 1,
      title: 'Tipos de Equipo',
      metricBadge: `${resumen?.arquetipos ?? 4} Clases • ${resumen?.equipos_activos ?? 464} Equipos`,
      icon: Cpu,
      activeClasses: 'bg-slate-900 text-white border-slate-900 shadow-md',
      iconBgClass: 'bg-emerald-500/20 text-emerald-400',
    },
    {
      key: 'modelos',
      stepNum: 2,
      title: 'Modelos de Fábrica y Kits BOM',
      metricBadge: `${resumen?.modelos_oem ?? 4} Modelos Preconfigurados`,
      icon: Factory,
      activeClasses: 'bg-slate-900 text-white border-slate-900 shadow-md',
      iconBgClass: 'bg-amber-500/20 text-amber-400',
    },
    {
      key: 'modulos',
      stepNum: 3,
      title: 'Partes y Subsistemas',
      metricBadge: `${resumen?.modulos ?? 5} Módulos Reutilizables`,
      icon: Boxes,
      activeClasses: 'bg-slate-900 text-white border-slate-900 shadow-md',
      iconBgClass: 'bg-indigo-500/20 text-indigo-400',
    },
    {
      key: 'diccionario',
      stepNum: 4,
      title: 'Catálogo de Campos Técnicos',
      metricBadge: `${resumen?.atributos ?? 145} Campos de Ficha`,
      icon: Database,
      activeClasses: 'bg-slate-900 text-white border-slate-900 shadow-md',
      iconBgClass: 'bg-purple-500/20 text-purple-400',
    },
    {
      key: 'magnitudes',
      stepNum: 5,
      title: 'Unidades de Medida',
      metricBadge: `${resumen?.magnitudes ?? 11} Magnitudes • Conversor`,
      icon: Scale,
      activeClasses: 'bg-slate-900 text-white border-slate-900 shadow-md',
      iconBgClass: 'bg-blue-500/20 text-blue-400',
    },
  ];

  return (
    <div className="p-5 space-y-4 max-w-[1680px] mx-auto">
      {/* CABECERA COMPACTA EN 1 SOLA LÍNEA LIMPIA */}
      <div className="bg-white rounded-2xl border border-slate-200 px-5 py-3.5 shadow-2xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 min-w-0">
          <Link
            href="/configuracion"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors shrink-0 w-fit"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Configuración</span>
          </Link>

          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Cpu className="h-5 w-5 text-blue-600 shrink-0" />
              <span>Configuración de Equipos Maestros y Fichas Técnicas</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Define qué tipos de equipos atiende Mekanos, qué partes los componen, qué datos técnicos se piden en sus fichas y qué repuestos usan sus modelos.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/equipos"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <Wrench className="h-3.5 w-3.5 text-blue-400" />
            <span>Ir al Parque de Equipos ({resumen?.equipos_activos ?? 464})</span>
          </Link>
        </div>
      </div>

      {/* BARRA ÚNICA DE NAVEGACIÓN COMPACTA CON KPIs INTEGRADOS (ORDEN TOP-DOWN 1 → 5) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-2xs grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-xl border px-3.5 py-2.5 text-left transition-all flex items-center gap-3 ${
                isActive
                  ? tab.activeClasses
                  : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-100 hover:border-slate-300 text-slate-800'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  isActive
                    ? tab.iconBgClass
                    : 'bg-white border border-slate-200 text-slate-600'
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>

              <div className="min-w-0 flex-1">
                <div
                  className={`text-xs font-extrabold leading-tight truncate ${
                    isActive ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  {tab.stepNum}. {tab.title}
                </div>
                <div
                  className={`text-[11px] font-semibold mt-0.5 truncate ${
                    isActive ? 'text-slate-300' : 'text-slate-500'
                  }`}
                >
                  {tab.metricBadge}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* CONTENIDO DE LA PESTAÑA ACTIVA (VISIBLE DESDE EL PRIMER TERCIO DE LA PANTALLA) */}
      <div>
        {activeTab === 'arquetipos' && <TabArquetiposEquipo />}
        {activeTab === 'modelos' && <TabModelosOemBom />}
        {activeTab === 'modulos' && <TabModulosTecnicos />}
        {activeTab === 'diccionario' && <TabDiccionarioAtributos />}
        {activeTab === 'magnitudes' && <TabMagnitudesUom />}
      </div>
    </div>
  );
}
