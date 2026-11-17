import type { ConfiguracionPublica } from '@/features/configuracion/api/configuracion.service';

export function hexToHslComponents(hex: string): string {
  const clean = (hex || '#1E40AF').replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) {
    return '217 70% 40%';
  }
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return `0 0% ${Math.round(l * 100)}%`;
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h /= 6;

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function formatCurrencyWithConfig(
  value: number | string | null | undefined,
  config: Pick<
    ConfiguracionPublica,
    'locale' | 'codigo_moneda' | 'simbolo_moneda' | 'decimales_moneda'
  >,
): string {
  const num = Number(value);
  const safe = Number.isFinite(num) ? num : 0;
  const decimals = Number.isFinite(Number(config.decimales_moneda))
    ? Number(config.decimales_moneda)
    : 2;

  try {
    return new Intl.NumberFormat(config.locale || 'es-CO', {
      style: 'currency',
      currency: config.codigo_moneda || 'USD',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(safe);
  } catch {
    const formatted = safe.toFixed(decimals);
    return `${config.simbolo_moneda || '$'} ${formatted}`;
  }
}

export function formatNumberWithConfig(
  value: number | string | null | undefined,
  config: Pick<ConfiguracionPublica, 'locale' | 'decimales_moneda'>,
  fractionDigits?: number,
): string {
  const num = Number(value);
  const safe = Number.isFinite(num) ? num : 0;
  const digits =
    typeof fractionDigits === 'number'
      ? fractionDigits
      : Number.isFinite(Number(config.decimales_moneda))
        ? Number(config.decimales_moneda)
        : 0;
  try {
    return new Intl.NumberFormat(config.locale || 'es-CO', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(safe);
  } catch {
    return safe.toFixed(digits);
  }
}

export function formatDateWithConfig(
  dateInput: Date | string | null | undefined,
  config: Pick<ConfiguracionPublica, 'locale' | 'zona_horaria'>,
  options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' },
): string {
  if (!dateInput) return 'Sin fecha';

  if (typeof dateInput === 'string') {
    const dateOnlyMatch = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnlyMatch) {
      const [, y, m, d] = dateOnlyMatch;
      const dt = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d), 12, 0, 0));
      try {
        return new Intl.DateTimeFormat(config.locale || 'es-CO', {
          ...options,
          timeZone: 'UTC',
        }).format(dt);
      } catch {
        return dateInput;
      }
    }
  }

  const parsed = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(parsed.getTime())) return 'Fecha inválida';

  try {
    return new Intl.DateTimeFormat(config.locale || 'es-CO', {
      timeZone: config.zona_horaria || 'UTC',
      ...options,
    }).format(parsed);
  } catch {
    return parsed.toISOString().slice(0, 10);
  }
}
