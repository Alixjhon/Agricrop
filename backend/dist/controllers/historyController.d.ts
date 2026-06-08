import { Request, Response } from 'express';
export declare const getStats: (req: Request, res: Response) => Promise<void>;
export declare const getHistory: (req: Request, res: Response) => Promise<void>;
export declare const deleteConversation: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteRecommendation: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteDiseaseDetection: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=historyController.d.ts.map