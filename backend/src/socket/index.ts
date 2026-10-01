import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage, Server } from 'http';
import jwt from 'jsonwebtoken';
import { parse as parseUrl } from 'url';
import { websiteService } from '../services/website.service';

function parseCookies(cookieHeader?: string): Record<string, string> {
  const list: Record<string, string> = {};
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    if (parts.length >= 2) {
      list[parts[0].trim()] = decodeURIComponent(parts.slice(1).join('='));
    }
  });
  return list;
}

interface AuthenticatedSocket extends WebSocket {
  userId?: string;
  userEmail?: string;
  subscribedWebsites?: Set<string>;
  isAlive?: boolean;
}

const JWT_SECRET = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET || 'fallback_secret_key';

// In-flight scan controllers for cancellation
const activeScanControllers = new Map<string, AbortController>();

export function initWebSocketServer(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  console.log('⚡ [WS Server] Mounted on path /ws');

  // Heartbeat interval to detect zombie connections
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const authWs = ws as AuthenticatedSocket;
      if (authWs.isAlive === false) return authWs.terminate();
      authWs.isAlive = false;
      authWs.ping();
    });
  }, 30000);

  wss.on('close', () => clearInterval(interval));

  wss.on('connection', (ws: AuthenticatedSocket, req: IncomingMessage) => {
    ws.isAlive = true;
    ws.subscribedWebsites = new Set<string>();

    const clientIp = req.socket.remoteAddress;
    console.log(`🔌 [WS] New connection attempt from ${clientIp}, url: ${req.url}`);

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    // Extract token from query or cookies
    let token: string | undefined;
    const { query } = parseUrl(req.url || '', true);
    if (typeof query.token === 'string') {
      token = query.token;
    }

    if (!token && req.headers.cookie) {
      try {
        const cookies = parseCookies(req.headers.cookie);
        token = cookies.auth_token;
      } catch (e) {
        // Ignore parse error
      }
    }

    if (!token) {
      console.warn(`🔒 [WS] Connection rejected: Missing token from ${clientIp}`);
      ws.send(JSON.stringify({ type: 'ERROR', message: 'Authentication required. Missing token.' }));
      ws.close(4401, 'Unauthorized');
      return;
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { sub: string; email: string };
      ws.userId = decoded.sub;
      ws.userEmail = decoded.email;

      console.log(`✅ [WS] Client authenticated! userId: ${ws.userId}, email: ${ws.userEmail}`);

      ws.send(JSON.stringify({
        type: 'CONNECTED',
        user: { id: ws.userId, email: ws.userEmail }
      }));
    } catch (err: any) {
      console.warn(`🔒 [WS] Connection rejected: Invalid token from ${clientIp}:`, err.message);
      ws.send(JSON.stringify({ type: 'ERROR', message: 'Invalid or expired token.' }));
      ws.close(4401, 'Unauthorized');
      return;
    }

    // Helper: broadcast to all sockets belonging to this user
    const broadcastToWebsite = (websiteId: string, payload: any) => {
      const msg = JSON.stringify(payload);
      let count = 0;
      wss.clients.forEach((client) => {
        const authClient = client as AuthenticatedSocket;
        if (
          authClient.readyState === WebSocket.OPEN &&
          authClient.userId === ws.userId
        ) {
          authClient.send(msg);
          count++;
        }
      });
      console.log(`📡 [WS Broadcast] ${payload.type} for ${websiteId} sent to ${count} client(s)`);
    };

    ws.on('message', async (data: string) => {
      try {
        const rawStr = data.toString();
        console.log(`📩 [WS Message] Received: ${rawStr}`);
        const message = JSON.parse(rawStr);
        const { type, websiteId } = message;

        if (!websiteId) {
          console.warn('⚠️ [WS Message] Missing websiteId in message:', message);
          return;
        }

        switch (type) {
          case 'SUBSCRIBE': {
            ws.subscribedWebsites?.add(websiteId);
            ws.send(JSON.stringify({ type: 'SUBSCRIBED', websiteId }));
            console.log(`📌 [WS] Client subscribed to website: ${websiteId}`);
            break;
          }

          case 'UNSUBSCRIBE': {
            ws.subscribedWebsites?.delete(websiteId);
            ws.send(JSON.stringify({ type: 'UNSUBSCRIBED', websiteId }));
            break;
          }

          case 'START_SCAN': {
            if (!ws.userId) {
              console.error('❌ [WS] Cannot start scan: missing ws.userId');
              return;
            }

            ws.subscribedWebsites?.add(websiteId);

            // If a previous scan is still active, abort it and start fresh!
            const existingController = activeScanControllers.get(websiteId);
            if (existingController) {
              console.log(`⚠️ [WS] Aborting previously active scan for ${websiteId}...`);
              existingController.abort();
              activeScanControllers.delete(websiteId);
            }

            const abortController = new AbortController();
            activeScanControllers.set(websiteId, abortController);

            console.log(`🚀 [WS] Initiating scan for websiteId: ${websiteId}, target user: ${ws.userId}`);

            try {
              broadcastToWebsite(websiteId, {
                type: 'SCAN_START',
                websiteId,
                timestamp: new Date().toISOString()
              });

              const savedReport = await websiteService.scanWebsiteStream(
                ws.userId,
                websiteId,
                (progress) => {
                  broadcastToWebsite(websiteId, {
                    type: 'SCAN_PROGRESS',
                    websiteId,
                    ...progress
                  });
                },
                abortController.signal
              );

              console.log(`🎉 [WS] Scan completed for ${websiteId}! Score: ${savedReport?.score}`);

              broadcastToWebsite(websiteId, {
                type: 'SCAN_COMPLETE',
                websiteId,
                report: savedReport
              });
            } catch (scanErr: any) {
              if (abortController.signal.aborted) {
                console.log(`🛑 [WS] Scan was cancelled for ${websiteId}`);
                broadcastToWebsite(websiteId, {
                  type: 'SCAN_CANCELLED',
                  websiteId,
                  message: 'Scan was cancelled by user'
                });
              } else {
                console.error(`💥 [WS] Scan error for ${websiteId}:`, scanErr);
                broadcastToWebsite(websiteId, {
                  type: 'SCAN_ERROR',
                  websiteId,
                  error: scanErr.message || 'Scan failed unexpectedly'
                });
              }
            } finally {
              activeScanControllers.delete(websiteId);
            }
            break;
          }

          case 'CANCEL_SCAN': {
            const controller = activeScanControllers.get(websiteId);
            if (controller) {
              console.log(`🛑 [WS] User requested cancellation for ${websiteId}`);
              controller.abort();
              activeScanControllers.delete(websiteId);
              broadcastToWebsite(websiteId, {
                type: 'SCAN_CANCELLED',
                websiteId,
                message: 'Scan was cancelled'
              });
            }
            break;
          }

          default:
            console.warn(`❓ [WS] Unknown message type: ${type}`);
            break;
        }
      } catch (err: any) {
        console.error('💥 [WS] Message parsing error:', err);
      }
    });

    ws.on('close', (code, reason) => {
      console.log(`🔌 [WS] Client disconnected (${code}): ${reason?.toString() || 'no reason'}`);
      ws.subscribedWebsites?.clear();
    });

    ws.on('error', (err) => {
      console.error('💥 [WS] Socket error:', err);
    });
  });

  return wss;
}
