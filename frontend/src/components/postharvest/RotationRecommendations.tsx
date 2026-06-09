import { useEffect, useState } from "react";
import { Leaf, Loader2, Sparkles, Sprout } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { RotationRecommendation } from "@/types/planting";

export interface RotationRecommendationsProps {
  plantationId: string;
  onStartCycle?: (recommendedCrop: string) => void;
}

function titleCase(str: string): string {
  return str
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function RotationRecommendations({
  plantationId,
  onStartCycle,
}: RotationRecommendationsProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [previousCrop, setPreviousCrop] = useState<string>("");
  const [recommendations, setRecommendations] = useState<RotationRecommendation[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
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
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [plantationId, toast]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-5 w-5 text-emerald-600" />
          Recommended next crops
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Based on your previous crop of{" "}
          <span className="font-semibold text-foreground">
            {titleCase(previousCrop) || "—"}
          </span>
          . Rotation helps break pest cycles, restore soil nutrients, and keep
          your farm productive.
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-2xl" />
            ))}
          </div>
        ) : recommendations.length === 0 ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-sm text-amber-800">
            No rotation rules found for {titleCase(previousCrop)}. You can still
            start a new cycle with any crop.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recommendations.map((rec) => (
              <div
                key={String(rec.id)}
                className="flex h-full flex-col justify-between rounded-2xl border border-emerald-200 bg-emerald-50/40 p-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <div className="rounded-md bg-emerald-100 p-1.5 text-emerald-700">
                      <Sprout className="h-4 w-4" />
                    </div>
                    <p className="text-base font-bold text-foreground">
                      {titleCase(rec.recommended_crop)}
                    </p>
                  </div>
                  <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
                    <Leaf className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    <span>{rec.reason}</span>
                  </p>
                </div>
                {onStartCycle && (
                  <button
                    type="button"
                    onClick={() => onStartCycle(rec.recommended_crop)}
                    className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
                  >
                    Plant {titleCase(rec.recommended_crop)} next
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        {!loading && recommendations.length > 0 && (
          <p className="mt-3 text-[11px] text-muted-foreground">
            <Loader2 className="mr-1 inline h-3 w-3 opacity-0" />
            Rules are configurable in <code>crop_rotation_rules</code>. Add new
            entries to support more crops.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
