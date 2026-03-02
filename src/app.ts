import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import fastifyAutoload from "@fastify/autoload";
import fastifyCors from "@fastify/cors";
import fastifyStatic from "@fastify/static";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || "info",
      transport:
        process.env.NODE_ENV !== "production"
          ? { target: "pino-pretty", options: { colorize: true } }
          : undefined,
    },
  });

  // CORS for SPA dev server
  await app.register(fastifyCors, {
    origin: process.env.NODE_ENV !== "production"
      ? ["http://localhost:5173", "http://localhost:3200"]
      : true,
    credentials: true,
  });

  // Auto-load API routes
  await app.register(fastifyAutoload, {
    dir: path.join(__dirname, "api/routes"),
    options: { prefix: "/api" },
    dirNameRoutePrefix: false,
  });

  // In production, serve the built SPA
  const spaDistPath = path.join(__dirname, "..", "spa", "dist");
  if (existsSync(spaDistPath)) {
    await app.register(fastifyStatic, {
      root: spaDistPath,
      prefix: "/",
      wildcard: false,
    });
    // SPA fallback — serve index.html for client-side routing
    app.setNotFoundHandler((_req, reply) => {
      return reply.sendFile("index.html", spaDistPath);
    });
  }

  return app;
}
