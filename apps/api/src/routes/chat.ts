import type { FastifyInstance } from "fastify";

import type { MockAgrigeniusAdapter } from "@basf/adapter";
import { today } from "@basf/core";
import {
  rispondi,
  trascrizioneDisponibile,
  valutaAperturaProattiva,
  type TurnoUtente,
} from "@basf/agent";

interface CorpoChat {
  messaggio: string;
  storico?: TurnoUtente[];
  giorno?: string;
  immagineDataUrl?: string;
}

export function registerChatRoutes(app: FastifyInstance, adapter: MockAgrigeniusAdapter): void {
  app.post<{ Body: CorpoChat }>("/chat", async (request) => {
    const { messaggio, storico, giorno, immagineDataUrl } = request.body;
    return rispondi(messaggio, { storico, giorno, adapter, immagineDataUrl });
  });

  app.get<{ Querystring: { giorno?: string } }>("/chat/proattivo", async (request) => {
    const apertura = await valutaAperturaProattiva({
      giorno: request.query.giorno ?? today(),
      adapter,
    });
    return apertura ?? { giorno: request.query.giorno ?? today(), alert: [], messaggio: null };
  });

  app.get("/capacita", async () => ({
    trascrizioneVocale: trascrizioneDisponibile(),
    demoDate: today(),
  }));
}
