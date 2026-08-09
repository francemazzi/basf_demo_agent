import { toDay } from "@basf/core";
import { prisma } from "@basf/db";

export interface Conteggio {
  tipo: "principio_attivo" | "gruppo_moa";
  chiave: string;
  date: string[];
  nApplicazioni: number;
  limiteEtichetta: number | null;
  limiteVerificato: boolean;
}

export interface ViolazioneConformita {
  tipo: "principio_attivo" | "gruppo_moa" | "intervallo_ditta";
  chiave: string;
  gravita: "blocco" | "attenzione";
  messaggio: string;
  /** Null quando il limite non è confermato su etichetta: in demo non si dichiara un superamento inventato. */
  limiteEtichetta: number | null;
  applicazioniConteggiate: number;
  date: string[];
}

/**
 * Conta le applicazioni per principio attivo e per gruppo MOA sulla stagione,
 * per data di intervento: due prodotti diversi con lo stesso dithianon nello
 * stesso giorno restano una sola applicazione.
 */
export async function conteggiConformita(fino?: string): Promise<Conteggio[]> {
  const operazioni = await prisma().operazione.findMany({
    where: fino ? { data: { lte: new Date(`${fino}T00:00:00.000Z`) } } : undefined,
    include: { prodotti: { include: { principiAttivi: true } } },
    orderBy: { data: "asc" },
  });

  const perPrincipio = new Map<string, Set<string>>();
  const perMoa = new Map<string, Set<string>>();

  for (const operazione of operazioni) {
    const giorno = toDay(operazione.data);
    for (const prodotto of operazione.prodotti) {
      for (const principio of prodotto.principiAttivi) {
        const date = perPrincipio.get(principio.nome) ?? new Set<string>();
        date.add(giorno);
        perPrincipio.set(principio.nome, date);

        if (principio.codiceMoa) {
          const dateMoa = perMoa.get(principio.codiceMoa) ?? new Set<string>();
          dateMoa.add(giorno);
          perMoa.set(principio.codiceMoa, dateMoa);
        }
      }
    }
  }

  const limiti = await limitiPerChiave();

  const build = (
    tipo: "principio_attivo" | "gruppo_moa",
    mappa: Map<string, Set<string>>,
  ): Conteggio[] =>
    [...mappa.entries()]
      .map(([chiave, date]) => {
        const ordinate = [...date].sort();
        const limite = tipo === "principio_attivo" ? (limiti.get(chiave) ?? null) : null;
        return {
          tipo,
          chiave,
          date: ordinate,
          nApplicazioni: ordinate.length,
          limiteEtichetta: limite,
          limiteVerificato: limite !== null,
        };
      })
      .sort((a, b) => b.nApplicazioni - a.nApplicazioni || a.chiave.localeCompare(b.chiave));

  return [...build("principio_attivo", perPrincipio), ...build("gruppo_moa", perMoa)];
}

/**
 * I limiti di etichetta restano nulli finché non sono confermati su fonte ufficiale:
 * in demo un limite inventato verrebbe contestato.
 */
async function limitiPerChiave(): Promise<Map<string, number>> {
  const prodotti = await prisma().prodottoKb.findMany({
    where: { limitiVerificati: true, maxApplicazioniStagione: { not: null } },
  });
  const limiti = new Map<string, number>();
  for (const prodotto of prodotti) {
    for (const principio of prodotto.principiAttivi) {
      const nome = principio.replace(/\s*\([^)]*\)\s*$/, "").trim();
      const attuale = limiti.get(nome);
      const valore = prodotto.maxApplicazioniStagione!;
      if (attuale === undefined || valore < attuale) limiti.set(nome, valore);
    }
  }
  return limiti;
}

const MOA_MULTISITO = "MS";

export interface CandidatoTrattamento {
  giorno: string;
  numeroRegistrazione: string;
}

/**
 * Cosa succede se l'utente conferma questo trattamento: si guarda alla stagione
 * già registrata e si segnala la ripetizione prima della conferma, non dopo.
 */
export async function verificaConformita(
  candidato: CandidatoTrattamento,
): Promise<ViolazioneConformita[]> {
  const db = prisma();
  const prodotto = await db.prodottoKb.findUnique({
    where: { numeroRegistrazione: candidato.numeroRegistrazione },
  });
  if (!prodotto) return [];

  const conteggi = await conteggiConformita(candidato.giorno);
  const violazioni: ViolazioneConformita[] = [];

  const nomiPrincipi = prodotto.principiAttivi.map((p) => p.replace(/\s*\([^)]*\)\s*$/, "").trim());

  for (const nome of nomiPrincipi) {
    const conteggio = conteggi.find((c) => c.tipo === "principio_attivo" && c.chiave === nome);
    if (!conteggio) continue;
    const dopo = conteggio.date.includes(candidato.giorno)
      ? conteggio.nApplicazioni
      : conteggio.nApplicazioni + 1;
    if (conteggio.limiteEtichetta !== null && dopo > conteggio.limiteEtichetta) {
      violazioni.push({
        tipo: "principio_attivo",
        chiave: nome,
        gravita: "blocco",
        messaggio: `${nome}: sarebbe la ${dopo}a applicazione, il limite di etichetta è ${conteggio.limiteEtichetta}.`,
        limiteEtichetta: conteggio.limiteEtichetta,
        applicazioniConteggiate: dopo,
        date: conteggio.date,
      });
    } else if (dopo >= 3) {
      violazioni.push({
        tipo: "principio_attivo",
        chiave: nome,
        gravita: "attenzione",
        messaggio: `${nome}: sarebbe la ${dopo}a applicazione della stagione. Limite di etichetta da verificare.`,
        limiteEtichetta: null,
        applicazioniConteggiate: dopo,
        date: conteggio.date,
      });
    }
  }

  for (const moa of prodotto.codiciMoa) {
    // MS raccoglie i multisito: sono lo strumento contro la resistenza, non il rischio.
    if (moa === MOA_MULTISITO) continue;
    const conteggio = conteggi.find((c) => c.tipo === "gruppo_moa" && c.chiave === moa);
    if (!conteggio) continue;
    const dopo = conteggio.date.includes(candidato.giorno)
      ? conteggio.nApplicazioni
      : conteggio.nApplicazioni + 1;
    // I piretroidi IRAC 3 sono il caso reale: due nella stagione, 23/06 e 20/07.
    const sogliaAttenzione = moa === "3" ? 2 : 3;
    if (dopo >= sogliaAttenzione) {
      violazioni.push({
        tipo: "gruppo_moa",
        chiave: moa,
        gravita: "attenzione",
        messaggio: `Gruppo ${moa}: sarebbe la ${dopo}a applicazione della stagione, rischio di resistenza. Limite da verificare su etichetta.`,
        limiteEtichetta: null,
        applicazioniConteggiate: dopo,
        date: conteggio.date,
      });
    }
  }

  const intervallo = await violazioneIntervalloDitta(candidato, prodotto.intervalloDittaMinGiorni);
  if (intervallo) violazioni.push(intervallo);

  return violazioni;
}

async function violazioneIntervalloDitta(
  candidato: CandidatoTrattamento,
  intervalloMin: number | null,
): Promise<ViolazioneConformita | null> {
  if (intervalloMin === null) return null;
  const precedente = await prisma().operazione.findFirst({
    where: {
      data: { lt: new Date(`${candidato.giorno}T00:00:00.000Z`) },
      prodotti: { some: { numeroRegistrazione: candidato.numeroRegistrazione } },
    },
    orderBy: { data: "desc" },
  });
  if (!precedente) return null;

  const giorniTrascorsi = Math.round(
    (new Date(`${candidato.giorno}T00:00:00.000Z`).getTime() - precedente.data.getTime()) /
      86_400_000,
  );
  if (giorniTrascorsi >= intervalloMin) return null;

  return {
    tipo: "intervallo_ditta",
    chiave: candidato.numeroRegistrazione,
    gravita: "attenzione",
    messaggio: `Sono passati ${giorniTrascorsi} giorni dall'ultima applicazione, la ditta indica almeno ${intervalloMin}.`,
    limiteEtichetta: null,
    applicazioniConteggiate: giorniTrascorsi,
    date: [toDay(precedente.data)],
  };
}
