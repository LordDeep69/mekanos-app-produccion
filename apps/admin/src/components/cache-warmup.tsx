/**
 * MEKANOS S.A.S - Portal Admin
 * Cache Warmup Component
 * 
 * Componente invisible que precarga catálogos estáticos al entrar al dashboard.
 * Esto garantiza navegación instantánea entre vistas.
 * 
 * ENTERPRISE: Ejecuta warmup una sola vez por sesión de navegación.
 */

'use client';

import { useCacheWarmup } from '@/hooks';

export function CacheWarmup() {
    // Hook que precarga catálogos en background
    useCacheWarmup();

    // Componente invisible - solo ejecuta el warmup
    return null;
}
