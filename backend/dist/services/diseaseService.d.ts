interface DiseaseResult {
    plant_name: string;
    disease_name: string;
    confidence: string;
    treatment: string;
    prevention?: string;
    severity?: string;
    causes?: string[];
    treatment_steps?: string[];
    additional_info?: string;
}
export declare const analyzePlantDisease: (imageBuffer: Buffer | Buffer[], options?: {
    enhanced?: boolean;
    language?: string;
}) => Promise<DiseaseResult[]>;
export declare const analyzeMultipleImages: (images: Buffer[], options?: {
    enhanced?: boolean;
    language?: string;
}) => Promise<DiseaseResult[]>;
export {};
//# sourceMappingURL=diseaseService.d.ts.map