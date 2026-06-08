import { Request, Response, NextFunction } from 'express';
export declare const authenticateToken: (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
export declare const attachUserIfPresent: (req: Request, _res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map