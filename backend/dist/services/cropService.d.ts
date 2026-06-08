interface SoilData {
    ph: number;
    moisture: number;
    temperature: number;
    sunlight_hours: number;
    soil_type: string;
    country?: string;
    province?: string;
    city?: string;
}
interface LocationData {
    country: string;
    province: string;
    city: string;
}
export interface FarmingGuideStep {
    step: number;
    title: string;
    description: string;
    duration?: string;
}
export interface FarmingGuide {
    cropName: string;
    overview: string;
    climate: string;
    soilPreparation: string;
    steps: FarmingGuideStep[];
    tips: string[];
    harvestTime: string;
    expectedYield: string;
}
export interface CropRecommendation {
    crop_name: string;
    reason: string;
    planting_month: string;
    care_tips: string;
    image_url?: string;
    image_alt?: string;
}
export declare const generateCropRecommendations: (soilData: SoilData) => Promise<CropRecommendation[]>;
export declare const generateLocationCropRecommendations: (locationData: LocationData) => Promise<CropRecommendation[]>;
export declare const generateFarmingGuide: (cropName: string, context?: {
    reason?: string;
    plantingMonth?: string;
    careTips?: string;
}) => Promise<FarmingGuide>;
export {};
//# sourceMappingURL=cropService.d.ts.map