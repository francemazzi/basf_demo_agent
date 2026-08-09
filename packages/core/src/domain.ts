export const AVVERSITA = ["peronospora", "oidio", "botrite", "cicaline"] as const;
export type Avversita = (typeof AVVERSITA)[number];

export function parseAvversita(raw: string): Avversita | null {
  const normalized = raw.trim().toLowerCase();
  return (AVVERSITA as readonly string[]).includes(normalized)
    ? (normalized as Avversita)
    : null;
}

/**
 * Dichiara da dove viene un numero. In riunione con BASF si deve poter dire
 * quale valore è loro e quale è ricostruito da noi.
 */
export const FONTI = [
  "basf_export",
  "basf_dichiarazione_dss",
  "basf_grafico_ancoraggio",
  "vision_extraction",
  "ricostruzione",
] as const;
export type Fonte = (typeof FONTI)[number];

/** I quattro stati categorici della colonna "Indicazione DSS" del foglio Trattamenti. */
export const STATI_DSS = [
  "sufficiente",
  "insufficiente_senza_infezioni",
  "insufficiente_con_infezioni",
  "parziale_con_infezioni",
] as const;
export type StatoDss = (typeof STATI_DSS)[number];

export interface Appezzamento {
  id: string;
  localita: string;
  provincia: string;
  latitudine: number;
  longitudine: number;
  superficieHa: number;
  varieta: string;
  cautelaPeronospora: string;
  stagione: string;
}

export interface GiornoMeteo {
  giorno: string;
  pioggiaMm: number;
  tMax: number | null;
  tMin: number | null;
  tMedia: number | null;
  umiditaMedia: number | null;
  bagnaturaFogliareH: number | null;
}

export interface ProdottoApplicato {
  nomeCommerciale: string;
  numeroRegistrazione: string;
  doseHa: number | null;
  principiAttivi: PrincipioAttivo[];
}

export interface PrincipioAttivo {
  nome: string;
  codiceMoa: string | null;
  percentuale: number | null;
}

export interface Operazione {
  id: string;
  data: string;
  avversita: string;
  bbchDichiarato: number | null;
  faseFenologicaDichiarata: string | null;
  haTrattati: number;
  statoDss: StatoDss | null;
  anomalie: string[];
  prodotto: ProdottoApplicato;
}

export const SOGLIA_PROTEZIONE_PCT = 70;
