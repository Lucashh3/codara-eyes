import { eq } from "drizzle-orm";

import { getDb } from "./index";
import { projects } from "./schema";

const DEFAULT_PROJECT_NAME = "Default";

// MVP single-tenant: todas as analises caem em um projeto padrao, criado sob
// demanda. Projetos por usuario entram quando houver multiusuario.
export async function ensureDefaultProject(): Promise<string> {
  const db = getDb();
  const existing = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.name, DEFAULT_PROJECT_NAME))
    .limit(1);

  if (existing[0]) return existing[0].id;

  const [created] = await db
    .insert(projects)
    .values({ name: DEFAULT_PROJECT_NAME, description: "Projeto padrao do MVP single-tenant" })
    .returning({ id: projects.id });

  return created.id;
}
