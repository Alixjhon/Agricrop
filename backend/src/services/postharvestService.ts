import { z } from 'zod';
import db from '../models/db';
import { ensurePostHarvestSchema } from '../models/ensurePlantationSchema';

export const harvestInputSchema = z.object({
  actualHarvestDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  actualYield: z.number().min(0),
  yieldUnit: z.string().trim().min(1).max(20).default('kg'),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export const profitInputSchema = z.object({
  sellingPricePerUnit: z.number().min(0),
  yieldUnit: z.string().trim().min(1).max(20).default('kg'),
});

export const newPlantationInputSchema = z.object({
  cropName: z.string().trim().min(1).max(120),
  plantingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  recommendationId: z.union([z.string(), z.number()]).nullable().optional(),
});

export type HarvestInput = z.infer<typeof harvestInputSchema>;
export type ProfitInput = z.infer<typeof profitInputSchema>;
export type NewPlantationInput = z.infer<typeof newPlantationInputSchema>;

export class HarvestValidationError extends Error {
  status = 400;
  constructor(message: string) {
    super(message);
    this.name = 'HarvestValidationError';
  }
}

export class NotFoundError extends Error {
  status = 404;
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export interface HarvestRecord {
  id: number | string;
  plantation_id: number | string;
  actual_harvest_date: string;
  actual_yield: string | number;
  yield_unit: string;
  notes: string | null;
  created_at: string;
}

export interface ProfitRecord {
  id: number | string;
  plantation_id: number | string;
  selling_price_per_unit: string | number;
  yield_unit: string;
  total_revenue: string | number;
  total_expenses: string | number;
  net_profit: string | number;
  roi_percent: string | number;
  created_at: string;
}

export interface RotationRecommendation {
  id: number | string;
  previous_crop: string;
  recommended_crop: string;
  reason: string;
  priority: number;
}

export interface FarmHistoryEntry {
  plantation_id: number | string;
  crop_name: string;
  area_hectares: number | string;
  planting_date: string;
  expected_harvest_date: string;
  actual_harvest_date: string | null;
  status: string;
  yield_value: number | null;
  yield_unit: string | null;
  net_profit: number | null;
  roi_percent: number | null;
  total_revenue: number | null;
  total_expenses: number | null;
}

async function loadOwnedPlantation(userId: number, plantationId: string): Promise<{
  id: number | string;
  crop_name: string;
  status: string;
  farm_id: number | string;
  area_hectares: number | string;
  planting_date: string;
  expected_harvest_date: string;
  progress_percent: number | string;
}> {
  const result = await db.query(
    `SELECT p.id, p.crop_name, p.status, p.farm_id, f.area_hectares, p.planting_date, p.expected_harvest_date, p.progress_percent
     FROM plantations p JOIN farms f ON f.id = p.farm_id
     WHERE p.id = $1 AND f.userid = $2`,
    [plantationId, userId],
  );
  const row = result.rows[0];
  if (!row) throw new NotFoundError('Plantation not found');
  return row as any;
}

export async function recordHarvest(
  userId: number,
  plantationId: string,
  input: HarvestInput,
): Promise<HarvestRecord> {
  await ensurePostHarvestSchema();
  const plantation = await loadOwnedPlantation(userId, plantationId);

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const harvestResult = await client.query(
      `INSERT INTO harvest_records (plantation_id, actual_harvest_date, actual_yield, yield_unit, notes, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (plantation_id) DO UPDATE SET
         actual_harvest_date = EXCLUDED.actual_harvest_date,
         actual_yield = EXCLUDED.actual_yield,
         yield_unit = EXCLUDED.yield_unit,
         notes = EXCLUDED.notes
       RETURNING *`,
      [plantation.id, input.actualHarvestDate, input.actualYield, input.yieldUnit, input.notes ?? null],
    );

    // Lock all remaining calendar events for this plantation.
    await client.query(
      `UPDATE calendar_events
       SET status = CASE
             WHEN status = 'done' THEN 'done'
             WHEN status = 'rescheduled' THEN 'rescheduled'
             WHEN status = 'skipped' THEN 'skipped'
             ELSE 'skipped'
           END,
           locked = TRUE
       WHERE plantation_id = $1 AND status = 'scheduled' AND locked = FALSE`,
      [plantation.id],
    );

    // Mark the plantation as 'harvested'. The actual archive step is a
    // separate explicit user action (see archivePlantation) so they can
    // first record yield & profit details.
    await client.query(
      `UPDATE plantations
       SET status = 'harvested', progress_percent = 100
       WHERE id = $1
         AND lower(status) NOT IN ('archived', 'cancelled')`,
      [plantation.id],
    );

    await client.query('COMMIT');
    return harvestResult.rows[0] as unknown as HarvestRecord;
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch {}
    throw error;
  } finally {
    client.release();
  }
}

export interface HarvestSummary {
  plantation_id: number | string;
  crop_name: string;
  status: string;
  farm_id: number | string;
  farm_name: string;
  area_hectares: number | string;
  planting_date: string;
  expected_harvest_date: string;
  actual_harvest_date: string | null;
  growing_duration_days: number | null;
  activities: {
    total: number;
    completed: number;
    missed: number;
    rescheduled: number;
  };
  harvest: HarvestRecord | null;
  profit: ProfitRecord | null;
}

function daysBetween(start: string, end: string): number {
  const a = new Date(`${start}T00:00:00.000Z`).getTime();
  const b = new Date(`${end}T00:00:00.000Z`).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.max(0, Math.round((b - a) / (24 * 60 * 60 * 1000)));
}

export async function getHarvestSummary(
  userId: number,
  plantationId: string,
): Promise<HarvestSummary> {
  await ensurePostHarvestSchema();
  const plantation = await loadOwnedPlantation(userId, plantationId);

  const farmRow = await db.query(`SELECT farm_name FROM farms WHERE id = $1`, [plantation.farm_id]);
  const farmName = String((farmRow.rows[0] as any)?.farm_name ?? '');

  const eventsResult = await db.query(
    `SELECT id, event_type, scheduled_date, adjusted_date, status, rescheduled_to, locked
     FROM calendar_events WHERE plantation_id = $1`,
    [plantationId],
  );
  const events = eventsResult.rows as Array<Record<string, unknown>>;
  const total = events.length;
  let completed = 0;
  let missed = 0;
  let rescheduled = 0;
  for (const event of events) {
    const status = String(event.status ?? '').toLowerCase();
    if (status === 'done' || status === 'completed') {
      completed += 1;
      continue;
    }
    if (status === 'rescheduled') {
      rescheduled += 1;
      // Rescheduled events that are still in the future shouldn't be counted
      // as missed; ones whose effective date has already passed without being
      // completed are missed.
      const effective = String(event.rescheduled_to || event.adjusted_date || event.scheduled_date || '').slice(0, 10);
      const today = new Date().toISOString().slice(0, 10);
      if (effective && effective < today) missed += 1;
      continue;
    }
    if (status === 'skipped') continue;
    if (status === 'missed') {
      missed += 1;
      continue;
    }
    // scheduled: any past date without completion counts as missed
    const effective = String(event.adjusted_date || event.scheduled_date || '').slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);
    if (effective && effective < today) {
      missed += 1;
    }
  }

  const harvest = await getHarvestRecord(userId, plantationId);
  const profit = await getProfitRecord(userId, plantationId);

  const plantingDate = String(plantation.planting_date ?? '').slice(0, 10);
  const actualHarvestDate = harvest
    ? String(harvest.actual_harvest_date ?? '').slice(0, 10)
    : null;
  const growingDurationDays = actualHarvestDate
    ? daysBetween(plantingDate, actualHarvestDate)
    : null;

  return {
    plantation_id: plantation.id,
    crop_name: String(plantation.crop_name ?? ''),
    status: String(plantation.status ?? ''),
    farm_id: plantation.farm_id,
    farm_name: farmName,
    area_hectares: plantation.area_hectares,
    planting_date: plantingDate,
    expected_harvest_date: String(plantation.expected_harvest_date ?? '').slice(0, 10),
    actual_harvest_date: actualHarvestDate,
    growing_duration_days: growingDurationDays,
    activities: { total, completed, missed, rescheduled },
    harvest,
    profit,
  };
}

export async function getHarvestRecord(
  userId: number,
  plantationId: string,
): Promise<HarvestRecord | null> {
  await ensurePostHarvestSchema();
  await loadOwnedPlantation(userId, plantationId);
  const result = await db.query(
    `SELECT * FROM harvest_records WHERE plantation_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [plantationId],
  );
  return (result.rows[0] as unknown as HarvestRecord) ?? null;
}

export async function recordProfit(
  userId: number,
  plantationId: string,
  input: ProfitInput,
): Promise<ProfitRecord> {
  await ensurePostHarvestSchema();
  const plantation = await loadOwnedPlantation(userId, plantationId);

  const harvestResult = await db.query(
    `SELECT actual_yield, yield_unit FROM harvest_records WHERE plantation_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [plantation.id],
  );
  const harvest = harvestResult.rows[0] as { actual_yield: string | number; yield_unit: string } | undefined;
  if (!harvest) {
    throw new HarvestValidationError(
      'You must record the harvest yield before recording profit.',
    );
  }
  const yieldValue = Number(harvest.actual_yield ?? 0);
  const yieldUnit = String(harvest.yield_unit ?? input.yieldUnit);

  const costResult = await db.query(
    `SELECT total_cost FROM farm_costs WHERE plantation_id = $1`,
    [plantation.id],
  );
  const totalExpenses = Number((costResult.rows[0] as any)?.total_cost ?? 0);

  const totalRevenue = Math.max(0, yieldValue * Number(input.sellingPricePerUnit ?? 0));
  const netProfit = totalRevenue - totalExpenses;
  const roiPercent = totalExpenses > 0 ? (netProfit / totalExpenses) * 100 : 0;

  const result = await db.query(
    `INSERT INTO profit_records (plantation_id, selling_price_per_unit, yield_unit, total_revenue, total_expenses, net_profit, roi_percent, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
     ON CONFLICT (plantation_id) DO UPDATE SET
       selling_price_per_unit = EXCLUDED.selling_price_per_unit,
       yield_unit = EXCLUDED.yield_unit,
       total_revenue = EXCLUDED.total_revenue,
       total_expenses = EXCLUDED.total_expenses,
       net_profit = EXCLUDED.net_profit,
       roi_percent = EXCLUDED.roi_percent
     RETURNING *`,
    [plantation.id, input.sellingPricePerUnit, yieldUnit, totalRevenue, totalExpenses, netProfit, roiPercent],
  );
  return result.rows[0] as unknown as ProfitRecord;
}

export async function getProfitRecord(
  userId: number,
  plantationId: string,
): Promise<ProfitRecord | null> {
  await ensurePostHarvestSchema();
  await loadOwnedPlantation(userId, plantationId);
  const result = await db.query(
    `SELECT * FROM profit_records WHERE plantation_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [plantationId],
  );
  return (result.rows[0] as unknown as ProfitRecord) ?? null;
}

export async function getRotationRecommendations(
  userId: number,
  plantationId: string,
): Promise<{ previous_crop: string; recommendations: RotationRecommendation[] }> {
  await ensurePostHarvestSchema();
  const plantation = await loadOwnedPlantation(userId, plantationId);
  const previousCrop = String(plantation.crop_name ?? '').toLowerCase();

  const result = await db.query(
    `SELECT * FROM crop_rotation_rules
     WHERE lower(previous_crop) = $1
     ORDER BY priority DESC, id ASC`,
    [previousCrop],
  );

  let recommendations = result.rows as unknown as RotationRecommendation[];
  if (recommendations.length === 0) {
    const fallback = await db.query(
      `SELECT * FROM crop_rotation_rules ORDER BY priority DESC, id ASC LIMIT 3`,
    );
    recommendations = fallback.rows as unknown as RotationRecommendation[];
  }

  return { previous_crop: plantation.crop_name, recommendations };
}

export async function archivePlantation(
  userId: number,
  plantationId: string,
): Promise<{ status: string; archivedAt: string }> {
  await ensurePostHarvestSchema();
  await loadOwnedPlantation(userId, plantationId);
  const result = await db.query(
    `UPDATE plantations
     SET status = 'archived', progress_percent = 100
     WHERE id = $1
     RETURNING status, created_at`,
    [plantationId],
  );
  const row = result.rows[0] as { status: string; created_at: string };
  return { status: row.status, archivedAt: row.created_at };
}

export async function getFarmHistory(
  userId: number,
  farmId: string,
): Promise<FarmHistoryEntry[]> {
  await ensurePostHarvestSchema();
  const farm = await db.query(`SELECT id FROM farms WHERE id = $1 AND userid = $2`, [farmId, userId]);
  if (!farm.rows[0]) throw new NotFoundError('Farm not found');

  const result = await db.query(
    `SELECT
       p.id AS plantation_id,
       p.crop_name,
       f.area_hectares,
       p.planting_date,
       p.expected_harvest_date,
       hr.actual_harvest_date,
       p.status,
       hr.actual_yield AS yield_value,
       hr.yield_unit,
       pr.net_profit,
       pr.roi_percent,
       pr.total_revenue,
       pr.total_expenses
     FROM plantations p
     JOIN farms f ON f.id = p.farm_id
     LEFT JOIN harvest_records hr ON hr.plantation_id = p.id
     LEFT JOIN profit_records pr ON pr.plantation_id = p.id
     WHERE p.farm_id = $1
     ORDER BY p.planting_date DESC, p.created_at DESC`,
    [farmId],
  );
  return result.rows as unknown as FarmHistoryEntry[];
}

export interface NewPlantationResult {
  farm: Record<string, unknown>;
  plantation: Record<string, unknown>;
  calendarEvents: Array<Record<string, unknown>>;
  costs: Record<string, unknown>;
}

export async function startNewPlantation(
  userId: number,
  farmId: string,
  input: NewPlantationInput,
): Promise<NewPlantationResult> {
  await ensurePostHarvestSchema();
  const farmResult = await db.query(
    `SELECT * FROM farms WHERE id = $1 AND userid = $2`,
    [farmId, userId],
  );
  if (!farmResult.rows[0]) throw new NotFoundError('Farm not found');
  const farm = farmResult.rows[0] as any;

  const active = await db.query(
    `SELECT id, crop_name, status FROM plantations
     WHERE farm_id = $1
       AND lower(status) NOT IN ('finished','completed','harvested','cancelled','archived')
     LIMIT 1`,
    [farmId],
  );
  if (active.rows[0]) {
    throw new HarvestValidationError(
      `This farm already has an active ${(active.rows[0] as any).crop_name} plantation. ` +
        `Finish or archive it before starting a new one.`,
    );
  }

  const { createPlantation } = await import('./plantationService');
  return createPlantation(userId, {
    farmName: String(farm.farm_name ?? ''),
    latitude: Number(farm.latitude ?? 0),
    longitude: Number(farm.longitude ?? 0),
    areaSqm: Number(farm.area_sqm ?? 0),
    areaHectares: Number(farm.area_hectares ?? 0),
    polygonGeojson: farm.polygon_geojson,
    recommendationId: input.recommendationId ?? null,
    cropName: input.cropName,
    plantingDate: input.plantingDate,
  }) as unknown as NewPlantationResult;
}