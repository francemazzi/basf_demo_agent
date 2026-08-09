import type { AddressInfo } from "node:net";

import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { HttpAgrigeniusAdapter, MockAgrigeniusAdapter } from "@basf/adapter";
import { suiteContrattoAdapter } from "@basf/adapter/contract";
import { disconnect, prisma } from "@basf/db";

import { buildServer } from "./server.js";

let app: FastifyInstance;
let baseUrl = "";

/** Il gate deve poter girare due volte di fila: le scritture di test non restano. */
async function ripulisciScrittureDiTest() {
  await prisma().operazione.deleteMany({ where: { origine: { not: "seed" } } });
}

beforeAll(async () => {
  await ripulisciScrittureDiTest();
  app = await buildServer();
  await app.listen({ port: 0, host: "127.0.0.1" });
  baseUrl = `http://127.0.0.1:${(app.server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await ripulisciScrittureDiTest();
  await app.close();
  await disconnect();
});

suiteContrattoAdapter("mock", () => new MockAgrigeniusAdapter());
suiteContrattoAdapter("http", () => new HttpAgrigeniusAdapter(baseUrl));

describe("Gate 2 — registrazione operazioni", () => {
  it("scrive una nuova operazione derivando il BBCH quando non è dichiarato", async () => {
    const adapter = new MockAgrigeniusAdapter();
    const esito = await adapter.registraOperazione({
      data: "2026-08-09",
      prodotti: [
        { nomeCommerciale: "Kumulus tecno", doseHa: 2 },
        { nomeCommerciale: "Kauritil Tri Hi Bio", doseHa: 2 },
      ],
      haTrattati: 0.699,
      origine: "vocale",
    });

    // Una riga di quaderno per prodotto, con l'avversità presa dall'etichetta.
    expect(esito.righe.map((riga) => riga.avversita)).toEqual(["Oidio", "Peronospora"]);
    expect(new Set(esito.ids).size).toBe(2);

    const operazioni = await adapter.getOperazioni("2026-08-09");
    const creata = operazioni.find((operazione) => operazione.id === esito.ids[0]);
    expect(creata?.haTrattati).toBe(0.699);
    expect(creata?.bbchDichiarato).toBe(81);
    expect(creata?.prodotto.numeroRegistrazione).toBe("10048");
  });
});
