import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { now, today } from "@basf/core";
import { disconnect, prisma } from "@basf/db";

import { resetScrittureNonSeed, runSeed } from "./index.js";

const db = prisma();

describe("Gate 0 — scaffolding e seed", () => {
  beforeAll(async () => {
    await resetScrittureNonSeed();
    // Idempotenza: due passate consecutive non devono duplicare nulla.
    await runSeed();
    await runSeed();
  });

  afterAll(async () => {
    await disconnect();
  });

  it("carica i conteggi attesi dal caso studio", async () => {
    expect(await db.appezzamento.count()).toBe(1);
    expect(await db.meteoGiornaliero.count()).toBe(219);
    expect(await db.operazione.count()).toBe(36);
    expect(await db.operazioneProdotto.count()).toBe(36);
    expect(await db.principioAttivo.count()).toBe(42);
    expect(await db.fertilizzazione.count()).toBe(5);
    // Solo gli ancoraggi del CSV: le curve ricostruite arrivano dalla Fase 1.
    expect(await db.curvaDss.count({ where: { fonte: "BASF_GRAFICO_ANCORAGGIO" } })).toBe(26);
    expect(await db.prodottoKb.count()).toBe(22);
  });

  it("rispetta DEMO_FREEZE_DATE invece dell'orologio di sistema", () => {
    expect(today()).toBe("2026-08-09");
    expect(now().toISOString()).toBe("2026-08-09T00:00:00.000Z");
  });

  it("non scrive zero dove il dato meteo è assente", async () => {
    const senzaVento = await db.meteoGiornaliero.count({
      where: { ventoVelocitaMs: null, giorno: { lt: new Date("2026-03-24T00:00:00.000Z") } },
    });
    expect(senzaVento).toBe(82);
    const ventoAZero = await db.meteoGiornaliero.count({
      where: { ventoVelocitaMs: 0, giorno: { lt: new Date("2026-03-24T00:00:00.000Z") } },
    });
    expect(ventoAZero).toBe(0);
  });

  it("marca le anomalie senza correggerle", async () => {
    const bbchCongelato = await db.operazione.count({
      where: { anomalie: { has: "bbch_congelato" } },
    });
    expect(bbchCongelato).toBe(29);

    const avversitaErrata = await db.operazione.findMany({
      where: { anomalie: { has: "avversita_errata" } },
      include: { prodotti: true },
    });
    expect(avversitaErrata).toHaveLength(2);
    for (const operazione of avversitaErrata) {
      expect(operazione.avversita).toBe("Oidio");
      expect(operazione.prodotti[0]?.nomeCommerciale).toBe("Folpan 80 WDG");
    }

    const fertilizzazioni = await db.fertilizzazione.findMany();
    expect(fertilizzazioni.every((f) => f.anomalie.includes("tipo_operazione_errato"))).toBe(true);
    // L'anomalia è marcata ma il valore originale resta quello che ha scritto BASF.
    expect(
      fertilizzazioni.every(
        (f) => f.tipoOperazioneDichiarato === "Trattamento di difesa / Fitoregolatori",
      ),
    ).toBe(true);
  });

  it("decodifica il separatore pipe dei principi attivi", async () => {
    const delanPro = await db.operazioneProdotto.findFirst({
      where: { nomeCommerciale: "Delan Pro" },
      include: { principiAttivi: true },
    });
    expect(delanPro?.principiAttivi.map((p) => p.codiceMoa).sort()).toEqual(["MS", "P7"]);
  });

  it("conserva lo stato DSS categorico dichiarato da BASF", async () => {
    const conStato = await db.operazione.count({ where: { statoDss: { not: null } } });
    expect(conStato).toBe(29);
    // 20 luglio e 1 agosto sono le due date senza indicazione: è la richiesta n.1 a BASF.
    const scoperte = await db.operazione.findMany({
      where: { statoDss: null, avversita: { in: ["Oidio", "Peronospora"] } },
      select: { data: true },
      distinct: ["data"],
      orderBy: { data: "asc" },
    });
    expect(scoperte.map((o) => o.data.toISOString().slice(0, 10))).toEqual([
      "2026-07-20",
      "2026-08-01",
    ]);
  });
});
