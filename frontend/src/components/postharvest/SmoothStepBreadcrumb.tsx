import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface StepEntry {
  key: string;
  label: string;
  index: number;
}

export interface SmoothStepBreadcrumbProps {
  steps: StepEntry[];
  currentKey: string;
  className?: string;
}

export function SmoothStepBreadcrumb({
  steps,
  currentKey,
  className,
}: SmoothStepBreadcrumbProps) {
  const currentIndex = Math.max(
    0,
    steps.findIndex((s) => s.key === currentKey),
  );
  const currentStep = steps[currentIndex] ?? steps[0];
  const progress =
    steps.length > 1 ? (currentIndex / (steps.length - 1)) * 100 : 100;

  return (
    <nav
      className={cn(
        "w-full max-w-3xl rounded-2xl border border-border/70 bg-card/90 p-2.5 shadow-sm backdrop-blur",
        className,
      )}
      aria-label="Post-harvest progress"
    >
      <div className="mb-2 flex items-center justify-between gap-3 sm:hidden">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Step {currentStep?.index ?? currentIndex + 1} of {steps.length}
          </p>
          <p className="truncate text-sm font-bold text-foreground">
            {currentStep?.label ?? "Progress"}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
          {Math.round(progress)}%
        </span>
      </div>

      <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full bg-emerald-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ type: "spring", stiffness: 140, damping: 24 }}
        />
      </div>

      <motion.ol
        className="no-scrollbar -mx-1 flex snap-x items-center gap-1 overflow-x-auto px-1 pb-0.5 text-[11px] sm:justify-between sm:overflow-visible"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
        }}
      >
        {steps.map((step, index) => {
          const isCurrent = step.key === currentKey;
          const isComplete = index < currentIndex;

          return (
            <motion.li
              key={step.key}
              className="flex shrink-0 snap-start items-center gap-1 sm:flex-1 sm:shrink"
              variants={{
                hidden: { opacity: 0, y: 4 },
                visible: { opacity: 1, y: 0 },
              }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
            >
              <motion.span
                layout
                layoutId={isCurrent ? "postharvest-active-pill" : undefined}
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
                className={cn(
                  "inline-flex min-h-8 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                  isCurrent
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700 shadow-sm"
                    : isComplete
                      ? "border-emerald-200 bg-emerald-50/50 text-emerald-700"
                      : "border-border bg-background text-muted-foreground",
                )}
              >
                <motion.span
                  layout
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                    isCurrent
                      ? "bg-emerald-600 text-white"
                      : isComplete
                        ? "bg-emerald-500 text-white"
                        : "bg-muted text-muted-foreground",
                  )}
                  animate={isCurrent ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                  transition={
                    isCurrent
                      ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
                      : { duration: 0.2 }
                  }
                >
                  {isComplete ? "✓" : step.index}
                </motion.span>
                <span className={cn("truncate", !isCurrent && "max-sm:hidden")}>
                  {step.label}
                </span>
              </motion.span>
              {index < steps.length - 1 && (
                <motion.span
                  aria-hidden
                  className="hidden flex-1 text-center text-muted-foreground sm:block"
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + index * 0.05, duration: 0.25 }}
                >
                  ›
                </motion.span>
              )}
            </motion.li>
          );
        })}
      </motion.ol>
    </nav>
  );
}

export const POSTHARVEST_FLOW_STEPS: StepEntry[] = [
  { key: "summary", label: "Summary", index: 1 },
  { key: "yield", label: "Yield", index: 2 },
  { key: "profit", label: "Profit", index: 3 },
  { key: "rotation", label: "Rotation", index: 4 },
  { key: "archive", label: "Archive", index: 5 },
];
