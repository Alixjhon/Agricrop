export interface GeoJsonPolygon {
  type: "Feature";
  properties: Record<string, unknown>;
  geometry: {
    type: "Polygon";
    coordinates: number[][][];
  };
}

export interface Farm {
  id: number | string;
  user_id: number | string;
  farm_name: string;
  latitude: number;
  longitude: number;
  area_sqm: number;
  area_hectares: number;
  polygon_geojson: GeoJsonPolygon | string;
  created_at: string;
}

export interface PlantationCosts {
  id: number | string;
  plantation_id: number | string;
  seed_cost: number;
  fertilizer_cost: number;
  labor_cost: number;
  irrigation_cost: number;
  total_cost: number;
  created_at: string;
}

export type CalendarEventStatus =
  | "pending"
  | "scheduled"
  | "done"
  | "completed"
  | "skipped"
  | "missed"
  | "rescheduled";

export interface CalendarEvent {
  id: number | string;
  plantation_id: number | string;
  event_type: string;
  scheduled_date: string;
  adjusted_date: string | null;
  status: CalendarEventStatus | string;
  adjustment_reason: string | null;
  notes: string | null;
  created_at: string;
  completed_at?: string | null;
  skipped_at?: string | null;
  rescheduled_to?: string | null;
  reschedule_reason?: string | null;
  /** Sum of all per-activity cost entries logged against this event. */
  actual_cost?: number | null;
}

export type CalendarEventCostCategory =
  | "seed"
  | "fertilizer"
  | "labor"
  | "irrigation"
  | "other";

export interface CalendarEventCostEntry {
  id: number | string;
  event_id: number | string;
  plantation_id: number | string;
  category: CalendarEventCostCategory | string;
  amount: number;
  note: string | null;
  created_at: string;
}

export interface Plantation {
  id: number | string;
  farm_id: number | string;
  recommendation_id: number | string | null;
  crop_name: string;
  planting_date: string;
  expected_harvest_date: string;
  status: string;
  progress_percent: number;
  created_at: string;
  farm: Farm;
  costs: PlantationCosts | null;
  next_activity?: CalendarEvent | null;
  calendarEvents?: CalendarEvent[];
}

export interface CreatePlantationPayload {
  farmName: string;
  latitude: number;
  longitude: number;
  areaSqm: number;
  areaHectares: number;
  polygonGeojson: GeoJsonPolygon;
  recommendationId?: string | number | null;
  cropName: string;
  plantingDate: string;
}

export interface CreatePlantationResponse {
  farm: Farm;
  plantation: Omit<Plantation, "farm" | "costs">;
  calendarEvents: CalendarEvent[];
  costs: PlantationCosts;
}

// ----- Post-harvest / cycle-end types -----

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

export interface NewPlantationCycleInput {
  cropName: string;
  plantingDate: string;
  recommendationId?: string | number | null;
}
