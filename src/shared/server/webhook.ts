import express from "express";
import { logger } from "../logger.js";
import { createRoutes, type RouteHandlers } from "./routes.js";

export type { RouteHandlers };

export function createServer(handlers: RouteHandlers) {
  const app = express();

  app.use(express.json());

  const routes = createRoutes(handlers);
  app.use(routes);

  return app;
}

export function startServer(
  handlers: RouteHandlers,
  port = parseInt(process.env.PORT || "3100", 10),
) {
  const app = createServer(handlers);

  const server = app.listen(port, () => {
    logger.info({ port }, "Webhook server started");
    logger.info(`  Health:  http://localhost:${port}/health`);
    logger.info(`  Runs:    http://localhost:${port}/runs`);
    logger.info(`  Trigger: POST http://localhost:${port}/test/trigger`);
  });

  // Graceful shutdown
  const shutdown = () => {
    logger.info("Shutting down gracefully...");
    server.close(() => {
      logger.info("Server closed");
      process.exit(0);
    });
    // Force exit after 10s
    setTimeout(() => {
      logger.warn("Forced exit after timeout");
      process.exit(1);
    }, 10_000);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  return server;
}
