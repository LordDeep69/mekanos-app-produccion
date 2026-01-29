/**
 * MEKANOS S.A.S - Portal Admin
 * Formulario de Cliente (Crear/Editar)
 * 
 * REFACTORIZADO: Ahora permite crear persona + cliente en un solo formulario
 */

'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useFirmasAdministrativas } from '@/features/firmas-administrativas';
import { useToast } from '@/hooks/use-toast';
import {
  CreateClienteDto,
  PERIODICIDAD_LABELS,
  PeriodicidadMantenimientoEnum,
  TIPO_CLIENTE_LABELS,
  TipoClienteEnum,
  TipoIdentificacionEnum,
  TipoPersonaEnum,
} from '@/types/clientes';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Building2, Loader2, Save, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useCliente, useCreateCliente, useUpdateCliente } from '../hooks/use-clientes';

// Labels para tipo de identificación
const TIPO_IDENTIFICACION_LABELS: Record<TipoIdentificacionEnum, string> = {
  [TipoIdentificacionEnum.CC]: 'Cédula de Ciudadanía',
  [TipoIdentificacionEnum.CE]: 'Cédula de Extranjería',
  [TipoIdentificacionEnum.NIT]: 'NIT',
  [TipoIdentificacionEnum.PASAPORTE]: 'Pasaporte',
  [TipoIdentificacionEnum.TI]: 'Tarjeta de Identidad',
  [TipoIdentificacionEnum.RC]: 'Registro Civil',
};

const TIPO_PERSONA_LABELS: Record<TipoPersonaEnum, string> = {
  [TipoPersonaEnum.NATURAL]: 'Persona Natural',
  [TipoPersonaEnum.JURIDICA]: 'Persona Jurídica (Empresa)',
};

// Schema de validación Zod - NUEVO con datos de persona
const clienteFormSchema = z.object({
  // ===== DATOS DE PERSONA =====
  tipo_identificacion: z.nativeEnum(TipoIdentificacionEnum),
  numero_identificacion: z.string().min(5, 'El documento debe tener al menos 5 caracteres'),
  tipo_persona: z.nativeEnum(TipoPersonaEnum),
  // Persona Natural
  primer_nombre: z.string().optional(),
  segundo_nombre: z.string().optional(),
  primer_apellido: z.string().optional(),
  segundo_apellido: z.string().optional(),
  // Persona Jurídica
  razon_social: z.string().optional(),
  nombre_comercial: z.string().optional(),
  representante_legal: z.string().optional(),
  cedula_representante: z.string().optional(),
  // Contacto
  email_principal: z.string().email('Email inválido').optional().or(z.literal('')),
  telefono_principal: z.string().optional(),
  celular: z.string().optional(),
  direccion_principal: z.string().optional(),
  ciudad: z.string().optional(),
  departamento: z.string().optional(),

  // ===== DATOS DE CLIENTE =====
  tipo_cliente: z.nativeEnum(TipoClienteEnum),
  periodicidad_mantenimiento: z.nativeEnum(PeriodicidadMantenimientoEnum).optional(),

  // Configuración comercial
  descuento_autorizado: z.number().min(0).max(100).optional(),
  tiene_credito: z.boolean().optional(),
  limite_credito: z.number().min(0).optional(),
  dias_credito: z.number().min(0).optional(),

  // Estado
  cliente_activo: z.boolean().optional(),
  tiene_acceso_portal: z.boolean().optional(),

  // Observaciones
  observaciones_servicio: z.string().optional(),
  requisitos_especiales: z.string().optional(),

  // Firma Administrativa (opcional)
  id_firma_administrativa: z.number().nullable().optional(),
}).refine((data) => {
  // Validar que persona jurídica tenga razón social
  if (data.tipo_persona === TipoPersonaEnum.JURIDICA) {
    return data.razon_social && data.razon_social.length >= 3;
  }
  // Validar que persona natural tenga nombres
  return data.primer_nombre && data.primer_apellido;
}, {
  message: 'Complete los datos obligatorios según el tipo de persona',
  path: ['razon_social'],
});

type ClienteFormValues = z.infer<typeof clienteFormSchema>;

interface ClienteFormProps {
  clienteId?: number;
  mode: 'crear' | 'editar';
}

export function ClienteForm({ clienteId, mode }: ClienteFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  // Queries/Mutations
  const { data: cliente, isLoading: isLoadingCliente } = useCliente(
    clienteId ?? 0,
    { enabled: mode === 'editar' && !!clienteId }
  );
  const createMutation = useCreateCliente();
  const updateMutation = useUpdateCliente();

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  // Form
  const form = useForm<ClienteFormValues>({
    resolver: zodResolver(clienteFormSchema),
    defaultValues: {
      // Persona
      tipo_identificacion: TipoIdentificacionEnum.NIT,
      numero_identificacion: '',
      tipo_persona: TipoPersonaEnum.JURIDICA,
      primer_nombre: '',
      segundo_nombre: '',
      primer_apellido: '',
      segundo_apellido: '',
      razon_social: '',
      nombre_comercial: '',
      representante_legal: '',
      cedula_representante: '',
      email_principal: '',
      telefono_principal: '',
      celular: '',
      direccion_principal: '',
      ciudad: 'Bogotá',
      departamento: 'Cundinamarca',
      // Cliente
      tipo_cliente: TipoClienteEnum.COMERCIAL,
      periodicidad_mantenimiento: PeriodicidadMantenimientoEnum.SIN_DEFINIR,
      descuento_autorizado: 0,
      tiene_credito: false,
      limite_credito: 0,
      dias_credito: 0,
      cliente_activo: true,
      tiene_acceso_portal: false,
      observaciones_servicio: '',
      requisitos_especiales: '',
      id_firma_administrativa: null,
    },
  });

  // Query para firmas administrativas
  const { data: firmasData } = useFirmasAdministrativas({ firma_activa: true });
  const firmasAdministrativas = firmasData?.data ?? [];

  const tipoPersona = form.watch('tipo_persona');

  // Cargar datos del cliente en modo editar
  useEffect(() => {
    if (mode === 'editar' && cliente) {
      const persona = cliente.persona;
      form.reset({
        // Persona (solo lectura en editar)
        tipo_identificacion: persona?.tipo_identificacion as TipoIdentificacionEnum || TipoIdentificacionEnum.NIT,
        numero_identificacion: persona?.numero_identificacion || '',
        tipo_persona: persona?.tipo_persona as TipoPersonaEnum || TipoPersonaEnum.JURIDICA,
        primer_nombre: persona?.primer_nombre || '',
        segundo_nombre: persona?.segundo_nombre || '',
        primer_apellido: persona?.primer_apellido || '',
        segundo_apellido: persona?.segundo_apellido || '',
        razon_social: persona?.razon_social || '',
        nombre_comercial: persona?.nombre_comercial || '',
        representante_legal: persona?.representante_legal || '',
        cedula_representante: persona?.cedula_representante || '',
        email_principal: persona?.email_principal || '',
        telefono_principal: persona?.telefono_principal || '',
        celular: persona?.celular || '',
        direccion_principal: persona?.direccion_principal || '',
        ciudad: persona?.ciudad || 'Bogotá',
        departamento: persona?.departamento || '',
        // Cliente
        tipo_cliente: cliente.tipo_cliente,
        periodicidad_mantenimiento: cliente.periodicidad_mantenimiento ?? PeriodicidadMantenimientoEnum.SIN_DEFINIR,
        descuento_autorizado: cliente.descuento_autorizado ?? 0,
        tiene_credito: cliente.tiene_credito ?? false,
        limite_credito: cliente.limite_credito ?? 0,
        dias_credito: cliente.dias_credito ?? 0,
        cliente_activo: cliente.cliente_activo ?? true,
        tiene_acceso_portal: cliente.tiene_acceso_portal ?? false,
        observaciones_servicio: cliente.observaciones_servicio ?? '',
        requisitos_especiales: cliente.requisitos_especiales ?? '',
        id_firma_administrativa: cliente.id_firma_administrativa ?? null,
      });
    }
  }, [cliente, mode, form]);

  // Submit handler
  const onSubmit = async (values: ClienteFormValues) => {
    try {
      if (mode === 'crear') {
        // Construir payload con persona anidada
        const payload = {
          persona: {
            tipo_identificacion: values.tipo_identificacion,
            numero_identificacion: values.numero_identificacion,
            tipo_persona: values.tipo_persona,
            primer_nombre: values.primer_nombre || undefined,
            segundo_nombre: values.segundo_nombre || undefined,
            primer_apellido: values.primer_apellido || undefined,
            segundo_apellido: values.segundo_apellido || undefined,
            razon_social: values.razon_social || undefined,
            nombre_comercial: values.nombre_comercial || undefined,
            representante_legal: values.representante_legal || undefined,
            cedula_representante: values.cedula_representante || undefined,
            email_principal: values.email_principal || undefined,
            telefono_principal: values.telefono_principal || undefined,
            celular: values.celular || undefined,
            direccion_principal: values.direccion_principal || undefined,
            ciudad: values.ciudad || 'Bogotá',
            departamento: values.departamento || undefined,
          },
          tipo_cliente: values.tipo_cliente,
          periodicidad_mantenimiento: values.periodicidad_mantenimiento,
          descuento_autorizado: values.descuento_autorizado,
          tiene_credito: values.tiene_credito,
          limite_credito: values.limite_credito,
          dias_credito: values.dias_credito,
          cliente_activo: values.cliente_activo,
          tiene_acceso_portal: values.tiene_acceso_portal,
          observaciones_servicio: values.observaciones_servicio,
          requisitos_especiales: values.requisitos_especiales,
          id_firma_administrativa: values.id_firma_administrativa || undefined,
        };

        await createMutation.mutateAsync(payload as CreateClienteDto);
        toast({
          title: '¡Cliente creado!',
          description: 'El cliente y su información personal se han registrado correctamente.',
        });
      } else if (clienteId) {
        // En editar, solo actualizamos datos del cliente (no persona)
        const updateData = {
          tipo_cliente: values.tipo_cliente,
          periodicidad_mantenimiento: values.periodicidad_mantenimiento,
          descuento_autorizado: values.descuento_autorizado,
          tiene_credito: values.tiene_credito,
          limite_credito: values.limite_credito,
          dias_credito: values.dias_credito,
          cliente_activo: values.cliente_activo,
          tiene_acceso_portal: values.tiene_acceso_portal,
          observaciones_servicio: values.observaciones_servicio,
          requisitos_especiales: values.requisitos_especiales,
          id_firma_administrativa: values.id_firma_administrativa || undefined,
        };
        await updateMutation.mutateAsync({ id: clienteId, data: updateData });
        toast({
          title: '¡Cliente actualizado!',
          description: 'Los cambios se han guardado correctamente.',
        });
      }
      router.push('/clientes');
    } catch (error) {
      const message = (error as Error)?.message || 'No se pudo guardar el cliente';
      toast({
        title: 'Error',
        description: message.includes('documento')
          ? 'Ya existe un cliente con este número de documento.'
          : message,
        variant: 'destructive',
      });
    }
  };

  // Loading state en modo editar
  if (mode === 'editar' && isLoadingCliente) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

        {/* ===== SECCIÓN 1: INFORMACIÓN DE PERSONA ===== */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {tipoPersona === TipoPersonaEnum.JURIDICA ? (
                <Building2 className="h-5 w-5" />
              ) : (
                <User className="h-5 w-5" />
              )}
              Información del {tipoPersona === TipoPersonaEnum.JURIDICA ? 'Representante / Empresa' : 'Cliente'}
            </CardTitle>
            <CardDescription>
              {mode === 'crear'
                ? 'Ingresa los datos de identificación y contacto'
                : 'Datos de la persona asociada al cliente'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* Tipo de persona y Tipo de documento */}
            <div className="grid md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="tipo_persona"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Persona *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={mode === 'editar'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(TIPO_PERSONA_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tipo_identificacion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Documento *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={mode === 'editar'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(TIPO_IDENTIFICACION_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Número de documento */}
            <FormField
              control={form.control}
              name="numero_identificacion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número de Documento *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: 900123456-7"
                      {...field}
                      disabled={mode === 'editar'}
                    />
                  </FormControl>
                  <FormDescription>
                    {tipoPersona === TipoPersonaEnum.JURIDICA
                      ? 'NIT con dígito de verificación'
                      : 'Documento de identidad'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            {/* Campos condicionales según tipo de persona */}
            {tipoPersona === TipoPersonaEnum.JURIDICA ? (
              // === PERSONA JURÍDICA ===
              <>
                <div className="grid md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="razon_social"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Razón Social *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ej: Empresa ABC S.A.S."
                            {...field}
                            disabled={mode === 'editar'}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="nombre_comercial"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre Comercial</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Nombre con el que opera"
                            {...field}
                            disabled={mode === 'editar'}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="representante_legal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Representante Legal</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Nombre completo"
                            {...field}
                            disabled={mode === 'editar'}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cedula_representante"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cédula del Representante</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Número de documento"
                            {...field}
                            disabled={mode === 'editar'}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            ) : (
              // === PERSONA NATURAL ===
              <>
                <div className="grid md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="primer_nombre"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primer Nombre *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Nombre"
                            {...field}
                            disabled={mode === 'editar'}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="segundo_nombre"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Segundo Nombre</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Segundo nombre"
                            {...field}
                            disabled={mode === 'editar'}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="primer_apellido"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primer Apellido *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Apellido"
                            {...field}
                            disabled={mode === 'editar'}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="segundo_apellido"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Segundo Apellido</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Segundo apellido"
                            {...field}
                            disabled={mode === 'editar'}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

            <Separator />

            {/* Datos de contacto */}
            <div className="grid md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email_principal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Principal</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="correo@empresa.com"
                        {...field}
                        disabled={mode === 'editar'}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="telefono_principal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono Fijo</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="601 123 4567"
                        {...field}
                        disabled={mode === 'editar'}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="celular"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Celular</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="300 123 4567"
                        {...field}
                        disabled={mode === 'editar'}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="direccion_principal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dirección</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Calle/Carrera #00-00"
                        {...field}
                        disabled={mode === 'editar'}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="ciudad"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ciudad</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Bogotá"
                        {...field}
                        disabled={mode === 'editar'}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="departamento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Departamento</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Cundinamarca"
                        {...field}
                        disabled={mode === 'editar'}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* ===== SECCIÓN 2: INFORMACIÓN DEL CLIENTE ===== */}
        <Card>
          <CardHeader>
            <CardTitle>Información del Cliente</CardTitle>
            <CardDescription>
              Configuración del servicio y clasificación
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Tipo de cliente */}
              <FormField
                control={form.control}
                name="tipo_cliente"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Cliente</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(TIPO_CLIENTE_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Periodicidad mantenimiento */}
              <FormField
                control={form.control}
                name="periodicidad_mantenimiento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Periodicidad Mantenimiento</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(PERIODICIDAD_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Firma Administrativa (opcional) */}
            <FormField
              control={form.control}
              name="id_firma_administrativa"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Firma Administrativa (Opcional)</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value === 'none' ? null : parseInt(value))}
                    value={field.value?.toString() ?? 'none'}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar firma administrativa..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Sin firma administrativa</SelectItem>
                      {firmasAdministrativas.map((firma) => (
                        <SelectItem
                          key={firma.id_firma_administrativa}
                          value={firma.id_firma_administrativa.toString()}
                        >
                          {firma.persona?.razon_social ||
                            firma.persona?.nombre_comercial ||
                            firma.persona?.nombre_completo ||
                            `Firma #${firma.id_firma_administrativa}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Agrupa este cliente bajo una firma administrativa existente
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Configuración Comercial */}
        <Card>
          <CardHeader>
            <CardTitle>Configuración Comercial</CardTitle>
            <CardDescription>
              Parámetros de descuento y crédito
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Descuento */}
              <FormField
                control={form.control}
                name="descuento_autorizado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descuento Autorizado (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.01}
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Días crédito */}
              <FormField
                control={form.control}
                name="dias_credito"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Días de Crédito</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Tiene crédito */}
              <FormField
                control={form.control}
                name="tiene_credito"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Tiene Crédito</FormLabel>
                      <FormDescription>
                        Permitir facturación a crédito
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Límite crédito */}
              <FormField
                control={form.control}
                name="limite_credito"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Límite de Crédito (COP)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Estado y Acceso */}
        <Card>
          <CardHeader>
            <CardTitle>Estado y Acceso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Cliente activo */}
              <FormField
                control={form.control}
                name="cliente_activo"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Cliente Activo</FormLabel>
                      <FormDescription>
                        El cliente puede recibir servicios
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Acceso portal */}
              <FormField
                control={form.control}
                name="tiene_acceso_portal"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Acceso Portal</FormLabel>
                      <FormDescription>
                        Puede acceder al portal de clientes
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Observaciones */}
        <Card>
          <CardHeader>
            <CardTitle>Observaciones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="observaciones_servicio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observaciones del Servicio</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Notas sobre el servicio para este cliente..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="requisitos_especiales"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Requisitos Especiales</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Requisitos especiales de acceso, seguridad, etc..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Separator />

        {/* Botones de acción */}
        <div className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/clientes')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {mode === 'crear' ? 'Crear Cliente' : 'Guardar Cambios'}
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
