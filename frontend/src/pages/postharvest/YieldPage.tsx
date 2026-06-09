import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { YieldForm } from "@/components/postharvest/YieldForm";
import { statusTone, usePostharvestFlow } from "./usePostharvestFlow";
import { POSTHARVEST_STEPS, StepLayout } from "./StepLayout";
import { loadDraft, saveDraft } from "@/lib/postharvestStorage";
import type { HarvestRecord } from "@/types/planting";

function titleCase(str: string): string {
  return str
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function YieldPage() {
  const params = useParams<{ plantationId: string }>();
  const plantationId = params.plantationId ?? "";
  const navigate = useNavigate();
  const { summary, loading } = usePostharvestFlow();
  const harvest = summary?.harvest ?? null;
  const draft = loadDraft(plantationId);

  const [localHarvest, setLocalHarvest] = useState<HarvestRecord | null>(harvest);

  useEffect(() => {
    if (harvest && !localHarvest) setLocalHarvest(harvest);
  }, [harvest, localHarvest]);

  const handleSaved = (record: HarvestRecord) => {
    setLocalHarvest(record);
    saveDraft(plantationId, {
      harvestDate: String(record.actual_harvest_date).slice(0, 10),
      yieldValue: String(record.actual_yield ?? ""),
      yieldUnit: record.yield_unit ?? "kg",
      notes: record.notes ?? "",
    });
  };

  const pill = summary
    ? { label: titleCase(summary.status || "active"), tone: statusTone(summary.status) }
    : null;

  return (
    <StepLayout
      plantationId={plantationId}
      title="Yield Recording"
      subtitle={
        summary
          ? `${titleCase(summary.crop_name)} · enter the actual harvest result`
          : "Loading…"
      }
      steps={POSTHARVEST_STEPS}
      currentKey="yield"
      loading={loading || !summary}
      statusPill={pill}
    >
      {summary && (
        <>
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
            <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
              <Sprout className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-900">
                Step 2 · Record your harvest yield.
              </p>
              <p className="mt-0.5 text-xs text-emerald-800/80">
                The yield you enter here drives the profit and rotation steps.
                You can update it any time.
              </p>
            </div>
          </div>

          <YieldForm
            plantationId={plantationId}
            initial={localHarvest ?? harvest}
            defaultHarvestDate={
              draft?.harvestDate ||
              summary.actual_harvest_date ||
              summary.expected_harvest_date
            }
            onSaved={handleSaved}
          />

          <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center">
            <Button
              variant="outline"
              onClick={() => navigate(`/plantation/${plantationId}/postharvest/summary`)}
              className="w-full sm:w-auto"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to summary
            </Button>
            <Button
              onClick={() => navigate(`/plantation/${plantationId}/postharvest/profit`)}
              className="w-full gradient-primary text-white sm:w-auto"
              disabled={!localHarvest || Number(localHarvest.actual_yield ?? 0) <= 0}
            >
              Continue to profit
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </>
      )}
    </StepLayout>
  );
}
