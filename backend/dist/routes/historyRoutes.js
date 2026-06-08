"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.historyRoutes = void 0;
const express_1 = __importDefault(require("express"));
const historyController_1 = require("../controllers/historyController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
exports.historyRoutes = router;
// GET /api/history/stats - Get user statistics
router.get('/history/stats', auth_1.authenticateToken, historyController_1.getStats);
// GET /api/history - Get user's history (chat, recommendations, disease detections)
router.get('/history', auth_1.authenticateToken, historyController_1.getHistory);
// DELETE /api/history/chat/:conversationId - Delete a chat conversation
router.delete('/history/chat/:conversationId', auth_1.authenticateToken, historyController_1.deleteConversation);
// DELETE /api/history/recommendation/:id - Delete a crop recommendation
router.delete('/history/recommendation/:id', auth_1.authenticateToken, historyController_1.deleteRecommendation);
// DELETE /api/history/disease/:id - Delete a disease detection
router.delete('/history/disease/:id', auth_1.authenticateToken, historyController_1.deleteDiseaseDetection);
//# sourceMappingURL=historyRoutes.js.map