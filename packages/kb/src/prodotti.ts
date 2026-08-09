import { prisma } from "@basf/db";

export interface ProdottoKb {
  numeroRegistrazione: string;
  nomeCommerciale: string;
  principiAttivi: string[];
  codiciMoa: string[];
  avversitaDichiarate: string[];
  intervalloDitta: [number, number] | null;
  intervalloFonte: string | null;
  resistenzaDilavamentoMm: number | null;
  maxApplicazioniStagione: number | null;
  limitiVerificati: boolean;
}

function normalizza(nome: string): string {
  return nome.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function toProdotto(row: {
  numeroRegistrazione: string;
  nomeCommerciale: string;
  principiAttivi: string[];
  codiciMoa: string[];
  avversitaDichiarate: string[];
  intervalloDittaMinGiorni: number | null;
  intervalloDittaMaxGiorni: number | null;
  intervalloFonte: string | null;
  resistenzaDilavamentoMm: number | null;
  maxApplicazioniStagione: number | null;
  limitiVerificati: boolean;
}): ProdottoKb {
  const { intervalloDittaMinGiorni: min, intervalloDittaMaxGiorni: max } = row;
  return {
    numeroRegistrazione: row.numeroRegistrazione,
    nomeCommerciale: row.nomeCommerciale,
    principiAttivi: row.principiAttivi,
    codiciMoa: row.codiciMoa,
    avversitaDichiarate: row.avversitaDichiarate,
    intervalloDitta: min !== null && max !== null ? [min, max] : null,
    intervalloFonte: row.intervalloFonte,
    resistenzaDilavamentoMm: row.resistenzaDilavamentoMm,
    maxApplicazioniStagione: row.maxApplicazioniStagione,
    limitiVerificati: row.limitiVerificati,
  };
}

export async function tuttiProdotti(): Promise<ProdottoKb[]> {
  const rows = await prisma().prodottoKb.findMany({ orderBy: { nomeCommerciale: "asc" } });
  return rows.map(toProdotto);
}

export async function prodottoPerRegistrazione(numero: string): Promise<ProdottoKb | null> {
  const row = await prisma().prodottoKb.findUnique({ where: { numeroRegistrazione: numero } });
  return row ? toProdotto(row) : null;
}

/**
 * L'utente in chat scrive "zolfo" o "kumulus", non il numero di registrazione:
 * si cerca per nome commerciale e, se non basta, per principio attivo.
 */
export async function cercaProdotti(testo: string): Promise<ProdottoKb[]> {
  const query = normalizza(testo);
  if (query.length < 3) return [];
  const prodotti = await tuttiProdotti();

  const perNome = prodotti.filter((p) => normalizza(p.nomeCommerciale).includes(query));
  if (perNome.length > 0) return perNome;

  return prodotti.filter((p) =>
    p.principiAttivi.some((principio) => normalizza(principio).includes(query)),
  );
}
