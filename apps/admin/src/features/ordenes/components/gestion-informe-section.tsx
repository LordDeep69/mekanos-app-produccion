/**
 * MEKANOS S.A.S - Portal Admin
 * Sección de Gestión de Informe PDF
 * 
 * Permite al admin:
 * - Previsualizar el PDF actual
 * - Regenerar PDF con datos actualizados
 * - Enviar PDF por email (email del cliente o personalizado)
 */

'use client';

import type { Orden } from '@/types/ordenes';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
    Check,
    Download,
    Eye,
    FileText,
    Loader2,
    Mail,
    RefreshCw,
    Send,
    X
} from 'lucide-react';
import { getSession } from 'next-auth/react';
import { useState } from 'react';
import { regenerarPdf, type RegenerarPdfDto } from '../api/ordenes.service';

interface GestionInformeSectionProps {
    orden: Orden;
    onUpdate?: () => void;
}

export function GestionInformeSection({ orden, onUpdate }: GestionInformeSectionProps) {
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [emailDestino, setEmailDestino] = useState('');
    const [asuntoEmail, setAsuntoEmail] = useState('');
    const [mensajeEmail, setMensajeEmail] = useState('');
    const [useCustomEmail, setUseCustomEmail] = useState(false);
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
    const [showPreview, setShowPreview] = useState(false);

    // ✅ FIX 15-ENE-2026: Obtener URL del PDF existente (generado por mobile)
    const { data: pdfExistenteData } = useQuery({
        queryKey: ['orden-pdf-url', orden.id_orden_servicio],
        queryFn: async () => {
            const session = await getSession();
            const token = (session as any)?.accessToken;
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/ordenes/${orden.id_orden_servicio}/pdf-url`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!res.ok) return null;
            return res.json();
        },
        enabled: orden.estados_orden?.codigo_estado === 'COMPLETADA' || orden.estados_orden?.codigo_estado === 'APROBADA',
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
                // Crear URL para previsualizar
                const blob = base64ToBlob(response.pdfBase64, 'application/pdf');
                const url = URL.createObjectURL(blob);
                setPdfPreviewUrl(url);
            }
            onUpdate?.();
        },
    });

    // Convertir base64 a Blob
    function base64ToBlob(base64: string, contentType: string): Blob {
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: contentType });
    }

    // Regenerar PDF sin enviar
    const handleRegenerarPdf = async () => {
        await regenerarMutation.mutateAsync({
            enviarEmail: false,
        });
    };

    // ✅ FIX 24-ENE-2026: Forzar regeneración del PDF (actualiza URL en BD)
    const handleForzarRegeneracion = async () => {
        await regenerarMutation.mutateAsync({
            enviarEmail: false,
            forzarRegeneracion: true,
        });
    };

    // Regenerar y enviar por email
    const handleEnviarPdf = async () => {
        const email = useCustomEmail ? emailDestino : clienteEmail;
        if (!email) {
            alert('Por favor ingrese un email de destino');
            return;
        }

        await regenerarMutation.mutateAsync({
            enviarEmail: true,
            emailDestino: email,
            asuntoEmail: asuntoEmail || undefined,
            mensajeEmail: mensajeEmail || undefined,
        });

        setShowEmailModal(false);
        setEmailDestino('');
        setAsuntoEmail('');
        setMensajeEmail('');
    };

    // Descargar PDF
    const handleDescargarPdf = () => {
        // Prioridad: PDF regenerado > PDF existente
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

    // Previsualizar PDF existente (generado por mobile)
    const handlePrevisualizar = () => {
        // Prioridad: PDF regenerado > PDF existente
        const urlToUse = pdfPreviewUrl || urlPdfExistente;
        if (urlToUse) {
            window.open(urlToUse, '_blank');
        } else {
            alert('No hay PDF disponible. Regenere el informe primero.');
        }
    };

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
                {regenerarMutation.isPending && (
                    <div className="flex items-center gap-2 text-blue-600">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-xs font-medium">Procesando...</span>
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
                    {/* Previsualizar */}
                    <button
                        onClick={handlePrevisualizar}
                        className="flex flex-col items-center justify-center p-4 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-all group"
                    >
                        <Eye className="h-6 w-6 text-gray-500 group-hover:text-blue-600 mb-2" />
                        <span className="text-sm font-bold text-gray-700 group-hover:text-blue-600">Previsualizar</span>
                        <span className="text-[10px] text-gray-400 mt-0.5">Ver PDF actual</span>
                    </button>

                    {/* Descargar */}
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
                    onClick={() => setShowEmailModal(true)}
                    disabled={regenerarMutation.isPending}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Mail className="h-5 w-5" />
                    Enviar Informe por Email
                </button>

                {/* ✅ FIX 24-ENE-2026: Indicador de PDF existente con opción de forzar regeneración */}
                {urlPdfExistente && !regenerarMutation.isSuccess && (
                    <div className="flex items-center justify-between gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-xs text-amber-700 flex items-center gap-1.5">
                            <Check className="h-3.5 w-3.5" />
                            PDF existente disponible
                        </p>
                        <button
                            onClick={handleForzarRegeneracion}
                            disabled={regenerarMutation.isPending}
                            className="text-xs font-medium text-amber-700 hover:text-amber-900 hover:underline disabled:opacity-50 flex items-center gap-1"
                        >
                            <RefreshCw className="h-3 w-3" />
                            Actualizar URL
                        </button>
                    </div>
                )}

                {/* Mensaje de éxito */}
                {regenerarMutation.isSuccess && regenerarMutation.data && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <p className="text-sm text-green-700 font-medium flex items-center gap-2">
                            <Check className="h-4 w-4" />
                            {regenerarMutation.data.message}
                        </p>
                        {regenerarMutation.data.emailEnviado && (
                            <p className="text-xs text-green-600 mt-1">
                                Email enviado exitosamente
                            </p>
                        )}
                    </div>
                )}

                {/* Error */}
                {regenerarMutation.isError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-sm text-red-700 font-medium">
                            Error al procesar el PDF. Intente nuevamente.
                        </p>
                    </div>
                )}
            </div>

            {/* Modal de Email */}
            {showEmailModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        {/* Header del modal */}
                        <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50 flex items-center justify-between">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                <Mail className="h-5 w-5 text-green-600" />
                                Enviar Informe por Email
                            </h3>
                            <button
                                onClick={() => setShowEmailModal(false)}
                                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="h-5 w-5 text-gray-500" />
                            </button>
                        </div>

                        {/* Contenido del modal */}
                        <div className="p-4 space-y-4">
                            {/* Selector de email */}
                            <div>
                                <label className="text-sm font-bold text-gray-700 mb-2 block">
                                    Destinatario
                                </label>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                                        <input
                                            type="radio"
                                            name="emailType"
                                            checked={!useCustomEmail}
                                            onChange={() => setUseCustomEmail(false)}
                                            className="w-4 h-4 text-green-600"
                                        />
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-gray-700">Email del cliente</p>
                                            <p className="text-xs text-gray-500">{clienteEmail || 'No disponible'}</p>
                                        </div>
                                    </label>
                                    <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                                        <input
                                            type="radio"
                                            name="emailType"
                                            checked={useCustomEmail}
                                            onChange={() => setUseCustomEmail(true)}
                                            className="w-4 h-4 text-green-600"
                                        />
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-gray-700">Email personalizado</p>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {/* Input de email personalizado */}
                            {useCustomEmail && (
                                <div>
                                    <input
                                        type="email"
                                        value={emailDestino}
                                        onChange={(e) => setEmailDestino(e.target.value)}
                                        placeholder="correo@ejemplo.com"
                                        className="w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                    />
                                </div>
                            )}

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
                                disabled={regenerarMutation.isPending || (!clienteEmail && !emailDestino)}
                                className="flex-1 py-2.5 px-4 text-sm font-bold text-white bg-green-600 hover:bg-green-700 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {regenerarMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Send className="h-4 w-4" />
                                )}
                                Enviar
                            </button>
                        </div>
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
