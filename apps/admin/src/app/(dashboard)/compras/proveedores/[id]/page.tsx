'use client';

/**
 * MEKANOS S.A.S - Portal Admin
 * Ficha 360° del Proveedor Comercial (/compras/proveedores/[id])
 * 
 * Interfaz Enterprise para la Gestión Integral de Fuentes de Suministro:
 * 1. Cabecera Institucional con Datos Fiscales, Contacto Rápido y Acciones
 * 2. 4 KPI Cards de Gestión (Repuestos, Órdenes, Monto Comprado, Calidad)
 * 3. Pestañas Operativas Sincronizadas con URL (?tab=...):
 *    - Pestaña 1: Catálogo de Repuestos Homologados (Matriz de Sourcing)
 *    - Pestaña 2: Historial de Órdenes de Compra
 *    - Pestaña 3: Información Fiscal, Contacto y Logística
 */

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  ExternalLink,
  Eye,
  FileText,
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
  Sparkles,
  Star,
  Tag,
  Trash2,
  Truck,
  User,
  X,
  AlertTriangle,
  ShoppingBag,
} from 'lucide-react';

import { comprasService } from '@/lib/api/compras.service';
import {
  ArticuloHomologadoProveedor,
  ArticuloMaestro,
  HomologarArticuloPayload,
  ProveedorCompleto,
  ProveedorKPIs,
} from '@/types/compras.types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
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

const formatMonedaCOP = (monto: number | string | null | undefined): string => {
  const num = Number(monto) || 0;
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(num);
};

const extractWebUrl = (prov?: ProveedorCompleto | null): string => {
  if (!prov) return '';
  const obs = prov.observaciones || '';
  const match = obs.match(/Web:\s*([^|]+)/i);
  if (match) return match[1].trim();
  return (prov.persona as any)?.sitio_web || '';
};

const extractLogistica = (prov?: ProveedorCompleto | null): string => {
  if (!prov) return '';
  const obs = prov.observaciones || '';
  const match = obs.match(/Logística:\s*([^|]+)/i);
  return match ? match[1].trim() : '';
};

const extractEmailFacturacion = (prov?: ProveedorCompleto | null): string => {
  if (!prov) return '';
  const obs = prov.observaciones || '';
  const match = obs.match(/Facturación:\s*([^|]+)/i);
  return match ? match[1].trim() : '';
};

const extractRubros = (prov?: ProveedorCompleto | null): string[] => {
  if (!prov || !prov.servicios_ofrecidos) return [];
  return prov.servicios_ofrecidos
    .split(',')
    .map((r) => r.trim())
    .filter(Boolean);
};

const getTerminosCredito = (prov?: ProveedorCompleto | null) => {
  if (!prov) return 'Contado (Pago inmediato)';
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

export default function FichaProveedor360Page() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const idProveedor = Number(params?.id);

  // Sincronización de pestaña activa mediante URL (?tab=catalogo | ordenes | fiscal)
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<string>(
    tabParam === 'ordenes' || tabParam === 'fiscal' || tabParam === 'catalogo' ? tabParam : 'catalogo'
  );

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t && (t === 'ordenes' || t === 'fiscal' || t === 'catalogo')) {
      setActiveTab(t);
    }
  }, [searchParams]);

  // Datos del proveedor y KPIs
  const [proveedor, setProveedor] = useState<ProveedorCompleto | null>(null);
  const [kpis, setKpis] = useState<ProveedorKPIs>({
    total_articulos_homologados: 0,
    total_ordenes_compra: 0,
    monto_total_comprado: 0,
    cumplimiento_calidad: 98.5,
  });
  const [articulosHomologados, setArticulosHomologados] = useState<ArticuloHomologadoProveedor[]>([]);
  const [ordenesCompra, setOrdenesCompra] = useState<any[]>([]);

  // Estados de carga
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Búsqueda en pestaña catálogo
  const [busquedaArticulo, setBusquedaArticulo] = useState('');

  // Modales
  const [modalHomologarOpen, setModalHomologarOpen] = useState(false);
  const [modalEditarHomologacionOpen, setModalEditarHomologacionOpen] = useState(false);
  const [articuloSeleccionadoEdit, setArticuloSeleccionadoEdit] = useState<ArticuloHomologadoProveedor | null>(null);
  const [dialogDesvincularOpen, setDialogDesvincularOpen] = useState(false);
  const [articuloADesvincular, setArticuloADesvincular] = useState<ArticuloHomologadoProveedor | null>(null);
  const [isSubmittingHomologacion, setIsSubmittingHomologacion] = useState(false);

  // Selector de componentes para el modal de homologación
  const [catalogoMaestro, setCatalogoMaestro] = useState<ArticuloMaestro[]>([]);
  const [cargandoCatalogoMaestro, setCargandoCatalogoMaestro] = useState(false);
  const [busquedaComponenteModal, setBusquedaComponenteModal] = useState('');
  const [menuComponentesAbierto, setMenuComponentesAbierto] = useState(false);
  const [componenteSeleccionado, setComponenteSeleccionado] = useState<ArticuloMaestro | null>(null);

  // Formulario de Homologación
  const [formHomologar, setFormHomologar] = useState<HomologarArticuloPayload>({
    id_componente: 0,
    referencia_proveedor: '',
    costo_actual: 0,
    tiempo_entrega_dias: 1,
    es_proveedor_preferido: false,
    marca_ofrecida: '',
    notas: '',
  });

  // Formulario de Edición de Homologación
  const [formEditHomologacion, setFormEditHomologacion] = useState({
    referencia_proveedor: '',
    nuevo_costo: 0,
    tiempo_entrega_dias: 1,
    es_proveedor_preferido: false,
    observaciones: '',
  });

  // Modal Editar Proveedor Datos Generales (2 Columnas Enterprise)
  const [modalEditarProveedorOpen, setModalEditarProveedorOpen] = useState(false);
  const [isSubmittingEditProveedor, setIsSubmittingEditProveedor] = useState(false);
  const [nuevoRubroEditInput, setNuevoRubroEditInput] = useState('');
  const [editProveedorData, setEditProveedorData] = useState({
    razon_social: '',
    numero_identificacion: '',
    categoria_proveedor: 'REPUESTOS',
    tipo_proveedor: 'NACIONAL',
    rubros: [] as string[],
    etiquetas_secundarias: '',
    telefono_principal: '',
    email_principal: '',
    email_facturacion: '',
    persona_contacto: '',
    direccion_principal: '',
    url_ubicacion: '',
    sitio_web: '',
    terminos_credito: 'Contado (Pago inmediato)',
    tiempo_entrega_dias: 1,
    responsable_iva: true,
    realiza_entregas: true,
    proveedor_activo: true,
    observaciones_despacho: '',
  });

  // Cargar datos consolidados
  const cargarDatos = async (showToast = false) => {
    if (!idProveedor || isNaN(idProveedor)) return;
    try {
      if (showToast) setRefreshing(true);
      const [fichaRes, articulosRes, ordenesRes] = await Promise.all([
        comprasService.getProveedorFicha360(idProveedor),
        comprasService.getArticulosProveedor(idProveedor),
        comprasService.getOrdenesProveedor(idProveedor),
      ]);

      setProveedor(fichaRes.proveedor);
      setKpis(fichaRes.kpis);
      setArticulosHomologados(articulosRes || []);
      setOrdenesCompra(ordenesRes || []);

      if (showToast) toast.success('Ficha 360° actualizada');
    } catch (e) {
      console.error('Error al cargar datos del proveedor:', e);
      toast.error('No se pudo cargar la información de la Ficha 360°');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [idProveedor]);

  // Cargar artículos del catálogo maestro para el selector de homologación
  const cargarCatalogoMaestro = async (force = false) => {
    if (!force && catalogoMaestro.length > 0) return;
    try {
      setCargandoCatalogoMaestro(true);
      const res = await comprasService.getArticulos({ limit: 300, activo: true });
      const items = (res as any)?.items || (res as any)?.data || (Array.isArray(res) ? res : []);
      setCatalogoMaestro(items);
    } catch (e) {
      console.error('Error al cargar catálogo maestro:', e);
      toast.error('No se pudo cargar el catálogo maestro de repuestos');
    } finally {
      setCargandoCatalogoMaestro(false);
    }
  };

  // Filtrado de artículos del modal
  const componentesFiltradosModal = useMemo(() => {
    if (!busquedaComponenteModal.trim()) return catalogoMaestro;
    const q = busquedaComponenteModal.toLowerCase().trim();
    return catalogoMaestro.filter((c) => {
      const desc = (c.descripcion_corta || '').toLowerCase();
      const cod = (c.codigo_interno || '').toLowerCase();
      const ref = (c.referencia_fabricante || '').toLowerCase();
      const marca = (c.marca || '').toLowerCase();
      return desc.includes(q) || cod.includes(q) || ref.includes(q) || marca.includes(q);
    });
  }, [catalogoMaestro, busquedaComponenteModal]);

  // Artículos homologados filtrados por búsqueda
  const articulosFiltrados = useMemo(() => {
    if (!busquedaArticulo.trim()) return articulosHomologados;
    const q = busquedaArticulo.toLowerCase().trim();
    return articulosHomologados.filter((a) => {
      const refProv = (a.referencia_proveedor || '').toLowerCase();
      const codMek = (a.catalogo_componentes?.codigo_interno || '').toLowerCase();
      const desc = (a.catalogo_componentes?.descripcion_corta || '').toLowerCase();
      const refFab = (a.catalogo_componentes?.referencia_fabricante || '').toLowerCase();
      return refProv.includes(q) || codMek.includes(q) || desc.includes(q) || refFab.includes(q);
    });
  }, [articulosHomologados, busquedaArticulo]);

  // Navegación de pestañas con cambio de URL
  const handleTabChange = (val: string) => {
    setActiveTab(val);
    router.replace(`/compras/proveedores/${idProveedor}?tab=${val}`, { scroll: false });
  };

  // Abrir modal homologar
  const abrirModalHomologar = () => {
    cargarCatalogoMaestro(true);
    setComponenteSeleccionado(null);
    setBusquedaComponenteModal('');
    setMenuComponentesAbierto(false);
    setFormHomologar({
      id_componente: 0,
      referencia_proveedor: '',
      costo_actual: 0,
      tiempo_entrega_dias: proveedor?.tiempo_entrega_dias || 1,
      es_proveedor_preferido: false,
      marca_ofrecida: '',
      notas: '',
    });
    setModalHomologarOpen(true);
  };

  // Seleccionar componente en modal
  const handleSeleccionarComponente = (c: ArticuloMaestro) => {
    setComponenteSeleccionado(c);
    setFormHomologar((prev) => ({
      ...prev,
      id_componente: c.id_componente,
      referencia_proveedor: prev.referencia_proveedor || c.referencia_fabricante || '',
      costo_actual: prev.costo_actual > 0 ? prev.costo_actual : Number(c.precio_compra) || 0,
      marca_ofrecida: c.marca || '',
    }));
    setMenuComponentesAbierto(false);
  };

  // Guardar homologación
  const handleGuardarHomologacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formHomologar.id_componente) {
      toast.error('Debes seleccionar un artículo del catálogo maestro.');
      return;
    }
    if (!formHomologar.referencia_proveedor.trim()) {
      toast.error('Ingresa la referencia o código con el que factura el proveedor.');
      return;
    }
    if (formHomologar.costo_actual <= 0) {
      toast.error('El costo pactado debe ser mayor a 0 COP.');
      return;
    }

    try {
      setIsSubmittingHomologacion(true);
      await comprasService.homologarArticuloProveedor(idProveedor, formHomologar);
      toast.success('Artículo homologado y vinculado a la matriz de abastecimiento.');
      setModalHomologarOpen(false);
      cargarDatos();
    } catch (e: any) {
      console.error('Error al homologar artículo:', e);
      const msg = e?.response?.data?.message || 'Error al homologar el artículo.';
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setIsSubmittingHomologacion(false);
    }
  };

  // Abrir modal editar homologación
  const abrirEditarHomologacion = (art: ArticuloHomologadoProveedor) => {
    setArticuloSeleccionadoEdit(art);
    setFormEditHomologacion({
      referencia_proveedor: art.referencia_proveedor || '',
      nuevo_costo: Number(art.costo_actual) || 0,
      tiempo_entrega_dias: art.tiempo_entrega_dias || 1,
      es_proveedor_preferido: Boolean(art.es_proveedor_preferido),
      observaciones: '',
    });
    setModalEditarHomologacionOpen(true);
  };

  // Guardar edición de homologación
  const handleGuardarEdicionHomologacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!articuloSeleccionadoEdit) return;

    try {
      setIsSubmittingHomologacion(true);
      await comprasService.actualizarArticuloProveedor(
        idProveedor,
        articuloSeleccionadoEdit.id_componente,
        formEditHomologacion,
      );
      toast.success('Condiciones comerciales actualizadas exitosamente.');
      setModalEditarHomologacionOpen(false);
      cargarDatos();
    } catch (e: any) {
      console.error('Error al actualizar artículo:', e);
      const msg = e?.response?.data?.message || 'Error al actualizar condiciones.';
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setIsSubmittingHomologacion(false);
    }
  };

  // Confirmar desvinculación
  const abrirDesvincular = (art: ArticuloHomologadoProveedor) => {
    setArticuloADesvincular(art);
    setDialogDesvincularOpen(true);
  };

  const handleEjecutarDesvinculacion = async () => {
    if (!articuloADesvincular) return;
    try {
      await comprasService.desvincularArticuloProveedor(
        idProveedor,
        articuloADesvincular.id_componente,
      );
      toast.success('Artículo desvinculado de la matriz de sourcing.');
      setDialogDesvincularOpen(false);
      cargarDatos();
    } catch (e) {
      console.error('Error al desvincular artículo:', e);
      toast.error('No se pudo desvincular el artículo.');
    }
  };

  // Gestión de Rubros en Edición de Proveedor
  const handleAgregarRubroEdit = (rubro: string) => {
    const r = rubro.trim();
    if (!r) return;
    if (editProveedorData.rubros.includes(r)) {
      toast.info(`El rubro "${r}" ya está asignado`);
      return;
    }
    setEditProveedorData((prev) => ({
      ...prev,
      rubros: [...prev.rubros, r],
    }));
  };

  const handleRemoverRubroEdit = (rubro: string) => {
    setEditProveedorData((prev) => ({
      ...prev,
      rubros: prev.rubros.filter((item) => item !== rubro),
    }));
  };

  const handleCrearRubroPersonalizadoEdit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const r = nuevoRubroEditInput.trim();
    if (!r) return;
    handleAgregarRubroEdit(r);
    setNuevoRubroEditInput('');
  };

  // Abrir modal editar proveedor datos generales
  const abrirEditarProveedor = () => {
    if (!proveedor) return;
    const persona = proveedor.persona;
    setEditProveedorData({
      razon_social: persona?.razon_social || persona?.nombre_comercial || '',
      numero_identificacion: persona?.numero_identificacion || '',
      categoria_proveedor: proveedor.categoria_proveedor || 'REPUESTOS',
      tipo_proveedor: proveedor.tipo_proveedor || 'NACIONAL',
      rubros: extractRubros(proveedor),
      etiquetas_secundarias: proveedor.zona_cobertura || '',
      telefono_principal: persona?.telefono_principal || '',
      email_principal: persona?.email_principal || '',
      email_facturacion: extractEmailFacturacion(proveedor),
      persona_contacto: persona?.representante_legal || '',
      direccion_principal: persona?.direccion_principal || '',
      url_ubicacion: persona?.url_ubicacion || '',
      sitio_web: extractWebUrl(proveedor),
      terminos_credito: getTerminosCredito(proveedor),
      tiempo_entrega_dias: proveedor.tiempo_entrega_dias ?? 1,
      responsable_iva: proveedor.responsable_iva ?? true,
      realiza_entregas: proveedor.realiza_entregas ?? true,
      proveedor_activo: proveedor.proveedor_activo ?? true,
      observaciones_despacho: extractLogistica(proveedor),
    });
    setNuevoRubroEditInput('');
    setModalEditarProveedorOpen(true);
  };

  // Guardar cambios generales del proveedor
  const handleGuardarProveedorGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proveedor) return;
    if (!editProveedorData.razon_social.trim()) {
      toast.error('La Razón Social o Nombre Comercial es obligatorio (*)');
      return;
    }
    try {
      setIsSubmittingEditProveedor(true);
      await comprasService.updateProveedor(idProveedor, {
        razon_social: editProveedorData.razon_social.trim(),
        nombre_comercial: editProveedorData.razon_social.trim(),
        numero_identificacion: editProveedorData.numero_identificacion.trim() || undefined,
        categoria_proveedor: editProveedorData.categoria_proveedor,
        tipo_proveedor: editProveedorData.tipo_proveedor,
        rubros: editProveedorData.rubros,
        etiquetas_secundarias: editProveedorData.etiquetas_secundarias.trim() || undefined,
        persona_contacto: editProveedorData.persona_contacto.trim() || undefined,
        telefono_principal: editProveedorData.telefono_principal.trim() || undefined,
        email_principal: editProveedorData.email_principal.trim() || undefined,
        email_facturacion: editProveedorData.email_facturacion.trim() || undefined,
        direccion_principal: editProveedorData.direccion_principal.trim() || undefined,
        url_ubicacion: editProveedorData.url_ubicacion.trim() || undefined,
        sitio_web: editProveedorData.sitio_web.trim() || undefined,
        terminos_credito: editProveedorData.terminos_credito || undefined,
        tiempo_entrega_dias: editProveedorData.tiempo_entrega_dias,
        responsable_iva: editProveedorData.responsable_iva,
        realiza_entregas: editProveedorData.realiza_entregas,
        proveedor_activo: editProveedorData.proveedor_activo,
        observaciones_despacho: editProveedorData.observaciones_despacho.trim() || undefined,
      });
      toast.success('Datos del proveedor actualizados exitosamente.');
      setModalEditarProveedorOpen(false);
      cargarDatos(true);
    } catch (e: any) {
      console.error('Error al actualizar proveedor:', e);
      const msg = e?.response?.data?.message || 'Error al actualizar el proveedor.';
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setIsSubmittingEditProveedor(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center space-y-4">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm text-gray-500 font-medium">Cargando Ficha 360° del Proveedor...</p>
      </div>
    );
  }

  if (!proveedor) {
    return (
      <div className="flex h-96 flex-col items-center justify-center space-y-4">
        <AlertTriangle className="h-10 w-10 text-amber-500" />
        <h2 className="text-lg font-bold text-gray-900">Proveedor No Encontrado</h2>
        <p className="text-sm text-gray-500">
          El socio comercial solicitado (#{idProveedor}) no existe o fue deshabilitado.
        </p>
        <Link href="/compras/proveedores">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver al Directorio
          </Button>
        </Link>
      </div>
    );
  }

  const nombre =
    proveedor.persona?.razon_social ||
    proveedor.persona?.nombre_comercial ||
    `Proveedor #${proveedor.id_proveedor}`;
  const nit = proveedor.persona?.numero_identificacion || '--';
  const tel = proveedor.persona?.telefono_principal;
  const email = proveedor.persona?.email_principal;
  const webUrl = extractWebUrl(proveedor);
  const ubicacionUrl = proveedor.persona?.url_ubicacion;
  const terminosCredito = getTerminosCredito(proveedor);

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-20">
      {/* NAVEGACIÓN Y ACCIONES SUPERIORES */}
      <div className="flex items-center justify-between">
        <Link
          href="/compras/proveedores"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Volver al Directorio de Proveedores</span>
        </Link>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => cargarDatos(true)}
            disabled={refreshing}
            className="h-9 text-xs"
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={abrirEditarProveedor}
            className="h-9 text-xs font-medium text-slate-700 hover:text-blue-600"
          >
            <Pencil className="mr-1.5 h-3.5 w-3.5 text-slate-400" />
            Editar Proveedor
          </Button>

          <Link href={`/compras/ordenes/nueva?proveedorId=${proveedor.id_proveedor}`}>
            <Button
              size="sm"
              className="h-9 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Nueva Orden de Compra
            </Button>
          </Link>
        </div>
      </div>

      {/* CABECERA INSTITUCIONAL */}
      <Card className="border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            {/* Identidad Principal */}
            <div className="flex items-start gap-4">
              <div
                className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${getAvatarGradient(
                  nombre,
                )} text-white flex items-center justify-center font-extrabold text-xl shadow-md shrink-0 tracking-wider`}
              >
                {getInitials(nombre)}
              </div>

              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                    {nombre}
                  </h1>
                  <Badge
                    variant="outline"
                    className="bg-blue-50 text-blue-700 border-blue-200 font-semibold text-xs"
                  >
                    {proveedor.categoria_proveedor}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="bg-slate-50 text-slate-700 border-slate-200 text-xs"
                  >
                    {proveedor.tipo_proveedor}
                  </Badge>
                  <Badge
                    className={`${
                      proveedor.proveedor_activo
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    } text-xs font-semibold`}
                  >
                    <span
                      className={`mr-1.5 h-2 w-2 rounded-full ${
                        proveedor.proveedor_activo ? 'bg-emerald-500' : 'bg-slate-400'
                      }`}
                    />
                    {proveedor.proveedor_activo ? 'Proveedor Activo' : 'Inactivo'}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500">
                  <span className="font-mono font-medium text-slate-700">
                    NIT: {nit}
                  </span>
                  {proveedor.persona?.representante_legal && (
                    <span className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      Asesor: <strong className="text-slate-700">{proveedor.persona.representante_legal}</strong>
                    </span>
                  )}
                  {proveedor.responsable_iva ? (
                    <span className="text-emerald-700 font-medium">Responsable de IVA</span>
                  ) : (
                    <span className="text-slate-500">No Responsable de IVA</span>
                  )}
                </div>

                {/* Micro-Contactos y Enlaces Rápidos */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  {tel && (
                    <a
                      href={`tel:${tel}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-50 text-slate-700 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 transition-colors"
                      title="Llamar o WhatsApp"
                    >
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      <span>{tel}</span>
                    </a>
                  )}

                  {email && (
                    <a
                      href={`mailto:${email}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-50 text-slate-700 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 transition-colors"
                      title="Enviar Correo"
                    >
                      <Mail className="h-3.5 w-3.5 text-slate-400" />
                      <span>{email}</span>
                    </a>
                  )}

                  {webUrl && (
                    <a
                      href={webUrl.startsWith('http') ? webUrl : `https://${webUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 transition-colors"
                    >
                      <Globe className="h-3.5 w-3.5 text-sky-600" />
                      <span>Sitio Web</span>
                      <ExternalLink className="h-2.5 w-2.5 opacity-70" />
                    </a>
                  )}

                  {ubicacionUrl && (
                    <a
                      href={ubicacionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                    >
                      <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Ubicación GPS</span>
                      <ExternalLink className="h-2.5 w-2.5 opacity-70" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Condiciones Comerciales Destacadas */}
            <div className="flex flex-col sm:flex-row md:flex-col gap-2 rounded-xl bg-slate-50 p-3.5 border border-slate-200/80 min-w-[220px]">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 flex items-center gap-1">
                  <CreditCard className="h-3.5 w-3.5 text-slate-400" />
                  Plazo de pago:
                </span>
                <span className="font-semibold text-slate-800">{terminosCredito}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  Entrega muelle:
                </span>
                <span className="font-semibold text-slate-800">
                  {proveedor.tiempo_entrega_dias || 1} día(s)
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 flex items-center gap-1">
                  <Truck className="h-3.5 w-3.5 text-slate-400" />
                  Logística:
                </span>
                <span className="font-semibold text-emerald-700">
                  {proveedor.realiza_entregas ? 'Despacho a sede' : 'Retiro en bodega'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* KPI CARDS SUPERIORES */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Repuestos Homologados */}
        <Card className="border border-slate-200 bg-white shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Repuestos Homologados
                </p>
                <p className="mt-1 text-2xl font-black text-slate-900">
                  {kpis.total_articulos_homologados}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  En matriz de abastecimiento
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Package className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Órdenes de Compra */}
        <Card className="border border-slate-200 bg-white shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Órdenes Emitidas
                </p>
                <p className="mt-1 text-2xl font-black text-slate-900">
                  {kpis.total_ordenes_compra}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Histórico de compras
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <FileText className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Monto Total Comprado */}
        <Card className="border border-slate-200 bg-white shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Total Facturado
                </p>
                <p className="mt-1 text-2xl font-black text-slate-900">
                  {formatMonedaCOP(kpis.monto_total_comprado)}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Volumen neto acumulado
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <DollarSign className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Cumplimiento de Entrega / Calidad */}
        <Card className="border border-slate-200 bg-white shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Cumplimiento en Muelle
                </p>
                <p className="mt-1 text-2xl font-black text-slate-900">
                  {kpis.cumplimiento_calidad}%
                </p>
                <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
                  Conformidad y puntualidad
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <ShieldCheck className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* PESTAÑAS OPERATIVAS */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="bg-slate-100 p-1 rounded-xl border border-slate-200">
          <TabsTrigger
            value="catalogo"
            className="rounded-lg text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-xs px-4 py-2 gap-1.5"
          >
            <Package className="h-3.5 w-3.5" />
            <span>Catálogo de Repuestos & Sourcing</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-blue-800 font-bold">
              {articulosHomologados.length}
            </span>
          </TabsTrigger>

          <TabsTrigger
            value="ordenes"
            className="rounded-lg text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-xs px-4 py-2 gap-1.5"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Historial de Órdenes de Compra</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700 font-bold">
              {ordenesCompra.length}
            </span>
          </TabsTrigger>

          <TabsTrigger
            value="fiscal"
            className="rounded-lg text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-xs px-4 py-2 gap-1.5"
          >
            <Building2 className="h-3.5 w-3.5" />
            <span>Datos Fiscales, Contacto & Logística</span>
          </TabsTrigger>
        </TabsList>

        {/* PESTAÑA 1: CATÁLOGO DE REPUESTOS HOMOLOGADOS (MATRIZ DE SOURCING) */}
        <TabsContent value="catalogo" className="space-y-4">
          <Card className="border border-slate-200 bg-white shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-blue-600" />
                    Matriz de Sourcing y Repuestos Homologados
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Artículos del catálogo maestro que suministra {nombre} con su SKU comercial y costo pactado.
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      placeholder="Buscar por SKU, nombre o ref..."
                      value={busquedaArticulo}
                      onChange={(e) => setBusquedaArticulo(e.target.value)}
                      className="pl-8.5 h-9 text-xs border-slate-200"
                    />
                  </div>

                  <Button
                    onClick={abrirModalHomologar}
                    className="h-9 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shrink-0"
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    + Homologar Repuesto
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3.5">SKU Mekanos</th>
                      <th className="px-4 py-3.5">Descripción & Marca</th>
                      <th className="px-3.5 py-3.5">Ref. Homóloga Suplidor</th>
                      <th className="px-4 py-3.5 text-right">Costo Pactado ($ COP)</th>
                      <th className="px-3 py-3.5 text-center">Días Entrega</th>
                      <th className="px-3 py-3.5 text-center">Preferente</th>
                      <th className="px-4 py-3.5 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {articulosFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center">
                          <Package className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                          <p className="text-sm font-semibold text-slate-700">
                            {busquedaArticulo
                              ? 'No se encontraron repuestos con ese término de búsqueda'
                              : 'No hay repuestos homologados para este proveedor'}
                          </p>
                          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                            {busquedaArticulo
                              ? 'Intenta con otro código interno, descripción o referencia comercial.'
                              : 'Vincula los artículos del catálogo técnico que compras a este aliado para automatizar órdenes de compra.'}
                          </p>
                          {!busquedaArticulo && (
                            <div className="mt-4">
                              <Button
                                size="sm"
                                onClick={abrirModalHomologar}
                                className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
                              >
                                <Plus className="mr-1.5 h-3.5 w-3.5" />
                                Homologar Primer Repuesto
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ) : (
                      articulosFiltrados.map((art) => {
                        const comp = art.catalogo_componentes;
                        const skuMekanos = comp?.codigo_interno || `REF-${art.id_componente}`;
                        const descripcion = comp?.descripcion_corta || 'Artículo sin descripción';
                        const refFab = comp?.referencia_fabricante;
                        const marca = comp?.marcas?.nombre || (comp as any)?.marca;
                        const costo = Number(art.costo_actual) || 0;

                        return (
                          <tr
                            key={`${art.id_componente}-${art.id_proveedor}`}
                            className="hover:bg-slate-50/80 transition-colors"
                          >
                            {/* SKU Mekanos */}
                            <td className="px-4 py-3.5 font-mono text-xs font-semibold text-slate-900 whitespace-nowrap">
                              <Link
                                href={`/compras/catalogo/${art.id_componente}`}
                                className="hover:text-blue-600 hover:underline flex items-center gap-1"
                                title="Ver Ficha 360° del Repuesto"
                              >
                                <span>{skuMekanos}</span>
                                <ExternalLink className="h-2.5 w-2.5 opacity-50" />
                              </Link>
                              {refFab && (
                                <span className="block text-[10px] text-slate-400 font-normal">
                                  OEM: {refFab}
                                </span>
                              )}
                            </td>

                            {/* Descripción & Marca */}
                            <td className="px-4 py-3.5 max-w-[280px]">
                              <p className="font-semibold text-slate-800 text-xs truncate" title={descripcion}>
                                {descripcion}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {marca && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] py-0 px-1.5 border-slate-200 text-slate-600 bg-slate-50"
                                  >
                                    {marca}
                                  </Badge>
                                )}
                                {comp?.categorias_componente?.nombre && (
                                  <span className="text-[10px] text-slate-400">
                                    {comp.categorias_componente.nombre}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Ref. Homóloga Proveedor */}
                            <td className="px-3.5 py-3.5 whitespace-nowrap">
                              <Badge
                                variant="outline"
                                className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50/60 border-indigo-200"
                              >
                                {art.referencia_proveedor}
                              </Badge>
                              {art.marca_ofrecida && art.marca_ofrecida !== marca && (
                                <span className="block text-[10px] text-slate-400 mt-0.5">
                                  Marca: {art.marca_ofrecida}
                                </span>
                              )}
                            </td>

                            {/* Costo Pactado */}
                            <td className="px-4 py-3.5 text-right font-mono font-bold text-xs text-slate-900 whitespace-nowrap">
                              {formatMonedaCOP(costo)}
                              <span className="block text-[10px] text-slate-400 font-normal">
                                COP / {comp?.unidades_medida?.simbolo || 'UND'}
                              </span>
                            </td>

                            {/* Días Entrega */}
                            <td className="px-3 py-3.5 text-center text-xs text-slate-700 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1 font-medium">
                                <Clock className="h-3 w-3 text-slate-400" />
                                {art.tiempo_entrega_dias || 1}d
                              </span>
                            </td>

                            {/* Proveedor Preferente */}
                            <td className="px-3 py-3.5 text-center whitespace-nowrap">
                              {art.es_proveedor_preferido ? (
                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-semibold gap-1">
                                  <Star className="h-2.5 w-2.5 fill-emerald-600 text-emerald-600" />
                                  Preferente
                                </Badge>
                              ) : (
                                <span className="text-slate-400 text-xs">--</span>
                              )}
                            </td>

                            {/* Acciones Inline */}
                            <td className="px-4 py-3.5 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => abrirEditarHomologacion(art)}
                                  className="h-8 px-2 text-xs text-slate-600 hover:text-blue-700 hover:bg-blue-50"
                                  title="Editar precio o condiciones de homologación"
                                >
                                  <Pencil className="h-3.5 w-3.5 text-slate-400" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => abrirDesvincular(art)}
                                  className="h-8 px-2 text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50"
                                  title="Desvincular repuesto de este proveedor"
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-rose-400" />
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* PESTAÑA 2: HISTORIAL DE ÓRDENES DE COMPRA */}
        <TabsContent value="ordenes" className="space-y-4">
          <Card className="border border-slate-200 bg-white shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4 text-emerald-600" />
                    Órdenes de Compra Emitidas a {nombre}
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Historial de abastecimiento comercial, estado de muelle y totales transaccionados.
                  </p>
                </div>

                <Link href={`/compras/ordenes/nueva?proveedorId=${proveedor.id_proveedor}`}>
                  <Button
                    size="sm"
                    className="h-9 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    + Emitir Orden de Compra
                  </Button>
                </Link>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3.5">Orden de Compra</th>
                      <th className="px-4 py-3.5">Fecha Emisión</th>
                      <th className="px-3.5 py-3.5 text-center">Estado</th>
                      <th className="px-3.5 py-3.5 text-center">Ítems</th>
                      <th className="px-4 py-3.5 text-right">Monto Total ($ COP)</th>
                      <th className="px-4 py-3.5 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ordenesCompra.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center">
                          <ShoppingBag className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                          <p className="text-sm font-semibold text-slate-700">
                            Aún no se han emitido órdenes de compra para este proveedor
                          </p>
                          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                            Emite una orden de compra formal para registrar repuestos, precios y fechas de entrega pactadas.
                          </p>
                          <div className="mt-4">
                            <Link href={`/compras/ordenes/nueva?proveedorId=${proveedor.id_proveedor}`}>
                              <Button
                                size="sm"
                                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                              >
                                <Plus className="mr-1.5 h-3.5 w-3.5" />
                                Emitir Primera Orden de Compra
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      ordenesCompra.map((oc) => {
                        const codigoOC =
                          oc.numero_orden ||
                          `OC-${new Date(oc.fecha_solicitud || oc.fecha_creacion || Date.now()).getFullYear()}-${String(
                            oc.id_orden_compra,
                          ).padStart(4, '0')}`;
                        const fecha = oc.fecha_solicitud
                          ? new Date(oc.fecha_solicitud).toLocaleDateString('es-CO')
                          : '--';
                        const estado = (oc.estado as string) || 'PENDIENTE';
                        const itemsCount = oc.ordenes_compra_detalle?.length || 0;
                        const total = oc.ordenes_compra_detalle?.reduce((acc: number, d: any) => {
                          return acc + (Number(d.subtotal) || Number(d.cantidad) * Number(d.precio_unitario) || 0);
                        }, 0);

                        return (
                          <tr key={oc.id_orden_compra} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-4 py-3.5 font-mono text-xs font-bold text-slate-900 whitespace-nowrap">
                              <Link
                                href={`/compras/ordenes/${oc.id_orden_compra}`}
                                className="hover:text-blue-600 hover:underline flex items-center gap-1"
                              >
                                <span>{codigoOC}</span>
                                <ExternalLink className="h-2.5 w-2.5 opacity-50" />
                              </Link>
                            </td>

                            <td className="px-4 py-3.5 text-xs text-slate-600 whitespace-nowrap">
                              {fecha}
                            </td>

                            <td className="px-3.5 py-3.5 text-center whitespace-nowrap">
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-bold ${
                                  estado === 'COMPLETADA' || estado === 'RECIBIDA'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : estado === 'APROBADA' || estado === 'ENVIADA'
                                    ? 'bg-blue-50 text-blue-800 border-blue-200'
                                    : estado === 'ANULADA'
                                    ? 'bg-rose-50 text-rose-800 border-rose-200'
                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                                }`}
                              >
                                {estado}
                              </Badge>
                            </td>

                            <td className="px-3.5 py-3.5 text-center font-mono text-xs text-slate-700 whitespace-nowrap">
                              {itemsCount} {itemsCount === 1 ? 'ítem' : 'ítems'}
                            </td>

                            <td className="px-4 py-3.5 text-right font-mono font-bold text-xs text-slate-900 whitespace-nowrap">
                              {formatMonedaCOP(total)}
                            </td>

                            <td className="px-4 py-3.5 text-right whitespace-nowrap">
                              <Link href={`/compras/ordenes/${oc.id_orden_compra}`}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2 text-xs text-blue-700 hover:bg-blue-50 font-medium"
                                >
                                  <Eye className="h-3.5 w-3.5 mr-1" />
                                  Ver Orden
                                </Button>
                              </Link>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PESTAÑA 3: DATOS FISCALES, CONTACTO Y LOGÍSTICA */}
        <TabsContent value="fiscal" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Tarjeta 1: Identidad Jurídica y Fiscal */}
            <Card className="border border-slate-200 bg-white shadow-2xs">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-blue-600" />
                  Identidad Jurídica & Fiscal
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Razón Social</span>
                  <span className="font-bold text-slate-800 text-sm">
                    {proveedor.persona?.razon_social || nombre}
                  </span>
                </div>
                {proveedor.persona?.nombre_comercial && (
                  <div>
                    <span className="text-slate-400 block font-medium">Nombre Comercial</span>
                    <span className="font-semibold text-slate-700">
                      {proveedor.persona.nombre_comercial}
                    </span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="text-slate-400 block font-medium">Identificación / NIT</span>
                    <span className="font-mono font-bold text-slate-800">{nit}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Régimen IVA</span>
                    <span className="font-semibold text-slate-800">
                      {proveedor.responsable_iva ? 'Responsable de IVA' : 'No Responsable'}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-400 block font-medium">Categoría Principal</span>
                    <Badge variant="outline" className="text-blue-700 bg-blue-50 border-blue-200 mt-0.5">
                      {proveedor.categoria_proveedor}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Tipo Suplidor</span>
                    <span className="font-semibold text-slate-700">{proveedor.tipo_proveedor}</span>
                  </div>
                </div>

                {/* Rubros y especialidades */}
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-slate-400 block font-medium mb-1.5">
                    Rubros y Especialidades Suministradas
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {extractRubros(proveedor).length > 0 ? (
                      extractRubros(proveedor).map((r, i) => (
                        <Badge
                          key={i}
                          variant="secondary"
                          className="text-[10px] bg-slate-100 text-slate-700"
                        >
                          {r}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">
                        Sin rubros específicos registrados
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tarjeta 2: Contacto & Canales Digitales */}
            <Card className="border border-slate-200 bg-white shadow-2xs">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Phone className="h-4 w-4 text-emerald-600" />
                  Contacto & Portales Digitales
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Asesor Comercial / Contacto</span>
                  <span className="font-semibold text-slate-800">
                    {proveedor.persona?.representante_legal || 'No especificado'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Teléfono / WhatsApp Compras</span>
                  {tel ? (
                    <a
                      href={`tel:${tel}`}
                      className="font-bold text-blue-600 hover:underline flex items-center gap-1 mt-0.5"
                    >
                      <Phone className="h-3 w-3" />
                      {tel}
                    </a>
                  ) : (
                    <span className="text-slate-400 italic">No registrado</span>
                  )}
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Correo Pedidos / Compras</span>
                  {email ? (
                    <a
                      href={`mailto:${email}`}
                      className="font-medium text-blue-600 hover:underline flex items-center gap-1 mt-0.5"
                    >
                      <Mail className="h-3 w-3" />
                      {email}
                    </a>
                  ) : (
                    <span className="text-slate-400 italic">No registrado</span>
                  )}
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Correo Facturación Electrónica</span>
                  {extractEmailFacturacion(proveedor) ? (
                    <span className="font-medium text-slate-700">
                      {extractEmailFacturacion(proveedor)}
                    </span>
                  ) : (
                    <span className="text-slate-400 italic">Mismo correo principal</span>
                  )}
                </div>
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-slate-400 block font-medium">Catálogo Digital / Portal Web</span>
                  {webUrl ? (
                    <a
                      href={webUrl.startsWith('http') ? webUrl : `https://${webUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sky-700 hover:underline font-semibold mt-0.5"
                    >
                      <Globe className="h-3 w-3" />
                      {webUrl}
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  ) : (
                    <span className="text-slate-400 italic">Sin sitio web</span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Tarjeta 3: Logística, Muelle & Crédito */}
            <Card className="border border-slate-200 bg-white shadow-2xs">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Truck className="h-4 w-4 text-purple-600" />
                  Condiciones Comerciales & Logística
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Plazo de Pago / Crédito</span>
                  <span className="font-bold text-slate-900 text-sm">{terminosCredito}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-400 block font-medium">Tiempo de Entrega</span>
                    <span className="font-semibold text-slate-800">
                      {proveedor.tiempo_entrega_dias || 1} día(s) hábiles
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Modalidad Despacho</span>
                    <span className="font-semibold text-slate-800">
                      {proveedor.realiza_entregas ? 'A domicilio en taller' : 'En bodega proveedor'}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Dirección Bodega / Despacho</span>
                  <span className="font-medium text-slate-700">
                    {proveedor.persona?.direccion_principal || 'No especificada'}
                  </span>
                </div>
                {ubicacionUrl && (
                  <div>
                    <span className="text-slate-400 block font-medium">Georreferenciación GPS</span>
                    <a
                      href={ubicacionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-emerald-700 hover:underline font-semibold mt-0.5"
                    >
                      <MapPin className="h-3 w-3" />
                      Abrir en Google Maps / Waze
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </div>
                )}
                {extractLogistica(proveedor) && (
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-slate-400 block font-medium">Observaciones de Muelle</span>
                    <p className="text-slate-600 mt-0.5 italic">
                      {extractLogistica(proveedor)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* MODAL ENTERPRISE: + HOMOLOGAR REPUESTO */}
      <Dialog open={modalHomologarOpen} onOpenChange={setModalHomologarOpen}>
        <DialogContent className="sm:max-w-xl w-full p-0 rounded-2xl border border-slate-100 shadow-2xl overflow-hidden">
          <form onSubmit={handleGuardarHomologacion}>
            <DialogHeader className="p-6 pb-4 border-b border-slate-100 bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold text-slate-900">
                    Homologar Repuesto Comercial
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500">
                    Vincula un artículo del catálogo maestro con la referencia y costo pactado con {nombre}.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="p-6 space-y-4 text-xs">
              {/* 1. Selector Searchable del Catálogo Maestro */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">
                  Artículo del Catálogo Maestro *
                </Label>
                <div className="relative">
                  <div
                    onClick={() => setMenuComponentesAbierto(!menuComponentesAbierto)}
                    className="flex items-center justify-between w-full h-10 px-3 border border-slate-200 rounded-lg bg-white cursor-pointer hover:border-blue-400 transition-colors"
                  >
                    {componenteSeleccionado ? (
                      <div className="truncate">
                        <strong className="text-slate-900 font-mono mr-2">
                          {componenteSeleccionado.codigo_interno || `ID #${componenteSeleccionado.id_componente}`}
                        </strong>
                        <span className="text-slate-700 font-medium">
                          {componenteSeleccionado.descripcion_corta}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400">
                        Selecciona o busca un componente del catálogo...
                      </span>
                    )}
                    <Search className="h-4 w-4 text-slate-400 shrink-0 ml-2" />
                  </div>

                  {menuComponentesAbierto && (
                    <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl p-2 space-y-2 max-h-60 overflow-y-auto">
                      <Input
                        placeholder="Filtrar por nombre, SKU o marca..."
                        value={busquedaComponenteModal}
                        onChange={(e) => setBusquedaComponenteModal(e.target.value)}
                        className="h-8 text-xs border-slate-200"
                        autoFocus
                      />
                      <div className="divide-y divide-slate-100">
                        {cargandoCatalogoMaestro ? (
                          <div className="py-6 flex flex-col items-center justify-center gap-2 text-xs text-slate-500">
                            <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                            <span>Cargando catálogo maestro...</span>
                          </div>
                        ) : componentesFiltradosModal.length === 0 ? (
                          <div className="py-6 text-center text-xs text-slate-400">
                            No se encontraron artículos
                          </div>
                        ) : (
                          componentesFiltradosModal.map((c) => (
                            <div
                              key={c.id_componente}
                              onClick={() => handleSeleccionarComponente(c)}
                              className="p-2 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono font-bold text-slate-900 text-xs">
                                  {c.codigo_interno || `REF-${c.id_componente}`}
                                </span>
                                {c.marca && (
                                  <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                                    {c.marca}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-slate-700 truncate font-medium mt-0.5">
                                {c.descripcion_corta}
                              </p>
                              {c.referencia_fabricante && (
                                <span className="text-[10px] text-slate-400">
                                  Ref Fab: {c.referencia_fabricante}
                                </span>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Referencia / SKU del Proveedor */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">
                  Referencia / SKU del Proveedor (Código de Facturación) *
                </Label>
                <Input
                  placeholder="Ej. CAT-1R-0716, DON-P550388..."
                  value={formHomologar.referencia_proveedor}
                  onChange={(e) =>
                    setFormHomologar((prev) => ({
                      ...prev,
                      referencia_proveedor: e.target.value,
                    }))
                  }
                  required
                  className="font-mono font-bold text-xs h-10 border-slate-200"
                />
                <p className="text-[11px] text-slate-500">
                  Código o número de parte con el que este proveedor factura o cotiza el ítem.
                </p>
              </div>

              {/* 3. Costo Pactado y Días de Entrega */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">
                    Costo Unitario Pactado ($ COP) *
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                      $
                    </span>
                    <Input
                      type="number"
                      min={0}
                      step={100}
                      placeholder="0"
                      value={formHomologar.costo_actual || ''}
                      onChange={(e) =>
                        setFormHomologar((prev) => ({
                          ...prev,
                          costo_actual: Number(e.target.value),
                        }))
                      }
                      required
                      className="pl-7 font-mono font-bold text-xs h-10 border-slate-200"
                    />
                  </div>
                  {formHomologar.costo_actual > 0 && (
                    <span className="text-[11px] font-bold text-emerald-700 block">
                      Preview: {formatMonedaCOP(formHomologar.costo_actual)}
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">
                    Tiempo de Entrega (Días Hábiles)
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    value={formHomologar.tiempo_entrega_dias || 1}
                    onChange={(e) =>
                      setFormHomologar((prev) => ({
                        ...prev,
                        tiempo_entrega_dias: Number(e.target.value),
                      }))
                    }
                    className="font-mono text-xs h-10 border-slate-200"
                  />
                </div>
              </div>

              {/* 4. Switch Proveedor Preferente */}
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3.5 border border-slate-200">
                <div className="space-y-0.5">
                  <Label className="text-xs font-bold text-slate-800">
                    Establecer como Proveedor Preferente
                  </Label>
                  <p className="text-[11px] text-slate-500">
                    Si se activa, este proveedor será la primera opción automática al generar órdenes de compra.
                  </p>
                </div>
                <Switch
                  checked={formHomologar.es_proveedor_preferido}
                  onCheckedChange={(checked) =>
                    setFormHomologar((prev) => ({
                      ...prev,
                      es_proveedor_preferido: checked,
                    }))
                  }
                />
              </div>

              {/* 5. Notas u Observaciones */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">
                  Notas u Observaciones Comerciales (Opcional)
                </Label>
                <Input
                  placeholder="Ej. Precio especial por volumen, garantía 6 meses..."
                  value={formHomologar.notas || ''}
                  onChange={(e) =>
                    setFormHomologar((prev) => ({
                      ...prev,
                      notas: e.target.value,
                    }))
                  }
                  className="text-xs h-9 border-slate-200"
                />
              </div>
            </div>

            <DialogFooter className="p-4 px-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalHomologarOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmittingHomologacion}
                className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
              >
                {isSubmittingHomologacion ? (
                  <>
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Homologando...
                  </>
                ) : (
                  <>
                    <Check className="mr-1.5 h-3.5 w-3.5" />
                    Guardar Homologación
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: EDITAR CONDICIONES DE HOMOLOGACIÓN */}
      <Dialog
        open={modalEditarHomologacionOpen}
        onOpenChange={setModalEditarHomologacionOpen}
      >
        <DialogContent className="sm:max-w-lg w-full p-0 rounded-2xl border border-slate-100 shadow-2xl overflow-hidden">
          <form onSubmit={handleGuardarEdicionHomologacion}>
            <DialogHeader className="p-6 pb-4 border-b border-slate-100 bg-slate-50/70">
              <DialogTitle className="text-base font-bold text-slate-900">
                Editar Condiciones de Homologación
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                {articuloSeleccionadoEdit?.catalogo_componentes?.descripcion_corta} (SKU:{' '}
                {articuloSeleccionadoEdit?.catalogo_componentes?.codigo_interno ||
                  articuloSeleccionadoEdit?.id_componente}
                )
              </DialogDescription>
            </DialogHeader>

            <div className="p-6 space-y-4 text-xs">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">
                  Referencia / SKU Homólogo del Suplidor *
                </Label>
                <Input
                  value={formEditHomologacion.referencia_proveedor}
                  onChange={(e) =>
                    setFormEditHomologacion((prev) => ({
                      ...prev,
                      referencia_proveedor: e.target.value,
                    }))
                  }
                  required
                  className="font-mono font-bold text-xs h-10 border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">
                    Nuevo Costo Pactado ($ COP) *
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                      $
                    </span>
                    <Input
                      type="number"
                      min={0}
                      step={100}
                      value={formEditHomologacion.nuevo_costo || ''}
                      onChange={(e) =>
                        setFormEditHomologacion((prev) => ({
                          ...prev,
                          nuevo_costo: Number(e.target.value),
                        }))
                      }
                      required
                      className="pl-7 font-mono font-bold text-xs h-10 border-slate-200"
                    />
                  </div>
                  {formEditHomologacion.nuevo_costo > 0 && (
                    <span className="text-[11px] font-bold text-emerald-700 block">
                      Preview: {formatMonedaCOP(formEditHomologacion.nuevo_costo)}
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">
                    Días de Entrega Muelle
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    value={formEditHomologacion.tiempo_entrega_dias || 1}
                    onChange={(e) =>
                      setFormEditHomologacion((prev) => ({
                        ...prev,
                        tiempo_entrega_dias: Number(e.target.value),
                      }))
                    }
                    className="font-mono text-xs h-10 border-slate-200"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3.5 border border-slate-200">
                <div className="space-y-0.5">
                  <Label className="text-xs font-bold text-slate-800">
                    Proveedor Preferente
                  </Label>
                  <p className="text-[11px] text-slate-500">
                    Marcar como fuente de suministro prioritaria para este ítem.
                  </p>
                </div>
                <Switch
                  checked={formEditHomologacion.es_proveedor_preferido}
                  onCheckedChange={(checked) =>
                    setFormEditHomologacion((prev) => ({
                      ...prev,
                      es_proveedor_preferido: checked,
                    }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">
                  Motivo de Actualización / Observación para Auditoría
                </Label>
                <Input
                  placeholder="Ej. Ajuste tarifario anual, actualización de lista..."
                  value={formEditHomologacion.observaciones}
                  onChange={(e) =>
                    setFormEditHomologacion((prev) => ({
                      ...prev,
                      observaciones: e.target.value,
                    }))
                  }
                  className="text-xs h-9 border-slate-200"
                />
              </div>
            </div>

            <DialogFooter className="p-4 px-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalEditarHomologacionOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmittingHomologacion}
                className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSubmittingHomologacion ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO: CONFIRMAR DESVINCULACIÓN */}
      <Dialog open={dialogDesvincularOpen} onOpenChange={setDialogDesvincularOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-600" />
              Desvincular Repuesto de la Matriz
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              ¿Estás seguro de desvincular el repuesto{' '}
              <strong>
                {articuloADesvincular?.catalogo_componentes?.descripcion_corta} (Ref:{' '}
                {articuloADesvincular?.referencia_proveedor})
              </strong>{' '}
              del proveedor {nombre}?
            </DialogDescription>
          </DialogHeader>
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
            El ítem no se eliminará del Catálogo Maestro, pero ya no aparecerá como fuente de suministro asociada a este proveedor.
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDialogDesvincularOpen(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleEjecutarDesvinculacion}
              className="text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white"
            >
              Sí, Desvincular
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: EDITAR DATOS GENERALES DEL PROVEEDOR (2 COLUMNAS ENTERPRISE) */}
      <Dialog open={modalEditarProveedorOpen} onOpenChange={setModalEditarProveedorOpen}>
        <DialogContent className="max-w-4xl w-full max-h-[92vh] flex flex-col p-0 rounded-2xl border border-slate-100 shadow-2xl overflow-hidden">
          <form onSubmit={handleGuardarProveedorGeneral} className="flex flex-col h-full">
            <DialogHeader className="p-6 pb-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold text-slate-900">
                    Editar Proveedor Comercial
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500">
                    Actualización integral de datos fiscales, comerciales, rubros y logística de {nombre}.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 overflow-y-auto max-h-[calc(92vh-140px)] text-xs">
              {/* COLUMNA 1: IDENTIFICACIÓN Y CLASIFICACIÓN */}
              <div className="space-y-4">
                <div className="border-b border-slate-200 pb-2">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-blue-600" />
                    Identificación y Clasificación
                  </h3>
                </div>

                {/* Razón Social */}
                <div className="space-y-1.5">
                  <Label htmlFor="edit_prov_razon" className="text-xs font-semibold text-slate-700">
                    Razón Social o Nombre Comercial <span className="text-blue-600 font-bold">*</span>
                  </Label>
                  <Input
                    id="edit_prov_razon"
                    required
                    placeholder="Ej. Químicos Industriales del Caribe S.A.S."
                    value={editProveedorData.razon_social}
                    onChange={(e) =>
                      setEditProveedorData((prev) => ({ ...prev, razon_social: e.target.value }))
                    }
                    className="h-10 text-sm bg-white border-slate-200 rounded-lg px-3"
                  />
                </div>

                {/* NIT y Tipo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit_prov_nit" className="text-xs font-semibold text-slate-700">
                      NIT / Identificación
                    </Label>
                    <Input
                      id="edit_prov_nit"
                      placeholder="Ej. 900.123.456-7"
                      value={editProveedorData.numero_identificacion}
                      onChange={(e) =>
                        setEditProveedorData((prev) => ({
                          ...prev,
                          numero_identificacion: e.target.value,
                        }))
                      }
                      className="h-10 text-sm bg-white border-slate-200 rounded-lg font-mono px-3"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="edit_prov_tipo" className="text-xs font-semibold text-slate-700">
                      Tipo Proveedor
                    </Label>
                    <select
                      id="edit_prov_tipo"
                      value={editProveedorData.tipo_proveedor}
                      onChange={(e) =>
                        setEditProveedorData((prev) => ({ ...prev, tipo_proveedor: e.target.value }))
                      }
                      className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="NACIONAL">NACIONAL</option>
                      <option value="INTERNACIONAL">INTERNACIONAL</option>
                    </select>
                  </div>
                </div>

                {/* Categoría y Sitio Web */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit_prov_cat" className="text-xs font-semibold text-slate-700">
                      Categoría Principal
                    </Label>
                    <select
                      id="edit_prov_cat"
                      value={editProveedorData.categoria_proveedor}
                      onChange={(e) =>
                        setEditProveedorData((prev) => ({
                          ...prev,
                          categoria_proveedor: e.target.value,
                        }))
                      }
                      className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="REPUESTOS">REPUESTOS</option>
                      <option value="SERVICIOS">SERVICIOS</option>
                      <option value="SUMINISTROS">SUMINISTROS</option>
                      <option value="EQUIPOS">EQUIPOS</option>
                      <option value="MIXTO">MIXTO</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="edit_prov_web" className="text-xs font-semibold text-slate-700">
                      Sitio Web / Catálogo Digital
                    </Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-blue-500" />
                      <Input
                        id="edit_prov_web"
                        placeholder="https://proveedor.com"
                        value={editProveedorData.sitio_web}
                        onChange={(e) =>
                          setEditProveedorData((prev) => ({ ...prev, sitio_web: e.target.value }))
                        }
                        className="h-10 pl-9 pr-3 text-sm bg-white border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                {/* SECCIÓN RUBROS / ESPECIALIDADES */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-blue-600" />
                      <span className="text-xs font-bold text-slate-800">
                        Rubros y Especialidades
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                      {editProveedorData.rubros.length} asignados
                    </span>
                  </div>

                  {/* Contenedor compacto de chips */}
                  <div className="min-h-[42px] max-h-28 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 flex flex-wrap items-center gap-1.5">
                    {editProveedorData.rubros.length === 0 ? (
                      <span className="text-xs text-slate-400 italic">
                        Sin rubros asignados. Agrega del catálogo institucional o escribe uno nuevo.
                      </span>
                    ) : (
                      editProveedorData.rubros.map((rubro) => (
                        <span
                          key={rubro}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200/80 shadow-2xs"
                        >
                          <span>{rubro}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoverRubroEdit(rubro)}
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
                        handleAgregarRubroEdit(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
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
                      value={nuevoRubroEditInput}
                      onChange={(e) => setNuevoRubroEditInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleCrearRubroPersonalizadoEdit();
                        }
                      }}
                      className="h-10 text-xs bg-white border-slate-200 rounded-lg flex-1 px-3"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleCrearRubroPersonalizadoEdit()}
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
                    <Label htmlFor="edit_prov_tags" className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                      <Tag className="h-3 w-3 text-slate-500" />
                      Etiquetas de Clasificación Secundarias
                    </Label>
                    <span className="text-[10px] text-slate-400">Separadas por coma</span>
                  </div>
                  <Input
                    id="edit_prov_tags"
                    placeholder="Ej. HDPE, Conexiones, Soldaduras, Diésel..."
                    value={editProveedorData.etiquetas_secundarias}
                    onChange={(e) =>
                      setEditProveedorData((prev) => ({
                        ...prev,
                        etiquetas_secundarias: e.target.value,
                      }))
                    }
                    className="h-10 text-xs bg-white border-slate-200 rounded-lg px-3"
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
                    <Label htmlFor="edit_prov_contacto" className="text-xs font-semibold text-slate-700">
                      Asesor Comercial / Contacto
                    </Label>
                    <Input
                      id="edit_prov_contacto"
                      placeholder="Ej. Carlos Mendoza"
                      value={editProveedorData.persona_contacto}
                      onChange={(e) =>
                        setEditProveedorData((prev) => ({
                          ...prev,
                          persona_contacto: e.target.value,
                        }))
                      }
                      className="h-10 text-sm bg-white border-slate-200 rounded-lg px-3"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="edit_prov_tel" className="text-xs font-semibold text-slate-700">
                      Teléfono / WhatsApp Compras
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <Input
                        id="edit_prov_tel"
                        placeholder="Ej. +57 300 123 4567"
                        value={editProveedorData.telefono_principal}
                        onChange={(e) =>
                          setEditProveedorData((prev) => ({
                            ...prev,
                            telefono_principal: e.target.value,
                          }))
                        }
                        className="h-10 pl-9 pr-3 text-sm bg-white border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                {/* Correos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit_prov_email" className="text-xs font-semibold text-slate-700">
                      Correo Pedidos / Compras
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <Input
                        id="edit_prov_email"
                        type="email"
                        placeholder="Ej. pedidos@proveedor.com"
                        value={editProveedorData.email_principal}
                        onChange={(e) =>
                          setEditProveedorData((prev) => ({
                            ...prev,
                            email_principal: e.target.value,
                          }))
                        }
                        className="h-10 pl-9 pr-3 text-sm bg-white border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="edit_prov_email_fact" className="text-xs font-semibold text-slate-700">
                      Correo Facturación Electrónica
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <Input
                        id="edit_prov_email_fact"
                        type="email"
                        placeholder="Ej. facturas@proveedor.com"
                        value={editProveedorData.email_facturacion}
                        onChange={(e) =>
                          setEditProveedorData((prev) => ({
                            ...prev,
                            email_facturacion: e.target.value,
                          }))
                        }
                        className="h-10 pl-9 pr-3 text-sm bg-white border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                {/* Dirección Física */}
                <div className="space-y-1.5">
                  <Label htmlFor="edit_prov_dir" className="text-xs font-semibold text-slate-700">
                    Dirección Física / Bodega Despacho
                  </Label>
                  <Input
                    id="edit_prov_dir"
                    placeholder="Ej. Zona Industrial Mamonal Km 3, Cartagena"
                    value={editProveedorData.direccion_principal}
                    onChange={(e) =>
                      setEditProveedorData((prev) => ({
                        ...prev,
                        direccion_principal: e.target.value,
                      }))
                    }
                    className="h-10 text-sm bg-white border-slate-200 rounded-lg px-3"
                  />
                </div>

                {/* GPS */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="edit_prov_gps" className="text-xs font-semibold text-slate-700">
                      Enlace Ubicación GPS (Google Maps / Waze)
                    </Label>
                    <span className="text-[10px] text-slate-400">Opcional</span>
                  </div>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-emerald-500" />
                    <Input
                      id="edit_prov_gps"
                      placeholder="https://maps.google.com/?q=..."
                      value={editProveedorData.url_ubicacion}
                      onChange={(e) =>
                        setEditProveedorData((prev) => ({
                          ...prev,
                          url_ubicacion: e.target.value,
                        }))
                      }
                      className="h-10 pl-9 pr-3 text-xs bg-white border-slate-200 rounded-lg font-mono text-[11px]"
                    />
                  </div>
                </div>

                {/* Plazo de Pago y Tiempo de Entrega */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                  <div className="space-y-1.5 sm:col-span-7">
                    <Label htmlFor="edit_prov_plazo" className="text-xs font-semibold text-slate-700">
                      Plazo de Pago / Crédito
                    </Label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                      <select
                        id="edit_prov_plazo"
                        value={editProveedorData.terminos_credito}
                        onChange={(e) =>
                          setEditProveedorData((prev) => ({
                            ...prev,
                            terminos_credito: e.target.value,
                          }))
                        }
                        className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
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
                    <Label htmlFor="edit_prov_dias" className="text-xs font-semibold text-slate-700">
                      Tiempo de Entrega (Días)
                    </Label>
                    <Input
                      id="edit_prov_dias"
                      type="number"
                      min="0"
                      value={editProveedorData.tiempo_entrega_dias}
                      onChange={(e) =>
                        setEditProveedorData((prev) => ({
                          ...prev,
                          tiempo_entrega_dias: Number(e.target.value),
                        }))
                      }
                      className="h-10 text-sm bg-white border-slate-200 rounded-lg px-3 font-mono"
                    />
                  </div>
                </div>

                {/* Switches Comerciales y Logísticos */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="edit_prov_iva" className="text-xs font-bold text-slate-800 cursor-pointer">
                        Responsable de IVA
                      </Label>
                      <p className="text-[10px] text-slate-500">Aplica impuestos en órdenes de compra.</p>
                    </div>
                    <Switch
                      id="edit_prov_iva"
                      checked={editProveedorData.responsable_iva}
                      onCheckedChange={(c) =>
                        setEditProveedorData((prev) => ({ ...prev, responsable_iva: c }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-200/60 pt-2.5">
                    <div>
                      <Label htmlFor="edit_prov_entregas" className="text-xs font-bold text-slate-800 cursor-pointer">
                        Entrega a Domicilio / Sede Propia
                      </Label>
                      <p className="text-[10px] text-slate-500">Entrega directa en taller o sede propia de la empresa.</p>
                    </div>
                    <Switch
                      id="edit_prov_entregas"
                      checked={editProveedorData.realiza_entregas}
                      onCheckedChange={(c) =>
                        setEditProveedorData((prev) => ({ ...prev, realiza_entregas: c }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-200/60 pt-2.5">
                    <div>
                      <Label htmlFor="edit_prov_activo" className="text-xs font-bold text-slate-800 cursor-pointer">
                        Proveedor Activo
                      </Label>
                      <p className="text-[10px] text-slate-500">Habilitado para abastecimiento y requisiciones.</p>
                    </div>
                    <Switch
                      id="edit_prov_activo"
                      checked={editProveedorData.proveedor_activo}
                      onCheckedChange={(c) =>
                        setEditProveedorData((prev) => ({ ...prev, proveedor_activo: c }))
                      }
                    />
                  </div>
                </div>

                {/* Observaciones Logísticas */}
                <div className="space-y-1.5">
                  <Label htmlFor="edit_prov_obs" className="text-xs font-semibold text-slate-700">
                    Observaciones Logísticas / Despacho
                  </Label>
                  <Input
                    id="edit_prov_obs"
                    placeholder="Ej. Despachos martes y jueves, flete incluido..."
                    value={editProveedorData.observaciones_despacho}
                    onChange={(e) =>
                      setEditProveedorData((prev) => ({
                        ...prev,
                        observaciones_despacho: e.target.value,
                      }))
                    }
                    className="h-10 text-xs bg-white border-slate-200 rounded-lg px-3"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="p-4 px-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalEditarProveedorOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmittingEditProveedor}
                className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSubmittingEditProveedor ? (
                  <>
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Check className="mr-1.5 h-3.5 w-3.5" />
                    Guardar Cambios
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
