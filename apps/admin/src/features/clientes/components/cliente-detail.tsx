/**
 * MEKANOS S.A.S - Portal Admin
 * Componente: Detalle de Cliente (Vista 360° de Alto Impacto)
 *
 * Visualiza la información completa del cliente:
 * - Identificación y contacto con acciones directas (Llamar, WhatsApp, Email, Maps)
 * - Perfil comercial, asesor asignado, firma administrativa y condiciones financieras
 * - Cronograma y ciclo de vida de mantenimiento
 * - Requisitos especiales de acceso / SST y observaciones operativas
 * - Jerarquía Multi-Sede (Corporativo y Sedes vinculadas)
 * - Tabla de Equipos y Maquinaria con filtros y paginación corregida
 * - Historial y Trazabilidad 360° de Órdenes de Servicio
 */

'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDateSafe } from '@/lib/utils';
import {
  PERIODICIDAD_LABELS,
  TIPO_CLIENTE_LABELS,
  type PeriodicidadMantenimientoEnum,
  type TipoClienteEnum,
} from '@/types/clientes';
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Compass,
  Copy,
  CreditCard,
  Droplet,
  ExternalLink,
  FilePlus,
  FileText,
  Globe,
  History,
  Mail,
  MapPin,
  MessageSquare,
  Navigation,
  Pencil,
  Percent,
  Phone,
  Plus,
  Send,
  ShieldAlert,
  User,
  UserCheck,
  Users,
  Wrench,
  Zap,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { useCliente } from '../hooks/use-clientes';
import { BitacoraTab } from './bitacora-tab';
import { EquiposClienteTable } from './equipos-cliente-table';
import { TrazabilidadServiciosCliente } from './trazabilidad-servicios-cliente';

interface ClienteDetailProps {
  clienteId: number;
}

export function ClienteDetail({ clienteId }: ClienteDetailProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'general' | 'trazabilidad' | 'bitacora'>('general');
  const { data: cliente, isLoading, isError, error } = useCliente(clienteId);

  // Loading
  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse p-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-96 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  // Error
  if (isError) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-red-100 shadow-sm p-8">
        <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">Error al cargar cliente</h3>
        <p className="text-red-600 text-sm mb-6">
          {(error as Error)?.message || 'No fue posible obtener la información del cliente'}
        </p>
        <Button onClick={() => router.push('/clientes')} variant="outline" className="cursor-pointer">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver al listado de clientes
        </Button>
      </div>
    );
  }

  if (!cliente) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
        <p className="text-gray-500 mb-6 font-medium">Cliente no encontrado en la base de datos</p>
        <Button onClick={() => router.push('/clientes')} variant="outline" className="cursor-pointer">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver al listado
        </Button>
      </div>
    );
  }

  const persona = cliente.persona;
  const nombreBase = persona?.tipo_persona === 'JURIDICA'
    ? persona?.razon_social || persona?.nombre_comercial || 'Empresa Sin Nombre'
    : persona?.nombre_completo || `${persona?.primer_nombre || ''} ${persona?.primer_apellido || ''}`.trim() || 'Cliente Sin Nombre';
  
  const nombreCliente = cliente.nombre_sede
    ? `${nombreBase} - ${cliente.nombre_sede}`
    : nombreBase;

  const esSede = !!cliente.nombre_sede && !!cliente.id_cliente_principal;
  const esPrincipal = !!cliente.es_cliente_principal;

  // Helpers de formato y utilidades
  const formatDate = (date: string | null | undefined) => {
    if (!date) return 'Sin fecha registrada';
    return formatDateSafe(date, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (value: number | string | null | undefined) => {
    if (value == null) return '$ 0';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '$ 0';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(num);
  };

  const copyText = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado al portapapeles`);
  };

  const isMapsUrl = (url: string | null | undefined): boolean => {
    if (!url) return false;
    const clean = url.trim().toLowerCase();
    return (
      clean.startsWith('http://') ||
      clean.startsWith('https://') ||
      clean.includes('google.com/maps') ||
      clean.includes('maps.app.goo.gl') ||
      clean.includes('share.google')
    );
  };

  const formatWhatsAppUrl = (phone: string | null | undefined): string | null => {
    if (!phone) return null;
    const digits = phone.replace(/\D/g, '');
    if (!digits) return null;
    const full = digits.length === 10 && digits.startsWith('3') ? `57${digits}` : digits;
    return `https://wa.me/${full}`;
  };

  const getInitials = (name: string): string => {
    if (!name) return 'CL';
    const clean = name.replace(/^(EDIFICIO|CONJUNTO|HOTEL|EMPRESA|CLINICA|HOSPITAL)\s+/i, '').trim();
    const parts = (clean || name).trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const totalEquipos = cliente.equipos?.length ?? 0;
  const totalPlantas = cliente.total_equipos_plantas ?? cliente.equipos?.filter(e => (e as any).tipo === 'GENERADOR' || (e as any).id_tipo_equipo === 3).length ?? 0;
  const totalBombas = cliente.total_equipos_bombas ?? cliente.equipos?.filter(e => (e as any).tipo === 'BOMBA').length ?? 0;

  // Ubicación descriptiva y enlace de geolocalización satelital
  const ubicacionDescriptiva = persona?.direccion_principal && !isMapsUrl(persona.direccion_principal)
    ? persona.direccion_principal
    : (persona?.direccion_principal && !persona.direccion_principal.startsWith('http') ? persona.direccion_principal : null);

  const ubicacionUrl = (persona as any)?.url_ubicacion
    ? (persona as any).url_ubicacion
    : (isMapsUrl(persona?.direccion_principal) ? persona?.direccion_principal : null);

  return (
    <div className="space-y-6">
      {/* ── HEADER PRINCIPAL ── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 md:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
          {/* Lado izquierdo: Avatar + Nombre + Badges + Breadcrumb */}
          <div className="flex items-start gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.push('/clientes')}
              className="mt-1 shrink-0 rounded-xl hover:bg-gray-100 cursor-pointer"
              title="Volver al listado"
            >
              <ArrowLeft className="h-4 w-4 text-gray-600" />
            </Button>

            <div className="flex items-start gap-3.5">
              {/* Avatar con iniciales corporativas */}
              <div className="hidden sm:flex h-13 w-13 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 text-white font-extrabold text-lg items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                {getInitials(nombreCliente)}
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">
                    {nombreCliente}
                  </h1>

                  {/* Estado Activo / Inactivo */}
                  <Badge
                    variant={cliente.cliente_activo ? 'default' : 'destructive'}
                    className={`font-bold px-2.5 py-0.5 rounded-full text-xs shadow-2xs ${
                      cliente.cliente_activo ? 'bg-emerald-600 hover:bg-emerald-700' : ''
                    }`}
                  >
                    {cliente.cliente_activo ? 'Activo' : 'Inactivo'}
                  </Badge>

                  {/* Badges de clasificación de sede */}
                  {esSede && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-semibold text-xs">
                      <Building2 className="h-3 w-3 mr-1" />
                      Sede Sucursal
                    </Badge>
                  )}
                  {esPrincipal && (
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 font-semibold text-xs">
                      <Building2 className="h-3 w-3 mr-1" />
                      Corporativo Principal
                    </Badge>
                  )}

                  {/* Badge Tipo de Cliente */}
                  <Badge variant="secondary" className="bg-gray-100 text-gray-700 font-semibold text-xs">
                    {TIPO_CLIENTE_LABELS[cliente.tipo_cliente as TipoClienteEnum] || cliente.tipo_cliente}
                  </Badge>
                </div>

                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                  <span className="font-mono font-medium text-gray-700">
                    {cliente.codigo_cliente || `Cliente #${cliente.id_cliente}`}
                  </span>
                  {persona?.numero_identificacion && (
                    <>
                      <span className="text-gray-300">•</span>
                      <span className="font-mono">
                        {persona.tipo_identificacion}: {persona.numero_identificacion}
                      </span>
                    </>
                  )}
                  {persona?.ciudad && (
                    <>
                      <span className="text-gray-300">•</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-gray-400" />
                        {persona.ciudad}{persona.departamento ? `, ${persona.departamento}` : ''}
                      </span>
                    </>
                  )}
                </div>

                {/* Si es sede, link a la principal */}
                {esSede && cliente.cliente_principal && (
                  <p className="text-xs text-blue-600 mt-1.5 flex items-center gap-1 font-medium">
                    <span>Sede vinculada a:</span>
                    <button
                      onClick={() => router.push(`/clientes/${cliente.id_cliente_principal}`)}
                      className="underline hover:text-blue-800 font-bold cursor-pointer"
                    >
                      {cliente.cliente_principal.persona?.razon_social ||
                        cliente.cliente_principal.persona?.nombre_comercial ||
                        `Cliente Principal #${cliente.id_cliente_principal}`}
                    </button>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Lado derecho: Acciones rápidas (CRM & Órdenes) */}
          <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto justify-end pt-3 lg:pt-0 border-t lg:border-t-0 border-gray-100">
            {/* Botón Nueva Orden */}
            <Button
              size="sm"
              onClick={() => router.push(`/ordenes/nueva?id_cliente=${clienteId}`)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-2xs text-xs flex items-center gap-1.5 cursor-pointer"
              title="Crear una nueva orden de servicio para este cliente"
            >
              <FilePlus className="h-3.5 w-3.5" />
              Nueva Orden
            </Button>

            {/* Botón Registrar Equipo */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push(`/equipos/nuevo?id_cliente=${clienteId}`)}
              className="border-blue-200 text-blue-700 hover:bg-blue-50 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
              title="Registrar una nueva máquina o equipo a este cliente"
            >
              <Plus className="h-3.5 w-3.5" />
              Registrar Equipo
            </Button>

            {/* Botón Editar Cliente */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push(`/clientes/${clienteId}/editar`)}
              className="border-gray-300 text-gray-700 hover:bg-gray-100 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Pencil className="h-3.5 w-3.5" />
              Editar Cliente
            </Button>
          </div>
        </div>

        {/* ── KPI QUICK STATS STRIP ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-5 border-t border-gray-100">
          {/* KPI 1: Equipos */}
          <div
            onClick={() => setActiveTab('general')}
            className="p-3 bg-blue-50/60 hover:bg-blue-50 border border-blue-100/80 rounded-xl transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
                Equipos Asociados
              </span>
              <Wrench className="h-4 w-4 text-blue-500 group-hover:scale-110 transition-transform" />
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-blue-900">{totalEquipos}</span>
              <div className="flex items-center gap-1 text-[11px] text-blue-700">
                {totalPlantas > 0 && <span>⚡ {totalPlantas} Plantas</span>}
                {totalBombas > 0 && <span>💧 {totalBombas} Bombas</span>}
              </div>
            </div>
          </div>

          {/* KPI 2: Órdenes de servicio */}
          <div
            onClick={() => setActiveTab('trazabilidad')}
            className="p-3 bg-purple-50/60 hover:bg-purple-50 border border-purple-100/80 rounded-xl transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700">
                Órdenes Ejecutadas
              </span>
              <History className="h-4 w-4 text-purple-500 group-hover:scale-110 transition-transform" />
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-purple-900">
                {(cliente as any).total_ordenes ?? 'Ver'}
              </span>
              <span className="text-[11px] text-purple-700 font-medium underline">
                Trazabilidad 360°
              </span>
            </div>
          </div>

          {/* KPI 3: Condición Comercial */}
          <div className="p-3 bg-emerald-50/60 border border-emerald-100/80 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                Condición de Pago
              </span>
              <CreditCard className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-1">
              <p className="text-sm font-extrabold text-emerald-900 truncate">
                {cliente.tiene_credito
                  ? `${formatCurrency(cliente.limite_credito)}`
                  : 'Contado (Sin Crédito)'}
              </p>
              <p className="text-[11px] text-emerald-700 font-medium">
                {cliente.tiene_credito ? `${cliente.dias_credito ?? 0} días crédito` : 'Pago contraentrega'}
                {cliente.descuento_autorizado ? ` • Desc: ${cliente.descuento_autorizado}%` : ''}
              </p>
            </div>
          </div>

          {/* KPI 4: Próximo Mantenimiento */}
          <div className="p-3 bg-amber-50/60 border border-amber-100/80 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                Próximo Servicio
              </span>
              <Calendar className="h-4 w-4 text-amber-500" />
            </div>
            <div className="mt-1">
              <p className="text-sm font-extrabold text-amber-900 truncate">
                {cliente.fecha_proximo_servicio
                  ? formatDateSafe(cliente.fecha_proximo_servicio, { day: 'numeric', month: 'short', year: 'numeric' })
                  : 'Por agendar'}
              </p>
              <p className="text-[11px] text-amber-700 font-medium truncate">
                {cliente.periodicidad_mantenimiento
                  ? `Rutina: ${PERIODICIDAD_LABELS[cliente.periodicidad_mantenimiento as PeriodicidadMantenimientoEnum]}`
                  : 'Periodicidad sin definir'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── PESTAÑAS PRINCIPALES ── */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="space-y-4">
        <TabsList className="bg-gray-100 p-1 rounded-xl">
          <TabsTrigger value="general" className="rounded-lg font-bold text-xs cursor-pointer">
            <Building2 className="h-3.5 w-3.5 mr-1.5" />
            Visión General
          </TabsTrigger>
          <TabsTrigger value="trazabilidad" className="rounded-lg font-bold text-xs cursor-pointer flex items-center gap-1.5">
            <History className="h-3.5 w-3.5" />
            Historial de Servicios (Trazabilidad 360°)
          </TabsTrigger>
          {esPrincipal && (
            <TabsTrigger value="bitacora" className="rounded-lg font-bold text-xs cursor-pointer flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5" />
              Bitácora Mensual
            </TabsTrigger>
          )}
        </TabsList>

        {/* ── TAB 1: GENERAL ── */}
        <TabsContent value="general" className="space-y-6 mt-4">
          <div className="grid md:grid-cols-2 gap-6">
            {/* TARJETA 1: IDENTIFICACIÓN Y CONTACTO DIRECTO */}
            <Card className="border border-gray-200 shadow-sm overflow-hidden">
              <CardHeader className="bg-gray-50/70 border-b border-gray-100 p-4 px-5">
                <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-600" />
                  Contacto y Representación Legal
                </CardTitle>
                <CardDescription className="text-xs text-gray-500">
                  Canales de comunicación directa, datos jurídicos y geolocalización
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                {persona && (
                  <>
                    {/* Identificación */}
                    <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <div>
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Tipo Documento</p>
                        <p className="font-bold text-sm text-gray-800">{persona.tipo_identificacion}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Número Documento</p>
                        <div className="flex items-center gap-1.5">
                          <p className="font-mono font-bold text-sm text-gray-900">{persona.numero_identificacion}</p>
                          <button
                            type="button"
                            onClick={() => copyText(persona.numero_identificacion, 'Número de documento')}
                            className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-700 transition-colors"
                            title="Copiar documento"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Nombres Jurídicos / Persona */}
                    <div className="space-y-2 text-sm">
                      {persona.tipo_persona === 'JURIDICA' && (
                        <>
                          <div>
                            <span className="text-xs text-gray-500 font-medium block">Razón Social:</span>
                            <span className="font-bold text-gray-900">{persona.razon_social || '-'}</span>
                          </div>
                          {persona.nombre_comercial && (
                            <div>
                              <span className="text-xs text-gray-500 font-medium block">Nombre Comercial:</span>
                              <span className="font-semibold text-gray-800">{persona.nombre_comercial}</span>
                            </div>
                          )}
                          {persona.representante_legal && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-gray-100">
                              <div>
                                <span className="text-xs text-gray-500 font-medium block">Representante Legal:</span>
                                <span className="font-semibold text-gray-900">{persona.representante_legal}</span>
                              </div>
                              {persona.cedula_representante && (
                                <div>
                                  <span className="text-xs text-gray-500 font-medium block">Cédula Representante:</span>
                                  <span className="font-mono font-medium text-gray-800">{persona.cedula_representante}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}

                      {persona.tipo_persona === 'NATURAL' && (
                        <div>
                          <span className="text-xs text-gray-500 font-medium block">Nombre Completo:</span>
                          <span className="font-bold text-gray-900">{nombreBase}</span>
                        </div>
                      )}
                    </div>

                    <Separator className="my-2" />

                    {/* Canales de Contacto Directo */}
                    <div className="space-y-2.5">
                      <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">Canales de Contacto:</p>

                      {/* Celular con botón WhatsApp */}
                      {persona.celular && (
                        <div className="flex items-center justify-between p-2.5 bg-gray-50 hover:bg-gray-100/80 rounded-xl border border-gray-100 transition-colors">
                          <div className="flex items-center gap-2.5 text-sm">
                            <Phone className="h-4 w-4 text-emerald-600" />
                            <div>
                              <span className="font-bold text-gray-900">{persona.celular}</span>
                              <span className="text-[11px] text-gray-500 ml-1.5">(Celular)</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {formatWhatsAppUrl(persona.celular) && (
                              <a
                                href={formatWhatsAppUrl(persona.celular)!}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors"
                                title="Chatear por WhatsApp"
                              >
                                <MessageSquare className="h-3 w-3" />
                                WhatsApp
                              </a>
                            )}
                            <a
                              href={`tel:${persona.celular.replace(/\D/g, '')}`}
                              className="p-1.5 text-gray-600 hover:bg-gray-200 rounded-lg text-xs"
                              title="Llamar"
                            >
                              <Phone className="h-3.5 w-3.5" />
                            </a>
                          </div>
                        </div>
                      )}

                      {/* Teléfono fijo */}
                      {persona.telefono_principal && (
                        <div className="flex items-center justify-between p-2 bg-gray-50 rounded-xl border border-gray-100 text-sm">
                          <div className="flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5 text-gray-500" />
                            <span>{persona.telefono_principal} (Fijo)</span>
                          </div>
                          <a
                            href={`tel:${persona.telefono_principal.replace(/\D/g, '')}`}
                            className="px-2 py-0.5 text-xs text-blue-600 font-bold hover:underline"
                          >
                            Llamar
                          </a>
                        </div>
                      )}

                      {/* Email principal */}
                      {persona.email_principal && (
                        <div className="flex items-center justify-between p-2.5 bg-gray-50 hover:bg-gray-100/80 rounded-xl border border-gray-100 transition-colors">
                          <div className="flex items-center gap-2 text-sm truncate mr-2">
                            <Mail className="h-4 w-4 text-blue-600 shrink-0" />
                            <a
                              href={`mailto:${persona.email_principal}`}
                              className="font-medium text-blue-700 hover:underline truncate"
                            >
                              {persona.email_principal}
                            </a>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyText(persona.email_principal!, 'Correo')}
                            className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded"
                            title="Copiar correo"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      )}

                      {/* Correos adicionales */}
                      {(cliente as any).emails_notificacion && (
                        <div className="p-2.5 bg-blue-50/50 rounded-xl border border-blue-100 space-y-1.5">
                          <p className="text-[11px] font-bold text-blue-900 flex items-center gap-1">
                            <Mail className="h-3 w-3 text-blue-600" />
                            Correos adicionales para informes y notificaciones:
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {(cliente as any).emails_notificacion
                              .split(';;')
                              .filter((e: string) => e.trim())
                              .map((email: string, idx: number) => (
                                <a
                                  key={idx}
                                  href={`mailto:${email.trim()}`}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-white text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors shadow-2xs"
                                >
                                  <Mail className="h-3 w-3 text-blue-500" />
                                  {email.trim()}
                                </a>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <Separator className="my-2" />

                    {/* Ubicación y Geolocalización (Dos apartados independientes) */}
                    <div className="space-y-3 pt-1">
                      <p className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-blue-600" />
                        Ubicación y Geolocalización:
                      </p>

                      {/* 1. Ubicación Descriptiva */}
                      {ubicacionDescriptiva ? (
                        <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-sm space-y-1">
                          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                            Ubicación Descriptiva (Dirección / Acceso)
                          </span>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2">
                              <MapPin className="h-4 w-4 text-slate-500 mt-0.5 shrink-0" />
                              <div>
                                <span className="font-semibold text-gray-900 leading-snug block">
                                  {ubicacionDescriptiva}
                                </span>
                                {persona.barrio_zona && (
                                  <span className="text-xs text-gray-500 block mt-0.5">
                                    Barrio / Zona: {persona.barrio_zona}
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => copyText(ubicacionDescriptiva, 'Dirección')}
                              className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded shrink-0 cursor-pointer"
                              title="Copiar dirección"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-2.5 bg-gray-50/60 rounded-xl border border-dashed border-gray-200 text-xs text-gray-400 italic">
                          Sin dirección descriptiva registrada
                        </div>
                      )}

                      {/* 2. Ubicación desde Google Maps / URL */}
                      {ubicacionUrl ? (
                        <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                              <Compass className="h-4 w-4 text-emerald-600" />
                              Ubicación Google Maps / Satelital
                            </div>
                            <span className="text-[10px] bg-emerald-200 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                              GPS Activo
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 break-all font-mono line-clamp-1">
                            {ubicacionUrl}
                          </p>
                          <div className="flex items-center gap-2 pt-0.5">
                            <a
                              href={ubicacionUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center gap-1.5 flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-all shadow-2xs cursor-pointer"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              Abrir en Google Maps / Waze
                            </a>
                            <button
                              type="button"
                              onClick={() => copyText(ubicacionUrl, 'Enlace de ubicación')}
                              className="p-2 bg-white hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                              title="Copiar enlace"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        ubicacionDescriptiva && (
                          <div className="flex items-center justify-between p-2.5 bg-blue-50/50 rounded-xl border border-blue-100 text-xs text-blue-800">
                            <span className="flex items-center gap-1.5">
                              <Compass className="h-3.5 w-3.5 text-blue-600" />
                              Búsqueda satelital por dirección
                            </span>
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                `${ubicacionDescriptiva}, ${persona.ciudad}, Colombia`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-700 font-bold hover:underline inline-flex items-center gap-1"
                            >
                              Buscar en Maps
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        )
                      )}

                      <div className="flex items-center gap-2 text-xs text-gray-600 pl-1 pt-0.5">
                        <Globe className="h-3.5 w-3.5 text-gray-400" />
                        <span>
                          {persona.ciudad}
                          {persona.departamento ? `, ${persona.departamento}` : ''}
                          {persona.pais ? ` • ${persona.pais}` : ''}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* TARJETA 2: PERFIL COMERCIAL Y ADMINISTRATIVO */}
            <Card className="border border-gray-200 shadow-sm overflow-hidden">
              <CardHeader className="bg-gray-50/70 border-b border-gray-100 p-4 px-5">
                <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-indigo-600" />
                  Perfil Comercial y Administrativo
                </CardTitle>
                <CardDescription className="text-xs text-gray-500">
                  Condiciones contractuales, asesor asignado y firmas
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                {/* Tipo de cliente y Periodicidad */}
                <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Tipo de Cliente</p>
                    <Badge variant="secondary" className="mt-1 font-bold text-xs bg-indigo-50 text-indigo-700 border-indigo-200">
                      {TIPO_CLIENTE_LABELS[cliente.tipo_cliente as TipoClienteEnum] || cliente.tipo_cliente}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Periodicidad Mantenimiento</p>
                    <p className="font-bold text-sm text-gray-900 mt-1 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-indigo-500" />
                      {cliente.periodicidad_mantenimiento
                        ? PERIODICIDAD_LABELS[cliente.periodicidad_mantenimiento as PeriodicidadMantenimientoEnum]
                        : 'Sin definir'}
                    </p>
                  </div>
                </div>

                {/* Asesor Asignado */}
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-1">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                    <UserCheck className="h-3 w-3 text-indigo-600" />
                    Asesor / Ingeniero Asignado:
                  </p>
                  {cliente.asesor_asignado ? (
                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <p className="font-bold text-sm text-gray-900">
                          {cliente.asesor_asignado.persona?.nombre_completo ||
                            `${cliente.asesor_asignado.persona?.primer_nombre || ''} ${cliente.asesor_asignado.persona?.primer_apellido || ''}`}
                        </p>
                        <p className="text-xs text-gray-500">
                          {cliente.asesor_asignado.cargo || 'Asesor Comercial / Técnico'}
                        </p>
                      </div>
                      {cliente.asesor_asignado.persona?.celular && (
                        <a
                          href={`tel:${cliente.asesor_asignado.persona.celular.replace(/\D/g, '')}`}
                          className="px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-100 hover:bg-indigo-200 rounded-lg transition-colors flex items-center gap-1"
                        >
                          <Phone className="h-3 w-3" />
                          Llamar
                        </a>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 italic pt-1">Sin asesor asignado actualmente</p>
                  )}
                </div>

                {/* Firma Administrativa */}
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-1">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                    <Building2 className="h-3 w-3 text-indigo-600" />
                    Firma Administrativa / Administrador PH:
                  </p>
                  {cliente.firma_administrativa ? (
                    <div className="pt-1 space-y-1 text-sm">
                      <p className="font-bold text-gray-900">
                        {cliente.firma_administrativa.nombre_de_firma || `Firma #${cliente.firma_administrativa.id_firma_administrativa}`}
                      </p>
                      {cliente.firma_administrativa.representante_legal && (
                        <p className="text-xs text-gray-600">
                          Contacto: <span className="font-semibold text-gray-800">{cliente.firma_administrativa.representante_legal}</span>
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-gray-600 pt-1">
                        {cliente.firma_administrativa.contacto_de_representante_legal && (
                          <a
                            href={`tel:${String(cliente.firma_administrativa.contacto_de_representante_legal).replace(/\D/g, '')}`}
                            className="text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <Phone className="h-3 w-3" />
                            {String(cliente.firma_administrativa.contacto_de_representante_legal)}
                          </a>
                        )}
                        {cliente.firma_administrativa.email_representante_legal && (
                          <a
                            href={`mailto:${cliente.firma_administrativa.email_representante_legal}`}
                            className="text-blue-600 hover:underline flex items-center gap-1 truncate"
                          >
                            <Mail className="h-3 w-3" />
                            {cliente.firma_administrativa.email_representante_legal}
                          </a>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 italic pt-1">Sin firma administrativa (Cliente directo)</p>
                  )}
                </div>

                {/* Cuenta de email para informes */}
                {cliente.cuenta_email && (
                  <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-gray-400 font-bold block uppercase tracking-wider text-[10px]">Email Emisor para Informes:</span>
                      <span className="font-mono text-gray-800 font-semibold">{cliente.cuenta_email.email}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] text-gray-600 bg-white">
                      Remitente
                    </Badge>
                  </div>
                )}

                <Separator className="my-2" />

                {/* Condiciones Financieras y Crédito */}
                <div className="space-y-2.5">
                  <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">Condiciones Financieras y Crédito:</p>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                      <span className="text-gray-600">Descuento autorizado:</span>
                      <span className="font-extrabold text-gray-900">{cliente.descuento_autorizado ?? 0}%</span>
                    </div>
                    <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                      <span className="text-gray-600">Línea de crédito:</span>
                      <Badge variant={cliente.tiene_credito ? 'default' : 'secondary'} className="font-bold text-[10px]">
                        {cliente.tiene_credito ? 'Habilitado' : 'No'}
                      </Badge>
                    </div>
                  </div>

                  {cliente.tiene_credito && (
                    <div className="grid grid-cols-2 gap-2 p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 text-xs">
                      <div>
                        <span className="text-emerald-700 font-medium block">Límite Aprobado:</span>
                        <span className="font-extrabold text-sm text-emerald-900">{formatCurrency(cliente.limite_credito)}</span>
                      </div>
                      <div>
                        <span className="text-emerald-700 font-medium block">Días de Crédito:</span>
                        <span className="font-extrabold text-sm text-emerald-900">{cliente.dias_credito ?? 0} días</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl border border-gray-100 text-xs">
                    <span className="text-gray-700 font-medium">Acceso a Portal de Clientes:</span>
                    <Badge
                      variant={cliente.tiene_acceso_portal ? 'default' : 'secondary'}
                      className={cliente.tiene_acceso_portal ? 'bg-emerald-600' : ''}
                    >
                      {cliente.tiene_acceso_portal ? 'Habilitado' : 'Deshabilitado'}
                    </Badge>
                  </div>
                </div>

                <Separator className="my-2" />

                {/* Ciclo de Vida y Fechas */}
                <div className="space-y-2 text-xs">
                  <p className="font-bold text-gray-700 uppercase tracking-wider text-[11px]">Cronograma de Servicios:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
                      <span className="text-gray-400 block text-[10px]">Inicio Servicio:</span>
                      <span className="font-semibold text-gray-800">{formatDate(cliente.fecha_inicio_servicio)}</span>
                    </div>
                    <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
                      <span className="text-gray-400 block text-[10px]">Último Servicio:</span>
                      <span className="font-semibold text-gray-800">{formatDate(cliente.fecha_ultimo_servicio)}</span>
                    </div>
                    <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
                      <span className="text-gray-400 block text-[10px]">Próximo Servicio:</span>
                      <span className="font-semibold text-gray-800">{formatDate(cliente.fecha_proximo_servicio)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* TARJETA 3: REQUISITOS ESPECIALES DE SEGURIDAD (SST / ACCESO) Y OBSERVACIONES */}
            {(cliente.requisitos_especiales || cliente.observaciones_servicio) ? (
              <Card className="md:col-span-2 border border-gray-200 shadow-sm overflow-hidden">
                <CardHeader className="bg-gray-50/70 border-b border-gray-100 p-4 px-5">
                  <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-amber-600" />
                    Condiciones Operativas y Requisitos Especiales (SST)
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-500">
                    Instrucciones críticas de ingreso, seguridad y directrices de servicio
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  {/* Requisitos especiales destacados */}
                  {cliente.requisitos_especiales && (
                    <div className="p-4 bg-amber-50/80 border-2 border-amber-300 rounded-xl space-y-1.5">
                      <div className="flex items-center gap-2 text-xs font-bold text-amber-900 uppercase tracking-wider">
                        <ShieldAlert className="h-4 w-4 text-amber-600" />
                        Requisitos Especiales de Acceso / Seguridad Industrial (SST):
                      </div>
                      <p className="text-sm text-amber-950 font-medium whitespace-pre-wrap leading-relaxed">
                        {cliente.requisitos_especiales}
                      </p>
                    </div>
                  )}

                  {/* Observaciones generales de servicio */}
                  {cliente.observaciones_servicio && (
                    <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 space-y-1">
                      <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Observaciones del Servicio:
                      </p>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                        {cliente.observaciones_servicio}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : null}

            {/* TARJETA 4: RED DE SEDES (Si es corporativo principal) */}
            {esPrincipal && cliente.sedes && cliente.sedes.length > 0 && (
              <Card className="md:col-span-2 border border-gray-200 shadow-sm overflow-hidden">
                <CardHeader className="bg-gray-50/70 border-b border-gray-100 p-4 px-5">
                  <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-purple-600" />
                    Sedes Vinculadas a este Corporativo ({cliente.sedes.length})
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-500">
                    Red de sucursales que dependen de esta cuenta principal
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {cliente.sedes.map((sede: any) => (
                      <button
                        key={sede.id_cliente}
                        onClick={() => router.push(`/clientes/${sede.id_cliente}`)}
                        className="flex items-center justify-between p-3.5 rounded-xl border border-gray-200 hover:border-purple-300 hover:bg-purple-50/50 transition-all text-left shadow-2xs group cursor-pointer"
                      >
                        <div>
                          <p className="font-bold text-sm text-gray-900 group-hover:text-purple-700 transition-colors">
                            {sede.nombre_sede || 'Sede Sin Nombre'}
                          </p>
                          <p className="text-xs text-gray-500 font-mono mt-0.5">
                            {sede.codigo_cliente || `Cliente #${sede.id_cliente}`}
                          </p>
                        </div>
                        <ArrowLeft className="h-4 w-4 rotate-180 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* TARJETA 5: TABLA DE EQUIPOS ASOCIADOS (Full Width) */}
            <div className="md:col-span-2">
              <EquiposClienteTable clienteId={clienteId} />
            </div>
          </div>
        </TabsContent>

        {/* ── TAB 2: TRAZABILIDAD 360° ── */}
        <TabsContent value="trazabilidad" className="mt-4">
          <TrazabilidadServiciosCliente
            clienteId={clienteId}
            clienteNombre={nombreCliente || 'Cliente'}
          />
        </TabsContent>

        {/* ── TAB 3: BITÁCORA (Solo Principal) ── */}
        {esPrincipal && (
          <TabsContent value="bitacora" className="mt-4">
            <BitacoraTab
              clienteId={clienteId}
              clienteNombre={nombreCliente || 'Cliente'}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
