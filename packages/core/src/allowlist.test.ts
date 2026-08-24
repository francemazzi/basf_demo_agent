import { describe, expect, it } from "vitest";

import { emailConsentita } from "./allowlist.js";

describe("allowlist accesso demo", () => {
  it("accetta il titolare e i domini BASF", () => {
    expect(emailConsentita("francemazzi@gmail.com")).toBe(true);
    expect(emailConsentita("FRANCEMAZZI@gmail.com")).toBe(true);
    expect(emailConsentita("giorgio.fioretti@partners.basf.com")).toBe(true);
    expect(emailConsentita("nome@basf.com")).toBe(true);
    expect(emailConsentita("  martina.dal-cero@basf.com  ")).toBe(true);
  });

  it("rifiuta gmail generiche e indirizzi malformati", () => {
    expect(emailConsentita("altro@gmail.com")).toBe(false);
    expect(emailConsentita("basf@gmail.com")).toBe(false);
    expect(emailConsentita("")).toBe(false);
    expect(emailConsentita("senza-chiocciola")).toBe(false);
    expect(emailConsentita("@basf.com")).toBe(false);
  });
});
