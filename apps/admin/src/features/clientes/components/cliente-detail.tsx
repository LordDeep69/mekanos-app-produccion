/**
 * MEKANOS S.A.S - Portal Admin
 * Componente: Detalle de Cliente
 */

'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
    PERIODICIDAD_LABELS,
    TIPO_CLIENTE_LABELS,
    type PeriodicidadMantenimientoEnum,
    type TipoClienteEnum,
} from '@/types/clientes';
import {
    ArrowLeft,
    Building2,
    Calendar,
    Clock,
    CreditCard,
    Globe,
    Mail,
    MapPin,
    Pencil,
    Percent,
    Phone,
    User,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCliente } from '../hooks/use-clientes';

interface ClienteDetailProps {
  clienteId: number;
}

export function ClienteDetail({ clienteId }: ClienteDetailProps) {
  const router = useRouter();
  const { data: cliente, isLoading, isError, error } = useCliente(clienteId);

  // Loading
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 flex-1" />
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  // Error
  if (isError) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-4">
          Error al cargar cliente: {(error as Error)?.message || 'Error desconocido'}
        </p>
        <Button onClick={() => router.push('/clientes')} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver al listado
        </Button>
      </div>
    );
  }

  if (!cliente) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">Cliente no encontrado</p>
        <Button onClick={() => router.push('/clientes')} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver al listado
        </Button>
      </div>
    );
  }

  const persona = cliente.persona;
  const nombreCliente = persona?.tipo_persona === 'JURIDICA'
    ? persona?.razon_social || persona?.nombre_comercial
    : persona?.nombre_completo;

  const formatDate = (date: string | null | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return '-';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push('/clientes')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{nombreCliente}</h1>
              <Badge variant={cliente.cliente_activo ? 'default' : 'destructive'}>
                {cliente.cliente_activo ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {cliente.codigo_cliente || `Cliente #${cliente.id_cliente}`}
            </p>
          </div>
        </div>
        <Button onClick={() => router.push(`/clientes/${clienteId}/editar`)}>
          <Pencil className="h-4 w-4 mr-2" />
          Editar Cliente
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Información de la Persona */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Información de Contacto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {persona && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Tipo Identificación</p>
                    <p className="font-medium">{persona.tipo_identificacion}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Número</p>
                    <p className="font-mono font-medium">{persona.numero_identificacion}</p>
                  </div>
                </div>

                <Separator />

                {persona.tipo_persona === 'JURIDICA' && (
                  <>
                    <div>
                      <p className="text-sm text-muted-foreground">Razón Social</p>
                      <p className="font-medium">{persona.razon_social || '-'}</p>
                    </div>
                    {persona.nombre_comercial && (
                      <div>
                        <p className="text-sm text-muted-foreground">Nombre Comercial</p>
                        <p className="font-medium">{persona.nombre_comercial}</p>
                      </div>
                    )}
                    {persona.representante_legal && (
                      <div>
                        <p className="text-sm text-muted-foreground">Representante Legal</p>
                        <p className="font-medium">{persona.representante_legal}</p>
                      </div>
                    )}
                  </>
                )}

                <div className="space-y-2">
                  {persona.telefono_principal && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{persona.telefono_principal}</span>
                    </div>
                  )}
                  {persona.celular && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{persona.celular} (Celular)</span>
                    </div>
                  )}
                  {persona.email_principal && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{persona.email_principal}</span>
                    </div>
                  )}
                  {persona.direccion_principal && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {persona.direccion_principal}
                        {persona.barrio_zona && `, ${persona.barrio_zona}`}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {persona.ciudad}{persona.departamento && `, ${persona.departamento}`}
                    </span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Información del Cliente */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Información del Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Tipo de Cliente</p>
                <Badge variant="secondary">
                  {TIPO_CLIENTE_LABELS[cliente.tipo_cliente as TipoClienteEnum] || cliente.tipo_cliente}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Periodicidad</p>
                <p className="font-medium">
                  {cliente.periodicidad_mantenimiento
                    ? PERIODICIDAD_LABELS[cliente.periodicidad_mantenimiento as PeriodicidadMantenimientoEnum]
                    : '-'}
                </p>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Inicio servicio:</span>
                <span className="text-sm font-medium">
                  {formatDate(cliente.fecha_inicio_servicio)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Último servicio:</span>
                <span className="text-sm font-medium">
                  {formatDate(cliente.fecha_ultimo_servicio)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Próximo servicio:</span>
                <span className="text-sm font-medium">
                  {formatDate(cliente.fecha_proximo_servicio)}
                </span>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Percent className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Descuento autorizado</span>
                </div>
                <span className="font-medium">{cliente.descuento_autorizado ?? 0}%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Tiene crédito</span>
                </div>
                <Badge variant={cliente.tiene_credito ? 'default' : 'secondary'}>
                  {cliente.tiene_credito ? 'Sí' : 'No'}
                </Badge>
              </div>
              {cliente.tiene_credito && (
                <>
                  <div className="flex items-center justify-between pl-6">
                    <span className="text-sm text-muted-foreground">Límite</span>
                    <span className="font-medium">{formatCurrency(cliente.limite_credito)}</span>
                  </div>
                  <div className="flex items-center justify-between pl-6">
                    <span className="text-sm text-muted-foreground">Días</span>
                    <span className="font-medium">{cliente.dias_credito ?? 0} días</span>
                  </div>
                </>
              )}
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <span className="text-sm">Acceso al portal</span>
              <Badge variant={cliente.tiene_acceso_portal ? 'default' : 'secondary'}>
                {cliente.tiene_acceso_portal ? 'Habilitado' : 'Deshabilitado'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Observaciones */}
        {(cliente.observaciones_servicio || cliente.requisitos_especiales) && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Observaciones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cliente.observaciones_servicio && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Observaciones del Servicio
                  </p>
                  <p className="text-sm whitespace-pre-wrap">
                    {cliente.observaciones_servicio}
                  </p>
                </div>
              )}
              {cliente.requisitos_especiales && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Requisitos Especiales
                  </p>
                  <p className="text-sm whitespace-pre-wrap">
                    {cliente.requisitos_especiales}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
