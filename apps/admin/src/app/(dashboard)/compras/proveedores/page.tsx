'use client';

/**
 * MEKANOS S.A.S - Portal Admin
 * Directorio de Proveedores (/compras/proveedores)
 * 
 * Gestión centralizada de fuentes de suministro, datos comerciales y fiscales.
 */

import { useEffect, useState, useMemo } from 'react';
import {
  Building2,
  CheckCircle2,
  ExternalLink,
  Filter,
  Globe,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Truck,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { comprasService } from '@/lib/api/compras.service';
import { ProveedorCompleto } from '@/types/compras.types';
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

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<ProveedorCompleto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('TODOS');

  // Modal de Edición
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProveedor, setSelectedProveedor] = useState<ProveedorCompleto | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State para edición
  const [formData, setFormData] = useState({
    categoria_proveedor: 'REPUESTOS',
    tipo_proveedor: 'NACIONAL',
    tiempo_entrega_dias: 1,
    responsable_iva: true,
    realiza_entregas: true,
    proveedor_activo: true,
    servicios_ofrecidos: '',
    observaciones: '',
  });

  // Cargar proveedores
  const cargarProveedores = async (showToast = false) => {
    try {
      if (showToast) setRefreshing(true);
      else setLoading(true);

      const res = await comprasService.getProveedoresDirectorio(1, 100);
      setProveedores(res.data || []);

      if (showToast) toast.success('Directorio de proveedores actualizado');
    } catch (e: any) {
      console.error('Error al cargar proveedores:', e);
      toast.error('No se pudo cargar el listado de proveedores');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    cargarProveedores();
  }, []);

  // Métricas
  const metricas = useMemo(() => {
    const total = proveedores.length;
    const nacionales = proveedores.filter((p) => p.tipo_proveedor === 'NACIONAL').length;
    const repuestos = proveedores.filter((p) => p.categoria_proveedor === 'REPUESTOS').length;
    const activos = proveedores.filter((p) => p.proveedor_activo).length;
    return { total, nacionales, repuestos, activos };
  }, [proveedores]);

  // Filtrado reactivo
  const proveedoresFiltrados = useMemo(() => {
    return proveedores.filter((p) => {
      const nombre = (p.persona?.razon_social || p.persona?.nombre_comercial || '').toLowerCase();
      const nit = (p.persona?.numero_identificacion || '').toLowerCase();
      const matchSearch =
        !search.trim() ||
        nombre.includes(search.toLowerCase()) ||
        nit.includes(search.toLowerCase());

      const matchCategoria =
        filtroCategoria === 'TODOS' || p.categoria_proveedor === filtroCategoria;

      return matchSearch && matchCategoria;
    });
  }, [proveedores, search, filtroCategoria]);

  // Abrir modal de edición
  const abrirEditarModal = (p: ProveedorCompleto) => {
    setSelectedProveedor(p);
    setFormData({
      categoria_proveedor: p.categoria_proveedor || 'REPUESTOS',
      tipo_proveedor: p.tipo_proveedor || 'NACIONAL',
      tiempo_entrega_dias: p.tiempo_entrega_dias || 1,
      responsable_iva: p.responsable_iva ?? true,
      realiza_entregas: p.realiza_entregas ?? true,
      proveedor_activo: p.proveedor_activo ?? true,
      servicios_ofrecidos: p.servicios_ofrecidos || '',
      observaciones: p.observaciones || '',
    });
    setModalOpen(true);
  };

  // Guardar edición
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProveedor) return;

    try {
      setSubmitting(true);
      await comprasService.updateProveedor(selectedProveedor.id_proveedor, formData);
      toast.success('Proveedor actualizado con éxito');
      setModalOpen(false);
      cargarProveedores();
    } catch (e: any) {
      console.error('Error al actualizar proveedor:', e);
      toast.error('No se pudo actualizar el proveedor');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-20">
      {/* HEADER DE SECCIÓN */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">
              Directorio de Proveedores
            </h1>
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
              Cadena de Suministro
            </Badge>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Administración de fuentes de suministro comercial, datos fiscales y condiciones de entrega.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => cargarProveedores(true)}
            disabled={refreshing}
            className="h-10 text-xs"
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* FLASH KPIS */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Total Proveedores</span>
            <Building2 className="h-4 w-4 text-blue-600" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-gray-900">{metricas.total}</p>
          <span className="text-[11px] text-gray-400">En directorio</span>
        </Card>

        <Card className="border border-blue-100 bg-blue-50/30 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-800">Proveedores Nacionales</span>
            <Globe className="h-4 w-4 text-blue-600" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-blue-900">{metricas.nacionales}</p>
          <span className="text-[11px] text-blue-600">Suministro local</span>
        </Card>

        <Card className="border border-indigo-100 bg-indigo-50/30 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-800">Repuestos e Insumos</span>
            <Truck className="h-4 w-4 text-indigo-600" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-indigo-900">{metricas.repuestos}</p>
          <span className="text-[11px] text-indigo-600">Para catálogo técnico</span>
        </Card>

        <Card className="border border-emerald-100 bg-emerald-50/30 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800">Proveedores Activos</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-emerald-900">{metricas.activos}</p>
          <span className="text-[11px] text-emerald-600">Disponibles para compras</span>
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
                placeholder="Buscar por Razón Social, Nombre o NIT..."
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
                  { id: 'TODOS', label: 'Todos' },
                  { id: 'REPUESTOS', label: 'Repuestos' },
                  { id: 'SERVICIOS', label: 'Servicios' },
                  { id: 'SUMINISTROS', label: 'Suministros' },
                  { id: 'EQUIPOS', label: 'Equipos' },
                  { id: 'MIXTO', label: 'Mixtos' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFiltroCategoria(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    filtroCategoria === f.id
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

      {/* TABLA DE PROVEEDORES */}
      <Card className="border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3.5">Proveedor / Razón Social</th>
                <th className="px-6 py-3.5">Identificación / NIT</th>
                <th className="px-6 py-3.5">Categoría & Tipo</th>
                <th className="px-6 py-3.5">Contacto</th>
                <th className="px-6 py-3.5">Entrega Promedio</th>
                <th className="px-6 py-3.5">Estado</th>
                <th className="px-6 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-gray-400">
                    <RefreshCw className="mx-auto h-6 w-6 animate-spin text-blue-500 mb-2" />
                    Cargando directorio de proveedores...
                  </td>
                </tr>
              ) : proveedoresFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <Truck className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                    <p className="text-sm font-semibold text-gray-700">No se encontraron proveedores</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {search ? 'Intenta con otro término de búsqueda' : 'No hay proveedores registrados.'}
                    </p>
                  </td>
                </tr>
              ) : (
                proveedoresFiltrados.map((prov) => {
                  const nombre =
                    prov.persona?.razon_social ||
                    prov.persona?.nombre_comercial ||
                    `Proveedor #${prov.id_proveedor}`;
                  const nit = prov.persona?.numero_identificacion || '--';
                  const tel = prov.persona?.telefono_principal;
                  const email = prov.persona?.email_principal;

                  return (
                    <tr key={prov.id_proveedor} className="hover:bg-slate-50/80 transition-colors">
                      {/* Razón Social / Comercial */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center font-bold text-xs text-emerald-700 uppercase">
                            <Building2 className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 text-sm">{nombre}</p>
                            {prov.persona?.nombre_comercial && prov.persona.razon_social && (
                              <span className="text-[11px] text-gray-400">
                                {prov.persona.nombre_comercial}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* NIT */}
                      <td className="px-6 py-4 font-mono text-xs text-gray-700">
                        {nit}
                      </td>

                      {/* Categoría y Tipo */}
                      <td className="px-6 py-4 space-y-1">
                        <Badge variant="outline" className="text-[10px] font-semibold text-blue-700 border-blue-200 bg-blue-50/50">
                          {prov.categoria_proveedor}
                        </Badge>
                        <span className="block text-[11px] text-gray-400">
                          {prov.tipo_proveedor}
                        </span>
                      </td>

                      {/* Contacto */}
                      <td className="px-6 py-4 text-xs space-y-0.5">
                        {tel && (
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <Phone className="h-3 w-3 text-gray-400" />
                            {tel}
                          </div>
                        )}
                        {email && (
                          <div className="flex items-center gap-1.5 text-gray-500">
                            <Mail className="h-3 w-3 text-gray-400" />
                            {email}
                          </div>
                        )}
                        {!tel && !email && <span className="text-gray-400">Sin datos de contacto</span>}
                      </td>

                      {/* Entrega */}
                      <td className="px-6 py-4 text-xs">
                        <span className="font-semibold text-gray-800">
                          {prov.tiempo_entrega_dias || 1} días
                        </span>
                        {prov.realiza_entregas && (
                          <span className="block text-[10px] text-emerald-600">
                            ✓ Entregas a domicilio
                          </span>
                        )}
                      </td>

                      {/* Estado */}
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            prov.proveedor_activo
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              prov.proveedor_activo ? 'bg-emerald-600' : 'bg-gray-400'
                            }`}
                          />
                          {prov.proveedor_activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>

                      {/* Acciones */}
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => abrirEditarModal(prov)}
                          className="h-8 px-2 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1" />
                          Editar
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* MODAL DE EDICIÓN DE CONDICIONES COMERCIALES */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900">
              Editar Condiciones de Proveedor
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              {selectedProveedor?.persona?.razon_social || selectedProveedor?.persona?.nombre_comercial}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdate} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ed_cat" className="text-xs font-semibold text-gray-700">
                  Categoría
                </Label>
                <select
                  id="ed_cat"
                  value={formData.categoria_proveedor}
                  onChange={(e) => setFormData({ ...formData, categoria_proveedor: e.target.value })}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                >
                  <option value="REPUESTOS">REPUESTOS</option>
                  <option value="SERVICIOS">SERVICIOS</option>
                  <option value="SUMINISTROS">SUMINISTROS</option>
                  <option value="EQUIPOS">EQUIPOS</option>
                  <option value="MIXTO">MIXTO</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ed_tipo" className="text-xs font-semibold text-gray-700">
                  Tipo
                </Label>
                <select
                  id="ed_tipo"
                  value={formData.tipo_proveedor}
                  onChange={(e) => setFormData({ ...formData, tipo_proveedor: e.target.value })}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                >
                  <option value="NACIONAL">NACIONAL</option>
                  <option value="INTERNACIONAL">INTERNACIONAL</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ed_dias" className="text-xs font-semibold text-gray-700">
                Tiempo de Entrega Promedio (Días)
              </Label>
              <Input
                id="ed_dias"
                type="number"
                min="0"
                value={formData.tiempo_entrega_dias}
                onChange={(e) => setFormData({ ...formData, tiempo_entrega_dias: Number(e.target.value) })}
                className="bg-white text-sm"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50/50 p-3">
              <div className="space-y-0.5">
                <Label htmlFor="ed_iva" className="text-xs font-bold text-gray-800 cursor-pointer">
                  Responsable de IVA
                </Label>
                <p className="text-[11px] text-gray-500">Aplica impuestos en órdenes de compra.</p>
              </div>
              <Switch
                id="ed_iva"
                checked={formData.responsable_iva}
                onCheckedChange={(c) => setFormData({ ...formData, responsable_iva: c })}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50/50 p-3">
              <div className="space-y-0.5">
                <Label htmlFor="ed_entregas" className="text-xs font-bold text-gray-800 cursor-pointer">
                  Realiza Entregas a Domicilio
                </Label>
                <p className="text-[11px] text-gray-500">Despacha repuestos directamente a sede MEKANOS.</p>
              </div>
              <Switch
                id="ed_entregas"
                checked={formData.realiza_entregas}
                onCheckedChange={(c) => setFormData({ ...formData, realiza_entregas: c })}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50/50 p-3">
              <div className="space-y-0.5">
                <Label htmlFor="ed_activo" className="text-xs font-bold text-gray-800 cursor-pointer">
                  Proveedor Activo
                </Label>
                <p className="text-[11px] text-gray-500">Habilita al proveedor para abastecimiento.</p>
              </div>
              <Switch
                id="ed_activo"
                checked={formData.proveedor_activo}
                onCheckedChange={(c) => setFormData({ ...formData, proveedor_activo: c })}
              />
            </div>

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
                {submitting ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
