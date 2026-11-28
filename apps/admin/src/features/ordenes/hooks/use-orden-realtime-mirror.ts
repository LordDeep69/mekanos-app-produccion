'use client';

/**
 * MEKANOS S.A.S - Portal Admin
 * Hook: useOrdenRealtimeMirror (FASE 2 · Espejo Vivo SSE)
 *
 * Conecta al canal Server-Sent Events `GET /api/ordenes/:id/stream?ticket=...`
 * obteniendo un ticket efímero de un solo uso vía `POST /api/ordenes/:id/stream-ticket`.
 *
 * Blindajes de ingeniería:
 * 1. Anti-agotamiento HTTP/1.1 (6 sockets/origen): cierra el `EventSource`
 *    automáticamente cuando `document.visibilityState === 'hidden'` y reconecta +
 *    sincroniza catch-up cuando la pestaña vuelve a ser visible.
 * 2. Invalidación selectiva: solo invalida las QueryKeys de las secciones realmente
 *    impactadas en cada evento `delta_synced` (`actividades`, `mediciones`, `evidencias`,
 *    `pendientes`, `firmas`, `orden`, `progreso`).
 * 3. Pulso esmeralda vivo: expone `isPulsing(key)` con TTL automático de 2.8s para
 *    resaltar en tiempo real las tarjetas recién llegadas desde campo.
 * 4. Fallback automático: si un proxy corporativo bloquea SSE (3 fallos seguidos),
 *    conmuta a polling inteligente cada 15s comparando `execution_sync_version` y
 *    reintenta reconectar SSE periódicamente.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { getProgresoRegistro, requestOrdenStreamTicket } from '../api/ordenes.service';

export type MirrorConnectionStatus =
  | 'CONNECTING'
  | 'CONNECTED'
  | 'PAUSED_HIDDEN'
  | 'FALLBACK_POLLING'
  | 'DISABLED';

export interface OrdenRealtimePayload {
  type: 'connected' | 'ping' | 'delta_synced' | 'heartbeat' | 'order_updated' | 'order_finalized';
  orderId: number;
  numeroOrden?: string;
  executionSyncVersion?: number;
  sections?: string[];
  changedIds?: {
    actividades?: number[];
    mediciones?: number[];
    evidencias?: number[];
    pendientes?: number[];
    actividadClientUuids?: string[];
    medicionClientUuids?: string[];
    evidenciaClientUuids?: string[];
    pendienteClientUuids?: string[];
  };
  timestamp?: string;
  source?: string;
}

export interface OrdenRealtimeMirrorState {
  connectionStatus: MirrorConnectionStatus;
  lastEventAt: string | null;
  lastEventType: string | null;
  lastSections: string[];
  eventsReceived: number;
  isPulsing: (key: string) => boolean;
  isSectionPulsing: (section: string) => boolean;
  reconnect: () => void;
}

const PULSE_TTL_MS = 2800;
const FALLBACK_POLL_MS = 15000;
const SSE_RETRY_FROM_FALLBACK_MS = 60000;
const MAX_CONSECUTIVE_SSE_ERRORS = 3;

export function useOrdenRealtimeMirror(
  idOrden: number | undefined,
  options?: { enabled?: boolean },
): OrdenRealtimeMirrorState {
  const enabled = Boolean(idOrden && idOrden > 0 && (options?.enabled ?? true));
  const queryClient = useQueryClient();

  const [connectionStatus, setConnectionStatus] = useState<MirrorConnectionStatus>(
    enabled ? 'CONNECTING' : 'DISABLED',
  );
  const [lastEventAt, setLastEventAt] = useState<string | null>(null);
  const [lastEventType, setLastEventType] = useState<string | null>(null);
  const [lastSections, setLastSections] = useState<string[]>([]);
  const [eventsReceived, setEventsReceived] = useState<number>(0);
  const [pulseKeys, setPulseKeys] = useState<Set<string>>(() => new Set());
  const [reconnectNonce, setReconnectNonce] = useState<number>(0);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fallbackUpgradeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pulseTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const consecutiveErrorsRef = useRef<number>(0);
  const lastSeenSyncVersionRef = useRef<number | null>(null);
  const lastSeenActivityRef = useRef<string | null>(null);

  const triggerPulseKeys = useCallback((keys: string[]) => {
    if (keys.length === 0) return;
    setPulseKeys((prev) => {
      const next = new Set(prev);
      for (const k of keys) next.add(k);
      return next;
    });
    for (const k of keys) {
      const existing = pulseTimersRef.current.get(k);
      if (existing) clearTimeout(existing);
      const timer = setTimeout(() => {
        pulseTimersRef.current.delete(k);
        setPulseKeys((prev) => {
          if (!prev.has(k)) return prev;
          const next = new Set(prev);
          next.delete(k);
          return next;
        });
      }, PULSE_TTL_MS);
      pulseTimersRef.current.set(k, timer);
    }
  }, []);

  const invalidateBySections = useCallback(
    (orderId: number, sections: string[], eventType?: string) => {
      const secSet = new Set(sections);

      // Telemetría / progreso siempre se refresca en cualquier evento real
      queryClient.invalidateQueries({ queryKey: ['ordenes', 'progreso-registro', orderId] });

      if (secSet.has('actividades')) {
        queryClient.invalidateQueries({ queryKey: ['ordenes', 'actividades', orderId] });
      }
      if (secSet.has('mediciones')) {
        queryClient.invalidateQueries({ queryKey: ['ordenes', 'mediciones', orderId] });
      }
      if (secSet.has('evidencias')) {
        queryClient.invalidateQueries({ queryKey: ['ordenes', 'evidencias', orderId] });
        queryClient.invalidateQueries({ queryKey: ['evidencias-actividad', orderId] });
      }
      if (secSet.has('firmas')) {
        queryClient.invalidateQueries({ queryKey: ['ordenes', 'firmas', orderId] });
      }
      if (
        secSet.has('pendientes') ||
        secSet.has('orden') ||
        secSet.has('firmas') ||
        eventType === 'order_finalized'
      ) {
        // Invalidar tanto key numérica como string (params.id en Next.js)
        queryClient.invalidateQueries({ queryKey: ['ordenes', orderId] });
        queryClient.invalidateQueries({ queryKey: ['ordenes', String(orderId)] });
        queryClient.invalidateQueries({ queryKey: ['orden-historial', orderId] });
      }
    },
    [queryClient],
  );

  const handleRealtimeEvent = useCallback(
    (payload: OrdenRealtimePayload) => {
      if (!idOrden) return;
      if (payload.type === 'ping' || payload.type === 'connected') return;

      const sections = Array.isArray(payload.sections) ? payload.sections : ['progreso'];
      if (typeof payload.executionSyncVersion === 'number') {
        lastSeenSyncVersionRef.current = payload.executionSyncVersion;
      }

      setLastEventAt(payload.timestamp || new Date().toISOString());
      setLastEventType(payload.type);
      setLastSections(sections);
      setEventsReceived((c) => c + 1);

      // Marcar pulso esmeralda en los ítems y secciones recién llegadas
      const keysToPulse: string[] = sections.map((s) => `section:${s}`);
      const ids = payload.changedIds;
      if (ids) {
        for (const id of ids.actividades || []) keysToPulse.push(`act:${id}`);
        for (const uuid of ids.actividadClientUuids || []) keysToPulse.push(`act-uuid:${uuid}`);
        for (const id of ids.mediciones || []) keysToPulse.push(`med:${id}`);
        for (const id of ids.evidencias || []) keysToPulse.push(`ev:${id}`);
        for (const id of ids.pendientes || []) keysToPulse.push(`pend:${id}`);
        for (const uuid of ids.pendienteClientUuids || []) keysToPulse.push(`pend-uuid:${uuid}`);
      }
      if (payload.type !== 'heartbeat') {
        triggerPulseKeys(keysToPulse);
      }

      invalidateBySections(idOrden, sections, payload.type);
    },
    [idOrden, invalidateBySections, triggerPulseKeys],
  );

  const reconnect = useCallback(() => {
    consecutiveErrorsRef.current = 0;
    setReconnectNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    const pulseTimers = pulseTimersRef.current;

    const clearAllTimersAndSockets = () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current);
        fallbackIntervalRef.current = null;
      }
      if (fallbackUpgradeTimerRef.current) {
        clearTimeout(fallbackUpgradeTimerRef.current);
        fallbackUpgradeTimerRef.current = null;
      }
    };

    if (!enabled || !idOrden || typeof window === 'undefined') {
      clearAllTimersAndSockets();
      return;
    }

    let cancelled = false;

    const startFallbackPolling = () => {
      clearAllTimersAndSockets();
      if (cancelled || document.visibilityState === 'hidden') return;
      setConnectionStatus('FALLBACK_POLLING');

      const pollOnce = async () => {
        if (cancelled || document.visibilityState === 'hidden') return;
        try {
          const prog = await getProgresoRegistro(idOrden);
          const syncVer = prog.execution_sync_version ?? null;
          const lastAct = prog.ultima_actividad ?? null;
          const changed =
            (syncVer !== null &&
              lastSeenSyncVersionRef.current !== null &&
              syncVer !== lastSeenSyncVersionRef.current) ||
            (lastAct !== null &&
              lastSeenActivityRef.current !== null &&
              lastAct !== lastSeenActivityRef.current);

          lastSeenSyncVersionRef.current = syncVer;
          lastSeenActivityRef.current = lastAct;

          queryClient.setQueryData(['ordenes', 'progreso-registro', idOrden], prog);
          if (changed) {
            setLastEventAt(new Date().toISOString());
            setLastEventType('delta_synced');
            setEventsReceived((c) => c + 1);
            invalidateBySections(idOrden, [
              'actividades',
              'mediciones',
              'evidencias',
              'pendientes',
              'firmas',
              'orden',
            ]);
          }
        } catch {
          // Silencioso en polling de respaldo
        }
      };

      fallbackIntervalRef.current = setInterval(() => {
        void pollOnce();
      }, FALLBACK_POLL_MS);

      // Reintentar upgrade a SSE tras 60s
      fallbackUpgradeTimerRef.current = setTimeout(() => {
        if (!cancelled && document.visibilityState === 'visible') {
          consecutiveErrorsRef.current = 0;
          void connectSse();
        }
      }, SSE_RETRY_FROM_FALLBACK_MS);
    };

    const isDocHidden = () => document.visibilityState === 'hidden';

    const connectSse = async () => {
      clearAllTimersAndSockets();
      if (cancelled) return;

      // 🛡️ BLINDAJE HTTP/1.1: jamás mantener sockets SSE abiertos en pestañas ocultas
      if (isDocHidden()) {
        setConnectionStatus('PAUSED_HIDDEN');
        return;
      }

      if (typeof EventSource === 'undefined') {
        startFallbackPolling();
        return;
      }

      setConnectionStatus('CONNECTING');

      try {
        const ticketRes = await requestOrdenStreamTicket(idOrden);
        if (cancelled || isDocHidden()) {
          if (isDocHidden()) setConnectionStatus('PAUSED_HIDDEN');
          return;
        }

        const baseUrl = (
          apiClient.defaults.baseURL ||
          process.env.NEXT_PUBLIC_API_URL ||
          'http://localhost:3000/api'
        ).replace(/\/$/, '');
        const streamUrl = `${baseUrl}/ordenes/${idOrden}/stream?ticket=${encodeURIComponent(ticketRes.ticket)}`;

        const es = new EventSource(streamUrl);
        eventSourceRef.current = es;

        const parseAndHandle = (rawEvent: MessageEvent) => {
          try {
            const data = JSON.parse(rawEvent.data) as OrdenRealtimePayload;
            handleRealtimeEvent(data);
          } catch {
            // Ignorar frames malformados
          }
        };

        es.addEventListener('connected', () => {
          if (cancelled) return;
          consecutiveErrorsRef.current = 0;
          setConnectionStatus('CONNECTED');
        });

        es.addEventListener('delta_synced', parseAndHandle);
        es.addEventListener('heartbeat', parseAndHandle);
        es.addEventListener('order_updated', parseAndHandle);
        es.addEventListener('order_finalized', parseAndHandle);
        es.onmessage = parseAndHandle;

        es.onopen = () => {
          if (cancelled) return;
          consecutiveErrorsRef.current = 0;
          setConnectionStatus('CONNECTED');
        };

        es.onerror = () => {
          if (cancelled) return;
          // Cerrar explícitamente porque el ticket es de un solo uso y se necesita uno fresco para reconectar
          es.close();
          if (eventSourceRef.current === es) {
            eventSourceRef.current = null;
          }

          if (document.visibilityState === 'hidden') {
            setConnectionStatus('PAUSED_HIDDEN');
            return;
          }

          consecutiveErrorsRef.current += 1;
          if (consecutiveErrorsRef.current >= MAX_CONSECUTIVE_SSE_ERRORS) {
            startFallbackPolling();
            return;
          }

          const backoffMs = Math.min(10000, 1500 * consecutiveErrorsRef.current);
          setConnectionStatus('CONNECTING');
          reconnectTimerRef.current = setTimeout(() => {
            if (!cancelled && document.visibilityState === 'visible') {
              void connectSse();
            }
          }, backoffMs);
        };
      } catch {
        if (cancelled) return;
        consecutiveErrorsRef.current += 1;
        if (consecutiveErrorsRef.current >= MAX_CONSECUTIVE_SSE_ERRORS) {
          startFallbackPolling();
        } else {
          reconnectTimerRef.current = setTimeout(() => {
            if (!cancelled && document.visibilityState === 'visible') {
              void connectSse();
            }
          }, 2500);
        }
      }
    };

    const handleVisibilityChange = () => {
      if (cancelled) return;
      if (document.visibilityState === 'hidden') {
        clearAllTimersAndSockets();
        setConnectionStatus('PAUSED_HIDDEN');
      } else {
        // Al volver visible: reconectar stream fresco + catch-up selectivo
        consecutiveErrorsRef.current = 0;
        invalidateBySections(idOrden, [
          'progreso',
          'actividades',
          'mediciones',
          'evidencias',
          'pendientes',
        ]);
        void connectSse();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    void connectSse();

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearAllTimersAndSockets();
      for (const t of pulseTimers.values()) {
        clearTimeout(t);
      }
      pulseTimers.clear();
    };
  }, [enabled, idOrden, reconnectNonce, handleRealtimeEvent, invalidateBySections, queryClient]);

  const isPulsing = useCallback((key: string) => pulseKeys.has(key), [pulseKeys]);
  const isSectionPulsing = useCallback(
    (section: string) => pulseKeys.has(`section:${section}`),
    [pulseKeys],
  );

  return {
    connectionStatus: enabled ? connectionStatus : 'DISABLED',
    lastEventAt,
    lastEventType,
    lastSections,
    eventsReceived,
    isPulsing,
    isSectionPulsing,
    reconnect,
  };
}
