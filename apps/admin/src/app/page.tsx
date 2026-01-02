/**
 * MEKANOS S.A.S - Portal Admin
 * Página Principal
 * 
 * Esta es una página temporal de bienvenida.
 * Será reemplazada por la redirección a /dashboard cuando Auth esté configurado.
 */

import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F2F2F2' }}>
      {/* Hero Section */}
      <div 
        className="py-16 px-8"
        style={{ backgroundColor: '#244673' }}
      >
        <div className="max-w-4xl mx-auto text-center text-white">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            MEKANOS S.A.S
          </h1>
          <h2 className="text-xl md:text-2xl opacity-90 mb-2">
            Portal de Administración
          </h2>
          <p className="text-lg opacity-75">
            Sistema de Gestión de Órdenes de Servicio
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-8 py-12">
        {/* Status Card */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h3 className="text-2xl font-bold mb-6" style={{ color: '#244673' }}>
            🚀 Estado del Proyecto
          </h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Fase Actual */}
            <div className="p-4 rounded-lg" style={{ backgroundColor: '#F2F2F2' }}>
              <p className="text-sm text-gray-500 mb-1">Fase Actual</p>
              <p className="text-xl font-semibold" style={{ color: '#244673' }}>
                FASE 1: Fundamentos
              </p>
              <p className="text-sm text-gray-600 mt-1">En progreso</p>
            </div>

            {/* Next.js Version */}
            <div className="p-4 rounded-lg" style={{ backgroundColor: '#F2F2F2' }}>
              <p className="text-sm text-gray-500 mb-1">Framework</p>
              <p className="text-xl font-semibold" style={{ color: '#56A672' }}>
                Next.js 16.1.1 ✅
              </p>
              <p className="text-sm text-gray-600 mt-1">CVE-2025-55182 parcheado</p>
            </div>

            {/* Stack */}
            <div className="p-4 rounded-lg" style={{ backgroundColor: '#F2F2F2' }}>
              <p className="text-sm text-gray-500 mb-1">Stack Tecnológico</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="px-2 py-1 bg-white rounded text-xs font-medium">TypeScript</span>
                <span className="px-2 py-1 bg-white rounded text-xs font-medium">Tailwind CSS</span>
                <span className="px-2 py-1 bg-white rounded text-xs font-medium">TanStack Query</span>
                <span className="px-2 py-1 bg-white rounded text-xs font-medium">Zustand</span>
              </div>
            </div>

            {/* Backend */}
            <div className="p-4 rounded-lg" style={{ backgroundColor: '#F2F2F2' }}>
              <p className="text-sm text-gray-500 mb-1">Backend</p>
              <p className="text-xl font-semibold" style={{ color: '#244673' }}>
                NestJS @ localhost:3000
              </p>
              <p className="text-sm text-gray-600 mt-1">85+ módulos disponibles</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h3 className="text-2xl font-bold mb-6" style={{ color: '#244673' }}>
            🧪 Verificaciones
          </h3>
          
          <div className="space-y-4">
            <Link 
              href="/smoke-test"
              className="block w-full p-4 rounded-lg text-center font-semibold text-white transition-all hover:opacity-90"
              style={{ backgroundColor: '#56A672' }}
            >
              🔬 Ejecutar Smoke Test (Health Check)
            </Link>

            <div 
              className="p-4 rounded-lg text-center opacity-50 cursor-not-allowed"
              style={{ backgroundColor: '#3290A6', color: 'white' }}
            >
              🔐 Login (Próximamente - FASE 2)
            </div>

            <div 
              className="p-4 rounded-lg text-center opacity-50 cursor-not-allowed"
              style={{ backgroundColor: '#244673', color: 'white' }}
            >
              📊 Dashboard (Próximamente - FASE 3)
            </div>
          </div>
        </div>

        {/* Colores MEKANOS Preview */}
        <div className="mt-8 bg-white rounded-xl shadow-lg p-8">
          <h3 className="text-2xl font-bold mb-6" style={{ color: '#244673' }}>
            🎨 Paleta de Colores MEKANOS
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="w-full h-16 rounded-lg mb-2" style={{ backgroundColor: '#F2F2F2', border: '1px solid #ddd' }}></div>
              <p className="text-xs font-mono">#F2F2F2</p>
              <p className="text-xs text-gray-500">Blanco</p>
            </div>
            <div className="text-center">
              <div className="w-full h-16 rounded-lg mb-2" style={{ backgroundColor: '#244673' }}></div>
              <p className="text-xs font-mono">#244673</p>
              <p className="text-xs text-gray-500">Azul</p>
            </div>
            <div className="text-center">
              <div className="w-full h-16 rounded-lg mb-2" style={{ backgroundColor: '#3290A6' }}></div>
              <p className="text-xs font-mono">#3290A6</p>
              <p className="text-xs text-gray-500">Azul Claro</p>
            </div>
            <div className="text-center">
              <div className="w-full h-16 rounded-lg mb-2" style={{ backgroundColor: '#56A672' }}></div>
              <p className="text-xs font-mono">#56A672</p>
              <p className="text-xs text-gray-500">Verde</p>
            </div>
            <div className="text-center">
              <div className="w-full h-16 rounded-lg mb-2" style={{ backgroundColor: '#9EC23D' }}></div>
              <p className="text-xs font-mono">#9EC23D</p>
              <p className="text-xs text-gray-500">Verde Claro</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>MEKANOS S.A.S - Portal Admin v0.1.0</p>
          <p className="mt-1">© 2025 Todos los derechos reservados</p>
        </div>
      </div>
    </div>
  );
}
