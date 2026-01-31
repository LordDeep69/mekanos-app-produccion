/**
 * MEKANOS S.A.S - Portal Admin
 * EmpleadoForm - Wizard de 3 pasos
 * 
 * Paso 1: Datos Persona (Identificación, Contacto)
 * Paso 2: Datos Empleado (Cargo, Contrato, Emergencia)
 * Paso 3: Crear Acceso (Opcional - Usuario del Sistema)
 * 
 * Backend: POST /usuarios/gestion-completa (transacción atómica)
 */

'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    AlertCircle,
    Briefcase,
    Check,
    ChevronLeft,
    ChevronRight,
    KeyRound,
    Loader2,
    User,
} from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { crearEmpleadoCompleto } from '../api/empleados.service';

// ═══════════════════════════════════════════════════════════════════════════════
// ENUMS (sincronizados con backend)
// ═══════════════════════════════════════════════════════════════════════════════

const TIPOS_IDENTIFICACION = [
    { value: 'CC', label: 'Cédula de Ciudadanía' },
    { value: 'CE', label: 'Cédula de Extranjería' },
    { value: 'PA', label: 'Pasaporte' },
    { value: 'TI', label: 'Tarjeta de Identidad' },
];

const CARGOS = [
    { value: 'GERENTE_GENERAL', label: 'Gerente General' },
    { value: 'GERENTE_OPERACIONES', label: 'Gerente de Operaciones' },
    { value: 'ADMINISTRADOR', label: 'Administrador' },
    { value: 'SUPERVISOR_TECNICO', label: 'Supervisor Técnico' },
    { value: 'TECNICO_SENIOR', label: 'Técnico Senior' },
    { value: 'TECNICO_JUNIOR', label: 'Técnico Junior' },
    { value: 'ASISTENTE_MANTENIMIENTO', label: 'Asistente de Mantenimiento' },
    { value: 'AUXILIAR_ADMINISTRATIVO', label: 'Auxiliar Administrativo' },
    { value: 'AUXILIAR_TECNICO', label: 'Auxiliar Técnico' },
    { value: 'ASESOR_COMERCIAL', label: 'Asesor Comercial' },
    { value: 'ASESOR_TECNICO', label: 'Asesor Técnico' },
    { value: 'COORDINADOR_LOGISTICA', label: 'Coordinador Logística' },
    { value: 'CONDUCTOR', label: 'Conductor' },
    { value: 'PRACTICANTE', label: 'Practicante' },
    { value: 'OTRO', label: 'Otro' },
];

const TIPOS_CONTRATO = [
    { value: 'INDEFINIDO', label: 'Término Indefinido' },
    { value: 'TERMINO_FIJO', label: 'Término Fijo' },
    { value: 'PRESTACION_SERVICIOS', label: 'Prestación de Servicios' },
    { value: 'OBRA_LABOR', label: 'Obra o Labor' },
    { value: 'APRENDIZAJE', label: 'Aprendizaje' },
    { value: 'PRACTICAS', label: 'Prácticas' },
];

const NIVELES_ACADEMICOS = [
    { value: 'PRIMARIA', label: 'Primaria' },
    { value: 'BACHILLERATO', label: 'Bachillerato' },
    { value: 'TECNICO', label: 'Técnico' },
    { value: 'TECNOLOGO', label: 'Tecnólogo' },
    { value: 'PROFESIONAL', label: 'Profesional' },
    { value: 'ESPECIALIZACION', label: 'Especialización' },
    { value: 'MAESTRIA', label: 'Maestría' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEMA DE VALIDACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

const empleadoFormSchema = z.object({
    // Paso 1: Datos Persona
    tipo_identificacion: z.string().min(1, 'Seleccione tipo de identificación'),
    numero_identificacion: z.string().min(5, 'Mínimo 5 caracteres').max(20),
    primer_nombre: z.string().min(2, 'Nombre requerido').max(50),
    segundo_nombre: z.string().max(50).optional(),
    primer_apellido: z.string().min(2, 'Apellido requerido').max(50),
    segundo_apellido: z.string().max(50).optional(),
    email_principal: z.string().email('Email inválido'),
    celular: z.string().min(10, 'Celular requerido').max(20),
    direccion_principal: z.string().min(5, 'Dirección requerida').max(300),
    ciudad: z.string().min(1),
    // Paso 2: Datos Empleado
    cargo: z.string().min(1, 'Seleccione cargo'),
    tipo_contrato: z.string().min(1),
    fecha_ingreso: z.string().min(1, 'Fecha de ingreso requerida'),
    departamento: z.string().max(100).optional(),
    contacto_emergencia: z.string().min(3, 'Contacto de emergencia requerido').max(200),
    telefono_emergencia: z.string().min(7, 'Teléfono de emergencia requerido').max(20),
    es_tecnico: z.boolean(),
    es_asesor: z.boolean(),
    nivel_academico: z.string().optional(),
    titulo_obtenido: z.string().max(200).optional(),
    // Paso 3: Acceso Sistema
    crear_usuario: z.boolean(),
    username: z.string()
        .max(50)
        .regex(/^[a-z0-9._-]+$/, 'Solo letras minúsculas, números, puntos, guiones y sin espacios')
        .optional()
        .or(z.literal('')),
    password: z.string().max(255).optional(),
    enviar_email_bienvenida: z.boolean(),
});

type EmpleadoFormData = z.infer<typeof empleadoFormSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

interface EmpleadoFormProps {
    onSuccess?: (data: unknown) => void;
    onCancel?: () => void;
}

export function EmpleadoForm({ onSuccess, onCancel }: EmpleadoFormProps) {
    const [paso, setPaso] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<EmpleadoFormData>({
        resolver: zodResolver(empleadoFormSchema),
        defaultValues: {
            tipo_identificacion: 'CC',
            tipo_contrato: 'INDEFINIDO',
            ciudad: 'CARTAGENA',
            es_tecnico: false,
            es_asesor: false,
            crear_usuario: false,
            enviar_email_bienvenida: true,
        },
    });

    const { register, watch, setValue, formState: { errors }, trigger } = form;
    const crearUsuario = watch('crear_usuario');

    const avanzarPaso = async () => {
        let fieldsToValidate: (keyof EmpleadoFormData)[] = [];

        if (paso === 1) {
            fieldsToValidate = [
                'tipo_identificacion',
                'numero_identificacion',
                'primer_nombre',
                'primer_apellido',
                'email_principal',
                'celular',
                'direccion_principal',
            ];
        } else if (paso === 2) {
            fieldsToValidate = [
                'cargo',
                'fecha_ingreso',
                'contacto_emergencia',
                'telefono_emergencia',
            ];
        }

        const isValid = await trigger(fieldsToValidate);
        if (isValid && paso < 3) {
            setPaso(paso + 1);
        }
    };

    const retrocederPaso = () => {
        if (paso > 1) setPaso(paso - 1);
    };

    const onSubmit = async (data: EmpleadoFormData) => {
        setIsSubmitting(true);

        try {
            const payload = {
                datosPersona: {
                    tipo_identificacion: data.tipo_identificacion,
                    numero_identificacion: data.numero_identificacion,
                    tipo_persona: 'NATURAL' as const,
                    primer_nombre: data.primer_nombre,
                    segundo_nombre: data.segundo_nombre || undefined,
                    primer_apellido: data.primer_apellido,
                    segundo_apellido: data.segundo_apellido || undefined,
                    email_principal: data.email_principal,
                    celular: data.celular,
                    direccion_principal: data.direccion_principal,
                    ciudad: data.ciudad,
                },
                datosUsuario: data.crear_usuario ? {
                    username: (data.username || data.email_principal.split('@')[0])
                        .trim()
                        .toLowerCase()
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')
                        .replace(/\s+/g, '.'),
                    email: data.email_principal,
                    password: data.password || undefined,
                    enviar_email_bienvenida: data.enviar_email_bienvenida,
                    estado: 'PENDIENTE_ACTIVACION' as const,
                } : {
                    username: `emp_${data.numero_identificacion}`,
                    email: data.email_principal,
                    estado: 'INACTIVO' as const,
                },
                datosEmpleado: {
                    cargo: data.cargo,
                    tipo_contrato: data.tipo_contrato,
                    fecha_ingreso: data.fecha_ingreso,
                    departamento: data.departamento || undefined,
                    contacto_emergencia: data.contacto_emergencia,
                    telefono_emergencia: data.telefono_emergencia,
                    es_tecnico: data.es_tecnico,
                    es_asesor: data.es_asesor,
                    nivel_academico: data.nivel_academico || undefined,
                    titulo_obtenido: data.titulo_obtenido || undefined,
                },
                rolesIds: data.crear_usuario ? [3] : [], // Rol 3 = Técnico por defecto si crea usuario
            };

            const result = await crearEmpleadoCompleto(payload);

            if (result.success) {
                toast.success(result.message || 'Empleado registrado exitosamente');
                if (result.data.password_temporal) {
                    toast.info(`Contraseña temporal: ${result.data.password_temporal}`, {
                        duration: 10000,
                    });
                }
                onSuccess?.(result.data);
            }
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string | string[] } } };
            const message = err.response?.data?.message;
            const errorText = Array.isArray(message) ? message.join(', ') : message;
            toast.error(errorText || 'Error al registrar empleado');
        } finally {
            setIsSubmitting(false);
        }
    };

    // ───────────────────────────────────────────────────────────────────────────
    // RENDER
    // ───────────────────────────────────────────────────────────────────────────

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Indicador de pasos */}
            <div className="flex items-center justify-center gap-2 mb-6">
                {[1, 2, 3].map((p) => (
                    <div key={p} className="flex items-center">
                        <div className={cn(
                            'w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors',
                            p < paso ? 'bg-green-500 text-white' :
                                p === paso ? 'bg-blue-600 text-white' :
                                    'bg-gray-200 text-gray-600'
                        )}>
                            {p < paso ? <Check className="h-5 w-5" /> : p}
                        </div>
                        {p < 3 && (
                            <div className={cn(
                                'w-12 h-1 mx-1',
                                p < paso ? 'bg-green-500' : 'bg-gray-200'
                            )} />
                        )}
                    </div>
                ))}
            </div>

            {/* Paso 1: Datos Persona */}
            {paso === 1 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5 text-blue-600" />
                            Datos Personales
                        </CardTitle>
                        <CardDescription>
                            Información de identificación y contacto del empleado
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Tipo de Identificación *</Label>
                                <Select
                                    value={watch('tipo_identificacion')}
                                    onValueChange={(v) => setValue('tipo_identificacion', v)}
                                >
                                    <SelectTrigger className={errors.tipo_identificacion ? 'border-red-500' : ''}>
                                        <SelectValue placeholder="Seleccione..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {TIPOS_IDENTIFICACION.map((t) => (
                                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Número de Identificación *</Label>
                                <Input
                                    {...register('numero_identificacion')}
                                    placeholder="1234567890"
                                    className={errors.numero_identificacion ? 'border-red-500' : ''}
                                />
                                {errors.numero_identificacion && (
                                    <p className="text-xs text-red-500">{errors.numero_identificacion.message}</p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Primer Nombre *</Label>
                                <Input
                                    {...register('primer_nombre')}
                                    placeholder="Juan"
                                    className={errors.primer_nombre ? 'border-red-500' : ''}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Segundo Nombre</Label>
                                <Input {...register('segundo_nombre')} placeholder="Carlos" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Primer Apellido *</Label>
                                <Input
                                    {...register('primer_apellido')}
                                    placeholder="Pérez"
                                    className={errors.primer_apellido ? 'border-red-500' : ''}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Segundo Apellido</Label>
                                <Input {...register('segundo_apellido')} placeholder="García" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Email *</Label>
                                <Input
                                    type="email"
                                    {...register('email_principal')}
                                    placeholder="juan.perez@email.com"
                                    className={errors.email_principal ? 'border-red-500' : ''}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Celular *</Label>
                                <Input
                                    {...register('celular')}
                                    placeholder="3001234567"
                                    className={errors.celular ? 'border-red-500' : ''}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Dirección *</Label>
                                <Input
                                    {...register('direccion_principal')}
                                    placeholder="Cra 10 # 20-30"
                                    className={errors.direccion_principal ? 'border-red-500' : ''}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Ciudad</Label>
                                <Input {...register('ciudad')} defaultValue="CARTAGENA" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Paso 2: Datos Empleado */}
            {paso === 2 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Briefcase className="h-5 w-5 text-green-600" />
                            Datos Contractuales
                        </CardTitle>
                        <CardDescription>
                            Información laboral y contacto de emergencia
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Cargo *</Label>
                                <Select
                                    value={watch('cargo')}
                                    onValueChange={(v) => setValue('cargo', v)}
                                >
                                    <SelectTrigger className={errors.cargo ? 'border-red-500' : ''}>
                                        <SelectValue placeholder="Seleccione cargo..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CARGOS.map((c) => (
                                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Tipo de Contrato</Label>
                                <Select
                                    value={watch('tipo_contrato')}
                                    onValueChange={(v) => setValue('tipo_contrato', v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {TIPOS_CONTRATO.map((t) => (
                                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Fecha de Ingreso *</Label>
                                <Input
                                    type="date"
                                    {...register('fecha_ingreso')}
                                    className={errors.fecha_ingreso ? 'border-red-500' : ''}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Departamento</Label>
                                <Input {...register('departamento')} placeholder="Operaciones" />
                            </div>
                        </div>

                        <div className="border-t pt-4 mt-4">
                            <h4 className="font-medium mb-3 flex items-center gap-2 text-orange-600">
                                <AlertCircle className="h-4 w-4" />
                                Contacto de Emergencia
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Nombre Contacto *</Label>
                                    <Input
                                        {...register('contacto_emergencia')}
                                        placeholder="María García (Esposa)"
                                        className={errors.contacto_emergencia ? 'border-red-500' : ''}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Teléfono Emergencia *</Label>
                                    <Input
                                        {...register('telefono_emergencia')}
                                        placeholder="3009876543"
                                        className={errors.telefono_emergencia ? 'border-red-500' : ''}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="border-t pt-4 mt-4">
                            <h4 className="font-medium mb-3">Roles Operativos</h4>
                            <div className="flex gap-6">
                                <div className="flex items-center gap-2">
                                    <Switch
                                        checked={watch('es_tecnico')}
                                        onCheckedChange={(v) => setValue('es_tecnico', v)}
                                    />
                                    <Label>Es Técnico de Campo</Label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Switch
                                        checked={watch('es_asesor')}
                                        onCheckedChange={(v) => setValue('es_asesor', v)}
                                    />
                                    <Label>Es Asesor Comercial</Label>
                                </div>
                            </div>
                        </div>

                        <div className="border-t pt-4 mt-4">
                            <h4 className="font-medium mb-3">Formación Académica</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Nivel Académico</Label>
                                    <Select
                                        value={watch('nivel_academico') || ''}
                                        onValueChange={(v) => setValue('nivel_academico', v)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccione..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {NIVELES_ACADEMICOS.map((n) => (
                                                <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Título Obtenido</Label>
                                    <Input {...register('titulo_obtenido')} placeholder="Ing. Mecánico" />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Paso 3: Crear Acceso */}
            {paso === 3 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <KeyRound className="h-5 w-5 text-purple-600" />
                            Acceso al Sistema
                        </CardTitle>
                        <CardDescription>
                            Configure las credenciales para acceso al portal (opcional)
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div>
                                <h4 className="font-medium">¿Crear usuario del sistema?</h4>
                                <p className="text-sm text-gray-500">
                                    Permite que el empleado acceda al portal admin o app móvil
                                </p>
                            </div>
                            <Switch
                                checked={crearUsuario}
                                onCheckedChange={(v) => setValue('crear_usuario', v)}
                            />
                        </div>

                        {crearUsuario && (
                            <div className="space-y-4 pt-4 border-t">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Nombre de Usuario</Label>
                                        <Input
                                            {...register('username')}
                                            placeholder={watch('email_principal')?.split('@')[0] || 'usuario'}
                                        />
                                        <p className="text-xs text-gray-500">
                                            Dejar vacío para usar el email como usuario
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Contraseña</Label>
                                        <Input
                                            type="password"
                                            {...register('password')}
                                            placeholder="••••••••"
                                        />
                                        <p className="text-xs text-gray-500">
                                            Dejar vacío para generar automáticamente
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Switch
                                        checked={watch('enviar_email_bienvenida')}
                                        onCheckedChange={(v) => setValue('enviar_email_bienvenida', v)}
                                    />
                                    <Label>Enviar email de bienvenida con credenciales</Label>
                                </div>
                            </div>
                        )}

                        {!crearUsuario && (
                            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <p className="text-sm text-yellow-800">
                                    <strong>Nota:</strong> El empleado será registrado sin acceso al sistema.
                                    Podrá crear el usuario posteriormente desde la gestión de usuarios.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Navegación */}
            <div className="flex justify-between pt-4 border-t">
                <div>
                    {paso > 1 && (
                        <Button type="button" variant="outline" onClick={retrocederPaso}>
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Anterior
                        </Button>
                    )}
                    {paso === 1 && onCancel && (
                        <Button type="button" variant="outline" onClick={onCancel}>
                            Cancelar
                        </Button>
                    )}
                </div>

                <div>
                    {paso < 3 ? (
                        <Button type="button" onClick={avanzarPaso}>
                            Siguiente
                            <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    ) : (
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Registrando...
                                </>
                            ) : (
                                <>
                                    <Check className="h-4 w-4 mr-2" />
                                    Registrar Empleado
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </div>
        </form>
    );
}
