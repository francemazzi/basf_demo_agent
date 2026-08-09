import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";

import { MockAgrigeniusAdapter } from "@basf/adapter";
import { today } from "@basf/core";

import { registerChatRoutes } from "./routes/chat.js";
import { registerDssRoutes } from "./routes/dss.js";
import { registerQuadernoRoutes } from "./routes/quaderno.js";
import { registerRegiaRoutes } from "./routes/regia.js";
import { registerWhatsAppRoutes } from "./routes/whatsapp.js";

export async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false, bodyLimit: 20 * 1024 * 1024 });
  await app.register(cors, { origin: true });

  app.get("/health", async () => ({
    status: "ok",
    demoDate: today(),
  }));

  const adapter = new MockAgrigeniusAdapter();
  registerDssRoutes(app, adapter);
  registerChatRoutes(app, adapter);
  registerQuadernoRoutes(app, adapter);
  registerRegiaRoutes(app, adapter);
  registerWhatsAppRoutes(app, adapter);

  return app;
}
