/**
 * MEKANOS S.A.S - Portal Admin
 * Página de Creación de Empleado (V2 Enterprise)
 * 
 * Ruta: /empleados/nuevo
 * 
 * Wizard COMPLETO de 3 pasos con TODOS los campos SQL:
 * 1. Datos Persona (tabla personas)
 * 2. Datos Laborales (tabla empleados - incluyendo licencia, emergencia)
 * 3. Acceso al Sistema (tabla usuarios - con credenciales visibles)
 */

'use client';

import { EmpleadoFormV2 } from '@/features/empleados/components/EmpleadoFormV2';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function NuevoEmpleadoPage() {
    const router = useRouter();

    const handleSuccess = () => {
        router.push('/empleados');
    };

    const handleCancel = () => {
        router.push('/empleados');
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => router.push('/empleados')}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <ArrowLeft className="h-5 w-5 text-gray-600" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <UserPlus className="h-7 w-7 text-blue-600" />
                        Nuevo Empleado
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Registro completo: Persona → Empleado → Acceso Sistema
                    </p>
                </div>
            </div>

            {/* Formulario V2 Enterprise */}
            <EmpleadoFormV2 onSuccess={handleSuccess} onCancel={handleCancel} />
        </div>
    );
}
