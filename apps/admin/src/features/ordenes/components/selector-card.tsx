'use client';

import { cn } from '@/lib/utils';
import { Check, Loader2, Search } from 'lucide-react';
import { useState } from 'react';

interface SelectorCardProps<T> {
    items: T[];
    selectedId?: number;
    onSelect: (item: T, id: number) => void;
    getLabel: (item: T) => string;
    getSubtitle?: (item: T) => React.ReactNode;
    renderIcon?: (item: T) => React.ReactNode;
    getId: (item: T) => number;
    isLoading?: boolean;
    emptyMessage?: string;
    searchPlaceholder?: string;
}

export function SelectorCard<T>({
    items,
    selectedId,
    onSelect,
    getLabel,
    getSubtitle,
    renderIcon,
    getId,
    isLoading,
    emptyMessage,
    searchPlaceholder,
}: SelectorCardProps<T>) {
    const [busqueda, setBusqueda] = useState('');

    const itemsFiltrados = busqueda
        ? items.filter((item) =>
            getLabel(item).toLowerCase().includes(busqueda.toLowerCase())
        )
        : items;

    if (isLoading) {
        return (
            <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {searchPlaceholder && items.length > 5 && (
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder={searchPlaceholder}
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm outline-none transition-all"
                    />
                </div>
            )}

            <div className="max-h-64 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {itemsFiltrados.length === 0 ? (
                    <p className="text-center text-gray-500 py-4 border border-dashed rounded-lg bg-gray-50">
                        {emptyMessage || 'No hay elementos disponibles'}
                    </p>
                ) : (
                    itemsFiltrados.map((item) => {
                        const id = getId(item);
                        const isSelected = selectedId === id;

                        return (
                            <button
                                key={id}
                                type="button"
                                onClick={() => onSelect(item, id)}
                                className={cn(
                                    'w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all group relative overflow-hidden',
                                    isSelected
                                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100'
                                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                                )}
                            >
                                {/* Indicador de selección lateral */}
                                {isSelected && (
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600" />
                                )}

                                {renderIcon && (
                                    <div className={cn(
                                        'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-colors',
                                        isSelected ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500 group-hover:bg-blue-50 group-hover:text-blue-500'
                                    )}>
                                        {renderIcon(item)}
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className={cn(
                                        'font-bold text-sm truncate transition-colors',
                                        isSelected ? 'text-blue-700' : 'text-gray-900 group-hover:text-blue-600'
                                    )}>
                                        {getLabel(item)}
                                    </p>
                                    {getSubtitle && (
                                        <p className="text-xs text-gray-500 truncate mt-0.5">
                                            {getSubtitle(item)}
                                        </p>
                                    )}
                                </div>
                                {isSelected && (
                                    <div className="flex-shrink-0 bg-blue-600 text-white rounded-full p-1 shadow-sm">
                                        <Check className="h-3.5 w-3.5" />
                                    </div>
                                )}
                            </button>
                        );
                    })
                )}
            </div>
        </div>
    );
}
