import express from 'express';
import multer from 'multer';
import { getDiseaseResults, submitImage } from '../controllers/diseaseController';
import { attachUserIfPresent } from '../middleware/auth';

const router = express.Router();

// Configure multer for memory storage with file filters
const storage = multer.memoryStorage();

const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Allow only image files
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Only JPEG, PNG, and WebP images are allowed.`));
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max per file
    files: 5 // Maximum 5 files per request
  }
});

// GET /api/disease-detection
router.get('/disease-detection', getDiseaseResults);

// POST /api/disease-detection - supports both single and multiple image uploads
// Single image: use 'image' field
// Multiple images: use 'images' field (array)
router.post('/disease-detection', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'images', maxCount: 5 }
]), attachUserIfPresent, submitImage);

export { router as diseaseRoutes };
