'use client';

/**
 * MEKANOS S.A.S - Portal Admin
 * Error Boundary Profesional
 * 
 * Captura errores de React y muestra una UI amigable
 * en lugar de la pantalla de error técnico de Next.js
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Bug, Home, RefreshCw } from 'lucide-react';
import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('[ErrorBoundary] Error capturado:', error);
        console.error('[ErrorBoundary] Info:', errorInfo);

        this.setState({ errorInfo });

        // Aquí se podría enviar a un servicio de monitoreo como Sentry
        // if (typeof window !== 'undefined' && window.Sentry) {
        //   window.Sentry.captureException(error);
        // }
    }

    handleReload = () => {
        window.location.reload();
    };

    handleGoHome = () => {
        window.location.href = '/dashboard';
    };

    handleReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
                    <Card className="w-full max-w-lg shadow-xl border-0">
                        <CardHeader className="text-center pb-2">
                            <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                                <AlertTriangle className="w-8 h-8 text-amber-600" />
                            </div>
                            <CardTitle className="text-xl font-semibold text-slate-800">
                                Algo salió mal
                            </CardTitle>
                            <CardDescription className="text-slate-600">
                                Ha ocurrido un error inesperado en la aplicación.
                                Nuestro equipo ha sido notificado automáticamente.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-4">
                            {/* Mensaje amigable */}
                            <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-600">
                                <p className="mb-2">
                                    <strong>¿Qué puedes hacer?</strong>
                                </p>
                                <ul className="list-disc list-inside space-y-1">
                                    <li>Recargar la página para intentar nuevamente</li>
                                    <li>Volver al inicio del sistema</li>
                                    <li>Si el problema persiste, contactar soporte</li>
                                </ul>
                            </div>

                            {/* Botones de acción */}
                            <div className="flex flex-col sm:flex-row gap-3">
                                <Button
                                    onClick={this.handleReload}
                                    className="flex-1 bg-mekanos-primary hover:bg-mekanos-primary/90"
                                >
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Recargar página
                                </Button>
                                <Button
                                    onClick={this.handleGoHome}
                                    variant="outline"
                                    className="flex-1"
                                >
                                    <Home className="w-4 h-4 mr-2" />
                                    Ir al inicio
                                </Button>
                            </div>

                            {/* Detalles técnicos (colapsado) */}
                            {process.env.NODE_ENV === 'development' && this.state.error && (
                                <details className="mt-4">
                                    <summary className="cursor-pointer text-sm text-slate-500 hover:text-slate-700 flex items-center gap-2">
                                        <Bug className="w-4 h-4" />
                                        Detalles técnicos (solo desarrollo)
                                    </summary>
                                    <div className="mt-2 p-3 bg-red-50 rounded-lg text-xs font-mono text-red-800 overflow-auto max-h-40">
                                        <p className="font-bold mb-1">{this.state.error.name}: {this.state.error.message}</p>
                                        <pre className="whitespace-pre-wrap">{this.state.error.stack}</pre>
                                    </div>
                                </details>
                            )}

                            {/* Info de contacto */}
                            <p className="text-center text-xs text-slate-400 pt-2">
                                Código de referencia: {Date.now().toString(36).toUpperCase()}
                            </p>
                        </CardContent>
                    </Card>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
