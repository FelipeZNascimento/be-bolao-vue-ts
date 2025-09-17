import { singleton } from "#utils/singleton.ts";
import { Server } from "http";
import { WebSocket, WebSocketServer } from "ws";

export interface WebSocketMessage {
  data: unknown;
  type: "connection" | "error" | "ping" | "pong";
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
    this.wss.clients.forEach((client) => {
      client.send(message);
    });
  }

  private initialize(server: Server): void {
    console.log("Initializing wss with server!");
    this.wss = new WebSocketServer({ server });

    this.wss.on("connection", (ws: WebSocket) => {
      console.log("Stablishing websocket connection");
      // this.metricsService.recordWebsocketConnection(true);

      ws.on("close", () => {
        console.info("Closing websocket connection");
        // this.metricsService.recordWebsocketConnection(false);
      });

      ws.on("message", (message: string) => {
        console.info("Websocket sending a message: ", message);
        // this.metricsService.recordWebsocketMessage("message", "in");
      });

      ws.on("broadcast", (message: string) => {
        console.info("Websocket broadcasting: ", message);
        // this.metricsService.recordWebsocketMessage("message", "in");
      });
    });
  }

  // Rest of the WebSocket service implementation...
}
