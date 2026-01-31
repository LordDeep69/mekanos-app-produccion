'use client';

/**
 * MEKANOS S.A.S - Portal Admin
 * Página de Error Global (Next.js App Router)
 * 
 * Esta página se muestra cuando ocurre un error no capturado
 * en cualquier parte de la aplicación.
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertOctagon, ArrowLeft, Home, RefreshCw } from 'lucide-react';
import { useEffect } from 'react';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log del error para debugging
        console.error('[GlobalError] Error capturado:', error);
    }, [error]);

    const handleGoHome = () => {
        window.location.href = '/dashboard';
    };

    const handleGoBack = () => {
        window.history.back();
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
            <Card className="w-full max-w-lg shadow-xl border-0">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                        <AlertOctagon className="w-8 h-8 text-red-600" />
                    </div>
                    <CardTitle className="text-xl font-semibold text-slate-800">
                        Error en la aplicación
                    </CardTitle>
                    <CardDescription className="text-slate-600">
                        Ha ocurrido un error inesperado. Por favor, intenta una de las siguientes opciones.
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                    {/* Mensaje amigable */}
                    <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-600">
                        <p>
                            Este error ha sido registrado automáticamente. Si el problema persiste,
                            por favor contacta al equipo de soporte técnico.
                        </p>
                    </div>

                    {/* Botones de acción */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Button
                            onClick={reset}
                            className="bg-mekanos-primary hover:bg-mekanos-primary/90"
                        >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Intentar de nuevo
                        </Button>
                        <Button
                            onClick={handleGoBack}
                            variant="outline"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Volver atrás
                        </Button>
                    </div>

                    <Button
                        onClick={handleGoHome}
                        variant="ghost"
                        className="w-full"
                    >
                        <Home className="w-4 h-4 mr-2" />
                        Ir al Dashboard
                    </Button>

                    {/* Código de referencia */}
                    {error.digest && (
                        <p className="text-center text-xs text-slate-400 pt-2 border-t">
                            Referencia: {error.digest}
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
