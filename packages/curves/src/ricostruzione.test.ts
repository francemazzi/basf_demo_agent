import { describe, expect, it } from "vitest";

import { SOGLIA_PROTEZIONE_PCT } from "@basf/core";

import { valoreProtezione } from "./ricostruzione.js";

describe("curva di protezione ricostruita", () => {
  it("parte da pieno il giorno del trattamento", () => {
    expect(valoreProtezione(0, 10)).toBe(100);
  });

  it("tocca la soglia esattamente al primo giorno utile dichiarato dalla ditta", () => {
    expect(valoreProtezione(10, 10)).toBe(SOGLIA_PROTEZIONE_PCT);
    expect(valoreProtezione(7, 7)).toBe(SOGLIA_PROTEZIONE_PCT);
  });

  it("scende senza scalini e si ferma a zero", () => {
    expect(valoreProtezione(5, 10)).toBe(85);
    expect(valoreProtezione(40, 10)).toBe(0);
  });

  it("cala più in fretta quando l'intervallo dichiarato è corto", () => {
    expect(valoreProtezione(5, 7)).toBeLessThan(valoreProtezione(5, 14));
  });
});
