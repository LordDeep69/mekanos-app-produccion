'use client';

import { CotizacionStudio } from '@/components/comercial/cotizacion-studio';
import { useParams } from 'next/navigation';

export default function CotizacionDetalleStudioPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id && /^\d+$/.test(params.id) ? Number(params.id) : undefined;

  return <CotizacionStudio cotizacionId={id} />;
}
