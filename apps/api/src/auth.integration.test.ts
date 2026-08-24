import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { disconnect, prisma } from "@basf/db";
import { chiaveDisponibile } from "@basf/llm";

import { buildServer } from "./server.js";

let app: FastifyInstance;
const emailTest = `test-auth-${Date.now()}@basf.com`;
const password = "viticoltore-demo";

function cookiesDa(risposta: { cookies: { name: string; value: string }[] }): Record<string, string> {
  const cookies: Record<string, string> = {};
  for (const cookie of risposta.cookies) {
    cookies[cookie.name] = cookie.value;
  }
  return cookies;
}

beforeAll(async () => {
  app = await buildServer();
});

afterAll(async () => {
  await prisma().user.deleteMany({ where: { email: emailTest } });
  await app.close();
  await disconnect();
});

describe("Auth allowlist e sessione", () => {
  it("rifiuta la registrazione di un'email fuori allowlist", async () => {
    const risposta = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "altro@gmail.com", password },
    });
    expect(risposta.statusCode).toBe(403);
  });

  it("registra un indirizzo BASF, mantiene il cookie e risponde su /me", async () => {
    const registrazione = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: emailTest, password },
    });
    expect(registrazione.statusCode).toBe(201);
    const cookies = cookiesDa(registrazione);
    expect(cookies["basf.sid"]).toBeTruthy();

    const me = await app.inject({
      method: "GET",
      url: "/auth/me",
      cookies,
    });
    expect(me.statusCode).toBe(200);
    expect(me.json()).toMatchObject({ email: emailTest });
  });

  it("rifiuta il login con password sbagliata", async () => {
    const risposta = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: emailTest, password: "sbagliata-sbagliata" },
    });
    expect(risposta.statusCode).toBe(401);
  });
});

describe("Conversazioni persistenti", () => {
  it("crea una conversazione e la rilette", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: emailTest, password },
    });
    const cookies = cookiesDa(login);

    const creata = await app.inject({
      method: "POST",
      url: "/conversations",
      cookies,
      payload: { giorno: "2026-05-11" },
    });
    expect(creata.statusCode).toBe(201);
    const conversazione = creata.json() as { id: string; giorno: string };
    expect(conversazione.giorno).toBe("2026-05-11");

    const elenco = await app.inject({ method: "GET", url: "/conversations", cookies });
    const voci = elenco.json() as { id: string }[];
    expect(voci.some((voce) => voce.id === conversazione.id)).toBe(true);

    const dettaglio = await app.inject({
      method: "GET",
      url: `/conversations/${conversazione.id}`,
      cookies,
    });
    expect(dettaglio.statusCode).toBe(200);
    expect((dettaglio.json() as { messages: unknown[] }).messages).toEqual([]);
  });

  it("senza sessione le conversazioni restano chiuse", async () => {
    const risposta = await app.inject({ method: "GET", url: "/conversations" });
    expect(risposta.statusCode).toBe(401);
  });

  it("un turno in chat resta salvato, oppure 503 se manca OpenRouter", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: emailTest, password },
    });
    const cookies = cookiesDa(login);
    const creata = await app.inject({
      method: "POST",
      url: "/conversations",
      cookies,
      payload: { giorno: "2026-08-09" },
    });
    const id = (creata.json() as { id: string }).id;

    const turno = await app.inject({
      method: "POST",
      url: `/conversations/${id}/messages`,
      cookies,
      payload: { messaggio: "come sto messo con l'oidio?" },
    });

    if (!chiaveDisponibile()) {
      expect(turno.statusCode).toBe(503);
      return;
    }

    expect(turno.statusCode).toBe(200);
    const dettaglio = await app.inject({
      method: "GET",
      url: `/conversations/${id}`,
      cookies,
    });
    const messaggi = (dettaglio.json() as { messages: { ruolo: string; testo: string }[] }).messages;
    expect(messaggi).toHaveLength(2);
    expect(messaggi[0]?.ruolo).toBe("utente");
    expect(messaggi[1]?.ruolo).toBe("agente");
    expect(messaggi[1]?.testo.length).toBeGreaterThan(10);
  });
});
