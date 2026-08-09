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

async function chiamata<T>(percorso: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${percorso}`, init);
  if (!response.ok) throw new Error(`${percorso} ha risposto ${response.status}`);
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
    headers: { "content-type": "application/json" },
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
