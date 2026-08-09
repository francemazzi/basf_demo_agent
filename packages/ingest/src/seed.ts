import { disconnect } from "@basf/db";

import { runSeed } from "./index.js";

runSeed()
  .then((summary) => {
    console.log("Seed completato:");
    for (const [entita, count] of Object.entries(summary)) {
      console.log(`  ${entita}: ${count}`);
    }
  })
  .catch((error: unknown) => {
    console.error("Seed fallito:", error);
    process.exitCode = 1;
  })
  .finally(() => disconnect());
