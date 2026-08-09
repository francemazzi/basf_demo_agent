import { PrismaClient } from "@prisma/client";

import { loadEnv } from "@basf/core";

let client: PrismaClient | null = null;

export function prisma(): PrismaClient {
  if (!client) {
    loadEnv();
    client = new PrismaClient();
  }
  return client;
}

export async function disconnect(): Promise<void> {
  if (client) {
    await client.$disconnect();
    client = null;
  }
}

export type { Prisma } from "@prisma/client";
export { PrismaClient } from "@prisma/client";
