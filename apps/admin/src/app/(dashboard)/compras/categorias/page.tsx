'use client';

/**
 * MEKANOS S.A.S - Portal Admin
 * Familias y Taxonomía Jerárquica (/compras/categorias)
 * 
 * Vista de Árbol Jerárquico Interactivo, Nodos Expandibles/Colapsables,
 * Creación de Familias Raíz, Subcategorías y Edición de Taxonomía.
 */

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Folder,
  FolderOpen,
  FolderPlus,
  Layers,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Tag,
  CheckCircle2,
  X,
  Boxes,
} from 'lucide-react';
import { toast } from 'sonner';

import { comprasService } from '@/lib/api/compras.service';
import { CategoriaNodo, CreateCategoriaPayload } from '@/types/compras.types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function CategoriasTaxonomiaPage() {
  const [arbol, setArbol] = useState<CategoriaNodo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());

  // Modal de Crear / Editar
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedNode, setSelectedNode] = useState<CategoriaNodo | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState<CreateCategoriaPayload & { activo: boolean }>({
    nombre: '',
    codigo_categoria: '',
    id_padre: null,
    descripcion: '',
    activo: true,
  });

  // Cargar árbol completo
  const cargarArbol = async (showToast = false) => {
    try {
      if (showToast) setRefreshing(true);
      else setLoading(true);

      const data = await comprasService.getCategoriasArbol();
      setArbol(data);

      // Auto-expandir nivel raíz por defecto
      const rootIds = new Set<number>();
      data.forEach((n) => rootIds.add(n.id_categoria));
      setExpandedNodes(rootIds);

      if (showToast) toast.success('Taxonomía jerárquica actualizada');
    } catch (e: any) {
      console.error('Error al cargar árbol taxonómico:', e);
      toast.error('No se pudo cargar la jerarquía de categorías');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    cargarArbol();
  }, []);

  // Métricas calculadas recursivamente
  const metricas = useMemo(() => {
    let totalNodos = 0;
    const familiasRaiz = arbol.length;

    const contarNodos = (nodos: CategoriaNodo[]) => {
      nodos.forEach((n) => {
        totalNodos++;
        const hijos = n.hijos || n.subcategorias || [];
        if (hijos.length > 0) contarNodos(hijos);
      });
    };
    contarNodos(arbol);

    // Los artículos totales son la suma acumulada de las familias raíz (partición exhaustiva del árbol)
    const totalArticulos = arbol.reduce(
      (acc, raiz) => acc + (raiz.total_articulos ?? raiz._count?.catalogo_componentes ?? 0),
      0,
    );

    const subfamilias = totalNodos - familiasRaiz;
    return { totalNodos, familiasRaiz, subfamilias, totalArticulos };
  }, [arbol]);

  // Alternar expansión de un nodo
  const toggleExpand = (id: number) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Expandir / Colapsar todos
  const expandirTodos = () => {
    const allIds = new Set<number>();
    const recolectar = (nodos: CategoriaNodo[]) => {
      nodos.forEach((n) => {
        allIds.add(n.id_categoria);
        const hijos = n.hijos || n.subcategorias || [];
        if (hijos.length > 0) recolectar(hijos);
      });
    };
    recolectar(arbol);
    setExpandedNodes(allIds);
  };

  const colapsarTodos = () => {
    setExpandedNodes(new Set());
  };

  // Abrir modal para crear Familia Raíz
  const abrirCrearRaiz = () => {
    setIsEditing(false);
    setSelectedNode(null);
    setFormData({
      nombre: '',
      codigo_categoria: '',
      id_padre: null,
      descripcion: '',
      activo: true,
    });
    setModalOpen(true);
  };

  // Abrir modal para crear Subcategoría de un nodo existente
  const abrirCrearSubcategoria = (padre: CategoriaNodo) => {
    setIsEditing(false);
    setSelectedNode(padre);
    setFormData({
      nombre: '',
      codigo_categoria: '',
      id_padre: padre.id_categoria,
      descripcion: '',
      activo: true,
    });
    setModalOpen(true);
  };

  // Abrir modal para editar
  const abrirEditar = (nodo: CategoriaNodo) => {
    setIsEditing(true);
    setSelectedNode(nodo);
    setFormData({
      nombre: nodo.nombre,
      codigo_categoria: nodo.codigo_categoria,
      id_padre: nodo.id_padre,
      descripcion: nodo.descripcion || '',
      activo: nodo.activo,
    });
    setModalOpen(true);
  };

  // Guardar (crear o actualizar)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      toast.error('El nombre de la categoría es obligatorio');
      return;
    }

    try {
      setSubmitting(true);
      if (isEditing && selectedNode) {
        await comprasService.updateCategoria(selectedNode.id_categoria, {
          nombre: formData.nombre.trim(),
          codigo_categoria: formData.codigo_categoria?.trim() || undefined,
          descripcion: formData.descripcion?.trim() || undefined,
          activo: formData.activo,
        });
        toast.success(`Categoría "${formData.nombre}" actualizada`);
      } else {
        await comprasService.createCategoria({
          nombre: formData.nombre.trim(),
          codigo_categoria: formData.codigo_categoria?.trim() || undefined,
          id_padre: formData.id_padre || null,
          descripcion: formData.descripcion?.trim() || undefined,
        });
        toast.success(`Categoría "${formData.nombre}" creada con éxito`);
      }

      setModalOpen(false);
      cargarArbol();
    } catch (error: any) {
      console.error('Error al guardar categoría:', error);
      const msg = error.response?.data?.message || 'Error al procesar la categoría';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Render recursivo de nodos del árbol
  const renderNodos = (nodos: CategoriaNodo[], nivel = 1) => {
    return nodos.map((nodo) => {
      const hijos = nodo.hijos || nodo.subcategorias || [];
      const hasChildren = hijos.length > 0;
      const isExpanded = expandedNodes.has(nodo.id_categoria);

      // Filtro de búsqueda
      const matchSearch =
        !search.trim() ||
        nodo.nombre.toLowerCase().includes(search.toLowerCase()) ||
        nodo.codigo_categoria.toLowerCase().includes(search.toLowerCase()) ||
        nodo.ruta_jerarquica.toLowerCase().includes(search.toLowerCase());

      const levelColor =
        nivel === 1
          ? 'bg-blue-100 text-blue-800 border-blue-200'
          : nivel === 2
          ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
          : 'bg-emerald-100 text-emerald-800 border-emerald-200';

      const levelLabel = nivel === 1 ? 'L1 Familia' : nivel === 2 ? 'L2 Subfamilia' : `L${nivel} Especialidad`;

      return (
        <div key={nodo.id_categoria} className="space-y-1">
          <div
            className={`flex items-center justify-between rounded-xl border p-3 transition-all ${
              matchSearch && search.trim()
                ? 'border-blue-400 bg-blue-50/40 shadow-sm ring-1 ring-blue-300'
                : 'border-gray-200 bg-white hover:bg-slate-50'
            }`}
            style={{ marginLeft: `${(nivel - 1) * 1.5}rem` }}
          >
            {/* Lado izquierdo: Botón expandir + Icono + Nombre + Ruta */}
            <div className="flex items-center gap-2.5 min-w-0">
              {hasChildren ? (
                <button
                  type="button"
                  onClick={() => toggleExpand(nodo.id_categoria)}
                  className="w-6 h-6 rounded-md hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-blue-600" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              ) : (
                <div className="w-6 h-6 flex items-center justify-center text-gray-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                </div>
              )}

              {hasChildren && isExpanded ? (
                <FolderOpen className="h-4 w-4 text-amber-500 shrink-0" />
              ) : hasChildren ? (
                <Folder className="h-4 w-4 text-amber-500 shrink-0" />
              ) : (
                <Tag className="h-3.5 w-3.5 text-blue-500 shrink-0" />
              )}

              <div className="truncate">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-gray-900 truncate">{nodo.nombre}</span>
                  <Badge variant="outline" className="font-mono text-[10px] text-gray-500 bg-gray-50">
                    {nodo.codigo_categoria}
                  </Badge>
                  <Badge className={`${levelColor} text-[10px] py-0 px-1.5`}>{levelLabel}</Badge>
                </div>
                <p className="text-[11px] text-gray-400 truncate mt-0.5">
                  {nodo.ruta_jerarquica}
                </p>
              </div>
            </div>

            {/* Lado derecho: Contador artículos con pluralización y navegación cruzada + Botones de acción */}
            <div className="flex items-center gap-2 shrink-0 ml-4">
              {((nodo.total_articulos ?? nodo._count?.catalogo_componentes) !== undefined) && (
                (() => {
                  const cant = nodo.total_articulos ?? nodo._count?.catalogo_componentes ?? 0;
                  const label = `${cant} ${cant === 1 ? 'artículo' : 'artículos'}`;

                  return cant > 0 ? (
                    <Link
                      href={`/compras/catalogo?id_categoria=${nodo.id_categoria}`}
                      title={`Ver ${label} en el Catálogo Maestro`}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full transition-all bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 hover:text-blue-900 hover:border-blue-300 shadow-2xs group cursor-pointer"
                    >
                      <span>{label}</span>
                      <ExternalLink className="h-3 w-3 text-blue-500 opacity-60 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  ) : (
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-400">
                      0 artículos
                    </span>
                  );
                })()
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => abrirCrearSubcategoria(nodo)}
                className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                title="Agregar subcategoría hija a este nodo"
              >
                <FolderPlus className="h-3.5 w-3.5 mr-1" />
                + Subfamilia
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => abrirEditar(nodo)}
                className="h-7 px-2 text-xs text-gray-600 hover:text-gray-900"
                title="Editar datos de categoría"
              >
                <Pencil className="h-3.5 w-3.5 mr-1" />
                Editar
              </Button>
            </div>
          </div>

          {/* Subárbol recursivo */}
          {hasChildren && isExpanded && (
            <div className="space-y-1">{renderNodos(hijos, nivel + 1)}</div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-20">
      {/* HEADER DE SECCIÓN */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">
              Familias y Taxonomía
            </h1>
            <Badge className="bg-blue-100 text-blue-700 border-blue-200">
              Árbol Jerárquico
            </Badge>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Estructuración taxonómica y clasificación técnica del catálogo maestro de recursos y repuestos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => cargarArbol(true)}
            disabled={refreshing}
            className="h-10 text-xs"
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>

          <Button
            onClick={abrirCrearRaiz}
            className="h-10 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            + Nueva Familia Raíz (L1)
          </Button>
        </div>
      </div>

      {/* FLASH KPIS */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Nodos Totales</span>
            <Layers className="h-4 w-4 text-blue-600" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-gray-900">{metricas.totalNodos}</p>
          <span className="text-[11px] text-gray-400">En todo el árbol</span>
        </Card>

        <Card className="border border-blue-100 bg-blue-50/30 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-800">Familias Raíz (L1)</span>
            <Folder className="h-4 w-4 text-blue-600" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-blue-900">{metricas.familiasRaiz}</p>
          <span className="text-[11px] text-blue-600">Sistemas troncales</span>
        </Card>

        <Card className="border border-indigo-100 bg-indigo-50/30 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-800">Subfamilias / Especialidades</span>
            <Tag className="h-4 w-4 text-indigo-600" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-indigo-900">{metricas.subfamilias}</p>
          <span className="text-[11px] text-indigo-600">Nivel 2 y 3</span>
        </Card>

        <Card className="border border-emerald-100 bg-emerald-50/30 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800">Artículos Asignados</span>
            <Boxes className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-emerald-900">{metricas.totalArticulos}</p>
          <span className="text-[11px] text-emerald-600">Con taxonomía activa</span>
        </Card>
      </div>

      {/* BARRA DE ACCIÓN Y BUSCADOR */}
      <Card className="border border-gray-200 bg-white shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Buscar rama, código o nombre taxonómico..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-gray-50/50 text-sm h-10 border-gray-200"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={expandirTodos}
                className="h-9 text-xs text-gray-700"
              >
                Expandir Todo
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={colapsarTodos}
                className="h-9 text-xs text-gray-700"
              >
                Colapsar Todo
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* EXPLORADOR DE ÁRBOL */}
      <div className="space-y-2">
        {loading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center text-sm text-gray-400 shadow-sm">
            <RefreshCw className="mx-auto h-6 w-6 animate-spin text-blue-500 mb-2" />
            Cargando taxonomía del catálogo...
          </div>
        ) : arbol.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
            <Layers className="mx-auto h-8 w-8 text-gray-300 mb-2" />
            <p className="text-sm font-semibold text-gray-700">No hay categorías registradas</p>
            <p className="text-xs text-gray-400 mt-1">
              Comienza creando la primera familia raíz para estructurar el catálogo.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">{renderNodos(arbol)}</div>
        )}
      </div>

      {/* MODAL DE CREAR / EDITAR CATEGORÍA */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900">
              {isEditing
                ? `Editar Categoría: ${selectedNode?.nombre}`
                : formData.id_padre
                ? `Nueva Subcategoría bajo: ${selectedNode?.nombre}`
                : 'Nueva Familia Raíz (Nivel 1)'}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              {isEditing
                ? 'Actualiza el nombre, código o descripción de esta rama taxonómica.'
                : 'La profundidad y ruta jerárquica se calcularán automáticamente.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="cat_nombre" className="text-xs font-semibold text-gray-700">
                Nombre de la Categoría <span className="text-red-500">*</span>
              </Label>
              <Input
                id="cat_nombre"
                placeholder="Ej: Alternadores y Reguladores, Filtros de Aceite"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                required
                className="bg-white text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cat_codigo" className="text-xs font-semibold text-gray-700">
                Código Mnemotécnico (Opcional)
              </Label>
              <Input
                id="cat_codigo"
                placeholder="Ej: FILT-ACEITE (se autogenera si se omite)"
                value={formData.codigo_categoria || ''}
                onChange={(e) => setFormData({ ...formData, codigo_categoria: e.target.value })}
                className="bg-white font-mono uppercase text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cat_desc" className="text-xs font-semibold text-gray-700">
                Descripción / Alcance Técnico
              </Label>
              <Input
                id="cat_desc"
                placeholder="Ej: Elementos para filtrado de lubricante en motores diésel"
                value={formData.descripcion || ''}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                className="bg-white text-sm"
              />
            </div>

            {isEditing && (
              <div className="space-y-2">
                {(() => {
                  const cantArticulos =
                    selectedNode?.total_articulos ?? selectedNode?._count?.catalogo_componentes ?? 0;
                  const hijos = selectedNode?.hijos || selectedNode?.subcategorias || [];
                  const tieneHijosActivos = hijos.some((h) => h.activo);
                  const bloqueado = cantArticulos > 0 || tieneHijosActivos;

                  const handleToggleActivo = (checked: boolean) => {
                    if (!checked) {
                      if (cantArticulos > 0) {
                        toast.warning(
                          `No es posible desactivar '${selectedNode?.nombre}' porque contiene ${cantArticulos} artículo(s) activo(s). Reubique los artículos en otra categoría técnica primero.`,
                          { duration: 5000 },
                        );
                        return;
                      }
                      if (tieneHijosActivos) {
                        toast.warning(
                          `No es posible desactivar '${selectedNode?.nombre}' porque contiene subcategorías hijas activas. Desactive o reubique las subfamilias primero.`,
                          { duration: 5000 },
                        );
                        return;
                      }
                    }
                    setFormData({ ...formData, activo: checked });
                  };

                  return (
                    <>
                      <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50/50 p-3">
                        <div className="space-y-0.5">
                          <Label htmlFor="cat_activo" className="text-xs font-bold text-gray-800 cursor-pointer">
                            Rama Activa en Catálogo
                          </Label>
                          <p className="text-[11px] text-gray-500">
                            Las ramas inactivas no se muestran en selectores de artículos.
                          </p>
                        </div>
                        <Switch
                          id="cat_activo"
                          checked={formData.activo}
                          onCheckedChange={handleToggleActivo}
                          disabled={bloqueado}
                        />
                      </div>

                      {cantArticulos > 0 && (
                        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/70 p-2.5 text-xs text-amber-900">
                          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                          <div className="space-y-0.5 text-[11px] leading-relaxed">
                            <p className="font-bold text-amber-950">Protección de Integridad Referencial</p>
                            <p className="text-amber-800">
                              Esta rama agrupa <strong>{cantArticulos} {cantArticulos === 1 ? 'artículo activo' : 'artículos activos'}</strong> en el catálogo maestro. Para desactivarla, debe reubicar primero los artículos en otra categoría técnica.
                            </p>
                          </div>
                        </div>
                      )}

                      {cantArticulos === 0 && tieneHijosActivos && (
                        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/70 p-2.5 text-xs text-amber-900">
                          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                          <div className="space-y-0.5 text-[11px] leading-relaxed">
                            <p className="font-bold text-amber-950">Protección de Jerarquía Activa</p>
                            <p className="text-amber-800">
                              Esta rama contiene subcategorías hijas activas. Para desactivarla, desactive o reubique primero las subfamilias dependientes.
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalOpen(false)}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {submitting ? 'Guardando...' : isEditing ? 'Actualizar Rama' : 'Crear en Taxonomía'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
