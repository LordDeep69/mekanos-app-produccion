'use client';

/**
 * MEKANOS S.A.S - Portal Admin
 * Directorio de Proveedores (/compras/proveedores)
 * 
 * Gestión centralizada de fuentes de suministro, datos comerciales y fiscales.
 */

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Building2,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Filter,
  Globe,
  Layers,
  Mail,
  MapPin,
  Package,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Tag,
  Truck,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

const RUBROS_CATALOGO_INSTITUCIONAL = [
  'Filtros y Elementos de Filtración',
  'Aceites, Lubricantes y Refrigerantes',
  'Repuestos de Motor Diésel',
  'Bombas Dosificadoras y de Agua',
  'Válvulas, Atomizadores y Tubería',
  'Baterías y Sistema Eléctrico',
  'Correas, Poleas y Transmisión',
  'Mangueras, Acoples y Conexiones Hidráulicas',
  'Inyección y Turbocargadores',
  'Empaquetaduras y Sellos Mecánicos',
  'Ferretería, Tornillería y Anclajes',
  'Químicos Industriales y Solventes',
  'Herramientas y Equipos de Taller',
  'Consumibles, Aseo y Papelería',
  'Servicios Técnicos Especializados',
  'Suministros y Dotación EPP',
];

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

// Función determinista para avatar con iniciales y gradiente
const getAvatarGradient = (nombre: string) => {
  const gradients = [
    'from-blue-600 to-indigo-700',
    'from-emerald-600 to-teal-700',
    'from-amber-500 to-orange-600',
    'from-purple-600 to-violet-700',
    'from-rose-500 to-pink-600',
    'from-cyan-600 to-blue-700',
    'from-indigo-500 to-purple-600',
  ];
  let hash = 0;
  for (let i = 0; i < nombre.length; i++) {
    hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % gradients.length;
  return gradients[idx];
};

const getInitials = (nombre: string) => {
  const parts = nombre.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'PR';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

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

  // Modal de Creación
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [nuevoRubroInput, setNuevoRubroInput] = useState('');
  const [createFormData, setCreateFormData] = useState({
    razon_social: '',
    numero_identificacion: '',
    rubros: [] as string[],
    sitio_web: '',
    persona_contacto: '',
    telefono_principal: '',
    email_principal: '',
    email_facturacion: '',
    direccion_principal: '',
    url_ubicacion: '',
    terminos_credito: 'Contado (Pago inmediato)',
    observaciones_despacho: '',
    etiquetas_secundarias: '',
  });

  const resetCreateForm = () => {
    setCreateFormData({
      razon_social: '',
      numero_identificacion: '',
      rubros: [],
      sitio_web: '',
      persona_contacto: '',
      telefono_principal: '',
      email_principal: '',
      email_facturacion: '',
      direccion_principal: '',
      url_ubicacion: '',
      terminos_credito: 'Contado (Pago inmediato)',
      observaciones_despacho: '',
      etiquetas_secundarias: '',
    });
    setNuevoRubroInput('');
  };

  const handleAgregarRubro = (rubro: string) => {
    const r = rubro.trim();
    if (!r) return;
    if (createFormData.rubros.includes(r)) {
      toast.info(`El rubro "${r}" ya está asignado`);
      return;
    }
    setCreateFormData((prev) => ({
      ...prev,
      rubros: [...prev.rubros, r],
    }));
  };

  const handleRemoverRubro = (rubro: string) => {
    setCreateFormData((prev) => ({
      ...prev,
      rubros: prev.rubros.filter((item) => item !== rubro),
    }));
  };

  const handleCrearRubroPersonalizado = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const r = nuevoRubroInput.trim();
    if (!r) return;
    handleAgregarRubro(r);
    setNuevoRubroInput('');
  };

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

  // Métricas calculadas para flash KPIs y filtros
  const metricas = useMemo(() => {
    const total = proveedores.length;
    const nacionales = proveedores.filter((p) => p.tipo_proveedor === 'NACIONAL').length;
    const repuestos = proveedores.filter((p) => p.categoria_proveedor === 'REPUESTOS').length;
    const servicios = proveedores.filter((p) => p.categoria_proveedor === 'SERVICIOS').length;
    const suministros = proveedores.filter((p) => p.categoria_proveedor === 'SUMINISTROS').length;
    const equipos = proveedores.filter((p) => p.categoria_proveedor === 'EQUIPOS').length;
    const mixtos = proveedores.filter((p) => p.categoria_proveedor === 'MIXTO').length;
    const activos = proveedores.filter((p) => p.proveedor_activo).length;
    const inactivos = total - activos;
    return { total, nacionales, repuestos, servicios, suministros, equipos, mixtos, activos, inactivos };
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

      let matchCategoria = true;
      if (filtroCategoria === 'TODOS') matchCategoria = true;
      else if (filtroCategoria === 'ACTIVOS') matchCategoria = !!p.proveedor_activo;
      else if (filtroCategoria === 'INACTIVOS') matchCategoria = !p.proveedor_activo;
      else matchCategoria = p.categoria_proveedor === filtroCategoria;

      return matchSearch && matchCategoria;
    });
  }, [proveedores, search, filtroCategoria]);

  // Alternar estado activo rápidamente
  const alternarEstado = async (prov: ProveedorCompleto) => {
    const nuevoEstado = !prov.proveedor_activo;
    try {
      await comprasService.updateProveedor(prov.id_proveedor, {
        proveedor_activo: nuevoEstado,
      });
      const nom = prov.persona?.razon_social || prov.persona?.nombre_comercial || `Proveedor #${prov.id_proveedor}`;
      toast.success(`Proveedor "${nom}" marcado como ${nuevoEstado ? 'Activo' : 'Inactivo'}`);
      cargarProveedores();
    } catch (e: any) {
      console.error('Error al alternar estado de proveedor:', e);
      toast.error('No se pudo actualizar el estado del proveedor');
    }
  };

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

  // Crear nuevo proveedor comercial (flexible: solo razón social obligatoria)
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createFormData.razon_social.trim()) {
      toast.error('La Razón Social o Nombre Comercial es obligatorio (*)');
      return;
    }

    try {
      setCreateSubmitting(true);
      await comprasService.createProveedor({
        razon_social: createFormData.razon_social.trim(),
        nombre_comercial: createFormData.razon_social.trim(),
        numero_identificacion: createFormData.numero_identificacion.trim() || undefined,
        rubros: createFormData.rubros,
        persona_contacto: createFormData.persona_contacto.trim() || undefined,
        telefono_principal: createFormData.telefono_principal.trim() || undefined,
        email_principal: createFormData.email_principal.trim() || undefined,
        email_facturacion: createFormData.email_facturacion.trim() || undefined,
        direccion_principal: createFormData.direccion_principal.trim() || undefined,
        url_ubicacion: createFormData.url_ubicacion.trim() || undefined,
        sitio_web: createFormData.sitio_web.trim() || undefined,
        terminos_credito: createFormData.terminos_credito || undefined,
        observaciones_despacho: createFormData.observaciones_despacho.trim() || undefined,
        etiquetas_secundarias: createFormData.etiquetas_secundarias.trim() || undefined,
        categoria_proveedor: 'REPUESTOS',
        tipo_proveedor: 'NACIONAL',
        proveedor_activo: true,
      });

      toast.success('Proveedor comercial registrado exitosamente');
      setCreateModalOpen(false);
      resetCreateForm();
      cargarProveedores(true);
    } catch (e: any) {
      console.error('Error al registrar proveedor:', e);
      const msg = e?.response?.data?.message || 'No se pudo registrar el proveedor';
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setCreateSubmitting(false);
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

          <Button
            size="sm"
            onClick={() => {
              resetCreateForm();
              setCreateModalOpen(true);
            }}
            className="h-10 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Registrar Proveedor
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

            {/* Pestañas de Filtro con Micro-contadores */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'TODOS', label: 'Todos', count: metricas.total },
                { id: 'REPUESTOS', label: 'Repuestos', count: metricas.repuestos },
                { id: 'SERVICIOS', label: 'Servicios', count: metricas.servicios },
                { id: 'SUMINISTROS', label: 'Suministros', count: metricas.suministros },
                { id: 'EQUIPOS', label: 'Equipos', count: metricas.equipos },
                { id: 'MIXTO', label: 'Mixtos', count: metricas.mixtos },
                { id: 'ACTIVOS', label: 'Activos', count: metricas.activos },
                { id: 'INACTIVOS', label: 'Inactivos', count: metricas.inactivos },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFiltroCategoria(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1.5 ${
                    filtroCategoria === f.id
                      ? 'bg-gray-900 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <span>{f.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      filtroCategoria === f.id
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

      {/* TABLA DE PROVEEDORES */}
      <Card className="border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3.5">Proveedor / Razón Social</th>
                <th className="px-6 py-3.5">Identificación / NIT</th>
                <th className="px-6 py-3.5">Categoría & Tipo</th>
                <th className="px-6 py-3.5 text-center">Artículos</th>
                <th className="px-6 py-3.5">Contacto & Portales</th>
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
                      {search ? 'Intenta con otro término de búsqueda' : 'No hay proveedores registrados en el directorio.'}
                    </p>
                    <div className="mt-4">
                      <Button
                        size="sm"
                        onClick={() => {
                          resetCreateForm();
                          setCreateModalOpen(true);
                        }}
                        className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        Registrar Proveedor Ahora
                      </Button>
                    </div>
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
                  const web = prov.persona?.sitio_web;
                  const ubicacion = prov.persona?.url_ubicacion;
                  const articulosCount =
                    (prov._count?.catalogo_componentes ?? 0) +
                    (prov._count?.articulos_proveedores ?? 0);

                  return (
                    <tr key={prov.id_proveedor} className="hover:bg-slate-50/80 transition-colors">
                      {/* Razón Social con Avatar Determinista */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getAvatarGradient(
                              nombre,
                            )} text-white flex items-center justify-center font-bold text-xs shadow-2xs shrink-0 tracking-wider`}
                          >
                            {getInitials(nombre)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900 text-sm truncate max-w-xs">{nombre}</p>
                            {prov.persona?.nombre_comercial && prov.persona.razon_social && prov.persona.nombre_comercial !== prov.persona.razon_social ? (
                              <span className="text-[11px] text-gray-400 block truncate max-w-xs">
                                {prov.persona.nombre_comercial}
                              </span>
                            ) : prov.codigo_proveedor ? (
                              <span className="text-[11px] font-mono text-gray-400">
                                {prov.codigo_proveedor}
                              </span>
                            ) : null}
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

                      {/* Artículos Suministrados (Relación con Catálogo) */}
                      <td className="px-6 py-4 text-center">
                        {articulosCount > 0 ? (
                          <Link
                            href={`/compras/catalogo?id_proveedor=${prov.id_proveedor}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 hover:text-blue-900 transition-colors shadow-2xs"
                            title={`Ver ${articulosCount} artículo(s) suministrado(s) en Catálogo`}
                          >
                            <Package className="h-3 w-3 text-blue-600" />
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

                      {/* Contacto & Portales */}
                      <td className="px-6 py-4 text-xs space-y-1">
                        {tel && (
                          <a
                            href={`tel:${tel}`}
                            className="flex items-center gap-1.5 text-gray-700 hover:text-blue-600 transition-colors"
                          >
                            <Phone className="h-3 w-3 text-gray-400 shrink-0" />
                            <span>{tel}</span>
                          </a>
                        )}
                        {email && (
                          <a
                            href={`mailto:${email}`}
                            className="flex items-center gap-1.5 text-gray-500 hover:text-blue-600 transition-colors truncate max-w-[200px]"
                            title={email}
                          >
                            <Mail className="h-3 w-3 text-gray-400 shrink-0" />
                            <span className="truncate">{email}</span>
                          </a>
                        )}
                        {web && (
                          <a
                            href={web.startsWith('http') ? web : `https://${web}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline"
                          >
                            <Globe className="h-3 w-3 text-blue-500" />
                            <span>Sitio Web</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                        {ubicacion && (
                          <a
                            href={ubicacion}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-emerald-600 hover:underline ml-2"
                            title="Ver ubicación en Google Maps"
                          >
                            <MapPin className="h-3 w-3 text-emerald-500" />
                            <span>Mapa</span>
                          </a>
                        )}
                        {!tel && !email && !web && <span className="text-gray-400">Sin datos de contacto</span>}
                      </td>

                      {/* Entrega */}
                      <td className="px-6 py-4 text-xs">
                        <span className="font-semibold text-gray-800">
                          {prov.tiempo_entrega_dias || 1} {prov.tiempo_entrega_dias === 1 ? 'día' : 'días'}
                        </span>
                        {prov.realiza_entregas && (
                          <span className="block text-[10px] text-emerald-600 font-medium mt-0.5">
                            ✓ Entregas a domicilio
                          </span>
                        )}
                      </td>

                      {/* Estado con Toggle Rápido */}
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => alternarEstado(prov)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all shadow-2xs ${
                            prov.proveedor_activo
                              ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200 border border-gray-200'
                          }`}
                          title={`Proveedor ${prov.proveedor_activo ? 'Activo' : 'Inactivo'}. Haz clic para alternar estado`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              prov.proveedor_activo ? 'bg-emerald-500' : 'bg-gray-400'
                            }`}
                          />
                          {prov.proveedor_activo ? 'Activo' : 'Inactivo'}
                        </button>
                      </td>

                      {/* Acciones */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => abrirEditarModal(prov)}
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

      {/* MODAL DE CREACIÓN: NUEVO PROVEEDOR COMERCIAL */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-0 rounded-2xl border border-gray-100 shadow-2xl">
          {/* Header */}
          <div className="flex items-start justify-between p-6 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-500 border border-sky-100/60 shadow-xs">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-gray-900 tracking-tight">
                  Nuevo Proveedor Comercial
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-500 mt-0.5">
                  Registra un aliado de suministro para compras de insumos y materias primas.
                </DialogDescription>
              </div>
            </div>
          </div>

          <form onSubmit={handleCreate} className="p-6 pt-4 space-y-6">
            {/* SECCIÓN 1: IDENTIFICACIÓN JURÍDICA Y RUBROS COMERCIALES */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Identificación Jurídica y Rubros Comerciales
              </h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="nprov_razon" className="text-xs font-semibold text-gray-700">
                    Razón social o nombre comercial <span className="text-sky-500 font-bold">*</span>
                  </Label>
                  <Input
                    id="nprov_razon"
                    required
                    placeholder="Ej. Químicos Industriales del Caribe S.A.S."
                    value={createFormData.razon_social}
                    onChange={(e) =>
                      setCreateFormData({ ...createFormData, razon_social: e.target.value })
                    }
                    className="h-10 text-sm bg-white border-gray-200 focus:border-sky-400 focus:ring-sky-400 rounded-lg"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="nprov_nit" className="text-xs font-semibold text-gray-700">
                    NIT / Identificación tributaria
                  </Label>
                  <Input
                    id="nprov_nit"
                    placeholder="Ej. 900.123.456-7"
                    value={createFormData.numero_identificacion}
                    onChange={(e) =>
                      setCreateFormData({ ...createFormData, numero_identificacion: e.target.value })
                    }
                    className="h-10 text-sm bg-white border-gray-200 focus:border-sky-400 focus:ring-sky-400 rounded-lg font-mono"
                  />
                </div>
              </div>

              {/* CARD: RUBROS / CATEGORÍAS DE SUMINISTRO */}
              <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-sky-500" />
                    <span className="text-xs font-bold text-gray-800">
                      Rubros / Categorías de Suministro <span className="text-sky-500">*</span>
                    </span>
                    <span className="text-[11px] text-gray-400 font-normal">
                      (Permite seleccionar múltiples rubros)
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-sky-600 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-100">
                    {createFormData.rubros.length} rubros asignados
                  </span>
                </div>

                {/* Display chips */}
                <div className="min-h-[44px] rounded-lg border border-gray-200 bg-gray-50/50 p-2.5 flex flex-wrap items-center gap-1.5">
                  {createFormData.rubros.length === 0 ? (
                    <span className="text-xs italic text-gray-400">
                      Ningún rubro asignado aún. Selecciona uno del catálogo o crea uno nuevo abajo.
                    </span>
                  ) : (
                    createFormData.rubros.map((rubro, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-sky-50 text-sky-800 border border-sky-200/80 shadow-2xs animate-in fade-in duration-150"
                      >
                        {rubro}
                        <button
                          type="button"
                          onClick={() => handleRemoverRubro(rubro)}
                          className="text-sky-400 hover:text-sky-700 rounded-full p-0.5 hover:bg-sky-100 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>

                {/* Subrow 1: Agregar del Catálogo Institucional */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="nprov_cat_select" className="text-xs font-semibold text-gray-700">
                      Agregar del Catálogo Institucional
                    </Label>
                    <span className="text-[11px] text-gray-400">Selecciona para añadir</span>
                  </div>
                  <select
                    id="nprov_cat_select"
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAgregarRubro(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="w-full h-10 rounded-lg border border-gray-200 bg-white px-3 text-xs text-gray-700 focus:border-sky-400 focus:outline-none"
                  >
                    <option value="" disabled>
                      + Seleccionar rubro del catálogo para agregar...
                    </option>
                    {RUBROS_CATALOGO_INSTITUCIONAL.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Subrow 2: Crear Rubro Personalizado */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="nprov_custom_rubro" className="text-xs font-semibold text-gray-700">
                      ¿No está en la lista? Crear Rubro Personalizado
                    </Label>
                    <span className="text-[11px] text-sky-600 font-semibold cursor-pointer">
                      Asignación directa
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      id="nprov_custom_rubro"
                      placeholder="Nombre del nuevo rubro (ej. Bombas Dosificadoras, Válvulas, Atomizad..."
                      value={nuevoRubroInput}
                      onChange={(e) => setNuevoRubroInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleCrearRubroPersonalizado();
                        }
                      }}
                      className="h-10 text-xs bg-white border-gray-200 focus:border-sky-400 rounded-lg flex-1"
                    />
                    <Button
                      type="button"
                      onClick={() => handleCrearRubroPersonalizado()}
                      className="h-10 px-4 bg-sky-400 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg shrink-0"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Crear y Asignar
                    </Button>
                  </div>
                </div>
              </div>

              {/* Sitio Web / Catálogo Digital */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="nprov_web" className="text-xs font-semibold text-gray-700">
                    Sitio Web / Catálogo Digital
                  </Label>
                  <span className="text-[11px] text-gray-400">Opcional</span>
                </div>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sky-500" />
                  <Input
                    id="nprov_web"
                    placeholder="https://proveedor.com"
                    value={createFormData.sitio_web}
                    onChange={(e) =>
                      setCreateFormData({ ...createFormData, sitio_web: e.target.value })
                    }
                    className="h-10 pl-9 text-xs bg-white border-gray-200 focus:border-sky-400 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* SECCIÓN 2: DATOS DE CONTACTO Y FACTURACIÓN */}
            <div className="space-y-4 pt-2 border-t border-gray-100">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Datos de Contacto y Facturación
              </h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="nprov_contacto" className="text-xs font-semibold text-gray-700">
                    Persona de contacto / Asesor Comercial
                  </Label>
                  <Input
                    id="nprov_contacto"
                    placeholder="Ej. Carlos Mendoza"
                    value={createFormData.persona_contacto}
                    onChange={(e) =>
                      setCreateFormData({ ...createFormData, persona_contacto: e.target.value })
                    }
                    className="h-10 text-xs bg-white border-gray-200 focus:border-sky-400 rounded-lg"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="nprov_tel" className="text-xs font-semibold text-gray-700">
                    Teléfono / WhatsApp de Compras
                  </Label>
                  <Input
                    id="nprov_tel"
                    placeholder="Ej. +57 300 123 4567"
                    value={createFormData.telefono_principal}
                    onChange={(e) =>
                      setCreateFormData({ ...createFormData, telefono_principal: e.target.value })
                    }
                    className="h-10 text-xs bg-white border-gray-200 focus:border-sky-400 rounded-lg"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="nprov_email" className="text-xs font-semibold text-gray-700">
                    Correo electrónico para compras / pedidos
                  </Label>
                  <Input
                    id="nprov_email"
                    type="email"
                    placeholder="Ej. compras@proveedor.com"
                    value={createFormData.email_principal}
                    onChange={(e) =>
                      setCreateFormData({ ...createFormData, email_principal: e.target.value })
                    }
                    className="h-10 text-xs bg-white border-gray-200 focus:border-sky-400 rounded-lg"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="nprov_email_fact" className="text-xs font-semibold text-gray-700">
                      Correo Facturación Electrónica
                    </Label>
                    <span className="text-[11px] text-gray-400">Opcional</span>
                  </div>
                  <Input
                    id="nprov_email_fact"
                    type="email"
                    placeholder="Ej. facturacion@proveedor.com"
                    value={createFormData.email_facturacion}
                    onChange={(e) =>
                      setCreateFormData({ ...createFormData, email_facturacion: e.target.value })
                    }
                    className="h-10 text-xs bg-white border-gray-200 focus:border-sky-400 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* SECCIÓN 3: UBICACIÓN FÍSICA, LOGÍSTICA Y FINANZAS */}
            <div className="space-y-4 pt-2 border-t border-gray-100">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Ubicación Física, Logística y Finanzas
              </h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="nprov_dir" className="text-xs font-semibold text-gray-700">
                    Dirección física de despacho / Bodega
                  </Label>
                  <Input
                    id="nprov_dir"
                    placeholder="Ej. Zona Industrial Mamonal Km 3, Cartagena"
                    value={createFormData.direccion_principal}
                    onChange={(e) =>
                      setCreateFormData({ ...createFormData, direccion_principal: e.target.value })
                    }
                    className="h-10 text-xs bg-white border-gray-200 focus:border-sky-400 rounded-lg"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="nprov_gps" className="text-xs font-semibold text-gray-700">
                      Enlace Google Maps / Waze / GPS
                    </Label>
                    <span className="text-[11px] text-gray-400">Opcional</span>
                  </div>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-rose-500" />
                    <Input
                      id="nprov_gps"
                      placeholder="https://maps.google.com/?q=..."
                      value={createFormData.url_ubicacion}
                      onChange={(e) =>
                        setCreateFormData({ ...createFormData, url_ubicacion: e.target.value })
                      }
                      className="h-10 pl-9 text-xs bg-white border-gray-200 focus:border-sky-400 rounded-lg font-mono text-[11px]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="nprov_plazo" className="text-xs font-semibold text-gray-700">
                    Plazo de Pago / Términos de Crédito
                  </Label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sky-500 pointer-events-none" />
                    <select
                      id="nprov_plazo"
                      value={createFormData.terminos_credito}
                      onChange={(e) =>
                        setCreateFormData({ ...createFormData, terminos_credito: e.target.value })
                      }
                      className="w-full h-10 pl-9 pr-3 rounded-lg border border-gray-200 bg-white text-xs text-gray-800 focus:border-sky-400 focus:outline-none"
                    >
                      <option value="Contado (Pago inmediato)">Contado (Pago inmediato)</option>
                      <option value="Crédito 15 días">Crédito 15 días</option>
                      <option value="Crédito 30 días">Crédito 30 días</option>
                      <option value="Crédito 45 días">Crédito 45 días</option>
                      <option value="Crédito 60 días">Crédito 60 días</option>
                      <option value="Anticipo 50% / Saldo contra entrega">
                        Anticipo 50% / Saldo contra entrega
                      </option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="nprov_logistica" className="text-xs font-semibold text-gray-700">
                    Observaciones Logísticas / Despacho
                  </Label>
                  <Input
                    id="nprov_logistica"
                    placeholder="Ej. Despacho semanal los martes, entregas en M..."
                    value={createFormData.observaciones_despacho}
                    onChange={(e) =>
                      setCreateFormData({
                        ...createFormData,
                        observaciones_despacho: e.target.value,
                      })
                    }
                    className="h-10 text-xs bg-white border-gray-200 focus:border-sky-400 rounded-lg"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Tag className="h-3.5 w-3.5 text-sky-500" />
                      <Label htmlFor="nprov_tags" className="text-xs font-semibold text-gray-700">
                        Etiquetas de Clasificación Secundarias
                      </Label>
                    </div>
                    <span className="text-[11px] text-gray-400">
                      Separadas por coma (ej. Tapas, HDPE, Inyección)
                    </span>
                  </div>
                  <Input
                    id="nprov_tags"
                    placeholder="Ej. Tapas, Canecas, Galoneras, Inyección, Polietileno..."
                    value={createFormData.etiquetas_secundarias}
                    onChange={(e) =>
                      setCreateFormData({
                        ...createFormData,
                        etiquetas_secundarias: e.target.value,
                      })
                    }
                    className="h-10 text-xs bg-white border-gray-200 focus:border-sky-400 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <DialogFooter className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCreateModalOpen(false)}
                disabled={createSubmitting}
                className="h-10 px-5 text-xs text-gray-700 border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createSubmitting}
                className="h-10 px-6 bg-sky-400 hover:bg-sky-500 text-white font-semibold text-xs rounded-lg shadow-xs"
              >
                {createSubmitting ? 'Registrando...' : 'Registrar Proveedor'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
