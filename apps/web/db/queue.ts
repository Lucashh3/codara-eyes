import { getDb } from "./index";
import { jobs } from "./schema";

// Primitivo de enfileiramento usado pela API ao criar uma analise (Fase 2).
// O worker (Python) consome esses jobs da fila no Postgres.
export async function enqueueAnalysisJob(analysisId: string, type = "analyze") {
  const [job] = await getDb()
    .insert(jobs)
    .values({ analysisId, type })
    .returning({ id: jobs.id });

  return job;
}
