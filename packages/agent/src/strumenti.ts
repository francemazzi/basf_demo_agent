import { tool } from "@langchain/core/tools";
import { z } from "zod";

import type { MockAgrigeniusAdapter } from "@basf/adapter";
import { parseAvversita, statoDssInParole, type Avversita } from "@basf/core";
import { prisma } from "@basf/db";
import { cercaProdotti, conteggiConformita, verificaConformita, type ProdottoKb } from "@basf/kb";

const avversitaSchema = z
  .enum(["peronospora", "oidio", "botrite", "cicaline"])
  .describe("Avversità di riferimento");

function leggiAvversita(valore: string): Avversita {
  const avversita = parseAvversita(valore);
  if (!avversita) throw new Error(`Avversità non riconosciuta: ${valore}`);
  return avversita;
}

/**
 * Quattro intenti, sei strumenti. Ognuno restituisce dati grezzi con la fonte
 * dichiarata: la frase da mandare la costruisce il modello, non lo strumento.
 * Il giorno corrente arriva da fuori, così il pannello di regia può spostare la
 * data di sistema senza che gli strumenti tornino a leggere l'orologio.
 */
export function creaStrumenti(adapter: MockAgrigeniusAdapter, giornoCorrente: string) {
  const consultaDss = tool(
    async ({ avversita, giorno }) => {
      const quando = giorno ?? giornoCorrente;
      const chiave = leggiAvversita(avversita);
      const [protezione, fenologia, rischio] = await Promise.all([
        adapter.getProtezione(quando, chiave),
        adapter.getFenologia(quando),
        adapter.getRischio(quando, chiave),
      ]);

      return JSON.stringify({
        giorno: quando,
        protezionePercentuale: protezione.percentuale,
        sottoSoglia: protezione.sottoSoglia,
        statoDichiaratoDss: protezione.statoDss ? statoDssInParole(protezione.statoDss) : null,
        ultimoTrattamento: protezione.ultimoTrattamento,
        prodottiUltimoTrattamento: protezione.prodotti,
        giorniDaUltimoTrattamento: protezione.giorniDaUltimoTrattamento,
        intervalloDittaGiorni: protezione.intervalloDitta,
        fonteProtezione: protezione.fonte,
        noteProtezione: protezione.note,
        bbchModello: fenologia.bbch,
        bbchScrittoDallUtente: fenologia.bbchDichiaratoUtente,
        faseFenologica: fenologia.fase,
        rischioInfezione: rischio.valore,
        noteRischio: rischio.note,
      });
    },
    {
      name: "consulta_dss",
      description:
        "Stato di copertura, rischio di infezione e fase fenologica secondo i modelli. È lo strumento da usare per qualsiasi domanda del tipo 'sono coperto', 'come sto', 'che rischio c'è', 'a che punto è il vigneto'. Non usarlo per la pioggia.",
      schema: z.object({
        avversita: avversitaSchema,
        giorno: z.string().optional().describe("Giorno in formato YYYY-MM-DD, default oggi"),
      }),
    },
  );

  const verificaDilavamento = tool(
    async ({ avversita, giorno }) => {
      const quando = giorno ?? giornoCorrente;
      const esito = await adapter.getDilavamento(quando, leggiAvversita(avversita));
      return JSON.stringify(esito);
    },
    {
      name: "verifica_dilavamento",
      description:
        "Quanta pioggia è caduta dopo l'ultimo trattamento e se la soglia di dilavamento del prodotto è nota. Usalo solo quando l'utente nomina la pioggia, un temporale o un acquazzone.",
      schema: z.object({
        avversita: avversitaSchema,
        giorno: z.string().optional(),
      }),
    },
  );

  const verificaConformitaTool = tool(
    async ({ prodotto, giorno }) => {
      const quando = giorno ?? giornoCorrente;
      const candidati = await risolviProdotti(prodotto, quando, adapter.getAppezzamentoId());
      if (candidati.length === 0) {
        return JSON.stringify({ errore: `Prodotto non trovato in knowledge base: ${prodotto}` });
      }

      const esiti = await Promise.all(
        candidati.map(async (candidato) => ({
          prodotto: candidato.nomeCommerciale,
          numeroRegistrazione: candidato.numeroRegistrazione,
          principiAttivi: candidato.principiAttivi,
          codiciMoa: candidato.codiciMoa,
          limitiVerificati: candidato.limitiVerificati,
          violazioni: await verificaConformita({
            giorno: quando,
            numeroRegistrazione: candidato.numeroRegistrazione,
          }),
        })),
      );

      return JSON.stringify({ giorno: quando, esiti });
    },
    {
      name: "verifica_conformita",
      description:
        "Controlla ripetizioni di principio attivo e di gruppo MOA nella stagione e gli intervalli della ditta. Chiamalo prima di confermare un trattamento.",
      schema: z.object({
        prodotto: z.string().describe("Nome commerciale o principio attivo"),
        giorno: z.string().optional(),
      }),
    },
  );

  const registraOperazione = tool(
    async ({ prodotti, giorno, haTrattati, origine }) => {
      const quando = giorno ?? giornoCorrente;
      const risolti: ProdottoKb[] = [];
      const dedotti: string[] = [];

      for (const nome of prodotti) {
        const candidati = await risolviProdotti(nome, quando, adapter.getAppezzamentoId());
        if (candidati.length === 0) {
          return JSON.stringify({
            richiestaChiarimento: `Non trovo nessun prodotto che corrisponda a "${nome}". Quale hai usato?`,
          });
        }
        if (candidati.length > 1) {
          return JSON.stringify({
            richiestaChiarimento: `Con "${nome}" intendi ${candidati
              .map((candidato) => candidato.nomeCommerciale)
              .join(" o ")}?`,
          });
        }
        const scelto = candidati[0]!;
        risolti.push(scelto);
        if (scelto.nomeCommerciale.toLowerCase() !== nome.toLowerCase()) {
          dedotti.push(`${nome} interpretato come ${scelto.nomeCommerciale}`);
        }
      }

      const superficie = haTrattati ?? (await superficieAppezzamento(adapter));
      const fenologia = await adapter.getFenologia(quando);

      const esito = await adapter.registraOperazione({
        data: quando,
        prodotti: risolti.map((prodotto) => ({ nomeCommerciale: prodotto.nomeCommerciale })),
        haTrattati: superficie,
        bbch: fenologia.bbch,
        origine: origine ?? "chat",
      });

      return JSON.stringify({
        righe: esito.righe,
        giorno: quando,
        prodotti: risolti.map((prodotto) => prodotto.nomeCommerciale),
        haTrattati: superficie,
        bbchDerivato: fenologia.bbch,
        bbchScrittoInPassato: fenologia.bbchDichiaratoUtente,
        interpretazioni: dedotti,
      });
    },
    {
      name: "registra_operazione",
      description:
        "Scrive nel quaderno di campagna tutti i prodotti di un trattamento, in una sola chiamata. Superficie, BBCH e avversità li deriva da solo: non chiederli mai all'utente e non chiamare lo strumento una volta per avversità. Se l'utente nomina un principio attivo generico come zolfo o rame, passalo così com'è: lo strumento risale al prodotto usato di recente.",
      schema: z.object({
        prodotti: z.array(z.string()).min(1).describe("Nomi commerciali o principi attivi"),
        giorno: z.string().optional(),
        haTrattati: z.number().optional(),
        origine: z.enum(["chat", "vocale", "manuale"]).optional(),
      }),
    },
  );

  const spiega = tool(
    async ({ argomento }) => {
      if (argomento === "conformita_stagione") {
        const conteggi = await conteggiConformita(giornoCorrente);
        return JSON.stringify(conteggi.slice(0, 8));
      }
      return JSON.stringify(await adapter.getAlert(giornoCorrente));
    },
    {
      name: "spiega",
      description:
        "Quadro della stagione: conteggi di conformità oppure alert aperti oggi. Usalo per domande generali sull'andamento.",
      schema: z.object({
        argomento: z.enum(["conformita_stagione", "alert_aperti"]),
      }),
    },
  );

  const finestraSintomi = tool(
    async ({ avversita, giornoInfezione }) => {
      const finestra = await adapter.getFinestraSintomi(
        giornoInfezione ?? giornoCorrente,
        leggiAvversita(avversita),
      );
      return JSON.stringify(finestra);
    },
    {
      name: "finestra_sintomi",
      description:
        "Finestra in cui i sintomi possono comparire, con i fattori di incertezza. Usalo quando l'utente chiede quando vedrà i sintomi o manda la foto di una macchia. Non restituisce mai una data secca.",
      schema: z.object({
        avversita: avversitaSchema,
        giornoInfezione: z.string().optional(),
      }),
    },
  );

  return [
    consultaDss,
    verificaDilavamento,
    verificaConformitaTool,
    registraOperazione,
    spiega,
    finestraSintomi,
  ];
}

/**
 * "Zolfo" e "rame" corrispondono a più prodotti registrati. Invece di fermare la
 * conversazione con una domanda, si sceglie quello che l'utente ha davvero usato
 * più di recente sull'appezzamento, e lo si dichiara nella risposta.
 */
async function risolviProdotti(
  testo: string,
  giorno: string,
  appezzamentoId: string,
): Promise<ProdottoKb[]> {
  const candidati = await cercaProdotti(testo);
  if (candidati.length <= 1) return candidati;

  const numeri = candidati.map((candidato) => candidato.numeroRegistrazione);
  const ultimoUso = await prisma().operazioneProdotto.findFirst({
    where: {
      numeroRegistrazione: { in: numeri },
      operazione: { appezzamentoId, data: { lte: new Date(`${giorno}T00:00:00.000Z`) } },
    },
    orderBy: { operazione: { data: "desc" } },
  });

  if (!ultimoUso) return candidati;
  return candidati.filter(
    (candidato) => candidato.numeroRegistrazione === ultimoUso.numeroRegistrazione,
  );
}

async function superficieAppezzamento(adapter: MockAgrigeniusAdapter): Promise<number> {
  const appezzamento = await prisma().appezzamento.findUnique({
    where: { id: adapter.getAppezzamentoId() },
  });
  return appezzamento?.superficieHa ?? 0;
}
