import { join } from "node:path";

import { config as loadDotenv } from "dotenv";

loadDotenv({ path: join(import.meta.dirname, "..", "..", ".env"), quiet: true });

export default {
  schema: join(import.meta.dirname, "prisma", "schema.prisma"),
};
