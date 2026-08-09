import { addDays, diffDays, parseDay, toDay } from "@basf/core";
import { prisma } from "@basf/db";

export interface EsitoDilavamento {
  dataTrattamento: string;
  giorniTrascorsi: number;
  pioggiaCumulataMm: number;
  finestraGiorni: number;
  sogliaMm: number | null;
  /** Null quando la resistenza al dilavamento del prodotto non è confermata su etichetta. */
  superata: boolean | null;
  note: string[];
}

/**
 * Pioggia cumulata nei giorni successivi al trattamento, dal giorno dopo incluso.
 * È la finestra con cui sono stati costruiti i dati di `pioggia_post_trattamento.csv`.
 */
export async function pioggiaDopoTrattamento(
  appezzamentoId: string,
  dataTrattamento: string,
  giorni: number,
): Promise<number> {
  const inizio = addDays(parseDay(dataTrattamento), 1);
  const fine = addDays(parseDay(dataTrattamento), giorni);
  const righe = await prisma().meteoGiornaliero.findMany({
    where: { appezzamentoId, giorno: { gte: inizio, lte: fine } },
    select: { pioggiaMm: true },
  });
  const totale = righe.reduce((somma, riga) => somma + riga.pioggiaMm, 0);
  return Math.round(totale * 10) / 10;
}

export async function valutaDilavamento(input: {
  appezzamentoId: string;
  dataTrattamento: string;
  giorno: string;
  numeriRegistrazione: string[];
}): Promise<EsitoDilavamento> {
  const giorniTrascorsi = Math.max(
    1,
    diffDays(parseDay(input.dataTrattamento), parseDay(input.giorno)),
  );
  const pioggiaCumulataMm = await pioggiaDopoTrattamento(
    input.appezzamentoId,
    input.dataTrattamento,
    giorniTrascorsi,
  );

  const prodotti = await prisma().prodottoKb.findMany({
    where: { numeroRegistrazione: { in: input.numeriRegistrazione } },
  });
  const soglie = prodotti
    .map((p) => p.resistenzaDilavamentoMm)
    .filter((valore): valore is number => valore !== null);

  const note: string[] = [];
  let sogliaMm: number | null = null;
  let superata: boolean | null = null;

  if (soglie.length === prodotti.length && soglie.length > 0) {
    sogliaMm = Math.min(...soglie);
    superata = pioggiaCumulataMm > sogliaMm;
  } else {
    const senzaSoglia = prodotti
      .filter((p) => p.resistenzaDilavamentoMm === null)
      .map((p) => p.nomeCommerciale);
    note.push(
      `Resistenza al dilavamento non confermata su etichetta per: ${senzaSoglia.join(", ")}. Il millimetraggio è misurato, la soglia no.`,
    );
  }

  return {
    dataTrattamento: input.dataTrattamento,
    giorniTrascorsi,
    pioggiaCumulataMm,
    finestraGiorni: giorniTrascorsi,
    sogliaMm,
    superata,
    note,
  };
}

export async function ultimaPioggiaRilevante(
  appezzamentoId: string,
  giorno: string,
  sogliaMm = 5,
): Promise<{ giorno: string; pioggiaMm: number } | null> {
  const riga = await prisma().meteoGiornaliero.findFirst({
    where: {
      appezzamentoId,
      giorno: { lte: parseDay(giorno) },
      pioggiaMm: { gte: sogliaMm },
    },
    orderBy: { giorno: "desc" },
  });
  return riga ? { giorno: toDay(riga.giorno), pioggiaMm: riga.pioggiaMm } : null;
}
