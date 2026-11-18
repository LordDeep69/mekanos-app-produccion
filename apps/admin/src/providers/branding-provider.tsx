'use client';

import {
  DEFAULT_BRANDING,
  getConfiguracionPublica,
  type ConfiguracionPublica,
} from '@/features/configuracion/api/configuracion.service';
import { hexToHslComponents } from '@/lib/formatters';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react';

export const BRANDING_QUERY_KEY = ['configuracion', 'publica'] as const;

interface BrandingContextValue {
  branding: ConfiguracionPublica;
  isLoading: boolean;
  refreshBranding: (nextBranding?: Partial<ConfiguracionPublica>) => Promise<void>;
}

const BrandingContext = createContext<BrandingContextValue>({
  branding: DEFAULT_BRANDING,
  isLoading: false,
  refreshBranding: async () => undefined,
});

function applyBrandingCssVariables(branding: ConfiguracionPublica) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  const primary = branding.color_primario || DEFAULT_BRANDING.color_primario;
  const secondary = branding.color_secundario || DEFAULT_BRANDING.color_secundario;
  const accent = branding.color_acento || DEFAULT_BRANDING.color_acento;
  const success = branding.color_exito || DEFAULT_BRANDING.color_exito;
  const warning = branding.color_alerta || DEFAULT_BRANDING.color_alerta;
  const danger = branding.color_peligro || DEFAULT_BRANDING.color_peligro;

  root.style.setProperty('--brand-primary', primary);
  root.style.setProperty('--brand-secondary', secondary);
  root.style.setProperty('--brand-accent', accent);
  root.style.setProperty('--brand-success', success);
  root.style.setProperty('--brand-warning', warning);
  root.style.setProperty('--brand-danger', danger);

  // Sincronizar variables Tailwind / shadcn
  root.style.setProperty('--primary', hexToHslComponents(primary));
  root.style.setProperty('--secondary', hexToHslComponents(accent));
  root.style.setProperty('--accent', hexToHslComponents(success));
  root.style.setProperty('--ring', hexToHslComponents(primary));
  root.style.setProperty('--sidebar-background', secondary);
  root.style.setProperty('--color-sidebar', secondary);

  // Alias reactivos para tokens de color heredados
  root.style.setProperty('--mekanos-blue', primary);
  root.style.setProperty('--mekanos-blue-light', accent);
  root.style.setProperty('--mekanos-green', success);
  root.style.setProperty('--mekanos-green-light', accent);
  root.style.setProperty('--color-mekanos-primary', primary);
  root.style.setProperty('--color-mekanos-blue', primary);
  root.style.setProperty('--color-mekanos-accent', accent);
  root.style.setProperty('--color-mekanos-blue-light', accent);
  root.style.setProperty('--color-mekanos-green', success);
  root.style.setProperty('--color-mekanos-warning', warning);
  root.style.setProperty('--color-mekanos-error', danger);
  root.style.setProperty('--color-mekanos-success', success);
}

function applyBrandingHeadMetadata(branding: ConfiguracionPublica) {
  if (typeof document === 'undefined') return;
  const nombre = branding.nombre_comercial || DEFAULT_BRANDING.nombre_comercial;
  if (
    !document.title ||
    document.title.includes('Portal Admin') ||
    document.title.includes('Mi Organización')
  ) {
    document.title = `${nombre} | Portal Admin`;
  } else {
    const parts = document.title.split('|');
    if (parts.length >= 2) {
      document.title = `${parts[0].trim()} | ${nombre}`;
    } else {
      document.title = `${nombre} | Portal Admin`;
    }
  }

  const iconUrl = branding.favicon_url || branding.isotipo_url;
  if (iconUrl) {
    let iconLink = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!iconLink) {
      iconLink = document.createElement('link');
      iconLink.rel = 'icon';
      document.head.appendChild(iconLink);
    }
    iconLink.href = iconUrl;
  }
}

export function BrandingProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: BRANDING_QUERY_KEY,
    queryFn: getConfiguracionPublica,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    placeholderData: DEFAULT_BRANDING,
  });

  const branding = useMemo(() => ({ ...DEFAULT_BRANDING, ...(data || {}) }), [data]);

  useEffect(() => {
    applyBrandingCssVariables(branding);
    applyBrandingHeadMetadata(branding);
  }, [branding]);

  const refreshBranding = useCallback(
    async (nextBranding?: Partial<ConfiguracionPublica>) => {
      if (nextBranding) {
        queryClient.setQueryData<ConfiguracionPublica>(BRANDING_QUERY_KEY, (prev) => ({
          ...DEFAULT_BRANDING,
          ...(prev || {}),
          ...nextBranding,
        }));
      }
      await queryClient.invalidateQueries({ queryKey: BRANDING_QUERY_KEY });
    },
    [queryClient],
  );

  const value = useMemo(
    () => ({ branding, isLoading, refreshBranding }),
    [branding, isLoading, refreshBranding],
  );

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export function useBranding() {
  return useContext(BrandingContext);
}
