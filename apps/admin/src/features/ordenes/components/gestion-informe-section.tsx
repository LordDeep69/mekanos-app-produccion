/**
 * MEKANOS S.A.S - Portal Admin
 * Sección de Gestión de Informe PDF
 * 
 * Permite al admin:
 * - Previsualizar el PDF actual
 * - Regenerar PDF con datos actualizados
 * - Enviar PDF por email a múltiples destinatarios
 * - Feedback visual completo de envío (loading, éxito, error)
 * 
 * ✅ FIX 13-FEB-2026: Feedback de envío de email + múltiples destinatarios + prevención duplicados
 */

'use client';

import { apiClient } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import type { Orden } from '@/types/ordenes';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    AlertCircle,
    Check,
    CheckCircle2,
    Download,
    Eye,
    FileText,
    Loader2,
    Mail,
    Plus,
    RefreshCw,
    Send,
    Trash2,
    X
} from 'lucide-react';
import { useState } from 'react';
import { enviarPdfExistente, regenerarPdf, type EnviarPdfExistenteDto, type RegenerarPdfDto } from '../api/ordenes.service';

interface GestionInformeSectionProps {
    orden: Orden;
    onUpdate?: () => void;
}

type EmailSendStatus = 'idle' | 'sending' | 'success' | 'error';

export function GestionInformeSection({ orden, onUpdate }: GestionInformeSectionProps) {
    const queryClient = useQueryClient();
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [emailsDestinatarios, setEmailsDestinatarios] = useState<string[]>([]);
    const [nuevoEmail, setNuevoEmail] = useState('');
    const [asuntoEmail, setAsuntoEmail] = useState('');
    const [mensajeEmail, setMensajeEmail] = useState('');
    const [incluirClienteEmail, setIncluirClienteEmail] = useState(true);
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
    const [showPreview, setShowPreview] = useState(false);
    const [emailSendStatus, setEmailSendStatus] = useState<EmailSendStatus>('idle');
    const [emailSendResult, setEmailSendResult] = useState<{ destinatarios: string[]; error?: string } | null>(null);

    // ✅ FIX 04-FEB-2026: Obtener URL del PDF existente usando apiClient centralizado
    const { data: pdfExistenteData } = useQuery({
        queryKey: ['orden-pdf-url', orden.id_orden_servicio],
        queryFn: async () => {
            const response = await apiClient.get(`/ordenes/${orden.id_orden_servicio}/pdf-url`);
            return response.data;
        },
        enabled: true,
        staleTime: 0,
    });
    const urlPdfExistente = pdfExistenteData?.data?.url || null;

    // Obtener email del cliente (cast para acceder a campos adicionales)
    const clientePersona = orden.clientes?.persona as any;
    const clienteEmail = clientePersona?.email_principal || '';

    // Mutation para regenerar PDF
    const regenerarMutation = useMutation({
        mutationFn: (data: RegenerarPdfDto) => regenerarPdf(orden.id_orden_servicio, data),
        onSuccess: (response) => {
            if (response.pdfBase64) {
                const blob = base64ToBlob(response.pdfBase64, 'application/pdf');
                const url = URL.createObjectURL(blob);
                setPdfPreviewUrl(url);
            }
            onUpdate?.();
        },
    });

    // Mutation para enviar PDF existente (sin regenerar)
    const enviarPdfMutation = useMutation({
        mutationFn: (data: EnviarPdfExistenteDto) => enviarPdfExistente(orden.id_orden_servicio, data),
    });

    function base64ToBlob(base64: string, contentType: string): Blob {
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: contentType });
    }

    const handleRegenerarPdf = async () => {
        await regenerarMutation.mutateAsync({
            enviarEmail: false,
            forzarRegeneracion: true,
        });
    };

    // ✅ FIX 13-FEB-2026: Validar formato de email
    const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

    // Agregar email a la lista de destinatarios
    const handleAgregarEmail = () => {
        const emailTrimmed = nuevoEmail.trim();
        if (!emailTrimmed) return;
        if (!isValidEmail(emailTrimmed)) return;
        if (emailsDestinatarios.includes(emailTrimmed)) return;
        setEmailsDestinatarios(prev => [...prev, emailTrimmed]);
        setNuevoEmail('');
    };

    // Eliminar email de la lista
    const handleEliminarEmail = (email: string) => {
        setEmailsDestinatarios(prev => prev.filter(e => e !== email));
    };

    // Obtener todos los emails destino
    const getAllDestinatarios = (): string[] => {
        const emails: string[] = [];
        if (incluirClienteEmail && clienteEmail) {
            emails.push(clienteEmail);
        }
        for (const e of emailsDestinatarios) {
            if (!emails.includes(e)) emails.push(e);
        }
        return emails;
    };

    // ✅ FIX 13-FEB-2026: Enviar con feedback visual completo y prevención de duplicados
    const handleEnviarPdf = async () => {
        const destinatarios = getAllDestinatarios();
        if (destinatarios.length === 0) return;

        setEmailSendStatus('sending');
        setEmailSendResult(null);

        try {
            // Enviar a cada destinatario secuencialmente
            const emailPrincipal = destinatarios[0];
            const emailsCc = destinatarios.slice(1);

            await enviarPdfMutation.mutateAsync({
                emailDestino: emailPrincipal,
                asuntoEmail: asuntoEmail || undefined,
                mensajeEmail: mensajeEmail || undefined,
                ...(emailsCc.length > 0 ? { emailsCc } : {}),
            });

            setEmailSendStatus('success');
            setEmailSendResult({ destinatarios });
            onUpdate?.();
            // ✅ FIX 18-FEB-2026: Refrescar historial de emails después de envío
            queryClient.invalidateQueries({ queryKey: ['ordenes', 'historial-emails', orden.id_orden_servicio] });

            // Auto-cerrar después de 4 segundos de éxito
            setTimeout(() => {
                setShowEmailModal(false);
                setEmailSendStatus('idle');
                setEmailSendResult(null);
                setEmailsDestinatarios([]);
                setAsuntoEmail('');
                setMensajeEmail('');
            }, 4000);
        } catch (error: any) {
            setEmailSendStatus('error');
            setEmailSendResult({
                destinatarios,
                error: error?.response?.data?.message || error?.message || 'Error al enviar el email',
            });
        }
    };

    // Abrir modal de email con reset de estado
    const handleOpenEmailModal = () => {
        setEmailSendStatus('idle');
        setEmailSendResult(null);
        setEmailsDestinatarios([]);
        setNuevoEmail('');
        setAsuntoEmail('');
        setMensajeEmail('');
        setIncluirClienteEmail(!!clienteEmail);
        setShowEmailModal(true);
    };

    const handleDescargarPdf = () => {
        const urlToUse = pdfPreviewUrl || urlPdfExistente;
        if (urlToUse) {
            const link = document.createElement('a');
            link.href = urlToUse;
            link.download = `Informe_${orden.numero_orden}.pdf`;
            link.target = '_blank';
            link.click();
        } else {
            alert('No hay PDF disponible. Regenere el informe primero.');
        }
    };

    const handlePrevisualizar = () => {
        const urlToUse = pdfPreviewUrl || urlPdfExistente;
        if (urlToUse) {
            window.open(urlToUse, '_blank');
        } else {
            alert('No hay PDF disponible. Regenere el informe primero.');
        }
    };

    const destinatariosActuales = getAllDestinatarios();
    const isSending = emailSendStatus === 'sending';

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-between">
                <h4 className="font-bold text-gray-900 flex items-center gap-2">
                    <div className="p-1.5 bg-blue-500 rounded-lg">
                        <FileText className="h-4 w-4 text-white" />
                    </div>
                    Gestión de Informe PDF
                </h4>
                {(regenerarMutation.isPending || isSending) && (
                    <div className="flex items-center gap-2 text-blue-600">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-xs font-medium">
                            {isSending ? 'Enviando email...' : 'Procesando...'}
                        </span>
                    </div>
                )}
            </div>

            {/* Contenido */}
            <div className="p-4 space-y-4">
                {/* Estado del informe */}
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-bold text-gray-700">Orden: {orden.numero_orden}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Estado: {orden.estados_orden?.nombre_estado || 'N/A'}
                            </p>
                        </div>
                        {regenerarMutation.isSuccess && (
                            <div className="flex items-center gap-1.5 text-green-600 bg-green-50 px-2 py-1 rounded-lg">
                                <Check className="h-3.5 w-3.5" />
                                <span className="text-xs font-bold">PDF Actualizado</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Acciones principales */}
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={handlePrevisualizar}
                        className="flex flex-col items-center justify-center p-4 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-all group"
                    >
                        <Eye className="h-6 w-6 text-gray-500 group-hover:text-blue-600 mb-2" />
                        <span className="text-sm font-bold text-gray-700 group-hover:text-blue-600">Previsualizar</span>
                        <span className="text-[10px] text-gray-400 mt-0.5">Ver PDF actual</span>
                    </button>
                    <button
                        onClick={handleDescargarPdf}
                        className="flex flex-col items-center justify-center p-4 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-all group"
                    >
                        <Download className="h-6 w-6 text-gray-500 group-hover:text-green-600 mb-2" />
                        <span className="text-sm font-bold text-gray-700 group-hover:text-green-600">Descargar</span>
                        <span className="text-[10px] text-gray-400 mt-0.5">Guardar PDF</span>
                    </button>
                </div>

                {/* Regenerar PDF */}
                <button
                    onClick={handleRegenerarPdf}
                    disabled={regenerarMutation.isPending}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {regenerarMutation.isPending ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                        <RefreshCw className="h-5 w-5" />
                    )}
                    Regenerar PDF con Datos Actualizados
                </button>

                {/* Enviar por Email */}
                <button
                    onClick={handleOpenEmailModal}
                    disabled={regenerarMutation.isPending || isSending}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Mail className="h-5 w-5" />
                    Enviar Informe por Email
                </button>

                {/* Indicador de PDF existente */}
                {urlPdfExistente && !regenerarMutation.isSuccess && (
                    <p className="text-xs text-green-600 flex items-center gap-1.5">
                        <Check className="h-3.5 w-3.5" />
                        PDF disponible en R2
                    </p>
                )}

                {/* Mensaje de éxito regeneración */}
                {regenerarMutation.isSuccess && regenerarMutation.data && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <p className="text-sm text-green-700 font-medium flex items-center gap-2">
                            <Check className="h-4 w-4" />
                            {regenerarMutation.data.message}
                        </p>
                    </div>
                )}

                {/* Error regeneración */}
                {regenerarMutation.isError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-sm text-red-700 font-medium">
                            Error al procesar el PDF. Intente nuevamente.
                        </p>
                    </div>
                )}
            </div>

            {/* ✅ FIX 13-FEB-2026: Modal de Email mejorado con múltiples destinatarios y feedback */}
            {showEmailModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                        {/* Header del modal */}
                        <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50 flex items-center justify-between">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                <Mail className="h-5 w-5 text-green-600" />
                                Enviar Informe por Email
                            </h3>
                            <button
                                onClick={() => { setShowEmailModal(false); setEmailSendStatus('idle'); }}
                                disabled={isSending}
                                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                            >
                                <X className="h-5 w-5 text-gray-500" />
                            </button>
                        </div>

                        {/* Estado de envío: SENDING */}
                        {emailSendStatus === 'sending' && (
                            <div className="p-8 flex flex-col items-center justify-center gap-4">
                                <div className="relative">
                                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                                        <Mail className="h-8 w-8 text-green-600" />
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-md">
                                        <Loader2 className="h-4 w-4 animate-spin text-green-600" />
                                    </div>
                                </div>
                                <div className="text-center">
                                    <p className="font-bold text-gray-900">Enviando correo...</p>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Enviando a {destinatariosActuales.length} destinatario{destinatariosActuales.length !== 1 ? 's' : ''}
                                    </p>
                                </div>
                                <div className="w-full max-w-xs">
                                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                        <div className="h-full bg-green-500 rounded-full animate-pulse" style={{ width: '70%' }} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Estado de envío: SUCCESS */}
                        {emailSendStatus === 'success' && emailSendResult && (
                            <div className="p-8 flex flex-col items-center justify-center gap-4">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center animate-bounce">
                                    <CheckCircle2 className="h-10 w-10 text-green-600" />
                                </div>
                                <div className="text-center">
                                    <p className="font-bold text-green-800 text-lg">Correo Enviado Exitosamente</p>
                                    <p className="text-sm text-gray-500 mt-2">Enviado a:</p>
                                    <div className="mt-2 space-y-1">
                                        {emailSendResult.destinatarios.map((email, i) => (
                                            <p key={i} className="text-sm font-medium text-green-700 flex items-center justify-center gap-1.5">
                                                <Check className="h-3.5 w-3.5" />
                                                {email}
                                            </p>
                                        ))}
                                    </div>
                                </div>
                                <p className="text-xs text-gray-400">Este diálogo se cerrará automáticamente...</p>
                            </div>
                        )}

                        {/* Estado de envío: ERROR */}
                        {emailSendStatus === 'error' && emailSendResult && (
                            <div className="p-8 flex flex-col items-center justify-center gap-4">
                                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                                    <AlertCircle className="h-10 w-10 text-red-600" />
                                </div>
                                <div className="text-center">
                                    <p className="font-bold text-red-800 text-lg">Error al Enviar Correo</p>
                                    <p className="text-sm text-red-600 mt-2">{emailSendResult.error}</p>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setEmailSendStatus('idle')}
                                        className="px-4 py-2 text-sm font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-all"
                                    >
                                        Volver
                                    </button>
                                    <button
                                        onClick={handleEnviarPdf}
                                        className="px-4 py-2 text-sm font-bold text-white bg-green-600 hover:bg-green-700 rounded-xl transition-all flex items-center gap-2"
                                    >
                                        <RefreshCw className="h-4 w-4" />
                                        Reintentar
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Formulario (solo visible en estado idle) */}
                        {emailSendStatus === 'idle' && (
                            <>
                                <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                                    {/* Email del cliente */}
                                    <div>
                                        <label className="text-sm font-bold text-gray-700 mb-2 block">
                                            Destinatarios
                                        </label>

                                        {/* Checkbox email del cliente */}
                                        {clienteEmail && (
                                            <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors mb-2">
                                                <input
                                                    type="checkbox"
                                                    checked={incluirClienteEmail}
                                                    onChange={(e) => setIncluirClienteEmail(e.target.checked)}
                                                    className="w-4 h-4 text-green-600 rounded"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-700">Email del cliente</p>
                                                    <p className="text-xs text-gray-500 truncate">{clienteEmail}</p>
                                                </div>
                                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full">
                                                    CLIENTE
                                                </span>
                                            </label>
                                        )}

                                        {/* Lista de emails adicionales */}
                                        {emailsDestinatarios.length > 0 && (
                                            <div className="space-y-1.5 mb-2">
                                                {emailsDestinatarios.map((email, index) => (
                                                    <div
                                                        key={index}
                                                        className="flex items-center gap-2 p-2.5 bg-green-50 rounded-lg border border-green-100"
                                                    >
                                                        <Mail className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                                                        <span className="text-sm text-green-800 flex-1 truncate">{email}</span>
                                                        <button
                                                            onClick={() => handleEliminarEmail(email)}
                                                            className="p-1 hover:bg-red-100 rounded transition-colors"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Input para agregar nuevo email */}
                                        <div className="flex gap-2">
                                            <input
                                                type="email"
                                                value={nuevoEmail}
                                                onChange={(e) => setNuevoEmail(e.target.value)}
                                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAgregarEmail(); } }}
                                                placeholder="Agregar otro correo..."
                                                className={cn(
                                                    "flex-1 px-3 py-2.5 text-sm border-2 rounded-xl transition-colors",
                                                    nuevoEmail && !isValidEmail(nuevoEmail)
                                                        ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                                                        : "border-gray-200 focus:ring-green-500 focus:border-green-500"
                                                )}
                                            />
                                            <button
                                                onClick={handleAgregarEmail}
                                                disabled={!nuevoEmail || !isValidEmail(nuevoEmail)}
                                                className="px-3 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                                            >
                                                <Plus className="h-4 w-4" />
                                                <span className="text-sm font-bold">Agregar</span>
                                            </button>
                                        </div>
                                        {nuevoEmail && !isValidEmail(nuevoEmail) && (
                                            <p className="text-xs text-red-500 mt-1">Email no válido</p>
                                        )}

                                        {/* Resumen de destinatarios */}
                                        <p className="text-xs text-gray-400 mt-2">
                                            {destinatariosActuales.length === 0
                                                ? 'Agregue al menos un destinatario'
                                                : `${destinatariosActuales.length} destinatario${destinatariosActuales.length !== 1 ? 's' : ''} seleccionado${destinatariosActuales.length !== 1 ? 's' : ''}`
                                            }
                                        </p>
                                    </div>

                                    {/* Asunto personalizado */}
                                    <div>
                                        <label className="text-sm font-bold text-gray-700 mb-2 block">
                                            Asunto (opcional)
                                        </label>
                                        <input
                                            type="text"
                                            value={asuntoEmail}
                                            onChange={(e) => setAsuntoEmail(e.target.value)}
                                            placeholder={`Informe de Mantenimiento - ${orden.numero_orden}`}
                                            className="w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                        />
                                    </div>

                                    {/* Mensaje personalizado */}
                                    <div>
                                        <label className="text-sm font-bold text-gray-700 mb-2 block">
                                            Mensaje (opcional)
                                        </label>
                                        <textarea
                                            value={mensajeEmail}
                                            onChange={(e) => setMensajeEmail(e.target.value)}
                                            placeholder="Adjunto encontrará el informe de mantenimiento..."
                                            rows={3}
                                            className="w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
                                        />
                                    </div>
                                </div>

                                {/* Footer del modal */}
                                <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-3">
                                    <button
                                        onClick={() => setShowEmailModal(false)}
                                        className="flex-1 py-2.5 px-4 text-sm font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-all"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleEnviarPdf}
                                        disabled={destinatariosActuales.length === 0}
                                        className="flex-1 py-2.5 px-4 text-sm font-bold text-white bg-green-600 hover:bg-green-700 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        <Send className="h-4 w-4" />
                                        Enviar ({destinatariosActuales.length})
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Modal de Preview */}
            {showPreview && pdfPreviewUrl && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="font-bold text-gray-900">Vista Previa del Informe</h3>
                            <button
                                onClick={() => setShowPreview(false)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="h-5 w-5 text-gray-500" />
                            </button>
                        </div>
                        <div className="flex-1">
                            <iframe
                                src={pdfPreviewUrl}
                                className="w-full h-full"
                                title="Vista previa del PDF"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
