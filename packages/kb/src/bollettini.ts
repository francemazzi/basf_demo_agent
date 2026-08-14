import { readFileSync } from "node:fs";
import { join } from "node:path";

import { readSeedCsv, seedDir } from "@basf/core";

/**
 * Bollettini fitosanitari della vite, U.O. Fitosanitario della Regione del Veneto, 2026.
 * Fonte indicata da BASF l'11 agosto 2026 in risposta alla richiesta n.3.
 *
 * Sono regionali, non di zona: una sola serie settimanale copre tutto il Veneto,
 * quindi vale anche per Vidor. La fenologia è però dichiarata come intervallo fra
 * ambienti tardivi e precoci, mai come valore puntuale su un vigneto: chi la usa
 * deve dirlo, ed è il motivo per cui `RiferimentoFenologico` porta entrambi gli estremi.
 */
export interface Bollettino {
  numero: number;
  /** Giorno di emissione, YYYY-MM-DD. */
  data: string;
  coltura: string;
  /** Intervallo BBCH per la Glera, la varietà di Vidor. Null se il bollettino non lo riporta. */
  bbchGleraTardivi: string | null;
  bbchGleraPrecoci: string | null;
  url: string;
  testo: string;
}

export interface RiferimentoFenologico {
  bollettino: number;
  data: string;
  tardivi: string;
  precoci: string;
  url: string;
}

const SEZIONI = ["Andamento meteo", "Fase fenologica", "Stato parassitario"] as const;

export type SezioneBollettino = (typeof SEZIONI)[number];

let cache: Bollettino[] | null = null;

function vuotoInNull(value: string | undefined): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed === "" ? null : trimmed;
}

export function tuttiBollettini(): Bollettino[] {
  if (cache) return cache;

  cache = readSeedCsv("bollettini.csv")
    .map((riga) => ({
      numero: Number(riga.numero),
      data: riga.data!,
      coltura: riga.coltura!,
      bbchGleraTardivi: vuotoInNull(riga.bbch_glera_ambienti_tardivi),
      bbchGleraPrecoci: vuotoInNull(riga.bbch_glera_ambienti_precoci),
      url: riga.url!,
      testo: readFileSync(join(seedDir(), riga.file!), "utf8"),
    }))
    .sort((a, b) => a.data.localeCompare(b.data));

  return cache;
}

/**
 * Il bollettino in vigore in un dato giorno: l'ultimo emesso non oltre quel giorno.
 * Restituisce null prima del primo bollettino della stagione, mai il successivo:
 * un avviso pubblicato dopo i fatti non è ciò che l'agricoltore aveva in mano.
 */
export function bollettinoVigente(giorno: string): Bollettino | null {
  const candidati = tuttiBollettini().filter((b) => b.data <= giorno);
  return candidati.at(-1) ?? null;
}

/** Estrae una sezione del bollettino, dal titolo fino al titolo successivo. */
export function sezione(bollettino: Bollettino, titolo: SezioneBollettino): string | null {
  const righe = bollettino.testo.split("\n");
  const inizio = righe.findIndex((riga) => riga.trim().startsWith(titolo));
  if (inizio === -1) return null;

  const successivi = SEZIONI.filter((s) => s !== titolo);
  let fine = righe.length;
  for (let i = inizio + 1; i < righe.length; i += 1) {
    if (successivi.some((s) => righe[i]!.trim().startsWith(s))) {
      fine = i;
      break;
    }
  }

  const corpo = righe
    .slice(inizio + 1, fine)
    .filter((riga) => riga.trim() !== "" && !riga.trim().startsWith("U.O. Fitosanitario"))
    .join("\n")
    .trim();

  return corpo === "" ? null : corpo;
}

/**
 * Riferimento fenologico indipendente per la Glera nel giorno indicato.
 *
 * Serve a verificare la fase dichiarata dall'utente senza passare dal modello BASF:
 * è una fonte pubblica e terza, quindi regge anche quando la nostra ricostruzione
 * delle curve viene messa in discussione.
 */
export function riferimentoGlera(giorno: string): RiferimentoFenologico | null {
  const bollettino = bollettinoVigente(giorno);
  if (!bollettino?.bbchGleraTardivi || !bollettino.bbchGleraPrecoci) return null;

  return {
    bollettino: bollettino.numero,
    data: bollettino.data,
    tardivi: bollettino.bbchGleraTardivi,
    precoci: bollettino.bbchGleraPrecoci,
    url: bollettino.url,
  };
}

/** Bollettini il cui testo cita il termine, dal più recente. Ricerca insensibile agli accenti di maiuscola. */
export function cercaNeiBollettini(termine: string): Bollettino[] {
  const ago = termine.toLowerCase();
  return tuttiBollettini()
    .filter((b) => b.testo.toLowerCase().includes(ago))
    .reverse();
}
