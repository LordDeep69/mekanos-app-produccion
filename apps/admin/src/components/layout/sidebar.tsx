'use client';

/**
 * Sidebar Component - Portal Admin White-Label + RBAC Dinámico
 */

import { useSidebar } from '@/components/layout/sidebar-context';
import { canAccessRoute } from '@/lib/rbac';
import { cn } from '@/lib/utils';
import { useBranding } from '@/providers/branding-provider';
import {
  Activity,
  Boxes,
  Building2,
  Calendar,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Cpu,
  FileBarChart,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  HardDrive,
  Layers,
  LayoutGrid,
  ListTodo,
  Mail,
  Package,
  PackageCheck,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  Settings2,
  Shield,
  ShoppingBag,
  ShoppingCart,
  Tag,
  Truck,
  Users2,
  Wrench,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo, useState, type ComponentType } from 'react';

interface NavChild {
  title: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
}

interface NavItem {
  title: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  badge?: string;
  children?: NavChild[];
}

interface NavSection {
  label: string;
  featureFlag?: 'comercial' | 'inventario';
  items: NavItem[];
}

const RAW_NAV_SECTIONS: NavSection[] = [
  {
    label: 'Principal',
    items: [
      { title: 'Dashboard', href: '/dashboard', icon: LayoutGrid },
      { title: 'Órdenes de Servicio', href: '/ordenes', icon: ClipboardList },
      { title: 'Agenda Operativa', href: '/agenda', icon: Calendar },
    ],
  },
  {
    label: 'Operación y Activos',
    items: [
      { title: 'Clientes', href: '/clientes', icon: Building2 },
      { title: 'Equipos', href: '/equipos', icon: Wrench },
      { title: 'Contratos', href: '/contratos', icon: FileCheck2 },
      { title: 'Cronogramas', href: '/cronogramas', icon: CalendarClock },
      { title: 'Empleados', href: '/empleados', icon: Users2 },
    ],
  },
  {
    label: 'Comercial',
    featureFlag: 'comercial',
    items: [
      { title: 'Cotizaciones', href: '/comercial/cotizaciones', icon: FileSpreadsheet },
      { title: 'Propuestas Correctivo', href: '/comercial/propuestas', icon: FileText },
    ],
  },
  {
    label: 'Inventario y Compras',
    featureFlag: 'inventario',
    items: [
      { title: 'Inventario WMS', href: '/inventario', icon: Package },
      { title: 'Remisiones', href: '/inventario/remisiones', icon: PackageCheck },
      {
        title: 'Gestión de Compras',
        href: '/compras',
        icon: ShoppingCart,
        children: [
          { title: 'Órdenes de Compra', href: '/compras/ordenes', icon: ShoppingBag },
          { title: 'Catálogo Maestro', href: '/compras/catalogo', icon: Boxes },
          { title: 'Marcas y Fabricantes', href: '/compras/marcas', icon: Tag },
          { title: 'Familias y Taxonomía', href: '/compras/categorias', icon: Layers },
          { title: 'Directorio Proveedores', href: '/compras/proveedores', icon: Truck },
        ],
      },
    ],
  },
  {
    label: 'Análisis',
    items: [{ title: 'Reportes', href: '/reportes', icon: FileBarChart }],
  },
  {
    label: 'Configuración',
    items: [
      {
        title: 'Empresa y Marca',
        href: '/configuracion/empresa',
        icon: Palette,
      },
      {
        title: 'Catálogo Equipos EAM',
        href: '/configuracion/catalogos-eam',
        icon: Cpu,
      },
      {
        title: 'Catálogos Operativos',
        href: '/configuracion/catalogos',
        icon: HardDrive,
        children: [
          {
            title: 'Tipos de Servicio y Protocolos',
            href: '/configuracion/catalogos/tipos-servicio',
            icon: Activity,
          },
          {
            title: 'Banco Universal de Actividades',
            href: '/configuracion/catalogos/actividades',
            icon: ClipboardList,
          },
          {
            title: 'Servicios Específicos',
            href: '/configuracion/catalogos/servicios',
            icon: Tag,
          },
          {
            title: 'Estados de Orden',
            href: '/configuracion/catalogos/estados',
            icon: CheckCircle2,
          },
          {
            title: 'Pendientes Técnicos',
            href: '/configuracion/catalogos/pendientes',
            icon: ListTodo,
          },
        ],
      },
      {
        title: 'Firmas Administrativas',
        href: '/configuracion/firmas-administrativas',
        icon: Building2,
      },
      { title: 'Cuentas de Email', href: '/configuracion/cuentas-email', icon: Mail },
      { title: 'Sistema', href: '/configuracion', icon: Settings2 },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const { isCollapsed, toggle } = useSidebar();
  const { branding } = useBranding();
  const [manualMenus, setManualMenus] = useState<string[]>([]);
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);

  const navSections = useMemo(() => {
    const claims =
      status === 'authenticated'
        ? {
            rol: session?.user?.rol,
            roles: session?.user?.roles,
            permisos: session?.user?.permisos,
          }
        : null;

    return RAW_NAV_SECTIONS.filter((sec) => {
      if (sec.featureFlag === 'comercial' && !branding.modulo_comercial_activo) return false;
      if (sec.featureFlag === 'inventario' && !branding.modulo_inventario_activo) return false;
      return true;
    })
      .map((sec) => {
        const items = sec.items
          .map((item) => {
            if (item.children) {
              const allowedChildren = claims
                ? item.children.filter((ch) => canAccessRoute(ch.href, claims))
                : item.children;
              if (allowedChildren.length === 0) return null;
              return { ...item, children: allowedChildren };
            }
            if (claims && !canAccessRoute(item.href, claims)) return null;
            return item;
          })
          .filter((it): it is NavItem => it !== null);
        return { ...sec, items };
      })
      .filter((sec) => sec.items.length > 0);
  }, [branding.modulo_comercial_activo, branding.modulo_inventario_activo, session, status]);

  const autoExpandedHref =
    pathname === '/configuracion/catalogos' || pathname?.startsWith('/configuracion/catalogos/')
      ? '/configuracion/catalogos'
      : pathname?.startsWith('/compras')
        ? '/compras'
        : null;

  const isAutoDismissed =
    autoExpandedHref !== null && dismissedKey === `${pathname}::${autoExpandedHref}`;

  const expandedMenus =
    autoExpandedHref && !isAutoDismissed && !manualMenus.includes(autoExpandedHref)
      ? [...manualMenus, autoExpandedHref]
      : manualMenus;

  const toggleMenu = (href: string) => {
    if (href === autoExpandedHref) {
      if (expandedMenus.includes(href)) {
        setDismissedKey(`${pathname}::${href}`);
        setManualMenus((prev) => prev.filter((h) => h !== href));
      } else {
        setDismissedKey(null);
        setManualMenus((prev) => (prev.includes(href) ? prev : [...prev, href]));
      }
      return;
    }
    setManualMenus((prev) =>
      prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href],
    );
  };

  const isActiveLink = (href: string) =>
    href === '/configuracion'
      ? pathname === '/configuracion'
      : pathname === href || pathname.startsWith(`${href}/`);

  const brandLogoUrl =
    branding.logo_claro_url || branding.isotipo_url || branding.logo_principal_url;
  const brandInitials = (branding.nombre_comercial || 'EA')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen flex flex-col border-r border-white/10 transition-all duration-300 ease-in-out select-none shadow-xl text-white',
        isCollapsed ? 'w-[72px]' : 'w-[272px]',
      )}
      style={{ backgroundColor: branding.color_secundario }}
    >
      {/* Header White-Label */}
      {!isCollapsed ? (
        <div className="flex-shrink-0 px-4 py-4 border-b border-white/10 flex items-center justify-between gap-2">
          <Link href="/dashboard" className="flex items-center gap-3 group min-w-0">
            <div className="relative shrink-0">
              {brandLogoUrl ? (
                <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center p-1 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={brandLogoUrl}
                    alt={branding.nombre_comercial}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              ) : (
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg font-extrabold text-sm text-white"
                  style={{
                    background: `linear-gradient(135deg, ${branding.color_primario}, ${branding.color_acento})`,
                  }}
                >
                  {brandInitials || 'EA'}
                </div>
              )}
              <div
                className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                style={{
                  backgroundColor: branding.color_exito,
                  borderColor: branding.color_secundario,
                }}
              />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-white tracking-tight leading-tight truncate">
                {branding.nombre_comercial}
              </h1>
              <p className="text-[9px] font-semibold text-white/60 uppercase tracking-wider truncate">
                Portal Admin
              </p>
            </div>
          </Link>
          <button
            type="button"
            onClick={toggle}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white/70 hover:text-white border border-white/10 flex items-center justify-center transition-all duration-200 shrink-0"
            title="Contraer menú lateral"
            aria-label="Contraer menú lateral"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="flex-shrink-0 py-3.5 border-b border-white/10 flex flex-col items-center justify-center gap-2.5">
          <Link
            href="/dashboard"
            className="group"
            title={`${branding.nombre_comercial} · Portal Admin`}
          >
            {brandLogoUrl ? (
              <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center p-1 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={brandLogoUrl}
                  alt={branding.nombre_comercial}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            ) : (
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg font-extrabold text-sm text-white"
                style={{
                  background: `linear-gradient(135deg, ${branding.color_primario}, ${branding.color_acento})`,
                }}
              >
                {brandInitials || 'EA'}
              </div>
            )}
          </Link>
          <button
            type="button"
            onClick={toggle}
            className="w-9 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white/75 hover:text-white border border-white/10 flex items-center justify-center transition-all duration-200"
            title="Desplegar menú lateral"
            aria-label="Desplegar menú lateral"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Navegación */}
      <nav
        className={cn(
          'flex-1 overflow-y-auto overflow-x-hidden py-3 custom-scrollbar',
          isCollapsed ? 'px-2 space-y-3' : 'px-3 space-y-5',
        )}
      >
        {navSections.map((section, idx) => (
          <div key={section.label}>
            {!isCollapsed ? (
              <div className="px-3 mb-1.5">
                <span className="text-[10px] font-black text-white/45 uppercase tracking-widest">
                  {section.label}
                </span>
              </div>
            ) : idx > 0 ? (
              <div className="h-px bg-white/10 my-2 mx-2" />
            ) : null}

            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = isActiveLink(item.href);
                const isExpanded = expandedMenus.includes(item.href);
                const hasChildren = Boolean(item.children?.length);
                const Icon = item.icon;

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
                              ? 'bg-white/15 text-white ring-1 ring-white/20 shadow-sm'
                              : 'text-white/65 hover:bg-white/10 hover:text-white',
                          )}
                          title={item.title}
                        >
                          <Icon className="h-5 w-5" />
                        </button>

                        <div
                          className="absolute left-full top-0 ml-3 w-56 backdrop-blur-md border border-white/15 rounded-2xl shadow-2xl p-2 opacity-0 pointer-events-none group-hover/menu:opacity-100 group-hover/menu:pointer-events-auto transition-all duration-200 z-50 space-y-1"
                          style={{ backgroundColor: branding.color_secundario }}
                        >
                          <div className="px-3 py-1.5 border-b border-white/10 mb-1">
                            <span className="text-xs font-bold text-white tracking-wide">
                              {item.title}
                            </span>
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
                                    ? 'text-white font-bold'
                                    : 'text-white/75 hover:bg-white/10 hover:text-white',
                                )}
                                style={
                                  isChildActive
                                    ? { backgroundColor: branding.color_primario }
                                    : undefined
                                }
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
                            ? 'text-white shadow-lg ring-1 ring-white/25'
                            : 'text-white/65 hover:bg-white/10 hover:text-white',
                        )}
                        style={
                          isActive
                            ? {
                                background: `linear-gradient(135deg, ${branding.color_primario}, ${branding.color_acento})`,
                              }
                            : undefined
                        }
                        title={item.title}
                      >
                        <Icon className="h-5 w-5" />
                      </Link>
                      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-slate-950/95 text-white text-xs font-semibold rounded-lg shadow-2xl border border-white/15 whitespace-nowrap opacity-0 pointer-events-none group-hover/tooltip:opacity-100 transition-opacity duration-150 z-50">
                        {item.title}
                      </div>
                    </div>
                  );
                }

                if (hasChildren) {
                  return (
                    <div key={item.href}>
                      <button
                        type="button"
                        onClick={() => toggleMenu(item.href)}
                        className={cn(
                          'group w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-lg text-[13.5px] font-medium transition-all duration-150',
                          isActive || isExpanded
                            ? 'bg-white/15 text-white'
                            : 'text-white/70 hover:bg-white/10 hover:text-white',
                        )}
                      >
                        <span className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={cn(
                              'w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0',
                              isActive || isExpanded
                                ? 'bg-white/20 text-white'
                                : 'bg-white/5 text-white/60 group-hover:text-white',
                            )}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className="truncate">{item.title}</span>
                        </span>
                        <ChevronRight
                          className={cn(
                            'h-4 w-4 text-white/40 transition-transform duration-200 shrink-0',
                            isExpanded && 'rotate-90',
                          )}
                        />
                      </button>

                      <div
                        className={cn(
                          'overflow-hidden transition-all duration-200',
                          isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0',
                        )}
                      >
                        <div className="ml-5 mt-1 pl-4 border-l-2 border-white/15 space-y-0.5">
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
                                    ? 'text-white font-semibold bg-white/10 border-l-2 border-white -ml-[2px] pl-[14px]'
                                    : 'text-white/60 hover:bg-white/5 hover:text-white',
                                )}
                              >
                                <ChildIcon className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{child.title}</span>
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
                      'group flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13.5px] font-medium transition-all duration-150',
                      isActive
                        ? 'text-white shadow-lg'
                        : 'text-white/70 hover:bg-white/10 hover:text-white',
                    )}
                    style={
                      isActive
                        ? {
                            background: `linear-gradient(90deg, ${branding.color_primario}, ${branding.color_acento})`,
                          }
                        : undefined
                    }
                  >
                    <div
                      className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0',
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-white/5 text-white/60 group-hover:text-white',
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="flex-1 truncate">{item.title}</span>
                    {item.badge && (
                      <span
                        className={cn(
                          'px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0',
                          isActive ? 'bg-white/20 text-white' : 'bg-white/10 text-white/80',
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
        <div className="flex-shrink-0 p-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-1">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center ring-1 ring-white/15 text-white/80 shrink-0">
              <Shield className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white/85 truncate">
                {branding.nombre_comercial}
              </p>
              <p className="text-[10px] text-white/50 truncate">EAM White-Label Suite</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-shrink-0 p-3 border-t border-white/10 flex justify-center">
          <div
            className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white/80 ring-1 ring-white/15"
            title={`${branding.nombre_comercial} • EAM White-Label Suite`}
          >
            <Shield className="h-4 w-4" />
          </div>
        </div>
      )}
    </aside>
  );
}
