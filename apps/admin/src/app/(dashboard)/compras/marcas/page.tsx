'use client';

/**
 * MEKANOS S.A.S - Portal Admin
 * Gestión Maestra de Marcas y Fabricantes (/compras/marcas)
 * 
 * Directorio centralizado, auditoría, filtros OEM y administración CRUD independiente.
 */

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Building2,
  Check,
  CheckCircle2,
  ExternalLink,
  Filter,
  Globe,
  Layers,
  MoreVertical,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
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

  // Form state
  const [formData, setFormData] = useState<CreateMarcaPayload & { activo: boolean }>({
    nombre: '',
    pais_origen: '',
    es_fabricante_oem: false,
    sitio_web: '',
    notas: '',
    activo: true,
  });

  // Cargar marcas
  const cargarMarcas = async (showToast = false) => {
    try {
      if (showToast) setRefreshing(true);
      else setLoading(true);

      const data = await comprasService.getMarcas('', 200);
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

  // Métricas flash
  const metricas = useMemo(() => {
    const total = marcas.length;
    const oemCount = marcas.filter((m) => m.es_fabricante_oem).length;
    const activosCount = marcas.filter((m) => m.activo).length;
    const paises = new Set(marcas.map((m) => m.pais_origen).filter(Boolean)).size;
    return { total, oemCount, activosCount, paises };
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

  // Abrir modal para crear
  const abrirCrearModal = () => {
    setIsEditing(false);
    setSelectedMarca(null);
    setFormData({
      nombre: '',
      pais_origen: '',
      es_fabricante_oem: false,
      sitio_web: '',
      notas: '',
      activo: true,
    });
    setModalOpen(true);
  };

  // Abrir modal para editar
  const abrirEditarModal = (marca: Marca) => {
    setIsEditing(true);
    setSelectedMarca(marca);
    setFormData({
      nombre: marca.nombre,
      pais_origen: marca.pais_origen || '',
      es_fabricante_oem: marca.es_fabricante_oem,
      sitio_web: marca.sitio_web || '',
      notas: '',
      activo: marca.activo,
    });
    setModalOpen(true);
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
      if (isEditing && selectedMarca) {
        await comprasService.updateMarca(selectedMarca.id_marca, {
          nombre: formData.nombre.trim(),
          pais_origen: formData.pais_origen?.trim() || undefined,
          es_fabricante_oem: formData.es_fabricante_oem,
          sitio_web: formData.sitio_web?.trim() || undefined,
          activo: formData.activo,
        });
        toast.success(`Marca "${formData.nombre}" actualizada con éxito`);
      } else {
        await comprasService.createMarca({
          nombre: formData.nombre.trim(),
          pais_origen: formData.pais_origen?.trim() || undefined,
          es_fabricante_oem: formData.es_fabricante_oem,
          sitio_web: formData.sitio_web?.trim() || undefined,
        });
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

  // Toggle rápido de estado activo
  const alternarEstado = async (marca: Marca) => {
    try {
      const nuevoEstado = !marca.activo;
      await comprasService.updateMarca(marca.id_marca, { activo: nuevoEstado });
      setMarcas((prev) =>
        prev.map((m) => (m.id_marca === marca.id_marca ? { ...m, activo: nuevoEstado } : m))
      );
      toast.success(`Marca ${marca.nombre} ${nuevoEstado ? 'activada' : 'desactivada'}`);
    } catch (e: any) {
      toast.error('No se pudo actualizar el estado de la marca');
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

        <div className="flex items-center gap-2">
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
          <span className="text-[11px] text-blue-600">Equipo original</span>
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

      {/* BARRA DE HERRAMIENTAS Y FILTROS */}
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

            {/* Pestañas de Filtro */}
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'TODOS', label: 'Todas' },
                  { id: 'OEM', label: 'Solo OEM' },
                  { id: 'AFTERMARKET', label: 'Alternativas' },
                  { id: 'ACTIVOS', label: 'Activas' },
                  { id: 'INACTIVOS', label: 'Inactivas' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFiltroTipo(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    filtroTipo === f.id
                      ? 'bg-gray-900 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* TABLA DE MARCAS */}
      <Card className="border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3.5">Marca / Fabricante</th>
                <th className="px-6 py-3.5">Tipo / Clasificación</th>
                <th className="px-6 py-3.5">País de Origen</th>
                <th className="px-6 py-3.5">Portal Web</th>
                <th className="px-6 py-3.5">Estado</th>
                <th className="px-6 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-gray-400">
                    <RefreshCw className="mx-auto h-6 w-6 animate-spin text-blue-500 mb-2" />
                    Cargando directorio de marcas...
                  </td>
                </tr>
              ) : marcasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <Tag className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                    <p className="text-sm font-semibold text-gray-700">No se encontraron marcas</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {search ? 'Intenta con otro término de búsqueda' : 'Registra la primera marca para el catálogo'}
                    </p>
                  </td>
                </tr>
              ) : (
                marcasFiltradas.map((marca) => (
                  <tr key={marca.id_marca} className="hover:bg-slate-50/80 transition-colors">
                    {/* Nombre y Slug */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center font-bold text-xs text-blue-700 uppercase">
                          {marca.nombre.substring(0, 2)}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{marca.nombre}</p>
                          <span className="font-mono text-[11px] text-gray-400">
                            {marca.slug || marca.nombre.toLowerCase().replace(/\s+/g, '-')}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Clasificación OEM */}
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

                    {/* País de origen */}
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

                    {/* Sitio Web */}
                    <td className="px-6 py-4 text-xs">
                      {marca.sitio_web ? (
                        <a
                          href={marca.sitio_web.startsWith('http') ? marca.sitio_web : `https://${marca.sitio_web}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          Visitar Web
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-gray-400">--</span>
                      )}
                    </td>

                    {/* Estado activo/inactivo */}
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => alternarEstado(marca)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                          marca.activo
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                        title="Haz clic para alternar estado"
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${marca.activo ? 'bg-emerald-600' : 'bg-gray-400'}`}
                        />
                        {marca.activo ? 'Activa' : 'Inactiva'}
                      </button>
                    </td>

                    {/* Acciones */}
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => abrirEditarModal(marca)}
                        className="h-8 px-2 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1" />
                        Editar
                      </Button>
                    </td>
                  </tr>
                ))
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
            <div className="space-y-1.5">
              <Label htmlFor="m_nombre" className="text-xs font-semibold text-gray-700">
                Nombre de la Marca <span className="text-red-500">*</span>
              </Label>
              <Input
                id="m_nombre"
                placeholder="Ej: CATERPILLAR, BOSCH, MANN-FILTER"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                required
                className="bg-white uppercase font-medium text-sm"
              />
            </div>

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
                  placeholder="Ej: www.bosch.com"
                  value={formData.sitio_web || ''}
                  onChange={(e) => setFormData({ ...formData, sitio_web: e.target.value })}
                  className="bg-white text-sm"
                />
              </div>
            </div>

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
    </div>
  );
}
