import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Loader2, Tractor } from "lucide-react";
import { cn } from "@/lib/utils";
import { SmoothStepBreadcrumb } from "@/components/postharvest/SmoothStepBreadcrumb";

export interface StepDef {
  /** Route segment under the plantation scope, e.g. "summary", "yield". */
  key: string;
  label: string;
  /** Path appended to the plantation scope, e.g. "postharvest/summary". */
  path: string;
}

export interface StepLayoutProps {
  plantationId: string;
  title: string;
  subtitle?: string;
  steps: StepDef[];
  currentKey: string;
  loading?: boolean;
  statusPill?: { label: string; tone?: "ok" | "muted" | "warn" } | null;
  banner?: ReactNode;
  children: ReactNode;
}

const TONE_CLASSES: Record<"ok" | "muted" | "warn", string> = {
  ok: "border-emerald-200 bg-emerald-50 text-emerald-700",
  muted: "border-sky-200 bg-sky-50 text-sky-700",
  warn: "border-amber-200 bg-amber-50 text-amber-800",
};

export function StepLayout({
  plantationId,
  title,
  subtitle,
  steps,
  currentKey,
  loading,
  statusPill,
  banner,
  children,
}: StepLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50/30 to-slate-100 pb-20 sm:pb-24">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-card/95 px-3 py-2.5 backdrop-blur-md sm:px-4 sm:py-3">
        <button
          onClick={() => navigate(-1)}
          className="shrink-0 rounded-lg p-2 text-foreground hover:bg-muted"
          title="Go back"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 sm:flex">
          <Tractor className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="truncate text-base font-bold text-foreground sm:text-lg">
            {title}
          </h1>
          {subtitle && (
            <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {statusPill && (
          <span
            className={cn(
              "hidden items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold sm:inline-flex",
              TONE_CLASSES[statusPill.tone ?? "muted"],
            )}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {statusPill.label}
          </span>
        )}
      </header>

      <div className="mx-auto w-full max-w-3xl px-3 py-3 sm:px-6">
        <SmoothStepBreadcrumb
          steps={steps.map((step, index) => ({
            key: step.key,
            label: step.label,
            index: index + 1,
          }))}
          currentKey={currentKey}
        />
      </div>

      <div className="mx-auto w-full max-w-3xl space-y-4 px-3 py-3 sm:px-6 sm:py-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="mr-2 h-6 w-6 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Loading…</span>
          </div>
        ) : (
          <>
            {banner}
            {children}
          </>
        )}
      </div>
    </div>
  );
}

export const POSTHARVEST_STEPS: StepDef[] = [
  { key: "summary", label: "Summary", path: "postharvest/summary" },
  { key: "yield", label: "Yield", path: "postharvest/yield" },
  { key: "profit", label: "Profit", path: "postharvest/profit" },
  { key: "rotation", label: "Rotation", path: "postharvest/rotation" },
  { key: "archive", label: "Archive", path: "postharvest/archive" },
];
