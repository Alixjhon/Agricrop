"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = void 0;
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
exports.authRoutes = router;
// Public routes
router.post('/auth/register', authController_1.AuthController.register);
router.post('/auth/login', authController_1.AuthController.login);
// Protected routes
router.get('/auth/profile', auth_1.authenticateToken, authController_1.AuthController.getProfile);
router.put('/auth/profile', auth_1.authenticateToken, authController_1.AuthController.updateProfile);
router.post('/auth/profile/image', auth_1.authenticateToken, authController_1.AuthController.uploadProfileImage);
//# sourceMappingURL=authRoutes.js.map