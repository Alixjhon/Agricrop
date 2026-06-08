"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAIFarmingGuide = exports.submitLocationData = exports.getCropRecommendations = exports.submitSoilData = void 0;
const zod_1 = require("zod");
const db_1 = __importDefault(require("../models/db"));
const cropService_1 = require("../services/cropService");
const soilDataSchema = zod_1.z.object({
    ph: zod_1.z.number().min(0).max(14),
    moisture: zod_1.z.number().min(0).max(100),
    temperature: zod_1.z.number(),
    sunlight_hours: zod_1.z.number().min(0).max(24),
    soil_type: zod_1.z.string()
});
const locationDataSchema = zod_1.z.object({
    country: zod_1.z.string().min(1),
    province: zod_1.z.string().min(1),
    city: zod_1.z.string().min(1),
});
const farmingGuideSchema = zod_1.z.object({
    cropName: zod_1.z.string().min(1),
    reason: zod_1.z.string().optional(),
    plantingMonth: zod_1.z.string().optional(),
    careTips: zod_1.z.string().optional(),
});
const submitSoilData = async (req, res) => {
    try {
        const soilData = soilDataSchema.parse(req.body);
        const userId = req.user?.userId;
        // Generate recommendations using AI
        const recommendations = await (0, cropService_1.generateCropRecommendations)(soilData);
        // Save to database (optional)
        try {
            const query = `
        INSERT INTO crop_recommendations ("userId", ph, moisture, temperature, sunlight, soil_type, recommendations, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      `;
            await db_1.default.query(query, [
                userId,
                soilData.ph,
                soilData.moisture,
                soilData.temperature,
                String(soilData.sunlight_hours),
                soilData.soil_type,
                JSON.stringify(recommendations)
            ]);
        }
        catch (dbError) {
            console.log('Database not available, skipping save:', dbError instanceof Error ? dbError.message : dbError);
        }
        res.json({ crop_recommendations: recommendations });
    }
    catch (error) {
        console.error('Error in submitSoilData:', error);
        res.status(500).json({ error: 'Failed to process soil data' });
    }
};
exports.submitSoilData = submitSoilData;
const getCropRecommendations = async (req, res) => {
    try {
        const userId = req.user?.userId;
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
        const result = await db_1.default.query(query, userId ? [userId] : []);
        res.json(result.rows);
    }
    catch (error) {
        console.log('Database not available, returning empty array');
        res.json([]);
    }
};
exports.getCropRecommendations = getCropRecommendations;
const submitLocationData = async (req, res) => {
    try {
        const locationData = locationDataSchema.parse(req.body);
        const userId = req.user?.userId;
        const recommendations = await (0, cropService_1.generateLocationCropRecommendations)(locationData);
        try {
            const query = `
        INSERT INTO crop_recommendations ("userId", ph, moisture, temperature, sunlight, soil_type, recommendations, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      `;
            await db_1.default.query(query, [
                userId,
                0,
                0,
                0,
                'Location based',
                `${locationData.city}, ${locationData.province}, ${locationData.country}`,
                JSON.stringify(recommendations)
            ]);
        }
        catch (dbError) {
            console.log('Database not available, skipping save:', dbError instanceof Error ? dbError.message : dbError);
        }
        res.json({ crop_recommendations: recommendations });
    }
    catch (error) {
        console.error('Error in submitLocationData:', error);
        res.status(500).json({ error: 'Failed to process location data' });
    }
};
exports.submitLocationData = submitLocationData;
const getAIFarmingGuide = async (req, res) => {
    try {
        const input = farmingGuideSchema.parse(req.body);
        const guide = await (0, cropService_1.generateFarmingGuide)(input.cropName, {
            reason: input.reason,
            plantingMonth: input.plantingMonth,
            careTips: input.careTips,
        });
        res.json({ guide });
    }
    catch (error) {
        console.error('Error in getAIFarmingGuide:', error);
        res.status(500).json({ error: 'Failed to generate farming guide' });
    }
};
exports.getAIFarmingGuide = getAIFarmingGuide;
//# sourceMappingURL=cropController.js.map