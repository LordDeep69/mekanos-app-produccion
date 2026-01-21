/**
 * MEKANOS S.A.S - Portal Admin
 * Sidebar Component - Enterprise Design
 * 
 * Estilo profesional con secciones organizadas
 */

'use client';

import { cn } from '@/lib/utils';
import {
  Activity,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FileBarChart,
  Gauge,
  HardDrive,
  Layers,
  LayoutGrid,
  Package,
  Settings2,
  Shield,
  Users2,
  Wrench,
  Zap
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

interface NavSection {
  label: string;
  items: NavItem[];
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  children?: { title: string; href: string; icon: React.ComponentType<{ className?: string }> }[];
}

const navSections: NavSection[] = [
  {
    label: 'Principal',
    items: [
      { title: 'Dashboard', href: '/dashboard', icon: LayoutGrid },
      { title: 'Órdenes de Servicio', href: '/ordenes', icon: ClipboardList, badge: 'Core' },
      { title: 'Agenda', href: '/agenda', icon: Calendar },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { title: 'Clientes', href: '/clientes', icon: Building2 },
      { title: 'Equipos', href: '/equipos', icon: Wrench },
      { title: 'Empleados', href: '/empleados', icon: Users2 },
      { title: 'Inventario', href: '/inventario', icon: Package },
    ],
  },
  {
    label: 'Análisis',
    items: [
      { title: 'Reportes', href: '/reportes', icon: FileBarChart },
    ],
  },
  {
    label: 'Configuración',
    items: [
      {
        title: 'Catálogos',
        href: '/configuracion/catalogos',
        icon: HardDrive,
        children: [
          { title: 'Tipos de Servicio', href: '/configuracion/catalogos/tipos-servicio', icon: Activity },
          { title: 'Estados de Orden', href: '/configuracion/catalogos/estados', icon: CheckCircle2 },
          { title: 'Actividades', href: '/configuracion/catalogos/actividades', icon: ClipboardList },
          { title: 'Sistemas', href: '/configuracion/catalogos/sistemas', icon: Layers },
          { title: 'Parámetros', href: '/configuracion/catalogos/parametros', icon: Gauge },
        ],
      },
      { title: 'Sistema', href: '/configuracion', icon: Settings2 },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);

  useEffect(() => {
    if (pathname?.includes('/configuracion/catalogos')) {
      setExpandedMenus(prev =>
        prev.includes('/configuracion/catalogos') ? prev : [...prev, '/configuracion/catalogos']
      );
    }
  }, [pathname]);

  const toggleMenu = (href: string) => {
    setExpandedMenus(prev =>
      prev.includes(href) ? prev.filter(h => h !== href) : [...prev, href]
    );
  };

  const isActiveLink = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 flex flex-col bg-slate-900">
      {/* Header con Logo Premium */}
      <div className="flex-shrink-0 px-5 py-5 border-b border-slate-700/50">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="relative">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/40 transition-shadow">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-slate-900" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">MEKANOS</h1>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Portal Admin</p>
          </div>
        </Link>
      </div>

      {/* Navigation con Secciones */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {navSections.map((section) => (
          <div key={section.label}>
            {/* Section Label */}
            <div className="px-3 mb-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {section.label}
              </span>
            </div>

            {/* Section Items */}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = isActiveLink(item.href);
                const isExpanded = expandedMenus.includes(item.href);
                const hasChildren = item.children && item.children.length > 0;
                const Icon = item.icon;

                if (hasChildren) {
                  return (
                    <div key={item.href}>
                      <button
                        onClick={() => toggleMenu(item.href)}
                        className={cn(
                          'group w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                          isActive || isExpanded
                            ? 'bg-slate-800 text-white'
                            : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                        )}
                      >
                        <span className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                            isActive || isExpanded ? "bg-blue-500/20 text-blue-400" : "bg-slate-800 text-slate-500 group-hover:text-slate-400"
                          )}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <span>{item.title}</span>
                        </span>
                        <ChevronRight className={cn(
                          "h-4 w-4 text-slate-600 transition-transform duration-200",
                          isExpanded && "rotate-90"
                        )} />
                      </button>

                      {/* Submenu con animación */}
                      <div className={cn(
                        "overflow-hidden transition-all duration-200",
                        isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                      )}>
                        <div className="ml-5 mt-1 pl-4 border-l-2 border-slate-700/50 space-y-0.5">
                          {item.children!.map((child) => {
                            const isChildActive = pathname === child.href;
                            const ChildIcon = child.icon;
                            return (
                              <Link
                                key={child.href}
                                href={child.href}
                                className={cn(
                                  'flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-all duration-150',
                                  isChildActive
                                    ? 'bg-blue-500/10 text-blue-400 border-l-2 border-blue-400 -ml-[2px] pl-[14px]'
                                    : 'text-slate-500 hover:bg-slate-800/50 hover:text-slate-300'
                                )}
                              >
                                <ChildIcon className="h-3.5 w-3.5" />
                                {child.title}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                      isActive
                        ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/25'
                        : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-slate-800 text-slate-500 group-hover:text-slate-400"
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="flex-1">{item.title}</span>
                    {item.badge && (
                      <span className={cn(
                        "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase",
                        isActive ? "bg-white/20 text-white" : "bg-blue-500/10 text-blue-400"
                      )}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer Premium */}
      <div className="flex-shrink-0 p-4 border-t border-slate-700/50">
        <div className="flex items-center gap-3 px-2">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center ring-2 ring-slate-600">
            <Shield className="h-4 w-4 text-slate-300" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-300 truncate">Admin System</p>
            <p className="text-[10px] text-slate-500">v1.0.0 • Enterprise</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
