import { loadEnv, optionalEnv } from "@basf/core";

export type Ruolo = "system" | "user" | "assistant" | "tool";

export interface ContenutoTesto {
  type: "text";
  text: string;
}

export interface ContenutoImmagine {
  type: "image_url";
  image_url: { url: string };
}

export interface Messaggio {
  role: Ruolo;
  content: string | (ContenutoTesto | ContenutoImmagine)[];
  tool_call_id?: string;
  tool_calls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export interface DefinizioneTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface RispostaLlm {
  testo: string;
  toolCalls: ToolCall[];
}

export interface OpzioniChat {
  messaggi: Messaggio[];
  tools?: DefinizioneTool[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

export function chiaveDisponibile(): boolean {
  loadEnv();
  return Boolean(process.env.OPENROUTER_API_KEY);
}

/** Modello economico: i gate girano a ogni chiusura di fase, non devono costare. */
export function modelloDefault(): string {
  return optionalEnv("OPENROUTER_MODEL", "openai/gpt-4o-mini");
}

export function modelloVisionDefault(): string {
  return optionalEnv("OPENROUTER_VISION_MODEL", "google/gemini-2.0-flash-001");
}

export async function chat(opzioni: OpzioniChat): Promise<RispostaLlm> {
  loadEnv();
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY non impostata");

  const baseUrl = optionalEnv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1");
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      "x-title": "BASF Demo Agent",
    },
    body: JSON.stringify({
      model: opzioni.model ?? modelloDefault(),
      messages: opzioni.messaggi,
      ...(opzioni.tools ? { tools: opzioni.tools } : {}),
      ...(opzioni.jsonMode ? { response_format: { type: "json_object" } } : {}),
      temperature: opzioni.temperature ?? 0,
      max_tokens: opzioni.maxTokens ?? 700,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter ha risposto ${response.status}: ${await response.text()}`);
  }

  const payload = (await response.json()) as {
    choices?: { message?: { content?: string | null; tool_calls?: ToolCall[] } }[];
  };
  const messaggio = payload.choices?.[0]?.message;

  return {
    testo: messaggio?.content ?? "",
    toolCalls: messaggio?.tool_calls ?? [],
  };
}
