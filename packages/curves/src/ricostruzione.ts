import { SOGLIA_PROTEZIONE_PCT, addDays, diffDays, parseDay, toDay } from "@basf/core";
import { prisma } from "@basf/db";

import type { PuntoCurva, SerieCurva } from "./tipi.js";

const AVVERSITA_DB: Record<string, string> = {
  peronospora: "Peronospora",
  oidio: "Oidio",
};

/**
 * Ricostruzione della curva di protezione fra due punti certi: reset al 100% il
 * giorno del trattamento e discesa lineare che tocca la soglia del 70% al primo
 * giorno dell'intervallo dichiarato dalla ditta. È una nostra interpolazione, non
 * un dato Agrigenius, e viaggia con `fonte: ricostruzione`.
 */
export function valoreProtezione(giorniTrascorsi: number, intervalloMinGiorni: number): number {
  const caduta = ((100 - SOGLIA_PROTEZIONE_PCT) * giorniTrascorsi) / intervalloMinGiorni;
  return Math.max(0, Math.round((100 - caduta) * 10) / 10);
}

export async function ricostruisciProtezione(
  appezzamentoId: string,
  fino: string,
): Promise<SerieCurva[]> {
  const db = prisma();
  const serie: SerieCurva[] = [];

  for (const [avversita, etichetta] of Object.entries(AVVERSITA_DB)) {
    const operazioni = await db.operazione.findMany({
      where: { appezzamentoId, avversita: etichetta, origine: "seed" },
      include: { prodotti: true },
      orderBy: { data: "asc" },
    });

    const intervalli = await db.prodottoKb.findMany({
      where: { intervalloDittaMinGiorni: { not: null } },
    });
    const minPerRegistrazione = new Map(
      intervalli.map((p) => [p.numeroRegistrazione, p.intervalloDittaMinGiorni!]),
    );

    const punti: PuntoCurva[] = [];

    for (const [indice, operazione] of operazioni.entries()) {
      const intervalliNoti = operazione.prodotti
        .map((prodotto) => minPerRegistrazione.get(prodotto.numeroRegistrazione))
        .filter((valore): valore is number => valore !== undefined);
      // Senza intervallo dichiarato non si ricostruisce nulla: il segmento resta vuoto.
      if (intervalliNoti.length === 0) continue;

      const intervalloMin = Math.min(...intervalliNoti);
      const inizio = operazione.data;
      const successiva = operazioni[indice + 1]?.data;
      const fineSegmento =
        successiva && successiva <= parseDay(fino) ? addDays(successiva, -1) : parseDay(fino);

      for (let giorno = inizio; giorno <= fineSegmento; giorno = addDays(giorno, 1)) {
        punti.push({
          giorno: toDay(giorno),
          valore: valoreProtezione(diffDays(inizio, giorno), intervalloMin),
        });
      }
    }

    if (punti.length === 0) continue;

    serie.push({
      appezzamentoId,
      avversita,
      serie: "protezione_pct",
      fonte: "ricostruzione",
      nota: `Discesa lineare dal 100% del giorno di trattamento fino alla soglia del ${SOGLIA_PROTEZIONE_PCT}% al primo giorno dell'intervallo dichiarato dalla ditta. Ricostruzione nostra, non export BASF.`,
      punti,
    });
  }

  return serie;
}

/**
 * La fase fenologica del quaderno resta ferma su BBCH 105 dal 18 aprile al 18 maggio,
 * mentre il grafico dello stesso file mostra il passaggio dalla 5a a circa la 14a foglia.
 * Qui si ricostruisce la progressione fra quei due estremi letti dal grafico.
 */
const BBCH_INIZIO_FOGLIE = 105;
const BBCH_FINE_FOGLIE = 114;
const GIORNO_INIZIO_FOGLIE = "2026-04-18";
const GIORNO_FINE_FOGLIE = "2026-05-18";

export function ricostruisciFenologia(appezzamentoId: string): SerieCurva[] {
  const inizio = parseDay(GIORNO_INIZIO_FOGLIE);
  const fine = parseDay(GIORNO_FINE_FOGLIE);
  const durata = diffDays(inizio, fine);

  const bbch: PuntoCurva[] = [];
  const foglie: PuntoCurva[] = [];

  for (let giorno = inizio; giorno <= fine; giorno = addDays(giorno, 1)) {
    const avanzamento = diffDays(inizio, giorno) / durata;
    const valore = BBCH_INIZIO_FOGLIE + (BBCH_FINE_FOGLIE - BBCH_INIZIO_FOGLIE) * avanzamento;
    bbch.push({ giorno: toDay(giorno), valore: Math.round(valore) });
    foglie.push({ giorno: toDay(giorno), valore: Math.round(valore) - 100 });
  }

  const nota =
    "Progressione fra i due estremi letti sul grafico fenologico: 5a foglia il 18 aprile, circa 14a il 18 maggio. Nel quaderno la stessa finestra è ferma su BBCH 105.";

  return [
    {
      appezzamentoId,
      avversita: "fenologia",
      serie: "bbch",
      fonte: "ricostruzione",
      nota,
      punti: bbch,
    },
    {
      appezzamentoId,
      avversita: "fenologia",
      serie: "numero_foglie",
      fonte: "ricostruzione",
      nota,
      punti: foglie,
    },
  ];
}
