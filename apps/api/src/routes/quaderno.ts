import type { FastifyInstance } from "fastify";

import type { MockAgrigeniusAdapter } from "@basf/adapter";
import { today } from "@basf/core";
import { esportaQuadernoPdf, righeQuaderno, statoMagazzino } from "@basf/quaderno";

export function registerQuadernoRoutes(
  app: FastifyInstance,
  adapter: MockAgrigeniusAdapter,
): void {
  app.get<{ Querystring: { fino?: string } }>("/quaderno", async (request) =>
    righeQuaderno(adapter.getAppezzamentoId(), request.query.fino ?? today()),
  );

  app.get<{ Querystring: { fino?: string } }>("/quaderno/magazzino", async (request) =>
    statoMagazzino(request.query.fino ?? today()),
  );

  app.get<{ Querystring: { fino?: string } }>("/quaderno/pdf", async (request, reply) => {
    const fino = request.query.fino ?? today();
    const pdf = await esportaQuadernoPdf(adapter.getAppezzamentoId(), fino);
    return reply
      .type("application/pdf")
      .header("content-disposition", `inline; filename="quaderno-${fino}.pdf"`)
      .send(Buffer.from(pdf));
  });
}
