'use client';

/**
 * MEKANOS S.A.S - Portal Admin
 * Selector Jerárquico de Categorías Taxonómicas (HierarchicalCategorySelect)
 * 
 * Modos de Operación:
 * 1. 'cascading' (Recomendado para Formularios de Alta):
 *    - Selección multinivel guiada: Nivel 1 (Familia) ➔ Nivel 2 (Subcategoría) ➔ Nivel 3 (Sub-hija / Detalle).
 *    - Ruta jerárquica visualizada en migas de pan (Breadcrumbs).
 *    - Creación in-context de subcategorías con padre preseleccionado.
 *    - Alternancia rápida con buscador global directo por texto plano.
 * 
 * 2. 'combobox' (Recomendado para Barras de Filtros y Espacios Compactos):
 *    - Menú desplegable flotante con árbol indentado y búsqueda rápida.
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
  Layers,
  ArrowRight,
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
  variant?: 'combobox' | 'cascading';
}

// Interfaz para aplanar el árbol manteniendo metadatos visuales
interface FlatCategoryItem extends CategoriaNodo {
  hasChildren: boolean;
  indent: number;
}

function getChildren(node: CategoriaNodo): CategoriaNodo[] {
  return node.subcategorias || (node as any).hijos || [];
}

function flattenTree(nodes: CategoriaNodo[], indent = 0): FlatCategoryItem[] {
  const result: FlatCategoryItem[] = [];
  for (const node of nodes) {
    const children = getChildren(node);
    const hasChildren = Array.isArray(children) && children.length > 0;
    result.push({
      ...node,
      indent,
      hasChildren,
      subcategorias: children,
    });
    if (hasChildren) {
      result.push(...flattenTree(children, indent + 1));
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
  variant = 'combobox',
}: HierarchicalCategorySelectProps) {
  // Datos del árbol y lista plana
  const [arbol, setArbol] = useState<CategoriaNodo[]>([]);
  const [selectedCat, setSelectedCat] = useState<CategoriaNodo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Estados para modo 'combobox'
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Estados para modo 'cascading'
  const [selectedL1, setSelectedL1] = useState<number | null>(null);
  const [selectedL2, setSelectedL2] = useState<number | null>(null);
  const [selectedL3, setSelectedL3] = useState<number | null>(null);
  const [searchDirecto, setSearchDirecto] = useState('');
  const [modoBuscadorDirecto, setModoBuscadorDirecto] = useState(false);

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
  const cargarArbol = async () => {
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

  // Mapa rápido por ID
  const mapPorId = useMemo(() => {
    const map = new Map<number, CategoriaNodo>();
    for (const item of flatList) {
      map.set(item.id_categoria, item);
    }
    return map;
  }, [flatList]);

  // Sincronizar selección actual con el valor externo `value` y auto-poblar los niveles de la cascada
  useEffect(() => {
    if (value && mapPorId.has(value)) {
      const encontrada = mapPorId.get(value)!;
      setSelectedCat(encontrada);

      // Reconstruir la ruta de ancestros para fijar los selects de la cascada
      if (encontrada.nivel === 1) {
        setSelectedL1(encontrada.id_categoria);
        setSelectedL2(null);
        setSelectedL3(null);
      } else if (encontrada.nivel === 2) {
        setSelectedL1(encontrada.id_padre);
        setSelectedL2(encontrada.id_categoria);
        setSelectedL3(null);
      } else if (encontrada.nivel >= 3) {
        const padre = encontrada.id_padre ? mapPorId.get(encontrada.id_padre) : null;
        if (padre) {
          setSelectedL1(padre.id_padre);
          setSelectedL2(padre.id_categoria);
          setSelectedL3(encontrada.id_categoria);
        } else {
          setSelectedL2(encontrada.id_padre);
          setSelectedL3(encontrada.id_categoria);
        }
      }
    } else if (!value) {
      setSelectedCat(null);
      setSelectedL1(null);
      setSelectedL2(null);
      setSelectedL3(null);
    }
  }, [value, mapPorId]);

  // Cierre por click exterior en modo combobox
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

  // Opciones disponibles para cada nivel en modo Cascada
  const opcionesL1 = useMemo(() => {
    return arbol;
  }, [arbol]);

  const opcionesL2 = useMemo(() => {
    if (!selectedL1) return [];
    const nodoL1 = arbol.find((n) => n.id_categoria === selectedL1);
    return nodoL1 ? getChildren(nodoL1) : [];
  }, [arbol, selectedL1]);

  const opcionesL3 = useMemo(() => {
    if (!selectedL2) return [];
    const nodoL2 = flatList.find((n) => n.id_categoria === selectedL2);
    return nodoL2 ? getChildren(nodoL2) : [];
  }, [flatList, selectedL2]);

  // Filtrado por búsqueda de texto plano sobre ruta_jerarquica o nombre
  const filteredList = useMemo(() => {
    const q = (variant === 'cascading' ? searchDirecto : search).toLowerCase().trim();
    if (!q) return flatList;
    return flatList.filter(
      (cat) =>
        cat.nombre.toLowerCase().includes(q) ||
        (cat.ruta_jerarquica && cat.ruta_jerarquica.toLowerCase().includes(q)) ||
        (cat.codigo_categoria && cat.codigo_categoria.toLowerCase().includes(q))
    );
  }, [flatList, search, searchDirecto, variant]);

  // Manejadores de selección en modo Cascada
  const handleSelectL1 = (idL1: number | null) => {
    setSelectedL1(idL1);
    setSelectedL2(null);
    setSelectedL3(null);
    if (idL1) {
      const cat = mapPorId.get(idL1);
      const hijos = cat ? getChildren(cat) : [];
      // Si la raíz no tiene hijos, es terminal y se asigna directamente
      if (hijos.length === 0) {
        setSelectedCat(cat || null);
        onChange(idL1, cat || null);
      } else {
        // Tiene hijos: esperamos selección de L2 para precisión
        setSelectedCat(null);
        onChange(null, null);
      }
    } else {
      setSelectedCat(null);
      onChange(null, null);
    }
  };

  const handleSelectL2 = (idL2: number | null) => {
    setSelectedL2(idL2);
    setSelectedL3(null);
    if (idL2) {
      const cat = mapPorId.get(idL2);
      const hijos = cat ? getChildren(cat) : [];
      // Si L2 no tiene hijos, es el nodo terminal
      if (hijos.length === 0) {
        setSelectedCat(cat || null);
        onChange(idL2, cat || null);
      } else {
        // Si tiene hijos, se puede seleccionar L2 provisionalmente
        setSelectedCat(cat || null);
        onChange(idL2, cat || null);
      }
    } else if (selectedL1) {
      const catL1 = mapPorId.get(selectedL1);
      setSelectedCat(catL1 || null);
      onChange(selectedL1, catL1 || null);
    } else {
      setSelectedCat(null);
      onChange(null, null);
    }
  };

  const handleSelectL3 = (idL3: number | null) => {
    setSelectedL3(idL3);
    if (idL3) {
      const cat = mapPorId.get(idL3);
      setSelectedCat(cat || null);
      onChange(idL3, cat || null);
    } else if (selectedL2) {
      const catL2 = mapPorId.get(selectedL2);
      setSelectedCat(catL2 || null);
      onChange(selectedL2, catL2 || null);
    }
  };

  const handleSelectDirecto = (cat: CategoriaNodo) => {
    setSelectedCat(cat);
    onChange(cat.id_categoria, cat);
    setModoBuscadorDirecto(false);
    setSearchDirecto('');
    setIsOpen(false);
  };

  const handleClear = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedCat(null);
    setSelectedL1(null);
    setSelectedL2(null);
    setSelectedL3(null);
    onChange(null, null);
    setSearch('');
    setSearchDirecto('');
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

  // ============================================================================
  // RENDER MODO 1: CASCADA INTELIGENTE (variant === 'cascading')
  // ============================================================================
  if (variant === 'cascading') {
    return (
      <div className={cn('space-y-3 w-full', className)}>
        {/* Barra Superior de Control: Breadcrumb / Estado y Switch a Búsqueda Rápida */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg border border-blue-100 bg-blue-50/40 text-xs">
          <div className="flex items-center gap-2 overflow-hidden truncate">
            <Layers className="h-4 w-4 text-blue-600 shrink-0" />
            {selectedCat ? (
              <div className="flex flex-wrap items-center gap-1.5 font-medium text-gray-800">
                <span className="text-gray-500 font-normal">Clasificación:</span>
                <span className="font-semibold text-blue-900 bg-blue-100/70 px-2 py-0.5 rounded text-[11px] font-mono">
                  {selectedCat.ruta_jerarquica || selectedCat.nombre}
                </span>
                <Badge variant="outline" className="text-[10px] bg-white border-blue-200 text-blue-700">
                  Nivel {selectedCat.nivel}
                </Badge>
              </div>
            ) : (
              <span className="text-gray-500 italic">
                Selecciona la familia y subcategoría correspondiente al recurso
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setModoBuscadorDirecto(!modoBuscadorDirecto)}
              className="text-xs text-blue-700 hover:text-blue-900 font-semibold underline flex items-center gap-1"
            >
              <Search className="h-3 w-3" />
              {modoBuscadorDirecto ? 'Ver selectores en cascada' : 'Buscar por nombre directo'}
            </button>
            {selectedCat && showClearButton && !disabled && (
              <button
                type="button"
                onClick={() => handleClear()}
                className="text-[11px] text-gray-400 hover:text-red-600 p-1 rounded hover:bg-white transition-colors"
                title="Limpiar taxonomía"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Alternativa: Buscador Directo Global */}
        {modoBuscadorDirecto ? (
          <div className="relative rounded-lg border border-blue-200 bg-white p-3 shadow-sm space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                value={searchDirecto}
                onChange={(e) => setSearchDirecto(e.target.value)}
                placeholder="Escribe el nombre de la categoría (ej: Aceite, Filtro, Correa, Batería)..."
                className="pl-9 text-xs"
                autoFocus
              />
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1 text-xs">
              {filteredList.map((cat) => (
                <button
                  key={cat.id_categoria}
                  type="button"
                  onClick={() => handleSelectDirecto(cat)}
                  className="w-full text-left px-3 py-1.5 rounded-md hover:bg-blue-50 flex items-center justify-between group transition-colors"
                >
                  <div className="flex flex-col truncate">
                    <span className="font-semibold text-gray-900">{cat.nombre}</span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {cat.ruta_jerarquica}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono group-hover:bg-blue-100">
                    Nivel {cat.nivel}
                  </Badge>
                </button>
              ))}
              {filteredList.length === 0 && (
                <div className="py-4 text-center text-gray-400 text-xs">
                  No se encontraron categorías coincidentes.
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Selectores en Cascada Multinivel (Paso 1, 2 y 3) */
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {/* Nivel 1: Familia Principal */}
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-gray-700 flex items-center gap-1.5">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-[10px]">
                  1
                </span>
                Categoría Principal (Familia) <span className="text-red-500">*</span>
              </Label>
              <select
                value={selectedL1 || ''}
                onChange={(e) => handleSelectL1(e.target.value ? Number(e.target.value) : null)}
                disabled={disabled || isLoading}
                className="w-full h-9 rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">-- Seleccionar Familia Raíz --</option>
                {opcionesL1.map((cat) => (
                  <option key={cat.id_categoria} value={cat.id_categoria}>
                    📁 {cat.nombre} {cat.total_articulos ? `(${cat.total_articulos} art.)` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Nivel 2: Subcategoría */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] font-bold text-gray-700 flex items-center gap-1.5">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-[10px]">
                    2
                  </span>
                  Subcategoría / Sistema
                </Label>
                {selectedL1 && (
                  <button
                    type="button"
                    onClick={() => handleOpenCreateModal(selectedL1)}
                    className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5"
                  >
                    <Plus className="h-3 w-3" /> Nueva
                  </button>
                )}
              </div>
              <select
                value={selectedL2 || ''}
                onChange={(e) => handleSelectL2(e.target.value ? Number(e.target.value) : null)}
                disabled={disabled || !selectedL1 || opcionesL2.length === 0}
                className="w-full h-9 rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
              >
                <option value="">
                  {!selectedL1
                    ? '-- Selecciona Familia Primero --'
                    : opcionesL2.length === 0
                    ? '-- Sin subcategorías registradas --'
                    : '-- Seleccionar Subcategoría --'}
                </option>
                {opcionesL2.map((cat) => (
                  <option key={cat.id_categoria} value={cat.id_categoria}>
                    ↳ {cat.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Nivel 3: Sub-hija / Clase Específica (Dinámico) */}
            <div className="space-y-1 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] font-bold text-gray-700 flex items-center gap-1.5">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-[10px]">
                    3
                  </span>
                  Sub-hija / Especificación
                </Label>
                {selectedL2 && (
                  <button
                    type="button"
                    onClick={() => handleOpenCreateModal(selectedL2)}
                    className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5"
                  >
                    <Plus className="h-3 w-3" /> Añadir hija
                  </button>
                )}
              </div>
              <select
                value={selectedL3 || ''}
                onChange={(e) => handleSelectL3(e.target.value ? Number(e.target.value) : null)}
                disabled={disabled || !selectedL2 || opcionesL3.length === 0}
                className="w-full h-9 rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
              >
                <option value="">
                  {!selectedL2
                    ? '-- Esperando Subcategoría --'
                    : opcionesL3.length === 0
                    ? '✓ Nivel terminal alcanzado'
                    : '-- [ General / Toda la Subcategoría ] --'}
                </option>
                {opcionesL3.map((cat) => (
                  <option key={cat.id_categoria} value={cat.id_categoria}>
                    └── {cat.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Modal de Creación In-Context */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-md bg-white border border-gray-200 shadow-xl">
            <form onSubmit={handleSubmitCreate}>
              <DialogHeader className="border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2 text-blue-600">
                  <Sparkles className="h-5 w-5" />
                  <DialogTitle className="text-base font-bold text-gray-900">
                    Nueva Categoría Taxonómica
                  </DialogTitle>
                </div>
                <DialogDescription className="text-xs text-gray-500">
                  Crea una nueva clasificación en el catálogo maestro.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4 text-xs">
                {/* Categoría Padre */}
                <div className="space-y-1.5">
                  <Label htmlFor="modal-cat-padre" className="font-semibold text-gray-800">
                    Categoría Padre (Nivel Superior)
                  </Label>
                  <select
                    id="modal-cat-padre"
                    value={modalPadreId || ''}
                    onChange={(e) =>
                      setModalPadreId(e.target.value ? Number(e.target.value) : null)
                    }
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">[ Ninguna - Categoría Raíz Nivel 1 ]</option>
                    {flatList.map((cat) => (
                      <option key={cat.id_categoria} value={cat.id_categoria}>
                        {'— '.repeat(cat.nivel - 1)} {cat.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Nombre de la Categoría */}
                <div className="space-y-1.5">
                  <Label htmlFor="modal-cat-nombre" className="font-semibold text-gray-800">
                    Nombre de la Categoría <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="modal-cat-nombre"
                    type="text"
                    required
                    value={modalForm.nombre}
                    onChange={(e) => setModalForm({ ...modalForm, nombre: e.target.value })}
                    placeholder="Ej: FILTROS DE ACEITE"
                    className="bg-white text-xs uppercase"
                  />
                </div>

                {/* Código de Categoría */}
                <div className="space-y-1.5">
                  <Label htmlFor="modal-cat-codigo" className="font-semibold text-gray-800">
                    Código Mnemotécnico (Opcional)
                  </Label>
                  <Input
                    id="modal-cat-codigo"
                    type="text"
                    value={modalForm.codigo_categoria || ''}
                    onChange={(e) =>
                      setModalForm({ ...modalForm, codigo_categoria: e.target.value.toUpperCase() })
                    }
                    placeholder="Ej: CAT-FIL-ACE"
                    className="bg-white text-xs font-mono uppercase"
                  />
                </div>
              </div>

              <DialogFooter className="border-t border-gray-100 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isCreating}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isCreating}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Guardando...
                    </>
                  ) : (
                    'Guardar Categoría'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ============================================================================
  // RENDER MODO 2: COMBOBOX POPOVER (variant === 'combobox')
  // ============================================================================
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
                  const indentPixels = (cat.nivel ? cat.nivel - 1 : cat.indent ?? 0) * 16;

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
                        onClick={() => handleSelectDirecto(cat)}
                        style={{ paddingLeft: `${indentPixels}px` }}
                        className="flex flex-1 items-center gap-1.5 text-left truncate"
                      >
                        {cat.nivel > 1 ? (
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

      {/* Modal Accesible de Creación In-Context */}
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
              <div className="space-y-1.5">
                <Label htmlFor="cat-padre-cb" className="font-semibold text-gray-800">
                  Categoría Padre (Nivel Superior)
                </Label>
                <select
                  id="cat-padre-cb"
                  value={modalPadreId || ''}
                  onChange={(e) =>
                    setModalPadreId(e.target.value ? Number(e.target.value) : null)
                  }
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">[ Ninguna - Categoría Raíz Nivel 1 ]</option>
                  {flatList.map((cat) => (
                    <option key={cat.id_categoria} value={cat.id_categoria}>
                      {'— '.repeat(cat.nivel - 1)} {cat.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cat-nombre-cb" className="font-semibold text-gray-800">
                  Nombre de la Categoría <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="cat-nombre-cb"
                  type="text"
                  required
                  value={modalForm.nombre}
                  onChange={(e) => setModalForm({ ...modalForm, nombre: e.target.value })}
                  placeholder="Ej: FILTROS DE ACEITE"
                  className="bg-white text-xs uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cat-codigo-cb" className="font-semibold text-gray-800">
                  Código Mnemotécnico (Opcional)
                </Label>
                <Input
                  id="cat-codigo-cb"
                  type="text"
                  value={modalForm.codigo_categoria || ''}
                  onChange={(e) =>
                    setModalForm({ ...modalForm, codigo_categoria: e.target.value.toUpperCase() })
                  }
                  placeholder="Ej: CAT-FIL-ACE"
                  className="bg-white text-xs font-mono uppercase"
                />
              </div>
            </div>

            <DialogFooter className="border-t border-gray-100 pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                disabled={isCreating}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isCreating}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Guardando...
                  </>
                ) : (
                  'Guardar Categoría'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
