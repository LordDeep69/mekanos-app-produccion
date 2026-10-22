'use client';

/**
 * MEKANOS S.A.S - Portal Admin
 * Selector Jerárquico de Categorías Taxonómicas Enterprise (HierarchicalCategorySelect)
 * 
 * Arquitectura de Navegación Enfocada Progresiva (Exclusive Drill-Down Focus):
 * - Selección Exclusiva y Vista Limpia: al seleccionar una categoría, se oculta el resto de
 *   ramas para eliminar saturación y se muestran exclusivamente sus hijas directas.
 * - Registro Inmediato en el 1er Clic: la selección queda validada y activa en el formulario al instante.
 * - Migas de Pan Interactivas como "Máquina del Tiempo": saltar a cualquier nivel previo con un clic.
 * - Botón de Retorno Fluido (`← Volver a [Nivel Previo]`).
 * - Soporte para N-Niveles arbitrarios (Familia ➔ Subcategoría ➔ Sub-hija ➔ Terminal).
 * - Buscador Global Predictivo con salto directo a la ruta seleccionada.
 * - Alta in-context con padre preseleccionado.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronRight,
  ChevronsUpDown,
  FolderPlus,
  FolderTree,
  Loader2,
  Plus,
  Search,
  Sparkles,
  X,
  Layers,
  Filter,
  Droplets,
  Zap,
  Thermometer,
  ShieldCheck,
  Cog,
  Hammer,
  HardHat,
  Boxes,
  Tag,
  CheckCircle2,
  CornerDownRight,
} from 'lucide-react';
import { toast } from 'sonner';

import { comprasService } from '@/lib/api/compras.service';
import { CategoriaNodo, CreateCategoriaPayload } from '@/types/compras.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

// Iconografía contextual para familias principales
function getCategoryIcon(nombre: string, nivel: number) {
  const n = (nombre || '').toLowerCase();
  if (nivel === 1) {
    if (n.includes('filtro')) return Filter;
    if (n.includes('lubricante') || n.includes('fluido') || n.includes('aceite')) return Droplets;
    if (n.includes('eléctrico') || n.includes('batería')) return Zap;
    if (n.includes('refrigeración') || n.includes('correa')) return Thermometer;
    if (n.includes('sellado') || n.includes('estanqueidad')) return ShieldCheck;
    if (n.includes('mecánica') || n.includes('rodamiento')) return Cog;
    if (n.includes('herramienta')) return Hammer;
    if (n.includes('dotación') || n.includes('seguridad') || n.includes('epp')) return HardHat;
    if (n.includes('consumible')) return Boxes;
    return Layers;
  }
  return Tag;
}

export function HierarchicalCategorySelect({
  value,
  onChange,
  placeholder = 'Seleccionar clasificación taxonómica...',
  disabled = false,
  className,
  id,
  showClearButton = true,
  variant = 'cascading',
}: HierarchicalCategorySelectProps) {
  const [arbol, setArbol] = useState<CategoriaNodo[]>([]);
  const [selectedCat, setSelectedCat] = useState<CategoriaNodo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Ruta activa de ancestros: [idL1, idL2, idL3, ...]
  const [selectedPath, setSelectedPath] = useState<number[]>([]);

  // Nivel / Padre enfocado actualmente en la lista. Si es null, mostramos las Raíces (Nivel 1).
  const [currentParentId, setCurrentParentId] = useState<number | null>(null);

  // Estados de visualización del explorador
  const [isExploradorAbierto, setIsExploradorAbierto] = useState(true);
  const initialMountedRef = useRef(false);

  // Estados de búsqueda
  const [searchGlobal, setSearchGlobal] = useState('');
  const [mostrarResultadosBusqueda, setMostrarResultadosBusqueda] = useState(false);

  // Estados para modo combobox alternativo
  const [isOpenCombobox, setIsOpenCombobox] = useState(false);
  const [searchCombobox, setSearchCombobox] = useState('');

  // Modal in-context de creación
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
  const searchInputRef = useRef<HTMLInputElement>(null);

  // 1. Cargar árbol jerárquico desde el backend
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

  // Lista aplanada para indexación rápida
  const flatList = useMemo(() => {
    return flattenTree(arbol);
  }, [arbol]);

  const mapPorId = useMemo(() => {
    const map = new Map<number, CategoriaNodo>();
    for (const item of flatList) {
      map.set(item.id_categoria, item);
    }
    return map;
  }, [flatList]);

  // 2. Sincronizar selección y ruta activa
  useEffect(() => {
    if (value && mapPorId.has(value)) {
      const encontrada = mapPorId.get(value)!;
      setSelectedCat(encontrada);

      // Reconstruir la ruta ascendente recursivamente
      const path: number[] = [];
      let curr: CategoriaNodo | undefined = encontrada;
      while (curr) {
        path.unshift(curr.id_categoria);
        curr = curr.id_padre ? mapPorId.get(curr.id_padre) : undefined;
      }
      setSelectedPath(path);

      // Si es el primer montaje con valor inicial (ej. editando artículo existente),
      // enfocamos el padre de este artículo y colapsamos.
      if (!initialMountedRef.current) {
        setCurrentParentId(encontrada.id_padre || null);
        setIsExploradorAbierto(false);
        initialMountedRef.current = true;
      }
    } else if (!value) {
      setSelectedCat(null);
      setSelectedPath([]);
      if (!initialMountedRef.current) {
        setCurrentParentId(null);
        setIsExploradorAbierto(true);
        initialMountedRef.current = true;
      }
    }
  }, [value, mapPorId]);

  // Cierre por click fuera en modo combobox
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpenCombobox(false);
        setMostrarResultadosBusqueda(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 3. Obtener el listado de categorías a mostrar según el enfoque actual
  const currentParentNode = useMemo(() => {
    if (currentParentId === null) return null;
    return mapPorId.get(currentParentId) || null;
  }, [currentParentId, mapPorId]);

  const itemsEnfoqueActual = useMemo(() => {
    if (currentParentId === null) {
      // Nivel 1: Familias Principales
      return arbol;
    }
    if (currentParentNode) {
      return getChildren(currentParentNode);
    }
    return [];
  }, [currentParentId, currentParentNode, arbol]);

  // Nivel que se está visualizando (1 si es raíz, o nivel del padre + 1)
  const nivelVisualizado = useMemo(() => {
    if (!currentParentNode) return 1;
    return currentParentNode.nivel + 1;
  }, [currentParentNode]);

  // 4. Manejador al seleccionar un ítem en la lista enfocada:
  // - Si tiene hijos: REGISTRA LA SELECCIÓN y AVANZA de nivel (mostrando solo sus hijas directas).
  // - Si no tiene hijos (terminal): REGISTRA LA SELECCIÓN y la mantiene seleccionada.
  const handleSelectItem = (cat: CategoriaNodo) => {
    // Reconstruir la ruta hasta este nodo
    const path: number[] = [];
    let curr: CategoriaNodo | undefined = cat;
    while (curr) {
      path.unshift(curr.id_categoria);
      curr = curr.id_padre ? mapPorId.get(curr.id_padre) : undefined;
    }
    setSelectedPath(path);
    setSelectedCat(cat);

    // REGISTRO Y VALIDACIÓN INMEDIATA EN EL FORMULARIO
    onChange(cat.id_categoria, cat);

    const hijos = getChildren(cat);
    if (hijos && hijos.length > 0) {
      // Avanzar el foco exclusivamente a sus hijas directas
      setCurrentParentId(cat.id_categoria);
    }
  };

  // 5. Navegación hacia atrás (Volver un nivel)
  const handleVolverNivel = () => {
    if (!currentParentNode) return;
    const nuevoPadreId = currentParentNode.id_padre || null;
    setCurrentParentId(nuevoPadreId);

    // Si volvemos, el nodo seleccionado activo pasa a ser el padre al que regresamos
    if (nuevoPadreId && mapPorId.has(nuevoPadreId)) {
      const nuevoCat = mapPorId.get(nuevoPadreId)!;
      setSelectedCat(nuevoCat);
      onChange(nuevoCat.id_categoria, nuevoCat);

      const path: number[] = [];
      let curr: CategoriaNodo | undefined = nuevoCat;
      while (curr) {
        path.unshift(curr.id_categoria);
        curr = curr.id_padre ? mapPorId.get(curr.id_padre) : undefined;
      }
      setSelectedPath(path);
    }
  };

  // Saltar directamente a cualquier nivel desde las migas de pan
  const handleJumpToLevel = (cat: CategoriaNodo) => {
    setSelectedCat(cat);
    onChange(cat.id_categoria, cat);

    const path: number[] = [];
    let curr: CategoriaNodo | undefined = cat;
    while (curr) {
      path.unshift(curr.id_categoria);
      curr = curr.id_padre ? mapPorId.get(curr.id_padre) : undefined;
    }
    setSelectedPath(path);

    const hijos = getChildren(cat);
    if (hijos && hijos.length > 0) {
      // Si tiene hijos, enfocar sus hijas
      setCurrentParentId(cat.id_categoria);
    } else {
      // Si es terminal, enfocar el contenedor de sus hermanos
      setCurrentParentId(cat.id_padre || null);
    }

    setIsExploradorAbierto(true);
  };

  // 6. Manejo del Buscador Global Directo
  const resultadosBusqueda = useMemo(() => {
    const q = searchGlobal.toLowerCase().trim();
    if (!q) return [];
    return flatList
      .filter(
        (c) =>
          c.nombre.toLowerCase().includes(q) ||
          (c.ruta_jerarquica && c.ruta_jerarquica.toLowerCase().includes(q)) ||
          (c.codigo_categoria && c.codigo_categoria.toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [flatList, searchGlobal]);

  const handleSelectBusquedaDirecta = (cat: CategoriaNodo) => {
    const path: number[] = [];
    let curr: CategoriaNodo | undefined = cat;
    while (curr) {
      path.unshift(curr.id_categoria);
      curr = curr.id_padre ? mapPorId.get(curr.id_padre) : undefined;
    }
    setSelectedPath(path);
    setSelectedCat(cat);

    const hijos = getChildren(cat);
    if (hijos && hijos.length > 0) {
      setCurrentParentId(cat.id_categoria);
    } else {
      setCurrentParentId(cat.id_padre || null);
    }

    onChange(cat.id_categoria, cat);
    setSearchGlobal('');
    setMostrarResultadosBusqueda(false);
  };

  const handleClear = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedCat(null);
    setSelectedPath([]);
    setCurrentParentId(null);
    onChange(null, null);
    setSearchGlobal('');
    setIsExploradorAbierto(true);
  };

  // 7. Modal de creación in-context
  const handleOpenCreateModal = (padreId: number | null = null) => {
    setModalPadreId(padreId);
    setModalForm({
      nombre: '',
      codigo_categoria: '',
      id_padre: padreId,
      descripcion: '',
    });
    setIsModalOpen(true);
  };

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

      // Recargar árbol
      const nuevoArbol = await comprasService.getCategoriasArbol();
      setArbol(nuevoArbol);

      // Reconstruir camino y auto-seleccionar
      const path: number[] = [];
      let curr: CategoriaNodo | undefined = nueva;
      while (curr) {
        path.unshift(curr.id_categoria);
        curr = curr.id_padre ? mapPorId.get(curr.id_padre) : undefined;
      }
      setSelectedPath(path);
      setSelectedCat(nueva);
      setCurrentParentId(nueva.id_padre || null);

      onChange(nueva.id_categoria, nueva);
      setIsModalOpen(false);
    } catch (error: any) {
      console.error('Error creando categoría:', error);
      const msg = error?.response?.data?.message || error?.message || 'Error al registrar categoría';
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setIsCreating(false);
    }
  };

  // Migas de pan de ancestros activos
  const rutaBreadcrumbs = useMemo(() => {
    return selectedPath
      .map((id) => mapPorId.get(id))
      .filter((c): c is CategoriaNodo => !!c);
  }, [selectedPath, mapPorId]);

  // ============================================================================
  // RENDER MODO 1: DRILL-DOWN EXCLUSIVO ENTERPRISE (variant === 'cascading')
  // ============================================================================
  if (variant === 'cascading') {
    return (
      <div ref={containerRef} className={cn('space-y-3 w-full', className)}>
        {/* TARJETA DE RESUMEN EJECUTIVO (SIEMPRE VISIBLE CUANDO HAY SELECCIÓN) */}
        {selectedCat && (
          <div className="relative overflow-hidden rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50/70 via-white to-blue-50/40 p-3.5 shadow-xs transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Información y Migas de Pan Interactivas */}
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
                    {React.createElement(getCategoryIcon(selectedCat.nombre, selectedCat.nivel), {
                      className: 'h-3.5 w-3.5',
                    })}
                  </div>
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    Taxonomía Asignada
                  </span>
                  <Badge variant="outline" className="bg-white text-blue-700 border-blue-200 text-[10px] font-bold">
                    Nivel {selectedCat.nivel}
                  </Badge>
                  {selectedCat.codigo_categoria && (
                    <Badge variant="outline" className="bg-white text-gray-600 border-gray-200 text-[10px] font-mono">
                      {selectedCat.codigo_categoria}
                    </Badge>
                  )}
                </div>

                {/* Migas de pan clicables que funcionan como saltos rápidos en el árbol */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  {rutaBreadcrumbs.map((node, idx) => {
                    const isLast = idx === rutaBreadcrumbs.length - 1;
                    return (
                      <React.Fragment key={node.id_categoria}>
                        <button
                          type="button"
                          onClick={() => handleJumpToLevel(node)}
                          className={cn(
                            'font-semibold px-2 py-0.5 rounded-md transition-colors text-left flex items-center gap-1',
                            isLast
                              ? 'bg-blue-600 text-white font-bold shadow-xs'
                              : 'bg-white border border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50/60'
                          )}
                          title={`Ir a ${node.nombre}`}
                        >
                          <span>{node.nombre}</span>
                          {isLast && <Check className="h-3 w-3 stroke-[3]" />}
                        </button>
                        {!isLast && <ChevronRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsExploradorAbierto(!isExploradorAbierto)}
                  className="h-8 text-xs font-semibold text-blue-700 border-blue-200 bg-white hover:bg-blue-50"
                >
                  {isExploradorAbierto ? 'Ocultar Navegador' : 'Explorar / Cambiar'}
                </Button>
                {showClearButton && !disabled && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClear}
                    className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
                    title="Reiniciar selección y volver a Familias Principales"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* WORKBENCH DE NAVEGACIÓN ENFOCADA Y EXCLUSIVA */}
        {isExploradorAbierto && (
          <div className="rounded-xl border border-gray-200 bg-gray-50/40 p-3.5 shadow-xs space-y-3 animate-in fade-in-0 duration-200">
            {/* Cabecera con Buscador Global Directo */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  ref={searchInputRef}
                  type="text"
                  value={searchGlobal}
                  onChange={(e) => {
                    setSearchGlobal(e.target.value);
                    setMostrarResultadosBusqueda(true);
                  }}
                  onFocus={() => {
                    if (searchGlobal.trim()) setMostrarResultadosBusqueda(true);
                  }}
                  placeholder="🔍 Buscar categoría por nombre o ruta (ej: Aceite, Batería, Filtro Aire)..."
                  className="pl-9 pr-8 h-9 text-xs bg-white border-gray-300 focus:border-blue-500 shadow-xs"
                />
                {searchGlobal && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchGlobal('');
                      setMostrarResultadosBusqueda(false);
                    }}
                    className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}

                {/* Dropdown de resultados de búsqueda rápida */}
                {mostrarResultadosBusqueda && resultadosBusqueda.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 mt-1 rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl animate-in fade-in-0 zoom-in-95 max-h-60 overflow-y-auto">
                    <div className="px-2 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                      Coincidencias encontradas ({resultadosBusqueda.length})
                    </div>
                    {resultadosBusqueda.map((res) => (
                      <button
                        key={res.id_categoria}
                        type="button"
                        onClick={() => handleSelectBusquedaDirecta(res)}
                        className="w-full text-left p-2 rounded-lg hover:bg-blue-50/80 flex items-center justify-between group transition-colors"
                      >
                        <div className="flex flex-col truncate pr-2">
                          <span className="font-semibold text-xs text-gray-900 group-hover:text-blue-900">
                            {res.nombre}
                          </span>
                          <span className="text-[10px] font-mono text-gray-400 truncate">
                            {res.ruta_jerarquica || res.nombre}
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className="shrink-0 text-[10px] font-mono bg-gray-50 border-gray-200 group-hover:bg-blue-100 group-hover:border-blue-300"
                        >
                          Nivel {res.nivel}
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Botón de Creación en este nivel */}
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenCreateModal(currentParentId)}
                  className="h-9 text-xs font-semibold text-blue-700 bg-white border-gray-300 hover:bg-blue-50 shadow-xs"
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  <span>
                    {currentParentId === null
                      ? 'Nueva Familia Raíz'
                      : 'Nueva Subcategoría'}
                  </span>
                </Button>
              </div>
            </div>

            {/* BARRA DE ENFOQUE Y RETORNO (Sólo visible cuando no estamos en la raíz) */}
            {currentParentNode && (
              <div className="flex items-center justify-between p-2 rounded-lg bg-blue-50/80 border border-blue-200 text-xs">
                <div className="flex items-center gap-2 truncate">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleVolverNivel}
                    className="h-7 px-2.5 text-xs font-bold text-blue-700 bg-white border-blue-300 hover:bg-blue-100/70 shadow-2xs flex items-center gap-1"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Volver</span>
                  </Button>
                  <div className="truncate">
                    <span className="text-[11px] text-gray-500 font-medium">Subcategorías de: </span>
                    <span className="font-bold text-blue-950 uppercase">{currentParentNode.nombre}</span>
                  </div>
                </div>

                <Badge variant="outline" className="text-[10px] bg-white border-blue-300 text-blue-700 font-mono shrink-0">
                  Nivel {nivelVisualizado} ({itemsEnfoqueActual.length})
                </Badge>
              </div>
            )}

            {/* LISTA EXCLUSIVA Y LIMPIA DE CATEGORÍAS (SIN SATURACIÓN) */}
            <div className="rounded-xl border border-gray-200 bg-white p-2 shadow-2xs">
              {isLoading ? (
                <div className="py-12 text-center text-gray-500">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600" />
                  <p className="mt-2 text-xs font-medium text-gray-600">
                    Cargando catálogo taxonómico...
                  </p>
                </div>
              ) : itemsEnfoqueActual.length > 0 ? (
                <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
                  {itemsEnfoqueActual.map((cat) => {
                    const isSelected = selectedCat?.id_categoria === cat.id_categoria;
                    const isInPath = selectedPath.includes(cat.id_categoria);
                    const hijos = getChildren(cat);
                    const hasChildren = Array.isArray(hijos) && hijos.length > 0;
                    const IconComp = getCategoryIcon(cat.nombre, cat.nivel);

                    return (
                      <div
                        key={cat.id_categoria}
                        onClick={() => handleSelectItem(cat)}
                        className={cn(
                          'group flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all',
                          isSelected
                            ? 'bg-blue-600 text-white font-semibold border-blue-600 shadow-sm ring-2 ring-blue-500/20'
                            : isInPath
                            ? 'bg-blue-50/70 border-blue-200 text-blue-950 font-medium'
                            : 'bg-white hover:bg-gray-50 border-gray-100 hover:border-gray-200 text-gray-800'
                        )}
                      >
                        {/* Lado Izquierdo: Icono + Nombre + Badges */}
                        <div className="flex items-center gap-2.5 truncate flex-1 min-w-0">
                          <div
                            className={cn(
                              'flex h-7 w-7 items-center justify-center rounded-lg shrink-0 transition-colors',
                              isSelected
                                ? 'bg-blue-500 text-white'
                                : cat.nivel === 1
                                ? 'bg-blue-50 text-blue-600'
                                : 'bg-gray-100 text-gray-600'
                            )}
                          >
                            <IconComp className="h-4 w-4" />
                          </div>

                          <div className="flex flex-col truncate">
                            <span className="font-semibold text-xs tracking-tight truncate">
                              {cat.nombre}
                            </span>
                            {cat.codigo_categoria && (
                              <span
                                className={cn(
                                  'text-[10px] font-mono',
                                  isSelected ? 'text-blue-100' : 'text-gray-400'
                                )}
                              >
                                {cat.codigo_categoria}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Lado Derecho: Indicadores de Acción y Jerarquía */}
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          {isSelected && (
                            <span className="flex items-center gap-1 text-[11px] font-bold text-white bg-blue-700 px-2 py-0.5 rounded-md shadow-2xs">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
                              <span>Asignada</span>
                            </span>
                          )}

                          {hasChildren ? (
                            <div className="flex items-center gap-1">
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-[10px] px-1.5 py-0 font-mono',
                                  isSelected
                                    ? 'bg-blue-700 border-blue-500 text-white'
                                    : 'bg-blue-50 border-blue-200 text-blue-700 font-semibold'
                                )}
                              >
                                {hijos.length} {hijos.length === 1 ? 'subcat' : 'subcats'}
                              </Badge>
                              <ChevronRight
                                className={cn(
                                  'h-4 w-4 transition-transform group-hover:translate-x-0.5',
                                  isSelected ? 'text-white' : 'text-gray-400 group-hover:text-blue-600'
                                )}
                              />
                            </div>
                          ) : (
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[9px] px-1.5 py-0 font-mono',
                                isSelected
                                  ? 'bg-emerald-600 text-white border-emerald-500'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              )}
                            >
                              Terminal
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-gray-500 text-xs space-y-2">
                  <p>No hay subcategorías registradas en este nivel.</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenCreateModal(currentParentId)}
                    className="h-7 text-xs text-blue-700 border-blue-200"
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Crear primera subcategoría aquí
                  </Button>
                </div>
              )}
            </div>

            {/* BARRA DE CONFIRMACIÓN / ESTADO INFERIOR */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-200/80 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-700">Estado:</span>
                {selectedCat ? (
                  <span className="inline-flex items-center gap-1.5 text-emerald-800 font-bold bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full text-xs">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Seleccionado: {selectedCat.nombre} (Nivel {selectedCat.nivel})</span>
                  </span>
                ) : (
                  <span className="text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full text-xs font-medium">
                    Haz clic en una categoría para asignarla de inmediato
                  </span>
                )}
              </div>

              {selectedCat && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setIsExploradorAbierto(false)}
                  className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
                >
                  ✓ Listo, aplicar selección
                </Button>
              )}
            </div>
          </div>
        )}

        {/* MODAL IN-CONTEXT DE CREACIÓN */}
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
  // RENDER MODO 2: COMBOBOX FLOTANTE COMPACTO (variant === 'combobox')
  // ============================================================================
  const filteredListCombobox = useMemo(() => {
    const q = searchCombobox.toLowerCase().trim();
    if (!q) return flatList;
    return flatList.filter(
      (cat) =>
        cat.nombre.toLowerCase().includes(q) ||
        (cat.ruta_jerarquica && cat.ruta_jerarquica.toLowerCase().includes(q)) ||
        (cat.codigo_categoria && cat.codigo_categoria.toLowerCase().includes(q))
    );
  }, [flatList, searchCombobox]);

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <div
        id={id}
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-expanded={isOpenCombobox}
        onClick={() => {
          if (!disabled) {
            setIsOpenCombobox(!isOpenCombobox);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!disabled) setIsOpenCombobox(true);
          }
        }}
        className={cn(
          'flex min-h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-xs shadow-xs ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
          disabled ? 'cursor-not-allowed opacity-50 bg-gray-50' : 'cursor-pointer hover:border-gray-400',
          isOpenCombobox && 'border-blue-500 ring-1 ring-blue-500'
        )}
      >
        <div className="flex items-center gap-2 overflow-hidden truncate">
          <FolderTree className="h-4 w-4 shrink-0 text-blue-600" />
          {selectedCat ? (
            <div className="flex flex-col truncate text-left">
              <span className="font-semibold text-gray-900 text-xs truncate">
                {selectedCat.nombre}
              </span>
              {selectedCat.ruta_jerarquica && (
                <span className="text-[10px] text-gray-400 font-mono truncate">
                  {selectedCat.ruta_jerarquica}
                </span>
              )}
            </div>
          ) : (
            <span className="text-gray-400 text-xs">{placeholder}</span>
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

      {isOpenCombobox && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-xl animate-in fade-in-0 zoom-in-95">
          <div className="p-2 border-b border-gray-100 bg-gray-50/50">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
              <Input
                type="text"
                value={searchCombobox}
                onChange={(e) => setSearchCombobox(e.target.value)}
                placeholder="Buscar por nombre o ruta jerárquica..."
                className="pl-8 pr-3 h-8 text-xs bg-white border-gray-200"
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto p-1.5 text-xs space-y-0.5">
            {isLoading ? (
              <div className="py-6 text-center text-gray-500">
                <Loader2 className="mx-auto h-5 w-5 animate-spin text-blue-600" />
                <p className="mt-2 text-xs">Cargando categorías...</p>
              </div>
            ) : filteredListCombobox.length > 0 ? (
              filteredListCombobox.map((cat) => {
                const isSelected = selectedCat?.id_categoria === cat.id_categoria;
                const indentPixels = (cat.nivel ? cat.nivel - 1 : cat.indent ?? 0) * 16;
                const IconComp = getCategoryIcon(cat.nombre, cat.nivel);

                return (
                  <button
                    key={cat.id_categoria}
                    type="button"
                    onClick={() => {
                      setSelectedCat(cat);
                      onChange(cat.id_categoria, cat);
                      setIsOpenCombobox(false);
                    }}
                    style={{ paddingLeft: `${Math.max(8, indentPixels)}px` }}
                    className={cn(
                      'w-full flex items-center justify-between rounded-lg py-1.5 px-2.5 transition-colors text-left group',
                      isSelected ? 'bg-blue-50 text-blue-900 font-bold' : 'hover:bg-gray-100 text-gray-700'
                    )}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      {cat.nivel > 1 ? (
                        <CornerDownRight className="h-3.5 w-3.5 text-gray-300 shrink-0 select-none" />
                      ) : (
                        <IconComp className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                      )}
                      <span className="truncate">{cat.nombre}</span>
                      {cat.codigo_categoria && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 font-mono text-gray-400 border-gray-200 ml-1">
                          {cat.codigo_categoria}
                        </Badge>
                      )}
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-blue-600 shrink-0" />}
                  </button>
                );
              })
            ) : (
              <div className="py-6 text-center text-gray-500 text-xs">
                No se encontraron categorías para "{searchCombobox}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
