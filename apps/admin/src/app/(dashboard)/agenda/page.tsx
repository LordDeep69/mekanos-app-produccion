/**
 * MEKANOS S.A.S - Portal Admin
 * Página de Agenda - Placeholder
 * 
 * Ruta: /agenda
 * 
 * TODO: Implementar calendario de órdenes programadas
 */

'use client';

import { Calendar, Clock, Construction } from 'lucide-react';

export default function AgendaPage() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Calendar className="h-7 w-7 text-blue-600" />
                    Agenda de Servicios
                </h1>
                <p className="text-gray-500 mt-1">
                    Calendario de órdenes de servicio programadas
                </p>
            </div>

            {/* Placeholder */}
            <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <Construction className="h-16 w-16 text-gray-400 mb-4" />
                <h2 className="text-xl font-semibold text-gray-700 mb-2">
                    Módulo en Desarrollo
                </h2>
                <p className="text-gray-500 text-center max-w-md mb-6">
                    El módulo de Agenda permitirá visualizar un calendario interactivo con todas las
                    órdenes de servicio programadas, drag & drop para reprogramar, y vista por técnico.
                </p>

                {/* Features planeados */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className="bg-white p-4 rounded-lg shadow-sm border">
                        <Calendar className="h-8 w-8 text-blue-500 mb-2" />
                        <h3 className="font-medium text-gray-800">Vista Calendario</h3>
                        <p className="text-sm text-gray-500">Día, semana, mes</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm border">
                        <Clock className="h-8 w-8 text-green-500 mb-2" />
                        <h3 className="font-medium text-gray-800">Drag & Drop</h3>
                        <p className="text-sm text-gray-500">Reprogramar fácilmente</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm border">
                        <Calendar className="h-8 w-8 text-purple-500 mb-2" />
                        <h3 className="font-medium text-gray-800">Por Técnico</h3>
                        <p className="text-sm text-gray-500">Carga de trabajo</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
