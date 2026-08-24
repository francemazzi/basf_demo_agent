import type { FastifyInstance } from "fastify";

import { emailConsentita } from "@basf/core";
import { prisma } from "@basf/db";

import { hashPassword, verificaPassword } from "../password.js";
import { requireAuth, utenteDellaSessione } from "../sessione.js";

const PASSWORD_MINIMA = 8;

interface Credenziali {
  email?: string;
  password?: string;
}

function normalizzaEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function registerAuthRoutes(app: FastifyInstance): void {
  app.post<{ Body: Credenziali }>("/auth/register", async (request, reply) => {
    const email = normalizzaEmail(request.body?.email ?? "");
    const password = request.body?.password ?? "";

    if (!email || !password) {
      return reply.code(400).send({ errore: "Email e password sono obbligatorie" });
    }
    if (password.length < PASSWORD_MINIMA) {
      return reply.code(400).send({ errore: `La password deve avere almeno ${PASSWORD_MINIMA} caratteri` });
    }
    if (!emailConsentita(email)) {
      return reply.code(403).send({
        errore: "Questa demo è riservata agli indirizzi BASF e al titolare del prototipo.",
      });
    }

    const esistente = await prisma().user.findUnique({ where: { email } });
    if (esistente) {
      return reply.code(409).send({ errore: "Questo indirizzo è già registrato. Accedi." });
    }

    const utente = await prisma().user.create({
      data: { email, passwordHash: await hashPassword(password) },
    });
    request.session.userId = utente.id;
    return reply.code(201).send({ id: utente.id, email: utente.email });
  });

  app.post<{ Body: Credenziali }>("/auth/login", async (request, reply) => {
    const email = normalizzaEmail(request.body?.email ?? "");
    const password = request.body?.password ?? "";

    if (!email || !password) {
      return reply.code(400).send({ errore: "Email e password sono obbligatorie" });
    }
    if (!emailConsentita(email)) {
      return reply.code(403).send({
        errore: "Questa demo è riservata agli indirizzi BASF e al titolare del prototipo.",
      });
    }

    const utente = await prisma().user.findUnique({ where: { email } });
    if (!utente || !(await verificaPassword(password, utente.passwordHash))) {
      return reply.code(401).send({ errore: "Email o password non corrette" });
    }

    request.session.userId = utente.id;
    return { id: utente.id, email: utente.email };
  });

  app.post("/auth/logout", async (request) => {
    await request.session.destroy();
    return { ok: true };
  });

  app.get("/auth/me", async (request, reply) => {
    if (!(await requireAuth(request, reply))) return;
    const utente = await utenteDellaSessione(request);
    if (!utente) {
      return reply.code(401).send({ errore: "Accesso richiesto" });
    }
    return { id: utente.id, email: utente.email };
  });
}
