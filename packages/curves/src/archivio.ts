import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { curvesDir, parseDay } from "@basf/core";
import { prisma } from "@basf/db";

import { FONTE_DB_DA_CORE, type SerieCurva } from "./tipi.js";

function nomeFile(serie: SerieCurva): string {
  return `${serie.avversita}__${serie.serie}__${serie.fonte}.json`;
}

export function scriviSerie(serie: SerieCurva): string {
  const cartella = curvesDir();
  if (!existsSync(cartella)) mkdirSync(cartella, { recursive: true });
  const percorso = join(cartella, nomeFile(serie));
  writeFileSync(percorso, `${JSON.stringify(serie, null, 2)}\n`, "utf8");
  return percorso;
}

export function leggiSerie(): SerieCurva[] {
  const cartella = curvesDir();
  if (!existsSync(cartella)) return [];
  return readdirSync(cartella)
    .filter((file) => file.endsWith(".json"))
    .map((file) => JSON.parse(readFileSync(join(cartella, file), "utf8")) as SerieCurva);
}

/**
 * I punti di ancoraggio letti direttamente dai grafici hanno la precedenza sulla
 * ricostruzione: se BASF ha dichiarato un valore, quello resta.
 */
const PRECEDENZA: Record<string, number> = {
  BASF_EXPORT: 4,
  BASF_GRAFICO_ANCORAGGIO: 3,
  VISION_EXTRACTION: 2,
  RICOSTRUZIONE: 1,
  BASF_DICHIARAZIONE_DSS: 0,
};

export async function caricaSerieInDb(serie: SerieCurva[]): Promise<number> {
  const db = prisma();
  let scritti = 0;

  for (const curva of serie) {
    const fonte = FONTE_DB_DA_CORE[curva.fonte];
    for (const punto of curva.punti) {
      const chiave = {
        appezzamentoId: curva.appezzamentoId,
        avversita: curva.avversita,
        serie: curva.serie,
        giorno: parseDay(punto.giorno),
      };
      const esistente = await db.curvaDss.findUnique({
        where: { appezzamentoId_avversita_serie_giorno: chiave },
      });

      if (esistente && (PRECEDENZA[esistente.fonte] ?? 0) > (PRECEDENZA[fonte] ?? 0)) continue;

      const dati = {
        valore: punto.valore,
        fonte: fonte as never,
        nota: curva.nota,
      };
      await db.curvaDss.upsert({
        where: { appezzamentoId_avversita_serie_giorno: chiave },
        create: { ...chiave, ...dati },
        update: dati,
      });
      scritti += 1;
    }
  }

  return scritti;
}
