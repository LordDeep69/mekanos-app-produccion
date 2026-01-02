/**
 * MEKANOS S.A.S - Portal Admin
 * RefreshButton - Botón de actualización manual del dashboard
 */

'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RefreshCw } from 'lucide-react';

interface RefreshButtonProps {
  onRefresh: () => void;
  isRefreshing: boolean;
  className?: string;
}

export function RefreshButton({
  onRefresh,
  isRefreshing,
  className,
}: RefreshButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onRefresh}
      disabled={isRefreshing}
      className={cn('gap-2', className)}
    >
      <RefreshCw
        className={cn('h-4 w-4', isRefreshing && 'animate-spin')}
      />
      {isRefreshing ? 'Actualizando...' : 'Actualizar'}
    </Button>
  );
}
