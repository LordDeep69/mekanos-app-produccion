'use client';

import { PlantillasCotizacionManager } from '@/components/comercial/plantillas-cotizacion-manager';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Layers, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Suspense, useState } from 'react';

function PlantillasCotizacionPageContent() {
  const router = useRouter();
  const [inStudio, setInStudio] = useState(false);

  const handleVolverCotizaciones = () => {
    if (
      typeof window !== 'undefined' &&
      window.history.length > 1 &&
      document.referrer.includes('/comercial/cotizaciones') &&
      !document.referrer.includes('/comercial/cotizaciones/plantillas')
    ) {
      router.back();
    } else {
      router.push('/comercial/cotizaciones');
    }
  };

  return (
    <div className="space-y-6">
      {!inStudio && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" size="sm" onClick={handleVolverCotizaciones}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Cotizaciones
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Layers className="h-6 w-6 text-primary" />
                Hub de Plantillas Comerciales (CPQ)
              </h1>
              <p className="text-sm text-slate-500">
                Estándares reutilizables con auto-escalado por equipos gemelos, simulador financiero
                y precios vivos de catálogo.
              </p>
            </div>
          </div>
        </div>
      )}

      <PlantillasCotizacionManager
        onStudioModeChange={setInStudio}
        onSelectForNewQuote={(pl) =>
          router.push(`/comercial/cotizaciones/nueva?plantilla=${pl.id_plantilla}`)
        }
      />
    </div>
  );
}

export default function PlantillasCotizacionPage() {
  return (
    <Suspense
      fallback={
        <div className="py-24 flex justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      }
    >
      <PlantillasCotizacionPageContent />
    </Suspense>
  );
}
