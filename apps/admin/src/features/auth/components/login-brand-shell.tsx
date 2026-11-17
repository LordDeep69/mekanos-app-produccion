'use client';

import { useBranding } from '@/providers/branding-provider';
import { type ReactNode } from 'react';

export function LoginBrandShell({ children }: { children: ReactNode }) {
  const { branding } = useBranding();

  const logoSrc =
    branding.logo_claro_url || branding.logo_principal_url || branding.isotipo_url;
  const initials = (branding.nombre_comercial || 'EO')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 transition-colors duration-300"
      style={{
        background: `linear-gradient(135deg, ${branding.color_secundario} 0%, ${branding.color_primario} 60%, ${branding.color_acento} 100%)`,
      }}
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl shadow-xl mb-4 p-2 overflow-hidden">
            {logoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoSrc}
                alt={branding.nombre_comercial}
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <span
                className="text-2xl font-extrabold tracking-tight"
                style={{ color: branding.color_primario }}
              >
                {initials || 'EA'}
              </span>
            )}
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            {branding.nombre_comercial}
          </h1>
          <p className="text-white/80 mt-1.5 text-sm">
            {branding.eslogan || 'Portal de Administración Operativa'}
          </p>
        </div>

        {children}

        <p className="text-center text-white/65 text-xs mt-6">
          © {new Date().getFullYear()} {branding.nombre_comercial}. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
}
