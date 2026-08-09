import {
  SOGLIA_PROTEZIONE_PCT,
  diffDays,
  parseDay,
  parseStatoDss,
  toDay,
  type AgrigeniusAdapter,
  type Alert,
  type Avversita,
  type DilavamentoResult,
  type EsitoRegistrazione,
  type FenologiaResult,
  type FinestraSintomi,
  type Fonte,
  type Operazione,
  type OperazionePayload,
  type ProtezioneResult,
  type RischioResult,
  type StatoDss,
} from "@basf/core";
import { prisma, type Prisma } from "@basf/db";
import { valutaDilavamento, verificaConformita } from "@basf/kb";

import {
  AVVERSITA_DB,
  AVVERSITA_FENOLOGIA,
  FONTE_DB,
  SERIE_BBCH,
  SERIE_FOGLIE,
  SERIE_PROTEZIONE,
} from "./etichette.js";

const APPEZZAMENTO_DEMO = "vidor-cal-nova";

/**
 * Finestre di incubazione dichiarate come stima, non come dato Agrigenius:
 * finché BASF non passa le curve, la risposta deve dire da dove viene il numero.
 */
const INCUBAZIONE_STIMATA: Record<Avversita, [number, number]> = {
  peronospora: [5, 10],
  oidio: [7, 14],
  botrite: [3, 7],
  cicaline: [10, 20],
};

const NOTA_MARANO =
  "A Marano di Valpolicella nel 2026 la sporulazione dell'oidio era prevista dal 25 aprile ed è stata osservata il 28: tre giorni di scarto su testimone non trattato.";

export class MockAgrigeniusAdapter implements AgrigeniusAdapter {
  constructor(private readonly appezzamentoId: string = APPEZZAMENTO_DEMO) {}

  getAppezzamentoId(): string {
    return this.appezzamentoId;
  }

  async getProtezione(giorno: string, avversita: Avversita): Promise<ProtezioneResult> {
    const note: string[] = [];
    const ultimo = await this.ultimoTrattamento(giorno, avversita);

    const punto = await prisma().curvaDss.findFirst({
      where: {
        appezzamentoId: this.appezzamentoId,
        avversita,
        serie: SERIE_PROTEZIONE,
        giorno: parseDay(giorno),
      },
    });

    const percentuale = punto?.valore ?? null;
    const statoDss = ultimo ? parseStatoDss(ultimo.indicazioneDss) : null;

    let fonte: Fonte | null = null;
    if (punto) fonte = FONTE_DB[punto.fonte] ?? null;
    else if (statoDss) fonte = "basf_dichiarazione_dss";

    if (percentuale === null) {
      note.push(
        statoDss
          ? "Percentuale non disponibile: il DSS dichiara solo lo stato di protezione alla data dell'intervento."
          : "Nessun dato di protezione per questa data: manca sia la serie numerica sia l'indicazione DSS.",
      );
    }

    const intervalloDitta = ultimo
      ? await this.intervalloDitta(ultimo.prodotti.map((p) => p.numeroRegistrazione))
      : null;

    return {
      avversita,
      percentuale,
      statoDss,
      sottoSoglia: percentuale === null ? null : percentuale < SOGLIA_PROTEZIONE_PCT,
      ultimoTrattamento: ultimo ? toDay(ultimo.data) : null,
      prodotti: ultimo ? ultimo.prodotti.map((p) => p.nomeCommerciale) : [],
      giorniDaUltimoTrattamento: ultimo ? diffDays(ultimo.data, parseDay(giorno)) : null,
      intervalloDitta,
      fonte,
      note,
    };
  }

  async getRischio(giorno: string, avversita: Avversita): Promise<RischioResult> {
    const serie = avversita === "oidio" ? "infezione_oidio" : `infezione_${avversita}`;
    const punto = await prisma().curvaDss.findFirst({
      where: {
        appezzamentoId: this.appezzamentoId,
        avversita,
        serie,
        giorno: parseDay(giorno),
      },
    });

    return {
      avversita,
      valore: punto?.valore ?? null,
      serie,
      fonte: punto ? (FONTE_DB[punto.fonte] ?? null) : null,
      note: punto
        ? []
        : ["Serie di rischio non disponibile: in attesa dell'export numerico BASF."],
    };
  }

  async getFenologia(giorno: string): Promise<FenologiaResult> {
    const db = prisma();
    // Solo il punto esatto: la curva fenologica copre una finestra, fuori da lì
    // vale quello che ha scritto l'utente sul quaderno.
    const cerca = (serie: string) =>
      db.curvaDss.findFirst({
        where: {
          appezzamentoId: this.appezzamentoId,
          avversita: AVVERSITA_FENOLOGIA,
          serie,
          giorno: parseDay(giorno),
        },
      });

    const [bbchPunto, fogliePunto] = await Promise.all([cerca(SERIE_BBCH), cerca(SERIE_FOGLIE)]);

    const ultimaOperazione = await db.operazione.findFirst({
      where: { appezzamentoId: this.appezzamentoId, data: { lte: parseDay(giorno) } },
      orderBy: { data: "desc" },
    });

    return {
      giorno,
      bbch: bbchPunto ? Math.round(bbchPunto.valore) : (ultimaOperazione?.bbch ?? null),
      fase: ultimaOperazione?.faseFenologica ?? null,
      numeroFoglie: fogliePunto?.valore ?? null,
      fonte: bbchPunto ? (FONTE_DB[bbchPunto.fonte] ?? null) : null,
      bbchDichiaratoUtente: ultimaOperazione?.bbch ?? null,
    };
  }

  async getAlert(giorno: string): Promise<Alert[]> {
    const alert: Alert[] = [];

    for (const avversita of ["peronospora", "oidio"] as const) {
      const protezione = await this.getProtezione(giorno, avversita);
      const scoperto = protezioneScoperta(protezione.percentuale, protezione.statoDss);
      if (!scoperto) continue;
      alert.push({
        tipo: "protezione_sotto_soglia",
        avversita,
        titolo: `Copertura ${avversita} in calo`,
        dettaglio: dettaglioProtezione(protezione),
        giorno,
        fonte: protezione.fonte,
      });
    }

    for (const avversita of ["peronospora", "oidio"] as const) {
      const dilavamento = await this.getDilavamento(giorno, avversita);
      if (dilavamento.pioggiaCumulataMm < 10) continue;
      alert.push({
        tipo: "dilavamento",
        avversita,
        titolo: "Pioggia dopo l'ultimo trattamento",
        dettaglio: `Dal ${dilavamento.ultimoTrattamento} sono caduti ${dilavamento.pioggiaCumulataMm} mm.`,
        giorno,
        fonte: null,
      });
    }

    return alert;
  }

  async getDilavamento(giorno: string, avversita: Avversita): Promise<DilavamentoResult> {
    const ultimo = await this.ultimoTrattamento(giorno, avversita);
    if (!ultimo) {
      return {
        avversita,
        ultimoTrattamento: null,
        prodotti: [],
        pioggiaCumulataMm: 0,
        finestraOre: 0,
        superata: null,
        sogliaMm: null,
        note: ["Nessun trattamento registrato per questa avversità prima della data richiesta."],
      };
    }

    const esito = await valutaDilavamento({
      appezzamentoId: this.appezzamentoId,
      dataTrattamento: toDay(ultimo.data),
      giorno,
      numeriRegistrazione: ultimo.prodotti.map((p) => p.numeroRegistrazione),
    });

    return {
      avversita,
      ultimoTrattamento: esito.dataTrattamento,
      prodotti: ultimo.prodotti.map((p) => p.nomeCommerciale),
      pioggiaCumulataMm: esito.pioggiaCumulataMm,
      finestraOre: esito.finestraGiorni * 24,
      superata: esito.superata,
      sogliaMm: esito.sogliaMm,
      note: esito.note,
    };
  }

  async getFinestraSintomi(
    giornoInfezione: string,
    avversita: Avversita,
  ): Promise<FinestraSintomi> {
    const [min, max] = INCUBAZIONE_STIMATA[avversita];
    const inizio = parseDay(giornoInfezione);

    return {
      da: toDay(new Date(inizio.getTime() + min * 86_400_000)),
      a: toDay(new Date(inizio.getTime() + max * 86_400_000)),
      confidenza: "bassa",
      fattoriIncertezza: [
        "andamento termico dei giorni successivi",
        "età e bagnatura della foglia",
        "finestra stimata da letteratura, non dal modello Agrigenius",
      ],
      validazioneNota: avversita === "oidio" ? NOTA_MARANO : undefined,
      fonte: null,
    };
  }

  async getOperazioni(fino?: string): Promise<Operazione[]> {
    const righe = await prisma().operazione.findMany({
      where: {
        appezzamentoId: this.appezzamentoId,
        ...(fino ? { data: { lte: parseDay(fino) } } : {}),
      },
      include: { prodotti: { include: { principiAttivi: true } } },
      orderBy: [{ data: "asc" }, { id: "asc" }],
    });

    return righe.map((riga) => {
      const prodotto = riga.prodotti[0];
      return {
        id: riga.id,
        data: toDay(riga.data),
        avversita: riga.avversita,
        bbchDichiarato: riga.bbch,
        faseFenologicaDichiarata: riga.faseFenologica,
        haTrattati: riga.haTrattati,
        statoDss: riga.statoDss as StatoDss | null,
        anomalie: riga.anomalie,
        prodotto: {
          nomeCommerciale: prodotto?.nomeCommerciale ?? "",
          numeroRegistrazione: prodotto?.numeroRegistrazione ?? "",
          doseHa: prodotto?.doseHa ?? null,
          principiAttivi: (prodotto?.principiAttivi ?? []).map((principio) => ({
            nome: principio.nome,
            codiceMoa: principio.codiceMoa,
            percentuale: principio.percentuale,
          })),
        },
      };
    });
  }

  async registraOperazione(payload: OperazionePayload): Promise<EsitoRegistrazione> {
    const db = prisma();
    const giorno = parseDay(payload.data);
    const bbch = payload.bbch ?? (await this.getFenologia(payload.data)).bbch;

    const righe: EsitoRegistrazione["righe"] = [];

    for (const prodotto of payload.prodotti) {
      const scheda = await db.prodottoKb.findFirst({
        where: { nomeCommerciale: prodotto.nomeCommerciale },
      });
      if (!scheda) throw new Error(`Prodotto non in knowledge base: ${prodotto.nomeCommerciale}`);

      const avversita =
        prodotto.avversita ?? scheda.avversitaDichiarate[0] ?? "Non dichiarata";

      const creata = await this.creaConIdProgressivo(payload.data, {
        appezzamentoId: this.appezzamentoId,
        data: giorno,
        coltura: "Vite da vino",
        tipoOperazione: "Trattamento di difesa / Fitoregolatori",
        haTrattati: payload.haTrattati,
        bbch,
        avversita,
        giustificazione: `Registrazione da ${payload.origine}`,
        origine: payload.origine,
        anomalie: [],
        prodotti: {
          create: [
            {
              nomeCommerciale: scheda.nomeCommerciale,
              numeroRegistrazione: scheda.numeroRegistrazione,
              doseHa: prodotto.doseHa ?? null,
            },
          ],
        },
      });

      righe.push({ id: creata, prodotto: scheda.nomeCommerciale, avversita });
    }

    return { ids: righe.map((riga) => riga.id), righe };
  }

  /**
   * L'id segue la convenzione del quaderno BASF, `YYYY-MM-DD-NN`. Le chiamate
   * possono arrivare in parallelo dallo stesso turno di conversazione: si riprova
   * finché il progressivo non è libero.
   */
  private async creaConIdProgressivo(
    data: string,
    dati: Omit<Prisma.OperazioneUncheckedCreateInput, "id">,
  ): Promise<string> {
    const db = prisma();
    for (let tentativo = 0; tentativo < 20; tentativo += 1) {
      const esistenti = await db.operazione.count({ where: { data: parseDay(data) } });
      const id = `${data}-${String(esistenti + 1 + tentativo).padStart(2, "0")}`;
      try {
        await db.operazione.create({ data: { id, ...dati } });
        return id;
      } catch (errore) {
        const codice = (errore as { code?: string }).code;
        if (codice !== "P2002") throw errore;
      }
    }
    throw new Error(`Impossibile assegnare un id per il ${data}`);
  }

  async verificaConformitaTrattamento(giorno: string, numeroRegistrazione: string) {
    return verificaConformita({ giorno, numeroRegistrazione });
  }

  private async intervalloDitta(numeri: string[]): Promise<[number, number] | null> {
    const prodotti = await prisma().prodottoKb.findMany({
      where: { numeroRegistrazione: { in: numeri } },
    });
    const noti = prodotti.filter(
      (p) => p.intervalloDittaMinGiorni !== null && p.intervalloDittaMaxGiorni !== null,
    );
    if (noti.length === 0) return null;
    return [
      Math.min(...noti.map((p) => p.intervalloDittaMinGiorni!)),
      Math.min(...noti.map((p) => p.intervalloDittaMaxGiorni!)),
    ];
  }

  private async ultimoTrattamento(giorno: string, avversita: Avversita) {
    return prisma().operazione.findFirst({
      where: {
        appezzamentoId: this.appezzamentoId,
        avversita: AVVERSITA_DB[avversita],
        data: { lte: parseDay(giorno) },
      },
      include: { prodotti: true },
      orderBy: { data: "desc" },
    });
  }
}

function protezioneScoperta(percentuale: number | null, stato: StatoDss | null): boolean {
  if (percentuale !== null) return percentuale < SOGLIA_PROTEZIONE_PCT;
  return stato !== null && stato !== "sufficiente";
}

function dettaglioProtezione(protezione: ProtezioneResult): string {
  if (protezione.percentuale !== null) {
    return `Protezione al ${protezione.percentuale}%, sotto la soglia del ${SOGLIA_PROTEZIONE_PCT}%.`;
  }
  return protezione.note[0] ?? "Copertura da verificare.";
}
