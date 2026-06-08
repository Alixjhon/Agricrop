"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cropRoutes = void 0;
const express_1 = __importDefault(require("express"));
const cropController_1 = require("../controllers/cropController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
exports.cropRoutes = router;
// GET /api/crop-recommendations
router.get('/crop-recommendations', cropController_1.getCropRecommendations);
// POST /api/crop-recommendations
router.post('/crop-recommendations', auth_1.attachUserIfPresent, cropController_1.submitSoilData);
// POST /api/location-crop-recommendations
router.post('/location-crop-recommendations', auth_1.attachUserIfPresent, cropController_1.submitLocationData);
// POST /api/crop-guides
router.post('/crop-guides', cropController_1.getAIFarmingGuide);
//# sourceMappingURL=cropRoutes.js.map