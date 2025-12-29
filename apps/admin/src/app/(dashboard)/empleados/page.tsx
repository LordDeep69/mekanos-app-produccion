/**
 * MEKANOS S.A.S - Portal Admin
 * Página de Gestión de Empleados/Técnicos
 * 
 * Ruta: /empleados
 * 
 * Funcionalidades:
 * - Listado de empleados con filtros (técnico, asesor, activo)
 * - Ver detalle de empleado
 * - Cambiar estado (activo/inactivo)
 */

'use client';

import { getNombreCompleto, useEmpleados } from '@/features/empleados';
import { cn } from '@/lib/utils';
import type { EmpleadoConPersona } from '@/types/empleados';
import {
    AlertCircle,
    Briefcase,
    ChevronLeft,
    ChevronRight,
    Loader2,
    Mail,
    Phone,
    Plus,
    RefreshCw,
    Search,
    User,
    UserCheck,
    Users,
    Wrench
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTES AUXILIARES
// ═══════════════════════════════════════════════════════════════════════════════

function RolBadge({ empleado }: { empleado: EmpleadoConPersona }) {
    const esTecnico = empleado.es_tecnico;
    const esAsesor = empleado.es_asesor;

    if (esTecnico && esAsesor) {
        return (
            <div className="flex gap-1">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    <Wrench className="h-3 w-3" /> Técnico
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    <Briefcase className="h-3 w-3" /> Asesor
                </span>
            </div>
        );
    }

    if (esTecnico) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                <Wrench className="h-3 w-3" /> Técnico
            </span>
        );
    }

    if (esAsesor) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                <Briefcase className="h-3 w-3" /> Asesor
            </span>
        );
    }

    return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <User className="h-3 w-3" /> Administrativo
        </span>
    );
}

function EstadoBadge({ activo }: { activo: boolean }) {
    return (
        <span className={cn(
            'px-2 py-1 rounded-full text-xs font-medium',
            activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        )}>
            {activo ? 'Activo' : 'Inactivo'}
        </span>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function EmpleadosPage() {
    const [page, setPage] = useState(1);
    const [busqueda, setBusqueda] = useState('');
    const [filtroTecnico, setFiltroTecnico] = useState<string>('');
    const [filtroActivo, setFiltroActivo] = useState<string>('');

    const pageSize = 12;

    const { data, isLoading, isError, refetch } = useEmpleados({
        es_tecnico: filtroTecnico === 'true' ? true : filtroTecnico === 'false' ? false : undefined,
        empleado_activo: filtroActivo === 'true' ? true : filtroActivo === 'false' ? false : undefined,
        skip: (page - 1) * pageSize,
        take: pageSize,
    });

    const empleados = data?.data || [];
    const total = data?.total || 0;
    const totalPages = Math.ceil(total / pageSize);

    // Filtro local por búsqueda (nombre, código, email)
    const empleadosFiltrados = busqueda
        ? empleados.filter((e) => {
            const nombre = getNombreCompleto(e.persona).toLowerCase();
            const codigo = (e.codigo_empleado || '').toLowerCase();
            const email = (e.persona?.email_principal || '').toLowerCase();
            const query = busqueda.toLowerCase();
            return nombre.includes(query) || codigo.includes(query) || email.includes(query);
        })
        : empleados;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Users className="h-7 w-7 text-blue-600" />
                        Gestión de Empleados
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Técnicos, asesores y personal administrativo
                    </p>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <UserCheck className="h-4 w-4" />
                        <span>{total} empleados registrados</span>
                    </div>
                    <Link
                        href="/empleados/nuevo"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                        <Plus className="h-4 w-4" />
                        Nuevo Empleado
                    </Link>
                </div>
            </div>

            {/* Filtros */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, código o email..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                <div className="flex gap-2">
                    <select
                        value={filtroTecnico}
                        onChange={(e) => { setFiltroTecnico(e.target.value); setPage(1); }}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Todos los roles</option>
                        <option value="true">Solo Técnicos</option>
                        <option value="false">No Técnicos</option>
                    </select>

                    <select
                        value={filtroActivo}
                        onChange={(e) => { setFiltroActivo(e.target.value); setPage(1); }}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Todos los estados</option>
                        <option value="true">Activos</option>
                        <option value="false">Inactivos</option>
                    </select>

                    <button
                        onClick={() => refetch()}
                        className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                        title="Refrescar"
                    >
                        <RefreshCw className={cn('h-5 w-5 text-gray-600', isLoading && 'animate-spin')} />
                    </button>
                </div>
            </div>

            {/* Loading */}
            {isLoading && (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                </div>
            )}

            {/* Error */}
            {isError && (
                <div className="flex flex-col items-center justify-center py-12 text-red-500">
                    <AlertCircle className="h-8 w-8 mb-2" />
                    <p className="font-medium">Error al cargar empleados</p>
                    <button onClick={() => refetch()} className="mt-2 text-sm text-blue-600 hover:underline">
                        Reintentar
                    </button>
                </div>
            )}

            {/* Grid de empleados */}
            {!isLoading && !isError && (
                <>
                    {empleadosFiltrados.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-lg">
                            <Users className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                            <p className="text-gray-600 font-medium">No hay empleados registrados</p>
                            <p className="text-gray-500 text-sm">Los empleados aparecerán aquí cuando se registren</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {empleadosFiltrados.map((empleado) => (
                                <Link
                                    key={empleado.id_empleado}
                                    href={`/empleados/${empleado.id_empleado}`}
                                    className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md hover:border-blue-300 transition-all group"
                                >
                                    {/* Header de la tarjeta */}
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                                                <User className="h-5 w-5 text-blue-600" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-gray-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                                                    {getNombreCompleto(empleado.persona)}
                                                </h3>
                                                <span className="font-mono text-xs text-gray-500">
                                                    {empleado.codigo_empleado || `EMP-${empleado.id_empleado}`}
                                                </span>
                                            </div>
                                        </div>
                                        <EstadoBadge activo={empleado.empleado_activo} />
                                    </div>

                                    {/* Rol */}
                                    <div className="mb-3">
                                        <RolBadge empleado={empleado} />
                                    </div>

                                    {/* Cargo */}
                                    {empleado.cargo && (
                                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                                            <Briefcase className="h-4 w-4 text-gray-400" />
                                            <span className="line-clamp-1">{empleado.cargo?.replace(/_/g, ' ')}</span>
                                        </div>
                                    )}

                                    {/* Contacto */}
                                    <div className="space-y-1 text-sm text-gray-600">
                                        {empleado.persona?.email_principal && (
                                            <div className="flex items-center gap-2">
                                                <Mail className="h-4 w-4 text-gray-400" />
                                                <span className="line-clamp-1">{empleado.persona.email_principal}</span>
                                            </div>
                                        )}
                                        {(empleado.persona?.celular || empleado.persona?.telefono_principal) && (
                                            <div className="flex items-center gap-2">
                                                <Phone className="h-4 w-4 text-gray-400" />
                                                <span>{empleado.persona.celular || empleado.persona.telefono_principal}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Footer con fecha ingreso */}
                                    <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs text-gray-500">
                                        {empleado.fecha_ingreso && (
                                            <span>Ingreso: {new Date(empleado.fecha_ingreso).toLocaleDateString('es-CO')}</span>
                                        )}
                                        <span className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                            Ver detalle →
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}

                    {/* Paginación */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between pt-4">
                            <p className="text-sm text-gray-600">
                                Mostrando {((page - 1) * pageSize) + 1} a{' '}
                                {Math.min(page * pageSize, total)} de {total} empleados
                            </p>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage(page - 1)}
                                    disabled={page === 1}
                                    className={cn(
                                        'flex items-center gap-1 px-3 py-1 rounded border',
                                        page === 1
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            : 'bg-white text-gray-700 hover:bg-gray-50'
                                    )}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    Anterior
                                </button>
                                <button
                                    onClick={() => setPage(page + 1)}
                                    disabled={page >= totalPages}
                                    className={cn(
                                        'flex items-center gap-1 px-3 py-1 rounded border',
                                        page >= totalPages
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            : 'bg-white text-gray-700 hover:bg-gray-50'
                                    )}
                                >
                                    Siguiente
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
