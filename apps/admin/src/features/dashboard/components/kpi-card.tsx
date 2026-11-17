/**
 * MEKANOS S.A.S - Portal Admin
 * KPICard - Tarjeta de indicador clave
 *
 * Diseño: Icono izquierda, valor grande, título pequeño, badge de tendencia
 */

'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useOrgFormatters } from '@/hooks/use-org-formatters';
import { cn } from '@/lib/utils';
import type { KPIVariant } from '@/types/dashboard';
import {
    AlertTriangle,
    Bell,
    Building2,
    Calendar,
    CheckCircle2,
    ClipboardList,
    Clock,
    DollarSign,
    TrendingDown,
    TrendingUp,
    Users,
    Wrench,
    type LucideIcon,
} from 'lucide-react';

// Mapeo de nombres de iconos a componentes
const iconMap: Record<string, LucideIcon> = {
  ClipboardList,
  Users,
  Building2,
  Wrench,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  CheckCircle2,
  Clock,
  Bell,
};

// Colores por variante (usando paleta MEKANOS)
const variantStyles: Record<KPIVariant, { bg: string; text: string; icon: string }> = {
  default: {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    icon: 'text-slate-600',
  },
  success: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    icon: 'text-mekanos-success',
  },
  warning: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-700',
    icon: 'text-yellow-600',
  },
  danger: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    icon: 'text-red-600',
  },
  info: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    icon: 'text-mekanos-primary',
  },
};

interface KPICardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: string;
  variant?: KPIVariant;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  isLoading?: boolean;
}

export function KPICard({
  title,
  value,
  subtitle,
  icon,
  variant = 'default',
  trend,
  isLoading = false,
}: KPICardProps) {
  const { formatNumber } = useOrgFormatters();
  const IconComponent = iconMap[icon] || ClipboardList;
  const styles = variantStyles[variant];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4 animate-pulse">
            <div className="h-14 w-14 rounded-xl bg-slate-200" />
            <div className="flex-1 space-y-2">
              <div className="h-8 w-20 bg-slate-200 rounded" />
              <div className="h-4 w-32 bg-slate-200 rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Icono */}
            <div className={cn('p-3 rounded-xl shrink-0', styles.bg)}>
              <IconComponent className={cn('h-6 w-6', styles.icon)} />
            </div>

            {/* Contenido */}
            <div className="min-w-0">
              <p className="text-2xl sm:text-3xl font-bold tracking-tight tabular-nums leading-tight">
                {typeof value === 'number' ? formatNumber(value, 0) : value}
              </p>
              <p className="text-sm text-gray-500 mt-0.5 leading-snug">{title}</p>
              {subtitle && (
                <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>

          {/* Tendencia */}
          {trend && (
            <Badge
              variant={trend.isPositive ? 'default' : 'destructive'}
              className={cn(
                'flex items-center gap-1 shrink-0',
                trend.isPositive
                  ? 'bg-green-100 text-green-700 hover:bg-green-100'
                  : 'bg-red-100 text-red-700 hover:bg-red-100'
              )}
            >
              {trend.isPositive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {trend.value}%
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
