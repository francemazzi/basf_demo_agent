import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { disconnect, prisma } from "@basf/db";
import { chiaveDisponibile } from "@basf/llm";

import { buildServer } from "./server.js";

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildServer();
});

afterAll(async () => {
  await prisma().operazione.deleteMany({ where: { origine: { not: "seed" } } });
  await app.close();
  await disconnect();
});

describe("Gate 3 — canale e regia", () => {
  it("espone al pannello di regia tutto quello che l'agente sta leggendo", async () => {
    const risposta = await app.inject({ method: "GET", url: "/regia/stato?giorno=2026-08-09" });
    expect(risposta.statusCode).toBe(200);

    const stato = risposta.json();
    expect(stato.demoDate).toBe("2026-08-09");
    expect(stato.protezione.oidio.sottoSoglia).toBe(true);
    expect(stato.protezione.oidio.fonte).toBe("ricostruzione");
    expect(stato.alert.length).toBeGreaterThan(0);
  });

  it("elenca le anomalie da mostrare a BASF", async () => {
    const risposta = await app.inject({ method: "GET", url: "/regia/anomalie" });
    const anomalie = risposta.json() as { codice: string }[];
    expect(anomalie.map((voce) => voce.codice)).toContain("bbch_congelato");
  });

  it("dichiara se la trascrizione vocale è configurata", async () => {
    const risposta = await app.inject({ method: "GET", url: "/capacita" });
    expect(risposta.json()).toEqual({
      trascrizioneVocale: Boolean(process.env.DEEPGRAM_API_KEY),
      demoDate: "2026-08-09",
    });
  });

  it("rifiuta la verifica del webhook WhatsApp senza token", async () => {
    const risposta = await app.inject({
      method: "GET",
      url: "/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=sbagliato&hub.challenge=123",
    });
    expect(risposta.statusCode).toBe(403);
  });

  it("riporta il quaderno allo stato del caso studio", async () => {
    const risposta = await app.inject({ method: "POST", url: "/regia/reset" });
    expect(risposta.statusCode).toBe(200);
    expect(await prisma().operazione.count()).toBe(36);
  });
});

describe.skipIf(!chiaveDisponibile())("Gate 3 — chat end to end", () => {
  it("risponde via HTTP con il testo e la traccia degli strumenti", async () => {
    const risposta = await app.inject({
      method: "POST",
      url: "/chat",
      payload: { messaggio: "come sto messo con la peronospora?", giorno: "2026-08-09" },
    });

    expect(risposta.statusCode).toBe(200);
    const corpo = risposta.json() as { testo: string; strumentiUsati: { nome: string }[] };
    expect(corpo.testo.length).toBeGreaterThan(10);
    expect(corpo.strumentiUsati.map((uso) => uso.nome)).toContain("consulta_dss");
  });

  it("apre da sola la conversazione il 9 agosto e resta zitta il 12 maggio", async () => {
    const attiva = await app.inject({ method: "GET", url: "/chat/proattivo?giorno=2026-08-09" });
    expect((attiva.json() as { messaggio: string | null }).messaggio).not.toBeNull();

    const silenziosa = await app.inject({ method: "GET", url: "/chat/proattivo?giorno=2026-05-12" });
    expect((silenziosa.json() as { messaggio: string | null }).messaggio).toBeNull();
  });
});
