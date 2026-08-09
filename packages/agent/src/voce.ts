import { loadEnv, optionalEnv } from "@basf/core";

export function trascrizioneDisponibile(): boolean {
  loadEnv();
  return Boolean(process.env.DEEPGRAM_API_KEY);
}

/**
 * Nota vocale in italiano. Senza chiave Deepgram il simulatore manda direttamente
 * il testo: la demo non si blocca su un servizio esterno.
 */
export async function trascrivi(audio: Buffer, mimeType = "audio/webm"): Promise<string> {
  loadEnv();
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) throw new Error("DEEPGRAM_API_KEY non impostata");

  const modello = optionalEnv("DEEPGRAM_MODEL", "nova-2");
  const url = new URL("https://api.deepgram.com/v1/listen");
  url.searchParams.set("model", modello);
  url.searchParams.set("language", "it");
  url.searchParams.set("smart_format", "true");

  const response = await fetch(url, {
    method: "POST",
    headers: { authorization: `Token ${apiKey}`, "content-type": mimeType },
    body: new Uint8Array(audio),
  });

  if (!response.ok) {
    throw new Error(`Deepgram ha risposto ${response.status}: ${await response.text()}`);
  }

  const payload = (await response.json()) as {
    results?: { channels?: { alternatives?: { transcript?: string }[] }[] };
  };
  return payload.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim() ?? "";
}
