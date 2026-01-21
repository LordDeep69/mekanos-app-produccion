/**
 * MEKANOS S.A.S - Portal Admin
 * Sección de Firmas Digitales
 * 
 * Visualización de firmas de técnico y cliente con zoom modal.
 */

'use client';

import { cn } from '@/lib/utils';
import {
    CheckCircle2,
    Clock,
    ExternalLink,
    Pen,
    User,
    UserCheck,
    X,
    ZoomIn
} from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

interface Firma {
    id_firma: number;
    id_orden_servicio: number;
    tipo_firma: 'TECNICO' | 'CLIENTE' | 'ASESOR' | 'GERENTE' | 'OTRO';
    url_firma?: string;
    firma_base64?: string;
    nombre_firmante?: string;
    cargo_firmante?: string;
    fecha_firma?: string;
    ip_captura?: string;
}

interface FirmasSectionProps {
    firmas: Firma[];
    isLoading?: boolean;
}

function getTipoFirmaConfig(tipo: string) {
    switch (tipo) {
        case 'TECNICO':
            return {
                label: 'Técnico',
                icon: UserCheck,
                bgGradient: 'from-blue-500 to-indigo-600',
                bgLight: 'bg-blue-50',
                borderColor: 'border-blue-200',
                textColor: 'text-blue-700'
            };
        case 'CLIENTE':
            return {
                label: 'Cliente',
                icon: User,
                bgGradient: 'from-purple-500 to-pink-600',
                bgLight: 'bg-purple-50',
                borderColor: 'border-purple-200',
                textColor: 'text-purple-700'
            };
        case 'ASESOR':
            return {
                label: 'Asesor',
                icon: User,
                bgGradient: 'from-green-500 to-emerald-600',
                bgLight: 'bg-green-50',
                borderColor: 'border-green-200',
                textColor: 'text-green-700'
            };
        default:
            return {
                label: tipo,
                icon: Pen,
                bgGradient: 'from-gray-500 to-gray-600',
                bgLight: 'bg-gray-50',
                borderColor: 'border-gray-200',
                textColor: 'text-gray-700'
            };
    }
}

function FirmaCard({ firma }: { firma: Firma }) {
    const [isZoomOpen, setIsZoomOpen] = useState(false);
    const config = getTipoFirmaConfig(firma.tipo_firma);
    const Icon = config.icon;

    const firmaUrl = firma.url_firma || (firma.firma_base64 ? `data:image/png;base64,${firma.firma_base64}` : null);
    const fechaFirma = firma.fecha_firma
        ? new Date(firma.fecha_firma).toLocaleString('es-CO', {
            dateStyle: 'medium',
            timeStyle: 'short'
        })
        : null;

    return (
        <>
            <div className={cn(
                "rounded-xl border-2 overflow-hidden transition-all hover:shadow-lg",
                config.bgLight,
                config.borderColor
            )}>
                {/* Header */}
                <div className={cn(
                    "p-3 text-white flex items-center gap-3 bg-gradient-to-r",
                    config.bgGradient
                )}>
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                        <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm">Firma {config.label}</p>
                        {firma.nombre_firmante && (
                            <p className="text-xs text-white/80 truncate">{firma.nombre_firmante}</p>
                        )}
                    </div>
                    <CheckCircle2 className="h-5 w-5 text-white/80" />
                </div>

                {/* Contenido */}
                <div className="p-3">
                    {/* Imagen de firma */}
                    {firmaUrl ? (
                        <div
                            className="relative bg-white rounded-lg border border-gray-200 p-2 cursor-pointer group"
                            onClick={() => setIsZoomOpen(true)}
                        >
                            <div className="relative h-24 w-full">
                                <Image
                                    src={firmaUrl}
                                    alt={`Firma de ${firma.nombre_firmante || config.label}`}
                                    fill
                                    className="object-contain"
                                    unoptimized={firmaUrl.startsWith('data:')}
                                />
                            </div>
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-lg transition-all flex items-center justify-center">
                                <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-all drop-shadow-lg" />
                            </div>
                        </div>
                    ) : (
                        <div className="h-24 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                            <Pen className="h-8 w-8" />
                        </div>
                    )}

                    {/* Metadata */}
                    <div className="mt-3 space-y-1.5">
                        {firma.cargo_firmante && (
                            <p className={cn("text-xs font-medium", config.textColor)}>
                                {firma.cargo_firmante}
                            </p>
                        )}
                        {fechaFirma && (
                            <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                                <Clock className="h-3 w-3" />
                                <span>{fechaFirma}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal de Zoom */}
            {isZoomOpen && firmaUrl && (
                <div
                    className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
                    onClick={() => setIsZoomOpen(false)}
                >
                    <div
                        className="relative bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header del modal */}
                        <div className={cn(
                            "p-4 text-white flex items-center justify-between bg-gradient-to-r",
                            config.bgGradient
                        )}>
                            <div className="flex items-center gap-3">
                                <Icon className="h-5 w-5" />
                                <div>
                                    <p className="font-bold">Firma {config.label}</p>
                                    <p className="text-xs text-white/80">{firma.nombre_firmante}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsZoomOpen(false)}
                                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Imagen ampliada */}
                        <div className="p-6 bg-gray-50">
                            <div className="relative h-64 w-full bg-white rounded-xl border border-gray-200 p-4">
                                <Image
                                    src={firmaUrl}
                                    alt={`Firma de ${firma.nombre_firmante || config.label}`}
                                    fill
                                    className="object-contain"
                                    unoptimized={firmaUrl.startsWith('data:')}
                                />
                            </div>
                        </div>

                        {/* Detalles */}
                        <div className="p-4 border-t border-gray-200 bg-white">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-gray-500 text-xs uppercase font-bold">Firmante</p>
                                    <p className="font-medium text-gray-900">{firma.nombre_firmante || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500 text-xs uppercase font-bold">Cargo</p>
                                    <p className="font-medium text-gray-900">{firma.cargo_firmante || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500 text-xs uppercase font-bold">Fecha</p>
                                    <p className="font-medium text-gray-900">{fechaFirma || '-'}</p>
                                </div>
                                {firma.url_firma && (
                                    <div>
                                        <a
                                            href={firma.url_firma}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-medium text-sm"
                                        >
                                            <ExternalLink className="h-4 w-4" />
                                            Ver original
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

function FirmaPendiente({ tipo }: { tipo: string }) {
    const config = getTipoFirmaConfig(tipo);
    const Icon = config.icon;

    return (
        <div className={cn(
            "rounded-xl border-2 border-dashed overflow-hidden",
            config.borderColor
        )}>
            <div className={cn(
                "p-3 flex items-center gap-3",
                config.bgLight
            )}>
                <div className={cn(
                    "p-2 rounded-lg",
                    "bg-gray-200"
                )}>
                    <Icon className="h-5 w-5 text-gray-400" />
                </div>
                <div className="flex-1">
                    <p className="font-bold text-sm text-gray-400">Firma {config.label}</p>
                    <p className="text-xs text-gray-400">Pendiente</p>
                </div>
                <Clock className="h-5 w-5 text-gray-300" />
            </div>

            <div className="p-3">
                <div className="h-24 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-200">
                    <div className="text-center text-gray-400">
                        <Pen className="h-6 w-6 mx-auto mb-1 opacity-30" />
                        <p className="text-xs font-medium">Sin firma</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function FirmasSection({ firmas, isLoading }: FirmasSectionProps) {
    const firmaTecnico = firmas.find(f => f.tipo_firma === 'TECNICO');
    const firmaCliente = firmas.find(f => f.tipo_firma === 'CLIENTE');
    const otrasFirmas = firmas.filter(f => !['TECNICO', 'CLIENTE'].includes(f.tipo_firma));

    const totalFirmas = firmas.length;
    const firmasRequeridas = 2; // Técnico y Cliente
    const firmasCompletadas = (firmaTecnico ? 1 : 0) + (firmaCliente ? 1 : 0);

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-sm">
                        <Pen className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-900">Firmas Digitales</h4>
                        <p className="text-xs text-gray-500">
                            {firmasCompletadas}/{firmasRequeridas} firmas requeridas
                        </p>
                    </div>
                </div>

                {/* Badge de estado */}
                <div className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-bold",
                    firmasCompletadas === firmasRequeridas
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                )}>
                    {firmasCompletadas === firmasRequeridas ? '✓ Completo' : 'Pendiente'}
                </div>
            </div>

            {/* Grid de firmas */}
            <div className="p-4">
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="h-48 bg-gray-100 animate-pulse rounded-xl" />
                        <div className="h-48 bg-gray-100 animate-pulse rounded-xl" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Firma Técnico */}
                        {firmaTecnico ? (
                            <FirmaCard firma={firmaTecnico} />
                        ) : (
                            <FirmaPendiente tipo="TECNICO" />
                        )}

                        {/* Firma Cliente */}
                        {firmaCliente ? (
                            <FirmaCard firma={firmaCliente} />
                        ) : (
                            <FirmaPendiente tipo="CLIENTE" />
                        )}
                    </div>
                )}

                {/* Otras firmas adicionales */}
                {otrasFirmas.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                            Firmas Adicionales
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {otrasFirmas.map((firma) => (
                                <FirmaCard key={firma.id_firma} firma={firma} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
