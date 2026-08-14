import { describe, expect, it } from "vitest";

import {
  bollettinoVigente,
  cercaNeiBollettini,
  riferimentoGlera,
  sezione,
  tuttiBollettini,
} from "./bollettini.js";

describe("bollettini fitosanitari della Regione del Veneto", () => {
  it("carica la stagione 2026 della vite in ordine di data", () => {
    const bollettini = tuttiBollettini();
    expect(bollettini.length).toBeGreaterThanOrEqual(14);
    expect(bollettini.every((b) => b.coltura === "vite")).toBe(true);
    expect(bollettini.every((b) => b.testo.length > 1000)).toBe(true);

    const date = bollettini.map((b) => b.data);
    expect([...date].sort()).toEqual(date);
  });

  it("restituisce l'ultimo bollettino emesso, mai uno pubblicato dopo i fatti", () => {
    // Il bollettino n.10 esce il 10 giugno: il 9 l'agricoltore aveva ancora il n.9.
    expect(bollettinoVigente("2026-06-09")?.numero).toBe(9);
    expect(bollettinoVigente("2026-06-10")?.numero).toBe(10);
    expect(bollettinoVigente("2026-01-15")).toBeNull();
  });

  it("dà un riferimento fenologico terzo sulla Glera, con entrambi gli estremi", () => {
    const aprile = riferimentoGlera("2026-04-30");
    expect(aprile?.tardivi).toBe("15-55");

    // Il 18 maggio il quaderno è ancora fermo sulla 5a foglia: il bollettino
    // del 13 maggio colloca la Glera già in fioritura anche negli ambienti tardivi.
    const maggio = riferimentoGlera("2026-05-18");
    expect(maggio?.bollettino).toBe(6);
    expect(maggio?.tardivi).toBe("57-61");
    expect(maggio?.url).toContain("regione.veneto.it");
  });

  it("isola le sezioni del bollettino", () => {
    const decimo = tuttiBollettini().find((b) => b.numero === 10)!;

    const fenologia = sezione(decimo, "Fase fenologica");
    expect(fenologia).toContain("Glera");

    const parassiti = sezione(decimo, "Stato parassitario");
    expect(parassiti).toContain("Peronospora");
    expect(parassiti).not.toContain("Andamento meteo");
  });

  it("trova la conferma indipendente dei sintomi di peronospora di inizio giugno", () => {
    const conMacchieDolio = cercaNeiBollettini("macchie d");
    expect(conMacchieDolio.some((b) => b.numero === 10)).toBe(true);
  });
});
