'use client';

/**
 * MEKANOS S.A.S - Portal Admin
 * Componente Reutilizable Combobox con Creación In-Context (Radix Dialog)
 * 
 * Permite búsqueda remota con debounce de marcas y creación al vuelo
 * sin recargar ni desmontar el árbol del formulario padre.
 */

import React, { useState, useEffect, useRef, useTransition } from 'react';
import { Check, ChevronsUpDown, Loader2, Plus, Search, Sparkles, X, Globe, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

import { comprasService } from '@/lib/api/compras.service';
import { CreateMarcaPayload, Marca } from '@/types/compras.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export interface ComboboxWithCreateProps {
  value?: number | null;
  onChange: (value: number | null, marca?: Marca | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function ComboboxWithCreate({
  value,
  onChange,
  placeholder = 'Buscar o seleccionar marca...',
  disabled = false,
  className,
  id,
}: ComboboxWithCreateProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Marca[]>([]);
  const [selectedMarca, setSelectedMarca] = useState<Marca | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Estado del mini-modal in-context
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalForm, setModalForm] = useState<CreateMarcaPayload>({
    nombre: '',
    pais_origen: '',
    es_fabricante_oem: false,
    sitio_web: '',
  });
  const [isCreating, setIsCreating] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cargar marca inicial si hay `value`
  useEffect(() => {
    let isMounted = true;
    if (value && (!selectedMarca || selectedMarca.id_marca !== value)) {
      comprasService.getMarcas().then((marcas) => {
        if (!isMounted) return;
        const encontrada = marcas.find((m) => m.id_marca === value);
        if (encontrada) {
          setSelectedMarca(encontrada);
        } else {
          // Si no está en el listado inicial, consultar por q si es posible
          setSelectedMarca({
            id_marca: value,
            nombre: `Marca #${value}`,
            es_fabricante_oem: false,
            activo: true,
          });
        }
      });
    } else if (!value) {
      setSelectedMarca(null);
    }
    return () => {
      isMounted = false;
    };
  }, [value]);

  // Cierre al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Búsqueda remota con debounce (300ms)
  useEffect(() => {
    if (!isOpen) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const data = await comprasService.getMarcas(query, 20);
        setResults(data);
      } catch (error) {
        console.error('Error buscando marcas:', error);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [query, isOpen]);

  // Seleccionar una marca
  const handleSelect = (marca: Marca) => {
    setSelectedMarca(marca);
    onChange(marca.id_marca, marca);
    setIsOpen(false);
    setQuery('');
  };

  // Limpiar selección
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedMarca(null);
    onChange(null, null);
    setQuery('');
  };

  // Abrir modal in-context para crear marca
  const handleOpenCreateModal = (termToCreate?: string) => {
    const rawTerm = termToCreate || query;
    setModalForm({
      nombre: rawTerm.trim().toUpperCase(),
      pais_origen: '',
      es_fabricante_oem: false,
      sitio_web: '',
    });
    setIsOpen(false);
    setIsModalOpen(true);
  };

  // Enviar creación de marca al backend
  const handleSubmitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalForm.nombre.trim()) {
      toast.error('El nombre de la marca es obligatorio');
      return;
    }

    setIsCreating(true);
    try {
      const nuevaMarca = await comprasService.createMarca({
        ...modalForm,
        nombre: modalForm.nombre.trim().toUpperCase(),
        pais_origen: modalForm.pais_origen?.trim() || undefined,
        sitio_web: modalForm.sitio_web?.trim() || undefined,
      });

      toast.success(`Marca "${nuevaMarca.nombre}" creada y seleccionada`, {
        description: nuevaMarca.es_fabricante_oem
          ? 'Registrada como fabricante OEM original.'
          : 'Registrada en el catálogo maestro.',
      });

      // Autoseleccionar sin recargar ni desmontar el formulario padre
      setSelectedMarca(nuevaMarca);
      onChange(nuevaMarca.id_marca, nuevaMarca);
      setIsModalOpen(false);
      setQuery('');
    } catch (error: any) {
      console.error('Error creando marca in-context:', error);
      const msg = error?.response?.data?.message || error?.message || 'Error al registrar la marca';
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setIsCreating(false);
    }
  };

  const exactMatchExists = results.some(
    (m) => m.nombre.toLowerCase().trim() === query.toLowerCase().trim()
  );

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      {/* Botón / Selector Principal */}
      <div
        id={id}
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-expanded={isOpen}
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            if (!isOpen) {
              setTimeout(() => inputRef.current?.focus(), 50);
            }
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!disabled) setIsOpen(true);
          }
        }}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
          disabled ? 'cursor-not-allowed opacity-50 bg-gray-50' : 'cursor-pointer hover:border-gray-400',
          isOpen && 'border-blue-500 ring-1 ring-blue-500'
        )}
      >
        <div className="flex items-center gap-2 overflow-hidden truncate">
          {selectedMarca ? (
            <div className="flex items-center gap-2 truncate">
              <span className="font-semibold text-gray-900 truncate">
                {selectedMarca.nombre}
              </span>
              {selectedMarca.es_fabricante_oem && (
                <Badge
                  variant="outline"
                  className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] px-1.5 py-0 font-medium"
                >
                  OEM
                </Badge>
              )}
              {selectedMarca.pais_origen && (
                <span className="text-[11px] text-gray-400">
                  ({selectedMarca.pais_origen})
                </span>
              )}
            </div>
          ) : (
            <span className="text-gray-400 text-xs sm:text-sm">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {selectedMarca && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              title="Quitar marca seleccionada"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-gray-400" />
        </div>
      </div>

      {/* Popover / Dropdown con Búsqueda */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-xl animate-in fade-in-0 zoom-in-95">
          {/* Input de Búsqueda */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
              <Input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Escribe para buscar o crear..."
                className="pl-8 pr-8 h-8 text-xs bg-gray-50/50 border-gray-200 focus:bg-white"
                autoFocus
              />
              {isLoading && (
                <Loader2 className="absolute right-2.5 top-2.5 h-3.5 w-3.5 animate-spin text-blue-600" />
              )}
            </div>
          </div>

          {/* Lista de Resultados */}
          <div className="max-h-60 overflow-y-auto p-1 text-xs">
            {results.length > 0 ? (
              <div className="space-y-0.5">
                {results.map((marca) => {
                  const isSelected = selectedMarca?.id_marca === marca.id_marca;
                  return (
                    <button
                      key={marca.id_marca}
                      type="button"
                      onClick={() => handleSelect(marca)}
                      className={cn(
                        'flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs transition-colors',
                        isSelected
                          ? 'bg-blue-50 text-blue-700 font-semibold'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      )}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="truncate">{marca.nombre}</span>
                        {marca.es_fabricante_oem && (
                          <Badge
                            variant="outline"
                            className="bg-blue-50/80 text-blue-700 border-blue-200 text-[9px] px-1 py-0"
                          >
                            OEM
                          </Badge>
                        )}
                        {marca.pais_origen && (
                          <span className="text-[10px] text-gray-400">
                            • {marca.pais_origen}
                          </span>
                        )}
                      </div>
                      {isSelected && <Check className="h-3.5 w-3.5 text-blue-600" />}
                    </button>
                  );
                })}
              </div>
            ) : !isLoading && query.trim() ? (
              <div className="py-3 px-2 text-center text-gray-500">
                <p className="text-xs">No se encontró la marca "{query}"</p>
              </div>
            ) : (
              <div className="py-2 px-2 text-center text-gray-400 text-[11px]">
                {isLoading ? 'Consultando marcas...' : 'Escribe el nombre de la marca...'}
              </div>
            )}
          </div>

          {/* Opción Destacada: Crear al Vuelo */}
          {query.trim().length > 0 && !exactMatchExists && (
            <div className="p-1 border-t border-gray-100 bg-gray-50/70">
              <button
                type="button"
                onClick={() => handleOpenCreateModal(query)}
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs font-semibold text-blue-700 hover:bg-blue-100/70 transition-colors"
              >
                <Plus className="h-3.5 w-3.5 text-blue-600" />
                <span>
                  + Crear marca <strong className="underline">"{query.trim().toUpperCase()}"</strong> al vuelo
                </span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Mini-Modal Accesible (Radix Dialog) de Creación In-Context */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-gray-200 shadow-xl">
          <form onSubmit={handleSubmitCreate}>
            <DialogHeader className="border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2 text-blue-600">
                <Sparkles className="h-5 w-5" />
                <DialogTitle className="text-base font-bold text-gray-900">
                  Alta Rápida de Marca (In-Context)
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-gray-500">
                Registra la marca en el catálogo maestro sin interrumpir ni perder los datos del formulario actual.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 text-xs">
              {/* Nombre de la marca */}
              <div className="space-y-1.5">
                <Label htmlFor="marca-nombre" className="font-semibold text-gray-800">
                  Nombre de la Marca <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="marca-nombre"
                  value={modalForm.nombre}
                  onChange={(e) =>
                    setModalForm({ ...modalForm, nombre: e.target.value.toUpperCase() })
                  }
                  placeholder="Ej: MANN-FILTER, BOSCH, FLUKE, CATERPILLAR"
                  className="text-xs font-semibold uppercase bg-white"
                  required
                  autoFocus
                />
              </div>

              {/* País de origen */}
              <div className="space-y-1.5">
                <Label htmlFor="marca-pais" className="font-medium text-gray-700 flex items-center gap-1">
                  <Globe className="h-3 w-3 text-gray-400" />
                  País de Origen (Opcional)
                </Label>
                <Input
                  id="marca-pais"
                  value={modalForm.pais_origen || ''}
                  onChange={(e) =>
                    setModalForm({ ...modalForm, pais_origen: e.target.value })
                  }
                  placeholder="Ej: Alemania, Estados Unidos, Japón"
                  className="text-xs bg-white"
                />
              </div>

              {/* Sitio Web */}
              <div className="space-y-1.5">
                <Label htmlFor="marca-web" className="font-medium text-gray-700">
                  Sitio Web o Catálogo Oficial (Opcional)
                </Label>
                <Input
                  id="marca-web"
                  type="url"
                  value={modalForm.sitio_web || ''}
                  onChange={(e) =>
                    setModalForm({ ...modalForm, sitio_web: e.target.value })
                  }
                  placeholder="https://www.mann-filter.com"
                  className="text-xs bg-white font-mono"
                />
              </div>

              {/* Switch Fabricante OEM */}
              <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3 bg-gray-50/50">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="marca-oem"
                    className="font-semibold text-gray-800 cursor-pointer flex items-center gap-1.5"
                  >
                    <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                    ¿Es Fabricante de Equipo Original (OEM)?
                  </Label>
                  <p className="text-[11px] text-gray-500">
                    Marca que fabrica partes originales equipadas de fábrica en maquinaria.
                  </p>
                </div>
                <Switch
                  id="marca-oem"
                  checked={modalForm.es_fabricante_oem}
                  onCheckedChange={(checked) =>
                    setModalForm({ ...modalForm, es_fabricante_oem: checked })
                  }
                />
              </div>
            </div>

            <DialogFooter className="border-t border-gray-100 pt-3 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                disabled={isCreating}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isCreating || !modalForm.nombre.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
              >
                {isCreating ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Guardando...
                  </span>
                ) : (
                  '+ Crear y Seleccionar'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
