import {
  num,
  parseDay,
  parseStatoDss,
  pipeList,
  readSeedCsv,
  requiredNum,
  str,
} from "@basf/core";
import { prisma } from "@basf/db";

import { anomalieOperazione } from "./anomalie.js";

export interface SeedSummary {
  appezzamenti: number;
  meteo: number;
  operazioni: number;
  operazioneProdotti: number;
  principiAttivi: number;
  fertilizzazioni: number;
  curve: number;
  prodottiKb: number;
  anomalie: number;
}

const FONTI_CSV: Record<string, "BASF_EXPORT" | "BASF_GRAFICO_ANCORAGGIO" | "VISION_EXTRACTION"> = {
  basf_export: "BASF_EXPORT",
  basf_grafico_ancoraggio: "BASF_GRAFICO_ANCORAGGIO",
  vision_extraction: "VISION_EXTRACTION",
};

/** dose_ha / acqua_hl_ha deve tornare su dose_hl (g/hl). Tolleranza 2%. */
export function verificaDose(input: {
  id: string;
  doseHa: number | null;
  acquaHlHa: number | null;
  doseHl: number | null;
}): string | null {
  const { doseHa, acquaHlHa, doseHl } = input;
  if (doseHa === null || acquaHlHa === null || doseHl === null || acquaHlHa === 0) return null;
  const atteso = (doseHa / acquaHlHa) * 1000;
  const scarto = Math.abs(atteso - doseHl) / doseHl;
  if (scarto > 0.02) {
    return `${input.id}: dose_hl ${doseHl} contro ${atteso.toFixed(1)} atteso (scarto ${(scarto * 100).toFixed(1)}%)`;
  }
  return null;
}

function parseIntervallo(raw: string | null): [number | null, number | null] {
  if (!raw) return [null, null];
  const match = /^(\d+)\s*-\s*(\d+)$/.exec(raw);
  if (match) return [Number(match[1]), Number(match[2])];
  const single = Number(raw);
  return Number.isFinite(single) ? [single, single] : [null, null];
}

export async function runSeed(): Promise<SeedSummary> {
  const db = prisma();
  const scarti: string[] = [];

  const appezzamenti = readSeedCsv("appezzamento.csv");
  for (const row of appezzamenti) {
    const data = {
      azienda: str(row.azienda),
      localita: row.localita ?? "",
      provincia: row.provincia ?? "",
      latitudine: requiredNum(row.latitudine, "latitudine"),
      longitudine: requiredNum(row.longitudine, "longitudine"),
      superficieHa: requiredNum(row.superficie_ha, "superficie_ha"),
      varieta: row.varieta ?? "",
      resaAttesa: str(row.resa_attesa),
      cautelaPeronospora: row.cautela_peronospora ?? "",
      stagione: row.stagione ?? "",
      sistemaColturale: str(row.sistema_colturale),
      allevamento: str(row.allevamento),
      stazioneMeteo: str(row.stazione_meteo_produttore),
    };
    await db.appezzamento.upsert({
      where: { id: row.id! },
      create: { id: row.id!, ...data },
      update: data,
    });
  }

  const meteo = readSeedCsv("meteo_giornaliero.csv");
  for (const row of meteo) {
    const data = {
      pioggiaMm: requiredNum(row.pioggia_mm, "pioggia_mm"),
      tMaxC: num(row.t_max_c),
      tMinC: num(row.t_min_c),
      tMediaC: num(row.t_media_c),
      ventoDirezioneGradi: num(row.vento_direzione_gradi),
      ventoVelocitaMs: num(row.vento_velocita_ms),
      radiazioneSolareWm2: num(row.radiazione_solare_wm2),
      umiditaMaxPct: num(row.umidita_max_pct),
      umiditaMediaPct: num(row.umidita_media_pct),
      umiditaMinPct: num(row.umidita_min_pct),
      bagnaturaFogliareH: num(row.bagnatura_fogliare_h),
    };
    const key = {
      appezzamentoId: row.appezzamento_id!,
      giorno: parseDay(row.giorno!),
    };
    await db.meteoGiornaliero.upsert({
      where: { appezzamentoId_giorno: key },
      create: { ...key, ...data },
      update: data,
    });
  }

  const principiPerOperazione = new Map<string, ReturnType<typeof readSeedCsv>>();
  for (const row of readSeedCsv("principi_attivi.csv")) {
    const id = row.operazione_id!;
    const list = principiPerOperazione.get(id) ?? [];
    list.push(row);
    principiPerOperazione.set(id, list);
  }

  const operazioni = readSeedCsv("operazioni.csv");
  let principiAttiviCount = 0;
  for (const row of operazioni) {
    const id = row.id!;
    const giorno = row.data!;
    const prodotto = row.prodotto_nome_commerciale!;
    const doseHa = num(row.dose_ha);
    const doseHl = num(row.dose_hl);
    const acquaHlHa = num(row.acqua_hl_ha);

    const scarto = verificaDose({ id, doseHa, acquaHlHa, doseHl });
    if (scarto) scarti.push(scarto);

    const operazioneData = {
      appezzamentoId: row.appezzamento_id!,
      data: parseDay(giorno),
      coltura: row.coltura ?? "",
      tipoOperazione: row.tipo_operazione ?? "",
      haTrattati: requiredNum(row.ha_trattati, "ha_trattati"),
      faseFenologica: str(row.fase_fenologica),
      bbch: num(row.bbch),
      avversita: row.avversita ?? "",
      giustificazione: str(row.giustificazione_intervento),
      indicazioneDss: str(row.indicazione_dss),
      statoDss: parseStatoDss(row.indicazione_dss),
      origine: "seed",
      anomalie: anomalieOperazione({ data: giorno, prodotto, avversita: row.avversita ?? "" }),
    };

    await db.operazione.upsert({
      where: { id },
      create: { id, ...operazioneData },
      update: operazioneData,
    });

    const prodottoData = {
      nomeCommerciale: prodotto,
      quantitaTot: num(row.quantita_tot),
      doseHa,
      doseHl,
      acquaHlHa,
    };
    const prodottoRecord = await db.operazioneProdotto.upsert({
      where: {
        operazioneId_numeroRegistrazione: {
          operazioneId: id,
          numeroRegistrazione: row.numero_registrazione!,
        },
      },
      create: {
        operazioneId: id,
        numeroRegistrazione: row.numero_registrazione!,
        ...prodottoData,
      },
      update: prodottoData,
    });

    await db.principioAttivo.deleteMany({
      where: { operazioneProdottoId: prodottoRecord.id },
    });
    const principi = principiPerOperazione.get(id) ?? [];
    for (const principio of principi) {
      await db.principioAttivo.create({
        data: {
          operazioneProdottoId: prodottoRecord.id,
          nome: principio.principio_attivo!,
          codiceMoa: str(principio.codice_moa),
          percentuale: num(principio.percentuale),
          casRn: str(principio.cas_rn),
        },
      });
      principiAttiviCount += 1;
    }
  }

  const fertilizzazioni = readSeedCsv("fertilizzazioni.csv");
  for (const row of fertilizzazioni) {
    const data = {
      coltura: row.coltura ?? "",
      tipoOperazioneDichiarato: row.tipo_operazione_dichiarato ?? "",
      superficieHa: requiredNum(row.superficie_ha, "superficie_ha"),
      formaFisica: str(row.forma_fisica),
      categoria: str(row.categoria),
      doseKgHa: num(row.dose_kg_ha),
      anomalie: pipeList(row.anomalie).length > 0 ? pipeList(row.anomalie) : commaList(row.anomalie),
    };
    const key = {
      appezzamentoId: row.appezzamento_id!,
      data: parseDay(row.data!),
      fertilizzante: row.fertilizzante!,
    };
    await db.fertilizzazione.upsert({
      where: { appezzamentoId_data_fertilizzante: key },
      create: { ...key, ...data },
      update: data,
    });
  }

  const curve = readSeedCsv("curve_dss.csv");
  for (const row of curve) {
    const fonteRaw = row.fonte ?? "";
    const fonte = FONTI_CSV[fonteRaw];
    if (!fonte) throw new Error(`Fonte curva non riconosciuta: ${fonteRaw}`);
    const key = {
      appezzamentoId: row.appezzamento_id!,
      avversita: row.avversita!,
      serie: row.serie!,
      giorno: parseDay(row.giorno!),
    };
    const data = { valore: requiredNum(row.valore, "valore"), fonte, nota: str(row.nota) };
    await db.curvaDss.upsert({
      where: {
        appezzamentoId_avversita_serie_giorno: key,
      },
      create: { ...key, ...data },
      update: data,
    });
  }

  const prodottiKb = readSeedCsv("prodotti_kb.csv");
  for (const row of prodottiKb) {
    const [minGiorni, maxGiorni] = parseIntervallo(str(row.intervallo_ditta_giorni));
    const data = {
      nomeCommerciale: row.nome_commerciale!,
      principiAttivi: pipeList(row.principi_attivi_moa),
      codiciMoa: pipeList(row.codici_moa),
      avversitaDichiarate: pipeList(row.avversita_dichiarate),
      intervalloDittaMinGiorni: minGiorni,
      intervalloDittaMaxGiorni: maxGiorni,
      intervalloFonte: str(row.intervallo_fonte),
      resistenzaDilavamentoMm: num(row.resistenza_dilavamento_mm),
      maxApplicazioniStagione: num(row.max_applicazioni_stagione),
      limitiVerificati: row.limiti_verificati === "true",
    };
    await db.prodottoKb.upsert({
      where: { numeroRegistrazione: row.numero_registrazione! },
      create: { numeroRegistrazione: row.numero_registrazione!, ...data },
      update: data,
    });
  }

  const anomalie = readSeedCsv("anomalie.csv");
  const anomalieViste = new Map<string, { descrizioni: string[]; riferimenti: string[] }>();
  for (const row of anomalie) {
    const codice = row.codice!;
    const acc = anomalieViste.get(codice) ?? { descrizioni: [], riferimenti: [] };
    acc.descrizioni.push(row.descrizione ?? "");
    acc.riferimenti.push(row.riferimento ?? "");
    anomalieViste.set(codice, acc);
    const data = {
      entita: row.entita ?? "",
      riferimento: acc.riferimenti.join(" ; "),
      descrizione: acc.descrizioni.join(" ; "),
      azione: row.azione ?? "",
      stato: row.stato ?? "",
    };
    await db.anomalia.upsert({
      where: { codice },
      create: { codice, ...data },
      update: data,
    });
  }

  if (scarti.length > 0) {
    throw new Error(`Validazione dose fallita:\n${scarti.join("\n")}`);
  }

  return {
    appezzamenti: appezzamenti.length,
    meteo: meteo.length,
    operazioni: operazioni.length,
    operazioneProdotti: operazioni.length,
    principiAttivi: principiAttiviCount,
    fertilizzazioni: fertilizzazioni.length,
    curve: curve.length,
    prodottiKb: prodottiKb.length,
    anomalie: anomalieViste.size,
  };
}

/**
 * Riporta il database allo stato del caso studio: le operazioni scritte da chat,
 * voce o test non fanno parte dei dati BASF.
 */
export async function resetScrittureNonSeed(): Promise<number> {
  const esito = await prisma().operazione.deleteMany({ where: { origine: { not: "seed" } } });
  return esito.count;
}

function commaList(value: string | undefined): string[] {
  if (!value || value.trim() === "") return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}
