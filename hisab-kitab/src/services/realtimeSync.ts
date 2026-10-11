type SyncListener = (event: SyncEvent) => void;

export interface SyncEvent {
  type: 'SYNC_UPDATE' | 'CONNECTED' | 'PEER_COUNT' | 'STATUS_CHANGE';
  email?: string;
  database?: any;
  connectedDevices?: number;
  status?: 'connected' | 'connecting' | 'disconnected';
  timestamp?: number;
}

class RealtimeSyncManager {
  private ws: WebSocket | null = null;
  private currentEmail: string = '';
  private listeners: Set<SyncListener> = new Set();
  private reconnectTimer: any = null;
  private pingInterval: any = null;
  private status: 'connected' | 'connecting' | 'disconnected' = 'disconnected';
  private connectedDevices: number = 1;
  private isExplicitlyClosed: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      // Reconnect when device regains focus or comes back online (mobile screen on / tab focus)
      window.addEventListener('online', () => {
        if (this.currentEmail && this.status !== 'connected') {
          this.connect(this.currentEmail);
        }
      });
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.currentEmail && (!this.ws || this.ws.readyState !== WebSocket.OPEN)) {
          this.connect(this.currentEmail);
        }
      });
    }
  }

  public getStatus(): 'connected' | 'connecting' | 'disconnected' {
    return this.status;
  }

  public getConnectedDevices(): number {
    return this.connectedDevices;
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    // Immediately emit current state
    listener({
      type: 'STATUS_CHANGE',
      status: this.status,
      connectedDevices: this.connectedDevices,
      email: this.currentEmail,
    });
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(event: SyncEvent) {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (e) {
        console.error('Error in sync listener:', e);
      }
    });
  }

  private setStatus(newStatus: 'connected' | 'connecting' | 'disconnected') {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.notify({
        type: 'STATUS_CHANGE',
        status: newStatus,
        connectedDevices: this.connectedDevices,
        email: this.currentEmail,
      });
    }
  }

  public connect(email: string) {
    if (typeof window === 'undefined') return;
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) return;

    this.currentEmail = cleanEmail;
    this.isExplicitlyClosed = false;

    // If already connected with the same email, nothing to do
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({ type: 'SUBSCRIBE', email: cleanEmail }));
      } catch {}
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.setStatus('connecting');

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws?email=${encodeURIComponent(cleanEmail)}`;

      if (this.ws) {
        try {
          this.ws.close();
        } catch {}
        this.ws = null;
      }

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.setStatus('connected');
        this.startPing();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'PONG') {
            return;
          }

          if (data.type === 'CONNECTED') {
            if (typeof data.connectedDevices === 'number') {
              this.connectedDevices = data.connectedDevices;
            }
            this.notify({
              type: 'CONNECTED',
              email: data.email,
              connectedDevices: this.connectedDevices,
              timestamp: data.timestamp,
            });
            return;
          }

          if (data.type === 'PEER_COUNT') {
            if (typeof data.connectedDevices === 'number') {
              this.connectedDevices = data.connectedDevices;
            }
            this.notify({
              type: 'PEER_COUNT',
              email: data.email,
              connectedDevices: this.connectedDevices,
              timestamp: data.timestamp,
            });
            return;
          }

          if (data.type === 'SYNC_UPDATE') {
            if (typeof data.connectedDevices === 'number') {
              this.connectedDevices = data.connectedDevices;
            }
            this.notify({
              type: 'SYNC_UPDATE',
              email: data.email,
              database: data.database,
              connectedDevices: this.connectedDevices,
              timestamp: data.timestamp,
            });
          }
        } catch (e) {
          console.error('Failed parsing WebSocket message:', e);
        }
      };

      this.ws.onerror = () => {
        this.setStatus('disconnected');
      };

      this.ws.onclose = () => {
        this.stopPing();
        this.setStatus('disconnected');
        if (!this.isExplicitlyClosed && this.currentEmail) {
          // Reconnect with backoff
          this.reconnectTimer = setTimeout(() => {
            this.connect(this.currentEmail);
          }, 2500);
        }
      };
    } catch (e) {
      console.error('WebSocket connection error:', e);
      this.setStatus('disconnected');
      if (!this.isExplicitlyClosed && this.currentEmail) {
        this.reconnectTimer = setTimeout(() => {
          this.connect(this.currentEmail);
        }, 3000);
      }
    }
  }

  private startPing() {
    this.stopPing();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ type: 'PING' }));
        } catch {}
      }
    }, 20000);
  }

  private stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  public disconnect() {
    this.isExplicitlyClosed = true;
    this.stopPing();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    this.setStatus('disconnected');
  }
}

export const realtimeSync = new RealtimeSyncManager();
