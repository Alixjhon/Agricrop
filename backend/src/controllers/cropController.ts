import { Request, Response } from 'express';
import { z } from 'zod';
import pool from '../models/db';
import { generateCropRecommendations, generateFarmingGuide, generateLocationCropRecommendations } from '../services/cropService';

const soilDataSchema = z.object({
  ph: z.number().min(0).max(14),
  moisture: z.number().min(0).max(100),
  temperature: z.number(),
  sunlight_hours: z.number().min(0).max(24),
  soil_type: z.string()
});

const locationDataSchema = z.object({
  country: z.string().min(1),
  province: z.string().min(1),
  city: z.string().min(1),
});

const farmingGuideSchema = z.object({
  cropName: z.string().min(1),
  reason: z.string().optional(),
  plantingMonth: z.string().optional(),
  careTips: z.string().optional(),
});

export const submitSoilData = async (req: Request, res: Response) => {
  try {
    const soilData = soilDataSchema.parse(req.body);
    const userId = (req as unknown as { user?: { userId: string } }).user?.userId;

    // Generate recommendations using AI
    const recommendations = await generateCropRecommendations(soilData);

    // Save to database (optional)
    try {
      const query = `
        INSERT INTO crop_recommendations ("userId", ph, moisture, temperature, sunlight, soil_type, recommendations, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      `;
      await pool.query(query, [
        userId,
        soilData.ph,
        soilData.moisture,
        soilData.temperature,
        String(soilData.sunlight_hours),
        soilData.soil_type,
        JSON.stringify(recommendations)
      ]);
    } catch (dbError) {
      console.log('Database not available, skipping save:', dbError instanceof Error ? dbError.message : dbError);
    }

    res.json({ crop_recommendations: recommendations });
  } catch (error) {
    console.error('Error in submitSoilData:', error);
    res.status(500).json({ error: 'Failed to process soil data' });
  }
};

export const getCropRecommendations = async (req: Request, res: Response) => {
  try {
    const userId = (req as unknown as { user?: { userId: string } }).user?.userId;
    const query = userId
      ? `
          SELECT id, "userId", ph, moisture, temperature, sunlight, soil_type, recommendations, created_at
          FROM crop_recommendations
          WHERE "userId" = $1
          ORDER BY created_at DESC
          LIMIT 10
        `
      : `
          SELECT id, "userId", ph, moisture, temperature, sunlight, soil_type, recommendations, created_at
          FROM crop_recommendations
          ORDER BY created_at DESC
          LIMIT 10
        `;
    const result = await pool.query(query, userId ? [userId] : []);
    res.json(result.rows);
  } catch (error) {
    console.log('Database not available, returning empty array');
    res.json([]);
  }
};

export const submitLocationData = async (req: Request, res: Response) => {
  try {
    const locationData = locationDataSchema.parse(req.body);
    const userId = (req as unknown as { user?: { userId: string } }).user?.userId;

    const recommendations = await generateLocationCropRecommendations(locationData);

    try {
      const query = `
        INSERT INTO crop_recommendations ("userId", ph, moisture, temperature, sunlight, soil_type, recommendations, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      `;
      await pool.query(query, [
        userId,
        0,
        0,
        0,
        'Location based',
        `${locationData.city}, ${locationData.province}, ${locationData.country}`,
        JSON.stringify(recommendations)
      ]);
    } catch (dbError) {
      console.log('Database not available, skipping save:', dbError instanceof Error ? dbError.message : dbError);
    }

    res.json({ crop_recommendations: recommendations });
  } catch (error) {
    console.error('Error in submitLocationData:', error);
    res.status(500).json({ error: 'Failed to process location data' });
  }
};

export const getAIFarmingGuide = async (req: Request, res: Response) => {
  try {
    const input = farmingGuideSchema.parse(req.body);
    const guide = await generateFarmingGuide(input.cropName, {
      reason: input.reason,
      plantingMonth: input.plantingMonth,
      careTips: input.careTips,
    });

    res.json({ guide });
  } catch (error) {
    console.error('Error in getAIFarmingGuide:', error);
    res.status(500).json({ error: 'Failed to generate farming guide' });
  }
};
