import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/**/*.integration.test.ts", "apps/**/*.integration.test.ts"],
    exclude: ["**/node_modules/**"],
    testTimeout: 120_000,
    hookTimeout: 120_000,
    // I gate toccano lo stesso database: nessun parallelismo tra file.
    fileParallelism: false,
  },
});
