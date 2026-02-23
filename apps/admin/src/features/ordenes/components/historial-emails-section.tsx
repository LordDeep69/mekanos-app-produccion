'use client';

import { useQuery } from '@tanstack/react-query';
import { Mail, AlertCircle, Loader2, Calendar, Send, CheckCircle2, XCircle, Clock } from 'lucide-react';

// Interface para los emails enviados
interface EmailEnviado {
    id: number;
    tipo_email: string;
    destinatario: string;
    asunto: string;
    fecha_envio: string;
    estado: 'ENVIADO' | 'ERROR' | 'PENDIENTE';
    error?: string;
    intentos: number;
    fecha_creacion: string;
}

interface HistorialEmailsSectionProps {
    idOrden: number;
}

export function HistorialEmailsSection({ idOrden }: HistorialEmailsSectionProps) {
    // Query para obtener el historial de emails
    const { data: emailsData, isLoading, error } = useQuery({
        queryKey: ['historial-emails', idOrden],
        queryFn: async () => {
            const response = await fetch(`/api/ordenes/${idOrden}/emails`);
            if (!response.ok) throw new Error('Error al cargar historial de emails');
            return response.json();
        },
        staleTime: 5 * 60 * 1000, // 5 minutos
    });

    const emails: EmailEnviado[] = emailsData?.data || [];

    if (isLoading) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                    <Mail className="h-5 w-5 text-blue-600" />
                    <h4 className="font-bold text-gray-900">Historial de Emails</h4>
                </div>
                <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                    <Mail className="h-5 w-5 text-red-600" />
                    <h4 className="font-bold text-gray-900">Historial de Emails</h4>
                </div>
                <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg border border-red-100">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <p className="text-sm text-red-700">Error al cargar el historial de emails</p>
                </div>
            </div>
        );
    }

    const getEstadoIcon = (estado: string) => {
        switch (estado) {
            case 'ENVIADO':
                return <CheckCircle2 className="h-4 w-4 text-green-600" />;
            case 'ERROR':
                return <XCircle className="h-4 w-4 text-red-600" />;
            case 'PENDIENTE':
                return <Clock className="h-4 w-4 text-yellow-600" />;
            default:
                return <Clock className="h-4 w-4 text-gray-400" />;
        }
    };

    const getEstadoColor = (estado: string) => {
        switch (estado) {
            case 'ENVIADO':
                return 'bg-green-50 border-green-100 text-green-700';
            case 'ERROR':
                return 'bg-red-50 border-red-100 text-red-700';
            case 'PENDIENTE':
                return 'bg-yellow-50 border-yellow-100 text-yellow-700';
            default:
                return 'bg-gray-50 border-gray-100 text-gray-700';
        }
    };

    const formatFecha = (fecha: string) => {
        return new Date(fecha).toLocaleString('es-CO', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getTipoEmailLabel = (tipo: string) => {
        const tipos: Record<string, string> = {
            'INFORME_COMPLETADO': 'Informe de Servicio Completado',
            'CONFIRMACION_ASIGNACION': 'Confirmación de Asignación',
            'AVISO_VENCIMIENTO': 'Aviso de Vencimiento',
            'RECORDATORIO': 'Recordatorio',
        };
        return tipos[tipo] || tipo;
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
                <Mail className="h-5 w-5 text-blue-600" />
                <h4 className="font-bold text-gray-900">Historial de Emails</h4>
                <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                    {emails.length} emails
                </span>
            </div>

            {emails.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    <Mail className="h-12 w-12 mx-auto mb-3 text-gray-200" />
                    <p className="font-medium">No hay emails enviados</p>
                    <p className="text-sm">Los emails se envían automáticamente según el estado de la orden</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {emails.map((email) => (
                        <div
                            key={email.id}
                            className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors"
                        >
                            {/* Icono de estado */}
                            <div className="flex-shrink-0 mt-1">
                                {getEstadoIcon(email.estado)}
                            </div>

                            {/* Contenido principal */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-4 mb-2">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 truncate">
                                            {getTipoEmailLabel(email.tipo_email)}
                                        </p>
                                        <p className="text-sm text-gray-600 truncate">
                                            {email.asunto}
                                        </p>
                                    </div>
                                    <div className="flex-shrink-0">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getEstadoColor(email.estado)}`}>
                                            {email.estado}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                                    <span className="flex items-center gap-1">
                                        <Send className="h-3 w-3" />
                                        {email.destinatario}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        {formatFecha(email.fecha_envio)}
                                    </span>
                                    {email.intentos > 1 && (
                                        <span className="text-yellow-600">
                                            {email.intentos} intentos
                                        </span>
                                    )}
                                </div>

                                {/* Error si existe */}
                                {email.error && (
                                    <div className="mt-2 p-2 bg-red-50 border border-red-100 rounded text-xs text-red-700">
                                        <strong>Error:</strong> {email.error}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Información adicional */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-blue-900">¿Qué emails se envían?</p>
                        <p className="text-xs text-blue-700 mt-1">
                            Se envían automáticamente cuando se completa una orden, se asigna un técnico,
                            o se requieren recordatorios. Los emails incluyen informes PDF y actualizaciones de estado.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
