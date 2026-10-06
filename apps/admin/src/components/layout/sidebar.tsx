/**
 * MEKANOS S.A.S - Portal Admin
 * Sidebar Component - Enterprise Design
 * 
 * Estilo profesional, desplegable / colapsable de forma sutil y prémium.
 */

'use client';

import { useSidebar } from '@/components/layout/sidebar-context';
import { cn } from '@/lib/utils';
import {
  Activity,
  Building2,
  Boxes,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileBarChart,
  Gauge,
  HardDrive,
  Layers,
  LayoutGrid,
  ListTodo,
  Mail,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Settings2,
  Shield,
  ShoppingCart,
  Tag,
  Truck,
  Users2,
  Wrench,
  Zap,
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
      {
        title: 'Compras y Abastecimiento',
        href: '/compras',
        icon: ShoppingCart,
        badge: 'Enterprise',
        children: [
          { title: 'Catálogo Maestro', href: '/compras/catalogo', icon: Boxes },
          { title: 'Marcas y Fabricantes', href: '/compras/marcas', icon: Tag },
          { title: 'Familias y Taxonomía', href: '/compras/categorias', icon: Layers },
          { title: 'Directorio Proveedores', href: '/compras/proveedores', icon: Truck },
        ],
      },
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
          { title: 'Servicios Específicos', href: '/configuracion/catalogos/servicios', icon: Tag },
          { title: 'Estados de Orden', href: '/configuracion/catalogos/estados', icon: CheckCircle2 },
          { title: 'Actividades', href: '/configuracion/catalogos/actividades', icon: ClipboardList },
          { title: 'Sistemas', href: '/configuracion/catalogos/sistemas', icon: Layers },
          { title: 'Parámetros', href: '/configuracion/catalogos/parametros', icon: Gauge },
          { title: 'Pendientes Técnicos', href: '/configuracion/catalogos/pendientes', icon: ListTodo },
        ],
      },
      { title: 'Firmas Administrativas', href: '/configuracion/firmas-administrativas', icon: Building2 },
      { title: 'Cuentas de Email', href: '/configuracion/cuentas-email', icon: Mail },
      { title: 'Sistema', href: '/configuracion', icon: Settings2 },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isCollapsed, toggle } = useSidebar();
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);

  useEffect(() => {
    if (pathname?.includes('/configuracion/catalogos')) {
      setExpandedMenus((prev) =>
        prev.includes('/configuracion/catalogos') ? prev : [...prev, '/configuracion/catalogos']
      );
    }
    if (pathname?.startsWith('/compras')) {
      setExpandedMenus((prev) =>
        prev.includes('/compras') ? prev : [...prev, '/compras']
      );
    }
  }, [pathname]);

  const toggleMenu = (href: string) => {
    setExpandedMenus((prev) =>
      prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href]
    );
  };

  const isActiveLink = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen flex flex-col bg-slate-900 border-r border-slate-800/80 transition-all duration-300 ease-in-out select-none shadow-xl',
        isCollapsed ? 'w-[72px]' : 'w-64'
      )}
    >
      {/* Header con Logo y botón de alternancia */}
      {!isCollapsed ? (
        <div className="flex-shrink-0 px-4 py-4 border-b border-slate-800 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/40 transition-shadow">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-white tracking-tight leading-tight">MEKANOS</h1>
              <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Portal Admin</p>
            </div>
          </Link>
          <button
            type="button"
            onClick={toggle}
            className="w-8 h-8 rounded-xl bg-slate-800/90 hover:bg-blue-600 text-slate-400 hover:text-white border border-slate-700/70 hover:border-blue-500 shadow-sm flex items-center justify-center transition-all duration-200 group shrink-0"
            title="Contraer menú lateral"
            aria-label="Contraer menú lateral"
          >
            <PanelLeftClose className="h-4 w-4 text-slate-300 group-hover:text-white group-hover:-translate-x-0.5 transition-all" />
          </button>
        </div>
      ) : (
        <div className="flex-shrink-0 py-3.5 border-b border-slate-800 flex flex-col items-center justify-center gap-2.5">
          <Link href="/dashboard" className="group" title="Mekanos - Portal Admin">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-all">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900" />
            </div>
          </Link>
          <button
            type="button"
            onClick={toggle}
            className="w-9 h-8 rounded-xl bg-slate-800/90 hover:bg-blue-600 text-slate-300 hover:text-white border border-slate-700/70 hover:border-blue-500 shadow-sm flex items-center justify-center transition-all duration-200 group"
            title="Desplegar menú lateral"
            aria-label="Desplegar menú lateral"
          >
            <PanelLeftOpen className="h-4 w-4 text-slate-300 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
          </button>
        </div>
      )}

      {/* Navegación */}
      <nav
        className={cn(
          'flex-1 overflow-y-auto overflow-x-hidden py-3 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent',
          isCollapsed ? 'px-2 space-y-3' : 'px-3 space-y-5'
        )}
      >
        {navSections.map((section, idx) => (
          <div key={section.label}>
            {/* Header de sección */}
            {!isCollapsed ? (
              <div className="px-3 mb-1.5">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  {section.label}
                </span>
              </div>
            ) : idx > 0 ? (
              <div className="h-px bg-slate-800/80 my-2 mx-2" />
            ) : null}

            {/* Ítems de sección */}
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = isActiveLink(item.href);
                const isExpanded = expandedMenus.includes(item.href);
                const hasChildren = item.children && item.children.length > 0;
                const Icon = item.icon;

                // Modo Colapsado
                if (isCollapsed) {
                  if (hasChildren) {
                    return (
                      <div key={item.href} className="relative group/menu flex justify-center">
                        <button
                          type="button"
                          onClick={() => toggleMenu(item.href)}
                          className={cn(
                            'w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-150',
                            isActive || isExpanded
                              ? 'bg-slate-800 text-blue-400 ring-1 ring-slate-700 shadow-sm'
                              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                          )}
                          title={item.title}
                        >
                          <Icon className="h-5 w-5" />
                        </button>

                        {/* Flyout flotante con submenú al hacer hover */}
                        <div className="absolute left-full top-0 ml-3 w-56 bg-slate-900/95 backdrop-blur-md border border-slate-700/90 rounded-2xl shadow-2xl p-2 opacity-0 pointer-events-none group-hover/menu:opacity-100 group-hover/menu:pointer-events-auto transition-all duration-200 z-50 space-y-1">
                          <div className="px-3 py-1.5 border-b border-slate-800 mb-1">
                            <span className="text-xs font-bold text-white tracking-wide">{item.title}</span>
                          </div>
                          {item.children!.map((child) => {
                            const isChildActive = pathname === child.href;
                            const ChildIcon = child.icon;
                            return (
                              <Link
                                key={child.href}
                                href={child.href}
                                className={cn(
                                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                                  isChildActive
                                    ? 'bg-blue-600 text-white font-bold'
                                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                )}
                              >
                                <ChildIcon className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{child.title}</span>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={item.href} className="relative group/tooltip flex justify-center">
                      <Link
                        href={item.href}
                        className={cn(
                          'w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-150',
                          isActive
                            ? 'bg-gradient-to-br from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/25 ring-1 ring-blue-400/40'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        )}
                        title={item.title}
                      >
                        <Icon className="h-5 w-5" />
                      </Link>

                      {/* Tooltip flotante */}
                      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-slate-950/95 backdrop-blur text-white text-xs font-semibold rounded-lg shadow-2xl border border-slate-700/80 whitespace-nowrap opacity-0 pointer-events-none group-hover/tooltip:opacity-100 transition-opacity duration-150 z-50 flex items-center gap-2">
                        <span>{item.title}</span>
                        {item.badge && (
                          <span className="px-1.5 py-0.2 bg-blue-500/20 text-blue-300 text-[9px] font-black rounded uppercase">
                            {item.badge}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                }

                // Modo Expandido
                if (hasChildren) {
                  return (
                    <div key={item.href}>
                      <button
                        onClick={() => toggleMenu(item.href)}
                        className={cn(
                          'group w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                          isActive || isExpanded
                            ? 'bg-slate-800 text-white'
                            : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                        )}
                      >
                        <span className="flex items-center gap-3">
                          <div
                            className={cn(
                              'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                              isActive || isExpanded
                                ? 'bg-blue-500/20 text-blue-400'
                                : 'bg-slate-800 text-slate-500 group-hover:text-slate-400'
                            )}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <span>{item.title}</span>
                        </span>
                        <ChevronRight
                          className={cn(
                            'h-4 w-4 text-slate-600 transition-transform duration-200',
                            isExpanded && 'rotate-90'
                          )}
                        />
                      </button>

                      <div
                        className={cn(
                          'overflow-hidden transition-all duration-200',
                          isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                        )}
                      >
                        <div className="ml-5 mt-1 pl-4 border-l-2 border-slate-700/50 space-y-0.5">
                          {item.children!.map((child) => {
                            const isChildActive = pathname === child.href;
                            const ChildIcon = child.icon;
                            return (
                              <Link
                                key={child.href}
                                href={child.href}
                                className={cn(
                                  'flex items-center gap-2.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150',
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
                      'group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                      isActive
                        ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/25'
                        : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                    )}
                  >
                    <div
                      className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-500 group-hover:text-slate-400'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="flex-1">{item.title}</span>
                    {item.badge && (
                      <span
                        className={cn(
                          'px-1.5 py-0.5 rounded text-[9px] font-bold uppercase',
                          isActive ? 'bg-white/20 text-white' : 'bg-blue-500/10 text-blue-400'
                        )}
                      >
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

      {/* Footer */}
      {!isCollapsed ? (
        <div className="flex-shrink-0 p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-1">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center ring-1 ring-slate-700 text-slate-300 shrink-0">
              <Shield className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-300 truncate">Admin System</p>
              <p className="text-[10px] text-slate-500">v1.0.0 • Enterprise</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-shrink-0 p-3 border-t border-slate-800 flex justify-center">
          <div
            className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 ring-1 ring-slate-700"
            title="Admin System v1.0.0 • Enterprise"
          >
            <Shield className="h-4 w-4" />
          </div>
        </div>
      )}
    </aside>
  );
}
