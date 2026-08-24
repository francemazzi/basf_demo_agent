import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { leggiCapacita, leggiMe, leggiStatoRegia, resetQuaderno, type StatoRegia, type UsoStrumento, type Utente } from "./api.js";
import { GIORNI_DEMO } from "./giorni.js";
import { Guida } from "./Guida.js";
import { Regia } from "./Regia.js";
import { Simulatore } from "./Simulatore.js";

export function Landing() {
  const [giorno, setGiorno] = useState("2026-08-09");
  const [stato, setStato] = useState<StatoRegia | null>(null);
  const [strumenti, setStrumenti] = useState<UsoStrumento[]>([]);
  const [guidaAperta, setGuidaAperta] = useState(false);
  const [utente, setUtente] = useState<Utente | null>(null);
  const [llmPronto, setLlmPronto] = useState(true);

  const aggiorna = useCallback(() => {
    leggiStatoRegia(giorno)
      .then(setStato)
      .catch(() => setStato(null));
  }, [giorno]);

  useEffect(aggiorna, [aggiorna]);

  useEffect(() => {
    leggiMe()
      .then(setUtente)
      .catch(() => setUtente(null));
    leggiCapacita()
      .then((capacita) => setLlmPronto(capacita.llmPronto))
      .catch(() => setLlmPronto(false));
  }, []);

  useEffect(() => {
    function onEscape(evento: KeyboardEvent) {
      if (evento.key === "Escape") setGuidaAperta(false);
    }
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, []);

  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl flex-col gap-12 px-6 py-10 lg:py-16">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.2em] text-vigna-600">
            Dimostrazione tecnica · BASF Agrigenius Vite
          </p>
          <h1 className="mt-3 font-display text-5xl leading-[1.05] sm:text-6xl">
            Assistente di campo
          </h1>
          <p className="mt-4 max-w-lg text-pietra-700">
            Un viticoltore scrive su WhatsApp. Il modello previsionale risponde con parole sue, e
            ogni numero porta scritto da dove viene.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            aria-label="Come usare la demo"
            onClick={() => setGuidaAperta(true)}
            className="grid size-10 place-items-center rounded-full border border-pietra-200 bg-white text-sm font-medium italic text-vigna-800 transition hover:border-vigna-600"
          >
            i
          </button>
          <Link
            to={utente ? "/chat" : "/accedi"}
            className="rounded-xl bg-vigna-800 px-4 py-2 text-sm text-pietra-50 transition hover:bg-vigna-600"
          >
            {utente ? "Apri la chat" : "Accedi"}
          </Link>
        </div>
      </header>

      {!llmPronto && (
        <p className="rounded-xl border border-ambra-500/40 bg-ambra-100 px-4 py-3 text-sm text-pietra-700">
          OpenRouter non è configurato: manca OPENROUTER_API_KEY nel .env. La chat non risponde
          finché la chiave non c’è.
        </p>
      )}

      <nav className="flex flex-wrap gap-2">
        {GIORNI_DEMO.map((scelta) => (
          <button
            key={scelta.valore}
            type="button"
            onClick={() => setGiorno(scelta.valore)}
            className={
              scelta.valore === giorno
                ? "rounded-xl bg-vigna-800 px-4 py-2 text-sm text-pietra-50"
                : "rounded-xl border border-pietra-200 px-4 py-2 text-sm text-pietra-700 transition hover:border-vigna-300"
            }
          >
            {scelta.etichetta}
          </button>
        ))}
      </nav>

      <main className="flex flex-col items-start gap-12 lg:flex-row lg:gap-16">
        <Simulatore giorno={giorno} onStrumenti={setStrumenti} onAggiornaStato={aggiorna} />
        <Regia
          stato={stato}
          strumenti={strumenti}
          onReset={() => {
            void resetQuaderno().then(aggiorna);
          }}
        />
      </main>

      <Guida aperta={guidaAperta} onChiudi={() => setGuidaAperta(false)} />
    </div>
  );
}
