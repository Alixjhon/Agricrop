import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Info,
  Leaf,
  Loader2,
  Pencil,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { formatArea, parsePolygonGeoJson } from "@/lib/geo";
import type { CalendarEvent, Plantation } from "@/types/planting";
import FarmBoundaryMap from "./FarmBoundaryMap";

interface PlantationDashboardProps {
  plantation: Plantation;
  onChange?: (plantation: Plantation) => void;
}

type EventState =
  | "upcoming"
  | "due_today"
  | "overdue"
  | "completed"
  | "skipped"
  | "rescheduled";

function formatDate(date?: string | null) {
  if (!date) return "Not set";
  return new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function toLocalDateString(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCurrentStage(plantation: Plantation) {
  const events = plantation.calendarEvents ?? [];
  const now = new Date();
  const previous = [...events]
    .reverse()
    .find((event) => {
      const effective = event.adjusted_date || event.scheduled_date;
      if (!effective) return false;
      const d = new Date(effective);
      return d <= now;
    });
  return previous?.event_type ?? "Planting";
}

function eventEffectiveDate(event: CalendarEvent): string | null {
  // For a rescheduled event, prefer the new date so the UI reflects when the
  // activity is supposed to be performed going forward.
  if (event.rescheduled_to) {
    return String(event.rescheduled_to).slice(0, 10);
  }
  const date = event.adjusted_date || event.scheduled_date || null;
  if (!date) return null;
  return String(date).slice(0, 10);
}

function normalizeStatus(event: CalendarEvent): string {
  return String(event.status ?? "").toLowerCase();
}

function isCompletedStatus(status: string): boolean {
  return status === "done" || status === "completed";
}

function isSkippedStatus(status: string): boolean {
  return status === "skipped";
}

function isRescheduledStatus(status: string): boolean {
  return status === "rescheduled";
}

function classifyEvent(
  event: CalendarEvent,
  todayString: string,
): EventState {
  const status = normalizeStatus(event);
  if (isCompletedStatus(status)) return "completed";
  if (isSkippedStatus(status)) return "skipped";
  if (isRescheduledStatus(status)) {
    const effective = eventEffectiveDate(event);
    if (effective && effective < todayString) return "overdue";
    if (effective && effective === todayString) return "due_today";
    return "upcoming";
  }
  const effective = eventEffectiveDate(event);
  if (!effective) return "upcoming";
  if (effective < todayString) return "overdue";
  if (effective === todayString) return "due_today";
  return "upcoming";
}

function stateColorClasses(state: EventState): string {
  switch (state) {
    case "completed":
      return "border-emerald-200 bg-emerald-50/60";
    case "due_today":
      return "border-amber-300 bg-amber-50";
    case "overdue":
      return "border-rose-300 bg-rose-50";
    case "skipped":
      return "border-slate-300 bg-slate-50";
    case "rescheduled":
      return "border-sky-300 bg-sky-50";
    default:
      return "border-border bg-card";
  }
}

function stateBadgeClasses(state: EventState): string {
  switch (state) {
    case "completed":
      return "bg-emerald-100 text-emerald-700";
    case "due_today":
      return "bg-amber-100 text-amber-800";
    case "overdue":
      return "bg-rose-100 text-rose-700";
    case "skipped":
      return "bg-slate-200 text-slate-700";
    case "rescheduled":
      return "bg-sky-100 text-sky-700";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function stateLabel(state: EventState): string {
  switch (state) {
    case "completed":
      return "Completed";
    case "due_today":
      return "Due today";
    case "overdue":
      return "Overdue";
    case "skipped":
      return "Skipped";
    case "rescheduled":
      return "Rescheduled";
    default:
      return "Upcoming";
  }
}

function stateHelper(state: EventState, effective: string | null): string {
  switch (state) {
    case "completed":
      return "Completed";
    case "due_today":
      return "Scheduled for today — tap to mark as done.";
    case "overdue":
      return effective
        ? `Was due ${formatDate(effective)} — Complete now, Skip, or Reschedule.`
        : "Overdue — Complete now, Skip, or Reschedule.";
    case "skipped":
      return "Marked as skipped. Will not count toward progress.";
    case "rescheduled":
      return effective
        ? `Moved to ${formatDate(effective)} — will reopen on that day.`
        : "Moved to a new date.";
    default:
      return effective ? `Opens on ${formatDate(effective)}` : "Upcoming";
  }
}

function aiRecommendationForOverdue(event: CalendarEvent): string {
  const type = (event.event_type || "").toLowerCase();
  if (type.includes("harvest")) {
    return "Harvest overdue. Risk: reduced crop quality and market value. Plan harvest labor and post-harvest handling as soon as possible.";
  }
  if (type.includes("fertilizer")) {
    return "Fertilizer application overdue. Recommendation: apply within the next 3 days to avoid growth reduction.";
  }
  if (type.includes("pest")) {
    return "Pest monitoring overdue. Recommendation: scout field edges within 48 hours to prevent infestations from spreading.";
  }
  if (type.includes("disease")) {
    return "Disease monitoring overdue. Recommendation: inspect leaves and stems in the next 2 days to catch early symptoms.";
  }
  if (type.includes("irrigation")) {
    return "Irrigation overdue. Recommendation: check soil moisture today and resume the irrigation schedule.";
  }
  return "Activity overdue. Recommendation: complete as soon as possible to keep the plantation on track.";
}

function cn(...inputs: Array<string | false | null | undefined>): string {
  return inputs.filter(Boolean).join(" ");
}

export default function PlantationDashboard({
  plantation,
  onChange,
}: PlantationDashboardProps) {
  const { toast } = useToast();
  const [busyEventId, setBusyEventId] = useState<string | null>(null);
  const [localPlantation, setLocalPlantation] = useState<Plantation>(plantation);

  // Reschedule dialog state
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleEvent, setRescheduleEvent] = useState<CalendarEvent | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>("");
  const [rescheduleReason, setRescheduleReason] = useState<string>("");

  // Cost customization dialog state
  const [costDialogOpen, setCostDialogOpen] = useState(false);
  const [costRates, setCostRates] = useState({
    seedCostPerHa: 0,
    fertilizerCostPerHa: 0,
    laborCostPerHa: 0,
    irrigationCostPerHa: 0,
  });
  const [costSaving, setCostSaving] = useState(false);
  const [costInfoOpen, setCostInfoOpen] = useState(false);
  const [costUpdatedAt, setCostUpdatedAt] = useState<string | null>(null);
  const [costDefaults, setCostDefaults] = useState({
    seedCostPerHa: 0,
    fertilizerCostPerHa: 0,
    laborCostPerHa: 0,
    irrigationCostPerHa: 0,
  });
  // "costDialogMode" controls what the dialog does on save:
  //   - "customize": replaces the per-hectare base rates (default for the
  //     "Customize prices" button on the cost summary card)
  //   - "add": records costs against the most recently completed activity,
  //     adding them to the existing totals (default after "Mark as done")
  const [costDialogMode, setCostDialogMode] = useState<"customize" | "add">("customize");
  const [costDialogEvent, setCostDialogEvent] = useState<CalendarEvent | null>(null);
  const [costAddSaving, setCostAddSaving] = useState(false);

  const merged: Plantation = useMemo(
    () => ({ ...localPlantation, ...plantation }),
    [localPlantation, plantation],
  );

  const farm = merged.farm;
  const polygon = parsePolygonGeoJson(farm.polygon_geojson);
  const center = { lat: Number(farm.latitude), lng: Number(farm.longitude) };
  const todayString = toLocalDateString(new Date());

  const farmAreaHa = Number(farm.area_hectares ?? 0);
  const totalCost = Number(merged.costs?.total_cost ?? 0);
  const seedCost = Number(merged.costs?.seed_cost ?? 0);
  const fertilizerCost = Number(merged.costs?.fertilizer_cost ?? 0);
  const laborCost = Number(merged.costs?.labor_cost ?? 0);
  const irrigationCost = Number(merged.costs?.irrigation_cost ?? 0);
  const costSourceLabel = costUpdatedAt
    ? "Custom prices"
    : "Default estimate";
  const perHaRates = useMemo(() => {
    if (farmAreaHa > 0) {
      return {
        seedCostPerHa: Math.round(seedCost / farmAreaHa),
        fertilizerCostPerHa: Math.round(fertilizerCost / farmAreaHa),
        laborCostPerHa: Math.round(laborCost / farmAreaHa),
        irrigationCostPerHa: Math.round(irrigationCost / farmAreaHa),
      };
    }
    return costDefaults;
  }, [farmAreaHa, seedCost, fertilizerCost, laborCost, irrigationCost, costDefaults]);

  // Load default cost profile for this crop so the user knows what we're
  // starting from, and so we can offer a "Reset to defaults" action.
  useEffect(() => {
    if (!merged.crop_name) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.getCostProfile(merged.crop_name);
        if (cancelled) return;
        setCostDefaults(res.profile);
      } catch {
        // ignore — fall back to whatever is already shown
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [merged.crop_name]);

  // Seed the dialog with the current per-hectare values whenever it opens.
  useEffect(() => {
    if (costDialogOpen) {
      setCostRates(perHaRates);
    }
  }, [costDialogOpen, perHaRates]);

  const openCostDialog = () => {
    setCostRates(perHaRates);
    setCostDialogMode("customize");
    setCostDialogEvent(null);
    setCostDialogOpen(true);
  };

  // Open the dialog in "add" mode so the user can record the actual
  // money they spent on a specific activity. The entered values are
  // added to the existing cost totals when saved.
  const openAddCostDialog = (event: CalendarEvent) => {
    setCostRates({
      seedCostPerHa: costDefaults.seedCostPerHa,
      fertilizerCostPerHa: costDefaults.fertilizerCostPerHa,
      laborCostPerHa: costDefaults.laborCostPerHa,
      irrigationCostPerHa: costDefaults.irrigationCostPerHa,
    });
    setCostDialogMode("add");
    setCostDialogEvent(event);
    setCostDialogOpen(true);
  };

  const resetCostRatesToDefaults = () => {
    setCostRates(costDefaults);
  };

  const computedFromRates = useMemo(() => {
    const seed = Math.max(0, Math.round(costRates.seedCostPerHa * farmAreaHa));
    const fertilizer = Math.max(0, Math.round(costRates.fertilizerCostPerHa * farmAreaHa));
    const labor = Math.max(0, Math.round(costRates.laborCostPerHa * farmAreaHa));
    const irrigation = Math.max(0, Math.round(costRates.irrigationCostPerHa * farmAreaHa));
    return {
      seed,
      fertilizer,
      labor,
      irrigation,
      total: seed + fertilizer + labor + irrigation,
    };
  }, [costRates, farmAreaHa]);

  const handleSaveCostRates = async () => {
    if (costSaving) return;
    if (!merged.id) return;
    if (
      [costRates.seedCostPerHa, costRates.fertilizerCostPerHa, costRates.laborCostPerHa, costRates.irrigationCostPerHa]
        .some((v) => !Number.isFinite(v) || v < 0)
    ) {
      toast({
        title: "Invalid prices",
        description: "All cost rates must be non-negative numbers.",
        variant: "destructive",
      });
      return;
    }
    setCostSaving(true);
    try {
      const res = await api.updateCostRates(String(merged.id), costRates);
      const nextCosts = res.costs as unknown as Plantation["costs"];
      if (nextCosts) {
        setLocalPlantation({ ...merged, costs: nextCosts });
        onChange?.({ ...merged, costs: nextCosts });
        setCostUpdatedAt(new Date().toISOString());
      }
      toast({
        title: "Cost summary updated",
        description: `Recalculated using your custom per-hectare rates over ${farmAreaHa.toFixed(3)} ha.`,
      });
      setCostDialogOpen(false);
    } catch (error) {
      toast({
        title: "Could not update cost rates",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setCostSaving(false);
    }
  };

  const events = merged.calendarEvents ?? [];

  const stateById = useMemo(() => {
    const map = new Map<string, EventState>();
    for (const event of events) {
      map.set(String(event.id), classifyEvent(event, todayString));
    }
    return map;
  }, [events, todayString]);

  const overdueCount = useMemo(
    () =>
      events.filter((event) => stateById.get(String(event.id)) === "overdue")
        .length,
    [events, stateById],
  );

  const completedCount = useMemo(
    () =>
      events.filter(
        (event) => stateById.get(String(event.id)) === "completed",
      ).length,
    [events, stateById],
  );

  const totalEvents = events.length || 1;
  const computedProgress = Math.round((completedCount / totalEvents) * 100);
  const progressPercent = Math.max(
    computedProgress,
    Math.round(Number(merged.progress_percent ?? 0)),
  );

  const nextActivity =
    merged.next_activity ??
    events.find((event) => stateById.get(String(event.id)) === "due_today") ??
    events.find((event) => stateById.get(String(event.id)) === "overdue") ??
    events.find((event) => stateById.get(String(event.id)) === "upcoming") ??
    null;

  const weatherAlerts = events.filter((event) => event.adjustment_reason);

  const applyEventUpdate = (
    event: CalendarEvent,
    updatedEvent: Partial<CalendarEvent> | null | undefined,
    fallbackStatus: string,
  ): CalendarEvent => {
    const base: CalendarEvent = { ...event, status: fallbackStatus };
    if (updatedEvent) {
      return { ...base, ...updatedEvent };
    }
    return base;
  };

  const updateEvents = (eventId: string, nextEvent: CalendarEvent) => {
    const nextEvents = events.map((existing) =>
      String(existing.id) === String(eventId) ? nextEvent : existing,
    );
    const nextPlantation: Plantation = {
      ...merged,
      calendarEvents: nextEvents,
      progress_percent: progressPercent,
    };
    setLocalPlantation(nextPlantation);
    onChange?.(nextPlantation);
  };

  // Safety net: after every calendar mutation, ask the server whether the
  // plantation is now eligible for `harvested`. If so, update the local
  // status pill immediately so the user sees the new state without having
  // to leave the page.
  const tryFinalizePlantation = async (eventId: string) => {
    try {
      const res = await api.finalizePlantationIfAllDone(String(merged.id));
      if (res.promoted) {
        const nextPlantation: Plantation = {
          ...merged,
          status: "harvested",
          progress_percent: 100,
        };
        setLocalPlantation(nextPlantation);
        onChange?.(nextPlantation);
        toast({
          title: "Plantation harvested",
          description: `All Smart Calendar tasks are done. Status updated to “harvested”.`,
        });
      }
    } catch {
      /* ignore — server already handles promotion; this is just UX */
    }
    void eventId;
  };

  const handleMarkDone = async (event: CalendarEvent) => {
    if (busyEventId) return;
    setBusyEventId(String(event.id));
    try {
      const response = await api.markCalendarEventDone(String(event.id));
      const updatedEvent = response.event as unknown as CalendarEvent;
      const next = applyEventUpdate(event, updatedEvent, "done");
      updateEvents(String(event.id), next);
      toast({
        title: "Activity marked as done",
        description: `${event.event_type} for ${formatDate(eventEffectiveDate(event))} is now complete.`,
      });
      // Show the cost entry dialog so the user can record what they spent.
      // The values entered here are ADDED to the existing cost totals.
      openAddCostDialog(next);
      void tryFinalizePlantation(String(event.id));
    } catch (error) {
      toast({
        title: "Could not mark activity as done",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setBusyEventId(null);
    }
  };

  // Submit the cost entry dialog in "add" mode: take the user's per-hectare
  // rates, multiply by farm area, and ADD the result to the plantation's
  // existing cost totals.
  const handleAddEventCosts = async () => {
    if (costAddSaving) return;
    if (!costDialogEvent) return;
    if (
      [costRates.seedCostPerHa, costRates.fertilizerCostPerHa, costRates.laborCostPerHa, costRates.irrigationCostPerHa]
        .some((v) => !Number.isFinite(v) || v < 0)
    ) {
      toast({
        title: "Invalid prices",
        description: "All cost rates must be non-negative numbers.",
        variant: "destructive",
      });
      return;
    }
    const seedCost = Math.max(0, Math.round(costRates.seedCostPerHa * farmAreaHa));
    const fertilizerCost = Math.max(0, Math.round(costRates.fertilizerCostPerHa * farmAreaHa));
    const laborCost = Math.max(0, Math.round(costRates.laborCostPerHa * farmAreaHa));
    const irrigationCost = Math.max(0, Math.round(costRates.irrigationCostPerHa * farmAreaHa));
    const eventTotal = seedCost + fertilizerCost + laborCost + irrigationCost;

    setCostAddSaving(true);
    try {
      const res = await api.addEventCosts(String(costDialogEvent.id), {
        seed_cost: seedCost,
        fertilizer_cost: fertilizerCost,
        labor_cost: laborCost,
        irrigation_cost: irrigationCost,
      });
      const nextCosts = res.costs as unknown as Plantation["costs"];
      if (nextCosts) {
        setLocalPlantation({ ...merged, costs: nextCosts });
        onChange?.({ ...merged, costs: nextCosts });
        setCostUpdatedAt(new Date().toISOString());
      }
      toast({
        title: "Costs added",
        description: `Added ₱${eventTotal.toLocaleString()} for ${costDialogEvent.event_type} to the cost summary.`,
      });
      setCostDialogOpen(false);
      setCostDialogEvent(null);
    } catch (error) {
      toast({
        title: "Could not add costs",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setCostAddSaving(false);
    }
  };

  const handleSkip = async (event: CalendarEvent) => {
    if (busyEventId) return;
    setBusyEventId(String(event.id));
    try {
      const response = await api.skipCalendarEvent(String(event.id));
      const updatedEvent = response.event as unknown as CalendarEvent;
      const next = applyEventUpdate(event, updatedEvent, "skipped");
      updateEvents(String(event.id), next);
      toast({
        title: "Activity skipped",
        description: `${event.event_type} has been marked as skipped.`,
      });
      void tryFinalizePlantation(String(event.id));
    } catch (error) {
      toast({
        title: "Could not skip activity",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setBusyEventId(null);
    }
  };

  const openReschedule = (event: CalendarEvent) => {
    setRescheduleEvent(event);
    setRescheduleDate(toLocalDateString(new Date()));
    setRescheduleReason("");
    setRescheduleOpen(true);
  };

  const handleReschedule = async () => {
    if (!rescheduleEvent) return;
    if (!rescheduleDate || !/^\d{4}-\d{2}-\d{2}$/.test(rescheduleDate)) {
      toast({
        title: "Invalid date",
        description: "Please choose a valid date for the rescheduled activity.",
        variant: "destructive",
      });
      return;
    }
    setBusyEventId(String(rescheduleEvent.id));
    try {
      const response = await api.rescheduleCalendarEvent(
        String(rescheduleEvent.id),
        {
          newDate: rescheduleDate,
          reason: rescheduleReason.trim() || null,
        },
      );
      const updatedEvent = response.event as unknown as CalendarEvent;
      const next = applyEventUpdate(rescheduleEvent, updatedEvent, "rescheduled");
      updateEvents(String(rescheduleEvent.id), next);
      toast({
        title: "Activity rescheduled",
        description: `${rescheduleEvent.event_type} moved to ${formatDate(rescheduleDate)}.`,
      });
      setRescheduleOpen(false);
      setRescheduleEvent(null);
      void tryFinalizePlantation(String(rescheduleEvent.id));
    } catch (error) {
      toast({
        title: "Could not reschedule activity",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setBusyEventId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl bg-card card-shadow">
        <FarmBoundaryMap center={center} polygon={polygon} className="h-[340px]" />
        <div className="grid gap-3 border-t border-border p-4 sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Crop</p>
            <p className="mt-1 font-semibold text-foreground">{merged.crop_name}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Area</p>
            <p className="mt-1 font-semibold text-foreground">
              {formatArea(Number(farm.area_sqm))}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Harvest</p>
            <p className="mt-1 font-semibold text-foreground">
              {formatDate(merged.expected_harvest_date)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <p className="mt-1 font-semibold capitalize text-foreground">
              {merged.status}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl bg-card p-4 card-shadow">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h3 className="font-bold text-card-foreground">Progress</h3>
          </div>
          <p className="mt-3 text-3xl font-bold text-foreground">
            {progressPercent}%
          </p>
          <Progress value={progressPercent} className="mt-3" />
          <p className="mt-3 text-sm text-muted-foreground">
            {completedCount} of {events.length} activities completed
          </p>
          {overdueCount > 0 ? (
            <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700">
              <AlertTriangle className="h-3.5 w-3.5" />
              {overdueCount} overdue {overdueCount === 1 ? "activity" : "activities"}
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              Current stage: {getCurrentStage(merged)}
            </p>
          )}
        </div>

        <div className="rounded-2xl bg-card p-4 card-shadow">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            <h3 className="font-bold text-card-foreground">Next Activity</h3>
          </div>
          <p className="mt-3 text-xl font-bold text-foreground">
            {nextActivity?.event_type ?? "No activity"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {nextActivity
              ? formatDate(eventEffectiveDate(nextActivity))
              : "All caught up"}
          </p>
          {nextActivity?.adjustment_reason && (
            <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
              {nextActivity.adjustment_reason}
            </p>
          )}
        </div>

        <div className="rounded-2xl bg-card p-4 card-shadow">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <CircleDollarSign className="h-5 w-5 text-primary" />
              <h3 className="font-bold text-card-foreground">Cost Summary</h3>
            </div>
            <button
              type="button"
              onClick={() => setCostInfoOpen((v) => !v)}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="How we calculated this"
              title="How we calculated this"
            >
              <Info className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-3 text-3xl font-bold text-foreground">
            ₱{totalCost.toLocaleString()}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <span>Seeds: ₱{seedCost.toLocaleString()}</span>
            <span>Fertilizer: ₱{fertilizerCost.toLocaleString()}</span>
            <span>Labor: ₱{laborCost.toLocaleString()}</span>
            <span>Irrigation: ₱{irrigationCost.toLocaleString()}</span>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {costSourceLabel}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={openCostDialog}
              className="h-7 px-2.5 text-xs"
              title="Edit the per-hectare prices used to compute this total"
            >
              <Pencil className="mr-1 h-3 w-3" />
              Customize prices
            </Button>
          </div>
          {costInfoOpen && (
            <div className="mt-3 rounded-lg border border-sky-200 bg-sky-50/70 p-3 text-[11px] text-sky-900">
              <p className="font-semibold">How this is calculated</p>
              <p className="mt-1 leading-relaxed">
                Total = (per-hectare cost) × farm area (
                {farmAreaHa.toFixed(3)} ha). Defaults come from our regional cost
                profile for {merged.crop_name}. Use{" "}
                <span className="font-semibold">Customize prices</span> to enter
                your own per-hectare rates — we'll recompute and save them
                immediately.
              </p>
              <p className="mt-2 leading-relaxed">
                <span className="font-semibold">Current rates:</span> Seed ₱
                {perHaRates.seedCostPerHa.toLocaleString()}/ha · Fertilizer ₱
                {perHaRates.fertilizerCostPerHa.toLocaleString()}/ha · Labor ₱
                {perHaRates.laborCostPerHa.toLocaleString()}/ha · Irrigation ₱
                {perHaRates.irrigationCostPerHa.toLocaleString()}/ha
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-card p-4 card-shadow">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Leaf className="h-5 w-5 text-primary" />
              <h3 className="font-bold text-card-foreground">Smart Calendar</h3>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className={cn("rounded-full px-2 py-0.5", stateBadgeClasses("completed"))}>
                Completed
              </span>
              <span className={cn("rounded-full px-2 py-0.5", stateBadgeClasses("due_today"))}>
                Due
              </span>
              <span className={cn("rounded-full px-2 py-0.5", stateBadgeClasses("overdue"))}>
                Overdue
              </span>
            </div>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            You can mark activities as done, skip, or reschedule anytime.
          </p>
          <div className="mt-4 space-y-3">
            {events.map((event) => {
              const state = stateById.get(String(event.id)) ?? "upcoming";
              const effective = eventEffectiveDate(event);
              const helper = stateHelper(state, effective);
              const isBusy = busyEventId === String(event.id);

              return (
                <div
                  key={event.id}
                  className={cn(
                    "rounded-xl border p-3 transition-colors",
                    stateColorClasses(state),
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-foreground">
                          {event.event_type}
                        </p>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                            stateBadgeClasses(state),
                          )}
                        >
                          {stateLabel(state)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Scheduled: {formatDate(event.scheduled_date)}
                        {event.adjusted_date &&
                          event.adjusted_date !== event.scheduled_date && (
                            <span className="ml-2 text-amber-700">
                              • Weather-adjusted
                            </span>
                          )}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDate(effective)}
                    </span>
                  </div>

                  {state === "overdue" && (
                    <p className="mt-2 rounded-lg bg-rose-100/70 p-2 text-[11px] text-rose-800">
                      <span className="font-semibold">⚠ AI recommendation:</span>{" "}
                      {aiRecommendationForOverdue(event)}
                    </p>
                  )}

                  {event.rescheduled_to &&
                    event.rescheduled_to !== event.scheduled_date && (
                      <p className="mt-1 text-xs text-sky-700">
                        Rescheduled to {formatDate(event.rescheduled_to)}
                        {event.reschedule_reason
                          ? ` — ${event.reschedule_reason}`
                          : ""}
                      </p>
                    )}

                  {event.adjustment_reason &&
                    event.adjusted_date &&
                    event.adjusted_date !== event.scheduled_date && (
                      <p className="mt-1 text-xs text-amber-700">
                        {event.adjustment_reason}
                      </p>
                    )}

                  {event.notes && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {event.notes}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] text-muted-foreground">
                      {helper}
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      {state === "completed" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Done
                          {event.completed_at && (
                            <span className="ml-1 text-emerald-600/80">
                              • {formatDate(event.completed_at)}
                            </span>
                          )}
                        </span>
                      )}
                      {state === "skipped" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700">
                          Skipped
                          {event.skipped_at && (
                            <span className="ml-1 text-slate-600/80">
                              • {formatDate(event.skipped_at)}
                            </span>
                          )}
                        </span>
                      )}
                      {(state === "due_today" || state === "overdue") && (
                        <Button
                          size="sm"
                          disabled={isBusy}
                          onClick={() => handleMarkDone(event)}
                          className={cn(
                            "h-8 px-3 text-xs text-white shadow-sm",
                            state === "overdue"
                              ? "bg-rose-600 hover:bg-rose-700"
                              : "gradient-primary",
                          )}
                        >
                          {isBusy ? (
                            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                          )}
                          {state === "overdue" ? "Complete now" : "Mark as done"}
                        </Button>
                      )}
                      {state === "overdue" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isBusy}
                            onClick={() => handleSkip(event)}
                            className="h-8 px-3 text-xs"
                          >
                            Skip
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isBusy}
                            onClick={() => openReschedule(event)}
                            className="h-8 px-3 text-xs"
                          >
                            Reschedule
                          </Button>
                        </>
                      )}
                      {state === "upcoming" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={isBusy}
                          onClick={() => openReschedule(event)}
                          className="h-8 px-3 text-xs text-muted-foreground"
                        >
                          Reschedule
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl bg-card p-4 card-shadow">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h3 className="font-bold text-card-foreground">Weather Alerts</h3>
          </div>
          {weatherAlerts.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              No weather adjustments recorded for this calendar.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {weatherAlerts.map((event) => (
                <div
                  key={event.id}
                  className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900"
                >
                  <p className="font-semibold">{event.event_type}</p>
                  <p className="mt-1 text-xs">{event.adjustment_reason}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule activity</DialogTitle>
            <DialogDescription>
              {rescheduleEvent
                ? `Pick a new date for ${rescheduleEvent.event_type}.`
                : "Pick a new date for this activity."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="reschedule-date">New date</Label>
              <Input
                id="reschedule-date"
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reschedule-reason">Reason (optional)</Label>
              <Textarea
                id="reschedule-reason"
                rows={3}
                placeholder="e.g. Heavy rain forecast"
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRescheduleOpen(false);
                setRescheduleEvent(null);
              }}
              disabled={busyEventId !== null}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReschedule}
              disabled={busyEventId !== null}
              className="gradient-primary text-white"
            >
              {busyEventId !== null ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : null}
              Save new date
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={costDialogOpen} onOpenChange={setCostDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {costDialogMode === "add"
                ? `Log costs for ${costDialogEvent?.event_type ?? "this activity"}`
                : "Customize per-hectare prices"}
            </DialogTitle>
            <DialogDescription>
              {costDialogMode === "add"
                ? `Enter the per-hectare prices you paid for ${merged.crop_name}. We will multiply them by your farm area of ${farmAreaHa.toFixed(3)} ha and add the result to your running cost totals.`
                : `Enter the prices that match your local market for ${merged.crop_name}. We will recalculate the cost summary immediately for your farm area of ${farmAreaHa.toFixed(3)} ha.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cost-seed">Seeds (₱/ha)</Label>
                <Input
                  id="cost-seed"
                  type="number"
                  min={0}
                  step={100}
                  value={Number.isFinite(costRates.seedCostPerHa) ? costRates.seedCostPerHa : 0}
                  onChange={(e) =>
                    setCostRates((prev) => ({
                      ...prev,
                      seedCostPerHa: Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cost-fertilizer">Fertilizer (₱/ha)</Label>
                <Input
                  id="cost-fertilizer"
                  type="number"
                  min={0}
                  step={100}
                  value={Number.isFinite(costRates.fertilizerCostPerHa) ? costRates.fertilizerCostPerHa : 0}
                  onChange={(e) =>
                    setCostRates((prev) => ({
                      ...prev,
                      fertilizerCostPerHa: Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cost-labor">Labor (₱/ha)</Label>
                <Input
                  id="cost-labor"
                  type="number"
                  min={0}
                  step={100}
                  value={Number.isFinite(costRates.laborCostPerHa) ? costRates.laborCostPerHa : 0}
                  onChange={(e) =>
                    setCostRates((prev) => ({
                      ...prev,
                      laborCostPerHa: Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cost-irrigation">Irrigation (₱/ha)</Label>
                <Input
                  id="cost-irrigation"
                  type="number"
                  min={0}
                  step={100}
                  value={Number.isFinite(costRates.irrigationCostPerHa) ? costRates.irrigationCostPerHa : 0}
                  onChange={(e) =>
                    setCostRates((prev) => ({
                      ...prev,
                      irrigationCostPerHa: Number(e.target.value),
                    }))
                  }
                />
              </div>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-xs text-emerald-900">
              <p className="font-semibold">
                {costDialogMode === "add" ? "You will add" : "Live preview"} for {farmAreaHa.toFixed(3)} ha
              </p>
              <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5">
                <span>Seeds: ₱{computedFromRates.seed.toLocaleString()}</span>
                <span>Fertilizer: ₱{computedFromRates.fertilizer.toLocaleString()}</span>
                <span>Labor: ₱{computedFromRates.labor.toLocaleString()}</span>
                <span>Irrigation: ₱{computedFromRates.irrigation.toLocaleString()}</span>
              </div>
              {costDialogMode === "add" ? (
                <p className="mt-1 border-t border-emerald-200 pt-1 text-sm font-bold">
                  New entry: ₱{computedFromRates.total.toLocaleString()} • Combined total: ₱{(totalCost + computedFromRates.total).toLocaleString()}
                </p>
              ) : (
                <p className="mt-1 border-t border-emerald-200 pt-1 text-sm font-bold">
                  New total: ₱{computedFromRates.total.toLocaleString()}
                </p>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            {costDialogMode === "customize" && (
              <Button
                variant="ghost"
                onClick={resetCostRatesToDefaults}
                disabled={costSaving || costAddSaving}
                className="mr-auto"
              >
                Reset to defaults
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => {
                setCostDialogOpen(false);
                setCostDialogEvent(null);
              }}
              disabled={costSaving || costAddSaving}
            >
              Cancel
            </Button>
            {costDialogMode === "add" ? (
              <Button
                onClick={handleAddEventCosts}
                disabled={costAddSaving}
                className="gradient-primary text-white"
              >
                {costAddSaving ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : null}
                Save & add to costs
              </Button>
            ) : (
              <Button
                onClick={handleSaveCostRates}
                disabled={costSaving}
                className="gradient-primary text-white"
              >
                {costSaving ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : null}
                Save & recalculate
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
