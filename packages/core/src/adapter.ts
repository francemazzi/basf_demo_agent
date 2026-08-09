import type { Avversita, Fonte, Operazione, StatoDss } from "./domain.js";

export interface ProtezioneResult {
  avversita: Avversita;
  /** Null quando la fonte è categorica: il DSS dichiara lo stato, non la percentuale. */
  percentuale: number | null;
  statoDss: StatoDss | null;
  sottoSoglia: boolean | null;
  ultimoTrattamento: string | null;
  prodotti: string[];
  giorniDaUltimoTrattamento: number | null;
  intervalloDitta: [number, number] | null;
  fonte: Fonte | null;
  note: string[];
}

export interface RischioResult {
  avversita: Avversita;
  valore: number | null;
  serie: string;
  fonte: Fonte | null;
  note: string[];
}

export interface FenologiaResult {
  giorno: string;
  bbch: number | null;
  fase: string | null;
  numeroFoglie: number | null;
  fonte: Fonte | null;
  /** Il BBCH del quaderno resta congelato per settimane: qui si dichiara lo scarto. */
  bbchDichiaratoUtente: number | null;
}

export interface Alert {
  tipo: "protezione_sotto_soglia" | "dilavamento" | "conformita";
  avversita: Avversita | null;
  titolo: string;
  dettaglio: string;
  giorno: string;
  fonte: Fonte | null;
}

export interface FinestraSintomi {
  da: string;
  a: string;
  confidenza: "alta" | "media" | "bassa";
  fattoriIncertezza: string[];
  validazioneNota?: string;
  fonte: Fonte | null;
}

export interface DilavamentoResult {
  avversita: Avversita;
  ultimoTrattamento: string | null;
  prodotti: string[];
  pioggiaCumulataMm: number;
  finestraOre: number;
  /** Null quando la resistenza al dilavamento del prodotto non è verificata su etichetta. */
  superata: boolean | null;
  sogliaMm: number | null;
  note: string[];
}

export interface ProdottoDaRegistrare {
  nomeCommerciale: string;
  doseHa?: number | null;
  /** Se assente si usa l'avversità dichiarata in etichetta per quel prodotto. */
  avversita?: string;
}

export interface OperazionePayload {
  data: string;
  prodotti: ProdottoDaRegistrare[];
  haTrattati: number;
  bbch?: number | null;
  origine: "chat" | "vocale" | "manuale";
}

/** Una riga di quaderno per prodotto, come nel foglio Trattamenti di BASF. */
export interface EsitoRegistrazione {
  ids: string[];
  righe: { id: string; prodotto: string; avversita: string }[];
}

export interface AgrigeniusAdapter {
  getAppezzamentoId(): string;
  getProtezione(giorno: string, avversita: Avversita): Promise<ProtezioneResult>;
  getRischio(giorno: string, avversita: Avversita): Promise<RischioResult>;
  getFenologia(giorno: string): Promise<FenologiaResult>;
  getAlert(giorno: string): Promise<Alert[]>;
  getDilavamento(giorno: string, avversita: Avversita): Promise<DilavamentoResult>;
  getFinestraSintomi(giornoInfezione: string, avversita: Avversita): Promise<FinestraSintomi>;
  getOperazioni(fino?: string): Promise<Operazione[]>;
  registraOperazione(payload: OperazionePayload): Promise<EsitoRegistrazione>;
}
