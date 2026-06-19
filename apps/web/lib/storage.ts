import { join, normalize, sep } from "node:path";

// Diretorio dos artifacts (heatmaps, screenshots, uploads). Em producao e o
// volume Docker `/data/artifacts`; em dev cai para `.artifacts` no projeto.
export function getArtifactsDir(): string {
  return process.env.ARTIFACTS_DIR || join(process.cwd(), ".artifacts");
}

// Resolve um caminho relativo dentro do diretorio de artifacts, barrando
// path traversal (`..`). Retorna null se o caminho escapar do diretorio.
export function resolveArtifactPath(relativePath: string): string | null {
  const base = getArtifactsDir();
  const target = normalize(join(base, relativePath));
  if (target !== base && !target.startsWith(base + sep)) {
    return null;
  }
  return target;
}
