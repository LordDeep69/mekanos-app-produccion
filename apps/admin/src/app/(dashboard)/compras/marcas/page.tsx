'use client';

/**
 * MEKANOS S.A.S - Portal Admin
 * Gestión Maestra de Marcas y Fabricantes (/compras/marcas)
 * 
 * Directorio centralizado, auditoría, trazabilidad de artículos,
 * filtros OEM, toggles reactivos y herramienta de consolidación/fusión de marcas.
 */

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  GitMerge,
  Globe,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Tag,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { comprasService } from '@/lib/api/compras.service';
import { Marca, CreateMarcaPayload } from '@/types/compras.types';
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

// Generador de paleta determinista para avatares de marca sin logo
const BRAND_GRADIENTS = [
  'from-blue-600 to-indigo-700 text-white',
  'from-indigo-600 to-purple-700 text-white',
  'from-emerald-600 to-teal-700 text-white',
  'from-amber-600 to-orange-700 text-white',
  'from-rose-600 to-pink-700 text-white',
  'from-cyan-600 to-blue-700 text-white',
  'from-violet-600 to-fuchsia-700 text-white',
  'from-slate-700 to-zinc-900 text-white',
];

function getBrandGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % BRAND_GRADIENTS.length;
  return BRAND_GRADIENTS[index];
}

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

export default function MarcasPage() {
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'TODOS' | 'OEM' | 'AFTERMARKET' | 'ACTIVOS' | 'INACTIVOS'>('TODOS');

  // Modal de Crear / Editar
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedMarca, setSelectedMarca] = useState<Marca | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [customSlugEnabled, setCustomSlugEnabled] = useState(false);

  // Form state para Alta/Edición
  const [formData, setFormData] = useState<CreateMarcaPayload & { activo: boolean }>({
    nombre: '',
    slug: '',
    pais_origen: '',
    es_fabricante_oem: false,
    sitio_web: '',
    logo_url: '',
    notas: '',
    activo: true,
  });

  // Modal de Fusión de Marcas (Merge Brands)
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [mergeOrigenId, setMergeOrigenId] = useState<number | null>(null);
  const [mergeDestinoId, setMergeDestinoId] = useState<number | null>(null);
  const [eliminarOrigen, setEliminarOrigen] = useState(true);
  const [submittingMerge, setSubmittingMerge] = useState(false);

  // Cargar marcas
  const cargarMarcas = async (showToast = false) => {
    try {
      if (showToast) setRefreshing(true);
      else setLoading(true);

      const data = await comprasService.getMarcas('', 100);
      setMarcas(data);

      if (showToast) toast.success('Directorio de marcas actualizado');
    } catch (e: any) {
      console.error('Error al cargar marcas:', e);
      toast.error('No se pudo cargar el listado de marcas');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    cargarMarcas();
  }, []);

  // Métricas flash con conteos exactos
  const metricas = useMemo(() => {
    const total = marcas.length;
    const oemCount = marcas.filter((m) => m.es_fabricante_oem).length;
    const alternativasCount = marcas.filter((m) => !m.es_fabricante_oem).length;
    const activosCount = marcas.filter((m) => m.activo).length;
    const inactivosCount = marcas.filter((m) => !m.activo).length;
    const paises = new Set(marcas.map((m) => m.pais_origen).filter(Boolean)).size;
    return { total, oemCount, alternativasCount, activosCount, inactivosCount, paises };
  }, [marcas]);

  // Filtrado reactivo en memoria
  const marcasFiltradas = useMemo(() => {
    return marcas.filter((m) => {
      const matchSearch =
        !search.trim() ||
        m.nombre.toLowerCase().includes(search.toLowerCase()) ||
        (m.pais_origen && m.pais_origen.toLowerCase().includes(search.toLowerCase()));

      let matchFiltro = true;
      if (filtroTipo === 'OEM') matchFiltro = m.es_fabricante_oem;
      if (filtroTipo === 'AFTERMARKET') matchFiltro = !m.es_fabricante_oem;
      if (filtroTipo === 'ACTIVOS') matchFiltro = m.activo;
      if (filtroTipo === 'INACTIVOS') matchFiltro = !m.activo;

      return matchSearch && matchFiltro;
    });
  }, [marcas, search, filtroTipo]);

  // Manejo de sincronización automática de Slug
  const handleNombreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormData((prev) => ({
      ...prev,
      nombre: val,
      slug: customSlugEnabled ? prev.slug : slugify(val),
    }));
  };

  // Abrir modal para crear
  const abrirCrearModal = () => {
    setIsEditing(false);
    setSelectedMarca(null);
    setCustomSlugEnabled(false);
    setFormData({
      nombre: '',
      slug: '',
      pais_origen: '',
      es_fabricante_oem: false,
      sitio_web: '',
      logo_url: '',
      notas: '',
      activo: true,
    });
    setModalOpen(true);
  };

  // Abrir modal para editar
  const abrirEditarModal = (marca: Marca) => {
    setIsEditing(true);
    setSelectedMarca(marca);
    setCustomSlugEnabled(true);
    setFormData({
      nombre: marca.nombre,
      slug: marca.slug || slugify(marca.nombre),
      pais_origen: marca.pais_origen || '',
      es_fabricante_oem: marca.es_fabricante_oem,
      sitio_web: marca.sitio_web || '',
      logo_url: marca.logo_url || '',
      notas: '',
      activo: marca.activo,
    });
    setModalOpen(true);
  };

  // Abrir modal de fusión
  const abrirModalFusion = (marcaOrigenSeleccionada?: Marca) => {
    if (marcaOrigenSeleccionada) {
      setMergeOrigenId(marcaOrigenSeleccionada.id_marca);
      // Pre-seleccionar primera marca diferente
      const otra = marcas.find((m) => m.id_marca !== marcaOrigenSeleccionada.id_marca);
      setMergeDestinoId(otra ? otra.id_marca : null);
    } else {
      setMergeOrigenId(null);
      setMergeDestinoId(null);
    }
    setEliminarOrigen(true);
    setMergeModalOpen(true);
  };

  // Guardar (crear o actualizar)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      toast.error('El nombre de la marca es obligatorio');
      return;
    }

    try {
      setSubmitting(true);
      const payload: Partial<CreateMarcaPayload> = {
        nombre: formData.nombre.trim(),
        slug: formData.slug?.trim() ? slugify(formData.slug.trim()) : undefined,
        pais_origen: formData.pais_origen?.trim() || undefined,
        es_fabricante_oem: formData.es_fabricante_oem,
        sitio_web: formData.sitio_web?.trim() || undefined,
        logo_url: formData.logo_url?.trim() || undefined,
        activo: formData.activo,
      };

      if (isEditing && selectedMarca) {
        await comprasService.updateMarca(selectedMarca.id_marca, payload);
        toast.success(`Marca "${formData.nombre}" actualizada con éxito`);
      } else {
        await comprasService.createMarca(payload as CreateMarcaPayload);
        toast.success(`Marca "${formData.nombre}" creada con éxito`);
      }

      setModalOpen(false);
      cargarMarcas();
    } catch (error: any) {
      console.error('Error al guardar marca:', error);
      const msg = error.response?.data?.message || 'Error al procesar la solicitud';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Confirmar Fusión de Marcas
  const handleFusionarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mergeOrigenId || !mergeDestinoId) {
      toast.error('Debes seleccionar tanto la marca origen como la marca destino');
      return;
    }
    if (mergeOrigenId === mergeDestinoId) {
      toast.error('La marca origen y la marca destino deben ser diferentes');
      return;
    }

    const marcaOrigenObj = marcas.find((m) => m.id_marca === mergeOrigenId);
    const marcaDestinoObj = marcas.find((m) => m.id_marca === mergeDestinoId);

    try {
      setSubmittingMerge(true);
      const res = await comprasService.fusionarMarcas({
        id_marca_origen: mergeOrigenId,
        id_marca_destino: mergeDestinoId,
        eliminar_origen: eliminarOrigen,
      });

      toast.success(res.mensaje || `Fusión completada exitosamente hacia ${marcaDestinoObj?.nombre}`);
      setMergeModalOpen(false);
      cargarMarcas();
    } catch (error: any) {
      console.error('Error al fusionar marcas:', error);
      const msg = error.response?.data?.message || 'Error al ejecutar la fusión de marcas';
      toast.error(msg);
    } finally {
      setSubmittingMerge(false);
    }
  };

  // Toggle rápido de estado activo
  const alternarEstado = async (marca: Marca) => {
    try {
      const nuevoEstado = !marca.activo;
      // Optimistic update
      setMarcas((prev) =>
        prev.map((m) => (m.id_marca === marca.id_marca ? { ...m, activo: nuevoEstado } : m))
      );
      await comprasService.updateMarca(marca.id_marca, { activo: nuevoEstado });
      toast.success(`Marca ${marca.nombre} ${nuevoEstado ? 'activada' : 'desactivada'}`);
    } catch (e: any) {
      toast.error('No se pudo actualizar el estado de la marca');
      cargarMarcas();
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-20">
      {/* HEADER DE SECCIÓN */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">
              Marcas y Fabricantes
            </h1>
            <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200">
              Directorio Maestro
            </Badge>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Gobierno y administración centralizada de fabricantes OEM, marcas homologadas y procedencia.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => cargarMarcas(true)}
            disabled={refreshing}
            className="h-10 text-xs"
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => abrirModalFusion()}
            className="h-10 text-xs border-amber-300 bg-amber-50/50 text-amber-900 hover:bg-amber-100/80 font-medium"
          >
            <GitMerge className="mr-1.5 h-3.5 w-3.5 text-amber-600" />
            Fusionar Marcas
          </Button>

          <Button
            onClick={abrirCrearModal}
            className="h-10 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            + Nueva Marca / Fabricante
          </Button>
        </div>
      </div>

      {/* FLASH KPIS */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Total Marcas</span>
            <Tag className="h-4 w-4 text-blue-600" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-gray-900">{metricas.total}</p>
          <span className="text-[11px] text-gray-400">En catálogo maestro</span>
        </Card>

        <Card className="border border-blue-100 bg-blue-50/30 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-800">Fabricantes OEM</span>
            <ShieldCheck className="h-4 w-4 text-blue-600" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-blue-900">{metricas.oemCount}</p>
          <span className="text-[11px] text-blue-600">Equipo original de fábrica</span>
        </Card>

        <Card className="border border-emerald-100 bg-emerald-50/30 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800">Marcas Activas</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-emerald-900">{metricas.activosCount}</p>
          <span className="text-[11px] text-emerald-600">Disponibles en compras</span>
        </Card>

        <Card className="border border-purple-100 bg-purple-50/30 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-800">Países de Origen</span>
            <Globe className="h-4 w-4 text-purple-600" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-purple-900">{metricas.paises}</p>
          <span className="text-[11px] text-purple-600">Diversificación global</span>
        </Card>
      </div>

      {/* BARRA DE HERRAMIENTAS Y PÍLDORAS CON MICRO-CONTADORES */}
      <Card className="border border-gray-200 bg-white shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            {/* Buscador */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Buscar por nombre o país de origen..."
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

            {/* Pestañas de Filtro con Micro-contadores */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'TODOS', label: 'Todas', count: metricas.total },
                { id: 'OEM', label: 'Solo OEM', count: metricas.oemCount },
                { id: 'AFTERMARKET', label: 'Alternativas', count: metricas.alternativasCount },
                { id: 'ACTIVOS', label: 'Activas', count: metricas.activosCount },
                { id: 'INACTIVOS', label: 'Inactivas', count: metricas.inactivosCount },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFiltroTipo(f.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1.5 ${
                    filtroTipo === f.id
                      ? 'bg-gray-900 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <span>{f.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      filtroTipo === f.id
                        ? 'bg-gray-700 text-white'
                        : 'bg-gray-200/80 text-gray-700'
                    }`}
                  >
                    {f.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* TABLA DE MARCAS INDUSTRIALES */}
      <Card className="border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3.5">Marca / Fabricante</th>
                <th className="px-6 py-3.5">Tipo / Clasificación</th>
                <th className="px-6 py-3.5 text-center">Artículos</th>
                <th className="px-6 py-3.5">País de Origen</th>
                <th className="px-6 py-3.5">Portal Web</th>
                <th className="px-6 py-3.5">Estado</th>
                <th className="px-6 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-gray-400">
                    <RefreshCw className="mx-auto h-6 w-6 animate-spin text-blue-500 mb-2" />
                    Cargando directorio de marcas...
                  </td>
                </tr>
              ) : marcasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <Tag className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                    <p className="text-sm font-semibold text-gray-700">No se encontraron marcas</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {search ? 'Intenta con otro término de búsqueda' : 'Registra la primera marca para el catálogo'}
                    </p>
                  </td>
                </tr>
              ) : (
                marcasFiltradas.map((marca) => {
                  const articulosCount = marca._count?.catalogo_componentes ?? 0;
                  const gradientClass = getBrandGradient(marca.nombre);

                  return (
                    <tr key={marca.id_marca} className="hover:bg-slate-50/80 transition-colors group">
                      {/* 1. Nombre, Slug y Avatar Prémium */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {marca.logo_url ? (
                            <img
                              src={marca.logo_url}
                              alt={marca.nombre}
                              className="w-9 h-9 rounded-lg object-contain bg-white border border-gray-200 p-0.5 shadow-xs"
                              onError={(e) => {
                                // Fallback a gradiente si la imagen falla
                                (e.currentTarget as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div
                              className={`w-9 h-9 rounded-lg bg-gradient-to-br ${gradientClass} flex items-center justify-center font-extrabold text-xs tracking-wider shadow-xs uppercase select-none`}
                            >
                              {marca.nombre.substring(0, 2)}
                            </div>
                          )}

                          <div>
                            <p className="font-bold text-gray-900 text-sm leading-snug">{marca.nombre}</p>
                            <span className="font-mono text-[11px] text-gray-400">
                              {marca.slug || marca.nombre.toLowerCase().replace(/\s+/g, '-')}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 2. Clasificación OEM */}
                      <td className="px-6 py-4">
                        {marca.es_fabricante_oem ? (
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200 gap-1 text-[11px]">
                            <ShieldCheck className="h-3 w-3 text-blue-600" />
                            Fabricante Original (OEM)
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-gray-600 border-gray-200 text-[11px]">
                            Homologado / Aftermarket
                          </Badge>
                        )}
                      </td>

                      {/* 3. Columna "Artículos" (Trazabilidad y Enlace Cruzado al Catálogo) */}
                      <td className="px-6 py-4 text-center">
                        {articulosCount > 0 ? (
                          <Link
                            href={`/compras/catalogo?id_marca=${marca.id_marca}`}
                            title={`Ver los ${articulosCount} repuestos asociados a ${marca.nombre} en el Catálogo Maestro`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors group/item"
                          >
                            <Package className="h-3 w-3 text-blue-500 group-hover/item:scale-110 transition-transform" />
                            <span>
                              {articulosCount} {articulosCount === 1 ? 'repuesto' : 'repuestos'}
                            </span>
                          </Link>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium text-gray-400 bg-gray-50 border border-gray-100">
                            0 repuestos
                          </span>
                        )}
                      </td>

                      {/* 4. País de origen */}
                      <td className="px-6 py-4 text-xs font-medium text-gray-700">
                        {marca.pais_origen ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Globe className="h-3.5 w-3.5 text-gray-400" />
                            {marca.pais_origen}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">No especificado</span>
                        )}
                      </td>

                      {/* 5. Portal Web con ExternalLink */}
                      <td className="px-6 py-4 text-xs">
                        {marca.sitio_web ? (
                          <a
                            href={
                              marca.sitio_web.startsWith('http')
                                ? marca.sitio_web
                                : `https://${marca.sitio_web}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 hover:underline font-medium transition-colors"
                          >
                            <span>Web Oficial</span>
                            <ExternalLink className="h-3 w-3 text-blue-500" />
                          </a>
                        ) : (
                          <span className="text-gray-300 text-xs italic">Sin portal</span>
                        )}
                      </td>

                      {/* 6. Estado con Toggle Rápido */}
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => alternarEstado(marca)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all shadow-2xs ${
                            marca.activo
                              ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200 border border-gray-200'
                          }`}
                          title={`Marca ${marca.activo ? 'Activa' : 'Inactiva'}. Haz clic para alternar estado`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              marca.activo ? 'bg-emerald-500' : 'bg-gray-400'
                            }`}
                          />
                          {marca.activo ? 'Activa' : 'Inactiva'}
                        </button>
                      </td>

                      {/* 7. Acciones */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => abrirEditarModal(marca)}
                            className="h-8 px-2.5 text-xs text-gray-600 hover:text-blue-700 hover:bg-blue-50 font-medium"
                          >
                            <Pencil className="h-3.5 w-3.5 mr-1 text-gray-400 group-hover:text-blue-600" />
                            Editar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* MODAL ACCESIBLE DE CREAR / EDITAR MARCA */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900">
              {isEditing ? `Editar Marca: ${selectedMarca?.nombre}` : 'Registrar Nueva Marca / Fabricante'}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              {isEditing
                ? 'Actualiza los atributos del fabricante o su estado en el catálogo.'
                : 'Inserta una marca al directorio maestro para su uso en repuestos y proveedores.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {/* Nombre */}
            <div className="space-y-1.5">
              <Label htmlFor="m_nombre" className="text-xs font-semibold text-gray-700">
                Nombre de la Marca <span className="text-red-500">*</span>
              </Label>
              <Input
                id="m_nombre"
                placeholder="Ej: CATERPILLAR, BOSCH, MANN-FILTER"
                value={formData.nombre}
                onChange={handleNombreChange}
                required
                className="bg-white uppercase font-medium text-sm"
              />
            </div>

            {/* Slug URL */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="m_slug" className="text-xs font-semibold text-gray-700">
                  Identificador Slug (URL)
                </Label>
                <button
                  type="button"
                  onClick={() => setCustomSlugEnabled(!customSlugEnabled)}
                  className="text-[11px] text-blue-600 hover:underline"
                >
                  {customSlugEnabled ? 'Autogenerar' : 'Personalizar'}
                </button>
              </div>
              <Input
                id="m_slug"
                placeholder="caterpillar"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                disabled={!customSlugEnabled}
                className="bg-gray-50/50 font-mono text-xs text-gray-600"
              />
            </div>

            {/* Switch Fabricante OEM */}
            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50/50 p-3">
              <div className="space-y-0.5">
                <Label htmlFor="m_oem" className="text-xs font-bold text-gray-800 cursor-pointer">
                  ¿Es Fabricante Original (OEM)?
                </Label>
                <p className="text-[11px] text-gray-500">
                  Activa si diseña o suministra componentes de fábrica para maquinaria.
                </p>
              </div>
              <Switch
                id="m_oem"
                checked={formData.es_fabricante_oem}
                onCheckedChange={(checked) => setFormData({ ...formData, es_fabricante_oem: checked })}
              />
            </div>

            {/* País y Sitio Web */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="m_pais" className="text-xs font-semibold text-gray-700">
                  País de Origen
                </Label>
                <Input
                  id="m_pais"
                  placeholder="Ej: Alemania, EE.UU."
                  value={formData.pais_origen || ''}
                  onChange={(e) => setFormData({ ...formData, pais_origen: e.target.value })}
                  className="bg-white text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="m_web" className="text-xs font-semibold text-gray-700">
                  Sitio Web Oficial
                </Label>
                <Input
                  id="m_web"
                  placeholder="Ej: www.cat.com"
                  value={formData.sitio_web || ''}
                  onChange={(e) => setFormData({ ...formData, sitio_web: e.target.value })}
                  className="bg-white text-sm"
                />
              </div>
            </div>

            {/* Logo URL opcional con vista previa */}
            <div className="space-y-1.5">
              <Label htmlFor="m_logo" className="text-xs font-semibold text-gray-700">
                URL del Logotipo / Isotipo (Opcional)
              </Label>
              <div className="flex items-center gap-2.5">
                <Input
                  id="m_logo"
                  placeholder="https://ejemplo.com/logo.png"
                  value={formData.logo_url || ''}
                  onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                  className="bg-white text-sm flex-1"
                />
                {formData.logo_url && (
                  <div className="h-9 w-9 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={formData.logo_url}
                      alt="Logo preview"
                      className="h-full w-full object-contain p-0.5"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>
              <p className="text-[11px] text-gray-400">
                Acepta URLs directas de Cloudinary, CDN institucional o portales de fabricantes.
              </p>
            </div>

            {/* Estado Activo en Edición */}
            {isEditing && (
              <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50/50 p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="m_activo" className="text-xs font-bold text-gray-800 cursor-pointer">
                    Estado Activo en Catálogo
                  </Label>
                  <p className="text-[11px] text-gray-500">
                    Las marcas inactivas no se sugieren al dar de alta nuevos repuestos.
                  </p>
                </div>
                <Switch
                  id="m_activo"
                  checked={formData.activo}
                  onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
                />
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
                {submitting ? 'Guardando...' : isEditing ? 'Actualizar Marca' : 'Guardar en Directorio'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL DE FUSIÓN / UNIFICACIÓN DE MARCAS (MERGE BRANDS) */}
      <Dialog open={mergeModalOpen} onOpenChange={setMergeModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 rounded-xl text-amber-700 shadow-2xs">
                <GitMerge className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-gray-900">
                  Herramienta de Fusión y Unificación de Marcas
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Esta herramienta permite unificar dos marcas duplicadas (ej. &apos;CAT&apos; y &apos;CATERPILLAR&apos;), transfiriendo todos los repuestos asociados a la marca definitiva y archivando el alias secundario.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleFusionarSubmit} className="space-y-4 py-2">
            {/* Callout de advertencia */}
            <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Operación Transaccional Atómica (Consolidación)
              </div>
              <p className="text-[11px] leading-relaxed text-amber-800">
                Todos los repuestos del catálogo y vinculaciones con proveedores asociados a la{' '}
                <strong>Marca Origen</strong> serán reasignados automáticamente a la{' '}
                <strong>Marca Destino</strong>.
              </p>
            </div>

            {/* Selectores Origen y Destino */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="select_origen" className="text-xs font-bold text-red-700">
                  1. Marca Origen (Alias duplicado a retirar)
                </Label>
                <select
                  id="select_origen"
                  value={mergeOrigenId || ''}
                  onChange={(e) => setMergeOrigenId(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-2xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  required
                >
                  <option value="" disabled>
                    Selecciona la marca redundante...
                  </option>
                  {marcas.map((m) => (
                    <option key={m.id_marca} value={m.id_marca}>
                      {m.nombre} ({m._count?.catalogo_componentes ?? 0} repuestos asociados)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-center my-1">
                <div className="p-1.5 bg-gray-100 rounded-full text-gray-500">
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="select_destino" className="text-xs font-bold text-emerald-700">
                  2. Marca Destino (Registro canónico principal)
                </Label>
                <select
                  id="select_destino"
                  value={mergeDestinoId || ''}
                  onChange={(e) => setMergeDestinoId(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-2xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  required
                >
                  <option value="" disabled>
                    Selecciona la marca canónica receptora...
                  </option>
                  {marcas
                    .filter((m) => m.id_marca !== mergeOrigenId)
                    .map((m) => (
                      <option key={m.id_marca} value={m.id_marca}>
                        {m.nombre} ({m._count?.catalogo_componentes ?? 0} repuestos asociados)
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Switch de eliminación o desactivación */}
            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50/50 p-3">
              <div className="space-y-0.5">
                <Label htmlFor="m_eliminar" className="text-xs font-bold text-gray-800 cursor-pointer">
                  Eliminar marca origen tras la transferencia
                </Label>
                <p className="text-[11px] text-gray-500">
                  Si se desactiva, la marca origen quedará archivada como inactiva con nota de auditoría.
                </p>
              </div>
              <Switch
                id="m_eliminar"
                checked={eliminarOrigen}
                onCheckedChange={setEliminarOrigen}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMergeModalOpen(false)}
                disabled={submittingMerge}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submittingMerge || !mergeOrigenId || !mergeDestinoId}
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
              >
                {submittingMerge ? 'Fusionando repuestos...' : 'Confirmar Fusión Atómica'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
