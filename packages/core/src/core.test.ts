import { describe, expect, it } from "vitest";

import { num, parseCsv, pipeList, str } from "./csv.js";
import { parseAvversita } from "./domain.js";
import { parseStatoDss, statoDssCopertoAlMomento } from "./dss.js";
import { addDays, diffDays, parseDay, today, toDay } from "./time.js";

describe("data congelata della demo", () => {
  it("legge il giorno da DEMO_FREEZE_DATE", () => {
    expect(today()).toBe(process.env.DEMO_FREEZE_DATE ?? "2026-08-09");
  });

  it("rifiuta una data che non sia ISO", () => {
    expect(() => parseDay("09/08/2026")).toThrow(/non ISO/);
  });

  it("conta i giorni fra trattamento e oggi senza sorprese da fuso orario", () => {
    expect(diffDays(parseDay("2026-08-01"), parseDay("2026-08-09"))).toBe(8);
    expect(toDay(addDays(parseDay("2026-02-28"), 1))).toBe("2026-03-01");
  });
});

describe("lettura dei CSV del caso studio", () => {
  it("regge virgole e virgolette dentro il campo", () => {
    const righe = parseCsv('a,b\n1,"testo, con virgola"\n');
    expect(righe).toEqual([{ a: "1", b: "testo, con virgola" }]);
  });

  it("tiene le virgolette raddoppiate", () => {
    expect(parseCsv('nota\n"lui ha detto ""sì"""\n')[0]!.nota).toBe('lui ha detto "sì"');
  });

  it("salta le righe vuote in coda al file", () => {
    expect(parseCsv("a\n1\n\n\n")).toHaveLength(1);
  });

  it("distingue la cella vuota dallo zero", () => {
    expect(num("")).toBeNull();
    expect(num("0")).toBe(0);
    expect(str("  ")).toBeNull();
    expect(pipeList("dithianon | folpet")).toEqual(["dithianon", "folpet"]);
  });
});

describe("indicazione DSS", () => {
  it("riconosce i quattro stati dalle frasi originali di Agrigenius", () => {
    expect(
      parseStatoDss("La protezione è sufficiente e lo resterà nei prossimi giorni"),
    ).toBe("sufficiente");
    expect(parseStatoDss("La protezione non è sufficiente per le infezioni previste")).toBe(
      "insufficiente_con_infezioni",
    );
    expect(parseStatoDss("La copertura è in calo ma non sono previste infezioni")).toBe(
      "insufficiente_senza_infezioni",
    );
    expect(parseStatoDss("Rimane una copertura parziale")).toBe("parziale_con_infezioni");
  });

  it("non inventa uno stato quando la cella è vuota o sconosciuta", () => {
    expect(parseStatoDss("")).toBeNull();
    expect(parseStatoDss("commento libero dell'utente")).toBeNull();
  });

  it("considera coperto solo lo stato sufficiente", () => {
    expect(statoDssCopertoAlMomento("sufficiente")).toBe(true);
    expect(statoDssCopertoAlMomento("parziale_con_infezioni")).toBe(false);
  });
});

describe("avversità", () => {
  it("normalizza le etichette del quaderno", () => {
    expect(parseAvversita("Peronospora")).toBe("peronospora");
    expect(parseAvversita("concimazione")).toBeNull();
  });
});
