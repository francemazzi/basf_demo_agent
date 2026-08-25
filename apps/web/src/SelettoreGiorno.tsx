import { GIORNI_DEMO } from "./giorni.js";

interface Props {
  valore: string;
  onCambia: (giorno: string) => void;
  className?: string;
}

export function SelettoreGiorno({ valore, onCambia, className = "" }: Props) {
  return (
    <nav
      className={`grid w-full min-w-0 grid-cols-3 gap-2 ${className}`.trim()}
      aria-label="Scenario della demo"
    >
      {GIORNI_DEMO.map((scelta) => {
        const attivo = scelta.valore === valore;
        return (
          <button
            key={scelta.valore}
            type="button"
            aria-pressed={attivo}
            onClick={() => onCambia(scelta.valore)}
            className={
              attivo
                ? "min-h-11 min-w-0 rounded-xl bg-vigna-800 px-2 py-2 text-left text-pietra-50 sm:px-3"
                : "min-h-11 min-w-0 rounded-xl border border-pietra-200 bg-white/70 px-2 py-2 text-left text-pietra-700 transition hover:border-vigna-300 sm:px-3"
            }
          >
            <span className="block text-sm font-medium leading-none">{scelta.data}</span>
            <span
              className={
                attivo
                  ? "mt-1 block text-[0.7rem] leading-snug text-vigna-300"
                  : "mt-1 block text-[0.7rem] leading-snug text-pietra-500"
              }
            >
              {scelta.scenario}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
