import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Loader2, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { clearDraft } from "@/lib/postharvestStorage";
import { usePostharvestFlow } from "./usePostharvestFlow";
import { StepLayout } from "./StepLayout";

function titleCase(str: string): string {
  return str
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function todayInput(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const CROP_SUGGESTIONS = [
  "Corn",
  "Rice",
  "Tomato",
  "Eggplant",
  "Pepper",
  "Lettuce",
  "Cabbage",
  "Onion",
  "Garlic",
  "Potato",
  "Sweet Potato",
  "Cassava",
  "Banana",
  "Mung Bean",
  "Peanut",
  "Soybean",
];

export default function NewPlantationPage() {
  const params = useParams<{ plantationId: string }>();
  const plantationId = params.plantationId ?? "";
  const navigate = useNavigate();
  const { toast } = useToast();
  const { summary, loading } = usePostharvestFlow();

  const [recommendedCrop, setRecommendedCrop] = useState<string>("");
  const [cropName, setCropName] = useState<string>("");
  const [plantingDate, setPlantingDate] = useState<string>(todayInput());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!plantationId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.getRotationRecommendations(plantationId);
        if (cancelled) return;
        const first = res.recommendations?.[0]?.recommended_crop;
        if (first) {
          setRecommendedCrop(first);
          setCropName((prev) => (prev ? prev : first));
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [plantationId]);

  const handleSubmit = async () => {
    if (!summary) return;
    if (!cropName.trim()) {
      toast({
        title: "Pick a crop first",
        description: "Type or select a new crop to plant.",
        variant: "destructive",
      });
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(plantingDate)) {
      toast({
        title: "Invalid date",
        description: "Please choose a valid planting date.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      await api.startNewPlantationCycle(String(summary.farm_id), {
        cropName: cropName.trim(),
        plantingDate,
      });
      clearDraft(plantationId);
      try {
        window.dispatchEvent(new CustomEvent("plantation:created"));
      } catch {}
      toast({
        title: "New cycle started",
        description: `${titleCase(cropName.trim())} planted on ${plantingDate}. Status: Growing.`,
      });
      navigate("/plantation");
    } catch (err) {
      toast({
        title: "Could not start new cycle",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <StepLayout
      plantationId={plantationId}
      title="Start New Plantation"
      subtitle={
        summary
          ? `${summary.farm_name || "Farm"} · reuse boundary, new crop`
          : "Loading…"
      }
      steps={[]}
      currentKey="new-plantation"
      loading={loading || !summary}
    >
      {summary && (
        <>
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
            <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
              <Sprout className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-900">
                Final step · Start the next cycle.
              </p>
              <p className="mt-0.5 text-xs text-emerald-800/80">
                We'll reuse the boundary of{" "}
                <span className="font-semibold text-foreground">
                  {summary.farm_name || "your farm"}
                </span>{" "}
                ({Number(summary.area_hectares ?? 0).toFixed(2)} ha). A new
                Smart Farming Calendar is generated automatically.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-foreground">Farm</p>
                <div className="mt-1 flex h-10 items-center gap-2 rounded-md border border-border bg-muted/40 px-3 text-sm text-foreground">
                  <Sprout className="h-4 w-4 text-emerald-600" />
                  <span className="font-semibold">{summary.farm_name || "Your farm"}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {Number(summary.area_hectares ?? 0).toFixed(2)} ha
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Boundary is auto-filled — no need to redraw.
                </p>
              </div>
              <div>
                <label
                  htmlFor="cycle-crop"
                  className="text-xs font-medium text-foreground"
                >
                  New crop
                </label>
                <Input
                  id="cycle-crop"
                  className="mt-1"
                  placeholder="e.g. Mung Bean, Peanut, Rice…"
                  value={cropName}
                  onChange={(e) => setCropName(e.target.value)}
                  list="cycle-crop-suggestions"
                />
                <datalist id="cycle-crop-suggestions">
                  {CROP_SUGGESTIONS.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
                {recommendedCrop && (
                  <p className="mt-1 text-[11px] text-emerald-700">
                    Rotation suggestion: {titleCase(recommendedCrop)}
                  </p>
                )}
              </div>
              <div className="sm:col-span-2">
                <label
                  htmlFor="cycle-date"
                  className="text-xs font-medium text-foreground"
                >
                  Planting date
                </label>
                <Input
                  id="cycle-date"
                  type="date"
                  className="mt-1"
                  value={plantingDate}
                  onChange={(e) => setPlantingDate(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button
                onClick={handleSubmit}
                className="gradient-primary text-white"
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sprout className="mr-2 h-4 w-4" />
                )}
                Start new cycle
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  navigate(`/plantation/${plantationId}/postharvest/archive`)
                }
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to archive
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() =>
                navigate(`/plantation/${plantationId}/postharvest/history`)
              }
            >
              View farm history first
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </>
      )}
    </StepLayout>
  );
}
