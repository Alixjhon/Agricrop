import { Request, Response } from 'express';
export declare class AuthController {
    private static getAuthenticatedUser;
    static register(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static login(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getProfile(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static updateProfile(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static uploadProfileImage(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
//# sourceMappingURL=authController.d.ts.map