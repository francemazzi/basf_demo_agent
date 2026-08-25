import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";

import { MockAgrigeniusAdapter } from "@basf/adapter";
import { optionalEnv, today } from "@basf/core";

import { registerAuthRoutes } from "./routes/auth.js";
import { registerChatRoutes } from "./routes/chat.js";
import { registerConversationRoutes } from "./routes/conversations.js";
import { registerDssRoutes } from "./routes/dss.js";
import { registerQuadernoRoutes } from "./routes/quaderno.js";
import { registerRegiaRoutes } from "./routes/regia.js";
import { registerWhatsAppRoutes } from "./routes/whatsapp.js";
import { registerSessione } from "./sessione.js";

export async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false,
    bodyLimit: 20 * 1024 * 1024,
    trustProxy: true,
  });
  const webOrigin = optionalEnv("PUBLIC_WEB_ORIGIN", "");
  await app.register(cors, {
    origin: webOrigin ? [webOrigin, /^http:\/\/localhost:\d+$/] : true,
    credentials: true,
  });
  await registerSessione(app);

  app.get("/health", async () => ({
    status: "ok",
    demoDate: today(),
  }));

  const adapter = new MockAgrigeniusAdapter();
  registerAuthRoutes(app);
  registerDssRoutes(app, adapter);
  registerChatRoutes(app, adapter);
  registerConversationRoutes(app, adapter);
  registerQuadernoRoutes(app, adapter);
  registerRegiaRoutes(app, adapter);
  registerWhatsAppRoutes(app, adapter);

  return app;
}
