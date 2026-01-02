/**
 * TABLA DE USUARIOS - MEKANOS S.A.S
 * 
 * Componente de tabla con:
 * - Avatar
 * - Nombre completo
 * - Email
 * - Roles (badges de colores)
 * - Estado (switch interactivo)
 * - Acciones
 */

'use client';

import { cn } from '@/lib/utils';
import {
    AlertCircle,
    ChevronLeft, ChevronRight,
    Edit2,
    Eye,
    Key,
    Loader2,
    Mail,
    MoreVertical,
    RefreshCw,
    Search,
    Trash2,
    User
} from 'lucide-react';
import { useState } from 'react';
import { useActualizarEstadoUsuario, useUsuarios } from '../lib/usuarios.service';
import type { UsuarioListItem } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTES AUXILIARES
// ═══════════════════════════════════════════════════════════════════════════════

function Avatar({ nombre, size = 'md' }: { nombre: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = nombre
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase();
  
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  };

  // Color basado en el nombre
  const colors = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 
    'bg-pink-500', 'bg-orange-500', 'bg-teal-500'
  ];
  const colorIndex = nombre.charCodeAt(0) % colors.length;

  return (
    <div className={cn(
      sizes[size],
      colors[colorIndex],
      'rounded-full flex items-center justify-center text-white font-medium'
    )}>
      {initials}
    </div>
  );
}

function RolBadge({ nombre, color }: { nombre: string; color?: string }) {
  return (
    <span 
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
      style={{ backgroundColor: color || '#6B7280' }}
    >
      {nombre}
    </span>
  );
}

function EstadoSwitch({ 
  estado, 
  onChange, 
  loading 
}: { 
  estado: string | null; 
  onChange: (nuevoEstado: string) => void;
  loading?: boolean;
}) {
  const isActivo = estado === 'ACTIVO';
  
  return (
    <button
      onClick={() => onChange(isActivo ? 'INACTIVO' : 'ACTIVO')}
      disabled={loading}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
        isActivo ? 'bg-green-500' : 'bg-gray-300',
        loading && 'opacity-50 cursor-not-allowed'
      )}
    >
      {loading ? (
        <Loader2 className="absolute left-1/2 -translate-x-1/2 h-3 w-3 animate-spin text-white" />
      ) : (
        <span className={cn(
          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
          isActivo ? 'translate-x-6' : 'translate-x-1'
        )} />
      )}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════════════════════

interface UsuariosTableProps {
  onView?: (usuario: UsuarioListItem) => void;
  onEdit?: (usuario: UsuarioListItem) => void;
  onResetPassword?: (usuario: UsuarioListItem) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export function UsuariosTable({ onView, onEdit, onResetPassword }: UsuariosTableProps) {
  const [page, setPage] = useState(1);
  const [busqueda, setBusqueda] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState<string>('');
  const [menuAbierto, setMenuAbierto] = useState<number | null>(null);
  const [actualizandoEstado, setActualizandoEstado] = useState<number | null>(null);

  const { data, isLoading, isError, refetch } = useUsuarios({
    page,
    limit: 10,
    busqueda: busqueda || undefined,
    estado: estadoFiltro || undefined,
  });

  const actualizarEstadoMutation = useActualizarEstadoUsuario();

  const handleCambiarEstado = async (usuario: UsuarioListItem, nuevoEstado: string) => {
    setActualizandoEstado(usuario.id_usuario);
    try {
      await actualizarEstadoMutation.mutateAsync({
        id: usuario.id_usuario,
        estado: nuevoEstado,
      });
    } finally {
      setActualizandoEstado(null);
    }
  };

  const usuarios = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-4">
      {/* Barra de búsqueda y filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, email o identificación..."
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div className="flex gap-2">
          <select
            value={estadoFiltro}
            onChange={(e) => {
              setEstadoFiltro(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos los estados</option>
            <option value="ACTIVO">Activo</option>
            <option value="INACTIVO">Inactivo</option>
            <option value="SUSPENDIDO">Suspendido</option>
            <option value="BLOQUEADO">Bloqueado</option>
          </select>
          
          <button
            onClick={() => refetch()}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            title="Refrescar"
          >
            <RefreshCw className={cn('h-5 w-5 text-gray-600', isLoading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Estado de carga */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="flex flex-col items-center justify-center py-12 text-red-500">
          <AlertCircle className="h-8 w-8 mb-2" />
          <p className="font-medium">Error al cargar usuarios</p>
          <button 
            onClick={() => refetch()}
            className="mt-2 text-sm text-blue-600 hover:underline"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Tabla */}
      {!isLoading && !isError && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Identificación
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Roles
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Última Sesión
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {usuarios.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                      <User className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p>No se encontraron usuarios</p>
                    </td>
                  </tr>
                ) : (
                  usuarios.map((usuario) => (
                    <tr key={usuario.id_usuario} className="hover:bg-gray-50">
                      {/* Usuario */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar nombre={usuario.persona.nombre_completo} />
                          <div>
                            <p className="font-medium text-gray-900">
                              {usuario.persona.nombre_completo}
                            </p>
                            <div className="flex items-center gap-1 text-sm text-gray-500">
                              <Mail className="h-3 w-3" />
                              {usuario.email}
                            </div>
                            <p className="text-xs text-gray-400">@{usuario.username}</p>
                          </div>
                        </div>
                      </td>
                      
                      {/* Identificación */}
                      <td className="px-4 py-4 text-sm text-gray-600">
                        <span className="font-mono">
                          {usuario.persona.tipo_identificacion} {usuario.persona.numero_identificacion}
                        </span>
                      </td>
                      
                      {/* Roles */}
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-1">
                          {usuario.roles.map((rol) => (
                            <RolBadge 
                              key={rol.id_rol} 
                              nombre={rol.nombre_rol}
                            />
                          ))}
                          {usuario.roles.length === 0 && (
                            <span className="text-xs text-gray-400">Sin roles</span>
                          )}
                        </div>
                      </td>
                      
                      {/* Estado */}
                      <td className="px-4 py-4">
                        <EstadoSwitch
                          estado={usuario.estado}
                          onChange={(nuevoEstado) => handleCambiarEstado(usuario, nuevoEstado)}
                          loading={actualizandoEstado === usuario.id_usuario}
                        />
                      </td>
                      
                      {/* Última sesión */}
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {usuario.ultima_sesion 
                          ? new Date(usuario.ultima_sesion).toLocaleDateString('es-CO', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : <span className="text-gray-400">Nunca</span>
                        }
                      </td>
                      
                      {/* Acciones */}
                      <td className="px-4 py-4 text-right relative">
                        <button
                          onClick={() => setMenuAbierto(menuAbierto === usuario.id_usuario ? null : usuario.id_usuario)}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <MoreVertical className="h-5 w-5 text-gray-500" />
                        </button>
                        
                        {menuAbierto === usuario.id_usuario && (
                          <>
                            <div 
                              className="fixed inset-0 z-10" 
                              onClick={() => setMenuAbierto(null)} 
                            />
                            <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border z-20">
                              <div className="py-1">
                                <button
                                  onClick={() => {
                                    onView?.(usuario);
                                    setMenuAbierto(null);
                                  }}
                                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  <Eye className="h-4 w-4" />
                                  Ver detalle
                                </button>
                                <button
                                  onClick={() => {
                                    onEdit?.(usuario);
                                    setMenuAbierto(null);
                                  }}
                                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  <Edit2 className="h-4 w-4" />
                                  Editar
                                </button>
                                <button
                                  onClick={() => {
                                    onResetPassword?.(usuario);
                                    setMenuAbierto(null);
                                  }}
                                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  <Key className="h-4 w-4" />
                                  Resetear contraseña
                                </button>
                                <hr className="my-1" />
                                <button
                                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Eliminar
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
              <p className="text-sm text-gray-600">
                Mostrando {((pagination.page - 1) * pagination.limit) + 1} a{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} de{' '}
                {pagination.total} usuarios
              </p>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className={cn(
                    'flex items-center gap-1 px-3 py-1 rounded border',
                    page === 1 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  )}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= pagination.totalPages}
                  className={cn(
                    'flex items-center gap-1 px-3 py-1 rounded border',
                    page >= pagination.totalPages 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  )}
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default UsuariosTable;
