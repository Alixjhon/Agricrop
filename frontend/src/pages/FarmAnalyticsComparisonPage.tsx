import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  CircleDollarSign,
  MapPinned,
  Sprout,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import type { FarmHistoryEntry, Plantation } from "@/types/planting";

function titleCase(str: string): string {
  return str
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatDate(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function yearOf(value?: string | null): string {
  if (!value) return "—";
  return new Date(value).getFullYear().toString();
}

function formatNumber(
  value: number | string | null | undefined,
  fractionDigits = 0,
): string {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return "0";
  return num.toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

function formatCurrency(value: number | string | null | undefined): string {
  return `₱${formatNumber(value, 2)}`;
}

function statusTone(
  status: string,
): "default" | "ok" | "warn" | "muted" {
  const s = (status ?? "").toLowerCase();
  if (s === "active") return "warn";
  if (s === "harvested" || s === "finished" || s === "completed") return "ok";
  if (s === "archived" || s === "cancelled") return "muted";
  return "default";
}

export default function FarmAnalyticsComparisonPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [farmId, setFarmId] = useState<string | null>(null);
  const [farmName, setFarmName] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [history, setHistory] = useState<FarmHistoryEntry[]>([]);

  // Load the user's active farm
  useEffect(() => {
    let cancelled = false;
    setPageLoading(true);
    setPageError(null);
    (async () => {
      try {
        const response = await api.listPlantations();
        const list = ((response.plantations || []) as unknown as Plantation[]).filter(
          (p) => p && p.farm,
        );
        if (cancelled) return;
        if (list.length === 0) {
          setPageError(
            "You don't have any plantations yet. Create one first to compare cycles.",
          );
          setPageLoading(false);
          return;
        }
        const active =
          list.find((p) => String(p.status).toLowerCase() === "active") ?? list[0];
        if (!active || !active.farm) {
          setPageError("No active farm found for your plantations.");
          setPageLoading(false);
          return;
        }
        setFarmId(String(active.farm.id ?? active.farm_id ?? ""));
        setFarmName(active.farm.farm_name ?? "Your farm");
        setPageLoading(false);
      } catch (err) {
        if (!cancelled) {
          setPageError(
            err instanceof Error
              ? err.message
              : "Failed to load farm information.",
          );
          setPageLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load farm history once we know the farm id
  useEffect(() => {
    if (!farmId) return;
    let cancelled = false;
    setHistoryLoading(true);
    (async () => {
      try {
        const res = await api.getFarmHistory(farmId);
        if (cancelled) return;
        setHistory(res.history ?? []);
      } catch (err) {
        if (!cancelled) {
          toast({
            title: "Could not load farm history",
            description:
              err instanceof Error ? err.message : "Please try again.",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [farmId, toast]);

  // Group by year, newest first
  const grouped = useMemo(() => {
    const map = new Map<string, FarmHistoryEntry[]>();
    for (const entry of history) {
      const year = yearOf(entry.planting_date);
      if (!map.has(year)) map.set(year, []);
      map.get(year)!.push(entry);
    }
    return Array.from(map.entries()).sort((a, b) =>
      a[0] < b[0] ? 1 : a[0] > b[0] ? -1 : 0,
    );
  }, [history]);

  const headerSubtitle = useMemo(() => {
    if (pageLoading) return "Loading…";
    if (pageError) return "Comparison unavailable";
    if (farmName) return `${titleCase(farmName)} · compare every cycle side by side`;
    return undefined;
  }, [pageLoading, pageError, farmName]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-pink-50/30 to-slate-100 pb-24 sm:pb-28">
      {/* Sticky header */}
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-card/95 px-3 py-2.5 backdrop-blur-md sm:px-4 sm:py-3">
        <button
          onClick={() => navigate("/dashboard")}
          className="shrink-0 rounded-lg p-2 text-foreground hover:bg-muted"
          title="Go back to dashboard"
          aria-label="Go back to dashboard"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-pink-100 text-pink-700 sm:flex">
          <BarChart3 className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-bold text-foreground sm:text-lg">
            Farm Analytics Comparison
          </h1>
          {headerSubtitle && (
            <p className="truncate text-xs text-muted-foreground">
              {headerSubtitle}
            </p>
          )}
        </div>
      </header>

      <div className="mx-auto w-full max-w-4xl space-y-4 px-3 py-4 sm:space-y-5 sm:px-6 sm:py-6">
        {/* Intro callout */}
        <div className="flex items-start gap-3 rounded-2xl border border-pink-200 bg-pink-50/70 p-3 sm:p-4">
          <div className="rounded-xl bg-pink-100 p-2 text-pink-700">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-pink-900">
              Every plantation cycle on{" "}
              {farmName ? titleCase(farmName) : "this farm"}.
            </p>
            <p className="text-xs text-pink-800/80">
              Past cycles stay accessible even after archive so you can review
              yield, profit, and rotation patterns.
            </p>
          </div>
        </div>

        {pageLoading && (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
          </div>
        )}

        {pageError && !pageLoading && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-900">
            {pageError}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/plantation")}
              >
                Go to plantations
              </Button>
            </div>
          </div>
        )}

        {farmId && !pageLoading && !pageError && (
          <Card>
            <CardContent className="p-3 sm:p-5">
              {historyLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-14 w-full rounded-xl" />
                  <Skeleton className="h-14 w-full rounded-xl" />
                  <Skeleton className="h-14 w-full rounded-xl" />
                </div>
              ) : history.length === 0 ? (
                <p className="rounded-xl border border-pink-200 bg-pink-50/70 p-3 text-sm text-pink-800">
                  No previous plantations for this farm yet. Your first cycle is
                  under way.
                </p>
              ) : (
                <div className="space-y-5 sm:space-y-6">
                  {grouped.map(([year, entries]) => (
                    <div key={year}>
                      <div className="mb-2 flex items-center gap-2 sm:mb-3">
                        <Badge
                          variant="outline"
                          className="border-pink-200 bg-pink-50 text-pink-700"
                        >
                          {year}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">
                          {entries.length} cycle
                          {entries.length === 1 ? "" : "s"}
                        </span>
                      </div>
                      <ul className="space-y-2 sm:space-y-3">
                        {entries.map((entry) => {
                          const tone = statusTone(entry.status);
                          const profit = Number(entry.net_profit ?? 0);
                          const isLoss = profit < 0;
                          return (
                            <li key={String(entry.plantation_id)}>
                              {/* Non-interactive (read-only) card */}
                              <div className="w-full rounded-2xl border border-border bg-card p-3 sm:p-4">
                                {/* Top row: crop + date + status */}
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex min-w-0 items-center gap-2">
                                    <div className="rounded-md bg-pink-100 p-1.5 text-pink-700">
                                      <Sprout className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-bold text-foreground">
                                        {titleCase(entry.crop_name)}
                                      </p>
                                      <p className="text-[11px] text-muted-foreground">
                                        {formatDate(entry.planting_date)} →{" "}
                                        {entry.actual_harvest_date
                                          ? formatDate(entry.actual_harvest_date)
                                          : `Expected ${formatDate(
                                              entry.expected_harvest_date,
                                            )}`}
                                      </p>
                                    </div>
                                  </div>
                                  <StatusBadge tone={tone} status={entry.status} />
                                </div>

                                {/* Facts grid: stacks on mobile, 4-up on tablet+ */}
                                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
                                  <Fact
                                    icon={
                                      <MapPinned className="h-3 w-3" />
                                    }
                                    label="Area"
                                    value={`${formatNumber(
                                      entry.area_hectares,
                                      2,
                                    )} ha`}
                                  />
                                  <Fact
                                    icon={<Sprout className="h-3 w-3" />}
                                    label="Yield"
                                    value={
                                      entry.yield_value != null
                                        ? `${formatNumber(
                                            entry.yield_value,
                                            2,
                                          )} ${entry.yield_unit ?? ""}`
                                        : "—"
                                    }
                                  />
                                  <Fact
                                    icon={
                                      isLoss ? (
                                        <TrendingDown className="h-3 w-3" />
                                      ) : (
                                        <CircleDollarSign className="h-3 w-3" />
                                      )
                                    }
                                    label="Profit"
                                    value={
                                      entry.net_profit != null
                                        ? formatCurrency(entry.net_profit)
                                        : "—"
                                    }
                                    tone={isLoss ? "warn" : "default"}
                                  />
                                  <Fact
                                    icon={
                                      <span className="inline-flex items-center gap-0.5">
                                        {Number(entry.roi_percent ?? 0) < 0 ? (
                                          <TrendingDown className="h-3 w-3" />
                                        ) : (
                                          <TrendingUp className="h-3 w-3" />
                                        )}
                                      </span>
                                    }
                                    label="ROI"
                                    value={
                                      entry.roi_percent != null
                                        ? `${formatNumber(
                                            entry.roi_percent,
                                            1,
                                          )}%`
                                        : "—"
                                    }
                                    tone={
                                      Number(entry.roi_percent ?? 0) < 0
                                        ? "warn"
                                        : "default"
                                    }
                                  />
                                </div>

                                {/* Extra responsive dates row on small screens */}
                                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground sm:hidden">
                                  <Calendar className="h-3 w-3" />
                                  <span>
                                    {formatDate(entry.planting_date)} →{" "}
                                    {entry.actual_harvest_date
                                      ? formatDate(entry.actual_harvest_date)
                                      : `Expected ${formatDate(
                                          entry.expected_harvest_date,
                                        )}`}
                                  </span>
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              )}

              {!historyLoading && history.length > 0 && (
                <p className="mt-4 text-center text-[11px] text-muted-foreground sm:text-left">
                  Showing {history.length} plantation
                  {history.length === 1 ? "" : "s"}
                </p>
              )}
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}

function StatusBadge({
  status,
  tone,
}: {
  status: string;
  tone: "default" | "ok" | "warn" | "muted";
}) {
  const styles =
    tone === "ok"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "warn"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : tone === "muted"
          ? "border-slate-200 bg-slate-50 text-slate-700"
          : "border-border bg-muted text-muted-foreground";
  return (
    <span
      className={[
        "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        styles,
      ].join(" ")}
    >
      {titleCase(status || "active")}
    </span>
  );
}

function Fact({
  icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "default" | "warn";
}) {
  const valueClass =
    tone === "warn" ? "text-rose-700" : "text-foreground";
  return (
    <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-1">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span
        className={`ml-auto text-[11px] font-semibold sm:text-xs ${valueClass}`}
      >
        {value}
      </span>
    </div>
  );
}
