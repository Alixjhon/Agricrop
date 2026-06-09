import db from './db';

const STATEMENTS: string[] = [
  // Calendar event enhancement columns
  `ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS completed_at DATE`,
  `ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS skipped_at DATE`,
  `ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS rescheduled_to DATE`,
  `ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS reschedule_reason TEXT`,
  `ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS locked BOOLEAN NOT NULL DEFAULT FALSE`,
  // Helpful indexes
  `CREATE INDEX IF NOT EXISTS idx_calendar_events_plantation ON calendar_events(plantation_id)`,
  `CREATE INDEX IF NOT EXISTS idx_calendar_events_status ON calendar_events(status)`,
  `CREATE INDEX IF NOT EXISTS idx_farms_userid ON farms(userid)`,
  `CREATE INDEX IF NOT EXISTS idx_plantations_farm ON plantations(farm_id)`,
  `CREATE INDEX IF NOT EXISTS idx_farm_costs_plantation ON farm_costs(plantation_id)`,
  // Post-harvest feature tables
  `CREATE TABLE IF NOT EXISTS harvest_records (
     id BIGSERIAL PRIMARY KEY,
     plantation_id BIGINT NOT NULL REFERENCES plantations(id) ON DELETE CASCADE,
     actual_harvest_date DATE NOT NULL,
     actual_yield NUMERIC(14, 2) NOT NULL DEFAULT 0,
     yield_unit TEXT NOT NULL DEFAULT 'kg',
     notes TEXT,
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,
  `CREATE INDEX IF NOT EXISTS idx_harvest_records_plantation ON harvest_records(plantation_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_harvest_records_plantation_unique ON harvest_records(plantation_id)`,
  `CREATE TABLE IF NOT EXISTS profit_records (
     id BIGSERIAL PRIMARY KEY,
     plantation_id BIGINT NOT NULL REFERENCES plantations(id) ON DELETE CASCADE,
     selling_price_per_unit NUMERIC(14, 2) NOT NULL DEFAULT 0,
     yield_unit TEXT NOT NULL DEFAULT 'kg',
     total_revenue NUMERIC(16, 2) NOT NULL DEFAULT 0,
     total_expenses NUMERIC(16, 2) NOT NULL DEFAULT 0,
     net_profit NUMERIC(16, 2) NOT NULL DEFAULT 0,
     roi_percent NUMERIC(8, 2) NOT NULL DEFAULT 0,
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,
  `CREATE INDEX IF NOT EXISTS idx_profit_records_plantation ON profit_records(plantation_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_profit_records_plantation_unique ON profit_records(plantation_id)`,
  // Crop rotation rules (configurable / extensible)
  `CREATE TABLE IF NOT EXISTS crop_rotation_rules (
     id BIGSERIAL PRIMARY KEY,
     previous_crop TEXT NOT NULL,
     recommended_crop TEXT NOT NULL,
     reason TEXT NOT NULL,
     priority INTEGER NOT NULL DEFAULT 0,
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,
  `CREATE INDEX IF NOT EXISTS idx_crop_rotation_previous_crop ON crop_rotation_rules(lower(previous_crop))`,
  // Farm history view is a logical concept; we don't need a new table since
  // plantations already covers the data. The "archived" status just filters
  // out the active ones in the API.
];

// Statements that need to be executed via DO blocks (can't be parameterized
// in the same way). Each one is wrapped in a try/catch and is a no-op if the
// object already exists.
const DO_BLOCKS: string[] = [
  `DO $$ BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_constraint
       WHERE conname = 'farm_costs_plantation_id_key'
     ) THEN
       ALTER TABLE farm_costs
         ADD CONSTRAINT farm_costs_plantation_id_key UNIQUE (plantation_id);
     END IF;
   END $$;`,
  // Seed default rotation rules the first time the schema is created.
  // Idempotent: only inserts if the table is empty.
  `DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM crop_rotation_rules LIMIT 1) THEN
       INSERT INTO crop_rotation_rules (previous_crop, recommended_crop, reason, priority) VALUES
         ('corn', 'mung bean', 'Mung bean is a legume that fixes atmospheric nitrogen, restoring soil fertility depleted by corn.', 10),
         ('corn', 'peanut', 'Peanut fixes nitrogen and adds organic matter, improving soil structure after a heavy-feeding corn crop.', 9),
         ('corn', 'soybean', 'Soybean is a nitrogen-fixing legume that replenishes soil nutrients and breaks pest cycles common to corn.', 8),
         ('rice', 'mung bean', 'Mung bean thrives after rice; it improves soil nitrogen and reduces pest buildup.', 10),
         ('rice', 'soybean', 'Soybean fixes nitrogen and supports the transition from flooded to dryland cropping.', 9),
         ('rice', 'peanut', 'Peanut is drought-tolerant and improves soil after rice paddies.', 8),
         ('tomato', 'corn', 'Corn breaks disease cycles that affect tomato crops and uses deep root systems differently.', 10),
         ('tomato', 'cabbage', 'Cabbage is a brassica that helps break pest cycles specific to solanaceous crops like tomato.', 9),
         ('eggplant', 'corn', 'Corn uses different soil nutrients and breaks pest cycles for solanaceous crops.', 10),
         ('pepper', 'corn', 'Corn rotates well with pepper, breaking disease pressure and balancing soil demands.', 10),
         ('lettuce', 'corn', 'Corn is a heavy feeder that uses the residual nutrients left after lettuce harvest.', 10),
         ('cabbage', 'lettuce', 'Lettuce uses different nutrients and breaks the disease cycle for brassicas like cabbage.', 10),
         ('onion', 'lettuce', 'Lettuce uses the soil profile differently than onion and helps break pest cycles.', 10),
         ('garlic', 'cabbage', 'Cabbage is a brassica that uses different soil layers and breaks pest cycles after garlic.', 10),
         ('potato', 'corn', 'Corn rotates well with potato, reducing the buildup of potato-specific diseases.', 10),
         ('sweetpotato', 'peanut', 'Peanut is a nitrogen-fixing legume that restores soil after sweetpotato.', 10),
         ('cassava', 'peanut', 'Peanut restores nitrogen depleted by cassava, which is a long-cycle heavy feeder.', 10),
         ('banana', 'mung bean', 'Mung bean is a short-cycle legume that improves soil between banana cycles.', 10);
     END IF;
   END $$;`,
];

let hasRun = false;

/**
 * Runs idempotent schema fixes that the rest of the app depends on, but that
 * the user may not have applied yet via `npm run migrate`. Safe to invoke
 * multiple times — every statement uses IF NOT EXISTS guards.
 */
export async function ensurePostHarvestSchema(): Promise<void> {
  for (const statement of STATEMENTS) {
    try {
      await db.query(statement);
    } catch (error) {
      console.warn(
        'ensurePostHarvestSchema: skipped statement due to error:',
        error instanceof Error ? error.message : error,
      );
    }
  }
  for (const block of DO_BLOCKS) {
    try {
      await db.query(block);
    } catch (error) {
      console.warn(
        'ensurePostHarvestSchema: skipped DO block due to error:',
        error instanceof Error ? error.message : error,
      );
    }
  }
  hasRun = true;
}

/**
 * Backwards-compatible alias for existing callers.
 */
export async function ensurePlantationSchema(): Promise<void> {
  return ensurePostHarvestSchema();
}