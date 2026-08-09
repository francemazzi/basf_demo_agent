import { afterAll, describe, expect, it } from "vitest";

import { MockAgrigeniusAdapter } from "@basf/adapter";
import { today } from "@basf/core";
import { disconnect, prisma } from "@basf/db";
import { chiaveDisponibile } from "@basf/llm";

import { rispondi } from "./grafo.js";
import { valutaAperturaProattiva } from "./proattivo.js";

const attivo = chiaveDisponibile();
const adapter = new MockAgrigeniusAdapter();

afterAll(async () => {
  await prisma().operazione.deleteMany({ where: { origine: { not: "seed" } } });
  await disconnect();
});

describe.skipIf(!attivo)("Gate 3 — grafo dell'agente", () => {
  it("consulta il modello invece di rispondere a memoria", async () => {
    const risposta = await rispondi("sono ancora coperto per l'oidio?", { adapter });

    expect(risposta.strumentiUsati.map((uso) => uso.nome)).toContain("consulta_dss");
    expect(risposta.testo.length).toBeGreaterThan(10);
    // Si legge su un telefono: niente elenchi puntati.
    expect(risposta.testo).not.toMatch(/^\s*[-*•]\s/m);
  });

  it("rispetta la data congelata della demo", async () => {
    const risposta = await rispondi("che giorno è oggi per te?", { adapter });
    expect(risposta.testo).toMatch(/9|nove/i);
    expect(today()).toBe("2026-08-09");
  });

  it("risponde sulla pioggia usando lo strumento del dilavamento", async () => {
    const risposta = await rispondi("ha piovuto stanotte, sono ancora coperto?", {
      adapter,
      giorno: "2026-05-11",
    });

    const usati = risposta.strumentiUsati.map((uso) => uso.nome);
    expect(usati).toContain("verifica_dilavamento");
    const dilavamento = risposta.strumentiUsati.find(
      (uso) => uso.nome === "verifica_dilavamento",
    );
    expect(dilavamento?.risultato).toContain("22.3");
  });

  it("registra il trattamento derivando superficie e BBCH senza chiederli", async () => {
    const risposta = await rispondi("ho dato zolfo e rame stamattina su tutto", {
      adapter,
      giorno: "2026-08-09",
    });

    const registrazione = risposta.strumentiUsati.find(
      (uso) => uso.nome === "registra_operazione",
    );
    expect(registrazione, "l'agente non ha registrato nulla").toBeDefined();

    const esito = JSON.parse(registrazione!.risultato) as {
      haTrattati?: number;
      bbchDerivato?: number;
      prodotti?: string[];
      richiestaChiarimento?: string;
    };
    expect(esito.richiestaChiarimento).toBeUndefined();
    expect(esito.haTrattati).toBe(0.699);
    expect(esito.bbchDerivato).toBe(81);
    // "zolfo" e "rame" risolti sui prodotti che l'utente usa davvero.
    expect(esito.prodotti).toEqual(["Kumulus tecno", "Kauritil Tri Hi Bio"]);
    // Superficie e fase non si chiedono: sono già nel contesto.
    expect(risposta.testo).not.toMatch(/quanti ettari/i);
  });

  it("controlla la conformità prima di confermare Revysion", async () => {
    const risposta = await rispondi("devo dare Revysion oggi, posso?", {
      adapter,
      giorno: "2026-06-04",
    });

    const conformita = risposta.strumentiUsati.find((uso) => uso.nome === "verifica_conformita");
    expect(conformita?.risultato).toContain("Revysol");
  });
});

describe.skipIf(!attivo)("Gate 3 — apertura proattiva", () => {
  it("apre la conversazione quando la protezione scende sotto soglia", async () => {
    const apertura = await valutaAperturaProattiva({ giorno: "2026-08-09", adapter });

    expect(apertura).not.toBeNull();
    expect(apertura!.alert.map((voce) => voce.avversita)).toContain("oidio");
    expect(apertura!.messaggio.length).toBeGreaterThan(20);
    expect(apertura!.messaggio).not.toMatch(/^\s*[-*•]\s/m);
  });

  it("resta zitta quando non c'è niente da dire", async () => {
    const apertura = await valutaAperturaProattiva({ giorno: "2026-05-12", adapter });
    expect(apertura).toBeNull();
  });
});
