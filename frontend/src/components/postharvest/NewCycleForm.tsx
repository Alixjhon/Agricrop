import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Calendar, Loader2, MapPinned, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { formatArea } from "@/lib/geo";

export interface NewCycleFormProps {
  farmId: string;
  farmName?: string;
  areaHectares?: number;
  areaSqm?: number;
  defaultCropName?: string;
  /** Re-render key the parent can bump after a successful create. */
  resetKey?: string | number;
}

function todayInput(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function NewCycleForm({
  farmId,
  farmName,
  areaHectares,
  areaSqm,
  defaultCropName,
  resetKey,
}: NewCycleFormProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [cropName, setCropName] = useState<string>(defaultCropName ?? "");
  const [plantingDate, setPlantingDate] = useState<string>(todayInput());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCropName(defaultCropName ?? "");
    setPlantingDate(todayInput());
    setError(null);
  }, [defaultCropName, resetKey]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!cropName.trim()) {
      setError("Please choose a crop to plant.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(plantingDate)) {
      setError("Please pick a valid planting date.");
      return;
    }
    setSaving(true);
    try {
      await api.startNewPlantationCycle(farmId, {
        cropName: cropName.trim(),
        plantingDate,
      });
      toast({
        title: "New cycle started",
        description: `${titleCase(cropName.trim())} planted on ${plantingDate}. A new smart calendar has been generated.`,
      });
      // Tell the plantation page (if mounted) to refresh and jump to it.
      try {
        window.dispatchEvent(new CustomEvent("plantation:created"));
      } catch {}
      navigate("/plantation");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start new cycle");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sprout className="h-5 w-5 text-emerald-600" />
          Start a new plantation cycle
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Reuse the farm boundary from this archive. Pick a new crop and a
          planting date and we'll generate a fresh Smart Farming Calendar
          for you.
        </p>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cycle-farm">Farm</Label>
              <div
                id="cycle-farm"
                className="flex h-10 items-center gap-2 rounded-md border border-border bg-muted/40 px-3 text-sm text-foreground"
              >
                <MapPinned className="h-4 w-4 text-emerald-600" />
                <span className="font-semibold">{farmName || "Your farm"}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {areaHectares != null
                    ? `${areaHectares.toFixed(2)} ha · ${formatArea(areaSqm ?? Math.round((areaHectares ?? 0) * 10_000))}`
                    : ""}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Boundary is auto-filled. No need to redraw the map.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cycle-crop">New crop</Label>
              <Input
                id="cycle-crop"
                placeholder="e.g. Mung Bean, Peanut, Rice…"
                value={cropName}
                onChange={(e) => setCropName(e.target.value)}
                list="cycle-crop-suggestions"
                required
              />
              <datalist id="cycle-crop-suggestions">
                {CROP_SUGGESTIONS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="cycle-date" className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> Planting date
              </Label>
              <Input
                id="cycle-date"
                type="date"
                value={plantingDate}
                onChange={(e) => setPlantingDate(e.target.value)}
                required
              />
            </div>
          </div>
          {error && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">
              {error}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" className="gradient-primary text-white" disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="mr-2 h-4 w-4" />
              )}
              Start new cycle
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/plantation")}
              disabled={saving}
            >
              Back to plantation
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
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

function titleCase(str: string): string {
  return str
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
