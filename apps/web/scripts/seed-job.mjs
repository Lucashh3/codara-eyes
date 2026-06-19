// Dev/test: cria projeto + analise + job para exercitar a fila da Fase 1.
// Uso: DATABASE_URL=... node apps/web/scripts/seed-job.mjs
// Depois acompanhe `docker compose logs -f worker` para ver o job ser consumido.
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL nao definido");
  process.exit(1);
}

const sql = postgres(url, { max: 1 });

try {
  const [project] = await sql`
    INSERT INTO projects (name, description)
    VALUES ('Seed project', 'gerado por seed-job.mjs')
    RETURNING id
  `;

  const [analysis] = await sql`
    INSERT INTO analyses (project_id, input_type, page_type, goal, status)
    VALUES (${project.id}, 'url', 'landing_page', 'lead_generation', 'pending')
    RETURNING id
  `;

  await sql`
    INSERT INTO analysis_inputs (analysis_id, url)
    VALUES (${analysis.id}, 'https://example.com')
  `;

  const [job] = await sql`
    INSERT INTO jobs (analysis_id)
    VALUES (${analysis.id})
    RETURNING id
  `;

  console.log("job enfileirado:", {
    project: project.id,
    analysis: analysis.id,
    job: job.id,
  });
} catch (error) {
  console.error("falha no seed:", error);
  process.exitCode = 1;
} finally {
  await sql.end();
}
