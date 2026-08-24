import type { FastifyInstance } from "fastify";

import type { MockAgrigeniusAdapter } from "@basf/adapter";
import { today } from "@basf/core";
import {
  rispondi,
  trascrizioneDisponibile,
  valutaAperturaProattiva,
  type TurnoUtente,
} from "@basf/agent";
import { ERRORE_CHIAVE_OPENROUTER, chiaveDisponibile, providerLlm } from "@basf/llm";

interface CorpoChat {
  messaggio: string;
  storico?: TurnoUtente[];
  giorno?: string;
  immagineDataUrl?: string;
}

export function registerChatRoutes(app: FastifyInstance, adapter: MockAgrigeniusAdapter): void {
  app.post<{ Body: CorpoChat }>("/chat", async (request, reply) => {
    if (!chiaveDisponibile()) {
      return reply.code(503).send({ errore: ERRORE_CHIAVE_OPENROUTER });
    }
    const { messaggio, storico, giorno, immagineDataUrl } = request.body;
    try {
      return await rispondi(messaggio, { storico, giorno, adapter, immagineDataUrl });
    } catch (errore) {
      const testo = errore instanceof Error ? errore.message : "Errore del modello";
      return reply.code(502).send({ errore: testo });
    }
  });

  app.get<{ Querystring: { giorno?: string } }>("/chat/proattivo", async (request, reply) => {
    if (!chiaveDisponibile()) {
      return reply.code(503).send({ errore: ERRORE_CHIAVE_OPENROUTER });
    }
    try {
      const apertura = await valutaAperturaProattiva({
        giorno: request.query.giorno ?? today(),
        adapter,
      });
      return apertura ?? { giorno: request.query.giorno ?? today(), alert: [], messaggio: null };
    } catch (errore) {
      const testo = errore instanceof Error ? errore.message : "Errore del modello";
      return reply.code(502).send({ errore: testo });
    }
  });

  app.get("/capacita", async () => ({
    trascrizioneVocale: trascrizioneDisponibile(),
    demoDate: today(),
    llmPronto: chiaveDisponibile(),
    llmProvider: providerLlm(),
  }));
}
