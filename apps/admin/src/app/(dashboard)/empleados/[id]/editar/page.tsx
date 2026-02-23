/**
 * MEKANOS S.A.S - Portal Admin
 * Edición Enterprise de Empleado (CRUD Completo Super Entidad)
 * 
 * Ruta: /empleados/[id]/editar
 * 
 * Control TOTAL sobre las 3 tablas:
 * - personas (identificación, contacto, ubicación)
 * - empleados (cargo, contrato, emergencia, licencia, formación)
 * - usuarios (acceso al sistema, estado, roles)
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { getEmpleado } from '@/features/empleados/api/empleados.service';
import { useRoles } from '@/features/usuarios/lib/usuarios.service';
import { apiClient } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    AlertCircle,
    AlertTriangle,
    ArrowLeft,
    Briefcase,
    Car,
    Check,
    Eye,
    EyeOff,
    GraduationCap,
    KeyRound,
    Loader2,
    Lock,
    MapPin,
    Phone,
    Save,
    Shield,
    User,
    UserX,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTES Y ENUMS
// ═══════════════════════════════════════════════════════════════════════════════

const TIPOS_IDENTIFICACION = [
    { value: 'CC', label: 'Cédula de Ciudadanía' },
    { value: 'CE', label: 'Cédula de Extranjería' },
    { value: 'PA', label: 'Pasaporte' },
    { value: 'TI', label: 'Tarjeta de Identidad' },
    { value: 'NIT', label: 'NIT (Empresas)' },
];

const CARGOS = [
    { value: 'GERENTE_GENERAL', label: 'Gerente General' },
    { value: 'GERENTE_OPERACIONES', label: 'Gerente de Operaciones' },
    { value: 'ADMINISTRADOR', label: 'Administrador' },
    { value: 'SUPERVISOR_TECNICO', label: 'Supervisor Técnico' },
    { value: 'TECNICO_SENIOR', label: 'Técnico Senior' },
    { value: 'TECNICO_JUNIOR', label: 'Técnico Junior' },
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

const ESTADOS_USUARIO = [
    { value: 'ACTIVO', label: 'Activo', color: 'bg-green-500' },
    { value: 'INACTIVO', label: 'Inactivo', color: 'bg-gray-500' },
    { value: 'SUSPENDIDO', label: 'Suspendido', color: 'bg-yellow-500' },
    { value: 'BLOQUEADO', label: 'Bloqueado', color: 'bg-red-500' },
    { value: 'PENDIENTE_ACTIVACION', label: 'Pendiente Activación', color: 'bg-blue-500' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

interface PersonaData {
    tipo_identificacion: string;
    numero_identificacion: string;
    primer_nombre: string;
    segundo_nombre?: string;
    primer_apellido: string;
    segundo_apellido?: string;
    fecha_nacimiento?: string;
    email_principal: string;
    telefono_principal?: string;
    celular?: string;
    direccion_principal?: string;
    barrio_zona?: string;
    ciudad: string;
    departamento?: string;
    observaciones?: string;
    activo: boolean;
}

interface EmpleadoData {
    cargo: string;
    descripcion_cargo?: string;
    tipo_contrato: string;
    fecha_ingreso: string;
    fecha_retiro?: string;
    motivo_retiro?: string;
    departamento?: string;
    contacto_emergencia: string;
    telefono_emergencia: string;
    nivel_academico?: string;
    titulo_obtenido?: string;
    institucion_educativa?: string;
    es_tecnico: boolean;
    es_asesor: boolean;
    puede_conducir: boolean;
    licencia_conduccion?: string;
    fecha_vencimiento_licencia?: string;
    habilidades_especiales?: string;
    observaciones?: string;
    empleado_activo: boolean;
}

interface UsuarioData {
    username: string;
    email: string;
    estado: string;
    debe_cambiar_password: boolean;
    roles: number[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function EditarEmpleadoPage() {
    const params = useParams();
    const router = useRouter();
    const queryClient = useQueryClient();
    const id = Number(params.id);

    // Estados del formulario
    const [personaData, setPersonaData] = useState<PersonaData | null>(null);
    const [empleadoData, setEmpleadoData] = useState<EmpleadoData | null>(null);
    const [usuarioData, setUsuarioData] = useState<UsuarioData | null>(null);
    const [hasUsuario, setHasUsuario] = useState(false);
    const [activeTab, setActiveTab] = useState('persona');
    const [saving, setSaving] = useState(false);

    // Estados para edición de credenciales (campos críticos)
    const [editandoUsername, setEditandoUsername] = useState(false);
    const [editandoPassword, setEditandoPassword] = useState(false);
    const [nuevoUsername, setNuevoUsername] = useState('');
    const [nuevaPassword, setNuevaPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');

    // Función para cargar la contraseña actual (solo para admins)
    const loadCurrentPassword = async () => {
        if (!hasUsuario || !showCurrentPassword) return;

        try {
            const usuario = (empleado as any).usuario;
            if (usuario) {
                const response = await apiClient.get(`/usuarios/${usuario.id_usuario}/password-preview`);
                setCurrentPassword(
                    response.data.password_hash_preview || 'Sin contraseña'
                );
            }
        } catch (error) {
            console.error('Error loading password:', error);
            setCurrentPassword('Error al cargar contraseña');
        }
    };

    // Efecto para cargar contraseña cuando se activa el toggle
    useEffect(() => {
        if (showCurrentPassword && hasUsuario) {
            loadCurrentPassword();
        } else {
            setCurrentPassword('');
        }
    }, [showCurrentPassword, hasUsuario]);

    // Cargar datos del empleado
    const { data: empleado, isLoading, isError } = useQuery({
        queryKey: ['empleado', id],
        queryFn: () => getEmpleado(id),
        enabled: !isNaN(id),
    });

    // Cargar roles disponibles
    const { data: rolesDisponibles } = useRoles();

    // Inicializar formularios cuando se cargan los datos
    useEffect(() => {
        if (empleado) {
            const persona = empleado.persona;
            if (persona) {
                setPersonaData({
                    tipo_identificacion: persona.tipo_identificacion || 'CC',
                    numero_identificacion: persona.numero_identificacion || '',
                    primer_nombre: persona.primer_nombre || '',
                    segundo_nombre: persona.segundo_nombre || '',
                    primer_apellido: persona.primer_apellido || '',
                    segundo_apellido: persona.segundo_apellido || '',
                    fecha_nacimiento: persona.fecha_nacimiento?.split('T')[0] || '',
                    email_principal: persona.email_principal || '',
                    telefono_principal: persona.telefono_principal || '',
                    celular: persona.celular || '',
                    direccion_principal: persona.direccion_principal || '',
                    barrio_zona: persona.barrio_zona || '',
                    ciudad: persona.ciudad || 'CARTAGENA',
                    departamento: persona.departamento || 'BOLÍVAR',
                    observaciones: persona.observaciones || '',
                    activo: persona.activo !== false,
                });
            }

            setEmpleadoData({
                cargo: empleado.cargo || '',
                descripcion_cargo: empleado.descripcion_cargo || '',
                tipo_contrato: empleado.tipo_contrato || 'INDEFINIDO',
                fecha_ingreso: empleado.fecha_ingreso?.split('T')[0] || '',
                fecha_retiro: empleado.fecha_retiro?.split('T')[0] || '',
                motivo_retiro: empleado.motivo_retiro || '',
                departamento: empleado.departamento || '',
                contacto_emergencia: empleado.contacto_emergencia || '',
                telefono_emergencia: empleado.telefono_emergencia || '',
                nivel_academico: empleado.nivel_academico || '',
                titulo_obtenido: empleado.titulo_obtenido || '',
                institucion_educativa: empleado.institucion_educativa || '',
                es_tecnico: empleado.es_tecnico || false,
                es_asesor: empleado.es_asesor || false,
                puede_conducir: empleado.puede_conducir || false,
                licencia_conduccion: empleado.licencia_conduccion || '',
                fecha_vencimiento_licencia: empleado.fecha_vencimiento_licencia?.split('T')[0] || '',
                habilidades_especiales: empleado.habilidades_especiales || '',
                observaciones: empleado.observaciones || '',
                empleado_activo: empleado.empleado_activo !== false,
            });

            // Verificar si tiene usuario asociado
            const usuario = (empleado as any).usuario;
            if (usuario) {
                setHasUsuario(true);
                setUsuarioData({
                    username: usuario.username || '',
                    email: usuario.email || '',
                    estado: usuario.estado || 'ACTIVO',
                    debe_cambiar_password: usuario.debe_cambiar_password || false,
                    roles: usuario.usuarios_roles?.map((ur: any) => ur.id_rol) || [],
                });
            }
        }
    }, [empleado]);

    // Mutaciones para guardar
    const updatePersona = useMutation({
        mutationFn: async (data: Partial<PersonaData>) => {
            const response = await apiClient.put(`/personas/${empleado?.id_persona}`, data);
            return response.data;
        },
    });

    const updateEmpleado = useMutation({
        mutationFn: async (data: Partial<EmpleadoData>) => {
            const response = await apiClient.put(`/empleados/${id}`, data);
            return response.data;
        },
    });

    const updateUsuario = useMutation({
        mutationFn: async (data: Partial<UsuarioData & { rolesIds?: number[] }>) => {
            const usuario = (empleado as any).usuario;
            if (usuario) {
                const response = await apiClient.put(`/usuarios/${usuario.id_usuario}`, data);
                return response.data;
            }
        },
    });

    // Helper: Convertir fecha YYYY-MM-DD a ISO-8601 DateTime
    const toISODateTime = (dateStr: string | undefined): string | undefined => {
        if (!dateStr) return undefined;
        return new Date(dateStr + 'T00:00:00.000Z').toISOString();
    };

    // Guardar TODO
    const handleSaveAll = async () => {
        setSaving(true);
        try {
            // Guardar persona
            if (personaData && empleado?.id_persona) {
                await updatePersona.mutateAsync({
                    ...personaData,
                    fecha_nacimiento: toISODateTime(personaData.fecha_nacimiento),
                });
            }

            // Guardar empleado
            if (empleadoData) {
                await updateEmpleado.mutateAsync({
                    ...empleadoData,
                    fecha_ingreso: toISODateTime(empleadoData.fecha_ingreso),
                    fecha_retiro: toISODateTime(empleadoData.fecha_retiro),
                    fecha_vencimiento_licencia: toISODateTime(empleadoData.fecha_vencimiento_licencia),
                });
            }

            // Guardar usuario si existe
            if (hasUsuario && usuarioData) {
                await updateUsuario.mutateAsync({
                    estado: usuarioData.estado,
                    debe_cambiar_password: usuarioData.debe_cambiar_password,
                });
            }

            // Invalidar cache
            queryClient.invalidateQueries({ queryKey: ['empleado', id] });
            queryClient.invalidateQueries({ queryKey: ['empleados'] });

            toast.success('Empleado actualizado correctamente');
            router.push(`/empleados/${id}`);
        } catch (error: any) {
            toast.error(`Error al guardar: ${error.message || 'Error desconocido'}`);
        } finally {
            setSaving(false);
        }
    };

    // Loading
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    // Error
    if (isError || !empleado) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
                <h2 className="text-xl font-semibold text-gray-900">Error al cargar empleado</h2>
                <Button onClick={() => router.push('/empleados')} className="mt-4">
                    Volver al listado
                </Button>
            </div>
        );
    }

    const nombreCompleto = personaData
        ? `${personaData.primer_nombre} ${personaData.segundo_nombre || ''} ${personaData.primer_apellido} ${personaData.segundo_apellido || ''}`.trim()
        : 'Empleado';

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push(`/empleados/${id}`)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Editar: {nombreCompleto}</h1>
                        <p className="text-gray-500 flex items-center gap-2">
                            <span className="font-mono text-sm">{empleado.codigo_empleado}</span>
                            <span>•</span>
                            <span>CRUD Enterprise - Control Total</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={() => router.push(`/empleados/${id}`)}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSaveAll} disabled={saving}>
                        {saving ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Guardando...
                            </>
                        ) : (
                            <>
                                <Save className="h-4 w-4 mr-2" />
                                Guardar Todo
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Tabs de edición */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="persona" className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Datos Personales
                    </TabsTrigger>
                    <TabsTrigger value="empleado" className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        Datos Laborales
                    </TabsTrigger>
                    <TabsTrigger value="usuario" className="flex items-center gap-2">
                        <KeyRound className="h-4 w-4" />
                        Acceso Sistema
                    </TabsTrigger>
                </TabsList>

                {/* ═══════════════════════════════════════════════════════════════════
                    TAB 1: DATOS PERSONALES
                ═══════════════════════════════════════════════════════════════════ */}
                <TabsContent value="persona" className="space-y-4">
                    {personaData && (
                        <>
                            <Card>
                                <CardHeader className="bg-blue-50 border-b">
                                    <CardTitle className="flex items-center gap-2">
                                        <User className="h-5 w-5 text-blue-600" />
                                        Identificación
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-6 space-y-4">
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label>Tipo ID *</Label>
                                            <Select
                                                value={personaData.tipo_identificacion}
                                                onValueChange={(v) => setPersonaData({ ...personaData, tipo_identificacion: v })}
                                            >
                                                <SelectTrigger>
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
                                                value={personaData.numero_identificacion}
                                                onChange={(e) => setPersonaData({ ...personaData, numero_identificacion: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Fecha de Nacimiento</Label>
                                            <Input
                                                type="date"
                                                value={personaData.fecha_nacimiento || ''}
                                                onChange={(e) => setPersonaData({ ...personaData, fecha_nacimiento: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-4 gap-4">
                                        <div className="space-y-2">
                                            <Label>Primer Nombre *</Label>
                                            <Input
                                                value={personaData.primer_nombre}
                                                onChange={(e) => setPersonaData({ ...personaData, primer_nombre: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Segundo Nombre</Label>
                                            <Input
                                                value={personaData.segundo_nombre || ''}
                                                onChange={(e) => setPersonaData({ ...personaData, segundo_nombre: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Primer Apellido *</Label>
                                            <Input
                                                value={personaData.primer_apellido}
                                                onChange={(e) => setPersonaData({ ...personaData, primer_apellido: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Segundo Apellido</Label>
                                            <Input
                                                value={personaData.segundo_apellido || ''}
                                                onChange={(e) => setPersonaData({ ...personaData, segundo_apellido: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 pt-4 border-t">
                                        <Switch
                                            checked={personaData.activo}
                                            onCheckedChange={(v) => setPersonaData({ ...personaData, activo: v })}
                                        />
                                        <Label className={cn(
                                            'font-medium',
                                            personaData.activo ? 'text-green-700' : 'text-red-700'
                                        )}>
                                            {personaData.activo ? '✓ Persona Activa' : '✗ Persona Inactiva'}
                                        </Label>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="bg-blue-50 border-b">
                                    <CardTitle className="flex items-center gap-2">
                                        <Phone className="h-5 w-5 text-blue-600" />
                                        Contacto
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-6 space-y-4">
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label>Email Principal *</Label>
                                            <Input
                                                type="email"
                                                value={personaData.email_principal}
                                                onChange={(e) => setPersonaData({ ...personaData, email_principal: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Celular</Label>
                                            <Input
                                                value={personaData.celular || ''}
                                                onChange={(e) => setPersonaData({ ...personaData, celular: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Teléfono Fijo</Label>
                                            <Input
                                                value={personaData.telefono_principal || ''}
                                                onChange={(e) => setPersonaData({ ...personaData, telefono_principal: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="bg-blue-50 border-b">
                                    <CardTitle className="flex items-center gap-2">
                                        <MapPin className="h-5 w-5 text-blue-600" />
                                        Ubicación
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-6 space-y-4">
                                    <div className="space-y-2">
                                        <Label>Dirección Principal</Label>
                                        <Input
                                            value={personaData.direccion_principal || ''}
                                            onChange={(e) => setPersonaData({ ...personaData, direccion_principal: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label>Barrio/Zona</Label>
                                            <Input
                                                value={personaData.barrio_zona || ''}
                                                onChange={(e) => setPersonaData({ ...personaData, barrio_zona: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Ciudad *</Label>
                                            <Input
                                                value={personaData.ciudad}
                                                onChange={(e) => setPersonaData({ ...personaData, ciudad: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Departamento</Label>
                                            <Input
                                                value={personaData.departamento || ''}
                                                onChange={(e) => setPersonaData({ ...personaData, departamento: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    )}
                </TabsContent>

                {/* ═══════════════════════════════════════════════════════════════════
                    TAB 2: DATOS LABORALES
                ═══════════════════════════════════════════════════════════════════ */}
                <TabsContent value="empleado" className="space-y-4">
                    {empleadoData && (
                        <>
                            <Card>
                                <CardHeader className="bg-green-50 border-b">
                                    <CardTitle className="flex items-center gap-2">
                                        <Briefcase className="h-5 w-5 text-green-600" />
                                        Información Laboral
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-6 space-y-4">
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label>Cargo *</Label>
                                            <Select
                                                value={empleadoData.cargo}
                                                onValueChange={(v) => setEmpleadoData({ ...empleadoData, cargo: v })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
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
                                                value={empleadoData.tipo_contrato}
                                                onValueChange={(v) => setEmpleadoData({ ...empleadoData, tipo_contrato: v })}
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
                                            <Label>Departamento</Label>
                                            <Input
                                                value={empleadoData.departamento || ''}
                                                onChange={(e) => setEmpleadoData({ ...empleadoData, departamento: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Descripción del Cargo</Label>
                                        <Textarea
                                            value={empleadoData.descripcion_cargo || ''}
                                            onChange={(e) => setEmpleadoData({ ...empleadoData, descripcion_cargo: e.target.value })}
                                            rows={2}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Fecha de Ingreso *</Label>
                                            <Input
                                                type="date"
                                                value={empleadoData.fecha_ingreso}
                                                onChange={(e) => setEmpleadoData({ ...empleadoData, fecha_ingreso: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Fecha de Retiro</Label>
                                            <Input
                                                type="date"
                                                value={empleadoData.fecha_retiro || ''}
                                                onChange={(e) => setEmpleadoData({ ...empleadoData, fecha_retiro: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    {empleadoData.fecha_retiro && (
                                        <div className="space-y-2">
                                            <Label>Motivo de Retiro</Label>
                                            <Textarea
                                                value={empleadoData.motivo_retiro || ''}
                                                onChange={(e) => setEmpleadoData({ ...empleadoData, motivo_retiro: e.target.value })}
                                                rows={2}
                                            />
                                        </div>
                                    )}

                                    <div className="flex items-center gap-6 pt-4 border-t">
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                checked={empleadoData.es_tecnico}
                                                onCheckedChange={(v) => setEmpleadoData({ ...empleadoData, es_tecnico: v })}
                                            />
                                            <Label>Es Técnico</Label>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                checked={empleadoData.es_asesor}
                                                onCheckedChange={(v) => setEmpleadoData({ ...empleadoData, es_asesor: v })}
                                            />
                                            <Label>Es Asesor</Label>
                                        </div>
                                        <div className="flex-1" />
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                checked={empleadoData.empleado_activo}
                                                onCheckedChange={(v) => setEmpleadoData({ ...empleadoData, empleado_activo: v })}
                                            />
                                            <Label className={cn(
                                                'font-medium',
                                                empleadoData.empleado_activo ? 'text-green-700' : 'text-red-700'
                                            )}>
                                                {empleadoData.empleado_activo ? '✓ Empleado Activo' : '✗ Empleado Inactivo'}
                                            </Label>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-orange-200">
                                <CardHeader className="bg-orange-50 border-b">
                                    <CardTitle className="flex items-center gap-2 text-orange-700">
                                        <AlertCircle className="h-5 w-5" />
                                        Contacto de Emergencia
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Nombre del Contacto *</Label>
                                            <Input
                                                value={empleadoData.contacto_emergencia}
                                                onChange={(e) => setEmpleadoData({ ...empleadoData, contacto_emergencia: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Teléfono de Emergencia *</Label>
                                            <Input
                                                value={empleadoData.telefono_emergencia}
                                                onChange={(e) => setEmpleadoData({ ...empleadoData, telefono_emergencia: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="bg-green-50 border-b">
                                    <CardTitle className="flex items-center gap-2">
                                        <Car className="h-5 w-5 text-green-600" />
                                        Licencia de Conducción
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-6 space-y-4">
                                    <div className="flex items-center gap-4">
                                        <Switch
                                            checked={empleadoData.puede_conducir}
                                            onCheckedChange={(v) => setEmpleadoData({ ...empleadoData, puede_conducir: v })}
                                        />
                                        <Label>Habilitado para conducir vehículos de la empresa</Label>
                                    </div>
                                    {empleadoData.puede_conducir && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Número de Licencia</Label>
                                                <Input
                                                    value={empleadoData.licencia_conduccion || ''}
                                                    onChange={(e) => setEmpleadoData({ ...empleadoData, licencia_conduccion: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Fecha de Vencimiento</Label>
                                                <Input
                                                    type="date"
                                                    value={empleadoData.fecha_vencimiento_licencia || ''}
                                                    onChange={(e) => setEmpleadoData({ ...empleadoData, fecha_vencimiento_licencia: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="bg-indigo-50 border-b">
                                    <CardTitle className="flex items-center gap-2">
                                        <GraduationCap className="h-5 w-5 text-indigo-600" />
                                        Formación Académica y Habilidades
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-6 space-y-4">
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label>Nivel Académico</Label>
                                            <Select
                                                value={empleadoData.nivel_academico || ''}
                                                onValueChange={(v) => setEmpleadoData({ ...empleadoData, nivel_academico: v })}
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
                                            <Input
                                                value={empleadoData.titulo_obtenido || ''}
                                                onChange={(e) => setEmpleadoData({ ...empleadoData, titulo_obtenido: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Institución Educativa</Label>
                                            <Input
                                                value={empleadoData.institucion_educativa || ''}
                                                onChange={(e) => setEmpleadoData({ ...empleadoData, institucion_educativa: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Habilidades Especiales</Label>
                                        <Textarea
                                            value={empleadoData.habilidades_especiales || ''}
                                            onChange={(e) => setEmpleadoData({ ...empleadoData, habilidades_especiales: e.target.value })}
                                            placeholder="Ej: Soldadura TIG, Electricidad industrial, Programación PLC..."
                                            rows={3}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Observaciones</Label>
                                        <Textarea
                                            value={empleadoData.observaciones || ''}
                                            onChange={(e) => setEmpleadoData({ ...empleadoData, observaciones: e.target.value })}
                                            rows={2}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    )}
                </TabsContent>

                {/* ═══════════════════════════════════════════════════════════════════
                    TAB 3: ACCESO AL SISTEMA
                ═══════════════════════════════════════════════════════════════════ */}
                <TabsContent value="usuario" className="space-y-4">
                    {hasUsuario && usuarioData ? (
                        <>
                            <Card className="border-purple-200">
                                <CardHeader className="bg-purple-50 border-b">
                                    <CardTitle className="flex items-center gap-2">
                                        <KeyRound className="h-5 w-5 text-purple-600" />
                                        Credenciales del Sistema
                                    </CardTitle>
                                    <CardDescription>
                                        ID Usuario: {(empleado as any).usuario?.id_usuario}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="pt-6 space-y-4">
                                    {/* Username - Campo Crítico con Confirmación */}
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2">
                                            <User className="h-4 w-4" />
                                            Username
                                            <span className="text-xs text-orange-500 font-normal">(Campo Crítico)</span>
                                        </Label>
                                        {!editandoUsername ? (
                                            <div className="flex gap-2">
                                                <Input value={usuarioData.username} disabled className="bg-gray-100 flex-1" />
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        setNuevoUsername(usuarioData.username);
                                                        setEditandoUsername(true);
                                                    }}
                                                >
                                                    <Lock className="h-4 w-4 mr-1" />
                                                    Cambiar
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg space-y-3">
                                                <div className="flex items-center gap-2 text-orange-700">
                                                    <AlertTriangle className="h-5 w-5" />
                                                    <span className="font-semibold">⚠️ Cambio de Username</span>
                                                </div>
                                                <p className="text-sm text-orange-600">
                                                    El usuario deberá usar el nuevo username para iniciar sesión.
                                                </p>
                                                <Input
                                                    value={nuevoUsername}
                                                    onChange={(e) => setNuevoUsername(e.target.value)}
                                                    placeholder="Nuevo username"
                                                />
                                                <div className="flex gap-2">
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        onClick={() => {
                                                            if (nuevoUsername && nuevoUsername !== usuarioData.username) {
                                                                setUsuarioData({ ...usuarioData, username: nuevoUsername });
                                                                toast.info('Username actualizado (pendiente guardar)');
                                                            }
                                                            setEditandoUsername(false);
                                                        }}
                                                    >
                                                        Confirmar Cambio
                                                    </Button>
                                                    <Button type="button" variant="outline" size="sm" onClick={() => setEditandoUsername(false)}>
                                                        Cancelar
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Email - Sincronizado desde Persona */}
                                    <div className="space-y-2">
                                        <Label>Email</Label>
                                        <Input value={usuarioData.email} disabled className="bg-gray-100" />
                                        <p className="text-xs text-gray-500">El email se sincroniza automáticamente desde los datos personales</p>
                                    </div>

                                    {/* Password - Campo Crítico con Confirmación */}
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2">
                                            <KeyRound className="h-4 w-4" />
                                            Contraseña
                                            <span className="text-xs text-orange-500 font-normal">(Campo Crítico)</span>
                                        </Label>
                                        {!editandoPassword ? (
                                            <div className="flex gap-2">
                                                <div className="relative flex-1">
                                                    <Input
                                                        type={showCurrentPassword ? 'text' : 'password'}
                                                        value={showCurrentPassword ? currentPassword : '••••••••••'}
                                                        disabled
                                                        className="bg-gray-100 pr-10"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                                        title={showCurrentPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                                    >
                                                        {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    </button>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        setNuevaPassword('');
                                                        setEditandoPassword(true);
                                                    }}
                                                >
                                                    <Lock className="h-4 w-4 mr-1" />
                                                    Restablecer
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-3">
                                                <div className="flex items-center gap-2 text-red-700">
                                                    <AlertTriangle className="h-5 w-5" />
                                                    <span className="font-semibold">🔐 Restablecer Contraseña</span>
                                                </div>
                                                <p className="text-sm text-red-600">
                                                    La contraseña actual será reemplazada. El usuario deberá usar la nueva contraseña.
                                                </p>
                                                <div className="relative">
                                                    <Input
                                                        type={showNewPassword ? 'text' : 'password'}
                                                        value={nuevaPassword}
                                                        onChange={(e) => setNuevaPassword(e.target.value)}
                                                        placeholder="Nueva contraseña (mín. 8 caracteres)"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
                                                    >
                                                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    </button>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={async () => {
                                                            if (nuevaPassword.length >= 8) {
                                                                try {
                                                                    const usuario = (empleado as any).usuario;
                                                                    await apiClient.put(`/usuarios/${usuario.id_usuario}/reset-password`, {
                                                                        newPassword: nuevaPassword,
                                                                    });
                                                                    toast.success('Contraseña restablecida exitosamente');
                                                                    setEditandoPassword(false);
                                                                    setNuevaPassword('');
                                                                } catch (error: any) {
                                                                    toast.error(`Error: ${error.message}`);
                                                                }
                                                            } else {
                                                                toast.error('La contraseña debe tener al menos 8 caracteres');
                                                            }
                                                        }}
                                                        disabled={nuevaPassword.length < 8}
                                                    >
                                                        Confirmar Nueva Contraseña
                                                    </Button>
                                                    <Button type="button" variant="outline" size="sm" onClick={() => setEditandoPassword(false)}>
                                                        Cancelar
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-4 pt-4 border-t">
                                        <Switch
                                            checked={usuarioData.debe_cambiar_password}
                                            onCheckedChange={(v) => setUsuarioData({ ...usuarioData, debe_cambiar_password: v })}
                                        />
                                        <Label>Forzar cambio de contraseña en próximo inicio de sesión</Label>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-2 border-purple-300">
                                <CardHeader className="bg-purple-100 border-b">
                                    <CardTitle className="flex items-center gap-2">
                                        <Shield className="h-5 w-5 text-purple-700" />
                                        Estado del Usuario
                                    </CardTitle>
                                    <CardDescription>
                                        Control de acceso al sistema (Portal Admin y App Móvil)
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    <div className="grid grid-cols-5 gap-3">
                                        {ESTADOS_USUARIO.map((estado) => (
                                            <button
                                                key={estado.value}
                                                type="button"
                                                onClick={() => setUsuarioData({ ...usuarioData, estado: estado.value })}
                                                className={cn(
                                                    'p-4 rounded-lg border-2 text-center transition-all',
                                                    usuarioData.estado === estado.value
                                                        ? 'bg-purple-100 border-purple-500 ring-2 ring-purple-200'
                                                        : 'bg-white border-gray-200 hover:border-purple-300'
                                                )}
                                            >
                                                <div className={cn(
                                                    'w-3 h-3 rounded-full mx-auto mb-2',
                                                    estado.color
                                                )} />
                                                <span className="font-medium text-sm">{estado.label}</span>
                                                {usuarioData.estado === estado.value && (
                                                    <Check className="h-4 w-4 text-purple-600 mx-auto mt-1" />
                                                )}
                                            </button>
                                        ))}
                                    </div>

                                    <div className={cn(
                                        'mt-4 p-4 rounded-lg',
                                        usuarioData.estado === 'ACTIVO' ? 'bg-green-50 border border-green-200' :
                                            usuarioData.estado === 'INACTIVO' ? 'bg-gray-50 border border-gray-200' :
                                                usuarioData.estado === 'BLOQUEADO' ? 'bg-red-50 border border-red-200' :
                                                    'bg-yellow-50 border border-yellow-200'
                                    )}>
                                        {usuarioData.estado === 'ACTIVO' && (
                                            <p className="text-green-700 text-sm">
                                                ✅ El usuario puede acceder normalmente al Portal Admin y la App Móvil.
                                            </p>
                                        )}
                                        {usuarioData.estado === 'INACTIVO' && (
                                            <p className="text-gray-700 text-sm">
                                                ⚪ El usuario NO puede iniciar sesión. Cuenta deshabilitada.
                                            </p>
                                        )}
                                        {usuarioData.estado === 'SUSPENDIDO' && (
                                            <p className="text-yellow-700 text-sm">
                                                ⚠️ Cuenta suspendida temporalmente. El usuario no puede acceder.
                                            </p>
                                        )}
                                        {usuarioData.estado === 'BLOQUEADO' && (
                                            <p className="text-red-700 text-sm">
                                                🔒 Cuenta bloqueada por seguridad (posibles intentos fallidos).
                                            </p>
                                        )}
                                        {usuarioData.estado === 'PENDIENTE_ACTIVACION' && (
                                            <p className="text-blue-700 text-sm">
                                                📧 Pendiente de activación. El usuario debe confirmar su cuenta.
                                            </p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="bg-purple-50 border-b">
                                    <CardTitle className="flex items-center gap-2">
                                        <Shield className="h-5 w-5 text-purple-600" />
                                        Roles Asignados
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    <div className="grid grid-cols-3 gap-3">
                                        {(rolesDisponibles || []).map((rol: any) => (
                                            <button
                                                key={rol.id_rol}
                                                type="button"
                                                onClick={() => {
                                                    const current = usuarioData.roles || [];
                                                    if (current.includes(rol.id_rol)) {
                                                        setUsuarioData({ ...usuarioData, roles: current.filter(r => r !== rol.id_rol) });
                                                    } else {
                                                        setUsuarioData({ ...usuarioData, roles: [...current, rol.id_rol] });
                                                    }
                                                }}
                                                className={cn(
                                                    'p-3 rounded-lg border-2 text-left transition-all',
                                                    usuarioData.roles?.includes(rol.id_rol)
                                                        ? 'bg-purple-100 border-purple-500 ring-2 ring-purple-200'
                                                        : 'bg-white border-gray-200 hover:border-purple-300'
                                                )}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="font-medium">{rol.nombre_rol}</span>
                                                    {usuarioData.roles?.includes(rol.id_rol) && (
                                                        <Check className="h-4 w-4 text-purple-600" />
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-500 mt-1">{rol.descripcion || rol.codigo_rol}</p>
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-3">
                                        Nota: Los cambios en roles requieren funcionalidad adicional del backend.
                                    </p>
                                </CardContent>
                            </Card>
                        </>
                    ) : (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <UserX className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-gray-700">Sin Acceso al Sistema</h3>
                                <p className="text-gray-500 mt-2 max-w-md mx-auto">
                                    Este empleado no tiene usuario asociado. Para crear acceso al sistema,
                                    utilice la opción de crear un nuevo empleado con acceso o contacte al administrador.
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>

            {/* Footer de auditoría */}
            <div className="text-xs text-gray-400 text-right pt-4 border-t">
                <p>
                    ID Empleado: {empleado.id_empleado} |
                    ID Persona: {empleado.id_persona} |
                    {hasUsuario && ` ID Usuario: ${(empleado as any).usuario?.id_usuario} |`}
                </p>
            </div>
        </div>
    );
}
