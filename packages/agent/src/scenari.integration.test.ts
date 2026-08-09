import { deflateSync } from "node:zlib";

import { afterAll, describe, expect, it } from "vitest";

import { MockAgrigeniusAdapter } from "@basf/adapter";
import { disconnect, prisma } from "@basf/db";
import { conteggiConformita } from "@basf/kb";
import { chiaveDisponibile } from "@basf/llm";
import { esportaQuadernoPdf, righeQuaderno, statoMagazzino } from "@basf/quaderno";

import { rispondi } from "./grafo.js";
import { valutaAperturaProattiva } from "./proattivo.js";

const APPEZZAMENTO = "vidor-cal-nova";
const adapter = new MockAgrigeniusAdapter();
const conLlm = chiaveDisponibile();

afterAll(async () => {
  await prisma().operazione.deleteMany({ where: { origine: { not: "seed" } } });
  await disconnect();
});

function senzaElenchi(testo: string) {
  expect(testo).not.toMatch(/^\s*[-*•]\s/m);
}

// Scenario 3 — Dilavamento
describe("Scenario 3 — dilavamento", () => {
  it("misura i 22,3 mm caduti l'11 maggio dopo il trattamento del 10", async () => {
    const esito = await adapter.getDilavamento("2026-05-11", "peronospora");
    expect(esito.ultimoTrattamento).toBe("2026-05-10");
    expect(esito.pioggiaCumulataMm).toBe(22.3);
    expect(esito.prodotti).toContain("Ridomil Gold Combi WG");
    // Non si dichiara un dilavamento che l'etichetta non conferma.
    expect(esito.superata).toBeNull();
  });

  it("regge anche sull'evento alternativo del 4 maggio", async () => {
    const esito = await adapter.getDilavamento("2026-05-06", "peronospora");
    expect(esito.ultimoTrattamento).toBe("2026-05-04");
    expect(esito.pioggiaCumulataMm).toBe(34.8);
  });

  it.skipIf(!conLlm)("risponde con i millimetri e una raccomandazione, non con un sì secco", async () => {
    const risposta = await rispondi("ha piovuto stanotte, sono ancora coperto?", {
      adapter,
      giorno: "2026-05-11",
    });

    expect(risposta.strumentiUsati.map((uso) => uso.nome)).toContain("verifica_dilavamento");
    expect(risposta.testo).toMatch(/22[,.]3|22 mm/);
    expect(risposta.testo.length).toBeGreaterThan(40);
    senzaElenchi(risposta.testo);
  });
});

// Scenario 5 — Conformità e quaderno
describe("Scenario 5 — conformità e quaderno di campagna", () => {
  it("segnala le nove applicazioni con dithianon", async () => {
    const conteggi = await conteggiConformita("2026-08-01");
    const dithianon = conteggi.find((voce) => voce.chiave === "Dithianon");
    expect(dithianon?.nApplicazioni).toBe(9);
  });

  it("evidenzia le violazioni nel PDF prima delle righe di quaderno", async () => {
    const pdf = await esportaQuadernoPdf(APPEZZAMENTO, "2026-08-09");
    const testo = Buffer.from(pdf).toString("latin1");
    expect(testo.slice(0, 8)).toContain("PDF-1");
    expect(pdf.byteLength).toBeGreaterThan(3000);

    const righe = await righeQuaderno(APPEZZAMENTO, "2026-08-09");
    const revysion = righe.find((riga) => riga.id === "2026-06-04-03");
    expect(revysion?.violazioni.some((v) => v.chiave.startsWith("Revysol"))).toBe(true);

    const deltametrina = righe.find((riga) => riga.id === "2026-07-20-01");
    expect(deltametrina?.violazioni.some((v) => v.tipo === "gruppo_moa" && v.chiave === "3")).toBe(
      true,
    );
  });

  it("dichiara il magazzino come simulato", async () => {
    const magazzino = await statoMagazzino("2026-08-09");
    expect(magazzino.every((voce) => voce.simulato)).toBe(true);
    const kumulus = magazzino.find((voce) => voce.nomeCommerciale === "Kumulus tecno");
    expect(kumulus?.consumato).toBe(2.8);
  });

  it.skipIf(!conLlm)("intercetta il terzo Revysion prima di confermare", async () => {
    const risposta = await rispondi("posso dare Revysion oggi?", {
      adapter,
      giorno: "2026-06-04",
    });

    const conformita = risposta.strumentiUsati.find((uso) => uso.nome === "verifica_conformita");
    expect(conformita?.risultato).toContain("3a applicazione");
    // Nessuna registrazione: era una domanda, non un fatto compiuto.
    expect(risposta.strumentiUsati.map((uso) => uso.nome)).not.toContain("registra_operazione");
  });
});

// Scenario 2 — Registrazione da nota vocale
describe.skipIf(!conLlm)("Scenario 2 — registrazione da nota vocale", () => {
  // Questo scenario scrive nel quaderno: gli altri devono ripartire dal caso studio.
  afterAll(async () => {
    await prisma().operazione.deleteMany({ where: { origine: { not: "seed" } } });
  });

  it("riconosce i due prodotti, deriva superficie e BBCH, conferma in una riga", async () => {
    await prisma().operazione.deleteMany({ where: { origine: { not: "seed" } } });

    const risposta = await rispondi("ho dato zolfo e rame stamattina su tutto", {
      adapter,
      giorno: "2026-08-09",
    });

    const registrazione = risposta.strumentiUsati.find(
      (uso) => uso.nome === "registra_operazione",
    );
    const esito = JSON.parse(registrazione!.risultato) as {
      prodotti: string[];
      haTrattati: number;
      bbchDerivato: number;
      righe: { avversita: string }[];
    };

    expect(esito.prodotti).toEqual(["Kumulus tecno", "Kauritil Tri Hi Bio"]);
    expect(esito.haTrattati).toBe(0.699);
    expect(esito.bbchDerivato).toBe(81);
    expect(esito.righe.map((riga) => riga.avversita)).toEqual(["Oidio", "Peronospora"]);
    senzaElenchi(risposta.testo);
  });

  it("mostra il prima e il dopo sul BBCH congelato", async () => {
    const fenologia = await adapter.getFenologia("2026-05-18");
    expect(fenologia.bbchDichiaratoUtente).toBe(105);
    expect(fenologia.bbch).toBe(114);
  });
});

// Scenario 1 — Alert proattivo
describe.skipIf(!conLlm)("Scenario 1 — alert proattivo", () => {
  it("scrive per primo il 9 agosto con protezione sotto soglia e BBCH 81", async () => {
    const apertura = await valutaAperturaProattiva({ giorno: "2026-08-09", adapter });
    expect(apertura).not.toBeNull();

    const protezione = await adapter.getProtezione("2026-08-09", "oidio");
    expect(protezione.sottoSoglia).toBe(true);
    expect(protezione.giorniDaUltimoTrattamento).toBe(8);
    expect((await adapter.getFenologia("2026-08-09")).bbch).toBe(81);

    senzaElenchi(apertura!.messaggio);
    expect(apertura!.messaggio.length).toBeLessThan(600);
  });
});

// Scenario 4 — Finestra di comparsa sintomi
describe("Scenario 4 — finestra di comparsa sintomi", () => {
  it("restituisce una finestra con i fattori di incertezza e il dato di Marano", async () => {
    const finestra = await adapter.getFinestraSintomi("2026-04-25", "oidio");
    expect(finestra.da).not.toBe(finestra.a);
    expect(finestra.fattoriIncertezza.length).toBeGreaterThanOrEqual(2);
    expect(finestra.validazioneNota).toContain("28");
    expect(finestra.fonte).toBeNull();
  });

  it.skipIf(!conLlm)("accetta la foto del sintomo e non spara una data secca", async () => {
    const risposta = await rispondi(
      "ti mando la foto di una macchia sulla foglia, quando vedrò i sintomi?",
      { adapter, giorno: "2026-08-09", immagineDataUrl: pngDiProva() },
    );

    expect(risposta.testo.length).toBeGreaterThan(30);
    senzaElenchi(risposta.testo);
  });
});

/**
 * PNG generato al volo: le foto reali dei sintomi su Vidor sono la richiesta n.2
 * a BASF. Qui serve solo a verificare che il percorso multimodale regga.
 */
function pngDiProva(): string {
  const lato = 48;
  const righe: number[] = [];
  for (let y = 0; y < lato; y += 1) {
    righe.push(0);
    for (let x = 0; x < lato; x += 1) {
      const macchia = (x - 24) ** 2 + (y - 24) ** 2 < 90;
      righe.push(...(macchia ? [122, 74, 32] : [88, 132, 62]));
    }
  }

  const blocco = (tipo: string, dati: Buffer) => {
    const nome = Buffer.from(tipo, "ascii");
    const corpo = Buffer.concat([nome, dati]);
    const lunghezza = Buffer.alloc(4);
    lunghezza.writeUInt32BE(dati.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(corpo));
    return Buffer.concat([lunghezza, corpo, crc]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(lato, 0);
  ihdr.writeUInt32BE(lato, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;

  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    blocco("IHDR", ihdr),
    blocco("IDAT", deflateSync(Buffer.from(righe))),
    blocco("IEND", Buffer.alloc(0)),
  ]);

  return `data:image/png;base64,${png.toString("base64")}`;
}

function crc32(dati: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of dati) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
