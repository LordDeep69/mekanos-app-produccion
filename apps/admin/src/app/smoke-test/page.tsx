'use client';

/**
 * MEKANOS S.A.S - Portal Admin
 * Smoke Test Page
 * 
 * Página temporal para verificar conectividad con el backend
 * ELIMINAR después de verificar que funciona
 */

import { checkHealth, HealthCheckResponse } from '@/lib/api';
import { useEffect, useState } from 'react';

type TestStatus = 'idle' | 'loading' | 'success' | 'error';

export default function SmokeTestPage() {
  const [status, setStatus] = useState<TestStatus>('idle');
  const [healthData, setHealthData] = useState<HealthCheckResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [apiUrl, setApiUrl] = useState<string>('');

  useEffect(() => {
    // Mostrar la URL configurada
    setApiUrl(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api');
  }, []);

  const runHealthCheck = async () => {
    setStatus('loading');
    setError(null);
    setHealthData(null);

    try {
      console.log('[SmokeTest] Ejecutando health check...');
      const data = await checkHealth();
      console.log('[SmokeTest] Respuesta:', data);
      setHealthData(data);
      setStatus('success');
    } catch (err) {
      console.error('[SmokeTest] Error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: '#F2F2F2' }}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div 
          className="rounded-lg p-6 mb-8 text-white"
          style={{ backgroundColor: '#244673' }}
        >
          <h1 className="text-3xl font-bold">🔬 MEKANOS Admin - Smoke Test</h1>
          <p className="mt-2 opacity-90">
            Verificación de conectividad Admin → Backend
          </p>
        </div>

        {/* Configuración */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4" style={{ color: '#244673' }}>
            ⚙️ Configuración
          </h2>
          <div className="space-y-2">
            <p className="text-sm">
              <span className="font-medium">API URL:</span>{' '}
              <code className="bg-gray-100 px-2 py-1 rounded">{apiUrl}</code>
            </p>
            <p className="text-sm">
              <span className="font-medium">Next.js Version:</span>{' '}
              <code className="bg-gray-100 px-2 py-1 rounded">16.1.1</code>
              <span className="ml-2 text-green-600">✅ Seguro (CVE-2025-55182 parcheado)</span>
            </p>
          </div>
        </div>

        {/* Test Button */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4" style={{ color: '#244673' }}>
            🧪 Health Check
          </h2>
          
          <button
            onClick={runHealthCheck}
            disabled={status === 'loading'}
            className="w-full py-3 px-6 rounded-lg font-semibold text-white transition-colors disabled:opacity-50"
            style={{ 
              backgroundColor: status === 'loading' ? '#6b7280' : '#56A672',
            }}
          >
            {status === 'loading' ? '⏳ Verificando...' : '🚀 Ejecutar Health Check'}
          </button>
        </div>

        {/* Result */}
        {status !== 'idle' && (
          <div 
            className={`rounded-lg p-6 shadow-sm ${
              status === 'success' ? 'bg-green-50 border-2 border-green-500' :
              status === 'error' ? 'bg-red-50 border-2 border-red-500' :
              'bg-gray-50'
            }`}
          >
            <h2 className="text-xl font-semibold mb-4">
              {status === 'success' && '✅ Resultado: ÉXITO'}
              {status === 'error' && '❌ Resultado: ERROR'}
              {status === 'loading' && '⏳ Verificando...'}
            </h2>

            {status === 'success' && healthData && (
              <div className="space-y-2">
                <p className="text-green-700 font-medium text-lg">
                  🎉 ¡Conexión exitosa con el Backend!
                </p>
                <pre className="bg-white p-4 rounded border overflow-auto text-sm">
                  {JSON.stringify(healthData, null, 2)}
                </pre>
                <p className="text-sm text-green-600 mt-4">
                  Status: <strong>{healthData.status}</strong>
                </p>
              </div>
            )}

            {status === 'error' && error && (
              <div className="space-y-2">
                <p className="text-red-700 font-medium">
                  No se pudo conectar con el backend
                </p>
                <pre className="bg-white p-4 rounded border text-red-600 overflow-auto text-sm">
                  {error}
                </pre>
                <div className="mt-4 p-4 bg-yellow-50 rounded border border-yellow-300">
                  <p className="font-medium text-yellow-800">🔧 Posibles soluciones:</p>
                  <ul className="list-disc list-inside text-sm text-yellow-700 mt-2">
                    <li>Verificar que el backend está corriendo en <code>localhost:3000</code></li>
                    <li>Ejecutar: <code>cd apps/api && pnpm dev</code></li>
                    <li>Verificar que el endpoint <code>/api/health</code> existe</li>
                    <li>Revisar CORS en el backend</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>MEKANOS S.A.S - Portal Admin v0.1.0</p>
          <p>Esta página es temporal - eliminar después de verificar</p>
        </div>
      </div>
    </div>
  );
}
