"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.diseaseRoutes = void 0;
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const diseaseController_1 = require("../controllers/diseaseController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
exports.diseaseRoutes = router;
// Configure multer for memory storage with file filters
const storage = multer_1.default.memoryStorage();
const fileFilter = (req, file, cb) => {
    // Allow only image files
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error(`Invalid file type: ${file.mimetype}. Only JPEG, PNG, and WebP images are allowed.`));
    }
};
const upload = (0, multer_1.default)({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max per file
        files: 5 // Maximum 5 files per request
    }
});
// GET /api/disease-detection
router.get('/disease-detection', diseaseController_1.getDiseaseResults);
// POST /api/disease-detection - supports both single and multiple image uploads
// Single image: use 'image' field
// Multiple images: use 'images' field (array)
router.post('/disease-detection', upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'images', maxCount: 5 }
]), auth_1.attachUserIfPresent, diseaseController_1.submitImage);
//# sourceMappingURL=diseaseRoutes.js.map