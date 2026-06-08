import express from 'express';
import { getCityOptions, getCountryOptions, getRegionOptions } from '../controllers/locationController';

const router = express.Router();

router.get('/locations/countries', getCountryOptions);
router.get('/locations/regions', getRegionOptions);
router.get('/locations/cities', getCityOptions);

export { router as locationRoutes };
