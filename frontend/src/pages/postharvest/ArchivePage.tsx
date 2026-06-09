import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Archive, ArrowLeft, CheckCircle2, History, Loader2, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { clearDraft } from "@/lib/postharvestStorage";
import { statusTone, usePostharvestFlow } from "./usePostharvestFlow";
import { POSTHARVEST_STEPS, StepLayout } from "./StepLayout";

function titleCase(str: string): string {
  return str
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function ArchivePage() {
  const params = useParams<{ plantationId: string }>();
  const plantationId = params.plantationId ?? "";
  const navigate = useNavigate();
  const { toast } = useToast();
  const { summary, loading, reload } = usePostharvestFlow();

  const [archiving, setArchiving] = useState(false);
  const [archived, setArchived] = useState(
    String(summary?.status ?? "").toLowerCase() === "archived",
  );

  const handleArchive = async () => {
    if (archiving) return;
    setArchiving(true);
    try {
      await api.archivePlantation(plantationId);
      setArchived(true);
      clearDraft(plantationId);
      await reload();
      toast({
        title: "Plantation archived",
        description:
          "All records (calendar, costs, yield, profit, farm boundary) are preserved. You can still view this cycle in Farm History.",
      });
    } catch (err) {
      toast({
        title: "Could not archive plantation",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setArchiving(false);
    }
  };

  const pill = summary
    ? { label: titleCase(summary.status || "active"), tone: statusTone(summary.status) }
    : null;

  return (
    <StepLayout
      plantationId={plantationId}
      title="Plantation Archive"
      subtitle={
        summary
          ? `${titleCase(summary.crop_name)} · finalize this cycle`
          : "Loading…"
      }
      steps={POSTHARVEST_STEPS}
      currentKey="archive"
      loading={loading || !summary}
      statusPill={pill}
    >
      {summary && (
        <>
          {archived && (
            <div className="flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50/70 p-4">
              <div className="rounded-xl bg-sky-100 p-2 text-sky-700">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-sky-900">
                  This plantation is archived.
                </p>
                <p className="text-xs text-sky-800/80">
                  Calendar events, costs, yield, profit, and farm boundary are
                  preserved. Use the buttons below to review history or start a
                  new cycle on the same farm.
                </p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
            <div className="rounded-xl bg-amber-100 p-2 text-amber-700">
              <Archive className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-900">
                Step 5 · Archive this plantation.
              </p>
              <p className="mt-0.5 text-xs text-amber-800/80">
                Archiving locks the cycle, preserves all data, and adds the
                cycle to your Farm History. You can still view the full record
                afterwards.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
            <h2 className="text-base font-bold text-foreground">What we keep</h2>
            <ul className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
              <li>· Calendar history</li>
              <li>· Cost records</li>
              <li>· Yield records</li>
              <li>· Profit records</li>
              <li>· Farm boundary</li>
              <li>· Yield & profit analytics</li>
            </ul>
            <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap sm:items-center">
              <Button
                onClick={handleArchive}
                className="w-full gradient-primary text-white sm:w-auto"
                disabled={archiving || archived}
              >
                {archiving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Archive className="mr-2 h-4 w-4" />
                )}
                {archived ? "Archived" : "Archive plantation"}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate(`/plantation/${plantationId}/postharvest/rotation`)}
                className="w-full sm:w-auto"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to rotation
              </Button>
            </div>
          </div>

          {archived && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                <h3 className="flex items-center gap-2 text-base font-bold text-foreground">
                  <Sprout className="h-5 w-5 text-emerald-700" />
                  Start a new plantation
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Reuse this farm's boundary. Pick a new crop and a planting
                  date and we'll generate a fresh Smart Farming Calendar
                  for you.
                </p>
                <Button
                  onClick={() =>
                    navigate(`/plantation/${plantationId}/postharvest/new-plantation`)
                  }
                  className="mt-3 w-full gradient-primary text-white sm:w-auto"
                >
                  <Sprout className="mr-2 h-4 w-4" />
                  Start New Plantation
                </Button>
              </div>
              <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4">
                <h3 className="flex items-center gap-2 text-base font-bold text-foreground">
                  <History className="h-5 w-5 text-sky-700" />
                  View farm history
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Review every previous cycle on this farm, including yield,
                  profit, and ROI. Tapping a row opens its full record.
                </p>
                <Button
                  onClick={() =>
                    navigate(`/plantation/${plantationId}/postharvest/history`)
                  }
                  className="mt-3 w-full sm:w-auto"
                  variant="outline"
                >
                  <History className="mr-2 h-4 w-4" />
                  View Farm History
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </StepLayout>
  );
}
