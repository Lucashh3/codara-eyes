import { AnalysisDetail } from "../../../components/analysis-detail";

export default async function AnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <main className="mx-auto flex min-h-dvh max-w-6xl flex-col px-6 pb-16 pt-8 md:px-10 lg:px-12">
      <AnalysisDetail id={id} />
    </main>
  );
}
