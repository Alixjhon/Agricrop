import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, CircleDollarSign, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { ProfitForm } from "@/components/postharvest/ProfitForm";
import type { ProfitRecord } from "@/types/planting";
import { loadDraft, saveDraft } from "@/lib/postharvestStorage";
import { statusTone, usePostharvestFlow } from "./usePostharvestFlow";
import { POSTHARVEST_STEPS, StepLayout } from "./StepLayout";

function titleCase(str: string): string {
  return str
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function ProfitPage() {
  const params = useParams<{ plantationId: string }>();
  const plantationId = params.plantationId ?? "";
  const navigate = useNavigate();
  const { toast } = useToast();
  const { summary, totalCost, loading, reload } = usePostharvestFlow();

  const harvest = summary?.harvest ?? null;
  const profit = summary?.profit ?? null;
  const yieldValue = harvest?.actual_yield ?? 0;
  const yieldUnit = harvest?.yield_unit ?? "kg";

  const [localProfit, setLocalProfit] = useState<ProfitRecord | null>(profit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profit && !localProfit) setLocalProfit(profit);
  }, [profit, localProfit]);

  const draft = loadDraft(plantationId);

  const handleSaved = (record: ProfitRecord) => {
    setLocalProfit(record);
    saveDraft(plantationId, {
      sellingPrice: String(record.selling_price_per_unit ?? ""),
      profitUnit: record.yield_unit ?? yieldUnit,
    });
  };

  const handleSaveAndContinue = async () => {
    const price = Number(draft?.sellingPrice ?? localProfit?.selling_price_per_unit ?? 0);
    if (!Number.isFinite(price) || price <= 0) {
      toast({
        title: "Enter a selling price first",
        description: "Save the profit record below before continuing.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      if (!localProfit || Number(localProfit.selling_price_per_unit ?? 0) !== price) {
        const res = await api.recordProfit(plantationId, {
          sellingPricePerUnit: price,
          yieldUnit: draft?.profitUnit ?? yieldUnit,
        });
        setLocalProfit(res.record);
        saveDraft(plantationId, {
          sellingPrice: String(price),
          profitUnit: res.record.yield_unit,
        });
      }
      await reload();
      navigate(`/plantation/${plantationId}/postharvest/rotation`);
    } catch (err) {
      toast({
        title: "Could not save profit",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const pill = summary
    ? { label: titleCase(summary.status || "active"), tone: statusTone(summary.status) }
    : null;

  return (
    <StepLayout
      plantationId={plantationId}
      title="Profit & Loss Analysis"
      subtitle={
        summary
          ? `${titleCase(summary.crop_name)} · revenue, expenses, profit & ROI`
          : "Loading…"
      }
      steps={POSTHARVEST_STEPS}
      currentKey="profit"
      loading={loading || !summary}
      statusPill={pill}
    >
      {summary && (
        <>
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
            <div className="rounded-xl bg-amber-100 p-2 text-amber-700">
              <CircleDollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-900">
                Step 3 · Enter your selling price.
              </p>
              <p className="mt-0.5 text-xs text-amber-800/80">
                Revenue, total expenses, net profit, and ROI are computed
                automatically using the recorded yield and your farm's
                cost summary.
              </p>
            </div>
          </div>

          <ProfitForm
            plantationId={plantationId}
            initial={localProfit ?? profit}
            yieldValue={yieldValue}
            yieldUnit={yieldUnit}
            totalExpenses={localProfit?.total_expenses ?? totalCost}
            onSaved={handleSaved}
          />

          <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center">
            <Button
              variant="outline"
              onClick={() => navigate(`/plantation/${plantationId}/postharvest/yield`)}
              className="w-full sm:w-auto"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to yield
            </Button>
            <Button
              onClick={handleSaveAndContinue}
              className="w-full gradient-primary text-white sm:w-auto"
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="mr-2 h-4 w-4" />
              )}
              Continue to rotation
            </Button>
          </div>
        </>
      )}
    </StepLayout>
  );
}
