import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  getChatHistory,
  askQuestion,
} from '../controllers/chatController';

const router = Router();

router.post('/chat', authenticateToken, askQuestion);
router.get('/chat/history/:convId', authenticateToken, getChatHistory);

export { router as chatRoutes };
