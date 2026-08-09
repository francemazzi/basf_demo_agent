import { useCallback, useEffect, useState } from "react";

import { leggiStatoRegia, resetQuaderno, type StatoRegia, type UsoStrumento } from "./api.js";
import { Regia } from "./Regia.js";
import { Simulatore } from "./Simulatore.js";

const GIORNI_DEMO = [
  { valore: "2026-05-11", etichetta: "11 mag · dopo la pioggia" },
  { valore: "2026-06-04", etichetta: "4 giu · terzo Revysion" },
  { valore: "2026-08-09", etichetta: "9 ago · copertura in calo" },
];

export function App() {
  const [giorno, setGiorno] = useState("2026-08-09");
  const [stato, setStato] = useState<StatoRegia | null>(null);
  const [strumenti, setStrumenti] = useState<UsoStrumento[]>([]);

  const aggiorna = useCallback(() => {
    leggiStatoRegia(giorno)
      .then(setStato)
      .catch(() => setStato(null));
  }, [giorno]);

  useEffect(aggiorna, [aggiorna]);

  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl flex-col gap-12 px-6 py-10 lg:py-16">
      <header className="max-w-2xl">
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
      </header>

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
    </div>
  );
}
