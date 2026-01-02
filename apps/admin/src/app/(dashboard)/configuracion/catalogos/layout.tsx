'use client';

import { cn } from '@/lib/utils';
import {
    Activity,
    CheckCircle2,
    Database,
    DollarSign,
    Layers,
    Settings,
    Wrench
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const MENU_CATALOGOS = [
    {
        name: 'Tipos de Servicio',
        href: '/configuracion/catalogos/tipos-servicio',
        icon: Wrench,
        description: 'Preventivos, Correctivos, etc.'
    },
    {
        name: 'Estados de Orden',
        href: '/configuracion/catalogos/estados',
        icon: CheckCircle2,
        description: 'Flujo de trabajo y colores'
    },
    {
        name: 'Parámetros Medición',
        href: '/configuracion/catalogos/parametros',
        icon: Activity,
        description: 'Presión, Temperatura, Voltaje'
    },
    {
        name: 'Sistemas',
        href: '/configuracion/catalogos/sistemas',
        icon: Layers,
        description: 'Motor, Eléctrico, Hidráulico'
    },
    {
        name: 'Actividades (Checklist)',
        href: '/configuracion/catalogos/actividades',
        icon: Database,
        description: 'Plantillas de tareas técnicas'
    },
    {
        name: 'Catálogo Comercial',
        href: '/configuracion/catalogos/servicios',
        icon: DollarSign,
        description: 'Precios y servicios facturables'
    },
];

export default function CatalogosLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    return (
        <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar de Navegación */}
            <aside className="w-full lg:w-72 flex-shrink-0">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gray-50">
                        <h2 className="font-bold text-gray-900 flex items-center gap-2">
                            <Settings className="h-5 w-5 text-blue-600" />
                            Configuración
                        </h2>
                        <p className="text-xs text-gray-500 mt-1">Gestión de catálogos maestros</p>
                    </div>
                    <nav className="p-2 space-y-1">
                        {MENU_CATALOGOS.map((item) => {
                            const isActive = pathname === item.href;
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group",
                                        isActive
                                            ? "bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100"
                                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                    )}
                                >
                                    <Icon className={cn(
                                        "h-5 w-5 flex-shrink-0",
                                        isActive ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600"
                                    )} />
                                    <div>
                                        <p className="text-sm font-medium">{item.name}</p>
                                        <p className="text-[10px] opacity-70 line-clamp-1">{item.description}</p>
                                    </div>
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <p className="text-xs text-blue-800 leading-relaxed">
                        <strong>Nota:</strong> Los cambios realizados en estos catálogos afectan dinámicamente a los selectores del Wizard de Órdenes y la App Móvil.
                    </p>
                </div>
            </aside>

            {/* Contenido Principal */}
            <main className="flex-1 min-w-0">
                {children}
            </main>
        </div>
    );
}
