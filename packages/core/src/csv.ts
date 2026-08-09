import { readFileSync } from "node:fs";
import { join } from "node:path";

import { seedDir } from "./env.js";

export type CsvRow = Record<string, string>;

/** Parser minimo ma corretto su virgolette e virgole interne: i CSV del caso studio le usano. */
export function parseCsv(text: string): CsvRow[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    if (row.some((cell) => cell.length > 0)) rows.push(row);
    row = [];
  };

  const source = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i]!;
    if (quoted) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === ",") pushField();
    else if (char === "\n") pushRow();
    else field += char;
  }
  if (field.length > 0 || row.length > 0) pushRow();

  const [header, ...body] = rows;
  if (!header) return [];
  return body.map((cells) => {
    const record: CsvRow = {};
    header.forEach((key, index) => {
      record[key.trim()] = (cells[index] ?? "").trim();
    });
    return record;
  });
}

export function readSeedCsv(fileName: string): CsvRow[] {
  return parseCsv(readFileSync(join(seedDir(), fileName), "utf8"));
}

/** Cella vuota significa dato assente. Mai zero: lo dichiara il README dei dataset. */
export function num(value: string | undefined): number | null {
  if (value === undefined || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function requiredNum(value: string | undefined, field: string): number {
  const parsed = num(value);
  if (parsed === null) throw new Error(`Valore numerico mancante per ${field}`);
  return parsed;
}

export function str(value: string | undefined): string | null {
  if (value === undefined || value.trim() === "") return null;
  return value.trim();
}

export function pipeList(value: string | undefined): string[] {
  if (!value || value.trim() === "") return [];
  return value
    .split("|")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}
