'use client';

/**
 * Header Component - Portal Admin White-Label
 */

import { useSidebar } from '@/components/layout/sidebar-context';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useBranding } from '@/providers/branding-provider';
import { LogOut, PanelLeftClose, PanelLeftOpen, Settings } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';

export function Header() {
  const { data: session } = useSession();
  const { isCollapsed, toggle } = useSidebar();
  const { branding } = useBranding();

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  const sanitizeUserName = (nombre?: string | null) => {
    const trimmed = nombre?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : 'Usuario';
  };

  const getInitials = (nombre?: string) => {
    const sName = sanitizeUserName(nombre);
    const parts = sName.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return sName.substring(0, 2).toUpperCase();
  };

  return (
    <header
      className={cn(
        'fixed right-0 top-0 z-30 h-16 border-b bg-white/95 backdrop-blur-sm transition-all duration-300 ease-in-out',
        isCollapsed ? 'left-[72px]' : 'left-64',
      )}
    >
      <div className="flex h-full items-center justify-between px-6">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            className="md:hidden h-9 w-9 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors shrink-0"
            title={isCollapsed ? 'Desplegar barra lateral' : 'Contraer barra lateral'}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="h-5 w-5" />
            ) : (
              <PanelLeftClose className="h-5 w-5" />
            )}
          </Button>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-800 tracking-tight truncate">
              {branding.nombre_comercial} · Portal Admin
            </h2>
            {branding.eslogan && (
              <p className="text-[11px] text-slate-500 truncate hidden sm:block">
                {branding.eslogan}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span
            className="hidden md:inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border"
            style={{
              backgroundColor: `${branding.color_primario}10`,
              borderColor: `${branding.color_primario}30`,
              color: branding.color_primario,
            }}
          >
            {branding.codigo_moneda} · {branding.zona_horaria}
          </span>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback
                    className="text-white text-sm font-semibold"
                    style={{ backgroundColor: branding.color_primario }}
                  >
                    {getInitials(session?.user?.nombre)}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden flex-col items-start md:flex">
                  <span className="text-sm font-medium text-slate-800">
                    {sanitizeUserName(session?.user?.nombre)}
                  </span>
                  <span className="text-xs text-slate-500">
                    {session?.user?.rol || 'Sin rol'}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/configuracion/empresa" className="flex items-center">
                  <Settings className="mr-2 h-4 w-4" />
                  Configuración de Empresa
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/configuracion" className="flex items-center">
                  <Settings className="mr-2 h-4 w-4" />
                  Centro de Configuración
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-600 focus:bg-red-50 focus:text-red-600 cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar Sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
