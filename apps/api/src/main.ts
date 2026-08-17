import { optionalEnv } from "@basf/core";
import { configLlm } from "@basf/llm";

import { buildServer } from "./server.js";

const app = await buildServer();
const port = Number(optionalEnv("API_PORT", "3001"));
const llm = configLlm();

await app.listen({ port, host: "0.0.0.0" });
console.log(`API in ascolto su http://localhost:${port}`);
console.log(`LLM: ${llm.provider} @ ${llm.baseUrl} (${llm.model})`);
