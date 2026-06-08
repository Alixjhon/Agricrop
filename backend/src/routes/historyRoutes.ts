import express from 'express';
import { getHistory, getStats, deleteConversation, deleteRecommendation, deleteDiseaseDetection } from '../controllers/historyController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// GET /api/history/stats - Get user statistics
router.get('/history/stats', authenticateToken, getStats);

// GET /api/history - Get user's history (chat, recommendations, disease detections)
router.get('/history', authenticateToken, getHistory);

// DELETE /api/history/chat/:conversationId - Delete a chat conversation
router.delete('/history/chat/:conversationId', authenticateToken, deleteConversation);

// DELETE /api/history/recommendation/:id - Delete a crop recommendation
router.delete('/history/recommendation/:id', authenticateToken, deleteRecommendation);

// DELETE /api/history/disease/:id - Delete a disease detection
router.delete('/history/disease/:id', authenticateToken, deleteDiseaseDetection);

export { router as historyRoutes };
