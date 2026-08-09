import type { FastifyInstance } from "fastify";

import type { MockAgrigeniusAdapter } from "@basf/adapter";
import { today } from "@basf/core";
import { prisma } from "@basf/db";
import { conteggiConformita } from "@basf/kb";

/**
 * Pannello di regia: serve a chi registra il video, non va mostrato a BASF.
 * Mostra in chiaro cosa sta leggendo l'agente in un dato giorno.
 */
export function registerRegiaRoutes(app: FastifyInstance, adapter: MockAgrigeniusAdapter): void {
  app.get<{ Querystring: { giorno?: string } }>("/regia/stato", async (request) => {
    const giorno = request.query.giorno ?? today();

    const [protezionePeronospora, protezioneOidio, fenologia, alert, dilavamento, conteggi] =
      await Promise.all([
        adapter.getProtezione(giorno, "peronospora"),
        adapter.getProtezione(giorno, "oidio"),
        adapter.getFenologia(giorno),
        adapter.getAlert(giorno),
        adapter.getDilavamento(giorno, "peronospora"),
        conteggiConformita(giorno),
      ]);

    return {
      giorno,
      demoDate: today(),
      protezione: { peronospora: protezionePeronospora, oidio: protezioneOidio },
      fenologia,
      alert,
      dilavamento,
      conformita: conteggi.filter((voce) => voce.nApplicazioni >= 2).slice(0, 10),
    };
  });

  app.get("/regia/anomalie", async () => prisma().anomalia.findMany({ orderBy: { codice: "asc" } }));

  app.post("/regia/reset", async () => {
    const esito = await prisma().operazione.deleteMany({ where: { origine: { not: "seed" } } });
    return { operazioniRimosse: esito.count };
  });
}
