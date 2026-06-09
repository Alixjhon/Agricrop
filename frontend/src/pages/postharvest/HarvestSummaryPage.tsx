import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { saveDraft } from "@/lib/postharvestStorage";
import { HarvestSummaryCard } from "@/components/postharvest/HarvestSummaryCard";
import { statusTone, usePostharvestFlow } from "./usePostharvestFlow";
import { POSTHARVEST_STEPS, StepLayout } from "./StepLayout";

function titleCase(str: string): string {
  return str
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function HarvestSummaryPage() {
  const params = useParams<{ plantationId: string }>();
  const plantationId = params.plantationId ?? "";
  const navigate = useNavigate();
  const { toast } = useToast();
  const { summary, loading, reload } = usePostharvestFlow();

  // We also let the farmer type a harvest date right from the summary page
  // (the very first input the spec asks for). It's persisted to the draft
  // store and the next page will use it as the default.
  const [harvestDate, setHarvestDate] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (summary) {
      const next = String(
        summary.actual_harvest_date ?? summary.expected_harvest_date ?? "",
      ).slice(0, 10);
      if (next && !harvestDate) setHarvestDate(next);
    }
  }, [summary, harvestDate]);

  const handleSaveAndContinue = async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(harvestDate)) {
      toast({
        title: "Invalid date",
        description: "Please pick a valid harvest date.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      // Persist to the backend so the plantation moves into "harvested"
      // status if it wasn't already. We use a 0-yield placeholder; the next
      // page will replace it with the real value.
      const existing = summary?.harvest;
      if (!existing) {
        await api.recordHarvest(plantationId, {
          actualHarvestDate: harvestDate,
          actualYield: 0,
          yieldUnit: "kg",
          notes: null,
        });
      }
      saveDraft(plantationId, { harvestDate });
      toast({ title: "Harvest date recorded", description: harvestDate });
      navigate(`/plantation/${plantationId}/postharvest/yield`);
    } catch (err) {
      toast({
        title: "Could not save harvest date",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const pill = summary
    ? {
        label: titleCase(summary.status || "active"),
        tone: statusTone(summary.status),
      }
    : null;

  return (
    <StepLayout
      plantationId={plantationId}
      title="Harvest Summary"
      subtitle={
        summary
          ? `${titleCase(summary.crop_name)} · ${summary.farm_name || "Farm"}`
          : "Loading…"
      }
      steps={POSTHARVEST_STEPS}
      currentKey="summary"
      loading={loading || !summary}
      statusPill={pill}
      banner={
        <div className="space-y-3">
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
            <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-900">
                Step 1 · Review your harvest and confirm the date.
              </p>
              <p className="mt-0.5 text-xs text-emerald-800/80">
                Below is a snapshot of this plantation. The yield, profit, and
                crop-rotation steps use these values as the starting point.
              </p>
            </div>
          </div>
        </div>
      }
    >
      {summary && (
        <>
          <HarvestSummaryCard summary={summary} />
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
            <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
              <Sprout className="h-5 w-5 text-emerald-600" />
              Confirm the harvest date
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              The actual date the crop was harvested. You can adjust this any
              time from the yield step.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-medium text-foreground">
                Harvest date
                <input
                  type="date"
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  value={harvestDate}
                  onChange={(e) => setHarvestDate(e.target.value)}
                />
              </label>
              <div className="rounded-xl border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                <p>
                  <span className="font-semibold text-foreground">Expected:</span>{" "}
                  {summary.expected_harvest_date
                    ? titleCase(
                        new Date(summary.expected_harvest_date).toLocaleDateString(
                          undefined,
                          { month: "long", day: "numeric", year: "numeric" },
                        ),
                      )
                    : "—"}
                </p>
                {summary.growing_duration_days != null && (
                  <p className="mt-1">
                    <span className="font-semibold text-foreground">
                      Duration:
                    </span>{" "}
                    {summary.growing_duration_days} days
                  </p>
                )}
              </div>
            </div>
            <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap sm:items-center">
              <Button
                onClick={handleSaveAndContinue}
                className="w-full gradient-primary text-white sm:w-auto"
                disabled={saving}
              >
                {saving ? "Saving…" : "Continue to yield"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => {
                  void reload();
                }}
              >
                Refresh data
              </Button>
            </div>
          </div>
        </>
      )}
    </StepLayout>
  );
}
