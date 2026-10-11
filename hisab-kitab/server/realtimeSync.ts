import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { parse } from 'url';
import type { LedgerlyDatabase } from './db.ts';

interface ClientConnection {
  ws: WebSocket;
  email: string;
  isAlive: boolean;
  connectedAt: number;
}

// Map of normalized email -> Set of connected WebSocket clients
const emailRooms = new Map<string, Set<ClientConnection>>();
let wss: WebSocketServer | null = null;
let viteWss: WebSocketServer | null = null;

export function initRealtimeSync(server: http.Server): WebSocketServer {
  wss = new WebSocketServer({ noServer: true });
  viteWss = new WebSocketServer({
    noServer: true,
    handleProtocols: (protocols) => {
      if (protocols.has('vite-hmr')) return 'vite-hmr';
      if (protocols.has('vite-ping')) return 'vite-ping';
      const first = protocols.values().next().value;
      return first || false;
    },
  });

  server.on('upgrade', (request, socket, head) => {
    const { pathname, query } = parse(request.url || '', true);
    const protocolHeader = (request.headers['sec-websocket-protocol'] || '') as string;
    const isViteHmr =
      protocolHeader.includes('vite-hmr') ||
      protocolHeader.includes('vite-ping') ||
      query.token !== undefined ||
      pathname === '/' ||
      pathname === '';

    if (pathname === '/ws' || pathname === '/api/ws') {
      wss!.handleUpgrade(request, socket, head, (ws) => {
        wss!.emit('connection', ws, request);
      });
    } else if (isViteHmr && viteWss) {
      viteWss.handleUpgrade(request, socket, head, (ws) => {
        try {
          ws.send(JSON.stringify({ type: 'connected' }));
        } catch {}

        ws.on('message', (msg) => {
          try {
            const data = JSON.parse(msg.toString());
            if (data.type === 'ping') {
              ws.send(JSON.stringify({ type: 'pong' }));
            }
          } catch {}
        });

        const pingInterval = setInterval(() => {
          if (ws.readyState === ws.OPEN) {
            try {
              ws.ping();
            } catch {}
          } else {
            clearInterval(pingInterval);
          }
        }, 20000);

        ws.on('close', () => clearInterval(pingInterval));
        ws.on('error', () => clearInterval(pingInterval));
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', (ws: WebSocket, request: http.IncomingMessage) => {
    const { query } = parse(request.url || '', true);
    const initialEmail = (
      (query.email as string) ||
      (request.headers['x-ledgerly-owner'] as string) ||
      'ravihr5000@gmail.com'
    ).trim().toLowerCase();

    const client: ClientConnection = {
      ws,
      email: initialEmail,
      isAlive: true,
      connectedAt: Date.now(),
    };

    addToRoom(client);

    // Heartbeat listener
    ws.on('pong', () => {
      client.isAlive = true;
    });

    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'PING') {
          ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
          return;
        }

        if (data.type === 'SUBSCRIBE' && data.email) {
          const newEmail = String(data.email).trim().toLowerCase();
          if (newEmail && newEmail !== client.email) {
            removeFromRoom(client);
            client.email = newEmail;
            addToRoom(client);
          }
        }
      } catch {
        // ignore malformed client message
      }
    });

    ws.on('close', () => {
      removeFromRoom(client);
    });

    ws.on('error', () => {
      removeFromRoom(client);
    });

    // Send initial connection ACK
    try {
      const roomSize = emailRooms.get(client.email)?.size || 1;
      ws.send(
        JSON.stringify({
          type: 'CONNECTED',
          email: client.email,
          connectedDevices: roomSize,
          timestamp: Date.now(),
        })
      );
    } catch {
      // ignore
    }
  });

  // Keep-alive heartbeat interval every 25 seconds
  const pingInterval = setInterval(() => {
    if (!wss) return;
    emailRooms.forEach((clients) => {
      clients.forEach((client) => {
        if (!client.isAlive) {
          try {
            client.ws.terminate();
          } catch {}
          removeFromRoom(client);
          return;
        }
        client.isAlive = false;
        try {
          client.ws.ping();
        } catch {
          removeFromRoom(client);
        }
      });
    });
  }, 25000);

  wss.on('close', () => {
    clearInterval(pingInterval);
  });

  return wss;
}

function addToRoom(client: ClientConnection) {
  if (!emailRooms.has(client.email)) {
    emailRooms.set(client.email, new Set());
  }
  const room = emailRooms.get(client.email)!;
  room.add(client);
  broadcastPeerCount(client.email);
}

function removeFromRoom(client: ClientConnection) {
  const room = emailRooms.get(client.email);
  if (room) {
    room.delete(client);
    if (room.size === 0) {
      emailRooms.delete(client.email);
    } else {
      broadcastPeerCount(client.email);
    }
  }
}

function broadcastPeerCount(email: string) {
  const room = emailRooms.get(email);
  if (!room) return;
  const count = room.size;
  const payload = JSON.stringify({
    type: 'PEER_COUNT',
    email,
    connectedDevices: count,
    timestamp: Date.now(),
  });
  room.forEach((client) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(payload);
      } catch {}
    }
  });
}

/**
 * Broadcasts full database state update to all devices connected for the specified Gmail account.
 */
export function broadcastDatabaseUpdate(email: string, db: LedgerlyDatabase): void {
  const normEmail = (email || '').trim().toLowerCase();
  const room = emailRooms.get(normEmail);
  if (!room || room.size === 0) return;

  const payload = JSON.stringify({
    type: 'SYNC_UPDATE',
    email: normEmail,
    timestamp: Date.now(),
    connectedDevices: room.size,
    database: db,
  });

  room.forEach((client) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(payload);
      } catch (err) {
        console.error('Failed to send WebSocket sync update:', err);
      }
    }
  });
}

/**
 * Returns number of active devices currently connected for a Gmail account
 */
export function getConnectedDeviceCount(email: string): number {
  const normEmail = (email || '').trim().toLowerCase();
  return emailRooms.get(normEmail)?.size || 0;
}
