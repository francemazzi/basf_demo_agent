import { AIMessage, HumanMessage, SystemMessage, ToolMessage } from "@langchain/core/messages";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";

import { MockAgrigeniusAdapter } from "@basf/adapter";
import { optionalEnv, today } from "@basf/core";
import { prisma } from "@basf/db";
import { modelloDefault } from "@basf/llm";

import { creaStrumenti } from "./strumenti.js";
import { promptSistema } from "./tono.js";

export interface TurnoUtente {
  ruolo: "utente" | "agente";
  testo: string;
}

export interface UsoStrumento {
  nome: string;
  argomenti: string;
  risultato: string;
}

export interface RispostaAgente {
  testo: string;
  strumentiUsati: UsoStrumento[];
}

function modello(nome?: string): ChatOpenAI {
  return new ChatOpenAI({
    model: nome ?? modelloDefault(),
    temperature: 0,
    apiKey: process.env.OPENROUTER_API_KEY,
    configuration: {
      baseURL: optionalEnv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"),
      defaultHeaders: { "x-title": "BASF Demo Agent" },
    },
  });
}

/** Il contesto dell'appezzamento è sempre in memoria: l'utente non dice mai dove si trova. */
async function contesto(adapter: MockAgrigeniusAdapter, giorno: string) {
  const appezzamento = await prisma().appezzamento.findUnique({
    where: { id: adapter.getAppezzamentoId() },
  });
  return {
    giorno,
    appezzamento: appezzamento?.localita ?? "appezzamento",
    superficieHa: appezzamento?.superficieHa ?? 0,
    varieta: appezzamento?.varieta ?? "vite",
  };
}

export interface OpzioniConversazione {
  storico?: TurnoUtente[];
  giorno?: string;
  adapter?: MockAgrigeniusAdapter;
  nomeModello?: string;
  immagineDataUrl?: string;
}

export async function rispondi(
  messaggio: string,
  opzioni: OpzioniConversazione = {},
): Promise<RispostaAgente> {
  const adapter = opzioni.adapter ?? new MockAgrigeniusAdapter();
  const giorno = opzioni.giorno ?? today();

  const agente = createReactAgent({
    llm: modello(opzioni.nomeModello),
    tools: creaStrumenti(adapter, giorno),
  });

  const messaggi = [
    new SystemMessage(promptSistema(await contesto(adapter, giorno))),
    ...(opzioni.storico ?? []).map((turno) =>
      turno.ruolo === "utente" ? new HumanMessage(turno.testo) : new AIMessage(turno.testo),
    ),
    opzioni.immagineDataUrl
      ? new HumanMessage({
          content: [
            { type: "text", text: messaggio },
            { type: "image_url", image_url: { url: opzioni.immagineDataUrl } },
          ],
        })
      : new HumanMessage(messaggio),
  ];

  const esito = await agente.invoke({ messages: messaggi });
  const prodotti = esito.messages.slice(messaggi.length);

  const strumentiUsati: UsoStrumento[] = [];
  for (const [indice, prodotto] of prodotti.entries()) {
    if (!(prodotto instanceof AIMessage)) continue;
    for (const chiamata of prodotto.tool_calls ?? []) {
      const risposta = prodotti
        .slice(indice + 1)
        .find(
          (successivo): successivo is ToolMessage =>
            successivo instanceof ToolMessage && successivo.tool_call_id === chiamata.id,
        );
      strumentiUsati.push({
        nome: chiamata.name,
        argomenti: JSON.stringify(chiamata.args),
        risultato: typeof risposta?.content === "string" ? risposta.content : "",
      });
    }
  }

  const ultimo = prodotti.at(-1);
  const testo =
    ultimo && typeof ultimo.content === "string" ? ultimo.content : String(ultimo?.content ?? "");

  return { testo: testo.trim(), strumentiUsati };
}
