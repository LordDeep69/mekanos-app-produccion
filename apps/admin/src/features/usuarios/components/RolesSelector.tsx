/**
 * ROLES SELECTOR - GRID DE TARJETAS SELECCIONABLES
 * 
 * Componente para selección múltiple de roles mediante tarjetas visuales.
 * NO es un dropdown - es un grid interactivo con estados visuales claros.
 */

'use client';

import { cn } from '@/lib/utils';
import { Briefcase, CheckCircle2, Globe, HeadphonesIcon, Shield, UserCheck, Users, Wrench } from 'lucide-react';
import { useRoles } from '../lib/usuarios.service';
import type { Rol } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// MAPEO DE ICONOS POR CÓDIGO DE ROL
// ═══════════════════════════════════════════════════════════════════════════════

const ROL_ICONS: Record<string, React.ElementType> = {
  'ADMIN': Shield,
  'GERENTE': Users,
  'SUPERVISOR': UserCheck,
  'TECNICO': Wrench,
  'ASESOR': Briefcase,
  'AUXILIAR': HeadphonesIcon,
  'CLIENTE_PORTAL': Globe,
};

// ═══════════════════════════════════════════════════════════════════════════════
// PROPS DEL COMPONENTE
// ═══════════════════════════════════════════════════════════════════════════════

interface RolesSelectorProps {
  /** IDs de roles seleccionados */
  value: number[];
  /** Callback cuando cambia la selección */
  onChange: (selectedIds: number[]) => void;
  /** Roles a mostrar (si no se provee, se cargan del API) */
  roles?: Rol[];
  /** Permite selección múltiple (default: true) */
  multiple?: boolean;
  /** Mensaje de error */
  error?: string;
  /** Deshabilitar selección */
  disabled?: boolean;
  /** Número de columnas en el grid */
  columns?: 2 | 3 | 4;
  /** Mostrar descripción en las tarjetas */
  showDescription?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TARJETA DE ROL
// ═══════════════════════════════════════════════════════════════════════════════

interface RolCardProps {
  rol: Rol;
  isSelected: boolean;
  onToggle: () => void;
  disabled?: boolean;
  showDescription?: boolean;
}

function RolCard({ rol, isSelected, onToggle, disabled, showDescription = true }: RolCardProps) {
  // Obtener el componente de ícono directamente del mapeo
  const IconComponent = ROL_ICONS[rol.codigo_rol] || Users;
  const colorHex = rol.color_hex || '#6B7280';
  
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled || !rol.activo}
      className={cn(
        // Base
        'relative flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        // Estado normal
        !isSelected && !disabled && 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md',
        // Estado seleccionado
        isSelected && 'border-opacity-100 bg-opacity-10 shadow-lg scale-[1.02]',
        // Estado deshabilitado
        disabled && 'opacity-50 cursor-not-allowed',
        !rol.activo && 'opacity-40 cursor-not-allowed'
      )}
      style={{
        borderColor: isSelected ? colorHex : undefined,
        backgroundColor: isSelected ? `${colorHex}15` : undefined,
      }}
    >
      {/* Indicador de selección */}
      {isSelected && (
        <div 
          className="absolute top-2 right-2"
          style={{ color: colorHex }}
        >
          <CheckCircle2 className="h-5 w-5" />
        </div>
      )}
      
      {/* Icono del rol */}
      <div 
        className={cn(
          'flex items-center justify-center w-12 h-12 rounded-full mb-3',
          isSelected ? 'text-white' : 'text-gray-600 bg-gray-100'
        )}
        style={{
          backgroundColor: isSelected ? colorHex : undefined,
        }}
      >
        <IconComponent className="h-6 w-6" />
      </div>
      
      {/* Nombre del rol */}
      <h3 
        className={cn(
          'font-semibold text-sm text-center',
          isSelected ? 'text-gray-900' : 'text-gray-700'
        )}
      >
        {rol.nombre_rol}
      </h3>
      
      {/* Descripción */}
      {showDescription && rol.descripcion && (
        <p className="text-xs text-gray-500 mt-1 text-center line-clamp-2">
          {rol.descripcion}
        </p>
      )}
      
      {/* Badge de accesos */}
      <div className="flex gap-1 mt-2">
        {rol.permite_acceso_web && (
          <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
            Web
          </span>
        )}
        {rol.permite_acceso_movil && (
          <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded">
            Móvil
          </span>
        )}
      </div>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export function RolesSelector({
  value,
  onChange,
  roles: propRoles,
  multiple = true,
  error,
  disabled,
  columns = 3,
  showDescription = true,
}: RolesSelectorProps) {
  // Cargar roles del API si no se proveen
  const { data: apiRoles, isLoading, isError } = useRoles();
  const roles = propRoles || apiRoles || [];

  // Grid columns class
  const gridClass = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 sm:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
  }[columns];

  const handleToggle = (rolId: number) => {
    if (disabled) return;
    
    if (multiple) {
      // Selección múltiple
      if (value.includes(rolId)) {
        onChange(value.filter(id => id !== rolId));
      } else {
        onChange([...value, rolId]);
      }
    } else {
      // Selección única
      if (value.includes(rolId)) {
        onChange([]);
      } else {
        onChange([rolId]);
      }
    }
  };

  // Estado de carga
  if (isLoading) {
    return (
      <div className={cn('grid gap-3', gridClass)}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="h-32 rounded-xl border-2 border-gray-100 bg-gray-50 animate-pulse"
          />
        ))}
      </div>
    );
  }

  // Error al cargar
  if (isError) {
    return (
      <div className="p-4 border-2 border-red-200 bg-red-50 rounded-xl text-center">
        <p className="text-red-600 font-medium">Error al cargar roles</p>
        <p className="text-red-500 text-sm">Intente recargar la página</p>
      </div>
    );
  }

  // Sin roles
  if (roles.length === 0) {
    return (
      <div className="p-4 border-2 border-gray-200 bg-gray-50 rounded-xl text-center">
        <p className="text-gray-600">No hay roles disponibles</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Instrucción */}
      <p className="text-sm text-gray-500">
        {multiple 
          ? 'Seleccione uno o más roles para el usuario' 
          : 'Seleccione un rol para el usuario'}
      </p>
      
      {/* Grid de tarjetas */}
      <div className={cn('grid gap-3', gridClass)}>
        {roles
          .filter(rol => rol.activo)
          .map((rol) => (
            <RolCard
              key={rol.id_rol}
              rol={rol}
              isSelected={value.includes(rol.id_rol)}
              onToggle={() => handleToggle(rol.id_rol)}
              disabled={disabled}
              showDescription={showDescription}
            />
          ))}
      </div>
      
      {/* Roles seleccionados (resumen) */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          <span className="text-xs text-gray-500">Seleccionados:</span>
          {value.map(id => {
            const rol = roles.find(r => r.id_rol === id);
            return rol ? (
              <span 
                key={id}
                className="text-xs px-2 py-1 rounded-full text-white font-medium"
                style={{ backgroundColor: rol.color_hex || '#6B7280' }}
              >
                {rol.nombre_rol}
              </span>
            ) : null;
          })}
        </div>
      )}
      
      {/* Error */}
      {error && (
        <p className="text-sm text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
}

export default RolesSelector;
