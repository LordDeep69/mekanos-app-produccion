'use client';

import { CotizacionStudio } from '@/components/comercial/cotizacion-studio';
import { Loader2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function NuevaCotizacionContent() {
  const searchParams = useSearchParams();
  const tplParam = searchParams.get('plantilla');
  const initialPlantillaId = tplParam && /^\d+$/.test(tplParam) ? Number(tplParam) : undefined;

  return <CotizacionStudio initialPlantillaId={initialPlantillaId} />;
}

export default function NuevaCotizacionPage() {
  return (
    <Suspense
      fallback={
        <div className="py-24 flex justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      }
    >
      <NuevaCotizacionContent />
    </Suspense>
  );
}
