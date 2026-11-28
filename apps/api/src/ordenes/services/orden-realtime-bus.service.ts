import { Injectable, Logger, MessageEvent, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomBytes } from 'crypto';
import { fromEvent, interval, map, merge, Observable, of } from 'rxjs';

export type OrdenRealtimeSection =
  | 'orden'
  | 'actividades'
  | 'mediciones'
  | 'evidencias'
  | 'pendientes'
  | 'firmas'
  | 'progreso'
  | 'telemetria';

export interface OrdenRealtimeChangedIds {
  actividades?: number[];
  mediciones?: number[];
  evidencias?: number[];
  pendientes?: number[];
  actividadClientUuids?: string[];
  medicionClientUuids?: string[];
  evidenciaClientUuids?: string[];
  pendienteClientUuids?: string[];
}

export interface OrdenRealtimeEvent {
  type: 'delta_synced' | 'heartbeat' | 'order_updated' | 'order_finalized';
  orderId: number;
  numeroOrden?: string;
  executionSyncVersion?: number;
  sections: OrdenRealtimeSection[];
  changedIds?: OrdenRealtimeChangedIds;
  timestamp: string;
  source: 'MOBILE_DELTA' | 'MOBILE_HEARTBEAT' | 'ADMIN_ACTION' | 'FINALIZACION';
}

interface StreamTicketEntry {
  orderId: number;
  userId: number;
  expiresAt: number;
}

const STREAM_TICKET_TTL_MS = 30_000;
const SSE_KEEPALIVE_MS = 25_000;
const MAX_ACTIVE_TICKETS = 5_000;

/**
 * Bus Real-Time por Orden de Servicio (Fase 2 · Espejo Vivo).
 *
 * - Usa `EventEmitter2` in-process (canal `orden.realtime.<orderId>`) con despacho O(1).
 * - Diseñado detrás de una frontera limpia lista para intercambiar por Redis Pub/Sub
 *   si la API escala horizontalmente a múltiples instancias.
 * - Emite tickets efímeros de un solo uso (TTL 30s) para `EventSource` sin exponer JWT en URLs.
 */
@Injectable()
export class OrdenRealtimeBusService implements OnModuleDestroy {
  private readonly logger = new Logger(OrdenRealtimeBusService.name);
  private readonly tickets = new Map<string, StreamTicketEntry>();
  private readonly cleanupTimer: NodeJS.Timeout;

  constructor(private readonly eventEmitter: EventEmitter2) {
    this.cleanupTimer = setInterval(() => this.pruneExpiredTickets(), 60_000);
    if (typeof this.cleanupTimer.unref === 'function') {
      this.cleanupTimer.unref();
    }
  }

  onModuleDestroy(): void {
    clearInterval(this.cleanupTimer);
    this.tickets.clear();
  }

  private channelForOrder(orderId: number): string {
    return `orden.realtime.${orderId}`;
  }

  private pruneExpiredTickets(now = Date.now()): void {
    for (const [key, entry] of this.tickets.entries()) {
      if (entry.expiresAt <= now) {
        this.tickets.delete(key);
      }
    }
  }

  /**
   * Emite un ticket criptográfico efímero de un solo uso (30s) ligado estrictamente a `(orderId, userId)`.
   */
  issueStreamTicket(orderId: number, userId: number): { ticket: string; expiresInSeconds: number } {
    const now = Date.now();
    if (this.tickets.size >= MAX_ACTIVE_TICKETS) {
      this.pruneExpiredTickets(now);
      if (this.tickets.size >= MAX_ACTIVE_TICKETS) {
        const oldestKey = this.tickets.keys().next().value;
        if (oldestKey) this.tickets.delete(oldestKey);
      }
    }

    const ticket = randomBytes(24).toString('hex');
    this.tickets.set(ticket, {
      orderId,
      userId,
      expiresAt: now + STREAM_TICKET_TTL_MS,
    });

    return {
      ticket,
      expiresInSeconds: Math.round(STREAM_TICKET_TTL_MS / 1000),
    };
  }

  /**
   * Consume y valida un ticket de stream. Garantiza un solo uso y vinculación exacta a `orderId`.
   */
  consumeStreamTicket(orderId: number, ticket: string | undefined): StreamTicketEntry | null {
    if (!ticket || typeof ticket !== 'string') return null;
    const trimmed = ticket.trim();
    if (!trimmed) return null;

    const entry = this.tickets.get(trimmed);
    if (!entry) return null;

    // Un solo uso siempre (evita replay aunque el orden no coincida)
    this.tickets.delete(trimmed);

    if (Date.now() > entry.expiresAt) return null;
    if (entry.orderId !== orderId) return null;
    return entry;
  }

  /**
   * Publica un evento real-time para los suscriptores SSE de una orden específica.
   */
  emitOrdenEvent(event: OrdenRealtimeEvent): void {
    const channel = this.channelForOrder(event.orderId);
    const normalized: OrdenRealtimeEvent = {
      ...event,
      sections: Array.from(new Set(event.sections)),
      timestamp: event.timestamp || new Date().toISOString(),
    };

    try {
      this.eventEmitter.emit(channel, normalized);
      this.logger.debug(
        `📡 [SSE-BUS] ${normalized.type} -> OS #${normalized.orderId} sections=[${normalized.sections.join(',')}]`,
      );
    } catch (error) {
      this.logger.warn(
        `⚠️ [SSE-BUS] Error emitiendo evento para OS #${event.orderId}: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Retorna el stream RxJS SSE (`MessageEvent`) para `@Sse(':id/stream')`:
   * 1. Evento inicial `connected` inmediato
   * 2. Eventos `delta_synced` / `heartbeat` / `order_updated` / `order_finalized` vía `EventEmitter2`
   * 3. Keepalive `ping` cada 25s para atravesar proxies corporativos sin cortes
   */
  subscribeOrden(orderId: number): Observable<MessageEvent> {
    const channel = this.channelForOrder(orderId);

    const connected$ = of<MessageEvent>({
      type: 'connected',
      data: {
        type: 'connected',
        orderId,
        timestamp: new Date().toISOString(),
      },
    });

    const events$ = fromEvent<OrdenRealtimeEvent>(this.eventEmitter as any, channel).pipe(
      map(
        (payload): MessageEvent => ({
          type: payload.type,
          id: `${payload.orderId}-${payload.executionSyncVersion ?? Date.now()}`,
          data: payload,
        }),
      ),
    );

    const keepalive$ = interval(SSE_KEEPALIVE_MS).pipe(
      map(
        (): MessageEvent => ({
          type: 'ping',
          data: {
            type: 'ping',
            orderId,
            timestamp: new Date().toISOString(),
          },
        }),
      ),
    );

    return merge(connected$, events$, keepalive$);
  }
}
