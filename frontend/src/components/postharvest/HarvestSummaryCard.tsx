import { CalendarDays, CheckCircle2, MapPinned, Sprout, TimerReset, XCircle, History } from "lucide-react";
import type { HarvestSummary } from "@/types/planting";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatArea } from "@/lib/geo";

function formatDate(date?: string | null): string {
  if (!date) return "—";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function titleCase(str: string): string {
  return str
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export interface HarvestSummaryCardProps {
  summary: HarvestSummary;
}

export function HarvestSummaryCard({ summary }: HarvestSummaryCardProps) {
  const areaHectares = Number(summary.area_hectares ?? 0);
  const completed = summary.activities.completed;
  const total = summary.activities.total;
  const missed = summary.activities.missed;
  const rescheduled = summary.activities.rescheduled;
  const duration = summary.growing_duration_days;
  const actualDate = summary.actual_harvest_date;
  const expectedDate = summary.expected_harvest_date;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-br from-emerald-50 via-white to-amber-50">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sprout className="h-5 w-5 text-emerald-600" />
              Harvest Summary
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              {summary.farm_name || "Farm"} — planted on{" "}
              {formatDate(summary.planting_date)}
            </p>
          </div>
          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
            {titleCase(summary.status || "active")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryField
            icon={<Sprout className="h-4 w-4 text-emerald-600" />}
            label="Crop"
            value={titleCase(summary.crop_name)}
          />
          <SummaryField
            icon={<MapPinned className="h-4 w-4 text-amber-600" />}
            label="Farm area"
            value={`${areaHectares.toFixed(2)} ha · ${formatArea(Math.round(areaHectares * 10_000))}`}
          />
          <SummaryField
            icon={<CalendarDays className="h-4 w-4 text-sky-600" />}
            label="Planting date"
            value={formatDate(summary.planting_date)}
          />
          <SummaryField
            icon={<CalendarDays className="h-4 w-4 text-rose-600" />}
            label="Harvest date"
            value={actualDate ? formatDate(actualDate) : `Expected ${formatDate(expectedDate)}`}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryField
            icon={<TimerReset className="h-4 w-4 text-indigo-600" />}
            label="Growing duration"
            value={duration != null ? `${duration} days` : "—"}
          />
          <SummaryField
            icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
            label="Completed activities"
            value={`${completed} / ${total || 0}`}
            tone="ok"
          />
          <SummaryField
            icon={<XCircle className="h-4 w-4 text-rose-600" />}
            label="Missed activities"
            value={`${missed}`}
            tone={missed > 0 ? "danger" : "default"}
          />
          <SummaryField
            icon={<History className="h-4 w-4 text-sky-600" />}
            label="Rescheduled activities"
            value={`${rescheduled}`}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryField({
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
        "flex items-start gap-3 rounded-2xl border p-3",
        toneClass,
      ].join(" ")}
    >
      <div className="rounded-lg bg-white p-2 shadow-sm">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="text-sm font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}
