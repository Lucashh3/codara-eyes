// Aplica as migrations pendentes e sai. Roda no entrypoint do container `web`
// antes do `next start`. Node ESM puro (sem TS) para nao precisar de runner.
import { fileURLToPath } from "node:url";

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL nao definido");
  process.exit(1);
}

const migrationsFolder = fileURLToPath(new URL("./migrations", import.meta.url));
const sql = postgres(url, { max: 1 });

try {
  await migrate(drizzle(sql), { migrationsFolder });
  console.log("migrations aplicadas");
} catch (error) {
  console.error("falha ao aplicar migrations:", error);
  process.exitCode = 1;
} finally {
  await sql.end();
}
