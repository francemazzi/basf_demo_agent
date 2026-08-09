import { describe, expect, it } from "vitest";

import { buildServer } from "./server.js";

describe("Gate 0 — smoke API", () => {
  it("espone /health con la data congelata della demo", async () => {
    const app = await buildServer();
    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok", demoDate: "2026-08-09" });
    await app.close();
  });
});
