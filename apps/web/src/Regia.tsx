import type { ProtezioneRegia, StatoRegia, UsoStrumento } from "./api.js";

interface Props {
  stato: StatoRegia | null;
  strumenti: UsoStrumento[];
  onReset: () => void;
}

const ETICHETTE_FONTE: Record<string, string> = {
  basf_export: "export BASF",
  basf_dichiarazione_dss: "dichiarazione DSS",
  basf_grafico_ancoraggio: "ancoraggio da grafico",
  vision_extraction: "letto dal grafico",
  ricostruzione: "ricostruzione nostra",
};

function Riga({ etichetta, children }: { etichetta: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-pietra-200/70 py-2 last:border-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <span className="text-[0.65rem] uppercase tracking-wide text-pietra-500 sm:shrink-0 sm:text-xs">
        {etichetta}
      </span>
      <span className="valore-regia min-w-0 text-sm break-words [overflow-wrap:anywhere] text-vigna-950 sm:text-right">
        {children}
      </span>
    </div>
  );
}

function Protezione({ nome, dati }: { nome: string; dati: ProtezioneRegia }) {
  const valore =
    dati.percentuale === null ? "nessuna percentuale" : `${dati.percentuale}%`;
  return (
    <Riga etichetta={nome}>
      <span className={dati.sottoSoglia ? "font-semibold text-ambra-500" : ""}>{valore}</span>
      <span className="block text-xs text-pietra-500">
        {dati.fonte ? ETICHETTE_FONTE[dati.fonte] ?? dati.fonte : "fonte non dichiarata"}
        {dati.ultimoTrattamento ? ` · ultimo ${dati.ultimoTrattamento}` : ""}
      </span>
    </Riga>
  );
}

export function Regia({ stato, strumenti, onReset }: Props) {
  return (
    <aside className="w-full min-w-0 max-w-md text-sm lg:max-w-md">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl">Regia</h2>
        <button
          type="button"
          onClick={onReset}
          className="min-h-11 rounded-lg border border-pietra-200 px-3 py-1.5 text-xs text-pietra-700 transition hover:border-vigna-300 hover:text-vigna-800"
        >
          Svuota il quaderno
        </button>
      </div>

      {!stato ? (
        <p className="text-pietra-500">Carico lo stato del modello…</p>
      ) : (
        <>
          <Protezione nome="Peronospora" dati={stato.protezione.peronospora!} />
          <Protezione nome="Oidio" dati={stato.protezione.oidio!} />
          <Riga etichetta="Fenologia">
            BBCH {stato.fenologia.bbch ?? "—"}
            <span className="block text-xs text-pietra-500">
              nel quaderno {stato.fenologia.bbchDichiaratoUtente ?? "—"}
            </span>
          </Riga>
          <Riga etichetta="Pioggia dal trattamento">
            {stato.dilavamento.pioggiaCumulataMm} mm
            <span className="block text-xs text-pietra-500">
              dal {stato.dilavamento.ultimoTrattamento ?? "—"}
            </span>
          </Riga>
          <Riga etichetta="Alert aperti">
            {stato.alert.length === 0 ? "nessuno" : stato.alert.map((a) => a.titolo).join(" · ")}
          </Riga>
          <Riga etichetta="Ripetizioni stagione">
            {stato.conformita
              .slice(0, 3)
              .map((voce) => `${voce.chiave} ×${voce.nApplicazioni}`)
              .join(" · ") || "—"}
          </Riga>
        </>
      )}

      <h3 className="mt-8 mb-2 font-display text-xl">Strumenti dell'ultimo turno</h3>
      {strumenti.length === 0 ? (
        <p className="text-pietra-500">Nessuna chiamata ancora.</p>
      ) : (
        <ol className="space-y-2">
          {strumenti.map((uso, indice) => (
            <li key={`${uso.nome}-${indice}`} className="border-b border-pietra-200/70 pb-2">
              <p className="font-medium text-vigna-800">{uso.nome}</p>
              <p className="truncate text-xs text-pietra-500">{uso.argomenti}</p>
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}
