import { AIMessage, HumanMessage, SystemMessage, ToolMessage } from "@langchain/core/messages";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";

import { MockAgrigeniusAdapter } from "@basf/adapter";
import { today } from "@basf/core";
import { prisma } from "@basf/db";
import { chat, configLlm } from "@basf/llm";

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
  const cfg = configLlm();
  return new ChatOpenAI({
    model: nome ?? cfg.model,
    temperature: 0,
    apiKey: cfg.apiKey,
    configuration: {
      baseURL: cfg.baseUrl,
      defaultHeaders: { "x-title": "BASF Demo Agent" },
    },
  });
}

/** LLaVA e altri vision locali non espongono i tool: la foto si descrive a parte. */
async function testoConFoto(messaggio: string, immagineDataUrl?: string): Promise<string> {
  if (!immagineDataUrl) return messaggio;
  const descrizione = await chat({
    model: configLlm().visionModel,
    maxTokens: 250,
    messaggi: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Descrivi in due frasi, in italiano, cosa si vede nella foto. L'utente chiede: ${messaggio}`,
          },
          { type: "image_url", image_url: { url: immagineDataUrl } },
        ],
      },
    ],
  });
  const vista = descrizione.testo.trim();
  return vista ? `${messaggio}\n\nFoto allegata: ${vista}` : messaggio;
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
    new HumanMessage(await testoConFoto(messaggio, opzioni.immagineDataUrl)),
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
