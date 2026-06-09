import express from 'express';
import {
  addEventCostsHandler,
  createPlantationHandler,
  finalizePlantationIfAllDoneHandler,
  getCostProfileHandler,
  getPlantationHandler,
  listPlantationsHandler,
  markCalendarEventDoneHandler,
  rescheduleCalendarEventHandler,
  skipCalendarEventHandler,
  updatePlantationCostRatesHandler,
} from '../controllers/plantationController';
import {
  archivePlantationHandler,
  getFarmHistoryHandler,
  getHarvestHandler,
  getHarvestSummaryHandler,
  getProfitHandler,
  getRotationHandler,
  recordHarvestHandler,
  recordProfitHandler,
  startNewPlantationHandler,
} from '../controllers/postharvestController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.get('/plantations/cost-profile', authenticateToken, getCostProfileHandler);
router.get('/plantations', authenticateToken, listPlantationsHandler);
router.get('/plantations/:id', authenticateToken, getPlantationHandler);
router.post('/plantations', authenticateToken, createPlantationHandler);
router.patch('/plantations/:id/cost-rates', authenticateToken, updatePlantationCostRatesHandler);
router.post('/plantations/:id/finalize-if-all-done', authenticateToken, finalizePlantationIfAllDoneHandler);
router.patch('/plantations/calendar/:eventId/done', authenticateToken, markCalendarEventDoneHandler);
router.patch('/plantations/calendar/:eventId/skip', authenticateToken, skipCalendarEventHandler);
router.patch('/plantations/calendar/:eventId/reschedule', authenticateToken, rescheduleCalendarEventHandler);
router.post('/plantations/calendar/:eventId/costs', authenticateToken, addEventCostsHandler);

// Post-harvest endpoints
router.post('/plantations/:plantationId/harvest', authenticateToken, recordHarvestHandler);
router.get('/plantations/:plantationId/harvest', authenticateToken, getHarvestHandler);
router.post('/plantations/:plantationId/profit', authenticateToken, recordProfitHandler);
router.get('/plantations/:plantationId/profit', authenticateToken, getProfitHandler);
router.get('/plantations/:plantationId/rotation', authenticateToken, getRotationHandler);
router.get('/plantations/:plantationId/summary', authenticateToken, getHarvestSummaryHandler);
router.patch('/plantations/:plantationId/archive', authenticateToken, archivePlantationHandler);
router.get('/farms/:farmId/history', authenticateToken, getFarmHistoryHandler);
router.post('/farms/:farmId/new-plantation', authenticateToken, startNewPlantationHandler);

export { router as plantationRoutes };