import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { num, parseDay, readSeedCsv, repoRoot } from "@basf/core";
import { prisma } from "@basf/db";

export interface EsitoValidazione {
  serie: string;
  giorno: string;
  atteso: number;
  ottenuto: number | null;
  erroreAssoluto: number | null;
  errorePercentuale: number | null;
  nota: string;
}

/**
 * Misura l'estrazione contro i valori letti nei tooltip della slide 2 del PPT.
 * Sono gli unici numeri del DSS che abbiamo con certezza.
 */
export async function validaEstrazione(appezzamentoId: string): Promise<EsitoValidazione[]> {
  const attesi = readSeedCsv("validazione_estrazione.csv");
  const esiti: EsitoValidazione[] = [];

  for (const riga of attesi) {
    const serie = riga.serie!;
    const giorno = riga.data_riferimento!;
    const atteso = num(riga.valore_atteso)!;

    const punto = await prisma().curvaDss.findFirst({
      where: { appezzamentoId, serie, giorno: parseDay(giorno) },
    });

    const ottenuto = punto?.valore ?? null;
    esiti.push({
      serie,
      giorno,
      atteso,
      ottenuto,
      erroreAssoluto: ottenuto === null ? null : Math.abs(ottenuto - atteso),
      errorePercentuale:
        ottenuto === null || atteso === 0
          ? null
          : Math.round((Math.abs(ottenuto - atteso) / atteso) * 1000) / 10,
      nota: riga.nota ?? "",
    });
  }

  return esiti;
}

export function scriviReportAccuratezza(esiti: EsitoValidazione[]): string {
  const cartella = join(repoRoot(), "docs");
  if (!existsSync(cartella)) mkdirSync(cartella, { recursive: true });
  const percorso = join(cartella, "accuratezza-estrazione.md");

  const coperti = esiti.filter((esito) => esito.ottenuto !== null);
  const righe = esiti.map((esito) => {
    const ottenuto = esito.ottenuto === null ? "non estratto" : String(esito.ottenuto);
    const errore =
      esito.errorePercentuale === null ? "&mdash;" : `${esito.errorePercentuale}%`;
    return `| ${esito.serie} | ${esito.giorno} | ${esito.atteso} | ${ottenuto} | ${errore} | ${esito.nota} |`;
  });

  const contenuto = [
    "# Accuratezza dell'estrazione",
    "",
    "Confronto fra le serie caricate in `curvaDss` e i valori certi letti nei tooltip della slide 2 di `Altri_casi_studio.pptx`.",
    "",
    `Punti coperti: ${coperti.length} su ${esiti.length}.`,
    "",
    "| Serie | Giorno | Atteso | Ottenuto | Errore | Nota |",
    "|---|---|---|---|---|---|",
    ...righe,
    "",
    "## Come leggere questa tabella in riunione",
    "",
    "Le righe senza valore ottenuto non sono un errore della pipeline: sono serie che nessuna fonte disponibile contiene ancora. Restano la richiesta numero 1 verso BASF, cioè l'export numerico su Vidor.",
    "",
  ].join("\n");

  writeFileSync(percorso, contenuto, "utf8");
  return percorso;
}
