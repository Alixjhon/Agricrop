import { Request, Response } from 'express';
/**
 * Handle single or multiple image uploads for disease detection
 * Supports both single file upload and multiple file uploads
 */
export declare const submitImage: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getDiseaseResults: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=diseaseController.d.ts.map