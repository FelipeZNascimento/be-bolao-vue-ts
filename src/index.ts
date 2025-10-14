// import { connection } from "#database/db.js";
import { WebSocketService } from "#websocket/websocket.service.js";

import app from "./app.js";

const port = process.env.PORT ?? "9001";

const server = app.listen(port, () => {
  console.log(`BolaoNFL API listening on port ${port}`);
});

WebSocketService.getInstance(server);

// Graceful shutdown handler
const shutdown = () => {
  console.warn("Shutdown signal received");

  // Add WebSocket cleanup
  const wsService = WebSocketService.getInstance();
  wsService.broadcast("Server shutting down");

  // Add connection draining
  app.disable("connection"); // Stop accepting new connections

  // Add timeout for existing connections
  setTimeout(() => {
    console.warn("Connection drain timeout reached, forcing shutdown");
    process.exit(1);
  }, 10000);

  server.close(() => {
    console.info("HTTP server closed");

    try {
      // connection.destroy();
      console.info("Database connections closed");

      process.exit(0);
    } catch (err) {
      console.error("Error during shutdown:", err);
      process.exit(1);
    }
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    console.error("Could not close connections in time, forcefully shutting down");
    process.exit(1);
  }, 30000);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

export default server;
