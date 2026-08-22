import { singleton } from '#utils/singleton.js';
import { Server } from 'http';
import { WebSocket, WebSocketServer } from 'ws';

export interface WebSocketMessage {
  data: unknown;
  type: 'connection' | 'error' | 'ping' | 'pong';
}

@singleton
export class WebSocketService {
  private static instance: WebSocketService;
  private wss!: WebSocketServer;

  public static getInstance(server?: Server): WebSocketService {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }

    if (server) {
      WebSocketService.instance.initialize(server);
    }
    return WebSocketService.instance;
  }

  public broadcast(message: string) {
    console.info(
      `[WebSocketService] broadcast called. Connected clients: ${this.wss.clients.size.toString()}. Message length: ${message.length.toString()}`
    );

    this.wss.clients.forEach((client) => {
      console.info(
        `[WebSocketService] client readyState: ${client.readyState.toString()} (OPEN=${WebSocket.OPEN.toString()})`
      );

      if (client.readyState !== WebSocket.OPEN) {
        console.warn('[WebSocketService] skipping client, socket not open');
        return;
      }

      client.send(message, (err) => {
        if (err) {
          console.error('[WebSocketService] error sending message to client:', err);
        }
      });
    });
  }

  private initialize(server: Server): void {
    console.log('Initializing wss with server!');
    this.wss = new WebSocketServer({ server });

    this.wss.on('error', (err) => {
      console.error('[WebSocketService] server error:', err);
    });

    this.wss.on('connection', (ws: WebSocket, req) => {
      console.log(
        `Stablishing websocket connection from ${req.socket.remoteAddress ?? 'unknown'}, url: ${req.url ?? 'unknown'}, origin: ${req.headers.origin ?? 'unknown'}`
      );
      console.info(`[WebSocketService] total connected clients: ${this.wss.clients.size.toString()}`);
      // this.metricsService.recordWebsocketConnection(true);

      ws.on('close', (code, reason) => {
        console.info(`Closing websocket connection. code: ${code.toString()}, reason: ${reason.toString()}`);
        console.info(`[WebSocketService] total connected clients: ${this.wss.clients.size.toString()}`);
        // this.metricsService.recordWebsocketConnection(false);
      });

      ws.on('error', (err) => {
        console.error('[WebSocketService] client socket error:', err);
      });

      ws.on('message', (message: string) => {
        console.info('Websocket sending a message: ', message);
        // this.metricsService.recordWebsocketMessage("message", "in");
      });

      ws.on('broadcast', (message: string) => {
        console.info('Websocket broadcasting: ', message);
        // this.metricsService.recordWebsocketMessage("message", "in");
      });
    });
  }

  // Rest of the WebSocket service implementation...
}
