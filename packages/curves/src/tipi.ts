import type { Fonte } from "@basf/core";

export interface PuntoCurva {
  giorno: string;
  valore: number;
}

export interface SerieCurva {
  appezzamentoId: string;
  avversita: string;
  serie: string;
  fonte: Fonte;
  nota: string;
  punti: PuntoCurva[];
}

export const FONTE_DB_DA_CORE: Record<Fonte, string> = {
  basf_export: "BASF_EXPORT",
  basf_dichiarazione_dss: "BASF_DICHIARAZIONE_DSS",
  basf_grafico_ancoraggio: "BASF_GRAFICO_ANCORAGGIO",
  vision_extraction: "VISION_EXTRACTION",
  ricostruzione: "RICOSTRUZIONE",
};
