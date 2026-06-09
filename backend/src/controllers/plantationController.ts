import { Request, Response } from 'express';
import { ZodError } from 'zod';
import {
  ActivePlantationError,
  addEventCosts,
  createPlantation,
  createPlantationSchema,
  finalizePlantationIfAllDone,
  getCostProfileForCrop,
  getPlantation,
  listPlantations,
  markCalendarEventDone,
  rescheduleCalendarEvent,
  skipCalendarEvent,
  updatePlantationCostRates,
} from '../services/plantationService';
import { ensurePlantationSchema } from '../models/ensurePlantationSchema';

const rescheduleSchema = {
  newDate: (value: unknown) =>
    typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value),
  reason: (value: unknown) => value === null || value === undefined || typeof value === 'string',
};

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

export const createPlantationHandler = async (req: Request, res: Response) => {
  try {
    const input = createPlantationSchema.parse(req.body);
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Access token required' });
    const result = await createPlantation(userId, input);
    return res.status(201).json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: 'Invalid plantation data', details: error.issues });
    }
    if (error instanceof ActivePlantationError) {
      return res.status(409).json({ error: error.message, code: 'ACTIVE_PLANTATION_EXISTS' });
    }
    const message = error instanceof Error ? error.message : 'Failed to create plantation';
    return res.status(500).json({ error: message });
  }
};

export const listPlantationsHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Access token required' });
    const plantations = await listPlantations(userId);
    return res.json({ plantations });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to load plantations' });
  }
};

export const getPlantationHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Access token required' });
    const plantation = await getPlantation(userId, req.params.id);
    if (!plantation) return res.status(404).json({ error: 'Plantation not found' });
    return res.json({ plantation });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to load plantation' });
  }
};

export const markCalendarEventDoneHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Access token required' });
    const eventId = req.params.eventId;
    if (!eventId) return res.status(400).json({ error: 'Calendar event id is required' });
    const event = await markCalendarEventDone(userId, eventId);
    if (!event) return res.status(404).json({ error: 'Calendar event not found' });
    return res.json({ event });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to mark calendar event as done' });
  }
};

export const skipCalendarEventHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Access token required' });
    const eventId = req.params.eventId;
    if (!eventId) return res.status(400).json({ error: 'Calendar event id is required' });
    const event = await skipCalendarEvent(userId, eventId);
    if (!event) return res.status(404).json({ error: 'Calendar event not found' });
    return res.json({ event });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to skip calendar event' });
  }
};

export const rescheduleCalendarEventHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Access token required' });
    const eventId = req.params.eventId;
    if (!eventId) return res.status(400).json({ error: 'Calendar event id is required' });
    const { newDate, reason } = req.body ?? {};
    if (!rescheduleSchema.newDate(newDate)) {
      return res.status(400).json({ error: 'A valid newDate (YYYY-MM-DD) is required' });
    }
    if (!rescheduleSchema.reason(reason)) {
      return res.status(400).json({ error: 'reason must be a string or null' });
    }
    const event = await rescheduleCalendarEvent(userId, eventId, String(newDate), typeof reason === 'string' && reason.trim() ? reason.trim() : null);
    if (!event) return res.status(404).json({ error: 'Calendar event not found' });
    return res.json({ event });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to reschedule calendar event' });
  }
};

export const updatePlantationCostRatesHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Access token required' });
    const plantationId = req.params.id;
    if (!plantationId) return res.status(400).json({ error: 'Plantation id is required' });
    const { seedCostPerHa, fertilizerCostPerHa, laborCostPerHa, irrigationCostPerHa } = req.body ?? {};
    if (!isNonNegativeNumber(seedCostPerHa) || !isNonNegativeNumber(fertilizerCostPerHa) || !isNonNegativeNumber(laborCostPerHa) || !isNonNegativeNumber(irrigationCostPerHa)) {
      return res.status(400).json({ error: 'All four cost-per-hectare values must be non-negative numbers.' });
    }
    const costs = await updatePlantationCostRates(userId, plantationId, { seedCostPerHa, fertilizerCostPerHa, laborCostPerHa, irrigationCostPerHa });
    if (!costs) return res.status(404).json({ error: 'Plantation not found' });
    return res.json({ costs });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update plantation cost rates' });
  }
};

export const getCostProfileHandler = (req: Request, res: Response) => {
  const cropName = typeof req.query.cropName === "string" ? req.query.cropName : "";
  if (!cropName.trim()) return res.status(400).json({ error: 'cropName query parameter is required' });
  const profile = getCostProfileForCrop(cropName);
  return res.json({ cropName, profile });
};

export const addEventCostsHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Access token required' });
    const eventId = req.params.eventId;
    if (!eventId) return res.status(400).json({ error: 'Calendar event id is required' });
    const { seed_cost, fertilizer_cost, labor_cost, irrigation_cost } = req.body ?? {};
    if (!isNonNegativeNumber(seed_cost) || !isNonNegativeNumber(fertilizer_cost) || !isNonNegativeNumber(labor_cost) || !isNonNegativeNumber(irrigation_cost)) {
      return res.status(400).json({ error: 'All four cost values must be non-negative numbers.' });
    }
    const costs = await addEventCosts(userId, eventId, { seed_cost, fertilizer_cost, labor_cost, irrigation_cost });
    if (!costs) return res.status(404).json({ error: 'Calendar event not found' });
    return res.json({ costs });
  } catch (error) {
    console.error('addEventCostsHandler: failed to add event costs:', error instanceof Error ? error.message : error);
    return res.status(500).json({ error: 'Failed to add event costs', details: error instanceof Error ? error.message : String(error) });
  }
};

export const finalizePlantationIfAllDoneHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Access token required' });
    const plantationId = req.params.id;
    if (!plantationId) return res.status(400).json({ error: 'Plantation id is required' });
    // Ownership check before mutation.
    const existing = await getPlantation(userId, plantationId);
    if (!existing) return res.status(404).json({ error: 'Plantation not found' });
    const result = await finalizePlantationIfAllDone(plantationId);
    return res.json(result);
  } catch (error) {
    console.error('finalizePlantationIfAllDoneHandler:', error instanceof Error ? error.message : error);
    return res.status(500).json({ error: 'Failed to finalize plantation' });
  }
};
