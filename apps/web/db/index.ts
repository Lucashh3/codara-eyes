import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

// Singleton preguicoso: a conexao so e criada no primeiro uso (em runtime),
// nunca no build do Next.
let client: ReturnType<typeof postgres> | undefined;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function getDb() {
  if (!dbInstance) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL nao definido");
    }
    client = postgres(url, { max: 10 });
    dbInstance = drizzle(client, { schema });
  }
  return dbInstance;
}

export { schema };
