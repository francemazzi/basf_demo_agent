import { parseDay, toDay } from "@basf/core";
import { prisma } from "@basf/db";

export interface VoceMagazzino {
  numeroRegistrazione: string;
  nomeCommerciale: string;
  unita: string;
  giacenzaInizialeSimulata: number;
  consumato: number;
  residuo: number;
  ultimoPrelievo: string | null;
  /** Sempre true: le giacenze non sono dati BASF, servono solo a far vedere il flusso. */
  simulato: true;
}

/**
 * Giacenza sintetica: si parte da una scorta convenzionale e si scarica quello
 * che risulta davvero registrato nel quaderno. Nessun numero di magazzino reale
 * esiste nei dati del caso studio, e la demo deve dirlo.
 */
const GIACENZA_INIZIALE_KG = 25;

export async function statoMagazzino(fino: string): Promise<VoceMagazzino[]> {
  const prodotti = await prisma().operazioneProdotto.findMany({
    where: { operazione: { data: { lte: parseDay(fino) } } },
    include: { operazione: { select: { data: true } } },
  });

  const perProdotto = new Map<string, VoceMagazzino>();

  for (const riga of prodotti) {
    const voce = perProdotto.get(riga.numeroRegistrazione) ?? {
      numeroRegistrazione: riga.numeroRegistrazione,
      nomeCommerciale: riga.nomeCommerciale,
      unita: "kg o l",
      giacenzaInizialeSimulata: GIACENZA_INIZIALE_KG,
      consumato: 0,
      residuo: GIACENZA_INIZIALE_KG,
      ultimoPrelievo: null,
      simulato: true as const,
    };

    voce.consumato = Math.round((voce.consumato + (riga.quantitaTot ?? 0)) * 1000) / 1000;
    voce.residuo = Math.round((voce.giacenzaInizialeSimulata - voce.consumato) * 1000) / 1000;

    const giorno = toDay(riga.operazione.data);
    if (!voce.ultimoPrelievo || giorno > voce.ultimoPrelievo) voce.ultimoPrelievo = giorno;

    perProdotto.set(riga.numeroRegistrazione, voce);
  }

  return [...perProdotto.values()].sort((a, b) =>
    a.nomeCommerciale.localeCompare(b.nomeCommerciale),
  );
}
