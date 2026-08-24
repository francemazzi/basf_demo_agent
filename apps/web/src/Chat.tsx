import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  aggiornaGiornoConversazione,
  creaConversazione,
  elencaConversazioni,
  ErroreApi,
  esci,
  inviaInConversazione,
  leggiConversazione,
  leggiMe,
  type ConversazioneElenco,
  type MessaggioSalvato,
  type Utente,
} from "./api.js";
import { GIORNI_DEMO, GIORNO_DEFAULT } from "./giorni.js";

export function Chat() {
  const navigate = useNavigate();
  const [utente, setUtente] = useState<Utente | null>(null);
  const [elenco, setElenco] = useState<ConversazioneElenco[]>([]);
  const [attivaId, setAttivaId] = useState<string | null>(null);
  const [giorno, setGiorno] = useState(GIORNO_DEFAULT);
  const [messaggi, setMessaggi] = useState<MessaggioSalvato[]>([]);
  const [bozza, setBozza] = useState("");
  const [inAttesa, setInAttesa] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const fondo = useRef<HTMLDivElement>(null);

  const ricaricaElenco = useCallback(async () => {
    const voci = await elencaConversazioni();
    setElenco(voci);
    return voci;
  }, []);

  useEffect(() => {
    let annullato = false;
    void (async () => {
      try {
        const me = await leggiMe();
        if (annullato) return;
        setUtente(me);
        const voci = await ricaricaElenco();
        if (annullato) return;
        if (voci[0]) {
          setAttivaId(voci[0].id);
        } else {
          const nuova = await creaConversazione(GIORNO_DEFAULT);
          if (annullato) return;
          setElenco([nuova]);
          setAttivaId(nuova.id);
        }
      } catch (causa) {
        if (causa instanceof ErroreApi && causa.status === 401) {
          navigate("/accedi");
          return;
        }
        setErrore(causa instanceof Error ? causa.message : "Impossibile aprire la chat");
      }
    })();
    return () => {
      annullato = true;
    };
  }, [navigate, ricaricaElenco]);

  useEffect(() => {
    if (!attivaId) return;
    let annullato = false;
    void leggiConversazione(attivaId)
      .then((dettaglio) => {
        if (annullato) return;
        setGiorno(dettaglio.giorno);
        setMessaggi(dettaglio.messages);
        setErrore(null);
      })
      .catch((causa: unknown) => {
        if (!annullato) {
          setErrore(causa instanceof Error ? causa.message : "Conversazione non letta");
        }
      });
    return () => {
      annullato = true;
    };
  }, [attivaId]);

  useEffect(() => {
    fondo.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messaggi, inAttesa]);

  async function nuovaChat() {
    const creata = await creaConversazione(giorno);
    setElenco((precedenti) => [creata, ...precedenti]);
    setAttivaId(creata.id);
    setMessaggi([]);
  }

  async function cambiaGiorno(valore: string) {
    setGiorno(valore);
    if (!attivaId) return;
    await aggiornaGiornoConversazione(attivaId, valore);
    setElenco((precedenti) =>
      precedenti.map((voce) => (voce.id === attivaId ? { ...voce, giorno: valore } : voce)),
    );
  }

  async function invia() {
    const pulito = bozza.trim();
    if (!pulito || !attivaId || inAttesa) return;
    setBozza("");
    setInAttesa(true);
    setErrore(null);
    setMessaggi((precedenti) => [
      ...precedenti,
      { id: `tmp-${crypto.randomUUID()}`, ruolo: "utente", testo: pulito, createdAt: "" },
    ]);
    try {
      const esito = await inviaInConversazione(attivaId, pulito);
      setMessaggi((precedenti) => {
        const senzaTemporaneo = precedenti.filter((voce) => !voce.id.startsWith("tmp-"));
        return [...senzaTemporaneo, esito.utente, esito.agente];
      });
      await ricaricaElenco();
    } catch (causa) {
      setErrore(causa instanceof Error ? causa.message : "Invio non riuscito");
      setMessaggi((precedenti) => precedenti.filter((voce) => !voce.id.startsWith("tmp-")));
      setBozza(pulito);
    } finally {
      setInAttesa(false);
    }
  }

  async function logout() {
    await esci();
    navigate("/");
  }

  if (!utente) {
    return (
      <p className="grid min-h-dvh place-items-center text-sm text-pietra-700">Apro la chat…</p>
    );
  }

  return (
    <div className="flex h-dvh overflow-hidden">
      <aside className="flex w-64 shrink-0 flex-col bg-vigna-950 text-pietra-50">
        <div className="border-b border-white/10 px-4 py-4">
          <p className="text-[0.65rem] uppercase tracking-[0.18em] text-vigna-300">Agrigenius Vite</p>
          <h1 className="mt-1 font-display text-2xl">Prove di campo</h1>
        </div>
        <button
          type="button"
          onClick={() => void nuovaChat()}
          className="mx-3 mt-3 rounded-lg border border-white/15 px-3 py-2 text-left text-sm transition hover:bg-white/10"
        >
          Nuova chat
        </button>
        <nav className="mt-3 flex-1 overflow-y-auto px-2">
          {elenco.map((voce) => (
            <button
              key={voce.id}
              type="button"
              onClick={() => setAttivaId(voce.id)}
              className={
                voce.id === attivaId
                  ? "mb-1 w-full rounded-lg bg-vigna-800 px-3 py-2 text-left text-sm"
                  : "mb-1 w-full rounded-lg px-3 py-2 text-left text-sm text-vigna-300 transition hover:bg-white/10 hover:text-pietra-50"
              }
            >
              <span className="block truncate">{voce.title}</span>
              <span className="mt-0.5 block text-[0.65rem] uppercase tracking-wide opacity-70">
                {voce.giorno}
              </span>
            </button>
          ))}
        </nav>
        <div className="border-t border-white/10 px-4 py-4 text-xs text-vigna-300">
          <p className="truncate">{utente.email}</p>
          <div className="mt-2 flex gap-3">
            <Link to="/" className="hover:text-pietra-50">
              Demo
            </Link>
            <button type="button" onClick={() => void logout()} className="hover:text-pietra-50">
              Esci
            </button>
          </div>
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col bg-[#f3f1ea]">
        <header className="flex flex-wrap items-center gap-2 border-b border-pietra-200 px-5 py-3">
          {GIORNI_DEMO.map((scelta) => (
            <button
              key={scelta.valore}
              type="button"
              onClick={() => void cambiaGiorno(scelta.valore)}
              className={
                scelta.valore === giorno
                  ? "rounded-lg bg-vigna-800 px-3 py-1.5 text-xs text-pietra-50"
                  : "rounded-lg border border-pietra-200 px-3 py-1.5 text-xs text-pietra-700 transition hover:border-vigna-300"
              }
            >
              {scelta.etichetta}
            </button>
          ))}
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-6">
          <div className="mx-auto flex max-w-2xl flex-col gap-4">
            {messaggi.length === 0 && !inAttesa && (
              <p className="m-auto max-w-sm pt-24 text-center text-sm text-pietra-500">
                Stessi dati del vigneto di Vidor. Scrivi come faresti in campo, oppure usa le
                date in alto per gli scenari della demo.
              </p>
            )}
            {messaggi.map((messaggio) => (
              <p
                key={messaggio.id}
                className={
                  messaggio.ruolo === "utente"
                    ? "ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-vigna-800 px-4 py-3 text-sm text-pietra-50"
                    : "mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-white px-4 py-3 text-sm text-vigna-950 shadow-sm"
                }
              >
                {messaggio.testo}
              </p>
            ))}
            {inAttesa && (
              <span className="mr-auto flex gap-1 rounded-2xl bg-white px-4 py-3 shadow-sm">
                {[0, 1, 2].map((punto) => (
                  <i
                    key={punto}
                    className="punto-scrittura size-1.5 rounded-full bg-vigna-600"
                    style={{ animationDelay: `${punto * 160}ms` }}
                  />
                ))}
              </span>
            )}
            <div ref={fondo} />
          </div>
        </div>

        <form
          className="border-t border-pietra-200 px-5 py-4"
          onSubmit={(evento) => {
            evento.preventDefault();
            void invia();
          }}
        >
          <div className="mx-auto flex max-w-2xl flex-col gap-2">
            {errore && <p className="text-sm text-ambra-500">{errore}</p>}
            <div className="flex items-end gap-2">
              <textarea
                value={bozza}
                onChange={(evento) => setBozza(evento.target.value)}
                onKeyDown={(evento) => {
                  if (evento.key === "Enter" && !evento.shiftKey) {
                    evento.preventDefault();
                    void invia();
                  }
                }}
                rows={2}
                placeholder="Scrivi un messaggio"
                className="min-h-[2.75rem] min-w-0 flex-1 resize-none rounded-2xl border border-pietra-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-vigna-600"
              />
              <button
                type="submit"
                disabled={inAttesa || bozza.trim().length === 0}
                className="rounded-2xl bg-vigna-800 px-4 py-2.5 text-sm text-pietra-50 transition hover:bg-vigna-600 disabled:opacity-40"
              >
                Invia
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}
