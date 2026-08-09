import { afterAll, describe, expect, it } from "vitest";

import { num, pipeList, readSeedCsv } from "@basf/core";
import { disconnect } from "@basf/db";

import { conteggiConformita, verificaConformita } from "./conformita.js";
import { pioggiaDopoTrattamento } from "./dilavamento.js";
import { cercaProdotti, prodottoPerRegistrazione, tuttiProdotti } from "./prodotti.js";

const APPEZZAMENTO = "vidor-cal-nova";

afterAll(async () => {
  await disconnect();
});

describe("Gate 2 — conformità", () => {
  it("ricalcola dal database gli stessi conteggi del CSV derivato", async () => {
    const attesi = readSeedCsv("conteggi_conformita.csv");
    const calcolati = await conteggiConformita("2026-08-01");

    expect(calcolati).toHaveLength(attesi.length);

    for (const atteso of attesi) {
      const calcolato = calcolati.find(
        (voce) => voce.tipo === atteso.tipo && voce.chiave === atteso.chiave,
      );
      expect(calcolato, `manca ${atteso.tipo} ${atteso.chiave}`).toBeDefined();
      expect(calcolato!.nApplicazioni).toBe(num(atteso.n_date_applicazione));
      expect(calcolato!.date).toEqual(pipeList(atteso.date));
    }
  });

  it("non dichiara limiti di etichetta che nessuno ha ancora verificato", async () => {
    const conteggi = await conteggiConformita("2026-08-01");
    expect(conteggi.every((voce) => voce.limiteEtichetta === null)).toBe(true);
    expect(conteggi.every((voce) => voce.limiteVerificato === false)).toBe(true);
  });

  it("intercetta la terza applicazione di Revysol prima della conferma", async () => {
    const violazioni = await verificaConformita({
      giorno: "2026-06-04",
      numeroRegistrazione: "18137",
    });
    const revysol = violazioni.find((v) => v.chiave.startsWith("Revysol"));
    expect(revysol?.applicazioniConteggiate).toBe(3);
    expect(revysol?.gravita).toBe("attenzione");
    expect(revysol?.limiteEtichetta).toBeNull();
    expect(revysol?.messaggio).toContain("da verificare");

    const gruppoG1 = violazioni.find((v) => v.tipo === "gruppo_moa" && v.chiave === "G1");
    expect(gruppoG1?.applicazioniConteggiate).toBe(3);
  });

  it("intercetta il secondo piretroide IRAC 3 della stagione", async () => {
    const violazioni = await verificaConformita({
      giorno: "2026-07-20",
      numeroRegistrazione: "15059",
    });
    const irac3 = violazioni.find((v) => v.tipo === "gruppo_moa" && v.chiave === "3");
    expect(irac3?.applicazioniConteggiate).toBe(2);
    expect(irac3?.date).toEqual(["2026-06-23", "2026-07-20"]);
  });

  it("aggrega il dithianon delle due registrazioni Envita", async () => {
    const conteggi = await conteggiConformita("2026-08-01");
    const dithianon = conteggi.find((v) => v.chiave === "Dithianon");
    expect(dithianon?.nApplicazioni).toBe(9);
  });
});

describe("Gate 2 — dilavamento", () => {
  it("ricalcola la pioggia post trattamento come nel CSV derivato", async () => {
    const attesi = readSeedCsv("pioggia_post_trattamento.csv");
    for (const riga of attesi) {
      const data = riga.data_trattamento!;
      for (const [giorni, colonna] of [
        [1, "pioggia_1g_mm"],
        [2, "pioggia_2g_mm"],
        [3, "pioggia_3g_mm"],
        [7, "pioggia_7g_mm"],
      ] as const) {
        const calcolata = await pioggiaDopoTrattamento(APPEZZAMENTO, data, giorni);
        expect(calcolata, `${data} a ${giorni} giorni`).toBeCloseTo(num(riga[colonna])!, 1);
      }
    }
  });
});

describe("Gate 2 — knowledge base prodotti", () => {
  it("carica i 22 prodotti del caso studio", async () => {
    const prodotti = await tuttiProdotti();
    expect(prodotti).toHaveLength(22);
  });

  it("tiene solo i due intervalli ditta letti nei grafici", async () => {
    const conIntervallo = (await tuttiProdotti()).filter((p) => p.intervalloDitta !== null);
    expect(conIntervallo.map((p) => p.nomeCommerciale).sort()).toEqual([
      "Kauritil Tri Hi Bio",
      "Kumulus tecno",
    ]);
    expect(conIntervallo.every((p) => p.intervalloFonte === "grafico_basf")).toBe(true);
  });

  it("marca come non verificati tutti i limiti di etichetta", async () => {
    const prodotti = await tuttiProdotti();
    expect(prodotti.every((p) => p.limitiVerificati === false)).toBe(true);
    expect(prodotti.every((p) => p.maxApplicazioniStagione === null)).toBe(true);
  });

  it("trova il prodotto dal nome parlato e dal principio attivo", async () => {
    expect((await cercaProdotti("kumulus"))[0]?.numeroRegistrazione).toBe("10048");
    const perPrincipio = await cercaProdotti("solfato di rame");
    expect(perPrincipio.map((p) => p.nomeCommerciale)).toContain("Kauritil Tri Hi Bio");
  });

  it("conserva l'anomalia del codice MOA mancante su Vivando", async () => {
    const vivando = await prodottoPerRegistrazione("13698");
    expect(vivando?.codiciMoa).toEqual([]);
  });
});
