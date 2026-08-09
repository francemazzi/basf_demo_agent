import type { StatoDss } from "./domain.js";

/**
 * Le frasi esatte con cui Agrigenius scrive la colonna "Indicazione DSS".
 * Il match è sul testo normalizzato: sono dati reali BASF, non vanno riscritti.
 */
const FRASI: { stato: StatoDss; frammento: string }[] = [
  {
    stato: "parziale_con_infezioni",
    frammento: "copertura parziale",
  },
  {
    stato: "insufficiente_senza_infezioni",
    frammento: "non sono previste infezioni",
  },
  {
    stato: "insufficiente_con_infezioni",
    frammento: "non e sufficiente per le infezioni previste",
  },
  {
    stato: "sufficiente",
    frammento: "e sufficiente e lo restera",
  },
];

function normalizza(testo: string): string {
  return testo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseStatoDss(testo: string | null | undefined): StatoDss | null {
  if (!testo || testo.trim() === "") return null;
  const normalizzato = normalizza(testo);
  for (const { stato, frammento } of FRASI) {
    if (normalizzato.includes(frammento)) return stato;
  }
  return null;
}

export function statoDssCopertoAlMomento(stato: StatoDss): boolean {
  return stato === "sufficiente";
}

/** Traduzione in linguaggio da campo: frase breve, niente gergo, niente percentuali inventate. */
export function statoDssInParole(stato: StatoDss): string {
  switch (stato) {
    case "sufficiente":
      return "La copertura tiene anche nei prossimi giorni.";
    case "insufficiente_senza_infezioni":
      return "La copertura sta calando, ma per ora non sono previste infezioni.";
    case "insufficiente_con_infezioni":
      return "La copertura non basta per le infezioni attese nei prossimi giorni.";
    case "parziale_con_infezioni":
      return "Resta solo una copertura parziale rispetto alle infezioni attese.";
  }
}
