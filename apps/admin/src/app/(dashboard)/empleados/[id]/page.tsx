/**
 * MEKANOS S.A.S - Portal Admin
 * Vista de Detalle de Empleado (Hoja de Vida del Sistema)
 * 
 * Ruta: /empleados/[id]
 * 
 * Muestra TODOS los campos de las tablas:
 * - personas (identificación, contacto, ubicación)
 * - empleados (cargo, contrato, emergencia, licencia, formación)
 * - usuarios (acceso al sistema, roles, estado)
 */

'use client';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getEmpleado } from '@/features/empleados/api/empleados.service';
import { apiClient } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    AlertCircle,
    AlertTriangle,
    ArrowLeft,
    Briefcase,
    Calendar,
    Car,
    Edit,
    GraduationCap,
    KeyRound,
    Loader2,
    Lock,
    Mail,
    MapPin,
    Phone,
    Shield,
    User,
    Wrench,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTES AUXILIARES
// ═══════════════════════════════════════════════════════════════════════════════

function InfoItem({ label, value, icon: Icon }: { label: string; value?: string | null; icon?: React.ElementType }) {
    if (!value) return null;
    return (
        <div className="flex items-start gap-3 py-2">
            {Icon && <Icon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />}
            <div>
                <dt className="text-xs text-gray-500 uppercase tracking-wide">{label}</dt>
                <dd className="text-sm font-medium text-gray-900">{value}</dd>
            </div>
        </div>
    );
}

function Badge({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'success' | 'warning' | 'error' | 'info' }) {
    const variants = {
        default: 'bg-gray-100 text-gray-800',
        success: 'bg-green-100 text-green-800',
        warning: 'bg-yellow-100 text-yellow-800',
        error: 'bg-red-100 text-red-800',
        info: 'bg-blue-100 text-blue-800',
    };
    return (
        <span className={cn('px-2 py-1 rounded-full text-xs font-medium', variants[variant])}>
            {children}
        </span>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function EmpleadoDetallePage() {
    const params = useParams();
    const router = useRouter();
    const queryClient = useQueryClient();
    const id = Number(params.id);

    // Estados para cambio de correo de ingreso con alerta de confirmación
    const [showChangeEmailDialog, setShowChangeEmailDialog] = useState(false);
    const [nuevoEmail, setNuevoEmail] = useState('');
    const [syncEmailConPersona, setSyncEmailConPersona] = useState(true);
    const [savingEmail, setSavingEmail] = useState(false);

    const { data: empleado, isLoading, isError, error } = useQuery({
        queryKey: ['empleado', id],
        queryFn: () => getEmpleado(id),
        enabled: !isNaN(id),
    });

    const handleOpenChangeEmail = (currentEmail?: string) => {
        setNuevoEmail(currentEmail || '');
        setSyncEmailConPersona(true);
        setShowChangeEmailDialog(true);
    };

    const handleConfirmarCambioEmail = async () => {
        const trimmed = nuevoEmail.trim().toLowerCase();
        if (!trimmed) {
            toast.error('El correo electrónico no puede estar vacío');
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmed)) {
            toast.error('Por favor ingrese un correo electrónico válido');
            return;
        }

        const usuarioId = (empleado as any)?.usuario?.id_usuario;
        if (!usuarioId) {
            toast.error('No se encontró el usuario asociado a este empleado');
            return;
        }

        setSavingEmail(true);
        try {
            await apiClient.put(`/usuarios/${usuarioId}`, { email: trimmed });
            if (syncEmailConPersona && empleado?.id_persona) {
                await apiClient.put(`/personas/${empleado.id_persona}`, { email_principal: trimmed });
            }
            toast.success('Correo de ingreso al sistema actualizado correctamente');
            setShowChangeEmailDialog(false);
            queryClient.invalidateQueries({ queryKey: ['empleado', id] });
            queryClient.invalidateQueries({ queryKey: ['empleados'] });
        } catch (error: any) {
            const msg = error.response?.data?.message || error.message || 'Error al actualizar el correo';
            toast.error(`Error: ${msg}`);
        } finally {
            setSavingEmail(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (isError || !empleado) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
                <h2 className="text-xl font-semibold text-gray-900">Error al cargar empleado</h2>
                <p className="text-gray-500 mt-2">{(error as Error)?.message || 'No encontrado'}</p>
                <Button onClick={() => router.push('/empleados')} className="mt-4">
                    Volver al listado
                </Button>
            </div>
        );
    }

    const persona = empleado.persona;
    const nombreCompleto = persona
        ? `${persona.primer_nombre || ''} ${persona.segundo_nombre || ''} ${persona.primer_apellido || ''} ${persona.segundo_apellido || ''}`.trim()
        : 'Sin nombre';

    // Detectar si tiene usuario (esto depende de la respuesta del backend)
    const tieneUsuario = !!(empleado as unknown as { usuario?: { id_usuario: number } }).usuario;

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push('/empleados')}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{nombreCompleto}</h1>
                        <p className="text-gray-500 flex items-center gap-2">
                            <span className="font-mono text-sm">{empleado.codigo_empleado}</span>
                            <span>•</span>
                            <span>{empleado.cargo?.replace(/_/g, ' ')}</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {empleado.empleado_activo ? (
                        <Badge variant="success">Activo</Badge>
                    ) : (
                        <Badge variant="error">Inactivo</Badge>
                    )}
                    {empleado.es_tecnico && <Badge variant="info">🔧 Técnico</Badge>}
                    {empleado.es_asesor && <Badge variant="info">💼 Asesor</Badge>}

                    <Link href={`/empleados/${id}/editar`}>
                        <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
                {/* ═══════════════════════════════════════════════════════════════════
                    COLUMNA 1: DATOS PERSONALES
                ═══════════════════════════════════════════════════════════════════ */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader className="bg-blue-50 border-b pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <User className="h-4 w-4 text-blue-600" />
                                Datos Personales
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-1">
                            <InfoItem
                                label="Identificación"
                                value={persona ? `${persona.tipo_identificacion} ${persona.numero_identificacion}` : undefined}
                            />
                            <InfoItem label="Fecha Nacimiento" value={persona?.fecha_nacimiento} icon={Calendar} />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="bg-blue-50 border-b pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Phone className="h-4 w-4 text-blue-600" />
                                Contacto
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-1">
                            <InfoItem label="Email" value={persona?.email_principal} icon={Mail} />
                            <InfoItem label="Celular" value={persona?.celular} icon={Phone} />
                            <InfoItem label="Teléfono Fijo" value={persona?.telefono_principal} icon={Phone} />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="bg-blue-50 border-b pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-blue-600" />
                                Ubicación
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-1">
                            <InfoItem label="Dirección" value={persona?.direccion_principal} />
                            <InfoItem label="Barrio/Zona" value={persona?.barrio_zona} />
                            <InfoItem label="Ciudad" value={persona?.ciudad} />
                            <InfoItem label="Departamento" value={persona?.departamento} />
                        </CardContent>
                    </Card>
                </div>

                {/* ═══════════════════════════════════════════════════════════════════
                    COLUMNA 2: DATOS LABORALES
                ═══════════════════════════════════════════════════════════════════ */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader className="bg-green-50 border-b pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Briefcase className="h-4 w-4 text-green-600" />
                                Información Laboral
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-1">
                            <InfoItem label="Cargo" value={empleado.cargo?.replace(/_/g, ' ')} />
                            <InfoItem label="Descripción" value={empleado.descripcion_cargo} />
                            <InfoItem label="Tipo Contrato" value={empleado.tipo_contrato?.replace(/_/g, ' ')} />
                            <InfoItem label="Fecha Ingreso" value={empleado.fecha_ingreso} icon={Calendar} />
                            <InfoItem label="Departamento" value={empleado.departamento} />
                            {empleado.fecha_retiro && (
                                <InfoItem label="Fecha Retiro" value={empleado.fecha_retiro} icon={Calendar} />
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-orange-200">
                        <CardHeader className="bg-orange-50 border-b pb-3">
                            <CardTitle className="text-base flex items-center gap-2 text-orange-700">
                                <AlertCircle className="h-4 w-4" />
                                Contacto de Emergencia
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-1">
                            <InfoItem label="Nombre" value={empleado.contacto_emergencia} icon={User} />
                            <InfoItem label="Teléfono" value={empleado.telefono_emergencia} icon={Phone} />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="bg-green-50 border-b pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Car className="h-4 w-4 text-green-600" />
                                Licencia de Conducción
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                            {empleado.puede_conducir ? (
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Badge variant="success">✓ Puede conducir</Badge>
                                    </div>
                                    <InfoItem label="Número Licencia" value={empleado.licencia_conduccion} />
                                    <InfoItem
                                        label="Vencimiento"
                                        value={empleado.fecha_vencimiento_licencia}
                                        icon={Calendar}
                                    />
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500">No habilitado para conducir</p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* ═══════════════════════════════════════════════════════════════════
                    COLUMNA 3: FORMACIÓN Y ACCESO
                ═══════════════════════════════════════════════════════════════════ */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader className="bg-indigo-50 border-b pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <GraduationCap className="h-4 w-4 text-indigo-600" />
                                Formación Académica
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-1">
                            <InfoItem label="Nivel Académico" value={empleado.nivel_academico?.replace(/_/g, ' ')} />
                            <InfoItem label="Título" value={empleado.titulo_obtenido} />
                            <InfoItem label="Institución" value={empleado.institucion_educativa} />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="bg-indigo-50 border-b pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Wrench className="h-4 w-4 text-indigo-600" />
                                Habilidades
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                            {empleado.habilidades_especiales ? (
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                    {empleado.habilidades_especiales}
                                </p>
                            ) : (
                                <p className="text-sm text-gray-500">Sin habilidades registradas</p>
                            )}
                        </CardContent>
                    </Card>

                    <Card className={tieneUsuario ? 'border-purple-200 shadow-sm' : 'border-gray-200'}>
                        <CardHeader className={cn(
                            'border-b pb-3',
                            tieneUsuario ? 'bg-purple-50' : 'bg-gray-50'
                        )}>
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <KeyRound className={cn('h-4 w-4', tieneUsuario ? 'text-purple-600' : 'text-gray-400')} />
                                    Acceso al Sistema
                                </CardTitle>
                                {tieneUsuario && (
                                    <Badge variant="success">
                                        <Shield className="h-3 w-3 mr-1" />
                                        {(empleado as any).usuario?.estado || 'ACTIVO'}
                                    </Badge>
                                )}
                            </div>
                            <CardDescription>
                                {tieneUsuario ? 'Credenciales de acceso a Web y Móvil' : 'Sin acceso al sistema'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3">
                            {tieneUsuario ? (
                                <>
                                    <div className="space-y-2 text-xs">
                                        <div className="bg-gray-50 p-2.5 rounded-md border space-y-1.5">
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-500 font-medium">Username:</span>
                                                <span className="font-mono text-gray-800 font-semibold">
                                                    {(empleado as any).usuario?.username || '—'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center border-t pt-1.5">
                                                <span className="text-gray-500 font-medium">Correo de Ingreso:</span>
                                                <span className="font-mono text-purple-700 font-semibold">
                                                    {(empleado as any).usuario?.email || '—'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 pt-1">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="flex-1 text-xs h-8 border-orange-200 hover:bg-orange-50 text-orange-700"
                                            onClick={() => handleOpenChangeEmail((empleado as any).usuario?.email)}
                                        >
                                            <Lock className="h-3.5 w-3.5 mr-1" />
                                            Cambiar Correo
                                        </Button>
                                        <Link href={`/empleados/${id}/editar`}>
                                            <Button variant="outline" size="sm" className="text-xs h-8">
                                                Gestionar Acceso
                                            </Button>
                                        </Link>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-4">
                                    <KeyRound className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                                    <p className="text-sm text-gray-500 mb-3">
                                        Este empleado no tiene acceso al sistema
                                    </p>
                                    <Link href={`/empleados/${id}/editar`}>
                                        <Button variant="outline" size="sm">
                                            Crear Acceso
                                        </Button>
                                    </Link>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {empleado.observaciones && (
                        <Card>
                            <CardHeader className="bg-gray-50 border-b pb-3">
                                <CardTitle className="text-base">Observaciones</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                    {empleado.observaciones}
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {/* Footer con info de auditoría */}
            <div className="text-xs text-gray-400 text-right pt-4 border-t">
                <p>ID Empleado: {empleado.id_empleado} | ID Persona: {empleado.id_persona}</p>
                <p>Creado: {empleado.fecha_creacion}</p>
            </div>

            {/* ⚠️ DIALOG DE CONFIRMACIÓN CRÍTICA: Cambio de Correo de Ingreso al Sistema */}
            <AlertDialog open={showChangeEmailDialog} onOpenChange={setShowChangeEmailDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-orange-700">
                            <AlertTriangle className="h-5 w-5 text-orange-600" />
                            Confirmar Cambio de Correo de Ingreso al Sistema
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-3 pt-2 text-left text-sm text-gray-600">
                                <p>
                                    ¿Está seguro de que desea cambiar el correo de ingreso al sistema para este empleado?
                                </p>
                                <div className="p-3 bg-gray-50 border rounded-md space-y-1.5 text-xs">
                                    <p>
                                        <span className="text-gray-500 font-medium">Correo actual:</span>{' '}
                                        <span className="font-mono text-gray-800">{(empleado as any)?.usuario?.email}</span>
                                    </p>
                                    <div className="pt-2">
                                        <label className="text-gray-700 font-semibold block mb-1">
                                            Nuevo correo de acceso:
                                        </label>
                                        <Input
                                            type="email"
                                            value={nuevoEmail}
                                            onChange={(e) => setNuevoEmail(e.target.value)}
                                            placeholder="nuevo.correo@mekanos.com"
                                            className="bg-white"
                                        />
                                    </div>
                                    <div className="flex items-center space-x-2 pt-2">
                                        <input
                                            type="checkbox"
                                            id="syncPersonaEmailDetail"
                                            checked={syncEmailConPersona}
                                            onChange={(e) => setSyncEmailConPersona(e.target.checked)}
                                            className="rounded border-gray-300 text-orange-600 focus:ring-orange-500 h-4 w-4"
                                        />
                                        <label htmlFor="syncPersonaEmailDetail" className="text-xs text-gray-700 font-medium cursor-pointer">
                                            Sincronizar también el correo en datos personales de la persona
                                        </label>
                                    </div>
                                </div>
                                <p className="text-xs text-red-600 font-medium">
                                    ⚠️ Importante: El empleado perderá acceso con su correo anterior y deberá utilizar este nuevo correo para autenticarse en el Portal Web y la App Móvil.
                                </p>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={savingEmail}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                handleConfirmarCambioEmail();
                            }}
                            disabled={savingEmail}
                            className="bg-orange-600 hover:bg-orange-700 text-white"
                        >
                            {savingEmail ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Actualizando...
                                </span>
                            ) : (
                                'Sí, Confirmar Cambio'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
