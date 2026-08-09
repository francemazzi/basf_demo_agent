import type { Avversita, Fonte } from "@basf/core";

/** Nel quaderno BASF l'avversità è scritta in italiano con l'iniziale maiuscola. */
export const AVVERSITA_DB: Record<Avversita, string> = {
  peronospora: "Peronospora",
  oidio: "Oidio",
  botrite: "Botrite",
  cicaline: "Cicaline",
};

export const SERIE_PROTEZIONE = "protezione_pct";
export const SERIE_BBCH = "bbch";
export const SERIE_FOGLIE = "numero_foglie";
export const AVVERSITA_FENOLOGIA = "fenologia";

export const FONTE_DB: Record<string, Fonte> = {
  BASF_EXPORT: "basf_export",
  BASF_DICHIARAZIONE_DSS: "basf_dichiarazione_dss",
  BASF_GRAFICO_ANCORAGGIO: "basf_grafico_ancoraggio",
  VISION_EXTRACTION: "vision_extraction",
  RICOSTRUZIONE: "ricostruzione",
};
