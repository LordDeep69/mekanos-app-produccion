'use client';

import {
  Activity,
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardList,
  Cpu,
  Gauge,
  Layers,
  ListTodo,
  Mail,
  Settings2,
  Sparkles,
  Tag,
} from 'lucide-react';
import Link from 'next/link';

export default function ConfiguracionPage() {
  const modulosCat = [
    {
      title: 'Tipos de Servicio',
      description: 'Clasificación de intervenciones preventivas, correctivas y diagnósticos.',
      href: '/configuracion/catalogos/tipos-servicio',
      icon: Activity,
      color: 'text-blue-600 bg-blue-50 border-blue-100',
    },
    {
      title: 'Servicios Específicos',
      description: 'Catálogo comercial y operativo de servicios con tiempos y tarifas base.',
      href: '/configuracion/catalogos/servicios',
      icon: Tag,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
    },
    {
      title: 'Parámetros de Medición',
      description: 'Variables metrológicas de checklist y rangos de alerta crítica en campo.',
      href: '/configuracion/catalogos/parametros',
      icon: Gauge,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    },
    {
      title: 'Actividades de Mantenimiento',
      description: 'Rutinas paso a paso y listas de chequeo por tipo de servicio y sistema.',
      href: '/configuracion/catalogos/actividades',
      icon: ClipboardList,
      color: 'text-amber-600 bg-amber-50 border-amber-100',
    },
    {
      title: 'Sistemas Técnicos',
      description: 'Agrupación de subsistemas mecánicos, eléctricos, hidráulicos y control.',
      href: '/configuracion/catalogos/sistemas',
      icon: Layers,
      color: 'text-purple-600 bg-purple-50 border-purple-100',
    },
    {
      title: 'Estados de Orden',
      description: 'Ciclo de vida y gobernanza de estados de las órdenes de servicio.',
      href: '/configuracion/catalogos/estados',
      icon: CheckCircle2,
      color: 'text-cyan-600 bg-cyan-50 border-cyan-100',
    },
    {
      title: 'Pendientes Técnicos',
      description: 'Catálogo estandarizado de hallazgos y novedades detectadas en campo.',
      href: '/configuracion/catalogos/pendientes',
      icon: ListTodo,
      color: 'text-rose-600 bg-rose-50 border-rose-100',
    },
    {
      title: 'Firmas Administrativas',
      description: 'Representantes legales y sellos autorizados para documentos y bitácoras.',
      href: '/configuracion/firmas-administrativas',
      icon: Building2,
      color: 'text-slate-700 bg-slate-100 border-slate-200',
    },
    {
      title: 'Cuentas de Email (OAuth2)',
      description: 'Remitentes corporativos configurados para despacho automático de informes PDF.',
      href: '/configuracion/cuentas-email',
      icon: Mail,
      color: 'text-teal-600 bg-teal-50 border-teal-100',
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm">
              <Settings2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Centro de Configuración y Gobernanza del Sistema
              </h1>
              <p className="text-sm text-slate-500">
                Administra el metamodelo de activos EAM Universal, catálogos operativos y parámetros corporativos
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tarjeta Destacada: Ingeniería EAM Universal (5 Capas) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white p-6 md:p-8 shadow-xl border border-slate-700/80">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5" />
              <span>ARQUITECTURA EAM UNIVERSAL • 5 CAPAS CANÓNICAS</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <Cpu className="h-6 w-6 text-blue-400 shrink-0" />
              Ingeniería EAM Universal: Activos, Diccionario Técnico, Módulos y Modelos OEM
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Gobierna las <strong>11 Magnitudes Físicas y 39 Unidades UoM</strong> (con calculadora dimensional en vivo),
              el <strong>Diccionario de 145 Atributos Técnicos</strong>, los <strong>Módulos Técnicos Componibles</strong>,
              los <strong>Arquetipos Canónicos de Equipo</strong> (464 activos operativos) y las plantillas de{' '}
              <strong>Modelos Maestros OEM con Kits BOM WMS</strong>.
            </p>
          </div>
          <div className="shrink-0">
            <Link
              href="/configuracion/catalogos-eam"
              className="inline-flex items-center gap-2.5 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-600/30 transition-all"
            >
              <span>Abrir Hub de Ingeniería EAM</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Grid de Catálogos y Configuraciones Operativas */}
      <div>
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">
          Catálogos Operativos y Configuración Corporativa
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {modulosCat.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group bg-white rounded-xl border border-slate-200/90 p-5 shadow-sm hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 ${item.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <h4 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {item.title}
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed">{item.description}</p>
                  </div>
                </div>
                <div className="flex items-center justify-end text-xs font-semibold text-blue-600 group-hover:translate-x-0.5 transition-transform">
                  <span>Configurar</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
