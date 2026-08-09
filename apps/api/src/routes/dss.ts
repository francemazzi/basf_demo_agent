import type { FastifyInstance } from "fastify";

import type { MockAgrigeniusAdapter } from "@basf/adapter";
import { parseAvversita, today, type OperazionePayload } from "@basf/core";

interface QueryGiorno {
  giorno?: string;
  avversita?: string;
  fino?: string;
}

export function registerDssRoutes(app: FastifyInstance, adapter: MockAgrigeniusAdapter): void {
  const leggiAvversita = (raw: string | undefined) => {
    const avversita = parseAvversita(raw ?? "");
    if (!avversita) {
      const errore = Object.assign(new Error(`Avversità non valida: ${raw}`), { statusCode: 400 });
      throw errore;
    }
    return avversita;
  };

  app.get<{ Querystring: QueryGiorno }>("/dss/protezione", async (request) => {
    const giorno = request.query.giorno ?? today();
    return adapter.getProtezione(giorno, leggiAvversita(request.query.avversita));
  });

  app.get<{ Querystring: QueryGiorno }>("/dss/rischio", async (request) => {
    const giorno = request.query.giorno ?? today();
    return adapter.getRischio(giorno, leggiAvversita(request.query.avversita));
  });

  app.get<{ Querystring: QueryGiorno }>("/dss/fenologia", async (request) =>
    adapter.getFenologia(request.query.giorno ?? today()),
  );

  app.get<{ Querystring: QueryGiorno }>("/dss/alert", async (request) =>
    adapter.getAlert(request.query.giorno ?? today()),
  );

  app.get<{ Querystring: QueryGiorno }>("/dss/dilavamento", async (request) => {
    const giorno = request.query.giorno ?? today();
    return adapter.getDilavamento(giorno, leggiAvversita(request.query.avversita));
  });

  app.get<{ Querystring: QueryGiorno }>("/dss/finestra-sintomi", async (request) => {
    const giorno = request.query.giorno ?? today();
    return adapter.getFinestraSintomi(giorno, leggiAvversita(request.query.avversita));
  });

  app.get<{ Querystring: QueryGiorno }>("/operazioni", async (request) =>
    adapter.getOperazioni(request.query.fino),
  );

  app.post<{ Body: OperazionePayload }>("/operazioni", async (request) =>
    adapter.registraOperazione(request.body),
  );
}
