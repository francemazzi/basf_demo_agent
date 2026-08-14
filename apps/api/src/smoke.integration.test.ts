import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { disconnect, prisma } from "@basf/db";
import { chiaveDisponibile } from "@basf/llm";

import { buildServer } from "./server.js";

/**
 * Gate 5. Ripercorre i cinque scenari nell'ordine della registrazione, tutto via HTTP:
 * se questo file è verde, il video si può girare senza sorprese.
 */

const RADICE = resolve(import.meta.dirname, "../../..");

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildServer();
});

afterAll(async () => {
  await prisma().operazione.deleteMany({ where: { origine: { not: "seed" } } });
  await app.close();
  await disconnect();
});

interface RispostaChat {
  testo: string;
  strumentiUsati: { nome: string; risultato: string }[];
}

async function chat(messaggio: string, giorno: string): Promise<RispostaChat> {
  const risposta = await app.inject({
    method: "POST",
    url: "/chat",
    payload: { messaggio, giorno },
  });
  expect(risposta.statusCode).toBe(200);
  return risposta.json() as RispostaChat;
}

describe("Gate 5 — la demo regge dall'inizio alla fine", () => {
  it("parte da uno stato pulito e con la data congelata", async () => {
    await app.inject({ method: "POST", url: "/regia/reset" });

    const salute = await app.inject({ method: "GET", url: "/health" });
    expect(salute.json()).toEqual({ status: "ok", demoDate: "2026-08-09" });
    expect(await prisma().operazione.count()).toBe(36);
  });

  it.skipIf(!chiaveDisponibile())("scenario 1: apre da sola il 9 agosto", async () => {
    const risposta = await app.inject({ method: "GET", url: "/chat/proattivo?giorno=2026-08-09" });
    const apertura = risposta.json() as { messaggio: string | null; alert: unknown[] };
    expect(apertura.messaggio).not.toBeNull();
    expect(apertura.alert.length).toBeGreaterThan(0);
  });

  it.skipIf(!chiaveDisponibile())("scenario 2: la frase parlata diventa quaderno", async () => {
    const risposta = await chat("ho dato zolfo e rame stamattina su tutto", "2026-08-09");
    expect(risposta.strumentiUsati.map((uso) => uso.nome)).toContain("registra_operazione");
    expect(await prisma().operazione.count()).toBeGreaterThan(36);

    await app.inject({ method: "POST", url: "/regia/reset" });
  });

  it.skipIf(!chiaveDisponibile())("scenario 3: i millimetri dell'11 maggio", async () => {
    const risposta = await chat("ha piovuto stanotte, sono ancora coperto?", "2026-05-11");
    expect(risposta.strumentiUsati.map((uso) => uso.nome)).toContain("verifica_dilavamento");
    expect(risposta.testo).toMatch(/22[,.]3|22 mm/);
  });

  it.skipIf(!chiaveDisponibile())("scenario 4: una finestra, mai una data", async () => {
    const risposta = await chat("quando vedrò i sintomi di questa macchia?", "2026-08-09");
    expect(risposta.testo.length).toBeGreaterThan(30);
  });

  it.skipIf(!chiaveDisponibile())("scenario 5: il terzo Revysion si ferma prima", async () => {
    const risposta = await chat("posso dare Revysion oggi?", "2026-06-04");
    const conformita = risposta.strumentiUsati.find((uso) => uso.nome === "verifica_conformita");
    expect(conformita?.risultato).toContain("3a applicazione");
    expect(await prisma().operazione.count()).toBe(36);
  });

  it("esporta il quaderno e dichiara il magazzino simulato", async () => {
    const pdf = await app.inject({ method: "GET", url: "/quaderno/pdf?fino=2026-08-09" });
    expect(pdf.headers["content-type"]).toContain("application/pdf");
    expect(pdf.rawPayload.byteLength).toBeGreaterThan(3000);

    const magazzino = await app.inject({
      method: "GET",
      url: "/quaderno/magazzino?fino=2026-08-09",
    });
    const voci = magazzino.json() as { simulato: boolean }[];
    expect(voci.length).toBeGreaterThan(0);
    expect(voci.every((voce) => voce.simulato)).toBe(true);
  });
});

describe("Gate 5 — gli asset del pacchetto esistono", () => {
  it("il copione copre i cinque scenari nell'ordine della registrazione", async () => {
    const copione = await readFile(resolve(RADICE, "docs/copione-video.md"), "utf8");
    const ordine = [
      "1. Alert proattivo",
      "2. Registrazione da nota vocale",
      "3. Dilavamento",
      "4. Finestra di comparsa sintomi",
      "5. Conformità e quaderno di campagna",
    ];
    let cursore = -1;
    for (const titolo of ordine) {
      const posizione = copione.indexOf(titolo);
      expect(posizione, titolo).toBeGreaterThan(cursore);
      cursore = posizione;
    }
    expect(copione).toContain("DEMO_FREEZE_DATE=2026-08-09");
  });

  it("il report apre sui rilievi e chiude sulle richieste", async () => {
    const report = await readFile(resolve(RADICE, "docs/report-basf.md"), "utf8");
    const slide = report.match(/^## Slide \d+ — .+$/gm) ?? [];
    expect(slide.length).toBeGreaterThanOrEqual(6);
    expect(slide.length).toBeLessThanOrEqual(8);
    expect(slide[0]).toContain("Quanto costa un campo compilato a mano");
    expect(slide.at(-1)).toContain("Cosa ci serve da voi");
  });

  it("ogni anomalia del dataset è citata nel report", async () => {
    const report = await readFile(resolve(RADICE, "docs/report-basf.md"), "utf8");
    for (const riferimento of ["BBCH 105", "Folpan 80 WDG", "Vivando", "Camplan SC", "19119"]) {
      expect(report, riferimento).toContain(riferimento);
    }
  });

  it("il report non richiede più le serie numeriche e assorbe la rimozione del campo fenologia", async () => {
    const report = await readFile(resolve(RADICE, "docs/report-basf.md"), "utf8");
    // BASF ha dichiarato l'11/08 che le serie numeriche non esistono: richiederle costa credibilità
    expect(report).not.toMatch(/^\| 1 \| Serie numeriche/m);
    expect(report).toContain("Il campo che state per togliere");
    expect(report).toContain("9 giugno");
  });
});
