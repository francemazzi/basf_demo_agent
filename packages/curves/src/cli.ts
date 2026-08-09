import { addDays, today, toDay } from "@basf/core";
import { disconnect } from "@basf/db";

import { eseguiPipelineCurve } from "./pipeline.js";

const fino = toDay(addDays(new Date(`${today()}T00:00:00.000Z`), 14));

eseguiPipelineCurve({ appezzamentoId: "vidor-cal-nova", fino })
  .then((esito) => {
    console.log("Serie da grafici:", esito.serieVision.join(", ") || "nessuna");
    console.log("Serie ricostruite:", esito.serieRicostruite.join(", ") || "nessuna");
    console.log("Punti scritti:", esito.puntiScritti);
    if (esito.immaginiMancanti.length > 0) {
      console.log("Immagini assenti in data/raw/media:", esito.immaginiMancanti.join(", "));
    }
    console.log("Report accuratezza:", esito.reportAccuratezza);
  })
  .catch((error: unknown) => {
    console.error("Pipeline curve fallita:", error);
    process.exitCode = 1;
  })
  .finally(() => disconnect());
