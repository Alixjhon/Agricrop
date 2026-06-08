import { Request, Response } from 'express';
import { z } from 'zod';
import { getCities, getCountries, getRegions } from '../services/locationService';

const regionsQuerySchema = z.object({
  countryCode: z.string().min(1),
});

const citiesQuerySchema = z.object({
  countryCode: z.string().min(1),
  regionCode: z.string().min(1),
});

export const getCountryOptions = async (_req: Request, res: Response) => {
  try {
    const countries = await getCountries();
    res.json({ countries });
  } catch (error) {
    console.error('Error fetching countries:', error);
    res.status(500).json({ error: 'Failed to fetch countries' });
  }
};

export const getRegionOptions = async (req: Request, res: Response) => {
  try {
    const { countryCode } = regionsQuerySchema.parse(req.query);
    const regions = await getRegions(countryCode);
    res.json({ regions });
  } catch (error) {
    console.error('Error fetching regions:', error);
    res.status(500).json({ error: 'Failed to fetch regions' });
  }
};

export const getCityOptions = async (req: Request, res: Response) => {
  try {
    const { countryCode, regionCode } = citiesQuerySchema.parse(req.query);
    const cities = await getCities(countryCode, regionCode);
    res.json({ cities });
  } catch (error) {
    console.error('Error fetching cities:', error);
    res.status(500).json({ error: 'Failed to fetch cities' });
  }
};
