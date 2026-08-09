import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

import { repoRoot } from "@basf/core";
import { chat, modelloVisionDefault } from "@basf/llm";

import type { PuntoCurva, SerieCurva } from "./tipi.js";

export interface SpecGrafico {
  file: string;
  avversita: string;
  serie: string;
  unita: string;
  descrizione: string;
  giornoDa: string;
  giornoA: string;
}

/** Mappa dei PNG contenuti in `xl/media/` del file BASF, da Appendice A. */
export const GRAFICI: SpecGrafico[] = [
  {
    file: "image3.png",
    avversita: "peronospora",
    serie: "protezione_pct",
    unita: "percentuale",
    descrizione: "Livello di protezione contro la peronospora, con soglia dichiarata al 70%",
    giornoDa: "2026-04-19",
    giornoA: "2026-08-15",
  },
  {
    file: "image7.png",
    avversita: "oidio",
    serie: "protezione_pct",
    unita: "percentuale",
    descrizione: "Livello di protezione contro l'oidio, con soglia dichiarata al 70%",
    giornoDa: "2026-04-19",
    giornoA: "2026-08-15",
  },
  {
    file: "image1.png",
    avversita: "fenologia",
    serie: "numero_foglie",
    unita: "numero di foglie emesse",
    descrizione: "Curva di emissione foglie e fasi riproduttive",
    giornoDa: "2026-04-01",
    giornoA: "2026-08-15",
  },
];

export function cartellaImmagini(): string {
  return join(repoRoot(), "data", "raw", "media");
}

export function immagineDisponibile(file: string): boolean {
  return existsSync(join(cartellaImmagini(), file));
}

function dataUrl(percorso: string): string {
  const base64 = readFileSync(percorso).toString("base64");
  return `data:image/png;base64,${base64}`;
}

/**
 * Un modulo per tipo di grafico: si chiede al modello di leggere la serie giorno
 * per giorno e di dichiarare quando un punto non è leggibile, invece di inventarlo.
 */
export async function estraiSerie(spec: SpecGrafico, appezzamentoId: string): Promise<SerieCurva> {
  const percorso = join(cartellaImmagini(), spec.file);
  if (!existsSync(percorso)) {
    throw new Error(`Immagine non disponibile: ${percorso}`);
  }

  const risposta = await chat({
    model: modelloVisionDefault(),
    jsonMode: true,
    maxTokens: 4000,
    messaggi: [
      {
        role: "system",
        content:
          "Leggi grafici agronomici e restituisci la serie numerica in JSON. Se un punto non è leggibile lo ometti: non interpolare, non inventare.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: [
              `Grafico: ${spec.descrizione}.`,
              `Unità dell'asse y: ${spec.unita}.`,
              `Leggi un valore per ogni giorno dal ${spec.giornoDa} al ${spec.giornoA}.`,
              'Rispondi con JSON {"punti": [{"giorno": "YYYY-MM-DD", "valore": number}], "nonLeggibili": ["YYYY-MM-DD"]}.',
            ].join(" "),
          },
          { type: "image_url", image_url: { url: dataUrl(percorso) } },
        ],
      },
    ],
  });

  const payload = JSON.parse(risposta.testo) as { punti?: PuntoCurva[] };
  const punti = (payload.punti ?? []).filter(
    (punto) => typeof punto.valore === "number" && /^\d{4}-\d{2}-\d{2}$/.test(punto.giorno),
  );

  return {
    appezzamentoId,
    avversita: spec.avversita,
    serie: spec.serie,
    fonte: "vision_extraction",
    nota: `Estratto da ${basename(percorso)} con ${modelloVisionDefault()}.`,
    punti,
  };
}
