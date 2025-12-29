/**
 * FORMULARIO DE CREACIÓN DE USUARIO - MEKANOS S.A.S
 * 
 * Wizard de 3 pasos:
 * 1. Datos de Identidad (Persona)
 * 2. Datos de Acceso (Usuario)
 * 3. Selección de Roles
 */

'use client';

import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    AlertCircle,
    BadgeCheck,
    Building2,
    CheckCircle,
    ChevronLeft,
    ChevronRight,
    Key,
    Loader2,
    Lock,
    Mail,
    MapPin,
    Phone,
    User,
    UserPlus
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useBuscarPersona, useCrearUsuario, useValidarUsername } from '../lib/usuarios.service';
import { CARGO_OPTIONS, CargoEmpleado, TIPO_IDENTIFICACION_OPTIONS } from '../types';
import { RolesSelector } from './RolesSelector';

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEMA DE VALIDACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

const usuarioSchema = z.object({
  // Paso 1: Identidad
  tipo_identificacion: z.enum(['CC', 'NIT', 'CE', 'PA', 'TI']),
  numero_identificacion: z.string().min(5, 'Mínimo 5 caracteres').max(20),
  tipo_persona: z.enum(['NATURAL', 'JURIDICA']),
  primer_nombre: z.string().min(2, 'Mínimo 2 caracteres').optional(),
  segundo_nombre: z.string().optional(),
  primer_apellido: z.string().min(2, 'Mínimo 2 caracteres').optional(),
  segundo_apellido: z.string().optional(),
  razon_social: z.string().optional(),
  email_principal: z.string().email('Email inválido').optional().or(z.literal('')),
  telefono_principal: z.string().optional(),
  celular: z.string().optional(),
  direccion_principal: z.string().optional(),
  ciudad: z.string().optional(),
  
  // Paso 2: Acceso
  username: z.string().min(4, 'Mínimo 4 caracteres').max(50).regex(
    /^[a-zA-Z0-9._-]+$/,
    'Solo letras, números, puntos, guiones y guiones bajos'
  ),
  email_usuario: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres').optional(),
  confirmar_password: z.string().optional(),
  generar_password: z.boolean(),
  
  // Paso 2.5: Datos empleado (opcional)
  crear_empleado: z.boolean(),
  cargo: z.string().optional(),
  fecha_ingreso: z.string().optional(),
  contacto_emergencia: z.string().optional(),
  telefono_emergencia: z.string().optional(),
  es_tecnico: z.boolean().optional(),
  es_asesor: z.boolean().optional(),
  
  // Paso 3: Roles
  rolesIds: z.array(z.number()).min(1, 'Debe seleccionar al menos un rol'),
}).superRefine((data, ctx) => {
  // Validar persona natural
  if (data.tipo_persona === 'NATURAL') {
    if (!data.primer_nombre) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'El nombre es requerido',
        path: ['primer_nombre'],
      });
    }
    if (!data.primer_apellido) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'El apellido es requerido',
        path: ['primer_apellido'],
      });
    }
  }
  
  // Validar persona jurídica
  if (data.tipo_persona === 'JURIDICA' && !data.razon_social) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'La razón social es requerida',
      path: ['razon_social'],
    });
  }
  
  // Validar password manual
  if (!data.generar_password) {
    if (!data.password) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'La contraseña es requerida',
        path: ['password'],
      });
    }
    if (data.password !== data.confirmar_password) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Las contraseñas no coinciden',
        path: ['confirmar_password'],
      });
    }
  }
  
  // Validar datos empleado
  if (data.crear_empleado) {
    if (!data.cargo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'El cargo es requerido',
        path: ['cargo'],
      });
    }
    if (!data.fecha_ingreso) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'La fecha de ingreso es requerida',
        path: ['fecha_ingreso'],
      });
    }
  }
});

type UsuarioFormData = z.infer<typeof usuarioSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════════════════════

interface UsuarioFormProps {
  onSuccess?: (data: { id_usuario: number; password_temporal?: string }) => void;
  onCancel?: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export function UsuarioForm({ onSuccess, onCancel }: UsuarioFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [personaEncontrada, setPersonaEncontrada] = useState<boolean>(false);
  const [usernameDisponible, setUsernameDisponible] = useState<boolean | null>(null);
  
  const crearUsuarioMutation = useCrearUsuario();
  
  const form = useForm<UsuarioFormData>({
    resolver: zodResolver(usuarioSchema),
    defaultValues: {
      tipo_identificacion: 'CC',
      tipo_persona: 'NATURAL',
      generar_password: true,
      crear_empleado: false,
      es_tecnico: false,
      es_asesor: false,
      rolesIds: [],
    },
    mode: 'onChange',
  });

  const { watch, setValue, formState: { errors } } = form;
  
  // Watchers
  const tipoIdentificacion = watch('tipo_identificacion');
  const numeroIdentificacion = watch('numero_identificacion');
  const tipoPersona = watch('tipo_persona');
  const username = watch('username');
  const generarPassword = watch('generar_password');
  const crearEmpleado = watch('crear_empleado');
  const rolesIds = watch('rolesIds');

  // Buscar persona existente
  const { data: personaData, isFetching: buscandoPersona } = useBuscarPersona(
    tipoIdentificacion,
    numeroIdentificacion,
    numeroIdentificacion?.length >= 6
  );

  useEffect(() => {
    if (personaData?.existe) {
      setPersonaEncontrada(true);
      // Si tiene usuario, mostrar advertencia
    } else {
      setPersonaEncontrada(false);
    }
  }, [personaData]);

  // Validar username
  const { data: usernameData, isFetching: validandoUsername } = useValidarUsername(
    username,
    username?.length >= 4
  );

  useEffect(() => {
    if (usernameData) {
      setUsernameDisponible(usernameData.disponible);
    }
  }, [usernameData]);

  // Auto-generar username desde nombre
  const primerNombre = watch('primer_nombre');
  const primerApellido = watch('primer_apellido');
  
  useEffect(() => {
    if (primerNombre && primerApellido && !username) {
      const sugerencia = `${primerNombre.toLowerCase()}.${primerApellido.toLowerCase()}`
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9.]/g, '');
      setValue('username', sugerencia);
    }
  }, [primerNombre, primerApellido, username, setValue]);

  // Submit
  const onSubmit = async (data: UsuarioFormData) => {
    try {
      const payload = {
        datosPersona: {
          tipo_identificacion: data.tipo_identificacion,
          numero_identificacion: data.numero_identificacion,
          tipo_persona: data.tipo_persona,
          primer_nombre: data.primer_nombre,
          segundo_nombre: data.segundo_nombre,
          primer_apellido: data.primer_apellido,
          segundo_apellido: data.segundo_apellido,
          razon_social: data.razon_social,
          email_principal: data.email_principal || data.email_usuario,
          telefono_principal: data.telefono_principal,
          celular: data.celular,
          direccion_principal: data.direccion_principal,
          ciudad: data.ciudad,
        },
        datosUsuario: {
          username: data.username,
          email: data.email_usuario,
          password: data.generar_password ? undefined : data.password,
          debe_cambiar_password: data.generar_password,
        },
        datosEmpleado: data.crear_empleado ? {
          cargo: (data.cargo || 'OTRO') as CargoEmpleado,
          fecha_ingreso: data.fecha_ingreso!,
          contacto_emergencia: data.contacto_emergencia || 'No registrado',
          telefono_emergencia: data.telefono_emergencia || 'No registrado',
          es_tecnico: data.es_tecnico,
          es_asesor: data.es_asesor,
        } : undefined,
        rolesIds: data.rolesIds,
        id_persona_existente: personaData?.persona?.id_persona,
      };

      const result = await crearUsuarioMutation.mutateAsync(payload);
      
      if (result.success && onSuccess) {
        onSuccess({
          id_usuario: result.data.id_usuario,
          password_temporal: result.data.password_temporal,
        });
      }
    } catch (error) {
      console.error('Error al crear usuario:', error);
    }
  };

  // Navegación de pasos
  const canGoNext = () => {
    if (currentStep === 1) {
      if (tipoPersona === 'NATURAL') {
        return watch('primer_nombre') && watch('primer_apellido');
      }
      return watch('razon_social');
    }
    if (currentStep === 2) {
      return username && watch('email_usuario') && usernameDisponible !== false;
    }
    return true;
  };

  const goNext = () => {
    if (currentStep < 3 && canGoNext()) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goPrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Steps indicator
  const steps = [
    { num: 1, title: 'Identidad', icon: User },
    { num: 2, title: 'Acceso', icon: Key },
    { num: 3, title: 'Roles', icon: BadgeCheck },
  ];

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-2xl mx-auto">
      {/* Header con pasos */}
      <div className="mb-8">
        <div className="flex justify-between">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.num} className="flex items-center">
                <div className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all',
                  currentStep >= step.num
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-white border-gray-300 text-gray-400'
                )}>
                  {currentStep > step.num ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                <span className={cn(
                  'ml-2 text-sm font-medium hidden sm:inline',
                  currentStep >= step.num ? 'text-blue-600' : 'text-gray-400'
                )}>
                  {step.title}
                </span>
                {index < steps.length - 1 && (
                  <div className={cn(
                    'w-12 sm:w-24 h-0.5 mx-2',
                    currentStep > step.num ? 'bg-blue-600' : 'bg-gray-200'
                  )} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Paso 1: Identidad */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" />
            Datos de Identidad
          </h2>

          {/* Tipo de identificación y número */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Identificación
              </label>
              <select
                {...form.register('tipo_identificacion')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {TIPO_IDENTIFICACION_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número de Identificación
              </label>
              <input
                {...form.register('numero_identificacion')}
                className={cn(
                  'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500',
                  errors.numero_identificacion ? 'border-red-500' : 'border-gray-300'
                )}
                placeholder="Ej: 12345678"
              />
              {buscandoPersona && (
                <Loader2 className="absolute right-3 top-9 h-4 w-4 animate-spin text-blue-500" />
              )}
              {personaEncontrada && !buscandoPersona && (
                <div className="mt-1 text-sm text-amber-600 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  Persona encontrada - se vincularán los datos
                </div>
              )}
            </div>
          </div>

          {/* Tipo de persona */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Persona
            </label>
            <div className="flex gap-4">
              <label className={cn(
                'flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer transition-all',
                tipoPersona === 'NATURAL' 
                  ? 'border-blue-500 bg-blue-50 text-blue-700' 
                  : 'border-gray-300 hover:border-gray-400'
              )}>
                <input
                  type="radio"
                  {...form.register('tipo_persona')}
                  value="NATURAL"
                  className="sr-only"
                />
                <User className="h-4 w-4" />
                Natural
              </label>
              <label className={cn(
                'flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer transition-all',
                tipoPersona === 'JURIDICA' 
                  ? 'border-blue-500 bg-blue-50 text-blue-700' 
                  : 'border-gray-300 hover:border-gray-400'
              )}>
                <input
                  type="radio"
                  {...form.register('tipo_persona')}
                  value="JURIDICA"
                  className="sr-only"
                />
                <Building2 className="h-4 w-4" />
                Jurídica
              </label>
            </div>
          </div>

          {/* Campos de persona natural */}
          {tipoPersona === 'NATURAL' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Primer Nombre *
                </label>
                <input
                  {...form.register('primer_nombre')}
                  className={cn(
                    'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500',
                    errors.primer_nombre ? 'border-red-500' : 'border-gray-300'
                  )}
                />
                {errors.primer_nombre && (
                  <p className="mt-1 text-sm text-red-500">{errors.primer_nombre.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Segundo Nombre
                </label>
                <input
                  {...form.register('segundo_nombre')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Primer Apellido *
                </label>
                <input
                  {...form.register('primer_apellido')}
                  className={cn(
                    'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500',
                    errors.primer_apellido ? 'border-red-500' : 'border-gray-300'
                  )}
                />
                {errors.primer_apellido && (
                  <p className="mt-1 text-sm text-red-500">{errors.primer_apellido.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Segundo Apellido
                </label>
                <input
                  {...form.register('segundo_apellido')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Campos de persona jurídica */}
          {tipoPersona === 'JURIDICA' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Razón Social *
              </label>
              <input
                {...form.register('razon_social')}
                className={cn(
                  'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500',
                  errors.razon_social ? 'border-red-500' : 'border-gray-300'
                )}
              />
            </div>
          )}

          {/* Contacto */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Mail className="h-4 w-4 inline mr-1" />
                Email
              </label>
              <input
                {...form.register('email_principal')}
                type="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Phone className="h-4 w-4 inline mr-1" />
                Celular
              </label>
              <input
                {...form.register('celular')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Dirección */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <MapPin className="h-4 w-4 inline mr-1" />
                Ciudad
              </label>
              <input
                {...form.register('ciudad')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dirección
              </label>
              <input
                {...form.register('direccion_principal')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Paso 2: Acceso */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Key className="h-5 w-5 text-blue-600" />
            Datos de Acceso
          </h2>

          {/* Username */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre de Usuario *
            </label>
            <input
              {...form.register('username')}
              className={cn(
                'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500',
                errors.username ? 'border-red-500' 
                  : usernameDisponible === false ? 'border-red-500'
                  : usernameDisponible === true ? 'border-green-500'
                  : 'border-gray-300'
              )}
              placeholder="Ej: juan.perez"
            />
            <div className="absolute right-3 top-9">
              {validandoUsername && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
              {!validandoUsername && usernameDisponible === true && (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
              {!validandoUsername && usernameDisponible === false && (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
            </div>
            {errors.username && (
              <p className="mt-1 text-sm text-red-500">{errors.username.message}</p>
            )}
            {usernameDisponible === false && (
              <p className="mt-1 text-sm text-red-500">Este nombre de usuario no está disponible</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email de Acceso *
            </label>
            <input
              {...form.register('email_usuario')}
              type="email"
              className={cn(
                'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500',
                errors.email_usuario ? 'border-red-500' : 'border-gray-300'
              )}
              placeholder="usuario@empresa.com"
            />
            {errors.email_usuario && (
              <p className="mt-1 text-sm text-red-500">{errors.email_usuario.message}</p>
            )}
          </div>

          {/* Contraseña */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                {...form.register('generar_password')}
                id="generar_password"
                className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="generar_password" className="text-sm text-gray-700">
                Generar contraseña automáticamente
              </label>
            </div>

            {!generarPassword && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Lock className="h-4 w-4 inline mr-1" />
                    Contraseña *
                  </label>
                  <input
                    {...form.register('password')}
                    type="password"
                    className={cn(
                      'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500',
                      errors.password ? 'border-red-500' : 'border-gray-300'
                    )}
                  />
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-500">{errors.password.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirmar Contraseña *
                  </label>
                  <input
                    {...form.register('confirmar_password')}
                    type="password"
                    className={cn(
                      'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500',
                      errors.confirmar_password ? 'border-red-500' : 'border-gray-300'
                    )}
                  />
                  {errors.confirmar_password && (
                    <p className="mt-1 text-sm text-red-500">{errors.confirmar_password.message}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sección Empleado */}
          <div className="border-t pt-6">
            <div className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                {...form.register('crear_empleado')}
                id="crear_empleado"
                className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="crear_empleado" className="text-sm font-medium text-gray-700">
                Registrar como empleado de la empresa
              </label>
            </div>

            {crearEmpleado && (
              <div className="space-y-4 pl-6 border-l-2 border-blue-200">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cargo *
                    </label>
                    <select
                      {...form.register('cargo')}
                      className={cn(
                        'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500',
                        errors.cargo ? 'border-red-500' : 'border-gray-300'
                      )}
                    >
                      <option value="">Seleccione...</option>
                      {CARGO_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha de Ingreso *
                    </label>
                    <input
                      {...form.register('fecha_ingreso')}
                      type="date"
                      className={cn(
                        'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500',
                        errors.fecha_ingreso ? 'border-red-500' : 'border-gray-300'
                      )}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contacto de Emergencia
                    </label>
                    <input
                      {...form.register('contacto_emergencia')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Teléfono Emergencia
                    </label>
                    <input
                      {...form.register('telefono_emergencia')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex gap-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      {...form.register('es_tecnico')}
                      className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Es técnico de campo</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      {...form.register('es_asesor')}
                      className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Es asesor comercial</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Paso 3: Roles */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <BadgeCheck className="h-5 w-5 text-blue-600" />
            Asignación de Roles
          </h2>

          <RolesSelector
            value={rolesIds}
            onChange={(ids) => setValue('rolesIds', ids)}
            error={errors.rolesIds?.message}
          />
        </div>
      )}

      {/* Navegación */}
      <div className="flex justify-between mt-8 pt-6 border-t">
        <div>
          {currentStep > 1 && (
            <button
              type="button"
              onClick={goPrev}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </button>
          )}
        </div>
        
        <div className="flex gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg"
            >
              Cancelar
            </button>
          )}
          
          {currentStep < 3 ? (
            <button
              type="button"
              onClick={goNext}
              disabled={!canGoNext()}
              className={cn(
                'flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all',
                canGoNext()
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              )}
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={crearUsuarioMutation.isPending || rolesIds.length === 0}
              className={cn(
                'flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all',
                crearUsuarioMutation.isPending || rolesIds.length === 0
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              )}
            >
              {crearUsuarioMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Crear Usuario
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Errores de mutación */}
      {crearUsuarioMutation.isError && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 font-medium flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Error al crear el usuario
          </p>
          <p className="text-red-500 text-sm mt-1">
            {(crearUsuarioMutation.error as Error)?.message || 'Error desconocido'}
          </p>
        </div>
      )}
    </form>
  );
}

export default UsuarioForm;
