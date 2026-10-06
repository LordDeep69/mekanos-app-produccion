'use client';

/**
 * MEKANOS S.A.S - Portal Admin
 * Selector Jerárquico de Categorías Taxonómicas (HierarchicalCategorySelect)
 * 
 * Permite selección en cascada / árbol indentado, búsqueda rápida por `ruta_jerarquica`
 * y creación in-context de familias y subfamilias con preselección del padre.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Check,
  ChevronRight,
  ChevronsUpDown,
  Folder,
  FolderPlus,
  FolderTree,
  Loader2,
  Plus,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { comprasService } from '@/lib/api/compras.service';
import { CategoriaNodo, CreateCategoriaPayload } from '@/types/compras.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export interface HierarchicalCategorySelectProps {
  value?: number | null;
  onChange: (value: number | null, categoria?: CategoriaNodo | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  showClearButton?: boolean;
}

// Interfaz para aplanar el árbol manteniendo metadatos visuales
interface FlatCategoryItem extends CategoriaNodo {
  hasChildren: boolean;
  indent: number;
}

function flattenTree(nodes: CategoriaNodo[], indent = 0): FlatCategoryItem[] {
  const result: FlatCategoryItem[] = [];
  for (const node of nodes) {
    const hasChildren = Array.isArray(node.hijos) && node.hijos.length > 0;
    result.push({
      ...node,
      indent,
      hasChildren,
    });
    if (hasChildren && node.hijos) {
      result.push(...flattenTree(node.hijos, indent + 1));
    }
  }
  return result;
}

export function HierarchicalCategorySelect({
  value,
  onChange,
  placeholder = 'Seleccionar categoría taxonómica...',
  disabled = false,
  className,
  id,
  showClearButton = true,
}: HierarchicalCategorySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [arbol, setArbol] = useState<CategoriaNodo[]>([]);
  const [selectedCat, setSelectedCat] = useState<CategoriaNodo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Estado del modal de creación in-context
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalPadreId, setModalPadreId] = useState<number | null>(null);
  const [modalForm, setModalForm] = useState<CreateCategoriaPayload>({
    nombre: '',
    codigo_categoria: '',
    id_padre: null,
    descripcion: '',
  });
  const [isCreating, setIsCreating] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cargar árbol de categorías
  const cargarArbol = async (preserveValue?: number | null) => {
    try {
      setIsLoading(true);
      const data = await comprasService.getCategoriasArbol();
      setArbol(data);
      return data;
    } catch (e) {
      console.error('Error cargando árbol de categorías:', e);
      toast.error('No se pudo cargar el árbol de categorías taxonómicas');
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    cargarArbol();
  }, []);

  // Lista aplanada para visualización y búsqueda
  const flatList = useMemo(() => {
    return flattenTree(arbol);
  }, [arbol]);

  // Sincronizar selección actual con el valor externo `value`
  useEffect(() => {
    if (value) {
      const encontrada = flatList.find((c) => c.id_categoria === value);
      if (encontrada) {
        setSelectedCat(encontrada);
      }
    } else {
      setSelectedCat(null);
    }
  }, [value, flatList]);

  // Cierre por click exterior
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filtrado por búsqueda de texto plano sobre ruta_jerarquica o nombre
  const filteredList = useMemo(() => {
    if (!search.trim()) return flatList;
    const query = search.toLowerCase().trim();
    return flatList.filter(
      (cat) =>
        cat.nombre.toLowerCase().includes(query) ||
        (cat.ruta_jerarquica && cat.ruta_jerarquica.toLowerCase().includes(query)) ||
        (cat.codigo_categoria && cat.codigo_categoria.toLowerCase().includes(query))
    );
  }, [flatList, search]);

  const handleSelect = (cat: CategoriaNodo) => {
    setSelectedCat(cat);
    onChange(cat.id_categoria, cat);
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCat(null);
    onChange(null, null);
    setSearch('');
  };

  // Abrir modal de creación con padre opcional
  const handleOpenCreateModal = (padreId: number | null = null, nombreInicial = '') => {
    setModalPadreId(padreId);
    setModalForm({
      nombre: nombreInicial.trim().toUpperCase(),
      codigo_categoria: '',
      id_padre: padreId,
      descripcion: '',
    });
    setIsOpen(false);
    setIsModalOpen(true);
  };

  // Enviar creación in-context
  const handleSubmitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalForm.nombre.trim()) {
      toast.error('El nombre de la categoría es obligatorio');
      return;
    }

    // Generar código si viene vacío
    let codigo = modalForm.codigo_categoria?.trim();
    if (!codigo) {
      codigo = modalForm.nombre
        .trim()
        .slice(0, 10)
        .toUpperCase()
        .replace(/\s+/g, '_');
    }

    setIsCreating(true);
    try {
      const nueva = await comprasService.createCategoria({
        nombre: modalForm.nombre.trim().toUpperCase(),
        codigo_categoria: codigo,
        id_padre: modalPadreId || null,
        descripcion: modalForm.descripcion?.trim() || undefined,
      });

      toast.success(`Categoría "${nueva.nombre}" creada con éxito`, {
        description: `Ruta: ${nueva.ruta_jerarquica || nueva.nombre}`,
      });

      // Recargar árbol y autoseleccionar
      const nuevoArbol = await comprasService.getCategoriasArbol();
      setArbol(nuevoArbol);
      setSelectedCat(nueva);
      onChange(nueva.id_categoria, nueva);
      setIsModalOpen(false);
      setSearch('');
    } catch (error: any) {
      console.error('Error creando categoría in-context:', error);
      const msg = error?.response?.data?.message || error?.message || 'Error al registrar categoría';
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      {/* Gatillo / Botón Principal */}
      <div
        id={id}
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-expanded={isOpen}
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            if (!isOpen) {
              setTimeout(() => inputRef.current?.focus(), 50);
            }
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!disabled) setIsOpen(true);
          }
        }}
        className={cn(
          'flex min-h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
          disabled ? 'cursor-not-allowed opacity-50 bg-gray-50' : 'cursor-pointer hover:border-gray-400',
          isOpen && 'border-blue-500 ring-1 ring-blue-500'
        )}
      >
        <div className="flex items-center gap-2 overflow-hidden truncate">
          <FolderTree className="h-4 w-4 shrink-0 text-blue-600" />
          {selectedCat ? (
            <div className="flex flex-col truncate text-left">
              <span className="font-semibold text-gray-900 text-xs sm:text-sm truncate">
                {selectedCat.nombre}
              </span>
              {selectedCat.ruta_jerarquica && (
                <span className="text-[10px] text-gray-400 font-mono truncate">
                  {selectedCat.ruta_jerarquica}
                </span>
              )}
            </div>
          ) : (
            <span className="text-gray-400 text-xs sm:text-sm">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {selectedCat && showClearButton && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              title="Quitar categoría seleccionada"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-gray-400" />
        </div>
      </div>

      {/* Menú Desplegable con Búsqueda y Árbol */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-xl animate-in fade-in-0 zoom-in-95">
          {/* Cabecera con Búsqueda */}
          <div className="p-2 border-b border-gray-100 bg-gray-50/50">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
              <Input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre o ruta jerárquica..."
                className="pl-8 pr-3 h-8 text-xs bg-white border-gray-200"
                autoFocus
              />
            </div>
          </div>

          {/* Lista Jerárquica Indentada */}
          <div className="max-h-72 overflow-y-auto p-1 text-xs">
            {isLoading ? (
              <div className="py-6 text-center text-gray-500">
                <Loader2 className="mx-auto h-5 w-5 animate-spin text-blue-600" />
                <p className="mt-2 text-xs">Cargando taxonomía de categorías...</p>
              </div>
            ) : filteredList.length > 0 ? (
              <div className="space-y-0.5">
                {filteredList.map((cat) => {
                  const isSelected = selectedCat?.id_categoria === cat.id_categoria;
                  const indentPixels = (cat.nivel ?? cat.indent ?? 0) * 16;

                  return (
                    <div
                      key={cat.id_categoria}
                      className={cn(
                        'group flex items-center justify-between rounded-md py-1.5 px-2 transition-colors',
                        isSelected
                          ? 'bg-blue-50 text-blue-900 font-semibold'
                          : 'hover:bg-gray-100 text-gray-700'
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => handleSelect(cat)}
                        style={{ paddingLeft: `${indentPixels}px` }}
                        className="flex flex-1 items-center gap-1.5 text-left truncate"
                      >
                        {cat.nivel > 0 ? (
                          <span className="text-gray-300 font-mono text-[11px] select-none">└─</span>
                        ) : (
                          <Folder className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                        )}
                        <span className="truncate">{cat.nombre}</span>
                        {cat.codigo_categoria && (
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1 py-0 font-mono text-gray-400 border-gray-200 ml-1"
                          >
                            {cat.codigo_categoria}
                          </Badge>
                        )}
                      </button>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenCreateModal(cat.id_categoria);
                          }}
                          className="rounded p-1 text-blue-600 hover:bg-blue-100 transition-colors"
                          title={`Añadir subcategoría bajo "${cat.nombre}"`}
                        >
                          <FolderPlus className="h-3.5 w-3.5" />
                        </button>
                        {isSelected && <Check className="h-3.5 w-3.5 text-blue-600 shrink-0" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-6 text-center text-gray-500">
                <p className="text-xs">No se encontraron categorías para "{search}"</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenCreateModal(null, search)}
                  className="mt-2 text-xs text-blue-600"
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Crear categoría raíz "{search.toUpperCase()}"
                </Button>
              </div>
            )}
          </div>

          {/* Pie de Acción: Crear Nueva Categoría */}
          <div className="p-1 border-t border-gray-100 bg-gray-50/70 flex items-center justify-between">
            <button
              type="button"
              onClick={() => handleOpenCreateModal(null, search)}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100/70 transition-colors"
            >
              <Plus className="h-3.5 w-3.5 text-blue-600" />
              <span>+ Nueva Categoría Raíz</span>
            </button>
            <span className="text-[10px] text-gray-400 pr-2">
              {flatList.length} categorías registradas
            </span>
          </div>
        </div>
      )}

      {/* Mini-Modal Accesible (Radix Dialog) de Creación In-Context */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-gray-200 shadow-xl">
          <form onSubmit={handleSubmitCreate}>
            <DialogHeader className="border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2 text-blue-600">
                <Sparkles className="h-5 w-5" />
                <DialogTitle className="text-base font-bold text-gray-900">
                  Alta de Categoría Taxonómica
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-gray-500">
                Crea una categoría en el catálogo maestro para clasificar técnicamente los recursos.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 text-xs">
              {/* Categoría Padre */}
              <div className="space-y-1.5">
                <Label htmlFor="cat-padre" className="font-semibold text-gray-800">
                  Categoría Padre (Nivel Superior)
                </Label>
                <select
                  id="cat-padre"
                  value={modalPadreId || ''}
                  onChange={(e) =>
                    setModalPadreId(e.target.value ? Number(e.target.value) : null)
                  }
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">[ Ninguna - Categoría Raíz Nivel 1 ]</option>
                  {flatList.map((cat) => (
                    <option key={cat.id_categoria} value={cat.id_categoria}>
                      {'\u00A0'.repeat((cat.nivel ?? 0) * 4)}
                      {cat.nivel > 0 ? '└ ' : ''}
                      {cat.nombre} ({cat.codigo_categoria})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-400">
                  {modalPadreId
                    ? 'La nueva subcategoría heredará la ruta jerárquica del padre seleccionado.'
                    : 'Será una familia principal del catálogo.'}
                </p>
              </div>

              {/* Nombre de la Categoría */}
              <div className="space-y-1.5">
                <Label htmlFor="cat-nombre" className="font-semibold text-gray-800">
                  Nombre de la Categoría <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="cat-nombre"
                  value={modalForm.nombre}
                  onChange={(e) =>
                    setModalForm({ ...modalForm, nombre: e.target.value.toUpperCase() })
                  }
                  placeholder="Ej: FILTROS DE ACEITE, LUBRICANTES SINTÉTICOS"
                  className="text-xs font-semibold uppercase bg-white"
                  required
                  autoFocus
                />
              </div>

              {/* Código sugerido */}
              <div className="space-y-1.5">
                <Label htmlFor="cat-codigo" className="font-medium text-gray-700">
                  Código Técnico (Opcional)
                </Label>
                <Input
                  id="cat-codigo"
                  value={modalForm.codigo_categoria || ''}
                  onChange={(e) =>
                    setModalForm({
                      ...modalForm,
                      codigo_categoria: e.target.value.toUpperCase().replace(/\s+/g, '_'),
                    })
                  }
                  placeholder="Ej: FLT_ACEITE (Se autogenera si se omite)"
                  className="text-xs font-mono uppercase bg-white"
                />
              </div>

              {/* Descripción */}
              <div className="space-y-1.5">
                <Label htmlFor="cat-desc" className="font-medium text-gray-700">
                  Descripción o Criterio de Inclusión (Opcional)
                </Label>
                <Textarea
                  id="cat-desc"
                  rows={2}
                  value={modalForm.descripcion || ''}
                  onChange={(e) =>
                    setModalForm({ ...modalForm, descripcion: e.target.value })
                  }
                  placeholder="Alcance técnico o tipos de repuestos clasificados aquí..."
                  className="text-xs bg-white"
                />
              </div>
            </div>

            <DialogFooter className="border-t border-gray-100 pt-3 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                disabled={isCreating}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isCreating || !modalForm.nombre.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
              >
                {isCreating ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Creando...
                  </span>
                ) : (
                  '+ Crear y Seleccionar'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
