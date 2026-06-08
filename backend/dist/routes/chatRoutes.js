"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatRoutes = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const chatController_1 = require("../controllers/chatController");
const router = (0, express_1.Router)();
exports.chatRoutes = router;
router.post('/chat', auth_1.authenticateToken, chatController_1.askQuestion);
router.get('/chat/history/:convId', auth_1.authenticateToken, chatController_1.getChatHistory);
//# sourceMappingURL=chatRoutes.js.map