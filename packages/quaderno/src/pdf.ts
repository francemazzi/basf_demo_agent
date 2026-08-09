import PDFDocument from "pdfkit";

import { parseDay, toDay } from "@basf/core";
import { prisma } from "@basf/db";
import { verificaConformita, type ViolazioneConformita } from "@basf/kb";

import { statoMagazzino } from "./magazzino.js";

export interface RigaQuaderno {
  id: string;
  data: string;
  avversita: string;
  prodotto: string;
  numeroRegistrazione: string;
  doseHa: number | null;
  haTrattati: number;
  bbch: number | null;
  anomalie: string[];
  violazioni: ViolazioneConformita[];
}

export async function righeQuaderno(appezzamentoId: string, fino: string): Promise<RigaQuaderno[]> {
  const operazioni = await prisma().operazione.findMany({
    where: { appezzamentoId, data: { lte: parseDay(fino) } },
    include: { prodotti: true },
    orderBy: [{ data: "asc" }, { id: "asc" }],
  });

  const righe: RigaQuaderno[] = [];
  for (const operazione of operazioni) {
    const prodotto = operazione.prodotti[0];
    if (!prodotto) continue;
    righe.push({
      id: operazione.id,
      data: toDay(operazione.data),
      avversita: operazione.avversita,
      prodotto: prodotto.nomeCommerciale,
      numeroRegistrazione: prodotto.numeroRegistrazione,
      doseHa: prodotto.doseHa,
      haTrattati: operazione.haTrattati,
      bbch: operazione.bbch,
      anomalie: operazione.anomalie,
      violazioni: await verificaConformita({
        giorno: toDay(operazione.data),
        numeroRegistrazione: prodotto.numeroRegistrazione,
      }),
    });
  }
  return righe;
}

const AMBRA = "#c9791f";
const VIGNA = "#1d4232";
const PIETRA = "#4d4a41";

/**
 * Il PDF si stampa alla fine della stagione, quando correggere non si può più.
 * Qui le violazioni stanno in cima, prima delle righe: è tutto il punto dello scenario.
 */
export async function esportaQuadernoPdf(
  appezzamentoId: string,
  fino: string,
): Promise<Uint8Array> {
  const [righe, magazzino, appezzamento] = await Promise.all([
    righeQuaderno(appezzamentoId, fino),
    statoMagazzino(fino),
    prisma().appezzamento.findUnique({ where: { id: appezzamentoId } }),
  ]);

  const conViolazioni = righe.filter((riga) => riga.violazioni.length > 0);

  const documento = new PDFDocument({ size: "A4", margin: 46 });
  const pezzi: Buffer[] = [];
  documento.on("data", (pezzo: Buffer) => pezzi.push(pezzo));
  const chiuso = new Promise<void>((risolvi) => documento.on("end", () => risolvi()));

  documento.fontSize(20).fillColor(VIGNA).text("Quaderno di campagna");
  documento
    .fontSize(10)
    .fillColor(PIETRA)
    .text(
      `${appezzamento?.localita ?? appezzamentoId} · ${appezzamento?.varieta ?? ""} · ${appezzamento?.superficieHa ?? 0} ha · stagione ${appezzamento?.stagione ?? ""} · aggiornato al ${fino}`,
    );
  documento.moveDown();

  documento.fontSize(13).fillColor(AMBRA).text("Da verificare prima di stampare");
  documento.moveDown(0.3);

  if (conViolazioni.length === 0) {
    documento.fontSize(10).fillColor(PIETRA).text("Nessuna segnalazione aperta.");
  } else {
    const messaggiVisti = new Set<string>();
    for (const riga of conViolazioni) {
      for (const violazione of riga.violazioni) {
        const chiave = `${riga.data}|${violazione.messaggio}`;
        if (messaggiVisti.has(chiave)) continue;
        messaggiVisti.add(chiave);
        documento
          .fontSize(10)
          .fillColor(violazione.gravita === "blocco" ? AMBRA : PIETRA)
          .text(`${riga.data} · ${riga.prodotto} · ${violazione.messaggio}`);
      }
    }
  }

  documento.moveDown();
  documento.fontSize(13).fillColor(VIGNA).text("Interventi registrati");
  documento.moveDown(0.3);

  for (const riga of righe) {
    const segnalata = riga.violazioni.length > 0;
    documento
      .fontSize(9)
      .fillColor(segnalata ? AMBRA : PIETRA)
      .text(
        [
          riga.data,
          riga.avversita,
          riga.prodotto,
          `reg. ${riga.numeroRegistrazione}`,
          riga.doseHa === null ? "dose non nota" : `${riga.doseHa} /ha`,
          `${riga.haTrattati} ha`,
          `BBCH ${riga.bbch ?? "—"}`,
          riga.anomalie.length > 0 ? `anomalie: ${riga.anomalie.join(", ")}` : "",
        ]
          .filter((pezzo) => pezzo !== "")
          .join("  ·  "),
      );
  }

  documento.addPage();
  documento.fontSize(13).fillColor(VIGNA).text("Magazzino");
  documento
    .fontSize(9)
    .fillColor(AMBRA)
    .text("Giacenze simulate: non provengono dai dati BASF, servono solo a mostrare lo scarico.");
  documento.moveDown(0.5);

  for (const voce of magazzino) {
    documento
      .fontSize(9)
      .fillColor(PIETRA)
      .text(
        `${voce.nomeCommerciale}  ·  scaricato ${voce.consumato} ${voce.unita}  ·  residuo simulato ${voce.residuo}  ·  ultimo prelievo ${voce.ultimoPrelievo ?? "—"}`,
      );
  }

  documento.end();
  await chiuso;
  return new Uint8Array(Buffer.concat(pezzi));
}
