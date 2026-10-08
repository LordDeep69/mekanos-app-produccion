'use client';

/**
 * Portal Admin - Abastecimiento y Cadena de Suministro
 * Directorio de Proveedores (/compras/proveedores)
 * 
 * Gestión centralizada de fuentes de suministro comercial, datos fiscales y condiciones de entrega.
 * Diseño Enterprise Calibrado: Modal espacioso de 2 columnas (sm:max-w-4xl md:max-w-5xl) con Header y Footer fijos,
 * tabla balanceada sin scroll horizontal, condiciones comerciales horizontales elegantes y micro-portales activos.
 */

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Building2,
  CheckCircle2,
  Clock,
  CreditCard,
  ExternalLink,
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
  Tag,
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

const getTerminosCredito = (prov: ProveedorCompleto) => {
  const obs = prov.observaciones || '';
  const match = obs.match(/Plazo de pago:\s*([^|]+)/i);
  if (match) return match[1].trim();
  if (/cr[eé]dito\s*60/i.test(obs)) return 'Crédito 60 días';
  if (/cr[eé]dito\s*45/i.test(obs)) return 'Crédito 45 días';
  if (/cr[eé]dito\s*30/i.test(obs)) return 'Crédito 30 días';
  if (/cr[eé]dito\s*15/i.test(obs)) return 'Crédito 15 días';
  if (/cr[eé]dito/i.test(obs)) return 'Crédito';
  if (/contado/i.test(obs)) return 'Contado';
  return 'Contado (Pago inmediato)';
};

// Formateador compacto para la tabla (evita alturas excesivas en la fila)
const formatTerminoComercial = (prov: ProveedorCompleto) => {
  const termino = getTerminosCredito(prov);
  if (/cr[eé]dito\s*60/i.test(termino)) return 'Crédito 60d';
  if (/cr[eé]dito\s*45/i.test(termino)) return 'Crédito 45d';
  if (/cr[eé]dito\s*30/i.test(termino)) return 'Crédito 30d';
  if (/cr[eé]dito\s*15/i.test(termino)) return 'Crédito 15d';
  if (/cr[eé]dito/i.test(termino)) return 'Crédito';
  if (/contado/i.test(termino)) return 'Contado';
  if (/anticipo/i.test(termino)) return 'Anticipo 50%';
  return termino.length > 14 ? termino.slice(0, 14) : termino;
};

const extractWebUrl = (prov: ProveedorCompleto): string => {
  const obs = prov.observaciones || '';
  const match = obs.match(/Web:\s*([^|]+)/i);
  if (match) return match[1].trim();
  return (prov.persona as any)?.sitio_web || '';
};

const extractEmailFacturacion = (prov: ProveedorCompleto): string => {
  const obs = prov.observaciones || '';
  const match = obs.match(/Facturación:\s*([^|]+)/i);
  return match ? match[1].trim() : '';
};

const extractLogistica = (prov: ProveedorCompleto): string => {
  const obs = prov.observaciones || '';
  const match = obs.match(/Logística:\s*([^|]+)/i);
  return match ? match[1].trim() : '';
};

const extractRubros = (prov: ProveedorCompleto): string[] => {
  if (!prov.servicios_ofrecidos) return [];
  return prov.servicios_ofrecidos
    .split(',')
    .map((r) => r.trim())
    .filter(Boolean);
};

interface ProveedorFormData {
  razon_social: string;
  numero_identificacion: string;
  categoria_proveedor: string;
  tipo_proveedor: string;
  rubros: string[];
  sitio_web: string;
  persona_contacto: string;
  telefono_principal: string;
  email_principal: string;
  email_facturacion: string;
  direccion_principal: string;
  url_ubicacion: string;
  terminos_credito: string;
  tiempo_entrega_dias: number;
  responsable_iva: boolean;
  realiza_entregas: boolean;
  proveedor_activo: boolean;
  observaciones_despacho: string;
  etiquetas_secundarias: string;
}

const defaultFormData: ProveedorFormData = {
  razon_social: '',
  numero_identificacion: '',
  categoria_proveedor: 'REPUESTOS',
  tipo_proveedor: 'NACIONAL',
  rubros: [],
  sitio_web: '',
  persona_contacto: '',
  telefono_principal: '',
  email_principal: '',
  email_facturacion: '',
  direccion_principal: '',
  url_ubicacion: '',
  terminos_credito: 'Contado (Pago inmediato)',
  tiempo_entrega_dias: 1,
  responsable_iva: true,
  realiza_entregas: true,
  proveedor_activo: true,
  observaciones_despacho: '',
  etiquetas_secundarias: '',
};

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<ProveedorCompleto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('TODOS');

  // Modal Unificado (Crear / Editar)
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedProveedor, setSelectedProveedor] = useState<ProveedorCompleto | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [nuevoRubroInput, setNuevoRubroInput] = useState('');
  const [formData, setFormData] = useState<ProveedorFormData>(defaultFormData);

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

  // Alternar estado activo rápidamente con actualización optimista
  const alternarEstado = async (prov: ProveedorCompleto) => {
    const nuevoEstado = !prov.proveedor_activo;
    const nom =
      prov.persona?.razon_social ||
      prov.persona?.nombre_comercial ||
      `Proveedor #${prov.id_proveedor}`;

    // Actualización optimista local
    setProveedores((prev) =>
      prev.map((p) =>
        p.id_proveedor === prov.id_proveedor ? { ...p, proveedor_activo: nuevoEstado } : p
      )
    );

    try {
      await comprasService.updateProveedor(prov.id_proveedor, {
        proveedor_activo: nuevoEstado,
      });
      toast.success(`Proveedor "${nom}" marcado como ${nuevoEstado ? 'Activo' : 'Inactivo'}`);
    } catch (e: any) {
      console.error('Error al alternar estado de proveedor:', e);
      toast.error('No se pudo actualizar el estado del proveedor');
      cargarProveedores();
    }
  };

  // Apertura de Modales
  const abrirCrearModal = () => {
    setSelectedProveedor(null);
    setModalMode('create');
    setFormData(defaultFormData);
    setNuevoRubroInput('');
    setModalOpen(true);
  };

  const abrirEditarModal = (p: ProveedorCompleto) => {
    setSelectedProveedor(p);
    setModalMode('edit');
    setFormData({
      razon_social: p.persona?.razon_social || p.persona?.nombre_comercial || '',
      numero_identificacion: p.persona?.numero_identificacion || '',
      categoria_proveedor: p.categoria_proveedor || 'REPUESTOS',
      tipo_proveedor: p.tipo_proveedor || 'NACIONAL',
      rubros: extractRubros(p),
      sitio_web: extractWebUrl(p),
      persona_contacto: p.persona?.representante_legal || '',
      telefono_principal: p.persona?.telefono_principal || '',
      email_principal: p.persona?.email_principal || '',
      email_facturacion: extractEmailFacturacion(p),
      direccion_principal: p.persona?.direccion_principal || '',
      url_ubicacion: p.persona?.url_ubicacion || '',
      terminos_credito: getTerminosCredito(p),
      tiempo_entrega_dias: p.tiempo_entrega_dias ?? 1,
      responsable_iva: p.responsable_iva ?? true,
      realiza_entregas: p.realiza_entregas ?? true,
      proveedor_activo: p.proveedor_activo ?? true,
      observaciones_despacho: extractLogistica(p),
      etiquetas_secundarias: p.zona_cobertura || '',
    });
    setNuevoRubroInput('');
    setModalOpen(true);
  };

  // Gestión de Rubros
  const handleAgregarRubro = (rubro: string) => {
    const r = rubro.trim();
    if (!r) return;
    if (formData.rubros.includes(r)) {
      toast.info(`El rubro "${r}" ya está asignado`);
      return;
    }
    setFormData((prev) => ({
      ...prev,
      rubros: [...prev.rubros, r],
    }));
  };

  const handleRemoverRubro = (rubro: string) => {
    setFormData((prev) => ({
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

  // Envío Unificado (Crear / Editar)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.razon_social.trim()) {
      toast.error('La Razón Social o Nombre Comercial es obligatorio (*)');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        razon_social: formData.razon_social.trim(),
        nombre_comercial: formData.razon_social.trim(),
        numero_identificacion: formData.numero_identificacion.trim() || undefined,
        categoria_proveedor: formData.categoria_proveedor,
        tipo_proveedor: formData.tipo_proveedor,
        rubros: formData.rubros,
        persona_contacto: formData.persona_contacto.trim() || undefined,
        telefono_principal: formData.telefono_principal.trim() || undefined,
        email_principal: formData.email_principal.trim() || undefined,
        email_facturacion: formData.email_facturacion.trim() || undefined,
        direccion_principal: formData.direccion_principal.trim() || undefined,
        url_ubicacion: formData.url_ubicacion.trim() || undefined,
        sitio_web: formData.sitio_web.trim() || undefined,
        terminos_credito: formData.terminos_credito || undefined,
        tiempo_entrega_dias: formData.tiempo_entrega_dias,
        responsable_iva: formData.responsable_iva,
        realiza_entregas: formData.realiza_entregas,
        proveedor_activo: formData.proveedor_activo,
        observaciones_despacho: formData.observaciones_despacho.trim() || undefined,
        etiquetas_secundarias: formData.etiquetas_secundarias.trim() || undefined,
      };

      if (modalMode === 'create') {
        await comprasService.createProveedor(payload);
        toast.success('Proveedor comercial registrado exitosamente');
      } else {
        if (!selectedProveedor) return;
        await comprasService.updateProveedor(selectedProveedor.id_proveedor, payload);
        toast.success('Proveedor comercial actualizado exitosamente');
      }

      setModalOpen(false);
      cargarProveedores(true);
    } catch (e: any) {
      console.error('Error al guardar proveedor:', e);
      const msg = e?.response?.data?.message || 'No se pudo guardar la información del proveedor';
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
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

          <Button
            size="sm"
            onClick={abrirCrearModal}
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
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer ${
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

      {/* TABLA DE PROVEEDORES: CALIBRADA SIN SCROLL HORIZONTAL */}
      <Card className="border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="w-full">
          <table className="w-full text-left text-sm text-gray-600 table-auto">
            <thead className="bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3.5">Proveedor / Razón Social</th>
                <th className="px-3.5 py-3.5">Identificación / NIT</th>
                <th className="px-3.5 py-3.5">Categoría & Tipo</th>
                <th className="px-3 py-3.5 text-center">Artículos</th>
                <th className="px-3.5 py-3.5">Contacto & Portales</th>
                <th className="px-3.5 py-3.5">Condiciones Comerciales</th>
                <th className="px-3 py-3.5 text-center">Estado</th>
                <th className="px-3.5 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-sm text-gray-400">
                    <RefreshCw className="mx-auto h-6 w-6 animate-spin text-blue-500 mb-2" />
                    Cargando directorio de proveedores...
                  </td>
                </tr>
              ) : proveedoresFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <Truck className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                    <p className="text-sm font-semibold text-gray-700">No se encontraron proveedores</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {search ? 'Intenta con otro término de búsqueda' : 'No hay proveedores registrados en el directorio.'}
                    </p>
                    <div className="mt-4">
                      <Button
                        size="sm"
                        onClick={abrirCrearModal}
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
                  const webUrl = extractWebUrl(prov);
                  const ubicacionUrl = prov.persona?.url_ubicacion;
                  const articulosCount =
                    (prov._count?.catalogo_componentes ?? 0) +
                    (prov._count?.articulos_proveedores ?? 0);

                  return (
                    <tr key={prov.id_proveedor} className="hover:bg-slate-50/80 transition-colors">
                      {/* Razón Social con Avatar Determinista */}
                      <td className="px-4 py-3.5 min-w-[240px]">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-9 h-9 rounded-xl bg-gradient-to-br ${getAvatarGradient(
                              nombre,
                            )} text-white flex items-center justify-center font-bold text-xs shadow-2xs shrink-0 tracking-wider`}
                          >
                            {getInitials(nombre)}
                          </div>
                          <div className="min-w-0 max-w-[230px] xl:max-w-[310px]" title={nombre}>
                            <p className="font-bold text-gray-900 text-sm truncate" title={nombre}>
                              {nombre}
                            </p>
                            {prov.persona?.nombre_comercial && prov.persona.razon_social && prov.persona.nombre_comercial !== prov.persona.razon_social ? (
                              <span className="text-[11px] text-gray-400 block truncate" title={prov.persona.nombre_comercial}>
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
                      <td className="px-3.5 py-3.5 font-mono text-xs text-gray-700 whitespace-nowrap">
                        {nit}
                      </td>

                      {/* Categoría y Tipo */}
                      <td className="px-3.5 py-3.5 space-y-0.5 whitespace-nowrap">
                        <Badge variant="outline" className="text-[10px] font-semibold text-blue-700 border-blue-200 bg-blue-50/50">
                          {prov.categoria_proveedor}
                        </Badge>
                        <span className="block text-[11px] text-gray-400">
                          {prov.tipo_proveedor}
                        </span>
                      </td>

                      {/* Artículos Suministrados: 0 repuestos (texto neutro legible) vs >0 repuestos (badge interactivo) */}
                      <td className="px-3 py-3.5 text-center whitespace-nowrap">
                        {articulosCount > 0 ? (
                          <Link
                            href={`/compras/catalogo?id_proveedor=${prov.id_proveedor}`}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 hover:text-blue-900 transition-colors shadow-2xs"
                            title={`Ver ${articulosCount} repuesto(s) suministrado(s) en Catálogo`}
                          >
                            <Package className="h-3 w-3 text-blue-600" />
                            <span>
                              {articulosCount} {articulosCount === 1 ? 'repuesto' : 'repuestos'}
                            </span>
                          </Link>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium select-none">
                            0 repuestos
                          </span>
                        )}
                      </td>

                      {/* Contacto & Portales: Tel, Email y micro-iconos interactivos Globe / MapPin */}
                      <td className="px-3.5 py-3.5 text-xs space-y-1">
                        {tel && (
                          <a
                            href={`tel:${tel}`}
                            className="flex items-center gap-1.5 text-gray-700 hover:text-blue-600 transition-colors whitespace-nowrap"
                          >
                            <Phone className="h-3 w-3 text-gray-400 shrink-0" />
                            <span>{tel}</span>
                          </a>
                        )}
                        {email && (
                          <a
                            href={`mailto:${email}`}
                            className="flex items-center gap-1.5 text-gray-500 hover:text-blue-600 transition-colors max-w-[220px] xl:max-w-[270px]"
                            title={email}
                          >
                            <Mail className="h-3 w-3 text-gray-400 shrink-0" />
                            <span className="truncate">{email}</span>
                          </a>
                        )}
                        {(webUrl || ubicacionUrl) && (
                          <div className="flex items-center gap-2 pt-0.5">
                            {webUrl && (
                              <a
                                href={webUrl.startsWith('http') ? webUrl : `https://${webUrl}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 transition-colors shadow-2xs"
                                title={`Abrir portal web / catálogo: ${webUrl}`}
                              >
                                <Globe className="h-3 w-3 text-sky-600 shrink-0" />
                                <span>Web</span>
                                <ExternalLink className="h-2 w-2 opacity-70 shrink-0" />
                              </a>
                            )}
                            {ubicacionUrl && (
                              <a
                                href={ubicacionUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors shadow-2xs"
                                title="Abrir ubicación en Google Maps / Waze"
                              >
                                <MapPin className="h-3 w-3 text-emerald-600 shrink-0" />
                                <span>GPS</span>
                                <ExternalLink className="h-2.5 w-2.5 opacity-70 shrink-0" />
                              </a>
                            )}
                          </div>
                        )}
                        {!tel && !email && !webUrl && !ubicacionUrl && (
                          <span className="text-gray-400 text-xs italic">Sin datos</span>
                        )}
                      </td>

                      {/* Condiciones Comerciales: Composición horizontal limpia */}
                      <td className="px-3.5 py-3.5 space-y-1">
                        <div>
                          {(() => {
                            const terminoCompleto = getTerminosCredito(prov);
                            const terminoCorto = formatTerminoComercial(prov);
                            const isCredito = /cr[eé]dito/i.test(terminoCompleto);
                            return (
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${
                                  isCredito
                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                }`}
                                title={terminoCompleto}
                              >
                                <CreditCard className="h-2.5 w-2.5 shrink-0" />
                                <span>{terminoCorto}</span>
                              </span>
                            );
                          })()}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-500 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3 text-gray-400" />
                            <span>{prov.tiempo_entrega_dias || 1}d</span>
                          </span>
                          {prov.realiza_entregas && (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                              <span>•</span>
                              <Truck className="h-3 w-3 text-emerald-600" />
                              <span>Sede propia</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Estado con Toggle Rápido Optimista */}
                      <td className="px-3 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => alternarEstado(prov)}
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold transition-all shadow-2xs cursor-pointer ${
                            prov.proveedor_activo
                              ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200 border border-gray-200'
                          }`}
                          title={`Proveedor ${prov.proveedor_activo ? 'Activo' : 'Inactivo'}. Clic para alternar estado`}
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
                      <td className="px-3 py-3.5 text-right whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => abrirEditarModal(prov)}
                          className="h-8 px-2 text-xs text-gray-600 hover:text-blue-700 hover:bg-blue-50 font-medium"
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1 text-gray-400 group-hover:text-blue-600" />
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

      {/* MODAL ENTERPRISE EXPANDIDO: 2 COLUMNAS (sm:max-w-4xl md:max-w-5xl) CON HEADER Y FOOTER FIJOS */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-4xl md:max-w-5xl w-full max-h-[92vh] flex flex-col p-0 rounded-2xl border border-gray-100 shadow-2xl overflow-hidden">
          {/* Header Fijo */}
          <div className="flex items-start justify-between p-6 pb-4 border-b border-gray-100 bg-gray-50/60 shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100 shadow-2xs">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-gray-900 tracking-tight">
                  {modalMode === 'create' ? 'Nuevo Proveedor Comercial' : 'Editar Proveedor Comercial'}
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-500 mt-0.5">
                  {modalMode === 'create'
                    ? 'Registra un aliado de suministro para compras de insumos, repuestos y materias primas.'
                    : `Modificación integral de datos fiscales, comerciales y operativos de ${
                        selectedProveedor?.persona?.razon_social || selectedProveedor?.persona?.nombre_comercial || 'Proveedor'
                      }.`}
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Formulario con Body Scrolleable y Footer Fijo */}
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="p-6 md:p-8 space-y-6 overflow-y-auto flex-1 max-h-[calc(92vh-145px)] pr-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                
                {/* COLUMNA 1: IDENTIDAD JURÍDICA Y RUBROS */}
                <div className="space-y-4">
                  <div className="border-b border-slate-200 pb-2">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-blue-600" />
                      Identidad Jurídica y Rubros
                    </h3>
                  </div>

                  {/* Razón Social */}
                  <div className="space-y-1.5">
                    <Label htmlFor="prov_razon" className="text-xs font-semibold text-gray-700">
                      Razón Social o Nombre Comercial <span className="text-blue-600 font-bold">*</span>
                    </Label>
                    <Input
                      id="prov_razon"
                      required
                      placeholder="Ej. Químicos Industriales del Caribe S.A.S."
                      value={formData.razon_social}
                      onChange={(e) => setFormData({ ...formData, razon_social: e.target.value })}
                      className="h-10 text-sm bg-white border-gray-200 rounded-lg px-3"
                    />
                  </div>

                  {/* NIT y Tipo */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <Label htmlFor="prov_nit" className="text-xs font-semibold text-gray-700">
                        NIT / Identificación
                      </Label>
                      <Input
                        id="prov_nit"
                        placeholder="Ej. 900.123.456-7"
                        value={formData.numero_identificacion}
                        onChange={(e) => setFormData({ ...formData, numero_identificacion: e.target.value })}
                        className="h-10 text-sm bg-white border-gray-200 rounded-lg font-mono px-3"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="prov_tipo" className="text-xs font-semibold text-gray-700">
                        Tipo Proveedor
                      </Label>
                      <select
                        id="prov_tipo"
                        value={formData.tipo_proveedor}
                        onChange={(e) => setFormData({ ...formData, tipo_proveedor: e.target.value })}
                        className="w-full h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 focus:border-blue-500 focus:outline-none"
                      >
                        <option value="NACIONAL">NACIONAL</option>
                        <option value="INTERNACIONAL">INTERNACIONAL</option>
                      </select>
                    </div>
                  </div>

                  {/* Categoría y Sitio Web */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <Label htmlFor="prov_cat" className="text-xs font-semibold text-gray-700">
                        Categoría Principal
                      </Label>
                      <select
                        id="prov_cat"
                        value={formData.categoria_proveedor}
                        onChange={(e) => setFormData({ ...formData, categoria_proveedor: e.target.value })}
                        className="w-full h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 focus:border-blue-500 focus:outline-none"
                      >
                        <option value="REPUESTOS">REPUESTOS</option>
                        <option value="SERVICIOS">SERVICIOS</option>
                        <option value="SUMINISTROS">SUMINISTROS</option>
                        <option value="EQUIPOS">EQUIPOS</option>
                        <option value="MIXTO">MIXTO</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="prov_web" className="text-xs font-semibold text-gray-700">
                        Sitio Web / Catálogo Digital
                      </Label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-blue-500" />
                        <Input
                          id="prov_web"
                          placeholder="https://proveedor.com"
                          value={formData.sitio_web}
                          onChange={(e) => setFormData({ ...formData, sitio_web: e.target.value })}
                          className="h-10 pl-9 pr-3 text-sm bg-white border-gray-200 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>

                  {/* SECCIÓN RUBROS / CATEGORÍAS */}
                  <div className="rounded-xl border border-gray-200 bg-gray-50/40 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Layers className="h-4 w-4 text-blue-600" />
                        <span className="text-xs font-bold text-gray-800">
                          Rubros y Especialidades
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                        {formData.rubros.length} asignados
                      </span>
                    </div>

                    {/* Contenedor compacto de chips */}
                    <div className="min-h-[42px] max-h-28 overflow-y-auto rounded-lg border border-gray-200 bg-white p-2 flex flex-wrap items-center gap-1.5">
                      {formData.rubros.length === 0 ? (
                        <span className="text-xs text-gray-400 italic">
                          Sin rubros asignados. Agrega del catálogo institucional o escribe uno nuevo.
                        </span>
                      ) : (
                        formData.rubros.map((rubro) => (
                          <span
                            key={rubro}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200/80 shadow-2xs"
                          >
                            <span>{rubro}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoverRubro(rubro)}
                              className="text-blue-400 hover:text-blue-700 rounded-full p-0.5 hover:bg-blue-100 transition-colors"
                              title={`Eliminar ${rubro}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))
                      )}
                    </div>

                    {/* Selector del Catálogo */}
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAgregarRubro(e.target.value);
                          e.target.value = '';
                        }
                      }}
                      className="w-full h-10 rounded-lg border border-gray-200 bg-white px-3 text-xs text-gray-700 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="" disabled>
                        + Seleccionar rubro del catálogo institucional...
                      </option>
                      {RUBROS_CATALOGO_INSTITUCIONAL.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>

                    {/* Rubro personalizado */}
                    <div className="flex gap-2">
                      <Input
                        placeholder="Crear rubro personalizado..."
                        value={nuevoRubroInput}
                        onChange={(e) => setNuevoRubroInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleCrearRubroPersonalizado();
                          }
                        }}
                        className="h-10 text-xs bg-white border-gray-200 rounded-lg flex-1 px-3"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleCrearRubroPersonalizado()}
                        className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg shrink-0"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Añadir
                      </Button>
                    </div>
                  </div>

                  {/* Clasificación Secundaria / Tags */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="prov_tags" className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                        <Tag className="h-3 w-3 text-gray-500" />
                        Etiquetas de Clasificación Secundarias
                      </Label>
                      <span className="text-[10px] text-gray-400">Separadas por coma</span>
                    </div>
                    <Input
                      id="prov_tags"
                      placeholder="Ej. HDPE, Conexiones, Soldaduras, Diésel..."
                      value={formData.etiquetas_secundarias}
                      onChange={(e) => setFormData({ ...formData, etiquetas_secundarias: e.target.value })}
                      className="h-10 text-xs bg-white border-gray-200 rounded-lg px-3"
                    />
                  </div>
                </div>

                {/* COLUMNA 2: CONTACTO, LOGÍSTICA & CONDICIONES */}
                <div className="space-y-4">
                  <div className="border-b border-slate-200 pb-2">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Truck className="h-3.5 w-3.5 text-blue-600" />
                      Contacto, Logística y Finanzas
                    </h3>
                  </div>

                  {/* Asesor y Teléfono */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <Label htmlFor="prov_contacto" className="text-xs font-semibold text-gray-700">
                        Asesor Comercial / Contacto
                      </Label>
                      <Input
                        id="prov_contacto"
                        placeholder="Ej. Carlos Mendoza"
                        value={formData.persona_contacto}
                        onChange={(e) => setFormData({ ...formData, persona_contacto: e.target.value })}
                        className="h-10 text-sm bg-white border-gray-200 rounded-lg px-3"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="prov_tel" className="text-xs font-semibold text-gray-700">
                        Teléfono / WhatsApp Compras
                      </Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                        <Input
                          id="prov_tel"
                          placeholder="Ej. +57 300 123 4567"
                          value={formData.telefono_principal}
                          onChange={(e) => setFormData({ ...formData, telefono_principal: e.target.value })}
                          className="h-10 pl-9 pr-3 text-sm bg-white border-gray-200 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Correos */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <Label htmlFor="prov_email" className="text-xs font-semibold text-gray-700">
                        Correo Pedidos / Compras
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                        <Input
                          id="prov_email"
                          type="email"
                          placeholder="Ej. pedidos@proveedor.com"
                          value={formData.email_principal}
                          onChange={(e) => setFormData({ ...formData, email_principal: e.target.value })}
                          className="h-10 pl-9 pr-3 text-sm bg-white border-gray-200 rounded-lg"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="prov_email_fact" className="text-xs font-semibold text-gray-700">
                        Correo Facturación Electrónica
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                        <Input
                          id="prov_email_fact"
                          type="email"
                          placeholder="Ej. facturas@proveedor.com"
                          value={formData.email_facturacion}
                          onChange={(e) => setFormData({ ...formData, email_facturacion: e.target.value })}
                          className="h-10 pl-9 pr-3 text-sm bg-white border-gray-200 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Dirección Física */}
                  <div className="space-y-1.5">
                    <Label htmlFor="prov_dir" className="text-xs font-semibold text-gray-700">
                      Dirección Física / Bodega Despacho
                    </Label>
                    <Input
                      id="prov_dir"
                      placeholder="Ej. Zona Industrial Mamonal Km 3, Cartagena"
                      value={formData.direccion_principal}
                      onChange={(e) => setFormData({ ...formData, direccion_principal: e.target.value })}
                      className="h-10 text-sm bg-white border-gray-200 rounded-lg px-3"
                    />
                  </div>

                  {/* GPS */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="prov_gps" className="text-xs font-semibold text-gray-700">
                        Enlace Ubicación GPS (Google Maps / Waze)
                      </Label>
                      <span className="text-[10px] text-gray-400">Opcional</span>
                    </div>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-emerald-500" />
                      <Input
                        id="prov_gps"
                        placeholder="https://maps.google.com/?q=..."
                        value={formData.url_ubicacion}
                        onChange={(e) => setFormData({ ...formData, url_ubicacion: e.target.value })}
                        className="h-10 pl-9 pr-3 text-xs bg-white border-gray-200 rounded-lg font-mono text-[11px]"
                      />
                    </div>
                  </div>

                  {/* Plazo de Pago y Tiempo de Entrega con distribución 7/5 */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                    <div className="space-y-1.5 sm:col-span-7">
                      <Label htmlFor="prov_plazo" className="text-xs font-semibold text-gray-700">
                        Plazo de Pago / Crédito
                      </Label>
                      <div className="relative">
                        <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                        <select
                          id="prov_plazo"
                          value={formData.terminos_credito}
                          onChange={(e) => setFormData({ ...formData, terminos_credito: e.target.value })}
                          className="w-full h-10 pl-9 pr-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-800 focus:border-blue-500 focus:outline-none"
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

                    <div className="space-y-1.5 sm:col-span-5">
                      <Label htmlFor="prov_dias" className="text-xs font-semibold text-gray-700">
                        Tiempo de Entrega (Días)
                      </Label>
                      <Input
                        id="prov_dias"
                        type="number"
                        min="0"
                        value={formData.tiempo_entrega_dias}
                        onChange={(e) => setFormData({ ...formData, tiempo_entrega_dias: Number(e.target.value) })}
                        className="h-10 text-sm bg-white border-gray-200 rounded-lg px-3"
                      />
                    </div>
                  </div>

                  {/* Switches Comerciales y Logísticos */}
                  <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="prov_iva" className="text-xs font-bold text-gray-800 cursor-pointer">
                          Responsable de IVA
                        </Label>
                        <p className="text-[10px] text-gray-500">Aplica impuestos en órdenes de compra.</p>
                      </div>
                      <Switch
                        id="prov_iva"
                        checked={formData.responsable_iva}
                        onCheckedChange={(c) => setFormData({ ...formData, responsable_iva: c })}
                      />
                    </div>

                    <div className="flex items-center justify-between border-t border-gray-200/60 pt-2.5">
                      <div>
                        <Label htmlFor="prov_entregas" className="text-xs font-bold text-gray-800 cursor-pointer">
                          Entrega a Domicilio / Sede Propia
                        </Label>
                        <p className="text-[10px] text-gray-500">Entrega directa en taller o sede propia de la empresa.</p>
                      </div>
                      <Switch
                        id="prov_entregas"
                        checked={formData.realiza_entregas}
                        onCheckedChange={(c) => setFormData({ ...formData, realiza_entregas: c })}
                      />
                    </div>

                    <div className="flex items-center justify-between border-t border-gray-200/60 pt-2.5">
                      <div>
                        <Label htmlFor="prov_activo" className="text-xs font-bold text-gray-800 cursor-pointer">
                          Proveedor Activo
                        </Label>
                        <p className="text-[10px] text-gray-500">Habilitado para abastecimiento y requisiciones.</p>
                      </div>
                      <Switch
                        id="prov_activo"
                        checked={formData.proveedor_activo}
                        onCheckedChange={(c) => setFormData({ ...formData, proveedor_activo: c })}
                      />
                    </div>
                  </div>

                  {/* Observaciones Logísticas */}
                  <div className="space-y-1.5">
                    <Label htmlFor="prov_obs" className="text-xs font-semibold text-gray-700">
                      Observaciones Logísticas / Despacho
                    </Label>
                    <Input
                      id="prov_obs"
                      placeholder="Ej. Despacho semanal los martes, entregas en bodega..."
                      value={formData.observaciones_despacho}
                      onChange={(e) => setFormData({ ...formData, observaciones_despacho: e.target.value })}
                      className="h-10 text-sm bg-white border-gray-200 rounded-lg px-3"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Fijo en la Base */}
            <div className="p-4 px-6 md:px-8 border-t border-gray-100 bg-gray-50/70 flex items-center justify-end gap-3 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalOpen(false)}
                disabled={submitting}
                className="h-10 px-5 text-xs text-gray-700 border-gray-200 rounded-lg hover:bg-gray-100"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-xs"
              >
                {submitting ? 'Guardando...' : modalMode === 'create' ? 'Registrar Proveedor' : 'Guardar Cambios'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
