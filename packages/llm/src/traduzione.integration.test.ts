import { describe, expect, it } from "vitest";

import { STATI_DSS, statoDssInParole } from "@basf/core";

import { chat, chiaveDisponibile, modelloDefault } from "./openrouter.js";

const attivo = chiaveDisponibile();

describe.skipIf(!attivo)("Gate 2 — traduzione dello stato DSS con modello low-cost", () => {
  it("riscrive lo stato in una frase da campo senza inventare percentuali", async () => {
    const risposta = await chat({
      model: modelloDefault(),
      maxTokens: 120,
      messaggi: [
        {
          role: "system",
          content:
            "Sei un tecnico agronomo che scrive a un viticoltore su WhatsApp. Una frase sola, massimo 20 parole, niente elenchi. Non inventare numeri: usa solo quello che ti viene detto.",
        },
        {
          role: "user",
          content: `Stato del sistema di supporto alle decisioni per l'oidio: ${statoDssInParole(
            "insufficiente_con_infezioni",
          )} Ultimo trattamento 8 giorni fa. Scrivi il messaggio.`,
        },
      ],
    });

    expect(risposta.testo.length).toBeGreaterThan(10);
    // Nessuna percentuale: la serie numerica non ce l'abbiamo e non va simulata.
    expect(risposta.testo).not.toMatch(/\d+\s*%/);
  });

  it("riconosce lo stato dichiarato senza confonderlo con gli altri tre", async () => {
    const risposta = await chat({
      model: modelloDefault(),
      jsonMode: true,
      maxTokens: 80,
      messaggi: [
        {
          role: "system",
          content: `Classifica il testo in uno di questi stati: ${STATI_DSS.join(", ")}. Rispondi solo con un oggetto JSON nella forma {"stato": "..."}.`,
        },
        {
          role: "user",
          content:
            "La protezione residua garantirà solo una copertura parziale per le infezioni previste nei prossimi giorni",
        },
      ],
    });

    const esito = JSON.parse(risposta.testo) as { stato: string };
    expect(esito.stato).toBe("parziale_con_infezioni");
  });
});
