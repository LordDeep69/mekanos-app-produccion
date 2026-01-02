/**
 * MEKANOS S.A.S - Portal Admin
 * Sidebar Component
 * 
 * Color de fondo: #244673 (mekanos-primary)
 * Navegación principal del sistema
 */

'use client';

import { cn } from '@/lib/utils';
import {
    Building2,
    Calendar,
    ClipboardList,
    FileText,
    LayoutDashboard,
    Package,
    Settings,
    Users,
    Wrench,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Clientes',
    href: '/clientes',
    icon: Building2,
  },
  {
    title: 'Empleados',
    href: '/empleados',
    icon: Users,
  },
  {
    title: 'Equipos',
    href: '/equipos',
    icon: Wrench,
  },
  {
    title: 'Órdenes',
    href: '/ordenes',
    icon: ClipboardList,
  },
  {
    title: 'Agenda',
    href: '/agenda',
    icon: Calendar,
  },
  {
    title: 'Inventario',
    href: '/inventario',
    icon: Package,
  },
  {
    title: 'Reportes',
    href: '/reportes',
    icon: FileText,
  },
  {
    title: 'Configuración',
    href: '/configuracion',
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-gradient-to-b from-[#244673] to-[#1a3456] border-r border-white/10 shadow-lg">
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-white/10">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white">
            <span className="text-xl font-bold text-mekanos-primary">M</span>
          </div>
          <span className="text-xl font-bold text-white">MEKANOS</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 p-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/30',
                isActive
                  ? 'bg-white/20 text-white shadow-md before:content-["\""] before:absolute before:left-0 before:top-1 before:bottom-1 before:w-1 before:rounded-r-md before:bg-white/60'
                  : 'text-white/90 hover:bg-white/12 hover:text-white hover:translate-x-0.5'
              )}
            >
              <Icon className="h-5 w-5 text-white/90 transition-colors duration-200 group-hover:text-white" />
              {item.title}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 p-4">
        <p className="text-center text-xs text-white/50">
          Portal Admin v1.0.0
        </p>
      </div>
    </aside>
  );
}
