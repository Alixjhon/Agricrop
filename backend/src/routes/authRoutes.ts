import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Public routes
router.post('/auth/register', AuthController.register);
router.post('/auth/login', AuthController.login);

// Protected routes
router.get('/auth/profile', authenticateToken, AuthController.getProfile);
router.put('/auth/profile', authenticateToken, AuthController.updateProfile);
router.post('/auth/profile/image', authenticateToken, AuthController.uploadProfileImage);

export { router as authRoutes };
