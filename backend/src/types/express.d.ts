export {};

declare global {
  namespace Express {
    interface UserPayload {
      userId: number;
      email: string;
    }

    interface Request {
      user?: UserPayload;
    }
  }
}
