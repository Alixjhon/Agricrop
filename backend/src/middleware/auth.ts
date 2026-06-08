import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

type JwtPayload = Express.UserPayload;

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  // Check Authorization header
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as JwtPayload;
    req.user = decoded;
    return next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

export const attachUserIfPresent = (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as JwtPayload;
    req.user = decoded;
  } catch {
    // Ignore invalid optional tokens here; protected routes should use authenticateToken instead.
  }

  return next();
};
