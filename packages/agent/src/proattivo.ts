import type { MockAgrigeniusAdapter } from "@basf/adapter";
import { MockAgrigeniusAdapter as Mock } from "@basf/adapter";
import { today, type Alert } from "@basf/core";
import { chat } from "@basf/llm";

import { ISTRUZIONI_TONO } from "./tono.js";

export interface AperturaProattiva {
  giorno: string;
  alert: Alert[];
  messaggio: string;
}

/**
 * Job giornaliero: decide se vale la pena aprire una conversazione. Se non c'è
 * niente di urgente non scrive, altrimenti il viticoltore smette di leggere.
 */
export async function valutaAperturaProattiva(options: {
  giorno?: string;
  adapter?: MockAgrigeniusAdapter;
} = {}): Promise<AperturaProattiva | null> {
  const adapter = options.adapter ?? new Mock();
  const giorno = options.giorno ?? today();

  const alert = await adapter.getAlert(giorno);
  const sottoSoglia = alert.filter((voce) => voce.tipo === "protezione_sotto_soglia");
  if (sottoSoglia.length === 0) return null;

  const dettagli = await Promise.all(
    sottoSoglia.map(async (voce) => {
      const protezione = await adapter.getProtezione(giorno, voce.avversita!);
      const fenologia = await adapter.getFenologia(giorno);
      return {
        avversita: voce.avversita,
        protezionePercentuale: protezione.percentuale,
        fonte: protezione.fonte,
        ultimoTrattamento: protezione.ultimoTrattamento,
        prodotti: protezione.prodotti,
        giorniDaUltimoTrattamento: protezione.giorniDaUltimoTrattamento,
        bbch: fenologia.bbch,
        fase: fenologia.fase,
      };
    }),
  );

  const risposta = await chat({
    maxTokens: 220,
    messaggi: [
      {
        role: "system",
        content: `Sei l'assistente di campo di un viticoltore e stai aprendo tu la conversazione, senza che nessuno te l'abbia chiesta. ${ISTRUZIONI_TONO} Se la percentuale di protezione è una ricostruzione e non un dato ufficiale del modello, dillo con parole semplici.`,
      },
      {
        role: "user",
        content: `Oggi è il ${giorno}. Questi sono i dati: ${JSON.stringify(dettagli)}. Scrivi il messaggio di apertura.`,
      },
    ],
  });

  return { giorno, alert: sottoSoglia, messaggio: risposta.testo.trim() };
}
