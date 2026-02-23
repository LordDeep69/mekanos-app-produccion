'use client';

import { AlertCircle, Calendar, CheckCircle2, Loader2, Mail, Send, XCircle } from 'lucide-react';
import type { HistorialEmailEnviado } from '../api/ordenes.service';
import { useHistorialEmails } from '../hooks/use-ordenes';

interface HistorialEmailsSectionProps {
    idOrden: number;
}

export function HistorialEmailsSection({ idOrden }: HistorialEmailsSectionProps) {
    const { data: emailsData, isLoading, error } = useHistorialEmails(idOrden);

    const emails: HistorialEmailEnviado[] = emailsData?.historial || [];

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

    const getEstadoIcon = (estadoEnvio: 'EXITOSO' | 'FALLIDO') => {
        return estadoEnvio === 'EXITOSO'
            ? <CheckCircle2 className="h-4 w-4 text-green-600" />
            : <XCircle className="h-4 w-4 text-red-600" />;
    };

    const getEstadoColor = (estadoEnvio: 'EXITOSO' | 'FALLIDO') => {
        return estadoEnvio === 'EXITOSO'
            ? 'bg-green-50 border-green-100 text-green-700'
            : 'bg-red-50 border-red-100 text-red-700';
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

    const getOrigenLabel = (origen: string) => {
        const origenes: Record<string, string> = {
            'FINALIZACION_ORDEN': 'Informe de Servicio Completado',
            'MANUAL': 'Envío Manual',
            'REENVIO': 'Reenvío',
            'SISTEMA': 'Sistema Automático',
        };
        return origenes[origen] || origen;
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
                    <p className="text-sm">Los emails se envían automáticamente al completar la orden</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {emails.map((email) => (
                        <div
                            key={email.id_historial_email}
                            className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors"
                        >
                            {/* Icono de estado */}
                            <div className="flex-shrink-0 mt-1">
                                {getEstadoIcon(email.estado_envio)}
                            </div>

                            {/* Contenido principal */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-4 mb-2">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 truncate">
                                            {getOrigenLabel(email.origen_envio)}
                                        </p>
                                        <p className="text-sm text-gray-600 truncate">
                                            {email.asunto}
                                        </p>
                                    </div>
                                    <div className="flex-shrink-0">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getEstadoColor(email.estado_envio)}`}>
                                            {email.estado_envio}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                                    <span className="flex items-center gap-1">
                                        <Send className="h-3 w-3" />
                                        {email.destinatario_to}
                                    </span>
                                    {email.destinatarios_cc && (
                                        <span className="flex items-center gap-1 text-gray-400">
                                            CC: {email.destinatarios_cc}
                                        </span>
                                    )}
                                    <span className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        {formatFecha(email.fecha_envio)}
                                    </span>
                                </div>

                                {/* Error si existe */}
                                {email.mensaje_error && (
                                    <div className="mt-2 p-2 bg-red-50 border border-red-100 rounded text-xs text-red-700">
                                        <strong>Error:</strong> {email.mensaje_error}
                                    </div>
                                )}

                                {/* Link al PDF si existe */}
                                {email.url_pdf_enviado && (
                                    <a
                                        href={email.url_pdf_enviado}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                                    >
                                        Ver PDF adjunto
                                    </a>
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
                            Se envían automáticamente cuando se completa una orden. Incluyen el informe PDF
                            y se registran aquí para auditoría.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
