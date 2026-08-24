import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);
const LUNGHEZZA_HASH = 64;

export async function hashPassword(password: string): Promise<string> {
  const sale = randomBytes(16);
  const hash = (await scryptAsync(password, sale, LUNGHEZZA_HASH)) as Buffer;
  return `${sale.toString("hex")}:${hash.toString("hex")}`;
}

export async function verificaPassword(password: string, conservata: string): Promise<boolean> {
  const [saleHex, hashHex] = conservata.split(":");
  if (!saleHex || !hashHex) return false;
  const hash = (await scryptAsync(password, Buffer.from(saleHex, "hex"), LUNGHEZZA_HASH)) as Buffer;
  const atteso = Buffer.from(hashHex, "hex");
  if (hash.length !== atteso.length) return false;
  return timingSafeEqual(hash, atteso);
}
