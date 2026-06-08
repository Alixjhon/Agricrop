import express from 'express';
import { getAIFarmingGuide, getCropRecommendations, submitLocationData, submitSoilData } from '../controllers/cropController';
import { attachUserIfPresent } from '../middleware/auth';

const router = express.Router();

// GET /api/crop-recommendations
router.get('/crop-recommendations', getCropRecommendations);

// POST /api/crop-recommendations
router.post('/crop-recommendations', attachUserIfPresent, submitSoilData);

// POST /api/location-crop-recommendations
router.post('/location-crop-recommendations', attachUserIfPresent, submitLocationData);

// POST /api/crop-guides
router.post('/crop-guides', getAIFarmingGuide);

export { router as cropRoutes };
