'use client';

import {
  formatCurrencyWithConfig,
  formatDateWithConfig,
  formatNumberWithConfig,
} from '@/lib/formatters';
import { useBranding } from '@/providers/branding-provider';
import { useCallback } from 'react';

export function useOrgFormatters() {
  const { branding } = useBranding();

  const formatCurrency = useCallback(
    (value: number | string | null | undefined) => formatCurrencyWithConfig(value, branding),
    [branding],
  );

  const formatNumber = useCallback(
    (value: number | string | null | undefined, fractionDigits?: number) =>
      formatNumberWithConfig(value, branding, fractionDigits),
    [branding],
  );

  const formatDate = useCallback(
    (
      dateInput: Date | string | null | undefined,
      options?: Intl.DateTimeFormatOptions,
    ) => formatDateWithConfig(dateInput, branding, options),
    [branding],
  );

  const formatDateTime = useCallback(
    (dateInput: Date | string | null | undefined) =>
      formatDateWithConfig(dateInput, branding, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    [branding],
  );

  return {
    branding,
    locale: branding.locale,
    timezone: branding.zona_horaria,
    currencyCode: branding.codigo_moneda,
    currencySymbol: branding.simbolo_moneda,
    taxLabel: branding.etiqueta_impuesto,
    taxRate: branding.tasa_impuesto_defecto,
    formatCurrency,
    formatNumber,
    formatDate,
    formatDateTime,
  };
}
