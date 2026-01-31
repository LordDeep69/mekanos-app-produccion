'use client';

/**
 * MEKANOS S.A.S - Portal Admin
 * Página de Error para Dashboard
 * 
 * Maneja errores dentro del área del dashboard
 * manteniendo el contexto de navegación.
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';
import { useEffect } from 'react';

export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('[DashboardError] Error:', error);
    }, [error]);

    return (
        <div className="flex-1 flex items-center justify-center p-6">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mb-3">
                        <AlertTriangle className="w-7 h-7 text-amber-600" />
                    </div>
                    <CardTitle className="text-lg font-semibold text-slate-800">
                        Error al cargar
                    </CardTitle>
                    <CardDescription className="text-slate-600">
                        No pudimos cargar esta sección correctamente.
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                    <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600 text-center">
                        Puede ser un problema temporal de conexión o del servidor.
                    </div>

                    <div className="flex flex-col gap-2">
                        <Button
                            onClick={reset}
                            className="w-full bg-mekanos-primary hover:bg-mekanos-primary/90"
                        >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Reintentar
                        </Button>
                        <Button
                            onClick={() => window.location.reload()}
                            variant="outline"
                            className="w-full"
                        >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Recargar página
                        </Button>
                    </div>

                    {error.digest && (
                        <p className="text-center text-xs text-slate-400">
                            Ref: {error.digest}
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
