import { Request, Response } from 'express';
import pool from '../models/db';
import { analyzePlantDisease, analyzeMultipleImages } from '../services/diseaseService';

interface DiseaseResult {
  plant_name: string;
  disease_name: string;
  confidence: string;
  treatment: string;
  prevention?: string;
  severity?: string;
  additional_info?: string;
}

/**
 * Handle single or multiple image uploads for disease detection
 * Supports both single file upload and multiple file uploads
 */
export const submitImage = async (req: Request, res: Response) => {
  try {
    // Get the enhanced flag from query parameters or body
    const enhanced = req.query.enhanced === 'true' || req.body.enhanced === true;
    
    // Handle multiple file uploads (using multer's fields)
    const multerFiles = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const singleFile = req.file;
    
    // Collect all image buffers from both 'image' and 'images' fields
    const imageBuffers: Buffer[] = [];
    
    if (multerFiles) {
      // Handle 'images' field (multiple files)
      if (multerFiles.images && multerFiles.images.length > 0) {
        for (const file of multerFiles.images) {
          imageBuffers.push(file.buffer);
        }
      }
      // Handle 'image' field (single file)
      else if (multerFiles.image && multerFiles.image.length > 0) {
        imageBuffers.push(multerFiles.image[0].buffer);
      }
    }
    
    // Fallback to single file if still no images
    if (imageBuffers.length === 0 && singleFile) {
      imageBuffers.push(singleFile.buffer);
    }
    
    if (imageBuffers.length === 0) {
      return res.status(400).json({ 
        error: 'No image file provided',
        message: 'Please upload at least one image file (JPG, PNG, or WebP)'
      });
    }
    
    // Validate file count (limit to 5 images per request for API limits)
    if (imageBuffers.length > 5) {
      return res.status(400).json({ 
        error: 'Too many images',
        message: 'Maximum 5 images allowed per analysis request'
      });
    }
    
    console.log(`Analyzing ${imageBuffers.length} image(s), enhanced: ${enhanced}`);
    
    // Analyze the image(s) using AI
    let results: DiseaseResult[];
    
    if (imageBuffers.length === 1) {
      results = await analyzePlantDisease(imageBuffers[0], { enhanced });
    } else {
      results = await analyzeMultipleImages(imageBuffers, { enhanced });
    }
    
    console.log('Analysis results:', results);

    // Save to database (optional)
    try {
      const combinedImageData = imageBuffers.length === 1 
        ? imageBuffers[0] 
        : Buffer.concat(imageBuffers);
      const userId = (req as unknown as { user?: { userId: string } }).user?.userId;
      
      const query = `
        INSERT INTO disease_detections ("userId", image_data, results, created_at)
        VALUES ($1, $2, $3, NOW())
      `;
      await pool.query(query, [userId, combinedImageData, JSON.stringify(results)]);
    } catch (dbError) {
      console.log('Database not available, skipping save:', dbError instanceof Error ? dbError.message : dbError);
    }

    res.json({ 
      disease_detection: results,
      images_analyzed: imageBuffers.length,
      enhanced
    });
  } catch (error) {
    console.error('Error in submitImage:', error);
    res.status(500).json({ 
      error: 'Failed to analyze image',
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    });
  }
};

export const getDiseaseResults = async (req: Request, res: Response) => {
  try {
    const query = 'SELECT id, results, created_at FROM disease_detections ORDER BY created_at DESC LIMIT 10';
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.log('Database not available, returning empty array');
    res.json([]);
  }
};