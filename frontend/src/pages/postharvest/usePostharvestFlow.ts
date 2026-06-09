import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { HarvestSummary } from "@/types/planting";

export interface PostharvestFlowData {
  summary: HarvestSummary | null;
  totalCost: number;
  loading: boolean;
  reload: () => Promise<void>;
}

export function usePostharvestFlow(): PostharvestFlowData {
  const params = useParams<{ plantationId: string }>();
  const plantationId = params.plantationId ?? "";
  const { toast } = useToast();
  const [summary, setSummary] = useState<HarvestSummary | null>(null);
  const [totalCost, setTotalCost] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!plantationId) return;
    setLoading(true);
    try {
      const [summaryRes, plantationRes] = await Promise.all([
        api.getHarvestSummary(plantationId),
        api.getPlantation(plantationId).catch(() => null),
      ]);
      setSummary(summaryRes.summary);
      const cost = Number(
        (plantationRes?.plantation as unknown as {
          costs?: { total_cost?: number | string };
        } | null)?.costs?.total_cost ?? 0,
      );
      setTotalCost(Number.isFinite(cost) ? cost : 0);
    } catch (err) {
      toast({
        title: "Could not load harvest data",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [plantationId, toast]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { summary, totalCost, loading, reload };
}

export function statusTone(status?: string): "ok" | "warn" | "muted" {
  const s = (status ?? "").toLowerCase();
  if (s === "active") return "warn";
  if (["harvested", "finished", "completed", "archived"].includes(s)) {
    return s === "archived" ? "muted" : "ok";
  }
  return "muted";
}
