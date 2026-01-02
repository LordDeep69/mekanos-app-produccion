/**
 * MEKANOS S.A.S - Portal Admin
 * Página de Login
 * 
 * Diseño centrado con branding MEKANOS
 * Componentes: Card, Input, Button, Form de shadcn/ui
 * 
 * ZERO TRUST: Suspense boundary requerido para useSearchParams en Next.js 16
 */

import { LoginForm } from '@/features/auth/components/login-form';
import { Suspense } from 'react';

function LoginFormFallback() {
  return (
    <div className="bg-white rounded-lg shadow-xl p-6 animate-pulse">
      <div className="h-8 bg-gray-200 rounded mb-4"></div>
      <div className="h-4 bg-gray-200 rounded mb-6 w-3/4"></div>
      <div className="space-y-4">
        <div className="h-10 bg-gray-200 rounded"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-mekanos-primary to-mekanos-accent p-4">
      <div className="w-full max-w-md">
        {/* Logo y Título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full shadow-lg mb-4">
            <span className="text-3xl font-bold text-mekanos-primary">M</span>
          </div>
          <h1 className="text-3xl font-bold text-white">MEKANOS S.A.S</h1>
          <p className="text-mekanos-white/80 mt-2">Portal de Administración</p>
        </div>

        {/* Formulario de Login - Suspense para useSearchParams */}
        <Suspense fallback={<LoginFormFallback />}>
          <LoginForm />
        </Suspense>

        {/* Footer */}
        <p className="text-center text-mekanos-white/60 text-sm mt-6">
          © 2025 MEKANOS S.A.S. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
}
