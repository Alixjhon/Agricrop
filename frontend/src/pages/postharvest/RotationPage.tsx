import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import type { RotationRecommendation } from "@/types/planting";
import { statusTone, usePostharvestFlow } from "./usePostharvestFlow";
import { POSTHARVEST_STEPS, StepLayout } from "./StepLayout";

function titleCase(str: string): string {
  return str
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function RotationPage() {
  const params = useParams<{ plantationId: string }>();
  const plantationId = params.plantationId ?? "";
  const navigate = useNavigate();
  const { toast } = useToast();
  const { summary, loading } = usePostharvestFlow();

  const [recLoading, setRecLoading] = useState(true);
  const [previousCrop, setPreviousCrop] = useState<string>("");
  const [recommendations, setRecommendations] = useState<RotationRecommendation[]>([]);

  useEffect(() => {
    if (!plantationId) return;
    let cancelled = false;
    setRecLoading(true);
    (async () => {
      try {
        const res = await api.getRotationRecommendations(plantationId);
        if (cancelled) return;
        setPreviousCrop(res.previous_crop ?? "");
        setRecommendations(res.recommendations ?? []);
      } catch (err) {
        if (!cancelled) {
          toast({
            title: "Could not load rotation suggestions",
            description: err instanceof Error ? err.message : "Please try again.",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) setRecLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [plantationId, toast]);

  const pill = summary
    ? { label: titleCase(summary.status || "active"), tone: statusTone(summary.status) }
    : null;

  return (
    <StepLayout
      plantationId={plantationId}
      title="Crop Rotation"
      subtitle={
        summary
          ? `${titleCase(summary.crop_name)} · recommended next crops`
          : "Loading…"
      }
      steps={POSTHARVEST_STEPS}
      currentKey="rotation"
      loading={loading || !summary}
      statusPill={pill}
    >
      {summary && (
        <>
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
            <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-900">
                Step 4 · Review rotation suggestions.
              </p>
              <p className="mt-0.5 text-xs text-emerald-800/80">
                Based on your previous crop of{" "}
                <span className="font-semibold text-foreground">
                  {titleCase(previousCrop) || "—"}
                </span>
                . Rotation helps break pest cycles, restore soil nutrients, and
                keep your farm productive.
              </p>
            </div>
          </div>

          {recLoading ? (
            <div className="flex items-center justify-center rounded-2xl border border-border bg-card p-10">
              <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Loading recommendations…</span>
            </div>
          ) : recommendations.length === 0 ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-800">
              No rotation rules found for {titleCase(previousCrop)}. You can
              still start a new cycle with any crop.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {recommendations.map((rec) => (
                <div
                  key={String(rec.id)}
                  className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-3"
                >
                  <p className="text-base font-bold text-foreground">
                    {titleCase(rec.recommended_crop)}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">{rec.reason}</p>
                </div>
              ))}
            </div>
          )}

          <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center">
            <Button
              variant="outline"
              onClick={() => navigate(`/plantation/${plantationId}/postharvest/profit`)}
              className="w-full sm:w-auto"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to profit
            </Button>
            <Button
              onClick={() => navigate(`/plantation/${plantationId}/postharvest/archive`)}
              className="w-full gradient-primary text-white sm:w-auto"
            >
              Continue to archive
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </>
      )}
    </StepLayout>
  );
}
