import { Response } from 'express';
import { logger } from '../utils/logger.js';

interface SSEClient {
  id: string;
  res: Response;
  countryCode: string;
  userId: string;
  role: string;
}

interface SSEEventMessage {
  id: string;
  channel: string;
  event: string;
  data: any;
  timestamp: number;
}

class SSEManager {
  private clients: Map<string, SSEClient> = new Map();
  private ringBuffer: SSEEventMessage[] = [];
  private readonly maxBufferSize = 200;
  private keepaliveTimer: NodeJS.Timeout | null = null;
  private eventCounter = 0;

  constructor() {
    this.startKeepalive();
  }

  private startKeepalive() {
    if (this.keepaliveTimer) clearInterval(this.keepaliveTimer);
    // Mandated 15-second heartbeat (:keepalive comment + named ping event) to prevent proxy timeout
    this.keepaliveTimer = setInterval(() => {
      const now = Date.now();
      this.clients.forEach((client) => {
        try {
          client.res.write(':keepalive\n\n');
          client.res.write(`event: ping\ndata: {"time":${now}}\n\n`);
        } catch (err) {
          this.removeClient(client.id);
        }
      });
    }, 15000);
  }

  public addClient(res: Response, countryCode: string, userId: string, role: string, lastEventId?: string): string {
    const clientId = `sse_${userId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const client: SSEClient = { id: clientId, res, countryCode, userId, role };
    this.clients.set(clientId, client);

    logger.info(`[SSE] Client connected: ${clientId} (${role}, ${countryCode}). Active count: ${this.clients.size}`);

    // Replay missed events if client reconnected with Last-Event-ID
    if (lastEventId) {
      this.replayMissedEvents(client, lastEventId);
    }

    return clientId;
  }

  public removeClient(clientId: string): void {
    if (this.clients.has(clientId)) {
      this.clients.delete(clientId);
      logger.info(`[SSE] Client disconnected: ${clientId}. Active count: ${this.clients.size}`);
    }
  }

  public broadcast(channel: string, event: string, data: any): void {
    const eventId = `evt_${Date.now()}_${++this.eventCounter}`;
    const message: SSEEventMessage = {
      id: eventId,
      channel,
      event,
      data,
      timestamp: Date.now(),
    };

    // Store in ring buffer for Last-Event-ID resumption
    this.ringBuffer.push(message);
    if (this.ringBuffer.length > this.maxBufferSize) {
      this.ringBuffer.shift();
    }

    let sanitizedData = data;
    if (channel.startsWith('sse:driver:') && data && typeof data === 'object') {
      const { itPlatformFeeCents, grossProfitCents, internalNotes, ...safeData } = data;
      sanitizedData = safeData;
    }

    const payload = `id: ${eventId}\nevent: ${event}\ndata: ${JSON.stringify(sanitizedData)}\n\n`;

    this.clients.forEach((client) => {
      if (this.clientMatchesChannel(client, channel)) {
        try {
          client.res.write(payload);
        } catch (err) {
          this.removeClient(client.id);
        }
      }
    });
  }

  private clientMatchesChannel(client: SSEClient, channel: string): boolean {
    if (channel === 'global') return true;
    if (channel === `sse:driver:${client.userId}`) return true;
    if (channel === `sse:user:${client.userId}`) return true;

    // Administrative dispatch and jobs channels
    const isGlobalOpsRole = ['ADMIN', 'GENERAL_MANAGER', 'DEVELOPER'].includes(client.role);
    if (isGlobalOpsRole && (channel.startsWith('sse:dispatch:') || channel.startsWith('sse:jobs:'))) {
      return true;
    }

    const isRegionalOpsRole = ['DISPATCHER', 'ACCOUNTANT', 'CALL_AGENT'].includes(client.role);
    if (isRegionalOpsRole && (channel === `sse:dispatch:${client.countryCode}` || channel === `sse:jobs:${client.countryCode}` || client.countryCode === 'ALL')) {
      return true;
    }

    // Outbound leads pipeline restricted to sales and admin roles
    const isLeadRole = ['ADMIN', 'GENERAL_MANAGER', 'CALL_AGENT', 'VIRTUAL_ASSISTANT', 'DISPATCHER', 'DEVELOPER'].includes(client.role);
    if (isLeadRole && channel === `sse:leads:${client.countryCode}`) {
      return true;
    }

    return false;
  }

  private replayMissedEvents(client: SSEClient, lastEventId: string): void {
    const lastIndex = this.ringBuffer.findIndex((m) => m.id === lastEventId);
    if (lastIndex === -1) return;

    const missed = this.ringBuffer.slice(lastIndex + 1);
    missed.forEach((m) => {
      if (this.clientMatchesChannel(client, m.channel)) {
        try {
          client.res.write(`id: ${m.id}\nevent: ${m.event}\ndata: ${JSON.stringify(m.data)}\n\n`);
        } catch {
          this.removeClient(client.id);
        }
      }
    });
  }

  public getActiveCount(): number {
    return this.clients.size;
  }
}

export const sseManager = new SSEManager();
