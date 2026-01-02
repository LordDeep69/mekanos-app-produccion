/**
 * MEKANOS S.A.S - Portal Admin
 * EmptyState - Estado vacío reutilizable
 */

'use client';

import { cn } from '@/lib/utils';
import { AlertCircle, FileX, Inbox, Search } from 'lucide-react';

type EmptyStateVariant = 'default' | 'search' | 'error' | 'noData';

const variants: Record<
  EmptyStateVariant,
  { icon: React.ReactNode; defaultTitle: string; defaultMessage: string }
> = {
  default: {
    icon: <Inbox className="h-12 w-12 text-gray-400" />,
    defaultTitle: 'No hay datos',
    defaultMessage: 'No hay información disponible en este momento.',
  },
  search: {
    icon: <Search className="h-12 w-12 text-gray-400" />,
    defaultTitle: 'Sin resultados',
    defaultMessage: 'No se encontraron resultados para tu búsqueda.',
  },
  error: {
    icon: <AlertCircle className="h-12 w-12 text-red-400" />,
    defaultTitle: 'Error',
    defaultMessage: 'Ocurrió un error al cargar los datos.',
  },
  noData: {
    icon: <FileX className="h-12 w-12 text-gray-400" />,
    defaultTitle: 'Sin actividad',
    defaultMessage: 'No hay actividad registrada.',
  },
};

interface EmptyStateProps {
  variant?: EmptyStateVariant;
  title?: string;
  message?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  variant = 'default',
  title,
  message,
  action,
  className,
}: EmptyStateProps) {
  const config = variants[variant];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
    >
      {config.icon}
      <h3 className="mt-4 text-lg font-semibold text-gray-900">
        {title || config.defaultTitle}
      </h3>
      <p className="mt-1 text-sm text-gray-500">
        {message || config.defaultMessage}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
