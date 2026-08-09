import { describe, expect, it } from "vitest";

import type { AgrigeniusAdapter } from "@basf/core";

/**
 * Stessa suite per il mock e per l'implementazione HTTP: l'agente non deve
 * accorgersi di quale delle due sta usando.
 */
export function suiteContrattoAdapter(nome: string, creaAdapter: () => AgrigeniusAdapter): void {
  describe(`contratto adapter — ${nome}`, () => {
    it("dichiara lo stato di protezione all'ultimo intervento noto", async () => {
      const protezione = await creaAdapter().getProtezione("2026-05-12", "peronospora");
      expect(protezione.avversita).toBe("peronospora");
      expect(protezione.ultimoTrattamento).toBe("2026-05-10");
      expect(protezione.statoDss).toBe("sufficiente");
      expect(protezione.giorniDaUltimoTrattamento).toBe(2);
      expect(protezione.fonte).toBe("basf_dichiarazione_dss");
      // Senza serie numerica non si inventa una percentuale.
      expect(protezione.percentuale).toBeNull();
      expect(protezione.sottoSoglia).toBeNull();
    });

    it("non attribuisce a BASF uno stato per le due date scoperte dello scenario hero", async () => {
      const protezione = await creaAdapter().getProtezione("2026-08-09", "oidio");
      expect(protezione.ultimoTrattamento).toBe("2026-08-01");
      // BASF non ha dichiarato nulla per il 20/07 e il 01/08: è la richiesta n.1.
      expect(protezione.statoDss).toBeNull();
      expect(protezione.intervalloDitta).toEqual([7, 10]);
      expect(protezione.giorniDaUltimoTrattamento).toBe(8);
    });

    it("misura la pioggia dopo il trattamento anche senza soglia di etichetta", async () => {
      const dilavamento = await creaAdapter().getDilavamento("2026-05-11", "peronospora");
      expect(dilavamento.ultimoTrattamento).toBe("2026-05-10");
      expect(dilavamento.pioggiaCumulataMm).toBe(22.3);
      expect(dilavamento.finestraOre).toBe(24);
      expect(dilavamento.superata).toBeNull();
      expect(dilavamento.sogliaMm).toBeNull();
      expect(dilavamento.note.join(" ")).toContain("non confermata su etichetta");
    });

    it("tiene separato il BBCH del quaderno da quello del modello", async () => {
      const fenologia = await creaAdapter().getFenologia("2026-05-12");
      expect(fenologia.bbchDichiaratoUtente).toBe(105);
      expect(fenologia.bbch).not.toBeNull();
      expect(fenologia.bbch!).toBeGreaterThanOrEqual(105);
    });

    it("dichiara la finestra sintomi come stima, mai come data secca", async () => {
      const finestra = await creaAdapter().getFinestraSintomi("2026-04-25", "oidio");
      expect(finestra.da).toBe("2026-05-02");
      expect(finestra.a).toBe("2026-05-09");
      expect(finestra.confidenza).toBe("bassa");
      expect(finestra.fonte).toBeNull();
      expect(finestra.validazioneNota).toContain("Marano");
    });

    it("non ha serie di rischio finché BASF non passa l'export numerico", async () => {
      const rischio = await creaAdapter().getRischio("2026-04-29", "oidio");
      expect(rischio.valore).toBeNull();
      expect(rischio.note.join(" ")).toContain("export numerico");
    });

    it("apre un alert quando il DSS dichiara copertura non sufficiente", async () => {
      const alert = await creaAdapter().getAlert("2026-06-24");
      const protezione = alert.filter((a) => a.tipo === "protezione_sotto_soglia");
      expect(protezione.map((a) => a.avversita).sort()).toEqual(["oidio", "peronospora"]);
    });

    it("legge le operazioni fino alla data richiesta", async () => {
      const operazioni = await creaAdapter().getOperazioni("2026-04-27");
      expect(operazioni).toHaveLength(5);
      expect(operazioni[0]?.prodotto.principiAttivi[0]?.codiceMoa).toBe("F7");
      expect(operazioni[0]?.anomalie).toContain("bbch_congelato");
    });
  });
}
