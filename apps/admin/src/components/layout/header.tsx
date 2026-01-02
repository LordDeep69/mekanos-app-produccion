/**
 * MEKANOS S.A.S - Portal Admin
 * Header Component
 * 
 * Barra superior con información del usuario y logout
 */

'use client';

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
import { Bell, LogOut, Settings, User } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';

export function Header() {
  const { data: session } = useSession();

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  // Obtener iniciales del nombre
  const getInitials = (nombre?: string) => {
    if (!nombre) return 'U';
    const parts = nombre.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return nombre.substring(0, 2).toUpperCase();
  };

  return (
    <header className="fixed left-64 right-0 top-0 z-30 h-16 border-b bg-white">
      <div className="flex h-full items-center justify-between px-6">
        {/* Breadcrumb / Title área */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800">
            Portal de Administración
          </h2>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5 text-gray-600" />
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
              3
            </span>
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-mekanos-primary text-white text-sm">
                    {getInitials(session?.user?.nombre)}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden flex-col items-start md:flex">
                  <span className="text-sm font-medium">
                    {session?.user?.nombre || 'Usuario'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {session?.user?.rol || 'Sin rol'}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                Perfil
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Configuración
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-600 focus:bg-red-50 focus:text-red-600"
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
