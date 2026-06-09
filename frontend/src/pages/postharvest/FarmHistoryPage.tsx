import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FarmHistoryList } from "@/components/postharvest/FarmHistoryList";
import { usePostharvestFlow } from "./usePostharvestFlow";
import { StepLayout } from "./StepLayout";

function titleCase(str: string): string {
  return str
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function FarmHistoryPage() {
  const params = useParams<{ plantationId: string }>();
  const plantationId = params.plantationId ?? "";
  const navigate = useNavigate();
  const { summary, loading } = usePostharvestFlow();

  return (
    <StepLayout
      plantationId={plantationId}
      title="Farm History"
      subtitle={
        summary
          ? `${summary.farm_name || "Farm"} · every cycle on this land`
          : "Loading…"
      }
      steps={[]}
      currentKey="history"
      loading={loading || !summary}
    >
      {summary && (
        <>
          <div className="flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50/70 p-4">
            <div className="rounded-xl bg-sky-100 p-2 text-sky-700">
              <History className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-sky-900">
                Every plantation cycle on {titleCase(summary.farm_name || "your farm")}.
              </p>
              <p className="text-xs text-sky-800/80">
                Past cycles stay accessible even after archive so you can
                review yield, profit, and rotation patterns over time. Tap a
                row to open its full record.
              </p>
            </div>
          </div>

          <FarmHistoryList
            farmId={String(summary.farm_id)}
            currentPlantationId={plantationId}
          />

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() => navigate(`/plantation/${plantationId}/postharvest/archive`)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to archive
            </Button>
            <Button
              onClick={() =>
                navigate(`/plantation/${plantationId}/postharvest/new-plantation`)
              }
              className="gradient-primary text-white"
            >
              Start New Plantation
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </>
      )}
    </StepLayout>
  );
}
