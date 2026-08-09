import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { config as loadDotenv } from "dotenv";

/**
 * Il monorepo tiene un solo .env alla radice: ogni package risolve verso l'alto
 * invece di duplicare la configurazione.
 */
export function repoRoot(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 10; i += 1) {
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = resolve(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

let loaded = false;

export function loadEnv(): void {
  if (loaded) return;
  loadDotenv({ path: join(repoRoot(), ".env"), quiet: true });
  loaded = true;
}

export function requireEnv(name: string): string {
  loadEnv();
  const value = process.env[name];
  if (!value) throw new Error(`Variabile d'ambiente mancante: ${name}`);
  return value;
}

export function optionalEnv(name: string, fallback: string): string {
  loadEnv();
  return process.env[name] ?? fallback;
}

export function seedDir(): string {
  return join(repoRoot(), "data", "seed");
}

export function curvesDir(): string {
  return join(repoRoot(), "data", "curves");
}
