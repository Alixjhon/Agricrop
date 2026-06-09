import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  CircleDollarSign,
  Loader2,
  Save,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import type { ProfitRecord } from "@/types/planting";

const YIELD_UNITS = [
  { value: "kg", label: "kg" },
  { value: "tons", label: "tons" },
  { value: "sacks", label: "sacks" },
  { value: "crates", label: "crates" },
  { value: "pieces", label: "pieces" },
];

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

export interface ProfitFormProps {
  plantationId: string;
  initial?: ProfitRecord | null;
  yieldValue: number | string | null | undefined;
  yieldUnit: string;
  totalExpenses: number | string | null | undefined;
  onSaved?: (record: ProfitRecord) => void;
}

export function ProfitForm({
  plantationId,
  initial,
  yieldValue,
  yieldUnit,
  totalExpenses,
  onSaved,
}: ProfitFormProps) {
  const { toast } = useToast();
  const [sellingPrice, setSellingPrice] = useState<string>(
    initial ? String(initial.selling_price_per_unit ?? "") : "",
  );
  const [unit, setUnit] = useState<string>(initial?.yield_unit ?? yieldUnit ?? "kg");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initial) {
      setSellingPrice(String(initial.selling_price_per_unit ?? ""));
      setUnit(initial.yield_unit ?? yieldUnit ?? "kg");
    }
  }, [initial, yieldUnit]);

  const numericPrice = Number(sellingPrice);
  const numericYield = Number(yieldValue ?? 0);
  const numericExpenses = Number(totalExpenses ?? 0);

  const preview = useMemo(() => {
    const revenue = Number.isFinite(numericPrice) ? numericPrice * numericYield : 0;
    const profit = revenue - numericExpenses;
    const roi = numericExpenses > 0 ? (profit / numericExpenses) * 100 : 0;
    return {
      revenue: Math.max(0, revenue),
      profit,
      roi,
    };
  }, [numericPrice, numericYield, numericExpenses]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      setError("Selling price must be a non-negative number.");
      return;
    }
    if (numericYield <= 0) {
      setError("Record a yield first before adding profit.");
      return;
    }
    setSaving(true);
    try {
      const res = await api.recordProfit(plantationId, {
        sellingPricePerUnit: numericPrice,
        yieldUnit: unit,
      });
      toast({
        title: initial ? "Profit updated" : "Profit recorded",
        description: `Net ${formatCurrency(res.record.net_profit)} (ROI ${formatNumber(res.record.roi_percent, 1)}%).`,
      });
      onSaved?.(res.record);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profit");
    } finally {
      setSaving(false);
    }
  };

  const missingYield = numericYield <= 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CircleDollarSign className="h-5 w-5 text-amber-600" />
          Profit & loss analysis
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Enter your selling price per unit. Revenue, profit, and ROI are
          computed automatically from your recorded yield and total expenses.
        </p>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="selling-price">Selling price per unit</Label>
              <Input
                id="selling-price"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                placeholder="e.g. 25"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="profit-unit">Unit</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger id="profit-unit">
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

          <div className="grid gap-3 sm:grid-cols-3">
            <Metric
              icon={<Wallet className="h-4 w-4 text-sky-600" />}
              label="Total revenue"
              value={formatCurrency(preview.revenue)}
              help={`${formatNumber(numericYield)} ${unit} × ${formatCurrency(numericPrice)}`}
            />
            <Metric
              icon={<TrendingUp className="h-4 w-4 text-amber-600" />}
              label="Total expenses"
              value={formatCurrency(numericExpenses)}
              help="From farm_costs"
            />
            <Metric
              icon={<ArrowUpRight className="h-4 w-4 text-emerald-600" />}
              label="Net profit"
              value={formatCurrency(preview.profit)}
              tone={preview.profit >= 0 ? "ok" : "danger"}
              help={
                numericExpenses > 0
                  ? `Revenue − expenses`
                  : "Add expenses to compute ROI"
              }
            />
          </div>

          <div className="rounded-2xl border border-border bg-gradient-to-br from-emerald-50/70 via-white to-amber-50/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Return on investment
                </p>
                <p className="text-3xl font-extrabold text-emerald-700">
                  {formatNumber(preview.roi, 1)}%
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  ROI = (Net profit ÷ Total expenses) × 100
                </p>
              </div>
              <Button
                type="submit"
                className="gradient-primary text-white"
                disabled={saving || missingYield}
              >
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {initial ? "Update profit" : "Save profit"}
              </Button>
            </div>
            {missingYield && (
              <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-700">
                Record the harvest yield first to enable profit analysis.
              </p>
            )}
            {error && (
              <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 p-2 text-[11px] text-rose-700">
                {error}
              </p>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function Metric({
  icon,
  label,
  value,
  help,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  help?: string;
  tone?: "default" | "ok" | "danger";
}) {
  const toneClass =
    tone === "danger"
      ? "border-rose-200 bg-rose-50/60"
      : tone === "ok"
        ? "border-emerald-200 bg-emerald-50/60"
        : "border-border bg-card";
  return (
    <div className={["rounded-2xl border p-3", toneClass].join(" ")}>
      <div className="flex items-center gap-2">
        <div className="rounded-md bg-white p-1.5 shadow-sm">{icon}</div>
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
      </div>
      <p className="mt-2 text-lg font-bold text-foreground">{value}</p>
      {help && <p className="text-[11px] text-muted-foreground">{help}</p>}
    </div>
  );
}
