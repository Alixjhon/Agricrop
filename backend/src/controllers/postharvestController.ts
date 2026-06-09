import { Request, Response } from 'express';
import { ZodError } from 'zod';
import {
  archivePlantation,
  FarmHistoryEntry,
  getFarmHistory,
  getHarvestRecord,
  getHarvestSummary,
  getProfitRecord,
  getRotationRecommendations,
  HarvestRecord,
  HarvestSummary,
  HarvestValidationError,
  harvestInputSchema,
  newPlantationInputSchema,
  NewPlantationResult,
  NotFoundError,
  profitInputSchema,
  ProfitRecord,
  recordHarvest,
  recordProfit,
  startNewPlantation,
} from '../services/postharvestService';

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function handleError(res: Response, error: unknown, fallbackMessage: string): Response {
  if (error instanceof ZodError) {
    return res.status(400).json({ error: 'Invalid input', details: error.issues });
  }
  if (error instanceof HarvestValidationError) {
    return res.status(error.status).json({ error: error.message });
  }
  if (error instanceof NotFoundError) {
    return res.status(error.status).json({ error: error.message });
  }
  console.error(`${fallbackMessage}:`, error instanceof Error ? error.message : error);
  return res.status(500).json({
    error: fallbackMessage,
    details: error instanceof Error ? error.message : String(error),
  });
}

export const recordHarvestHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Access token required' });
    const plantationId = req.params.plantationId;
    if (!plantationId) return res.status(400).json({ error: 'Plantation id is required' });
    const input = harvestInputSchema.parse(req.body);
    const record: HarvestRecord = await recordHarvest(userId, plantationId, input);
    return res.status(201).json({ record });
  } catch (error) {
    return handleError(res, error, 'Failed to record harvest');
  }
};

export const getHarvestHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Access token required' });
    const plantationId = req.params.plantationId;
    if (!plantationId) return res.status(400).json({ error: 'Plantation id is required' });
    const record = await getHarvestRecord(userId, plantationId);
    return res.json({ record: record ?? null });
  } catch (error) {
    return handleError(res, error, 'Failed to load harvest record');
  }
};

export const getHarvestSummaryHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Access token required' });
    const plantationId = req.params.plantationId;
    if (!plantationId) return res.status(400).json({ error: 'Plantation id is required' });
    const summary: HarvestSummary = await getHarvestSummary(userId, plantationId);
    return res.json({ summary });
  } catch (error) {
    return handleError(res, error, 'Failed to load harvest summary');
  }
};

export const recordProfitHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Access token required' });
    const plantationId = req.params.plantationId;
    if (!plantationId) return res.status(400).json({ error: 'Plantation id is required' });
    const input = profitInputSchema.parse(req.body);
    const record: ProfitRecord = await recordProfit(userId, plantationId, input);
    return res.json({ record });
  } catch (error) {
    return handleError(res, error, 'Failed to record profit');
  }
};

export const getProfitHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Access token required' });
    const plantationId = req.params.plantationId;
    if (!plantationId) return res.status(400).json({ error: 'Plantation id is required' });
    const record = await getProfitRecord(userId, plantationId);
    return res.json({ record: record ?? null });
  } catch (error) {
    return handleError(res, error, 'Failed to load profit record');
  }
};

export const getRotationHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Access token required' });
    const plantationId = req.params.plantationId;
    if (!plantationId) return res.status(400).json({ error: 'Plantation id is required' });
    const payload = await getRotationRecommendations(userId, plantationId);
    return res.json(payload);
  } catch (error) {
    return handleError(res, error, 'Failed to load rotation recommendations');
  }
};

export const archivePlantationHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Access token required' });
    const plantationId = req.params.plantationId;
    if (!plantationId) return res.status(400).json({ error: 'Plantation id is required' });
    const result = await archivePlantation(userId, plantationId);
    return res.json(result);
  } catch (error) {
    return handleError(res, error, 'Failed to archive plantation');
  }
};

export const getFarmHistoryHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Access token required' });
    const farmId = req.params.farmId;
    if (!farmId) return res.status(400).json({ error: 'Farm id is required' });
    const history: FarmHistoryEntry[] = await getFarmHistory(userId, farmId);
    return res.json({ history });
  } catch (error) {
    return handleError(res, error, 'Failed to load farm history');
  }
};

export const startNewPlantationHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Access token required' });
    const farmId = req.params.farmId;
    if (!farmId) return res.status(400).json({ error: 'Farm id is required' });
    const input = newPlantationInputSchema.parse(req.body);
    const result: NewPlantationResult = await startNewPlantation(userId, farmId, input);
    return res.status(201).json(result);
  } catch (error) {
    return handleError(res, error, 'Failed to start new plantation');
  }
};