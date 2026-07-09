import { Injectable, inject, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from './api.config';
import { AuthService } from './auth.service';

// Real-time events pushed from the backend (Socket.IO).
export interface EmailSentEvent {
  to: string;
  name: string;
  subject: string;
  status: string;
  campaign: string;
  campaignId: string | null;
  at: string;
}

export interface SendProgressEvent {
  batchId: string;
  sent: number;
  failed: number;
  total: number;
  status: 'running' | 'paused' | 'complete' | 'cancelled';
  campaign: string;
  lastTo?: string;
}

// Socket server lives at the API host root (strip the trailing /api).
const SOCKET_URL = API_BASE_URL.replace(/\/api\/?$/, '');

@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private auth = inject(AuthService);
  private socket: Socket | null = null;

  readonly connected = signal(false);
  readonly emailSent = new Subject<EmailSentEvent>();
  readonly sendProgress = new Subject<SendProgressEvent>();
  readonly sendComplete = new Subject<SendProgressEvent>();

  connect() {
    const token = this.auth.token();
    if (!token || this.socket) return;

    this.socket = io(SOCKET_URL, {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
    });

    this.socket.on('connect', () => this.connected.set(true));
    this.socket.on('disconnect', () => this.connected.set(false));
    this.socket.on('connect_error', () => this.connected.set(false));

    // Server events
    this.socket.on('email:sent', (e: EmailSentEvent) => this.emailSent.next(e));
    this.socket.on('send:progress', (e: SendProgressEvent) => this.sendProgress.next(e));
    this.socket.on('send:complete', (e: SendProgressEvent) => this.sendComplete.next(e));
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
    this.connected.set(false);
  }
}
