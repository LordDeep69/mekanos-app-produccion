'use client';

/**
 * MEKANOS S.A.S - Portal Admin
 * Selector de Unidades de Medida Normalizadas (UnidadesMedidaSelect)
 * 
 * Consume GET /api/unidades-medida y agrupa por tipo de magnitud
 * (CANTIDAD, VOLUMEN, LONGITUD, MASA, CONJUNTO) mostrando el nombre formal
 * y símbolo ISO entre paréntesis (ej: "Galón (gal)").
 */

import React, { useEffect, useState, useMemo } from 'react';
import { Ruler, Scale, Boxes, Package, Activity, Loader2 } from 'lucide-react';

import { comprasService } from '@/lib/api/compras.service';
import { TipoMagnitud, UnidadMedida } from '@/types/compras.types';
import { cn } from '@/lib/utils';

export interface UnidadesMedidaSelectProps {
  value?: string;
  onChange: (codigo_unidad: string, unidad?: UnidadMedida | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

// Mapeo legible de magnitudes con etiquetas amigables
const MAGNITUD_LABELS: Record<TipoMagnitud, { label: string; icon: string }> = {
  CANTIDAD: { label: 'Conteo y Cantidad', icon: '🔢' },
  VOLUMEN: { label: 'Volumen y Capacidad', icon: '🧪' },
  LONGITUD: { label: 'Longitud y Distancia', icon: '📏' },
  MASA: { label: 'Masa y Peso', icon: '⚖️' },
  CONJUNTO: { label: 'Conjuntos y Agrupaciones', icon: '📦' },
};

export function UnidadesMedidaSelect({
  value,
  onChange,
  placeholder = 'Selecciona unidad...',
  disabled = false,
  className,
  id,
}: UnidadesMedidaSelectProps) {
  const [unidades, setUnidades] = useState<UnidadMedida[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadUnidades() {
      try {
        setIsLoading(true);
        const data = await comprasService.getUnidadesMedida();
        if (isMounted) {
          setUnidades(data);
        }
      } catch (e) {
        console.error('Error al cargar unidades de medida:', e);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadUnidades();
    return () => {
      isMounted = false;
    };
  }, []);

  // Agrupar unidades por tipo_magnitud
  const agrupadas = useMemo(() => {
    const ordenMagnitudes: TipoMagnitud[] = [
      'CANTIDAD',
      'VOLUMEN',
      'LONGITUD',
      'MASA',
      'CONJUNTO',
    ];

    const map = new Map<TipoMagnitud, UnidadMedida[]>();
    for (const m of ordenMagnitudes) {
      map.set(m, []);
    }

    for (const u of unidades) {
      const lista = map.get(u.tipo_magnitud) || [];
      lista.push(u);
      map.set(u.tipo_magnitud, lista);
    }

    return map;
  }, [unidades]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cod = e.target.value;
    const encontrada = unidades.find((u) => u.codigo_unidad === cod) || null;
    onChange(cod, encontrada);
  };

  return (
    <div className={cn('relative w-full', className)}>
      <select
        id={id}
        value={value || ''}
        onChange={handleChange}
        disabled={disabled || isLoading}
        className={cn(
          'flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 ring-offset-background transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
          disabled && 'cursor-not-allowed opacity-50 bg-gray-50',
          isLoading && 'text-gray-400'
        )}
      >
        <option value="" disabled>
          {isLoading ? 'Cargando unidades...' : placeholder}
        </option>

        {Array.from(agrupadas.entries()).map(([magnitud, items]) => {
          if (!items || items.length === 0) return null;
          const meta = MAGNITUD_LABELS[magnitud] || { label: magnitud, icon: '•' };

          return (
            <optgroup
              key={magnitud}
              label={`${meta.icon} ${meta.label}`}
              className="font-bold text-gray-900 bg-gray-50"
            >
              {items.map((u) => (
                <option
                  key={u.codigo_unidad}
                  value={u.codigo_unidad}
                  className="font-normal text-gray-800 bg-white"
                >
                  {u.nombre} ({u.simbolo})
                </option>
              ))}
            </optgroup>
          );
        })}
      </select>
    </div>
  );
}
