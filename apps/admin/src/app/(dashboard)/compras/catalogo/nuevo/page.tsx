'use client';

/**
 * MEKANOS S.A.S - Portal Admin
 * Creación de Recurso en Catálogo Maestro (Abastecimiento y Catálogo)
 * 
 * Utiliza el componente maestro unificado ArticuloForm (mode="create")
 * garantizando coherencia arquitectónica y reglas inmutables de apertura en Kardex.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ChevronRight, PackagePlus } from 'lucide-react';
import { toast } from 'sonner';

import { comprasService } from '@/lib/api/compras.service';
import { ArticuloForm, ArticuloFormValues } from '@/components/compras/articulo-form';
import { Button } from '@/components/ui/button';

export default function NuevoArticuloPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (values: ArticuloFormValues) => {
    try {
      setIsSubmitting(true);
      toast.loading('Registrando recurso en catálogo maestro...', { id: 'create-item' });

      // Sanitizar payloads y tipos numéricos
      const payload: any = {
        ...values,
        id_marca: values.id_marca ? Number(values.id_marca) : undefined,
        id_categoria: values.id_categoria ? Number(values.id_categoria) : undefined,
        codigo_unidad_medida: values.codigo_unidad_medida || undefined,
        frecuencia_mantenimiento_meses: values.frecuencia_mantenimiento_meses || undefined,
        precio_compra: values.precio_compra !== null && values.precio_compra !== undefined ? Number(values.precio_compra) : undefined,
        precio_venta: values.precio_venta !== null && values.precio_venta !== undefined ? Number(values.precio_venta) : undefined,
        margen_utilidad_porcentaje: values.margen_utilidad_porcentaje !== null && values.margen_utilidad_porcentaje !== undefined
          ? Number(values.margen_utilidad_porcentaje)
          : undefined,
        stock_minimo: Number(values.stock_minimo || 0),
        stock_actual: Number(values.stock_actual || 0),
        proveedores_iniciales: values.proveedores_iniciales?.map((p) => ({
          ...p,
          id_proveedor: Number(p.id_proveedor),
          costo_actual: Number(p.costo_actual),
          tiempo_entrega_dias: Number(p.tiempo_entrega_dias || 1),
          cantidad_minima_compra: Number(p.cantidad_minima_compra || 1),
          id_marca_ofrecida: p.id_marca_ofrecida ? Number(p.id_marca_ofrecida) : undefined,
        })),
      };

      const creado = await comprasService.createArticulo(payload);

      toast.success('¡Artículo registrado con éxito!', {
        id: 'create-item',
        description: `Código asignado: ${creado.codigo_interno || creado.referencia_fabricante}`,
      });

      // Redireccionar inmediatamente a la Ficha 360° del artículo creado
      router.push(`/compras/catalogo/${creado.id_componente}`);
    } catch (error: any) {
      console.error('Error al registrar artículo:', error);
      const msg = error?.response?.data?.message || error?.message || 'Error al procesar el registro.';
      toast.error('No se pudo crear el artículo', {
        id: 'create-item',
        description: Array.isArray(msg) ? msg.join(', ') : msg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-20">
      {/* NAVEGACIÓN Y BREADCRUMB */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Link
              href="/compras/catalogo"
              className="flex items-center gap-1 hover:text-blue-600 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Catálogo Maestro
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="font-medium text-gray-800">Nuevo Recurso</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 flex items-center gap-2.5">
            <PackagePlus className="h-7 w-7 text-blue-600" />
            Alta de Recurso Maestro
          </h1>
          <p className="text-xs sm:text-sm text-gray-600">
            Registra un nuevo repuesto, insumo o activo en el catálogo con identidad técnica neutral y matriz de abastecimiento.
          </p>
        </div>

        <Button variant="outline" asChild size="sm" className="self-start sm:self-auto text-xs">
          <Link href="/compras/catalogo">Volver al Catálogo</Link>
        </Button>
      </div>

      {/* FORMULARIO UNIFICADO EN MODO CREATE */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <ArticuloForm
          mode="create"
          onSubmit={handleSubmit}
          onCancel={() => router.push('/compras/catalogo')}
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
  );
}
