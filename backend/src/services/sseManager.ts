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
    // Mandated 20-second :keepalive heartbeat to prevent proxy timeout
    this.keepaliveTimer = setInterval(() => {
      this.clients.forEach((client) => {
        try {
          client.res.write(':keepalive\n\n');
        } catch (err) {
          this.removeClient(client.id);
        }
      });
    }, 20000);
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

    const payload = `id: ${eventId}\nevent: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

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
    if (channel === `sse:dispatch:${client.countryCode}`) return true;
    if (channel === `sse:leads:${client.countryCode}`) return true;
    if (channel === `sse:driver:${client.userId}`) return true;
    if (channel === `sse:user:${client.userId}`) return true;
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
