import type { FastifyInstance } from "fastify";

import type { MockAgrigeniusAdapter } from "@basf/adapter";
import { rispondi, trascrivi, trascrizioneDisponibile } from "@basf/agent";
import { loadEnv, optionalEnv, today } from "@basf/core";

interface MessaggioWhatsApp {
  from: string;
  type: "text" | "audio" | "image";
  text?: { body: string };
  audio?: { id: string };
  image?: { id: string };
}

interface CorpoWebhook {
  entry?: {
    changes?: {
      value?: {
        messages?: MessaggioWhatsApp[];
      };
    }[];
  }[];
}

/**
 * Webhook WhatsApp Business Cloud API. Se Meta non approva il numero in tempo,
 * la demo gira sul simulatore in `apps/web`: le due strade passano dallo stesso agente.
 */
export function registerWhatsAppRoutes(
  app: FastifyInstance,
  adapter: MockAgrigeniusAdapter,
): void {
  app.get<{
    Querystring: { "hub.mode"?: string; "hub.verify_token"?: string; "hub.challenge"?: string };
  }>("/whatsapp/webhook", async (request, reply) => {
    loadEnv();
    const atteso = process.env.WHATSAPP_VERIFY_TOKEN;
    const query = request.query;
    if (query["hub.mode"] === "subscribe" && atteso && query["hub.verify_token"] === atteso) {
      return reply.type("text/plain").send(query["hub.challenge"] ?? "");
    }
    return reply.code(403).send({ errore: "Verifica fallita" });
  });

  app.post<{ Body: CorpoWebhook }>("/whatsapp/webhook", async (request, reply) => {
    const messaggi = request.body.entry?.[0]?.changes?.[0]?.value?.messages ?? [];
    // Meta ritenta se non riceve 200 in fretta: si risponde subito e si lavora dopo.
    reply.code(200).send({ ricevuto: messaggi.length });

    for (const messaggio of messaggi) {
      const testo = await testoDelMessaggio(messaggio);
      if (!testo) continue;
      const risposta = await rispondi(testo, { adapter, giorno: today() });
      await inviaMessaggio(messaggio.from, risposta.testo);
    }
  });
}

async function testoDelMessaggio(messaggio: MessaggioWhatsApp): Promise<string | null> {
  if (messaggio.type === "text") return messaggio.text?.body ?? null;
  if (messaggio.type === "audio" && messaggio.audio && trascrizioneDisponibile()) {
    const audio = await scaricaMedia(messaggio.audio.id);
    return audio ? trascrivi(audio, "audio/ogg") : null;
  }
  return null;
}

async function scaricaMedia(mediaId: string): Promise<Buffer | null> {
  loadEnv();
  const token = process.env.WHATSAPP_TOKEN;
  if (!token) return null;

  const meta = await fetch(`https://graph.facebook.com/v21.0/${mediaId}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!meta.ok) return null;
  const { url } = (await meta.json()) as { url?: string };
  if (!url) return null;

  const file = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
  if (!file.ok) return null;
  return Buffer.from(await file.arrayBuffer());
}

async function inviaMessaggio(destinatario: string, testo: string): Promise<void> {
  loadEnv();
  const token = process.env.WHATSAPP_TOKEN;
  const numero = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !numero) return;

  await fetch(
    `${optionalEnv("WHATSAPP_API_URL", "https://graph.facebook.com/v21.0")}/${numero}/messages`,
    {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: destinatario,
        type: "text",
        text: { body: testo },
      }),
    },
  );
}
