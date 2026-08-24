import type { FastifyInstance } from "fastify";
import type { Prisma } from "@basf/db";

import type { MockAgrigeniusAdapter } from "@basf/adapter";
import { rispondi, type TurnoUtente } from "@basf/agent";
import { prisma } from "@basf/db";
import { ERRORE_CHIAVE_OPENROUTER, chiaveDisponibile } from "@basf/llm";

import { requireAuth } from "../sessione.js";

const TITOLO_NUOVA = "Nuova conversazione";
const GIORNO_DEFAULT = "2026-08-09";

interface CorpoNuova {
  giorno?: string;
  title?: string;
}

interface CorpoMessaggio {
  messaggio?: string;
}

interface CorpoAggiorna {
  giorno?: string;
}

function titoloDaMessaggio(testo: string): string {
  const pulito = testo.replace(/\s+/g, " ").trim();
  if (pulito.length <= 48) return pulito || TITOLO_NUOVA;
  return `${pulito.slice(0, 45).trimEnd()}…`;
}

function storicoDaMessaggi(
  messaggi: { ruolo: string; testo: string }[],
): TurnoUtente[] {
  return messaggi.map((messaggio) => ({
    ruolo: messaggio.ruolo === "agente" ? "agente" : "utente",
    testo: messaggio.testo,
  }));
}

export function registerConversationRoutes(
  app: FastifyInstance,
  adapter: MockAgrigeniusAdapter,
): void {
  app.get("/conversations", async (request, reply) => {
    if (!(await requireAuth(request, reply))) return;
    return prisma().conversation.findMany({
      where: { userId: request.utenteId },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, giorno: true, createdAt: true, updatedAt: true },
    });
  });

  app.post<{ Body: CorpoNuova }>("/conversations", async (request, reply) => {
    if (!(await requireAuth(request, reply))) return;
    const giorno = request.body?.giorno?.trim() || GIORNO_DEFAULT;
    const conversazione = await prisma().conversation.create({
      data: {
        userId: request.utenteId,
        title: request.body?.title?.trim() || TITOLO_NUOVA,
        giorno,
      },
    });
    return reply.code(201).send(conversazione);
  });

  app.get<{ Params: { id: string } }>("/conversations/:id", async (request, reply) => {
    if (!(await requireAuth(request, reply))) return;
    const conversazione = await prisma().conversation.findFirst({
      where: { id: request.params.id, userId: request.utenteId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    if (!conversazione) {
      return reply.code(404).send({ errore: "Conversazione non trovata" });
    }
    return conversazione;
  });

  app.patch<{ Params: { id: string }; Body: CorpoAggiorna }>(
    "/conversations/:id",
    async (request, reply) => {
      if (!(await requireAuth(request, reply))) return;
      const giorno = request.body?.giorno?.trim();
      if (!giorno) {
        return reply.code(400).send({ errore: "Giorno mancante" });
      }
      const esistente = await prisma().conversation.findFirst({
        where: { id: request.params.id, userId: request.utenteId },
      });
      if (!esistente) {
        return reply.code(404).send({ errore: "Conversazione non trovata" });
      }
      return prisma().conversation.update({
        where: { id: esistente.id },
        data: { giorno },
      });
    },
  );

  app.post<{ Params: { id: string }; Body: CorpoMessaggio }>(
    "/conversations/:id/messages",
    async (request, reply) => {
      if (!(await requireAuth(request, reply))) return;
      if (!chiaveDisponibile()) {
        return reply.code(503).send({ errore: ERRORE_CHIAVE_OPENROUTER });
      }

      const messaggio = request.body?.messaggio?.trim() ?? "";
      if (!messaggio) {
        return reply.code(400).send({ errore: "Messaggio vuoto" });
      }

      const conversazione = await prisma().conversation.findFirst({
        where: { id: request.params.id, userId: request.utenteId },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      });
      if (!conversazione) {
        return reply.code(404).send({ errore: "Conversazione non trovata" });
      }

      let risposta: Awaited<ReturnType<typeof rispondi>>;
      try {
        risposta = await rispondi(messaggio, {
          adapter,
          giorno: conversazione.giorno,
          storico: storicoDaMessaggi(conversazione.messages),
        });
      } catch (errore) {
        const testo = errore instanceof Error ? errore.message : "Errore del modello";
        return reply.code(502).send({ errore: testo });
      }

      const strumenti: Prisma.InputJsonValue | undefined = risposta.strumentiUsati.length
        ? (risposta.strumentiUsati as unknown as Prisma.InputJsonValue)
        : undefined;

      const [utente, agente] = await prisma().$transaction([
        prisma().message.create({
          data: {
            conversationId: conversazione.id,
            ruolo: "utente",
            testo: messaggio,
          },
        }),
        prisma().message.create({
          data: {
            conversationId: conversazione.id,
            ruolo: "agente",
            testo: risposta.testo,
            strumentiUsati: strumenti,
          },
        }),
        prisma().conversation.update({
          where: { id: conversazione.id },
          data: {
            title:
              conversazione.title === TITOLO_NUOVA
                ? titoloDaMessaggio(messaggio)
                : conversazione.title,
          },
        }),
      ]);

      return { utente, agente, strumentiUsati: risposta.strumentiUsati };
    },
  );
}
