/**
 * Lightweight session-storage helper used to pass post-harvest step data
 * between the per-step pages. We deliberately do NOT put this in the URL
 * so the farmer's intermediate values (entered yield, entered price) are
 * not exposed in browser history, and we can refresh mid-flow without
 * losing context.
 */
import type { HarvestRecord, ProfitRecord } from "@/types/planting";

const KEY_PREFIX = "cropwise.postharvest.";

export interface PostharvestDraft {
  harvestDate: string;
  yieldValue: string;
  yieldUnit: string;
  notes: string;
  sellingPrice: string;
  profitUnit: string;
}

function draftKey(plantationId: string): string {
  return `${KEY_PREFIX}${plantationId}.draft`;
}

export function loadDraft(plantationId: string): PostharvestDraft | null {
  try {
    const raw = sessionStorage.getItem(draftKey(plantationId));
    if (!raw) return null;
    return JSON.parse(raw) as PostharvestDraft;
  } catch {
    return null;
  }
}

export function saveDraft(plantationId: string, draft: Partial<PostharvestDraft>): void {
  try {
    const existing = loadDraft(plantationId) ?? {
      harvestDate: "",
      yieldValue: "",
      yieldUnit: "kg",
      notes: "",
      sellingPrice: "",
      profitUnit: "kg",
    };
    const next = { ...existing, ...draft };
    sessionStorage.setItem(draftKey(plantationId), JSON.stringify(next));
  } catch {
    /* ignore quota / privacy errors */
  }
}

export function clearDraft(plantationId: string): void {
  try {
    sessionStorage.removeItem(draftKey(plantationId));
  } catch {
    /* ignore */
  }
}

export function harvestRecordFromDraft(
  draft: PostharvestDraft,
  record: HarvestRecord,
): HarvestRecord {
  return {
    ...record,
    actual_harvest_date: draft.harvestDate || String(record.actual_harvest_date).slice(0, 10),
    actual_yield: draft.yieldValue ? Number(draft.yieldValue) : record.actual_yield,
    yield_unit: draft.yieldUnit || record.yield_unit,
    notes: draft.notes || record.notes,
  };
}

export function profitRecordFromDraft(
  draft: PostharvestDraft,
  record: ProfitRecord,
): ProfitRecord {
  return {
    ...record,
    selling_price_per_unit: draft.sellingPrice ? Number(draft.sellingPrice) : record.selling_price_per_unit,
    yield_unit: draft.profitUnit || record.yield_unit,
  };
}
