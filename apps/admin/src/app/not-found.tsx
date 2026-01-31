/**
 * MEKANOS S.A.S - Portal Admin
 * Página 404 - No Encontrado
 * 
 * Se muestra cuando el usuario accede a una ruta que no existe.
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileQuestion, Home, Search } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
            <Card className="w-full max-w-lg shadow-xl border-0">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                        <FileQuestion className="w-10 h-10 text-blue-600" />
                    </div>
                    <CardTitle className="text-2xl font-semibold text-slate-800">
                        Página no encontrada
                    </CardTitle>
                    <CardDescription className="text-slate-600 text-base">
                        La página que buscas no existe o ha sido movida.
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                    {/* Sugerencias */}
                    <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-600">
                        <p className="mb-2 font-medium">Esto pudo ocurrir porque:</p>
                        <ul className="list-disc list-inside space-y-1">
                            <li>La URL tiene un error tipográfico</li>
                            <li>La página fue eliminada o movida</li>
                            <li>El enlace que seguiste está desactualizado</li>
                        </ul>
                    </div>

                    {/* Botones de acción */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Button
                            asChild
                            className="bg-mekanos-primary hover:bg-mekanos-primary/90"
                        >
                            <Link href="/dashboard">
                                <Home className="w-4 h-4 mr-2" />
                                Ir al Dashboard
                            </Link>
                        </Button>
                        <Button
                            asChild
                            variant="outline"
                        >
                            <Link href="/ordenes">
                                <Search className="w-4 h-4 mr-2" />
                                Ver Órdenes
                            </Link>
                        </Button>
                    </div>

                    {/* Enlaces rápidos */}
                    <div className="pt-4 border-t">
                        <p className="text-sm text-slate-500 mb-3 text-center">Enlaces rápidos:</p>
                        <div className="flex flex-wrap justify-center gap-2">
                            <Link
                                href="/clientes"
                                className="text-sm text-mekanos-primary hover:underline"
                            >
                                Clientes
                            </Link>
                            <span className="text-slate-300">•</span>
                            <Link
                                href="/empleados"
                                className="text-sm text-mekanos-primary hover:underline"
                            >
                                Empleados
                            </Link>
                            <span className="text-slate-300">•</span>
                            <Link
                                href="/equipos"
                                className="text-sm text-mekanos-primary hover:underline"
                            >
                                Equipos
                            </Link>
                            <span className="text-slate-300">•</span>
                            <Link
                                href="/configuracion"
                                className="text-sm text-mekanos-primary hover:underline"
                            >
                                Configuración
                            </Link>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
