/**
 * MEKANOS S.A.S - Portal Admin
 * Página de Reportes - Placeholder
 * 
 * Ruta: /reportes
 * 
 * TODO: Implementar generación de reportes y analytics
 */

'use client';

import { BarChart3, Construction, FileText, PieChart, TrendingUp } from 'lucide-react';

export default function ReportesPage() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <FileText className="h-7 w-7 text-purple-600" />
                    Reportes y Analytics
                </h1>
                <p className="text-gray-500 mt-1">
                    Informes de gestión, KPIs y análisis de datos
                </p>
            </div>

            {/* Placeholder */}
            <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <Construction className="h-16 w-16 text-gray-400 mb-4" />
                <h2 className="text-xl font-semibold text-gray-700 mb-2">
                    Módulo en Desarrollo
                </h2>
                <p className="text-gray-500 text-center max-w-md mb-6">
                    El módulo de Reportes permitirá generar informes personalizados,
                    exportar datos a Excel/PDF y visualizar métricas clave del negocio.
                </p>

                {/* Features planeados */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className="bg-white p-4 rounded-lg shadow-sm border">
                        <BarChart3 className="h-8 w-8 text-blue-500 mb-2" />
                        <h3 className="font-medium text-gray-800">Gráficos</h3>
                        <p className="text-sm text-gray-500">Visualización interactiva</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm border">
                        <PieChart className="h-8 w-8 text-green-500 mb-2" />
                        <h3 className="font-medium text-gray-800">KPIs</h3>
                        <p className="text-sm text-gray-500">Métricas de rendimiento</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm border">
                        <TrendingUp className="h-8 w-8 text-purple-500 mb-2" />
                        <h3 className="font-medium text-gray-800">Tendencias</h3>
                        <p className="text-sm text-gray-500">Análisis histórico</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
