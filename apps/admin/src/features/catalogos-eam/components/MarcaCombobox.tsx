/**
 * COMBOBOX RELACIONAL DE MARCAS Y FABRICANTES OEM - MEKANOS S.A.S
 *
 * Conecta directamente con el Catálogo Maestro de Marcas (`GET /api/marcas` / `POST /api/marcas`).
 *
 * Características:
 * - Búsqueda en tiempo real con filtrado instantáneo.
 * - Registro al vuelo de nuevas marcas oficiales (`+ Registrar "..." como Marca Oficial`) con mutación atómica.
 * - Renderizado en Portal Flotante (evita recortes por overflow: hidden o límites de modales).
 * - Distinción visual para Fabricantes OEM con badge `OEM` y país de origen.
 * - Soporte ergonómico de teclado (Escape, Enter, Flechas).
 */

'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Check,
  ChevronsUpDown,
  Factory,
  Globe,
  Loader2,
  Plus,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useMarcasEam, useCrearMarcaEam } from '../hooks/use-marcas-eam';
import { Marca } from '@/types/compras.types';
import { cn } from '@/lib/utils';

export interface MarcaComboboxProps {
  value?: string | null;
  onChange: (marcaNombre: string, marcaObj?: Marca | null) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  size?: 'sm' | 'md';
  id?: string;
}

export function MarcaCombobox({
  value,
  onChange,
  placeholder = 'Buscar o registrar marca...',
  disabled = false,
  required = false,
  className = '',
  size = 'md',
  id,
}: MarcaComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [mounted, setMounted] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { data: marcas = [], isLoading } = useMarcasEam(undefined, 200);
  const crearMarcaMut = useCrearMarcaEam();

  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
    openUpward: boolean;
  }>({
    top: 0,
    left: 0,
    width: 240,
    openUpward: false,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentValue = (value || '').trim().toUpperCase();

  // Calcular posición del popover respecto a la ventana
  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownHeight = 280;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

    setCoords({
      top: openUpward ? rect.top - 8 : rect.bottom + 6,
      left: rect.left,
      width: Math.max(rect.width, 260),
      openUpward,
    });
  };

  useEffect(() => {
    if (!isOpen) return;

    updatePosition();
    const handleScroll = () => updatePosition();
    const handleResize = () => updatePosition();

    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);

    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 40);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, [isOpen]);

  // Cierre al hacer clic fuera
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
      setSearchTerm('');
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Filtrado de marcas
  const marcasFiltradas = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return marcas;
    return marcas.filter(
      (m) =>
        m.nombre.toLowerCase().includes(term) ||
        (m.pais_origen && m.pais_origen.toLowerCase().includes(term)) ||
        (m.descripcion && m.descripcion.toLowerCase().includes(term)),
    );
  }, [marcas, searchTerm]);

  // Verificar si el término actual coincide exactamente con alguna marca
  const exactMatch = useMemo(() => {
    const term = searchTerm.trim().toUpperCase();
    if (!term) return null;
    return marcas.find((m) => m.nombre.toUpperCase() === term) || null;
  }, [marcas, searchTerm]);

  const marcaSeleccionada = useMemo(() => {
    if (!currentValue) return null;
    return marcas.find((m) => m.nombre.toUpperCase() === currentValue) || null;
  }, [marcas, currentValue]);

  const handleSelectMarca = (m: Marca) => {
    onChange(m.nombre.toUpperCase(), m);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleCreateNewMarca = async (nombreIngresado: string) => {
    const cleanNombre = nombreIngresado.trim().toUpperCase();
    if (!cleanNombre) return;

    try {
      const nueva = await crearMarcaMut.mutateAsync({
        nombre: cleanNombre,
        es_fabricante_oem: true,
      });
      toast.success(`Marca '${nueva.nombre}' registrada como Fabricante OEM oficial`);
      onChange(nueva.nombre, nueva);
      setIsOpen(false);
      setSearchTerm('');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || `No se pudo registrar la marca '${cleanNombre}'`);
    }
  };

  const isSmall = size === 'sm';

  return (
    <div className={cn('relative inline-block w-full', className)}>
      {/* Botón Disparador */}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setIsOpen(!isOpen);
        }}
        className={cn(
          'w-full flex items-center justify-between text-left transition-all border outline-none cursor-pointer',
          isSmall
            ? 'h-9 px-3 rounded-xl text-xs'
            : 'h-10 px-3.5 rounded-xl text-sm',
          disabled
            ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
            : isOpen
              ? 'bg-white border-blue-500 ring-2 ring-blue-100 shadow-2xs'
              : 'bg-white border-slate-300 hover:border-slate-400 shadow-2xs',
        )}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
          {currentValue ? (
            <div className="flex items-center gap-2 truncate">
              <span className="font-extrabold uppercase text-slate-900 font-mono tracking-tight">
                {currentValue}
              </span>
              {marcaSeleccionada?.es_fabricante_oem && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-blue-50 text-blue-700 border border-blue-200 tracking-wider">
                  OEM
                </span>
              )}
              {marcaSeleccionada?.pais_origen && (
                <span className="hidden sm:inline text-[10px] text-slate-400 font-medium">
                  ({marcaSeleccionada.pais_origen})
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-400 font-normal truncate">
              {placeholder}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 text-slate-400">
          {currentValue && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange('', null);
              }}
              className="p-1 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
              title="Borrar selección"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronsUpDown className="h-4 w-4" />
        </div>
      </button>

      {/* Popover Portal Flotante */}
      {mounted &&
        isOpen &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: 'fixed',
              top: coords.openUpward ? undefined : coords.top,
              bottom: coords.openUpward ? window.innerHeight - coords.top : undefined,
              left: coords.left,
              width: coords.width,
              zIndex: 99999,
            }}
            className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[340px]"
          >
            {/* Cabecera con Buscador en Vivo */}
            <div className="p-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
              <Search className="h-4 w-4 text-slate-400 shrink-0 ml-1" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setIsOpen(false);
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    if (marcasFiltradas.length > 0) {
                      handleSelectMarca(marcasFiltradas[0]);
                    } else if (searchTerm.trim()) {
                      handleCreateNewMarca(searchTerm);
                    }
                  }
                }}
                placeholder="Escribe para buscar o registrar..."
                className="w-full text-xs font-semibold text-slate-800 bg-transparent placeholder-slate-400 focus:outline-none"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Opción de Registrar Nueva Marca si no existe coincidencia exacta */}
            {searchTerm.trim() && !exactMatch && (
              <div className="p-2 bg-gradient-to-r from-blue-50/70 to-indigo-50/50 border-b border-blue-100">
                <button
                  type="button"
                  disabled={crearMarcaMut.isPending}
                  onClick={() => handleCreateNewMarca(searchTerm)}
                  className="w-full text-left px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-between gap-2 cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    {crearMarcaMut.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5 text-amber-300 shrink-0" />
                    )}
                    <span className="truncate">
                      + Registrar &quot;{searchTerm.trim().toUpperCase()}&quot; como Marca Oficial
                    </span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-blue-500/80 text-white shrink-0">
                    OEM
                  </span>
                </button>
              </div>
            )}

            {/* Listado de Marcas */}
            <div className="overflow-y-auto p-1.5 space-y-0.5 flex-1 max-h-[220px]">
              {isLoading ? (
                <div className="py-6 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  <span>Cargando catálogo maestro...</span>
                </div>
              ) : marcasFiltradas.length === 0 ? (
                <div className="py-6 px-4 text-center text-xs text-slate-500">
                  <p className="font-semibold text-slate-700">No se encontró &quot;{searchTerm}&quot;</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Usa el botón superior para registrarla como marca oficial en el catálogo maestro.
                  </p>
                </div>
              ) : (
                marcasFiltradas.map((m) => {
                  const isSelected = m.nombre.toUpperCase() === currentValue;
                  return (
                    <button
                      key={m.id_marca}
                      type="button"
                      onClick={() => handleSelectMarca(m)}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-colors cursor-pointer',
                        isSelected
                          ? 'bg-blue-50 text-blue-900 font-extrabold'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-medium',
                      )}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-mono font-bold uppercase tracking-tight">
                          {m.nombre}
                        </span>
                        {m.es_fabricante_oem && (
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-blue-100/70 text-blue-800 border border-blue-200">
                            OEM
                          </span>
                        )}
                        {m.pais_origen && (
                          <span className="text-[10px] text-slate-400 font-normal truncate">
                            • {m.pais_origen}
                          </span>
                        )}
                      </div>

                      {isSelected && (
                        <Check className="h-4 w-4 text-blue-600 shrink-0 ml-2" />
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Pie con Conteo */}
            <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <Factory className="h-3 w-3 text-slate-400" />
                <span>Catálogo de Fabricantes</span>
              </span>
              <span>{marcas.length} marcas</span>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
