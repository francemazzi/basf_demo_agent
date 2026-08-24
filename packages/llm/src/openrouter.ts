import { loadEnv } from "@basf/core";

export type ProviderLlm = "openrouter" | "ollama";

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

export interface ConfigLlm {
  provider: ProviderLlm;
  baseUrl: string;
  apiKey: string;
  model: string;
  visionModel: string;
}

const DEFAULTS = {
  openrouter: {
    baseUrl: "https://openrouter.ai/api/v1",
    model: "openai/gpt-4o-mini",
    visionModel: "google/gemini-2.0-flash-001",
  },
  ollama: {
    baseUrl: "http://localhost:11434/v1",
    model: "llama3.1",
    visionModel: "llava",
  },
} as const;

export function providerLlm(): ProviderLlm {
  loadEnv();
  return process.env.LLM_PROVIDER?.toLowerCase() === "ollama" ? "ollama" : "openrouter";
}

export function configLlm(): ConfigLlm {
  loadEnv();
  const provider = providerLlm();
  const defaults = DEFAULTS[provider];
  const apiKey = (
    process.env.LLM_API_KEY ??
    process.env.OPENROUTER_API_KEY ??
    (provider === "ollama" ? "ollama" : "")
  ).trim();

  return {
    provider,
    baseUrl: process.env.LLM_BASE_URL ?? process.env.OPENROUTER_BASE_URL ?? defaults.baseUrl,
    apiKey,
    model: process.env.LLM_MODEL ?? process.env.OPENROUTER_MODEL ?? defaults.model,
    visionModel:
      process.env.LLM_VISION_MODEL ?? process.env.OPENROUTER_VISION_MODEL ?? defaults.visionModel,
  };
}

export const ERRORE_CHIAVE_OPENROUTER =
  "OPENROUTER_API_KEY non impostata. Impostala nel .env alla radice del repo.";

export function chiaveDisponibile(): boolean {
  loadEnv();
  if (providerLlm() === "ollama") return true;
  const chiave = (process.env.LLM_API_KEY ?? process.env.OPENROUTER_API_KEY ?? "").trim();
  return chiave.length > 0;
}

/** Modello economico: i gate girano a ogni chiusura di fase, non devono costare. */
export function modelloDefault(): string {
  return configLlm().model;
}

export function modelloVisionDefault(): string {
  return configLlm().visionModel;
}

export async function chat(opzioni: OpzioniChat): Promise<RispostaLlm> {
  const cfg = configLlm();
  if (cfg.provider !== "ollama" && !cfg.apiKey) {
    throw new Error("LLM_API_KEY o OPENROUTER_API_KEY non impostata");
  }

  const response = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${cfg.apiKey}`,
      "content-type": "application/json",
      "x-title": "BASF Demo Agent",
    },
    body: JSON.stringify({
      model: opzioni.model ?? cfg.model,
      messages: opzioni.messaggi,
      ...(opzioni.tools ? { tools: opzioni.tools } : {}),
      ...(opzioni.jsonMode ? { response_format: { type: "json_object" } } : {}),
      temperature: opzioni.temperature ?? 0,
      max_tokens: opzioni.maxTokens ?? 700,
    }),
  });

  if (!response.ok) {
    throw new Error(`LLM ha risposto ${response.status}: ${await response.text()}`);
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
