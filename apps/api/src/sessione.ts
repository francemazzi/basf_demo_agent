import cookie from "@fastify/cookie";
import session from "@fastify/session";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { optionalEnv } from "@basf/core";
import { prisma } from "@basf/db";

declare module "fastify" {
  interface Session {
    userId?: string;
  }
}

export async function registerSessione(app: FastifyInstance): Promise<void> {
  app.decorateRequest("utenteId", "");
  app.decorateRequest("utenteEmail", "");
  await app.register(cookie);
  await app.register(session, {
    secret: optionalEnv("SESSION_SECRET", "basf-demo-session-secret-change-me"),
    cookieName: "basf.sid",
    saveUninitialized: false,
    cookie: {
      path: "/",
      httpOnly: true,
      sameSite: optionalEnv("COOKIE_SAMESITE", "lax") === "none" ? "none" : "lax",
      secure: optionalEnv("COOKIE_SECURE", "false") === "true",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  });
}

export async function utenteDellaSessione(request: FastifyRequest) {
  const userId = request.session.userId;
  if (!userId) return null;
  return prisma().user.findUnique({ where: { id: userId } });
}

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<boolean> {
  const utente = await utenteDellaSessione(request);
  if (!utente) {
    await reply.code(401).send({ errore: "Accesso richiesto" });
    return false;
  }
  request.utenteId = utente.id;
  request.utenteEmail = utente.email;
  return true;
}

declare module "fastify" {
  interface FastifyRequest {
    utenteId: string;
    utenteEmail: string;
  }
}
