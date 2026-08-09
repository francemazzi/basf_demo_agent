import { loadEnv } from "./env.js";

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Data di sistema della demo. Tutto il codice deve passare da qui: la demo di
 * settembre gira su un dataset fermo al 9 agosto 2026 e `new Date()` la romperebbe.
 */
export function now(): Date {
  loadEnv();
  const raw = process.env.DEMO_FREEZE_DATE;
  if (!raw) throw new Error("DEMO_FREEZE_DATE non impostata");
  if (!ISO_DAY.test(raw)) {
    throw new Error(`DEMO_FREEZE_DATE deve essere YYYY-MM-DD, ricevuto: ${raw}`);
  }
  return parseDay(raw);
}

export function today(): string {
  return toDay(now());
}

export function parseDay(iso: string): Date {
  if (!ISO_DAY.test(iso)) throw new Error(`Data non ISO YYYY-MM-DD: ${iso}`);
  return new Date(`${iso}T00:00:00.000Z`);
}

export function toDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

export function diffDays(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}
