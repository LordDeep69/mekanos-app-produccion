'use client';

import { PlantillasCotizacionManager } from '@/components/comercial/plantillas-cotizacion-manager';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Layers } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function PlantillasCotizacionPage() {
  const router = useRouter();
  const [inStudio, setInStudio] = useState(false);

  return (
    <div className="space-y-6">
      {!inStudio && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" asChild>
              <Link href="/comercial/cotizaciones">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Cotizaciones
              </Link>
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
