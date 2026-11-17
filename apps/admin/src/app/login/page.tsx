/**
 * Página de Login White-Label - Portal Admin
 * ZERO TRUST: Suspense boundary requerido para useSearchParams en Next.js 16
 */

import { LoginBrandShell } from '@/features/auth/components/login-brand-shell';
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
    <LoginBrandShell>
      <Suspense fallback={<LoginFormFallback />}>
        <LoginForm />
      </Suspense>
    </LoginBrandShell>
  );
}
