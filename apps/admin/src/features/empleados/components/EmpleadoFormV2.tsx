/**
 * MEKANOS S.A.S - Portal Admin
 * EmpleadoFormV2 - Wizard Enterprise de 3 pasos
 * 
 * RE-INGENIERÍA COMPLETA basada en esquema SQL real:
 * - Paso 1: TODOS los campos de personas
 * - Paso 2: TODOS los campos de empleados (licencia, emergencia, etc.)
 * - Paso 3: Acceso Sistema EXPLÍCITO con credenciales visibles
 * 
 * Backend: POST /usuarios/gestion-completa
 */

'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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
import { Textarea } from '@/components/ui/textarea';
import { useRoles } from '@/features/usuarios/lib/usuarios.service';
import type { Rol } from '@/features/usuarios/types';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    AlertCircle,
    Briefcase,
    Car,
    Check,
    ChevronLeft,
    ChevronRight,
    ClipboardCopy,
    Eye,
    EyeOff,
    GraduationCap,
    KeyRound,
    Loader2,
    Phone,
    Shield,
    User,
    UserPlus,
} from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { crearEmpleadoCompleto, type CreateEmpleadoCompletoResponse } from '../api/empleados.service';

// ═══════════════════════════════════════════════════════════════════════════════
// ENUMS (Sincronizados 1:1 con PostgreSQL)
// ═══════════════════════════════════════════════════════════════════════════════

const TIPOS_IDENTIFICACION = [
    { value: 'CC', label: 'Cédula de Ciudadanía' },
    { value: 'CE', label: 'Cédula de Extranjería' },
    { value: 'PA', label: 'Pasaporte' },
    { value: 'TI', label: 'Tarjeta de Identidad' },
    { value: 'NIT', label: 'NIT (Empresas)' },
];

const CARGOS = [
    { value: 'GERENTE_GENERAL', label: 'Gerente General', esTecnico: false },
    { value: 'GERENTE_OPERACIONES', label: 'Gerente de Operaciones', esTecnico: false },
    { value: 'ADMINISTRADOR', label: 'Administrador', esTecnico: false },
    { value: 'SUPERVISOR_TECNICO', label: 'Supervisor Técnico', esTecnico: true },
    { value: 'TECNICO_SENIOR', label: 'Técnico Senior', esTecnico: true },
    { value: 'TECNICO_JUNIOR', label: 'Técnico Junior', esTecnico: true },
    { value: 'AUXILIAR_ADMINISTRATIVO', label: 'Auxiliar Administrativo', esTecnico: false },
    { value: 'AUXILIAR_TECNICO', label: 'Auxiliar Técnico', esTecnico: true },
    { value: 'ASESOR_COMERCIAL', label: 'Asesor Comercial', esTecnico: false },
    { value: 'ASESOR_TECNICO', label: 'Asesor Técnico', esTecnico: true },
    { value: 'COORDINADOR_LOGISTICA', label: 'Coordinador Logística', esTecnico: false },
    { value: 'CONDUCTOR', label: 'Conductor', esTecnico: false },
    { value: 'PRACTICANTE', label: 'Practicante', esTecnico: false },
    { value: 'OTRO', label: 'Otro', esTecnico: false },
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
    { value: 'NINGUNO', label: 'Sin estudios formales' },
    { value: 'PRIMARIA', label: 'Primaria' },
    { value: 'BACHILLERATO', label: 'Bachillerato' },
    { value: 'TECNICO', label: 'Técnico' },
    { value: 'TECNOLOGO', label: 'Tecnólogo' },
    { value: 'PROFESIONAL', label: 'Profesional' },
    { value: 'ESPECIALIZACION', label: 'Especialización' },
    { value: 'MAESTRIA', label: 'Maestría' },
    { value: 'DOCTORADO', label: 'Doctorado' },
];

// ROLES_SISTEMA ahora se carga dinámicamente desde el backend con useRoles()

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEMA COMPLETO (Basado en SQL de personas + empleados + usuarios)
// ═══════════════════════════════════════════════════════════════════════════════

const empleadoSchemaV2 = z.object({
    // ─────────────────────────────────────────────────────────────────────────
    // PASO 1: DATOS PERSONALES (tabla personas)
    // ─────────────────────────────────────────────────────────────────────────
    tipo_identificacion: z.string().min(1, 'Requerido'),
    numero_identificacion: z.string().min(5, 'Mínimo 5 caracteres').max(20),
    primer_nombre: z.string().min(2, 'Requerido').max(50),
    segundo_nombre: z.string().max(50).optional(),
    primer_apellido: z.string().min(2, 'Requerido').max(50),
    segundo_apellido: z.string().max(50).optional(),
    fecha_nacimiento: z.string().optional(),
    email_principal: z.string().email('Email inválido'),
    telefono_principal: z.string().max(20).optional(),
    celular: z.string().min(10, 'Celular requerido').max(20),
    direccion_principal: z.string().min(5, 'Requerida').max(300),
    barrio_zona: z.string().max(100).optional(),
    ciudad: z.string().min(1),
    departamento_geo: z.string().optional(),

    // ─────────────────────────────────────────────────────────────────────────
    // PASO 2: DATOS LABORALES (tabla empleados)
    // ─────────────────────────────────────────────────────────────────────────
    cargo: z.string().min(1, 'Seleccione cargo'),
    descripcion_cargo: z.string().max(200).optional(),
    tipo_contrato: z.string().min(1),
    fecha_ingreso: z.string().min(1, 'Requerida'),
    departamento: z.string().max(100).optional(),

    // Contacto Emergencia (CRÍTICO)
    contacto_emergencia: z.string().min(3, 'Requerido').max(200),
    telefono_emergencia: z.string().min(7, 'Requerido').max(20),

    // Roles Operativos
    es_tecnico: z.boolean(),
    es_asesor: z.boolean(),

    // Licencia Conducción
    puede_conducir: z.boolean(),
    licencia_conduccion: z.string().max(50).optional(),
    fecha_vencimiento_licencia: z.string().optional(),

    // Formación
    nivel_academico: z.string().optional(),
    titulo_obtenido: z.string().max(200).optional(),
    institucion_educativa: z.string().max(200).optional(),

    // Extras
    habilidades_especiales: z.string().optional(),
    observaciones: z.string().optional(),

    // ─────────────────────────────────────────────────────────────────────────
    // PASO 3: ACCESO AL SISTEMA (tabla usuarios)
    // ─────────────────────────────────────────────────────────────────────────
    crear_acceso_sistema: z.boolean(),
    username: z.string().max(50).optional(),
    password: z.string().max(255).optional(),
    debe_cambiar_password: z.boolean(),
    roles_seleccionados: z.array(z.number()),
});

type EmpleadoFormDataV2 = z.infer<typeof empleadoSchemaV2>;

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

interface EmpleadoFormV2Props {
    onSuccess?: (data: CreateEmpleadoCompletoResponse['data']) => void;
    onCancel?: () => void;
}

export function EmpleadoFormV2({ onSuccess, onCancel }: EmpleadoFormV2Props) {
    const [paso, setPaso] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [credencialesCreadas, setCredencialesCreadas] = useState<{
        username: string;
        password: string;
        email: string;
        roles: string[];
    } | null>(null);

    // CARGAR ROLES DINÁMICAMENTE DESDE EL BACKEND
    const { data: rolesDisponibles, isLoading: cargandoRoles } = useRoles();

    const form = useForm<EmpleadoFormDataV2>({
        resolver: zodResolver(empleadoSchemaV2),
        defaultValues: {
            tipo_identificacion: 'CC',
            tipo_contrato: 'INDEFINIDO',
            ciudad: 'CARTAGENA',
            departamento_geo: 'BOLÍVAR',
            es_tecnico: false,
            es_asesor: false,
            puede_conducir: false,
            crear_acceso_sistema: true, // Por defecto SÍ crear acceso
            debe_cambiar_password: true,
            roles_seleccionados: [], // Se seleccionará dinámicamente
        },
    });

    const { register, watch, setValue, formState: { errors }, trigger } = form;

    const crearAcceso = watch('crear_acceso_sistema');
    const cargoSeleccionado = watch('cargo');
    const puedeConducir = watch('puede_conducir');
    const rolesSeleccionados = watch('roles_seleccionados') || [];

    // Auto-sugerir username basado en nombre
    const primerNombre = watch('primer_nombre');
    const primerApellido = watch('primer_apellido');
    const usernameActual = watch('username');

    const sugerirUsername = () => {
        if (primerNombre && primerApellido && !usernameActual) {
            const sugerido = `${primerNombre.charAt(0).toLowerCase()}${primerApellido.toLowerCase()}`.replace(/\s/g, '');
            setValue('username', sugerido);
        }
    };

    // Auto-marcar es_tecnico según cargo
    const handleCargoChange = (cargo: string) => {
        setValue('cargo', cargo);
        const cargoInfo = CARGOS.find(c => c.value === cargo);
        if (cargoInfo) {
            setValue('es_tecnico', cargoInfo.esTecnico);
            // Si es técnico, pre-seleccionar rol Técnico (buscado dinámicamente)
            if (cargoInfo.esTecnico && rolesDisponibles) {
                const rolTecnico = rolesDisponibles.find(r => r.codigo_rol === 'TECNICO');
                if (rolTecnico && !rolesSeleccionados.includes(rolTecnico.id_rol)) {
                    setValue('roles_seleccionados', [...rolesSeleccionados, rolTecnico.id_rol]);
                }
            }
        }
    };

    // Toggle rol
    const toggleRol = (rolId: number) => {
        const current = rolesSeleccionados;
        if (current.includes(rolId)) {
            setValue('roles_seleccionados', current.filter(r => r !== rolId));
        } else {
            setValue('roles_seleccionados', [...current, rolId]);
        }
    };

    // Generar password aleatorio
    const generarPassword = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
        let password = '';
        for (let i = 0; i < 12; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setValue('password', password);
        setShowPassword(true);
    };

    // Validación por paso
    const validarPaso = async (): Promise<boolean> => {
        let campos: (keyof EmpleadoFormDataV2)[] = [];

        if (paso === 1) {
            campos = [
                'tipo_identificacion', 'numero_identificacion',
                'primer_nombre', 'primer_apellido',
                'email_principal', 'celular', 'direccion_principal', 'ciudad'
            ];
        } else if (paso === 2) {
            campos = [
                'cargo', 'fecha_ingreso', 'tipo_contrato',
                'contacto_emergencia', 'telefono_emergencia'
            ];
        }

        return await trigger(campos);
    };

    const avanzarPaso = async () => {
        const valido = await validarPaso();
        if (valido && paso < 3) {
            setPaso(paso + 1);
            if (paso === 1) sugerirUsername(); // Sugerir username al pasar a paso 2
        }
    };

    const retrocederPaso = () => {
        if (paso > 1) setPaso(paso - 1);
    };

    // ───────────────────────────────────────────────────────────────────────────
    // SUBMIT
    // ───────────────────────────────────────────────────────────────────────────

    const onSubmit = async (data: EmpleadoFormDataV2) => {
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
                    fecha_nacimiento: data.fecha_nacimiento || undefined,
                    email_principal: data.email_principal,
                    telefono_principal: data.telefono_principal || undefined,
                    celular: data.celular,
                    direccion_principal: data.direccion_principal,
                    barrio_zona: data.barrio_zona || undefined,
                    ciudad: data.ciudad,
                    departamento: data.departamento_geo || 'BOLÍVAR',
                },
                datosUsuario: {
                    username: data.crear_acceso_sistema
                        ? (data.username || data.email_principal.split('@')[0])
                        : `emp_${data.numero_identificacion}`,
                    email: data.email_principal,
                    password: data.crear_acceso_sistema ? (data.password || undefined) : undefined,
                    debe_cambiar_password: data.debe_cambiar_password,
                    enviar_email_bienvenida: data.crear_acceso_sistema,
                    estado: data.crear_acceso_sistema ? 'ACTIVO' : 'INACTIVO',
                },
                datosEmpleado: {
                    cargo: data.cargo,
                    descripcion_cargo: data.descripcion_cargo || undefined,
                    tipo_contrato: data.tipo_contrato,
                    fecha_ingreso: data.fecha_ingreso,
                    departamento: data.departamento || undefined,
                    contacto_emergencia: data.contacto_emergencia,
                    telefono_emergencia: data.telefono_emergencia,
                    es_tecnico: data.es_tecnico,
                    es_asesor: data.es_asesor,
                    puede_conducir: data.puede_conducir,
                    licencia_conduccion: data.puede_conducir ? data.licencia_conduccion : undefined,
                    fecha_vencimiento_licencia: data.puede_conducir ? data.fecha_vencimiento_licencia : undefined,
                    nivel_academico: data.nivel_academico || undefined,
                    titulo_obtenido: data.titulo_obtenido || undefined,
                    institucion_educativa: data.institucion_educativa || undefined,
                    habilidades_especiales: data.habilidades_especiales || undefined,
                    observaciones: data.observaciones || undefined,
                },
                rolesIds: data.crear_acceso_sistema ? data.roles_seleccionados : [],
            };

            const result = await crearEmpleadoCompleto(payload);

            if (result.success) {
                // Si se creó acceso, mostrar modal con credenciales
                if (data.crear_acceso_sistema) {
                    setCredencialesCreadas({
                        username: result.data.username,
                        password: result.data.password_temporal || data.password || '(Definida por el admin)',
                        email: result.data.email,
                        roles: result.data.roles.map(r => r.nombre_rol),
                    });
                    setShowSuccessModal(true);
                } else {
                    toast.success('Empleado registrado (sin acceso al sistema)');
                    onSuccess?.(result.data);
                }
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

    const copiarCredenciales = () => {
        if (credencialesCreadas) {
            const texto = `Usuario: ${credencialesCreadas.username}\nContraseña: ${credencialesCreadas.password}\nEmail: ${credencialesCreadas.email}`;
            navigator.clipboard.writeText(texto);
            toast.success('Credenciales copiadas al portapapeles');
        }
    };

    const cerrarModalYSalir = () => {
        setShowSuccessModal(false);
        if (credencialesCreadas) {
            onSuccess?.({
                id_usuario: 0,
                id_persona: 0,
                id_empleado: 0,
                username: credencialesCreadas.username,
                email: credencialesCreadas.email,
                estado: 'PENDIENTE_ACTIVACION',
                roles: [],
                persona: { nombre_completo: '', tipo_identificacion: '', numero_identificacion: '' },
                persona_reutilizada: false,
            });
        }
    };

    // ───────────────────────────────────────────────────────────────────────────
    // RENDER
    // ───────────────────────────────────────────────────────────────────────────

    return (
        <>
            <form
                className="space-y-6"
                onSubmit={(e) => e.preventDefault()}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
                        e.preventDefault();
                    }
                }}
            >
                {/* Indicador de pasos */}
                <div className="flex items-center justify-center gap-2 mb-6">
                    {[
                        { num: 1, label: 'Datos Personales', icon: User },
                        { num: 2, label: 'Datos Laborales', icon: Briefcase },
                        { num: 3, label: 'Acceso Sistema', icon: KeyRound },
                    ].map((p, idx) => (
                        <div key={p.num} className="flex items-center">
                            <div className="flex flex-col items-center">
                                <div className={cn(
                                    'w-12 h-12 rounded-full flex items-center justify-center font-semibold transition-all',
                                    p.num < paso ? 'bg-green-500 text-white' :
                                        p.num === paso ? 'bg-blue-600 text-white ring-4 ring-blue-200' :
                                            'bg-gray-200 text-gray-600'
                                )}>
                                    {p.num < paso ? <Check className="h-6 w-6" /> : <p.icon className="h-5 w-5" />}
                                </div>
                                <span className={cn(
                                    'text-xs mt-1 font-medium',
                                    p.num === paso ? 'text-blue-600' : 'text-gray-500'
                                )}>{p.label}</span>
                            </div>
                            {idx < 2 && (
                                <div className={cn(
                                    'w-16 h-1 mx-2',
                                    p.num < paso ? 'bg-green-500' : 'bg-gray-200'
                                )} />
                            )}
                        </div>
                    ))}
                </div>

                {/* ═══════════════════════════════════════════════════════════════════════
                    PASO 1: DATOS PERSONALES
                ═══════════════════════════════════════════════════════════════════════ */}
                {
                    paso === 1 && (
                        <Card>
                            <CardHeader className="bg-blue-50 border-b">
                                <CardTitle className="flex items-center gap-2">
                                    <User className="h-5 w-5 text-blue-600" />
                                    Datos Personales
                                </CardTitle>
                                <CardDescription>
                                    Información de identificación y contacto (tabla: personas)
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-6">
                                {/* Identificación */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label>Tipo ID *</Label>
                                        <Select
                                            value={watch('tipo_identificacion')}
                                            onValueChange={(v) => setValue('tipo_identificacion', v)}
                                        >
                                            <SelectTrigger className={errors.tipo_identificacion ? 'border-red-500' : ''}>
                                                <SelectValue />
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
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Fecha de Nacimiento</Label>
                                        <Input type="date" {...register('fecha_nacimiento')} />
                                    </div>
                                </div>

                                {/* Nombres */}
                                <div className="grid grid-cols-4 gap-4">
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

                                {/* Contacto */}
                                <div className="border-t pt-4">
                                    <h4 className="font-medium mb-3 flex items-center gap-2 text-blue-700">
                                        <Phone className="h-4 w-4" />
                                        Información de Contacto
                                    </h4>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label>Email Principal *</Label>
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
                                        <div className="space-y-2">
                                            <Label>Teléfono Fijo</Label>
                                            <Input {...register('telefono_principal')} placeholder="6051234567" />
                                        </div>
                                    </div>
                                </div>

                                {/* Ubicación */}
                                <div className="border-t pt-4">
                                    <h4 className="font-medium mb-3">Ubicación</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Dirección Principal *</Label>
                                            <Input
                                                {...register('direccion_principal')}
                                                placeholder="Cra 10 # 20-30"
                                                className={errors.direccion_principal ? 'border-red-500' : ''}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Barrio / Zona</Label>
                                            <Input {...register('barrio_zona')} placeholder="Centro" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 mt-4">
                                        <div className="space-y-2">
                                            <Label>Ciudad *</Label>
                                            <Input {...register('ciudad')} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Departamento</Label>
                                            <Input {...register('departamento_geo')} />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )
                }

                {/* ═══════════════════════════════════════════════════════════════════════
                    PASO 2: DATOS LABORALES
                ═══════════════════════════════════════════════════════════════════════ */}
                {
                    paso === 2 && (
                        <Card>
                            <CardHeader className="bg-green-50 border-b">
                                <CardTitle className="flex items-center gap-2">
                                    <Briefcase className="h-5 w-5 text-green-600" />
                                    Datos Laborales
                                </CardTitle>
                                <CardDescription>
                                    Información contractual y operativa (tabla: empleados)
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-6">
                                {/* Cargo y Contrato */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label>Cargo *</Label>
                                        <Select
                                            value={cargoSeleccionado}
                                            onValueChange={handleCargoChange}
                                        >
                                            <SelectTrigger className={errors.cargo ? 'border-red-500' : ''}>
                                                <SelectValue placeholder="Seleccione cargo..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {CARGOS.map((c) => (
                                                    <SelectItem key={c.value} value={c.value}>
                                                        {c.label} {c.esTecnico && '🔧'}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Tipo de Contrato *</Label>
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
                                    <div className="space-y-2">
                                        <Label>Fecha de Ingreso *</Label>
                                        <Input
                                            type="date"
                                            {...register('fecha_ingreso')}
                                            className={errors.fecha_ingreso ? 'border-red-500' : ''}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Descripción del Cargo</Label>
                                        <Input {...register('descripcion_cargo')} placeholder="Ej: Mantenimiento de generadores" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Departamento / Área</Label>
                                        <Input {...register('departamento')} placeholder="Operaciones" />
                                    </div>
                                </div>

                                {/* Contacto Emergencia */}
                                <div className="border-t pt-4">
                                    <h4 className="font-medium mb-3 flex items-center gap-2 text-orange-600">
                                        <AlertCircle className="h-4 w-4" />
                                        Contacto de Emergencia (OBLIGATORIO)
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
                                        <div className="space-y-2">
                                            <Label>Nombre del Contacto *</Label>
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

                                {/* Roles Operativos */}
                                <div className="border-t pt-4">
                                    <h4 className="font-medium mb-3">Roles Operativos</h4>
                                    <div className="flex gap-6">
                                        <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                                            <Switch
                                                checked={watch('es_tecnico')}
                                                onCheckedChange={(v) => setValue('es_tecnico', v)}
                                            />
                                            <Label className="cursor-pointer">🔧 Es Técnico de Campo</Label>
                                        </div>
                                        <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg">
                                            <Switch
                                                checked={watch('es_asesor')}
                                                onCheckedChange={(v) => setValue('es_asesor', v)}
                                            />
                                            <Label className="cursor-pointer">💼 Es Asesor Comercial</Label>
                                        </div>
                                    </div>
                                </div>

                                {/* Licencia Conducción */}
                                <div className="border-t pt-4">
                                    <h4 className="font-medium mb-3 flex items-center gap-2">
                                        <Car className="h-4 w-4" />
                                        Licencia de Conducción
                                    </h4>
                                    <div className="flex items-center gap-4 mb-4">
                                        <Switch
                                            checked={puedeConducir}
                                            onCheckedChange={(v) => setValue('puede_conducir', v)}
                                        />
                                        <Label>¿Puede conducir vehículos de la empresa?</Label>
                                    </div>
                                    {puedeConducir && (
                                        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                                            <div className="space-y-2">
                                                <Label>Número de Licencia</Label>
                                                <Input {...register('licencia_conduccion')} placeholder="Ej: A2, B1, C1" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Fecha de Vencimiento</Label>
                                                <Input type="date" {...register('fecha_vencimiento_licencia')} />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Formación Académica */}
                                <div className="border-t pt-4">
                                    <h4 className="font-medium mb-3 flex items-center gap-2">
                                        <GraduationCap className="h-4 w-4" />
                                        Formación Académica
                                    </h4>
                                    <div className="grid grid-cols-3 gap-4">
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
                                        <div className="space-y-2">
                                            <Label>Institución Educativa</Label>
                                            <Input {...register('institucion_educativa')} placeholder="Universidad XYZ" />
                                        </div>
                                    </div>
                                </div>

                                {/* Extras */}
                                <div className="border-t pt-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Habilidades Especiales</Label>
                                            <Textarea
                                                {...register('habilidades_especiales')}
                                                placeholder="Ej: Soldadura TIG, Electricidad industrial, Programación PLC..."
                                                rows={2}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Observaciones</Label>
                                            <Textarea
                                                {...register('observaciones')}
                                                placeholder="Notas adicionales..."
                                                rows={2}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )
                }

                {/* ═══════════════════════════════════════════════════════════════════════
                    PASO 3: ACCESO AL SISTEMA
                ═══════════════════════════════════════════════════════════════════════ */}
                {
                    paso === 3 && (
                        <Card>
                            <CardHeader className="bg-purple-50 border-b">
                                <CardTitle className="flex items-center gap-2">
                                    <KeyRound className="h-5 w-5 text-purple-600" />
                                    Acceso al Sistema
                                </CardTitle>
                                <CardDescription>
                                    Configuración de credenciales y roles (tabla: usuarios)
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-6">
                                {/* Switch principal */}
                                <div className={cn(
                                    'flex items-center justify-between p-4 rounded-lg border-2 transition-all',
                                    crearAcceso ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-200'
                                )}>
                                    <div>
                                        <h4 className="font-semibold flex items-center gap-2">
                                            <UserPlus className="h-5 w-5" />
                                            ¿Crear Usuario del Sistema?
                                        </h4>
                                        <p className="text-sm text-gray-600 mt-1">
                                            {crearAcceso
                                                ? '✅ El empleado podrá acceder al portal admin y/o app móvil'
                                                : '⚠️ El empleado quedará registrado SIN acceso al sistema'
                                            }
                                        </p>
                                    </div>
                                    <Switch
                                        checked={crearAcceso}
                                        onCheckedChange={(v) => setValue('crear_acceso_sistema', v)}
                                        className="scale-125"
                                    />
                                </div>

                                {crearAcceso && (
                                    <>
                                        {/* Credenciales */}
                                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                                            <h4 className="font-medium mb-4 flex items-center gap-2 text-blue-700">
                                                <Shield className="h-4 w-4" />
                                                Credenciales de Acceso
                                            </h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>Nombre de Usuario *</Label>
                                                    <Input
                                                        {...register('username')}
                                                        placeholder={`Ej: ${primerNombre?.charAt(0).toLowerCase() || 'j'}${primerApellido?.toLowerCase() || 'perez'}`}
                                                        autoComplete="off"
                                                    />
                                                    <p className="text-xs text-gray-500">
                                                        Solo letras minúsculas, números, puntos y guiones
                                                    </p>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Contraseña *</Label>
                                                    <div className="flex gap-2">
                                                        <div className="relative flex-1">
                                                            <Input
                                                                type={showPassword ? 'text' : 'password'}
                                                                {...register('password')}
                                                                placeholder="Ingrese o genere una contraseña"
                                                                autoComplete="new-password"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowPassword(!showPassword)}
                                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                                            >
                                                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                            </button>
                                                        </div>
                                                        <Button type="button" variant="outline" onClick={generarPassword}>
                                                            🔑 Generar
                                                        </Button>
                                                    </div>
                                                    <p className="text-xs text-gray-500">
                                                        Mínimo 8 caracteres. Click en "Generar" para crear una contraseña segura.
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                                                <Switch
                                                    checked={watch('debe_cambiar_password')}
                                                    onCheckedChange={(v) => setValue('debe_cambiar_password', v)}
                                                />
                                                <Label className="cursor-pointer">
                                                    Forzar cambio de contraseña en primer inicio
                                                </Label>
                                            </div>
                                        </div>

                                        {/* Selector de Roles - DINÁMICO desde Backend */}
                                        <div>
                                            <h4 className="font-medium mb-3 flex items-center gap-2">
                                                <Shield className="h-4 w-4 text-purple-600" />
                                                Roles del Sistema
                                            </h4>
                                            {cargandoRoles ? (
                                                <div className="flex items-center justify-center py-4">
                                                    <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
                                                    <span className="ml-2 text-sm text-gray-500">Cargando roles...</span>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-2 gap-3">
                                                    {(rolesDisponibles || []).map((rol: Rol) => (
                                                        <button
                                                            key={rol.id_rol}
                                                            type="button"
                                                            onClick={() => toggleRol(rol.id_rol)}
                                                            className={cn(
                                                                'p-3 rounded-lg border-2 text-left transition-all',
                                                                rolesSeleccionados.includes(rol.id_rol)
                                                                    ? 'bg-purple-100 border-purple-500 ring-2 ring-purple-200'
                                                                    : 'bg-white border-gray-200 hover:border-purple-300'
                                                            )}
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <span className="font-medium">{rol.nombre_rol}</span>
                                                                {rolesSeleccionados.includes(rol.id_rol) && (
                                                                    <Check className="h-5 w-5 text-purple-600" />
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-gray-500 mt-1">{rol.descripcion || 'Sin descripción'}</p>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                            {!cargandoRoles && rolesSeleccionados.length === 0 && (
                                                <p className="text-sm text-orange-600 mt-2">
                                                    ⚠️ Seleccione al menos un rol para el usuario
                                                </p>
                                            )}
                                        </div>
                                    </>
                                )}

                                {!crearAcceso && (
                                    <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
                                        <AlertCircle className="h-10 w-10 text-yellow-500 mx-auto mb-3" />
                                        <h4 className="font-semibold text-yellow-800">Sin Acceso al Sistema</h4>
                                        <p className="text-sm text-yellow-700 mt-2">
                                            El empleado será registrado en la base de datos pero NO podrá iniciar sesión
                                            en el portal ni en la app móvil. Podrá crear el acceso posteriormente desde
                                            la gestión de usuarios.
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )
                }

                {/* ═══════════════════════════════════════════════════════════════════════
                    NAVEGACIÓN
                ═══════════════════════════════════════════════════════════════════════ */}
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

                    <div className="flex gap-2">
                        {paso < 3 ? (
                            <Button type="button" onClick={avanzarPaso}>
                                Siguiente
                                <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                onClick={() => {
                                    // Solo enviar si no está procesando y hay roles seleccionados (si aplica)
                                    if (!isSubmitting && (!crearAcceso || rolesSeleccionados.length > 0)) {
                                        form.handleSubmit(onSubmit)();
                                    }
                                }}
                                disabled={isSubmitting || (crearAcceso && rolesSeleccionados.length === 0)}
                                className="min-w-[180px]"
                            >
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
            </form >

            {/* ═══════════════════════════════════════════════════════════════════════
                MODAL DE ÉXITO CON CREDENCIALES
            ═══════════════════════════════════════════════════════════════════════ */}
            < Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal} >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-green-600">
                            <Check className="h-6 w-6" />
                            ¡Empleado Registrado!
                        </DialogTitle>
                        <DialogDescription>
                            El empleado ha sido creado exitosamente con acceso al sistema.
                            <strong className="block mt-2 text-orange-600">
                                ⚠️ IMPORTANTE: Guarde estas credenciales, no se mostrarán de nuevo.
                            </strong>
                        </DialogDescription>
                    </DialogHeader>

                    {credencialesCreadas && (
                        <div className="space-y-4 py-4">
                            <div className="p-4 bg-gray-50 rounded-lg font-mono text-sm space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Usuario:</span>
                                    <span className="font-bold">{credencialesCreadas.username}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Contraseña:</span>
                                    <span className="font-bold text-blue-600">{credencialesCreadas.password}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Email:</span>
                                    <span>{credencialesCreadas.email}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Roles:</span>
                                    <span>{credencialesCreadas.roles.join(', ') || 'Ninguno'}</span>
                                </div>
                            </div>

                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={copiarCredenciales}
                            >
                                <ClipboardCopy className="h-4 w-4 mr-2" />
                                Copiar Credenciales
                            </Button>
                        </div>
                    )}

                    <DialogFooter>
                        <Button onClick={cerrarModalYSalir} className="w-full">
                            Entendido, Continuar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog >
        </>
    );
}
