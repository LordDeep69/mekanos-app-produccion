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

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getEmpleado } from '@/features/empleados/api/empleados.service';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import {
    AlertCircle,
    ArrowLeft,
    Briefcase,
    Calendar,
    Car,
    Edit,
    GraduationCap,
    KeyRound,
    Loader2,
    Mail,
    MapPin,
    Phone,
    Shield,
    User,
    Wrench,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

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
    const id = Number(params.id);

    const { data: empleado, isLoading, isError, error } = useQuery({
        queryKey: ['empleado', id],
        queryFn: () => getEmpleado(id),
        enabled: !isNaN(id),
    });

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

                    <Card className={tieneUsuario ? 'border-purple-200' : 'border-gray-200'}>
                        <CardHeader className={cn(
                            'border-b pb-3',
                            tieneUsuario ? 'bg-purple-50' : 'bg-gray-50'
                        )}>
                            <CardTitle className="text-base flex items-center gap-2">
                                <KeyRound className={cn('h-4 w-4', tieneUsuario ? 'text-purple-600' : 'text-gray-400')} />
                                Acceso al Sistema
                            </CardTitle>
                            <CardDescription>
                                {tieneUsuario ? 'Usuario configurado' : 'Sin acceso al sistema'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-4">
                            {tieneUsuario ? (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="success">
                                            <Shield className="h-3 w-3 mr-1" />
                                            Usuario Activo
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        Ver detalles del usuario en Configuración → Usuarios
                                    </p>
                                </div>
                            ) : (
                                <div className="text-center py-4">
                                    <KeyRound className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                                    <p className="text-sm text-gray-500 mb-3">
                                        Este empleado no tiene acceso al sistema
                                    </p>
                                    <Button variant="outline" size="sm">
                                        Crear Acceso
                                    </Button>
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
        </div>
    );
}
