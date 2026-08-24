import { describe, expect, it } from "vitest";

import { hashPassword, verificaPassword } from "./password.js";

describe("hash password", () => {
  it("verifica la stessa password e rifiuta un'altra", async () => {
    const conservata = await hashPassword("viticoltore-demo");
    expect(await verificaPassword("viticoltore-demo", conservata)).toBe(true);
    expect(await verificaPassword("altra", conservata)).toBe(false);
  });
});
