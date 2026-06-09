import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  Leaf,
  Loader2,
  MapPinned,
  Sprout,
  SproutIcon,
  Tractor,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import PlantationDashboard from "@/components/planting/PlantationDashboard";
import type { HarvestSummary, Plantation } from "@/types/planting";
import "./Plantation.css";

const TERMINAL_STATUSES = new Set([
  "finished",
  "completed",
  "harvested",
  "cancelled",
  "archived",
]);

function isActive(plantation: Plantation | null | undefined): boolean {
  if (!plantation) return false;
  const status = String(plantation.status ?? "").toLowerCase();
  if (TERMINAL_STATUSES.has(status)) return false;
  // Also active if any calendar event is not done
  const events = plantation.calendarEvents ?? [];
  if (events.some((event) => String(event.status).toLowerCase() !== "done")) {
    return true;
  }
  return false;
}

function numericValue(value: string | number | null | undefined): number {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatMoney(value: string | number | null | undefined): string {
  return `₱${numericValue(value).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })}`;
}

function hasPostharvestAnalytics(summary: HarvestSummary | null): boolean {
  if (!summary) return false;
  const status = String(summary.status ?? "").toLowerCase();
  const yieldValue = numericValue(summary.harvest?.actual_yield);
  return Boolean(
    summary.profit ||
      yieldValue > 0 ||
      status === "archived" ||
      status === "completed",
  );
}

export default function PlantationPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [plantation, setPlantation] = useState<Plantation | null>(null);
  const [loading, setLoading] = useState(true);
  const [postharvestSummary, setPostharvestSummary] =
    useState<HarvestSummary | null>(null);
  const [postharvestLoading, setPostharvestLoading] = useState(false);
  const inFlightRef = useRef(false);

  const loadPlantation = useCallback(
    async (options?: { silent?: boolean }) => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        const response = await api.listPlantations();
        const list = ((response.plantations || []) as unknown as Plantation[]).filter(
          (p) => p && p.farm,
        );
        const active =
          list.find((p) => String(p.status).toLowerCase() === "active") ?? list[0] ?? null;

        if (!active) {
          setPlantation(null);
          if (!options?.silent) {
            setLoading(false);
          }
          return;
        }

        try {
          const detail = await api.getPlantation(String(active.id));
          const detailPlantation = detail.plantation as unknown as Plantation;
          const merged: Plantation = {
            ...active,
            ...(detailPlantation ?? {}),
            farm: detailPlantation?.farm ?? active.farm,
            costs: detailPlantation?.costs ?? active.costs,
            calendarEvents:
              detailPlantation?.calendarEvents ?? active.calendarEvents,
            next_activity:
              detailPlantation?.next_activity ?? active.next_activity,
          };
          setPlantation(merged);
        } catch (detailError) {
          console.warn("Falling back to list row for plantation", detailError);
          setPlantation(active);
        }
      } catch (error) {
        console.error("Failed to load plantation:", error);
        if (!options?.silent) {
          toast({
            title: "Could not load plantation",
            description:
              error instanceof Error ? error.message : "Please try again.",
            variant: "destructive",
          });
        }
        setPlantation(null);
      } finally {
        inFlightRef.current = false;
        if (!options?.silent) {
          setLoading(false);
        }
      }
    },
    [toast],
  );

  useEffect(() => {
    void loadPlantation();
  }, [loadPlantation]);

  useEffect(() => {
    if (!plantation?.id) {
      setPostharvestSummary(null);
      setPostharvestLoading(false);
      return;
    }

    let cancelled = false;
    setPostharvestLoading(true);

    (async () => {
      try {
        const response = await api.getHarvestSummary(String(plantation.id));
        if (!cancelled) setPostharvestSummary(response.summary);
      } catch (error) {
        if (!cancelled) {
          console.warn("Could not load postharvest analytics", error);
          setPostharvestSummary(null);
        }
      } finally {
        if (!cancelled) setPostharvestLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [plantation?.id]);

  // When the only (or latest) plantation is fully harvested, redirect to the
  // post-harvest workspace so the farmer can record yield, profit, and start
  // a new cycle without an extra click. We wait until loading is done and only
  // redirect if the plantation exists and every calendar event is done (or
  // there are no events left at all).
  useEffect(() => {
    if (loading) return;
    if (!plantation) return;
    if (postharvestLoading) return;
    const status = String(plantation.status ?? "").toLowerCase();
    const isTerminal = TERMINAL_STATUSES.has(status);
    const events = plantation.calendarEvents ?? [];
    const allDone = events.length === 0 || events.every((event) => {
      const s = String(event.status ?? "").toLowerCase();
      return s === "done" || s === "completed" || s === "skipped";
    });
    if (isTerminal && allDone && !hasPostharvestAnalytics(postharvestSummary)) {
      // Use replace so the user can press Back without bouncing here again.
      navigate(
        `/plantation/${String(plantation.id)}/postharvest/summary`,
        { replace: true },
      );
    }
  }, [loading, plantation, postharvestLoading, postharvestSummary, navigate]);

  useEffect(() => {
    const handleRefresh = () => {
      void loadPlantation({ silent: true });
    };
    window.addEventListener("focus", handleRefresh);
    document.addEventListener("visibilitychange", handleRefresh);
    window.addEventListener("plantation:created", handleRefresh);
    return () => {
      window.removeEventListener("focus", handleRefresh);
      document.removeEventListener("visibilitychange", handleRefresh);
      window.removeEventListener("plantation:created", handleRefresh);
    };
  }, [loadPlantation]);

  const handlePlantationChange = useCallback((next: Plantation) => {
    setPlantation(next);
  }, []);

  const plantationStatus = String(plantation?.status ?? "").toLowerCase();
  const isFinished = TERMINAL_STATUSES.has(plantationStatus);
  const isActivePlantation = isActive(plantation);
  const hasAnalytics = hasPostharvestAnalytics(postharvestSummary);

  const summary = useMemo(() => {
    if (!plantation) return null;
    const events = plantation.calendarEvents ?? [];
    const total = events.length || 1;
    const completed = events.filter(
      (e) => String(e.status).toLowerCase() === "done" || String(e.status).toLowerCase() === "completed",
    ).length;
    const overdue = events.filter((e) => {
      const status = String(e.status).toLowerCase();
      if (status === "done" || status === "completed" || status === "skipped") return false;
      const effective = String(
        e.rescheduled_to || e.adjusted_date || e.scheduled_date || "",
      ).slice(0, 10);
      if (!effective) return false;
      const today = new Date().toISOString().slice(0, 10);
      return effective < today;
    }).length;
    return {
      total,
      completed,
      overdue,
      percent: Math.round((completed / total) * 100),
    };
  }, [plantation]);

  return (
    <div className="plantation-page min-h-screen bg-gradient-to-br from-slate-50 via-green-50/30 to-slate-100 pb-24">
      <header className="plantation-header sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur-md">
        <button
          onClick={() => navigate(-1)}
          className="rounded-lg p-1 text-foreground hover:bg-muted"
          title="Go back"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
          <Tractor className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-foreground">My Plantation</h1>
          <p className="text-xs text-muted-foreground">
            Track your farm, smart calendar, costs, and harvest in one place.
          </p>
        </div>
        {plantation && (
          <span
            className={[
              "hidden shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold sm:inline-flex",
              isFinished
                ? "bg-emerald-100 text-emerald-700"
                : isActivePlantation
                  ? "bg-amber-100 text-amber-800"
                  : "bg-muted text-muted-foreground",
            ].join(" ")}
          >
            {isFinished ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : (
              <Leaf className="h-3.5 w-3.5" />
            )}
            {plantationStatus || "active"}
          </span>
        )}
      </header>

      <div className="px-4 py-4 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="mr-2 h-6 w-6 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Loading plantation…</span>
          </div>
        ) : plantation ? (
          <div className="space-y-4">
            {summary && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <SummaryTile
                  icon={<Leaf className="h-4 w-4 text-emerald-600" />}
                  label="Crop"
                  value={plantation.crop_name}
                />
                <SummaryTile
                  icon={<ClipboardCheck className="h-4 w-4 text-sky-600" />}
                  label="Activities"
                  value={`${summary.completed} / ${summary.total}`}
                />
                <SummaryTile
                  icon={<CircleDollarSign className="h-4 w-4 text-amber-600" />}
                  label="Spent"
                  value={`₱${Number(plantation.costs?.total_cost ?? 0).toLocaleString()}`}
                />
                <SummaryTile
                  icon={
                    summary.overdue > 0 ? (
                      <span className="text-rose-600">⚠</span>
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    )
                  }
                  label={summary.overdue > 0 ? "Overdue" : "On track"}
                  value={
                    summary.overdue > 0
                      ? `${summary.overdue} pending`
                      : `${summary.percent}% done`
                  }
                  tone={summary.overdue > 0 ? "danger" : "ok"}
                />
              </div>
            )}

            {isFinished && hasAnalytics && postharvestSummary && (
              <div className="space-y-3 rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
                      <BarChart3 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-emerald-900">
                        Farm analytics are ready for this plantation.
                      </p>
                      <p className="mt-0.5 text-xs text-emerald-800/80">
                        This cycle already has postharvest data, so you can
                        review yield, revenue, profit, and ROI here.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full border-emerald-200 sm:w-auto"
                    onClick={() => navigate("/settings")}
                  >
                    Open analytics
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <SummaryTile
                    icon={<Sprout className="h-4 w-4 text-emerald-600" />}
                    label="Yield"
                    value={
                      postharvestSummary.harvest
                        ? `${numericValue(postharvestSummary.harvest.actual_yield).toLocaleString()} ${postharvestSummary.harvest.yield_unit}`
                        : "Recorded"
                    }
                    tone="ok"
                  />
                  <SummaryTile
                    icon={<CircleDollarSign className="h-4 w-4 text-sky-600" />}
                    label="Revenue"
                    value={formatMoney(postharvestSummary.profit?.total_revenue)}
                  />
                  <SummaryTile
                    icon={<TrendingUp className="h-4 w-4 text-amber-600" />}
                    label="Net profit"
                    value={formatMoney(postharvestSummary.profit?.net_profit)}
                    tone={numericValue(postharvestSummary.profit?.net_profit) >= 0 ? "ok" : "danger"}
                  />
                  <SummaryTile
                    icon={<CheckCircle2 className="h-4 w-4 text-violet-600" />}
                    label="ROI"
                    value={`${numericValue(postharvestSummary.profit?.roi_percent).toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}%`}
                  />
                </div>
              </div>
            )}

            {isFinished && !hasAnalytics && (
              <div className="flex flex-col items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-emerald-900">
                      Harvest complete — record yield, profit, and start a new cycle.
                    </p>
                    <p className="mt-0.5 text-xs text-emerald-800/80">
                      Open the post-harvest workspace to log yield, compute
                      profit, and start a new plantation using this farm's
                      boundary.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    onClick={() =>
                      navigate(
                        `/plantation/${String(plantation.id)}/postharvest/summary`,
                      )
                    }
                    className="gradient-primary text-white"
                  >
                    <SproutIcon className="mr-2 h-4 w-4" />
                    Open post-harvest
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate("/crop-results")}
                  >
                    Plant new cycle
                  </Button>
                </div>
              </div>
            )}

            {isActivePlantation && !isFinished && (
              <div className="flex flex-col items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-amber-100 p-2 text-amber-700">
                    <Sprout className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-amber-900">
                      Finish or harvest this cycle to start a new one.
                    </p>
                    <p className="mt-0.5 text-xs text-amber-800/80">
                      Mark activities as done below, or skip / reschedule if needed.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <PlantationDashboard
              plantation={plantation}
              onChange={handlePlantationChange}
            />
          </div>
        ) : (
          <div className="plantation-empty">
            <div className="plantation-empty-illustration">
              <div className="plantation-empty-icon">
                <MapPinned className="h-10 w-10" />
              </div>
              <div className="plantation-empty-pulse" />
            </div>
            <h2 className="text-xl font-bold text-foreground">
              No plantation yet
            </h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Start a planting on the satellite map to track progress, costs, and
              weather-aware activities for every crop cycle.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button
                className="gradient-primary"
                onClick={() => navigate("/crop-results")}
              >
                <Sprout className="mr-2 h-4 w-4" />
                Choose a crop to plant
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/dashboard")}
              >
                Back to dashboard
              </Button>
            </div>
            <div className="plantation-empty-stats">
              <div>
                <span className="block text-lg font-bold text-emerald-700">GPS</span>
                <span className="text-xs text-muted-foreground">Auto-detect</span>
              </div>
              <div>
                <span className="block text-lg font-bold text-emerald-700">AI</span>
                <span className="text-xs text-muted-foreground">Weather-aware</span>
              </div>
              <div>
                <span className="block text-lg font-bold text-emerald-700">Live</span>
                <span className="text-xs text-muted-foreground">Cost tracking</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryTile({
  icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "default" | "ok" | "danger";
}) {
  const toneClass =
    tone === "danger"
      ? "border-rose-200 bg-rose-50/60"
      : tone === "ok"
        ? "border-emerald-200 bg-emerald-50/60"
        : "border-border bg-card";
  return (
    <div
      className={[
        "flex items-center gap-3 rounded-2xl border p-3 card-shadow",
        toneClass,
      ].join(" ")}
    >
      <div className="rounded-lg bg-white p-2 shadow-sm">{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="truncate text-sm font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}
