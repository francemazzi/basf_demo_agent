import { chiaveDisponibile } from "@basf/llm";

import { caricaSerieInDb, scriviSerie } from "./archivio.js";
import { ricostruisciFenologia, ricostruisciProtezione } from "./ricostruzione.js";
import type { SerieCurva } from "./tipi.js";
import { scriviReportAccuratezza, validaEstrazione } from "./validazione.js";
import { GRAFICI, estraiSerie, immagineDisponibile } from "./vision.js";

export interface EsitoPipeline {
  serieVision: string[];
  serieRicostruite: string[];
  puntiScritti: number;
  immaginiMancanti: string[];
  reportAccuratezza: string;
}

/**
 * Prima si prova a leggere i grafici veri, poi si riempiono i buchi con la
 * ricostruzione dichiarata. Ogni punto porta la propria `fonte`: in riunione si
 * deve poter dire quale numero è di BASF e quale è nostro.
 */
export async function eseguiPipelineCurve(options: {
  appezzamentoId: string;
  fino: string;
  conVision?: boolean;
}): Promise<EsitoPipeline> {
  const { appezzamentoId, fino } = options;
  const conVision = options.conVision ?? chiaveDisponibile();

  const serieVision: SerieCurva[] = [];
  const immaginiMancanti: string[] = [];

  for (const spec of GRAFICI) {
    if (!immagineDisponibile(spec.file)) {
      immaginiMancanti.push(spec.file);
      continue;
    }
    if (!conVision) continue;
    serieVision.push(await estraiSerie(spec, appezzamentoId));
  }

  const serieRicostruite = [
    ...(await ricostruisciProtezione(appezzamentoId, fino)),
    ...ricostruisciFenologia(appezzamentoId),
  ];

  for (const serie of [...serieVision, ...serieRicostruite]) scriviSerie(serie);
  const puntiScritti = await caricaSerieInDb([...serieVision, ...serieRicostruite]);

  const reportAccuratezza = scriviReportAccuratezza(await validaEstrazione(appezzamentoId));

  const etichetta = (serie: SerieCurva) => `${serie.avversita}/${serie.serie}`;
  return {
    serieVision: serieVision.map(etichetta),
    serieRicostruite: serieRicostruite.map(etichetta),
    puntiScritti,
    immaginiMancanti,
    reportAccuratezza,
  };
}
