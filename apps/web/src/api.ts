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

export interface StatoRegia {
  giorno: string;
  demoDate: string;
  protezione: Record<string, ProtezioneRegia>;
  fenologia: {
    bbch: number | null;
    bbchDichiaratoUtente: number | null;
    numeroFoglie: number | null;
    fonte: string | null;
  };
  alert: { tipo: string; titolo: string; dettaglio: string; avversita: string | null }[];
  dilavamento: { ultimoTrattamento: string | null; pioggiaCumulataMm: number };
  conformita: { chiave: string; tipo: string; nApplicazioni: number }[];
}

export interface ProtezioneRegia {
  percentuale: number | null;
  sottoSoglia: boolean | null;
  statoDss: string | null;
  ultimoTrattamento: string | null;
  prodotti: string[];
  giorniDaUltimoTrattamento: number | null;
  fonte: string | null;
  note: string[];
}

export interface Utente {
  id: string;
  email: string;
}

export interface Capacita {
  trascrizioneVocale: boolean;
  demoDate: string;
  llmPronto: boolean;
  llmProvider: string;
}

export interface ConversazioneElenco {
  id: string;
  title: string;
  giorno: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessaggioSalvato {
  id: string;
  ruolo: "utente" | "agente";
  testo: string;
  createdAt: string;
}

export interface ConversazioneDettaglio extends ConversazioneElenco {
  messages: MessaggioSalvato[];
}

export class ErroreApi extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/$/, "") ?? "/api";

async function chiamata<T>(percorso: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  const response = await fetch(`${API_BASE}${percorso}`, {
    ...init,
    credentials: "include",
    headers,
  });
  if (!response.ok) {
    let dettaglio = `${percorso} ha risposto ${response.status}`;
    try {
      const corpo = (await response.json()) as { errore?: string };
      if (corpo.errore) dettaglio = corpo.errore;
    } catch {
      // corpo non JSON
    }
    throw new ErroreApi(dettaglio, response.status);
  }
  return (await response.json()) as T;
}

export function inviaMessaggio(body: {
  messaggio: string;
  storico: TurnoUtente[];
  giorno: string;
  immagineDataUrl?: string;
}): Promise<RispostaAgente> {
  return chiamata("/chat", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function apriProattivo(giorno: string): Promise<{ messaggio: string | null }> {
  return chiamata(`/chat/proattivo?giorno=${giorno}`);
}

export function leggiStatoRegia(giorno: string): Promise<StatoRegia> {
  return chiamata(`/regia/stato?giorno=${giorno}`);
}

export function resetQuaderno(): Promise<{ operazioniRimosse: number }> {
  return chiamata("/regia/reset", { method: "POST" });
}

export function leggiCapacita(): Promise<Capacita> {
  return chiamata("/capacita");
}

export function leggiMe(): Promise<Utente> {
  return chiamata("/auth/me");
}

export function registra(email: string, password: string): Promise<Utente> {
  return chiamata("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function accedi(email: string, password: string): Promise<Utente> {
  return chiamata("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function esci(): Promise<{ ok: boolean }> {
  return chiamata("/auth/logout", { method: "POST" });
}

export function elencaConversazioni(): Promise<ConversazioneElenco[]> {
  return chiamata("/conversations");
}

export function creaConversazione(giorno: string): Promise<ConversazioneElenco> {
  return chiamata("/conversations", {
    method: "POST",
    body: JSON.stringify({ giorno }),
  });
}

export function leggiConversazione(id: string): Promise<ConversazioneDettaglio> {
  return chiamata(`/conversations/${id}`);
}

export function aggiornaGiornoConversazione(
  id: string,
  giorno: string,
): Promise<ConversazioneElenco> {
  return chiamata(`/conversations/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ giorno }),
  });
}

export function inviaInConversazione(
  id: string,
  messaggio: string,
): Promise<{
  utente: MessaggioSalvato;
  agente: MessaggioSalvato;
  strumentiUsati: UsoStrumento[];
}> {
  return chiamata(`/conversations/${id}/messages`, {
    method: "POST",
    body: JSON.stringify({ messaggio }),
  });
}
