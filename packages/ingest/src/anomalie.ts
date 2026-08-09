import { parseDay } from "@basf/core";

/**
 * Le anomalie di Appendice B si marcano, non si correggono: sono il materiale
 * della prima slide del report a BASF.
 */
const BBCH_CONGELATO_RANGES: [string, string][] = [
  ["2026-04-18", "2026-05-18"],
  ["2026-06-04", "2026-07-10"],
];

const AVVERSITA_ERRATA_DATE = new Set(["2026-06-04", "2026-06-23"]);
const AVVERSITA_ERRATA_PRODOTTO = "Folpan 80 WDG";

export function anomalieOperazione(input: {
  data: string;
  prodotto: string;
  avversita: string;
}): string[] {
  const anomalie: string[] = [];
  const giorno = parseDay(input.data).getTime();

  const congelato = BBCH_CONGELATO_RANGES.some(
    ([from, to]) => giorno >= parseDay(from).getTime() && giorno <= parseDay(to).getTime(),
  );
  if (congelato) anomalie.push("bbch_congelato");

  if (
    AVVERSITA_ERRATA_DATE.has(input.data) &&
    input.prodotto === AVVERSITA_ERRATA_PRODOTTO &&
    input.avversita.toLowerCase() === "oidio"
  ) {
    anomalie.push("avversita_errata");
  }

  return anomalie;
}
