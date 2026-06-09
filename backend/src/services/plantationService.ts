import { z } from 'zod';
import db from '../models/db';
import { ensurePlantationSchema } from '../models/ensurePlantationSchema';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const emptyToNull = (value: unknown) => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  return value;
};

export const createPlantationSchema = z.object({
  farmName: z.string().trim().min(1).max(120),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  areaSqm: z.number().min(0),
  areaHectares: z.number().min(0),
  polygonGeojson: z.unknown().refine(
    (value) => value !== null && value !== undefined,
    { message: "Farm boundary polygon is required" },
  ),
  recommendationId: z
    .preprocess(emptyToNull, z.union([z.string(), z.number()]).nullable().optional()),
  cropName: z.string().trim().min(1).max(120),
  plantingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type CreatePlantationInput = z.infer<typeof createPlantationSchema>;

export interface CalendarEventPlan {
  eventType: string;
  scheduledDate: string;
  adjustedDate: string;
  status: string;
  adjustmentReason: string | null;
  notes: string;
}

const cropDurations: Record<string, number> = {
  rice: 120, corn: 95, maize: 95, tomato: 90, eggplant: 100, pepper: 95,
  lettuce: 45, cabbage: 85, onion: 110, garlic: 120, potato: 100, sweetpotato: 120, cassava: 270, banana: 365,
};

const costProfiles: Record<string, { seed: number; fertilizer: number; labor: number; irrigation: number }> = {
  rice: { seed: 9000, fertilizer: 18000, labor: 22000, irrigation: 7000 },
  corn: { seed: 7500, fertilizer: 14000, labor: 15000, irrigation: 4500 },
  tomato: { seed: 18000, fertilizer: 28000, labor: 45000, irrigation: 12000 },
  eggplant: { seed: 13000, fertilizer: 24000, labor: 38000, irrigation: 10000 },
  pepper: { seed: 16000, fertilizer: 26000, labor: 42000, irrigation: 11000 },
  lettuce: { seed: 11000, fertilizer: 16000, labor: 28000, irrigation: 8000 },
  cabbage: { seed: 12000, fertilizer: 20000, labor: 32000, irrigation: 9000 },
};

function addDays(date: string, days: number): string {
  const next = new Date(`${date}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function normalizeCropName(cropName: string): string {
  return cropName.trim().toLowerCase();
}

export function getCropDurationDays(cropName: string): number {
  return cropDurations[normalizeCropName(cropName)] ?? 100;
}

function buildBaseActivities(plantingDate: string, harvestDate: string): Array<{ eventType: string; dayOffset: number; notes: string }> {
  const harvestOffset = Math.max(1, Math.round((new Date(`${harvestDate}T00:00:00.000Z`).getTime() - new Date(`${plantingDate}T00:00:00.000Z`).getTime()) / MS_PER_DAY));
  return [
    { eventType: 'Planting', dayOffset: 0, notes: 'Plant crop and confirm the farm boundary record.' },
    { eventType: 'Irrigation', dayOffset: 3, notes: 'Check soil moisture and irrigate as needed.' },
    { eventType: 'Fertilizer', dayOffset: 14, notes: 'Apply starter fertilizer when weather is suitable.' },
    { eventType: 'Pest Monitoring', dayOffset: Math.min(21, harvestOffset - 14), notes: 'Scout field edges and young leaves for pest activity.' },
    { eventType: 'Disease Monitoring', dayOffset: Math.min(28, harvestOffset - 10), notes: 'Inspect leaves and stems for disease symptoms.' },
    { eventType: 'Fertilizer', dayOffset: Math.min(45, harvestOffset - 20), notes: 'Apply side-dress fertilizer if crop vigor requires it.' },
    { eventType: 'Irrigation', dayOffset: Math.min(60, harvestOffset - 14), notes: 'Review irrigation before the crop enters its final stage.' },
    { eventType: 'Harvest', dayOffset: harvestOffset, notes: 'Prepare harvest labor, containers, and post-harvest handling.' },
  ].filter((a) => a.dayOffset >= 0);
}

interface WeatherRiskDay { date: string; reason: string; }

async function getWeatherRiskDays(latitude: number, longitude: number, startDate: string, endDate: string): Promise<WeatherRiskDay[]> {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(latitude));
  url.searchParams.set('longitude', String(longitude));
  url.searchParams.set('daily', 'precipitation_sum,precipitation_probability_max,weather_code');
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('start_date', startDate);
  url.searchParams.set('end_date', endDate);
  try {
    const response = await fetch(url.toString());
    if (!response.ok) return [];
    const data = await response.json() as any;
    const times = data?.daily?.time ?? [];
    return times.flatMap((date: string, index: number) => {
      const rainMm = data.daily?.precipitation_sum?.[index] ?? 0;
      const rainProbability = data.daily?.precipitation_probability_max?.[index] ?? 0;
      const weatherCode = data.daily?.weather_code?.[index] ?? 0;
      const stormy = weatherCode >= 95;
      const heavyRain = rainMm >= 12 || rainProbability >= 75 || stormy;
      if (!heavyRain) return [];
      const reason = stormy ? 'Thunderstorm forecast near this activity date.' : `Heavy rain risk forecast (${Math.round(rainMm)} mm, ${Math.round(rainProbability)}% probability).`;
      return [{ date, reason }];
    });
  } catch { return []; }
}

function isDateInRiskWindow(date: string, riskDate: string): boolean {
  return Math.abs(new Date(`${date}T00:00:00.000Z`).getTime() - new Date(`${riskDate}T00:00:00.000Z`).getTime()) <= MS_PER_DAY;
}

function adjustActivityDate(date: string, riskDays: WeatherRiskDay[]): { adjustedDate: string; reason: string | null } {
  const matchingRisk = riskDays.find((riskDay) => isDateInRiskWindow(date, riskDay.date));
  if (!matchingRisk) return { adjustedDate: date, reason: null };
  let adjustedDate = addDays(date, 3);
  for (let attempts = 0; attempts < 7; attempts++) {
    if (!riskDays.some((riskDay) => isDateInRiskWindow(adjustedDate, riskDay.date))) break;
    adjustedDate = addDays(adjustedDate, 1);
  }
  return { adjustedDate, reason: `${matchingRisk.reason} Activity moved from ${date} to ${adjustedDate}.` };
}

export async function buildCalendarEvents(input: CreatePlantationInput, harvestDate: string): Promise<CalendarEventPlan[]> {
  const activities = buildBaseActivities(input.plantingDate, harvestDate);
  const lastActivityDayOffset = activities.reduce((latest, activity) => Math.max(activity.dayOffset, latest), 0);
  const lastActivityDate = addDays(input.plantingDate, lastActivityDayOffset);
  const weatherEndDate = addDays(input.plantingDate, 15);
  const riskDays = await getWeatherRiskDays(input.latitude, input.longitude, input.plantingDate, weatherEndDate);
  return activities.map((activity) => {
    const scheduledDate = addDays(input.plantingDate, activity.dayOffset);
    const shouldAdjust = ['Fertilizer', 'Pest Monitoring', 'Disease Monitoring', 'Harvest'].includes(activity.eventType);
    const adjustment = shouldAdjust ? adjustActivityDate(scheduledDate, riskDays) : { adjustedDate: scheduledDate, reason: null };
    return {
      eventType: activity.eventType,
      scheduledDate,
      adjustedDate: adjustment.adjustedDate > lastActivityDate ? scheduledDate : adjustment.adjustedDate,
      status: 'scheduled',
      adjustmentReason: adjustment.reason,
      notes: activity.notes,
    };
  });
}

export function estimateCosts(cropName: string, areaHectares: number) {
  const profile = costProfiles[normalizeCropName(cropName)] ?? { seed: 10000, fertilizer: 18000, labor: 25000, irrigation: 7000 };
  return {
    seedCost: Math.round(profile.seed * areaHectares),
    fertilizerCost: Math.round(profile.fertilizer * areaHectares),
    laborCost: Math.round(profile.labor * areaHectares),
    irrigationCost: Math.round(profile.irrigation * areaHectares),
    totalCost: Math.round(profile.seed * areaHectares) + Math.round(profile.fertilizer * areaHectares) + Math.round(profile.labor * areaHectares) + Math.round(profile.irrigation * areaHectares),
  };
}

export class ActivePlantationError extends Error {
  status = 409;
  constructor(message: string) { super(message); this.name = "ActivePlantationError"; }
}

export async function findActivePlantationForUser(userId: number): Promise<{ id: number | string; cropName: string; status: string } | null> {
  const result = await db.query(
    `SELECT p.id, p.crop_name, p.status, (SELECT ce.status FROM calendar_events ce WHERE ce.plantation_id = p.id AND lower(ce.event_type) = 'harvest' LIMIT 1) AS harvest_status FROM plantations p JOIN farms f ON f.id = p.farm_id WHERE f.userid = $1 ORDER BY p.created_at DESC`,
    [userId],
  );
  for (const row of result.rows as any[]) {
    const ps = String(row.status ?? "").toLowerCase();
    const hs = String(row.harvest_status ?? "").toLowerCase();
    if (new Set(["finished","completed","harvested","cancelled","archived"]).has(ps) || hs === "done" || hs === "completed") continue;
    return { id: row.id, cropName: row.crop_name, status: row.status };
  }
  return null;
}

export async function createPlantation(userId: number, input: CreatePlantationInput) {
  const active = await findActivePlantationForUser(userId);
  if (active) throw new ActivePlantationError(`You already have an active ${active.cropName} plantation (id=${active.id}). Please finish or harvest it before starting a new one.`);
  const harvestDate = addDays(input.plantingDate, getCropDurationDays(input.cropName));
  const events = await buildCalendarEvents(input, harvestDate);
  const recommendationId = input.recommendationId ? String(input.recommendationId) : null;
  const farmResult = await db.query(
    `INSERT INTO farms (userid, farm_name, latitude, longitude, area_sqm, area_hectares, polygon_geojson, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,NOW()) RETURNING *`,
    [userId, input.farmName, input.latitude, input.longitude, input.areaSqm, input.areaHectares, JSON.stringify(input.polygonGeojson)],
  );
  const farm = farmResult.rows[0];
  const plantationResult = await db.query(
    `INSERT INTO plantations (farm_id, recommendation_id, crop_name, planting_date, expected_harvest_date, status, progress_percent, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW()) RETURNING *`,
    [farm.id, recommendationId, input.cropName, input.plantingDate, harvestDate, 'active', 0],
  );
  const plantation = plantationResult.rows[0];
  const eventRows: Array<Record<string, unknown>> = [];
  for (const event of events) {
    const r = await db.query(
      `INSERT INTO calendar_events (plantation_id, event_type, scheduled_date, adjusted_date, status, adjustment_reason, notes, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW()) RETURNING *`,
      [plantation.id, event.eventType, event.scheduledDate, event.adjustedDate, event.status, event.adjustmentReason, event.notes],
    );
    eventRows.push(r.rows[0]);
  }
  const costResult = await db.query(
    `INSERT INTO farm_costs (plantation_id, seed_cost, fertilizer_cost, labor_cost, irrigation_cost, total_cost, created_at) VALUES ($1,0,0,0,0,0,NOW()) ON CONFLICT (plantation_id) DO NOTHING RETURNING *`,
    [plantation.id],
  );
  return { farm, plantation, calendarEvents: eventRows, costs: costResult.rows[0] ?? { seed_cost:0, fertilizer_cost:0, labor_cost:0, irrigation_cost:0, total_cost:0 } };
}

export async function listPlantations(userId: number) {
  const result = await db.query(
    `SELECT p.*, row_to_json(f.*) AS farm, row_to_json(fc.*) AS costs, (SELECT row_to_json(ce.*) FROM calendar_events ce WHERE ce.plantation_id = p.id AND ce.status = 'scheduled' ORDER BY COALESCE(ce.adjusted_date, ce.scheduled_date) ASC LIMIT 1) AS next_activity FROM plantations p JOIN farms f ON f.id = p.farm_id LEFT JOIN farm_costs fc ON fc.plantation_id = p.id WHERE f.userid = $1 ORDER BY p.created_at DESC`,
    [userId],
  );
  return result.rows;
}

export async function getPlantation(userId: number, plantationId: string) {
  const r = await db.query(`SELECT p.*, row_to_json(f.*) AS farm, row_to_json(fc.*) AS costs FROM plantations p JOIN farms f ON f.id = p.farm_id LEFT JOIN farm_costs fc ON fc.plantation_id = p.id WHERE p.id = $1 AND f.userid = $2`, [plantationId, userId]);
  if (!r.rows[0]) return null;
  const e = await db.query(`SELECT * FROM calendar_events WHERE plantation_id = $1 ORDER BY COALESCE(adjusted_date, scheduled_date) ASC`, [plantationId]);
  return { ...r.rows[0], calendarEvents: e.rows };
}

/**
 * Promotes a plantation to `harvested` (and 100% progress) when every
 * calendar event on it has reached a terminal state (done / completed /
 * skipped). It's safe to call after any calendar-event mutation; it
 * becomes a no-op if the plantation is already terminal, has no events,
 * or still has at least one non-terminal event.
 *
 * The promotion intentionally happens for ANY terminal combination, not
 * just when a "harvest" event is marked done. This matches the spec:
 * once the farmer has completed every Smart Calendar task, the cycle
 * is considered harvested.
 */
export async function finalizePlantationIfAllDone(
  plantationId: number | string,
): Promise<{ promoted: boolean; status: string; remaining: number }> {
  const result = await db.query(
    `SELECT id, status FROM plantations WHERE id = $1`,
    [plantationId],
  );
  const row = result.rows[0] as
    | { id: number | string; status: string }
    | undefined;
  if (!row) return { promoted: false, status: "missing", remaining: 0 };

  const current = String(row.status ?? "").toLowerCase();
  // Already terminal — leave as-is.
  if (
    ["finished", "completed", "harvested", "cancelled", "archived"].includes(
      current,
    )
  ) {
    return { promoted: false, status: current, remaining: 0 };
  }

  const events = await db.query(
    `SELECT status FROM calendar_events WHERE plantation_id = $1`,
    [plantationId],
  );
  const total = events.rows.length;
  if (total === 0) {
    return { promoted: false, status: current, remaining: 0 };
  }
  const remaining = events.rows.filter((r: any) => {
    const s = String(r.status ?? "").toLowerCase();
    return s !== "done" && s !== "completed" && s !== "skipped";
  }).length;
  if (remaining > 0) {
    return { promoted: false, status: current, remaining };
  }

  await db.query(
    `UPDATE plantations
     SET status = 'harvested', progress_percent = 100
     WHERE id = $1
       AND lower(status) NOT IN ('finished','completed','harvested','cancelled','archived')`,
    [plantationId],
  );
  return { promoted: true, status: "harvested", remaining: 0 };
}

export async function markCalendarEventDone(userId: number, eventId: string) {
  await ensurePlantationSchema();
  const ownership = await db.query(`SELECT ce.id, ce.plantation_id, ce.event_type FROM calendar_events ce JOIN plantations p ON p.id = ce.plantation_id JOIN farms f ON f.id = p.farm_id WHERE ce.id = $1 AND f.userid = $2`, [eventId, userId]);
  const ownerRow = ownership.rows[0] as { id: number | string; plantation_id: number | string; event_type: string } | undefined;
  if (!ownerRow) return null;
  const result = await db.query(`UPDATE calendar_events SET status = 'done', completed_at = CURRENT_DATE WHERE id = $1 RETURNING *`, [eventId]);
  const updatedEvent = result.rows[0] ?? null;
  if (updatedEvent && String(ownerRow.event_type ?? "").toLowerCase() === "harvest") {
    try { await db.query(`UPDATE plantations SET status = 'finished', progress_percent = 100 WHERE id = $1 AND lower(status) NOT IN ('finished','completed','harvested','cancelled','archived')`, [ownerRow.plantation_id]); } catch {}
  }
  // NEW: if every remaining calendar event is now done, promote to harvested.
  try { await finalizePlantationIfAllDone(ownerRow.plantation_id); } catch {}
  return updatedEvent;
}

export async function skipCalendarEvent(userId: number, eventId: string) {
  await ensurePlantationSchema();
  const ownership = await db.query(`SELECT ce.id FROM calendar_events ce JOIN plantations p ON p.id = ce.plantation_id JOIN farms f ON f.id = p.farm_id WHERE ce.id = $1 AND f.userid = $2`, [eventId, userId]);
  if (!ownership.rows[0]) return null;
  const result = await db.query(`UPDATE calendar_events SET status='skipped', skipped_at=CURRENT_DATE WHERE id=$1 RETURNING *`, [eventId]);
  // NEW: skipping is a terminal state, so re-check whether the whole
  // plantation is now ready to be promoted to harvested.
  try {
    const owner = (ownership.rows[0] as any)?.plantation_id;
    if (owner) await finalizePlantationIfAllDone(owner);
  } catch {}
  return result.rows[0] ?? null;
}

export async function rescheduleCalendarEvent(userId: number, eventId: string, newDate: string, reason: string | null) {
  await ensurePlantationSchema();
  const ownership = await db.query(`SELECT ce.id, ce.plantation_id FROM calendar_events ce JOIN plantations p ON p.id = ce.plantation_id JOIN farms f ON f.id = p.farm_id WHERE ce.id = $1 AND f.userid = $2`, [eventId, userId]);
  const ownerRow = ownership.rows[0] as
    | { id: number | string; plantation_id: number | string }
    | undefined;
  if (!ownerRow) return null;
  const result = await db.query(`UPDATE calendar_events SET status='rescheduled', rescheduled_to=$2, reschedule_reason=$3 WHERE id=$1 RETURNING *`, [eventId, newDate, reason]);
  // Re-check after a reschedule; if everything else was terminal, the
  // rescheduled one might be the only open item, but if the reschedule
  // moves it into the past, finalizePlantationIfAllDone will see
  // remaining = 0 and promote.
  try { await finalizePlantationIfAllDone(ownerRow.plantation_id); } catch {}
  return result.rows[0] ?? null;
}

export interface CostOverride { seedCostPerHa: number; fertilizerCostPerHa: number; laborCostPerHa: number; irrigationCostPerHa: number; }

export async function updatePlantationCostRates(userId: number, plantationId: string, override: CostOverride): Promise<Record<string, unknown> | null> {
  await ensurePlantationSchema();
  const ownership = await db.query(`SELECT p.id, f.area_hectares FROM plantations p JOIN farms f ON f.id = p.farm_id WHERE p.id = $1 AND f.userid = $2`, [plantationId, userId]);
  const owned = ownership.rows[0] as any;
  if (!owned) return null;
  const area = Number(owned.area_hectares ?? 0);
  if (!Number.isFinite(area) || area <= 0) return null;
  const s = Math.max(0, Math.round(override.seedCostPerHa * area));
  const f = Math.max(0, Math.round(override.fertilizerCostPerHa * area));
  const l = Math.max(0, Math.round(override.laborCostPerHa * area));
  const i = Math.max(0, Math.round(override.irrigationCostPerHa * area));
  return (await db.query(
    `INSERT INTO farm_costs (plantation_id, seed_cost, fertilizer_cost, labor_cost, irrigation_cost, total_cost, created_at) VALUES ($1,$2,$3,$4,$5,$6,NOW()) ON CONFLICT ON CONSTRAINT farm_costs_plantation_id_key DO UPDATE SET seed_cost=$2, fertilizer_cost=$3, labor_cost=$4, irrigation_cost=$5, total_cost=$6 RETURNING *`,
    [plantationId, s, f, l, i, s + f + l + i],
  )).rows[0] ?? null;
}

export function getCostProfileForCrop(cropName: string): CostOverride {
  const p = costProfiles[normalizeCropName(cropName)] ?? { seed: 10000, fertilizer: 18000, labor: 25000, irrigation: 7000 };
  return { seedCostPerHa: p.seed, fertilizerCostPerHa: p.fertilizer, laborCostPerHa: p.labor, irrigationCostPerHa: p.irrigation };
}

export interface EventCostInput { seed_cost: number; fertilizer_cost: number; labor_cost: number; irrigation_cost: number; }

/**
 * Accumulates actual costs for a completed activity into farm_costs.
 * Values are ADDED to existing totals. Returns the updated row.
 *
 * Implementation notes:
 * - We don't depend on a unique-constraint `ON CONFLICT` clause. Instead we
 *   read the current row, INSERT if missing, UPDATE if present. Both
 *   branches run inside a single transaction so concurrent cost entries
 *   never lose data.
 * - All cost values are coerced to non-negative integers before being
 *   written to the database.
 */
export async function addEventCosts(userId: number, eventId: string, input: EventCostInput): Promise<Record<string, unknown> | null> {
  await ensurePlantationSchema();

  const lookup = await db.query(
    `SELECT ce.id, ce.plantation_id, ce.event_type
     FROM calendar_events ce
     JOIN plantations p ON p.id = ce.plantation_id
     JOIN farms f ON f.id = p.farm_id
     WHERE ce.id = $1 AND f.userid = $2`,
    [eventId, userId],
  );
  const row = lookup.rows[0] as { id: number | string; plantation_id: number | string; event_type: string } | undefined;
  if (!row) return null;

  const s = Math.max(0, Math.round(Number(input.seed_cost ?? 0)));
  const f = Math.max(0, Math.round(Number(input.fertilizer_cost ?? 0)));
  const l = Math.max(0, Math.round(Number(input.labor_cost ?? 0)));
  const i = Math.max(0, Math.round(Number(input.irrigation_cost ?? 0)));

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const existing = await client.query(
      `SELECT seed_cost, fertilizer_cost, labor_cost, irrigation_cost, total_cost
       FROM farm_costs WHERE plantation_id = $1 FOR UPDATE`,
      [row.plantation_id],
    );

    let result;
    if (existing.rows[0]) {
      const prev = existing.rows[0] as { seed_cost: any; fertilizer_cost: any; labor_cost: any; irrigation_cost: any; total_cost: any };
      const newSeed = Number(prev.seed_cost ?? 0) + s;
      const newFertilizer = Number(prev.fertilizer_cost ?? 0) + f;
      const newLabor = Number(prev.labor_cost ?? 0) + l;
      const newIrrigation = Number(prev.irrigation_cost ?? 0) + i;
      const newTotal = Number(prev.total_cost ?? 0) + (s + f + l + i);
      result = await client.query(
        `UPDATE farm_costs
         SET seed_cost = $2,
             fertilizer_cost = $3,
             labor_cost = $4,
             irrigation_cost = $5,
             total_cost = $6
         WHERE plantation_id = $1
         RETURNING *`,
        [row.plantation_id, newSeed, newFertilizer, newLabor, newIrrigation, newTotal],
      );
    } else {
      result = await client.query(
        `INSERT INTO farm_costs (plantation_id, seed_cost, fertilizer_cost, labor_cost, irrigation_cost, total_cost, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         RETURNING *`,
        [row.plantation_id, s, f, l, i, s + f + l + i],
      );
    }

    await client.query("COMMIT");
    return result.rows[0] ?? null;
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch {}
    throw error;
  } finally {
    client.release();
  }
}
