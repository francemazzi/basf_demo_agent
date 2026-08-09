import { useEffect, useRef, useState } from "react";

import { apriProattivo, inviaMessaggio, type TurnoUtente, type UsoStrumento } from "./api.js";

interface Props {
  giorno: string;
  onStrumenti: (strumenti: UsoStrumento[]) => void;
  onAggiornaStato: () => void;
}

const SUGGERIMENTI = [
  "Sono ancora coperto per l'oidio?",
  "Ha piovuto stanotte, devo ridare?",
  "Ho dato zolfo e rame stamattina su tutto",
  "Quante volte ho usato lo zolfo quest'anno?",
];

export function Simulatore({ giorno, onStrumenti, onAggiornaStato }: Props) {
  const [turni, setTurni] = useState<TurnoUtente[]>([]);
  const [bozza, setBozza] = useState("");
  const [inAttesa, setInAttesa] = useState(false);
  const fondo = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTurni([]);
    let annullato = false;
    apriProattivo(giorno)
      .then((apertura) => {
        if (annullato || !apertura.messaggio) return;
        setTurni([{ ruolo: "agente", testo: apertura.messaggio }]);
      })
      .catch(() => undefined);
    return () => {
      annullato = true;
    };
  }, [giorno]);

  useEffect(() => {
    fondo.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turni, inAttesa]);

  async function invia(testo: string) {
    const pulito = testo.trim();
    if (!pulito || inAttesa) return;

    const storico = turni;
    setTurni([...storico, { ruolo: "utente", testo: pulito }]);
    setBozza("");
    setInAttesa(true);

    try {
      const risposta = await inviaMessaggio({ messaggio: pulito, storico, giorno });
      setTurni((precedenti) => [...precedenti, { ruolo: "agente", testo: risposta.testo }]);
      onStrumenti(risposta.strumentiUsati);
      onAggiornaStato();
    } catch {
      setTurni((precedenti) => [
        ...precedenti,
        { ruolo: "agente", testo: "Non riesco a raggiungere il servizio. Riprova." },
      ]);
    } finally {
      setInAttesa(false);
    }
  }

  return (
    <section className="flex w-full max-w-sm flex-col overflow-hidden rounded-[2.25rem] border-8 border-vigna-950 bg-[#f2efe6] shadow-[0_40px_80px_-30px_rgba(16,35,26,0.55)]">
      <header className="flex items-center gap-3 bg-vigna-800 px-4 py-3 text-pietra-50">
        <span className="grid size-9 place-items-center rounded-full bg-vigna-600 font-display text-lg">
          A
        </span>
        <div className="leading-tight">
          <p className="text-sm font-medium">Assistente di campo</p>
          <p className="text-xs text-vigna-300">Vidor · Cal Nova</p>
        </div>
      </header>

      <div className="flex h-[26rem] flex-col gap-2 overflow-y-auto px-3 py-4">
        {turni.length === 0 && !inAttesa && (
          <p className="m-auto max-w-[16rem] text-center text-sm text-pietra-500">
            Nessun messaggio per oggi. Scrivi tu, oppure scegli una battuta qui sotto.
          </p>
        )}

        {turni.map((turno, indice) => (
          <p
            key={`${indice}-${turno.testo.slice(0, 12)}`}
            className={
              turno.ruolo === "utente"
                ? "bolla ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-vigna-600 px-3 py-2 text-sm text-pietra-50"
                : "bolla mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-white px-3 py-2 text-sm text-vigna-950 shadow-sm"
            }
          >
            {turno.testo}
          </p>
        ))}

        {inAttesa && (
          <span className="mr-auto flex gap-1 rounded-2xl rounded-bl-sm bg-white px-4 py-3 shadow-sm">
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

      <div className="flex flex-wrap gap-1.5 border-t border-pietra-200 px-3 pt-3">
        {SUGGERIMENTI.map((suggerimento) => (
          <button
            key={suggerimento}
            type="button"
            onClick={() => invia(suggerimento)}
            disabled={inAttesa}
            className="rounded-lg border border-pietra-200 bg-white/70 px-2 py-1 text-xs text-pietra-700 transition hover:border-vigna-300 hover:text-vigna-800 disabled:opacity-40"
          >
            {suggerimento}
          </button>
        ))}
      </div>

      <form
        className="flex items-center gap-2 px-3 py-3"
        onSubmit={(evento) => {
          evento.preventDefault();
          void invia(bozza);
        }}
      >
        <input
          value={bozza}
          onChange={(evento) => setBozza(evento.target.value)}
          placeholder="Scrivi un messaggio"
          className="min-w-0 flex-1 rounded-full border border-pietra-200 bg-white px-4 py-2 text-sm outline-none focus:border-vigna-600"
        />
        <button
          type="submit"
          disabled={inAttesa || bozza.trim().length === 0}
          className="rounded-full bg-vigna-800 px-4 py-2 text-sm text-pietra-50 transition hover:bg-vigna-600 disabled:opacity-40"
        >
          Invia
        </button>
      </form>
    </section>
  );
}
