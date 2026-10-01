import { supabase } from './supabase';

export interface ScanProgressEventData {
  websiteId: string;
  stepId: string;
  stage: 'START' | 'PROGRESS' | 'COMPLETE' | 'ERROR';
  message: string;
  progressPercent: number;
  findingsCount?: number;
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface ScanCompleteEventData {
  websiteId: string;
  report: any;
}

export interface ScanErrorEventData {
  websiteId: string;
  error: string;
}

export interface ScanCancelledEventData {
  websiteId: string;
  message?: string;
}

export type ScanSocketMessage =
  | { type: 'CONNECTED'; user: { id: string; email: string } }
  | { type: 'SUBSCRIBED'; websiteId: string }
  | { type: 'UNSUBSCRIBED'; websiteId: string }
  | { type: 'SCAN_START'; websiteId: string; timestamp: string }
  | ({ type: 'SCAN_PROGRESS' } & ScanProgressEventData)
  | ({ type: 'SCAN_COMPLETE' } & ScanCompleteEventData)
  | ({ type: 'SCAN_ERROR' } & ScanErrorEventData)
  | ({ type: 'SCAN_CANCELLED' } & ScanCancelledEventData)
  | { type: 'ERROR'; message: string };

class ScannerSocketManager {
  private socket: WebSocket | null = null;
  private listeners: Set<(msg: ScanSocketMessage) => void> = new Set();
  private isConnecting: boolean = false;
  private reconnectTimeout: any = null;

  private getWsUrl(): string {
    const baseUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:5000/ws';
    return baseUrl;
  }

  public async connect(): Promise<WebSocket> {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      return this.socket;
    }

    if (this.isConnecting) {
      return new Promise((resolve) => {
        const check = setInterval(() => {
          if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            clearInterval(check);
            resolve(this.socket);
          }
        }, 100);
      });
    }

    this.isConnecting = true;

    // 1. Fetch token from backend ws-token endpoint (reads HttpOnly auth_token cookie)
    let token = '';
    try {
      const res = await fetch('/api/auth/ws-token');
      if (res.ok) {
        const json = await res.json();
        token = json.data?.token || '';
      }
    } catch (e) {
      console.warn('Could not retrieve token from /api/auth/ws-token:', e);
    }

    // 2. Fallback to Supabase browser session if present
    if (!token) {
      try {
        const { data } = await supabase.auth.getSession();
        token = data?.session?.access_token || '';
      } catch (e) {
        console.warn('Could not retrieve Supabase session token:', e);
      }
    }

    const wsUrl = `${this.getWsUrl()}${token ? `?token=${encodeURIComponent(token)}` : ''}`;

    return new Promise((resolve, reject) => {
      try {
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('⚡ [ScannerSocket] WebSocket connection established successfully');
          this.socket = ws;
          this.isConnecting = false;
          resolve(ws);
        };

        ws.onmessage = (event) => {
          try {
            console.log('📩 [ScannerSocket] Message received:', event.data);
            const data: ScanSocketMessage = JSON.parse(event.data);
            console.log(`📢 [ScannerSocket] Dispatching ${data.type} to ${this.listeners.size} listener(s)`);
            this.listeners.forEach((listener) => {
              try {
                listener(data);
              } catch (cbErr) {
                console.error('💥 [ScannerSocket] Listener callback error:', cbErr);
              }
            });
          } catch (err) {
            console.error('Failed to parse WebSocket message:', err);
          }
        };

        ws.onerror = (err) => {
          console.error('💥 [ScannerSocket] Connection error:', err);
          this.isConnecting = false;
        };

        ws.onclose = (event) => {
          if (event.code === 4401) {
            console.warn('🔒 [ScannerSocket] Closed: Unauthorized (invalid or missing token)');
          } else if (event.code !== 1000 && event.code !== 1005) {
            console.warn(`🔌 [ScannerSocket] Closed with code ${event.code}: ${event.reason || 'Connection lost'}`);
          }
          this.socket = null;
          this.isConnecting = false;
        };
      } catch (err) {
        this.isConnecting = false;
        reject(err);
      }
    });
  }

  public subscribe(listener: (msg: ScanSocketMessage) => void): () => void {
    this.listeners.add(listener);
    console.log(`🔌 [ScannerSocket] Registered subscriber. Total active listeners: ${this.listeners.size}`);
    return () => {
      this.listeners.delete(listener);
      console.log(`🔌 [ScannerSocket] Unregistered subscriber. Total active listeners: ${this.listeners.size}`);
    };
  }

  public async startScan(websiteId: string) {
    let ws = await this.connect();
    if (ws.readyState !== WebSocket.OPEN) {
      console.warn('⚠️ [ScannerSocket] Socket not open, reconnecting...');
      this.socket = null;
      ws = await this.connect();
    }
    console.log('🚀 [ScannerSocket] Dispatching START_SCAN payload for:', websiteId);
    ws.send(JSON.stringify({ type: 'START_SCAN', websiteId }));
  }

  public async cancelScan(websiteId: string) {
    const ws = await this.connect();
    if (ws.readyState === WebSocket.OPEN) {
      console.log('🛑 [ScannerSocket] Dispatching CANCEL_SCAN for:', websiteId);
      ws.send(JSON.stringify({ type: 'CANCEL_SCAN', websiteId }));
    }
  }

  public async joinWebsite(websiteId: string) {
    const ws = await this.connect();
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'SUBSCRIBE', websiteId }));
    }
  }


  public disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.listeners.clear();
  }
}

export const scannerSocket = new ScannerSocketManager();
