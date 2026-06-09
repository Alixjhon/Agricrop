import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, ChevronRight, CircleDollarSign, History, Loader2, MapPinned, Sprout } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import type { FarmHistoryEntry } from "@/types/planting";

export interface FarmHistoryListProps {
  farmId: string;
  /** Optional: include the currently-viewed plantation id in the list. */
  currentPlantationId?: string;
}

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

function formatNumber(value: number | string | null | undefined, fractionDigits = 0): string {
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

function statusTone(status: string): "default" | "ok" | "warn" | "muted" {
  const s = (status ?? "").toLowerCase();
  if (s === "active") return "warn";
  if (s === "harvested" || s === "finished" || s === "completed") return "ok";
  if (s === "archived" || s === "cancelled") return "muted";
  return "default";
}

export function FarmHistoryList({ farmId, currentPlantationId }: FarmHistoryListProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<FarmHistoryEntry[]>([]);

  useEffect(() => {
    if (!farmId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await api.getFarmHistory(farmId);
        if (cancelled) return;
        setHistory(res.history ?? []);
      } catch (err) {
        if (!cancelled) {
          toast({
            title: "Could not load farm history",
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
  }, [farmId, toast]);

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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-5 w-5 text-sky-600" />
          Farm history
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Every plantation cycle on this farm. Past cycles stay accessible even
          after archive so you can review yield, profit, and rotation patterns.
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
          </div>
        ) : history.length === 0 ? (
          <p className="rounded-xl border border-sky-200 bg-sky-50/70 p-3 text-sm text-sky-800">
            No previous plantations for this farm yet. Your first cycle is
            under way.
          </p>
        ) : (
          <div className="space-y-4">
            {grouped.map(([year, entries]) => (
              <div key={year}>
                <div className="mb-1 flex items-center gap-2">
                  <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700">
                    {year}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground">
                    {entries.length} cycle{entries.length === 1 ? "" : "s"}
                  </span>
                </div>
                <ul className="space-y-2">
                  {entries.map((entry) => {
                    const isCurrent =
                      currentPlantationId != null &&
                      String(entry.plantation_id) === String(currentPlantationId);
                    const tone = statusTone(entry.status);
                    return (
                      <li key={String(entry.plantation_id)}>
                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/plantation/${String(entry.plantation_id)}/postharvest`)
                          }
                          className={[
                            "w-full rounded-2xl border bg-card p-3 text-left transition-colors hover:border-emerald-300 hover:bg-emerald-50/40",
                            isCurrent ? "border-emerald-300 bg-emerald-50/30" : "border-border",
                          ].join(" ")}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className="rounded-md bg-emerald-100 p-1.5 text-emerald-700">
                                <Sprout className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-foreground">
                                  {titleCase(entry.crop_name)}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                  {formatDate(entry.planting_date)} →{" "}
                                  {entry.actual_harvest_date
                                    ? formatDate(entry.actual_harvest_date)
                                    : `Expected ${formatDate(entry.expected_harvest_date)}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <StatusBadge tone={tone} status={entry.status} />
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </div>
                          <div className="mt-2 grid gap-2 text-[11px] sm:grid-cols-4">
                            <HistoryFact
                              icon={<MapPinned className="h-3 w-3" />}
                              label="Area"
                              value={`${formatNumber(entry.area_hectares, 2)} ha`}
                            />
                            <HistoryFact
                              icon={<Sprout className="h-3 w-3" />}
                              label="Yield"
                              value={
                                entry.yield_value != null
                                  ? `${formatNumber(entry.yield_value, 2)} ${entry.yield_unit ?? ""}`
                                  : "—"
                              }
                            />
                            <HistoryFact
                              icon={<CircleDollarSign className="h-3 w-3" />}
                              label="Profit"
                              value={
                                entry.net_profit != null
                                  ? formatCurrency(entry.net_profit)
                                  : "—"
                              }
                            />
                            <HistoryFact
                              icon={<Calendar className="h-3 w-3" />}
                              label="ROI"
                              value={
                                entry.roi_percent != null
                                  ? `${formatNumber(entry.roi_percent, 1)}%`
                                  : "—"
                              }
                            />
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
        {!loading && history.length > 0 && (
          <p className="mt-3 text-[11px] text-muted-foreground">
            Showing {history.length} plantation{history.length === 1 ? "" : "s"} ·{" "}
            <span className="inline-flex items-center gap-1">
              <Loader2 className="h-3 w-3 opacity-0" />
              Tap any cycle to view its full record.
            </span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status, tone }: { status: string; tone: "default" | "ok" | "warn" | "muted" }) {
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
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        styles,
      ].join(" ")}
    >
      {titleCase(status || "active")}
    </span>
  );
}

function HistoryFact({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-1">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="ml-auto text-[11px] font-semibold text-foreground">
        {value}
      </span>
    </div>
  );
}
