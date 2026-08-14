import { existsSync, readFileSync } from "node:fs";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { MockAgrigeniusAdapter } from "@basf/adapter";
import { SOGLIA_PROTEZIONE_PCT } from "@basf/core";
import { disconnect } from "@basf/db";

import { leggiSerie } from "./archivio.js";
import { eseguiPipelineCurve } from "./pipeline.js";
import { valoreProtezione } from "./ricostruzione.js";
import { GRAFICI, immagineDisponibile } from "./vision.js";
import { validaEstrazione } from "./validazione.js";

const APPEZZAMENTO = "vidor-cal-nova";
let esito: Awaited<ReturnType<typeof eseguiPipelineCurve>>;

beforeAll(async () => {
  // Due passate: la pipeline deve essere idempotente come il seed.
  await eseguiPipelineCurve({ appezzamentoId: APPEZZAMENTO, fino: "2026-08-23", conVision: false });
  esito = await eseguiPipelineCurve({
    appezzamentoId: APPEZZAMENTO,
    fino: "2026-08-23",
    conVision: false,
  });
});

afterAll(async () => {
  await disconnect();
});

describe("Gate 1 — curve di protezione", () => {
  it("copre il buco fra l'ultimo trattamento e la data della demo", async () => {
    const adapter = new MockAgrigeniusAdapter();
    const protezione = await adapter.getProtezione("2026-08-09", "oidio");

    expect(protezione.ultimoTrattamento).toBe("2026-08-01");
    expect(protezione.percentuale).not.toBeNull();
    expect(protezione.sottoSoglia).toBe(true);
    expect(protezione.percentuale!).toBeLessThan(SOGLIA_PROTEZIONE_PCT);
    // Il numero è nostro, non di BASF, e l'agente deve poterlo dire.
    expect(protezione.fonte).toBe("ricostruzione");
  });

  it("riparte dal 100% il giorno del trattamento", () => {
    expect(valoreProtezione(0, 7)).toBe(100);
    expect(valoreProtezione(7, 7)).toBe(SOGLIA_PROTEZIONE_PCT);
    expect(valoreProtezione(8, 7)).toBeLessThan(SOGLIA_PROTEZIONE_PCT);
  });

  it("non ricostruisce nulla dove l'intervallo ditta non è dichiarato", async () => {
    const adapter = new MockAgrigeniusAdapter();
    const maggio = await adapter.getProtezione("2026-05-12", "peronospora");
    expect(maggio.percentuale).toBeNull();
    expect(maggio.statoDss).toBe("sufficiente");
  });

  it("lascia intatti i punti di ancoraggio dichiarati da BASF", async () => {
    const adapter = new MockAgrigeniusAdapter();
    const alTrattamento = await adapter.getProtezione("2026-08-01", "oidio");
    expect(alTrattamento.percentuale).toBe(100);
    expect(alTrattamento.fonte).toBe("basf_grafico_ancoraggio");
  });
});

describe("Gate 1 — curva fenologica", () => {
  it("mostra la progressione che il quaderno tiene ferma su BBCH 105", async () => {
    const adapter = new MockAgrigeniusAdapter();
    const fenologia = await adapter.getFenologia("2026-05-18");

    expect(fenologia.bbchDichiaratoUtente).toBe(105);
    expect(fenologia.bbch).toBe(114);
    expect(fenologia.numeroFoglie).toBe(14);
    expect(fenologia.fonte).toBe("ricostruzione");
  });

  it("resta sul dato del quaderno fuori dalla finestra ricostruita", async () => {
    const fenologia = await new MockAgrigeniusAdapter().getFenologia("2026-08-09");
    expect(fenologia.bbch).toBe(81);
  });
});

describe("Gate 1 — tracciabilità e validazione", () => {
  it("scrive una serie per file in data/curves con la fonte dichiarata", () => {
    const serie = leggiSerie();
    expect(serie.length).toBeGreaterThanOrEqual(4);
    expect(serie.every((curva) => curva.fonte.length > 0)).toBe(true);
    expect(serie.every((curva) => curva.punti.length > 0)).toBe(true);
  });

  it("produce il report di accuratezza contro i tooltip del PPT e il riscontro di campo", async () => {
    expect(existsSync(esito.reportAccuratezza)).toBe(true);
    const contenuto = readFileSync(esito.reportAccuratezza, "utf8");
    expect(contenuto).toContain("Accuratezza dell'estrazione");

    const esiti = await validaEstrazione(APPEZZAMENTO);
    // Cinque tooltip di Marano più il sintomo osservato su Vidor il 9 giugno.
    expect(esiti).toHaveLength(6);
    expect(esiti.some((voce) => voce.serie === "sintomo_peronospora_osservato")).toBe(true);
    // Senza i PNG e senza export BASF nessun tooltip è coperto: va detto, non nascosto.
    expect(esiti.every((voce) => voce.ottenuto === null)).toBe(true);
    // L'export numerico non è più una richiesta: BASF l'ha dichiarato impossibile l'11/08.
    expect(contenuto).not.toContain("richiesta numero 1");
    expect(contenuto).toContain("sandbox");
  });

  it("dichiara quali grafici mancano invece di fingere di averli letti", () => {
    const attese = GRAFICI.filter((spec) => !immagineDisponibile(spec.file)).map(
      (spec) => spec.file,
    );
    expect(esito.immaginiMancanti).toEqual(attese);
    expect(esito.serieVision).toHaveLength(GRAFICI.length - attese.length);
  });
});
