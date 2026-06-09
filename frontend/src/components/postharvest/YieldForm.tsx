import { useEffect, useState } from "react";
import { Loader2, Save, Sprout, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import type { HarvestRecord } from "@/types/planting";

const YIELD_UNITS = [
  { value: "kg", label: "kg" },
  { value: "tons", label: "tons" },
  { value: "sacks", label: "sacks" },
  { value: "crates", label: "crates" },
  { value: "pieces", label: "pieces" },
];

function toDateInputValue(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export interface YieldFormProps {
  plantationId: string;
  initial?: HarvestRecord | null;
  defaultHarvestDate?: string | null;
  onSaved?: (record: HarvestRecord) => void;
}

export function YieldForm({
  plantationId,
  initial,
  defaultHarvestDate,
  onSaved,
}: YieldFormProps) {
  const { toast } = useToast();
  const [harvestDate, setHarvestDate] = useState<string>(
    (initial?.actual_harvest_date as string)?.slice(0, 10) ??
      (defaultHarvestDate?.slice(0, 10) ?? toDateInputValue(new Date())),
  );
  const [yieldValue, setYieldValue] = useState<string>(
    initial ? String(initial.actual_yield ?? "") : "",
  );
  const [unit, setUnit] = useState<string>(initial?.yield_unit ?? "kg");
  const [notes, setNotes] = useState<string>(initial?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initial) {
      setHarvestDate(String(initial.actual_harvest_date ?? harvestDate).slice(0, 10));
      setYieldValue(String(initial.actual_yield ?? ""));
      setUnit(initial.yield_unit ?? "kg");
      setNotes(initial.notes ?? "");
    }
  }, [initial]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const numericYield = Number(yieldValue);
    if (!Number.isFinite(numericYield) || numericYield < 0) {
      setError("Yield must be a non-negative number.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(harvestDate)) {
      setError("Please pick a valid harvest date.");
      return;
    }
    setSaving(true);
    try {
      const res = await api.recordHarvest(plantationId, {
        actualHarvestDate: harvestDate,
        actualYield: numericYield,
        yieldUnit: unit,
        notes: notes.trim() ? notes.trim() : null,
      });
      toast({
        title: initial ? "Yield updated" : "Harvest recorded",
        description: `${numericYield} ${unit} on ${harvestDate}.`,
      });
      onSaved?.(res.record);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save yield");
    } finally {
      setSaving(false);
    }
  };

  const handleClear = () => {
    setYieldValue("");
    setNotes("");
    setUnit("kg");
    setHarvestDate(defaultHarvestDate?.slice(0, 10) ?? toDateInputValue(new Date()));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sprout className="h-5 w-5 text-emerald-600" />
          {initial ? "Update yield" : "Record yield"}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Enter the actual harvest result. This locks remaining calendar
          activities and marks the plantation as harvested.
        </p>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="harvest-date">Harvest date</Label>
              <Input
                id="harvest-date"
                type="date"
                value={harvestDate}
                onChange={(e) => setHarvestDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="harvest-yield">Actual yield</Label>
              <Input
                id="harvest-yield"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                placeholder="e.g. 4.8"
                value={yieldValue}
                onChange={(e) => setYieldValue(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="harvest-unit">Yield unit</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger id="harvest-unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YIELD_UNITS.map((u) => (
                    <SelectItem key={u.value} value={u.value}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="harvest-notes">Notes (optional)</Label>
            <Textarea
              id="harvest-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Storage plan, quality observations, weather, etc."
            />
          </div>
          {error && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">
              {error}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" disabled={saving} className="gradient-primary text-white">
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {initial ? "Update yield" : "Save harvest"}
            </Button>
            {initial && (
              <Button
                type="button"
                variant="outline"
                onClick={handleClear}
                disabled={saving}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Clear
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
